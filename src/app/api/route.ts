import { NextResponse } from "next/server";
import { getDbReady } from '@/lib/db';

export async function GET() {
  try {
    await getDbReady();
  } catch { /* ignore - just a health check */ }
  return NextResponse.json({ message: "Hello, world!" });
}