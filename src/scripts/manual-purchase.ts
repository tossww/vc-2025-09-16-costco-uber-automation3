#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { CostcoAutomation } from '../modules/automation/costco';
import { createLogger } from '../modules/logging';
import { db } from '../modules/database';

dotenv.config();

const logger = createLogger('manual-purchase');

async function manualPurchase() {
  try {
    logger.info('Starting manual purchase...');

    // Connect to database
    await db.connect();

    // Create and execute purchase
    const costco = new CostcoAutomation();
    const result = await costco.execute();

    if (result.success) {
      logger.info('✅ Purchase successful!');
      logger.info(`Order ID: ${result.orderId}`);
      logger.info(`Total Amount: $${result.totalAmount}`);
    } else {
      logger.error('❌ Purchase failed');
      logger.error(`Error: ${result.errorMessage}`);
    }

    // Get statistics
    const stats = await db.getStatistics();
    logger.info('Updated statistics:', stats);

  } catch (error) {
    logger.error('Manual purchase failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

manualPurchase();