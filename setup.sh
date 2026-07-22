#!/usr/bin/env bash
# ============================================================================
# MLJ NET GenieACS Platform - Setup Script for Ubuntu 22.04
# ============================================================================
# Hybrid Node.js + PHP Architecture
# Configures and starts both Node.js and PHP backends.
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

TOTAL_STEPS=10
CURRENT_STEP=0

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

# Project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
export PROJECT_DIR="$SCRIPT_DIR"

echo ""
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${CYAN}${BOLD}     MLJ NET Platform Setup                            ${NC}"
echo -e "${CYAN}${BOLD}     Hybrid Node.js + PHP                              ${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"

# ============================================================================
# STEP 1: Ensure Services Running
# ============================================================================
log_step "Ensuring core services are running"

# Fix MongoDB if needed
fix_mongodb() {
    log_progress "Attempting MongoDB fix..."
    rm -f /var/lib/mongodb/mongod.lock /var/lib/mongodb/WiredTiger.lock 2>/dev/null || true
    chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb 2>/dev/null || true
    chmod 755 /var/lib/mongodb /var/log/mongodb 2>/dev/null || true

    # Recreate config if missing
    if [ ! -f /etc/mongod.conf ]; then
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

    # Try installing libssl3 if missing
    if ! dpkg -l | grep -q libssl3 2>/dev/null; then
        apt-get install -y -qq libssl3 > /dev/null 2>&1 || true
    fi

    for attempt in 1 2 3; do
        systemctl start mongod 2>/dev/null && break
        log_warn "MongoDB start attempt $attempt failed, retrying..."
        sleep 2
    done
}

if systemctl is-active --quiet mongod 2>/dev/null; then
    log_info "MongoDB is running"
else
    log_warn "MongoDB not running, fixing..."
    fix_mongodb
    if systemctl is-active --quiet mongod 2>/dev/null; then
        log_info "MongoDB fixed and running"
    else
        log_error "MongoDB failed to start - check: journalctl -u mongod -n 30"
    fi
fi

# Start GenieACS services
for svc in genieacs-cwmp genieacs-nbi genieacs-fs; do
    if systemctl is-active --quiet $svc 2>/dev/null; then
        log_info "$svc: running"
    else
        systemctl start $svc 2>/dev/null || true
        log_warn "$svc: attempted start"
    fi
done

# Start PHP-FPM
if command -v php8.2-fpm &>/dev/null; then
    if systemctl is-active --quiet php8.2-fpm 2>/dev/null; then
        log_info "PHP-FPM: running"
    else
        systemctl start php8.2-fpm 2>/dev/null || true
        log_warn "PHP-FPM: attempted start"
    fi
else
    log_warn "PHP-FPM not installed, run install.sh first"
fi

# ============================================================================
# STEP 2: Install Node.js Dependencies
# ============================================================================
log_step "Installing Node.js dependencies"

if [ -f "package.json" ]; then
    if command -v bun &>/dev/null; then
        log_progress "Running bun install..."
        bun install 2>&1 | tail -5
        log_info "Dependencies installed via bun"
    else
        log_progress "Running npm install..."
        npm install --legacy-peer-deps 2>&1 | tail -5
        log_info "Dependencies installed via npm"
    fi
else
    log_warn "package.json not found"
fi

# ============================================================================
# STEP 3: Install PHP Dependencies (Composer)
# ============================================================================
log_step "Installing PHP dependencies"

if [ -d "php-api" ] && [ -f "php-api/composer.json" ]; then
    if command -v composer &>/dev/null; then
        log_progress "Running composer install in php-api/..."
        cd php-api
        composer install --no-interaction --no-dev --optimize-autoloader 2>&1 | tail -5
        cd "$PROJECT_DIR"
        log_info "PHP dependencies installed"
    else
        log_warn "Composer not found, PHP API will not work until composer install is run"
    fi
else
    log_warn "php-api/ directory not found, skipping PHP dependencies"
fi

# ============================================================================
# STEP 4: Configure Environment
# ============================================================================
log_step "Configuring environment"

if [ ! -f ".env" ]; then
    log_progress "Creating .env file..."
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    cat > .env << ENVCFG
# MLJ NET Platform - Auto-generated by setup.sh
# Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)

DATABASE_URL="file:./db/custom.db"
GENIEACS_NBI_URL="http://127.0.0.1:7557"
GENIEACS_NBI_USERNAME=""
GENIEACS_NBI_PASSWORD=""
GENIEACS_CWMP_PORT="7547"
GENIEACS_NBI_PORT="7557"
GENIEACS_FS_PORT="7567"
GENIEACS_DASHBOARD_PORT="3000"
JWT_SECRET="${JWT_SECRET}"
SESSION_SECRET="${SESSION_SECRET}"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="production"
PORT="3000"

# MikroTik (optional, configure via web UI)
MIKROTIK_HOST="192.168.1.1"
MIKROTIK_PORT="8728"
MIKROTIK_USERNAME="admin"
MIKROTIK_PASSWORD=""
ENVCFG
    log_info ".env file created with auto-generated secrets"
else
    log_info ".env file already exists"
fi

# Copy .env values to PHP config if PHP config doesn't exist
if [ -d "php-api/config" ] && [ ! -f "php-api/config/.env" ]; then
    log_progress "Creating PHP config from main .env..."
    cp php-api/config/.env.example php-api/config/.env
    log_info "PHP config created"
fi

# ============================================================================
# STEP 5: Initialize Database
# ============================================================================
log_step "Initializing database"

mkdir -p db

# Prisma
if command -v npx &>/dev/null; then
    log_progress "Generating Prisma client..."
    npx prisma generate 2>&1 | tail -3

    log_progress "Syncing database schema..."
    npx prisma db push --force-reset 2>&1 | tail -3
    log_info "Database initialized"
else
    log_warn "npx not found, database will be auto-created at runtime"
fi

# ============================================================================
# STEP 6: Build Next.js
# ============================================================================
log_step "Building Next.js application"

if [ -f ".next/standalone/server.js" ]; then
    log_info "Build already exists, skipping (delete .next/ to force rebuild)"
else
    if command -v bun &>/dev/null; then
        log_progress "Running bun run build..."
        bun run build 2>&1 | tail -10
    else
        log_progress "Running npm run build..."
        npm run build 2>&1 | tail -10
    fi

    if [ -f ".next/standalone/server.js" ]; then
        log_info "Build successful"
    else
        log_error "Build failed - check output above"
    fi
fi

# ============================================================================
# STEP 7: Configure Caddy
# ============================================================================
log_step "Configuring Caddy reverse proxy"

log_progress "Setting PROJECT_DIR environment for Caddy..."
# Set PROJECT_DIR for Caddy's php_fastcgi root directive
export PROJECT_DIR
echo "PROJECT_DIR=$PROJECT_DIR" >> /etc/environment

# Create Caddyfile from project template
if [ -f "Caddyfile" ]; then
    # Read domain from existing Caddy config or ask
    EXISTING_DOMAIN=""
    if [ -f "/etc/caddy/Caddyfile" ]; then
        EXISTING_DOMAIN=$(grep -oP '(?<=https?://)[^/:]+' /etc/caddy/Caddyfile 2>/dev/null | head -1 || true)
    fi

    if [ -n "$EXISTING_DOMAIN" ] && [ "$EXISTING_DOMAIN" != "localhost" ]; then
        log_progress "Found existing domain: $EXISTING_DOMAIN"

        # Create Caddyfile with domain + PHP-FPM support
        cat > /etc/caddy/Caddyfile << CADDYCFG
$EXISTING_DOMAIN {
    # PHP API: route to PHP-FPM
    @php_path {
        path /api/php/*
    }
    handle @php_path {
        root * $PROJECT_DIR/php-api/public
        php_fastcgi unix//run/php/php8.2-fpm.sock
    }

    # Next.js: everything else
    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
CADDYCFG
        log_info "Caddy configured with HTTPS for $EXISTING_DOMAIN + PHP-FPM"
    else
        # HTTP-only mode
        cat > /etc/caddy/Caddyfile << CADDYCFG
:80 {
    # PHP API: route to PHP-FPM
    @php_path {
        path /api/php/*
    }
    handle @php_path {
        root * $PROJECT_DIR/php-api/public
        php_fastcgi unix//run/php/php8.2-fpm.sock
    }

    # Next.js: everything else
    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
CADDYCFG
        log_info "Caddy configured in HTTP-only mode on port 80 + PHP-FPM"
    fi

    systemctl restart caddy 2>/dev/null || true
    log_info "Caddy restarted"
else
    log_warn "Caddyfile not found in project"
fi

# ============================================================================
# STEP 8: Start with PM2
# ============================================================================
log_step "Starting application with PM2"

# Ensure logs directory
mkdir -p logs

# Create PM2 ecosystem config
cat > ecosystem.config.cjs << 'PM2CFG'
module.exports = {
  apps: [{
    name: 'mlj-net',
    script: '.next/standalone/server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    autorestart: true,
    watch: false,
  }],
}
PM2CFG

# Stop existing process if running
pm2 delete mlj-net 2>/dev/null || true

# Start
pm2 start ecosystem.config.cjs 2>&1 | tail -3
log_info "Application started with PM2"

# Save PM2 list
pm2 save 2>/dev/null || true

# ============================================================================
# STEP 9: Systemd Service
# ============================================================================
log_step "Creating systemd service"

cat > /etc/systemd/system/mlj-net.service << 'SVCEOF'
[Unit]
Description=MLJ NET GenieACS Platform (Node.js + PHP)
After=network.target mongod.service genieacs-nbi.service php8.2-fpm.service

[Service]
Type=forking
User=root
WorkingDirectory=PROJECT_DIR_PLACEHOLDER
ExecStart=/usr/bin/pm2 start ecosystem.config.cjs --no-daemon
ExecStop=/usr/bin/pm2 stop mlj-net
ExecReload=/usr/bin/pm2 restart mlj-net
PIDFile=/root/.pm2/pm2.pid
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF

# Replace placeholder with actual project directory
sed -i "s|PROJECT_DIR_PLACEHOLDER|$PROJECT_DIR|g" /etc/systemd/system/mlj-net.service

systemctl daemon-reload 2>/dev/null || true
log_info "Systemd service created"

# ============================================================================
# STEP 10: Final Verification
# ============================================================================
log_step "Final verification"

PASS_COUNT=0
TOTAL_CHECKS=7

check_service() {
    local name="$1"
    local check_cmd="$2"
    if eval "$check_cmd" > /dev/null 2>&1; then
        log_info "$name: running"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        log_warn "$name: not running"
    fi
}

check_service "MongoDB"       "systemctl is-active --quiet mongod"
check_service "GenieACS CWMP" "systemctl is-active --quiet genieacs-cwmp"
check_service "GenieACS NBI"  "systemctl is-active --quiet genieacs-nbi"
check_service "GenieACS FS"   "systemctl is-active --quiet genieacs-fs"
check_service "PHP-FPM"       "systemctl is-active --quiet php8.2-fpm"
check_service "Caddy"         "systemctl is-active --quiet caddy"
check_service "PM2/Next.js"   "pm2 pid mlj-net"

# Check if port 3000 responds
if curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null | grep -q '200\|302\|304'; then
    log_info "Dashboard: responding on port 3000"
else
    log_warn "Dashboard: not responding yet (may need a few seconds)"
fi

# Get access URL
ACCESS_URL="http://$(hostname -I | awk '{print $1}')"
if [ -f "/etc/caddy/Caddyfile" ]; then
    DOMAIN=$(grep -oP '(?<=https?://)[^/:\s]+' /etc/caddy/Caddyfile 2>/dev/null | head -1 || true)
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
        ACCESS_URL="https://$DOMAIN"
    fi
fi

echo ""
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}  Setup Complete! (${PASS_COUNT}/${TOTAL_CHECKS} services running)${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo ""
echo -e "  ${BOLD}Access URL:${NC}"
echo "    $ACCESS_URL"
echo ""
echo -e "  ${BOLD}Architecture:${NC} Node.js (Next.js :3000) + PHP 8.2 (FPM)"
echo -e "  ${BOLD}API Routes:${NC}"
echo "    Node.js API:  ${ACCESS_URL}/api/*"
echo "    PHP API:      ${ACCESS_URL}/api/php/*"
echo ""
echo -e "  ${BOLD}Default Login:${NC}"
echo "    Username: superadmin  Password: 110519"
echo "    Username: admin       Password: admin123"
echo ""
echo -e "  ${RED}IMPORTANT: Change default passwords after first login!${NC}"
echo ""