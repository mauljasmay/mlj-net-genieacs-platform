import { db, getDbReady } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mlj-net-genieacs-platform-secret-change-me'
);

const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; username: string; displayName: string | null; role: string; permissions: string }): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    permissions: user.permissions,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);

  // Store session in DB
  await db.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    },
  });

  return token;
}

export async function verifySession(token: string) {
  try {
    await getDbReady();
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Check if session exists in DB
    const session = await db.session.findUnique({ where: { token }, include: { user: true } });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } });
      return null;
    }
    if (!session.user.isActive) return null;

    // Update last login
    await db.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: new Date() },
    });

    let parsedPermissions = {};
    try {
      parsedPermissions = JSON.parse((payload.permissions as string) || '{}');
    } catch {
      parsedPermissions = {};
    }

    return {
      id: payload.userId as string,
      username: payload.username as string,
      displayName: (payload.displayName as string) || null,
      role: payload.role as string,
      permissions: parsedPermissions,
    };
  } catch {
    return null;
  }
}

export async function destroySession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } });
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

export async function createAuditLog(data: {
  userId?: string;
  action: string;
  resource?: string;
  detail?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.auditLog.create({ data });
  } catch (err) {
    console.error('[auth] Failed to create audit log:', err);
  }
}

export async function checkBruteForce(username: string, ipAddress: string): Promise<boolean> {
  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const failedAttempts = await db.loginAttempt.count({
      where: {
        username,
        ipAddress,
        success: false,
        createdAt: { gte: fiveMinsAgo },
      },
    });

    return failedAttempts >= 5;
  } catch (err) {
    // If LoginAttempt table doesn't exist or query fails, allow login through
    console.error('[auth] checkBruteForce error (allowing login):', err);
    return false;
  }
}

export async function recordFailedLogin(username: string, ipAddress: string) {
  try {
    await db.loginAttempt.create({
      data: { username, ipAddress, success: false },
    });
  } catch (err) {
    console.error('[auth] recordFailedLogin error:', err);
  }
}

export async function recordSuccessfulLogin(username: string, ipAddress: string) {
  try {
    await db.loginAttempt.create({
      data: { username, ipAddress, success: true },
    });
  } catch (err) {
    console.error('[auth] recordSuccessfulLogin error:', err);
  }
}