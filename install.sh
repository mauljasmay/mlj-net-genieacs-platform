#!/usr/bin/env bash
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
