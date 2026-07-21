import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// Ensure the db directory exists before Prisma tries to open the database file
function ensureDbDir() {
  const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'
  // Extract path from DATABASE_URL formats: "file:./db/custom.db" or "file:/absolute/path/db/custom.db"
  const match = dbUrl.match(/^file:(?:\.\/)?(.+)$/)
  if (match) {
    const dbPath = match[1]
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
  }
}

ensureDbDir()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db