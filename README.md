# MLJ NET GenieACS Platform

Hybrid **Node.js + PHP** management platform for TR-069 ACS (GenieACS) — manage ONT/CPE devices, MikroTik routers, PPPoE, and Hotspot from a single dark-themed dashboard.

**Repository:** [https://github.com/mauljasmay/mlj-net-genieacs-platform](https://github.com/mauljasmay/mlj-net-genieacs-platform)

---

## Architecture Overview

This platform uses a **hybrid Node.js + PHP** architecture, where both runtimes share the same SQLite database and authentication system:

```
Internet / CPE Devices
        |
        v
+----------------------------------------------------------+
|  Ubuntu 22.04 Server                                      |
|                                                          |
|  +--------+    +------------------------------------+    |
|  | Caddy  |--> |  Frontend + API (:3000)            |    |
|  | :80/443|    |  Next.js 16 (App Router, TypeScript)|    |
|  |        |    +------------------------------------+    |
|  |        |                                              |
|  |        |    +------------------------------------+    |
|  |        |--> |  PHP API (/api/php/*)              |    |
|  |        |    |  PHP 8.2 + FPM (:9000)             |    |
|  |        |    |  Reports, Backup, Tools, Network   |    |
|  +--------+    +-------------+----------------------+    |
|                               |                          |
|                    +----------+----------+               |
|                    |                     |               |
|              +-----v------+       +-----v------+         |
|              | SQLite     |       | GenieACS   |         |
|              | (shared)   |       | NBI :7557  |         |
|              | users,     |       +-----+------+         |
|              | sessions,  |             |                 |
|              | settings,  |      +------v------+         |
|              | audit      |      | MongoDB     |         |
|              | logs       |      | :27017      |         |
|              +------------+      +-------------+         |
|                                                          |
|  GenieACS CWMP :7547  <--- CPE/ONT Devices               |
|  GenieACS FS   :7567  (firmware files)                   |
+----------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router, TypeScript, React 19) |
| **Node.js API** | Next.js API Routes (auth, devices, users, settings, system) |
| **PHP API** | PHP 8.2 + PHP-FPM (reports, backup, tools, network, diagnostics) |
| **UI** | Tailwind CSS v4, shadcn/ui, Glassmorphism dark theme |
| **State** | Zustand |
| **Database** | SQLite via Prisma ORM (Node.js) + PDO/SQLite3 (PHP) — shared |
| **Auth** | JWT (jose) + bcryptjs (Node.js) / shared session table (PHP) |
| **ACS** | GenieACS 1.2 (CWMP:7547, NBI:7557, FS:7567) |
| **MikroTik** | RouterOS API via node-routeros (Node.js) / native PHP socket |
| **Mobile** | Capacitor 6 (Android/iOS WebView connector) |
| **Reverse Proxy** | Caddy 2 (auto-HTTPS, routes PHP to PHP-FPM) |
| **Process Manager** | PM2 (Node.js), systemd (PHP-FPM, GenieACS, MongoDB) |

---

## Features

- Device management via GenieACS TR-069 / CWMP (Node.js + PHP)
- User management with roles: superadmin, admin, operator, technician, viewer
- System settings with local/remote GenieACS mode
- MikroTik integration (RouterOS API) — PPPoE, Hotspot, interface traffic, ARP
- Network tools: ping, traceroute, DNS lookup, port check (PHP)
- Database backup and restore (PHP)
- Report generation: device inventory, audit logs, user activity (PHP)
- System diagnostics: CPU, RAM, disk, network interfaces (PHP)
- Real-time device status and parameters
- Session-based authentication with brute-force protection
- Audit logging (shared across Node.js and PHP)
- PWA support (installable on mobile/desktop)
- Glassmorphism dark UI with cyan neon highlights
- Auto-healing: database tables created automatically, admin user auto-seeded on first access

---

## Server Requirements (Ubuntu 22.04 LTS)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 2 GB | 4 GB |
| Disk | 10 GB | 20 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Access | Root (sudo) | Root (sudo) |
| Internet | Required (apt, npm, git) | Required |

### Software Installed Automatically by `install.sh`

| Software | Version | Port | Purpose |
|----------|---------|------|---------|
| Node.js | 20 LTS | - | JavaScript runtime (frontend + API) |
| Bun | latest | - | Fast JS runtime & package manager |
| PHP | 8.2 | - | PHP backend API |
| PHP-FPM | 8.2 | 9000 (socket) | PHP FastCGI Process Manager |
| Composer | latest | - | PHP package manager |
| MongoDB | 7.0 | 27017 (localhost only) | GenieACS core database |
| GenieACS | 1.2 | 7547, 7557, 7567 | TR-069 ACS server |
| Caddy | 2 | 80, 443, 3000 | Reverse proxy (Node.js + PHP-FPM) |
| PM2 | latest | - | Node.js process manager |
| UFW | - | - | Firewall (SSH, 80, 443, 3000) |

---

## Full Installation Guide (Ubuntu 22.04)

### Prerequisites

- Fresh or existing **Ubuntu 22.04 LTS** server (physical, VPS, or VM)
- Root access or sudo privileges
- Internet connection (for downloading packages)
- Optional: A domain name pointed to your server IP (for HTTPS via Caddy)

### Step 1: SSH into Your Server

```bash
ssh root@YOUR_SERVER_IP
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/mauljasmay/mlj-net-genieacs-platform.git /root/mljnet-platform
cd /root/mljnet-platform
```

> You can clone to any directory, e.g. `/opt/mljnet-platform` or `/home/user/mljnet-platform`. The scripts auto-detect the project directory.

### Step 3: Regenerate Shell Scripts (Important)

The shell scripts (`install.sh` and `setup.sh`) may get corrupted with CRLF line endings when cloned via Git on some systems. The included `generate-scripts.py` regenerates them with guaranteed Unix LF line endings.

```bash
python3 generate-scripts.py
```

This creates clean `install.sh` and `setup.sh` files. You should see:

```
[OK] install.sh generated (XXX lines)
[OK] setup.sh generated (XXX lines)
```

### Step 4: Run the Installer

```bash
sudo bash install.sh
```

This must be run as root (sudo). The script will:

1. Display your system info (OS, kernel, CPU, RAM, disk)
2. Warn if RAM < 2GB or disk < 10GB

The installer runs **11 steps** automatically:

| Step | What It Does |
|------|-------------|
| 1/11 | Update system packages + add PHP PPA |
| 2/11 | Install Node.js 20 LTS |
| 3/11 | Install Bun runtime |
| 4/11 | Install PHP 8.2 + PHP-FPM + extensions + Composer |
| 5/11 | Install MongoDB 7.0 + configure + start |
| 6/11 | Install GenieACS 1.2 + systemd services |
| 7/11 | Install Caddy 2 (reverse proxy) |
| 8/11 | Install PM2 process manager |
| 9/11 | Configure UFW firewall |
| 10/11 | Optimize system settings (sysctl, limits) |
| 11/11 | Verify all installations |

After step 11 completes, `install.sh` **automatically chains to `setup.sh`**.

### Step 5: Setup Script Runs Automatically

`setup.sh` runs **10 steps** to configure and start the application:

| Step | What It Does |
|------|-------------|
| 1/10 | Ensure services running (MongoDB, GenieACS, PHP-FPM) |
| 2/10 | Install Node.js dependencies (`bun install` / `npm install`) |
| 3/10 | Install PHP dependencies (`composer install` in `php-api/`) |
| 4/10 | Configure `.env` with auto-generated JWT/SESSION secrets |
| 5/10 | Initialize database (Prisma generate + db push) |
| 6/10 | Build Next.js production standalone |
| 7/10 | Configure Caddy (domain/HTTP + PHP-FPM routing) |
| 8/10 | Start with PM2 |
| 9/10 | Create systemd service |
| 10/10 | Final verification (7 service checks) |

### Step 6: Access the Platform

**Without domain (HTTP mode):**
```
http://YOUR_SERVER_IP
```

**With domain (HTTPS mode):**
```
https://yourdomain.com
```

### Step 7: Login

```
Username: superadmin
Password: 110519

Username: admin
Password: admin123
```

> **IMPORTANT:** Change the default passwords immediately after first login via the User Management menu.

---

## API Endpoints

### Node.js API (port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Login |
| GET | `/api/auth` | Check session |
| DELETE | `/api/auth` | Logout |
| GET/POST/PUT/DELETE | `/api/users` | User management |
| GET/POST/DELETE | `/api/devices` | Device management (GenieACS proxy) |
| GET/PUT | `/api/settings` | System settings |
| GET | `/api/system` | Service health check |
| GET/PUT | `/api/mikrotik` | MikroTik configuration |
| GET | `/api/pppoe` | PPPoE active sessions |
| GET | `/api/hotspot` | Hotspot active users |

### PHP API (via Caddy → PHP-FPM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/php/system` | Service health check (PHP) |
| GET | `/api/php/system/info` | System info (CPU, RAM, disk, network) |
| GET | `/api/php/reports/devices` | Device inventory report |
| GET | `/api/php/reports/audit` | Audit log report (filterable) |
| GET | `/api/php/reports/users` | User activity report |
| GET | `/api/php/backup` | List database backups |
| POST | `/api/php/backup` | Create database backup |
| GET | `/api/php/backup/download` | Download latest backup |
| POST | `/api/php/backup/restore` | Restore from backup |
| POST | `/api/php/tools/ping` | Ping a host |
| POST | `/api/php/tools/traceroute` | Traceroute |
| POST | `/api/php/tools/dns` | DNS lookup |
| POST | `/api/php/tools/portcheck` | TCP port check |
| GET | `/api/php/network/pppoe` | PPPoE active sessions |
| GET | `/api/php/network/hotspot` | Hotspot active users |
| GET | `/api/php/network/interfaces` | Interface traffic stats |
| GET | `/api/php/network/arp` | ARP table |
| GET/DELETE | `/api/php/devices/*` | Device management (PHP) |

> All PHP API endpoints use the same session cookie as Node.js. Authentication is shared via the SQLite `Session` table.

---

## Project Structure

```
mlj-net-genieacs-platform/
  src/                            # Node.js source (Next.js)
    app/
      page.tsx                    # Main SPA (all views)
      layout.tsx                  # Root layout
      globals.css                 # Global styles + glassmorphism
      api/                        # Node.js API routes
        auth/route.ts
        users/route.ts
        devices/route.ts
        settings/route.ts
        system/route.ts
        mikrotik/route.ts
        pppoe/route.ts
        hotspot/route.ts
    lib/                          # Node.js shared libraries
      db.ts                       # Prisma + auto table creation
      auth.ts                     # JWT, sessions, brute-force
      genieacs.ts                 # GenieACS NBI client
      mikrotik.ts                 # MikroTik RouterOS client
      seed.ts                     # Default seeder
      device-parser.ts            # TR-069 parameter parser
      utils.ts                    # Utility functions
    store/index.ts                # Zustand state
    components/ui/                # shadcn/ui (40+ components)
    types/index.ts                # TypeScript types
    hooks/                        # use-mobile, use-toast
  php-api/                        # PHP Backend API
    public/index.php              # Router/entry point
    src/
      lib/                        # PHP shared libraries
        config.php                # Configuration (.env reader)
        db.php                    # SQLite3 (shared DB)
        auth.php                  # Session verification (shared)
        genieacs.php              # GenieACS NBI HTTP client
        mikrotik.php              # MikroTik RouterOS socket client
        helpers.php               # UUID, JSON response, formatting
      api/                        # PHP API endpoint handlers
        system.php                # Health check, system info
        reports.php               # Device/audit/user reports
        backup.php                # Database backup/restore
        tools.php                 # Ping, traceroute, DNS, port check
        network.php               # PPPoE, hotspot, interfaces, ARP
        devices.php               # GenieACS device management
    config/.env.example           # PHP env template
    composer.json                 # PHP dependencies
    README.md                     # PHP API documentation
  prisma/
    schema.prisma                 # Database schema (5 models)
  public/                         # Static assets, PWA, icons
  mobile-app/                     # Capacitor 6 native wrapper
  install.sh                      # System installer (11 steps, includes PHP)
  setup.sh                        # App setup (10 steps, includes PHP)
  fix_all.sh                      # Diagnostic & repair script (includes PHP)
  generate-scripts.py             # Script LF-line-ending fixer
  Caddyfile                       # Caddy reverse proxy (Node.js + PHP-FPM)
  ecosystem.config.cjs            # PM2 config
  package.json                    # Node.js dependencies
  README.md                       # This file
```

---

## Environment Variables

All variables are defined in `.env` (auto-generated by `setup.sh`).

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path (shared by Node.js + PHP) |
| `GENIEACS_NBI_URL` | `http://127.0.0.1:7557` | GenieACS NBI API URL |
| `GENIEACS_NBI_USERNAME` | *(empty)* | NBI username |
| `GENIEACS_NBI_PASSWORD` | *(empty)* | NBI password |
| `GENIEACS_CWMP_PORT` | `7547` | CWMP/TR-069 port |
| `GENIEACS_NBI_PORT` | `7557` | NBI API port |
| `GENIEACS_FS_PORT` | `7567` | File server port |
| `JWT_SECRET` | *(auto-generated)* | Secret for JWT token signing |
| `SESSION_SECRET` | *(auto-generated)* | Secret for session encryption |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL |
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | App listen port |
| `MIKROTIK_HOST` | `192.168.1.1` | MikroTik router IP |
| `MIKROTIK_PORT` | `8728` | MikroTik API port |

---

## Development (Local)

### Node.js (Frontend + API)

```bash
git clone https://github.com/mauljasmay/mlj-net-genieacs-platform.git
cd mlj-net-genieacs-platform

bun install
cp .env.example .env
npx prisma generate
npx prisma db push
bun run dev
```

### PHP API

```bash
cd php-api
composer install
cp config/.env.example config/.env
# Edit config/.env as needed

# Run with built-in PHP server (development only)
php -S localhost:9000 -t public

# Or configure PHP-FPM for production
```

---

## Updating to Latest Version

```bash
cd /root/mljnet-platform

# Pull latest code
git pull origin main

# Regenerate clean scripts
python3 generate-scripts.py

# Update Node.js dependencies
bun install
npx prisma generate
npx prisma db push
bun run build
pm2 restart mlj-net

# Update PHP dependencies
cd php-api && composer install --no-interaction && cd ..

# Restart PHP-FPM
systemctl restart php8.2-fpm

# Restart Caddy (picks up new Caddyfile if changed)
systemctl restart caddy
```

### Quick Update (one-liner)

```bash
cd /root/mljnet-platform && git pull && python3 generate-scripts.py && bun install && npx prisma generate && npx prisma db push && bun run build && cd php-api && composer install --no-interaction && cd .. && pm2 restart mlj-net && systemctl restart php8.2-fpm && systemctl restart caddy
```

---

## Useful Commands (Production Server)

### Application (Node.js)

```bash
pm2 logs mlj-net            # View app logs
pm2 restart mlj-net          # Restart
pm2 monit                    # Monitoring dashboard
```

### PHP-FPM

```bash
systemctl status php8.2-fpm    # Status
systemctl restart php8.2-fpm   # Restart
systemctl reload php8.2-fpm    # Reload config (no downtime)
tail -f /var/log/php8.2-fpm-error.log  # Error logs
php8.2 -m                      # List loaded extensions
```

### GenieACS Services

```bash
systemctl status genieacs-cwmp       # CWMP (port 7547)
systemctl status genieacs-nbi        # NBI API (port 7557)
systemctl status genieacs-fs         # File server (port 7567)
systemctl restart genieacs-cwmp      # Restart CWMP
journalctl -u genieacs-nbi -f        # Live NBI logs
```

### MongoDB

```bash
systemctl status mongod             # Status
systemctl restart mongod             # Restart
mongosh --eval 'db.runCommand({ping:1})'  # Test connection
```

### Caddy (Reverse Proxy)

```bash
systemctl status caddy              # Status
systemctl restart caddy             # Restart
cat /etc/caddy/Caddyfile           # View config (includes PHP-FPM routing)
caddy validate --config /etc/caddy/Caddyfile  # Validate
```

### Diagnostic & Repair

```bash
# Diagnose only (no changes)
./fix_all.sh

# Diagnose + auto-fix
./fix_all.sh --fix

# Deep fix (reinstall deps, rebuild)
./fix_all.sh --fix --deep
```

---

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `.env` | Project root | App environment (shared by Node.js + PHP) |
| `php-api/config/.env` | php-api/config/ | PHP-specific overrides |
| `ecosystem.config.cjs` | Project root | PM2 process config |
| `/etc/caddy/Caddyfile` | System | Caddy reverse proxy (Node.js + PHP-FPM) |
| `/etc/php/8.2/fpm/pool.d/mljnet.conf` | System | PHP-FPM pool config |
| `/etc/mongod.conf` | System | MongoDB config |
| `/etc/systemd/system/genieacs-*.service` | System | GenieACS services |
| `/etc/systemd/system/mlj-net.service` | System | MLJ NET auto-start service |
| `/etc/sysctl.d/99-mljnet.conf` | System | Kernel tuning |

---

## Troubleshooting

### PHP-FPM not working

```bash
# Check status
systemctl status php8.2-fpm

# Check socket exists
ls -la /run/php/php8.2-fpm.sock

# Check error log
tail -50 /var/log/php8.2-fpm-error.log

# Restart
systemctl restart php8.2-fpm

# Reinstall if missing
apt install php8.2-fpm php8.2-sqlite3 php8.2-mbstring php8.2-curl php8.2-xml
```

### PHP API returns 500 error

```bash
# Check PHP error log
tail -50 /var/log/php8.2-fpm-error.log

# Check if vendor directory exists
ls -la php-api/vendor/

# Reinstall dependencies
cd php-api && composer install --no-interaction && cd ..

# Check if database is accessible
php8.2 -r "new SQLite3('../db/custom.db'); echo 'DB OK';"
```

### Caddy not routing PHP requests

```bash
# Verify Caddy config has PHP block
cat /etc/caddy/Caddyfile | grep -A5 php

# If missing, re-run setup or add manually
# Then reload Caddy
systemctl reload caddy
```

### MongoDB fails to start

```bash
journalctl -u mongod -n 50 --no-pager
apt install libssl3
chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb
rm -f /var/lib/mongodb/mongod.lock /var/lib/mongodb/WiredTiger.lock
systemctl restart mongod
sysctl -w vm.max_map_count=262144
```

### Login error: "Internal server error" (HTTP 500)

The app has built-in auto-recovery for missing database tables. If it still fails:

```bash
cd /root/mljnet-platform
npx prisma generate
npx prisma db push
pm2 restart mlj-net
pm2 logs mlj-net --lines 30
```

### Run Full Diagnostics

```bash
./fix_all.sh              # Diagnose only
./fix_all.sh --fix        # Diagnose + auto-fix
./fix_all.sh --fix --deep # Deep fix
```

---

## Opening CPE/TR-069 Port for Devices

```bash
ufw allow 7547/tcp
ufw reload
```

Configure CPE/ONT devices to connect to: `http://YOUR_SERVER_IP:7547`

---

## Mobile App

The `mobile-app/` directory contains a Capacitor 6 project for Android/iOS. See [`mobile-app/README.md`](https://github.com/mauljasmay/mlj-net-genieacs-platform/blob/main/mobile-app/README.md) for build instructions.

---

## Security Notes

- Default login is `superadmin/110519` and `admin/admin123` — **change immediately**
- JWT_SECRET and SESSION_SECRET are auto-generated by `setup.sh` with `openssl rand -base64 32`
- MongoDB is bound to `127.0.0.1` only (not exposed)
- GenieACS NBI/FS ports are not opened in UFW by default (localhost only)
- PHP-FPM listens on Unix socket only (not TCP)
- Brute-force protection: 5 failed login attempts per username/IP per 5 minutes
- All API error responses use generic messages (no internal error details leaked)
- Session cookies are `httpOnly` and `sameSite: lax`

---

## License

Private - MLJ NET

---

## Links

- **Repository:** [https://github.com/mauljasmay/mlj-net-genieacs-platform](https://github.com/mauljasmay/mlj-net-genieacs-platform)
- **Issues:** [https://github.com/mauljasmay/mlj-net-genieacs-platform/issues](https://github.com/mauljasmay/mlj-net-genieacs-platform/issues)
- **GenieACS Docs:** [https://genieacs.com/docs/](https://genieacs.com/docs/)