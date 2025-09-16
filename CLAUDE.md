# Claude AI Agent Instructions

## Project Context
This is a monorepo for a solo developer (with occasional collaboration) building:
- Web applications with complex user interactions
- Data processing pipelines for email triage and content analysis
- Note management and second brain systems
- Study and learning applications

**Key Challenges:**
- History of accumulating tech debt
- Need for solid foundations before feature development
- Requirement for clear module boundaries
- Decision documentation for future reference

## Core Principles

### 1. Foundation First
- ALWAYS address architecture concerns before adding features
- Refactor shaky code before building on top of it
- Document decisions immediately when made
- Test critical paths before expanding functionality

### 2. Module Boundaries
- Respect the defined module structure in ARCHITECTURE.md
- Never create cross-module dependencies without explicit justification
- Each module should be independently testable and deployable
- Data flow should be unidirectional between modules

### 3. Decision Documentation
- Log ALL significant technical decisions in DECISION-LOG.md
- Include context, alternatives considered, and rationale
- Update architecture documentation when boundaries change
- Document trade-offs and future implications

## Specific Project Patterns

### Memory/Knowledge Management (Second Brain Project)
When working on knowledge systems:
```
/modules/knowledge/
├── capture/           # Input processing (web clips, notes, etc.)
├── processing/        # Content analysis, linking, tagging
├── storage/          # Database schemas and data access
├── retrieval/        # Search, filtering, recommendation
└── presentation/     # UI components for knowledge display
```

**Key Considerations:**
- Separate capture from processing to handle async workflows
- Design storage layer to be query-pattern agnostic
- Build retrieval with multiple search strategies (full-text, semantic, graph-based)
- Keep presentation layer stateless for easier testing

### Data Processing Pipelines (Email Triage)
For data processing systems:
```
/modules/processing/
├── ingestion/        # Data input and validation
├── transformation/   # Core processing logic
├── classification/   # ML/rule-based categorization
├── routing/          # Decision engine for actions
└── monitoring/       # Pipeline health and metrics
```

**Key Considerations:**
- Design for idempotency - pipelines should handle re-runs gracefully
- Implement circuit breakers for external API calls
- Store intermediate results for debugging and recovery
- Build monitoring from day one, not as an afterthought

### User Interaction Flows (Study App)
For user-facing applications:
```
/modules/ui/
├── components/       # Reusable UI components
├── workflows/        # Multi-step user processes
├── state/           # Application state management
├── integrations/    # External service connections
└── analytics/       # User behavior tracking
```

**Key Considerations:**
- Design workflows as state machines with clear transitions
- Separate business logic from UI components
- Build offline-first where possible
- Track user interactions for product insights

## Development Workflow

### Before Starting Any Feature
1. Check PROJECT-STATUS.md for current priorities
2. Review relevant sections in ARCHITECTURE.md
3. Ensure no blocking tech debt exists in the target module
4. Create or update PRD using PRD-TEMPLATE.md

### During Development
1. Follow the testing strategy in TESTING-STRATEGY.md
2. Document decisions as they're made
3. Respect module boundaries - no shortcuts
4. Update architecture docs if boundaries change

### Before Committing
1. Run full test suite for affected modules
2. Update relevant documentation
3. Log any significant decisions made
4. Update PROJECT-STATUS.md with progress

## Common Anti-Patterns to Avoid

### Technical Debt Accumulation
- DON'T add features to poorly architected code
- DON'T create temporary solutions that become permanent
- DON'T skip tests because "it's just a small change"
- DON'T defer documentation updates

### Module Boundary Violations
- DON'T directly import from other modules' internal directories
- DON'T share database schemas across modules
- DON'T create circular dependencies
- DON'T bypass defined interfaces

### Decision Documentation Gaps
- DON'T make significant architectural choices without logging them
- DON'T assume you'll remember the reasoning later
- DON'T make decisions in isolation - consider team members
- DON'T skip updating affected documentation

## Collaboration Guidelines

### When Working Solo
- Document as if someone else will inherit the codebase
- Use the PRD template even for small features
- Log decisions with sufficient context for future you
- Keep commit messages descriptive and linked to requirements

### When Collaborating
- Share decision context proactively
- Use PRDs for feature alignment
- Review architecture changes together
- Update team on any boundary modifications

## Emergency Procedures

### Handling Technical Debt Crisis
1. Stop feature development immediately
2. Create technical debt inventory
3. Prioritize by impact and effort
4. Address foundation issues before resuming features
5. Document lessons learned

### Architecture Emergency
1. Assess scope of boundary violations
2. Create isolation plan to prevent further damage
3. Implement temporary interfaces if needed
4. Schedule dedicated refactoring time
5. Update architecture documentation

## AI Agent Specific Instructions

### Code Generation
- ALWAYS follow the module structure defined in ARCHITECTURE.md
- Generate tests alongside implementation code
- Include error handling and logging
- Follow established patterns in the codebase

### Refactoring Assistance
- Identify boundary violations automatically
- Suggest architectural improvements
- Preserve existing interfaces during refactoring
- Generate migration scripts when needed

### Documentation Updates
- Keep ARCHITECTURE.md synchronized with code changes
- Update DECISION-LOG.md when making significant choices
- Maintain PROJECT-STATUS.md with current state
- Generate API documentation from code

### Quality Assurance
- Suggest test cases based on edge conditions
- Identify potential performance issues
- Flag security concerns in data processing
- Recommend monitoring and alerting improvements

## Success Metrics

### Technical Health
- Module coupling remains minimal
- Test coverage above 80% for critical paths
- No circular dependencies
- Architecture documentation stays current

### Process Health
- Decisions are documented within 24 hours
- PRDs exist for all significant features
- Technical debt is actively managed
- Status tracking is up to date

### Product Health
- Features work as specified in PRDs
- User workflows are intuitive and complete
- Data processing is reliable and fast
- Knowledge systems provide accurate results

---

Remember: The goal is sustainable, maintainable code that supports long-term product success. Take time for proper foundations now to avoid painful refactoring later.