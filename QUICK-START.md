# Costco-Uber Automation Quick Start Guide

## Project Overview
Automated system to purchase Uber Eats gift cards from Costco weekly and redeem them automatically.

## Setup Instructions

### 1. Install Dependencies
```bash
cd /Users/stevenwang/projects/vc-2025-09-16-costco-uber-automation3
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

**Required Credentials:**
- Costco login (email/password)
- Email account (Gmail API or IMAP)
- Uber Eats login
- Encryption key (generate with: `openssl rand -hex 32`)

### 3. Test Components Individually

```bash
# Test Costco login
npm run manual-purchase -- --dry-run

# Test email monitoring
npm run check-emails

# Test Uber redemption
npm run redeem-codes -- --dry-run

# Check system status
npm run status
```

### 4. Start Automated Scheduler
```bash
# Development mode (visible browser)
npm run dev

# Production mode (background)
npm start
```

## Project Structure

```
src/
├── automation/     # Core workflow orchestration
├── scraping/       # Costco website automation
├── email/          # Email monitoring for codes
├── scheduler/      # Weekly scheduling logic
├── state/          # Transaction tracking
├── security/       # Credential management
└── scripts/        # Manual operation scripts
```

## Key Files

- **PRD.md** - Complete product requirements
- **ARCHITECTURE.md** - System design and modules
- **docs/decisions/001-tech-stack.md** - Technology choices

## Workflow

1. **Weekly Purchase** (Monday 9 AM default)
   - Login to Costco
   - Navigate to gift cards
   - Purchase Uber Eats cards
   - Handle checkout

2. **Email Monitoring** (Continuous)
   - Check inbox every 5 minutes
   - Extract gift card codes
   - Store in database

3. **Auto-Redemption** (Upon receipt)
   - Login to Uber Eats
   - Redeem codes
   - Verify balance update

## Safety Features

- Encrypted credential storage
- Comprehensive error handling
- Transaction audit logging
- Manual intervention support
- Dry-run mode for testing

## Monitoring

```bash
# View logs
tail -f logs/automation.log

# Check purchase history
sqlite3 data/automation.db "SELECT * FROM purchases ORDER BY created_at DESC LIMIT 10;"

# View pending redemptions
npm run status -- --pending
```

## Troubleshooting

### Browser Detection Issues
- Uses Playwright with stealth mode
- Rotates user agents
- Implements human-like delays

### Email Not Found
- Check spam folder settings
- Verify IMAP/Gmail API access
- Review email filters

### Redemption Failures
- Manual redemption: `npm run redeem-codes -- --manual`
- Check Uber session validity
- Review rate limiting

## Next Steps

1. Set up monitoring notifications (Slack/Discord)
2. Configure backup payment method
3. Test full workflow in dry-run mode
4. Schedule production deployment

## Support

- Review logs in `logs/` directory
- Check `PROJECT-STATUS.md` for current state
- Consult `DECISION-LOG.md` for architecture choices