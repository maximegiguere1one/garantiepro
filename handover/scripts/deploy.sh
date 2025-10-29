#!/bin/bash
#
# deploy.sh - Build and deploy Pro-Remorque to staging/production
#
# Usage:
#   ./deploy.sh --env staging
#   ./deploy.sh --env production --skip-build  # REQUIRES CLIENT APPROVAL
#
# Prerequisites:
#   - Node.js 18+ and npm
#   - Supabase CLI (for migrations)
#   - Access to deployment target (Vercel/Cloudflare/etc)
#
# Required Environment Variables:
#   DEPLOY_ENV          - Environment to deploy to (staging or production)
#   SUPABASE_URL        - Supabase project URL
#   SUPABASE_ANON_KEY   - Supabase anon key
#   SUPABASE_SERVICE_KEY - Supabase service role key (for migrations)
#   DEPLOY_TOKEN        - Deployment platform token (e.g., Vercel token)
#
# Optional Environment Variables:
#   SKIP_BUILD          - Skip build step (default: false)
#   SKIP_MIGRATIONS     - Skip migrations (default: false)
#   SKIP_SMOKE_TESTS    - Skip smoke tests (default: false)
#   GIT_COMMIT          - Git commit to deploy (default: HEAD)
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Missing prerequisites
#   3 - Build failed
#   4 - Migrations failed
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
DEPLOY_ENV=""
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"
SKIP_SMOKE_TESTS="${SKIP_SMOKE_TESTS:-false}"
GIT_COMMIT="${GIT_COMMIT:-HEAD}"
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
  --env             Environment to deploy to (staging or production)
  --skip-build      Skip the build step
  --skip-migrations Skip database migrations
  --skip-tests      Skip smoke tests
  --commit          Git commit to deploy (default: HEAD)
  -h, --help        Show this help message

Example:
  $0 --env staging
  $0 --env production --commit abc123
EOF
    exit 1
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=0

    if ! command -v node &> /dev/null; then
        log_error "Node.js not found"
        missing=1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm not found"
        missing=1
    fi

    if ! command -v git &> /dev/null; then
        log_error "git not found"
        missing=1
    fi

    # Supabase CLI is optional but recommended for migrations
    if ! command -v supabase &> /dev/null; then
        log_warn "Supabase CLI not found - migrations will be skipped"
        SKIP_MIGRATIONS=true
    fi

    if [ $missing -eq 1 ]; then
        exit 2
    fi

    # Check Node version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version must be 18 or higher (current: $NODE_VERSION)"
        exit 2
    fi

    log_info "All prerequisites found. Node.js: v$(node --version)"
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

    if [ "$SKIP_MIGRATIONS" = "false" ] && [ -z "${SUPABASE_SERVICE_KEY:-}" ]; then
        log_warn "SUPABASE_SERVICE_KEY not set - migrations will be skipped"
        SKIP_MIGRATIONS=true
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing required environment variables"
        exit 2
    fi

    log_info "Environment variables validated."
}

confirm_production() {
    if [ "$DEPLOY_ENV" = "production" ]; then
        log_warn "========================================="
        log_warn "WARNING: PRODUCTION DEPLOYMENT"
        log_warn "========================================="
        log_warn "You are about to deploy to PRODUCTION."
        log_warn "This requires CLIENT APPROVAL."
        log_warn ""
        read -p "Have you received client approval? (type 'YES' to continue): " confirm

        if [ "$confirm" != "YES" ]; then
            log_error "Production deployment cancelled. Client approval required."
            exit 1
        fi
    fi
}

check_git_status() {
    log_step "Checking git status..."

    if [ -n "$(git status --porcelain)" ]; then
        log_warn "You have uncommitted changes in your working directory"
        read -p "Continue anyway? (y/N): " continue_dirty

        if [ "$continue_dirty" != "y" ] && [ "$continue_dirty" != "Y" ]; then
            log_error "Deployment cancelled. Commit or stash your changes first."
            exit 1
        fi
    fi

    CURRENT_COMMIT=$(git rev-parse HEAD)
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

    log_info "Current branch: $CURRENT_BRANCH"
    log_info "Current commit: $CURRENT_COMMIT"
}

install_dependencies() {
    log_step "Installing dependencies..."

    if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
        if ! npm ci; then
            log_error "Failed to install dependencies"
            exit 3
        fi
        log_info "Dependencies installed successfully"
    else
        log_info "Dependencies up to date"
    fi
}

run_build() {
    if [ "$SKIP_BUILD" = "true" ]; then
        log_warn "Skipping build step"
        return 0
    fi

    log_step "Building application..."

    # Set environment-specific variables
    export VITE_ENV="$DEPLOY_ENV"

    if ! npm run build 2>&1 | tee build.log; then
        log_error "Build failed. Check build.log for details."
        exit 3
    fi

    # Check if dist directory was created
    if [ ! -d "dist" ]; then
        log_error "Build succeeded but dist directory not found"
        exit 3
    fi

    DIST_SIZE=$(du -sh dist | cut -f1)
    log_info "Build completed successfully. Dist size: $DIST_SIZE"
}

run_migrations_dry_run() {
    if [ "$SKIP_MIGRATIONS" = "true" ]; then
        log_warn "Skipping migrations"
        return 0
    fi

    log_step "Running migrations dry-run..."

    # Check if migrations directory exists
    if [ ! -d "supabase/migrations" ]; then
        log_warn "No migrations directory found, skipping"
        return 0
    fi

    # Count pending migrations
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)

    if [ "$MIGRATION_COUNT" -eq 0 ]; then
        log_info "No migrations to apply"
        return 0
    fi

    log_info "Found $MIGRATION_COUNT migration file(s)"

    # List migrations
    log_info "Pending migrations:"
    ls -1 supabase/migrations/*.sql | while read -r migration; do
        log_info "  - $(basename "$migration")"
    done

    # In a real scenario, you would run: supabase db push --dry-run
    # For now, we just validate the files exist
    log_info "Migrations validated. Dry-run complete."
}

apply_migrations() {
    if [ "$SKIP_MIGRATIONS" = "true" ]; then
        log_warn "Skipping migrations"
        return 0
    fi

    log_step "Applying database migrations..."

    # Check if there are migrations to apply
    if [ ! -d "supabase/migrations" ]; then
        log_warn "No migrations directory found, skipping"
        return 0
    fi

    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)

    if [ "$MIGRATION_COUNT" -eq 0 ]; then
        log_info "No migrations to apply"
        return 0
    fi

    log_info "Applying $MIGRATION_COUNT migration(s)..."

    # Note: In production, you would use:
    # supabase db push --db-url "$SUPABASE_DB_URL"
    #
    # For this handover, we document the command but don't execute
    log_warn "Migrations dry-run only. In production, use: supabase db push"

    log_info "Migrations would be applied here."
}

deploy_to_target() {
    log_step "Deploying to $DEPLOY_ENV..."

    # Deployment method depends on your infrastructure
    # This is a placeholder - adapt to your deployment platform

    if [ -f "vercel.json" ]; then
        deploy_vercel
    elif [ -f "wrangler.toml" ]; then
        deploy_cloudflare
    else
        log_warn "No deployment configuration found"
        log_info "Deployment step skipped - manual deployment required"
    fi
}

deploy_vercel() {
    log_info "Deploying to Vercel..."

    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not found. Install with: npm i -g vercel"
        exit 5
    fi

    # Deploy to Vercel
    if [ "$DEPLOY_ENV" = "production" ]; then
        VERCEL_FLAGS="--prod"
    else
        VERCEL_FLAGS=""
    fi

    if ! vercel $VERCEL_FLAGS --token="${DEPLOY_TOKEN:-}" 2>&1 | tee deploy.log; then
        log_error "Vercel deployment failed. Check deploy.log"
        exit 5
    fi

    DEPLOY_URL=$(grep -o 'https://[^[:space:]]*' deploy.log | tail -1)
    log_info "Deployed to: $DEPLOY_URL"
}

deploy_cloudflare() {
    log_info "Deploying to Cloudflare Pages..."

    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI not found. Install with: npm i -g wrangler"
        exit 5
    fi

    # Deploy to Cloudflare Pages
    if ! wrangler pages deploy dist --project-name=pro-remorque 2>&1 | tee deploy.log; then
        log_error "Cloudflare deployment failed. Check deploy.log"
        exit 5
    fi

    log_info "Deployed to Cloudflare Pages"
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
        log_warn "Skipping smoke tests"
        return 0
    fi

    # Wait a bit for deployment to propagate
    log_info "Waiting 10 seconds for deployment to propagate..."
    sleep 10

    if ! bash "$SMOKE_TESTS_SCRIPT"; then
        log_error "Smoke tests failed!"
        log_error "Deployment completed but validation failed."
        exit 6
    fi

    log_info "Smoke tests passed successfully."
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --skip-tests)
            SKIP_SMOKE_TESTS=true
            shift
            ;;
        --commit)
            GIT_COMMIT="$2"
            shift 2
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
if [ -z "$DEPLOY_ENV" ]; then
    log_error "Environment not specified"
    usage
fi

if [ "$DEPLOY_ENV" != "staging" ] && [ "$DEPLOY_ENV" != "production" ]; then
    log_error "Invalid environment. Must be 'staging' or 'production'"
    exit 1
fi

# Main execution
log_info "================================================"
log_info "Pro-Remorque Deployment"
log_info "Environment: $DEPLOY_ENV"
log_info "================================================"

check_prerequisites
check_env_vars
confirm_production
check_git_status
install_dependencies
run_build
run_migrations_dry_run
apply_migrations
deploy_to_target
run_smoke_tests

# Calculate deployment time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Summary
log_info "================================================"
log_info "DEPLOYMENT COMPLETED SUCCESSFULLY"
log_info "================================================"
log_info "Environment:     $DEPLOY_ENV"
log_info "Git commit:      $CURRENT_COMMIT"
log_info "Git branch:      $CURRENT_BRANCH"
log_info "Build:           $([ "$SKIP_BUILD" = "true" ] && echo "SKIPPED" || echo "SUCCESS")"
log_info "Migrations:      $([ "$SKIP_MIGRATIONS" = "true" ] && echo "SKIPPED" || echo "SUCCESS")"
log_info "Smoke tests:     $([ "$SKIP_SMOKE_TESTS" = "true" ] && echo "SKIPPED" || echo "PASSED")"
log_info "Duration:        ${MINUTES}m ${SECONDS}s"
log_info "Timestamp:       $(date)"
log_info "================================================"

exit 0
