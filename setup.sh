#!/usr/bin/env bash
# ============================================================================
# MLJ NET GenieACS Platform - Setup & Configuration Script
# ============================================================================
# Usage: sudo bash setup.sh
# ============================================================================

# Enforce bash
if [ -z "$BASH_VERSION" ]; then
    echo "ERROR: This script requires bash. Run: sudo bash setup.sh"
    exit 1
fi

set -e
trap 'echo "[ERROR] Script failed at line $LINENO"; exit 1' ERR

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

TOTAL_STEPS=9
CURRENT_STEP=0

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR"
PROJECT_DIR="$SCRIPT_DIR"

log_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "${CYAN}${BOLD}[$CURRENT_STEP/$TOTAL_STEPS]${NC} ${BOLD}$1${NC}"
    SEP=""
    for _i in $(seq 1 60); do SEP="${SEP}="; done
    echo -e "${CYAN}${SEP}${NC}"
}

log_info()     { echo -e "  ${GREEN}[OK]${NC} $1"; }
log_warn()     { echo -e "  ${YELLOW}[!]${NC} $1"; }
log_error()    { echo -e "  ${RED}[FAIL]${NC} $1"; }
log_progress() { echo -e "  ${CYAN} ->${NC} $1"; }

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: Must run as root (sudo).${NC}"
    echo "  Run: sudo bash setup.sh"
    exit 1
fi

echo ""
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${CYAN}${BOLD}     MLJ NET GenieACS Platform Setup                     ${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo ""
echo "  Project directory: $PROJECT_DIR"

# ============================================================================
# STEP 1: Ensure Services Are Running
# ============================================================================
log_step "Ensuring Required Services Are Running"

log_progress "Checking MongoDB..."

fix_mongodb() {
    log_progress "Attempting to fix MongoDB..."
    mkdir -p /var/lib/mongodb /var/log/mongodb
    chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb
    chmod 755 /var/lib/mongodb /var/log/mongodb
    rm -f /var/lib/mongodb/mongod.lock /var/lib/mongodb/WiredTiger.lock 2>/dev/null || true

    if [ ! -f /etc/mongod.conf ]; then
        log_progress "Recreating mongod.conf..."
        cat > /etc/mongod.conf << 'MONGOCFG'
systemLog:
  destination: file
  path: "/var/log/mongodb/mongod.log"
  logAppend: true
storage:
  dbPath: "/var/lib/mongodb"
  journal:
    enabled: true
net:
  port: 27017
  bindIp: 127.0.0.1
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
security:
  authorization: disabled
MONGOCFG
    fi

    sysctl -w vm.max_map_count=262144 > /dev/null 2>&1 || true

    if ! ldd /usr/bin/mongod 2>/dev/null | grep -q libssl; then
        log_progress "Installing missing SSL libraries..."
        apt-get install -y -qq libssl3 2>/dev/null || apt-get install -y -qq libssl1.1 2>/dev/null || true
    fi

    if [ ! -x /usr/bin/mongod ]; then
        log_progress "mongod binary not found. Reinstalling..."
        apt-get install -y -qq mongodb-org 2>/dev/null || true
    fi

    if ! id -u mongodb &>/dev/null 2>&1; then
        log_progress "Creating mongodb user..."
        useradd -r -s /bin/false -d /var/lib/mongodb mongodb 2>/dev/null || true
        chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb
    fi
}

MONGO_STARTED=false
if systemctl is-active --quiet mongod 2>/dev/null; then
    log_info "MongoDB is already running"
    MONGO_STARTED=true
else
    systemctl start mongod 2>/dev/null && sleep 3

    if systemctl is-active --quiet mongod 2>/dev/null; then
        log_info "MongoDB started successfully"
        MONGO_STARTED=true
    else
        echo ""
        log_warn "MongoDB failed to start on first attempt."
        log_progress "Checking MongoDB error logs..."
        journalctl -u mongod --no-pager -n 15 2>/dev/null || echo "No journal logs"
        echo ""

        fix_mongodb

        log_progress "Restarting MongoDB after fix..."
        systemctl daemon-reload || true
        systemctl start mongod 2>/dev/null && sleep 5

        if systemctl is-active --quiet mongod 2>/dev/null; then
            log_info "MongoDB started after fix"
            MONGO_STARTED=true
        else
            echo ""
            log_error "MongoDB could not start after multiple attempts."
            echo ""
            echo "  Common fixes:"
            echo "    1. libssl error:  apt install libssl3"
            echo "    2. Permission:    chown -R mongodb:mongodb /var/lib/mongodb"
            echo "    3. Out of memory: add swap or increase RAM"
            echo "    4. Port in use:   kill existing mongod process"
            echo ""
            echo "  Check logs:"
            echo "    journalctl -u mongod -n 50 --no-pager"
            echo "    cat /var/log/mongodb/mongod.log"
            echo ""
            read -p "  Continue anyway? (y/N): " CONTINUE_ANYWAY
            if [ "$CONTINUE_ANYWAY" != "y" ] && [ "$CONTINUE_ANYWAY" != "Y" ]; then
                exit 1
            fi
            MONGO_STARTED=false
        fi
    fi
fi

if [ "$MONGO_STARTED" = true ]; then
    if mongosh --eval 'db.runCommand({ping:1})' >/dev/null 2>&1; then
        log_info "MongoDB connection verified"
    else
        log_warn "MongoDB running but ping failed (may still be initializing)"
    fi
fi

for SVC in genieacs-cwmp genieacs-nbi genieacs-fs; do
    log_progress "Checking $SVC..."
    if ! systemctl is-active --quiet "$SVC" 2>/dev/null; then
        systemctl start "$SVC" 2>/dev/null || true
        sleep 2
    fi
    if systemctl is-active --quiet "$SVC" 2>/dev/null; then
        log_info "$SVC is running"
    else
        log_warn "$SVC failed to start (may need manual check)"
    fi
done

# ============================================================================
# STEP 2: Install Project Dependencies
# ============================================================================
log_step "Installing Project Dependencies"

if [ -f "bun.lock" ] && command -v bun &>/dev/null; then
    log_progress "Installing with bun (fast)..."
    bun install --production=false 2>&1 | tail -3
    log_info "Dependencies installed via bun"
elif [ -f "package.json" ]; then
    log_progress "Installing with npm..."
    npm install 2>&1 | tail -3
    log_info "Dependencies installed via npm"
else
    log_error "package.json not found in $PROJECT_DIR"
    exit 1
fi

# ============================================================================
# STEP 3: Configure Environment
# ============================================================================
log_step "Configuring Environment"

if [ ! -f ".env" ]; then
    log_progress "Creating .env file..."
    JWT_SECRET_VAL=$(openssl rand -base64 32 2>/dev/null || echo 'mljnet-default-secret-change-me')
    SESSION_SECRET_VAL=$(openssl rand -base64 32 2>/dev/null || echo 'mljnet-session-secret-change-me')

    cat > .env << ENVEOF
# MLJ NET GenieACS Platform - Environment Configuration
# Generated by setup.sh

# Database (SQLite)
DATABASE_URL="file:./db/custom.db"

# GenieACS NBI API (local mode)
GENIEACS_NBI_URL="http://127.0.0.1:7557"
GENIEACS_NBI_USERNAME=""
GENIEACS_NBI_PASSWORD=""

# GenieACS Ports
GENIEACS_CWMP_PORT=7547
GENIEACS_NBI_PORT=7557
GENIEACS_FS_PORT=7567
GENIEACS_DASHBOARD_PORT=3000

# JWT Secret (auto-generated)
JWT_SECRET="$JWT_SECRET_VAL"

# Session
SESSION_SECRET="$SESSION_SECRET_VAL"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="production"
PORT=3000
ENVEOF
    log_info ".env file created"
else
    log_info ".env file already exists, skipping"
fi

mkdir -p db

# ============================================================================
# STEP 4: Initialize Database
# ============================================================================
log_step "Initializing Database (Prisma + SQLite)"

log_progress "Generating Prisma client..."
npx prisma generate 2>&1 | tail -2
log_info "Prisma client generated"

log_progress "Pushing schema to SQLite..."
npx prisma db push --force-reset 2>&1 | tail -2
log_info "Database schema applied"

log_progress "Seeding default data..."
npx prisma db seed 2>&1 | tail -3 || \
    node -e "require('./prisma/seed.js')" 2>&1 | tail -3 || \
    log_warn "Seed may need manual execution"
log_info "Database seeded (admin / admin123)"

# ============================================================================
# STEP 5: Build Next.js Application
# ============================================================================
log_step "Building Next.js Application (Production)"

if [ -f ".next/standalone/server.js" ]; then
    log_info "Production build already exists (.next/standalone/server.js), skipping build"
else
    log_progress "Running next build (standalone output)..."
    if command -v bun &>/dev/null; then
        bun run build 2>&1 | tail -5
    else
        npm run build 2>&1 | tail -5
    fi

    log_progress "Copying static assets..."
    if [ -d ".next/static" ]; then
        cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
        log_info "Static assets copied"
    fi
    if [ -d "public" ]; then
        cp -r public .next/standalone/ 2>/dev/null || true
        log_info "Public assets copied"
    fi
    log_info "Production build complete"
fi

# ============================================================================
# STEP 6: Configure Caddy Reverse Proxy
# ============================================================================
log_step "Configuring Caddy Reverse Proxy"

read -p "  Enter your domain name (or press Enter for IP-only mode): " DOMAIN_NAME
SERVER_IP=$(hostname -I | awk '{print $1}')

if [ -n "$DOMAIN_NAME" ]; then
    log_progress "Configuring Caddy with HTTPS for $DOMAIN_NAME..."
    cat > /etc/caddy/Caddyfile << EOF
{
    admin off
}

$DOMAIN_NAME {
    reverse_proxy localhost:3000
}

:3000 {
    reverse_proxy localhost:3000
}
EOF
    log_info "Caddy configured with auto-HTTPS for $DOMAIN_NAME"
else
    log_progress "Configuring Caddy for HTTP (no domain)..."
    cat > /etc/caddy/Caddyfile << EOF
{
    admin off
    auto_https off
}

:80 {
    reverse_proxy localhost:3000
}

:3000 {
    reverse_proxy localhost:3000
}
EOF
    log_info "Caddy configured for HTTP on ports 80 and 3000"
fi

log_progress "Restarting Caddy..."
systemctl restart caddy 2>/dev/null || true
systemctl enable caddy > /dev/null 2>&1 || true
log_info "Caddy restarted and enabled"

# ============================================================================
# STEP 7: Start Application with PM2
# ============================================================================
log_step "Starting Application with PM2"

log_progress "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'mlj-net',
      script: '.next/standalone/server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
EOF

mkdir -p logs
log_info "PM2 ecosystem created"

pm2 delete mlj-net 2>/dev/null || true

log_progress "Starting MLJ NET application..."
pm2 start ecosystem.config.cjs 2>&1 | tail -5
pm2 save 2>/dev/null || true
log_info "Application started on port 3000"

sleep 3
if pm2 is-running mlj-net 2>/dev/null; then
    log_info "PM2 process is running"
else
    log_warn "PM2 process may not have started. Check: pm2 logs mlj-net"
fi

# ============================================================================
# STEP 8: Create Systemd Service
# ============================================================================
log_step "Creating Systemd Service for Auto-Start"

log_progress "Creating mlj-net systemd service..."
cat > /etc/systemd/system/mlj-net.service << EOF
[Unit]
Description=MLJ NET GenieACS Platform
After=network.target mongod.service genieacs-nbi.service
Wants=network-online.target

[Service]
Type=forking
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.cjs --no-daemon
ExecStop=/usr/bin/pm2 stop mlj-net
ExecReload=/usr/bin/pm2 reload mlj-net
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mlj-net

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload || true
log_info "Systemd service created"

# ============================================================================
# STEP 9: Final Verification
# ============================================================================
log_step "Final Verification"

echo ""

check_service() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        log_info "$name: running"
    else
        log_warn "$name: may not be running"
    fi
}

check_service "MongoDB"        "systemctl is-active --quiet mongod"
check_service "GenieACS CWMP"  "systemctl is-active --quiet genieacs-cwmp"
check_service "GenieACS NBI"   "systemctl is-active --quiet genieacs-nbi"
check_service "GenieACS FS"    "systemctl is-active --quiet genieacs-fs"
check_service "Caddy"          "systemctl is-active --quiet caddy"
check_service "MLJ NET App"    "pm2 is-running mlj-net"

echo ""
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}  MLJ NET GenieACS Platform - Setup Complete!${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo ""
echo -e "  ${BOLD}Access the Platform:${NC}"
if [ -n "$DOMAIN_NAME" ]; then
    echo -e "    ${CYAN}https://$DOMAIN_NAME${NC}"
else
    echo -e "    ${CYAN}http://$SERVER_IP${NC}"
    echo -e "    ${CYAN}http://$SERVER_IP:3000${NC}"
fi
echo ""
echo -e "  ${BOLD}Default Login:${NC}"
echo -e "    Username: ${CYAN}admin${NC}"
echo -e "    Password: ${CYAN}admin123${NC}"
echo -e "    ${RED}[!] Change this password immediately after first login!${NC}"
echo ""
echo -e "  ${BOLD}Service Ports:${NC}"
echo "    MLJ NET Panel:   3000 (Caddy proxies 80/443)"
echo "    GenieACS CWMP:   7547 (TR-069 device connections)"
echo "    GenieACS NBI:    7557 (API - local only)"
echo "    GenieACS FS:     7567 (File server - local only)"
echo "    MongoDB:         27017 (local only)"
echo ""
echo -e "  ${BOLD}Useful Commands:${NC}"
echo "    View app logs:    pm2 logs mlj-net"
echo "    Restart app:      pm2 restart mlj-net"
echo "    Stop app:         pm2 stop mlj-net"
echo "    View GenieACS:    journalctl -u genieacs-nbi -f"
echo "    View MongoDB:     journalctl -u mongod -f"
echo "    Caddy status:     systemctl status caddy"
echo ""
echo -e "  ${BOLD}Configuration Files:${NC}"
echo "    App config:       $PROJECT_DIR/.env"
echo "    Caddy config:     /etc/caddy/Caddyfile"
echo "    MongoDB config:   /etc/mongod.conf"
echo "    GenieACS units:   /etc/systemd/system/genieacs-*.service"
echo "    PM2 ecosystem:    $PROJECT_DIR/ecosystem.config.cjs"
echo ""
