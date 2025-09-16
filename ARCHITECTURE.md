# System Architecture & Module Boundaries

**Last Updated:** [Date]
**Version:** 1.0
**Owner:** [Your Name]

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
│   ├── knowledge/             # Second brain and note management
│   ├── processing/            # Data processing pipelines
│   ├── ui/                    # User interface components
│   ├── study/                 # Learning and study applications
│   └── shared/                # Common utilities and types
├── services/                  # External service integrations
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

### 1. Knowledge Module (`/modules/knowledge/`)

**Purpose:** Manage personal knowledge, notes, and second brain functionality

```
/modules/knowledge/
├── capture/                   # Content ingestion and input processing
│   ├── web-clipper/          # Browser extension integration
│   ├── file-import/          # PDF, markdown, document processing
│   ├── api-ingestion/        # External API content fetching
│   └── manual-entry/         # User-created content forms
├── processing/               # Content analysis and enrichment
│   ├── nlp/                  # Text processing and analysis
│   ├── linking/              # Automatic relationship detection
│   ├── tagging/              # Content categorization
│   └── embeddings/           # Semantic vector generation
├── storage/                  # Data persistence and schemas
│   ├── models/               # Data models and schemas
│   ├── repositories/         # Data access layer
│   ├── search-indices/       # Full-text and vector indices
│   └── migrations/           # Database schema changes
├── retrieval/                # Content discovery and search
│   ├── search/               # Full-text and semantic search
│   ├── recommendations/      # Content suggestion algorithms
│   ├── graph-traversal/      # Link-based navigation
│   └── filters/              # Content filtering and faceting
└── presentation/             # UI components for knowledge display
    ├── components/           # Reusable UI elements
    ├── views/                # Page-level components
    ├── workflows/            # Multi-step user interactions
    └── exports/              # Content export functionality
```

**Key Interfaces:**
- `ContentIngestionAPI` - Accept content from various sources
- `SearchAPI` - Query and retrieve content
- `LinkingAPI` - Manage relationships between content
- `ExportAPI` - Generate outputs in various formats

**Data Ownership:**
- Content storage (documents, notes, web clips)
- Link relationships and graph structure
- User-generated tags and classifications
- Search indices and embeddings

### 2. Processing Module (`/modules/processing/`)

**Purpose:** Handle data processing pipelines, email triage, and automated workflows

```
/modules/processing/
├── ingestion/                # Data input and validation
│   ├── email/                # Email processing and parsing
│   ├── documents/            # File processing (PDF, Office docs)
│   ├── web-scraping/         # Website content extraction
│   └── api-integrations/     # External API data fetching
├── transformation/           # Core processing logic
│   ├── content-analysis/     # Text analysis and NLP
│   ├── data-cleaning/        # Normalization and validation
│   ├── format-conversion/    # Between different data formats
│   └── batch-operations/     # Bulk processing workflows
├── classification/           # Automated categorization
│   ├── ml-models/            # Machine learning classifiers
│   ├── rule-engines/         # Business rule processing
│   ├── training/             # Model training and updates
│   └── evaluation/           # Performance metrics and testing
├── routing/                  # Decision engine for processed data
│   ├── decision-trees/       # Rule-based routing logic
│   ├── priority-queues/      # Task prioritization
│   ├── notifications/        # Alert and notification system
│   └── automation/           # Automated action execution
└── monitoring/               # Pipeline health and metrics
    ├── metrics/              # Performance and health metrics
    ├── logging/              # Structured logging and tracing
    ├── alerting/             # Error and anomaly detection
    └── debugging/            # Pipeline inspection tools
```

**Key Interfaces:**
- `ProcessingPipelineAPI` - Submit items for processing
- `ClassificationAPI` - Categorize and tag content
- `RoutingAPI` - Determine actions based on processing results
- `MonitoringAPI` - Track pipeline health and performance

**Data Ownership:**
- Processing job queues and status
- ML model weights and training data
- Processing metrics and logs
- Classification rules and configurations

### 3. UI Module (`/modules/ui/`)

**Purpose:** User interface components and interaction workflows

```
/modules/ui/
├── components/               # Reusable UI components
│   ├── forms/                # Input forms and validation
│   ├── displays/             # Data presentation components
│   ├── navigation/           # Menus, breadcrumbs, routing
│   └── feedback/             # Loading states, errors, success messages
├── workflows/                # Multi-step user processes
│   ├── onboarding/           # New user setup and tutorials
│   ├── content-creation/     # Note creation and editing flows
│   ├── search-and-discovery/ # Content finding workflows
│   └── settings-management/  # User preference configuration
├── state/                    # Application state management
│   ├── stores/               # Global state containers
│   ├── reducers/             # State update logic
│   ├── middleware/           # State persistence and sync
│   └── selectors/            # Computed state derivations
├── integrations/             # External service connections
│   ├── auth-providers/       # Authentication services
│   ├── storage-providers/    # Cloud storage services
│   ├── notification-services/# Push notifications, email
│   └── analytics/            # User behavior tracking
└── accessibility/            # A11y features and testing
    ├── screen-reader/        # Screen reader support
    ├── keyboard-nav/         # Keyboard navigation
    ├── color-contrast/       # Visual accessibility
    └── testing/              # Accessibility test utilities
```

**Key Interfaces:**
- `ComponentLibraryAPI` - Reusable UI components
- `StateManagementAPI` - Global state operations
- `WorkflowAPI` - Multi-step user interactions
- `IntegrationAPI` - External service connections

**Data Ownership:**
- UI state and user preferences
- Form validation rules and schemas
- Component configuration and themes
- User interaction analytics

### 4. Study Module (`/modules/study/`)

**Purpose:** Learning applications, spaced repetition, and educational tools

```
/modules/study/
├── content-management/       # Study material organization
│   ├── flashcards/           # Card creation and management
│   ├── notes/                # Study notes and highlights
│   ├── quizzes/              # Quiz creation and templates
│   └── resources/            # Reference materials and links
├── learning-algorithms/      # Spaced repetition and scheduling
│   ├── spaced-repetition/    # SRS algorithms (SM2, FSRS, etc.)
│   ├── difficulty-adjustment/# Dynamic difficulty scaling
│   ├── progress-tracking/    # Learning analytics and metrics
│   └── recommendations/      # Study session suggestions
├── session-management/       # Study session workflows
│   ├── session-planning/     # Study schedule generation
│   ├── active-recall/        # Testing and quiz sessions
│   ├── review-cycles/        # Scheduled review sessions
│   └── break-management/     # Pomodoro and break timing
├── progress-analytics/       # Learning progress and insights
│   ├── performance-metrics/  # Success rates, timing, streaks
│   ├── knowledge-mapping/    # Topic mastery visualization
│   ├── trend-analysis/       # Learning pattern analysis
│   └── goal-tracking/        # Study goal progress
└── gamification/            # Motivation and engagement
    ├── achievements/         # Badges, milestones, streaks
    ├── leaderboards/         # Social comparison (if enabled)
    ├── challenges/           # Daily/weekly study challenges
    └── rewards/              # Point systems and unlocks
```

**Key Interfaces:**
- `StudyContentAPI` - Manage study materials
- `LearningAlgorithmAPI` - Schedule and optimize reviews
- `SessionAPI` - Conduct study sessions
- `ProgressAPI` - Track and analyze learning progress

**Data Ownership:**
- Study materials and flashcards
- Learning progress and performance data
- Session history and timing
- Personal study preferences and goals

### 5. Shared Module (`/modules/shared/`)

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

### Request/Response Flow
```
User Request → UI Module → Processing Module → Knowledge/Study Module → Storage
              ↓
Response ← UI Module ← Processing Module ← Knowledge/Study Module ← Storage
```

### Event-Driven Architecture
```
Event Source → Event Bus → Event Handlers → State Updates → UI Updates
              ↓
           Event Store → Analytics → Monitoring
```

### Data Processing Pipeline
```
Input → Validation → Transformation → Classification → Routing → Storage
  ↓         ↓              ↓              ↓           ↓        ↓
Monitoring ← Error Handling ← Retry Logic ← Metrics ← Logging ← Alerts
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
├── email-service/            # Email provider integration
├── storage-service/          # Cloud storage (S3, GCS, etc.)
├── auth-service/             # Authentication providers
├── notification-service/     # Push notifications, SMS
└── analytics-service/        # User behavior tracking
```

Each service module provides:
- Connection management
- Error handling and retries
- Rate limiting and circuit breakers
- Monitoring and health checks

---

## Dependency Rules

### Allowed Dependencies
```
UI Module → Knowledge Module ✅
UI Module → Study Module ✅
UI Module → Processing Module ✅
UI Module → Shared Module ✅

Knowledge Module → Shared Module ✅
Study Module → Shared Module ✅
Processing Module → Shared Module ✅

Any Module → Services (via interfaces) ✅
```

### Forbidden Dependencies
```
Knowledge Module → UI Module ❌
Study Module → Processing Module ❌ (use events instead)
Processing Module → Knowledge Module ❌ (use events instead)
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