import * as cron from 'node-cron';
import { createLogger } from '../logging';
import { config } from '../config';
import { CostcoAutomation } from '../automation/costco';
import { UberAutomation } from '../automation/uber';
import { GmailMonitor } from '../email/monitor/gmail';
import { ImapMonitor } from '../email/monitor/imap';
import { db } from '../database';
import { NotificationService } from '../notification';

const logger = createLogger('scheduler');

export class Scheduler {
  private static instance: Scheduler;
  private purchaseTask: cron.ScheduledTask | null = null;
  private emailTask: cron.ScheduledTask | null = null;
  private redemptionTask: cron.ScheduledTask | null = null;
  private emailMonitor: GmailMonitor | ImapMonitor | null = null;
  private notificationService: NotificationService;
  private isRunning: boolean = false;

  private constructor() {
    this.notificationService = new NotificationService();
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    logger.info('Starting scheduler...');

    // Initialize email monitor
    await this.initializeEmailMonitor();

    // Setup scheduled tasks
    this.setupPurchaseSchedule();
    this.setupEmailMonitoring();
    this.setupRedemptionSchedule();

    this.isRunning = true;

    logger.info('Scheduler started successfully');
    await this.notificationService.sendNotification({
      type: 'info',
      title: 'Scheduler Started',
      message: 'Automation system is now active',
    });
  }

  public stop(): void {
    logger.info('Stopping scheduler...');

    if (this.purchaseTask) {
      this.purchaseTask.stop();
      this.purchaseTask = null;
    }

    if (this.emailTask) {
      this.emailTask.stop();
      this.emailTask = null;
    }

    if (this.redemptionTask) {
      this.redemptionTask.stop();
      this.redemptionTask = null;
    }

    this.isRunning = false;

    logger.info('Scheduler stopped');
  }

  private async initializeEmailMonitor(): Promise<void> {
    const emailConfig = config.get().email;

    if (emailConfig.provider === 'gmail') {
      this.emailMonitor = new GmailMonitor();
    } else {
      this.emailMonitor = new ImapMonitor();
    }

    await this.emailMonitor.initialize();
    logger.info(`Email monitor initialized: ${emailConfig.provider}`);
  }

  private setupPurchaseSchedule(): void {
    const scheduleConfig = config.get().scheduling;

    if (!scheduleConfig.enabled) {
      logger.info('Purchase scheduling is disabled');
      return;
    }

    // Schedule weekly purchase
    this.purchaseTask = cron.schedule(scheduleConfig.cronExpression, async () => {
      await this.executePurchase();
    }, {
      scheduled: true,
      timezone: scheduleConfig.timezone,
    });

    logger.info(`Purchase scheduled: ${scheduleConfig.cronExpression} (${scheduleConfig.timezone})`);
  }

  private setupEmailMonitoring(): void {
    const emailConfig = config.get().email;
    const intervalMs = emailConfig.checkIntervalMs;

    // Check emails every N minutes
    this.emailTask = cron.schedule(`*/${Math.floor(intervalMs / 60000)} * * * *`, async () => {
      await this.checkEmails();
    });

    logger.info(`Email monitoring scheduled: every ${intervalMs / 60000} minutes`);
  }

  private setupRedemptionSchedule(): void {
    // Check for pending redemptions every 30 minutes
    this.redemptionTask = cron.schedule('*/30 * * * *', async () => {
      await this.redeemPendingCards();
    });

    logger.info('Redemption check scheduled: every 30 minutes');
  }

  private async executePurchase(): Promise<void> {
    logger.info('Starting scheduled purchase...');

    try {
      // Check if we should skip this week
      const lastPurchase = await db.getLatestPurchaseAttempt();
      if (lastPurchase && this.shouldSkipPurchase(lastPurchase)) {
        logger.info('Skipping purchase - recent successful purchase exists');
        return;
      }

      const costco = new CostcoAutomation();
      const result = await costco.execute();

      if (result.success) {
        logger.info(`Purchase successful: Order ${result.orderId}`);

        await this.notificationService.sendNotification({
          type: 'success',
          title: 'Costco Purchase Successful',
          message: `Order placed: ${result.orderId}\nAmount: $${result.totalAmount}`,
        });
      } else {
        logger.error(`Purchase failed: ${result.errorMessage}`);

        await this.notificationService.sendNotification({
          type: 'error',
          title: 'Costco Purchase Failed',
          message: result.errorMessage || 'Unknown error occurred',
        });

        // Schedule retry if configured
        await this.scheduleRetry('purchase');
      }
    } catch (error: any) {
      logger.error('Purchase execution failed', error);

      await this.notificationService.sendNotification({
        type: 'error',
        title: 'Purchase Error',
        message: error.message,
      });
    }
  }

  private shouldSkipPurchase(lastPurchase: any): boolean {
    if (lastPurchase.status !== 'completed') {
      return false;
    }

    const daysSinceLastPurchase = Math.floor(
      (Date.now() - lastPurchase.attemptedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Skip if successful purchase within last 6 days
    return daysSinceLastPurchase < 6;
  }

  private async checkEmails(): Promise<void> {
    if (!this.emailMonitor) {
      logger.warn('Email monitor not initialized');
      return;
    }

    logger.debug('Checking for new emails...');

    try {
      const newEmails = await this.emailMonitor.checkForNewEmails();

      if (newEmails.length > 0) {
        logger.info(`Found ${newEmails.length} new emails`);

        for (const email of newEmails) {
          if (email.extractedCodes && email.extractedCodes.length > 0) {
            logger.info(`Extracted ${email.extractedCodes.length} gift card codes`);

            await this.notificationService.sendNotification({
              type: 'info',
              title: 'Gift Cards Received',
              message: `Found ${email.extractedCodes.length} new gift card codes`,
            });

            // Trigger redemption
            await this.redeemPendingCards();
          }

          // Mark email as processed
          await db.updateEmailRecord(email.id, {
            status: 'processed',
            processedAt: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Email check failed', error);
    }
  }

  private async redeemPendingCards(): Promise<void> {
    logger.info('Checking for pending gift cards...');

    try {
      const pendingCards = await db.getPendingGiftCards();

      if (pendingCards.length === 0) {
        logger.debug('No pending gift cards');
        return;
      }

      logger.info(`Found ${pendingCards.length} pending gift cards`);

      const uber = new UberAutomation();
      const results = await uber.execute();

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        await this.notificationService.sendNotification({
          type: 'success',
          title: 'Gift Cards Redeemed',
          message: `Successfully redeemed ${successful} gift cards`,
        });
      }

      if (failed > 0) {
        await this.notificationService.sendNotification({
          type: 'warning',
          title: 'Some Redemptions Failed',
          message: `Failed to redeem ${failed} gift cards`,
        });

        // Schedule retry for failed cards
        await this.scheduleRetry('redemption');
      }
    } catch (error: any) {
      logger.error('Redemption failed', error);

      await this.notificationService.sendNotification({
        type: 'error',
        title: 'Redemption Error',
        message: error.message,
      });
    }
  }

  private async scheduleRetry(type: 'purchase' | 'redemption'): Promise<void> {
    const scheduleConfig = config.get().scheduling;
    const maxRetries = scheduleConfig.maxRetries;
    const backoffMultiplier = scheduleConfig.retryBackoffMultiplier;

    // Get current retry count from system state
    const retryKey = `${type}_retry_count`;
    const currentRetryStr = await db.getSystemState(retryKey) || '0';
    const currentRetry = parseInt(currentRetryStr);

    if (currentRetry >= maxRetries) {
      logger.warn(`Max retries (${maxRetries}) reached for ${type}`);
      await db.setSystemState(retryKey, '0');
      return;
    }

    const delayMinutes = Math.pow(backoffMultiplier, currentRetry) * 15;
    const retryTime = new Date(Date.now() + delayMinutes * 60000);

    logger.info(`Scheduling ${type} retry #${currentRetry + 1} at ${retryTime.toISOString()}`);

    // Update retry count
    await db.setSystemState(retryKey, (currentRetry + 1).toString());

    // Schedule one-time retry
    setTimeout(async () => {
      if (type === 'purchase') {
        await this.executePurchase();
      } else {
        await this.redeemPendingCards();
      }
    }, delayMinutes * 60000);
  }

  public async triggerPurchase(): Promise<void> {
    logger.info('Manual purchase triggered');
    await this.executePurchase();
  }

  public async triggerEmailCheck(): Promise<void> {
    logger.info('Manual email check triggered');
    await this.checkEmails();
  }

  public async triggerRedemption(): Promise<void> {
    logger.info('Manual redemption triggered');
    await this.redeemPendingCards();
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      tasks: {
        purchase: this.purchaseTask ? 'scheduled' : 'not scheduled',
        email: this.emailTask ? 'scheduled' : 'not scheduled',
        redemption: this.redemptionTask ? 'scheduled' : 'not scheduled',
      },
      config: {
        purchaseCron: config.get().scheduling.cronExpression,
        emailInterval: `${config.get().email.checkIntervalMs / 60000} minutes`,
        timezone: config.get().scheduling.timezone,
      },
    };
  }
}

// Export singleton instance
export const scheduler = Scheduler.getInstance();

// Start scheduler if this is the main module
if (require.main === module) {
  scheduler.start().catch(error => {
    logger.error('Failed to start scheduler', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}