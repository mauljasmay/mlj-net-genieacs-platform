import { NextRequest, NextResponse } from 'next/server';
import { verifySession, createAuditLog } from '@/lib/auth';
import { getMikrotikConfig, testMikrotikConnection, invalidateMikrotikCache } from '@/lib/mikrotik';
import { db } from '@/lib/db';

async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;
  return verifySession(token);
}

function hasPermission(session: any, perm: string): boolean {
  if (session.role === 'superadmin') return true;
  try {
    const perms = typeof session.permissions === 'string' ? JSON.parse(session.permissions) : session.permissions;
    return !!perms[perm];
  } catch { return false; }
}

// GET - Get MikroTik config + test connection
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'mikrotik.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const action = new URL(request.url).searchParams.get('action');
    const config = await getMikrotikConfig();

    if (action === 'test') {
      const result = await testMikrotikConnection();
      return NextResponse.json(result);
    }

    // Return current config (mask password)
    return NextResponse.json({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password ? '••••••••' : '',
      hasPassword: !!config.password,
    });
  } catch (error: any) {
    console.error('MikroTik GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Save MikroTik config
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'mikrotik.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { host, port, username, password } = body;

    if (!host) return NextResponse.json({ error: 'Host is required' }, { status: 400 });
    if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

    // Get existing password if blank (don't overwrite)
    let finalPassword = password || '';
    if (!finalPassword) {
      const existing = await db.systemSetting.findUnique({ where: { key: 'mikrotik_password' } });
      if (existing && existing.value) {
        finalPassword = existing.value; // Keep existing password
      }
    }

    const settings = [
      { key: 'mikrotik_host', value: host, type: 'string', category: 'mikrotik' },
      { key: 'mikrotik_port', value: String(port || 8728), type: 'string', category: 'mikrotik' },
      { key: 'mikrotik_username', value: username, type: 'string', category: 'mikrotik' },
      { key: 'mikrotik_password', value: finalPassword, type: 'string', category: 'mikrotik' },
    ];

    await db.$transaction(async (tx) => {
      for (const s of settings) {
        await tx.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: s,
        });
      }
    });

    invalidateMikrotikCache();

    await createAuditLog({
      userId: session.id,
      action: 'update_mikrotik_config',
      resource: 'mikrotik',
      detail: `Updated MikroTik config: ${host}:${port}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('MikroTik PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}