# AI-Assisted Development Workflow Guide

**Version:** 1.0
**Created:** 2024-09-16
**Purpose:** Step-by-step guide for using the AI-assisted development workflow

---

## Overview

This workflow combines human creativity with AI assistance to maintain high-quality, well-documented code while preventing technical debt through systematic decision tracking and context maintenance.

### Core Principles

1. **Document First:** Every feature starts with a PRD (Product Requirements Document)
2. **Decide Explicitly:** All architectural choices are logged with rationale
3. **Test Early:** Test scaffolding is generated before implementation
4. **Maintain Context:** Project status and AI context are kept current
5. **Automate Quality:** Pre-commit checks ensure consistency

---

## Quick Start

### Initial Setup

1. **Initialize a new project:**
   ```bash
   ./scripts/init-project.sh my-awesome-project
   cd my-awesome-project
   ```

2. **Start your first feature:**
   ```bash
   ./scripts/new-feature.sh user-authentication --template=api
   ```

3. **Before committing:**
   ```bash
   ./scripts/pre-commit-checks.sh --fix
   ```

---

## Detailed Workflow

### Phase 1: Project Initialization

#### Setting Up a New Project

```bash
# Create project structure with AI-assisted templates
./scripts/init-project.sh project-name
```

**What this creates:**
- Project directory with standard structure
- Core documentation (ARCHITECTURE.md, DECISION-LOG.md, etc.)
- Workflow automation scripts
- Git repository with proper .gitignore and commit templates
- Claude AI context configuration
- Initial commit with proper structure

**Next steps:**
1. Review and customize `ARCHITECTURE.md` for your specific system
2. Update `PROJECT-STATUS.md` with initial goals and timeline
3. Configure any additional tools (linters, formatters, CI/CD)

### Phase 2: Feature Development

#### Starting a New Feature

```bash
# Basic feature
./scripts/new-feature.sh feature-name

# Specialized templates
./scripts/new-feature.sh api-endpoint --template=api
./scripts/new-feature.sh user-interface --template=ui
./scripts/new-feature.sh data-pipeline --template=data
./scripts/new-feature.sh external-service --template=integration

# Without creating a git branch
./scripts/new-feature.sh hotfix --no-branch
```

**What this generates:**

1. **PRD Document** (`docs/prd-feature-name.md`)
   - Pre-filled template with your feature name
   - Specialized sections based on template type
   - Links to related documentation

2. **Architectural Decision Entry** (in `DECISION-LOG.md`)
   - Placeholder ADR with unique number
   - Structure for documenting technical choices
   - Follow-up action items

3. **Test Scaffolding** (`tests/features/feature-name/`)
   - Unit test template with fixtures
   - Integration test placeholders
   - Test configuration and sample data

4. **Project Updates**
   - Feature added to active work items in `PROJECT-STATUS.md`
   - Git branch created (unless `--no-branch`)
   - Initial commit with all scaffolding

#### Completing the PRD

1. **Define the problem clearly:**
   ```markdown
   ### Problem Statement
   User authentication takes too long and lacks security features like 2FA.
   Current system has 3-second login times and no audit trail.
   ```

2. **Specify success metrics:**
   ```markdown
   ### Success Metrics
   - Login time under 1 second for 95% of requests
   - Support for TOTP and SMS 2FA
   - Complete audit log of authentication events
   - Zero security vulnerabilities in penetration testing
   ```

3. **Detail functional requirements:**
   ```markdown
   #### Core Features
   1. **Fast Authentication**
      - JWT tokens with 15-minute expiration
      - Redis session storage for sub-100ms lookups
      - Automatic token refresh for active users
   ```

4. **Set acceptance criteria:**
   ```markdown
   ### Definition of Done
   - [ ] Login endpoint responds in under 500ms
   - [ ] 2FA integration with Google Authenticator works
   - [ ] All authentication events logged to audit table
   - [ ] Security scan shows no high/critical vulnerabilities
   ```

#### Making Architectural Decisions

When you encounter a technical choice, update the ADR:

1. **Identify the decision point:**
   ```markdown
   #### Problem Statement
   Need to choose between JWT tokens and session cookies for authentication.
   Must balance security, performance, and scalability requirements.
   ```

2. **Document your options:**
   ```markdown
   #### Options Considered
   1. **JWT Tokens**
      - Pros: Stateless, scalable, works with microservices
      - Cons: Hard to revoke, larger payload size
      - Trade-offs: Better scalability vs. harder session management

   2. **Session Cookies**
      - Pros: Easy to revoke, smaller payload, mature tooling
      - Cons: Requires session storage, harder to scale
      - Trade-offs: Simpler security vs. scaling challenges
   ```

3. **Make and justify the decision:**
   ```markdown
   #### Decision
   Choose JWT tokens with Redis blacklist for revocation.

   Reasoning:
   - Scalability is a primary concern for expected user growth
   - Can implement secure revocation with Redis blacklist
   - Team has experience with JWT from previous projects
   - Microservices architecture requires stateless authentication
   ```

4. **Document consequences:**
   ```markdown
   #### Consequences
   - **Positive:**
     - Stateless authentication supports horizontal scaling
     - Works seamlessly with planned microservices architecture
     - No database queries for every auth check
   - **Negative:**
     - Must implement blacklist for secure token revocation
     - Slightly more complex token refresh logic
     - Need monitoring for token expiration issues
   ```

### Phase 3: Implementation

#### Following Test-Driven Development

1. **Start with tests based on PRD:**
   ```python
   def test_user_login_speed():
       """Login should complete in under 500ms per PRD requirements."""
       start_time = time.time()
       result = auth_service.login(valid_user_credentials)
       elapsed = time.time() - start_time

       assert result.success is True
       assert elapsed < 0.5, f"Login took {elapsed}s, exceeds 500ms requirement"
   ```

2. **Implement to make tests pass:**
   ```python
   class AuthService:
       async def login(self, credentials):
           # Implementation that meets PRD requirements
           # Reference ADR-XXX for architectural decisions
           pass
   ```

3. **Update tests as you learn:**
   - Add edge cases discovered during implementation
   - Update performance requirements based on real measurements
   - Document any changes in PRD and relevant ADR

#### Maintaining Context

1. **Update PROJECT-STATUS.md regularly:**
   ```bash
   # After completing a milestone
   vim PROJECT-STATUS.md
   # Move completed items from "Active" to "Recently Completed"
   # Update current phase and next steps
   ```

2. **Reference decisions in commits:**
   ```bash
   git commit -m "feat: implement JWT authentication with Redis blacklist

   - Add JWT token generation and validation
   - Implement Redis-based token blacklist for secure revocation
   - Add middleware for automatic token verification
   - Include comprehensive audit logging

   Decision Reference: ADR-003
   Testing: Unit tests for token lifecycle, integration tests for auth flow
   Breaking Changes: Changes authentication API from cookies to JWT headers"
   ```

### Phase 4: Quality Assurance

#### Pre-commit Checks

Always run before committing:

```bash
# Full check with automatic fixes
./scripts/pre-commit-checks.sh --fix

# Quick check without tests (for rapid iteration)
./scripts/pre-commit-checks.sh --skip-tests

# Manual check of specific areas
./scripts/pre-commit-checks.sh | grep -E "(ERROR|WARNING)"
```

**What gets checked:**
- Git status and branch safety
- Documentation consistency and freshness
- Code formatting (black, prettier, etc.)
- Linting (flake8, eslint, shellcheck)
- Test execution and coverage
- Security patterns and potential secrets
- Build process validation
- Decision reference appropriateness

#### Handling Check Failures

1. **Formatting issues:**
   ```bash
   # Auto-fix common formatting
   ./scripts/pre-commit-checks.sh --fix
   ```

2. **Test failures:**
   ```bash
   # Run specific test suite
   pytest tests/features/user-auth/ -v

   # Update tests if requirements changed
   vim tests/features/user-auth/test_authentication.py
   ```

3. **Documentation staleness:**
   ```bash
   # Update project status
   vim PROJECT-STATUS.md

   # Document new decisions
   vim DECISION-LOG.md
   ```

4. **Security issues:**
   ```bash
   # Review flagged code
   git diff --cached

   # Remove sensitive data
   git reset HEAD file-with-secrets.py
   vim file-with-secrets.py  # Remove secrets
   git add file-with-secrets.py
   ```

---

## Advanced Usage

### Custom Templates

Create your own PRD templates for recurring feature types:

```bash
# Create custom template
mkdir -p templates/custom
cp templates/PRD-TEMPLATE.md templates/custom/prd-microservice.md

# Customize for microservice-specific requirements
vim templates/custom/prd-microservice.md

# Use custom template
./scripts/new-feature.sh payment-service --template=custom/microservice
```

### Integration with AI Assistants

#### Claude Integration

The `.claude/` directory contains context files that help AI assistants understand your project:

```markdown
# .claude/project.md - Key information for AI context
- Current project focus and priorities
- Recent architectural decisions
- Important constraints and patterns
- Files that should always be considered
```

**Best practices with AI:**

1. **Always mention relevant ADRs:**
   ```
   "Help me implement user authentication. Please review ADR-003 about
   JWT vs sessions decision first."
   ```

2. **Reference current status:**
   ```
   "Check PROJECT-STATUS.md for context. I'm working on the user-auth
   feature and need help with the Redis integration."
   ```

3. **Ask for decision help:**
   ```
   "I need to choose between approach A and B for caching. Can you help
   me create an ADR entry with pros/cons analysis?"
   ```

#### GitHub Copilot Integration

The workflow works well with GitHub Copilot:

1. **Descriptive comments trigger better suggestions:**
   ```python
   # Implement JWT token validation per ADR-003 decision
   # Must check Redis blacklist and verify signature
   def validate_token(token: str) -> bool:
       # Copilot will suggest implementation matching the comment
   ```

2. **Test-first approach provides context:**
   ```python
   def test_login_with_expired_token():
       """Expired tokens should be rejected per security requirements."""
       expired_token = generate_expired_jwt()
       # Copilot suggests the test implementation
   ```

### Continuous Integration

The GitHub workflow (`.github/workflows/ai-context.yml`) automatically:

1. **Maintains AI context files**
2. **Checks documentation freshness**
3. **Creates automated update PRs**
4. **Validates workflow scripts**
5. **Generates project metrics**

#### Customizing the CI Workflow

```yaml
# Add custom steps to .github/workflows/ai-context.yml
- name: Custom project analysis
  run: |
    # Your custom analysis script
    python scripts/analyze-complexity.py

    # Update context with results
    echo "complexity_score: $COMPLEXITY" >> .claude/metrics.json
```

---

## Troubleshooting

### Common Issues

#### "No PRD template found"

**Problem:** `new-feature.sh` can't find the PRD template.

**Solution:**
```bash
# Check if template exists
ls templates/PRD-TEMPLATE.md

# If missing, copy from root
cp PRD-TEMPLATE.md templates/

# Or run init-project.sh to set up templates
./scripts/init-project.sh existing-project-update
```

#### "Git branch already exists"

**Problem:** Feature branch name conflicts with existing branch.

**Solution:**
```bash
# List existing branches
git branch -a

# Use different name
./scripts/new-feature.sh user-auth-v2

# Or work without branch
./scripts/new-feature.sh user-auth --no-branch
```

#### "Pre-commit checks failing"

**Problem:** Code doesn't pass quality checks.

**Solution:**
```bash
# Get detailed error info
./scripts/pre-commit-checks.sh 2>&1 | tee check-results.txt

# Auto-fix what's possible
./scripts/pre-commit-checks.sh --fix

# Skip tests for quick iteration
./scripts/pre-commit-checks.sh --skip-tests

# Fix specific issues based on output
```

#### "Documentation out of sync"

**Problem:** AI context doesn't match current code.

**Solution:**
```bash
# Update status manually
vim PROJECT-STATUS.md

# Trigger CI to update context
git commit --allow-empty -m "trigger: update AI context"

# Or run GitHub workflow locally if using act
act -j update-context
```

### Debugging Scripts

#### Enable debug output:

```bash
# Add debug flag to any script
BASH_DEBUG=1 ./scripts/new-feature.sh test-feature

# Or modify script to add set -x
vim scripts/new-feature.sh
# Add "set -x" after "set -euo pipefail"
```

#### Check script dependencies:

```bash
# Verify required tools
command -v git || echo "Git required"
command -v python || echo "Python recommended"
command -v pytest || echo "Pytest recommended for Python projects"
```

---

## Best Practices

### Documentation

1. **Keep PRDs specific and testable:**
   - Use measurable success criteria
   - Include concrete examples
   - Define clear acceptance criteria

2. **Update ADRs when learning new information:**
   - Mark superseded decisions clearly
   - Reference new ADRs from old ones
   - Include lessons learned

3. **Maintain PROJECT-STATUS.md actively:**
   - Update after each significant milestone
   - Include both completed and upcoming work
   - Note blockers and dependencies

### Decision Making

1. **Document decisions before implementing:**
   - Consider multiple options
   - Involve relevant stakeholders
   - Include trade-off analysis

2. **Reference decisions in code:**
   ```python
   # JWT implementation follows ADR-003 decision
   # for stateless authentication with Redis blacklist
   class JWTAuthenticator:
   ```

3. **Review decisions periodically:**
   - Mark outdated decisions as "Superseded"
   - Update context when assumptions change
   - Learn from decision outcomes

### AI Collaboration

1. **Provide context proactively:**
   - Mention relevant files and decisions
   - Explain project constraints
   - Share current objectives

2. **Ask for structured help:**
   - Request ADR analysis for decisions
   - Ask for test case generation
   - Seek code review with specific criteria

3. **Maintain conversation history:**
   - Reference previous discussions
   - Build on established patterns
   - Correct misunderstandings quickly

---

## Examples

### Example 1: API Feature

```bash
# Start API feature
./scripts/new-feature.sh user-registration --template=api

# Complete PRD (docs/prd-user-registration.md)
# Define endpoints, validation, error handling

# Make architectural decision (DECISION-LOG.md)
# Choose database schema, validation approach

# Implement with tests
pytest tests/features/user-registration/ -v

# Pre-commit check
./scripts/pre-commit-checks.sh --fix

# Commit with decision reference
git commit -m "feat: implement user registration API

- Add POST /api/users endpoint with validation
- Include email verification workflow
- Add comprehensive error handling and logging

Decision Reference: ADR-007
Testing: Unit tests for validation, integration tests for workflow
Breaking Changes: none"
```

### Example 2: UI Component

```bash
# Start UI feature
./scripts/new-feature.sh login-form --template=ui

# Complete PRD with wireframes and accessibility requirements
# Document component design and state management approach

# Implement with component tests
npm test -- LoginForm.test.tsx

# Visual regression testing
npm run test:visual

# Commit with accessibility notes
git commit -m "feat: implement accessible login form component

- Add LoginForm with WCAG 2.1 compliance
- Include keyboard navigation and screen reader support
- Add visual feedback for validation states

Decision Reference: ADR-012
Testing: Unit tests for component logic, accessibility tests passing
Breaking Changes: none"
```

### Example 3: Data Processing

```bash
# Start data feature
./scripts/new-feature.sh analytics-pipeline --template=data

# Document data models and ETL requirements
# Choose processing framework and storage approach

# Implement with data validation
pytest tests/features/analytics-pipeline/ -v --cov

# Performance testing
python scripts/benchmark-pipeline.py

# Commit with performance metrics
git commit -m "feat: implement analytics data pipeline

- Add ETL pipeline for user behavior analytics
- Include data validation and error handling
- Achieve 1M+ events/hour processing capacity

Decision Reference: ADR-015
Testing: Unit tests for transformations, integration tests for pipeline
Performance: 1.2M events/hour sustained throughput verified
Breaking Changes: none"
```

---

## Conclusion

This AI-assisted development workflow helps you:

- **Prevent technical debt** through systematic decision tracking
- **Maintain clear context** for both humans and AI assistants
- **Ensure quality** through automated checks and testing
- **Scale development** with consistent patterns and documentation
- **Learn and improve** through structured retrospection

The key is consistency: use the tools regularly, keep documentation current, and always explain your reasoning. This creates a compound effect where each decision and feature builds on a solid foundation of documented knowledge.

---

**Quick Reference:**

- **New project:** `./scripts/init-project.sh project-name`
- **New feature:** `./scripts/new-feature.sh feature-name --template=type`
- **Pre-commit:** `./scripts/pre-commit-checks.sh --fix`
- **Update status:** Edit `PROJECT-STATUS.md`
- **Log decision:** Add ADR to `DECISION-LOG.md`

*Happy coding with AI assistance! 🤖*