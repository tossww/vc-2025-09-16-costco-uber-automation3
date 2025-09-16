#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { UberAutomation } from '../modules/automation/uber';
import { createLogger } from '../modules/logging';
import { db } from '../modules/database';

dotenv.config();

const logger = createLogger('redeem-codes');

async function redeemCodes() {
  try {
    logger.info('Checking for pending gift cards...');

    // Connect to database
    await db.connect();

    // Get pending gift cards
    const pendingCards = await db.getPendingGiftCards();

    if (pendingCards.length === 0) {
      logger.info('No pending gift cards to redeem');
      return;
    }

    logger.info(`Found ${pendingCards.length} pending gift cards to redeem`);

    // Create Uber automation
    const uber = new UberAutomation();
    const results = await uber.execute();

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info('\n📊 Redemption Summary:');
    logger.info(`✅ Successful: ${successful}`);
    logger.info(`❌ Failed: ${failed}`);

    // Show details
    for (const result of results) {
      if (result.success) {
        logger.info(`  ✓ Redeemed successfully`);
        if (result.balanceBefore !== undefined && result.balanceAfter !== undefined) {
          logger.info(`    Balance: $${result.balanceBefore} → $${result.balanceAfter}`);
        }
      } else {
        logger.error(`  ✗ Failed: ${result.errorMessage}`);
      }
    }

  } catch (error) {
    logger.error('Redemption script failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

redeemCodes();