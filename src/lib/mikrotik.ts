// MikroTik RouterOS API client using node-routeros
import { connect, Socket } from 'routeros';
import { db, getDbReady } from './db';

interface MikroTikConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

let _cachedConfig: MikroTikConfig | null = null;
let _cachedTs = 0;
const CONFIG_CACHE_TTL = 15000;

export async function getMikrotikConfig(): Promise<MikroTikConfig> {
  if (_cachedConfig && Date.now() - _cachedTs < CONFIG_CACHE_TTL) return _cachedConfig;

  try {
    await getDbReady();
    const settings = await db.systemSetting.findMany({ where: { category: 'mikrotik' } });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    _cachedConfig = {
      host: map.mikrotik_host || process.env.MIKROTIK_HOST || '192.168.1.1',
      port: parseInt(map.mikrotik_port || process.env.MIKROTIK_PORT || '8728'),
      username: map.mikrotik_username || process.env.MIKROTIK_USERNAME || 'admin',
      password: map.mikrotik_password || process.env.MIKROTIK_PASSWORD || '',
    };
    _cachedTs = Date.now();
    return _cachedConfig;
  } catch {
    return {
      host: process.env.MIKROTIK_HOST || '192.168.1.1',
      port: parseInt(process.env.MIKROTIK_PORT || '8728'),
      username: process.env.MIKROTIK_USERNAME || 'admin',
      password: process.env.MIKROTIK_PASSWORD || '',
    };
  }
}

export function invalidateMikrotikCache(): void {
  _cachedConfig = null;
}

export async function getMikrotikConnection(): Promise<Socket> {
  const config = await getMikrotikConfig();
  const conn = connect({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    timeout: 5000,
  });
  return conn;
}

export async function mikrotikCommand(cmd: string, params: Record<string, string> = {}): Promise<any[]> {
  const conn = await getMikrotikConnection();
  try {
    const result = await conn.write(cmd, params);
    return Array.isArray(result) ? result : [];
  } finally {
    conn.close();
  }
}

export async function testMikrotikConnection(): Promise<{ success: boolean; error?: string; identity?: string }> {
  try {
    const conn = await getMikrotikConnection();
    const identity = await conn.write('/system/identity/print');
    conn.close();
    return { success: true, identity: identity?.[0]?.name || 'Unknown' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' };
  }
}
