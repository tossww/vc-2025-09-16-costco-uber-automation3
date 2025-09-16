#!/bin/bash

# init-project.sh - Initialize a new project with AI-assisted development structure
# Usage: ./scripts/init-project.sh [project-name]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="${1:-}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate inputs
validate_inputs() {
    if [[ -z "$PROJECT_NAME" ]]; then
        log_error "Project name is required"
        echo "Usage: $0 <project-name>"
        exit 1
    fi

    if [[ -d "$PROJECT_NAME" ]]; then
        log_error "Directory '$PROJECT_NAME' already exists"
        exit 1
    fi
}

# Create project directory structure
create_directory_structure() {
    log_info "Creating project directory structure..."

    mkdir -p "$PROJECT_NAME"/{
        src,
        tests,
        docs,
        scripts,
        .github/workflows,
        .claude,
        templates,
        tools
    }

    log_success "Directory structure created"
}

# Copy template files
copy_templates() {
    log_info "Setting up template files..."

    # Copy core documentation templates
    if [[ -f "$ROOT_DIR/PRD-TEMPLATE.md" ]]; then
        cp "$ROOT_DIR/PRD-TEMPLATE.md" "$PROJECT_NAME/templates/"
    fi

    if [[ -f "$ROOT_DIR/ARCHITECTURE.md" ]]; then
        sed "s/# Steven Rules Architecture/# $PROJECT_NAME Architecture/" "$ROOT_DIR/ARCHITECTURE.md" > "$PROJECT_NAME/ARCHITECTURE.md"
    fi

    if [[ -f "$ROOT_DIR/TESTING-STRATEGY.md" ]]; then
        sed "s/# Steven Rules Testing Strategy/# $PROJECT_NAME Testing Strategy/" "$ROOT_DIR/TESTING-STRATEGY.md" > "$PROJECT_NAME/TESTING-STRATEGY.md"
    fi

    # Create initial empty decision log
    cat > "$PROJECT_NAME/DECISION-LOG.md" << 'EOF'
# Architectural Decision Log

**Purpose:** Document all significant technical decisions with context, alternatives, and rationale for future reference.

**Usage:** Add new decisions at the top of the log. Include enough detail that future team members (or future you) can understand why the decision was made.

---

## Decision Template

### ADR-XXX: [Decision Title]
**Date:** [YYYY-MM-DD]
**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-YYY]
**Deciders:** [Names]
**Context:** [What led to this decision?]

#### Problem Statement
[What problem are we solving?]

#### Decision Drivers
- [Driver 1: e.g., performance requirement]
- [Driver 2: e.g., team expertise]
- [Driver 3: e.g., budget constraints]

#### Options Considered
1. **Option A:** [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Trade-offs: [What we gain vs. what we lose]

2. **Option B:** [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Trade-offs: [What we gain vs. what we lose]

#### Decision
[Chosen option and why]

#### Consequences
- **Positive:** [Benefits we expect]
- **Negative:** [Costs and risks we accept]
- **Neutral:** [Other implications]

#### Implementation Notes
[Technical details, migration steps, or other implementation considerations]

#### Follow-up Actions
- [ ] [Action item 1]
- [ ] [Action item 2]

---

*All decisions should be documented here. Start with ADR-001 for your first architectural decision.*
EOF

    # Create initial project status
    cat > "$PROJECT_NAME/PROJECT-STATUS.md" << EOF
# $PROJECT_NAME - Project Status

**Last Updated:** $(date +"%Y-%m-%d")
**Status:** Initializing

## Current Phase
**Phase:** Project Setup
**Start Date:** $(date +"%Y-%m-%d")
**Target Completion:** TBD

## Overview
Project initialized using AI-assisted development workflow.

## Active Work Items
- [ ] Complete project initialization
- [ ] Define initial requirements in PRD
- [ ] Set up development environment
- [ ] Create first feature branch

## Recently Completed
- [x] Project structure created
- [x] Core documentation templates set up
- [x] Workflow automation scripts installed

## Upcoming Milestones
| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Initial Setup Complete | TBD | In Progress |
| First Feature Planning | TBD | Pending |

## Key Metrics
- Features Completed: 0
- Open Issues: 0
- Code Coverage: N/A
- Documentation Coverage: 100%

## Decision References
No architectural decisions recorded yet. Start with ADR-001 in DECISION-LOG.md.

## Notes
Project initialized on $(date +"%Y-%m-%d %H:%M:%S") using init-project.sh script.
EOF

    log_success "Template files copied and customized"
}

# Set up workflow scripts
setup_workflow_scripts() {
    log_info "Setting up workflow automation scripts..."

    # Copy workflow scripts
    cp "$ROOT_DIR/scripts"/*.sh "$PROJECT_NAME/scripts/" 2>/dev/null || true
    cp -r "$ROOT_DIR/.github" "$PROJECT_NAME/" 2>/dev/null || true

    # Make scripts executable
    chmod +x "$PROJECT_NAME/scripts"/*.sh 2>/dev/null || true

    log_success "Workflow scripts set up"
}

# Initialize git repository
init_git() {
    log_info "Initializing git repository..."

    cd "$PROJECT_NAME"

    git init

    # Create comprehensive .gitignore
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
vendor/
.pnp.*
.yarn/

# Build outputs
dist/
build/
*.egg-info/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage and testing
coverage/
.nyc_output/
.pytest_cache/
junit.xml

# Temporary files
tmp/
temp/

# AI context cache (keep structure but not content)
.claude/cache/
EOF

    # Create initial commit template
    cat > .gitmessage << 'EOF'
# Commit Message Template
# [type]: [brief description] (ADR-XXX if applicable)
#
# Longer explanation of what changed and why
#
# Decision Reference: ADR-XXX (if this implements a decision)
# Testing: [describe testing done]
# Breaking Changes: [none | describe]
#
# Types:
# feat: new feature
# fix: bug fix
# docs: documentation changes
# style: formatting, missing semicolons, etc
# refactor: code change that neither fixes a bug nor adds a feature
# test: adding missing tests
# chore: maintain, tooling, dependencies
EOF

    git config commit.template .gitmessage

    # Initial commit
    git add .
    git commit -m "feat: initialize $PROJECT_NAME with AI-assisted development workflow

- Set up project structure following architecture guidelines
- Added core documentation templates (PRD, Architecture, Testing)
- Configured workflow automation scripts
- Created decision logging framework
- Set up comprehensive .gitignore and commit templates

This initial setup enables AI-assisted development with proper context
maintenance and decision tracking."

    cd - > /dev/null

    log_success "Git repository initialized with initial commit"
}

# Create Claude context configuration
setup_claude_context() {
    log_info "Setting up Claude AI context configuration..."

    cat > "$PROJECT_NAME/.claude/project.md" << EOF
# $PROJECT_NAME - Claude AI Context

**Project:** $PROJECT_NAME
**Created:** $(date +"%Y-%m-%d")
**Type:** [Web App | CLI Tool | Library | Service]

## Project Overview
[Brief description of what this project does and its main purpose]

## Key Files to Always Consider
- \`ARCHITECTURE.md\` - System design and module structure
- \`DECISION-LOG.md\` - All architectural decisions with context
- \`PROJECT-STATUS.md\` - Current state and active work
- \`TESTING-STRATEGY.md\` - Testing approach and standards
- \`src/\` - Main source code
- \`tests/\` - Test files

## Development Workflow
1. Check PROJECT-STATUS.md for current context
2. Review relevant ADRs in DECISION-LOG.md
3. Update documentation before and after changes
4. Run pre-commit checks before committing
5. Update project status after significant changes

## Current Focus
[What should I prioritize when working on this codebase?]

## Important Constraints
[Technical limitations, requirements, or standards to follow]

## Context for AI Assistance
- Always check existing decisions before proposing new approaches
- Maintain consistency with documented architecture
- Update status and decision logs when making changes
- Follow testing strategy for all code changes
- Reference ADRs in commit messages when implementing decisions

---
*This file helps AI assistants understand the project context and maintain consistency with established patterns.*
EOF

    mkdir -p "$PROJECT_NAME/.claude/cache"

    log_success "Claude AI context configuration created"
}

# Create README with workflow instructions
create_readme() {
    log_info "Creating README with workflow instructions..."

    cat > "$PROJECT_NAME/README.md" << EOF
# $PROJECT_NAME

**Status:** Initializing
**Created:** $(date +"%Y-%m-%d")

## Quick Start

### For New Team Members
1. Read \`ARCHITECTURE.md\` to understand the system design
2. Review \`DECISION-LOG.md\` to understand key technical decisions
3. Check \`PROJECT-STATUS.md\` for current state and priorities
4. Follow \`TESTING-STRATEGY.md\` for development standards

### Development Workflow
1. **Start new feature:** \`./scripts/new-feature.sh feature-name\`
2. **Before committing:** \`./scripts/pre-commit-checks.sh\`
3. **Update status:** Edit \`PROJECT-STATUS.md\` after significant changes

## Project Structure
\`\`\`
$PROJECT_NAME/
├── src/                 # Main source code
├── tests/               # Test files
├── docs/                # Additional documentation
├── scripts/             # Automation scripts
├── .github/workflows/   # CI/CD workflows
├── .claude/             # AI assistant context
├── templates/           # Document templates
├── ARCHITECTURE.md      # System design
├── DECISION-LOG.md      # Technical decisions
├── PROJECT-STATUS.md    # Current status
└── TESTING-STRATEGY.md  # Testing approach
\`\`\`

## AI-Assisted Development
This project uses an AI-assisted development workflow with:
- Automatic PRD creation from templates
- Decision logging for all architectural choices
- Test scaffolding generation
- Status update automation
- Context maintenance for AI agents

See \`WORKFLOW-GUIDE.md\` for detailed usage instructions.

## Getting Started
[Add your specific setup instructions here]

## Contributing
1. All features must have a corresponding PRD
2. All architectural decisions must be logged in DECISION-LOG.md
3. Tests are required for all new functionality
4. Documentation must be updated with code changes

---
*Generated on $(date +"%Y-%m-%d") using AI-assisted development workflow*
EOF

    log_success "README created with workflow instructions"
}

# Main execution
main() {
    log_info "Initializing new project: $PROJECT_NAME"

    validate_inputs
    create_directory_structure
    copy_templates
    setup_workflow_scripts
    init_git
    setup_claude_context
    create_readme

    log_success "Project '$PROJECT_NAME' initialized successfully!"
    echo
    log_info "Next steps:"
    echo "  1. cd $PROJECT_NAME"
    echo "  2. Edit PROJECT-STATUS.md to set initial goals"
    echo "  3. Create your first feature: ./scripts/new-feature.sh initial-setup"
    echo "  4. Review WORKFLOW-GUIDE.md for detailed usage instructions"
    echo
    log_info "Happy coding with AI assistance!"
}

# Run main function
main "$@"