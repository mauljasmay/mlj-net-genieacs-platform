import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession, checkBruteForce, recordSuccessfulLogin, createAuditLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Check brute force
    const isBlocked = await checkBruteForce(username, ip);
    if (isBlocked) {
      return NextResponse.json({ success: false, error: 'Too many failed attempts. Try again in 5 minutes.' }, { status: 429 });
    }

    const user = await db.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    await recordSuccessfulLogin(username, ip);

    const token = await createSession(user);

    await createAuditLog({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      detail: `User ${username} logged in`,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        permissions: JSON.parse(user.permissions || '{}'),
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
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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