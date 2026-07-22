import { NextRequest, NextResponse } from 'next/server';
import { db, getDbReady } from '@/lib/db';
import { verifySession, hashPassword, verifyPassword, createAuditLog } from '@/lib/auth';
import { ROLE_DEFAULT_PERMISSIONS, PERMISSIONS } from '@/types';

async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session;
}

export async function GET(request: NextRequest) {
  try {
    await getDbReady();
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.role !== 'superadmin' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true, username: true, displayName: true, role: true,
        permissions: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDbReady();
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { username, password, displayName, role, permissions } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const perms = permissions || Object.fromEntries(
      (ROLE_DEFAULT_PERMISSIONS[role as keyof typeof ROLE_DEFAULT_PERMISSIONS] || []).map(p => [p, true])
    );

    const user = await db.user.create({
      data: {
        username,
        passwordHash,
        displayName: displayName || null,
        role: role || 'viewer',
        permissions: JSON.stringify(perms),
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'create_user',
      resource: 'users',
      detail: `Created user ${username} with role ${role}`,
    });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error: any) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getDbReady();
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, displayName, role, permissions, isActive, password, oldPassword } = body;

    // --- Change own password (any authenticated user, requires oldPassword) ---
    const isChangingOwnPassword = !!oldPassword && !!password && id === session.id;

    // --- Admin edit user (superadmin only) ---
    const isAdminEdit = !isChangingOwnPassword && (session.role === 'superadmin');

    if (!isChangingOwnPassword && !isAdminEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isChangingOwnPassword) {
      // Verify old password
      const user = await db.user.findUnique({ where: { id } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const valid = await verifyPassword(oldPassword, user.passwordHash);
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      if (password.length < 6) return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });

      await db.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(password) },
      });

      await createAuditLog({
        userId: session.id,
        action: 'change_password',
        resource: 'users',
        detail: `Changed own password`,
      });

      return NextResponse.json({ success: true });
    }

    // Admin edit user
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      updateData.passwordHash = await hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: session.id,
      action: 'update_user',
      resource: 'users',
      detail: `Updated user ${user.username}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Users PUT error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getDbReady();
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    if (!userId || userId === session.id) {
      return NextResponse.json({ error: 'Cannot delete this user' }, { status: 400 });
    }

    await db.user.delete({ where: { id: userId } });

    await createAuditLog({
      userId: session.id,
      action: 'delete_user',
      resource: 'users',
      detail: `Deleted user ${userId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}