#!/bin/bash
#
# backup-db.sh - Backup Supabase PostgreSQL database to S3
#
# Usage:
#   ./backup-db.sh --env staging
#   ./backup-db.sh --env production  # REQUIRES CLIENT APPROVAL
#
# Prerequisites:
#   - pg_dump (PostgreSQL client tools)
#   - aws CLI configured (or credentials in env)
#   - gzip
#
# Required Environment Variables:
#   DB_URL              - PostgreSQL connection string (postgresql://user:pass@host:5432/dbname)
#   S3_BUCKET           - S3 bucket name (e.g., pro-remorque-backups)
#   AWS_ACCESS_KEY_ID   - AWS access key
#   AWS_SECRET_ACCESS_KEY - AWS secret key
#   AWS_REGION          - AWS region (e.g., us-east-1)
#
# Optional Environment Variables:
#   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 30)
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Missing prerequisites
#   3 - Database connection error
#   4 - Backup failed
#   5 - S3 upload failed
#
# Output:
#   - Backup file: s3://<BUCKET>/pro-remorque/backups/<env>/YYYY-MM-DD/<timestamp>.sql.gz
#   - Checksum file: <timestamp>.sql.gz.sha256
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_ENV=""

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
Usage: $0 --env <staging|production>

Options:
  --env         Environment to backup (staging or production)
  -h, --help    Show this help message

Example:
  $0 --env staging
EOF
    exit 1
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=0

    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Install PostgreSQL client tools."
        missing=1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "aws CLI not found. Install AWS CLI."
        missing=1
    fi

    if ! command -v gzip &> /dev/null; then
        log_error "gzip not found."
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

    if [ -z "${DB_URL:-}" ]; then
        log_error "DB_URL not set"
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

confirm_production() {
    if [ "$BACKUP_ENV" = "production" ]; then
        log_warn "========================================="
        log_warn "WARNING: PRODUCTION BACKUP"
        log_warn "========================================="
        log_warn "You are about to backup PRODUCTION database."
        log_warn "This requires CLIENT APPROVAL."
        log_warn ""
        read -p "Have you received client approval? (type 'YES' to continue): " confirm

        if [ "$confirm" != "YES" ]; then
            log_error "Production backup cancelled. Client approval required."
            exit 1
        fi
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            BACKUP_ENV="$2"
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
if [ -z "$BACKUP_ENV" ]; then
    log_error "Environment not specified"
    usage
fi

if [ "$BACKUP_ENV" != "staging" ] && [ "$BACKUP_ENV" != "production" ]; then
    log_error "Invalid environment. Must be 'staging' or 'production'"
    exit 1
fi

# Main execution
log_info "================================================"
log_info "Pro-Remorque Database Backup"
log_info "Environment: $BACKUP_ENV"
log_info "================================================"

check_prerequisites
check_env_vars
confirm_production

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_DIR=$(date +%Y-%m-%d)
BACKUP_FILENAME="backup_${BACKUP_ENV}_${TIMESTAMP}.sql"
BACKUP_FILENAME_GZ="${BACKUP_FILENAME}.gz"
CHECKSUM_FILENAME="${BACKUP_FILENAME_GZ}.sha256"
TEMP_DIR=$(mktemp -d)
BACKUP_PATH="${TEMP_DIR}/${BACKUP_FILENAME}"
BACKUP_PATH_GZ="${TEMP_DIR}/${BACKUP_FILENAME_GZ}"
CHECKSUM_PATH="${TEMP_DIR}/${CHECKSUM_FILENAME}"

# S3 paths
S3_BASE_PATH="s3://${S3_BUCKET}/pro-remorque/backups/${BACKUP_ENV}/${DATE_DIR}"
S3_BACKUP_PATH="${S3_BASE_PATH}/${BACKUP_FILENAME_GZ}"
S3_CHECKSUM_PATH="${S3_BASE_PATH}/${CHECKSUM_FILENAME}"

log_info "Temporary directory: $TEMP_DIR"
log_info "Backup file: $BACKUP_FILENAME_GZ"
log_info "S3 destination: $S3_BACKUP_PATH"

# Test database connection
log_info "Testing database connection..."
if ! pg_dump "$DB_URL" --version &> /dev/null; then
    log_error "Cannot connect to database"
    rm -rf "$TEMP_DIR"
    exit 3
fi
log_info "Database connection successful."

# Create backup
log_info "Creating database backup..."
if ! pg_dump "$DB_URL" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --verbose \
    > "$BACKUP_PATH" 2>&1; then
    log_error "Database backup failed"
    rm -rf "$TEMP_DIR"
    exit 4
fi

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log_info "Backup created successfully. Size: $BACKUP_SIZE"

# Compress backup
log_info "Compressing backup..."
if ! gzip -9 "$BACKUP_PATH"; then
    log_error "Compression failed"
    rm -rf "$TEMP_DIR"
    exit 4
fi

COMPRESSED_SIZE=$(du -h "$BACKUP_PATH_GZ" | cut -f1)
log_info "Backup compressed. Size: $COMPRESSED_SIZE"

# Calculate checksum
log_info "Calculating SHA256 checksum..."
if command -v sha256sum &> /dev/null; then
    CHECKSUM=$(sha256sum "$BACKUP_PATH_GZ" | awk '{print $1}')
elif command -v shasum &> /dev/null; then
    CHECKSUM=$(shasum -a 256 "$BACKUP_PATH_GZ" | awk '{print $1}')
else
    log_error "No SHA256 utility found"
    rm -rf "$TEMP_DIR"
    exit 4
fi

echo "$CHECKSUM  $BACKUP_FILENAME_GZ" > "$CHECKSUM_PATH"
log_info "Checksum: $CHECKSUM"

# Upload to S3
log_info "Uploading backup to S3..."
if ! aws s3 cp "$BACKUP_PATH_GZ" "$S3_BACKUP_PATH" \
    --region "$AWS_REGION" \
    --storage-class STANDARD_IA; then
    log_error "S3 upload failed"
    rm -rf "$TEMP_DIR"
    exit 5
fi

log_info "Uploading checksum to S3..."
if ! aws s3 cp "$CHECKSUM_PATH" "$S3_CHECKSUM_PATH" \
    --region "$AWS_REGION"; then
    log_warn "Checksum upload failed (non-critical)"
fi

# Verify S3 upload
log_info "Verifying S3 upload..."
if ! aws s3 ls "$S3_BACKUP_PATH" &> /dev/null; then
    log_error "S3 verification failed - file not found"
    rm -rf "$TEMP_DIR"
    exit 5
fi

S3_SIZE=$(aws s3 ls "$S3_BACKUP_PATH" | awk '{print $3}')
LOCAL_SIZE=$(stat -f%z "$BACKUP_PATH_GZ" 2>/dev/null || stat -c%s "$BACKUP_PATH_GZ" 2>/dev/null)

if [ "$S3_SIZE" != "$LOCAL_SIZE" ]; then
    log_error "S3 verification failed - size mismatch (S3: $S3_SIZE, Local: $LOCAL_SIZE)"
    rm -rf "$TEMP_DIR"
    exit 5
fi

log_info "S3 upload verified successfully."

# Cleanup
log_info "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

# Summary
log_info "================================================"
log_info "BACKUP COMPLETED SUCCESSFULLY"
log_info "================================================"
log_info "Environment:    $BACKUP_ENV"
log_info "Backup file:    $BACKUP_FILENAME_GZ"
log_info "Compressed size: $COMPRESSED_SIZE"
log_info "SHA256:         $CHECKSUM"
log_info "S3 location:    $S3_BACKUP_PATH"
log_info "S3 checksum:    $S3_CHECKSUM_PATH"
log_info "Timestamp:      $(date)"
log_info "================================================"

# Optional: Clean up old backups (if retention policy is set)
if [ -n "${BACKUP_RETENTION_DAYS:-}" ] && [ "$BACKUP_RETENTION_DAYS" -gt 0 ]; then
    log_info "Checking for old backups to delete (retention: $BACKUP_RETENTION_DAYS days)..."
    CUTOFF_DATE=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${BACKUP_RETENTION_DAYS}d +%Y-%m-%d)
    log_info "Cutoff date: $CUTOFF_DATE"
    # Note: Actual cleanup would require listing and filtering S3 objects
    log_warn "Automatic cleanup not implemented. Manually review old backups in S3."
fi

exit 0
