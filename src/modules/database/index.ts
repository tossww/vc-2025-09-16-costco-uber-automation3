import { PrismaClient } from '@prisma/client';
import { createLogger } from '../logging';
import {
  PurchaseAttempt,
  EmailProcessingRecord,
  GiftCardCode
} from '../../types';

const logger = createLogger('database');

export class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Purchase Attempts
  public async createPurchaseAttempt(data: Partial<PurchaseAttempt>): Promise<PurchaseAttempt> {
    const attempt = await this.prisma.purchaseAttempt.create({
      data: {
        scheduledAt: data.scheduledAt || new Date(),
        attemptedAt: data.attemptedAt || new Date(),
        status: data.status || 'pending',
        costcoOrderId: data.costcoOrderId,
        totalAmount: data.totalAmount,
        errorMessage: data.errorMessage,
        retryCount: data.retryCount || 0,
        nextRetryAt: data.nextRetryAt,
      },
    });

    logger.audit('purchase_attempt_created', { id: attempt.id, status: attempt.status });
    return attempt as PurchaseAttempt;
  }

  public async updatePurchaseAttempt(
    id: string,
    data: Partial<PurchaseAttempt>
  ): Promise<PurchaseAttempt> {
    const updated = await this.prisma.purchaseAttempt.update({
      where: { id },
      data: {
        status: data.status,
        costcoOrderId: data.costcoOrderId,
        totalAmount: data.totalAmount,
        errorMessage: data.errorMessage,
        retryCount: data.retryCount,
        nextRetryAt: data.nextRetryAt,
      },
    });

    logger.audit('purchase_attempt_updated', { id, changes: data });
    return updated as PurchaseAttempt;
  }

  public async getPurchaseAttempt(id: string): Promise<PurchaseAttempt | null> {
    const attempt = await this.prisma.purchaseAttempt.findUnique({
      where: { id },
      include: {
        emailRecords: true,
        giftCards: true,
      },
    });

    return attempt as PurchaseAttempt | null;
  }

  public async getLatestPurchaseAttempt(): Promise<PurchaseAttempt | null> {
    const attempt = await this.prisma.purchaseAttempt.findFirst({
      orderBy: { attemptedAt: 'desc' },
      include: {
        emailRecords: true,
        giftCards: true,
      },
    });

    return attempt as PurchaseAttempt | null;
  }

  public async getPendingPurchaseAttempts(): Promise<PurchaseAttempt[]> {
    const attempts = await this.prisma.purchaseAttempt.findMany({
      where: {
        status: { in: ['pending', 'in_progress'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return attempts as PurchaseAttempt[];
  }

  // Email Processing
  public async createEmailRecord(data: Partial<EmailProcessingRecord>): Promise<EmailProcessingRecord> {
    const record = await this.prisma.emailProcessingRecord.create({
      data: {
        emailId: data.emailId!,
        receivedAt: data.receivedAt || new Date(),
        processedAt: data.processedAt,
        emailType: data.emailType || 'other',
        status: data.status || 'pending',
        rawContent: data.rawContent,
        extractedData: data.extractedCodes ? JSON.stringify(data.extractedCodes) : undefined,
        purchaseId: data.relatedPurchaseId,
      },
    });

    logger.audit('email_record_created', { id: record.id, emailId: record.emailId });
    return this.mapEmailRecord(record);
  }

  public async updateEmailRecord(
    id: string,
    data: Partial<EmailProcessingRecord>
  ): Promise<EmailProcessingRecord> {
    const updated = await this.prisma.emailProcessingRecord.update({
      where: { id },
      data: {
        processedAt: data.processedAt,
        status: data.status,
        extractedData: data.extractedCodes ? JSON.stringify(data.extractedCodes) : undefined,
      },
    });

    logger.audit('email_record_updated', { id, status: data.status });
    return this.mapEmailRecord(updated);
  }

  public async getUnprocessedEmails(): Promise<EmailProcessingRecord[]> {
    const records = await this.prisma.emailProcessingRecord.findMany({
      where: { status: 'pending' },
      orderBy: { receivedAt: 'asc' },
    });

    return records.map(this.mapEmailRecord);
  }

  private mapEmailRecord(record: any): EmailProcessingRecord {
    return {
      ...record,
      extractedCodes: record.extractedData ? JSON.parse(record.extractedData) : [],
      relatedPurchaseId: record.purchaseId,
    } as EmailProcessingRecord;
  }

  // Gift Card Codes
  public async createGiftCardCode(data: Partial<GiftCardCode>): Promise<GiftCardCode> {
    const code = await this.prisma.giftCardCode.create({
      data: {
        code: data.code!,
        value: data.value!,
        extractedAt: data.extractedAt || new Date(),
        redeemedAt: data.redeemedAt,
        redemptionStatus: data.redemptionStatus || 'pending',
        uberRedemptionId: data.uberRedemptionId,
        errorMessage: data.errorMessage,
        purchaseId: data.purchaseId,
        emailId: data.emailId,
      },
    });

    logger.audit('gift_card_created', { id: code.id, value: code.value });
    logger.transaction('purchase', { giftCardId: code.id, value: code.value });

    return code as GiftCardCode;
  }

  public async updateGiftCardCode(
    id: string,
    data: Partial<GiftCardCode>
  ): Promise<GiftCardCode> {
    const updated = await this.prisma.giftCardCode.update({
      where: { id },
      data: {
        redeemedAt: data.redeemedAt,
        redemptionStatus: data.redemptionStatus,
        uberRedemptionId: data.uberRedemptionId,
        errorMessage: data.errorMessage,
      },
    });

    if (data.redemptionStatus === 'redeemed') {
      logger.transaction('redemption', { giftCardId: id, value: updated.value });
    }

    logger.audit('gift_card_updated', { id, status: data.redemptionStatus });
    return updated as GiftCardCode;
  }

  public async getPendingGiftCards(): Promise<GiftCardCode[]> {
    const codes = await this.prisma.giftCardCode.findMany({
      where: { redemptionStatus: 'pending' },
      orderBy: { extractedAt: 'asc' },
    });

    return codes as GiftCardCode[];
  }

  public async checkDuplicateCode(code: string): Promise<boolean> {
    const existing = await this.prisma.giftCardCode.findUnique({
      where: { code },
    });

    return !!existing;
  }

  // System State
  public async getSystemState(key: string): Promise<string | null> {
    const state = await this.prisma.systemState.findUnique({
      where: { key },
    });

    return state?.value || null;
  }

  public async setSystemState(key: string, value: string): Promise<void> {
    await this.prisma.systemState.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // Audit Logging
  public async createAuditLog(
    action: string,
    module: string,
    details: any
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        module,
        details: JSON.stringify(details),
        userId: process.env.USER,
      },
    });
  }

  // Statistics
  public async getStatistics(): Promise<any> {
    const [totalPurchases, successfulPurchases, totalGiftCards, redeemedGiftCards] = await Promise.all([
      this.prisma.purchaseAttempt.count(),
      this.prisma.purchaseAttempt.count({ where: { status: 'completed' } }),
      this.prisma.giftCardCode.count(),
      this.prisma.giftCardCode.count({ where: { redemptionStatus: 'redeemed' } }),
    ]);

    const totalValue = await this.prisma.giftCardCode.aggregate({
      _sum: { value: true },
    });

    const redeemedValue = await this.prisma.giftCardCode.aggregate({
      where: { redemptionStatus: 'redeemed' },
      _sum: { value: true },
    });

    return {
      purchases: {
        total: totalPurchases,
        successful: successfulPurchases,
        successRate: totalPurchases > 0 ? (successfulPurchases / totalPurchases) * 100 : 0,
      },
      giftCards: {
        total: totalGiftCards,
        redeemed: redeemedGiftCards,
        redemptionRate: totalGiftCards > 0 ? (redeemedGiftCards / totalGiftCards) * 100 : 0,
        totalValue: totalValue._sum.value || 0,
        redeemedValue: redeemedValue._sum.value || 0,
      },
    };
  }
}

export const db = DatabaseManager.getInstance();