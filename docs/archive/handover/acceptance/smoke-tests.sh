#!/bin/bash
#
# smoke-tests.sh - Smoke tests for Pro-Remorque application
#
# Usage:
#   ./smoke-tests.sh
#   APP_URL=https://staging.pro-remorque.com ./smoke-tests.sh
#
# Required Environment Variables:
#   APP_URL             - Application URL (default: http://localhost:5173)
#   SUPABASE_URL        - Supabase project URL
#   SUPABASE_ANON_KEY   - Supabase anon key
#   TEST_USER_EMAIL     - Test user email (optional)
#   TEST_USER_PASSWORD  - Test user password (optional)
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_URL="${APP_URL:-http://localhost:5173}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@example.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Functions
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

# Test 1: Health Check
test_health_check() {
    local response
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response.txt "${APP_URL}/api/health" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        return 0
    else
        log_warn "Health check returned: $response"
        return 1
    fi
}

# Test 2: Frontend loads
test_frontend_loads() {
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null "${APP_URL}/" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        return 0
    else
        log_warn "Frontend returned: $response"
        return 1
    fi
}

# Test 3: Supabase connection
test_supabase_connection() {
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        log_warn "Supabase credentials not set, skipping"
        return 0
    fi

    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        "${SUPABASE_URL}/rest/v1/" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        return 0
    else
        log_warn "Supabase connection returned: $response"
        return 1
    fi
}

# Test 4: Static assets load
test_static_assets() {
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null "${APP_URL}/vite.svg" 2>/dev/null || echo "000")

    if [ "$response" = "200" ] || [ "$response" = "304" ]; then
        return 0
    else
        log_warn "Static assets returned: $response"
        return 1
    fi
}

# Test 5: Database query test (read-only)
test_database_read() {
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        log_warn "Supabase credentials not set, skipping"
        return 0
    fi

    # Try to read from profiles table (should exist in Pro-Remorque)
    local response
    response=$(curl -s -w "%{http_code}" -o /tmp/db_response.txt \
        "${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        2>/dev/null || echo "000")

    # Accept both 200 (data found) and 406/416 (no data but table exists)
    if [ "$response" = "200" ] || [ "$response" = "406" ] || [ "$response" = "416" ]; then
        return 0
    else
        log_warn "Database read returned: $response"
        cat /tmp/db_response.txt 2>/dev/null || true
        return 1
    fi
}

# Test 6: API response time
test_api_response_time() {
    local start_time end_time duration

    start_time=$(date +%s%N)
    curl -s -o /dev/null "${APP_URL}/api/health" 2>/dev/null || true
    end_time=$(date +%s%N)

    duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

    if [ "$duration" -lt 3000 ]; then
        log_info "Response time: ${duration}ms"
        return 0
    else
        log_warn "Response time too slow: ${duration}ms (expected < 3000ms)"
        return 1
    fi
}

# Main execution
main() {
    log_info "================================================"
    log_info "Pro-Remorque Smoke Tests"
    log_info "App URL: $APP_URL"
    log_info "================================================"
    echo ""

    # Run tests
    run_test "1. Health check endpoint" test_health_check || true
    run_test "2. Frontend loads" test_frontend_loads || true
    run_test "3. Supabase connection" test_supabase_connection || true
    run_test "4. Static assets load" test_static_assets || true
    run_test "5. Database read access" test_database_read || true
    run_test "6. API response time" test_api_response_time || true

    # Summary
    echo ""
    log_info "================================================"
    log_info "TEST SUMMARY"
    log_info "================================================"
    log_info "Tests run:    $TESTS_RUN"
    log_pass "Tests passed: $TESTS_PASSED"

    if [ "$TESTS_FAILED" -gt 0 ]; then
        log_fail "Tests failed: $TESTS_FAILED"
        log_info "================================================"
        exit 1
    else
        log_info "================================================"
        log_pass "ALL TESTS PASSED ✓"
        exit 0
    fi
}

# Cleanup function
cleanup() {
    rm -f /tmp/health_response.txt /tmp/db_response.txt 2>/dev/null || true
}

trap cleanup EXIT

# Run main
main
