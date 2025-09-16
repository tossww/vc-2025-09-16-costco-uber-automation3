#!/bin/bash

# pre-commit-checks.sh - Run comprehensive checks before commits
# Usage: ./scripts/pre-commit-checks.sh [--fix] [--skip-tests]

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
FIX_ISSUES="false"
SKIP_TESTS="false"
FAILED_CHECKS=()

# Parse arguments
for arg in "$@"; do
    case $arg in
        --fix)
            FIX_ISSUES="true"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [--fix] [--skip-tests]"
            echo "  --fix       Automatically fix issues where possible"
            echo "  --skip-tests Skip running tests (faster for quick checks)"
            exit 0
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

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

add_failed_check() {
    FAILED_CHECKS+=("$1")
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Git status check
check_git_status() {
    log_check "Checking git status..."

    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        add_failed_check "git-repository"
        return 1
    fi

    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_info "Found uncommitted changes - this is expected for pre-commit"
    fi

    # Check if we're on a reasonable branch
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
        log_warning "Working directly on main branch - consider using feature branches"
    fi

    log_success "Git status check passed"
}

# Documentation consistency check
check_documentation() {
    log_check "Checking documentation consistency..."

    local doc_issues=()

    # Check if core documentation exists
    if [[ ! -f "ARCHITECTURE.md" ]]; then
        doc_issues+=("Missing ARCHITECTURE.md")
    fi

    if [[ ! -f "DECISION-LOG.md" ]]; then
        doc_issues+=("Missing DECISION-LOG.md")
    fi

    if [[ ! -f "PROJECT-STATUS.md" ]]; then
        doc_issues+=("Missing PROJECT-STATUS.md")
    fi

    if [[ ! -f "TESTING-STRATEGY.md" ]]; then
        doc_issues+=("Missing TESTING-STRATEGY.md")
    fi

    # Check if PRDs exist for features
    if [[ -d "docs" ]] && find docs -name "prd-*.md" -type f | grep -q .; then
        log_info "Found feature PRDs in docs/"
    fi

    # Check for outdated status
    if [[ -f "PROJECT-STATUS.md" ]]; then
        local last_update=$(grep "Last Updated:" PROJECT-STATUS.md | sed 's/.*Last Updated:\*\* //' || echo "")
        if [[ -n "$last_update" ]]; then
            local days_old=$(( ($(date +%s) - $(date -d "$last_update" +%s 2>/dev/null || echo 0)) / 86400 ))
            if [[ $days_old -gt 7 ]]; then
                log_warning "PROJECT-STATUS.md is $days_old days old - consider updating"
            fi
        fi
    fi

    if [[ ${#doc_issues[@]} -gt 0 ]]; then
        log_error "Documentation issues found:"
        for issue in "${doc_issues[@]}"; do
            echo "  - $issue"
        done
        add_failed_check "documentation"
        return 1
    fi

    log_success "Documentation consistency check passed"
}

# Code formatting check
check_code_formatting() {
    log_check "Checking code formatting..."

    local format_issues=()

    # Python formatting with black (if available and Python files exist)
    if find . -name "*.py" -type f | grep -q . && command_exists black; then
        if [[ "$FIX_ISSUES" == "true" ]]; then
            log_info "Auto-fixing Python formatting with black..."
            black . --quiet
        else
            if ! black --check --quiet . 2>/dev/null; then
                format_issues+=("Python files need black formatting")
            fi
        fi
    fi

    # JavaScript/TypeScript formatting with prettier (if available)
    if (find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" | grep -q .) && command_exists prettier; then
        if [[ "$FIX_ISSUES" == "true" ]]; then
            log_info "Auto-fixing JS/TS formatting with prettier..."
            prettier --write "**/*.{js,ts,tsx,jsx}" --ignore-path .gitignore 2>/dev/null || true
        else
            if ! prettier --check "**/*.{js,ts,tsx,jsx}" --ignore-path .gitignore 2>/dev/null; then
                format_issues+=("JS/TS files need prettier formatting")
            fi
        fi
    fi

    # Markdown formatting (basic checks)
    if find . -name "*.md" -type f | grep -q .; then
        # Check for trailing whitespace
        if grep -l "[[:space:]]$" *.md 2>/dev/null | grep -q .; then
            if [[ "$FIX_ISSUES" == "true" ]]; then
                log_info "Removing trailing whitespace from markdown files..."
                sed -i 's/[[:space:]]*$//' *.md
            else
                format_issues+=("Markdown files have trailing whitespace")
            fi
        fi
    fi

    if [[ ${#format_issues[@]} -gt 0 ]]; then
        log_error "Code formatting issues found:"
        for issue in "${format_issues[@]}"; do
            echo "  - $issue"
        done
        log_info "Run with --fix to automatically fix formatting issues"
        add_failed_check "formatting"
        return 1
    fi

    log_success "Code formatting check passed"
}

# Linting check
check_linting() {
    log_check "Checking code linting..."

    local lint_issues=()

    # Python linting with flake8 (if available)
    if find . -name "*.py" -type f | grep -q . && command_exists flake8; then
        if ! flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics 2>/dev/null; then
            lint_issues+=("Python files have linting errors")
        fi
    fi

    # JavaScript/TypeScript linting with eslint (if available)
    if (find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" | grep -q .) && command_exists eslint; then
        if ! eslint "**/*.{js,ts,tsx,jsx}" --ignore-path .gitignore 2>/dev/null; then
            lint_issues+=("JS/TS files have linting errors")
        fi
    fi

    # Shell script linting with shellcheck (if available)
    if find . -name "*.sh" -type f | grep -q . && command_exists shellcheck; then
        if ! find . -name "*.sh" -type f -exec shellcheck {} \; 2>/dev/null; then
            lint_issues+=("Shell scripts have shellcheck warnings")
        fi
    fi

    if [[ ${#lint_issues[@]} -gt 0 ]]; then
        log_error "Linting issues found:"
        for issue in "${lint_issues[@]}"; do
            echo "  - $issue"
        done
        add_failed_check "linting"
        return 1
    fi

    log_success "Linting check passed"
}

# Test execution
check_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Skipping tests (--skip-tests specified)"
        return 0
    fi

    log_check "Running tests..."

    local test_failures=()

    # Python tests with pytest (if available)
    if [[ -d "tests" ]] && find tests -name "*.py" -type f | grep -q . && command_exists pytest; then
        log_info "Running Python tests with pytest..."
        if ! pytest tests/ -v --tb=short; then
            test_failures+=("Python tests failed")
        fi
    fi

    # JavaScript/TypeScript tests with npm/yarn (if available)
    if [[ -f "package.json" ]]; then
        if command_exists npm && npm run test --if-present > /dev/null 2>&1; then
            log_info "Running npm tests..."
            if ! npm test; then
                test_failures+=("npm tests failed")
            fi
        elif command_exists yarn && yarn test > /dev/null 2>&1; then
            log_info "Running yarn tests..."
            if ! yarn test; then
                test_failures+=("yarn tests failed")
            fi
        fi
    fi

    # Go tests (if available)
    if find . -name "*.go" -type f | grep -q . && command_exists go; then
        log_info "Running Go tests..."
        if ! go test ./...; then
            test_failures+=("Go tests failed")
        fi
    fi

    if [[ ${#test_failures[@]} -gt 0 ]]; then
        log_error "Test failures found:"
        for failure in "${test_failures[@]}"; do
            echo "  - $failure"
        done
        add_failed_check "tests"
        return 1
    fi

    log_success "All tests passed"
}

# Security checks
check_security() {
    log_check "Running security checks..."

    local security_issues=()

    # Check for common security patterns
    if git diff --cached --name-only | xargs grep -l "password\|secret\|key\|token" 2>/dev/null | grep -q .; then
        log_warning "Found potential secrets in staged files - please review"
        # Don't fail on this, just warn
    fi

    # Check for common dangerous patterns
    if git diff --cached | grep -E "(eval|exec|system|shell_exec)" | grep -q .; then
        security_issues+=("Potentially dangerous code patterns found in staged changes")
    fi

    # Python security check with bandit (if available)
    if find . -name "*.py" -type f | grep -q . && command_exists bandit; then
        if ! bandit -r . -f json -q 2>/dev/null | jq -e '.results | length == 0' >/dev/null; then
            security_issues+=("Python security issues found by bandit")
        fi
    fi

    if [[ ${#security_issues[@]} -gt 0 ]]; then
        log_error "Security issues found:"
        for issue in "${security_issues[@]}"; do
            echo "  - $issue"
        done
        add_failed_check "security"
        return 1
    fi

    log_success "Security checks passed"
}

# Decision reference check
check_decision_references() {
    log_check "Checking for decision references..."

    # Check if commit message references decisions appropriately
    local commit_msg_file=".git/COMMIT_EDITMSG"

    # Skip if no staged changes
    if git diff --cached --quiet; then
        log_info "No staged changes, skipping decision reference check"
        return 0
    fi

    # Check if this is a significant change that should reference a decision
    local changed_files=$(git diff --cached --name-only)
    local significant_changes=false

    # Check for architectural changes
    if echo "$changed_files" | grep -E "(src/|lib/|modules/)" | grep -q .; then
        significant_changes=true
    fi

    # Check for configuration changes
    if echo "$changed_files" | grep -E "(\\.config\\.|config/|settings)" | grep -q .; then
        significant_changes=true
    fi

    if [[ "$significant_changes" == "true" ]]; then
        log_info "Significant changes detected - consider referencing relevant ADR in commit message"
        log_info "Format: 'Decision Reference: ADR-XXX' in commit message"
    fi

    log_success "Decision reference check completed"
}

# Build check (if applicable)
check_build() {
    log_check "Checking if project builds..."

    local build_failures=()

    # Python build check (if setup.py exists)
    if [[ -f "setup.py" ]] && command_exists python; then
        if ! python setup.py check; then
            build_failures+=("Python setup.py check failed")
        fi
    fi

    # Node.js build check (if package.json exists)
    if [[ -f "package.json" ]]; then
        if command_exists npm && npm run build --if-present > /dev/null 2>&1; then
            if ! npm run build; then
                build_failures+=("npm build failed")
            fi
        fi
    fi

    # Go build check
    if find . -name "*.go" -type f | grep -q . && command_exists go; then
        if ! go build ./...; then
            build_failures+=("Go build failed")
        fi
    fi

    if [[ ${#build_failures[@]} -gt 0 ]]; then
        log_error "Build failures found:"
        for failure in "${build_failures[@]}"; do
            echo "  - $failure"
        done
        add_failed_check "build")
        return 1
    fi

    log_success "Build check passed"
}

# Generate commit message suggestions
suggest_commit_message() {
    log_info "Analyzing changes for commit message suggestions..."

    local changed_files=$(git diff --cached --name-only 2>/dev/null || echo "")
    if [[ -z "$changed_files" ]]; then
        return 0
    fi

    local suggestions=()

    # Analyze file patterns
    if echo "$changed_files" | grep -q "test"; then
        suggestions+=("Consider using 'test:' prefix for test-related changes")
    fi

    if echo "$changed_files" | grep -q "doc\|README\|\.md$"; then
        suggestions+=("Consider using 'docs:' prefix for documentation changes")
    fi

    if echo "$changed_files" | grep -q "config\|\.json$\|\.yaml$\|\.yml$"; then
        suggestions+=("Consider using 'chore:' prefix for configuration changes")
    fi

    # Check for new features (new files in src/)
    if git diff --cached --name-status | grep "^A.*src/" | grep -q .; then
        suggestions+=("Consider using 'feat:' prefix for new features")
    fi

    # Check for bug fixes (modified files with fix patterns)
    if git diff --cached | grep -i "fix\|bug\|issue" | grep -q .; then
        suggestions+=("Consider using 'fix:' prefix for bug fixes")
    fi

    if [[ ${#suggestions[@]} -gt 0 ]]; then
        log_info "Commit message suggestions:"
        for suggestion in "${suggestions[@]}"; do
            echo "  - $suggestion"
        done
        echo
        log_info "Remember to reference ADRs if implementing architectural decisions"
    fi
}

# Main execution
main() {
    log_info "Running pre-commit checks..."
    echo

    # Run all checks
    check_git_status
    echo
    check_documentation
    echo
    check_code_formatting
    echo
    check_linting
    echo
    check_tests
    echo
    check_security
    echo
    check_decision_references
    echo
    check_build
    echo
    suggest_commit_message

    # Summary
    echo "=================================="
    if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then
        log_success "All pre-commit checks passed! 🎉"
        echo
        log_info "Your code is ready to commit. Suggested workflow:"
        echo "  1. Review your changes: git diff --cached"
        echo "  2. Update PROJECT-STATUS.md if needed"
        echo "  3. Commit with descriptive message and ADR reference if applicable"
        echo "  4. Push when ready: git push origin <branch-name>"
        exit 0
    else
        log_error "Pre-commit checks failed:"
        for check in "${FAILED_CHECKS[@]}"; do
            echo "  ❌ $check"
        done
        echo
        log_info "Fix the issues above and run the checks again."
        if [[ "$FIX_ISSUES" != "true" ]]; then
            echo "  Use --fix to automatically fix some issues."
        fi
        exit 1
    fi
}

# Run main function
main "$@"