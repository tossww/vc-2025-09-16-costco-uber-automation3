#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { ImapMonitor } from '../modules/email/monitor/imap';
import { createLogger } from '../modules/logging';
import { db } from '../modules/database';

dotenv.config();

const logger = createLogger('check-emails');

async function checkEmails() {
  try {
    logger.info('Checking emails...');

    // Connect to database
    await db.connect();

    // Initialize email monitor (using IMAP for now)
    const monitor = new ImapMonitor();
    await monitor.initialize();
    await monitor.connect();

    // Check for new emails
    const newEmails = await monitor.checkForNewEmails();

    if (newEmails.length === 0) {
      logger.info('No new emails found');
    } else {
      logger.info(`Found ${newEmails.length} new emails:`);

      for (const email of newEmails) {
        logger.info(`- Email ID: ${email.emailId}`);
        logger.info(`  Type: ${email.emailType}`);
        logger.info(`  Received: ${email.receivedAt}`);

        if (email.extractedCodes && email.extractedCodes.length > 0) {
          logger.info(`  📎 Extracted ${email.extractedCodes.length} gift card codes:`);
          for (const code of email.extractedCodes) {
            logger.info(`    - ${code.code?.substring(0, 4)}... ($${code.value})`);
          }
        }
      }
    }

    // Get pending gift cards
    const pendingCards = await db.getPendingGiftCards();
    if (pendingCards.length > 0) {
      logger.info(`\n💳 ${pendingCards.length} gift cards pending redemption`);
    }

    // Disconnect
    await monitor.disconnect();

  } catch (error) {
    logger.error('Email check failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

checkEmails();