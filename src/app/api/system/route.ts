import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
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
    } catch {}

    const services = [
      { name: 'NBI API', host: nbiUrl.replace(/^https?:\/\//, '').split(':')[0], port: parseInt(nbiUrl.split(':').pop() || '7557') },
      { name: 'CWMP / TR-069', host: cwmpHost, port: parseInt(cwmpPort) },
      { name: 'File Server', host: nbiUrl.replace(/^https?:\/\//, '').split(':')[0], port: parseInt(fsPort) },
    ];

    const results = await Promise.all(
      services.map(async (svc) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          await fetch(`http://${svc.host}:${svc.port}/`, {
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
    results.unshift({ name: 'Dashboard', host: '127.0.0.1', port: 3000, status: 'online' as const, responseTime: 0 });

    return NextResponse.json({ services: results, serverMode });
  } catch {
    return NextResponse.json({ error: 'Failed to check services' }, { status: 500 });
  }
}