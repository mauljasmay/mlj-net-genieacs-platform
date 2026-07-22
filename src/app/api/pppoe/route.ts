import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { mikrotikCommand } from '@/lib/mikrotik';
import { getDbReady } from '@/lib/db';

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

// GET - Fetch PPPoE data (active, secret, or profile)
export async function GET(request: NextRequest) {
  try {
    await getDbReady();
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'pppoe.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'active';

    let data: any[] = [];
    if (tab === 'active') {
      data = await mikrotikCommand('/ppp/active/print');
    } else if (tab === 'secret') {
      data = await mikrotikCommand('/ppp/secret/print');
    } else if (tab === 'profile') {
      data = await mikrotikCommand('/ppp/profile/print');
    }

    return NextResponse.json({ data, tab });
  } catch (error: any) {
    console.error('PPPoE GET error:', error);
    return NextResponse.json({ error:   'Failed to fetch PPPoE data' }, { status: 500 });
  }
}

// POST - Add/Edit PPPoE entry
export async function POST(request: NextRequest) {
  try {
    await getDbReady();
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'pppoe.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { tab, action, ...fields } = body;

    const cmdMap: Record<string, string> = {
      secret: '/ppp/secret',
      profile: '/ppp/profile',
    };

    if (!cmdMap[tab]) return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });

    const cmd = action === 'edit' ? `${cmdMap[tab]}/set` : `${cmdMap[tab]}/add`;
    const params: Record<string, any> = {};
    if (action === 'edit' && fields['.id']) {
      params['.id'] = fields['.id'];
    }
    for (const [key, value] of Object.entries(fields)) {
      if (key !== 'action' && key !== 'tab' && key !== '.id' && value !== undefined && value !== '') {
        params[key] = value;
      }
    }

    if (Object.keys(params).length === 0) {
      return NextResponse.json({ error: 'No data to save' }, { status: 400 });
    }

    const result = await mikrotikCommand(cmd, params);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('PPPoE POST error:', error);
    return NextResponse.json({ error:   'Failed to execute PPPoE command' }, { status: 500 });
  }
}

// DELETE - Remove PPPoE entry
export async function DELETE(request: NextRequest) {
  try {
    await getDbReady();
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'pppoe.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'secret';
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const cmdMap: Record<string, string> = {
      secret: '/ppp/secret',
      profile: '/ppp/profile',
    };

    await mikrotikCommand(`${cmdMap[tab]}/remove`, { '.id': id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PPPoE DELETE error:', error);
    return NextResponse.json({ error:   'Failed to delete' }, { status: 500 });
  }
}
