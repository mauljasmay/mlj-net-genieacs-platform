import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getGenieACSSettings } from '@/lib/genieacs';
import { getDbReady } from '@/lib/db';

async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;
  return verifySession(token);
}

// Helper to get NBI URL and auth from DB settings or env
async function getNBIConfig() {
  const settings = await getGenieACSSettings();
  return {
    nbiUrl: settings.url,
    nbiUser: settings.username,
    nbiPass: settings.password,
    mode: settings.mode,
  };
}

function getAuthHeaders(nbiUser: string, nbiPass: string, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (nbiUser && nbiPass) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${nbiUser}:${nbiPass}`).toString('base64');
  }
  return headers;
}

// Proxy device requests to GenieACS NBI API
export async function GET(request: NextRequest) {
  try {
    await getDbReady();
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { nbiUrl, nbiUser, nbiPass, mode } = await getNBIConfig();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');
    const limit = searchParams.get('limit') || '50';
    const skip = searchParams.get('skip') || '0';
    const query = searchParams.get('query') || '{}';

    let targetUrl = `${nbiUrl}`;

    if (action === 'list') {
      const projection = searchParams.get('projection') ||
        '{"_id":1,"_registered":1,"_lastInform":1,"_lastBoot":1,"_lastBootstrap":1,"_tags":1,"_deviceId":1,"InternetGatewayDevice.":1,"Device.":1}';
      targetUrl += `/devices/?limit=${limit}&skip=${skip}&query=${encodeURIComponent(query)}&projection=${encodeURIComponent(projection)}`;
    } else if (action === 'detail' && deviceId) {
      targetUrl += `/devices/${encodeURIComponent(deviceId)}`;
    } else if (action === 'parameters' && deviceId) {
      targetUrl += `/devices/${encodeURIComponent(deviceId)}/parameters`;
    } else if (action === 'tasks') {
      targetUrl += `/tasks/?limit=${limit}&skip=${skip}`;
    } else if (action === 'faults') {
      targetUrl += `/faults/?limit=${limit}&skip=${skip}`;
    } else if (action === 'presets') {
      targetUrl += `/presets/?limit=1000`;
    } else if (action === 'provisions') {
      targetUrl += `/provisions/?limit=1000`;
    } else if (action === 'virtualParameters') {
      targetUrl += `/virtual_parameters/?limit=1000`;
    } else if (action === 'files') {
      targetUrl += `/files/?limit=1000`;
    } else if (action === 'status') {
      targetUrl += '/';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const headers = getAuthHeaders(nbiUser, nbiPass, { 'Accept': 'application/json' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(targetUrl, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: `NBI returned ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('json')) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'NBI timeout' }, { status: 504 });
    }
    console.error('Device proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch from GenieACS' }, { status: 500 });
  }
}

// Create tasks, tags, etc.
export async function POST(request: NextRequest) {
  try {
    await getDbReady();
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, deviceId, taskName, parameterValues, parameterNames, tagName } = body;

    const { nbiUrl, nbiUser, nbiPass } = await getNBIConfig();
    const headers = getAuthHeaders(nbiUser, nbiPass, {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });

    let targetUrl = `${nbiUrl}`;
    let postBody: any;

    if (action === 'task' && deviceId && taskName) {
      targetUrl += `/devices/${encodeURIComponent(deviceId)}/tasks`;
      if (taskName === 'setParameterValues') {
        postBody = { name: 'setParameterValues', parameterValues };
      } else if (taskName === 'getParameterValues') {
        postBody = { name: 'getParameterValues', parameterNames };
      } else if (taskName === 'refreshObject') {
        postBody = { name: 'refreshObject', objectName: 'InternetGatewayDevice' };
      } else {
        postBody = { name: taskName };
      }
    } else if (action === 'addTag' && deviceId && tagName) {
      targetUrl += `/devices/${encodeURIComponent(deviceId)}/tags/${encodeURIComponent(tagName)}`;
    } else if (action === 'summon' && deviceId) {
      targetUrl += `/devices/${encodeURIComponent(deviceId)}/tasks`;
      postBody = { name: 'refreshInform' };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: postBody ? JSON.stringify(postBody) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    if (res.headers.get('content-type')?.includes('json')) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Device POST proxy error:', error);
    return NextResponse.json({ error: 'Failed to execute' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getDbReady();
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');
    const tagName = searchParams.get('tagName');
    const taskId = searchParams.get('taskId');
    const faultId = searchParams.get('faultId');
    const presetId = searchParams.get('presetId');
    const provisionId = searchParams.get('provisionId');
    const vpId = searchParams.get('vpId') || searchParams.get('virtualParameterId');
    const fileId = searchParams.get('fileId');

    const { nbiUrl, nbiUser, nbiPass } = await getNBIConfig();
    const headers = getAuthHeaders(nbiUser, nbiPass);

    let targetUrl = `${nbiUrl}`;

    if (action === 'device' && deviceId) {
      targetUrl += `/devices/${encodeURIComponent(deviceId)}`;
    } else if (action === 'removeTag' && deviceId && tagName) {
      targetUrl += `/devices/${encodeURIComponent(deviceId)}/tags/${encodeURIComponent(tagName)}`;
    } else if (action === 'task' && taskId) {
      targetUrl += `/tasks/${encodeURIComponent(taskId)}`;
    } else if (action === 'fault' && faultId) {
      targetUrl += `/faults/${encodeURIComponent(faultId)}`;
    } else if (action === 'preset' && presetId) {
      targetUrl += `/presets/${encodeURIComponent(presetId)}`;
    } else if (action === 'provision' && provisionId) {
      targetUrl += `/provisions/${encodeURIComponent(provisionId)}`;
    } else if (action === 'virtualParameter' && vpId) {
      targetUrl += `/virtual_parameters/${encodeURIComponent(vpId)}`;
    } else if (action === 'file' && fileId) {
      targetUrl += `/files/${encodeURIComponent(fileId)}`;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const res = await fetch(targetUrl, { method: 'DELETE', headers });
    return NextResponse.json({ success: res.ok });
  } catch (error: any) {
    console.error('Device DELETE proxy error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}