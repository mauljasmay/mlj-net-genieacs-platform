import { NextResponse } from 'next/server';
import { db, getDbReady } from '@/lib/db';

export async function GET() {
  try {
    await getDbReady();
    // Read GenieACS settings from DB
    let nbiUrl = process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557';
    let cwmpHost = process.env.GENIEACS_CWMP_HOST || '127.0.0.1';
    let cwmpPort = process.env.GENIEACS_CWMP_PORT || '7547';
    let fsPort = process.env.GENIEACS_FS_PORT || '7567';
    let serverMode = 'remote';

    try {
      const settings = await db.systemSetting.findMany({ where: { category: 'genieacs' } });
      const map: Record<string, string> = {};
      for (const s of settings) map[s.key] = s.value;
      if (map.genieacs_server_mode) serverMode = map.genieacs_server_mode;
      if (map.genieacs_nbi_url) nbiUrl = map.genieacs_nbi_url;
      if (map.genieacs_cwmp_host) cwmpHost = map.genieacs_cwmp_host;
      if (map.genieacs_cwmp_port) cwmpPort = map.genieacs_cwmp_port;
      if (map.genieacs_fs_port) fsPort = map.genieacs_fs_port;
    } catch {
      // DB not ready yet — fall back to env vars
    }

    // Safely parse ports with NaN guard
    function safePort(raw: string, fallback: number): number {
      const parsed = parseInt(raw, 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }

    // Detect protocol from nbiUrl (support both http and https)
    const nbiIsHttps = nbiUrl.startsWith('https://');
    const nbiProto = nbiIsHttps ? 'https' : 'http';
    const nbiHost = nbiUrl.replace(/^https?:\/\//, '').split(':')[0] || '127.0.0.1';
    const nbiPort = safePort(nbiUrl.split(':').pop() || '7557', 7557);

    const services = [
      { name: 'NBI API', host: nbiHost, port: nbiPort, proto: nbiProto },
      { name: 'CWMP / TR-069', host: cwmpHost, port: safePort(cwmpPort, 7547), proto: 'http' },
      { name: 'File Server', host: nbiHost, port: safePort(fsPort, 7567), proto: 'http' },
    ];

    const results = await Promise.all(
      services.map(async (svc) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          await fetch(`${svc.proto}://${svc.host}:${svc.port}/`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return { ...svc, status: 'online' as const, responseTime: Date.now() - start };
        } catch {
          return { ...svc, status: 'offline' as const, responseTime: -1 };
        }
      })
    );

    // Dashboard is always online if this API responds
    results.unshift({ name: 'Dashboard', host: '127.0.0.1', port: 3000, proto: 'http', status: 'online' as const, responseTime: 0 });

    return NextResponse.json({ services: results, serverMode });
  } catch (err) {
    console.error('System GET error:', err);
    return NextResponse.json({ error: 'Failed to check services' }, { status: 500 });
  }
}