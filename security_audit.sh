#!/bin/bash
# =============================================================
# Hair By Amnesia — Security Audit Script
# Run from project root: bash security_audit.sh
# =============================================================

# Always run from the directory this script lives in
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

# ANSI colours (work in Git Bash / MINGW / Linux / macOS)
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

section() { printf "\n${BOLD}${CYAN}===== %s =====${RESET}\n" "$1"; }
sub()     { printf "\n${BOLD}--- %s ---${RESET}\n" "$1"; }
pass()    { printf "${GREEN}[PASS]${RESET} %s\n" "$1"; }
warn()    { printf "${YELLOW}[WARN]${RESET} %s\n" "$1"; }
fail()    { printf "${RED}[FAIL]${RESET} %s\n" "$1"; }
info()    { printf "       %s\n" "$1"; }

section "HAIR BY AMNESIA — SECURITY AUDIT"
printf "Run:  %s\n" "$(date)"
printf "Root: %s\n" "$ROOT"

# -------------------------------------------------------------
sub "1. NPM VULNERABILITY SCAN (SERVER)"
(cd server && npm audit --audit-level=low 2>&1 | tail -20) || warn "npm audit returned non-zero exit"

# -------------------------------------------------------------
sub "2. NPM VULNERABILITY SCAN (CLIENT)"
(cd client && npm audit --audit-level=low 2>&1 | tail -40) || warn "npm audit returned non-zero exit"

# -------------------------------------------------------------
sub "3. HARDCODED SECRETS (server source)"
HITS=$(grep -rEn --include="*.js" \
  --exclude-dir=node_modules \
  -e 'sk_live_[A-Za-z0-9]+' \
  -e 're_[A-Za-z0-9]{20,}' \
  -e 'eyJhbGciOi[A-Za-z0-9_-]+\.' \
  -e 'SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*["'\''][^"'\'']+["'\'']' \
  server/ 2>/dev/null)
if [ -z "$HITS" ]; then
  pass "No hardcoded secrets found in server/*.js"
else
  fail "Potential hardcoded secrets:"
  echo "$HITS"
fi

# -------------------------------------------------------------
sub "4. .ENV FILE IN GIT HISTORY"
if git log --all --full-history --pretty=format: --name-only 2>/dev/null | grep -qE "(^|/)\.env($|\.)"; then
  fail ".env file has been committed to git history"
  git log --all --full-history --oneline -- '**/.env' '.env' 2>/dev/null | head -5
else
  pass "No .env file found in git history"
fi

# -------------------------------------------------------------
sub "5. .ENV FILES IN .GITIGNORE"
if grep -qE "^\.env" .gitignore 2>/dev/null; then
  pass ".env is listed in .gitignore"
else
  fail ".env is NOT in .gitignore — secrets could leak on next commit"
fi

# -------------------------------------------------------------
sub "6. CONSOLE.LOGS IN SERVER"
COUNT=$(grep -rEn --include="*.js" --exclude-dir=node_modules 'console\.(log|debug)' server/ 2>/dev/null | wc -l)
if [ "$COUNT" -eq 0 ]; then
  pass "No console.log / console.debug calls in server"
else
  warn "$COUNT console.log/debug calls in server (may leak info in production logs)"
  grep -rEn --include="*.js" --exclude-dir=node_modules 'console\.(log|debug)' server/ 2>/dev/null | head -5
fi

# -------------------------------------------------------------
sub "7. CONSOLE.LOGS IN CLIENT"
COUNT=$(grep -rEn --include="*.jsx" --include="*.js" --exclude-dir=node_modules 'console\.(log|debug)' client/src/ 2>/dev/null | wc -l)
if [ "$COUNT" -eq 0 ]; then
  pass "No console.log / console.debug calls in client"
else
  warn "$COUNT console.log/debug calls in client"
  grep -rEn --include="*.jsx" --include="*.js" --exclude-dir=node_modules 'console\.(log|debug)' client/src/ 2>/dev/null | head -5
fi

# -------------------------------------------------------------
sub "8. ROUTES — AUTH COVERAGE"
printf "Routes found in server/routes/:\n"
for f in server/routes/*.js; do
  name=$(basename "$f")
  total=$(grep -cE "router\.(get|post|put|delete|patch)\(" "$f")
  protected=$(grep -cE "router\.(get|post|put|delete|patch)\([^;]*verifyToken" "$f")
  printf "  %-25s %d total / %d protected\n" "$name" "$total" "$protected"
done

# -------------------------------------------------------------
sub "9. CORS CONFIGURATION"
if grep -qE "origin:[[:space:]]*process\.env\.ALLOWED_ORIGIN" server/index.js 2>/dev/null; then
  pass "CORS uses ALLOWED_ORIGIN env var (not wildcard)"
elif grep -qE "origin:[[:space:]]*['\"]\*['\"]" server/index.js 2>/dev/null; then
  fail "CORS configured with wildcard — any origin allowed"
else
  info "CORS config:"
  grep -nE "cors\(" server/index.js 2>/dev/null
fi

# -------------------------------------------------------------
sub "10. RATE LIMITING"
if grep -q "rateLimiter\|express-rate-limit" server/index.js 2>/dev/null; then
  pass "Rate limiter enabled in server/index.js"
  grep -nE "Limiter|rateLimit" server/index.js 2>/dev/null | head -5
else
  fail "No rate limiter found in server/index.js"
fi

# -------------------------------------------------------------
sub "11. HELMET SECURITY HEADERS"
if grep -q "helmet()" server/index.js 2>/dev/null; then
  pass "Helmet middleware is enabled"
else
  fail "Helmet not found in server/index.js"
fi

# -------------------------------------------------------------
sub "12. SUPABASE SERVICE ROLE KEY ON CLIENT"
HITS=$(grep -rEn --include="*.js" --include="*.jsx" --exclude-dir=node_modules 'SERVICE_ROLE' client/ 2>/dev/null)
if [ -z "$HITS" ]; then
  pass "Service role key is NOT referenced in client code"
else
  fail "Service role key referenced in client (full admin DB access would be exposed):"
  echo "$HITS"
fi

# -------------------------------------------------------------
sub "13. RAW SQL / INJECTION RISK"
HITS=$(grep -rEn --include="*.js" --exclude-dir=node_modules -e 'supabase\.rpc\(' -e '\.query\(' server/daos/ 2>/dev/null)
if [ -z "$HITS" ]; then
  pass "All DAO queries use Supabase query builder (parameterised by design)"
else
  warn "Raw RPC/query calls found — verify they are parameterised:"
  echo "$HITS"
fi

# -------------------------------------------------------------
sub "14. JWT VALIDATION MIDDLEWARE"
if [ -f server/middleware/auth.js ]; then
  if grep -q "getUser\|verifyToken" server/middleware/auth.js; then
    pass "JWT verification middleware present (server/middleware/auth.js)"
  else
    fail "auth.js exists but no token verification logic found"
  fi
else
  fail "server/middleware/auth.js not found"
fi

# -------------------------------------------------------------
sub "15. SENSITIVE DATA IN ERROR RESPONSES"
HITS=$(grep -rEn --include="*.js" --exclude-dir=node_modules \
  -e 'res\.status\([0-9]+\)\.json\([^)]*err\.stack' \
  -e 'res\.json\([^)]*password' \
  server/ 2>/dev/null)
if [ -z "$HITS" ]; then
  pass "No obvious stack traces or passwords returned in error responses"
else
  fail "Potential sensitive data in responses:"
  echo "$HITS"
fi

# -------------------------------------------------------------
sub "16. TRUST PROXY / HTTPS SUPPORT"
if grep -q "trust proxy" server/index.js 2>/dev/null; then
  pass "Express trust proxy enabled (required for HTTPS behind Render/Vercel)"
else
  warn "trust proxy not set — may break HTTPS detection behind load balancer"
fi

# -------------------------------------------------------------
sub "17. ROLE-BASED ACCESS CONTROL"
if [ -f server/middleware/requireRole.js ]; then
  pass "requireRole middleware exists"
  COUNT=$(grep -rEn --include="*.js" --exclude-dir=node_modules 'requireRole' server/routes/ 2>/dev/null | wc -l)
  info "Used in $COUNT route definitions"
else
  fail "requireRole middleware not found"
fi

# -------------------------------------------------------------
sub "18. FILE UPLOAD RISKS"
if grep -rqE --include="*.js" --exclude-dir=node_modules 'multer|busboy|formidable' server/ 2>/dev/null; then
  warn "File upload middleware detected — verify size, MIME, and path checks"
  grep -rEn --include="*.js" --exclude-dir=node_modules 'multer|busboy|formidable' server/ 2>/dev/null | head -5
else
  pass "No file upload middleware — no file upload attack surface"
fi

# -------------------------------------------------------------
sub "19. PASSWORD STORAGE"
if grep -rqE --include="*.js" --exclude-dir=node_modules 'bcrypt|argon2' server/ 2>/dev/null; then
  pass "Local password hashing library found"
else
  info "No bcrypt/argon2 — authentication delegated to Supabase Auth"
  info "Passwords are hashed and stored by Supabase, never touch the application server"
fi

# -------------------------------------------------------------
sub "20. DEPENDENCY COUNT"
if command -v node >/dev/null 2>&1; then
  SERVER_DEPS=$(node -p "Object.keys(require('./server/package.json').dependencies||{}).length" 2>/dev/null)
  CLIENT_DEPS=$(node -p "Object.keys(require('./client/package.json').dependencies||{}).length" 2>/dev/null)
  SERVER_DEV=$(node -p "Object.keys(require('./server/package.json').devDependencies||{}).length" 2>/dev/null)
  CLIENT_DEV=$(node -p "Object.keys(require('./client/package.json').devDependencies||{}).length" 2>/dev/null)
  info "Server: ${SERVER_DEPS:-?} runtime + ${SERVER_DEV:-?} dev"
  info "Client: ${CLIENT_DEPS:-?} runtime + ${CLIENT_DEV:-?} dev"
else
  warn "node not available — skipping dependency count"
fi

# -------------------------------------------------------------
section "AUDIT COMPLETE"
printf "Generated: %s\n\n" "$(date)"
