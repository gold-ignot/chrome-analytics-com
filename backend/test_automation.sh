#!/bin/bash

echo "Testing Chrome Extension Analytics Automation System"
echo "==================================================="

BASE_URL="http://localhost:8080/api/automation"

# Test automation status
echo -e "\n1. Testing automation status:"
curl -s "$BASE_URL/status" | jq '.'

# Test available categories
echo -e "\n2. Testing available categories:"
curl -s "$BASE_URL/categories" | jq '.'

# Test popular keywords
echo -e "\n3. Testing popular keywords:"
curl -s "$BASE_URL/keywords" | jq '.'

# Test queue stats
echo -e "\n4. Testing queue stats:"
curl -s "$BASE_URL/queue/stats" | jq '.'

# Test starting automation
echo -e "\n5. Testing start automation:"
curl -s -X POST "$BASE_URL/start" | jq '.'

# Test scheduling discovery job
echo -e "\n6. Testing schedule discovery job (category):"
curl -s -X POST "$BASE_URL/jobs/discovery" \
  -H "Content-Type: application/json" \
  -d '{"type": "category", "category": "productivity", "priority": "high"}' | jq '.'

# Test scheduling discovery job (search)
echo -e "\n7. Testing schedule discovery job (search):"
curl -s -X POST "$BASE_URL/jobs/discovery" \
  -H "Content-Type: application/json" \
  -d '{"type": "search", "keyword": "password manager", "priority": "medium"}' | jq '.'

# Test scheduling update job
echo -e "\n8. Testing schedule update job:"
curl -s -X POST "$BASE_URL/jobs/update/nmmhkkegccagdldgiimedpiccmgmieda?priority=high" | jq '.'

# Test bulk update
echo -e "\n9. Testing bulk update:"
curl -s -X POST "$BASE_URL/jobs/bulk-update" \
  -H "Content-Type: application/json" \
  -d '{"extension_ids": ["nmmhkkegccagdldgiimedpiccmgmieda", "cjpalhdlnbpafiamejdnhcphjbkeiagm"], "priority": "medium"}' | jq '.'

# Final status check
echo -e "\n10. Final automation status check:"
curl -s "$BASE_URL/status" | jq '.'

echo -e "\n==================================================="
echo "Automation system test completed!"