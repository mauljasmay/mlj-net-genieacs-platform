#!/usr/bin/env node
/**
 * Standalone script to seed superadmin and admin users into the SQLite database.
 * Run: node scripts/seed-users.js
 * 
 * This is used when prisma db seed doesn't work or as a quick fix.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

// Resolve DATABASE_URL to absolute path
let dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
const match = dbUrl.match(/^file:(.+)$/);
if (match) {
  let dbPath = match[1];
  if (!path.isAbsolute(dbPath)) {
    dbPath = path.resolve(process.cwd(), dbPath);
    process.env.DATABASE_URL = `file:${dbPath}`;
  }
  const dbDir = path.dirname(dbPath);
  const fs = require('fs');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
}

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  { username: 'superadmin', password: '110519', displayName: 'Super Admin', role: 'superadmin' },
  { username: 'admin', password: 'admin123', displayName: 'Administrator', role: 'superadmin' },
];

async function main() {
  console.log('Seeding default users...');
  
  for (const def of DEFAULT_USERS) {
    const existing = await prisma.user.findFirst({ where: { username: def.username } });
    if (!existing) {
      const hash = await bcrypt.hash(def.password, 12);
      await prisma.user.create({
        data: {
          username: def.username,
          passwordHash: hash,
          displayName: def.displayName,
          role: def.role,
          permissions: JSON.stringify({}),
          isActive: true,
        },
      });
      console.log(`  [OK] Created user: ${def.username} / ${def.password}`);
    } else {
      console.log(`  [SKIP] User already exists: ${def.username}`);
    }
  }
  
  console.log('Done.');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());