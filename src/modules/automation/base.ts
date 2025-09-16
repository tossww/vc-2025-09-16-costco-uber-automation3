import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { createLogger } from '../logging';
import { config } from '../config';

const logger = createLogger('automation-base');

export interface AutomationOptions {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export abstract class BaseAutomation {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected options: AutomationOptions;

  constructor(options: AutomationOptions = {}) {
    this.options = {
      headless: options.headless ?? config.get().costco.headless,
      slowMo: options.slowMo ?? 100,
      timeout: options.timeout ?? 30000,
      userAgent: options.userAgent ?? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: options.viewport ?? { width: 1920, height: 1080 }
    };
  }

  protected async initBrowser(): Promise<void> {
    try {
      logger.info('Launching browser...', { headless: this.options.headless });

      this.browser = await chromium.launch({
        headless: this.options.headless,
        slowMo: this.options.slowMo,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-sandbox',
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: this.options.userAgent,
        viewport: this.options.viewport,
        ignoreHTTPSErrors: true,
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.options.timeout!);

      // Add stealth behaviors
      await this.addStealthMode();

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser', error);
      throw error;
    }
  }

  private async addStealthMode(): Promise<void> {
    if (!this.page) return;

    // Remove webdriver flag
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });

    // Add realistic mouse movements
    await this.page.addInitScript(() => {
      const originalMoveTo = MouseEvent.prototype.constructor;
      MouseEvent.prototype.constructor = function(...args: any[]) {
        const event = originalMoveTo.apply(this, args);
        return event;
      };
    });

    // Randomize navigator properties
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });
  }

  protected async closeBrowser(): Promise<void> {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();

      this.page = null;
      this.context = null;
      this.browser = null;

      logger.info('Browser closed successfully');
    } catch (error) {
      logger.error('Error closing browser', error);
    }
  }

  protected async randomDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  protected async humanLikeType(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.click(selector);
    await this.randomDelay(100, 300);

    for (const char of text) {
      await this.page.type(selector, char);
      await this.randomDelay(50, 150);
    }
  }

  protected async takeScreenshot(name: string): Promise<void> {
    if (!this.page) return;

    try {
      const path = `screenshots/${name}-${Date.now()}.png`;
      await this.page.screenshot({ path, fullPage: true });
      logger.info(`Screenshot saved: ${path}`);
    } catch (error) {
      logger.error('Failed to take screenshot', error);
    }
  }

  protected async waitForSelector(selector: string, options: any = {}): Promise<any> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      return await this.page.waitForSelector(selector, {
        timeout: this.options.timeout,
        ...options
      });
    } catch (error) {
      logger.error(`Timeout waiting for selector: ${selector}`, error);
      await this.takeScreenshot('timeout-error');
      throw error;
    }
  }

  protected async handleCaptcha(): Promise<boolean> {
    if (!this.page) return false;

    // Check for common CAPTCHA indicators
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]',
      '.g-recaptcha',
      '#captcha',
      '[data-captcha]'
    ];

    for (const selector of captchaSelectors) {
      const captchaElement = await this.page.$(selector);
      if (captchaElement) {
        logger.warn('CAPTCHA detected, manual intervention may be required');
        await this.takeScreenshot('captcha-detected');

        // If running in non-headless mode, wait for manual solving
        if (!this.options.headless) {
          logger.info('Waiting for manual CAPTCHA solving (timeout: 5 minutes)...');
          await this.page.waitForTimeout(300000); // 5 minutes
          return true;
        }

        return false;
      }
    }

    return true;
  }

  abstract execute(): Promise<any>;
}