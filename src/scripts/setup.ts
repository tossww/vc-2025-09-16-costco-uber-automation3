import readline from 'readline/promises';
import { credentialManager } from '../modules/security/credentials';
import { Credentials } from '../types';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setup() {
  console.log('='.repeat(60));
  console.log('Costco-Uber Automation System - Initial Setup');
  console.log('='.repeat(60));
  console.log();

  try {
    // Check for .env file
    const envPath = path.join(process.cwd(), '.env');
    try {
      await fs.access(envPath);
      console.log('✓ .env file found');
    } catch {
      console.log('! No .env file found. Creating from .env.example...');
      const examplePath = path.join(process.cwd(), '.env.example');
      const exampleContent = await fs.readFile(examplePath, 'utf-8');
      await fs.writeFile(envPath, exampleContent);
      console.log('✓ .env file created. Please edit it with your configuration.');
    }

    console.log();
    console.log('Setting up encrypted credentials...');
    console.log('Note: Credentials are encrypted at rest using AES-256-GCM');
    console.log();

    // Costco credentials
    console.log('--- Costco Credentials ---');
    const costcoEmail = await rl.question('Costco Email: ');
    const costcoPassword = await rl.question('Costco Password: ');
    const costcoTotp = await rl.question('Costco TOTP Secret (optional, press enter to skip): ');

    // Uber credentials
    console.log();
    console.log('--- Uber Eats Credentials ---');
    const uberEmail = await rl.question('Uber Email: ');
    const uberPassword = await rl.question('Uber Password: ');
    const uberTotp = await rl.question('Uber TOTP Secret (optional, press enter to skip): ');

    // Email credentials
    console.log();
    console.log('--- Email Monitoring Credentials ---');
    const emailProvider = await rl.question('Email Provider (gmail/imap) [gmail]: ') || 'gmail';
    const emailAddress = await rl.question('Email Address: ');
    const emailPassword = await rl.question('Email Password/App Password: ');

    let emailHost: string | undefined;
    let emailPort: number | undefined;

    if (emailProvider === 'imap') {
      emailHost = await rl.question('IMAP Host (e.g., imap.gmail.com): ');
      const portStr = await rl.question('IMAP Port (993): ') || '993';
      emailPort = parseInt(portStr);
    }

    const credentials: Credentials = {
      costco: {
        email: costcoEmail,
        password: costcoPassword,
        totpSecret: costcoTotp || undefined,
      },
      uber: {
        email: uberEmail,
        password: uberPassword,
        totpSecret: uberTotp || undefined,
      },
      email: {
        email: emailAddress,
        password: emailPassword,
        host: emailHost,
        port: emailPort,
      },
    };

    // Save encrypted credentials
    await credentialManager.saveCredentials(credentials);

    console.log();
    console.log('✓ Credentials encrypted and saved successfully!');
    console.log();

    // Database setup
    console.log('Setting up database...');
    const { execSync } = require('child_process');

    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
      console.log('✓ Database initialized successfully!');
    } catch (error) {
      console.log('! Database setup failed. Run "npm run db:migrate" manually.');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('Setup Complete!');
    console.log('='.repeat(60));
    console.log();
    console.log('Next steps:');
    console.log('1. Review and update the .env file with your preferences');
    console.log('2. Test the system: npm run dev');
    console.log('3. Run manual purchase test: npm run manual-purchase');
    console.log('4. Start scheduler: npm run scheduler:start');
    console.log();

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup();