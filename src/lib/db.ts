import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// Ensure the db directory exists and DATABASE_URL uses an absolute path.
function ensureDbDirAndResolveUrl() {
  try {
    let dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

    const match = dbUrl.match(/^file:(.+)$/)
    if (match) {
      let dbPath = match[1]
      const isRelative = !path.isAbsolute(dbPath)

      if (isRelative) {
        dbPath = path.resolve(process.cwd(), dbPath)
        process.env.DATABASE_URL = `file:${dbPath}`
      }

      const dbDir = path.dirname(dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
    }
  } catch (err) {
    console.error('[db] ensureDbDirAndResolveUrl failed:', err)
  }
}

ensureDbDirAndResolveUrl()

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "detail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`

// Ensure tables exist. Returns a promise that resolves when DB is ready.
// This is called lazily via getDbReady() — never at module level — so that
// the PrismaClient is fully constructed before any raw SQL is executed.
export async function ensureTablesExist(prisma: PrismaClient) {
  try {
    await prisma.$queryRawUnsafe('SELECT count(*) FROM "User" LIMIT 1')
    console.log('[db] Tables verified')
  } catch {
    console.log('[db] Tables missing, creating schema via raw SQL...')
    try {
      for (const stmt of CREATE_TABLES_SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)) {
        await prisma.$executeRawUnsafe(stmt)
      }
      console.log('[db] Schema created successfully')
    } catch (sqlErr) {
      console.error('[db] Failed to create schema:', sqlErr)
      throw sqlErr // Re-throw so caller knows creation failed
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Singleton promise: all callers share the same init promise.
// API routes MUST await getDbReady() before any db query to guarantee
// tables exist (especially on first request after fresh deploy).
let _dbReadyPromise: Promise<void> | null = null

export function getDbReady(): Promise<void> {
  if (!_dbReadyPromise) {
    _dbReadyPromise = ensureTablesExist(db).catch(err => {
      // Reset the promise so the next call retries
      _dbReadyPromise = null
      throw err
    })
  }
  return _dbReadyPromise
}
