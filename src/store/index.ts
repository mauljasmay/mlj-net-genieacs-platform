import { create } from 'zustand';
import type { UserSession, ViewId, ParsedDevice, DashboardStats, SystemServiceStatus } from '@/types';

interface AppState {
  // Auth
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Navigation
  currentView: ViewId;
  selectedDeviceId: string | null;

  // Data
  devices: ParsedDevice[];
  totalDevices: number;
  dashboardStats: DashboardStats | null;
  serviceStatuses: SystemServiceStatus[];

  // UI
  sidebarOpen: boolean;
  searchQuery: string;

  // Actions
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentView: (view: ViewId) => void;
  setSelectedDeviceId: (id: string | null) => void;
  setDevices: (devices: ParsedDevice[], total: number) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setServiceStatuses: (statuses: SystemServiceStatus[]) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Navigation
  currentView: 'dashboard',
  selectedDeviceId: null,

  // Data
  devices: [],
  totalDevices: 0,
  dashboardStats: null,
  serviceStatuses: [],

  // UI
  sidebarOpen: true,
  searchQuery: '',

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentView: (currentView) => set({ currentView, selectedDeviceId: null }),
  setSelectedDeviceId: (selectedDeviceId) => set({ selectedDeviceId, currentView: 'device-detail' }),
  setDevices: (devices, totalDevices) => set({ devices, totalDevices }),
  setDashboardStats: (dashboardStats) => set({ dashboardStats }),
  setServiceStatuses: (serviceStatuses) => set({ serviceStatuses }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  logout: () => set({ user: null, isAuthenticated: false, currentView: 'dashboard' }),
}));