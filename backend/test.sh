#!/bin/bash

# webhook-test.sh
# Quick script to test the disaster webhook system

echo "🧪 Disaster Webhook Test Script"
echo "================================"
echo ""

# Configuration
SERVER_URL="http://172.28.240.1:5000"
WEBHOOK_SECRET="Dfhs792&hsm__383usnINks"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if server is running
echo "Test 1: Server Health Check"
echo "----------------------------"
if curl -s "$SERVER_URL"/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running at $SERVER_URL${NC}"
else
    echo -e "${RED}❌ Server is not running. Start with: npm run dev${NC}"
    exit 1
fi
echo ""

# Test 2: Test webhook endpoint (without auth)
echo "Test 2: Webhook Endpoint (No Auth)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/api/disaster-check")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✅ Endpoint requires authentication (as expected)${NC}"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${RED}❌ Endpoint not found - check your server routes${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️  Unexpected response: HTTP $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Test webhook endpoint (with auth)
echo "Test 3: Webhook Endpoint (With Auth)"
echo "-------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/api/disaster-check" \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Webhook triggered successfully${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}❌ Webhook failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 4: Manual trigger instructions
echo "Test 4: Manual Verification Steps"
echo "----------------------------------"
echo -e "${YELLOW}Check your server logs for:${NC}"
echo "  1. 'Starting disaster check for all users...'"
echo "  2. 'Checking disasters for X users'"
echo "  3. SMS/Email sending attempts"
echo ""
echo -e "${YELLOW}Check your database:${NC}"
echo "  Run: SELECT COUNT(*) FROM user_contacts WHERE alert_enabled = true AND latitude IS NOT NULL;"
echo ""
echo -e "${YELLOW}Check your phone/email:${NC}"
echo "  If disasters found, you should receive alerts"
echo ""

# Summary
echo "================================"
echo -e "${GREEN}🎉 Automated tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check server logs for disaster check execution"
echo "  2. Verify database has users with locations"
echo "  3. Set up external cron service (see WEBHOOK_TESTING_GUIDE.md)"
echo ""
echo "For detailed testing instructions, see WEBHOOK_TESTING_GUIDE.md"