# MLJ NET GenieACS Platform

Unified management panel for TR-069 ACS (GenieACS) — manage ONT/CPE devices, MikroTik routers, PPPoE, and Hotspot from a single dark-themed dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | Tailwind CSS v4, shadcn/ui, Glassmorphism dark theme |
| State | Zustand |
| Database | SQLite via Prisma ORM |
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

## Server Requirements (Ubuntu 22.04)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 2 GB | 4 GB |
| Disk | 10 GB | 20 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Dependencies Installed by `install.sh`

| Software | Version | Port | Purpose |
|----------|---------|------|---------|
| Node.js | 20 LTS | - | JavaScript runtime |
| Bun | latest | - | Fast JS runtime & package manager |
| MongoDB | 7.0 | 27017 (local) | GenieACS core database |
| GenieACS | 1.2 | 7547, 7557, 7567 | TR-069 ACS server |
| Caddy | 2 | 80, 443, 3000 | Reverse proxy & auto-HTTPS |
| PM2 | latest | - | Process manager |
| UFW | - | - | Firewall |

## Quick Install

### Option A: Full ZIP (includes node_modules + .next build)

```bash
# 1. Upload ZIP to server
scp mlj-net-genieacs-platform-full-*.zip root@your-server:~/

# 2. SSH into server and extract
ssh root@your-server
unzip mlj-net-genieacs-platform-full-*.zip -d ~/mljnet-platform
cd ~/mljnet-platform

# 3. Regenerate clean scripts (prevents CRLF issues from file transfer)
python3 generate-scripts.py

# 4. Run installer (installs system deps, then auto-chains to setup.sh)
sudo bash install.sh
```

### Option B: Source ZIP (no node_modules, builds on server)

```bash
scp mlj-net-genieacs-platform-*.zip root@your-server:~/
ssh root@your-server
unzip mlj-net-genieacs-platform-*.zip -d ~/mljnet-platform
cd ~/mljnet-platform
python3 generate-scripts.py
sudo bash install.sh
```

### What the scripts do

**`install.sh`** (10 steps):
1. Fix broken PPA repos (e.g. ondrej/php) + update packages
2. Install Node.js 20 LTS
3. Install Bun runtime
4. Install MongoDB 7.0 + configure
5. Install GenieACS 1.2 + create systemd services
6. Install Caddy web server
7. Install PM2 process manager
8. Configure UFW firewall (SSH, 80, 443, 3000)
9. Optimize kernel parameters (sysctl, file descriptors)
10. Verify all installations

**`setup.sh`** (9 steps, auto-chains from install.sh):
1. Ensure MongoDB & GenieACS services are running (with auto-fix)
2. Install npm/bun dependencies
3. Create `.env` with auto-generated JWT secret
4. Initialize Prisma + SQLite + seed admin user
5. Build Next.js standalone (skips if `.next/standalone/server.js` exists)
6. Configure Caddy reverse proxy (HTTPS with domain or HTTP mode)
7. Start application with PM2
8. Create systemd service for auto-start on boot
9. Final verification & display access info

### Default Login

```
Username: admin
Password: admin123
```

Change immediately after first login.

## Development

```bash
# Install dependencies
bun install

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# Run development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start
```

## Project Structure

```
mlj-net-genieacs-platform/
  src/
    app/
      page.tsx              # Main SPA (all views)
      layout.tsx            # Root layout
      globals.css           # Global styles + glassmorphism theme
      api/
        auth/route.ts       # Login/logout/session
        users/route.ts      # User CRUD
        devices/route.ts    # Device management
        settings/route.ts   # System settings
        system/route.ts     # System info
        mikrotik/route.ts   # MikroTik integration
        pppoe/route.ts      # PPPoE management
        hotspot/route.ts    # Hotspot management
    lib/
      db.ts                 # Prisma client (auto-creates db/ dir)
      auth.ts               # JWT, sessions, brute-force
      genieacs.ts           # GenieACS NBI API client
      seed.ts               # Default admin + settings seeder
      device-parser.ts      # Device parameter parser
      mikrotik.ts           # RouterOS API wrapper
      utils.ts              # Utility functions
    store/
      index.ts              # Zustand global state
    components/ui/          # shadcn/ui components
    hooks/                  # Custom React hooks
    types/
      index.ts              # TypeScript type definitions
  prisma/
    schema.prisma           # Database schema (SQLite)
  public/                   # Static assets, PWA icons
  mobile-app/               # Capacitor 6 Android/iOS app
  install.sh                # System dependency installer
  setup.sh                  # App configuration & build
  generate-scripts.py       # Regenerates install.sh/setup.sh with clean LF
  ecosystem.config.cjs      # PM2 process config
  Caddyfile                 # Caddy reverse proxy config
```

## Accessing the Platform

After installation:

| URL | Description |
|-----|-------------|
| `http://SERVER_IP` | Main panel (via Caddy on port 80) |
| `http://SERVER_IP:3000` | Direct access (bypass Caddy) |
| `http://SERVER_IP:3000/genieacs/` | GenieACS Dashboard (if proxied) |

## Useful Commands

```bash
# Application
pm2 logs mlj-net          # View app logs
pm2 restart mlj-net        # Restart app
pm2 stop mlj-net           # Stop app

# GenieACS
systemctl status genieacs-cwmp    # CWMP service (port 7547)
systemctl status genieacs-nbi     # NBI API (port 7557)
systemctl status genieacs-fs      # File server (port 7567)
journalctl -u genieacs-nbi -f     # Live NBI logs

# Database
systemctl status mongod           # MongoDB status
journalctl -u mongod -f           # Live MongoDB logs

# Reverse Proxy
systemctl status caddy            # Caddy status
cat /etc/caddy/Caddyfile          # View Caddy config

# Firewall
ufw status                        # Check firewall rules
ufw allow 7547/tcp                # Open CWMP port for CPEs
```

## Troubleshooting

### MongoDB fails to start
```bash
journalctl -u mongod -n 50 --no-pager
# Common fixes:
chown -R mongodb:mongodb /var/lib/mongodb   # Permission fix
apt install libssl3                           # Missing SSL lib
sysctl -w vm.max_map_count=262144            # Kernel parameter
```

### Login error: "Unable to open the database file" (Error code 14)
Fixed in `src/lib/db.ts` — the database path is now auto-resolved to an absolute path at runtime using `path.resolve(process.cwd(), dbPath)`. This ensures SQLite always finds the database file regardless of how the app is started (PM2, standalone, npm, bun).

If you still encounter this error after updating `db.ts`:
```bash
# Check that the db directory exists at the project root
ls -la db/

# Manually ensure it exists
mkdir -p db

# Re-sync the schema
npx prisma db push
npx prisma db seed
pm2 restart mlj-net
```

> **Tip**: You can set an absolute path in `.env` to be explicit:
> `DATABASE_URL="file:/root/mljnet-platform/db/custom.db"`

### Script syntax error after download
File transfer may introduce CRLF line endings. Fix:
```bash
python3 generate-scripts.py   # Regenerates clean LF scripts
# or:
dos2unix install.sh setup.sh
```

### CRLF corruption in shell scripts
The `generate-scripts.py` script creates `install.sh` and `setup.sh` with guaranteed Unix LF line endings. Always run it on the server before executing the scripts.

## Mobile App

The `mobile-app/` directory contains a Capacitor 6 project that creates a native Android/iOS app. The app acts as a WebView connector - users enter the server URL and the app loads the platform.

See `mobile-app/README.md` for build instructions.

## License

Private - MLJ NET