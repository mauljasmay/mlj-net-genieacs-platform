import { NextRequest, NextResponse } from 'next/server';
import { db, getDbReady } from '@/lib/db';
import { verifyPassword, createSession, checkBruteForce, recordFailedLogin, recordSuccessfulLogin, createAuditLog, hashPassword } from '@/lib/auth';

// Default users that are auto-created on first access.
// Add or modify here to change default credentials.
const DEFAULT_USERS = [
  {
    username: 'superadmin',
    password: '110519',
    displayName: 'Super Admin',
    role: 'superadmin',
  },
  {
    username: 'admin',
    password: 'admin123',
    displayName: 'Administrator',
    role: 'superadmin',
  },
];

// Ensure default users exist so the very first login always works.
async function ensureDefaultUsers() {
  for (const def of DEFAULT_USERS) {
    try {
      const existing = await db.user.findFirst({ where: { username: def.username } });
      if (!existing) {
        const passwordHash = await hashPassword(def.password);
        await db.user.create({
          data: {
            username: def.username,
            passwordHash,
            displayName: def.displayName,
            role: def.role,
            permissions: JSON.stringify({}),
          },
        });
        console.log(`[auth] Auto-created user: ${def.username}`);
      }
    } catch (err) {
      console.error(`[auth] Failed to ensure user ${def.username}:`, err);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Wait for database tables to be ready (auto-creates if missing)
    await getDbReady();

    // 2. Ensure at least one default user exists
    await ensureDefaultUsers();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Check brute force (only counts, does NOT record a failed attempt here)
    const isBlocked = await checkBruteForce(username, ip);
    if (isBlocked) {
      return NextResponse.json({ success: false, error: 'Too many failed attempts. Try again in 5 minutes.' }, { status: 429 });
    }

    const user = await db.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      await recordFailedLogin(username, ip);
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(username, ip);
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    await recordSuccessfulLogin(username, ip);
    // Clean up expired sessions for this user
    try {
      await db.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    } catch { /* ignore */ }
    // Update lastLoginAt on actual login
    try {
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });
    } catch { /* ignore */ }

    const token = await createSession(user);

    await createAuditLog({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      detail: `User ${username} logged in`,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Safely parse permissions JSON
    let permissions = {};
    try {
      permissions = JSON.parse(user.permissions || '{}');
    } catch {
      permissions = {};
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        permissions,
      },
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    const message = process.env.NODE_ENV === 'development'
      ? `Internal server error: ${error.message}`
      : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    if (token) {
      const { destroySession } = await import('@/lib/auth');
      await destroySession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', { maxAge: 0, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await getDbReady();
    await ensureDefaultUsers();

    const token = request.cookies.get('session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { verifySession } = await import('@/lib/auth');
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: session });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
  }
}
