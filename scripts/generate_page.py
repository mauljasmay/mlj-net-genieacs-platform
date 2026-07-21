#!/usr/bin/env python3
"""Generate the complete page.tsx with all fixes and new views."""
import os

content = r"""'use client';

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
  Copy, ArrowUpRight, Timer, Boxes, Cable
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
              <Label htmlFor="username" className="text-muted-foreground text-sm flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" /> Username</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-cyan-500/50 h-11" placeholder="Enter username"
                autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm flex items-center gap-2"><Key className="w-3.5 h-3.5" /> Password</Label>
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
            Default: admin / admin123
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
    { id: 'presets', icon: <Settings className="w-5 h-5" />, label: 'Presets' },
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
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 glass-card border-r border-white/[0.06] flex flex-col
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-16'}`}>
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
        const [pppoeRes, hsRes] = await Promise.allSettled([
          fetch('/api/pppoe?tab=active'),
          fetch('/api/hotspot?tab=active'),
        ]);
        if (pppoeRes.status === 'fulfilled' && pppoeRes.value.ok) {
          const pppoeData = await pppoeRes.value.json();
          pppoeActiveCount = Array.isArray(pppoeData.data) ? pppoeData.data.length : 0;
        }
        if (hsRes.status === 'fulfilled' && hsRes.value.ok) {
          const hsData = await hsRes.value.json();
          hotspotActiveCount = Array.isArray(hsData.data) ? hsData.data.length : 0;
        }
        // Fetch total hotspot users
        const hsUsersRes = await Promise.resolve(fetch('/api/hotspot?tab=users'));
        if (hsUsersRes.ok) {
          const hsUsersData = await hsUsersRes.json();
          hotspotUsersCount = Array.isArray(hsUsersData.data) ? hsUsersData.data.length : 0;
        }
      } catch {
        // MikroTik not connected - stats will be 0
      }

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
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><PieChart className="w-4 h-4" /> Device Status</CardTitle>
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
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color] || colorMap.cyan}`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">{title}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{trend}</p>
      </CardContent>
    </Card>
  );
}
"""

# Now write to file
with open('/home/z/my-project/src/app/page.tsx', 'w') as f:
    f.write(content)

print("Part 1 written: imports + login + sidebar + topbar + dashboard")
