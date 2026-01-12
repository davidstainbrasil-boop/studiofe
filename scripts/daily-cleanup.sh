#!/bin/bash
#
# Daily Cleanup Cron Job
# Runs automatic resource cleanup at 2 AM daily
#
# Usage: ./daily-cleanup.sh
# Cron: 0 2 * * * /root/_MVP_Video_TecnicoCursos_v7/scripts/daily-cleanup.sh

# Source environment variables
export $(grep -v '^#' /root/_MVP_Video_TecnicoCursos_v7/.env | xargs)

# API endpoint
API_URL="https://cursostecno.com.br/api/admin/cleanup"

# Log file
LOG_FILE="/var/log/cleanup-cron.log"

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting automated cleanup..." >> "$LOG_FILE"

# Execute cleanup with cron secret
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

# Log response
echo "[$TIMESTAMP] HTTP Status: $HTTP_STATUS" >> "$LOG_FILE"
echo "[$TIMESTAMP] Response: $BODY" >> "$LOG_FILE"

# Check if successful
if [ "$HTTP_STATUS" = "200" ]; then
  echo "[$TIMESTAMP] ✅ Cleanup completed successfully" >> "$LOG_FILE"

  # Extract summary if available
  DELETED=$(echo "$BODY" | jq -r '.summary.totalDeleted // "N/A"' 2>/dev/null)
  FREED_MB=$(echo "$BODY" | jq -r '.summary.totalFreedMB // "N/A"' 2>/dev/null)

  if [ "$DELETED" != "N/A" ]; then
    echo "[$TIMESTAMP] Deleted: $DELETED files, Freed: ${FREED_MB}MB" >> "$LOG_FILE"
  fi
else
  echo "[$TIMESTAMP] ❌ Cleanup failed with status $HTTP_STATUS" >> "$LOG_FILE"

  # Send alert via Sentry (if SENTRY_DSN is set)
  if [ -n "$SENTRY_DSN" ]; then
    curl -s -X POST "https://sentry.io/api/0/envelope/" \
      -H "Content-Type: application/json" \
      -d "{\"dsn\":\"$SENTRY_DSN\",\"message\":\"Cleanup cron failed with status $HTTP_STATUS\"}" \
      >> "$LOG_FILE" 2>&1
  fi
fi

echo "[$TIMESTAMP] Cleanup job finished" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

# Exit with appropriate code
[ "$HTTP_STATUS" = "200" ] && exit 0 || exit 1
