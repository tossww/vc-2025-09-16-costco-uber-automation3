#!/bin/bash

# new-feature.sh - Start a new feature with PRD and decision logging
# Usage: ./scripts/new-feature.sh [feature-name] [--template=type] [--no-branch]

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
FEATURE_NAME="${1:-}"
TEMPLATE_TYPE="default"
CREATE_BRANCH="true"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --template=*)
            TEMPLATE_TYPE="${arg#*=}"
            shift
            ;;
        --no-branch)
            CREATE_BRANCH="false"
            shift
            ;;
    esac
done

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
    if [[ -z "$FEATURE_NAME" ]]; then
        log_error "Feature name is required"
        echo "Usage: $0 <feature-name> [--template=type] [--no-branch]"
        echo "Templates: default, api, ui, data, integration"
        exit 1
    fi

    # Validate feature name format
    if [[ ! "$FEATURE_NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
        log_error "Feature name must be lowercase with hyphens (e.g., 'user-authentication')"
        exit 1
    fi

    # Check if we're in a git repository
    if [[ "$CREATE_BRANCH" == "true" ]] && ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository. Use --no-branch or run from project root."
        exit 1
    fi
}

# Get next ADR number
get_next_adr_number() {
    local decision_log="$ROOT_DIR/DECISION-LOG.md"
    if [[ ! -f "$decision_log" ]]; then
        echo "001"
        return
    fi

    local last_adr=$(grep -o "ADR-[0-9]\{3\}" "$decision_log" | head -1 | sed 's/ADR-//')
    if [[ -z "$last_adr" ]]; then
        echo "001"
    else
        printf "%03d" $((10#$last_adr + 1))
    fi
}

# Create feature branch
create_feature_branch() {
    if [[ "$CREATE_BRANCH" != "true" ]]; then
        return
    fi

    log_info "Creating feature branch: feature/$FEATURE_NAME"

    # Ensure we're on main/master
    local main_branch
    if git show-ref --verify --quiet refs/heads/main; then
        main_branch="main"
    elif git show-ref --verify --quiet refs/heads/master; then
        main_branch="master"
    else
        log_warning "No main or master branch found, creating branch from current HEAD"
        main_branch=$(git branch --show-current)
    fi

    git checkout "$main_branch" 2>/dev/null || true
    git pull origin "$main_branch" 2>/dev/null || log_warning "Could not pull latest changes"
    git checkout -b "feature/$FEATURE_NAME"

    log_success "Feature branch created: feature/$FEATURE_NAME"
}

# Generate PRD from template
generate_prd() {
    log_info "Generating PRD for feature: $FEATURE_NAME"

    local prd_file="docs/prd-$FEATURE_NAME.md"
    local template_file="templates/PRD-TEMPLATE.md"

    # Ensure docs directory exists
    mkdir -p "$(dirname "$prd_file")"

    # Check if template exists
    if [[ ! -f "$template_file" ]] && [[ -f "$ROOT_DIR/PRD-TEMPLATE.md" ]]; then
        template_file="$ROOT_DIR/PRD-TEMPLATE.md"
    fi

    if [[ ! -f "$template_file" ]]; then
        log_error "PRD template not found. Run init-project.sh first or create templates/PRD-TEMPLATE.md"
        exit 1
    fi

    # Copy and customize template
    cp "$template_file" "$prd_file"

    # Replace placeholders
    local feature_title=$(echo "$FEATURE_NAME" | sed 's/-/ /g' | sed 's/\b\w/\U&/g')
    local date=$(date +"%Y-%m-%d")

    sed -i.bak \
        -e "s/\[Date\]/$date/g" \
        -e "s/\[Your Name\]/$(git config user.name 2>/dev/null || echo 'Developer')/g" \
        -e "s/\[Draft | Review | Approved | In Progress | Complete\]/Draft/g" \
        -e "s/\[1.0\]/1.0/g" \
        -e "1s/.*/# Product Requirements Document - $feature_title/" \
        "$prd_file"

    # Remove backup file
    rm -f "$prd_file.bak"

    # Add feature-specific template content based on type
    case "$TEMPLATE_TYPE" in
        "api")
            add_api_template_content "$prd_file"
            ;;
        "ui")
            add_ui_template_content "$prd_file"
            ;;
        "data")
            add_data_template_content "$prd_file"
            ;;
        "integration")
            add_integration_template_content "$prd_file"
            ;;
    esac

    log_success "PRD generated: $prd_file"
}

# Add API-specific template content
add_api_template_content() {
    local prd_file="$1"
    cat >> "$prd_file" << 'EOF'

## API-Specific Considerations

### Endpoints
- [ ] Define all endpoints with HTTP methods
- [ ] Specify request/response schemas
- [ ] Document error responses and status codes
- [ ] Plan versioning strategy

### Security
- [ ] Authentication requirements
- [ ] Authorization and permissions
- [ ] Rate limiting strategy
- [ ] Input validation and sanitization

### Performance
- [ ] Response time requirements
- [ ] Throughput expectations
- [ ] Caching strategy
- [ ] Database query optimization

### Documentation
- [ ] OpenAPI/Swagger specification
- [ ] Example requests and responses
- [ ] SDK considerations
- [ ] Integration examples
EOF
}

# Add UI-specific template content
add_ui_template_content() {
    local prd_file="$1"
    cat >> "$prd_file" << 'EOF'

## UI-Specific Considerations

### User Experience
- [ ] User flow diagrams
- [ ] Wireframes and mockups
- [ ] Responsive design requirements
- [ ] Accessibility standards (WCAG 2.1)

### Component Design
- [ ] Reusable component identification
- [ ] State management approach
- [ ] Component library integration
- [ ] Design system compliance

### Performance
- [ ] Page load time requirements
- [ ] Bundle size constraints
- [ ] Lazy loading strategy
- [ ] SEO considerations

### Testing
- [ ] Unit tests for components
- [ ] Integration tests for user flows
- [ ] Visual regression testing
- [ ] Accessibility testing
EOF
}

# Add data-specific template content
add_data_template_content() {
    local prd_file="$1"
    cat >> "$prd_file" << 'EOF'

## Data-Specific Considerations

### Data Models
- [ ] Entity relationship diagrams
- [ ] Data validation rules
- [ ] Migration strategy
- [ ] Backup and recovery plans

### Performance
- [ ] Query optimization requirements
- [ ] Indexing strategy
- [ ] Caching approach
- [ ] Scalability considerations

### Data Quality
- [ ] Data validation and cleansing
- [ ] Duplicate detection and handling
- [ ] Data integrity constraints
- [ ] Audit trail requirements

### Privacy & Compliance
- [ ] Data retention policies
- [ ] Privacy regulations (GDPR, CCPA)
- [ ] Data anonymization needs
- [ ] Access logging requirements
EOF
}

# Add integration-specific template content
add_integration_template_content() {
    local prd_file="$1"
    cat >> "$prd_file" << 'EOF'

## Integration-Specific Considerations

### External Services
- [ ] Third-party API dependencies
- [ ] Authentication and credentials management
- [ ] Rate limiting and quotas
- [ ] Fallback and error handling

### Data Flow
- [ ] Data transformation requirements
- [ ] Batch vs. real-time processing
- [ ] Data validation and sanitization
- [ ] Monitoring and alerting

### Reliability
- [ ] Circuit breaker patterns
- [ ] Retry strategies
- [ ] Timeout configurations
- [ ] Health check endpoints

### Security
- [ ] API key management
- [ ] Data encryption in transit
- [ ] Webhook signature verification
- [ ] Access control and permissions
EOF
}

# Create decision log entry
create_decision_entry() {
    log_info "Creating architectural decision entry..."

    local adr_number=$(get_next_adr_number)
    local date=$(date +"%Y-%m-%d")
    local feature_title=$(echo "$FEATURE_NAME" | sed 's/-/ /g' | sed 's/\b\w/\U&/g')

    # Prepare decision entry
    local decision_entry=$(cat << EOF

### ADR-$adr_number: $feature_title Implementation Approach
**Date:** $date
**Status:** Proposed
**Deciders:** $(git config user.name 2>/dev/null || echo 'Development Team')
**Context:** Starting development of $feature_title feature

#### Problem Statement
[Describe the technical challenge this feature addresses]

#### Decision Drivers
- Business requirements defined in docs/prd-$FEATURE_NAME.md
- System architecture constraints
- Performance and scalability requirements
- Team expertise and available resources
- Timeline and delivery constraints

#### Options Considered
1. **Option A:** [Approach 1]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Trade-offs: [Considerations]

2. **Option B:** [Approach 2]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Trade-offs: [Considerations]

#### Decision
[Document chosen approach and rationale - COMPLETE DURING IMPLEMENTATION]

#### Consequences
- **Positive:** [Expected benefits]
- **Negative:** [Accepted costs and risks]
- **Neutral:** [Other implications]

#### Implementation Notes
[Technical details, patterns to follow, integration points]

#### Follow-up Actions
- [ ] Complete technical design based on PRD requirements
- [ ] Set up development environment and dependencies
- [ ] Create test scaffolding and testing strategy
- [ ] Implement core functionality following architectural patterns
- [ ] Update project status with progress milestones

EOF
)

    # Add to decision log
    local decision_log="$ROOT_DIR/DECISION-LOG.md"
    if [[ -f "$decision_log" ]]; then
        # Create temporary file with new entry at top
        local temp_file=$(mktemp)
        head -n 50 "$decision_log" > "$temp_file"
        echo "$decision_entry" >> "$temp_file"
        tail -n +51 "$decision_log" >> "$temp_file"
        mv "$temp_file" "$decision_log"
    else
        log_warning "DECISION-LOG.md not found, creating new one"
        cat > "$decision_log" << EOF
# Architectural Decision Log

**Purpose:** Document all significant technical decisions with context, alternatives, and rationale for future reference.

$decision_entry
EOF
    fi

    log_success "Decision entry ADR-$adr_number created in DECISION-LOG.md"
}

# Generate test scaffolding
generate_test_scaffolding() {
    log_info "Generating test scaffolding for $FEATURE_NAME..."

    local test_dir="tests/features/$FEATURE_NAME"
    mkdir -p "$test_dir"

    # Create unit test file
    cat > "$test_dir/test_${FEATURE_NAME//-/_}.py" << EOF
"""
Unit tests for $FEATURE_NAME feature

Test Categories:
- Unit tests: Test individual functions and classes
- Integration tests: Test component interactions
- End-to-end tests: Test complete user workflows

Testing Strategy Reference: ../../TESTING-STRATEGY.md
"""

import pytest
import unittest
from unittest.mock import Mock, patch


class Test$(echo "$FEATURE_NAME" | sed 's/-//g' | sed 's/\b\w/\U&/g'):
    """Unit tests for $FEATURE_NAME functionality."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        pass

    def teardown_method(self):
        """Clean up after each test method."""
        pass

    def test_placeholder(self):
        """Placeholder test - replace with actual tests."""
        # TODO: Replace with actual test implementation
        assert True, "Implement actual tests based on PRD requirements"

    @pytest.mark.integration
    def test_integration_placeholder(self):
        """Placeholder integration test."""
        # TODO: Test integration points with other components
        pass

    @pytest.mark.e2e
    def test_end_to_end_placeholder(self):
        """Placeholder end-to-end test."""
        # TODO: Test complete user workflow
        pass


# Test data fixtures
@pytest.fixture
def sample_data():
    """Provide sample data for tests."""
    return {
        # TODO: Add test data based on feature requirements
    }


@pytest.fixture
def mock_dependencies():
    """Mock external dependencies."""
    with patch('module.dependency') as mock_dep:
        # TODO: Configure mocks based on feature dependencies
        yield mock_dep


if __name__ == '__main__':
    pytest.main([__file__])
EOF

    # Create feature test configuration
    cat > "$test_dir/conftest.py" << EOF
"""
Test configuration for $FEATURE_NAME feature tests.

This file contains pytest fixtures and configuration specific to this feature.
"""

import pytest


@pytest.fixture(scope="session")
def feature_config():
    """Feature-specific configuration for tests."""
    return {
        "feature_name": "$FEATURE_NAME",
        "test_data_path": "tests/fixtures/$FEATURE_NAME",
        # TODO: Add feature-specific test configuration
    }


@pytest.fixture(autouse=True)
def setup_feature_tests():
    """Automatically run setup for all tests in this feature."""
    # TODO: Add any setup needed for all feature tests
    yield
    # TODO: Add any cleanup needed after feature tests
EOF

    # Create test data directory
    mkdir -p "tests/fixtures/$FEATURE_NAME"
    cat > "tests/fixtures/$FEATURE_NAME/sample_data.json" << EOF
{
  "description": "Sample test data for $FEATURE_NAME feature",
  "test_cases": [
    {
      "name": "valid_input",
      "data": {}
    },
    {
      "name": "invalid_input",
      "data": {}
    }
  ]
}
EOF

    log_success "Test scaffolding created in $test_dir"
}

# Update project status
update_project_status() {
    log_info "Updating project status..."

    local status_file="$ROOT_DIR/PROJECT-STATUS.md"
    local date=$(date +"%Y-%m-%d")
    local feature_title=$(echo "$FEATURE_NAME" | sed 's/-/ /g' | sed 's/\b\w/\U&/g')

    if [[ -f "$status_file" ]]; then
        # Update last updated date
        sed -i.bak "s/\*\*Last Updated:\*\* .*/\*\*Last Updated:\*\* $date/" "$status_file"

        # Add to active work items if not already there
        if ! grep -q "$feature_title" "$status_file"; then
            sed -i.bak "/## Active Work Items/a\\
- [ ] $feature_title (docs/prd-$FEATURE_NAME.md)" "$status_file"
        fi

        # Update recently completed if needed
        if ! grep -q "Feature planning initiated" "$status_file"; then
            sed -i.bak "/## Recently Completed/a\\
- [x] $feature_title planning initiated" "$status_file"
        fi

        rm -f "$status_file.bak"
    else
        log_warning "PROJECT-STATUS.md not found, creating basic version"
        cat > "$status_file" << EOF
# Project Status

**Last Updated:** $date
**Status:** Development

## Active Work Items
- [ ] $feature_title (docs/prd-$FEATURE_NAME.md)

## Recently Completed
- [x] $feature_title planning initiated

## Decision References
- ADR-$(get_next_adr_number): $feature_title Implementation Approach
EOF
    fi

    log_success "Project status updated"
}

# Create initial commit for feature
create_initial_commit() {
    if [[ "$CREATE_BRANCH" != "true" ]]; then
        return
    fi

    log_info "Creating initial commit for feature..."

    git add .
    git commit -m "feat: start $FEATURE_NAME feature development

- Generated PRD from template (docs/prd-$FEATURE_NAME.md)
- Created architectural decision entry (ADR-$(get_next_adr_number))
- Set up test scaffolding in tests/features/$FEATURE_NAME
- Updated project status with new active work item

Decision Reference: ADR-$(get_next_adr_number)
Testing: Test scaffolding created, implement tests based on PRD
Breaking Changes: none"

    log_success "Initial commit created for feature"
}

# Main execution
main() {
    log_info "Starting new feature: $FEATURE_NAME (template: $TEMPLATE_TYPE)"

    validate_inputs
    create_feature_branch
    generate_prd
    create_decision_entry
    generate_test_scaffolding
    update_project_status
    create_initial_commit

    log_success "Feature '$FEATURE_NAME' initialized successfully!"
    echo
    log_info "Next steps:"
    echo "  1. Review and complete docs/prd-$FEATURE_NAME.md"
    echo "  2. Update ADR-$(get_next_adr_number) with technical decisions"
    echo "  3. Implement functionality following the PRD"
    echo "  4. Run tests: pytest tests/features/$FEATURE_NAME"
    echo "  5. Run pre-commit checks: ./scripts/pre-commit-checks.sh"
    echo
    log_info "Documentation:"
    echo "  - PRD: docs/prd-$FEATURE_NAME.md"
    echo "  - Decision: Search for ADR-$(get_next_adr_number) in DECISION-LOG.md"
    echo "  - Tests: tests/features/$FEATURE_NAME/"
}

# Run main function
main "$@"