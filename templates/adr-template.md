# ADR Template for Architectural Decisions

Use this template when adding new architectural decisions to DECISION-LOG.md.

## Template Structure

```markdown
### ADR-XXX: [Decision Title]
**Date:** YYYY-MM-DD
**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-YYY]
**Deciders:** [Names]
**Context:** [What led to this decision?]

#### Problem Statement
[What problem are we solving? Why is a decision needed?]

#### Decision Drivers
- [Driver 1: e.g., performance requirement]
- [Driver 2: e.g., team expertise]
- [Driver 3: e.g., budget constraints]
- [Driver 4: e.g., timeline pressure]
- [Driver 5: e.g., architectural consistency]

#### Options Considered
1. **Option A:** [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Trade-offs: [What we gain vs. what we lose]
   - Implementation effort: [High | Medium | Low]

2. **Option B:** [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Trade-offs: [What we gain vs. what we lose]
   - Implementation effort: [High | Medium | Low]

3. **Option C:** [Brief description] (if applicable)
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Trade-offs: [What we gain vs. what we lose]
   - Implementation effort: [High | Medium | Low]

#### Decision
[Chosen option and detailed rationale. Explain WHY this choice was made.]

#### Consequences
- **Positive:** [Benefits we expect]
- **Negative:** [Costs and risks we accept]
- **Neutral:** [Other implications]

#### Implementation Notes
[Technical details, migration steps, patterns to follow, integration points]

#### Follow-up Actions
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

#### Review Date
[Optional: When should this decision be reviewed? e.g., "After 6 months of usage"]
```

## Decision Categories

### Technology Stack Decisions
- Language/framework selection
- Database choices
- Architecture patterns
- Third-party integrations

### Design Patterns
- Code organization approaches
- API design standards
- Error handling strategies
- Testing approaches

### Operational Decisions
- Deployment strategies
- Monitoring approaches
- Security patterns
- Performance optimization

### Process Decisions
- Development workflow changes
- Code review standards
- Documentation requirements
- Quality assurance approaches

## Writing Good ADRs

### 1. Make it Discoverable
- Use clear, searchable titles
- Include relevant keywords
- Reference related ADRs

### 2. Provide Context
- Explain the business or technical problem
- Include relevant constraints
- Mention alternatives considered

### 3. Be Specific
- Include concrete examples
- Specify implementation details
- Define success criteria

### 4. Consider the Future
- Think about maintenance burden
- Consider team changes
- Plan for evolution

## Example ADRs

### Example 1: Database Choice
```markdown
### ADR-001: Use PostgreSQL for Primary Database
**Date:** 2024-09-16
**Status:** Accepted
**Deciders:** [Development Team]
**Context:** Need to choose primary database for user data and business logic

#### Problem Statement
The application needs persistent data storage with ACID guarantees, complex queries, and potential for high concurrency. Team needs to decide between SQL and NoSQL options.

#### Decision Drivers
- Strong consistency requirements for financial data
- Complex relational queries needed
- Team expertise with SQL databases
- Open source preference
- Mature ecosystem and tooling

#### Options Considered
1. **PostgreSQL**
   - Pros: ACID compliance, rich feature set, excellent performance, JSON support
   - Cons: More complex setup than simple databases
   - Trade-offs: Learning curve vs. powerful features

2. **MongoDB**
   - Pros: Flexible schema, horizontal scaling, simple setup
   - Cons: Eventual consistency, less mature for complex transactions
   - Trade-offs: Development speed vs. data consistency

#### Decision
Choose PostgreSQL as primary database.

Rationale: Strong consistency requirements and complex relational data make PostgreSQL the clear choice. Team has SQL experience, and PostgreSQL's JSON support handles semi-structured data needs.

#### Consequences
- **Positive:** Strong ACID guarantees, powerful query capabilities, mature tooling
- **Negative:** More operational complexity than simple databases
- **Neutral:** Need to learn PostgreSQL-specific features

#### Implementation Notes
- Use connection pooling (PgBouncer) for performance
- Set up read replicas for scaling read workloads
- Use migrations for schema changes
- Leverage PostgreSQL's JSONB for flexible data structures

#### Follow-up Actions
- [ ] Set up development and staging databases
- [ ] Configure backup and recovery procedures
- [ ] Establish migration workflow
- [ ] Create database performance monitoring
```

### Example 2: API Design Decision
```markdown
### ADR-002: REST API with OpenAPI Specification
**Date:** 2024-09-16
**Status:** Accepted
**Deciders:** [Backend Team, Frontend Team]
**Context:** Need to establish API design standards for client-server communication

#### Problem Statement
Multiple clients (web, mobile, third-party integrations) need consistent interface to backend services. Need to establish API design patterns and documentation standards.

#### Decision Drivers
- Client diversity (web, mobile, external partners)
- Team familiarity with REST patterns
- Documentation and tooling maturity
- Industry standard adoption
- Development speed requirements

#### Options Considered
1. **REST with OpenAPI**
   - Pros: Industry standard, excellent tooling, clear semantics
   - Cons: Can be verbose, not ideal for real-time features
   - Trade-offs: Simplicity vs. real-time capabilities

2. **GraphQL**
   - Pros: Flexible queries, strong type system, single endpoint
   - Cons: Learning curve, caching complexity, security considerations
   - Trade-offs: Query flexibility vs. implementation complexity

#### Decision
Use REST APIs with OpenAPI 3.0 specification for documentation.

Rationale: Team familiarity, excellent tooling ecosystem, and clear separation of concerns. OpenAPI provides strong contract definition and code generation capabilities.

#### Consequences
- **Positive:** Clear API contracts, excellent tooling support, familiar patterns
- **Negative:** Multiple endpoints to maintain, potential over/under-fetching
- **Neutral:** Well-established patterns but not cutting-edge

#### Implementation Notes
- Use OpenAPI 3.0 specification for all endpoints
- Generate client SDKs from OpenAPI specs
- Follow RESTful resource naming conventions
- Use HTTP status codes appropriately
- Implement consistent error response format

#### Follow-up Actions
- [ ] Create OpenAPI specification template
- [ ] Set up API documentation hosting
- [ ] Configure client SDK generation
- [ ] Establish API versioning strategy
```

## Maintenance Tips

### Numbering ADRs
- Start with ADR-001
- Use three-digit format (ADR-001, ADR-002, etc.)
- Never reuse numbers, even for deleted decisions

### Status Updates
- **Proposed:** Under discussion
- **Accepted:** Approved and implemented
- **Deprecated:** No longer recommended but still in use
- **Superseded:** Replaced by newer decision (reference the new ADR)

### Regular Review
- Review decisions quarterly or after major changes
- Update status when circumstances change
- Add lessons learned to implementation notes

---

*This template helps ensure architectural decisions are well-documented and can be understood by future team members (including AI assistants).*