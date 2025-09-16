# ADR-001: Technology Stack for Costco-Uber Automation System

**Status:** Accepted
**Date:** 2025-09-16
**Deciders:** Steven Wang
**Technical Story:** [PRD.md](../../PRD.md)

## Context and Problem Statement

We need to select appropriate technologies for building a reliable, secure, and maintainable automation system that will handle financial transactions by purchasing Uber Eats gift cards from Costco, monitoring emails for gift card codes, and automatically redeeming them. The system must prioritize reliability, security, and error recovery given the financial nature of the operations.

Key requirements that drive technology decisions:
- Web scraping and browser automation for Costco and Uber Eats
- Email monitoring and parsing from multiple providers
- Robust scheduling and retry mechanisms
- Secure credential and state management
- Comprehensive logging and monitoring
- High reliability for financial transactions

## Decision Drivers

- **Reliability**: System must handle financial transactions with minimal failures
- **Security**: Secure handling of credentials and sensitive financial data
- **Maintainability**: Easy to debug, update, and extend
- **Anti-Detection**: Ability to avoid detection by anti-bot measures
- **Cross-Platform**: Support for multiple operating systems
- **Ecosystem Maturity**: Well-established libraries with active communities
- **Performance**: Efficient resource usage for long-running automation
- **Observability**: Comprehensive logging, monitoring, and debugging capabilities

## Considered Options

### Web Scraping Framework
1. **Playwright (Node.js/TypeScript)**
2. **Puppeteer (Node.js/TypeScript)**
3. **Selenium (Python/Java/C#)**
4. **Scrapy + Splash (Python)**

### Backend Runtime
1. **Node.js with TypeScript**
2. **Python**
3. **Go**
4. **C# (.NET)**

### Email Processing
1. **Node.js IMAP libraries + Gmail API**
2. **Python imaplib + Google API Client**
3. **Microsoft Graph API**
4. **Third-party email services (SendGrid, etc.)**

### Scheduling System
1. **node-cron + node-schedule**
2. **Bull Queue (Redis-based)**
3. **Agenda.js (MongoDB-based)**
4. **System cron + process management**

### Database & State Management
1. **SQLite with TypeORM**
2. **PostgreSQL with TypeORM**
3. **MongoDB with Mongoose**
4. **Redis for state + SQLite for persistence**

### Secrets Management
1. **HashiCorp Vault**
2. **AWS Secrets Manager**
3. **Azure Key Vault**
4. **Local encrypted storage (node-keytar)**

## Decision Outcome

**Chosen option:** Node.js + TypeScript ecosystem with Playwright for web automation

### Core Technology Stack:

#### **Web Scraping & Browser Automation: Playwright**
- **Justification**:
  - Superior anti-detection capabilities with stealth mode
  - Built-in handling of modern web apps (SPA, dynamic content)
  - Excellent debugging tools and screenshot capabilities
  - Better performance than Selenium, more features than Puppeteer
  - Strong TypeScript support and active development by Microsoft

#### **Backend Runtime: Node.js with TypeScript**
- **Justification**:
  - Excellent ecosystem for web automation and email processing
  - Strong typing with TypeScript improves reliability
  - Single language for entire application reduces complexity
  - Great async/await support for I/O-heavy operations
  - Rich ecosystem of libraries for all required integrations

#### **Email Processing: IMAP + Gmail API (dual approach)**
- **Justification**:
  - Gmail API for primary Gmail accounts (better reliability, rate limits)
  - IMAP as fallback and for other email providers
  - Libraries: `node-imap`, `@google-cloud/gmail`, `mailparser`
  - Provides redundancy and broad email provider support

#### **Scheduling: node-schedule + Bull Queue**
- **Justification**:
  - `node-schedule` for simple cron-like scheduling
  - `Bull Queue` (Redis-based) for complex job management with retries
  - Persistent job storage and built-in retry mechanisms
  - Excellent monitoring and dashboard capabilities

#### **Database: SQLite + Redis hybrid approach**
- **Justification**:
  - SQLite with TypeORM for persistent data (purchases, redemptions, history)
  - Redis for caching, session state, and job queues
  - SQLite: Zero configuration, ACID compliance, excellent for single-user automation
  - Redis: Fast caching and job queue persistence

#### **Secrets Management: Local encrypted storage + optional Vault**
- **Justification**:
  - `node-keytar` for local credential storage (OS keychain integration)
  - Optional HashiCorp Vault integration for enterprise deployments
  - AES-256 encryption for sensitive data files
  - Environment-based configuration for different deployment scenarios

### Supporting Libraries:

#### **HTTP Client & Anti-Detection**
```typescript
// HTTP requests with anti-detection
- axios with custom user agents and headers
- proxy-agent for proxy rotation
- playwright-stealth for enhanced anti-detection
```

#### **Email & Content Processing**
```typescript
// Email processing stack
- node-imap: IMAP email access
- @google-cloud/gmail: Gmail API client
- mailparser: Email content parsing
- pdf-parse: PDF attachment processing
- tesseract.js: OCR for image-based gift cards
```

#### **Security & Encryption**
```typescript
// Security libraries
- crypto (Node.js built-in): Core encryption
- node-keytar: OS keychain integration
- bcrypt: Password hashing
- helmet: Security headers (if web interface added)
- rate-limiter-flexible: Rate limiting
```

#### **Monitoring & Logging**
```typescript
// Observability stack
- winston: Structured logging
- pino: High-performance logging alternative
- node-statsd: Metrics collection
- @sentry/node: Error tracking and monitoring
- debug: Development debugging
```

#### **Configuration & Utilities**
```typescript
// Configuration and utilities
- dotenv: Environment configuration
- config: Hierarchical configuration
- joi: Configuration validation
- moment/date-fns: Date manipulation
- lodash: Utility functions
- uuid: Unique identifier generation
```

## Pros and Cons of the Decision

### Pros
- **Unified Ecosystem**: Single language (TypeScript) across all components
- **Strong Typing**: TypeScript reduces runtime errors for financial operations
- **Excellent Web Automation**: Playwright provides best-in-class browser automation
- **Rich Async Support**: Node.js event loop perfect for I/O-heavy automation
- **Active Community**: All chosen technologies have strong community support
- **Debugging Capabilities**: Excellent debugging tools for complex automation flows
- **Security**: Strong encryption and secrets management options
- **Monitoring**: Comprehensive logging and monitoring capabilities

### Cons
- **Single Language Risk**: Heavy dependency on Node.js ecosystem
- **Memory Usage**: Node.js can be memory-intensive for browser automation
- **CPU-Intensive Tasks**: Node.js less optimal for CPU-heavy operations (OCR, ML)
- **Concurrent Limitations**: Single-threaded nature requires careful async management

## Implementation Guidelines

### Project Structure
```
src/
├── modules/
│   ├── automation/          # Core orchestration (TypeScript)
│   ├── web-scraping/        # Playwright automation
│   ├── email-monitoring/    # IMAP + Gmail API
│   ├── scheduling/          # node-schedule + Bull
│   ├── state-management/    # TypeORM + Redis
│   ├── security/            # Encryption + secrets
│   ├── notifications/       # Multi-channel alerts
│   └── shared/              # Common utilities
├── services/
│   ├── costco-service/      # Costco integration
│   ├── uber-service/        # Uber Eats integration
│   ├── email-service/       # Email providers
│   └── notification-service/ # Alert channels
├── config/                  # Configuration files
├── migrations/              # Database migrations
└── tests/                   # Test suites
```

### Key Dependencies (package.json)
```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0",
    "playwright-stealth": "^1.0.6",
    "typeorm": "^0.3.17",
    "sqlite3": "^5.1.6",
    "redis": "^4.6.10",
    "bull": "^4.12.0",
    "node-schedule": "^2.1.1",
    "node-imap": "^0.9.6",
    "@google-cloud/gmail": "^4.1.0",
    "mailparser": "^3.6.5",
    "pdf-parse": "^1.1.1",
    "tesseract.js": "^5.0.4",
    "node-keytar": "^7.9.0",
    "crypto": "built-in",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/node": "^20.8.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1"
  }
}
```

### Security Considerations
- All credentials encrypted at rest using AES-256
- Environment-specific configuration files
- Secure browser profiles with minimal fingerprinting
- Regular credential rotation capabilities
- Comprehensive audit logging for all financial operations
- Rate limiting to respect external service limits

### Performance Considerations
- Browser instance pooling for web scraping
- Connection pooling for email and database access
- Redis caching for frequently accessed data
- Graceful error handling with exponential backoff
- Resource cleanup and memory management

## Alternative Rejected Options

### Python + Selenium
**Rejected because:**
- Selenium has inferior anti-detection capabilities
- Python async ecosystem less mature for this use case
- Additional complexity of managing Python + Node.js hybrid

### Go-based Solution
**Rejected because:**
- Limited web scraping library ecosystem
- Less mature email processing libraries
- Steeper learning curve for rapid development

### Microservices Architecture
**Rejected because:**
- Unnecessary complexity for single-user automation
- Additional operational overhead
- Increased surface area for failures in financial operations

## Compliance and Risk Mitigation

### Financial Transaction Compliance
- All financial operations logged with immutable audit trail
- Transaction verification at multiple stages
- Graceful failure handling to prevent partial transactions
- Manual intervention capabilities for edge cases

### Anti-Detection Compliance
- Respect robots.txt and rate limiting guidelines
- Human-like interaction patterns with random delays
- Proxy rotation and fingerprint management
- Monitor for CAPTCHA and anti-bot challenges

### Data Privacy Compliance
- No logging of sensitive financial data (card numbers, full emails)
- Secure credential storage following industry best practices
- Data retention policies for logs and transaction history
- GDPR-compliant data handling (if applicable)

## Future Evolution Path

### Scalability Improvements
- Migration to PostgreSQL when multi-user support needed
- Containerization with Docker for deployment flexibility
- Kubernetes deployment for high availability
- Microservices migration if system grows significantly

### Enhanced Security
- Integration with enterprise secret management (Vault, AWS Secrets Manager)
- Multi-factor authentication for sensitive operations
- Advanced anomaly detection for suspicious activities
- Regular security audits and penetration testing

### Advanced Features
- Machine learning for improved email parsing accuracy
- Advanced scheduling based on historical success patterns
- Real-time dashboard for monitoring automation health
- Integration with personal finance management tools

---

This decision provides a solid foundation for building a reliable, secure, and maintainable automation system while maintaining flexibility for future enhancements and scaling requirements.