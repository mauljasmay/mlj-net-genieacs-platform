// GenieACS NBI API client - supports both local and remote server modes
// When server_mode is 'local', it reads from env vars (GenieACS runs on same machine)
// When server_mode is 'remote', it reads from DB settings (user configured external GenieACS)

interface NBIRequestOptions {
  method?: string;
  body?: any;
  timeout?: number;
  query?: Record<string, string>;
}

class GenieACSClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(baseUrl?: string, username?: string, password?: string) {
    this.baseUrl = baseUrl || process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557';
    const user = username || process.env.GENIEACS_NBI_USERNAME || '';
    const pass = password || process.env.GENIEACS_NBI_PASSWORD || '';
    if (user && pass) {
      this.authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    }
  }

  private async request(path: string, options: NBIRequestOptions = {}): Promise<any> {
    const { method = 'GET', body, timeout = 30000, query } = options;

    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams(query);
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authHeader) {
        headers['Authorization'] = this.authHeader;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`NBI API ${res.status}: ${text}`);
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return null;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`NBI API timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  // Devices
  async getDevices(limit = 50, skip = 0, query?: string): Promise<any[]> {
    const q = query || '{}';
    const projection = '{"_id":1,"_registered":1,"_lastInform":1,"_lastBoot":1,"_lastBootstrap":1,"_tags":1,"_deviceId":1,"InternetGatewayDevice.DeviceInfo.":1,"InternetGatewayDevice.WANDevice.":1,"InternetGatewayDevice.LANDevice.":1,"Device.DeviceInfo.":1,"Device.DeviceSummary.":1}';
    const result = await this.request('/devices/', {
      query: { limit: String(limit), skip: String(skip), query: q, projection },
    });
    return Array.isArray(result) ? result : [];
  }

  async getDeviceCount(query?: string): Promise<number> {
    const q = query || '{}';
    const result = await this.request('/devices/', {
      query: { limit: '0', skip: '0', query: q },
    });
    return 0;
  }

  async getDevice(deviceId: string): Promise<any> {
    return this.request(`/devices/${encodeURIComponent(deviceId)}`);
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.request(`/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
  }

  // Parameters
  async getDeviceParameters(deviceId: string): Promise<any[]> {
    const encodedId = encodeURIComponent(deviceId);
    return this.request(`/devices/${encodedId}/parameters`);
  }

  // Tasks
  async getTasks(limit = 50, skip = 0): Promise<any[]> {
    return this.request('/tasks/', {
      query: { limit: String(limit), skip: String(skip) },
    });
  }

  async createTask(deviceId: string, task: Record<string, any>): Promise<any> {
    return this.request(`/devices/${encodeURIComponent(deviceId)}/tasks`, {
      method: 'POST',
      body: task,
      timeout: 10000,
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  }

  async retryTask(taskId: string): Promise<void> {
    await this.request(`/tasks/${encodeURIComponent(taskId)}/retry`, { method: 'POST' });
  }

  // Device actions
  async rebootDevice(deviceId: string): Promise<any> {
    return this.createTask(deviceId, { name: 'reboot' });
  }

  async refreshDevice(deviceId: string): Promise<any> {
    return this.createTask(deviceId, { name: 'refreshObject', objectName: 'InternetGatewayDevice' });
  }

  async summonDevice(deviceId: string): Promise<any> {
    return this.createTask(deviceId, { name: 'refreshInform' });
  }

  async setParameterValues(deviceId: string, parameterValues: Array<[string, string, string]>): Promise<any> {
    return this.createTask(deviceId, {
      name: 'setParameterValues',
      parameterValues: parameterValues.map(([name, value, type]) => [name, value, type]),
    });
  }

  async getParameterValues(deviceId: string, parameterNames: string[]): Promise<any> {
    return this.createTask(deviceId, {
      name: 'getParameterValues',
      parameterNames: parameterNames.map(name => [name]),
    });
  }

  async factoryReset(deviceId: string): Promise<any> {
    return this.createTask(deviceId, { name: 'factoryReset' });
  }

  // Tags
  async addTag(deviceId: string, tag: string): Promise<void> {
    await this.request(`/devices/${encodeURIComponent(deviceId)}/tags/${encodeURIComponent(tag)}`, {
      method: 'POST',
    });
  }

  async removeTag(deviceId: string, tag: string): Promise<void> {
    await this.request(`/devices/${encodeURIComponent(deviceId)}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    });
  }

  // Presets
  async getPresets(): Promise<any[]> {
    return this.request('/presets/', { query: { limit: '1000' } });
  }

  async getPreset(presetId: string): Promise<any> {
    return this.request(`/presets/${encodeURIComponent(presetId)}`);
  }

  async createPreset(preset: any): Promise<any> {
    return this.request('/presets/', { method: 'POST', body: preset });
  }

  async updatePreset(presetId: string, preset: any): Promise<any> {
    return this.request(`/presets/${encodeURIComponent(presetId)}`, { method: 'PUT', body: preset });
  }

  async deletePreset(presetId: string): Promise<void> {
    await this.request(`/presets/${encodeURIComponent(presetId)}`, { method: 'DELETE' });
  }

  // Provisions
  async getProvisions(): Promise<any[]> {
    return this.request('/provisions/', { query: { limit: '1000' } });
  }

  async getProvision(provisionId: string): Promise<any> {
    return this.request(`/provisions/${encodeURIComponent(provisionId)}`);
  }

  async createProvision(provision: any): Promise<any> {
    return this.request('/provisions/', { method: 'POST', body: provision });
  }

  async updateProvision(provisionId: string, provision: any): Promise<any> {
    return this.request(`/provisions/${encodeURIComponent(provisionId)}`, { method: 'PUT', body: provision });
  }

  async deleteProvision(provisionId: string): Promise<void> {
    await this.request(`/provisions/${encodeURIComponent(provisionId)}`, { method: 'DELETE' });
  }

  // Virtual Parameters
  async getVirtualParameters(): Promise<any[]> {
    return this.request('/virtual_parameters/', { query: { limit: '1000' } });
  }

  async getVirtualParameter(vpId: string): Promise<any> {
    return this.request(`/virtual_parameters/${encodeURIComponent(vpId)}`);
  }

  async createVirtualParameter(vp: any): Promise<any> {
    return this.request('/virtual_parameters/', { method: 'POST', body: vp });
  }

  async updateVirtualParameter(vpId: string, vp: any): Promise<any> {
    return this.request(`/virtual_parameters/${encodeURIComponent(vpId)}`, { method: 'PUT', body: vp });
  }

  async deleteVirtualParameter(vpId: string): Promise<void> {
    await this.request(`/virtual_parameters/${encodeURIComponent(vpId)}`, { method: 'DELETE' });
  }

  // Faults
  async getFaults(limit = 100, skip = 0): Promise<any[]> {
    return this.request('/faults/', {
      query: { limit: String(limit), skip: String(skip) },
    });
  }

  async deleteFault(faultId: string): Promise<void> {
    await this.request(`/faults/${encodeURIComponent(faultId)}`, { method: 'DELETE' });
  }

  // Files
  async getFiles(): Promise<any[]> {
    return this.request('/files/', { query: { limit: '1000' } });
  }

  async getFile(fileId: string): Promise<any> {
    return this.request(`/files/${encodeURIComponent(fileId)}`);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.request(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
  }

  async uploadFile(fileData: any): Promise<any> {
    return this.request('/files/', { method: 'PUT', body: fileData });
  }

  // Ping
  async ping(host: string): Promise<any> {
    return this.request(`/ping/${encodeURIComponent(host)}`, { timeout: 5000 });
  }

  // Status / health check
  async getStatus(): Promise<boolean> {
    try {
      await this.request('/');
      return true;
    } catch {
      return false;
    }
  }
}

// Cache for DB-based settings to avoid hitting DB on every request
let _cachedSettings: { url: string; username: string; password: string; mode: string; ts: number } | null = null;
const SETTINGS_CACHE_TTL = 10000; // 10 seconds

export async function getGenieACSSettings(): Promise<{ url: string; username: string; password: string; mode: string }> {
  if (_cachedSettings && Date.now() - _cachedSettings.ts < SETTINGS_CACHE_TTL) {
    return { url: _cachedSettings.url, username: _cachedSettings.username, password: _cachedSettings.password, mode: _cachedSettings.mode };
  }

  try {
    const { db, getDbReady } = await import('@/lib/db');
    await getDbReady();
    const settings = await db.systemSetting.findMany({ where: { category: 'genieacs' } });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    const mode = map.genieacs_server_mode || 'remote';
    let url = map.genieacs_nbi_url || process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557';
    // If remote mode with remote_host but no nbi_url, construct from host + port
    if (mode === 'remote' && map.genieacs_remote_host && !map.genieacs_nbi_url) {
      const host = map.genieacs_remote_host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const proto = map.genieacs_remote_host.startsWith('https') ? 'https' : 'http';
      const nbiPort = map.genieacs_nbi_port || '7557';
      url = `${proto}://${host}:${nbiPort}`;
    }
    const username = map.genieacs_nbi_username || process.env.GENIEACS_NBI_USERNAME || '';
    const password = map.genieacs_nbi_password || process.env.GENIEACS_NBI_PASSWORD || '';

    _cachedSettings = { url, username, password, mode, ts: Date.now() };
    return { url, username, password, mode };
  } catch {
    return {
      url: process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557',
      username: process.env.GENIEACS_NBI_USERNAME || '',
      password: process.env.GENIEACS_NBI_PASSWORD || '',
      mode: 'remote',
    };
  }
}

// Create a client based on DB settings or env vars
export function invalidateSettingsCache(): void {
  _cachedSettings = null;
}

export async function getGenieACSClient(): Promise<GenieACSClient> {
  const settings = await getGenieACSSettings();
  return new GenieACSClient(settings.url, settings.username, settings.password);
}

// Create a client from env vars only (for backward compatibility)
export function getGenieACSClientFromEnv(): GenieACSClient {
  return new GenieACSClient();
}

export function createGenieACSClient(baseUrl: string, username?: string, password?: string): GenieACSClient {
  return new GenieACSClient(baseUrl, username, password);
}

export { GenieACSClient };
