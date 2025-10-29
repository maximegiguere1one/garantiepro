#!/bin/bash
#
# notify-on-fail.sh - Send notifications when smoke tests fail
#
# Usage:
#   ./notify-on-fail.sh <test_result_code> <log_file>
#   ./notify-on-fail.sh 20 smoke-tests.log
#
# Environment Variables:
#   SLACK_WEBHOOK_URL   - Slack incoming webhook URL
#   EMAIL_WEBHOOK_URL   - Email notification webhook (optional)
#   PAGERDUTY_KEY       - PagerDuty integration key (optional)
#
# Exit Codes:
#   0 - Notifications sent successfully
#   1 - Failed to send notifications
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Arguments
TEST_RESULT_CODE="${1:-0}"
LOG_FILE="${2:-}"

# Environment
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_WEBHOOK_URL="${EMAIL_WEBHOOK_URL:-}"
PAGERDUTY_KEY="${PAGERDUTY_KEY:-}"

# Test result mapping
get_error_message() {
    case $1 in
        0)
            echo "All tests passed"
            ;;
        10)
            echo "Health check failed - API may be down"
            ;;
        20)
            echo "Create warranty failed - Database or API issue"
            ;;
        30)
            echo "PDF/Signature generation failed - Document service issue"
            ;;
        40)
            echo "File upload failed - Storage service issue"
            ;;
        50)
            echo "Miscellaneous error - Check logs"
            ;;
        *)
            echo "Unknown error code: $1"
            ;;
    esac
}

# Get severity level
get_severity() {
    case $1 in
        0)
            echo "info"
            ;;
        10)
            echo "critical"
            ;;
        20|30)
            echo "error"
            ;;
        40|50)
            echo "warning"
            ;;
        *)
            echo "error"
            ;;
    esac
}

# Extract summary from log file
extract_summary() {
    if [ -z "$LOG_FILE" ] || [ ! -f "$LOG_FILE" ]; then
        echo "No log file available"
        return
    fi

    echo "=== Test Summary ==="
    grep -E "\[PASS\]|\[FAIL\]|\[ERROR\]" "$LOG_FILE" | tail -20 || echo "No test results found"
    echo ""
    echo "=== Last 10 Lines ==="
    tail -10 "$LOG_FILE"
}

# Send Slack notification
send_slack_notification() {
    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        echo -e "${YELLOW}[WARN]${NC} SLACK_WEBHOOK_URL not set, skipping Slack notification"
        return 0
    fi

    local error_message
    error_message=$(get_error_message "$TEST_RESULT_CODE")

    local severity
    severity=$(get_severity "$TEST_RESULT_CODE")

    local color="danger"
    if [ "$severity" = "warning" ]; then
        color="warning"
    elif [ "$severity" = "info" ]; then
        color="good"
    fi

    local summary
    summary=$(extract_summary | head -30)

    local payload=$(cat <<EOF
{
  "text": "🚨 Pro-Remorque Smoke Tests Failed",
  "attachments": [
    {
      "color": "$color",
      "title": "Smoke Test Failure",
      "fields": [
        {
          "title": "Error Code",
          "value": "$TEST_RESULT_CODE",
          "short": true
        },
        {
          "title": "Severity",
          "value": "$severity",
          "short": true
        },
        {
          "title": "Error Message",
          "value": "$error_message",
          "short": false
        },
        {
          "title": "Environment",
          "value": "Staging",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
          "short": true
        }
      ],
      "footer": "Pro-Remorque Monitoring"
    },
    {
      "color": "$color",
      "title": "Test Summary",
      "text": "\`\`\`\n$summary\n\`\`\`",
      "mrkdwn_in": ["text"]
    }
  ]
}
EOF
)

    echo -e "${GREEN}[INFO]${NC} Sending Slack notification..."

    if curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null 2>&1; then
        echo -e "${GREEN}[INFO]${NC} Slack notification sent successfully"
        return 0
    else
        echo -e "${RED}[ERROR]${NC} Failed to send Slack notification"
        return 1
    fi
}

# Send email notification
send_email_notification() {
    if [ -z "$EMAIL_WEBHOOK_URL" ]; then
        echo -e "${YELLOW}[WARN]${NC} EMAIL_WEBHOOK_URL not set, skipping email notification"
        return 0
    fi

    local error_message
    error_message=$(get_error_message "$TEST_RESULT_CODE")

    local summary
    summary=$(extract_summary)

    local payload=$(cat <<EOF
{
  "to": "ops@pro-remorque.com",
  "subject": "🚨 Smoke Tests Failed - Error Code $TEST_RESULT_CODE",
  "body": "Pro-Remorque smoke tests have failed in staging environment.\n\nError Code: $TEST_RESULT_CODE\nError Message: $error_message\n\nTimestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)\n\n$summary",
  "priority": "high"
}
EOF
)

    echo -e "${GREEN}[INFO]${NC} Sending email notification..."

    if curl -s -X POST "$EMAIL_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null 2>&1; then
        echo -e "${GREEN}[INFO]${NC} Email notification sent successfully"
        return 0
    else
        echo -e "${RED}[ERROR]${NC} Failed to send email notification"
        return 1
    fi
}

# Send PagerDuty alert
send_pagerduty_alert() {
    if [ -z "$PAGERDUTY_KEY" ]; then
        echo -e "${YELLOW}[WARN]${NC} PAGERDUTY_KEY not set, skipping PagerDuty alert"
        return 0
    fi

    # Only alert on critical failures
    if [ "$TEST_RESULT_CODE" -ne 10 ] && [ "$TEST_RESULT_CODE" -ne 20 ]; then
        echo -e "${YELLOW}[INFO]${NC} Not critical enough for PagerDuty alert"
        return 0
    fi

    local error_message
    error_message=$(get_error_message "$TEST_RESULT_CODE")

    local payload=$(cat <<EOF
{
  "routing_key": "$PAGERDUTY_KEY",
  "event_action": "trigger",
  "payload": {
    "summary": "Pro-Remorque Smoke Tests Failed - $error_message",
    "severity": "error",
    "source": "smoke-tests",
    "custom_details": {
      "error_code": "$TEST_RESULT_CODE",
      "error_message": "$error_message",
      "environment": "staging",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  }
}
EOF
)

    echo -e "${GREEN}[INFO]${NC} Sending PagerDuty alert..."

    if curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null 2>&1; then
        echo -e "${GREEN}[INFO]${NC} PagerDuty alert sent successfully"
        return 0
    else
        echo -e "${RED}[ERROR]${NC} Failed to send PagerDuty alert"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${GREEN}[INFO]${NC} ================================================"
    echo -e "${GREEN}[INFO]${NC} Pro-Remorque Smoke Test Notification"
    echo -e "${GREEN}[INFO]${NC} ================================================"
    echo -e "${GREEN}[INFO]${NC} Test Result Code: $TEST_RESULT_CODE"
    echo -e "${GREEN}[INFO]${NC} Error Message: $(get_error_message "$TEST_RESULT_CODE")"
    echo -e "${GREEN}[INFO]${NC} Severity: $(get_severity "$TEST_RESULT_CODE")"
    echo -e "${GREEN}[INFO]${NC} ================================================"
    echo ""

    # Skip notifications if tests passed
    if [ "$TEST_RESULT_CODE" -eq 0 ]; then
        echo -e "${GREEN}[INFO]${NC} Tests passed - no notifications needed"
        exit 0
    fi

    local notification_failed=0

    # Send notifications
    send_slack_notification || notification_failed=1
    send_email_notification || notification_failed=1
    send_pagerduty_alert || notification_failed=1

    if [ $notification_failed -eq 1 ]; then
        echo -e "${YELLOW}[WARN]${NC} Some notifications failed to send"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}[INFO]${NC} All notifications sent successfully"
    exit 0
}

# Run main
main
