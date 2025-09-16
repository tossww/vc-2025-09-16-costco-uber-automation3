import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { createLogger } from '../../logging';
import { config } from '../../config';
import { db } from '../../database';
import { EmailProcessingRecord, GiftCardCode } from '../../../types';
import { credentialManager } from '../../security/credentials';

const logger = createLogger('imap-monitor');

export class ImapMonitor {
  private imap: Imap | null = null;
  private credentials: any;
  private isConnected: boolean = false;

  async initialize(): Promise<void> {
    try {
      this.credentials = credentialManager.getCredentials();
      if (!this.credentials?.email) {
        throw new Error('Email credentials not found');
      }

      const imapConfig = {
        user: this.credentials.email.email,
        password: this.credentials.email.password,
        host: this.credentials.email.host || 'imap.gmail.com',
        port: this.credentials.email.port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      };

      this.imap = new Imap(imapConfig);

      this.setupEventHandlers();

      logger.info('IMAP monitor initialized');
    } catch (error) {
      logger.error('Failed to initialize IMAP monitor', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.imap) return;

    this.imap.on('ready', () => {
      logger.info('IMAP connection ready');
      this.isConnected = true;
    });

    this.imap.on('error', (err: Error) => {
      logger.error('IMAP error', err);
      this.isConnected = false;
    });

    this.imap.on('end', () => {
      logger.info('IMAP connection ended');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error('IMAP not initialized'));
        return;
      }

      if (this.isConnected) {
        resolve();
        return;
      }

      this.imap.once('ready', () => resolve());
      this.imap.once('error', (err: Error) => reject(err));
      this.imap.connect();
    });
  }

  async disconnect(): Promise<void> {
    if (this.imap && this.isConnected) {
      this.imap.end();
      this.isConnected = false;
    }
  }

  async checkForNewEmails(): Promise<EmailProcessingRecord[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error('IMAP not initialized'));
        return;
      }

      const emails: EmailProcessingRecord[] = [];

      this.imap.openBox('INBOX', false, async (err, box) => {
        if (err) {
          logger.error('Failed to open inbox', err);
          reject(err);
          return;
        }

        // Search for unread emails from Costco
        const searchCriteria = this.buildSearchCriteria();

        this.imap!.search(searchCriteria, async (err, results) => {
          if (err) {
            logger.error('Search failed', err);
            reject(err);
            return;
          }

          if (results.length === 0) {
            logger.info('No new emails found');
            resolve([]);
            return;
          }

          logger.info(`Found ${results.length} emails to check`);

          const fetch = this.imap!.fetch(results, {
            bodies: '',
            markSeen: false,
          });

          fetch.on('message', (msg) => {
            msg.on('body', async (stream) => {
              try {
                const parsed = await simpleParser(stream);
                const emailRecord = await this.processEmail(parsed);
                if (emailRecord) {
                  emails.push(emailRecord);
                }
              } catch (error) {
                logger.error('Failed to parse email', error);
              }
            });
          });

          fetch.once('error', (err) => {
            logger.error('Fetch error', err);
            reject(err);
          });

          fetch.once('end', () => {
            logger.info(`Processed ${emails.length} new emails`);
            resolve(emails);
          });
        });
      });
    });
  }

  private buildSearchCriteria(): any[] {
    const criteria: any[] = ['UNSEEN'];
    const searchConfig = config.get().email.searchCriteria;

    // Add FROM criteria
    if (searchConfig.from?.length > 0) {
      const fromCriteria = searchConfig.from.map(from => ['FROM', from]);
      if (fromCriteria.length > 1) {
        criteria.push(['OR', ...fromCriteria]);
      } else {
        criteria.push(...fromCriteria[0]);
      }
    }

    // Add date criteria (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    criteria.push(['SINCE', sevenDaysAgo]);

    return criteria;
  }

  private async processEmail(parsed: any): Promise<EmailProcessingRecord | null> {
    try {
      const messageId = parsed.messageId || `${Date.now()}-${Math.random()}`;

      // Check if already processed
      const existing = await db.getEmailByMessageId(messageId);
      if (existing) {
        logger.debug(`Email ${messageId} already processed`);
        return null;
      }

      const subject = parsed.subject || '';
      const body = parsed.text || parsed.html || '';
      const from = parsed.from?.text || '';

      // Determine email type
      const emailType = this.determineEmailType(subject, body);

      // Create email record
      const emailRecord = await db.createEmailRecord({
        emailId: messageId,
        receivedAt: parsed.date || new Date(),
        emailType,
        status: 'pending',
        rawContent: body.substring(0, 10000), // Limit content size
      });

      // Extract gift card codes if applicable
      if (emailType === 'gift_card_delivery') {
        const codes = await this.extractGiftCardCodes(body);
        if (codes.length > 0) {
          for (const code of codes) {
            await db.createGiftCardCode({
              ...code,
              emailId: emailRecord.id,
            });
          }
          emailRecord.extractedCodes = codes;
        }
      }

      return emailRecord;

    } catch (error) {
      logger.error('Failed to process email', error);
      return null;
    }
  }

  private determineEmailType(subject: string, body: string): string {
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();

    if (lowerSubject.includes('order confirmation') ||
        lowerSubject.includes('purchase confirmation') ||
        lowerSubject.includes('order received')) {
      return 'purchase_confirmation';
    }

    if ((lowerSubject.includes('gift card') || lowerBody.includes('gift card')) &&
        (lowerBody.includes('code') || lowerBody.includes('pin') || lowerBody.includes('redeem'))) {
      return 'gift_card_delivery';
    }

    return 'other';
  }

  private async extractGiftCardCodes(body: string): Promise<Partial<GiftCardCode>[]> {
    const codes: Partial<GiftCardCode>[] = [];

    // Clean up HTML if present
    const cleanBody = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

    // Pattern for gift card codes
    const codePatterns = [
      /Code:\s*([A-Z0-9]{16,20})/gi,
      /Gift\s*Card\s*Code:\s*([A-Z0-9]{16,20})/gi,
      /Redemption\s*Code:\s*([A-Z0-9]{16,20})/gi,
      /Card\s*Number:\s*([A-Z0-9]{16,20})/gi,
      /\b([A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4})\b/gi,
    ];

    // Pattern for amounts
    const amountPattern = /\$(\d+(?:\.\d{2})?)/g;
    const amounts: number[] = [];
    let amountMatch;
    while ((amountMatch = amountPattern.exec(cleanBody)) !== null) {
      const amount = parseFloat(amountMatch[1]);
      if (amount >= 10 && amount <= 500) { // Reasonable gift card amounts
        amounts.push(amount);
      }
    }

    // Extract codes
    const foundCodes = new Set<string>();

    for (const pattern of codePatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex

      while ((match = pattern.exec(cleanBody)) !== null) {
        const code = match[1].replace(/[-\s]/g, '').toUpperCase();

        // Validate code format
        if (code.length >= 16 && code.length <= 20 && /^[A-Z0-9]+$/.test(code)) {
          if (!foundCodes.has(code)) {
            foundCodes.add(code);

            // Check if not duplicate in database
            const isDuplicate = await db.checkDuplicateCode(code);
            if (!isDuplicate) {
              codes.push({
                code,
                value: amounts[codes.length] || 100, // Default $100 if amount not found
                extractedAt: new Date(),
                redemptionStatus: 'pending',
              });
            } else {
              logger.warn(`Duplicate gift card code found: ${code.substring(0, 4)}...`);
            }
          }
        }
      }
    }

    logger.info(`Extracted ${codes.length} gift card codes from email`);
    return codes;
  }

  async markEmailAsRead(uid: number): Promise<void> {
    if (!this.imap || !this.isConnected) {
      logger.warn('IMAP not connected, cannot mark email as read');
      return;
    }

    this.imap.addFlags(uid, '\\Seen', (err) => {
      if (err) {
        logger.error(`Failed to mark email ${uid} as read`, err);
      } else {
        logger.debug(`Marked email ${uid} as read`);
      }
    });
  }
}