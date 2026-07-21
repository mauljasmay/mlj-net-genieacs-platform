import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { mikrotikCommand } from '@/lib/mikrotik';

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

// GET - Fetch Hotspot data (users, active, profiles, servers)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'hotspot.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'users';

    let data: any[] = [];
    if (tab === 'users') {
      data = await mikrotikCommand('/ip/hotspot/user/print');
    } else if (tab === 'active') {
      data = await mikrotikCommand('/ip/hotspot/active/print');
    } else if (tab === 'profile') {
      data = await mikrotikCommand('/ip/hotspot/user/profile/print');
    } else if (tab === 'server') {
      data = await mikrotikCommand('/ip/hotspot/print');
    }

    return NextResponse.json({ data, tab });
  } catch (error: any) {
    console.error('Hotspot GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch Hotspot data' }, { status: 500 });
  }
}

// POST - Add/Edit Hotspot entry
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'hotspot.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { tab, action, ...fields } = body;

    const cmdMap: Record<string, string> = {
      users: '/ip/hotspot/user',
      profile: '/ip/hotspot/user/profile',
      server: '/ip/hotspot',
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
    console.error('Hotspot POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute Hotspot command' }, { status: 500 });
  }
}

// DELETE - Remove Hotspot entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'hotspot.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'users';
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const cmdMap: Record<string, string> = {
      users: '/ip/hotspot/user',
      profile: '/ip/hotspot/user/profile',
      server: '/ip/hotspot',
    };

    await mikrotikCommand(`${cmdMap[tab]}/remove`, { '.id': id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Hotspot DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}