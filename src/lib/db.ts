import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// Ensure the db directory exists and DATABASE_URL uses an absolute path.
// This prevents "Error code 14: Unable to open the database file" when
// running in standalone/PM2 mode where process.cwd() may differ from the
// project root.
function ensureDbDirAndResolveUrl() {
  let dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

  // Extract path from DATABASE_URL formats:
  //   "file:./db/custom.db"  (relative)
  //   "file:db/custom.db"    (relative, no ./)
  //   "file:/absolute/path/db/custom.db"  (absolute)
  const match = dbUrl.match(/^file:(.+)$/)
  if (match) {
    let dbPath = match[1]
    const isRelative = !path.isAbsolute(dbPath)

    if (isRelative) {
      // Resolve relative path against process.cwd() to get absolute path
      dbPath = path.resolve(process.cwd(), dbPath)
      // Override DATABASE_URL so Prisma always uses the absolute path
      process.env.DATABASE_URL = `file:${dbPath}`
    }

    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
  }
}

ensureDbDirAndResolveUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db