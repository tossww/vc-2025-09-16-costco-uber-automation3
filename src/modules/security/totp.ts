import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createLogger } from '../logging';

const logger = createLogger('totp');

export class TOTPManager {
  /**
   * Generate a new TOTP secret
   */
  static generateSecret(name: string, issuer: string = 'Costco-Uber Automation'): any {
    return speakeasy.generateSecret({
      name: `${issuer} (${name})`,
      issuer,
      length: 32,
    });
  }

  /**
   * Generate a QR code for easy secret setup
   */
  static async generateQRCode(secret: any): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(secret.otpauth_url);
      return dataUrl;
    } catch (error) {
      logger.error('Failed to generate QR code', error);
      throw error;
    }
  }

  /**
   * Generate current TOTP token from secret
   */
  static generateToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 intervals before/after for clock skew
    });
  }

  /**
   * Get time remaining until next token (in seconds)
   */
  static getTimeRemaining(): number {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  }

  /**
   * Format secret for display (with spaces for readability)
   */
  static formatSecret(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }

  /**
   * Extract secret from various formats (with or without spaces)
   */
  static normalizeSecret(input: string): string {
    return input.replace(/\s/g, '').toUpperCase();
  }
}