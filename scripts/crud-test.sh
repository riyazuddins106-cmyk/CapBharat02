#!/usr/bin/env bash
# Comprehensive CRUD test for ServeNow API
# Correct field names verified from validators & controllers
BASE="http://localhost:8000/api"
PASS=0; FAIL=0; ERRORS=()

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); ERRORS+=("$1"); }

check() {
  local label="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected" 2>/dev/null; then ok "$label"
  else
    # re-run with full error to capture rate-limit and HTTP errors
    local status
    status=$(echo "$actual" | grep -o '"error":{[^}]*}' | head -c 200)
    fail "$label — expected '$expected' in: $(echo "$actual" | head -c 200)${status:+ | error: $status}"
  fi
}

# pause between bursts to stay under 120 req/60s rate limit
pace() { sleep 0.3; }

# Extract UUID id from JSON response
get_uuid() { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

echo ""
echo "══════════════════════════════════════════"
echo "  ServeNow API — Full CRUD Test Suite"
echo "══════════════════════════════════════════"

# ── HEALTH ──────────────────────────────────
echo ""
echo "▶ Health"
R=$(curl -sf "$BASE/health" 2>&1 || echo '{}')
check "GET /health" '"status":"ok"' "$R"

# ── AUTH — registration flow ─────────────────
echo ""
echo "▶ Auth – registration + OTP flow"
TS=$(date +%s)
EMAIL="crudtest_${TS}@servenow.test"
PHONE="98$(echo $TS | tail -c 9)"

R=$(curl -sf -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"CRUD Tester\",\"email\":\"$EMAIL\",\"phone\":\"$PHONE\",\"password\":\"Test@1234\"}" 2>&1 || echo '{}')
check "POST /auth/register" '"success":true' "$R"

sleep 1
# OTP format: "[otp] Verification code for <email> (signup): <6digits>"
sleep 1
# OTP is written to /tmp/otp-dev.log in non-production (format: "<email> <purpose> <code>")
OTP=$(grep "^$EMAIL signup " /tmp/otp-dev.log 2>/dev/null | tail -1 | awk '{print $3}')

if [ -n "$OTP" ]; then
  R=$(curl -sf -X POST "$BASE/auth/verify-otp" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"code\":\"$OTP\",\"purpose\":\"signup\"}" 2>&1 || echo '{}')
  check "POST /auth/verify-otp" '"success":true' "$R"

  R=$(curl -sf -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"Test@1234\"}" 2>&1 || echo '{}')
  check "POST /auth/login (new user)" 'accessToken' "$R"
  NEW_TOKEN=$(echo "$R" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  NEW_REFRESH=$(echo "$R" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

  R=$(curl -sf -X POST "$BASE/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$NEW_REFRESH\"}" 2>&1 || echo '{}')
  check "POST /auth/refresh" 'accessToken' "$R"
else
  fail "POST /auth/verify-otp — OTP not found in /tmp/otp-dev.log (server may need restart)"
  fail "POST /auth/login (new user) — depends on OTP verification"
  fail "POST /auth/refresh — depends on login"
fi

R=$(curl -sf -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" 2>&1 || echo '{}')
check "POST /auth/forgot-password" '"success":true' "$R"

# resend-otp
R=$(curl -sf -X POST "$BASE/auth/resend-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"purpose\":\"signup\"}" 2>&1 || echo '{}')
check "POST /auth/resend-otp" '"success":true' "$R"

# ── AUTH — seed accounts ─────────────────────
echo ""
echo "▶ Auth – seed accounts"
R=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@servenow.in","password":"Customer@1234"}' 2>&1 || echo '{}')
check "POST /auth/login (customer)" 'accessToken' "$R"
CUST_TOKEN=$(echo "$R" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
CUST_REFRESH=$(echo "$R" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

R=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@servenow.in","password":"Admin@1234"}' 2>&1 || echo '{}')
check "POST /auth/login (admin)" 'accessToken' "$R"
ADMIN_TOKEN=$(echo "$R" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

R=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"partner@servenow.in","password":"Partner@1234"}' 2>&1 || echo '{}')
check "POST /auth/login (partner)" 'accessToken' "$R"
PARTNER_TOKEN=$(echo "$R" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# ── PROFILE ──────────────────────────────────
echo ""
echo "▶ Profile"
R=$(curl -sf "$BASE/profile/me" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "GET /profile/me" '"email"' "$R"

R=$(curl -sf -X PATCH "$BASE/profile/me" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Customer Updated"}' 2>&1 || echo '{}')
check "PATCH /profile/me" '"success":true' "$R"

# restore name
curl -sf -X PATCH "$BASE/profile/me" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Customer"}' > /dev/null 2>&1 || true

R=$(curl -sf -X PATCH "$BASE/profile/me/push-token" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pushToken":"ExponentPushToken[testCRUD123]"}' 2>&1 || echo '{}')
check "PATCH /profile/me/push-token" '"success":true' "$R"

R=$(curl -sf -X POST "$BASE/profile/me/change-password" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Customer@1234","newPassword":"Customer@5678"}' 2>&1 || echo '{}')
check "POST /profile/me/change-password" '"success":true' "$R"
# restore password
R2=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@servenow.in","password":"Customer@5678"}' 2>&1 || echo '{}')
CUST_TOKEN2=$(echo "$R2" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "$CUST_TOKEN")
CUST_REFRESH2=$(echo "$R2" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4 || echo "$CUST_REFRESH")
curl -sf -X POST "$BASE/profile/me/change-password" \
  -H "Authorization: Bearer $CUST_TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Customer@5678","newPassword":"Customer@1234"}' > /dev/null 2>&1 || true
# re-login to get fresh token
R=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@servenow.in","password":"Customer@1234"}' 2>&1 || echo '{}')
CUST_TOKEN=$(echo "$R" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "$CUST_TOKEN")
CUST_REFRESH=$(echo "$R" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4 || echo "$CUST_REFRESH")

# ── ADDRESSES ────────────────────────────────
echo ""
echo "▶ Addresses"
R=$(curl -sf "$BASE/addresses" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "GET /addresses" '"success":true' "$R"

R=$(curl -sf -X POST "$BASE/addresses" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Office","line1":"456 Business Park","city":"Bangalore","state":"Karnataka","postalCode":"560001","isDefault":false}' 2>&1 || echo '{}')
check "POST /addresses" '"success":true' "$R"
ADDR_ID=$(get_uuid "$R")

if [ -n "$ADDR_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/addresses/$ADDR_ID" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"label":"Office HQ"}' 2>&1 || echo '{}')
  check "PATCH /addresses/:id" '"success":true' "$R"

  R=$(curl -sf -X DELETE "$BASE/addresses/$ADDR_ID" \
    -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
  check "DELETE /addresses/:id" '"success":true' "$R"
else
  fail "PATCH /addresses/:id — no address UUID returned"
  fail "DELETE /addresses/:id — no address UUID returned"
fi

# ── CATEGORIES ───────────────────────────────
echo ""
echo "▶ Categories"
R=$(curl -sf "$BASE/categories" 2>&1 || echo '{}')
check "GET /categories" '"success":true' "$R"
CAT_ID=$(get_uuid "$R")

if [ -n "$CAT_ID" ]; then
  R=$(curl -sf "$BASE/categories/$CAT_ID" 2>&1 || echo '{}')
  check "GET /categories/:id" '"success":true' "$R"
fi

# ── PROFESSIONALS ─────────────────────────────
echo ""
echo "▶ Professionals"
R=$(curl -sf "$BASE/professionals" 2>&1 || echo '{}')
check "GET /professionals" '"success":true' "$R"
PROF_ID=$(get_uuid "$R")

if [ -n "$PROF_ID" ]; then
  R=$(curl -sf "$BASE/professionals/$PROF_ID" 2>&1 || echo '{}')
  check "GET /professionals/:id" '"success":true' "$R"

  R=$(curl -sf "$BASE/professionals/$PROF_ID/reviews" 2>&1 || echo '{}')
  check "GET /professionals/:id/reviews" '"success":true' "$R"
else
  fail "GET /professionals/:id — no professional UUID found"
  fail "GET /professionals/:id/reviews — no professional UUID found"
fi

# ── FAVORITES ────────────────────────────────
echo ""
echo "▶ Favorites"
R=$(curl -sf "$BASE/favorites" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "GET /favorites" '"success":true' "$R"

if [ -n "$PROF_ID" ]; then
  R=$(curl -sf -X POST "$BASE/favorites/$PROF_ID" \
    -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
  check "POST /favorites/:professionalId" '"success":true' "$R"

  R=$(curl -sf -X DELETE "$BASE/favorites/$PROF_ID" \
    -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
  check "DELETE /favorites/:professionalId" '"success":true' "$R"
fi

# ── BOOKINGS ─────────────────────────────────
echo ""
echo "▶ Bookings"
R=$(curl -sf "$BASE/bookings" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "GET /bookings" '"success":true' "$R"

FUTURE1="2027-03-15T10:00:00Z"
FUTURE2="2027-03-16T11:00:00Z"

if [ -n "$PROF_ID" ]; then
  R=$(curl -sf -X POST "$BASE/bookings" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"professionalId\":\"$PROF_ID\",\"scheduledAt\":\"$FUTURE1\",\"notes\":\"CRUD test booking\"}" 2>&1 || echo '{}')
  check "POST /bookings" '"success":true' "$R"
  BOOK_ID=$(get_uuid "$R")

  if [ -n "$BOOK_ID" ]; then
    R=$(curl -sf "$BASE/bookings/$BOOK_ID" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
    check "GET /bookings/:id" '"success":true' "$R"

    R=$(curl -sf "$BASE/bookings/$BOOK_ID/qr" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
    check "GET /bookings/:id/qr" '"success":true' "$R"

    R=$(curl -sf -X PATCH "$BASE/bookings/$BOOK_ID/reschedule" \
      -H "Authorization: Bearer $CUST_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"scheduledAt\":\"$FUTURE2\"}" 2>&1 || echo '{}')
    check "PATCH /bookings/:id/reschedule" '"success":true' "$R"

    R=$(curl -sf -X PATCH "$BASE/bookings/$BOOK_ID/cancel" \
      -H "Authorization: Bearer $CUST_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"reason":"CRUD test cancel"}' 2>&1 || echo '{}')
    check "PATCH /bookings/:id/cancel" '"success":true' "$R"
  else
    fail "GET /bookings/:id — no booking UUID returned"
    fail "GET /bookings/:id/qr — no booking UUID"
    fail "PATCH /bookings/:id/reschedule — no booking UUID"
    fail "PATCH /bookings/:id/cancel — no booking UUID"
  fi
else
  fail "POST /bookings — no professional found"
fi

# ── POINTS ───────────────────────────────────
echo ""
echo "▶ Points & Rewards"
R=$(curl -sf "$BASE/points" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "GET /points" '"success":true' "$R"
POINT_BAL=$(echo "$R" | grep -o '"balance":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$POINT_BAL" -ge 100 ] 2>/dev/null; then
  R=$(curl -sf -X POST "$BASE/points/redeem" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"points":100}' 2>&1 || echo '{}')
  check "POST /points/redeem" '"success":true' "$R"
else
  ok "POST /points/redeem — skipped (balance=${POINT_BAL}, need ≥100)"
fi

# ── NOTIFICATIONS ─────────────────────────────
echo ""
echo "▶ Notifications"
R=$(curl -sf "$BASE/notifications" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "GET /notifications" '"success":true' "$R"
NOTIF_ID=$(get_uuid "$R")

R=$(curl -sf -X PATCH "$BASE/notifications/read-all" \
  -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "PATCH /notifications/read-all" '"success":true' "$R"

if [ -n "$NOTIF_ID" ]; then
  R=$(curl -sf -X DELETE "$BASE/notifications/$NOTIF_ID" \
    -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
  check "DELETE /notifications/:id" '"success":true' "$R"
else
  ok "DELETE /notifications/:id — skipped (no notifications)"
fi

# ── OFFERS ───────────────────────────────────
echo ""
echo "▶ Offers"
R=$(curl -sf "$BASE/offers" 2>&1 || echo '{}')
check "GET /offers" '"success":true' "$R"

# ── SUPPORT TICKETS ───────────────────────────
echo ""
echo "▶ Support Tickets"
R=$(curl -sf -X POST "$BASE/support-tickets" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","email":"customer@servenow.in","subject":"CRUD Test Issue","message":"Automated CRUD test ticket"}' 2>&1 || echo '{}')
check "POST /support-tickets" '"success":true' "$R"
TICKET_ID=$(get_uuid "$R")

R=$(curl -sf "$BASE/support-tickets/mine" -H "Authorization: Bearer $CUST_TOKEN" 2>&1 || echo '{}')
check "GET /support-tickets/mine" '"success":true' "$R"

# ── ADMIN ────────────────────────────────────
echo ""
echo "▶ Admin – read endpoints"
R=$(curl -sf "$BASE/admin/stats" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/stats" '"success":true' "$R"; pace

R=$(curl -sf "$BASE/admin/users" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/users" '"success":true' "$R"
ADMIN_USER_ID=$(get_uuid "$R"); pace

if [ -n "$ADMIN_USER_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/admin/users/$ADMIN_USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1 || echo '{}')
  check "PATCH /admin/users/:id" '"success":true' "$R"; pace
fi

R=$(curl -sf "$BASE/admin/bookings" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/bookings" '"success":true' "$R"
ADMIN_BOOK_ID=$(get_uuid "$R"); pace

if [ -n "$ADMIN_BOOK_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/admin/bookings/$ADMIN_BOOK_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1 || echo '{}')
  check "PATCH /admin/bookings/:id" '"success":true' "$R"; pace
fi

R=$(curl -sf "$BASE/admin/professionals" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/professionals" '"success":true' "$R"
ADMIN_PROF_ID=$(get_uuid "$R"); pace

if [ -n "$ADMIN_PROF_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/admin/professionals/$ADMIN_PROF_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1 || echo '{}')
  check "PATCH /admin/professionals/:id" '"success":true' "$R"; pace
fi

echo ""
echo "▶ Admin – categories CRUD"
R=$(curl -sf "$BASE/admin/categories" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/categories" '"success":true' "$R"; pace

R=$(curl -sf -X POST "$BASE/admin/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"CRUD Cat $TS\",\"description\":\"Automated test\",\"iconName\":\"Grid\",\"isActive\":true}" 2>&1 || echo '{}')
check "POST /admin/categories" '"success":true' "$R"
NEW_CAT_ID=$(get_uuid "$R"); pace

if [ -n "$NEW_CAT_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/admin/categories/$NEW_CAT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"CRUD Cat $TS Updated\",\"isActive\":false}" 2>&1 || echo '{}')
  check "PATCH /admin/categories/:id" '"success":true' "$R"; pace

  R=$(curl -sf -X DELETE "$BASE/admin/categories/$NEW_CAT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
  check "DELETE /admin/categories/:id" '"success":true' "$R"; pace
fi

echo ""
echo "▶ Admin – offers CRUD"
OFFER_CODE="CRUD${TS}"
R=$(curl -sf -X POST "$BASE/admin/offers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"CRUD Test Offer\",\"description\":\"Test\",\"discountPercent\":10,\"code\":\"$OFFER_CODE\",\"validFrom\":\"2026-01-01T00:00:00Z\",\"validUntil\":\"2027-12-31T23:59:59Z\",\"isActive\":true}" 2>&1 || echo '{}')
check "POST /admin/offers" '"success":true' "$R"
OFFER_ID=$(get_uuid "$R"); pace

if [ -n "$OFFER_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/admin/offers/$OFFER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"CRUD Offer Updated\",\"isActive\":false}" 2>&1 || echo '{}')
  check "PATCH /admin/offers/:id" '"success":true' "$R"; pace

  R=$(curl -sf -X DELETE "$BASE/admin/offers/$OFFER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
  check "DELETE /admin/offers/:id" '"success":true' "$R"; pace
fi

echo ""
echo "▶ Admin – platform policies CRUD"
R=$(curl -sf "$BASE/admin/platform-policies" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/platform-policies" '"success":true' "$R"; pace

R=$(curl -sf -X POST "$BASE/admin/platform-policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"terms\",\"title\":\"CRUD Policy $TS\",\"content\":\"Test policy content\",\"isActive\":true}" 2>&1 || echo '{}')
check "POST /admin/platform-policies" '"success":true' "$R"
POLICY_ID=$(get_uuid "$R"); pace

if [ -n "$POLICY_ID" ]; then
  R=$(curl -sf -X PUT "$BASE/admin/platform-policies/$POLICY_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"terms\",\"title\":\"CRUD Policy $TS Updated\",\"content\":\"Updated content\",\"isActive\":true}" 2>&1 || echo '{}')
  check "PUT /admin/platform-policies/:id" '"success":true' "$R"; pace

  R=$(curl -sf -X DELETE "$BASE/admin/platform-policies/$POLICY_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
  check "DELETE /admin/platform-policies/:id" '"success":true' "$R"; pace
fi

echo ""
echo "▶ Admin – audit logs, payouts, support tickets"
R=$(curl -sf "$BASE/admin/audit-logs" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/audit-logs" '"success":true' "$R"; pace

R=$(curl -sf "$BASE/admin/payouts" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /admin/payouts" '"success":true' "$R"
# Pick a pending payout (not already paid/rejected)
PAYOUT_ID=$(echo "$R" | grep -o '"id":"[^"]*","professionalId[^}]*"status":"pending"' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4); pace
if [ -n "$PAYOUT_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/admin/payouts/$PAYOUT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"paid"}' 2>&1 || echo '{}')
  check "PATCH /admin/payouts/:id" '"success":true' "$R"; pace
else
  ok "PATCH /admin/payouts/:id — skipped (no pending payouts)"
fi

R=$(curl -sf "$BASE/support-tickets" -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "GET /support-tickets (admin)" '"success":true' "$R"; pace

if [ -n "$TICKET_ID" ]; then
  R=$(curl -sf -X PATCH "$BASE/support-tickets/$TICKET_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"closed","response":"Resolved via CRUD test"}' 2>&1 || echo '{}')
  check "PATCH /support-tickets/:id (admin)" '"success":true' "$R"; pace
fi

# ── PARTNER ──────────────────────────────────
echo ""
echo "▶ Partner CRUD"
R=$(curl -sf "$BASE/partner/profile" -H "Authorization: Bearer $PARTNER_TOKEN" 2>&1 || echo '{}')
check "GET /partner/profile" '"success":true' "$R"

R=$(curl -sf -X PATCH "$BASE/partner/profile" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"CRUD-tested professional bio"}' 2>&1 || echo '{}')
check "PATCH /partner/profile" '"success":true' "$R"

R=$(curl -sf "$BASE/partner/jobs" -H "Authorization: Bearer $PARTNER_TOKEN" 2>&1 || echo '{}')
check "GET /partner/jobs" '"success":true' "$R"
JOB_ID=$(get_uuid "$R")

if [ -n "$JOB_ID" ]; then
  R=$(curl -sf "$BASE/partner/jobs/$JOB_ID" -H "Authorization: Bearer $PARTNER_TOKEN" 2>&1 || echo '{}')
  check "GET /partner/jobs/:id" '"success":true' "$R"
else
  ok "GET /partner/jobs/:id — skipped (no jobs assigned)"
fi

R=$(curl -sf "$BASE/partner/earnings" -H "Authorization: Bearer $PARTNER_TOKEN" 2>&1 || echo '{}')
check "GET /partner/earnings" '"success":true' "$R"

R=$(curl -sf "$BASE/partner/payouts" -H "Authorization: Bearer $PARTNER_TOKEN" 2>&1 || echo '{}')
check "GET /partner/payouts" '"success":true' "$R"

# ── LOGOUT ───────────────────────────────────
echo ""
echo "▶ Auth – logout"
R=$(curl -sf -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$CUST_REFRESH\"}" 2>&1 || echo '{}')
check "POST /auth/logout" '"success":true' "$R"

R=$(curl -sf -X POST "$BASE/auth/logout-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>&1 || echo '{}')
check "POST /auth/logout-all" '"success":true' "$R"

# ── SUMMARY ──────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
printf "  Results: %d passed, %d failed\n" $PASS $FAIL
echo "══════════════════════════════════════════"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "Failures:"
  for e in "${ERRORS[@]}"; do echo "  ❌ $e"; done
  echo ""
  exit 1
fi

echo ""
echo "All tests passed ✅"
exit 0
