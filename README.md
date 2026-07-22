# MLJ NET GenieACS Platform

Unified management panel for TR-069 ACS (GenieACS) — manage ONT/CPE devices, MikroTik routers, PPPoE, and Hotspot from a single dark-themed dashboard.

**Repository:** [https://github.com/mauljasmay/mlj-net-genieacs-platform](https://github.com/mauljasmay/mlj-net-genieacs-platform)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | Tailwind CSS v4, shadcn/ui, Glassmorphism dark theme |
| State | Zustand |
| Database | SQLite via Prisma ORM (auto-creates tables at runtime) |
| Auth | JWT (jose) + bcryptjs, brute-force protection |
| API | Next.js API Routes (proxy to GenieACS NBI) |
| ACS | GenieACS 1.2 (CWMP:7547, NBI:7557, FS:7567) |
| Mobile | Capacitor 6 (Android/iOS WebView connector) |
| Reverse Proxy | Caddy 2 (auto-HTTPS) |
| Process Manager | PM2 |

## Features

- Device management via GenieACS TR-069 / CWMP
- User management with roles: superadmin, admin, operator, technician, viewer
- System settings with local/remote GenieACS mode
- MikroTik integration (RouterOS API)
- PPPoE & Hotspot management
- Real-time device status and parameters
- Session-based authentication with brute-force protection
- Audit logging
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
| Node.js | 20 LTS | - | JavaScript runtime |
| Bun | latest | - | Fast JS runtime & package manager |
| MongoDB | 7.0 | 27017 (localhost only) | GenieACS core database |
| GenieACS | 1.2 | 7547, 7557, 7567 | TR-069 ACS server |
| Caddy | 2 | 80, 443, 3000 | Reverse proxy & auto-HTTPS |
| PM2 | latest | - | Process manager |
| UFW | - | - | Firewall (SSH, 80, 443, 3000) |

---

## Full Installation Guide (Ubuntu 22.04)

### Prerequisites

- Fresh or existing **Ubuntu 22.04 LTS** server (physical, VPS, or VM)
- Root access or sudo privileges
- Internet connection (for downloading packages from apt, npm, GitHub)
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
[OK] install.sh generated (491 lines)
[OK] setup.sh generated (486 lines)
```

> **Why is this needed?** Git on Windows/Mac may convert line endings to CRLF, which breaks bash parsing on Linux. The Python script writes files with `newline='\n'` to prevent this.

### Step 4: Run the Installer

```bash
sudo bash install.sh
```

This must be run as root (sudo). The script will:

1. Display your system info (OS, kernel, CPU, RAM, disk)
2. Warn if RAM < 2GB or disk < 10GB

The installer runs **10 steps** automatically:

| Step | What It Does | Details |
|------|-------------|--------|
| 1/10 | Update system packages | Removes broken `ondrej/php` PPA if present, runs `apt-get update --allow-releaseinfo-change`, upgrades packages, installs basic utilities (curl, wget, git, unzip, jq, ufw, etc.) |
| 2/10 | Install Node.js 20 LTS | Adds NodeSource repository, installs `nodejs` (skips if already installed) |
| 3/10 | Install Bun runtime | Downloads via `curl -fsSL https://bun.sh/install`, symlinks to `/usr/local/bin/bun` |
| 4/10 | Install MongoDB 7.0 | Adds MongoDB GPG key + repository, installs `mongodb-org`, creates `/etc/mongod.conf` (bind `127.0.0.1:27017`, no auth), starts + enables service |
| 5/10 | Install GenieACS 1.2 | `npm install -g genieacs@1.2.x`, creates `genieacs` system user, creates data dirs (`/var/lib/genieacs/`, `/var/log/genieacs/`), creates 3 systemd services |
| 6/10 | Install Caddy 2 | Adds Caddy repository, installs `caddy` reverse proxy |
| 7/10 | Install PM2 | `npm install -g pm2`, configures PM2 startup for systemd |
| 8/10 | Configure UFW firewall | Allows SSH, 80, 443, 3000; enables firewall |
| 9/10 | Optimize system settings | Creates `/etc/sysctl.d/99-mljnet.conf` (file-max, tcp tuning, vm.max_map_count for MongoDB), sets file descriptor limits to 65535 |
| 10/10 | Verify installations | Checks all components are installed and running, displays summary |

After step 10 completes, `install.sh` **automatically chains to `setup.sh`**.

### Step 5: Setup Script Runs Automatically

`setup.sh` runs **9 steps** to configure and start the application:

| Step | What It Does | Details |
|------|-------------|--------|
| 1/9 | Ensure services running | Checks MongoDB (with `fix_mongodb()` auto-fix: removes stale locks, fixes permissions, recreates config, installs `libssl3`, 3 retry attempts) and starts GenieACS CWMP/NBI/FS |
| 2/9 | Install dependencies | Runs `bun install` (or `npm install` if bun not available) |
| 3/9 | Configure environment | Creates `.env` with auto-generated `JWT_SECRET` and `SESSION_SECRET` (via `openssl rand -base64 32`), sets `DATABASE_URL`, GenieACS ports, etc. |
| 4/9 | Initialize database | `npx prisma generate`, `npx prisma db push --force-reset` (creates SQLite tables), `npx prisma db seed` (creates admin user + default settings) |
| 5/9 | Build Next.js | Runs `bun run build` (or `npm run build`), copies static assets and `public/` into `.next/standalone/`. **Skips if `.next/standalone/server.js` already exists** (incremental friendly) |
| 6/9 | Configure Caddy | Prompts for domain name. If provided: configures auto-HTTPS. If empty: configures HTTP-only mode on ports 80 and 3000. |
| 7/9 | Start with PM2 | Creates `ecosystem.config.cjs` (fork mode, 512MB max memory, logs to `./logs/`), starts `mlj-net` process |
| 8/9 | Systemd service | Creates `/etc/systemd/system/mlj-net.service` for auto-start on boot |
| 9/9 | Final verification | Checks all 6 services, displays access URLs and default login credentials |

### Step 6: Access the Platform

After setup completes, the script displays your access URL:

**Without domain (HTTP mode):**
```
http://YOUR_SERVER_IP
http://YOUR_SERVER_IP:3000
```

**With domain (HTTPS mode):**
```
https://yourdomain.com
```

Open the URL in your browser (Chrome, Firefox, Safari, etc.)

### Step 7: Login

```
Username: superadmin
Password: 110519

Username: admin
Password: admin123
```

> **IMPORTANT:** Change the default passwords immediately after first login via the User Management menu.

### What You Should See

After successful login, you'll see the main dashboard with:
- Left sidebar with navigation menu (Dashboard, Devices, Users, Settings, etc.)
- System status panel showing MongoDB, GenieACS CWMP/NBI/FS, and Dashboard status
- Dark glassmorphism theme with cyan neon highlights

---

## Updating to Latest Version

When a new version is released on GitHub, update your deployment:

```bash
cd /root/mljnet-platform

# Pull latest code
git pull origin main

# Regenerate clean scripts (in case they changed)
python3 generate-scripts.py

# Install any new dependencies
bun install

# Regenerate Prisma client (if schema changed)
npx prisma generate

# Re-sync database schema (safe, only adds new tables/columns)
npx prisma db push

# Rebuild the Next.js standalone production build
bun run build

# Restart the application
pm2 restart mlj-net
```

> **Note:** If you only changed API/lib code (no schema changes), you can skip the `prisma` commands. If no new dependencies were added, you can skip `bun install`.

### Quick Update (one-liner)

```bash
cd /root/mljnet-platform && git pull && python3 generate-scripts.py && bun install && npx prisma generate && npx prisma db push && bun run build && pm2 restart mlj-net
```

---

## Architecture Overview

```
Internet / CPE Devices
        |
        v
+--------------------------------------------------+
|  Ubuntu 22.04 Server                               |
|                                                   |
|  +--------+    +-----------------------------+     |
|  | Caddy  |--> |  MLJ NET Platform (:3000)   |     |
|  | :80/443|    |  Next.js Standalone + PM2   |     |
|  +--------+    +-------------+---------------+     |
|                               |                     |
|                    +----------+----------+          |
|                    |                     |          |
|              +-----v------+       +-----v------+    |
|              | SQLite     |       | GenieACS   |    |
|              | (users,    |       | NBI :7557  |    |
|              |  sessions, |       +-----+------+    |
|              |  settings) |             |          |
|              +------------+      +-----v------+    |
|                                    | MongoDB   |    |
|                              +-----v--------+---+ |
|                              | MongoDB :27017    | |
|                              +-------------------+ |
|                                                   |
|  GenieACS CWMP :7547  <--- CPE/ONT Devices        |
|  GenieACS FS   :7567  (firmware files)             |
+--------------------------------------------------+
```

---

## Environment Variables

All variables are defined in `.env` (auto-generated by `setup.sh`, or copy from [`.env.example`](https://github.com/mauljasmay/mlj-net-genieacs-platform/blob/main/.env.example)).

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path (relative paths auto-resolved to absolute at runtime) |
| `GENIEACS_NBI_URL` | `http://127.0.0.1:7557` | GenieACS NBI API URL |
| `GENIEACS_NBI_USERNAME` | *(empty)* | NBI username (if authentication enabled) |
| `GENIEACS_NBI_PASSWORD` | *(empty)* | NBI password (if authentication enabled) |
| `GENIEACS_CWMP_PORT` | `7547` | CWMP/TR-069 port for CPE connections |
| `GENIEACS_NBI_PORT` | `7557` | NBI API port |
| `GENIEACS_FS_PORT` | `7567` | File server port |
| `GENIEACS_DASHBOARD_PORT` | `3000` | Dashboard port |
| `JWT_SECRET` | *(auto-generated)* | Secret for JWT token signing |
| `SESSION_SECRET` | *(auto-generated)* | Secret for session encryption |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL |
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | App listen port |

---

## Project Structure

```
mlj-net-genieacs-platform/
  src/
    app/
      page.tsx                # Main SPA (all views: login, dashboard, devices, etc.)
      layout.tsx              # Root layout (metadata, fonts)
      globals.css             # Global styles + glassmorphism theme
      api/
        auth/route.ts         # POST login, GET session, DELETE logout
        users/route.ts        # GET/POST/PUT/DELETE user management
        devices/route.ts      # Device list, refresh, tasks (proxies to GenieACS NBI)
        settings/route.ts     # GET/PUT system settings
        system/route.ts       # GET service health check
        mikrotik/route.ts     # GET/PUT MikroTik router config
        pppoe/route.ts        # GET PPPoE active sessions (via MikroTik)
        hotspot/route.ts      # GET Hotspot active users (via MikroTik)
    lib/
      db.ts                   # Prisma client + auto table creation + path resolver
      auth.ts                 # JWT, sessions, brute-force, audit logging
      genieacs.ts             # GenieACS NBI API client with caching
      seed.ts                 # Default admin + settings seeder
      device-parser.ts        # Device parameter parser for TR-069 data
      mikrotik.ts             # RouterOS API wrapper (SSH-based)
      utils.ts                # Utility functions
    store/
      index.ts                # Zustand global state management
    components/ui/            # shadcn/ui component library (40+ components)
    hooks/                    # use-mobile, use-toast
    types/
      index.ts                # TypeScript type definitions, roles, permissions
  prisma/
    schema.prisma             # Database schema (SQLite) - 5 models
  public/                     # Static assets, PWA manifest, icons, favicon
  mobile-app/                 # Capacitor 6 Android/iOS native wrapper
  install.sh                  # System dependency installer (10 steps)
  setup.sh                    # App configuration & build (9 steps)
  generate-scripts.py         # Regenerates install.sh + setup.sh with clean LF
  .env.example                # Template environment variables
  Caddyfile                   # Caddy reverse proxy config template
  package.json                # Dependencies and scripts
  next.config.ts              # Next.js config (standalone output)
  tailwind.config.ts          # Tailwind CSS v4 configuration
  tsconfig.json               # TypeScript configuration
```

---

## Development (Local)

```bash
# Clone
https://github.com/mauljasmay/mlj-net-genieacs-platform.git
cd mlj-net-genieacs-platform

# Install dependencies
bun install

# Setup database
cp .env.example .env        # Edit .env as needed
npx prisma generate
npx prisma db push

# Run development server (hot reload on port 3000)
bun run dev
```

### Development Build

```bash
# Production build
bun run build

# Start production server
bun run start

# Or use PM2
pm2 start ecosystem.config.cjs
```

---

## Useful Commands (Production Server)

### Application

```bash
pm2 logs mlj-net            # View real-time app logs
pm2 logs mlj-net --lines 50 # Last 50 lines
pm2 restart mlj-net          # Restart application
pm2 stop mlj-net             # Stop application
pm2 start mlj-net            # Start application
pm2 monit                    # Interactive monitoring dashboard
```

### GenieACS Services

```bash
systemctl status genieacs-cwmp       # CWMP service (port 7547)
systemctl status genieacs-nbi        # NBI API (port 7557)
systemctl status genieacs-fs         # File server (port 7567)
systemctl restart genieacs-cwmp     # Restart CWMP
systemctl restart genieacs-nbi      # Restart NBI
journalctl -u genieacs-nbi -f       # Live NBI logs
journalctl -u genieacs-cwmp -f      # Live CWMP logs
```

### MongoDB

```bash
systemctl status mongod             # MongoDB status
systemctl restart mongod             # Restart MongoDB
journalctl -u mongod -f              # Live MongoDB logs
mongosh --eval 'db.runCommand({ping:1})'  # Test connection
```

### Caddy (Reverse Proxy)

```bash
systemctl status caddy              # Caddy status
systemctl restart caddy             # Restart Caddy
cat /etc/caddy/Caddyfile           # View current config
```

### SQLite Database

```bash
npx prisma studio                   # Open database browser (port 5555)
ls -la db/                           # Check database files
npx prisma db push                   # Re-sync schema
```

### Firewall (UFW)

```bash
ufw status                           # Check firewall rules
ufw allow 7547/tcp                   # Open CWMP port for CPE devices
ufw status numbered                   # Show rules with line numbers
```

### Logs

```bash
pm2 logs mlj-net                    # App logs (PM2)
tail -f logs/pm2-error.log          # PM2 error log file
tail -f logs/pm2-out.log             # PM2 output log file
cat /var/log/genieacs/cwmp.log       # GenieACS CWMP log
cat /var/log/mongodb/mongod.log     # MongoDB log
journalctl -u mlj-net -f            # Systemd service log
```

---

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `.env` | Project root | App environment variables (DATABASE_URL, JWT_SECRET, ports) |
| `ecosystem.config.cjs` | Project root | PM2 process configuration |
| `/etc/caddy/Caddyfile` | System | Caddy reverse proxy (HTTP/HTTPS) |
| `/etc/mongod.conf` | System | MongoDB configuration |
| `/etc/systemd/system/genieacs-*.service` | System | GenieACS systemd services (CWMP, NBI, FS) |
| `/etc/systemd/system/mlj-net.service` | System | MLJ NET auto-start service |
| `/etc/sysctl.d/99-mljnet.conf` | System | Kernel tuning (file-max, tcp, vm.max_map_count) |
| `/etc/security/limits.d/99-mljnet.conf` | System | File descriptor limits (65535) |

---

## Troubleshooting

### MongoDB fails to start

```bash
# Check error logs
journalctl -u mongod -n 50 --no-pager
cat /var/log/mongodb/mongod.log

# Fix 1: Missing SSL library
apt install libssl3

# Fix 2: Permission issue
chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb
chmod 755 /var/lib/mongodb /var/log/mongodb

# Fix 3: Stale lock files
rm -f /var/lib/mongodb/mongod.lock /var/lib/mongodb/WiredTiger.lock
systemctl restart mongod

# Fix 4: Kernel parameter
sysctl -w vm.max_map_count=262144

# Fix 5: Out of memory - add swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Login error: "Internal server error" (HTTP 500)

The most common cause is missing database tables. The app now has built-in auto-recovery:

1. **Auto table creation** — `db.ts` detects missing tables and creates them via raw SQL automatically
2. **Auto admin seed** — If the `admin` user doesn't exist, it's created automatically on first session check
3. **Safe brute-force** — If the `LoginAttempt` table is missing, login proceeds without rate limiting instead of crashing

If you still get errors:

```bash
# Manually re-initialize the database
cd /root/mljnet-platform
npx prisma generate
npx prisma db push
npx prisma db seed
pm2 restart mlj-net

# Check app logs for the actual error
pm2 logs mlj-net --lines 30
```

### Login error: "Unable to open the database file" (Error code 14)

The database path is auto-resolved to an absolute path at runtime via `path.resolve(process.cwd(), dbPath)` in `src/lib/db.ts`. This handles PM2, standalone, npm, and bun launch methods.

If it still fails:

```bash
# Ensure db directory exists
mkdir -p db

# Set absolute path in .env
echo 'DATABASE_URL="file:/root/mljnet-platform/db/custom.db"' >> .env
pm2 restart mlj-net
```

### Script syntax error (`syntax error near unexpected token`)

This happens when shell scripts have CRLF line endings from Git/file transfer:

```bash
# Fix: regenerate clean scripts
python3 generate-scripts.py

# Alternative: convert existing files
dos2unix install.sh setup.sh
```

### GenieACS services not starting

```bash
# Check individual service
systemctl status genieacs-cwmp
journalctl -u genieacs-cwmp -n 30 --no-pager

# Restart all GenieACS services
systemctl restart genieacs-cwmp genieacs-nbi genieacs-fs

# Check if MongoDB is running (GenieACS depends on it)
systemctl status mongod

# Recreate GenieACS user and directories
useradd -r -s /bin/false -d /var/lib/genieacs genieacs 2>/dev/null || true
mkdir -p /var/lib/genieacs/{cwmp,nbi,fs,public} /var/log/genieacs
chown -R genieacs:genieacs /var/lib/genieacs /var/log/genieacs
```

### Caddy not proxying correctly

```bash
# Check Caddy status
systemctl status caddy

# View current config
cat /etc/caddy/Caddyfile

# Validate config
caddy validate --config /etc/caddy/Caddyfile

# Check if port 3000 is responding
curl -I http://localhost:3000

# Restart Caddy
systemctl restart caddy
```

### PM2 process keeps restarting

```bash
# Check error logs
pm2 logs mlj-net --err --lines 50

# Check memory usage
pm2 monit

# Increase memory limit (edit ecosystem.config.cjs)
# max_memory_restart: '1G'  (default is 512M)

# Check disk space
df -h

# Check if port 3000 is already in use
ss -tlnp | grep 3000
```

---

## Opening CPE/TR-069 Port for Devices

By default, the firewall only allows SSH, HTTP, HTTPS, and port 3000. To accept TR-069 connections from CPE/ONT devices on port 7547:

```bash
ufw allow 7547/tcp
ufw reload
```

Then configure your CPE/ONT devices to connect to:
```
http://YOUR_SERVER_IP:7547
```

---

## Mobile App

The `mobile-app/` directory contains a Capacitor 6 project that creates a native Android/iOS wrapper app. The app acts as a WebView connector — users enter the server URL and the app loads the platform in a native shell.

See [`mobile-app/README.md`](https://github.com/mauljasmay/mlj-net-genieacs-platform/blob/main/mobile-app/README.md) for build instructions.

---

## Security Notes

- Default login is `admin` / `admin123` — **change immediately** after first login
- JWT_SECRET and SESSION_SECRET are auto-generated by `setup.sh` with `openssl rand -base64 32`
- MongoDB is bound to `127.0.0.1` only (not exposed to the network)
- GenieACS NBI and FS ports are not opened in UFW by default (localhost only)
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
