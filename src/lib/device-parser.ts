import { ParsedDevice } from '@/types';

const ONLINE_THRESHOLD = 30000; // 30 seconds

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function findParameterValue(obj: any, partialPath: string): any {
  if (!obj) return undefined;
  for (const key of Object.keys(obj)) {
    if (key.includes(partialPath)) {
      const val = obj[key];
      if (val && val._value !== undefined) return val._value[0];
      if (typeof val === 'string') return val;
      if (typeof val === 'number') return val;
    }
  }
  return undefined;
}

function findParameterValueFull(obj: any, partialPath: string): { value: any; path: string } | null {
  if (!obj) return null;
  for (const key of Object.keys(obj)) {
    if (key.endsWith(partialPath) || key.includes(partialPath)) {
      const val = obj[key];
      let value: any;
      if (val && val._value !== undefined) {
        value = val._value[0];
      } else if (typeof val === 'string' || typeof val === 'number') {
        value = val;
      }
      if (value !== undefined) {
        return { value, path: key };
      }
    }
  }
  return null;
}

export function parseDeviceData(device: any): ParsedDevice {
  const now = Date.now();
  const lastInform = device._lastInform ? new Date(device._lastInform).getTime() : 0;
  const online = (now - lastInform) < ONLINE_THRESHOLD;

  const deviceId = device._deviceId || {};
  const serialNumber = deviceId._SerialNumber || '';
  const manufacturer = deviceId._Manufacturer || '';
  const oui = deviceId._OUI || '';
  const productClass = deviceId._ProductClass || '';

  // Extract from device tree
  const igd = device.InternetGatewayDevice || {};
  const dev = device.Device || {};
  const devInfo = igd.DeviceInfo || dev.DeviceInfo || {};

  const firmwareVersion = devInfo.SoftwareVersion?._value?.[0] || '';
  const hardwareVersion = devInfo.HardwareVersion?._value?.[0] || '';
  const model = devInfo.ModelName?._value?.[0] || productClass;
  const uptime = parseInt(devInfo.UpTime?._value?.[0]) || 0;

  // WAN IP
  let ipAddress = '';
  let wanType = '';
  let ppoeUsername = '';
  let ppoeIP = '';
  let ppoePassword = '';

  const wanDevices = igd.WANDevice || {};
  for (const wanKey of Object.keys(wanDevices)) {
    const wanDev = wanDevices[wanKey];
    const wanConns = wanDev?.WANConnectionDevice || {};
    for (const connKey of Object.keys(wanConns)) {
      const conn = wanConns[connKey];
      const wppp = conn?.WANPPPConnection || {};
      const wip = conn?.WANIPConnection || {};

      for (const pppKey of Object.keys(wppp)) {
        const ppp = wppp[pppKey];
        const extIp = ppp?.ExternalIPAddress?._value?.[0];
        if (extIp) {
          ppoeIP = extIp;
          wanType = 'PPPoE';
        }
        const user = ppp?.Username?._value?.[0];
        if (user) ppoeUsername = user;
        const pass = ppp?.Password?._value?.[0];
        if (pass) ppoePassword = pass;
      }

      for (const ipKey of Object.keys(wip)) {
        const ipConn = wip[ipKey];
        const extIp = ipConn?.ExternalIPAddress?._value?.[0];
        if (extIp && !ipAddress) {
          ipAddress = extIp;
          wanType = 'DHCP';
        }
      }
    }
  }

  if (ppoeIP) ipAddress = ppoeIP;

  // WiFi
  let ssid = '';
  const lanDevices = igd.LANDevice || {};
  for (const lanKey of Object.keys(lanDevices)) {
    const lanDev = lanDevices[lanKey];
    const wifi = lanDev?.WLANConfiguration || {};
    for (const wifiKey of Object.keys(wifi)) {
      const wifiConf = wifi[wifiKey];
      const s = wifiConf?.SSID?._value?.[0];
      if (s) ssid = s;
    }
  }

  // Connected devices
  let connectedDevices = 0;
  const hostTable = getNestedValue(igd, 'LANDevice.1.Hosts.Host') || {};
  connectedDevices = Object.keys(hostTable).length;

  // ONT Optical info
  let rxPower: number | null = null;
  let txPower: number | null = null;
  let temperature: number | null = null;
  let ponMode = '';
  let macAddress = '';

  // Try to find optical parameters from the device tree
  for (const key of Object.keys(device)) {
    const val = device[key];
    if (typeof val !== 'object' || val === null) continue;

    // RX Power
    if (key.toLowerCase().includes('rxpower') || key.toLowerCase().includes('rx_power')) {
      if (val._value?.[0]) rxPower = parseFloat(val._value[0]);
    }
    // TX Power
    if (key.toLowerCase().includes('txpower') || key.toLowerCase().includes('tx_power')) {
      if (val._value?.[0]) txPower = parseFloat(val._value[0]);
    }
    // Temperature
    if (key.toLowerCase().includes('temperature')) {
      if (val._value?.[0]) temperature = parseFloat(val._value[0]);
    }
    // PON Mode
    if (key.toLowerCase().includes('ponmode') || key.toLowerCase().includes('pon_mode')) {
      if (val._value?.[0]) ponMode = val._value[0];
    }
    // MAC Address
    if (key.toLowerCase().includes('macaddress')) {
      if (val._value?.[0]) macAddress = val._value[0];
    }
  }

  return {
    id: device._id,
    serialNumber,
    manufacturer,
    oui,
    productClass,
    model,
    firmwareVersion,
    hardwareVersion,
    lastInform: device._lastInform || '',
    lastBoot: device._lastBoot || '',
    online,
    tags: device._tags || [],
    ipAddress,
    uptime,
    rxPower,
    txPower,
    temperature,
    ssid,
    connectedDevices,
    ppoeUsername,
    ppoeIP,
    ppoePassword,
    wanType,
    ponMode,
    macAddress,
  };
}

export function getDeviceParametersFlat(device: any): Array<{ path: string; value: any; type: string; writable: boolean }> {
  const params: Array<{ path: string; value: any; type: string; writable: boolean }> = [];

  function extract(obj: any, prefix: string) {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('_') && key !== '_value' && key !== '_type' && key !== '_writable') continue;
      if (key === '_registered' || key === '_lastInform' || key === '_lastBoot') continue;

      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (val && typeof val === 'object' && ('_value' in val)) {
        params.push({
          path: fullKey,
          value: val._value?.[0],
          type: val._value?.[1] || 'xsd:string',
          writable: val._writable === true,
        });
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        extract(val, fullKey);
      }
    }
  }

  extract(device, '');
  return params;
}

export function formatUptime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function getSignalQuality(rxPower: number | null): { label: string; color: string; bg: string } {
  if (rxPower === null) return { label: 'N/A', color: 'text-muted-foreground', bg: 'bg-muted' };
  if (rxPower > -21) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (rxPower > -26) return { label: 'Good', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  if (rxPower > -28) return { label: 'Fair', color: 'text-orange-400', bg: 'bg-orange-500/10' };
  return { label: 'Poor', color: 'text-red-400', bg: 'bg-red-500/10' };
}

export function getTemperatureStatus(temp: number | null): { label: string; color: string } {
  if (temp === null) return { label: 'N/A', color: 'text-muted-foreground' };
  if (temp < 45) return { label: 'Normal', color: 'text-emerald-400' };
  if (temp < 60) return { label: 'Warm', color: 'text-yellow-400' };
  if (temp < 65) return { label: 'Hot', color: 'text-orange-400' };
  return { label: 'Critical', color: 'text-red-400' };
}
