import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createLogger } from '../../logging';
import { config } from '../../config';
import { db } from '../../database';
import { EmailProcessingRecord, GiftCardCode } from '../../../types';
import { credentialManager } from '../../security/credentials';
import path from 'path';
import fs from 'fs/promises';

const logger = createLogger('gmail-monitor');

export class GmailMonitor {
  private auth: OAuth2Client | null = null;
  private gmail: any = null;
  private credentials: any;

  async initialize(): Promise<void> {
    try {
      this.credentials = credentialManager.getCredentials();
      if (!this.credentials?.email) {
        throw new Error('Email credentials not found');
      }

      await this.authenticate();
      logger.info('Gmail monitor initialized');
    } catch (error) {
      logger.error('Failed to initialize Gmail monitor', error);
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    // For Gmail, we'll use OAuth2 or App Password
    // First, check if we have OAuth2 credentials
    const tokenPath = path.join(process.cwd(), 'gmail-token.json');
    const credentialsPath = path.join(process.cwd(), 'gmail-credentials.json');

    try {
      // Check if OAuth2 credentials exist
      await fs.access(credentialsPath);
      const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf-8'));

      const { client_secret, client_id, redirect_uris } = credentials.installed;
      this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Check for saved token
      try {
        const token = JSON.parse(await fs.readFile(tokenPath, 'utf-8'));
        this.auth.setCredentials(token);
      } catch {
        // Need to get new token
        logger.warn('No Gmail token found, manual authorization required');
        // For now, we'll fall back to IMAP with app password
        throw new Error('OAuth2 not configured');
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.auth });

    } catch (error) {
      // Fall back to using IMAP with app password
      logger.info('Using IMAP with app password for Gmail');
      // IMAP implementation will be in separate module
    }
  }

  async checkForNewEmails(): Promise<EmailProcessingRecord[]> {
    if (!this.gmail) {
      logger.warn('Gmail API not initialized, using IMAP fallback');
      return [];
    }

    try {
      const searchCriteria = config.get().email.searchCriteria;
      const query = this.buildSearchQuery(searchCriteria);

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10,
      });

      const messages = response.data.messages || [];
      const newEmails: EmailProcessingRecord[] = [];

      for (const message of messages) {
        // Check if already processed
        const existing = await db.getEmailByMessageId(message.id);
        if (existing) continue;

        // Get full message
        const fullMessage = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const emailRecord = await this.processEmail(fullMessage.data);
        if (emailRecord) {
          newEmails.push(emailRecord);
        }
      }

      logger.info(`Found ${newEmails.length} new emails to process`);
      return newEmails;

    } catch (error) {
      logger.error('Failed to check emails', error);
      return [];
    }
  }

  private buildSearchQuery(criteria: any): string {
    const parts: string[] = [];

    if (criteria.from?.length > 0) {
      const fromQuery = criteria.from.map((f: string) => `from:${f}`).join(' OR ');
      parts.push(`(${fromQuery})`);
    }

    if (criteria.subject?.length > 0) {
      const subjectQuery = criteria.subject.map((s: string) => `subject:"${s}"`).join(' OR ');
      parts.push(`(${subjectQuery})`);
    }

    if (criteria.keywords?.length > 0) {
      parts.push(...criteria.keywords);
    }

    // Only check last 7 days
    parts.push('newer_than:7d');

    return parts.join(' ');
  }

  private async processEmail(message: any): Promise<EmailProcessingRecord | null> {
    try {
      const headers = message.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';

      // Get email body
      const body = this.getEmailBody(message);

      // Determine email type
      const emailType = this.determineEmailType(subject, body);

      // Create email record
      const emailRecord = await db.createEmailRecord({
        emailId: message.id,
        receivedAt: new Date(date),
        emailType,
        status: 'pending',
        rawContent: body,
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

  private getEmailBody(message: any): string {
    let body = '';

    const extractText = (parts: any[]): string => {
      let text = '';
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          text += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          // Simple HTML to text conversion
          text += html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        } else if (part.parts) {
          text += extractText(part.parts);
        }
      }
      return text;
    };

    if (message.payload.parts) {
      body = extractText(message.payload.parts);
    } else if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    return body;
  }

  private determineEmailType(subject: string, body: string): string {
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();

    if (lowerSubject.includes('order confirmation') ||
        lowerSubject.includes('purchase confirmation')) {
      return 'purchase_confirmation';
    }

    if ((lowerSubject.includes('gift card') || lowerBody.includes('gift card')) &&
        (lowerBody.includes('code') || lowerBody.includes('pin'))) {
      return 'gift_card_delivery';
    }

    return 'other';
  }

  private async extractGiftCardCodes(body: string): Promise<Partial<GiftCardCode>[]> {
    const codes: Partial<GiftCardCode>[] = [];

    // Pattern for gift card codes (usually 16-20 alphanumeric characters)
    const codePatterns = [
      /Code:\s*([A-Z0-9]{16,20})/gi,
      /Gift\s*Card\s*Code:\s*([A-Z0-9]{16,20})/gi,
      /Redemption\s*Code:\s*([A-Z0-9]{16,20})/gi,
      /\b([A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4})\b/gi,
    ];

    // Pattern for amounts
    const amountPattern = /\$(\d+(?:\.\d{2})?)/g;
    const amounts: number[] = [];
    let amountMatch;
    while ((amountMatch = amountPattern.exec(body)) !== null) {
      amounts.push(parseFloat(amountMatch[1]));
    }

    // Extract codes
    for (const pattern of codePatterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const code = match[1].replace(/[-\s]/g, '');

        // Validate code format
        if (code.length >= 16 && code.length <= 20 && /^[A-Z0-9]+$/.test(code)) {
          // Check if not duplicate
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

    logger.info(`Extracted ${codes.length} gift card codes from email`);
    return codes;
  }

  async markEmailProcessed(emailId: string): Promise<void> {
    try {
      await db.updateEmailRecord(emailId, {
        status: 'processed',
        processedAt: new Date(),
      });

      // Optionally, mark email as read in Gmail
      if (this.gmail) {
        await this.gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });
      }

      logger.info(`Marked email ${emailId} as processed`);
    } catch (error) {
      logger.error(`Failed to mark email ${emailId} as processed`, error);
    }
  }
}