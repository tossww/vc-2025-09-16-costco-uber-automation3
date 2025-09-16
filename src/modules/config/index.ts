import { z } from 'zod';
import dotenv from 'dotenv';
import { SystemConfiguration } from '../../types';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const ConfigSchema = z.object({
  scheduling: z.object({
    enabled: z.boolean().default(true),
    cronExpression: z.string().default('0 10 * * 0'), // Sunday at 10 AM
    timezone: z.string().default('America/Los_Angeles'),
    maxRetries: z.number().default(3),
    retryBackoffMultiplier: z.number().default(2),
  }),
  costco: z.object({
    baseUrl: z.string().default('https://www.costco.com'),
    productSearchTerms: z.array(z.string()).default(['uber eats gift card']),
    timeoutMs: z.number().default(30000),
    headless: z.boolean().default(false), // Show browser for debugging
  }),
  email: z.object({
    provider: z.enum(['gmail', 'imap']).default('gmail'),
    checkIntervalMs: z.number().default(300000), // 5 minutes
    searchCriteria: z.object({
      from: z.array(z.string()).default(['costco@costco.com', 'noreply@costco.com']),
      subject: z.array(z.string()).default(['order confirmation', 'gift card']),
      keywords: z.array(z.string()).default(['uber', 'gift card', 'code']),
    }),
  }),
  uber: z.object({
    baseUrl: z.string().default('https://www.ubereats.com'),
    redemptionPath: z.string().default('/eats/gift-cards/redeem'),
    timeoutMs: z.number().default(30000),
  }),
  notifications: z.object({
    slack: z.object({
      webhookUrl: z.string().optional(),
      channel: z.string().optional(),
      enabled: z.boolean().default(false),
    }).optional(),
    discord: z.object({
      webhookUrl: z.string().optional(),
      enabled: z.boolean().default(false),
    }).optional(),
    email: z.object({
      to: z.array(z.string()).default([]),
      enabled: z.boolean().default(false),
    }).optional(),
  }),
});

export class ConfigManager {
  private static instance: ConfigManager;
  private config: SystemConfiguration;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config.json');
    this.config = this.loadDefaultConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadDefaultConfig(): SystemConfiguration {
    const defaults: SystemConfiguration = {
      scheduling: {
        enabled: process.env.SCHEDULING_ENABLED === 'true',
        cronExpression: process.env.CRON_EXPRESSION || '0 10 * * 0',
        timezone: process.env.TIMEZONE || 'America/Los_Angeles',
        maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
        retryBackoffMultiplier: parseFloat(process.env.RETRY_BACKOFF || '2'),
      },
      costco: {
        baseUrl: process.env.COSTCO_BASE_URL || 'https://www.costco.com',
        productSearchTerms: (process.env.PRODUCT_SEARCH_TERMS || 'uber eats gift card').split(','),
        timeoutMs: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
        headless: process.env.BROWSER_HEADLESS === 'true',
      },
      email: {
        provider: (process.env.EMAIL_PROVIDER as 'gmail' | 'imap') || 'gmail',
        checkIntervalMs: parseInt(process.env.EMAIL_CHECK_INTERVAL || '300000'),
        searchCriteria: {
          from: (process.env.EMAIL_FROM_FILTER || 'costco@costco.com,noreply@costco.com').split(','),
          subject: (process.env.EMAIL_SUBJECT_FILTER || 'order confirmation,gift card').split(','),
          keywords: (process.env.EMAIL_KEYWORDS || 'uber,gift card,code').split(','),
        },
      },
      uber: {
        baseUrl: process.env.UBER_BASE_URL || 'https://www.ubereats.com',
        redemptionPath: process.env.UBER_REDEMPTION_PATH || '/eats/gift-cards/redeem',
        timeoutMs: parseInt(process.env.UBER_TIMEOUT || '30000'),
      },
      notifications: {
        slack: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL,
          enabled: process.env.SLACK_ENABLED === 'true',
        },
        discord: {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
          enabled: process.env.DISCORD_ENABLED === 'true',
        },
        email: {
          to: (process.env.NOTIFICATION_EMAILS || '').split(',').filter(Boolean),
          enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
        },
      },
    };

    return ConfigSchema.parse(defaults);
  }

  public async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.config = ConfigSchema.parse(parsed);
    } catch (error) {
      console.log('No config file found or invalid, using defaults');
    }
  }

  public async saveToFile(): Promise<void> {
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  public get(): SystemConfiguration {
    return this.config;
  }

  public update(updates: Partial<SystemConfiguration>): void {
    this.config = ConfigSchema.parse({ ...this.config, ...updates });
  }

  public validate(): boolean {
    try {
      ConfigSchema.parse(this.config);
      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
  }
}

export const config = ConfigManager.getInstance();