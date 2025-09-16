import { BaseAutomation } from '../base';
import { createLogger } from '../../logging';
import { credentialManager } from '../../security/credentials';
import { config } from '../../config';
import { db } from '../../database';
import { PurchaseAttempt } from '../../../types';

const logger = createLogger('costco-automation');

export interface CostcoPurchaseResult {
  success: boolean;
  orderId?: string;
  totalAmount?: number;
  errorMessage?: string;
  screenshot?: string;
}

export class CostcoAutomation extends BaseAutomation {
  private credentials: any;
  private purchaseAttemptId?: string;

  constructor() {
    super({
      headless: config.get().costco.headless,
      timeout: config.get().costco.timeoutMs,
    });
  }

  async execute(): Promise<CostcoPurchaseResult> {
    try {
      // Load credentials
      this.credentials = credentialManager.getCredentials();
      if (!this.credentials?.costco) {
        throw new Error('Costco credentials not found');
      }

      // Create purchase attempt record
      const attempt = await db.createPurchaseAttempt({
        status: 'in_progress',
        scheduledAt: new Date(),
        attemptedAt: new Date(),
      });
      this.purchaseAttemptId = attempt.id;

      // Initialize browser
      await this.initBrowser();

      // Execute purchase flow
      await this.navigateToLogin();
      await this.performLogin();
      await this.searchForGiftCard();
      await this.addToCart();
      const result = await this.checkout();

      // Update purchase attempt
      await db.updatePurchaseAttempt(this.purchaseAttemptId, {
        status: result.success ? 'completed' : 'failed',
        costcoOrderId: result.orderId,
        totalAmount: result.totalAmount,
        errorMessage: result.errorMessage,
      });

      return result;

    } catch (error: any) {
      logger.error('Purchase automation failed', error);

      if (this.purchaseAttemptId) {
        await db.updatePurchaseAttempt(this.purchaseAttemptId, {
          status: 'failed',
          errorMessage: error.message,
        });
      }

      return {
        success: false,
        errorMessage: error.message,
      };

    } finally {
      await this.closeBrowser();
    }
  }

  private async navigateToLogin(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Navigating to Costco login page');
    await this.page.goto(`${config.get().costco.baseUrl}/LogonForm`, {
      waitUntil: 'networkidle',
    });

    // Check if already logged in
    const accountLink = await this.page.$('[id="header_sign_in"]');
    if (!accountLink) {
      logger.info('Already logged in, skipping login');
      return;
    }
  }

  private async performLogin(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Performing login');

    try {
      // Wait for login form
      await this.waitForSelector('#logonId');

      // Enter email
      await this.humanLikeType('#logonId', this.credentials.costco.email);
      await this.randomDelay();

      // Enter password
      await this.humanLikeType('#logonPassword_id', this.credentials.costco.password);
      await this.randomDelay();

      // Handle "Remember Me" checkbox if present
      const rememberMe = await this.page.$('#rememberMe');
      if (rememberMe) {
        await rememberMe.click();
      }

      // Click sign in button
      await this.page.click('button[type="submit"]');

      // Wait for navigation or 2FA
      await Promise.race([
        this.page.waitForNavigation({ waitUntil: 'networkidle' }),
        this.page.waitForSelector('[id="verificationCode"]', { timeout: 5000 }),
      ]).catch(() => {});

      // Check for 2FA
      const needs2FA = await this.page.$('[id="verificationCode"]');
      if (needs2FA) {
        await this.handle2FA();
      }

      // Verify login success
      await this.page.waitForTimeout(3000);
      const accountInfo = await this.page.$('[id="myaccount-d"]');
      if (!accountInfo) {
        throw new Error('Login verification failed');
      }

      logger.info('Login successful');

    } catch (error) {
      logger.error('Login failed', error);
      await this.takeScreenshot('login-error');
      throw error;
    }
  }

  private async handle2FA(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('2FA required');

    if (this.credentials.costco.totpSecret) {
      // Auto-fill TOTP if secret is provided
      const totp = this.generateTOTP(this.credentials.costco.totpSecret);
      await this.humanLikeType('[id="verificationCode"]', totp);
      await this.page.click('button[type="submit"]');
    } else {
      // Wait for manual entry
      logger.warn('2FA required but no TOTP secret configured. Waiting for manual entry...');
      await this.takeScreenshot('2fa-required');

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
    // TODO: Implement TOTP generation
    // For now, throw error
    throw new Error('TOTP generation not yet implemented');
  }

  private async searchForGiftCard(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Searching for Uber Eats gift cards');

    try {
      // Click search or navigate directly
      const searchTerms = config.get().costco.productSearchTerms.join(' ');

      // Try search box
      const searchBox = await this.page.$('[id="search-field"]');
      if (searchBox) {
        await searchBox.click();
        await this.humanLikeType('[id="search-field"]', searchTerms);
        await this.page.keyboard.press('Enter');
      } else {
        // Direct navigation to gift cards section
        await this.page.goto(`${config.get().costco.baseUrl}/gift-cards.html`);
      }

      await this.page.waitForLoadState('networkidle');
      await this.randomDelay(2000, 4000);

      // Look for Uber Eats gift card
      const products = await this.page.$$('[class*="product-tile"]');

      for (const product of products) {
        const title = await product.$eval('[class*="description"] a', el => el.textContent).catch(() => '');
        if (title.toLowerCase().includes('uber') && title.toLowerCase().includes('eats')) {
          logger.info(`Found Uber Eats gift card: ${title}`);
          await product.click('[class*="description"] a');
          await this.page.waitForLoadState('networkidle');
          return;
        }
      }

      throw new Error('Uber Eats gift card not found');

    } catch (error) {
      logger.error('Gift card search failed', error);
      await this.takeScreenshot('search-error');
      throw error;
    }
  }

  private async addToCart(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Adding gift card to cart');

    try {
      // Wait for product page
      await this.waitForSelector('[id="add-to-cart-btn"]');

      // Select quantity (usually 1)
      const quantitySelector = await this.page.$('[id="quantity-selector"]');
      if (quantitySelector) {
        await quantitySelector.selectOption('1');
      }

      // Click add to cart
      await this.page.click('[id="add-to-cart-btn"]');

      // Wait for cart modal or navigation
      await Promise.race([
        this.page.waitForSelector('[class*="added-to-cart"]', { timeout: 5000 }),
        this.page.waitForSelector('[id="cart-items"]', { timeout: 5000 }),
      ]);

      logger.info('Gift card added to cart');

      // Navigate to cart
      await this.page.goto(`${config.get().costco.baseUrl}/CheckoutCartView`);
      await this.page.waitForLoadState('networkidle');

    } catch (error) {
      logger.error('Add to cart failed', error);
      await this.takeScreenshot('add-to-cart-error');
      throw error;
    }
  }

  private async checkout(): Promise<CostcoPurchaseResult> {
    if (!this.page) throw new Error('Page not initialized');

    logger.info('Starting checkout process');

    try {
      // Click checkout button
      await this.page.click('[id="shopCartCheckoutSubmitButton"]');
      await this.page.waitForLoadState('networkidle');

      // Handle shipping/delivery options if present
      await this.handleShippingOptions();

      // Handle payment
      await this.handlePayment();

      // Review and place order
      await this.placeOrder();

      // Get order confirmation
      const orderId = await this.getOrderConfirmation();

      logger.info(`Order placed successfully: ${orderId}`);

      return {
        success: true,
        orderId,
        totalAmount: await this.getOrderTotal(),
      };

    } catch (error: any) {
      logger.error('Checkout failed', error);
      await this.takeScreenshot('checkout-error');

      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private async handleShippingOptions(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Check if shipping page is shown
    const shippingOptions = await this.page.$('[id="shipping-options"]');
    if (shippingOptions) {
      // Select default shipping
      const defaultOption = await this.page.$('[name="shippingOption"]:checked');
      if (!defaultOption) {
        await this.page.click('[name="shippingOption"]');
      }

      // Continue to payment
      await this.page.click('[id="continueButton"]');
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async handlePayment(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Check if payment selection is needed
    const paymentSection = await this.page.$('[id="payment-section"]');
    if (paymentSection) {
      // Use default payment method
      const savedCard = await this.page.$('[class*="saved-payment"]');
      if (savedCard) {
        await savedCard.click();
      }

      // Continue to review
      await this.page.click('[id="continueButton"]');
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async placeOrder(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Review order page
    await this.waitForSelector('[id="placeOrderButton"]');

    // Take screenshot before placing order
    await this.takeScreenshot('order-review');

    // Check for CAPTCHA
    const captchaHandled = await this.handleCaptcha();
    if (!captchaHandled) {
      throw new Error('CAPTCHA required for order placement');
    }

    // Place order
    await this.page.click('[id="placeOrderButton"]');

    // Wait for confirmation page
    await this.page.waitForSelector('[class*="order-confirmation"]', {
      timeout: 60000, // 1 minute timeout for order processing
    });
  }

  private async getOrderConfirmation(): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    // Get order number from confirmation page
    const orderNumber = await this.page.$eval(
      '[class*="order-number"]',
      el => el.textContent?.trim() || ''
    ).catch(() => '');

    if (!orderNumber) {
      // Try alternative selector
      const orderText = await this.page.$eval(
        '[class*="confirmation"]',
        el => el.textContent || ''
      ).catch(() => '');

      const match = orderText.match(/\d{10,}/);
      if (match) return match[0];
    }

    await this.takeScreenshot('order-confirmation');
    return orderNumber || `ORDER-${Date.now()}`;
  }

  private async getOrderTotal(): Promise<number> {
    if (!this.page) throw new Error('Page not initialized');

    const totalText = await this.page.$eval(
      '[class*="order-total"], [class*="grand-total"]',
      el => el.textContent || '0'
    ).catch(() => '0');

    const total = parseFloat(totalText.replace(/[^0-9.]/g, ''));
    return isNaN(total) ? 0 : total;
  }
}