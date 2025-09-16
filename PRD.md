# Product Requirements Document: Costco-Uber Automation System

**Document Type:** PRD
**Created:** September 16, 2025
**Owner:** Steven Wang
**Status:** Draft
**Version:** 1.0

---

## Executive Summary

### Problem Statement
Manual purchase of Uber Eats gift cards from Costco and subsequent redemption is time-consuming and error-prone. Users need automated weekly gift card purchases with reliable email monitoring and automatic redemption to maintain consistent Uber Eats credits without manual intervention.

### Solution Overview
Build an automated system that purchases Uber Eats gift cards from Costco weekly, monitors email for delivery confirmation and gift card codes, and automatically redeems codes in the Uber Eats platform. The system will handle authentication, scheduling, error recovery, and security for financial transactions.

### Success Metrics
- Successfully purchase 1 gift card pack per week with 95%+ reliability
- Process gift card codes within 30 minutes of email receipt
- Achieve 99%+ redemption success rate for valid codes
- Zero missed purchases due to system failures
- Complete weekly cycle (purchase → email monitoring → redemption) in under 2 hours

---

## Detailed Requirements

### User Stories

#### Primary User Journey
1. **As a user**, I want the system to automatically purchase Uber Eats gift cards from Costco weekly, so I don't have to manually remember and execute purchases
2. **As a user**, I want the system to monitor my email for gift card delivery notifications, so codes are processed immediately upon arrival
3. **As a user**, I want gift card codes automatically redeemed in my Uber Eats account, so my credits are always available
4. **As a user**, I want detailed logging and notifications of all activities, so I can monitor system health and financial transactions

#### Secondary User Journeys
- Manual override to skip a week's purchase
- Bulk processing of historical unprocessed gift card emails
- System health monitoring and alerting
- Credential rotation and security management
- Recovery from failed purchase/redemption attempts

### Functional Requirements

#### Core Features

1. **Automated Costco Purchase Module**
   - Navigate to Costco website and authenticate user session
   - Search for and select Uber Eats gift card products
   - Add exactly 1 pack to cart and complete checkout process
   - Handle dynamic pricing, stock availability, and checkout flows
   - Verify purchase completion and capture confirmation details
   - Handle CAPTCHA, multi-factor authentication, and anti-bot measures

2. **Email Monitoring Module**
   - Connect to email account via IMAP or Gmail API
   - Monitor inbox for Costco purchase confirmations and gift card delivery emails
   - Parse email content to extract gift card codes and relevant metadata
   - Handle various email formats and attachment processing
   - Mark processed emails and maintain processing state
   - Support multiple email providers (Gmail, Outlook, IMAP)

3. **Uber Eats Redemption Module**
   - Authenticate with Uber Eats account (web or mobile API)
   - Navigate to gift card redemption interface
   - Input gift card codes and verify successful redemption
   - Handle redemption errors, duplicate codes, and expired cards
   - Confirm credit balance updates after redemption
   - Capture redemption receipts and confirmations

4. **Scheduling & Orchestration**
   - Execute weekly purchase attempts at configurable day/time
   - Coordinate email monitoring, code extraction, and redemption workflows
   - Implement retry logic with exponential backoff for failed operations
   - Handle timezone considerations and daylight saving time changes
   - Support manual triggering and schedule overrides

#### Advanced Features
- Integration with personal finance tracking (transaction logging)
- Slack/Discord notifications for purchase and redemption events
- Dashboard for viewing purchase history, redemption status, and account balances
- Support for multiple Costco/Uber accounts
- Adaptive scheduling based on stock availability patterns
- Machine learning for improved email parsing and error prediction

### Non-Functional Requirements

#### Performance
- Complete purchase workflow within 10 minutes under normal conditions
- Process emails within 5 minutes of receipt during monitoring windows
- Redeem gift cards within 15 minutes of code extraction
- Support concurrent operations (email monitoring while purchase in progress)
- Memory usage under 512MB during normal operation

#### Security & Privacy
- Encrypted storage of all credentials and authentication tokens
- Secure credential rotation with configurable intervals
- No logging of sensitive data (passwords, card numbers, personal info)
- Secure communication with all external services (HTTPS, API keys)
- Local storage of credentials with optional cloud backup encryption
- Audit trail of all financial transactions and system actions

#### Reliability
- 99%+ uptime for scheduled operations
- Automatic recovery from transient failures (network, service outages)
- Graceful degradation when external services are unavailable
- Circuit breakers for repeated failures to prevent account lockouts
- Data persistence across system restarts and crashes
- Comprehensive error handling with actionable recovery steps

---

## Technical Specifications

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Scheduling    │───▶│   Costco Web    │───▶│     State       │
│     Module      │    │   Scraper       │    │   Management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Email Monitor   │    │   Uber Eats     │    │   Notification  │
│    Module       │    │   Automation    │    │     Module      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Secrets & Security Layer                     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Models

```typescript
interface PurchaseAttempt {
  id: string;
  scheduledAt: Date;
  attemptedAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  costcoOrderId?: string;
  totalAmount?: number;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

interface EmailProcessingRecord {
  id: string;
  emailId: string;
  receivedAt: Date;
  processedAt: Date;
  emailType: 'purchase_confirmation' | 'gift_card_delivery' | 'other';
  extractedCodes: GiftCardCode[];
  status: 'pending' | 'processed' | 'failed';
  relatedPurchaseId?: string;
}

interface GiftCardCode {
  id: string;
  code: string;
  value: number;
  extractedAt: Date;
  redeemedAt?: Date;
  redemptionStatus: 'pending' | 'redeemed' | 'failed' | 'expired';
  uberRedemptionId?: string;
  errorMessage?: string;
}

interface SystemConfiguration {
  scheduling: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
    maxRetries: number;
    retryBackoffMultiplier: number;
  };
  costco: {
    baseUrl: string;
    productSearchTerms: string[];
    timeoutMs: number;
    headless: boolean;
  };
  email: {
    provider: 'gmail' | 'imap';
    checkIntervalMs: number;
    searchCriteria: EmailSearchCriteria;
  };
  uber: {
    baseUrl: string;
    redemptionPath: string;
    timeoutMs: number;
  };
  notifications: {
    slack?: SlackConfig;
    discord?: DiscordConfig;
    email?: EmailNotificationConfig;
  };
}
```

### API Specifications

```typescript
// Core automation orchestration
POST /api/purchase/trigger          // Manual purchase trigger
GET /api/purchase/status/{id}       // Check purchase status
GET /api/purchase/history          // Purchase history

// Email processing management
POST /api/email/scan               // Manual email scan
GET /api/email/unprocessed         // List unprocessed emails
PUT /api/email/{id}/reprocess      // Reprocess specific email

// Gift card redemption
POST /api/redemption/trigger       // Manual redemption trigger
GET /api/redemption/pending        // List pending redemptions
PUT /api/redemption/{id}/retry     // Retry failed redemption

// System configuration and monitoring
GET /api/config                    // Current configuration
PUT /api/config                    // Update configuration
GET /api/health                    // System health check
GET /api/metrics                   // Performance metrics
```

---

## Acceptance Criteria

### Definition of Done

**Weekly Purchase Automation**
- [ ] System executes purchase attempts on configured schedule (default: Sunday 10 AM)
- [ ] Successfully navigates Costco website and completes checkout for Uber Eats gift cards
- [ ] Handles authentication, CAPTCHA, and anti-bot measures without manual intervention
- [ ] Retries failed attempts with exponential backoff (max 3 attempts per week)
- [ ] Logs all purchase attempts with detailed status and error information
- [ ] Sends notifications for successful purchases and persistent failures

**Email Monitoring & Code Extraction**
- [ ] Continuously monitors email inbox for gift card delivery notifications
- [ ] Accurately extracts gift card codes from various email formats and attachments
- [ ] Processes emails within 5 minutes of receipt during active monitoring
- [ ] Maintains processing state to avoid duplicate processing
- [ ] Handles email provider authentication and connection issues gracefully
- [ ] Supports both IMAP and Gmail API with configurable connection settings

**Uber Eats Redemption**
- [ ] Automatically redeems extracted gift card codes in Uber Eats account
- [ ] Verifies successful redemption and account balance updates
- [ ] Handles redemption errors (invalid codes, already redeemed, expired)
- [ ] Retries failed redemptions with appropriate delays
- [ ] Logs all redemption attempts with confirmation details
- [ ] Provides clear status for each gift card code (pending/redeemed/failed)

### User Acceptance Tests

**Test Case 1: End-to-End Weekly Cycle**
- Given: System is configured with valid Costco and Uber credentials
- When: Weekly purchase schedule triggers
- Then: System completes purchase → email monitoring → code redemption cycle
- And: User receives notifications at each major step
- And: Uber Eats account balance reflects new gift card value
- And: All activities are logged with detailed status information

**Test Case 2: Error Recovery and Resilience**
- Given: Costco website is temporarily unavailable during purchase attempt
- When: System encounters connection failures or timeouts
- Then: System retries with exponential backoff according to configuration
- And: System sends alert notifications after max retries exceeded
- And: System resumes normal operation when service becomes available
- And: No data corruption or inconsistent state occurs

**Test Case 3: Security and Credential Management**
- Given: System stores encrypted credentials for all external services
- When: System accesses Costco, email, or Uber Eats services
- Then: Credentials are decrypted only in memory during use
- And: No sensitive data appears in logs or error messages
- And: Authentication tokens are refreshed automatically when expired
- And: System detects and alerts on suspicious authentication failures

### Performance Acceptance Criteria

**Automated Purchase Module**
- [ ] Completes successful purchase workflow in under 10 minutes
- [ ] Handles page load times up to 30 seconds without failure
- [ ] Recovers from temporary network issues within 2 minutes
- [ ] Memory usage stays under 1GB during browser automation
- [ ] CPU usage peaks under 50% during intensive scraping operations

**Email Processing Module**
- [ ] Processes incoming emails within 5 minutes of receipt
- [ ] Handles mailboxes with 10,000+ emails without performance degradation
- [ ] Extracts gift card codes with 99%+ accuracy for standard email formats
- [ ] Maintains connection to email provider for 24+ hours without reconnection
- [ ] Supports concurrent email processing and purchase operations

---

## Implementation Plan

### Phase 1: Foundation & Core Infrastructure (Week 1-2)

**Infrastructure Setup**
- [ ] Set up project structure following modular architecture
- [ ] Implement secrets management and encrypted credential storage
- [ ] Create database schema for purchase tracking and state persistence
- [ ] Set up logging infrastructure with appropriate security filtering
- [ ] Build configuration management system with environment-specific settings

**Core Module Scaffolding**
- [ ] Create web scraping module with Playwright/Puppeteer foundation
- [ ] Implement email monitoring module with IMAP and Gmail API support
- [ ] Build basic scheduling module with cron job management
- [ ] Create notification module with Slack/Discord integration
- [ ] Implement health check and monitoring endpoints

### Phase 2: Core Automation Features (Week 3-5)

**Costco Purchase Automation**
- [ ] Implement Costco website navigation and authentication
- [ ] Build gift card product search and selection logic
- [ ] Create robust checkout automation with error handling
- [ ] Add support for CAPTCHA solving and anti-bot countermeasures
- [ ] Implement purchase verification and confirmation capture

**Email Processing & Code Extraction**
- [ ] Build email content parsing for gift card delivery notifications
- [ ] Implement gift card code extraction from various email formats
- [ ] Add support for attachment processing (PDF, images with OCR)
- [ ] Create duplicate detection and processing state management
- [ ] Build email provider connection resilience and reconnection logic

**Uber Eats Redemption**
- [ ] Implement Uber Eats authentication and session management
- [ ] Build gift card redemption workflow automation
- [ ] Add redemption verification and balance confirmation
- [ ] Create error handling for invalid/expired/duplicate codes
- [ ] Implement redemption retry logic with appropriate delays

### Phase 3: Integration & Reliability (Week 6-7)

**End-to-End Orchestration**
- [ ] Integrate all modules into cohesive weekly automation workflow
- [ ] Implement comprehensive error recovery and retry mechanisms
- [ ] Add detailed logging and audit trail for all financial transactions
- [ ] Create monitoring dashboards for system health and operation status
- [ ] Build comprehensive notification system for all major events

**Security & Production Readiness**
- [ ] Implement secure credential rotation and management
- [ ] Add rate limiting and circuit breakers for external service calls
- [ ] Create comprehensive error handling for edge cases and failures
- [ ] Build system backup and disaster recovery procedures
- [ ] Conduct security audit and penetration testing

**Testing & Validation**
- [ ] Create comprehensive test suite for all automation workflows
- [ ] Perform load testing with realistic usage patterns
- [ ] Validate security measures and credential protection
- [ ] Conduct user acceptance testing with real purchase scenarios
- [ ] Document operational procedures and troubleshooting guides

### Dependencies & Risks

**High-Risk Dependencies**
- **Risk:** Costco website changes could break purchase automation
  - **Mitigation:** Implement robust element selection with multiple fallback strategies
  - **Mitigation:** Create monitoring alerts for layout changes and automation failures
- **Risk:** Email provider API changes or rate limiting
  - **Mitigation:** Support multiple email providers (IMAP fallback for Gmail API)
  - **Mitigation:** Implement exponential backoff and connection pooling
- **Risk:** Uber Eats anti-automation measures
  - **Mitigation:** Use realistic browser patterns and introduce random delays
  - **Mitigation:** Monitor for CAPTCHA requirements and implement solving capabilities

**Medium-Risk Dependencies**
- **Dependency:** Stable internet connection for all automation operations
  - **Mitigation:** Implement connection monitoring and automatic retry logic
- **Dependency:** External service availability (Costco, email providers, Uber Eats)
  - **Mitigation:** Build circuit breakers and graceful degradation patterns

---

## Security Considerations

### Credential Management
- **Encryption at Rest:** All credentials encrypted using AES-256 with key derivation
- **Encryption in Transit:** HTTPS/TLS for all external API communications
- **Key Management:** Separate encryption keys for different credential types
- **Rotation Policy:** Automatic credential rotation every 90 days
- **Access Control:** Principle of least privilege for all system components

### Financial Transaction Security
- **Audit Logging:** Immutable audit trail for all purchase and redemption activities
- **Transaction Verification:** Multi-step verification for completed purchases
- **Fraud Detection:** Monitoring for unusual patterns or failed authentication attempts
- **Secure Storage:** Transaction data encrypted with separate keys from credentials
- **Compliance:** Follow PCI DSS guidelines for payment-related data handling

### Anti-Detection Measures
- **Browser Fingerprinting:** Rotate user agents, screen resolutions, and browser characteristics
- **Human-like Patterns:** Variable delays, mouse movements, and interaction patterns
- **Session Management:** Proper cookie handling and session persistence
- **Rate Limiting:** Respect website rate limits and implement backoff strategies
- **Monitoring:** Alert on CAPTCHA challenges or suspicious account activity

---

## Monitoring & Observability

### Key Metrics
- **Purchase Success Rate:** Percentage of successful weekly purchases
- **Email Processing Latency:** Time from email receipt to code extraction
- **Redemption Success Rate:** Percentage of successful code redemptions
- **System Uptime:** Availability during scheduled operation windows
- **Error Rate:** Frequency of failures requiring manual intervention

### Alerting Strategy
- **Critical Alerts:** Failed purchases, authentication failures, system crashes
- **Warning Alerts:** Retry threshold exceeded, unusual delays, service degradation
- **Informational:** Successful completions, scheduled maintenance, configuration changes

### Dashboard Components
- **Real-time Status:** Current operation status and next scheduled activities
- **Transaction History:** Complete history of purchases, codes, and redemptions
- **System Health:** Performance metrics, error rates, and service availability
- **Financial Summary:** Total spent, codes redeemed, account balances

---

## Appendix

### Glossary
- **Purchase Cycle:** Complete workflow from scheduled purchase to code redemption
- **Gift Card Pack:** Standard Costco Uber Eats gift card product (typically multiple cards)
- **Code Extraction:** Process of parsing gift card codes from email content
- **Redemption Workflow:** Process of applying gift card codes to Uber Eats account
- **Circuit Breaker:** Failure detection pattern that prevents repeated failed operations

### Reference Links
- Architecture Documentation: [ARCHITECTURE.md](/Users/stevenwang/projects/vc-2025-09-16-costco-uber-automation3/ARCHITECTURE.md)
- Technical Decisions: [docs/decisions/001-tech-stack.md](/Users/stevenwang/projects/vc-2025-09-16-costco-uber-automation3/docs/decisions/001-tech-stack.md)
- Implementation Status: [PROJECT-STATUS.md](/Users/stevenwang/projects/vc-2025-09-16-costco-uber-automation3/PROJECT-STATUS.md)

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-09-16 | Initial comprehensive PRD for Costco-Uber automation | Steven Wang |

---

*This PRD defines the complete requirements for automated Costco gift card purchasing and Uber Eats redemption. All implementation must prioritize reliability and security given the financial nature of the transactions.*