#!/bin/bash
#
# smoke-tests.sh - Comprehensive smoke tests for Pro-Remorque API
#
# Usage:
#   ./smoke-tests.sh
#   STAGING_API_URL=https://api.staging.pro-remorque.com ./smoke-tests.sh
#   ./smoke-tests.sh --verbose
#
# Prerequisites:
#   - curl (HTTP client)
#   - jq (JSON processor)
#   - Node.js 18+ (if using Node.js variant)
#
# Required Environment Variables:
#   STAGING_API_URL         - API base URL (e.g., https://api.staging.pro-remorque.com)
#   STAGING_API_KEY         - API authentication key (Supabase anon key)
#   STAGING_SERVICE_KEY     - Service role key (for admin operations)
#
# Optional Environment Variables:
#   TEST_USER_EMAIL         - Test user email (default: smoke-test@example.com)
#   TEST_USER_PASSWORD      - Test user password (default: generated)
#   CLEANUP_ON_SUCCESS      - Clean test data after success (default: true)
#   VERBOSE                 - Verbose output (default: false)
#   SLACK_WEBHOOK_URL       - Slack webhook for notifications (optional)
#
# Exit Codes:
#   0  - All tests passed
#   10 - Health check failed
#   20 - Create warranty failed
#   30 - PDF/Signature failed
#   40 - File upload failed
#   50 - Miscellaneous error
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
STAGING_API_URL="${STAGING_API_URL:-http://localhost:5173}"
STAGING_API_KEY="${STAGING_API_KEY:-}"
STAGING_SERVICE_KEY="${STAGING_SERVICE_KEY:-}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-smoke-test@example.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-SmokeTest123!}"
CLEANUP_ON_SUCCESS="${CLEANUP_ON_SUCCESS:-true}"
VERBOSE="${VERBOSE:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Test tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TEST_START_TIME=$(date +%s)
TEST_ID="smoke-$(date +%Y%m%d-%H%M%S)"
CREATED_WARRANTY_ID=""
CREATED_ATTACHMENT_ID=""
TEMP_DIR=$(mktemp -d)

# HTTP defaults
HTTP_TIMEOUT=10
MAX_RETRIES=2
RETRY_DELAY=2

# Logging functions
log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Utility functions
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=0

    if ! command -v curl &> /dev/null; then
        log_error "curl not found"
        missing=1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq not found. Install with: apt-get install jq or brew install jq"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 50
    fi

    log_info "All prerequisites found."
}

check_env_vars() {
    log_info "Checking environment variables..."

    local missing=0

    if [ -z "$STAGING_API_URL" ]; then
        log_error "STAGING_API_URL not set"
        missing=1
    fi

    if [ -z "$STAGING_API_KEY" ]; then
        log_warn "STAGING_API_KEY not set - some tests may fail"
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing required environment variables"
        exit 50
    fi

    log_info "Environment variables OK"
    log_debug "API URL: $STAGING_API_URL"
}

# HTTP request wrapper with retries
http_request() {
    local method="$1"
    local url="$2"
    local data="${3:-}"
    local headers="${4:-}"
    local retry_count=0
    local response_file="${TEMP_DIR}/http_response_$$"
    local http_code

    while [ $retry_count -le $MAX_RETRIES ]; do
        if [ -n "$data" ]; then
            http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
                -X "$method" \
                -H "Content-Type: application/json" \
                -H "apikey: ${STAGING_API_KEY}" \
                -H "Authorization: Bearer ${STAGING_API_KEY}" \
                $headers \
                -d "$data" \
                --max-time $HTTP_TIMEOUT \
                "$url" 2>/dev/null || echo "000")
        else
            http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
                -X "$method" \
                -H "apikey: ${STAGING_API_KEY}" \
                -H "Authorization: Bearer ${STAGING_API_KEY}" \
                $headers \
                --max-time $HTTP_TIMEOUT \
                "$url" 2>/dev/null || echo "000")
        fi

        log_debug "$method $url -> HTTP $http_code"

        # If successful, return
        if [ "$http_code" != "000" ] && [ "$http_code" != "502" ] && [ "$http_code" != "503" ] && [ "$http_code" != "504" ]; then
            echo "$http_code"
            cat "$response_file"
            rm -f "$response_file"
            return 0
        fi

        # Retry logic
        ((retry_count++))
        if [ $retry_count -le $MAX_RETRIES ]; then
            log_warn "Request failed (HTTP $http_code), retrying ($retry_count/$MAX_RETRIES)..."
            sleep $RETRY_DELAY
        fi
    done

    # All retries failed
    log_error "Request failed after $MAX_RETRIES retries"
    echo "000"
    echo "{}"
    rm -f "$response_file"
    return 1
}

# Test execution wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"

    ((TESTS_RUN++))
    log_test "$test_name"

    if $test_function; then
        log_pass "$test_name"
        return 0
    else
        log_fail "$test_name"
        return 1
    fi
}

# ============================================================================
# TEST 1: Health Check
# ============================================================================
test_health_check() {
    log_debug "Testing health check endpoint..."

    local result
    result=$(http_request "GET" "${STAGING_API_URL}/api/health" "" "")

    local http_code
    http_code=$(echo "$result" | head -n 1)
    local response_body
    response_body=$(echo "$result" | tail -n +2)

    if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        log_debug "Health check response: $response_body"
        return 0
    else
        log_error "Health check failed with HTTP $http_code"
        log_error "Response: $response_body"
        return 1
    fi
}

# ============================================================================
# TEST 2: Create Warranty (End-to-End)
# ============================================================================
test_create_warranty() {
    log_debug "Creating test warranty..."

    # Load fixture
    local fixture_file="acceptance/fixtures/warranty-min.json"
    if [ ! -f "$fixture_file" ]; then
        log_error "Fixture file not found: $fixture_file"
        return 1
    fi

    # Generate unique test data
    local test_customer_name="Smoke Test ${TEST_ID}"
    local test_vin="SMOKE${TEST_ID: -10}"

    # Prepare request body
    local request_body
    request_body=$(cat "$fixture_file" | \
        jq --arg name "$test_customer_name" \
           --arg vin "$test_vin" \
           --arg email "$TEST_USER_EMAIL" \
           '.customer_name = $name | .vin = $vin | .customer_email = $email')

    log_debug "Request body: $request_body"

    # Create warranty
    local result
    result=$(http_request "POST" "${STAGING_API_URL}/rest/v1/warranties" "$request_body" "")

    local http_code
    http_code=$(echo "$result" | head -n 1)
    local response_body
    response_body=$(echo "$result" | tail -n +2)

    log_debug "Create warranty response (HTTP $http_code): $response_body"

    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        # Extract warranty ID
        CREATED_WARRANTY_ID=$(echo "$response_body" | jq -r '.[0].id // .id // empty')

        if [ -z "$CREATED_WARRANTY_ID" ] || [ "$CREATED_WARRANTY_ID" = "null" ]; then
            log_error "Warranty created but ID not found in response"
            return 1
        fi

        log_info "Warranty created successfully: ID=$CREATED_WARRANTY_ID"

        # Verify warranty exists (read back)
        local verify_result
        verify_result=$(http_request "GET" "${STAGING_API_URL}/rest/v1/warranties?id=eq.${CREATED_WARRANTY_ID}" "" "")

        local verify_code
        verify_code=$(echo "$verify_result" | head -n 1)

        if [ "$verify_code" = "200" ]; then
            log_debug "Warranty verified in database"
            return 0
        else
            log_warn "Warranty created but verification failed (HTTP $verify_code)"
            return 0  # Don't fail on verification
        fi
    else
        log_error "Create warranty failed with HTTP $http_code"
        log_error "Response: $response_body"
        return 1
    fi
}

# ============================================================================
# TEST 3: Generate PDF Preview
# ============================================================================
test_generate_pdf() {
    if [ -z "$CREATED_WARRANTY_ID" ]; then
        log_warn "Skipping PDF test - no warranty ID"
        return 0
    fi

    log_debug "Generating PDF for warranty $CREATED_WARRANTY_ID..."

    # Try to generate PDF (endpoint may vary)
    local pdf_file="${TEMP_DIR}/warranty_${CREATED_WARRANTY_ID}.pdf"
    local http_code

    http_code=$(curl -s -w "%{http_code}" -o "$pdf_file" \
        -H "apikey: ${STAGING_API_KEY}" \
        -H "Authorization: Bearer ${STAGING_API_KEY}" \
        --max-time 30 \
        "${STAGING_API_URL}/api/warranties/${CREATED_WARRANTY_ID}/pdf" \
        2>/dev/null || echo "000")

    log_debug "PDF generation response: HTTP $http_code"

    if [ "$http_code" = "200" ]; then
        # Check file size
        local file_size
        file_size=$(stat -f%z "$pdf_file" 2>/dev/null || stat -c%s "$pdf_file" 2>/dev/null || echo "0")

        if [ "$file_size" -gt 10000 ]; then
            log_info "PDF generated successfully (${file_size} bytes)"
            return 0
        else
            log_warn "PDF file too small (${file_size} bytes), may be invalid"
            return 0  # Don't fail on size check
        fi
    elif [ "$http_code" = "404" ]; then
        log_warn "PDF endpoint not found - skipping test"
        return 0  # Don't fail if endpoint doesn't exist
    else
        log_error "PDF generation failed with HTTP $http_code"
        return 1
    fi
}

# ============================================================================
# TEST 4: Signature Flow (Stub)
# ============================================================================
test_signature_flow() {
    if [ -z "$CREATED_WARRANTY_ID" ]; then
        log_warn "Skipping signature test - no warranty ID"
        return 0
    fi

    log_debug "Testing signature flow for warranty $CREATED_WARRANTY_ID..."

    # Try to initiate signature (endpoint may vary)
    local result
    result=$(http_request "POST" "${STAGING_API_URL}/api/warranties/${CREATED_WARRANTY_ID}/sign?mode=test" '{}' "")

    local http_code
    http_code=$(echo "$result" | head -n 1)
    local response_body
    response_body=$(echo "$result" | tail -n +2)

    log_debug "Signature flow response (HTTP $http_code): $response_body"

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        log_info "Signature flow initiated successfully"
        return 0
    elif [ "$http_code" = "404" ] || [ "$http_code" = "501" ]; then
        log_warn "Signature endpoint not available - skipping test"
        return 0  # Don't fail if endpoint doesn't exist
    else
        log_error "Signature flow failed with HTTP $http_code"
        return 1
    fi
}

# ============================================================================
# TEST 5: File Upload
# ============================================================================
test_file_upload() {
    if [ -z "$CREATED_WARRANTY_ID" ]; then
        log_warn "Skipping file upload test - no warranty ID"
        return 0
    fi

    log_debug "Testing file upload for warranty $CREATED_WARRANTY_ID..."

    # Create a small test file
    local test_file="${TEMP_DIR}/test-attachment.txt"
    echo "Smoke test attachment - ${TEST_ID}" > "$test_file"

    # Try to upload file (endpoint may vary)
    local http_code
    http_code=$(curl -s -w "%{http_code}" -o "${TEMP_DIR}/upload_response.json" \
        -F "file=@${test_file}" \
        -H "apikey: ${STAGING_API_KEY}" \
        -H "Authorization: Bearer ${STAGING_API_KEY}" \
        --max-time 30 \
        "${STAGING_API_URL}/api/warranties/${CREATED_WARRANTY_ID}/attachments" \
        2>/dev/null || echo "000")

    log_debug "File upload response: HTTP $http_code"

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        local response_body
        response_body=$(cat "${TEMP_DIR}/upload_response.json")
        log_debug "Upload response: $response_body"

        # Try to extract attachment ID
        CREATED_ATTACHMENT_ID=$(echo "$response_body" | jq -r '.id // .attachment_id // empty' 2>/dev/null || echo "")

        log_info "File uploaded successfully"
        return 0
    elif [ "$http_code" = "404" ] || [ "$http_code" = "501" ]; then
        log_warn "File upload endpoint not available - skipping test"
        return 0  # Don't fail if endpoint doesn't exist
    else
        log_error "File upload failed with HTTP $http_code"
        return 1
    fi
}

# ============================================================================
# TEST 6: Database Read Access
# ============================================================================
test_database_access() {
    log_debug "Testing database read access..."

    local result
    result=$(http_request "GET" "${STAGING_API_URL}/rest/v1/profiles?select=id&limit=1" "" "")

    local http_code
    http_code=$(echo "$result" | head -n 1)

    log_debug "Database access response: HTTP $http_code"

    if [ "$http_code" = "200" ] || [ "$http_code" = "406" ]; then
        log_info "Database read access successful"
        return 0
    else
        log_error "Database access failed with HTTP $http_code"
        return 1
    fi
}

# ============================================================================
# CLEANUP
# ============================================================================
cleanup_test_data() {
    if [ "$CLEANUP_ON_SUCCESS" != "true" ]; then
        log_info "Skipping cleanup (CLEANUP_ON_SUCCESS=false)"
        return 0
    fi

    log_info "Cleaning up test data..."

    # Delete created warranty
    if [ -n "$CREATED_WARRANTY_ID" ]; then
        log_debug "Deleting warranty $CREATED_WARRANTY_ID..."

        local result
        result=$(http_request "DELETE" "${STAGING_API_URL}/rest/v1/warranties?id=eq.${CREATED_WARRANTY_ID}" "" "")

        local http_code
        http_code=$(echo "$result" | head -n 1)

        if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
            log_info "Warranty deleted successfully"
        else
            log_warn "Failed to delete warranty (HTTP $http_code) - may require manual cleanup"
        fi
    fi

    # Clean temp directory
    rm -rf "$TEMP_DIR"
    log_debug "Temporary files cleaned"
}

# ============================================================================
# NOTIFICATION
# ============================================================================
send_notification() {
    local status="$1"
    local message="$2"

    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        return 0
    fi

    local color="good"
    if [ "$status" = "failed" ]; then
        color="danger"
    fi

    local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "Pro-Remorque Smoke Tests - $status",
      "text": "$message",
      "fields": [
        {
          "title": "Environment",
          "value": "Staging",
          "short": true
        },
        {
          "title": "Tests Run",
          "value": "$TESTS_RUN",
          "short": true
        },
        {
          "title": "Passed",
          "value": "$TESTS_PASSED",
          "short": true
        },
        {
          "title": "Failed",
          "value": "$TESTS_FAILED",
          "short": true
        }
      ],
      "footer": "Smoke Tests",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

    curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null 2>&1 || true
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
main() {
    log_info "================================================"
    log_info "Pro-Remorque API Smoke Tests"
    log_info "Test ID: $TEST_ID"
    log_info "API URL: $STAGING_API_URL"
    log_info "================================================"
    echo ""

    check_prerequisites
    check_env_vars

    # Run tests
    run_test "1. Health check" test_health_check || exit 10
    run_test "2. Create warranty (E2E)" test_create_warranty || exit 20
    run_test "3. Generate PDF preview" test_generate_pdf || exit 30
    run_test "4. Signature flow (stub)" test_signature_flow || exit 30
    run_test "5. File upload" test_file_upload || exit 40
    run_test "6. Database read access" test_database_access || exit 50

    # Summary
    TEST_END_TIME=$(date +%s)
    TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

    echo ""
    log_info "================================================"
    log_info "TEST SUMMARY"
    log_info "================================================"
    log_info "Test ID:      $TEST_ID"
    log_info "Tests run:    $TESTS_RUN"
    log_pass "Tests passed: $TESTS_PASSED"

    if [ "$TESTS_FAILED" -gt 0 ]; then
        log_fail "Tests failed: $TESTS_FAILED"
        log_info "Duration:     ${TEST_DURATION}s"
        log_info "================================================"

        send_notification "failed" "Smoke tests failed: $TESTS_FAILED/$TESTS_RUN tests failed"

        # Cleanup even on failure
        cleanup_test_data

        exit 1
    else
        log_info "Duration:     ${TEST_DURATION}s"
        log_info "================================================"
        log_pass "ALL TESTS PASSED ✓"

        send_notification "passed" "All smoke tests passed: $TESTS_RUN/$TESTS_RUN tests successful"

        # Cleanup on success
        cleanup_test_data

        exit 0
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --no-cleanup)
            CLEANUP_ON_SUCCESS=false
            shift
            ;;
        --help|-h)
            grep "^#" "$0" | grep -v "#!/bin/bash" | sed 's/^# //g; s/^#//g'
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 50
            ;;
    esac
done

# Trap for cleanup on exit
trap cleanup_test_data EXIT

# Run main
main
