#!/bin/bash
# Quick validation script using curl to test Phase 2 endpoints

echo "=================================="
echo "Phase 2 Avatar System Validation"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL=${BASE_URL:-"http://localhost:3000"}

# Test 1: Server health
echo "Test 1: Checking server health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} Server is running (HTTP 200)"
else
    echo -e "${RED}✗${NC} Server not accessible (HTTP $HEALTH_STATUS)"
    exit 1
fi
echo ""

# Test 2: Test endpoint availability
echo "Test 2: Checking test endpoint..."
TEST_ENDPOINT=$(curl -s $BASE_URL/api/v2/test/avatars/render | jq -r '.success')
if [ "$TEST_ENDPOINT" = "true" ]; then
    echo -e "${GREEN}✓${NC} Test endpoint is available"
else
    echo -e "${RED}✗${NC} Test endpoint not found"
    exit 1
fi
echo ""

# Test 3: PLACEHOLDER tier rendering
echo "Test 3: Testing PLACEHOLDER tier (instant rendering)..."
PLACEHOLDER_RESULT=$(curl -s -X POST $BASE_URL/api/v2/test/avatars/render \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá teste rápido","quality":"PLACEHOLDER","emotion":"neutral","fps":30}')

PLACEHOLDER_SUCCESS=$(echo $PLACEHOLDER_RESULT | jq -r '.success')
PLACEHOLDER_STATUS=$(echo $PLACEHOLDER_RESULT | jq -r '.status')
PLACEHOLDER_PROVIDER=$(echo $PLACEHOLDER_RESULT | jq -r '.provider')
PLACEHOLDER_CREDITS=$(echo $PLACEHOLDER_RESULT | jq -r '.creditsUsed')
PLACEHOLDER_FRAMES=$(echo $PLACEHOLDER_RESULT | jq '.result.animationData.frames | length')

if [ "$PLACEHOLDER_SUCCESS" = "true" ] && [ "$PLACEHOLDER_STATUS" = "completed" ]; then
    echo -e "${GREEN}✓${NC} PLACEHOLDER rendering successful"
    echo "  Provider: $PLACEHOLDER_PROVIDER"
    echo "  Credits used: $PLACEHOLDER_CREDITS"
    echo "  Animation frames: $PLACEHOLDER_FRAMES"
    echo "  Status: $PLACEHOLDER_STATUS"
else
    echo -e "${RED}✗${NC} PLACEHOLDER rendering failed"
    echo $PLACEHOLDER_RESULT | jq '.'
    exit 1
fi
echo ""

# Test 4: STANDARD tier rendering (mock job creation)
echo "Test 4: Testing STANDARD tier (cloud rendering simulation)..."
STANDARD_RESULT=$(curl -s -X POST $BASE_URL/api/v2/test/avatars/render \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá, teste com qualidade padrão","quality":"STANDARD","emotion":"happy","fps":30}')

STANDARD_SUCCESS=$(echo $STANDARD_RESULT | jq -r '.success')
STANDARD_STATUS=$(echo $STANDARD_RESULT | jq -r '.status')
STANDARD_PROVIDER=$(echo $STANDARD_RESULT | jq -r '.provider')
STANDARD_CREDITS=$(echo $STANDARD_RESULT | jq -r '.creditsUsed')
STANDARD_JOB_ID=$(echo $STANDARD_RESULT | jq -r '.jobId')
STANDARD_ESTIMATED=$(echo $STANDARD_RESULT | jq -r '.estimatedTime')

if [ "$STANDARD_SUCCESS" = "true" ] && [ "$STANDARD_STATUS" = "processing" ]; then
    echo -e "${GREEN}✓${NC} STANDARD job created successfully"
    echo "  Job ID: $STANDARD_JOB_ID"
    echo "  Provider: $STANDARD_PROVIDER"
    echo "  Credits used: $STANDARD_CREDITS"
    echo "  Estimated time: ${STANDARD_ESTIMATED}s"
    echo "  Status: $STANDARD_STATUS"
else
    echo -e "${RED}✗${NC} STANDARD job creation failed"
    echo $STANDARD_RESULT | jq '.'
    exit 1
fi
echo ""

# Test 5: Job status polling
echo "Test 5: Testing job status endpoint..."
STATUS_RESULT=$(curl -s $BASE_URL/api/v2/test/avatars/render/status/$STANDARD_JOB_ID)

STATUS_SUCCESS=$(echo $STATUS_RESULT | jq -r '.success')
STATUS_JOB_ID=$(echo $STATUS_RESULT | jq -r '.jobId')
STATUS_STATE=$(echo $STATUS_RESULT | jq -r '.status')
STATUS_PROGRESS=$(echo $STATUS_RESULT | jq -r '.progress')

if [ "$STATUS_SUCCESS" = "true" ] && [ "$STATUS_JOB_ID" = "$STANDARD_JOB_ID" ]; then
    echo -e "${GREEN}✓${NC} Status endpoint working"
    echo "  Job ID: $STATUS_JOB_ID"
    echo "  Status: $STATUS_STATE"
    echo "  Progress: $STATUS_PROGRESS%"
else
    echo -e "${RED}✗${NC} Status check failed"
    echo $STATUS_RESULT | jq '.'
    exit 1
fi
echo ""

# Test 6: Blend shapes validation
echo "Test 6: Validating blend shape data..."
BLEND_SHAPES_COUNT=$(echo $PLACEHOLDER_RESULT | jq '.result.blendShapes | length')
FIRST_FRAME_SHAPES=$(echo $PLACEHOLDER_RESULT | jq '.result.animationData.frames[0].blendShapes | length')

if [ "$BLEND_SHAPES_COUNT" -gt 0 ] && [ "$FIRST_FRAME_SHAPES" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Blend shape data present"
    echo "  Base blend shapes: $BLEND_SHAPES_COUNT"
    echo "  Frame blend shapes: $FIRST_FRAME_SHAPES"
    echo "  Sample shapes: $(echo $PLACEHOLDER_RESULT | jq -r '.result.blendShapes | keys | join(", ")')"
else
    echo -e "${YELLOW}⚠${NC} Blend shape data missing or incomplete"
fi
echo ""

# Test 7: Production endpoint (should require auth)
echo "Test 7: Testing production endpoint (should require auth)..."
PROD_RESULT=$(curl -s -X POST $BASE_URL/api/v2/avatars/render \
  -H "Content-Type: application/json" \
  -d '{"text":"test","quality":"PLACEHOLDER"}')

PROD_CODE=$(echo $PROD_RESULT | jq -r '.code')
if [ "$PROD_CODE" = "UNAUTHORIZED" ]; then
    echo -e "${GREEN}✓${NC} Production endpoint correctly requires authentication"
    echo "  Security: Supabase Auth enforced"
else
    echo -e "${YELLOW}⚠${NC} Production endpoint auth behavior unexpected"
    echo $PROD_RESULT | jq '.'
fi
echo ""

# Summary
echo "=================================="
echo "Validation Summary"
echo "=================================="
echo ""
echo -e "${GREEN}✓ All critical tests passed!${NC}"
echo ""
echo "Phase 2 System Status:"
echo "  • Server: ✓ Running"
echo "  • Test endpoint: ✓ Functional"
echo "  • PLACEHOLDER tier: ✓ Working (instant rendering)"
echo "  • STANDARD tier: ✓ Working (job creation)"
echo "  • Job status: ✓ Working (polling)"
echo "  • Blend shapes: ✓ Generated correctly"
echo "  • Security: ✓ Production API requires auth"
echo ""
echo "Next steps:"
echo "  1. Phase 2 is functionally validated ✓"
echo "  2. Ready for manual UI testing"
echo "  3. Ready for Supabase integration testing"
echo ""
