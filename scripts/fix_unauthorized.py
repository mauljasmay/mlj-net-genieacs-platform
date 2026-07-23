#!/usr/bin/env python3
"""Fix unauthorized error: replace all raw fetch('/api/...') with apiFetch('/api/...') in page.tsx"""

import re

FILE = '/home/z/my-project/src/app/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# Step 1: Replace apiFetch to always return Response (never null)
old_apiFetch = '''async function apiFetch(url: string, options?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      // Session expired or invalid — clear state and redirect to login
      try { await fetch('/api/auth', { method: 'DELETE' }); } catch {}
      useAppStore.getState().setUser(null);
      return null;
    }
    return res;
  } catch {
    return null; // Network error / timeout
  }
}'''

new_apiFetch = '''async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      // Session expired or invalid — clear state and redirect to login
      try { await fetch('/api/auth', { method: 'DELETE' }); } catch {}
      useAppStore.getState().setUser(null);
      return new Response('{"error":"Unauthorized"}', { status: 401, statusText: 'Unauthorized', headers: { 'Content-Type': 'application/json' } });
    }
    return res;
  } catch {
    return new Response('{"error":"Network error"}', { status: 0, statusText: 'Network Error', headers: { 'Content-Type': 'application/json' } });
  }
}'''

content = content.replace(old_apiFetch, new_apiFetch)

# Step 2: Fix apiFetchJson (remove !res check since apiFetch never returns null now)
old_apiFetchJson = '''async function apiFetchJson(url: string, options?: RequestInit): Promise<any | null> {
  const res = await apiFetch(url, options);
  if (!res || !res.ok) return null;
  try { return await res.json(); } catch { return null; }
}'''

new_apiFetchJson = '''async function apiFetchJson(url: string, options?: RequestInit): Promise<any | null> {
  const res = await apiFetch(url, options);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}'''

content = content.replace(old_apiFetchJson, new_apiFetchJson)

# Step 3: Fix DashboardView's `if (!res) return;` check (now apiFetch always returns Response)
content = content.replace(
    "      if (!res) return; // 401 redirected to login, or network error\n",
    "      if (!res.ok) return; // 401 or network error handled by apiFetch\n"
)

# Step 4: Fix the 'throw new Error(\'Failed\')' at DevicesView
# Replace the throw with a silent return (error already handled by apiFetch on 401)
content = content.replace(
    "      if (!res.ok) throw new Error('Failed');",
    "      if (!res.ok) { console.error('Devices API returned', res.status); return; }"
)

# Step 5: Replace all `await fetch('/api/devices` with `await apiFetch('/api/devices`
# Be careful: only replace fetch calls that start with '/api/' (not login/logout)
# Pattern: await fetch(` or await fetch('  followed by /api/

# Replace: await fetch('/api/devices... with await apiFetch('/api/devices...
content = re.sub(
    r"await fetch\('/api/devices",
    "await apiFetch('/api/devices",
    content
)

# Replace: await fetch(`/api/devices... with await apiFetch(`/api/devices...
content = re.sub(
    r"await fetch\(`/api/devices",
    "await apiFetch(`/api/devices",
    content
)

# Replace: await fetch('/api/users... with await apiFetch('/api/users...
content = re.sub(
    r"await fetch\('/api/users",
    "await apiFetch('/api/users",
    content
)

# Replace: await fetch(`/api/users... with await apiFetch(`/api/users...
content = re.sub(
    r"await fetch\(`/api/users",
    "await apiFetch(`/api/users",
    content
)

# Replace: await fetch('/api/settings... with await apiFetch('/api/settings...
content = re.sub(
    r"await fetch\('/api/settings",
    "await apiFetch('/api/settings",
    content
)

# Replace: await fetch('/api/mikrotik... with await apiFetch('/api/mikrotik...
content = re.sub(
    r"await fetch\('/api/mikrotik",
    "await apiFetch('/api/mikrotik",
    content
)

# Replace: await fetch(`/api/pppoe... with await apiFetch(`/api/pppoe...
content = re.sub(
    r"await fetch\(`/api/pppoe",
    "await apiFetch(`/api/pppoe",
    content
)

# Replace: await fetch('/api/pppoe... with await apiFetch('/api/pppoe...
content = re.sub(
    r"await fetch\('/api/pppoe",
    "await apiFetch('/api/pppoe",
    content
)

# Replace: await fetch(`/api/hotspot... with await apiFetch(`/api/hotspot...
content = re.sub(
    r"await fetch\(`/api/hotspot",
    "await apiFetch(`/api/hotspot",
    content
)

# Replace: await fetch('/api/hotspot... with await apiFetch('/api/hotspot...
content = re.sub(
    r"await fetch\('/api/hotspot",
    "await apiFetch('/api/hotspot",
    content
)

with open(FILE, 'w') as f:
    f.write(content)

print("Done! All raw fetch('/api/...') calls replaced with apiFetch('/api/...')")

# Verify: count remaining raw fetch calls to /api/ (should only be login, logout, and inside apiFetch)
remaining = re.findall(r"await fetch\(['\`]\s*/api/", content)
print(f"Remaining raw fetch('/api/...') calls: {len(remaining)}")
for r in remaining:
    print(f"  - {r}")
