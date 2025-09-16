#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const credentialsPath = path.join(process.cwd(), '.credentials.enc');
const envPath = path.join(process.cwd(), '.env');

console.log('Resetting credentials and generating secure keys...\n');

// Generate secure random keys
const masterKey = crypto.randomBytes(32).toString('base64');
const salt = crypto.randomBytes(16).toString('hex');

// Remove old credentials if they exist
if (fs.existsSync(credentialsPath)) {
  fs.unlinkSync(credentialsPath);
  console.log('✓ Removed old credentials file');
}

// Update .env file
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');

  // Remove old MASTER_KEY and SALT if they exist
  envContent = envContent.split('\n')
    .filter(line => !line.startsWith('MASTER_KEY=') && !line.startsWith('SALT='))
    .join('\n');
}

// Add new keys
envContent += `\n# Security Keys (auto-generated, do not share)\nMASTER_KEY=${masterKey}\nSALT=${salt}\n`;

fs.writeFileSync(envPath, envContent);
console.log('✓ Updated .env file with new security keys');

console.log('\n✅ Credentials reset successfully!');
console.log('\nNext step: Run "npm run setup" to configure your credentials again.');