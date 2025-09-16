# 🤖 Costco-Uber Automation System

Automated system for weekly Costco gift card purchases with email monitoring and automatic Uber Eats redemption.

## 🎯 Features

- **🛒 Automated Costco Purchases**: Weekly scheduled gift card purchases
- **📧 Email Monitoring**: Real-time detection of gift card delivery emails
- **💳 Auto-Redemption**: Automatic redemption of gift cards in Uber Eats
- **🔄 Smart Retry Logic**: Exponential backoff for failed operations
- **📊 Comprehensive Logging**: Detailed audit trails with security filtering
- **🔔 Multi-Channel Notifications**: Slack, Discord, and email alerts
- **🔐 Secure Credential Storage**: AES-256-GCM encryption at rest

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Chrome/Chromium browser
- Gmail account with app password or OAuth2
- Costco and Uber Eats accounts

### Installation

```bash
# Clone the repository
git clone https://github.com/tossww/vc-2025-09-16-costco-uber-automation3.git
cd vc-2025-09-16-costco-uber-automation3

# Install dependencies
npm install

# Run initial setup
npm run setup

# Initialize database
npm run db:migrate
```

### Configuration

1. **Set up credentials**:
```bash
npm run setup
```
Follow the prompts to enter:
- Costco email and password
- Uber Eats email and password
- Gmail credentials for monitoring

2. **Configure scheduling** in `.env`:
```env
SCHEDULING_ENABLED=true
CRON_EXPRESSION=0 10 * * 0  # Sundays at 10 AM
TIMEZONE=America/Los_Angeles
```

3. **Optional: Configure notifications**:
```env
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_ENABLED=true

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_ENABLED=true
```

## 📖 Usage

### Automatic Mode (Recommended)

Start the scheduler for fully automated operation:

```bash
npm run scheduler:start
```

The system will:
- Purchase gift cards weekly (default: Sunday 10 AM)
- Monitor emails every 5 minutes
- Automatically redeem gift cards when received
- Send notifications for all major events

### Manual Commands

```bash
# Check system status
npm run status

# Manually trigger purchase
npm run manual-purchase

# Check emails for gift cards
npm run check-emails

# Redeem pending gift cards
npm run redeem-codes
```

### Development

```bash
# Start in development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

## 🏗️ Architecture

```
src/
├── modules/
│   ├── automation/      # Web automation (Playwright)
│   │   ├── base.ts      # Base automation class
│   │   ├── costco/      # Costco purchase automation
│   │   └── uber/        # Uber redemption automation
│   ├── email/           # Email monitoring
│   │   └── monitor/     # Gmail & IMAP monitors
│   ├── scheduler/       # Cron job management
│   ├── notification/    # Alert system
│   ├── database/        # Data persistence
│   ├── security/        # Credential encryption
│   ├── config/          # Configuration management
│   └── logging/         # Secure logging
├── scripts/             # Manual trigger scripts
└── types/               # TypeScript definitions
```

## 🔒 Security

- **Encrypted Storage**: All credentials encrypted with AES-256-GCM
- **Secure Logging**: Automatic sanitization of sensitive data
- **Environment Isolation**: Credentials never logged or exposed
- **Key Rotation**: Support for credential rotation

### Security Best Practices

1. **Never commit `.env` or `.credentials.enc`**
2. **Use strong, unique passwords**
3. **Enable 2FA on all accounts when possible**
4. **Rotate credentials regularly**
5. **Monitor logs for suspicious activity**

## 📊 Monitoring

### System Status

View comprehensive system statistics:

```bash
npm run status
```

Shows:
- Purchase statistics and success rates
- Gift card redemption status
- Pending operations
- Configuration details
- Latest transaction details

### Logs

Logs are stored in the `logs/` directory:
- `combined.log` - All system logs
- `error.log` - Error logs only
- `audit.log` - Financial transaction audit trail

## 🐛 Troubleshooting

### Common Issues

**Login Failures**
- Verify credentials with `npm run setup`
- Check for 2FA requirements
- Ensure browser is up to date

**Email Not Found**
- Verify email filters in `.env`
- Check Gmail app password
- Ensure IMAP is enabled

**Redemption Failures**
- Verify Uber credentials
- Check for account restrictions
- Review redemption error logs

**CAPTCHA Challenges**
- Run in non-headless mode: `BROWSER_HEADLESS=false`
- Solve CAPTCHA manually when prompted
- Consider using proxy rotation

### Reset Credentials

If credentials become corrupted:

```bash
npm run reset-credentials
npm run setup
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SCHEDULING_ENABLED` | Enable automatic scheduling | `true` |
| `CRON_EXPRESSION` | Purchase schedule (cron format) | `0 10 * * 0` |
| `TIMEZONE` | Timezone for scheduling | `America/Los_Angeles` |
| `BROWSER_HEADLESS` | Run browser in headless mode | `false` |
| `EMAIL_CHECK_INTERVAL` | Email check interval (ms) | `300000` |
| `MAX_RETRIES` | Maximum retry attempts | `3` |
| `RETRY_BACKOFF` | Retry delay multiplier | `2` |

### Advanced Configuration

Create `config.json` for advanced settings:

```json
{
  "costco": {
    "productSearchTerms": ["uber eats gift card", "uber gift"],
    "timeoutMs": 30000
  },
  "email": {
    "searchCriteria": {
      "from": ["costco@costco.com"],
      "subject": ["order confirmation", "gift card"]
    }
  }
}
```

## 📝 Development Status

### Completed Features ✅
- Core automation framework
- Costco purchase automation
- Email monitoring (Gmail/IMAP)
- Uber Eats redemption
- Scheduler with cron jobs
- Notification system
- Manual trigger scripts
- Secure credential storage

### Roadmap 🚧
- [ ] TOTP support for 2FA
- [ ] REST API for remote control
- [ ] Docker containerization
- [ ] Web dashboard UI
- [ ] Automated test suite
- [ ] Proxy rotation support
- [ ] Multiple account support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This automation tool is for personal use only. Users are responsible for:
- Complying with Costco and Uber Eats terms of service
- Managing their own financial transactions
- Ensuring legal compliance in their jurisdiction

The authors are not responsible for any account restrictions, financial losses, or other consequences from using this software.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/tossww/vc-2025-09-16-costco-uber-automation3/issues)
- **Source**: [GitHub Repository](https://github.com/tossww/vc-2025-09-16-costco-uber-automation3)

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/) for web automation
- [Prisma](https://www.prisma.io/) for database management
- [Node-cron](https://github.com/node-cron/node-cron) for scheduling
- [Winston](https://github.com/winstonjs/winston) for logging

---

**Made with ❤️ by [Steven Wang](https://github.com/tossww)**