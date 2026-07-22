#!/usr/bin/env bash
# ==============================================================================
# MLJ NET GenieACS Platform - Diagnostic & Repair Script for Ubuntu 22.04
# ==============================================================================
# Usage:
#   chmod +x fix_all.sh
#   ./fix_all.sh              # Diagnose only (no changes)
#   ./fix_all.sh --fix        # Diagnose + auto-fix issues
#   ./fix_all.sh --fix --deep # Diagnose + deep fix (reinstall deps, rebuild)
# ==============================================================================

set -euo pipefail

# -----------------------------
# Color output helpers
# -----------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

FIX_MODE=false
DEEP_MODE=false
if [[ "${1:-}" == "--fix" ]]; then
  FIX_MODE=true
  if [[ "${2:-}" == "--deep" ]]; then
    DEEP_MODE=true
  fi
fi

PASS=0
WARN=0
FAIL=0
FIXED=0

pass() { ((PASS++)); echo -e "  ${GREEN}[PASS]${NC} $1"; }
warn() { ((WARN++)); echo -e "  ${YELLOW}[WARN]${NC} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}[FAIL]${NC} $1"; }
fixed() { ((FIXED++)); echo -e "  ${CYAN}[FIXED]${NC} $1"; }
section() { echo -e "\n${BLUE}==> $1${NC}"; }

# Resolve project directory (script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "========================================================================"
echo "  MLJ NET GenieACS Platform - Diagnostic & Repair Tool"
echo "  Project: $PROJECT_DIR"
echo "  Date:    $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "  Mode:    $([ "$FIX_MODE" = true ] && echo 'AUTO-FIX' || echo 'DIAGNOSE ONLY')"
echo "========================================================================"

# ==============================================================================
# 1. SYSTEM CHECKS
# ==============================================================================
section "1. System Information"

OS_ID=$(cat /etc/os-release 2>/dev/null | grep '^ID=' | cut -d= -f2 || echo "unknown")
OS_VERSION=$(cat /etc/os-release 2>/dev/null | grep '^VERSION_ID=' | cut -d= -f2 | tr -d '"' || echo "unknown")
KERNEL=$(uname -r)
ARCH=$(uname -m)
HOSTNAME=$(hostname)
UPTIME=$(uptime -p 2>/dev/null || uptime)

if [[ "$OS_ID" == "ubuntu" ]]; then
  pass "OS: Ubuntu $OS_VERSION ($ARCH)"
else
  warn "OS: $OS_ID $OS_VERSION (script optimized for Ubuntu 22.04)"
fi

echo "  Kernel:  $KERNEL"
echo "  Host:    $HOSTNAME"
echo "  Uptime:  $UPTIME"

# ==============================================================================
# 2. RESOURCE CHECKS
# ==============================================================================
section "2. System Resources"

# Memory
MEM_TOTAL=$(free -m 2>/dev/null | awk '/Mem:/ {print $2}')
MEM_USED=$(free -m 2>/dev/null | awk '/Mem:/ {print $3}')
MEM_AVAIL=$(free -m 2>/dev/null | awk '/Mem:/ {print $7}')
MEM_PCT=0
if [[ -n "$MEM_TOTAL" && "$MEM_TOTAL" -gt 0 ]]; then
  MEM_PCT=$((MEM_USED * 100 / MEM_TOTAL))
fi

echo "  Memory: ${MEM_AVAIL:-?}MB available / ${MEM_TOTAL:-?}MB total (${MEM_PCT}% used)"
if [[ "$MEM_AVAIL" -lt 100 ]]; then
  fail "Low memory: only ${MEM_AVAIL}MB available (recommended: 512MB+)"
  if $FIX_MODE; then
    echo "    Cannot auto-fix memory. Add RAM or increase swap."
  fi
else
  pass "Memory: ${MEM_AVAIL}MB available"
fi

# Disk
DISK_AVAIL=$(df -h "$PROJECT_DIR" 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'GMK' || echo "?")
DISK_PCT=$(df "$PROJECT_DIR" 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%' || echo "?")
echo "  Disk:   ${DISK_AVAIL} available at $PROJECT_DIR (${DISK_PCT}% used)"
if [[ "$DISK_PCT" -gt 90 ]]; then
  fail "Disk almost full: ${DISK_PCT}% used"
else
  pass "Disk space OK"
fi

# CPU
CPU_CORES=$(nproc 2>/dev/null || echo "?")
CPU_LOAD=$(cat /proc/loadavg 2>/dev/null | awk '{print $1, $2, $3}' || echo "?")
echo "  CPU:     $CPU_CORES cores, load: $CPU_LOAD"
pass "CPU: $CPU_CORES cores"

# Swap
SWAP_TOTAL=$(free -m 2>/dev/null | awk '/Swap:/ {print $2}')
if [[ "$SWAP_TOTAL" -eq 0 ]]; then
  warn "No swap configured. Recommended for production."
  if $FIX_MODE; then
    SWAPFILE="/swapfile"
    if [[ ! -f "$SWAPFILE" ]]; then
      fallocate -l 1G "$SWAPFILE" 2>/dev/null && \
      chmod 600 "$SWAPFILE" && \
      mkswap "$SWAPFILE" >/dev/null 2>&1 && \
      swapon "$SWAPFILE" 2>/dev/null && \
      fixed "Created and enabled 1GB swap file"
    fi
  fi
else
  pass "Swap: ${SWAP_TOTAL}MB configured"
fi

# ==============================================================================
# 3. NODE.JS & BUN CHECKS
# ==============================================================================
section "3. Node.js & Bun Runtime"

# Check Node.js
NODE_VER=""
if command -v node &>/dev/null; then
  NODE_VER=$(node -v 2>/dev/null || echo "?")
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
  echo "  Node.js: $NODE_VER (major: $NODE_MAJOR)"
  if [[ "$NODE_MAJOR" -ge 20 ]]; then
    pass "Node.js version OK (>= 20)"
  else
    fail "Node.js version too old: $NODE_VER (need >= 20)"
    if $DEEP_MODE; then
      echo "    Installing Node.js 22.x via NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null && \
      sudo apt-get install -y nodejs 2>/dev/null && \
      fixed "Node.js upgraded to $(node -v)"
    fi
  fi
else
  fail "Node.js not installed"
  if $DEEP_MODE; then
    echo "    Installing Node.js 22.x via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null && \
    sudo apt-get install -y nodejs 2>/dev/null && \
    fixed "Node.js $(node -v) installed"
  fi
fi

# Check Bun
BUN_VER=""
if command -v bun &>/dev/null; then
  BUN_VER=$(bun --version 2>/dev/null || echo "?")
  echo "  Bun:     $BUN_VER"
  pass "Bun installed: $BUN_VER"
else
  warn "Bun not installed (optional - npm/yarn will be used)"
  if $FIX_MODE; then
    echo "    Installing Bun..."
    curl -fsSL https://bun.sh/install | bash 2>/dev/null && \
    export PATH="$HOME/.bun/bin:$PATH" && \
    fixed "Bun installed: $(bun --version 2>/dev/null)"
  fi
fi

# Check npm
NPM_VER=""
if command -v npm &>/dev/null; then
  NPM_VER=$(npm -v 2>/dev/null || echo "?")
  echo "  npm:     $NPM_VER"
  pass "npm available: $NPM_VER"
else
  warn "npm not found"
fi

# ==============================================================================
# 4. PM2 CHECKS
# ==============================================================================
section "4. PM2 Process Manager"

PM2_OK=false
if command -v pm2 &>/dev/null; then
  PM2_VER=$(pm2 -v 2>/dev/null || echo "?")
  echo "  PM2:     $PM2_VER"
  PM2_OK=true
else
  warn "PM2 not installed"
  if $FIX_MODE; then
    echo "    Installing PM2 globally..."
    npm install -g pm2 2>/dev/null && fixed "PM2 installed: $(pm2 -v 2>/dev/null)"
    PM2_OK=true
  fi
fi

if $PM2_OK; then
  # Check if app is registered
  PM2_APP=$(pm2 list 2>/dev/null | grep -i "mlj\|genieacs\|next" || true)
  if [[ -n "$PM2_APP" ]]; then
    pass "PM2 app registered"
    echo "  $PM2_APP"
  else
    warn "No app found in PM2. Run: pm2 start ecosystem.config.cjs"
  fi

  # Check PM2 startup
  PM2_STARTUP=$(pm2 startup 2>&1 | grep -i "already" || true)
  if [[ -n "$PM2_STARTUP" ]]; then
    pass "PM2 startup configured"
  else
    warn "PM2 startup not configured. Run: pm2 startup && pm2 save"
  fi
fi

# ==============================================================================
# 5. PROJECT FILES CHECKS
# ==============================================================================
section "5. Project Structure"

REQUIRED_FILES=(
  "package.json"
  "next.config.ts"
  "tsconfig.json"
  ".env"
  "prisma/schema.prisma"
  "src/lib/db.ts"
  "src/lib/auth.ts"
  "src/app/page.tsx"
  "src/app/layout.tsx"
  "src/app/api/auth/route.ts"
  "src/app/api/devices/route.ts"
  "src/app/api/settings/route.ts"
  "src/app/api/users/route.ts"
  "src/app/api/system/route.ts"
  "src/app/api/mikrotik/route.ts"
  "src/app/api/hotspot/route.ts"
  "src/app/api/pppoe/route.ts"
)

MISSING_FILES=()
for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$PROJECT_DIR/$f" ]]; then
    pass "File exists: $f"
  else
    MISSING_FILES+=("$f")
    fail "Missing file: $f"
  fi
done

# Check .env from .env.example
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  warn "No .env file found"
  if [[ -f "$PROJECT_DIR/.env.example" ]] && $FIX_MODE; then
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    # Generate random secrets
    JWT_SEC=$(openssl rand -base64 32 2>/dev/null || echo "default-jwt-secret-$(date +%s)")
    SESSION_SEC=$(openssl rand -base64 32 2>/dev/null || echo "default-session-secret-$(date +%s)")
    sed -i "s|change-me-generate-with-openssl-rand-base64-32|$JWT_SEC|" "$PROJECT_DIR/.env"
    sed -i "0,/change-me-generate-with-openssl-rand-base64-32/s//$SESSION_SEC/" "$PROJECT_DIR/.env"
    fixed ".env created from .env.example with generated secrets"
  fi
fi

# Check node_modules
if [[ -d "$PROJECT_DIR/node_modules" ]]; then
  MODULE_COUNT=$(find "$PROJECT_DIR/node_modules" -maxdepth 1 -type d 2>/dev/null | wc -l)
  pass "node_modules exists ($MODULE_COUNT packages)"
else
  fail "node_modules missing - run npm install or bun install"
  if $FIX_MODE || $DEEP_MODE; then
    echo "    Installing dependencies..."
    cd "$PROJECT_DIR"
    if command -v bun &>/dev/null; then
      bun install 2>&1 | tail -3
    else
      npm install 2>&1 | tail -3
    fi
    if [[ -d "$PROJECT_DIR/node_modules" ]]; then
      fixed "Dependencies installed successfully"
    else
      fail "Dependency installation failed"
    fi
  fi
fi

# ==============================================================================
# 6. DATABASE CHECKS
# ==============================================================================
section "6. SQLite Database"

DB_DIR="$PROJECT_DIR/db"
DB_PATH="$DB_DIR/custom.db"

# Check db directory
if [[ -d "$DB_DIR" ]]; then
  pass "Database directory exists: $DB_DIR"
else
  warn "Database directory missing: $DB_DIR"
  if $FIX_MODE; then
    mkdir -p "$DB_DIR"
    fixed "Created database directory: $DB_DIR"
  fi
fi

# Check database file
if [[ -f "$DB_PATH" ]]; then
  DB_SIZE=$(du -h "$DB_PATH" 2>/dev/null | cut -f1)
  DB_PERMS=$(stat -c '%a' "$DB_PATH" 2>/dev/null || echo "?")
  echo "  Database: $DB_PATH ($DB_SIZE, perms: $DB_PERMS)"

  # Check write permissions
  if [[ -w "$DB_PATH" ]]; then
    pass "Database file is writable"
  else
    fail "Database file is NOT writable (perms: $DB_PERMS)"
    if $FIX_MODE; then
      chmod 666 "$DB_PATH"
      fixed "Database permissions fixed to 666"
    fi
  fi

  # Check for stale WAL/SHM files
  WAL_ISSUES=0
  for ext in "-wal" "-shm"; do
    WAL_FILE="$DB_PATH$ext"
    if [[ -f "$WAL_FILE" ]]; then
      WAL_SIZE=$(du -h "$WAL_FILE" 2>/dev/null | cut -f1)
      if [[ -n "$WAL_SIZE" && "$WAL_SIZE" != "0" ]]; then
        echo "  Found stale journal: $WAL_FILE ($WAL_SIZE)"
        ((WAL_ISSUES++))
      fi
    fi
  done
  if [[ "$WAL_ISSUES" -gt 0 ]]; then
    warn "Found $WAL_ISSUES stale journal file(s)"
    if $FIX_MODE; then
      for ext in "-wal" "-shm"; do
        WAL_FILE="$DB_PATH$ext"
        if [[ -f "$WAL_FILE" ]]; then
          rm -f "$WAL_FILE" 2>/dev/null && echo "    Removed: $WAL_FILE"
        fi
      done
      fixed "Stale journal files cleaned up"
    fi
  else
    pass "No stale journal files"
  fi

  # Check database integrity (if sqlite3 available)
  if command -v sqlite3 &>/dev/null; then
    INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1 || echo "error")
    if echo "$INTEGRITY" | grep -q "ok"; then
      pass "Database integrity check: OK"
    else
      fail "Database integrity check FAILED: $INTEGRITY"
      if $FIX_MODE; then
        echo "    Attempting database recovery..."
        cp "$DB_PATH" "$DB_PATH.bak.$(date +%s)"
        sqlite3 "$DB_PATH" "REINDEX;" 2>/dev/null && fixed "Database reindexed"
      fi
    fi
  else
    warn "sqlite3 CLI not available - skipping integrity check (apt install sqlite3)"
  fi
else
  warn "Database file does not exist: $DB_PATH (will be auto-created on first request)"
  if $FIX_MODE; then
    mkdir -p "$DB_DIR"
    touch "$DB_PATH"
    chmod 666 "$DB_PATH"
    fixed "Empty database file created: $DB_PATH"
  fi
fi

# ==============================================================================
# 7. PRISMA CHECKS
# ==============================================================================
section "7. Prisma ORM"

# Check prisma client generated
PRISMA_CLIENT="$PROJECT_DIR/node_modules/.prisma/client/index.js"
if [[ -f "$PRISMA_CLIENT" ]]; then
  pass "Prisma client generated"
else
  fail "Prisma client NOT generated - run: npx prisma generate"
  if $FIX_MODE || $DEEP_MODE; then
    cd "$PROJECT_DIR"
    npx prisma generate 2>&1 | tail -5
    if [[ -f "$PRISMA_CLIENT" ]]; then
      fixed "Prisma client generated"
    else
      fail "Prisma generate failed"
    fi
  fi
fi

# Check prisma schema
SCHEMA="$PROJECT_DIR/prisma/schema.prisma"
if [[ -f "$SCHEMA" ]]; then
  TABLE_COUNT=$(grep -c 'model ' "$SCHEMA" 2>/dev/null || echo "0")
  pass "Prisma schema found ($TABLE_COUNT models)"
  # Verify key models exist
  for model in "User" "Session" "AuditLog" "SystemSetting" "LoginAttempt"; do
    if grep -q "model $model " "$SCHEMA" 2>/dev/null; then
      pass "  Model: $model"
    else
      fail "  Missing model: $model"
    fi
  done
fi

# ==============================================================================
# 8. BUILD CHECKS
# ==============================================================================
section "8. Next.js Build"

BUILD_DIR="$PROJECT_DIR/.next"
if [[ -d "$BUILD_DIR" ]]; then
  BUILD_AGE=$(( $(date +%s) - $(stat -c %Y "$BUILD_DIR" 2>/dev/null || echo "0") ))
  BUILD_AGE_MIN=$((BUILD_AGE / 60))
  echo "  .next/ exists (last modified: ${BUILD_AGE_MIN} min ago)"

  # Check standalone build
  if [[ -f "$BUILD_DIR/standalone/server.js" ]]; then
    pass "Standalone build exists"
  else
    warn "Standalone build not found - run: npm run build"
    if $DEEP_MODE; then
      cd "$PROJECT_DIR"
      echo "    Building project (this may take a few minutes)..."
      if command -v bun &>/dev/null; then
        bun run build 2>&1 | tail -10
      else
        npm run build 2>&1 | tail -10
      fi
      if [[ -f "$BUILD_DIR/standalone/server.js" ]]; then
        fixed "Build completed successfully"
      else
        fail "Build failed - check errors above"
      fi
    fi
  fi
else
  fail "No .next/ build directory found"
  if $DEEP_MODE; then
    cd "$PROJECT_DIR"
    echo "    Building project..."
    if command -v bun &>/dev/null; then
      bun run build 2>&1 | tail -10
    else
      npm run build 2>&1 | tail -10
    fi
    if [[ -d "$BUILD_DIR" ]]; then
      fixed "Build completed"
    else
      fail "Build failed"
    fi
  fi
fi

# ==============================================================================
# 9. PORT & SERVICE CHECKS
# ==============================================================================
section "9. Port & Service Status"

check_port() {
  local port=$1
  local name=$2
   if command -v ss &>/dev/null; then
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      pass "$name port $port: LISTENING"
      return 0
    else
      warn "$name port $port: NOT listening"
      return 1
    fi
  elif command -v netstat &>/dev/null; then
    if netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
      pass "$name port $port: LISTENING"
      return 0
    else
      warn "$name port $port: NOT listening"
      return 1
    fi
  else
    warn "Cannot check ports (ss/netstat not available)"
    return 2
  fi
}

# Read port from .env
APP_PORT=$(grep '^PORT=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "3000")
check_port "$APP_PORT" "Dashboard App"

# GenieACS ports
check_port 7547 "GenieACS CWMP"
check_port 7557 "GenieACS NBI"
check_port 7567 "GenieACS File Server"

# ==============================================================================
# 10. GENIEACS CHECKS
# ==============================================================================
section "10. GenieACS Services"

if command -v genieacs-cwmp &>/dev/null; then
  GENIEACS_VER=$(genieacs-cwmp --version 2>/dev/null || echo "installed")
  pass "GenieACS installed: $GENIEACS_VER"

  # Check GenieACS services
  GENIE_SERVICES=("genieacs-cwmp" "genieacs-nbi" "genieacs-fs")
  for svc in "${GENIE_SERVICES[@]}"; do
    if pgrep -f "$svc" >/dev/null 2>&1; then
      pass "  $svc: running"
    else
      warn "  $svc: NOT running"
    fi
  done
else
  warn "GenieACS not installed on this server"
  echo "  (This is OK if using remote GenieACS mode)"
  echo "  Install with: npm install -g genieacs"
fi

# ==============================================================================
# 11. FIREWALL CHECKS
# ==============================================================================
section "11. Firewall"

if command -v ufw &>/dev/null; then
  UFW_STATUS=$(ufw status 2>/dev/null | head -1 || echo "unknown")
  echo "  UFW: $UFW_STATUS"

  # Check required ports
  for port in $APP_PORT 7547 7557 7567; do
    if ufw status 2>/dev/null | grep -q "$port"; then
      pass "  Port $port allowed in UFW"
    else
      warn "  Port $port NOT in UFW rules"
      if $FIX_MODE; then
        ufw allow $port/tcp 2>/dev/null && fixed "  Allowed port $port in UFW"
      fi
    fi
  done
elif command -v firewall-cmd &>/dev/null; then
  echo "  firewalld detected (not UFW)"
else
  warn "No firewall tool detected (ufw/firewalld)"
fi

# ==============================================================================
# 12. GIT CHECKS
# ==============================================================================
section "12. Git Repository"

if [[ -d "$PROJECT_DIR/.git" ]]; then
  GIT_BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "?")
  GIT_REMOTE=$(git -C "$PROJECT_DIR" remote get-url origin 2>/dev/null || echo "none")
  GIT_STATUS=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l)
  echo "  Branch:  $GIT_BRANCH"
  echo "  Remote:  $GIT_REMOTE"
  echo "  Changes: $GIT_STATUS uncommitted file(s)"
  pass "Git repository OK"
else
  warn "Not a git repository"
fi

# ==============================================================================
# 13. FILE PERMISSIONS CHECKS
# ==============================================================================
section "13. File Permissions"

# Check key files have correct permissions
for f in ".env" "prisma/schema.prisma"; do
  FPATH="$PROJECT_DIR/$f"
  if [[ -f "$FPATH" ]]; then
    PERMS=$(stat -c '%a' "$FPATH" 2>/dev/null)
    if [[ "$PERMS" -gt 644 ]]; then
      warn "$f has loose permissions: $PERMS"
      if $FIX_MODE; then
        chmod 644 "$FPATH"
        fixed "$f permissions set to 644"
      fi
    else
      pass "$f permissions OK ($PERMS)"
    fi
  fi
done

# Check scripts are executable
for f in "fix_all.sh" "setup.sh" "install.sh"; do
  FPATH="$PROJECT_DIR/$f"
  if [[ -f "$FPATH" ]]; then
    if [[ -x "$FPATH" ]]; then
      pass "$f is executable"
    else
      warn "$f is NOT executable"
      if $FIX_MODE; then
        chmod +x "$FPATH"
        fixed "$f made executable"
      fi
    fi
  fi
done

# ==============================================================================
# 14. LOG FILES CHECKS
# ==============================================================================
section "14. Log Files"

LOG_FILES=("dev.log" "server.log" "error.log" "pm2.log")
TOTAL_LOG_SIZE=0
for lf in "${LOG_FILES[@]}"; do
  LPATH="$PROJECT_DIR/$lf"
  if [[ -f "$LPATH" ]]; then
    LSIZE=$(du -h "$LPATH" 2>/dev/null | cut -f1)
    echo "  $lf: $LSIZE"
    TOTAL_LOG_SIZE=$((TOTAL_LOG_SIZE + 1))
  fi
done

if [[ "$TOTAL_LOG_SIZE" -gt 0 ]] && $FIX_MODE; then
  echo "  Cleaning old logs..."
  for lf in "${LOG_FILES[@]}"; do
    LPATH="$PROJECT_DIR/$lf"
    if [[ -f "$LPATH" ]]; then
      truncate -s 0 "$LPATH" 2>/dev/null
    fi
  done
  fixed "Log files truncated"
fi

if [[ "$TOTAL_LOG_SIZE" -eq 0 ]]; then
  pass "No large log files"
fi

# ==============================================================================
# 15. AUTO-FIX: COMMON ISSUES
# ==============================================================================
section "15. Auto-Fix Common Issues"

if $FIX_MODE; then
  # Fix db directory permissions
  if [[ -d "$DB_DIR" ]]; then
    chmod 755 "$DB_DIR" 2>/dev/null
  fi

  # Fix database file permissions
  if [[ -f "$DB_PATH" ]]; then
    chmod 666 "$DB_PATH" 2>/dev/null
    fixed "Database permissions ensured (666)"
  fi

  # Ensure .env has DATABASE_URL
  if [[ -f "$PROJECT_DIR/.env" ]]; then
    if ! grep -q 'DATABASE_URL' "$PROJECT_DIR/.env"; then
      echo 'DATABASE_URL="file:./db/custom.db"' >> "$PROJECT_DIR/.env"
      fixed "Added DATABASE_URL to .env"
    fi
    if ! grep -q 'JWT_SECRET\|change-me' "$PROJECT_DIR/.env" 2>/dev/null; then
      : # JWT_SECRET already set
    elif grep -q 'change-me' "$PROJECT_DIR/.env" 2>/dev/null; then
      JWT_SEC=$(openssl rand -base64 32 2>/dev/null || echo "auto-$(date +%s)")
      sed -i "s/change-me-generate-with-openssl-rand-base64-32/$JWT_SEC/" "$PROJECT_DIR/.env"
      fixed "Generated secure JWT_SECRET"
    fi
  fi

  # PM2 restart if app is registered
  if $PM2_OK && pm2 list 2>/dev/null | grep -qi "mlj\|genieacs\|next"; then
    echo "  Restarting PM2 app..."
    pm2 restart all 2>/dev/null && fixed "PM2 app restarted"
  fi
fi

# ==============================================================================
# 16. API HEALTH CHECK
# ==============================================================================
section "16. API Health Check"

if command -v curl &>/dev/null; then
  # Check if app is responding
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    pass "API health check: 200 OK"
  else
    warn "API health check: HTTP $HTTP_CODE (app may not be running)"
    echo "  Start with: pm2 start ecosystem.config.cjs  (or npm run dev)"
  fi

  # Check auth endpoint
  AUTH_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/auth" 2>/dev/null || echo "000")
  if [[ "$AUTH_CODE" == "401" || "$AUTH_CODE" == "405" ]]; then
    pass "Auth endpoint responding (expected 401/405 without session)"
  else
    warn "Auth endpoint: HTTP $AUTH_CODE"
  fi
else
  warn "curl not available - skipping API health check"
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo "========================================================================"
echo "  DIAGNOSTIC SUMMARY"
echo "========================================================================"
echo -e "  ${GREEN}PASS: $PASS${NC}"
echo -e "  ${YELLOW}WARN: $WARN${NC}"
echo -e "  ${RED}FAIL: $FAIL${NC}"
if $FIX_MODE; then
  echo -e "  ${CYAN}FIXED: $FIXED${NC}"
fi
echo "========================================================================"

if [[ "$FAIL" -eq 0 ]]; then
  echo -e "  ${GREEN}All critical checks passed!${NC}"
  if [[ "$WARN" -eq 0 ]]; then
    echo -e "  ${GREEN}No warnings either - system is healthy!${NC}"
  fi
else
  echo -e "  ${RED}$FAIL issue(s) need attention.${NC}"
  echo "  Run with --fix to auto-repair:  ./fix_all.sh --fix"
  if [[ "$FAIL" -gt 0 && ! $FIX_MODE ]]; then
    echo "  For deep repair (reinstall deps, rebuild):  ./fix_all.sh --fix --deep"
  fi
fi

echo ""
if ! $FIX_MODE; then
  echo "  Quick commands:"
  echo "    ./fix_all.sh --fix        # Auto-fix detected issues"
  echo "    ./fix_all.sh --fix --deep # Full repair (deps + rebuild)"
  echo "    npm run dev                # Start development server"
  echo "    npm run build              # Production build"
  echo "    pm2 start ecosystem.config.cjs  # Start with PM2"
fi

echo ""
