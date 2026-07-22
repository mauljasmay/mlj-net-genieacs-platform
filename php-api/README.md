# MLJ NET PHP API

PHP backend API that runs alongside the Node.js (Next.js) frontend. Both share the same SQLite database and authentication system.

## Architecture

```
Caddy (Port 80/443)
  |
  +-- /api/php/*  -->  PHP-FPM (:9000)  --> php-api/public/index.php
  |
  +-- /*          -->  Next.js (:3000)  --> Frontend + Node.js API routes
```

## Setup

```bash
cd php-api

# Install PHP dependencies
composer install

# The API reads .env from config/ or falls back to parent project .env
# No additional configuration needed if Node.js .env exists
```

## API Endpoints

All endpoints require authentication via the `session` cookie (shared with Node.js).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/php/system` | Service health check |
| GET | `/api/php/system/info` | System info (CPU, RAM, disk, network) |
| GET | `/api/php/reports/devices` | Device inventory report |
| GET | `/api/php/reports/audit` | Audit log report (with filters) |
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
| GET | `/api/php/network/interfaces` | Interface traffic |
| GET | `/api/php/network/arp` | ARP table |
| GET | `/api/php/devices` | List GenieACS devices |
| GET | `/api/php/devices/:id` | Device details + parameters |
| DELETE | `/api/php/devices/:id` | Delete device |
| POST | `/api/php/devices/:id/task` | Create device task |
| GET | `/api/php/devices/tasks` | List all tasks |
| DELETE | `/api/php/devices/tasks/:id` | Delete task |

## Shared with Node.js

- **Database**: Same SQLite file (`db/custom.db`)
- **Auth**: Same session tokens in the `Session` table
- **Settings**: Same `SystemSetting` table for GenieACS/MikroTik config
- **Audit**: Same `AuditLog` table