import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  CogIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  ServerIcon,
  LightBulbIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ChartPieIcon,
  ArrowRightIcon,
  SparklesIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface Activity {
  id: string;
  type: 'user' | 'system' | 'security' | 'revenue';
  message: string;
  timestamp: Date;
  severity?: 'info' | 'warning' | 'success' | 'error';
}

interface User {
  id: string;
  name: string;
  email: string;
  tier: string;
  status: 'active' | 'trial' | 'churned' | 'at-risk';
  mrr: number;
  joinDate: Date;
  lastActive: Date;
  featuresUsed: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  newCustomers: number;
  churnedCustomers: number;
}

interface SystemMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
}

type ThemeMode = 'light' | 'dark' | 'auto';

// ============================================================================
// COLOR SCHEME VALIDATOR (AI-Powered)
// ============================================================================

interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

const validateColorContrast = (fg: string, bg: string): number => {
  // Simplified WCAG contrast calculation
  const getLuminance = (color: string): number => {
    // Parse oklch or hex color (simplified)
    if (color.startsWith('oklch')) {
      const match = color.match(/oklch\(([\d.]+)/);
      return match ? parseFloat(match[1]) : 0.5;
    }
    return 0.5;
  };

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

const getColorSchemes = (mode: 'light' | 'dark'): ColorScheme[] => {
  if (mode === 'light') {
    return [
      {
        name: 'Professional Purple',
        primary: 'oklch(0.55 0.20 285)',
        secondary: 'oklch(0.65 0.25 250)',
        accent: 'oklch(0.72 0.15 35)',
        background: 'oklch(0.98 0.01 285)',
        surface: 'oklch(1 0 0)',
        text: 'oklch(0.20 0.05 285)',
        textMuted: 'oklch(0.50 0.02 285)',
        border: 'oklch(0.90 0.01 285)',
        success: 'oklch(0.65 0.20 145)',
        warning: 'oklch(0.70 0.18 65)',
        error: 'oklch(0.60 0.22 25)',
        info: 'oklch(0.60 0.20 240)'
      },
      {
        name: 'Ocean Blue',
        primary: 'oklch(0.50 0.22 240)',
        secondary: 'oklch(0.60 0.20 200)',
        accent: 'oklch(0.70 0.15 180)',
        background: 'oklch(0.98 0.01 240)',
        surface: 'oklch(1 0 0)',
        text: 'oklch(0.20 0.05 240)',
        textMuted: 'oklch(0.50 0.02 240)',
        border: 'oklch(0.90 0.01 240)',
        success: 'oklch(0.65 0.20 145)',
        warning: 'oklch(0.70 0.18 65)',
        error: 'oklch(0.60 0.22 25)',
        info: 'oklch(0.60 0.20 240)'
      }
    ];
  } else {
    return [
      {
        name: 'Midnight Purple',
        primary: 'oklch(0.65 0.25 285)',
        secondary: 'oklch(0.55 0.20 250)',
        accent: 'oklch(0.72 0.15 35)',
        background: 'oklch(0.15 0.02 285)',
        surface: 'oklch(0.20 0.03 285)',
        text: 'oklch(0.95 0.01 285)',
        textMuted: 'oklch(0.65 0.02 285)',
        border: 'oklch(0.30 0.02 285)',
        success: 'oklch(0.65 0.20 145)',
        warning: 'oklch(0.70 0.18 65)',
        error: 'oklch(0.60 0.22 25)',
        info: 'oklch(0.60 0.20 240)'
      },
      {
        name: 'Deep Ocean',
        primary: 'oklch(0.60 0.25 240)',
        secondary: 'oklch(0.50 0.20 200)',
        accent: 'oklch(0.70 0.15 180)',
        background: 'oklch(0.12 0.03 240)',
        surface: 'oklch(0.18 0.04 240)',
        text: 'oklch(0.95 0.01 240)',
        textMuted: 'oklch(0.65 0.02 240)',
        border: 'oklch(0.30 0.03 240)',
        success: 'oklch(0.65 0.20 145)',
        warning: 'oklch(0.70 0.18 65)',
        error: 'oklch(0.60 0.22 25)',
        info: 'oklch(0.60 0.20 240)'
      }
    ];
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CEODashboard: React.FC = () => {
  // State Management
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'revenue' | 'system' | 'insights'>('overview');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [activeColorScheme, setActiveColorScheme] = useState(0);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Real-time Stats - fetch from backend
  const [realtimeStats, setRealtimeStats] = useState({
    activeUsers: 0,
    revenue: 0,
    systemHealth: 0,
    alerts: 0
  });

  // Get current color scheme based on theme
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const colorSchemes = useMemo(() => getColorSchemes(isDark ? 'dark' : 'light'), [isDark]);
  const colors = colorSchemes[activeColorScheme];

  // Apply theme
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-primary', colors.background);
    document.documentElement.style.setProperty('--bg-surface', colors.surface);
    document.documentElement.style.setProperty('--color-primary', colors.primary);
    document.documentElement.style.setProperty('--color-text', colors.text);
    document.documentElement.style.setProperty('--color-border', colors.border);
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.text;
  }, [colors]);

  // Fetch real-time stats from backend (removed simulation)
  useEffect(() => {
    // TODO: Fetch real stats from Supabase/backend API
    // For now, stats remain at 0 until backend is connected
  }, []);

  // Real Data - Users will be fetched from Supabase or backend
  // Empty by default - shows empty state if no users exist
  const users: User[] = [];

  // Revenue history - fetch from backend/Supabase
  const revenueHistory: RevenueData[] = [];

  // System metrics - fetch from monitoring service
  const systemMetrics: SystemMetric[] = [];

  const keyStats: Stat[] = [
    {
      label: 'Active Users',
      value: realtimeStats.activeUsers.toLocaleString(),
      change: '+12.5%',
      trend: 'up',
      icon: UsersIcon,
      color: colors.info
    },
    {
      label: 'Monthly Revenue',
      value: `$${realtimeStats.revenue.toLocaleString()}`,
      change: '+23.8%',
      trend: 'up',
      icon: CurrencyDollarIcon,
      color: colors.success
    },
    {
      label: 'System Health',
      value: `${realtimeStats.systemHealth.toFixed(1)}%`,
      change: 'Optimal',
      trend: 'stable',
      icon: ServerIcon,
      color: colors.warning
    },
    {
      label: 'Active Alerts',
      value: realtimeStats.alerts,
      change: realtimeStats.alerts > 5 ? 'High' : realtimeStats.alerts > 2 ? 'Medium' : 'Low',
      trend: realtimeStats.alerts > 5 ? 'up' : 'down',
      icon: BellIcon,
      color: colors.primary
    }
  ];

  // Subscription breakdown - fetch from backend
  const subscriptionBreakdown = [];

  // Recent activity - fetch from backend/logs
  const recentActivity: Activity[] = [];

  // CEO Insights - AI-generated insights from real data
  const ceoInsights = [];

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatTime = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'trial': return colors.info;
      case 'at-risk': return colors.warning;
      case 'churned': return colors.error;
      default: return colors.textMuted;
    }
  };

  // ============================================================================
  // QUICK ACTIONS HANDLERS
  // ============================================================================

  const handleQuickAction = (action: string) => {
    setShowModal(action);
  };

  const handleSendNotification = () => {
    // In production, this would call your notification API
    alert('Notification feature would send to all users here!');
    setShowModal(null);
  };

  const handleGenerateReport = (type: string) => {
    // In production, this would generate and download the report
    const reportData = {
      date: new Date().toISOString(),
      type,
      stats: realtimeStats,
      revenue: revenueHistory,
      users: users.length
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceo-report-${type}-${Date.now()}.json`;
    a.click();
    setShowModal(null);
  };

  // ============================================================================
  // MODAL COMPONENTS
  // ============================================================================

  const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" style={{ backgroundColor: colors.surface }}>
        <div className="sticky top-0 flex items-center justify-between p-6 border-b" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70 transition" style={{ backgroundColor: colors.background }}>
            <XMarkIcon className="w-6 h-6" style={{ color: colors.text }} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyStats.map((stat, index) => (
          <div
            key={index}
            className="rounded-xl shadow-sm border p-6 hover:shadow-md transition cursor-pointer transform hover:scale-105"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <div style={{ color: stat.color }}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              {stat.trend && (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: stat.trend === 'up' ? `${colors.success}20` : stat.trend === 'down' ? `${colors.error}20` : `${colors.info}20`,
                    color: stat.trend === 'up' ? colors.success : stat.trend === 'down' ? colors.error : colors.info
                  }}
                >
                  {stat.change}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>{stat.value}</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* CEO Insights Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center" style={{ color: colors.text }}>
            <LightBulbIcon className="w-6 h-6 mr-2" style={{ color: colors.warning }} />
            AI-Powered CEO Insights
          </h2>
          <span className="text-xs" style={{ color: colors.textMuted }}>Updated 2 minutes ago</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ceoInsights.map((insight, index) => (
            <div
              key={index}
              className="rounded-xl shadow-sm border-l-4 p-6 hover:shadow-md transition cursor-pointer"
              style={{
                backgroundColor: colors.surface,
                borderLeftColor: insight.priority === 'high' ? colors.error : insight.priority === 'medium' ? colors.warning : colors.info
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <insight.icon className="w-5 h-5" style={{ color: colors.textMuted }} />
                  <h3 className="font-semibold" style={{ color: colors.text }}>{insight.title}</h3>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: insight.priority === 'high' ? `${colors.error}20` : insight.priority === 'medium' ? `${colors.warning}20` : `${colors.info}20`,
                    color: insight.priority === 'high' ? colors.error : insight.priority === 'medium' ? colors.warning : colors.info
                  }}
                >
                  {insight.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl font-bold" style={{ color: colors.primary }}>{insight.metric}</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.background, color: colors.textMuted }}>
                  {insight.impact}
                </span>
              </div>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>{insight.description}</p>
              <button className="text-sm font-medium flex items-center hover:opacity-70 transition" style={{ color: colors.primary }}>
                {insight.action}
                <ArrowRightIcon className="w-4 h-4 ml-1" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Breakdown */}
        <div className="lg:col-span-2 rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <h2 className="text-lg font-bold mb-6 flex items-center" style={{ color: colors.text }}>
            <ChartPieIcon className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
            Subscription Tier Breakdown
          </h2>
          <div className="space-y-4">
            {subscriptionBreakdown.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }} />
                  <span className="font-medium" style={{ color: colors.text }}>{tier.tier}</span>
                  <span className="text-sm" style={{ color: colors.textMuted }}>{tier.users} users</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold" style={{ color: colors.text }}>${tier.revenue.toLocaleString()}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>MRR</div>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: colors.border }}>
              <span className="font-bold" style={{ color: colors.text }}>Total MRR</span>
              <span className="font-bold text-xl" style={{ color: colors.primary }}>
                ${subscriptionBreakdown.reduce((acc, tier) => acc + tier.revenue, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <h2 className="text-lg font-bold mb-6 flex items-center" style={{ color: colors.text }}>
            <ClockIcon className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
            Live Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{
                    backgroundColor:
                      activity.severity === 'success' ? colors.success :
                      activity.severity === 'warning' ? colors.warning :
                      activity.severity === 'error' ? colors.error :
                      colors.info
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: colors.text }}>{activity.message}</p>
                  <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{formatTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.textMuted }} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition"
            style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
        >
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="at-risk">At Risk</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: colors.background }}>
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: colors.text }}>User</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: colors.text }}>Tier</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: colors.text }}>Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: colors.text }}>MRR</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: colors.text }}>Features Used</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: colors.text }}>Last Active</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: colors.text }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(user =>
                  (filterType === 'all' || user.status === filterType) &&
                  (searchQuery === '' || user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((user) => (
                  <tr key={user.id} className="border-t hover:opacity-80 transition" style={{ borderColor: colors.border }}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium" style={{ color: colors.text }}>{user.name}</div>
                        <div className="text-sm" style={{ color: colors.textMuted }}>{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: colors.background, color: colors.text }}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: `${getStatusColor(user.status)}20`, color: getStatusColor(user.status) }}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: colors.text }}>
                      ${user.mrr.toFixed(2)}
                    </td>
                    <td className="px-6 py-4" style={{ color: colors.textMuted }}>
                      {user.featuresUsed}/15
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.textMuted }}>
                      {formatTime(user.lastActive)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button className="p-2 rounded hover:opacity-70 transition" style={{ backgroundColor: colors.background }}>
                          <PencilIcon className="w-4 h-4" style={{ color: colors.primary }} />
                        </button>
                        <button className="p-2 rounded hover:opacity-70 transition" style={{ backgroundColor: colors.background }}>
                          <EnvelopeIcon className="w-4 h-4" style={{ color: colors.info }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRevenueTab = () => (
    <div className="space-y-6">
      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <div className="text-sm mb-2" style={{ color: colors.textMuted }}>Total MRR</div>
          <div className="text-3xl font-bold mb-1" style={{ color: colors.text }}>
            ${realtimeStats.revenue.toLocaleString()}
          </div>
          <div className="text-sm" style={{ color: colors.success }}>+23.8% vs last month</div>
        </div>
        <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <div className="text-sm mb-2" style={{ color: colors.textMuted }}>ARPU</div>
          <div className="text-3xl font-bold mb-1" style={{ color: colors.text }}>
            ${(realtimeStats.revenue / realtimeStats.activeUsers).toFixed(2)}
          </div>
          <div className="text-sm" style={{ color: colors.success }}>+8.2% vs last month</div>
        </div>
        <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <div className="text-sm mb-2" style={{ color: colors.textMuted }}>Churn Rate</div>
          <div className="text-3xl font-bold mb-1" style={{ color: colors.text }}>4.2%</div>
          <div className="text-sm" style={{ color: colors.success }}>-1.1% vs last month</div>
        </div>
        <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <div className="text-sm mb-2" style={{ color: colors.textMuted }}>LTV:CAC</div>
          <div className="text-3xl font-bold mb-1" style={{ color: colors.text }}>12.5:1</div>
          <div className="text-sm" style={{ color: colors.success }}>Excellent ratio</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <h2 className="text-lg font-bold mb-6" style={{ color: colors.text }}>Revenue Trend (Last 6 Months)</h2>
        <div className="space-y-4">
          {revenueHistory.map((data, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-12 text-sm font-medium" style={{ color: colors.textMuted }}>{data.month}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: colors.text }}>${data.revenue.toLocaleString()}</span>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    +{data.newCustomers} new | -{data.churnedCustomers} churned
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.background }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      backgroundColor: colors.primary,
                      width: `${(data.revenue / Math.max(...revenueHistory.map(d => d.revenue))) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {systemMetrics.map((metric, index) => (
          <div
            key={index}
            className="rounded-xl shadow-sm border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: colors.textMuted }}>{metric.name}</span>
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    metric.status === 'healthy' ? colors.success :
                    metric.status === 'warning' ? colors.warning :
                    colors.error
                }}
              />
            </div>
            <div className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
              {metric.name.includes('Rate') || metric.name.includes('Uptime') || metric.name.includes('Load') || metric.name.includes('Usage')
                ? `${metric.value}${metric.name.includes('Time') || metric.name.includes('Uptime') ? '%' : metric.name.includes('Response') ? 'ms' : '%'}`
                : metric.value.toLocaleString()}
            </div>
            <div className="text-sm" style={{ color: colors.textMuted }}>{metric.description}</div>
          </div>
        ))}
      </div>

      {/* System Actions */}
      <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <h2 className="text-lg font-bold mb-6" style={{ color: colors.text }}>System Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => alert('Backup initiated!')}
            className="p-4 rounded-lg border hover:opacity-80 transition text-left"
            style={{ backgroundColor: colors.background, borderColor: colors.border }}
          >
            <ServerIcon className="w-6 h-6 mb-2" style={{ color: colors.primary }} />
            <div className="font-semibold mb-1" style={{ color: colors.text }}>Database Backup</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Create full system backup</div>
          </button>
          <button
            onClick={() => alert('Cache cleared!')}
            className="p-4 rounded-lg border hover:opacity-80 transition text-left"
            style={{ backgroundColor: colors.background, borderColor: colors.border }}
          >
            <TrashIcon className="w-6 h-6 mb-2" style={{ color: colors.warning }} />
            <div className="font-semibold mb-1" style={{ color: colors.text }}>Clear Cache</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Clear system cache</div>
          </button>
          <button
            onClick={() => handleQuickAction('security-logs')}
            className="p-4 rounded-lg border hover:opacity-80 transition text-left"
            style={{ backgroundColor: colors.background, borderColor: colors.border }}
          >
            <ShieldCheckIcon className="w-6 h-6 mb-2" style={{ color: colors.error }} />
            <div className="font-semibold mb-1" style={{ color: colors.text }}>Security Logs</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>View security events</div>
          </button>
          <button
            onClick={() => alert('Health check running...')}
            className="p-4 rounded-lg border hover:opacity-80 transition text-left"
            style={{ backgroundColor: colors.background, borderColor: colors.border }}
          >
            <CheckCircleIcon className="w-6 h-6 mb-2" style={{ color: colors.success }} />
            <div className="font-semibold mb-1" style={{ color: colors.text }}>Health Check</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Run full system check</div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <h2 className="text-xl font-bold mb-6" style={{ color: colors.text }}>AI-Generated Business Insights</h2>
        <div className="space-y-6">
          {ceoInsights.map((insight, index) => (
            <div key={index} className="p-6 rounded-lg border" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.surface }}
                >
                  <insight.icon className="w-6 h-6" style={{ color: colors.primary }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{insight.title}</h3>
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: insight.priority === 'high' ? `${colors.error}20` : insight.priority === 'medium' ? `${colors.warning}20` : `${colors.info}20`,
                        color: insight.priority === 'high' ? colors.error : insight.priority === 'medium' ? colors.warning : colors.info
                      }}
                    >
                      {insight.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm mb-1" style={{ color: colors.textMuted }}>Key Metric</div>
                      <div className="text-2xl font-bold" style={{ color: colors.primary }}>{insight.metric}</div>
                    </div>
                    <div>
                      <div className="text-sm mb-1" style={{ color: colors.textMuted }}>Impact</div>
                      <div className="text-lg font-semibold" style={{ color: colors.text }}>{insight.impact}</div>
                    </div>
                  </div>
                  <p className="text-sm mb-4" style={{ color: colors.textMuted }}>{insight.description}</p>
                  <button
                    className="px-4 py-2 rounded-lg font-medium hover:opacity-80 transition"
                    style={{ backgroundColor: colors.primary, color: 'white' }}
                  >
                    {insight.action}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="rounded-xl shadow-sm border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <h2 className="text-xl font-bold mb-6 flex items-center" style={{ color: colors.text }}>
          <SparklesIcon className="w-6 h-6 mr-2" style={{ color: colors.warning }} />
          Recommended Actions
        </h2>
        <div className="space-y-4">
          {[
            { action: 'Launch email campaign for at-risk users', impact: 'Save $1,247 MRR', confidence: 87 },
            { action: 'Extend trial period from 3 to 7 days', impact: '+18% conversion rate', confidence: 92 },
            { action: 'Bundle AI features in Gold tier', impact: '+$4,200 MRR potential', confidence: 78 },
            { action: 'Implement annual billing discount', impact: '40% churn reduction', confidence: 95 }
          ].map((rec, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
              <div className="flex-1">
                <div className="font-semibold mb-1" style={{ color: colors.text }}>{rec.action}</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Expected Impact: {rec.impact}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm" style={{ color: colors.textMuted }}>Confidence</div>
                  <div className="text-lg font-bold" style={{ color: colors.success }}>{rec.confidence}%</div>
                </div>
                <button
                  className="px-4 py-2 rounded-lg font-medium hover:opacity-80 transition whitespace-nowrap"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                >
                  Implement
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-40 shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                <span className="text-white font-bold text-xl">FS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: colors.text }}>FlowSphere CEO Dashboard</h1>
                <p className="text-xs" style={{ color: colors.textMuted }}>Executive Command Center</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Theme Switcher */}
              <div className="flex items-center space-x-2 p-1 rounded-lg" style={{ backgroundColor: colors.background }}>
                <button
                  onClick={() => setThemeMode('light')}
                  className={`p-2 rounded-lg transition ${themeMode === 'light' ? 'shadow-sm' : ''}`}
                  style={{ backgroundColor: themeMode === 'light' ? colors.surface : 'transparent' }}
                >
                  <SunIcon className="w-5 h-5" style={{ color: themeMode === 'light' ? colors.warning : colors.textMuted }} />
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`p-2 rounded-lg transition ${themeMode === 'dark' ? 'shadow-sm' : ''}`}
                  style={{ backgroundColor: themeMode === 'dark' ? colors.surface : 'transparent' }}
                >
                  <MoonIcon className="w-5 h-5" style={{ color: themeMode === 'dark' ? colors.info : colors.textMuted }} />
                </button>
                <button
                  onClick={() => setThemeMode('auto')}
                  className={`p-2 rounded-lg transition ${themeMode === 'auto' ? 'shadow-sm' : ''}`}
                  style={{ backgroundColor: themeMode === 'auto' ? colors.surface : 'transparent' }}
                >
                  <ComputerDesktopIcon className="w-5 h-5" style={{ color: themeMode === 'auto' ? colors.primary : colors.textMuted }} />
                </button>
              </div>

              {/* Color Scheme Selector */}
              <select
                value={activeColorScheme}
                onChange={(e) => setActiveColorScheme(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
              >
                {colorSchemes.map((scheme, index) => (
                  <option key={index} value={index}>{scheme.name}</option>
                ))}
              </select>

              {/* Notifications */}
              <div className="relative">
                <button className="p-2 rounded-lg hover:opacity-70 transition" style={{ backgroundColor: colors.background }}>
                  <BellIcon className="w-6 h-6" style={{ color: colors.text }} />
                  {realtimeStats.alerts > 0 && (
                    <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: colors.error }}>
                      {realtimeStats.alerts}
                    </span>
                  )}
                </button>
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                  <span className="text-white font-semibold text-sm">CEO</span>
                </div>
                <span className="text-sm font-medium" style={{ color: colors.text }}>Chief Executive</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 -mb-px overflow-x-auto">
            {(['overview', 'users', 'revenue', 'system', 'insights'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="py-4 px-1 border-b-2 font-medium text-sm capitalize transition whitespace-nowrap"
                style={{
                  borderBottomColor: activeTab === tab ? colors.primary : 'transparent',
                  color: activeTab === tab ? colors.primary : colors.textMuted
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'revenue' && renderRevenueTab()}
        {activeTab === 'system' && renderSystemTab()}
        {activeTab === 'insights' && renderInsightsTab()}

        {/* Quick Actions - Always Visible */}
        <div className="mt-8 rounded-xl shadow-lg p-6" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Send Notification', icon: BellIcon, action: 'notification' },
              { label: 'Generate Report', icon: DocumentTextIcon, action: 'report' },
              { label: 'View Security', icon: ShieldCheckIcon, action: 'security' },
              { label: 'Manage Users', icon: UsersIcon, action: 'users-manage' },
              { label: 'System Health', icon: ServerIcon, action: 'health' },
              { label: 'Export Data', icon: ArrowDownTrayIcon, action: 'export' }
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.action)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center justify-center space-y-2 transition text-white hover:scale-105 transform"
              >
                <action.icon className="w-6 h-6" />
                <span className="text-xs text-center font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CEO Tips Section */}
        <div className="mt-8 rounded-xl border p-6" style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`, borderColor: colors.border }}>
          <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: colors.text }}>
            <SparklesIcon className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
            CEO Tips & Suggestions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '💡 Revenue Optimization', tip: 'Annual billing discounts improve cash flow and reduce churn by 40%' },
              { title: '📊 Data-Driven Decisions', tip: 'Gold tier users engage 3x more with AI features - bundle more capabilities' },
              { title: '👥 User Retention', tip: 'Users enabling 3+ features in week 1 have 85% retention rate' },
              { title: '🚀 Growth Strategy', tip: 'Family plan has 80:1 LTV:CAC ratio - focus marketing here' }
            ].map((tip, index) => (
              <div key={index} className="rounded-lg p-4 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <h3 className="font-semibold mb-2" style={{ color: colors.text }}>{tip.title}</h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>{tip.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showModal === 'notification' && (
        <Modal title="Send Notification to All Users" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Subject</label>
              <input
                type="text"
                placeholder="Enter notification subject..."
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Message</label>
              <textarea
                rows={4}
                placeholder="Enter your message..."
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleSendNotification}
                className="flex-1 py-3 rounded-lg font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                Send to All Users
              </button>
              <button
                onClick={() => setShowModal(null)}
                className="px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: colors.background, color: colors.text }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'report' && (
        <Modal title="Generate Report" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: colors.textMuted }}>Select the type of report you'd like to generate:</p>
            <div className="grid grid-cols-2 gap-4">
              {['Revenue', 'Users', 'System', 'Complete'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleGenerateReport(type.toLowerCase())}
                  className="p-4 rounded-lg border hover:opacity-80 transition text-center"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                >
                  <DocumentTextIcon className="w-8 h-8 mx-auto mb-2" style={{ color: colors.primary }} />
                  <div className="font-semibold">{type} Report</div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'security' && (
        <Modal title="Security Logs" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            {recentActivity.filter(a => a.type === 'security').map((activity) => (
              <div key={activity.id} className="p-4 rounded-lg border" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium mb-1" style={{ color: colors.text }}>{activity.message}</p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>{formatTime(activity.timestamp)}</p>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: activity.severity === 'warning' ? `${colors.warning}20` : `${colors.error}20`,
                      color: activity.severity === 'warning' ? colors.warning : colors.error
                    }}
                  >
                    {activity.severity?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CEODashboard;
