import { db, getDbReady } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

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

export async function seedDefaultData() {
  // Ensure database tables are ready before seeding
  await getDbReady();

  // Create default users
  for (const def of DEFAULT_USERS) {
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
      console.log(`Created user: ${def.username} / ${def.password}`);
    }
  }

  // Set default system settings
  const settings = [
    { key: 'brand_name', value: 'MLJ NET', type: 'string', category: 'branding' },
    { key: 'brand_subtitle', value: 'TR-069 / ONT / CPE Management Platform', type: 'string', category: 'branding' },
    { key: 'genieacs_server_mode', value: 'remote', type: 'string', category: 'genieacs' },
    { key: 'genieacs_nbi_url', value: process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557', type: 'string', category: 'genieacs' },
    { key: 'genieacs_nbi_username', value: process.env.GENIEACS_NBI_USERNAME || '', type: 'string', category: 'genieacs' },
    { key: 'genieacs_nbi_password', value: process.env.GENIEACS_NBI_PASSWORD || '', type: 'string', category: 'genieacs' },
    { key: 'genieacs_remote_host', value: process.env.GENIEACS_REMOTE_HOST || '', type: 'string', category: 'genieacs' },
    { key: 'genieacs_dashboard_port', value: process.env.GENIEACS_DASHBOARD_PORT || '3000', type: 'string', category: 'genieacs' },
    { key: 'genieacs_cwmp_port', value: process.env.GENIEACS_CWMP_PORT || '7547', type: 'string', category: 'genieacs' },
    { key: 'genieacs_nbi_port', value: process.env.GENIEACS_NBI_PORT || '7557', type: 'string', category: 'genieacs' },
    { key: 'genieacs_fs_port', value: process.env.GENIEACS_FS_PORT || '7567', type: 'string', category: 'genieacs' },
    { key: 'session_timeout', value: '86400', type: 'number', category: 'security' },
    { key: 'max_login_attempts', value: '5', type: 'number', category: 'security' },
  ];

  for (const s of settings) {
    await db.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log('System settings initialized');
}

// Export seed function — call from setup.sh or API route, not at import time
// (auto-execution at module level causes issues during Next.js builds)
export { seedDefaultData };
