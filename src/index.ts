import dotenv from 'dotenv';
import { config } from './modules/config';
import { db } from './modules/database';
import { credentialManager } from './modules/security/credentials';
import { createLogger } from './modules/logging';

dotenv.config();

const logger = createLogger('main');

async function bootstrap() {
  try {
    logger.info('Starting Costco-Uber Automation System...');

    // Load configuration
    await config.loadFromFile();
    logger.info('Configuration loaded');

    // Connect to database
    await db.connect();
    logger.info('Database connected');

    // Load credentials
    const credentials = await credentialManager.loadCredentials();
    if (!credentials) {
      logger.warn('No credentials found. Please set up credentials using the setup script.');
    }

    // Validate configuration
    if (!config.validate()) {
      throw new Error('Configuration validation failed');
    }

    logger.info('System initialized successfully');
    logger.info('Configuration:', {
      scheduling: config.get().scheduling.enabled ? 'Enabled' : 'Disabled',
      cronExpression: config.get().scheduling.cronExpression,
      timezone: config.get().scheduling.timezone,
    });

    // Get system statistics
    const stats = await db.getStatistics();
    logger.info('System Statistics:', stats);

    // Check for pending operations
    const pendingPurchases = await db.getPendingPurchaseAttempts();
    const pendingGiftCards = await db.getPendingGiftCards();
    const unprocessedEmails = await db.getUnprocessedEmails();

    if (pendingPurchases.length > 0) {
      logger.info(`Found ${pendingPurchases.length} pending purchase attempts`);
    }

    if (pendingGiftCards.length > 0) {
      logger.info(`Found ${pendingGiftCards.length} pending gift cards to redeem`);
    }

    if (unprocessedEmails.length > 0) {
      logger.info(`Found ${unprocessedEmails.length} unprocessed emails`);
    }

    logger.info('System ready. Use scheduler or manual scripts to execute operations.');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      await db.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down gracefully...');
      await db.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Bootstrap failed:', error);
    process.exit(1);
  }
}

bootstrap();