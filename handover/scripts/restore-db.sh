#!/bin/bash
#
# restore-db.sh - Restore Supabase PostgreSQL database from S3 backup
#
# ⚠️  WARNING: THIS SCRIPT IS FOR STAGING ONLY ⚠️
# DO NOT RUN ON PRODUCTION WITHOUT EXPLICIT CLIENT APPROVAL
#
# Usage:
#   ./restore-db.sh --env staging --backup-file backup_staging_20250126_143000.sql.gz
#   ./restore-db.sh --env staging --latest
#
# Prerequisites:
#   - pg_restore or psql (PostgreSQL client tools)
#   - aws CLI configured
#   - gunzip
#   - smoke-tests.sh in ../acceptance/
#
# Required Environment Variables:
#   TARGET_DB_URL       - PostgreSQL connection string for target database (STAGING ONLY)
#   S3_BUCKET           - S3 bucket name
#   AWS_ACCESS_KEY_ID   - AWS access key
#   AWS_SECRET_ACCESS_KEY - AWS secret key
#   AWS_REGION          - AWS region
#
# Optional Environment Variables:
#   SKIP_SMOKE_TESTS    - Set to "true" to skip smoke tests (not recommended)
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments or production environment detected
#   2 - Missing prerequisites
#   3 - Database connection error
#   4 - Backup download failed
#   5 - Checksum verification failed
#   6 - Restore failed
#   7 - Smoke tests failed
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
RESTORE_ENV=""
BACKUP_FILE=""
USE_LATEST=false
SKIP_SMOKE_TESTS="${SKIP_SMOKE_TESTS:-false}"

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

usage() {
    cat << EOF
Usage: $0 --env staging --backup-file <filename.sql.gz>
       $0 --env staging --latest

Options:
  --env             Environment (MUST be 'staging')
  --backup-file     Specific backup file to restore
  --latest          Use the most recent backup
  -h, --help        Show this help message

Example:
  $0 --env staging --backup-file backup_staging_20250126_143000.sql.gz
  $0 --env staging --latest
EOF
    exit 1
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=0

    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Install PostgreSQL client tools."
        missing=1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "aws CLI not found. Install AWS CLI."
        missing=1
    fi

    if ! command -v gunzip &> /dev/null; then
        log_error "gunzip not found."
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

    if [ -z "${TARGET_DB_URL:-}" ]; then
        log_error "TARGET_DB_URL not set"
        missing=1
    fi

    if [ -z "${S3_BUCKET:-}" ]; then
        log_error "S3_BUCKET not set"
        missing=1
    fi

    if [ -z "${AWS_ACCESS_KEY_ID:-}" ]; then
        log_error "AWS_ACCESS_KEY_ID not set"
        missing=1
    fi

    if [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        log_error "AWS_SECRET_ACCESS_KEY not set"
        missing=1
    fi

    if [ -z "${AWS_REGION:-}" ]; then
        log_error "AWS_REGION not set"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing required environment variables"
        exit 2
    fi

    log_info "All environment variables set."
}

prevent_production() {
    if [ "$RESTORE_ENV" != "staging" ]; then
        log_error "========================================="
        log_error "PRODUCTION RESTORE BLOCKED"
        log_error "========================================="
        log_error "This script is configured for STAGING only."
        log_error "DO NOT restore to production without explicit client approval."
        log_error "Environment specified: $RESTORE_ENV"
        exit 1
    fi

    # Additional safety check - look for production keywords in DB URL
    if [[ "${TARGET_DB_URL:-}" =~ "production" ]] || [[ "${TARGET_DB_URL:-}" =~ "prod" ]]; then
        log_error "========================================="
        log_error "PRODUCTION DATABASE DETECTED"
        log_error "========================================="
        log_error "TARGET_DB_URL appears to point to production."
        log_error "Restore to production is BLOCKED."
        exit 1
    fi
}

find_latest_backup() {
    log_info "Finding latest backup in S3..."

    S3_BASE_PATH="s3://${S3_BUCKET}/pro-remorque/backups/${RESTORE_ENV}/"

    # List all backups and find the most recent
    LATEST_FILE=$(aws s3 ls "$S3_BASE_PATH" --recursive --region "$AWS_REGION" \
        | grep '\.sql\.gz$' \
        | sort -r \
        | head -n 1 \
        | awk '{print $4}')

    if [ -z "$LATEST_FILE" ]; then
        log_error "No backups found in S3"
        exit 4
    fi

    BACKUP_FILE=$(basename "$LATEST_FILE")
    log_info "Latest backup found: $BACKUP_FILE"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            RESTORE_ENV="$2"
            shift 2
            ;;
        --backup-file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --latest)
            USE_LATEST=true
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

# Validate arguments
if [ -z "$RESTORE_ENV" ]; then
    log_error "Environment not specified"
    usage
fi

if [ "$USE_LATEST" = false ] && [ -z "$BACKUP_FILE" ]; then
    log_error "Either --backup-file or --latest must be specified"
    usage
fi

# Main execution
log_info "================================================"
log_info "Pro-Remorque Database Restore"
log_info "Environment: $RESTORE_ENV"
log_info "================================================"

check_prerequisites
check_env_vars
prevent_production

# Find backup file if --latest is used
if [ "$USE_LATEST" = true ]; then
    find_latest_backup
fi

# Extract date from backup filename for S3 path
if [[ $BACKUP_FILE =~ _([0-9]{8})_ ]]; then
    BACKUP_DATE="${BASH_REMATCH[1]}"
    FORMATTED_DATE=$(date -d "${BACKUP_DATE}" +%Y-%m-%d 2>/dev/null || date -j -f "%Y%m%d" "${BACKUP_DATE}" +%Y-%m-%d 2>/dev/null)
else
    log_error "Cannot extract date from backup filename: $BACKUP_FILE"
    exit 4
fi

# Setup paths
TEMP_DIR=$(mktemp -d)
BACKUP_PATH_GZ="${TEMP_DIR}/${BACKUP_FILE}"
BACKUP_PATH="${BACKUP_PATH_GZ%.gz}"
CHECKSUM_FILENAME="${BACKUP_FILE}.sha256"
CHECKSUM_PATH="${TEMP_DIR}/${CHECKSUM_FILENAME}"

S3_BASE_PATH="s3://${S3_BUCKET}/pro-remorque/backups/${RESTORE_ENV}/${FORMATTED_DATE}"
S3_BACKUP_PATH="${S3_BASE_PATH}/${BACKUP_FILE}"
S3_CHECKSUM_PATH="${S3_BASE_PATH}/${CHECKSUM_FILENAME}"

log_info "Backup file: $BACKUP_FILE"
log_info "S3 source: $S3_BACKUP_PATH"
log_info "Temporary directory: $TEMP_DIR"

# Download backup from S3
log_info "Downloading backup from S3..."
if ! aws s3 cp "$S3_BACKUP_PATH" "$BACKUP_PATH_GZ" --region "$AWS_REGION"; then
    log_error "Failed to download backup from S3"
    rm -rf "$TEMP_DIR"
    exit 4
fi

DOWNLOADED_SIZE=$(du -h "$BACKUP_PATH_GZ" | cut -f1)
log_info "Backup downloaded successfully. Size: $DOWNLOADED_SIZE"

# Download and verify checksum
log_info "Downloading checksum file..."
if aws s3 cp "$S3_CHECKSUM_PATH" "$CHECKSUM_PATH" --region "$AWS_REGION" 2>/dev/null; then
    log_info "Verifying checksum..."

    EXPECTED_CHECKSUM=$(cat "$CHECKSUM_PATH" | awk '{print $1}')

    if command -v sha256sum &> /dev/null; then
        ACTUAL_CHECKSUM=$(sha256sum "$BACKUP_PATH_GZ" | awk '{print $1}')
    elif command -v shasum &> /dev/null; then
        ACTUAL_CHECKSUM=$(shasum -a 256 "$BACKUP_PATH_GZ" | awk '{print $1}')
    else
        log_warn "No SHA256 utility found, skipping checksum verification"
        ACTUAL_CHECKSUM="$EXPECTED_CHECKSUM"
    fi

    if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
        log_error "Checksum verification failed!"
        log_error "Expected: $EXPECTED_CHECKSUM"
        log_error "Actual:   $ACTUAL_CHECKSUM"
        rm -rf "$TEMP_DIR"
        exit 5
    fi

    log_info "Checksum verified successfully."
else
    log_warn "Checksum file not found in S3, skipping verification"
fi

# Decompress backup
log_info "Decompressing backup..."
if ! gunzip "$BACKUP_PATH_GZ"; then
    log_error "Failed to decompress backup"
    rm -rf "$TEMP_DIR"
    exit 4
fi

DECOMPRESSED_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log_info "Backup decompressed. Size: $DECOMPRESSED_SIZE"

# Test database connection
log_info "Testing database connection..."
if ! psql "$TARGET_DB_URL" -c "SELECT version();" &> /dev/null; then
    log_error "Cannot connect to target database"
    rm -rf "$TEMP_DIR"
    exit 3
fi
log_info "Database connection successful."

# Warning before restore
log_warn "========================================="
log_warn "ABOUT TO RESTORE DATABASE"
log_warn "========================================="
log_warn "Target: STAGING database"
log_warn "This will OVERWRITE the current database!"
log_warn ""
read -p "Continue? (type 'YES' to proceed): " confirm

if [ "$confirm" != "YES" ]; then
    log_info "Restore cancelled by user."
    rm -rf "$TEMP_DIR"
    exit 0
fi

# Restore database
log_info "Starting database restore..."
log_info "This may take several minutes..."

if ! psql "$TARGET_DB_URL" < "$BACKUP_PATH" 2>&1 | tee "${TEMP_DIR}/restore.log"; then
    log_error "Database restore failed"
    log_error "Check restore.log for details"
    rm -rf "$TEMP_DIR"
    exit 6
fi

log_info "Database restore completed."

# Cleanup temporary files
log_info "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

# Run smoke tests
if [ "$SKIP_SMOKE_TESTS" = "true" ]; then
    log_warn "Skipping smoke tests (SKIP_SMOKE_TESTS=true)"
else
    log_info "Running smoke tests..."

    SMOKE_TESTS_SCRIPT="$(dirname "$0")/../acceptance/smoke-tests.sh"

    if [ ! -f "$SMOKE_TESTS_SCRIPT" ]; then
        log_error "Smoke tests script not found: $SMOKE_TESTS_SCRIPT"
        exit 7
    fi

    if ! bash "$SMOKE_TESTS_SCRIPT"; then
        log_error "Smoke tests failed!"
        log_error "Database restored but validation failed."
        exit 7
    fi

    log_info "Smoke tests passed successfully."
fi

# Summary
log_info "================================================"
log_info "RESTORE COMPLETED SUCCESSFULLY"
log_info "================================================"
log_info "Environment:    $RESTORE_ENV"
log_info "Backup file:    $BACKUP_FILE"
log_info "Backup size:    $DECOMPRESSED_SIZE"
log_info "Timestamp:      $(date)"
log_info "Smoke tests:    $([ "$SKIP_SMOKE_TESTS" = "true" ] && echo "SKIPPED" || echo "PASSED")"
log_info "================================================"

exit 0
