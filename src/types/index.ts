export interface PurchaseAttempt {
  id: string;
  scheduledAt: Date;
  attemptedAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  costcoOrderId?: string;
  totalAmount?: number;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

export interface EmailProcessingRecord {
  id: string;
  emailId: string;
  receivedAt: Date;
  processedAt: Date;
  emailType: 'purchase_confirmation' | 'gift_card_delivery' | 'other';
  extractedCodes: GiftCardCode[];
  status: 'pending' | 'processed' | 'failed';
  relatedPurchaseId?: string;
}

export interface GiftCardCode {
  id: string;
  code: string;
  value: number;
  extractedAt: Date;
  redeemedAt?: Date;
  redemptionStatus: 'pending' | 'redeemed' | 'failed' | 'expired';
  uberRedemptionId?: string;
  errorMessage?: string;
}

export interface SystemConfiguration {
  scheduling: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
    maxRetries: number;
    retryBackoffMultiplier: number;
  };
  costco: {
    baseUrl: string;
    productSearchTerms: string[];
    timeoutMs: number;
    headless: boolean;
  };
  email: {
    provider: 'gmail' | 'imap';
    checkIntervalMs: number;
    searchCriteria: {
      from: string[];
      subject: string[];
      keywords: string[];
    };
  };
  uber: {
    baseUrl: string;
    redemptionPath: string;
    timeoutMs: number;
  };
  notifications: {
    slack?: {
      webhookUrl?: string;
      channel?: string;
      enabled: boolean;
    };
    discord?: {
      webhookUrl?: string;
      enabled: boolean;
    };
    email?: {
      to: string[];
      enabled: boolean;
    };
  };
}

export interface Credentials {
  costco: {
    email: string;
    password: string;
    totpSecret?: string;
  };
  uber: {
    email: string;
    password: string;
    totpSecret?: string;
  };
  email: {
    email: string;
    password: string;
    host?: string;
    port?: number;
  };
}