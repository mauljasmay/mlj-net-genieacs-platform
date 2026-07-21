export type UserRole = 'superadmin' | 'admin' | 'operator' | 'technician' | 'multi_talent' | 'mikrotik' | 'pppoe' | 'hotspot' | 'viewer';

export interface UserSession {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  permissions: Record<string, boolean>;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: UserSession;
  error?: string;
}

export interface DeviceInfo {
  _id: string;
  _registered: string;
  _lastInform: string;
  _lastBoot: string;
  _lastBootstrap: string;
  _tags: string[];
  _deviceId: {
    _Manufacturer: string;
    _OUI: string;
    _ProductClass: string;
    _SerialNumber: string;
  };
  InternetGatewayDevice?: Record<string, any>;
  Device?: Record<string, any>;
}

export interface ParsedDevice {
  id: string;
  serialNumber: string;
  manufacturer: string;
  oui: string;
  productClass: string;
  model: string;
  firmwareVersion: string;
  hardwareVersion: string;
  lastInform: string;
  lastBoot: string;
  online: boolean;
  tags: string[];
  ipAddress: string;
  uptime: number;
  rxPower: number | null;
  txPower: number | null;
  temperature: number | null;
  ssid: string;
  connectedDevices: number;
  ppoeUsername: string;
  ppoeIP: string;
  ppoePassword: string;
  wanType: string;
  ponMode: string;
  macAddress: string;
}

export interface TaskInfo {
  _id: string;
  device: string;
  name: string;
  timestamp: string;
  status?: string;
  fault?: {
    faultCode: string;
    faultString: string;
    detail?: string;
  };
}

export interface FaultInfo {
  _id: string;
  device: string;
  timestamp: string;
  code: string;
  message: string;
  detail?: string;
  severity: 'critical' | 'warning' | 'informational';
}

export interface PresetInfo {
  _id: string;
  name: string;
  channel: string;
  preConditions?: any;
  config?: any;
  provisions?: string[];
}

export interface ProvisionInfo {
  _id: string;
  name: string;
  type?: string;
  script?: string;
}

export interface VirtualParameterInfo {
  _id: string;
  name: string;
  script?: string;
  reference?: string;
}

export interface FileInfo {
  _id: string;
  _uploadedAt: string;
  fileType: string;
  fileName: string;
  metadata?: Record<string, any>;
  length?: number;
}

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  activeOnt: number;
  inactiveOnt: number;
  totalFaults: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  pppoeActive: number;
  pppoeSecrets: number;
  hotspotUsers: number;
  hotspotActive: number;
  devicesByManufacturer: Record<string, number>;
  devicesByModel: Record<string, number>;
  devicesByFirmware: Record<string, number>;
  recentDevices: ParsedDevice[];
}

export interface SystemServiceStatus {
  name: string;
  port: number;
  status: 'online' | 'offline' | 'warning';
  responseTime?: number;
  uptime?: string;
}

export interface Permission {
  key: string;
  label: string;
  category: string;
}

export const PERMISSIONS: Permission[] = [
  { key: 'devices.view', label: 'View Devices', category: 'Devices' },
  { key: 'devices.edit', label: 'Edit Devices', category: 'Devices' },
  { key: 'devices.delete', label: 'Delete Devices', category: 'Devices' },
  { key: 'devices.task', label: 'Execute Tasks', category: 'Devices' },
  { key: 'devices.reboot', label: 'Reboot Devices', category: 'Devices' },
  { key: 'devices.refresh', label: 'Refresh Devices', category: 'Devices' },
  { key: 'devices.provision', label: 'Provision Devices', category: 'Devices' },
  { key: 'devices.diagnostic', label: 'Run Diagnostics', category: 'Devices' },
  { key: 'tasks.view', label: 'View Tasks', category: 'Tasks' },
  { key: 'tasks.create', label: 'Create Tasks', category: 'Tasks' },
  { key: 'tasks.delete', label: 'Delete Tasks', category: 'Tasks' },
  { key: 'presets.view', label: 'View Presets', category: 'Presets' },
  { key: 'presets.manage', label: 'Manage Presets', category: 'Presets' },
  { key: 'provisions.view', label: 'View Provisions', category: 'Provisions' },
  { key: 'provisions.manage', label: 'Manage Provisions', category: 'Provisions' },
  { key: 'faults.view', label: 'View Faults', category: 'Faults' },
  { key: 'faults.manage', label: 'Manage Faults', category: 'Faults' },
  { key: 'files.view', label: 'View Files', category: 'Files' },
  { key: 'files.manage', label: 'Manage Files', category: 'Files' },
  { key: 'mikrotik.view', label: 'View MikroTik', category: 'MikroTik' },
  { key: 'mikrotik.manage', label: 'Manage MikroTik', category: 'MikroTik' },
  { key: 'pppoe.view', label: 'View PPPoE', category: 'PPPoE' },
  { key: 'pppoe.manage', label: 'Manage PPPoE', category: 'PPPoE' },
  { key: 'hotspot.view', label: 'View Hotspot', category: 'Hotspot' },
  { key: 'hotspot.manage', label: 'Manage Hotspot', category: 'Hotspot' },
  { key: 'users.view', label: 'View Users', category: 'Users' },
  { key: 'users.create', label: 'Create Users', category: 'Users' },
  { key: 'users.edit', label: 'Edit Users', category: 'Users' },
  { key: 'users.delete', label: 'Delete Users', category: 'Users' },
  { key: 'settings.view', label: 'View Settings', category: 'Settings' },
  { key: 'settings.edit', label: 'Edit Settings', category: 'Settings' },
  { key: 'system.manage', label: 'System Management', category: 'System' },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  superadmin: PERMISSIONS.map(p => p.key),
  admin: [
    'devices.view', 'devices.edit', 'devices.task', 'devices.reboot', 'devices.refresh', 'devices.provision', 'devices.diagnostic',
    'tasks.view', 'tasks.create', 'tasks.delete',
    'presets.view', 'presets.manage',
    'provisions.view', 'provisions.manage',
    'faults.view', 'faults.manage',
    'files.view', 'files.manage',
    'mikrotik.view', 'mikrotik.manage',
    'pppoe.view', 'pppoe.manage',
    'hotspot.view', 'hotspot.manage',
    'users.view', 'users.create', 'users.edit',
    'settings.view', 'settings.edit',
  ],
  operator: [
    'devices.view', 'devices.task', 'devices.refresh',
    'tasks.view', 'tasks.create',
    'presets.view', 'provisions.view',
    'faults.view',
    'pppoe.view', 'hotspot.view',
    'settings.view',
  ],
  technician: [
    'devices.view', 'devices.diagnostic', 'devices.task',
    'tasks.view',
    'faults.view',
    'mikrotik.view', 'pppoe.view', 'hotspot.view',
  ],
  mikrotik: [
    'devices.view',
    'mikrotik.view', 'mikrotik.manage',
    'pppoe.view', 'pppoe.manage',
    'hotspot.view', 'hotspot.manage',
    'settings.view',
  ],
  pppoe: [
    'devices.view',
    'pppoe.view', 'pppoe.manage',
    'hotspot.view',
    'settings.view',
  ],
  multi_talent: [
    'devices.view', 'devices.edit', 'devices.task', 'devices.reboot', 'devices.refresh', 'devices.diagnostic',
    'tasks.view', 'tasks.create', 'tasks.delete',
    'presets.view', 'provisions.view',
    'faults.view', 'faults.manage',
    'files.view',
    'mikrotik.view', 'mikrotik.manage',
    'pppoe.view', 'pppoe.manage',
    'hotspot.view', 'hotspot.manage',
    'settings.view',
  ],
  hotspot: [
    'devices.view',
    'hotspot.view', 'hotspot.manage',
    'pppoe.view',
    'settings.view',
  ],
  viewer: [
    'devices.view',
    'tasks.view',
    'presets.view', 'provisions.view',
    'faults.view',
    'mikrotik.view', 'pppoe.view', 'hotspot.view',
    'settings.view',
  ],
};

export type ViewId = 'dashboard' | 'devices' | 'device-detail' | 'tasks' | 'presets' | 'provisions' | 'virtual-parameters' | 'faults' | 'files' | 'admin' | 'settings' | 'system-status' | 'mikrotik' | 'pppoe' | 'hotspot';
