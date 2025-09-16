# AI-Assisted Development Project Template

This template provides a robust foundation for building maintainable, AI-friendly software projects with strong architectural boundaries and comprehensive documentation.

## Quick Start

From the parent directory, run:
```bash
# Copy template to new project
../setup-new-project.sh ~/projects/my-app my-app-name

# Navigate to your new project
cd ~/projects/my-app

# Start your first feature
./scripts/new-feature.sh user-authentication
```

## What's Included

### Core Documentation
- **CLAUDE.md** - Instructions for AI agents working on your project
- **PRD-TEMPLATE.md** - Feature specification template with acceptance criteria
- **ARCHITECTURE.md** - Module boundaries and system design
- **DECISION-LOG.md** - Track architectural decisions and trade-offs
- **PROJECT-STATUS.md** - Current state and progress tracking
- **TESTING-STRATEGY.md** - Progressive testing approach

### Automation Scripts
- **init-project.sh** - Initialize project structure
- **new-feature.sh** - Start features with proper documentation
- **pre-commit-checks.sh** - Quality gates before commits
- **workflow-status.sh** - Monitor project health

### Templates
- **adr-template.md** - Architecture Decision Record template
- **commit-message-template.txt** - Standardized commit messages

## Project Philosophy

1. **Functionality Over Code** - PRDs are the source of truth
2. **Module Boundaries** - Clear separation prevents tech debt
3. **Decision Logging** - Every choice is documented
4. **AI-First Development** - Optimized for AI assistance
5. **Progressive Testing** - Start simple, build confidence

## Workflow

### Starting a New Feature
```bash
# 1. Create feature with PRD
./scripts/new-feature.sh email-parser

# 2. AI reads the PRD and context
# Let AI review: CLAUDE.md, PRD, ARCHITECTURE.md

# 3. Implement with AI assistance
# AI follows the workflow and updates status

# 4. Run checks before commit
./scripts/pre-commit-checks.sh
```

### Daily Development
1. Check project status: `./scripts/workflow-status.sh`
2. Review outstanding decisions in DECISION-LOG.md
3. Update PROJECT-STATUS.md weekly
4. Run pre-commit checks before pushing

## Module Structure

```
src/
├── modules/
│   ├── knowledge/     # Memory and search
│   ├── processing/    # Data pipelines
│   ├── ui/           # User interfaces
│   ├── study/        # Learning features
│   └── shared/       # Common utilities
```

## Best Practices

### For AI Agents
- Always read CLAUDE.md first
- Create PRDs before coding
- Log decisions immediately
- Update PROJECT-STATUS.md after major changes

### For Developers
- Keep modules independent
- Test at module boundaries
- Document "why" not "what"
- Commit early and often

## Customization

1. **Tech Stack**: Update ARCHITECTURE.md with your choices
2. **Testing**: Modify TESTING-STRATEGY.md for your needs
3. **Workflows**: Adjust scripts in `/scripts` directory
4. **AI Instructions**: Customize CLAUDE.md for your domain

## Common Commands

```bash
# Project initialization
npm init -y
npm install --save-dev jest prettier eslint

# Feature development
./scripts/new-feature.sh <name>
git checkout -b feature/<name>

# Quality checks
npm run lint
npm run test
./scripts/pre-commit-checks.sh

# Status monitoring
./scripts/workflow-status.sh
git log --oneline -10
```

## Troubleshooting

### Scripts not executable
```bash
chmod +x scripts/*.sh
```

### Missing dependencies
```bash
# Install required tools
npm install -g prettier eslint jest
```

### AI agent confused
1. Ensure CLAUDE.md is up to date
2. Check PROJECT-STATUS.md reflects current state
3. Review recent entries in DECISION-LOG.md

## Version

Template Version: 1.0.0
Created: 2024
Purpose: Prevent tech debt in AI-assisted development

## Support

For issues or improvements, update the templates and regenerate your project structure.