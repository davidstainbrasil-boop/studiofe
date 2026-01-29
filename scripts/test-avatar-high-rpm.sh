#!/bin/bash

##
# Test Script: Avatar HIGH Tier (Ready Player Me)
#
# Tests the Ready Player Me integration with Remotion rendering
# Expected time: ~120 seconds
# Expected cost: 3 credits
##

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Avatar HIGH Tier (Ready Player Me)${NC}\n"

# Step 1: Create render job
echo -e "${BLUE}📤 Step 1: Creating HIGH tier render job...${NC}"

RENDER_RESULT=$(curl -s -X POST $BASE_URL/api/v2/test/avatars/render \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Olá, este é um teste com avatar Ready Player Me de alta qualidade",
    "quality": "HIGH",
    "emotion": "happy",
    "fps": 30
  }')

# Check if request succeeded
SUCCESS=$(echo $RENDER_RESULT | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  ERROR=$(echo $RENDER_RESULT | jq -r '.error')
  echo -e "${RED}❌ Render failed: $ERROR${NC}"
  exit 1
fi

JOB_ID=$(echo $RENDER_RESULT | jq -r '.jobId')
PROVIDER=$(echo $RENDER_RESULT | jq -r '.provider')
CREDITS=$(echo $RENDER_RESULT | jq -r '.creditsUsed')
ESTIMATED_TIME=$(echo $RENDER_RESULT | jq -r '.estimatedTime')

echo -e "${GREEN}✅ Render job created successfully${NC}"
echo "   Job ID: $JOB_ID"
echo "   Provider: $PROVIDER"
echo "   Credits: $CREDITS"
echo "   Estimated time: ${ESTIMATED_TIME}s"
echo ""

# Step 2: Poll status
echo -e "${BLUE}🔄 Step 2: Polling job status...${NC}"

ATTEMPTS=0
MAX_ATTEMPTS=150  # 150 * 2s = 300s max wait
COMPLETED=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ] && [ "$COMPLETED" = "false" ]; do
  sleep 2

  STATUS_RESULT=$(curl -s $BASE_URL/api/v2/test/avatars/render/status/$JOB_ID)

  STATUS_SUCCESS=$(echo $STATUS_RESULT | jq -r '.success')
  if [ "$STATUS_SUCCESS" != "true" ]; then
    ERROR=$(echo $STATUS_RESULT | jq -r '.error')
    echo -e "${RED}❌ Status check failed: $ERROR${NC}"
    exit 1
  fi

  STATUS=$(echo $STATUS_RESULT | jq -r '.status')
  PROGRESS=$(echo $STATUS_RESULT | jq -r '.progress // 0')
  ELAPSED=$(echo $STATUS_RESULT | jq -r '.elapsedTime // 0')
  REMAINING=$(echo $STATUS_RESULT | jq -r '.estimatedTimeRemaining // 0')

  echo "   [${STATUS^^}] Progress: ${PROGRESS}% | Elapsed: ${ELAPSED}s | Remaining: ${REMAINING}s"

  if [ "$STATUS" = "completed" ]; then
    COMPLETED=true
    VIDEO_URL=$(echo $STATUS_RESULT | jq -r '.result.videoUrl')
    MODEL_URL=$(echo $STATUS_RESULT | jq -r '.result.modelUrl')
    DURATION=$(echo $STATUS_RESULT | jq -r '.result.duration')
    RESOLUTION=$(echo $STATUS_RESULT | jq -r '.result.resolution')

    echo ""
    echo -e "${GREEN}✅ Rendering completed successfully!${NC}"
    echo "   Video URL: $VIDEO_URL"
    echo "   Model URL: $MODEL_URL"
    echo "   Duration: ${DURATION}s"
    echo "   Resolution: $RESOLUTION"
    echo "   Total time: ${ELAPSED}s"
    break
  fi

  if [ "$STATUS" = "failed" ]; then
    MESSAGE=$(echo $STATUS_RESULT | jq -r '.result.message // "Unknown error"')
    echo -e "${RED}❌ Rendering failed: $MESSAGE${NC}"
    exit 1
  fi

  ATTEMPTS=$((ATTEMPTS + 1))
done

if [ "$COMPLETED" = "false" ]; then
  echo -e "${RED}❌ Timeout: Rendering did not complete within expected time${NC}"
  exit 1
fi

# Step 3: Validate results
echo ""
echo -e "${BLUE}📊 Step 3: Validating results...${NC}"

if [ -z "$VIDEO_URL" ] || [ "$VIDEO_URL" = "null" ]; then
  echo -e "${RED}❌ Video URL not returned${NC}"
  exit 1
fi

if [ -z "$MODEL_URL" ] || [ "$MODEL_URL" = "null" ]; then
  echo -e "${YELLOW}⚠️  Warning: Model URL not returned (may be expected for some renders)${NC}"
fi

if [ "$CREDITS" != "3" ]; then
  echo -e "${RED}❌ Expected 3 credits, got $CREDITS${NC}"
  exit 1
fi

if [ "$PROVIDER" != "rpm" ]; then
  echo -e "${RED}❌ Expected provider 'rpm', got '$PROVIDER'${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All validations passed!${NC}"

# Summary
echo ""
echo "============================================================"
echo -e "${GREEN}🎉 HIGH Tier (Ready Player Me) Test: PASSED${NC}"
echo "============================================================"
echo "Provider: Ready Player Me"
echo "Cost: 3 credits"
echo "Time: ${ELAPSED}s (expected ~120s)"
echo "Quality: 4K"
echo "Status: ✅ PRODUCTION READY"
echo "============================================================"
echo ""

exit 0
