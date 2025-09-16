#!/bin/bash

# workflow-status.sh - Quick status overview of AI-assisted development workflow
# Usage: ./scripts/workflow-status.sh [--detailed] [--json]

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
DETAILED="false"
JSON_OUTPUT="false"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --detailed)
            DETAILED="true"
            shift
            ;;
        --json)
            JSON_OUTPUT="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [--detailed] [--json]"
            echo "  --detailed  Show detailed analysis"
            echo "  --json      Output as JSON"
            exit 0
            ;;
    esac
done

# Helper functions
log_info() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${GREEN}[✓]${NC} $1"
    fi
}

log_warning() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${YELLOW}[⚠]${NC} $1"
    fi
}

log_error() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${RED}[✗]${NC} $1"
    fi
}

# Check if we're in a valid project
check_project_validity() {
    local issues=()

    if [[ ! -f "ARCHITECTURE.md" ]]; then
        issues+=("Missing ARCHITECTURE.md")
    fi

    if [[ ! -f "DECISION-LOG.md" ]]; then
        issues+=("Missing DECISION-LOG.md")
    fi

    if [[ ! -f "PROJECT-STATUS.md" ]]; then
        issues+=("Missing PROJECT-STATUS.md")
    fi

    if [[ ! -d "scripts" ]]; then
        issues+=("Missing scripts directory")
    fi

    if [[ ${#issues[@]} -gt 0 ]]; then
        if [[ "$JSON_OUTPUT" != "true" ]]; then
            log_error "Not a valid AI-assisted workflow project:"
            for issue in "${issues[@]}"; do
                echo "  - $issue"
            done
            echo
            echo "Run './scripts/init-project.sh .' to set up workflow in existing project"
        fi
        return 1
    fi

    return 0
}

# Analyze project structure
analyze_project() {
    local analysis='{}'

    # Basic file counts
    local total_files=$(find . -type f -not -path './.git/*' | wc -l)
    local code_files=$(find . -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.cpp" -o -name "*.c" | wc -l)
    local test_files=$(find . -name "*test*" -type f | wc -l)
    local doc_files=$(find . -name "*.md" -type f | wc -l)

    # Decision and feature tracking
    local decision_count=$(grep -c "^### ADR-" DECISION-LOG.md 2>/dev/null || echo 0)
    local feature_count=$(find docs -name "prd-*.md" 2>/dev/null | wc -l)

    # Git information
    local git_branch=$(git branch --show-current 2>/dev/null || echo "not-git")
    local git_status=""
    if git rev-parse --git-dir > /dev/null 2>&1; then
        if git diff --quiet && git diff --cached --quiet; then
            git_status="clean"
        else
            git_status="dirty"
        fi
    else
        git_status="no-git"
    fi

    # Status freshness
    local status_age="unknown"
    if [[ -f "PROJECT-STATUS.md" ]]; then
        local last_update=$(grep "Last Updated:" PROJECT-STATUS.md | sed 's/.*Updated:\*\* *//' || echo "")
        if [[ -n "$last_update" ]] && command -v date >/dev/null 2>&1; then
            local days_old=$(( ($(date +%s) - $(date -d "$last_update" +%s 2>/dev/null || echo 0)) / 86400 ))
            status_age="$days_old"
        fi
    fi

    # Create analysis object
    analysis=$(cat << EOF
{
  "project_valid": true,
  "files": {
    "total": $total_files,
    "code": $code_files,
    "tests": $test_files,
    "docs": $doc_files
  },
  "workflow": {
    "decisions": $decision_count,
    "features": $feature_count,
    "status_age_days": "$status_age"
  },
  "git": {
    "branch": "$git_branch",
    "status": "$git_status"
  },
  "timestamp": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
}
EOF
)

    echo "$analysis"
}

# Extract value from simple analysis (fallback when jq not available)
extract_value() {
    local analysis="$1"
    local key="$2"

    if command -v jq >/dev/null 2>&1; then
        echo "$analysis" | jq -r "$key"
    else
        # Simple grep-based extraction for basic keys
        case "$key" in
            '.files.total')
                echo "$analysis" | grep '"total":' | sed 's/.*"total": *\([0-9]*\).*/\1/'
                ;;
            '.files.code')
                echo "$analysis" | grep '"code":' | sed 's/.*"code": *\([0-9]*\).*/\1/'
                ;;
            '.files.tests')
                echo "$analysis" | grep '"tests":' | sed 's/.*"tests": *\([0-9]*\).*/\1/'
                ;;
            '.files.docs')
                echo "$analysis" | grep '"docs":' | sed 's/.*"docs": *\([0-9]*\).*/\1/'
                ;;
            '.workflow.decisions')
                echo "$analysis" | grep '"decisions":' | sed 's/.*"decisions": *\([0-9]*\).*/\1/'
                ;;
            '.workflow.features')
                echo "$analysis" | grep '"features":' | sed 's/.*"features": *\([0-9]*\).*/\1/'
                ;;
            '.workflow.status_age_days')
                echo "$analysis" | grep '"status_age_days":' | sed 's/.*"status_age_days": *"\([^"]*\)".*/\1/'
                ;;
            '.git.branch')
                echo "$analysis" | grep '"branch":' | sed 's/.*"branch": *"\([^"]*\)".*/\1/'
                ;;
            '.git.status')
                echo "$analysis" | grep '"status":' | sed 's/.*"status": *"\([^"]*\)".*/\1/'
                ;;
            *)
                echo "unknown"
                ;;
        esac
    fi
}

# Show quick status overview
show_quick_status() {
    local analysis="$1"

    echo "===================================="
    echo "AI-Assisted Development Workflow Status"
    echo "===================================="
    echo

    # Project health
    log_info "Project Health Check"
    local total_files=$(extract_value "$analysis" '.files.total')
    local code_files=$(extract_value "$analysis" '.files.code')
    local test_files=$(extract_value "$analysis" '.files.tests')
    local doc_files=$(extract_value "$analysis" '.files.docs')

    echo "  Files: $total_files total ($code_files code, $test_files tests, $doc_files docs)"

    # Workflow metrics
    log_info "Workflow Metrics"
    local decisions=$(extract_value "$analysis" '.workflow.decisions')
    local features=$(extract_value "$analysis" '.workflow.features')
    local status_age=$(extract_value "$analysis" '.workflow.status_age_days')

    echo "  Decisions: $decisions ADRs logged"
    echo "  Features: $features PRDs created"

    if [[ "$status_age" == "unknown" ]]; then
        log_warning "Status age: unknown (update PROJECT-STATUS.md)"
    elif [[ "$status_age" -gt 14 ]] 2>/dev/null; then
        log_warning "Status age: $status_age days (consider updating)"
    else
        log_success "Status age: $status_age days"
    fi

    # Git status
    log_info "Git Status"
    local git_branch=$(extract_value "$analysis" '.git.branch')
    local git_status=$(extract_value "$analysis" '.git.status')

    echo "  Branch: $git_branch"
    if [[ "$git_status" == "clean" ]]; then
        log_success "Working tree: clean"
    elif [[ "$git_status" == "dirty" ]]; then
        log_warning "Working tree: has changes"
    else
        log_warning "Git: not initialized or accessible"
    fi
}

# Show detailed analysis
show_detailed_status() {
    local analysis="$1"

    show_quick_status "$analysis"
    echo

    log_info "Detailed Analysis"

    # Check for active features
    if [[ -f "PROJECT-STATUS.md" ]]; then
        echo
        echo "Active Work Items:"
        grep -A 10 "## Active Work Items" PROJECT-STATUS.md | tail -n +2 | head -n 10 || echo "  None listed"
    fi

    # Recent decisions
    if [[ -f "DECISION-LOG.md" ]]; then
        echo
        echo "Recent Decisions:"
        grep -E "^### ADR-" DECISION-LOG.md | head -3 || echo "  No decisions logged"
    fi

    # Available scripts
    echo
    echo "Available Workflow Scripts:"
    if [[ -d "scripts" ]]; then
        for script in scripts/*.sh; do
            if [[ -f "$script" && -x "$script" ]]; then
                local script_name=$(basename "$script")
                echo "  ✓ $script_name"
            fi
        done
    fi

    # Check for common issues
    echo
    log_info "Health Checks"

    # Documentation consistency
    local doc_issues=()
    if [[ ! -f "README.md" ]] || [[ ! -s "README.md" ]]; then
        doc_issues+=("Empty or missing README.md")
    fi

    if [[ -d ".claude" ]] && [[ -f ".claude/project.md" ]]; then
        log_success "Claude AI context configured"
    else
        doc_issues+=("Missing Claude AI context (.claude/project.md)")
    fi

    if [[ -f ".github/workflows/ai-context.yml" ]]; then
        log_success "GitHub workflow configured"
    else
        doc_issues+=("Missing GitHub workflow for context maintenance")
    fi

    if [[ ${#doc_issues[@]} -gt 0 ]]; then
        for issue in "${doc_issues[@]}"; do
            log_warning "$issue"
        done
    else
        log_success "All documentation checks passed"
    fi

    # Workflow completeness
    echo
    log_info "Workflow Tools Status"

    local required_scripts=("init-project.sh" "new-feature.sh" "pre-commit-checks.sh")
    for script in "${required_scripts[@]}"; do
        if [[ -f "scripts/$script" && -x "scripts/$script" ]]; then
            log_success "$script available"
        else
            log_warning "$script missing or not executable"
        fi
    done

    # Suggestions
    echo
    log_info "Suggestions"

    local suggestions=()

    local feature_count=$(extract_value "$analysis" '.workflow.features')
    if [[ "$feature_count" -eq 0 ]] 2>/dev/null; then
        suggestions+=("Create your first feature: ./scripts/new-feature.sh initial-feature")
    fi

    local decision_count=$(extract_value "$analysis" '.workflow.decisions')
    if [[ "$decision_count" -eq 0 ]] 2>/dev/null; then
        suggestions+=("Document your first architectural decision in DECISION-LOG.md")
    fi

    local status_age=$(extract_value "$analysis" '.workflow.status_age_days')
    if [[ "$status_age" != "unknown" ]] && [[ "$status_age" -gt 7 ]]; then
        suggestions+=("Update PROJECT-STATUS.md with current progress")
    fi

    if [[ ${#suggestions[@]} -gt 0 ]]; then
        for suggestion in "${suggestions[@]}"; do
            echo "  💡 $suggestion"
        done
    else
        echo "  🎉 Workflow looks healthy! Keep up the good work."
    fi
}

# Main execution
main() {
    if ! check_project_validity; then
        if [[ "$JSON_OUTPUT" == "true" ]]; then
            echo '{"project_valid": false, "error": "Invalid project structure"}'
        fi
        exit 1
    fi

    local analysis=$(analyze_project)

    if [[ "$JSON_OUTPUT" == "true" ]]; then
        if command -v jq >/dev/null 2>&1; then
            echo "$analysis" | jq '.'
        else
            echo "$analysis"
        fi
        exit 0
    fi

    if [[ "$DETAILED" == "true" ]]; then
        show_detailed_status "$analysis"
    else
        show_quick_status "$analysis"
    fi

    echo
    log_info "Quick Commands"
    echo "  Status:      ./scripts/workflow-status.sh"
    echo "  New feature: ./scripts/new-feature.sh feature-name"
    echo "  Pre-commit:  ./scripts/pre-commit-checks.sh"
    echo "  Detailed:    ./scripts/workflow-status.sh --detailed"
}

# Check for required tools
if [[ "$JSON_OUTPUT" == "true" ]] && ! command -v jq >/dev/null 2>&1; then
    echo '{"error": "jq required for JSON output"}' >&2
    exit 1
fi

# Run main function
main "$@"