import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { Credentials } from '../../types';
import bcrypt from 'bcrypt';

const ALGORITHM = 'aes-256-gcm';
const SALT_ROUNDS = 10;

export class CredentialManager {
  private static instance: CredentialManager;
  private encryptionKey: Buffer;
  private credentialsPath: string;
  private credentials: Credentials | null = null;

  private constructor() {
    this.credentialsPath = path.join(process.cwd(), '.credentials.enc');
    this.encryptionKey = this.deriveKey();
  }

  public static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  private deriveKey(): Buffer {
    const masterKey = process.env.MASTER_KEY || 'default-master-key-change-this';
    const salt = process.env.SALT || 'costco-uber-automation-salt';
    return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
  }

  private encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  private decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  public async saveCredentials(credentials: Credentials): Promise<void> {
    const credentialsJson = JSON.stringify(credentials);
    const encryptedData = this.encrypt(credentialsJson);

    await fs.writeFile(
      this.credentialsPath,
      JSON.stringify(encryptedData, null, 2),
      'utf-8'
    );

    this.credentials = credentials;
  }

  public async loadCredentials(): Promise<Credentials | null> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf-8');
      const encryptedData = JSON.parse(data);
      const decrypted = this.decrypt(encryptedData);
      this.credentials = JSON.parse(decrypted);
      return this.credentials;
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return null;
    }
  }

  public getCredentials(): Credentials | null {
    return this.credentials;
  }

  public async updateCredentials(
    service: keyof Credentials,
    updates: Partial<Credentials[keyof Credentials]>
  ): Promise<void> {
    if (!this.credentials) {
      throw new Error('No credentials loaded');
    }

    this.credentials[service] = {
      ...this.credentials[service],
      ...updates
    } as any;

    await this.saveCredentials(this.credentials);
  }

  public async rotateEncryptionKey(newMasterKey: string): Promise<void> {
    if (!this.credentials) {
      throw new Error('No credentials to rotate');
    }

    const oldKey = this.encryptionKey;
    const salt = process.env.SALT || 'costco-uber-automation-salt';
    this.encryptionKey = crypto.pbkdf2Sync(newMasterKey, salt, 100000, 32, 'sha256');

    await this.saveCredentials(this.credentials);
  }

  public async verifyMasterKey(masterKey: string): Promise<boolean> {
    try {
      const salt = process.env.SALT || 'costco-uber-automation-salt';
      const testKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');

      const data = await fs.readFile(this.credentialsPath, 'utf-8');
      const encryptedData = JSON.parse(data);

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, testKey, iv);
      decipher.setAuthTag(authTag);

      decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decipher.final('utf8');

      return true;
    } catch (error) {
      return false;
    }
  }

  public sanitizeForLogging(credentials: Credentials): any {
    const sanitized = JSON.parse(JSON.stringify(credentials));

    if (sanitized.costco) {
      sanitized.costco.password = '***';
      if (sanitized.costco.totpSecret) {
        sanitized.costco.totpSecret = '***';
      }
    }

    if (sanitized.uber) {
      sanitized.uber.password = '***';
      if (sanitized.uber.totpSecret) {
        sanitized.uber.totpSecret = '***';
      }
    }

    if (sanitized.email) {
      sanitized.email.password = '***';
    }

    return sanitized;
  }
}

export const credentialManager = CredentialManager.getInstance();