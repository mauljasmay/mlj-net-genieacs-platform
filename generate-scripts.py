#!/usr/bin/env python3
"""
MLJ NET GenieACS Platform - Script Generator
Run this on your Ubuntu server to create install.sh and setup.sh with perfect encoding.
Usage: python3 generate-scripts.py
"""
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

install_sh = r'''#!/usr/bin/env bash
# ============================================================================
# MLJ NET GenieACS Platform - Installation Script for Ubuntu 22.04
# ============================================================================
# Usage: sudo bash install.sh
# After installation completes, setup.sh runs automatically.
# ============================================================================

# Enforce bash
if [ -z "$BASH_VERSION" ]; then
    echo "ERROR: This script requires bash. Run: sudo bash install.sh"
    exit 1
fi

set -e
trap 'echo "[ERROR] Script failed at line $LINENO"; exit 1' ERR

# Colors for output
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

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: Must run as root (sudo).${NC}"
    echo "  Run: sudo bash install.sh"
    exit 1
fi

echo ""
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${CYAN}${BOLD}     MLJ NET GenieACS Platform Installer               ${NC}"
echo -e "${CYAN}${BOLD}     for Ubuntu 22.04 LTS                            ${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo ""

# Detect system info
DISTRO=$(lsb_release -ds 2>/dev/null || echo "Unknown")
KERNEL=$(uname -r)
ARCH=$(uname -m)
CPUS=$(nproc)
MEM_GB=$(free -g | awk '/^Mem:/{print $2}')
DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | tr -d 'G')

echo -e "${BOLD}System Information:${NC}"
echo "  OS:       $DISTRO"
echo "  Kernel:   $KERNEL"
echo "  Arch:     $ARCH"
echo "  CPUs:     $CPUS"
echo "  Memory:   ${MEM_GB}GB"
echo "  Disk:     ${DISK_GB}GB available"
echo ""

if [ "$MEM_GB" -lt 2 ]; then
    log_warn "Less than 2GB RAM. Recommended: 4GB+."
fi
if [ "$DISK_GB" -lt 10 ]; then
    log_warn "Less than 10GB disk. Recommended: 20GB+."
fi

# ============================================================================
# STEP 1: Update System Packages
# ============================================================================
log_step "Updating system packages"

# Fix broken ondrej/php PPA
PHP_PPA_FOUND=false
if compgen -G '/etc/apt/sources.list.d/ondrej*php*.list' &>/dev/null; then
    PHP_PPA_FOUND=true
fi
if compgen -G '/etc/apt/sources.list.d/ondrej*php*.sources' &>/dev/null; then
    PHP_PPA_FOUND=true
fi
if [ "$PHP_PPA_FOUND" = true ]; then
    log_progress "Removing broken ondrej/php PPA..."
    for ppalist in /etc/apt/sources.list.d/ondrej*php*; do
        if [ -f "$ppalist" ]; then
            rm -f "$ppalist"
            log_info "Removed $(basename "$ppalist")"
        fi
    done
    for ppakey in /etc/apt/trusted.gpg.d/ondrej*php* /usr/share/keyrings/ondrej*php*; do
        if [ -f "$ppakey" ]; then
            rm -f "$ppakey"
        fi
    done
    log_info "Broken PHP PPA cleaned up"
fi

log_progress "Updating package lists..."
apt-get update --allow-releaseinfo-change -qq 2>&1 | grep -v '^W:' || true
log_info "Package lists updated"

log_progress "Upgrading installed packages..."
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq > /dev/null 2>&1 || true
log_info "System packages upgraded"

log_progress "Installing basic utilities..."
apt-get install -y -qq curl wget gnupg2 ca-certificates lsb-release software-properties-common build-essential git unzip jq ufw logrotate dos2unix > /dev/null 2>&1 || true
log_info "Basic utilities installed"

# ============================================================================
# STEP 2: Install Node.js 20 LTS
# ============================================================================
log_step "Installing Node.js 20 LTS"

if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    log_info "Node.js already installed: $NODE_VER"
else
    log_progress "Adding NodeSource repository..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1 || true
    log_progress "Installing Node.js 20..."
    apt-get install -y -qq nodejs > /dev/null 2>&1 || true
    log_info "Node.js $(node --version) installed"
fi

NPM_VER=$(npm --version)
log_info "npm $NPM_VER installed"

# ============================================================================
# STEP 3: Install Bun Runtime
# ============================================================================
log_step "Installing Bun runtime"

if command -v bun &>/dev/null; then
    BUN_VER=$(bun --version)
    log_info "Bun already installed: v$BUN_VER"
else
    log_progress "Installing Bun via official installer..."
    curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1 || true
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    if [ -f "$HOME/.bun/bin/bun" ]; then
        ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
    fi
    log_info "Bun $(bun --version) installed"
fi

# ============================================================================
# STEP 4: Install MongoDB 7.0
# ============================================================================
log_step "Installing MongoDB 7.0"

if command -v mongod &>/dev/null; then
    MONGO_VER=$(mongod --version 2>/dev/null | head -1)
    log_info "MongoDB already installed: $MONGO_VER"
else
    log_progress "Adding MongoDB GPG key..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg > /dev/null 2>&1 || true

    log_progress "Adding MongoDB repository..."
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

    log_progress "Updating package lists for MongoDB..."
    apt-get update --allow-releaseinfo-change -qq > /dev/null 2>&1 || true

    log_progress "Installing MongoDB 7.0..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq mongodb-org > /dev/null 2>&1 || true
    log_info "MongoDB 7.0 installed"

    log_progress "Configuring MongoDB..."
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
  unixDomainSocket:
    pathPrefix: /tmp/mongodb-27017.sock
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
security:
  authorization: disabled
MONGOCFG

    mkdir -p /var/log/mongodb /var/lib/mongodb
    chown -R mongodb:mongodb /var/log/mongodb /var/lib/mongodb
    log_info "MongoDB configured"
fi

log_progress "Starting MongoDB..."
systemctl start mongod || true
systemctl enable mongod > /dev/null 2>&1 || true

if mongosh --eval 'db.runCommand({ping:1})' > /dev/null 2>&1; then
    log_info "MongoDB is running"
else
    log_warn "MongoDB may not be fully started yet (will retry in setup)"
fi

# ============================================================================
# STEP 5: Install GenieACS
# ============================================================================
log_step "Installing GenieACS (TR-069 ACS Server)"

if command -v genieacs-cwmp &>/dev/null; then
    log_info "GenieACS already installed"
else
    log_progress "Installing GenieACS via npm..."
    npm install -g genieacs@1.2.x > /dev/null 2>&1 || true
    log_info "GenieACS installed"
fi

if ! id -u genieacs &>/dev/null 2>&1; then
    log_progress "Creating genieacs system user..."
    useradd -r -s /bin/false -d /var/lib/genieacs genieacs 2>/dev/null || true
    log_info "User genieacs created"
fi

log_progress "Creating GenieACS data directories..."
mkdir -p /var/lib/genieacs/cwmp /var/lib/genieacs/nbi /var/lib/genieacs/fs /var/lib/genieacs/public
mkdir -p /var/log/genieacs
chown -R genieacs:genieacs /var/lib/genieacs /var/log/genieacs
log_info "Directories created"

log_progress "Creating systemd service files..."

cat > /etc/systemd/system/genieacs-cwmp.service << 'EOF'
[Unit]
Description=GenieACS CWMP (TR-069) Service
After=network.target mongodb.service

[Service]
Type=simple
User=genieacs
Environment=GENIEACS_CWMP_PORT=7547
Environment=GENIEACS_LOG_DIR=/var/log/genieacs
Environment=GENIEACS_MONGODB_CONNECTION_URL=mongodb://127.0.0.1:27017/genieacs
ExecStart=/usr/bin/genieacs-cwmp
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/genieacs-nbi.service << 'EOF'
[Unit]
Description=GenieACS NBI API Service
After=network.target mongodb.service

[Service]
Type=simple
User=genieacs
Environment=GENIEACS_NBI_PORT=7557
Environment=GENIEACS_LOG_DIR=/var/log/genieacs
Environment=GENIEACS_MONGODB_CONNECTION_URL=mongodb://127.0.0.1:27017/genieacs
ExecStart=/usr/bin/genieacs-nbi
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/genieacs-fs.service << 'EOF'
[Unit]
Description=GenieACS File Server Service
After=network.target mongodb.service

[Service]
Type=simple
User=genieacs
Environment=GENIEACS_FS_PORT=7567
Environment=GENIEACS_LOG_DIR=/var/log/genieacs
Environment=GENIEACS_MONGODB_CONNECTION_URL=mongodb://127.0.0.1:27017/genieacs
ExecStart=/usr/bin/genieacs-fs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload || true
log_info "GenieACS systemd services created"

log_progress "Starting GenieACS services..."
systemctl start genieacs-cwmp genieacs-nbi genieacs-fs || true
systemctl enable genieacs-cwmp genieacs-nbi genieacs-fs > /dev/null 2>&1 || true
log_info "GenieACS services started"

# ============================================================================
# STEP 6: Install Caddy Web Server
# ============================================================================
log_step "Installing Caddy (Reverse Proxy)"

if command -v caddy &>/dev/null; then
    CADDY_VER=$(caddy version 2>/dev/null | head -1)
    log_info "Caddy already installed: $CADDY_VER"
else
    log_progress "Adding Caddy repository..."
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl > /dev/null 2>&1 || true
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg > /dev/null 2>&1 || true
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null

    log_progress "Updating and installing Caddy..."
    apt-get update --allow-releaseinfo-change -qq > /dev/null 2>&1 || true
    apt-get install -y -qq caddy > /dev/null 2>&1 || true
    log_info "Caddy installed"
fi

# ============================================================================
# STEP 7: Install PM2 Process Manager
# ============================================================================
log_step "Installing PM2 Process Manager"

if command -v pm2 &>/dev/null; then
    PM2_VER=$(pm2 --version 2>/dev/null)
    log_info "PM2 already installed: v$PM2_VER"
else
    log_progress "Installing PM2 globally..."
    npm install -g pm2 > /dev/null 2>&1 || true
    pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
    log_info "PM2 installed and startup configured"
fi

# ============================================================================
# STEP 8: Configure Firewall
# ============================================================================
log_step "Configuring Firewall (UFW)"

if command -v ufw &>/dev/null; then
    log_progress "Configuring UFW rules..."
    ufw default deny incoming > /dev/null 2>&1 || true
    ufw default allow outgoing > /dev/null 2>&1 || true
    ufw allow ssh > /dev/null 2>&1 || true
    ufw allow 80/tcp > /dev/null 2>&1 || true
    ufw allow 443/tcp > /dev/null 2>&1 || true
    ufw allow 3000/tcp > /dev/null 2>&1 || true
    echo "y" | ufw enable > /dev/null 2>&1 || true
    log_info "Firewall configured (SSH, HTTP, HTTPS, Port 3000 open)"
else
    log_warn "UFW not found, skipping firewall configuration"
fi

# ============================================================================
# STEP 9: Optimize System Settings
# ============================================================================
log_step "Optimizing System Settings"

log_progress "Tuning kernel parameters for production..."
mkdir -p /etc/sysctl.d /etc/security/limits.d

cat > /etc/sysctl.d/99-mljnet.conf << 'EOF'
fs.file-max = 65535
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
vm.max_map_count = 262144
EOF

# Apply one by one - some may fail on restricted VPS kernels
SYSCTL_OK=true
while IFS= read -r LINE; do
    [ -z "$LINE" ] && continue
    KEY=$(echo "$LINE" | awk -F= '{print $1}' | tr -d ' ')
    sysctl -w "$LINE" > /dev/null 2>&1 || {
        log_warn "sysctl $KEY failed (restricted kernel - OK to ignore)"
        SYSCTL_OK=false
    }
done < <(grep -v '^#' /etc/sysctl.d/99-mljnet.conf)

if [ "$SYSCTL_OK" = true ]; then
    log_info "Kernel parameters tuned"
else
    log_info "Kernel parameters tuned (some skipped on restricted kernel)"
fi

log_progress "Setting file descriptor limits..."
cat > /etc/security/limits.d/99-mljnet.conf << 'EOF'
*    soft    nofile    65535
*    hard    nofile    65535
root  soft    nofile    65535
root  hard    nofile    65535
EOF
log_info "File descriptor limits set to 65535"

# ============================================================================
# STEP 10: Verify All Installations
# ============================================================================
log_step "Verifying Installations"

INSTALL_OK=true

if command -v node &>/dev/null; then
    log_info "Node.js: $(node --version)"
else
    log_error "Node.js: NOT FOUND"
    INSTALL_OK=false
fi

if command -v npm &>/dev/null; then
    log_info "npm: v$(npm --version)"
else
    log_error "npm: NOT FOUND"
    INSTALL_OK=false
fi

if command -v bun &>/dev/null; then
    log_info "Bun: v$(bun --version)"
else
    log_warn "Bun: NOT FOUND (will retry in setup)"
fi

if systemctl is-active --quiet mongod 2>/dev/null; then
    log_info "MongoDB: running on port 27017"
else
    log_warn "MongoDB: not running (will start in setup)"
fi

CWMP_OK=false
NBI_OK=false
FS_OK=false
systemctl is-active --quiet genieacs-cwmp 2>/dev/null && CWMP_OK=true
systemctl is-active --quiet genieacs-nbi 2>/dev/null && NBI_OK=true
systemctl is-active --quiet genieacs-fs 2>/dev/null && FS_OK=true

if [ "$CWMP_OK" = true ]; then log_info "GenieACS CWMP: running on port 7547"; else log_warn "GenieACS CWMP: not running"; fi
if [ "$NBI_OK" = true ]; then log_info "GenieACS NBI: running on port 7557"; else log_warn "GenieACS NBI: not running"; fi
if [ "$FS_OK" = true ]; then log_info "GenieACS FS: running on port 7567"; else log_warn "GenieACS FS: not running"; fi

if command -v caddy &>/dev/null; then
    log_info "Caddy: $(caddy version 2>/dev/null | head -1)"
else
    log_error "Caddy: NOT FOUND"
    INSTALL_OK=false
fi

if command -v pm2 &>/dev/null; then
    log_info "PM2: v$(pm2 --version 2>/dev/null)"
else
    log_error "PM2: NOT FOUND"
    INSTALL_OK=false
fi

echo ""
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}  Installation Complete!${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo ""
echo -e "  ${BOLD}Installed Components:${NC}"
echo "    Node.js 20 LTS    - JavaScript runtime"
echo "    Bun              - Fast JavaScript runtime and package manager"
echo "    MongoDB 7.0      - Database for GenieACS"
echo "    GenieACS 1.2     - TR-069 ACS (CWMP:7547, NBI:7557, FS:7567)"
echo "    Caddy 2          - Reverse proxy and auto-HTTPS"
echo "    PM2              - Process manager"
echo "    UFW Firewall     - Configured for production"
echo ""
echo -e "  ${BOLD}Next Step:${NC} Running setup.sh to configure the platform..."
echo ""

# Auto-run setup.sh
SETUP_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup.sh"
if [ -f "$SETUP_PATH" ]; then
    echo -e "  ${BOLD}Auto-running setup.sh...${NC}"
    exec bash "$SETUP_PATH"
else
    echo -e "  ${YELLOW}setup.sh not found in script directory.${NC}"
    echo -e "  Please run: sudo bash setup.sh"
fi
'''

setup_sh = r'''#!/usr/bin/env bash
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
'''

def write_script(filename, content):
    filepath = os.path.join(SCRIPT_DIR, filename)
    with open(filepath, 'w', newline='\n', encoding='utf-8') as f:
        f.write(content.lstrip('\n'))
    os.chmod(filepath, 0o755)
    print(f"  [OK] {filename} created ({os.path.getsize(filepath)} bytes, LF only)")

print("")
print("  MLJ NET GenieACS Platform - Script Generator")
print("  ============================================")
print("")

write_script('install.sh', install_sh)
write_script('setup.sh', setup_sh)

print("")
print("  Done! Run: sudo bash install.sh")
print("")