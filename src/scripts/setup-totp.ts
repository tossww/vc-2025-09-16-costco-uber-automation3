#!/usr/bin/env tsx

import readline from 'readline/promises';
import { TOTPManager } from '../modules/security/totp';
import { credentialManager } from '../modules/security/credentials';
import { createLogger } from '../modules/logging';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('setup-totp');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setupTOTP() {
  console.log('='.repeat(60));
  console.log('TOTP (2FA) Setup for Costco-Uber Automation');
  console.log('='.repeat(60));
  console.log();

  try {
    // Load existing credentials
    const credentials = await credentialManager.loadCredentials();
    if (!credentials) {
      console.log('❌ No credentials found. Please run "npm run setup" first.');
      process.exit(1);
    }

    console.log('This will help you set up TOTP (Time-based One-Time Password) for 2FA.');
    console.log('You can either:');
    console.log('1. Generate new TOTP secrets (if setting up 2FA for the first time)');
    console.log('2. Enter existing TOTP secrets (if you already have 2FA enabled)');
    console.log();

    const choice = await rl.question('Choose an option (1 or 2): ');

    if (choice === '1') {
      await generateNewSecrets(credentials);
    } else if (choice === '2') {
      await enterExistingSecrets(credentials);
    } else {
      console.log('Invalid choice. Exiting.');
      process.exit(1);
    }

    // Test TOTP generation
    console.log();
    console.log('Testing TOTP generation...');

    if (credentials.costco.totpSecret) {
      const costcoToken = TOTPManager.generateToken(credentials.costco.totpSecret);
      console.log(`✓ Costco TOTP: ${costcoToken} (expires in ${TOTPManager.getTimeRemaining()}s)`);
    }

    if (credentials.uber.totpSecret) {
      const uberToken = TOTPManager.generateToken(credentials.uber.totpSecret);
      console.log(`✓ Uber TOTP: ${uberToken} (expires in ${TOTPManager.getTimeRemaining()}s)`);
    }

    console.log();
    console.log('✅ TOTP setup complete!');
    console.log();
    console.log('Important: Keep your TOTP secrets secure and backed up.');
    console.log('You can now run the automation with 2FA support.');

  } catch (error) {
    logger.error('TOTP setup failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function generateNewSecrets(credentials: any) {
  console.log();
  console.log('Generating new TOTP secrets...');
  console.log();

  // Costco TOTP
  const setupCostco = await rl.question('Set up TOTP for Costco? (y/n): ');
  if (setupCostco.toLowerCase() === 'y') {
    const costcoSecret = TOTPManager.generateSecret('Costco', 'Costco-Uber Bot');
    console.log();
    console.log('--- Costco TOTP Setup ---');
    console.log(`Secret: ${TOTPManager.formatSecret(costcoSecret.base32)}`);
    console.log(`URL: ${costcoSecret.otpauth_url}`);
    console.log();
    console.log('Add this secret to your authenticator app (Google Authenticator, Authy, etc.)');

    const showQR = await rl.question('Show QR code? (y/n): ');
    if (showQR.toLowerCase() === 'y') {
      const qrCode = await TOTPManager.generateQRCode(costcoSecret);
      console.log('QR Code (open in browser):');
      console.log(qrCode.substring(0, 100) + '...');
      console.log('(Full data URL logged to file)');
      logger.info('QR Code Data URL', { qrCode });
    }

    credentials.costco.totpSecret = costcoSecret.base32;
  }

  // Uber TOTP
  const setupUber = await rl.question('\nSet up TOTP for Uber? (y/n): ');
  if (setupUber.toLowerCase() === 'y') {
    const uberSecret = TOTPManager.generateSecret('Uber Eats', 'Costco-Uber Bot');
    console.log();
    console.log('--- Uber Eats TOTP Setup ---');
    console.log(`Secret: ${TOTPManager.formatSecret(uberSecret.base32)}`);
    console.log(`URL: ${uberSecret.otpauth_url}`);
    console.log();
    console.log('Add this secret to your authenticator app');

    const showQR = await rl.question('Show QR code? (y/n): ');
    if (showQR.toLowerCase() === 'y') {
      const qrCode = await TOTPManager.generateQRCode(uberSecret);
      console.log('QR Code (open in browser):');
      console.log(qrCode.substring(0, 100) + '...');
      console.log('(Full data URL logged to file)');
      logger.info('QR Code Data URL', { qrCode });
    }

    credentials.uber.totpSecret = uberSecret.base32;
  }

  // Save updated credentials
  await credentialManager.saveCredentials(credentials);
}

async function enterExistingSecrets(credentials: any) {
  console.log();
  console.log('Enter your existing TOTP secrets...');
  console.log('(These are usually 32-character base32 strings)');
  console.log();

  // Costco TOTP
  const costcoSecret = await rl.question('Costco TOTP Secret (press Enter to skip): ');
  if (costcoSecret) {
    credentials.costco.totpSecret = TOTPManager.normalizeSecret(costcoSecret);
    console.log('✓ Costco TOTP secret saved');
  }

  // Uber TOTP
  const uberSecret = await rl.question('Uber TOTP Secret (press Enter to skip): ');
  if (uberSecret) {
    credentials.uber.totpSecret = TOTPManager.normalizeSecret(uberSecret);
    console.log('✓ Uber TOTP secret saved');
  }

  // Save updated credentials
  await credentialManager.saveCredentials(credentials);
}

setupTOTP();