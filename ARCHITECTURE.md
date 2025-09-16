# System Architecture & Module Boundaries

**Last Updated:** September 16, 2025
**Version:** 2.0
**Owner:** Steven Wang

## Architecture Philosophy

### Core Principles
1. **Clear Separation of Concerns** - Each module has a single, well-defined responsibility
2. **Unidirectional Data Flow** - Data flows in predictable patterns, avoiding circular dependencies
3. **Interface-Based Integration** - Modules communicate through well-defined APIs, not direct imports
4. **Independent Deployability** - Each module can be developed, tested, and deployed independently
5. **Bounded Contexts** - Each module owns its data and business logic completely

### Anti-Patterns to Avoid
- **God Modules** - Single modules that do too many things
- **Circular Dependencies** - Module A depending on Module B which depends on Module A
- **Shared Mutable State** - Multiple modules modifying the same data structures
- **Leaky Abstractions** - Implementation details bleeding across module boundaries

---

## Monorepo Structure

```
/
├── modules/                    # Core business logic modules
│   ├── automation/            # Core automation and orchestration
│   ├── web-scraping/          # Web scraping and browser automation
│   ├── email-monitoring/      # Email parsing and monitoring
│   ├── scheduling/            # Job scheduling and workflow management
│   ├── state-management/      # Persistence and state tracking
│   ├── security/              # Secrets management and encryption
│   ├── notifications/         # Alert and notification system
│   └── shared/                # Common utilities and types
├── services/                  # External service integrations
│   ├── costco-service/        # Costco website integration
│   ├── email-service/         # Email provider integrations
│   ├── uber-service/          # Uber Eats API integration
│   └── notification-service/  # Slack/Discord/Email notifications
├── infrastructure/            # Deployment and operational code
├── tools/                     # Development and build tools
└── docs/                      # Project documentation
```

### Directory Conventions
- **modules/**: Business logic with clear domain boundaries
- **services/**: External integrations (APIs, databases, third-party tools)
- **infrastructure/**: Docker, K8s, CI/CD, monitoring setup
- **tools/**: Build scripts, code generators, development utilities
- **docs/**: Architecture docs, ADRs, runbooks

---

## Module Definitions

### 1. Automation Module (`/modules/automation/`)

**Purpose:** Core automation orchestration and workflow management for the Costco-Uber gift card system

```
/modules/automation/
├── orchestrator/             # Main workflow coordination
│   ├── purchase-workflow/    # Costco purchase automation flow
│   ├── email-workflow/       # Email monitoring and processing flow
│   ├── redemption-workflow/  # Uber redemption automation flow
│   └── recovery-workflow/    # Error recovery and retry logic
├── state-machine/            # Workflow state management
│   ├── purchase-states/      # Purchase process state tracking
│   ├── email-states/         # Email processing state tracking
│   ├── redemption-states/    # Redemption process state tracking
│   └── transition-handlers/  # State transition logic
├── retry-engine/             # Retry and backoff logic
│   ├── exponential-backoff/  # Configurable backoff strategies
│   ├── circuit-breaker/      # Failure detection and prevention
│   ├── deadletter-queue/     # Failed operation handling
│   └── recovery-strategies/  # Automated recovery patterns
└── monitoring/               # Operation monitoring and metrics
    ├── health-checks/        # System health validation
    ├── performance-metrics/  # Timing and throughput tracking
    ├── audit-logging/        # Financial transaction auditing
    └── alerting/             # Real-time issue detection
```

**Key Interfaces:**
- `WorkflowOrchestratorAPI` - Coordinate multi-step automation workflows
- `StateManagementAPI` - Track and persist workflow state
- `RetryEngineAPI` - Handle failures and retry logic
- `MonitoringAPI` - System health and performance tracking

**Data Ownership:**
- Workflow execution state and history
- Retry attempt tracking and backoff timers
- Performance metrics and health status
- Audit logs for all automation activities

### 2. Web Scraping Module (`/modules/web-scraping/`)

**Purpose:** Browser automation and web scraping for Costco and Uber Eats interactions

```
/modules/web-scraping/
├── browser-management/       # Browser lifecycle and session management
│   ├── playwright-wrapper/   # Playwright browser automation
│   ├── session-persistence/  # Cookie and session state management
│   ├── proxy-management/     # IP rotation and proxy handling
│   └── fingerprint-evasion/  # Anti-detection measures
├── page-navigation/          # Website navigation and interaction
│   ├── costco-navigation/    # Costco-specific navigation logic
│   ├── uber-navigation/      # Uber Eats navigation logic
│   ├── authentication/      # Login and session handling
│   └── form-interaction/     # Form filling and submission
├── element-detection/        # DOM element discovery and interaction
│   ├── selector-strategies/  # Robust element selection
│   ├── dynamic-content/      # Handling of dynamically loaded content
│   ├── captcha-handling/     # CAPTCHA detection and solving
│   └── anti-bot-detection/   # Detection of anti-bot measures
├── data-extraction/          # Content extraction and parsing
│   ├── product-scraping/     # Gift card product information
│   ├── price-extraction/     # Pricing and availability data
│   ├── confirmation-parsing/ # Purchase and redemption confirmations
│   └── error-detection/      # Error message detection and handling
└── automation-patterns/      # Reusable automation workflows
    ├── purchase-automation/  # End-to-end purchase flows
    ├── redemption-automation/# Gift card redemption flows
    ├── account-management/   # Account status and balance checking
    └── human-simulation/     # Human-like interaction patterns
```

**Key Interfaces:**
- `BrowserAutomationAPI` - Control browser instances and navigation
- `ElementInteractionAPI` - Find and interact with page elements
- `DataExtractionAPI` - Extract structured data from web pages
- `AntiDetectionAPI` - Implement stealth and evasion measures

**Data Ownership:**
- Browser session state and cookies
- Page interaction patterns and timing
- Extracted product and pricing data
- Anti-detection configuration and fingerprints

### 3. Email Monitoring Module (`/modules/email-monitoring/`)

**Purpose:** Email processing, parsing, and gift card code extraction

```
/modules/email-monitoring/
├── connection-management/    # Email provider connections
│   ├── gmail-api/           # Gmail API integration
│   ├── imap-client/         # IMAP protocol client
│   ├── oauth-handler/       # OAuth authentication flow
│   └── connection-pool/     # Connection lifecycle management
├── email-processing/         # Email content parsing and analysis
│   ├── message-filtering/   # Filter relevant emails by sender/subject
│   ├── content-parsing/     # Extract text from HTML/plain emails
│   ├── attachment-handler/  # Process PDF and image attachments
│   └── duplicate-detection/ # Prevent duplicate processing
├── code-extraction/          # Gift card code identification
│   ├── pattern-matching/    # Regex patterns for gift card codes
│   ├── ocr-processing/      # Extract codes from images/PDFs
│   ├── validation/          # Validate extracted code format
│   └── confidence-scoring/  # Rate extraction confidence
├── state-tracking/           # Email processing state management
│   ├── processed-tracking/  # Track processed emails to avoid duplicates
│   ├── retry-management/    # Handle failed processing attempts
│   ├── batch-processing/    # Process multiple emails efficiently
│   └── checkpoint-recovery/ # Resume processing after interruptions
└── monitoring/               # Email system health and metrics
    ├── connection-health/   # Monitor email provider connectivity
    ├── processing-metrics/  # Track processing speed and accuracy
    ├── error-tracking/      # Log and categorize processing errors
    └── alerting/            # Alert on processing failures or delays
```

**Key Interfaces:**
- `EmailConnectionAPI` - Manage email provider connections
- `EmailProcessingAPI` - Process and parse email content
- `CodeExtractionAPI` - Extract and validate gift card codes
- `ProcessingStateAPI` - Track processing state and history

**Data Ownership:**
- Email connection credentials and tokens
- Email processing state and history
- Extracted gift card codes and metadata
- Processing metrics and error logs

### 4. Scheduling Module (`/modules/scheduling/`)

**Purpose:** Job scheduling, cron management, and workflow timing coordination

```
/modules/scheduling/
├── cron-management/          # Cron job scheduling and execution
│   ├── cron-parser/         # Parse and validate cron expressions
│   ├── job-scheduler/       # Schedule and execute recurring jobs
│   ├── timezone-handling/   # Handle timezone conversions and DST
│   └── schedule-validation/ # Validate scheduling configurations
├── workflow-timing/          # Coordinate multi-step workflow timing
│   ├── workflow-triggers/   # Define when workflows should start
│   ├── dependency-management/ # Handle workflow dependencies
│   ├── timeout-handling/    # Manage workflow and step timeouts
│   └── parallel-execution/  # Coordinate parallel workflow steps
├── job-persistence/          # Job state and execution tracking
│   ├── job-queue/           # Persistent job queue management
│   ├── execution-history/   # Track job execution history
│   ├── failure-tracking/    # Record and analyze job failures
│   └── retry-scheduling/    # Schedule retry attempts
├── resource-management/      # Manage system resources for jobs
│   ├── resource-pools/      # Manage browser instances and connections
│   ├── load-balancing/      # Distribute work across resources
│   ├── throttling/          # Rate limiting and backpressure
│   └── cleanup/             # Resource cleanup and garbage collection
└── monitoring/               # Scheduling system monitoring
    ├── execution-metrics/   # Track job execution performance
    ├── schedule-compliance/ # Monitor adherence to schedules
    ├── resource-utilization/# Track resource usage patterns
    └── alerting/            # Alert on scheduling failures or delays
```

**Key Interfaces:**
- `JobSchedulerAPI` - Schedule and manage recurring jobs
- `WorkflowTimingAPI` - Coordinate workflow execution timing
- `JobPersistenceAPI` - Persist and track job state
- `ResourceManagementAPI` - Manage system resources for scheduled jobs

**Data Ownership:**
- Scheduled job definitions and configurations
- Job execution history and performance metrics
- Resource allocation and usage tracking
- Schedule compliance and failure analytics

### 5. State Management Module (`/modules/state-management/`)

**Purpose:** Persistent state tracking and data persistence for automation workflows

```
/modules/state-management/
├── data-models/              # Core data models and schemas
│   ├── purchase-models/     # Purchase attempt and transaction models
│   ├── email-models/        # Email processing and code extraction models
│   ├── redemption-models/   # Gift card redemption tracking models
│   └── system-models/       # System configuration and health models
├── persistence/              # Database and storage management
│   ├── database-adapters/   # Database connection and query management
│   ├── transaction-manager/ # ACID transaction handling
│   ├── migration-engine/    # Database schema migrations
│   └── backup-recovery/     # Data backup and recovery procedures
├── state-tracking/           # Workflow state management
│   ├── workflow-state/      # Track current state of automation workflows
│   ├── checkpoint-manager/  # Create and restore workflow checkpoints
│   ├── state-transitions/   # Manage state transition logic
│   └── conflict-resolution/ # Handle concurrent state modifications
├── caching/                  # In-memory state caching
│   ├── cache-manager/       # Manage cache lifecycle and eviction
│   ├── cache-strategies/    # Different caching strategies and policies
│   ├── cache-invalidation/  # Handle cache invalidation events
│   └── distributed-cache/   # Support for distributed caching
└── analytics/                # Data analytics and reporting
    ├── performance-analytics/ # Track system performance metrics
    ├── financial-analytics/  # Track financial transaction patterns
    ├── trend-analysis/       # Identify patterns in automation data
    └── reporting/            # Generate reports and insights
```

**Key Interfaces:**
- `StateManagementAPI` - Persist and retrieve workflow state
- `DataModelAPI` - CRUD operations for core data models
- `CachingAPI` - Manage in-memory state caching
- `AnalyticsAPI` - Generate insights and reports from automation data

**Data Ownership:**
- All persistent automation data and state
- Database schemas and migration history
- Cached state and performance metrics
- Analytics data and generated reports

### 6. Security Module (`/modules/security/`)

**Purpose:** Secrets management, encryption, and security controls

```
/modules/security/
├── secrets-management/       # Credential and secrets handling
│   ├── vault-integration/   # HashiCorp Vault or similar integration
│   ├── key-derivation/      # Key derivation and management
│   ├── credential-rotation/ # Automatic credential rotation
│   └── access-control/      # Role-based access to secrets
├── encryption/               # Data encryption and cryptography
│   ├── at-rest-encryption/  # Encrypt stored data and files
│   ├── in-transit-encryption/ # TLS and encrypted communications
│   ├── key-management/      # Encryption key lifecycle management
│   └── crypto-utilities/    # Cryptographic utility functions
├── authentication/           # Authentication and session management
│   ├── multi-factor-auth/   # MFA integration for sensitive operations
│   ├── session-management/  # Secure session handling
│   ├── token-management/    # OAuth and API token management
│   └── certificate-management/ # TLS certificate management
├── audit-logging/            # Security audit and compliance
│   ├── security-events/     # Log security-relevant events
│   ├── access-logging/      # Track access to sensitive resources
│   ├── compliance-reporting/ # Generate compliance reports
│   └── forensic-tools/      # Security incident investigation tools
└── threat-detection/         # Security monitoring and detection
    ├── anomaly-detection/   # Detect unusual patterns in system behavior
    ├── intrusion-detection/ # Monitor for unauthorized access attempts
    ├── vulnerability-scanning/ # Regular security vulnerability assessments
    └── incident-response/   # Automated response to security incidents
```

**Key Interfaces:**
- `SecretsManagementAPI` - Store and retrieve sensitive credentials
- `EncryptionAPI` - Encrypt and decrypt data
- `AuthenticationAPI` - Handle authentication and authorization
- `AuditLoggingAPI` - Log security events and generate audit trails

**Data Ownership:**
- Encrypted credentials and secrets
- Security audit logs and compliance data
- Authentication tokens and certificates
- Security configuration and policies

### 7. Notifications Module (`/modules/notifications/`)

**Purpose:** Alert and notification system for automation events

```
/modules/notifications/
├── notification-channels/    # Multiple notification delivery channels
│   ├── slack-integration/   # Slack webhook and bot integration
│   ├── discord-integration/ # Discord webhook and bot integration
│   ├── email-notifications/ # SMTP email notification delivery
│   └── webhook-delivery/    # Generic webhook notification delivery
├── message-formatting/       # Message content generation and formatting
│   ├── template-engine/     # Notification message templates
│   ├── content-generation/  # Dynamic content generation
│   ├── markdown-formatting/ # Rich text formatting for messages
│   └── attachment-handling/ # File and image attachments
├── notification-rules/       # Configure when and how to send notifications
│   ├── rule-engine/         # Define notification triggering rules
│   ├── priority-management/ # Manage notification priority levels
│   ├── frequency-control/   # Control notification frequency and throttling
│   └── escalation-policies/ # Handle notification escalation procedures
├── delivery-management/      # Reliable notification delivery
│   ├── retry-logic/         # Retry failed notification deliveries
│   ├── delivery-tracking/   # Track notification delivery status
│   ├── failover-handling/   # Handle failed delivery channels
│   └── batch-processing/    # Batch multiple notifications efficiently
└── monitoring/               # Notification system monitoring
    ├── delivery-metrics/    # Track notification delivery success rates
    ├── performance-monitoring/ # Monitor notification system performance
    ├── error-tracking/      # Track and analyze notification failures
    └── user-feedback/       # Collect feedback on notification effectiveness
```

**Key Interfaces:**
- `NotificationChannelAPI` - Send notifications through various channels
- `MessageFormattingAPI` - Generate and format notification content
- `NotificationRuleAPI` - Configure notification triggering rules
- `DeliveryTrackingAPI` - Track notification delivery status

**Data Ownership:**
- Notification templates and formatting rules
- Delivery history and success/failure metrics
- User notification preferences and settings
- Channel configuration and credentials

### 8. Shared Module (`/modules/shared/`)

**Purpose:** Common utilities, types, and cross-cutting concerns

```
/modules/shared/
├── types/                    # TypeScript type definitions
│   ├── api/                  # API request/response types
│   ├── domain/               # Business domain types
│   ├── ui/                   # UI component prop types
│   └── data/                 # Database and storage types
├── utilities/                # Common utility functions
│   ├── date-time/            # Date manipulation and formatting
│   ├── validation/           # Input validation and schemas
│   ├── formatting/           # Text and data formatting
│   └── algorithms/           # Reusable algorithms
├── constants/                # Application constants
│   ├── config/               # Configuration values
│   ├── errors/               # Error codes and messages
│   ├── enums/                # Enumerated values
│   └── defaults/             # Default values and settings
├── middleware/               # Cross-cutting concerns
│   ├── logging/              # Structured logging utilities
│   ├── error-handling/       # Error boundary and handling
│   ├── rate-limiting/        # API rate limiting
│   └── caching/              # Response and data caching
└── testing/                  # Test utilities and helpers
    ├── fixtures/             # Test data and mocks
    ├── helpers/              # Test utility functions
    ├── matchers/             # Custom test matchers
    └── setup/                # Test environment configuration
```

**Key Interfaces:**
- `UtilityAPI` - Common utility functions
- `ValidationAPI` - Data validation and schemas
- `LoggingAPI` - Structured logging interface
- `TestingAPI` - Test utilities and helpers

**Data Ownership:**
- Application configuration
- Shared constants and enumerations
- Common utility functions
- Test fixtures and helpers

---

## Data Flow Architecture

### Automation Workflow Flow
```
Scheduler → Automation Module → Web Scraping → Costco Purchase → State Management
    ↓              ↓                ↓               ↓                ↓
Email Monitor → Code Extraction → Redemption → Uber Eats → Notifications
    ↓              ↓                ↓               ↓                ↓
Security ← State Persistence ← Error Recovery ← Retry Logic ← Audit Logging
```

### Event-Driven Architecture
```
Automation Events → Event Bus → Module Handlers → State Updates → Notifications
                   ↓
             Audit Store → Security Logs → Monitoring → Alerting
```

### Purchase & Redemption Pipeline
```
Schedule Trigger → Purchase Workflow → Email Processing → Code Extraction → Redemption
       ↓                  ↓                  ↓                ↓              ↓
   Monitoring ← Security Audit ← State Tracking ← Error Handling ← Retry Logic
```

### Security & Compliance Flow
```
Credential Request → Security Module → Encryption → Secure Storage
        ↓                   ↓              ↓            ↓
   Audit Logging ← Access Control ← Token Management ← Key Rotation
```

---

## Integration Patterns

### Module-to-Module Communication

#### 1. API-Based Integration
```typescript
// Good: Well-defined interface
interface KnowledgeAPI {
  searchContent(query: SearchQuery): Promise<SearchResults>;
  createContent(content: ContentInput): Promise<Content>;
  linkContent(sourceId: string, targetId: string): Promise<Link>;
}

// Bad: Direct imports across modules
import { ContentDatabase } from '../knowledge/storage/database'; // ❌
```

#### 2. Event-Based Integration
```typescript
// Good: Loosely coupled events
interface ContentCreatedEvent {
  type: 'content.created';
  contentId: string;
  contentType: string;
  tags: string[];
  timestamp: Date;
}

// Modules subscribe to relevant events
processingModule.subscribe('content.created', processNewContent);
studyModule.subscribe('content.created', suggestStudyMaterial);
```

#### 3. Shared Data Contracts
```typescript
// Good: Shared types in /modules/shared/
export interface Content {
  id: string;
  title: string;
  body: string;
  contentType: ContentType;
  metadata: ContentMetadata;
}

// Modules use shared types
import { Content } from '../shared/types/domain';
```

### External Service Integration

#### Service Layer Pattern
```
/services/
├── costco-service/           # Costco website integration
│   ├── authentication/      # Costco account login and session management
│   ├── product-search/      # Gift card product discovery
│   ├── checkout-automation/ # Shopping cart and payment processing
│   └── order-tracking/      # Purchase confirmation and tracking
├── email-service/            # Email provider integrations
│   ├── gmail-api/          # Gmail API integration
│   ├── imap-client/        # Generic IMAP email access
│   ├── outlook-api/        # Microsoft Outlook integration
│   └── email-parsing/      # Email content parsing utilities
├── uber-service/             # Uber Eats integration
│   ├── authentication/     # Uber account login and session management
│   ├── gift-card-redemption/ # Gift card code redemption
│   ├── balance-checking/   # Account balance verification
│   └── transaction-history/ # Redemption history tracking
├── notification-service/     # Multi-channel notifications
│   ├── slack-webhooks/     # Slack integration
│   ├── discord-webhooks/   # Discord integration
│   ├── email-smtp/         # Email notifications
│   └── webhook-delivery/   # Generic webhook notifications
└── security-service/        # External security integrations
    ├── vault-integration/  # HashiCorp Vault or similar
    ├── captcha-solving/    # CAPTCHA solving services
    ├── proxy-management/   # Proxy rotation services
    └── monitoring-tools/   # Security monitoring integrations
```

Each service module provides:
- Connection management and authentication
- Error handling and retries with exponential backoff
- Rate limiting and circuit breakers
- Anti-detection and stealth measures
- Monitoring and health checks
- Secure credential management

---

## Dependency Rules

### Allowed Dependencies
```
Automation Module → Web Scraping Module ✅
Automation Module → Email Monitoring Module ✅
Automation Module → Scheduling Module ✅
Automation Module → State Management Module ✅
Automation Module → Notifications Module ✅
Automation Module → Shared Module ✅

Web Scraping Module → Security Module ✅
Web Scraping Module → Shared Module ✅
Email Monitoring Module → Security Module ✅
Email Monitoring Module → Shared Module ✅
Scheduling Module → State Management Module ✅
Scheduling Module → Shared Module ✅
State Management Module → Security Module ✅
State Management Module → Shared Module ✅
Security Module → Shared Module ✅
Notifications Module → Shared Module ✅

Any Module → Services (via interfaces) ✅
```

### Forbidden Dependencies
```
Web Scraping Module → Automation Module ❌ (use events instead)
Email Monitoring Module → Automation Module ❌ (use events instead)
Scheduling Module → Automation Module ❌ (use events instead)
State Management Module → Automation Module ❌
Security Module → Any Business Module ❌
Notifications Module → Any Business Module (except via events) ❌
Shared Module → Any Business Module ❌
```

### Dependency Inversion
```typescript
// Good: Depend on abstractions
interface ContentStorage {
  save(content: Content): Promise<void>;
  find(id: string): Promise<Content>;
}

class KnowledgeService {
  constructor(private storage: ContentStorage) {}
}

// Bad: Depend on concrete implementations
class KnowledgeService {
  constructor(private database: PostgresDatabase) {} // ❌
}
```

---

## Security Boundaries

### Data Access Control
- Each module manages its own data access permissions
- Cross-module data access only through defined APIs
- No direct database access between modules

### Authentication & Authorization
- Centralized authentication in auth service
- Module-level authorization for sensitive operations
- API-level permission checking

### Data Encryption
- Sensitive data encrypted at rest in storage layer
- In-transit encryption for all API communications
- Module-level secrets management

---

## Performance Considerations

### Caching Strategy
- **UI Module**: Component-level and API response caching
- **Knowledge Module**: Search result and content caching
- **Processing Module**: Intermediate result caching
- **Study Module**: Session state and progress caching

### Database Optimization
- Each module owns its database schema
- Cross-module queries only through APIs
- Denormalization allowed within module boundaries
- Read replicas for heavy query modules

### Monitoring & Observability
- Per-module metrics and dashboards
- Distributed tracing across module boundaries
- Performance budgets for inter-module calls

---

## Migration & Evolution

### Adding New Modules
1. Define clear module boundaries and responsibilities
2. Design APIs and data contracts first
3. Update this architecture document
4. Implement with proper tests and documentation

### Modifying Existing Modules
1. Assess impact on dependent modules
2. Use versioned APIs for breaking changes
3. Coordinate with affected module owners
4. Update integration tests and documentation

### Removing Modules
1. Identify all dependencies and integrations
2. Plan migration path for existing functionality
3. Deprecate APIs before removal
4. Update all dependent modules and documentation

---

## Troubleshooting Guide

### Common Issues

#### Circular Dependencies
**Symptoms:** Build failures, runtime errors, infinite loops
**Solution:**
1. Identify the circular dependency path
2. Introduce event-based communication
3. Move shared code to the shared module
4. Use dependency inversion with interfaces

#### Performance Issues
**Symptoms:** Slow API responses, high memory usage
**Solution:**
1. Profile inter-module API calls
2. Implement caching at module boundaries
3. Consider async processing for heavy operations
4. Optimize database queries within modules

#### Data Consistency Issues
**Symptoms:** Stale data, conflicting states
**Solution:**
1. Implement event-driven updates
2. Use eventual consistency patterns
3. Add data validation at module boundaries
4. Consider distributed locking for critical sections

---

## Architecture Decision Records (ADRs)

See [DECISION-LOG.md](./DECISION-LOG.md) for detailed records of architectural decisions including:

- Why we chose a monorepo structure
- Module boundary design decisions
- Technology stack choices
- Data flow and integration patterns
- Security and performance trade-offs

---

*This document should be updated whenever module boundaries change or new integration patterns are introduced. All architectural decisions should be logged in the decision log with references back to this document.*