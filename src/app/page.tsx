'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import type { ViewId, ParsedDevice } from '@/types';
import { parseDeviceData, formatUptime, timeAgo, getSignalQuality, getTemperatureStatus } from '@/lib/device-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
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
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const CHART_COLORS = ['#06b6d4', '#22d3ee', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#84cc16'];

// ==================== LOGIN VIEW ====================
function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAppStore(s => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl" />
      </div>
      <Card className="glass-card neon-glow w-full max-w-md relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <RadioTower className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              <span className="neon-text text-cyan-400">MLJ NET</span>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              GenieACS Platform — TR-069 / ONT / CPE Management
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground text-sm">Username</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-cyan-500/50 h-11" placeholder="Enter username"
                autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-cyan-500/50 h-11" placeholder="Enter password"
                autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-all"
              disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            Default: superadmin / 110519
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SIDEBAR ====================
function Sidebar() {
  const { currentView, setCurrentView, sidebarOpen, toggleSidebar, user, logout } = useAppStore();

  const navItems: { id: ViewId; icon: React.ReactNode; label: string; roles?: string[] }[] = [
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
  ];

  const visibleItems = navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 glass-card border-r border-white/[0.06] flex flex-col
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-16'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
            <RadioTower className="w-4 h-4 text-cyan-400" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-cyan-400 neon-text whitespace-nowrap">MLJ NET</h1>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">GenieACS Platform</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-2">
            {visibleItems.map(item => (
              <button key={item.id} onClick={() => { setCurrentView(item.id); if (window.innerWidth < 1024) toggleSidebar(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group
                  ${currentView === item.id
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'}`}>
                {item.icon}
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* User info */}
        <div className="border-t border-white/[0.06] p-3 shrink-0">
          {user && sidebarOpen && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <span className="text-xs font-bold text-cyan-400">{user.username[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{user.role}</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={logout}
            className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="w-4 h-4 mr-2" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
          {sidebarOpen && <p className="text-[9px] text-muted-foreground/50 text-center mt-1">v1.0.0</p>}
        </div>
      </aside>
    </>
  );
}

// ==================== TOPBAR ====================
function Topbar() {
  const { currentView, sidebarOpen, toggleSidebar, searchQuery, setSearchQuery, serviceStatuses } = useAppStore();

  const viewTitles: Record<ViewId, string> = {
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
  };

  const nbiOnline = serviceStatuses.find(s => s.name === 'NBI API')?.status === 'online';

  return (
    <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6 shrink-0 glass-card border-t-0 border-x-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{viewTitles[currentView] || 'Dashboard'}</h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          ${nbiOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <div className={`w-2 h-2 rounded-full ${nbiOnline ? 'bg-emerald-400 status-dot-online' : 'bg-red-400 status-dot-offline'}`} />
          NBI {nbiOnline ? 'Connected' : 'Disconnected'}
        </div>
        {currentView === 'devices' && (
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search devices..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-64 h-9 bg-white/5 border-white/10 text-sm" />
          </div>
        )}
      </div>
    </header>
  );
}

// ==================== DASHBOARD VIEW ====================
function DashboardView() {
  const { dashboardStats, setDashboardStats, setCurrentView, setSelectedDeviceId } = useAppStore();
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/devices?action=list&limit=0&skip=0&projection={"_id":1,"_lastInform":1,"_deviceId":1,"_tags":1}');
      if (!res.ok) throw new Error('Failed');
      const devices = await res.json() as any[];
      const now = Date.now();
      const onlineThreshold = 30000;
      const onlineDevices = devices.filter(d => (now - new Date(d._lastInform || 0).getTime()) < onlineThreshold);
      const offlineDevices = devices.filter(d => (now - new Date(d._lastInform || 0).getTime()) >= onlineThreshold);
      const byManufacturer: Record<string, number> = {};
      const byFirmware: Record<string, number> = {};

      devices.forEach(d => {
        const mfr = d._deviceId?._Manufacturer || 'Unknown';
        byManufacturer[mfr] = (byManufacturer[mfr] || 0) + 1;
      });

      const recentDevices = devices.slice(0, 10).map(d => parseDeviceData(d));

      // Fetch PPPoE and Hotspot stats
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
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [setDashboardStats]);

  useEffect(() => { loadStats(); const interval = setInterval(loadStats, 30000); return () => clearInterval(interval); }, [loadStats]);

  const stats = dashboardStats;
  const onlinePct = stats ? Math.round((stats.onlineDevices / Math.max(stats.totalDevices, 1)) * 100) : 0;

  const manufacturerData = stats ? Object.entries(stats.devicesByManufacturer)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 12) + '...' : name, value }))
    .slice(0, 8) : [];

  const statusData = stats ? [
    { name: 'Online', value: stats.onlineDevices, color: '#22c55e' },
    { name: 'Offline', value: stats.offlineDevices, color: '#ef4444' },
  ] : [];

  if (loading && !stats) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />)}
  </div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Devices" value={stats?.totalDevices ?? 0} icon={<Monitor className="w-5 h-5" />}
          trend={`${stats?.onlineDevices ?? 0} online`} color="cyan" />
        <StatCard title="Online" value={stats?.onlineDevices ?? 0} icon={<Wifi className="w-5 h-5" />}
          trend={`${onlinePct}% of total`} color="emerald" />
        <StatCard title="Offline" value={stats?.offlineDevices ?? 0} icon={<WifiOff className="w-5 h-5" />}
          trend={stats?.offlineDevices === 0 ? 'All good' : 'Needs attention'} color="red" />
        <StatCard title="Active ONT" value={stats?.activeOnt ?? 0} icon={<Radio className="w-5 h-5" />}
          trend="TR-069 connected" color="violet" />
      </div>

      {/* Second row - PPPoE & Hotspot */}
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

      {/* Online Percentage Bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Device Online Rate</span>
            <span className="text-sm font-semibold text-cyan-400">{onlinePct}%</span>
          </div>
          <Progress value={onlinePct} className="h-2 bg-white/5" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-emerald-400">{stats?.onlineDevices} online</span>
            <span className="text-xs text-red-400">{stats?.offlineDevices} offline</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><PieChartIcon className="w-4 h-4" /> Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}
                  dataKey="value" stroke="none">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Layers className="w-4 h-4" /> By Manufacturer</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={manufacturerData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {manufacturerData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Devices */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Devices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('devices')} className="text-cyan-400 text-xs">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(stats?.recentDevices || []).map(device => (
              <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                onClick={() => setSelectedDeviceId(device.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${device.online ? 'bg-emerald-400 status-dot-online' : 'bg-red-400/50'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{device.serialNumber || device.id}</p>
                    <p className="text-xs text-muted-foreground truncate">{device.manufacturer} — {device.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {device.rxPower !== null && (
                    <span className={`text-xs font-mono ${getSignalQuality(device.rxPower).color}`}>
                      {device.rxPower.toFixed(1)} dBm
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{timeAgo(device.lastInform)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: { title: string; value: number; icon: React.ReactNode; trend: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  const colors = colorMap[color] || colorMap.cyan;

  return (
    <Card className="glass-card glass-card-hover transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{trend}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== DEVICES VIEW ====================
function DevicesView() {
  const { devices, setDevices, searchQuery, setCurrentView, setSelectedDeviceId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ deviceId: string; action: string } | null>(null);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverOnline, setServerOnline] = useState(0);
  const [serverOffline, setServerOffline] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadDevices = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      let query = '{}';
      if (searchQuery) {
        // Bug #15: Proper JSON escaping to prevent query injection
        const escaped = searchQuery.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        query = JSON.stringify({
          $or: [
            { _id: { $regex: escaped, $options: 'i' } },
            { '_deviceId._SerialNumber': { $regex: escaped, $options: 'i' } },
            { '_deviceId._Manufacturer': { $regex: escaped, $options: 'i' } },
            { _tags: { $regex: escaped, $options: 'i' } },
          ],
        });
      }
      const res = await fetch(`/api/devices?action=list&limit=${pageSize}&skip=${page * pageSize}&query=${encodeURIComponent(query)}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const parsed = (Array.isArray(data) ? data : []).map(parseDeviceData);

      // Bug #5 & #6: Track server total and online/offline counts separately
      const total = parsed.length;
      const onlineCount = parsed.filter(d => d.online).length;
      const offlineCount = total - onlineCount;
      setServerTotal(total);
      setServerOnline(onlineCount);
      setServerOffline(offlineCount);

      let filtered = parsed;
      if (statusFilter === 'online') filtered = parsed.filter(d => d.online);
      else if (statusFilter === 'offline') filtered = parsed.filter(d => !d.online);

      // Bug #5: setDevices with server total, not filtered total
      setDevices(filtered, total);
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, setDevices]);

  useEffect(() => { loadDevices(); return () => { abortRef.current?.abort(); }; }, [loadDevices]);

  const handleAction = async (deviceId: string, action: string) => {
    setActionLoading(deviceId);
    try {
      const body: Record<string, string> = { action, deviceId };
      if (action === 'task') (body as any).taskName = 'reboot';
      const res = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(action === 'task' ? 'Reboot command sent' : 'Action completed');
        loadDevices();
      } else {
        toast.error('Action failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Connection error');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleSummon = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      const res = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'summon', deviceId }) });
      if (res.ok) {
        toast.success('Summon sent to device');
      } else {
        toast.error('Summon failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Connection error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim() || selectedDevices.size === 0) return;
    try {
      for (const deviceId of selectedDevices) {
        await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTag', deviceId, tagName: tagInput.trim() }) });
      }
      toast.success(`Tag "${tagInput.trim()}" added to ${selectedDevices.size} device(s)`);
      setShowTagModal(false);
      setTagInput('');
      setSelectedDevices(new Set());
      loadDevices();
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedDevices);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedDevices(next);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1">
          {/* Bug #6: Use serverTotal and separate online/offline counts */}
          {['all', 'online', 'offline'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'ghost'} size="sm"
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`text-xs h-8 ${statusFilter === s ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'text-muted-foreground'}`}>
              {s === 'all' ? `All (${serverTotal})` : s === 'online' ? `Online (${serverOnline})` : `Offline (${serverOffline})`}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        {selectedDevices.size > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowTagModal(true)}
            className="border-cyan-500/30 text-cyan-400 text-xs h-8">
            <Tag className="w-3 h-3 mr-1" /> Add Tag ({selectedDevices.size})
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={loadDevices} className="text-xs h-8">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Device Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="w-10"><Checkbox checked={selectedDevices.size === devices.length && devices.length > 0}
                  onCheckedChange={v => setSelectedDevices(v ? new Set(devices.map(d => d.id)) : new Set())} /></TableHead>
                <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground">Serial Number</TableHead>
                <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">Manufacturer</TableHead>
                <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Model</TableHead>
                <TableHead className="text-xs text-muted-foreground hidden xl:table-cell">IP Address</TableHead>
                <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">RX Power</TableHead>
                <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Last Inform</TableHead>
                <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.04]"><TableCell colSpan={9}><Skeleton className="h-10 bg-white/5" /></TableCell></TableRow>
              )) : devices.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No devices found. Ensure GenieACS NBI is running on port 7557.
                </TableCell></TableRow>
              ) : devices.map(device => (
                <TableRow key={device.id} className="border-white/[0.04] table-row-hover cursor-pointer"
                  onClick={() => setSelectedDeviceId(device.id)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedDevices.has(device.id)} onCheckedChange={() => toggleSelect(device.id)} />
                  </TableCell>
                  <TableCell>
                    <div className={`w-2.5 h-2.5 rounded-full ${device.online ? 'bg-emerald-400 status-dot-online' : 'bg-red-400/50 status-dot-offline'}`} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{device.serialNumber || device.id.slice(0, 20)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{device.manufacturer}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{device.model}</TableCell>
                  <TableCell className="hidden xl:table-cell font-mono text-xs">{device.ipAddress || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {device.rxPower !== null ? (
                      <span className={`text-xs font-mono ${getSignalQuality(device.rxPower).color}`}>
                        {device.rxPower.toFixed(1)} dBm
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(device.lastInform)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-cyan-400"
                            onClick={() => handleSummon(device.id)} disabled={actionLoading === device.id}>
                            {actionLoading === device.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                          </Button>
                        </TooltipTrigger><TooltipContent>Summon</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                            onClick={() => setConfirmAction({ deviceId: device.id, action: 'task' })}>
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Reboot</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Pagination - Bug #5: use serverTotal for pagination */}
        {serverTotal > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-muted-foreground">Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, serverTotal)} of {serverTotal}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="h-8 text-xs">
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= serverTotal} className="h-8 text-xs">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tag Modal */}
      <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Add Tag to {selectedDevices.size} Device(s)</DialogTitle></DialogHeader>
          <Input placeholder="Tag name" value={tagInput} onChange={e => setTagInput(e.target.value)}
            className="bg-white/5 border-white/10" onKeyDown={e => e.key === 'Enter' && handleAddTag()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTagModal(false)}>Cancel</Button>
            <Button onClick={handleAddTag} className="bg-cyan-600 hover:bg-cyan-500">Add Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Reboot Modal */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Confirm Reboot</DialogTitle>
            <DialogDescription>This will send a reboot command to the device. The device may go offline temporarily.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmAction && handleAction(confirmAction.deviceId, confirmAction.action)}>
              Reboot Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== DEVICE DETAIL VIEW ====================
function DeviceDetailView() {
  const { selectedDeviceId, setCurrentView } = useAppStore();
  const [device, setDevice] = useState<any>(null);
  const [parsed, setParsed] = useState<ParsedDevice | null>(null);
  const [parameters, setParameters] = useState<Array<{ path: string; value: any; type: string; writable: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [paramFilter, setParamFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!selectedDeviceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/devices?action=detail&deviceId=${encodeURIComponent(selectedDeviceId)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/devices?action=parameters&deviceId=${encodeURIComponent(selectedDeviceId)}`).then(r => r.ok ? r.json() : []),
    ]).then(([dev, params]) => {
      setDevice(dev);
      setParsed(dev ? parseDeviceData(dev) : null);
      setParameters(Array.isArray(params) ? params.map((p: any) => ({
        path: p._path || p.path || '',
        value: p._value?.[0] ?? p.value,
        type: p._value?.[1] || p.type || 'xsd:string',
        writable: p._writable ?? p.writable ?? false,
      })) : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedDeviceId]);

  // Bug #13: executeTask with error handling and feedback
  const executeTask = async (taskName: string, extra?: any) => {
    if (!selectedDeviceId) return;
    setTaskLoading(true);
    try {
      const body: any = { action: 'task', deviceId: selectedDeviceId, taskName, ...extra };
      const res = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(`Task "${taskName}" executed successfully`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Task failed: ${errData.error || 'Unknown error'}`);
      }
      // Reload device data
      const dev = await fetch(`/api/devices?action=detail&deviceId=${encodeURIComponent(selectedDeviceId)}`).then(r => r.json());
      setDevice(dev);
      setParsed(dev ? parseDeviceData(dev) : null);
    } catch (e) {
      console.error(e);
      toast.error('Connection error');
    } finally {
      setTaskLoading(false);
    }
  };

  if (!selectedDeviceId) return <div className="p-6"><Button variant="ghost" onClick={() => setCurrentView('devices')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Devices</Button></div>;

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48 bg-white/5" /><Skeleton className="h-64 bg-white/5" /></div>;

  const p = parsed;
  const filteredParams = parameters.filter(pr => !paramFilter || pr.path.toLowerCase().includes(paramFilter.toLowerCase()));
  const signalInfo = p ? getSignalQuality(p.rxPower) : null;
  const tempInfo = p ? getTemperatureStatus(p.temperature) : null;

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => setCurrentView('devices')} className="text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Devices
      </Button>

      {/* Device Header */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border
                ${p?.online ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <Router className={`w-6 h-6 ${p?.online ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{p?.serialNumber || 'Unknown'}</h3>
                  <Badge variant={p?.online ? 'default' : 'secondary'}
                    className={p?.online ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                    {p?.online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p?.manufacturer} — {p?.model} — {p?.firmwareVersion}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => executeTask('refreshInform')} disabled={taskLoading}
                className="border-cyan-500/30 text-cyan-400 text-xs">
                <Radio className="w-3.5 h-3.5 mr-1" /> Summon
              </Button>
              <Button variant="outline" size="sm" onClick={() => executeTask('refreshObject')}
                disabled={taskLoading} className="text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => executeTask('reboot')}
                disabled={taskLoading} className="border-red-500/30 text-red-400 text-xs">
                <Power className="w-3.5 h-3.5 mr-1" /> Reboot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06]">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">Overview</TabsTrigger>
          <TabsTrigger value="ont" className="text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">ONT / Fiber</TabsTrigger>
          <TabsTrigger value="wan" className="text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">WAN</TabsTrigger>
          <TabsTrigger value="wifi" className="text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">WiFi</TabsTrigger>
          <TabsTrigger value="parameters" className="text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">Parameters</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard title="Device ID" value={p?.id?.slice(0, 30) + '...' || 'N/A'} icon={<Cpu className="w-4 h-4" />} />
            <InfoCard title="Serial Number" value={p?.serialNumber || 'N/A'} icon={<FileText className="w-4 h-4" />} />
            <InfoCard title="Manufacturer" value={p?.manufacturer || 'N/A'} icon={<Server className="w-4 h-4" />} />
            <InfoCard title="Product Class" value={p?.productClass || 'N/A'} icon={<Router className="w-4 h-4" />} />
            <InfoCard title="Model" value={p?.model || 'N/A'} icon={<Monitor className="w-4 h-4" />} />
            <InfoCard title="Firmware" value={p?.firmwareVersion || 'N/A'} icon={<Download className="w-4 h-4" />} />
            <InfoCard title="Hardware" value={p?.hardwareVersion || 'N/A'} icon={<HardDrive className="w-4 h-4" />} />
            <InfoCard title="Uptime" value={p ? formatUptime(p.uptime) : 'N/A'} icon={<Clock className="w-4 h-4" />} />
            <InfoCard title="Last Inform" value={p?.lastInform ? timeAgo(p.lastInform) : 'Never'} icon={<Activity className="w-4 h-4" />} />
            <InfoCard title="IP Address" value={p?.ipAddress || 'N/A'} icon={<Globe className="w-4 h-4" />} />
            <InfoCard title="MAC Address" value={p?.macAddress || 'N/A'} icon={<Network className="w-4 h-4" />} />
            <InfoCard title="PON Mode" value={p?.ponMode || 'N/A'} icon={<Plug className="w-4 h-4" />} />
          </div>
          {p?.tags && p.tags.length > 0 && (
            <Card className="glass-card mt-4"><CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {p.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs bg-white/5 border-white/10">{tag}</Badge>)}
              </div>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="ont" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="glass-card"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Optical RX Power</p>
              <p className={`text-2xl font-bold font-mono ${signalInfo?.color || 'text-muted-foreground'}`}>
                {p?.rxPower !== null ? `${p.rxPower.toFixed(2)} dBm` : 'N/A'}
              </p>
              {signalInfo && <Badge className={`mt-2 text-xs ${signalInfo.bg} ${signalInfo.color} border-0`}>{signalInfo.label}</Badge>}
              {p?.rxPower !== null && (
                <div className="mt-3 flex items-end gap-0.5 h-8">
                  {/* Bug #2: Remove Math.abs — rxPower is always negative, so Math.abs makes it positive which breaks the comparison */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className={`signal-bar w-1.5 rounded-sm ${p.rxPower! < -15 - i * 3 ? 'bg-cyan-400/30' : 'bg-cyan-400'}`}
                      style={{ height: `${(i + 1) * 6}px` }} />
                  ))}
                </div>
              )}
            </CardContent></Card>
            <Card className="glass-card"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Optical TX Power</p>
              <p className="text-2xl font-bold font-mono text-muted-foreground">
                {p?.txPower !== null ? `${p.txPower.toFixed(2)} dBm` : 'N/A'}
              </p>
            </CardContent></Card>
            <Card className="glass-card"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Temperature</p>
              <p className={`text-2xl font-bold font-mono ${tempInfo?.color || 'text-muted-foreground'}`}>
                {p?.temperature !== null ? `${p.temperature.toFixed(1)}°C` : 'N/A'}
              </p>
              {tempInfo && <Badge className="mt-2 text-xs bg-white/5 text-muted-foreground border-0">{tempInfo.label}</Badge>}
            </CardContent></Card>
            <InfoCard title="PON Mode" value={p?.ponMode || 'N/A'} icon={<Plug className="w-4 h-4" />} />
            <InfoCard title="Connected Clients" value={String(p?.connectedDevices ?? 'N/A')} icon={<Users className="w-4 h-4" />} />
            <InfoCard title="Uptime" value={p ? formatUptime(p.uptime) : 'N/A'} icon={<Clock className="w-4 h-4" />} />
          </div>
        </TabsContent>

        <TabsContent value="wan" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard title="WAN Type" value={p?.wanType || 'N/A'} icon={<Globe className="w-4 h-4" />} />
            <InfoCard title="IP Address" value={p?.ipAddress || 'N/A'} icon={<Network className="w-4 h-4" />} />
            <InfoCard title="PPPoE Username" value={p?.ppoeUsername || 'N/A'} icon={<Users className="w-4 h-4" />} />
          </div>
        </TabsContent>

        <TabsContent value="wifi" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="SSID" value={p?.ssid || 'N/A'} icon={<Wifi className="w-4 h-4" />} />
            <InfoCard title="Connected Clients" value={String(p?.connectedDevices ?? 'N/A')} icon={<Users className="w-4 h-4" />} />
          </div>
        </TabsContent>

        <TabsContent value="parameters" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Filter parameters..." value={paramFilter} onChange={e => setParamFilter(e.target.value)}
                  className="bg-white/5 border-white/10 h-8 text-sm flex-1" />
                <span className="text-xs text-muted-foreground">{filteredParams.length} params</span>
              </div>
              <ScrollArea className="max-h-96">
                <div className="space-y-1">
                  {filteredParams.map((param, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-white/[0.03] text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-muted-foreground truncate font-mono">{param.path}</span>
                        {param.writable && <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border-0 px-1">W</Badge>}
                      </div>
                      <span className="font-mono text-cyan-400 shrink-0 ml-2 max-w-[200px] truncate">
                        {typeof param.value === 'object' ? JSON.stringify(param.value) : String(param.value ?? '')}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="glass-card"><CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-sm font-medium mt-0.5 truncate">{value || '—'}</p>
        </div>
      </div>
    </CardContent></Card>
  );
}

// ==================== TASKS VIEW ====================
function TasksView() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devices?action=tasks&limit=100');
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); const interval = setInterval(loadTasks, 15000); return () => clearInterval(interval); }, []);

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/devices?action=task&taskId=${encodeURIComponent(taskId)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Task deleted');
        loadTasks();
      } else {
        toast.error('Failed to delete task');
      }
    } catch {
      toast.error('Connection error');
    }
  };

  const statusColor = (t: any) => {
    if (t.fault) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (t._id && !t.timestamp) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };
  const statusLabel = (t: any) => {
    if (t.fault) return 'Failed';
    if (t.timestamp) return 'Done';
    return 'Pending';
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTasks} className="text-xs"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>
      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs text-muted-foreground">Task</TableHead>
            <TableHead className="text-xs text-muted-foreground">Device</TableHead>
            <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Timestamp</TableHead>
            <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-white/[0.04]"><TableCell colSpan={5}><Skeleton className="h-8 bg-white/5" /></TableCell></TableRow>
            )) : tasks.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No tasks found</TableCell></TableRow>
            ) : tasks.slice(0, 50).map((task) => (
              <TableRow key={task._id} className="border-white/[0.04] table-row-hover">
                <TableCell><Badge variant="secondary" className={`text-[10px] border ${statusColor(task)}`}>{statusLabel(task)}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{task.name}</TableCell>
                <TableCell className="text-xs font-mono truncate max-w-[200px]">{task.device}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{task.timestamp ? new Date(task.timestamp).toLocaleString() : '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
                    onClick={() => deleteTask(task._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ==================== FAULTS VIEW ====================
function FaultsView() {
  const [faults, setFaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFaults = async () => {
    setLoading(true);
    try {
      // Bug #1 fix: Single res.json() call - can only consume the response body once
      const res = await fetch('/api/devices?action=faults&limit=100');
      const data = await res.json();
      if (res.ok) setFaults(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadFaults(); }, []);

  const deleteFault = async (id: string) => {
    try {
      const res = await fetch(`/api/devices?action=fault&faultId=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Fault dismissed');
        loadFaults();
      } else {
        toast.error('Failed to dismiss fault');
      }
    } catch {
      toast.error('Connection error');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{faults.length} faults</p>
        <Button variant="outline" size="sm" onClick={loadFaults} className="text-xs"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>
      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground">Severity</TableHead>
            <TableHead className="text-xs text-muted-foreground">Device</TableHead>
            <TableHead className="text-xs text-muted-foreground">Code</TableHead>
            <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Message</TableHead>
            <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">Timestamp</TableHead>
            <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-white/[0.04]"><TableCell colSpan={6}><Skeleton className="h-8 bg-white/5" /></TableCell></TableRow>
            )) : faults.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No faults found</TableCell></TableRow>
            ) : faults.slice(0, 50).map((f) => (
              <TableRow key={f._id} className="border-white/[0.04] table-row-hover">
                <TableCell><Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">{f.faultCode || 'Fault'}</Badge></TableCell>
                <TableCell className="text-xs font-mono truncate max-w-[150px]">{f.device}</TableCell>
                <TableCell className="text-xs font-mono">{f.code || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{f.message || f.faultString || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{f.timestamp ? new Date(f.timestamp).toLocaleString() : '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => deleteFault(f._id)}>
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ==================== GENERIC LIST VIEW (Presets, Provisions, VPs, Files) ====================
function GenericListView({ title, action, emptyMessage }: { title: string; action: string; emptyMessage: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Bug #1 fix: Single res.json() call - can only consume the response body once
      const res = await fetch(`/api/devices?action=${action}&limit=1000`);
      const data = await res.json();
      if (res.ok) setItems(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [action]);

  const handleDelete = async (id: string) => {
    // Bug #3 fix: use vpId for virtual parameters, matching backend expectation
    const actionMap: Record<string, string> = { presets: 'preset', provisions: 'provision', virtualParameters: 'virtualParameter', files: 'file' };
    const idParamMap: Record<string, string> = { presets: 'presetId', provisions: 'provisionId', virtualParameters: 'vpId', files: 'fileId' };
    const actionKey = actionMap[action] || action;
    const idParam = idParamMap[action] || `${actionKey}Id`;
    try {
      const res = await fetch(`/api/devices?action=${actionKey}&${idParam}=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${title.slice(0, -1)} deleted`);
        load();
      } else {
        toast.error(`Failed to delete ${title.toLowerCase().slice(0, -1)}`);
      }
    } catch {
      toast.error('Connection error');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} {title.toLowerCase()}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="text-xs"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
        </div>
      </div>
      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground">Name</TableHead>
            {action !== 'files' && <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Type / Channel</TableHead>}
            <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">ID</TableHead>
            <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-white/[0.04]"><TableCell colSpan={4}><Skeleton className="h-8 bg-white/5" /></TableCell></TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">{emptyMessage}</TableCell></TableRow>
            ) : items.map((item) => (
              <TableRow key={item._id} className="border-white/[0.04] table-row-hover cursor-pointer" onClick={() => { setSelected(item); setShowEditor(true); }}>
                <TableCell className="text-sm font-medium">{item.name || item._id}</TableCell>
                {action !== 'files' && <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{item.channel || item.type || item.reference || '—'}</TableCell>}
                <TableCell className="text-xs font-mono text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">{item._id}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
                    onClick={() => handleDelete(item._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail/Editor Modal */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="glass-card max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selected?.name || 'Detail'}</DialogTitle>
            <DialogDescription>ID: {selected?._id}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <pre className="text-xs font-mono text-muted-foreground bg-white/[0.02] p-4 rounded-lg overflow-auto whitespace-pre-wrap">
              {selected ? JSON.stringify(selected, null, 2) : ''}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== SYSTEM STATUS VIEW ====================
function SystemStatusView() {
  const { serviceStatuses } = useAppStore();
  const [loading, setLoading] = useState(true);

  // Bug #10 fix: Remove duplicate polling - rely on HomePage's polling
  // Just load once on mount to populate loading state
  useEffect(() => {
    if (serviceStatuses.length > 0) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [serviceStatuses]);

  // Bug #9 fix: add amber/warning styling for 'warning' status
  const getStatusStyles = (status: string) => {
    if (status === 'online') return {
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'Online',
    };
    if (status === 'warning') return {
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: 'Warning',
    };
    return {
      border: 'border-red-500/20',
      iconBg: 'bg-red-500/10 border-red-500/20',
      iconColor: 'text-red-400',
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      label: 'Offline',
    };
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <p className="text-sm text-muted-foreground">Service health monitoring</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />) :
          serviceStatuses.map(svc => {
            const styles = getStatusStyles(svc.status);
            return (
              <Card key={svc.name} className={`glass-card ${styles.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${styles.iconBg}`}>
                        <Server className={`w-5 h-5 ${styles.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">Port {svc.port}</p>
                      </div>
                    </div>
                    <Badge className={styles.badge}>
                      {styles.label}
                    </Badge>
                  </div>
                  {svc.responseTime >= 0 && (
                    <p className="text-xs text-muted-foreground">
                      Response: <span className="text-foreground font-mono">{svc.responseTime}ms</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Port Architecture */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Port Architecture</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <PortRow port={80} label="Dashboard (Public)" desc="Main web interface" />
          <PortRow port={3000} label="Dashboard (Internal)" desc="Next.js dev server" />
          <PortRow port={7547} label="CWMP / TR-069" desc="ACS for ONT/CPE/Router" />
          <PortRow port={7557} label="NBI API" desc="Northbound Interface API" />
          <PortRow port={7567} label="File Server" desc="Firmware & config files" />
        </CardContent>
      </Card>
    </div>
  );
}

function PortRow({ port, label, desc }: { port: number; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
      <span className="font-mono text-cyan-400 text-xs bg-cyan-500/10 px-2 py-1 rounded min-w-[50px] text-center">:{port}</span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

// ==================== ADMIN VIEW ====================
function AdminView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', role: 'viewer' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  // Bug #11 fix: createUser with error handling
  const createUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error('Username and password are required');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        toast.success(`User "${newUser.username}" created successfully`);
        setShowCreateModal(false);
        setNewUser({ username: '', password: '', displayName: '', role: 'viewer' });
        loadUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error('Connection error');
    }
  };

  // Bug #12 fix: deleteUser with confirmation dialog
  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('User deleted');
        loadUsers();
      } else {
        toast.error('Failed to delete user');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      superadmin: 'bg-red-500/10 text-red-400 border-red-500/20',
      admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      operator: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      technician: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      multi_talent: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      mikrotik: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      pppoe: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      hotspot: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      viewer: 'bg-white/5 text-muted-foreground border-white/10',
    };
    return colors[role] || colors.viewer;
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users</p>
        <Button size="sm" onClick={() => setShowCreateModal(true)} className="bg-cyan-600 hover:bg-cyan-500 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> New User
        </Button>
      </div>
      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground">User</TableHead>
            <TableHead className="text-xs text-muted-foreground">Role</TableHead>
            <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Last Login</TableHead>
            <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">Created</TableHead>
            <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i} className="border-white/[0.04]"><TableCell colSpan={5}><Skeleton className="h-8 bg-white/5" /></TableCell></TableRow>
            )) : users.map(u => (
              <TableRow key={u.id} className="border-white/[0.04] table-row-hover">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                      <span className="text-xs font-bold text-cyan-400">{u.username[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.displayName || u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary" className={`text-[10px] border ${roleBadge(u.role)}`}>{u.role}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
                    onClick={() => setDeleteConfirm(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs text-muted-foreground">Username</Label>
              <Input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Password</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Display Name</Label>
              <Input value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['superadmin', 'admin', 'operator', 'technician', 'multi_talent', 'mikrotik', 'pppoe', 'hotspot', 'viewer'].map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                </SelectContent>
              </Select></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={createUser} className="bg-cyan-600 hover:bg-cyan-500">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bug #12: Delete User Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Confirm Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteUser(deleteConfirm)}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== SETTINGS VIEW ====================
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
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to save settings');
      }
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
  const remoteHost = settings.genieacs_remote_host || '';
  const protocol = remoteHost.startsWith('https') ? 'https' : 'http';
  const cleanHost = remoteHost.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const buildUrl = (port: string) => {
    if (!cleanHost) return '';
    return `${protocol}://${cleanHost}:${port}`;
  };

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
              <p className="text-xs text-muted-foreground">Connect to an external GenieACS server with host address and ports.</p>
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
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-2">
                <p className="text-xs text-blue-400 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Remote Server Mode</p>
                <p className="text-[11px] text-muted-foreground mt-1">Enter the remote GenieACS server host (IP or domain). URLs are auto-generated from the host + port settings below.</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> Server Host (IP / Domain)</Label>
                <Input value={settings.genieacs_remote_host || ''}
                  onChange={e => {
                    const newSettings = { ...settings, genieacs_remote_host: e.target.value };
                    const host = e.target.value.replace(/^https?:\/\//, '').replace(/\/+$/, '');
                    const proto = e.target.value.startsWith('https') ? 'https' : 'http';
                    newSettings.genieacs_acs_url = host ? `${proto}://${host}:${settings.genieacs_dashboard_port || '3000'}` : '';
                    newSettings.genieacs_cwmp_url = host ? `${proto}://${host}:${settings.genieacs_cwmp_port || '7547'}` : '';
                    newSettings.genieacs_nbi_url = host ? `${proto}://${host}:${settings.genieacs_nbi_port || '7557'}` : '';
                    newSettings.genieacs_fs_url = host ? `${proto}://${host}:${settings.genieacs_fs_port || '7567'}` : '';
                    setSettings(newSettings);
                  }}
                  className="bg-white/5 border-white/10 mt-1" placeholder="192.168.1.100 or http://genieacs.example.com" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><LayoutDashboard className="w-3 h-3" /> Dashboard Port</Label>
                  <Input value={settings.genieacs_dashboard_port || '3000'}
                    onChange={e => {
                      const newSettings = { ...settings, genieacs_dashboard_port: e.target.value };
                      if (cleanHost) newSettings.genieacs_acs_url = `${protocol}://${cleanHost}:${e.target.value}`;
                      setSettings(newSettings);
                    }}
                    className="bg-white/5 border-white/10 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Cable className="w-3 h-3" /> CWMP Port</Label>
                  <Input value={settings.genieacs_cwmp_port || '7547'}
                    onChange={e => {
                      const newSettings = { ...settings, genieacs_cwmp_port: e.target.value };
                      if (cleanHost) newSettings.genieacs_cwmp_url = `${protocol}://${cleanHost}:${e.target.value}`;
                      setSettings(newSettings);
                    }}
                    className="bg-white/5 border-white/10 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Database className="w-3 h-3" /> NBI Port</Label>
                  <Input value={settings.genieacs_nbi_port || '7557'}
                    onChange={e => {
                      const newSettings = { ...settings, genieacs_nbi_port: e.target.value };
                      if (cleanHost) newSettings.genieacs_nbi_url = `${protocol}://${cleanHost}:${e.target.value}`;
                      setSettings(newSettings);
                    }}
                    className="bg-white/5 border-white/10 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><HardDrive className="w-3 h-3" /> File Server Port</Label>
                  <Input value={settings.genieacs_fs_port || '7567'}
                    onChange={e => {
                      const newSettings = { ...settings, genieacs_fs_port: e.target.value };
                      if (cleanHost) newSettings.genieacs_fs_url = `${protocol}://${cleanHost}:${e.target.value}`;
                      setSettings(newSettings);
                    }}
                    className="bg-white/5 border-white/10 mt-1" />
                </div>
              </div>
              {cleanHost && (
                <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Auto-Generated URLs</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div className="text-muted-foreground">Dashboard: <span className="text-foreground/80">{buildUrl(settings.genieacs_dashboard_port || '3000')}</span></div>
                    <div className="text-muted-foreground">CWMP: <span className="text-foreground/80">{buildUrl(settings.genieacs_cwmp_port || '7547')}</span></div>
                    <div className="text-muted-foreground">NBI API: <span className="text-foreground/80">{buildUrl(settings.genieacs_nbi_port || '7557')}</span></div>
                    <div className="text-muted-foreground">File Server: <span className="text-foreground/80">{buildUrl(settings.genieacs_fs_port || '7567')}</span></div>
                  </div>
                </div>
              )}
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Remote Server Credentials</p>
                <div><Label className="text-xs text-muted-foreground">NBI Username</Label>
                  <Input value={settings.genieacs_nbi_username || ''} onChange={e => setSettings({ ...settings, genieacs_nbi_username: e.target.value })}
                    className="bg-white/5 border-white/10 mt-1" placeholder="genieacs" /></div>
                <div className="relative"><Label className="text-xs text-muted-foreground">NBI Password</Label>
                  <Input type={showNbiPassword ? 'text' : 'password'} value={settings.genieacs_nbi_password || ''}
                    onChange={e => setSettings({ ...settings, genieacs_nbi_password: e.target.value })}
                    className="bg-white/5 border-white/10 mt-1 pr-10" placeholder="••••••••" />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><LayoutDashboard className="w-3 h-3" /> Dashboard Port</Label>
                  <Input value={settings.genieacs_dashboard_port || '3000'} onChange={e => setSettings({ ...settings, genieacs_dashboard_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> CWMP Port</Label>
                  <Input value={settings.genieacs_cwmp_port || '7547'} onChange={e => setSettings({ ...settings, genieacs_cwmp_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> NBI API Port</Label>
                  <Input value={settings.genieacs_nbi_port || '7557'} onChange={e => setSettings({ ...settings, genieacs_nbi_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> File Server Port</Label>
                  <Input value={settings.genieacs_fs_port || '7567'} onChange={e => setSettings({ ...settings, genieacs_fs_port: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <div className="text-muted-foreground">NBI API: <span className="text-foreground/80">http://localhost:{settings.genieacs_nbi_port || '7557'}</span></div>
                  <div className="text-muted-foreground">File Server: <span className="text-foreground/80">http://localhost:{settings.genieacs_fs_port || '7567'}</span></div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Change Password */
      {/* Change Password - HIDDEN in remote mode */}
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
      const payload = { ...editConfig };
      // Don't send masked password to API
      if (payload.password === '••••••••') delete payload.password;
      const res = await fetch('/api/mikrotik', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('MikroTik config saved');
        loadConfig();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to save MikroTik config');
      }
    } catch { toast.error('Connection error'); } finally { setSaving(false) }
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
              className="bg-white/5 border-white/10 mt-1 pr-10" placeholder={config.hasPassword ? 'Enter new password (leave blank to keep)' : '••••••••'} />
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
            <div className="p-3 rounded-lg bg-white/[0.02]"><p className="text-xs text-muted-foreground flex items-center gap-1.5"><Key className="w-3 h-3" /> Password</p><p className="text-sm font-mono mt-1">{config.hasPassword ? '••••••••' : 'Not set'}</p></div>
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
      if (k !== '.id' && k !== 'disabled' && k !== 'invalid') fields[k] = String(v ?? '');
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
                    {col.key === 'password' ? '••••••' : String(item[col.key] || '—')}
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
      if (k !== '.id' && k !== 'disabled' && k !== 'invalid') fields[k] = String(v ?? '');
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
                    {col.key === 'password' ? '••••••' : String(item[col.key] || '—')}
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

// ==================== MAIN APP ====================
export default function HomePage() {
  const { user, isAuthenticated, isLoading, setServiceStatuses } = useAppStore();

  // Bug #14 fix: Check auth on mount, destroy session if invalid
  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user) {
          useAppStore.getState().setUser(data.user);
        } else {
          useAppStore.getState().setUser(null);
          // Destroy invalid session on server side
          fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
        }
      })
      .catch(() => {
        useAppStore.getState().setUser(null);
      });
  }, []);

  // Load system status periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/system');
        if (res.ok) {
          const data = await res.json();
          setServiceStatuses(data.services);
        }
      } catch {
        // silently ignore
      }
    };
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, setServiceStatuses]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mx-auto animate-pulse-neon">
            <RadioTower className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-sm text-muted-foreground">Loading platform...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginView />;

  const renderView = () => {
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
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}