#!/usr/bin/env python3
"""
Generate the complete page.tsx with all fixes and new views.
Reads the original, applies modifications, and writes the result.
"""
import re

# Read the original file
with open('/home/z/my-project/src/app/page.tsx', 'r') as f:
    original = f.read()

# ============================================================
# 1. FIX IMPORTS - Add new lucide icons
# ============================================================
old_imports = """import {
  LayoutDashboard, Monitor, Cpu, FileText, AlertTriangle, Settings, Users, Activity,
  LogOut, Search, RefreshCw, Wifi, WifiOff, ChevronLeft, ChevronRight,
  Trash2, Plus, Download, Check, Power, Radio,
  Network, Clock, Server, HardDrive, Zap, Globe, Lock,
  Menu, ArrowLeft, Tag, XCircle, AlertCircle,
  RadioTower, Router, Plug
} from 'lucide-react';"""

new_imports = """import {
  LayoutDashboard, Monitor, Cpu, FileText, AlertTriangle, Settings, Users, Activity,
  LogOut, Search, RefreshCw, Wifi, WifiOff, ChevronLeft, ChevronRight,
  Trash2, Plus, Download, Check, Power, Radio,
  Network, Clock, Server, HardDrive, Zap, Globe, Lock,
  Menu, ArrowLeft, Tag, XCircle, AlertCircle,
  RadioTower, Router, Plug,
  Eye, EyeOff, Link2, Terminal, Wrench, Edit2, Save, X,
  Shield, UserCheck, WifiHigh, CircleDot, ListChecks,
  Signal, Thermometer, Hash, AtSign, BarChart3, Layers,
  FolderOpen, FileCode2, ShieldCheck, Database, Key,
  Copy, ArrowUpRight, Timer, Boxes, Cable, PieChart as PieChartIcon
} from 'lucide-react';"""

original = original.replace(old_imports, new_imports)

# ============================================================
# 2. FIX SIDEBAR - Add MikroTik, PPPoE, Hotspot + change Files icon
# ============================================================
old_sidebar_items = """  const navItems: { id: ViewId; icon: React.ReactNode; label: string; roles?: string[] }[] = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'devices', icon: <Monitor className="w-5 h-5" />, label: 'Devices' },
    { id: 'tasks', icon: <FileText className="w-5 h-5" />, label: 'Tasks' },
    { id: 'faults', icon: <AlertTriangle className="w-5 h-5" />, label: 'Faults' },
    { id: 'presets', icon: <Settings className="w-5 h-5" />, label: 'Presets' },
    { id: 'provisions', icon: <Cpu className="w-5 h-5" />, label: 'Provisions' },
    { id: 'virtual-parameters', icon: <Zap className="w-5 h-5" />, label: 'Virtual Params' },
    { id: 'files', icon: <HardDrive className="w-5 h-5" />, label: 'Files' },
    { id: 'system-status', icon: <Activity className="w-5 h-5" />, label: 'System Status' },
    { id: 'admin', icon: <Users className="w-5 h-5" />, label: 'Users', roles: ['superadmin', 'admin'] },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];"""

new_sidebar_items = """  const navItems: { id: ViewId; icon: React.ReactNode; label: string; roles?: string[] }[] = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'devices', icon: <Monitor className="w-5 h-5" />, label: 'Devices' },
    { id: 'tasks', icon: <FileText className="w-5 h-5" />, label: 'Tasks' },
    { id: 'faults', icon: <AlertTriangle className="w-5 h-5" />, label: 'Faults' },
    { id: 'presets', icon: <ListChecks className="w-5 h-5" />, label: 'Presets' },
    { id: 'provisions', icon: <Cpu className="w-5 h-5" />, label: 'Provisions' },
    { id: 'virtual-parameters', icon: <Zap className="w-5 h-5" />, label: 'Virtual Params' },
    { id: 'files', icon: <FolderOpen className="w-5 h-5" />, label: 'Files' },
    { id: 'mikrotik', icon: <Router className="w-5 h-5" />, label: 'MikroTik', roles: ['superadmin', 'admin', 'multi_talent', 'technician', 'mikrotik'] },
    { id: 'pppoe', icon: <WifiHigh className="w-5 h-5" />, label: 'PPPoE Active', roles: ['superadmin', 'admin', 'multi_talent', 'technician', 'mikrotik', 'pppoe'] },
    { id: 'hotspot', icon: <Wifi className="w-5 h-5" />, label: 'Hotspot', roles: ['superadmin', 'admin', 'multi_talent', 'technician', 'mikrotik', 'hotspot'] },
    { id: 'system-status', icon: <Activity className="w-5 h-5" />, label: 'System Status' },
    { id: 'admin', icon: <Users className="w-5 h-5" />, label: 'Users', roles: ['superadmin', 'admin'] },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];"""

original = original.replace(old_sidebar_items, new_sidebar_items)

# ============================================================
# 3. FIX TOPBAR - Add new view titles
# ============================================================
old_titles = """  const viewTitles: Record<ViewId, string> = {
    'dashboard': 'Dashboard',
    'devices': 'Device Management',
    'device-detail': 'Device Detail',
    'tasks': 'Task Management',
    'presets': 'Presets',
    'provisions': 'Provisions',
    'virtual-parameters': 'Virtual Parameters',
    'faults': 'Fault Center',
    'files': 'File Management',
    'admin': 'User Management',
    'settings': 'System Settings',
    'system-status': 'System Status',
  };"""

new_titles = """  const viewTitles: Record<ViewId, string> = {
    'dashboard': 'Dashboard',
    'devices': 'Device Management',
    'device-detail': 'Device Detail',
    'tasks': 'Task Management',
    'presets': 'Presets',
    'provisions': 'Provisions',
    'virtual-parameters': 'Virtual Parameters',
    'faults': 'Fault Center',
    'files': 'File Management',
    'mikrotik': 'MikroTik Configuration',
    'pppoe': 'PPPoE Active Management',
    'hotspot': 'Hotspot Management',
    'admin': 'User Management',
    'settings': 'System Settings',
    'system-status': 'System Status',
  };"""

original = original.replace(old_titles, new_titles)

# ============================================================
# 4. FIX DASHBOARD - Add PPPoE/Hotspot stats to loadStats
# ============================================================
old_dashboard_stats_set = """      setDashboardStats({
        totalDevices: devices.length,
        onlineDevices: onlineDevices.length,
        offlineDevices: offlineDevices.length,
        activeOnt: onlineDevices.length,
        inactiveOnt: offlineDevices.length,
        totalFaults: 0,
        pendingTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        devicesByManufacturer: byManufacturer,
        devicesByModel: {},
        devicesByFirmware: byFirmware,
        recentDevices,
      });"""

new_dashboard_stats_set = """      // Fetch PPPoE and Hotspot stats
      let pppoeActiveCount = 0;
      let hotspotUsersCount = 0;
      let hotspotActiveCount = 0;
      try {
        const [pppoeRes, hsRes, hsUsersRes] = await Promise.allSettled([
          fetch('/api/pppoe?tab=active'),
          fetch('/api/hotspot?tab=active'),
          fetch('/api/hotspot?tab=users'),
        ]);
        if (pppoeRes.status === 'fulfilled' && pppoeRes.value.ok) {
          const pppoeData = await pppoeRes.value.json();
          pppoeActiveCount = Array.isArray(pppoeData.data) ? pppoeData.data.length : 0;
        }
        if (hsRes.status === 'fulfilled' && hsRes.value.ok) {
          const hsData = await hsRes.value.json();
          hotspotActiveCount = Array.isArray(hsData.data) ? hsData.data.length : 0;
        }
        if (hsUsersRes.status === 'fulfilled' && hsUsersRes.value.ok) {
          const hsUsersData = await hsUsersRes.value.json();
          hotspotUsersCount = Array.isArray(hsUsersData.data) ? hsUsersData.data.length : 0;
        }
      } catch { /* MikroTik not connected */ }

      setDashboardStats({
        totalDevices: devices.length,
        onlineDevices: onlineDevices.length,
        offlineDevices: offlineDevices.length,
        activeOnt: onlineDevices.length,
        inactiveOnt: offlineDevices.length,
        totalFaults: 0,
        pendingTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pppoeActive: pppoeActiveCount,
        pppoeSecrets: 0,
        hotspotUsers: hotspotUsersCount,
        hotspotActive: hotspotActiveCount,
        devicesByManufacturer: byManufacturer,
        devicesByModel: {},
        devicesByFirmware: byFirmware,
        recentDevices,
      });"""

original = original.replace(old_dashboard_stats_set, new_dashboard_stats_set)

# Add PPPoE/Hotspot stat cards after the first stats grid
old_dashboard_stats_grid = """      {/* Online Percentage Bar */}"""

new_dashboard_stats_grid = """      {/* Second row - PPPoE & Hotspot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="PPPoE Active" value={stats?.pppoeActive ?? 0} icon={<WifiHigh className="w-5 h-5" />}
          trend="Connected sessions" color="cyan" />
        <StatCard title="Hotspot Users" value={stats?.hotspotUsers ?? 0} icon={<Users className="w-5 h-5" />}
          trend={`${stats?.hotspotActive ?? 0} active`} color="emerald" />
        <StatCard title="PPPoE Secrets" value={stats?.pppoeSecrets ?? 0} icon={<Key className="w-5 h-5" />}
          trend="Registered accounts" color="amber" />
        <StatCard title="Hotspot Active" value={stats?.hotspotActive ?? 0} icon={<CircleDot className="w-5 h-5" />}
          trend="Live connections" color="violet" />
      </div>

      {/* Online Percentage Bar */}"""

original = original.replace(old_dashboard_stats_grid, new_dashboard_stats_grid)

# Add amber to StatCard colorMap
old_colormap = """    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',"""

new_colormap = """    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',"""

original = original.replace(old_colormap, new_colormap)

# Add icons to Dashboard chart titles
old_device_status_title = '<CardTitle className="text-sm font-medium text-muted-foreground">Device Status</CardTitle>'
new_device_status_title = '<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><PieChartIcon className="w-4 h-4" /> Device Status</CardTitle>'
original = original.replace(old_device_status_title, new_device_status_title)

old_manufacturer_title = '<CardTitle className="text-sm font-medium text-muted-foreground">By Manufacturer</CardTitle>'
new_manufacturer_title = '<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Layers className="w-4 h-4" /> By Manufacturer</CardTitle>'
original = original.replace(old_manufacturer_title, new_manufacturer_title)

old_recent_devices_title = '          <CardTitle className="text-sm font-medium text-muted-foreground">Recent Devices</CardTitle>'
new_recent_devices_title = '          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Devices</CardTitle>'
original = original.replace(old_recent_devices_title, new_recent_devices_title)

old_online_rate_text = '<span className="text-sm text-muted-foreground">Device Online Rate</span>'
new_online_rate_text = '<span className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Device Online Rate</span>'
original = original.replace(old_online_rate_text, new_online_rate_text)

# ============================================================
# 5. FIX ADMIN VIEW - Add multi_talent role
# ============================================================
old_role_select = """{['superadmin', 'admin', 'operator', 'technician', 'viewer'].map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}"""
new_role_select = """{['superadmin', 'admin', 'operator', 'technician', 'multi_talent', 'mikrotik', 'pppoe', 'hotspot', 'viewer'].map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}"""
original = original.replace(old_role_select, new_role_select)

old_role_badge = """    const colors: Record<string, string> = {
      superadmin: 'bg-red-500/10 text-red-400 border-red-500/20',
      admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      operator: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      technician: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      viewer: 'bg-white/5 text-muted-foreground border-white/10',
    };"""

new_role_badge = """    const colors: Record<string, string> = {
      superadmin: 'bg-red-500/10 text-red-400 border-red-500/20',
      admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      operator: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      technician: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      multi_talent: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      mikrotik: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      pppoe: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      hotspot: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      viewer: 'bg-white/5 text-muted-foreground border-white/10',
    };"""

original = original.replace(old_role_badge, new_role_badge)

# ============================================================
# 6. REWRITE SETTINGS VIEW - Fix server mode UI
# ============================================================
old_settings_view = """// ==================== SETTINGS VIEW ====================
function SettingsView() {
  const { user } = useAppStore();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  // Server Mode feature
  const [serverMode, setServerMode] = useState<'local' | 'remote'>('local');

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
        // Load server mode from settings
        if (flat.genieacs_server_mode === 'remote') {
          setServerMode('remote');
        } else {
          setServerMode('local');
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadSettings(); }, []);

  // Bug #8 fix: save with feedback
  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setSaving(false);
    }
  };

  // Bug #7 fix: Change password with proper UI and validation
  const changePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('Old password and new password are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Bug #4 fix: use user.id instead of userId (userId was removed from UserSession)
        body: JSON.stringify({ id: user?.id, oldPassword, password: newPassword }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to change password');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setChangingPassword(false);
    }
  };

  const isRemote = serverMode === 'remote';

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Branding */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium">Branding</CardTitle></CardHeader>
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
          <CardTitle className="text-sm font-medium">GenieACS Server Mode</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Choose whether GenieACS runs locally or on a remote server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setServerMode('local'); setSettings({ ...settings, genieacs_server_mode: 'local' }); }}
              className={`flex-1 p-4 rounded-lg border text-left transition-all ${
                !isRemote
                  ? 'border-cyan-500/40 bg-cyan-500/5'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${!isRemote ? 'border-cyan-400 bg-cyan-400' : 'border-muted-foreground'}`}>
                  {!isRemote && <div className="w-1.5 h-1.5 rounded-full bg-background mx-auto mt-[1px]" />}
                </div>
                <span className={`text-sm font-medium ${!isRemote ? 'text-cyan-400' : 'text-muted-foreground'}`}>Local</span>
              </div>
              <p className="text-xs text-muted-foreground">GenieACS runs on the same server using localhost and default ports.</p>
            </button>
            <button
              onClick={() => { setServerMode('remote'); setSettings({ ...settings, genieacs_server_mode: 'remote' }); }}
              className={`flex-1 p-4 rounded-lg border text-left transition-all ${
                isRemote
                  ? 'border-cyan-500/40 bg-cyan-500/5'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${isRemote ? 'border-cyan-400 bg-cyan-400' : 'border-muted-foreground'}`}>
                  {isRemote && <div className="w-1.5 h-1.5 rounded-full bg-background mx-auto mt-[1px]" />}
                </div>
                <span className={`text-sm font-medium ${isRemote ? 'text-cyan-400' : 'text-muted-foreground'}`}>Remote</span>
              </div>
              <p className="text-xs text-muted-foreground">Connect to an external GenieACS server with custom NBI URL and credentials.</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* GenieACS Connection */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium">GenieACS Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">NBI URL</Label>
            <Input
              value={settings.genieacs_nbi_url || ''}
              onChange={e => setSettings({ ...settings, genieacs_nbi_url: e.target.value })}
              className="bg-white/5 border-white/10 mt-1"
              placeholder={isRemote ? 'http://remote-server:7557' : 'http://localhost:7557'}
              disabled={!isRemote}
            />
            {!isRemote && <p className="text-[10px] text-muted-foreground mt-1">Uses default localhost URL in local mode</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground">CWMP Port</Label>
              <Input value={settings.genieacs_cwmp_port || '7547'} onChange={e => setSettings({ ...settings, genieacs_cwmp_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">NBI Port</Label>
              <Input value={settings.genieacs_nbi_port || '7557'} onChange={e => setSettings({ ...settings, genieacs_nbi_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
          </div>
          {/* Remote mode credentials */}
          <div className={`space-y-3 transition-opacity ${isRemote ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div><Label className="text-xs text-muted-foreground">NBI Username</Label>
              <Input
                value={settings.genieacs_nbi_username || ''}
                onChange={e => setSettings({ ...settings, genieacs_nbi_username: e.target.value })}
                className="bg-white/5 border-white/10 mt-1"
                placeholder="genieacs"
                disabled={!isRemote}
              /></div>
            <div><Label className="text-xs text-muted-foreground">NBI Password</Label>
              <Input
                type="password"
                value={settings.genieacs_nbi_password || ''}
                onChange={e => setSettings({ ...settings, genieacs_nbi_password: e.target.value })}
                className="bg-white/5 border-white/10 mt-1"
                placeholder="\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022"
                disabled={!isRemote}
              /></div>
          </div>
        </CardContent>
      </Card>

      {/* Bug #7: Change Password Card */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium">Change Password</CardTitle></CardHeader>
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

      {/* Save */}
      <Button onClick={saveSettings} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}"""

new_settings_view = """// ==================== SETTINGS VIEW ====================
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
        if (flat.genieacs_server_mode === 'remote') {
          setServerMode('remote');
        } else {
          setServerMode('local');
        }
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
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setSaving(false);
    }
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
            /* ====== REMOTE MODE: Show all URL fields ====== */
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
            /* ====== LOCAL MODE: Show local port configs only ====== */
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
}"""

original = original.replace(old_settings_view, new_settings_view)

# ============================================================
# 7. ADD NEW VIEWS (MikroTik, PPPoE, Hotspot) before HomePage
# ============================================================
new_views = """
// ==================== MIKROTIK VIEW ====================
function MikroTikView() {
  const [config, setConfig] = useState({ host: '', port: '8728', username: '', password: '', hasPassword: false });
  const [editConfig, setEditConfig] = useState({ host: '', port: '8728', username: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; identity?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mikrotik');
      if (res.ok) {
        const data = await res.json();
        setConfig({ host: data.host || '', port: String(data.port || '8728'), username: data.username || '', password: data.password || '', hasPassword: data.hasPassword });
        setEditConfig({ host: data.host || '', port: String(data.port || '8728'), username: data.username || '', password: '' });
      }
    } catch { toast.error('Failed to load MikroTik config'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/mikrotik', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      });
      if (res.ok) {
        toast.success('MikroTik config saved');
        loadConfig();
      } else { toast.error('Failed to save'); }
    } catch { toast.error('Connection error'); } finally { setSaving(false); }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/mikrotik?action=test');
      const data = await res.json();
      setTestResult(data);
      if (data.success) toast.success(`Connected to: ${data.identity}`);
      else toast.error(data.error || 'Connection failed');
    } catch { setTestResult({ success: false, error: 'Connection error' }); toast.error('Connection error'); }
    finally { setTesting(false); }
  };

  if (loading) return <div className="p-6"><Skeleton className="h-64 bg-white/5 rounded-xl" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Router className="w-4 h-4" /> RouterOS API Configuration</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing} className="text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
            {testing ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Wifi className="w-3.5 h-3.5 mr-1" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <Alert className={`${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {testResult.success ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertDescription>
            {testResult.success ? `Connected! Router Identity: ${testResult.identity}` : `Failed: ${testResult.error}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Config */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Terminal className="w-4 h-4 text-cyan-400" /> RouterOS Connection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> Host / IP Address</Label>
              <Input value={editConfig.host} onChange={e => setEditConfig({ ...editConfig, host: e.target.value })}
                className="bg-white/5 border-white/10 mt-1" placeholder="192.168.1.1" /></div>
            <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> API Port</Label>
              <Input value={editConfig.port} onChange={e => setEditConfig({ ...editConfig, port: e.target.value })}
                className="bg-white/5 border-white/10 mt-1" placeholder="8728" /></div>
          </div>
          <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> Username</Label>
            <Input value={editConfig.username} onChange={e => setEditConfig({ ...editConfig, username: e.target.value })}
              className="bg-white/5 border-white/10 mt-1" placeholder="admin" /></div>
          <div className="relative">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Key className="w-3 h-3" /> Password</Label>
            <Input type={showPassword ? 'text' : 'password'} value={editConfig.password}
              onChange={e => setEditConfig({ ...editConfig, password: e.target.value })}
              className="bg-white/5 border-white/10 mt-1 pr-10" placeholder={config.hasPassword ? 'Enter new password (leave blank to keep)' : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-7 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          <Button onClick={saveConfig} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" /> Current Connection Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-white/[0.02]"><p className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> Host</p><p className="text-sm font-mono mt-1">{config.host || 'Not set'}</p></div>
            <div className="p-3 rounded-lg bg-white/[0.02]"><p className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> Port</p><p className="text-sm font-mono mt-1">{config.port}</p></div>
            <div className="p-3 rounded-lg bg-white/[0.02]"><p className="text-xs text-muted-foreground flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> Username</p><p className="text-sm font-mono mt-1">{config.username}</p></div>
            <div className="p-3 rounded-lg bg-white/[0.02]"><p className="text-xs text-muted-foreground flex items-center gap-1.5"><Key className="w-3 h-3" /> Password</p><p className="text-sm font-mono mt-1">{config.hasPassword ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'Not set'}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== PPPOE VIEW ====================
function PPPoEView() {
  const [activeTab, setActiveTab] = useState('active');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pppoe?tab=${activeTab}`);
      if (res.ok) {
        const result = await res.json();
        setData(Array.isArray(result.data) ? result.data : []);
      }
    } catch { toast.error('Failed to load PPPoE data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pppoe?tab=${activeTab}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Deleted'); loadData(); } else toast.error('Failed to delete');
    } catch { toast.error('Connection error'); }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData({});
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      if (k !== '.id' && typeof v === 'string') fields[k] = v;
    }
    setFormData(fields);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { tab: activeTab, action: editItem ? 'edit' : 'add', ...formData };
      if (editItem) body['.id'] = editItem['.id'];
      const res = await fetch('/api/pppoe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success(editItem ? 'Updated' : 'Created'); setShowModal(false); loadData(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Connection error'); } finally { setSaving(false); }
  };

  const secretFields = ['name', 'password', 'profile', 'service'];
  const profileFields = ['name', 'rate-limit', 'local-address', 'remote-address'];
  const formFields = activeTab === 'secret' ? secretFields : activeTab === 'profile' ? profileFields : [];

  const activeColumns = [
    { key: 'name', label: 'Name' },
    { key: 'caller-id', label: 'Caller ID' },
    { key: 'address', label: 'IP Address' },
    { key: 'uptime', label: 'Uptime' },
  ];

  const secretColumns = [
    { key: 'name', label: 'Name' },
    { key: 'password', label: 'Password' },
    { key: 'profile', label: 'Profile' },
    { key: 'service', label: 'Service' },
  ];

  const columns = activeTab === 'active' ? activeColumns : activeTab === 'secret' ? secretColumns : [{ key: 'name', label: 'Name' }, { key: 'rate-limit', label: 'Rate Limit' }];

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><WifiHigh className="w-4 h-4" /> {data.length} entries</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
          {activeTab !== 'active' && (
            <Button size="sm" onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-500 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5"><TabsTrigger value="active" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">Active</TabsTrigger><TabsTrigger value="secret" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">Secrets</TabsTrigger><TabsTrigger value="profile" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">Profiles</TabsTrigger></TabsList>
      </Tabs>

      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
            {columns.map(col => <TableHead key={col.key} className="text-xs text-muted-foreground">{col.label}</TableHead>)}
            {activeTab !== 'active' && <TableHead className="text-xs text-muted-foreground">Actions</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-white/[0.04]"><TableCell colSpan={columns.length + 1}><Skeleton className="h-8 bg-white/5" /></TableCell></TableRow>
            )) : data.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-12 text-muted-foreground">No {activeTab} entries found</TableCell></TableRow>
            ) : data.slice(0, 100).map((item) => (
              <TableRow key={item['.id'] || item.name} className="border-white/[0.04] table-row-hover">
                {columns.map(col => (
                  <TableCell key={col.key} className="text-xs font-mono truncate max-w-[200px]">
                    {col.key === 'password' ? '\u2022\u2022\u2022\u2022\u2022\u2022' : String(item[col.key] || '\u2014')}
                  </TableCell>
                ))}
                {activeTab !== 'active' && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-cyan-400" onClick={() => openEdit(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(item['.id'])}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formFields.map(field => (
              <div key={field}>
                <Label className="text-xs text-muted-foreground capitalize">{field.replace(/-/g, ' ')}</Label>
                <Input value={formData[field] || ''} onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                  className="bg-white/5 border-white/10 mt-1" type={field === 'password' ? 'password' : 'text'} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== HOTSPOT VIEW ====================
function HotspotView() {
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hotspot?tab=${activeTab}`);
      if (res.ok) {
        const result = await res.json();
        setData(Array.isArray(result.data) ? result.data : []);
      }
    } catch { toast.error('Failed to load Hotspot data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/hotspot?tab=${activeTab}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Deleted'); loadData(); } else toast.error('Failed to delete');
    } catch { toast.error('Connection error'); }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData({});
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      if (k !== '.id' && typeof v === 'string') fields[k] = v;
    }
    setFormData(fields);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { tab: activeTab, action: editItem ? 'edit' : 'add', ...formData };
      if (editItem) body['.id'] = editItem['.id'];
      const res = await fetch('/api/hotspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success(editItem ? 'Updated' : 'Created'); setShowModal(false); loadData(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Connection error'); } finally { setSaving(false); }
  };

  const userFields = ['name', 'password', 'profile', 'server'];
  const profileFields = ['name', 'rate-limit', 'shared-users', 'session-timeout', 'keepalive-timeout'];
  const serverFields = ['name', 'interface', 'addresses-per-mac', 'idle-timeout', 'keepalive-timeout'];
  const formFields = activeTab === 'users' ? userFields : activeTab === 'profile' ? profileFields : serverFields;

  const usersColumns = [
    { key: 'name', label: 'Username' },
    { key: 'password', label: 'Password' },
    { key: 'profile', label: 'Profile' },
    { key: 'server', label: 'Server' },
  ];
  const activeColumns = [
    { key: 'user', label: 'User' },
    { key: 'address', label: 'IP Address' },
    { key: 'mac-address', label: 'MAC Address' },
    { key: 'uptime', label: 'Uptime' },
  ];
  const profileColumns = [
    { key: 'name', label: 'Name' },
    { key: 'rate-limit', label: 'Rate Limit' },
    { key: 'shared-users', label: 'Shared Users' },
  ];
  const serverColumns = [
    { key: 'name', label: 'Name' },
    { key: 'interface', label: 'Interface' },
    { key: 'addresses-per-mac', label: 'Addr/MAC' },
  ];

  const columnsMap: Record<string, { key: string; label: string }[]> = {
    users: usersColumns, active: activeColumns, profile: profileColumns, server: serverColumns,
  };
  const columns = columnsMap[activeTab] || usersColumns;
  const canEdit = activeTab !== 'active';

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Wifi className="w-4 h-4" /> {data.length} entries</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
          {canEdit && (
            <Button size="sm" onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-500 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5">
          <TabsTrigger value="users" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">Users</TabsTrigger>
          <TabsTrigger value="active" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">Active</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">Profiles</TabsTrigger>
          <TabsTrigger value="server" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">Servers</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
            {columns.map(col => <TableHead key={col.key} className="text-xs text-muted-foreground">{col.label}</TableHead>)}
            {canEdit && <TableHead className="text-xs text-muted-foreground">Actions</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-white/[0.04]"><TableCell colSpan={columns.length + 1}><Skeleton className="h-8 bg-white/5" /></TableCell></TableRow>
            )) : data.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-12 text-muted-foreground">No {activeTab} entries found</TableCell></TableRow>
            ) : data.slice(0, 100).map((item) => (
              <TableRow key={item['.id'] || item.name} className="border-white/[0.04] table-row-hover">
                {columns.map(col => (
                  <TableCell key={col.key} className="text-xs font-mono truncate max-w-[200px]">
                    {col.key === 'password' ? '\u2022\u2022\u2022\u2022\u2022\u2022' : String(item[col.key] || '\u2014')}
                  </TableCell>
                ))}
                {canEdit && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-cyan-400" onClick={() => openEdit(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(item['.id'])}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formFields.map(field => (
              <div key={field}>
                <Label className="text-xs text-muted-foreground capitalize">{field.replace(/-/g, ' ')}</Label>
                <Input value={formData[field] || ''} onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                  className="bg-white/5 border-white/10 mt-1" type={field === 'password' ? 'password' : 'text'} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"""

# Insert new views before the MAIN APP section
original = original.replace(
    "// ==================== MAIN APP ====================",
    new_views + "// ==================== MAIN APP ===================="
)

# ============================================================
# 8. FIX HOMEPAGE renderView - Add new view routes
# ============================================================
old_render = """  const renderView = () => {
    switch (useAppStore.getState().currentView) {
      case 'dashboard': return <DashboardView />;
      case 'devices': return <DevicesView />;
      case 'device-detail': return <DeviceDetailView />;
      case 'tasks': return <TasksView />;
      case 'faults': return <FaultsView />;
      case 'presets': return <GenericListView title="Presets" action="presets" emptyMessage="No presets configured" />;
      case 'provisions': return <GenericListView title="Provisions" action="provisions" emptyMessage="No provisions configured" />;
      case 'virtual-parameters': return <GenericListView title="Virtual Parameters" action="virtualParameters" emptyMessage="No virtual parameters configured" />;
      case 'files': return <GenericListView title="Files" action="files" emptyMessage="No files uploaded" />;
      case 'system-status': return <SystemStatusView />;
      case 'admin': return <AdminView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };"""

new_render = """  const renderView = () => {
    switch (useAppStore.getState().currentView) {
      case 'dashboard': return <DashboardView />;
      case 'devices': return <DevicesView />;
      case 'device-detail': return <DeviceDetailView />;
      case 'tasks': return <TasksView />;
      case 'faults': return <FaultsView />;
      case 'presets': return <GenericListView title="Presets" action="presets" emptyMessage="No presets configured" />;
      case 'provisions': return <GenericListView title="Provisions" action="provisions" emptyMessage="No provisions configured" />;
      case 'virtual-parameters': return <GenericListView title="Virtual Parameters" action="virtualParameters" emptyMessage="No virtual parameters configured" />;
      case 'files': return <GenericListView title="Files" action="files" emptyMessage="No files uploaded" />;
      case 'mikrotik': return <MikroTikView />;
      case 'pppoe': return <PPPoEView />;
      case 'hotspot': return <HotspotView />;
      case 'system-status': return <SystemStatusView />;
      case 'admin': return <AdminView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };"""

original = original.replace(old_render, new_render)

# Write the result
with open('/home/z/my-project/src/app/page.tsx', 'w') as f:
    f.write(original)

print("page.tsx generated successfully!")
print(f"Total lines: {len(original.splitlines())}")