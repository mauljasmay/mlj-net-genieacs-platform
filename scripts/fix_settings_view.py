#!/usr/bin/env python3
"""Replace the SettingsView with the new version."""
with open('/home/z/my-project/src/app/page.tsx', 'r') as f:
    content = f.read()

start_marker = '// ==================== SETTINGS VIEW ===================='
end_marker = '// ==================== MIKROTIK VIEW ===================='

start = content.find(start_marker)
end = content.find(end_marker)

if start < 0 or end < 0:
    print(f"ERROR: markers not found: start={start}, end={end}")
    exit(1)

new_settings = '''// ==================== SETTINGS VIEW ====================
function SettingsView() {
  const { user } = useAppStore();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [serverMode, setServerMode] = useState<'local' | 'remote'>('local');
  const [showNbiPassword, setShowNbiPassword] = useState(false);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const flat: Record<string, string> = {};
        for (const items of Object.values(data.settings)) {
          for (const item of items as any[]) flat[item.key] = item.value;
        }
        setSettings(flat);
        if (flat.genieacs_server_mode === 'remote') setServerMode('remote');
        else setServerMode('local');
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadSettings(); }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) toast.success('Settings saved successfully');
      else toast.error('Failed to save settings');
    } catch { toast.error('Connection error'); } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!oldPassword || !newPassword) { toast.error('Old password and new password are required'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user?.id, oldPassword, password: newPassword }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to change password');
      }
    } catch { toast.error('Connection error'); } finally { setChangingPassword(false); }
  };

  const isRemote = serverMode === 'remote';
  const remoteBase = settings.genieacs_cwmp_host || '127.0.0.1';

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Branding */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400" /> Branding</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label className="text-xs text-muted-foreground">Platform Name</Label>
            <Input value={settings.brand_name || ''} onChange={e => setSettings({ ...settings, brand_name: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Subtitle</Label>
            <Input value={settings.brand_subtitle || ''} onChange={e => setSettings({ ...settings, brand_subtitle: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
        </CardContent>
      </Card>

      {/* GenieACS Server Mode */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Server className="w-4 h-4 text-cyan-400" /> GenieACS Server Mode</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Choose whether GenieACS runs locally or on a remote server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setServerMode('local'); setSettings({ ...settings, genieacs_server_mode: 'local' }); }}
              className={`p-4 rounded-lg border text-left transition-all ${
                !isRemote ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${!isRemote ? 'border-cyan-400 bg-cyan-400' : 'border-muted-foreground'}`}>
                  {!isRemote && <div className="w-1.5 h-1.5 rounded-full bg-background mx-auto mt-[1px]" />}
                </div>
                <Server className={`w-4 h-4 ${!isRemote ? 'text-cyan-400' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${!isRemote ? 'text-cyan-400' : 'text-muted-foreground'}`}>Local Server</span>
              </div>
              <p className="text-xs text-muted-foreground">GenieACS runs on the same server (localhost). Ports configurable below.</p>
            </button>
            <button
              onClick={() => { setServerMode('remote'); setSettings({ ...settings, genieacs_server_mode: 'remote' }); }}
              className={`p-4 rounded-lg border text-left transition-all ${
                isRemote ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${isRemote ? 'border-cyan-400 bg-cyan-400' : 'border-muted-foreground'}`}>
                  {isRemote && <div className="w-1.5 h-1.5 rounded-full bg-background mx-auto mt-[1px]" />}
                </div>
                <Globe className={`w-4 h-4 ${isRemote ? 'text-cyan-400' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${isRemote ? 'text-cyan-400' : 'text-muted-foreground'}`}>Remote Server</span>
              </div>
              <p className="text-xs text-muted-foreground">Connect to an external GenieACS server with custom URLs and credentials.</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* GenieACS Connection */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Network className="w-4 h-4 text-cyan-400" /> GenieACS Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isRemote ? (
            <>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> ACS Dashboard URL (Port 3000)</Label>
                <Input value={settings.genieacs_acs_url || `http://${remoteBase}:3000`}
                  onChange={e => setSettings({ ...settings, genieacs_acs_url: e.target.value })}
                  className="bg-white/5 border-white/10 mt-1" placeholder="http://remote-server:3000" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Cable className="w-3 h-3" /> CWMP / TR-069 URL (Port 7547)</Label>
                <Input value={settings.genieacs_cwmp_url || `http://${remoteBase}:7547`}
                  onChange={e => setSettings({ ...settings, genieacs_cwmp_url: e.target.value })}
                  className="bg-white/5 border-white/10 mt-1" placeholder="http://remote-server:7547" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Database className="w-3 h-3" /> NBI API URL (Port 7557)</Label>
                <Input value={settings.genieacs_nbi_url || `http://${remoteBase}:7557`}
                  onChange={e => setSettings({ ...settings, genieacs_nbi_url: e.target.value })}
                  className="bg-white/5 border-white/10 mt-1" placeholder="http://remote-server:7557" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><HardDrive className="w-3 h-3" /> File Server URL (Port 7567)</Label>
                <Input value={settings.genieacs_fs_url || `http://${remoteBase}:7567`}
                  onChange={e => setSettings({ ...settings, genieacs_fs_url: e.target.value })}
                  className="bg-white/5 border-white/10 mt-1" placeholder="http://remote-server:7567" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> CWMP Port</Label>
                  <Input value={settings.genieacs_cwmp_port || '7547'} onChange={e => setSettings({ ...settings, genieacs_cwmp_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> NBI Port</Label>
                  <Input value={settings.genieacs_nbi_port || '7557'} onChange={e => setSettings({ ...settings, genieacs_nbi_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> File Server Port</Label>
                <Input value={settings.genieacs_fs_port || '7567'} onChange={e => setSettings({ ...settings, genieacs_fs_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" />
              </div>
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Remote Server Credentials</p>
                <div><Label className="text-xs text-muted-foreground">NBI Username</Label>
                  <Input value={settings.genieacs_nbi_username || ''} onChange={e => setSettings({ ...settings, genieacs_nbi_username: e.target.value })}
                    className="bg-white/5 border-white/10 mt-1" placeholder="genieacs" /></div>
                <div className="relative"><Label className="text-xs text-muted-foreground">NBI Password</Label>
                  <Input type={showNbiPassword ? 'text' : 'password'} value={settings.genieacs_nbi_password || ''}
                    onChange={e => setSettings({ ...settings, genieacs_nbi_password: e.target.value })}
                    className="bg-white/5 border-white/10 mt-1 pr-10" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
                  <button type="button" onClick={() => setShowNbiPassword(!showNbiPassword)}
                    className="absolute right-3 top-7 text-muted-foreground hover:text-foreground">{showNbiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-2">
                <p className="text-xs text-emerald-400 flex items-center gap-2"><Server className="w-3.5 h-3.5" /> Local Server Mode</p>
                <p className="text-[11px] text-muted-foreground mt-1">GenieACS runs on this server. Configure the service ports below. The NBI URL is automatically set to localhost.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> CWMP Port (TR-069)</Label>
                  <Input value={settings.genieacs_cwmp_port || '7547'} onChange={e => setSettings({ ...settings, genieacs_cwmp_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> NBI API Port</Label>
                  <Input value={settings.genieacs_nbi_port || '7557'} onChange={e => setSettings({ ...settings, genieacs_nbi_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              </div>
              <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> File Server Port</Label>
                <Input value={settings.genieacs_fs_port || '7567'} onChange={e => setSettings({ ...settings, genieacs_fs_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> NBI URL (auto)</Label>
                <Input value={`http://localhost:${settings.genieacs_nbi_port || '7557'}`} className="bg-white/5 border-white/10 mt-1 opacity-60" disabled /></div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Change Password - HIDDEN in remote mode */}
      {!isRemote && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Key className="w-4 h-4 text-cyan-400" /> Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs text-muted-foreground">Current Password</Label>
              <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="bg-white/5 border-white/10 mt-1" placeholder="Enter current password" /></div>
            <div><Label className="text-xs text-muted-foreground">New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-white/5 border-white/10 mt-1" placeholder="Enter new password (min 6 chars)" /></div>
            <div><Label className="text-xs text-muted-foreground">Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-white/5 border-white/10 mt-1" placeholder="Confirm new password" /></div>
            <Button onClick={changePassword} disabled={changingPassword} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
              {changingPassword ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Change Password
            </Button>
          </CardContent>
        </Card>
      )}

      <Button onClick={saveSettings} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}

'''

new_content = content[:start] + new_settings + '\n\n' + content[end:]

with open('/home/z/my-project/src/app/page.tsx', 'w') as f:
    f.write(new_content)

print(f"SettingsView replaced! Old: {end-start} chars, New: {len(new_settings)} chars")
print(f"Total lines: {len(new_content.splitlines())}")