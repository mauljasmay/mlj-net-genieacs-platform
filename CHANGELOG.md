# Changelog

All notable changes to the MLJ NET GenieACS Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to Semantic Versioning.

## [1.0.0] - 2025-07-21

### Added
- **TR-069 / GenieACS Integration**: Full NBI API proxy with device management, task execution, fault monitoring
- **Device Management**: Device list, detail view, reboot, refresh, factory reset, parameter viewing, tag management
- **Task Management**: Create, delete, retry tasks; view pending/completed/failed tasks
- **Fault Center**: View and clear device faults with severity indicators
- **Presets / Provisions / Virtual Parameters**: Full CRUD for GenieACS configuration objects
- **File Management**: Upload and manage firmware/config files via GenieACS File Server
- **MikroTik Integration**: RouterOS API connection config, PPPoE management, Hotspot user management
- **PPPoE Management**: Active sessions list, secrets CRUD, profiles CRUD
- **Hotspot Management**: Users, profiles, servers, active connections management
- **User Management**: Create/delete users with 9 roles and 31 granular permissions
- **Role System**: superadmin, admin, operator, technician, multi_talent, mikrotik, pppoe, hotspot, viewer
- **Server Mode**: Local or Remote GenieACS connection with unified host + port configuration
- **System Status**: Real-time service health monitoring (NBI, CWMP, FS)
- **Authentication**: JWT session-based auth with bcryptjs password hashing, brute-force protection
- **Audit Logging**: Track all user actions with IP, user agent, and timestamps
- **Dashboard**: Device statistics, online/offline counts, manufacturer/model charts, recent devices
- **Dark Glassmorphism Theme**: Cyan neon highlights on dark navy background
- **PWA Support**: Service worker, manifest, iOS meta tags, offline capability
- **Mobile App (Capacitor)**: Android/iOS wrapper with server connector UI
- **Deployable Package**: install.sh + setup.sh for Ubuntu 22.04 with detailed progress
- **Version Display**: App version shown in sidebar

### Fixed
- **Settings Save**: Fixed 403 error — now allows admin role (not just superadmin)
- **Settings Save**: Added transaction wrapping for atomic multi-key saves
- **Settings Save**: Proper category/type assignment for new settings keys
- **Password Change**: Added oldPassword verification (previously ignored by API)
- **Password Change**: Any authenticated user can now change own password (not just superadmin)
- **MikroTik Save**: Empty password no longer overwrites stored password
- **MikroTik Save**: Masked password (••••••••) is stripped before sending to API
- **PPPoE/Hotspot Edit**: Non-string (numeric) fields are now preserved during edit
- **All Save Buttons**: Show actual error messages from API instead of generic "Failed"
- **PPPoE/Hotspot Auth**: Added role-based permission checks (pppoe.view/manage, hotspot.view/manage)
- **Settings Remote UI**: Merged 4 URL inputs into 1 host input + 4 port fields with auto-generated URLs
- **GenericListView**: Fixed double `res.json()` consumption causing errors
- **Signal Bars**: Fixed `Math.abs()` inversion on signal strength display
- **VP Delete**: Fixed parameter name mismatch (virtualParameterId vs vpId)
- **UserSession Type**: Removed extra `userId` field causing type errors
- **28 additional bug fixes** from initial audit pass