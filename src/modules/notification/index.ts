import axios from 'axios';
import { createLogger } from '../logging';
import { config } from '../config';
import { db } from '../database';

const logger = createLogger('notification');

export interface NotificationMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  metadata?: any;
}

export class NotificationService {
  private slackWebhookUrl?: string;
  private discordWebhookUrl?: string;
  private emailRecipients: string[] = [];
  private isConfigured: boolean = false;

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    const notificationConfig = config.get().notifications;

    // Slack configuration
    if (notificationConfig.slack?.enabled && notificationConfig.slack.webhookUrl) {
      this.slackWebhookUrl = notificationConfig.slack.webhookUrl;
      this.isConfigured = true;
      logger.info('Slack notifications enabled');
    }

    // Discord configuration
    if (notificationConfig.discord?.enabled && notificationConfig.discord.webhookUrl) {
      this.discordWebhookUrl = notificationConfig.discord.webhookUrl;
      this.isConfigured = true;
      logger.info('Discord notifications enabled');
    }

    // Email configuration
    if (notificationConfig.email?.enabled && notificationConfig.email.to.length > 0) {
      this.emailRecipients = notificationConfig.email.to;
      this.isConfigured = true;
      logger.info(`Email notifications enabled for ${this.emailRecipients.length} recipients`);
    }

    if (!this.isConfigured) {
      logger.warn('No notification services configured');
    }
  }

  public async sendNotification(notification: NotificationMessage): Promise<void> {
    if (!this.isConfigured) {
      logger.debug('Notifications not configured, skipping');
      return;
    }

    const promises: Promise<void>[] = [];

    if (this.slackWebhookUrl) {
      promises.push(this.sendSlackNotification(notification));
    }

    if (this.discordWebhookUrl) {
      promises.push(this.sendDiscordNotification(notification));
    }

    if (this.emailRecipients.length > 0) {
      promises.push(this.sendEmailNotification(notification));
    }

    // Send all notifications in parallel
    const results = await Promise.allSettled(promises);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`Notification ${index} failed:`, result.reason);
      }
    });

    // Log notification to database
    await this.logNotification(notification);
  }

  private async sendSlackNotification(notification: NotificationMessage): Promise<void> {
    if (!this.slackWebhookUrl) return;

    try {
      const color = this.getSlackColor(notification.type);
      const emoji = this.getEmoji(notification.type);

      const payload = {
        channel: config.get().notifications.slack?.channel,
        username: 'Costco-Uber Bot',
        icon_emoji: ':robot_face:',
        attachments: [
          {
            color,
            title: `${emoji} ${notification.title}`,
            text: notification.message,
            fields: notification.metadata ? Object.entries(notification.metadata).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            })) : undefined,
            footer: 'Costco-Uber Automation',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      await axios.post(this.slackWebhookUrl, payload);
      logger.debug('Slack notification sent');

    } catch (error) {
      logger.error('Failed to send Slack notification', error);
      throw error;
    }
  }

  private async sendDiscordNotification(notification: NotificationMessage): Promise<void> {
    if (!this.discordWebhookUrl) return;

    try {
      const color = this.getDiscordColor(notification.type);
      const emoji = this.getEmoji(notification.type);

      const payload = {
        username: 'Costco-Uber Bot',
        avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
        embeds: [
          {
            title: `${emoji} ${notification.title}`,
            description: notification.message,
            color,
            fields: notification.metadata ? Object.entries(notification.metadata).map(([key, value]) => ({
              name: key,
              value: String(value),
              inline: true,
            })) : undefined,
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Costco-Uber Automation',
            },
          },
        ],
      };

      await axios.post(this.discordWebhookUrl, payload);
      logger.debug('Discord notification sent');

    } catch (error) {
      logger.error('Failed to send Discord notification', error);
      throw error;
    }
  }

  private async sendEmailNotification(notification: NotificationMessage): Promise<void> {
    // For now, just log that we would send an email
    // Actual email sending would require nodemailer configuration
    logger.info('Email notification would be sent to:', this.emailRecipients);

    // TODO: Implement actual email sending with nodemailer
    // Example implementation:
    /*
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: credentials.email.email,
        pass: credentials.email.password,
      },
    });

    const mailOptions = {
      from: credentials.email.email,
      to: this.emailRecipients.join(','),
      subject: `[${notification.type.toUpperCase()}] ${notification.title}`,
      html: this.formatEmailHtml(notification),
    };

    await transporter.sendMail(mailOptions);
    */
  }

  private getSlackColor(type: NotificationMessage['type']): string {
    switch (type) {
      case 'success': return '#36a64f';
      case 'warning': return '#ff9900';
      case 'error': return '#d00000';
      default: return '#2196f3';
    }
  }

  private getDiscordColor(type: NotificationMessage['type']): number {
    switch (type) {
      case 'success': return 0x36a64f;
      case 'warning': return 0xff9900;
      case 'error': return 0xd00000;
      default: return 0x2196f3;
    }
  }

  private getEmoji(type: NotificationMessage['type']): string {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }

  private formatEmailHtml(notification: NotificationMessage): string {
    const emoji = this.getEmoji(notification.type);
    const color = this.getSlackColor(notification.type);

    let html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="border-left: 4px solid ${color}; padding-left: 15px;">
          <h2>${emoji} ${notification.title}</h2>
          <p style="white-space: pre-wrap;">${notification.message}</p>
    `;

    if (notification.metadata) {
      html += '<h3>Details:</h3><ul>';
      for (const [key, value] of Object.entries(notification.metadata)) {
        html += `<li><strong>${key}:</strong> ${value}</li>`;
      }
      html += '</ul>';
    }

    html += `
          <hr style="margin-top: 20px;">
          <p style="color: #666; font-size: 12px;">
            Sent by Costco-Uber Automation System at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    return html;
  }

  private async logNotification(notification: NotificationMessage): Promise<void> {
    try {
      await db.createNotificationLog({
        type: 'system',
        recipient: 'all',
        subject: notification.title,
        content: notification.message,
        status: 'sent',
      });
    } catch (error) {
      logger.error('Failed to log notification', error);
    }
  }

  public async testNotifications(): Promise<void> {
    logger.info('Testing notification services...');

    await this.sendNotification({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification from the Costco-Uber Automation System',
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    });

    logger.info('Test notifications sent');
  }
}