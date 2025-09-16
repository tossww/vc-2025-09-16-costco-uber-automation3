#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { db } from '../modules/database';
import { config } from '../modules/config';
import { createLogger } from '../modules/logging';

dotenv.config();

const logger = createLogger('status');

async function showStatus() {
  try {
    // Connect to database
    await db.connect();

    console.log('\n' + '='.repeat(60));
    console.log('COSTCO-UBER AUTOMATION SYSTEM STATUS');
    console.log('='.repeat(60));

    // Get statistics
    const stats = await db.getStatistics();

    console.log('\n📊 STATISTICS');
    console.log('-'.repeat(40));
    console.log(`Total Purchases: ${stats.purchases.total}`);
    console.log(`Successful Purchases: ${stats.purchases.successful} (${stats.purchases.successRate.toFixed(1)}%)`);
    console.log(`Total Gift Cards: ${stats.giftCards.total}`);
    console.log(`Redeemed Gift Cards: ${stats.giftCards.redeemed} (${stats.giftCards.redemptionRate.toFixed(1)}%)`);
    console.log(`Total Value: $${stats.giftCards.totalValue.toFixed(2)}`);
    console.log(`Redeemed Value: $${stats.giftCards.redeemedValue.toFixed(2)}`);

    // Get latest purchase
    const latestPurchase = await db.getLatestPurchaseAttempt();
    if (latestPurchase) {
      console.log('\n📦 LATEST PURCHASE');
      console.log('-'.repeat(40));
      console.log(`Date: ${latestPurchase.attemptedAt.toLocaleString()}`);
      console.log(`Status: ${latestPurchase.status}`);
      if (latestPurchase.costcoOrderId) {
        console.log(`Order ID: ${latestPurchase.costcoOrderId}`);
      }
      if (latestPurchase.totalAmount) {
        console.log(`Amount: $${latestPurchase.totalAmount}`);
      }
      if (latestPurchase.errorMessage) {
        console.log(`Error: ${latestPurchase.errorMessage}`);
      }
    }

    // Get pending operations
    const pendingPurchases = await db.getPendingPurchaseAttempts();
    const pendingCards = await db.getPendingGiftCards();
    const unprocessedEmails = await db.getUnprocessedEmails();

    console.log('\n⏳ PENDING OPERATIONS');
    console.log('-'.repeat(40));
    console.log(`Pending Purchases: ${pendingPurchases.length}`);
    console.log(`Pending Gift Cards: ${pendingCards.length}`);
    console.log(`Unprocessed Emails: ${unprocessedEmails.length}`);

    // Show configuration
    const cfg = config.get();
    console.log('\n⚙️  CONFIGURATION');
    console.log('-'.repeat(40));
    console.log(`Scheduling: ${cfg.scheduling.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Schedule: ${cfg.scheduling.cronExpression} (${cfg.scheduling.timezone})`);
    console.log(`Email Provider: ${cfg.email.provider}`);
    console.log(`Email Check Interval: ${cfg.email.checkIntervalMs / 60000} minutes`);
    console.log(`Browser Mode: ${cfg.costco.headless ? 'Headless' : 'Visible'}`);

    // Notification status
    console.log('\n🔔 NOTIFICATIONS');
    console.log('-'.repeat(40));
    console.log(`Slack: ${cfg.notifications.slack?.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Discord: ${cfg.notifications.discord?.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Email: ${cfg.notifications.email?.enabled ? `Enabled (${cfg.notifications.email.to.length} recipients)` : 'Disabled'}`);

    console.log('\n' + '='.repeat(60));
    console.log();

  } catch (error) {
    logger.error('Failed to get status:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

showStatus();