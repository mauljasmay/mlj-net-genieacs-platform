import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession, createAuditLog } from '@/lib/auth';

// Category mapping for known setting keys
const SETTING_CATEGORY_MAP: Record<string, string> = {
  brand_name: 'branding', brand_subtitle: 'branding',
  genieacs_server_mode: 'genieacs', genieacs_remote_host: 'genieacs',
  genieacs_nbi_url: 'genieacs', genieacs_nbi_username: 'genieacs', genieacs_nbi_password: 'genieacs',
  genieacs_cwmp_host: 'genieacs', genieacs_cwmp_port: 'genieacs',
  genieacs_nbi_port: 'genieacs', genieacs_fs_port: 'genieacs', genieacs_dashboard_port: 'genieacs',
  genieacs_acs_url: 'genieacs', genieacs_cwmp_url: 'genieacs', genieacs_fs_url: 'genieacs',
  session_timeout: 'security', max_login_attempts: 'security',
};

async function requireSettingsAccess(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  // superadmin and admin can view/edit settings
  if (session.role === 'superadmin' || session.role === 'admin') return session;
  // other roles can only view if they have settings.view permission
  return null;
}

export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({ orderBy: { category: 'asc' } });
    const grouped: Record<string, any[]> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push({ key: s.key, value: s.value, type: s.type });
    }
    return NextResponse.json({ settings: grouped });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSettingsAccess(request);
    if (!session) return NextResponse.json({ error: 'Forbidden - requires superadmin or admin role' }, { status: 403 });

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
    }

    // Use Prisma transaction for atomic save
    await db.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        const category = SETTING_CATEGORY_MAP[key] || 'general';
        const type = (key.includes('port') || key.includes('timeout') || key.includes('max_') || key.includes('attempts'))
          ? 'number' : 'string';

        await tx.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), type, category },
        });
      }
    });

    await createAuditLog({
      userId: session.id,
      action: 'update_settings',
      resource: 'settings',
      detail: `Updated settings: ${Object.keys(settings).join(', ')}`,
    });

    // Clear the cached GenieACS settings so next request picks up new values
    try {
      const { invalidateSettingsCache } = await import('@/lib/genieacs');
      invalidateSettingsCache();
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}