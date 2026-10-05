#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# LaptopMitra Post-Deployment Smoke Test Script
# Usage: ./scripts/smoke-test.sh <API_URL> <WEB_URL> [EVIL_ORIGIN]
# Example: ./scripts/smoke-test.sh https://laptopmitra-api.onrender.com https://laptopmitra.vercel.app
# ==============================================================================

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <API_URL> <WEB_URL> [EVIL_ORIGIN]"
  echo "Example: $0 https://api.laptopmitra.com https://laptopmitra.com"
  exit 1
fi

API_URL="${1%/}"
WEB_URL="${2%/}"
EVIL_ORIGIN="${3:-https://evil-attacker.example.com}"
EVIL_ORIGIN="${EVIL_ORIGIN%/}"

FAILED=0

pass() {
  echo "  [PASS] $1"
}

fail() {
  echo "  [FAIL] $1: $2"
  FAILED=$((FAILED + 1))
}

echo "=========================================================="
echo "Starting LaptopMitra Smoke Tests"
echo "API URL:      ${API_URL}"
echo "Web URL:      ${WEB_URL}"
echo "Evil Origin:  ${EVIL_ORIGIN}"
echo "=========================================================="

# 1. /health is 200
echo -n "1. Checking API health endpoint (/health)... "
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" || echo "000")
if [[ "${HEALTH_CODE}" == "200" ]]; then
  pass "Status code is 200"
else
  fail "API /health" "Expected HTTP 200, got ${HEALTH_CODE}"
fi

# 2. GET /products is 200 JSON
echo -n "2. Checking GET /products returns 200 and JSON... "
PRODUCTS_TMP=$(mktemp)
PRODUCTS_CODE=$(curl -s -w "%{http_code}" -o "${PRODUCTS_TMP}" -H "Accept: application/json" "${API_URL}/products" || echo "000")
if [[ "${PRODUCTS_CODE}" == "200" ]]; then
  # Verify JSON format by checking first non-whitespace character is { or [
  FIRST_CHAR=$(tr -d '[:space:]' < "${PRODUCTS_TMP}" | head -c 1 || true)
  if [[ "${FIRST_CHAR}" == "{" || "${FIRST_CHAR}" == "[" ]]; then
    pass "Status code is 200 and body is valid JSON"
  else
    fail "GET /products" "Status is 200 but response is not JSON (starts with '${FIRST_CHAR}')"
  fi
else
  fail "GET /products" "Expected HTTP 200, got ${PRODUCTS_CODE}"
fi
rm -f "${PRODUCTS_TMP}"

# 3. Unauthenticated POST /products is 401
echo -n "3. Checking unauthenticated POST /products is rejected (401)... "
POST_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Unauthorized Product"}' || echo "000")
if [[ "${POST_CODE}" == "401" ]]; then
  pass "Unauthenticated product write blocked with HTTP 401"
else
  fail "POST /products auth check" "Expected HTTP 401, got ${POST_CODE}"
fi

# 4. Request with Origin=WEB_URL gets matching Access-Control-Allow-Origin
echo -n "4. Checking CORS allowed for WEB_URL (${WEB_URL})... "
CORS_ALLOW_HEADER=$(curl -sI -H "Origin: ${WEB_URL}" "${API_URL}/health" | grep -i "^access-control-allow-origin:" | tr -d '\r\n' | awk '{print $2}' || true)
if [[ "${CORS_ALLOW_HEADER}" == "${WEB_URL}" ]]; then
  pass "Access-Control-Allow-Origin matched ${WEB_URL}"
else
  fail "CORS allowed origin" "Expected Access-Control-Allow-Origin: ${WEB_URL}, got '${CORS_ALLOW_HEADER}'"
fi

# 5. Request with Origin=EVIL_ORIGIN does NOT get Access-Control-Allow-Origin
echo -n "5. Checking CORS rejected for EVIL_ORIGIN (${EVIL_ORIGIN})... "
EVIL_CORS_HEADER=$(curl -sI -H "Origin: ${EVIL_ORIGIN}" "${API_URL}/health" | grep -i "^access-control-allow-origin:" | tr -d '\r\n' || true)
if [[ -z "${EVIL_CORS_HEADER}" ]]; then
  pass "CORS properly denied for unauthorized origin (no Access-Control-Allow-Origin header)"
else
  fail "CORS evil origin check" "Unexpectedly received ${EVIL_CORS_HEADER}"
fi

# 6. /api is 404 (Swagger disabled in production)
echo -n "6. Checking Swagger docs (/api) return 404 in production... "
SWAGGER_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api" || echo "000")
if [[ "${SWAGGER_CODE}" == "404" ]]; then
  pass "/api returned HTTP 404 (Swagger disabled in production)"
else
  fail "Swagger production check" "Expected HTTP 404, got ${SWAGGER_CODE}"
fi

# 7. WEB_URL is 200
echo -n "7. Checking frontend deployment (${WEB_URL})... "
WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}" || echo "000")
if [[ "${WEB_CODE}" == "200" ]]; then
  pass "Web frontend returned HTTP 200"
else
  fail "Web frontend availability" "Expected HTTP 200, got ${WEB_CODE}"
fi

echo "=========================================================="
if [[ "${FAILED}" -eq 0 ]]; then
  echo "ALL SMOKE CHECKS PASSED (7/7)"
  echo "=========================================================="
  exit 0
else
  echo "SMOKE CHECKS FAILED: ${FAILED} check(s) failed"
  echo "=========================================================="
  exit 1
fi
