import { BaseAutomation } from '../base';
import { createLogger } from '../../logging';
import { credentialManager } from '../../security/credentials';
import { config } from '../../config';
import { db } from '../../database';
import { GiftCardCode } from '../../../types';

const logger = createLogger('uber-automation');

export interface UberRedemptionResult {
  success: boolean;
  redemptionId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  errorMessage?: string;
}

export class UberAutomation extends BaseAutomation {
  private credentials: any;

  constructor() {
    super({
      headless: config.get().costco.headless,
      timeout: config.get().uber.timeoutMs,
    });
  }

  async redeemGiftCard(giftCardCode: GiftCardCode): Promise<UberRedemptionResult> {
    try {
      // Load credentials
      this.credentials = credentialManager.getCredentials();
      if (!this.credentials?.uber) {
        throw new Error('Uber credentials not found');
      }

      // Initialize browser
      await this.initBrowser();

      // Login to Uber Eats
      await this.navigateToLogin();
      await this.performLogin();

      // Get current balance
      const balanceBefore = await this.getCurrentBalance();
      logger.info(`Current balance: $${balanceBefore}`);

      // Navigate to redemption page
      await this.navigateToRedemption();

      // Redeem gift card
      const result = await this.redeemCode(giftCardCode.code);

      if (result.success) {
        // Verify new balance
        const balanceAfter = await this.getCurrentBalance();
        logger.info(`New balance: $${balanceAfter}`);

        // Update database
        await db.updateGiftCardCode(giftCardCode.id, {
          redeemedAt: new Date(),
          redemptionStatus: 'redeemed',
          uberRedemptionId: result.redemptionId,
        });

        return {
          success: true,
          redemptionId: result.redemptionId,
          balanceBefore,
          balanceAfter,
        };
      } else {
        // Update database with failure
        await db.updateGiftCardCode(giftCardCode.id, {
          redemptionStatus: 'failed',
          errorMessage: result.errorMessage,
        });

        return result;
      }

    } catch (error: any) {
      logger.error('Uber redemption failed', error);

      await db.updateGiftCardCode(giftCardCode.id, {
        redemptionStatus: 'failed',
        errorMessage: error.message,
      });

      return {
        success: false,
        errorMessage: error.message,
      };

    } finally {
      await this.closeBrowser();
    }
  }

  async execute(): Promise<UberRedemptionResult[]> {
    // Get all pending gift cards
    const pendingCards = await db.getPendingGiftCards();

    if (pendingCards.length === 0) {
      logger.info('No pending gift cards to redeem');
      return [];
    }

    logger.info(`Found ${pendingCards.length} gift cards to redeem`);

    const results: UberRedemptionResult[] = [];

    for (const card of pendingCards) {
      logger.info(`Redeeming gift card: ${card.code.substring(0, 4)}...`);
      const result = await this.redeemGiftCard(card);
      results.push(result);

      // Add delay between redemptions
      if (pendingCards.indexOf(card) < pendingCards.length - 1) {
        await this.randomDelay(5000, 10000);
      }
    }

    return results;
  }

  private async navigateToLogin(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Navigating to Uber Eats login page');

    await this.page.goto(`${config.get().uber.baseUrl}/eats`, {
      waitUntil: 'networkidle',
    });

    // Check if already logged in
    const accountButton = await this.page.$('[data-testid="account-button"]');
    if (accountButton) {
      logger.info('Already logged in to Uber Eats');
      return;
    }

    // Click login button
    const loginButton = await this.page.$('button:has-text("Sign in")');
    if (loginButton) {
      await loginButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async performLogin(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Check if already logged in
    const accountElement = await this.page.$('[data-testid="account-info"]');
    if (accountElement) {
      logger.info('Already logged in, skipping login');
      return;
    }

    logger.info('Performing Uber login');

    try {
      // Enter phone/email
      await this.waitForSelector('input[type="email"], input[type="tel"]');
      const emailInput = await this.page.$('input[type="email"]');
      const phoneInput = await this.page.$('input[type="tel"]');

      if (emailInput) {
        await this.humanLikeType('input[type="email"]', this.credentials.uber.email);
      } else if (phoneInput) {
        await this.humanLikeType('input[type="tel"]', this.credentials.uber.email);
      }

      // Click next/continue
      await this.page.click('button[type="submit"]');
      await this.page.waitForLoadState('networkidle');

      // Enter password
      await this.waitForSelector('input[type="password"]');
      await this.humanLikeType('input[type="password"]', this.credentials.uber.password);

      // Click sign in
      await this.page.click('button[type="submit"]');

      // Wait for navigation or 2FA
      await Promise.race([
        this.page.waitForNavigation({ waitUntil: 'networkidle' }),
        this.page.waitForSelector('[data-testid="verification-code"]', { timeout: 5000 }),
      ]).catch(() => {});

      // Check for 2FA
      const needs2FA = await this.page.$('[data-testid="verification-code"]');
      if (needs2FA) {
        await this.handle2FA();
      }

      // Verify login success
      await this.page.waitForTimeout(3000);
      const loggedIn = await this.page.$('[data-testid="account-button"], [data-testid="account-info"]');
      if (!loggedIn) {
        throw new Error('Login verification failed');
      }

      logger.info('Uber login successful');

    } catch (error) {
      logger.error('Uber login failed', error);
      await this.takeScreenshot('uber-login-error');
      throw error;
    }
  }

  private async handle2FA(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Uber 2FA required');

    if (this.credentials.uber.totpSecret) {
      // Auto-fill TOTP if secret is provided
      const totp = this.generateTOTP(this.credentials.uber.totpSecret);
      await this.humanLikeType('[data-testid="verification-code"]', totp);
      await this.page.click('button[type="submit"]');
    } else {
      // Wait for manual entry
      logger.warn('2FA required but no TOTP secret configured. Waiting for manual entry...');
      await this.takeScreenshot('uber-2fa-required');

      if (!this.options.headless) {
        // Wait up to 2 minutes for manual 2FA
        await this.page.waitForNavigation({
          waitUntil: 'networkidle',
          timeout: 120000
        });
      } else {
        throw new Error('2FA required but running in headless mode without TOTP secret');
      }
    }
  }

  private generateTOTP(secret: string): string {
    const { TOTPManager } = require('../../security/totp');
    return TOTPManager.generateToken(secret);
  }

  private async navigateToRedemption(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Navigating to gift card redemption page');

    // Try direct navigation first
    await this.page.goto(`${config.get().uber.baseUrl}${config.get().uber.redemptionPath}`, {
      waitUntil: 'networkidle',
    });

    // Check if on redemption page
    const redeemInput = await this.page.$('input[placeholder*="gift"], input[placeholder*="code"]');
    if (redeemInput) {
      logger.info('On gift card redemption page');
      return;
    }

    // Alternative: Navigate through account menu
    await this.page.goto(`${config.get().uber.baseUrl}/eats`, {
      waitUntil: 'networkidle',
    });

    // Click account button
    const accountButton = await this.page.$('[data-testid="account-button"]');
    if (accountButton) {
      await accountButton.click();
      await this.randomDelay();
    }

    // Look for wallet/payment option
    const walletLink = await this.page.$('a:has-text("Wallet"), a:has-text("Payment")');
    if (walletLink) {
      await walletLink.click();
      await this.page.waitForLoadState('networkidle');
    }

    // Look for gift card option
    const giftCardLink = await this.page.$('a:has-text("Gift"), button:has-text("Gift")');
    if (giftCardLink) {
      await giftCardLink.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async redeemCode(code: string): Promise<UberRedemptionResult> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info(`Redeeming gift card code: ${code.substring(0, 4)}...`);

    try {
      // Find redemption input
      const codeInput = await this.page.$('input[placeholder*="gift"], input[placeholder*="code"], input[name*="code"]');
      if (!codeInput) {
        throw new Error('Gift card input field not found');
      }

      // Enter code
      await codeInput.click();
      await codeInput.fill('');
      await this.humanLikeType('input[placeholder*="gift"], input[placeholder*="code"], input[name*="code"]', code);

      // Find and click redeem button
      const redeemButton = await this.page.$('button:has-text("Redeem"), button:has-text("Apply"), button:has-text("Add")');
      if (!redeemButton) {
        throw new Error('Redeem button not found');
      }

      // Take screenshot before redemption
      await this.takeScreenshot('before-redemption');

      // Click redeem
      await redeemButton.click();

      // Wait for response
      await this.page.waitForTimeout(3000);

      // Check for success or error
      const successMessage = await this.page.$('[data-testid="success-message"], .success-message, [class*="success"]');
      const errorMessage = await this.page.$('[data-testid="error-message"], .error-message, [class*="error"]');

      if (errorMessage) {
        const errorText = await errorMessage.textContent();
        logger.error(`Redemption failed: ${errorText}`);
        await this.takeScreenshot('redemption-error');

        return {
          success: false,
          errorMessage: errorText || 'Unknown redemption error',
        };
      }

      if (successMessage) {
        logger.info('Gift card redeemed successfully');
        await this.takeScreenshot('redemption-success');

        return {
          success: true,
          redemptionId: `UBER-${Date.now()}`,
        };
      }

      // If no clear success/error, check if code input is cleared (usually means success)
      const inputValue = await codeInput.inputValue();
      if (!inputValue) {
        logger.info('Gift card likely redeemed (input cleared)');
        return {
          success: true,
          redemptionId: `UBER-${Date.now()}`,
        };
      }

      throw new Error('Redemption status unclear');

    } catch (error: any) {
      logger.error('Code redemption failed', error);
      await this.takeScreenshot('redemption-exception');

      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private async getCurrentBalance(): Promise<number> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      // Navigate to wallet/balance page
      await this.page.goto(`${config.get().uber.baseUrl}/eats/wallet`, {
        waitUntil: 'networkidle',
      });

      // Look for balance
      const balanceElement = await this.page.$('[data-testid="balance"], [class*="balance"], [class*="credits"]');
      if (balanceElement) {
        const balanceText = await balanceElement.textContent();
        const balance = parseFloat(balanceText?.replace(/[^0-9.]/g, '') || '0');
        return balance;
      }

      // Alternative: Check in account section
      const accountBalance = await this.page.$eval(
        'text=/\\$\\d+\\.\\d{2}/',
        el => el.textContent
      ).catch(() => '0');

      const balance = parseFloat(accountBalance.replace(/[^0-9.]/g, ''));
      return balance;

    } catch (error) {
      logger.warn('Could not get current balance', error);
      return 0;
    }
  }
}