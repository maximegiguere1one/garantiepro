#!/bin/bash
#
# rollback.sh - Rollback Pro-Remorque to previous release
#
# Usage:
#   ./rollback.sh --env staging
#   ./rollback.sh --env staging --to-commit abc123
#   ./rollback.sh --env production  # REQUIRES CLIENT APPROVAL
#
# Prerequisites:
#   - git
#   - Node.js 18+ and npm
#   - Access to deployment target
#
# Required Environment Variables:
#   DEPLOY_ENV          - Environment to rollback (staging or production)
#   SUPABASE_URL        - Supabase project URL
#   SUPABASE_ANON_KEY   - Supabase anon key
#   DEPLOY_TOKEN        - Deployment platform token
#
# Optional Environment Variables:
#   TARGET_COMMIT       - Specific commit to rollback to (default: previous release)
#   SKIP_SMOKE_TESTS    - Skip smoke tests (default: false)
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Missing prerequisites
#   3 - Git checkout failed
#   4 - Build failed
#   5 - Deployment failed
#   6 - Smoke tests failed
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
ROLLBACK_ENV=""
TARGET_COMMIT="${TARGET_COMMIT:-}"
SKIP_SMOKE_TESTS="${SKIP_SMOKE_TESTS:-false}"
CURRENT_COMMIT=""
START_TIME=$(date +%s)

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

usage() {
    cat << EOF
Usage: $0 --env <staging|production> [OPTIONS]

Options:
  --env             Environment to rollback (staging or production)
  --to-commit       Specific commit to rollback to (default: previous tag/release)
  --skip-tests      Skip smoke tests
  -h, --help        Show this help message

Example:
  $0 --env staging
  $0 --env staging --to-commit abc123def
EOF
    exit 1
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=0

    if ! command -v git &> /dev/null; then
        log_error "git not found"
        missing=1
    fi

    if ! command -v node &> /dev/null; then
        log_error "Node.js not found"
        missing=1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm not found"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 2
    fi

    log_info "All prerequisites found."
}

check_env_vars() {
    log_info "Checking required environment variables..."

    local missing=0

    if [ -z "${SUPABASE_URL:-}" ]; then
        log_error "SUPABASE_URL not set"
        missing=1
    fi

    if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
        log_error "SUPABASE_ANON_KEY not set"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing required environment variables"
        exit 2
    fi

    log_info "Environment variables validated."
}

confirm_production() {
    if [ "$ROLLBACK_ENV" = "production" ]; then
        log_warn "========================================="
        log_warn "WARNING: PRODUCTION ROLLBACK"
        log_warn "========================================="
        log_warn "You are about to rollback PRODUCTION."
        log_warn "This requires CLIENT APPROVAL."
        log_warn ""
        read -p "Have you received client approval? (type 'YES' to continue): " confirm

        if [ "$confirm" != "YES" ]; then
            log_error "Production rollback cancelled. Client approval required."
            exit 1
        fi
    fi
}

save_current_state() {
    log_step "Saving current state..."

    CURRENT_COMMIT=$(git rev-parse HEAD)
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

    log_info "Current commit: $CURRENT_COMMIT"
    log_info "Current branch: $CURRENT_BRANCH"

    # Create a tag for current state (for easy recovery)
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_TAG="pre-rollback-${ROLLBACK_ENV}-${TIMESTAMP}"

    if git tag "$BACKUP_TAG"; then
        log_info "Created backup tag: $BACKUP_TAG"
    else
        log_warn "Could not create backup tag (non-critical)"
    fi
}

find_previous_release() {
    if [ -n "$TARGET_COMMIT" ]; then
        log_info "Using specified target commit: $TARGET_COMMIT"
        return 0
    fi

    log_step "Finding previous release..."

    # Try to find the most recent tag
    LATEST_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

    if [ -n "$LATEST_TAG" ]; then
        TARGET_COMMIT=$(git rev-list -n 1 "$LATEST_TAG")
        log_info "Found previous release tag: $LATEST_TAG"
        log_info "Target commit: $TARGET_COMMIT"
    else
        # Fall back to previous commit
        TARGET_COMMIT=$(git rev-parse HEAD^)
        log_warn "No release tag found, rolling back to previous commit: $TARGET_COMMIT"
    fi
}

show_rollback_diff() {
    log_step "Changes that will be reverted:"

    # Show commits that will be reverted
    log_info "Commits between current and target:"
    git log --oneline "$TARGET_COMMIT".."$CURRENT_COMMIT" | while read -r line; do
        log_info "  - $line"
    done

    echo ""
    log_warn "========================================="
    log_warn "ROLLBACK CONFIRMATION"
    log_warn "========================================="
    log_warn "Current:  $CURRENT_COMMIT"
    log_warn "Target:   $TARGET_COMMIT"
    log_warn "Environment: $ROLLBACK_ENV"
    log_warn ""
    read -p "Proceed with rollback? (type 'YES' to continue): " confirm

    if [ "$confirm" != "YES" ]; then
        log_info "Rollback cancelled by user."
        exit 0
    fi
}

checkout_target_commit() {
    log_step "Checking out target commit..."

    # Stash any uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warn "Stashing uncommitted changes..."
        git stash push -m "Auto-stash before rollback at $(date)"
    fi

    # Checkout target commit
    if ! git checkout "$TARGET_COMMIT"; then
        log_error "Failed to checkout target commit"
        exit 3
    fi

    log_info "Checked out commit: $TARGET_COMMIT"
}

rebuild_application() {
    log_step "Rebuilding application..."

    # Clean previous build
    if [ -d "dist" ]; then
        rm -rf dist
        log_info "Cleaned previous build"
    fi

    # Install dependencies
    log_info "Installing dependencies..."
    if ! npm ci; then
        log_error "Failed to install dependencies"
        exit 4
    fi

    # Build application
    log_info "Building application..."
    export VITE_ENV="$ROLLBACK_ENV"

    if ! npm run build 2>&1 | tee rollback-build.log; then
        log_error "Build failed. Check rollback-build.log"
        exit 4
    fi

    log_info "Build completed successfully"
}

redeploy_application() {
    log_step "Redeploying application..."

    # Use the deploy script
    DEPLOY_SCRIPT="$(dirname "$0")/deploy.sh"

    if [ ! -f "$DEPLOY_SCRIPT" ]; then
        log_error "Deploy script not found: $DEPLOY_SCRIPT"
        exit 5
    fi

    # Deploy with build already done
    if ! bash "$DEPLOY_SCRIPT" --env "$ROLLBACK_ENV" --skip-build; then
        log_error "Deployment failed"
        exit 5
    fi

    log_info "Redeployment completed"
}

run_smoke_tests() {
    if [ "$SKIP_SMOKE_TESTS" = "true" ]; then
        log_warn "Skipping smoke tests"
        return 0
    fi

    log_step "Running smoke tests..."

    SMOKE_TESTS_SCRIPT="$(dirname "$0")/../acceptance/smoke-tests.sh"

    if [ ! -f "$SMOKE_TESTS_SCRIPT" ]; then
        log_warn "Smoke tests script not found: $SMOKE_TESTS_SCRIPT"
        return 0
    fi

    # Wait for deployment to propagate
    log_info "Waiting 10 seconds for deployment to propagate..."
    sleep 10

    if ! bash "$SMOKE_TESTS_SCRIPT"; then
        log_error "Smoke tests failed!"
        log_error "Rollback completed but validation failed."
        log_error "You may need to rollback again or investigate the issue."
        exit 6
    fi

    log_info "Smoke tests passed successfully."
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ROLLBACK_ENV="$2"
            shift 2
            ;;
        --to-commit)
            TARGET_COMMIT="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_SMOKE_TESTS=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate environment
if [ -z "$ROLLBACK_ENV" ]; then
    log_error "Environment not specified"
    usage
fi

if [ "$ROLLBACK_ENV" != "staging" ] && [ "$ROLLBACK_ENV" != "production" ]; then
    log_error "Invalid environment. Must be 'staging' or 'production'"
    exit 1
fi

# Main execution
log_info "================================================"
log_info "Pro-Remorque Rollback"
log_info "Environment: $ROLLBACK_ENV"
log_info "================================================"

check_prerequisites
check_env_vars
confirm_production
save_current_state
find_previous_release
show_rollback_diff
checkout_target_commit
rebuild_application
redeploy_application
run_smoke_tests

# Calculate rollback time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Summary
log_info "================================================"
log_info "ROLLBACK COMPLETED SUCCESSFULLY"
log_info "================================================"
log_info "Environment:     $ROLLBACK_ENV"
log_info "Rolled back from: $CURRENT_COMMIT"
log_info "Rolled back to:   $TARGET_COMMIT"
log_info "Backup tag:      pre-rollback-${ROLLBACK_ENV}-*"
log_info "Smoke tests:     $([ "$SKIP_SMOKE_TESTS" = "true" ] && echo "SKIPPED" || echo "PASSED")"
log_info "Duration:        ${MINUTES}m ${SECONDS}s"
log_info "Timestamp:       $(date)"
log_info "================================================"
log_info ""
log_info "To revert this rollback, checkout: $CURRENT_COMMIT"

exit 0
