import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationStore } from '@/store/notificationStore'
import { useThemeStore } from '@/store/themeStore'
import {
  LayoutDashboard, Calendar, Zap, Users, Bot, Bell, Settings, LogOut,
  Menu, X, ChevronDown, Sparkles, Building2, Shield, ClipboardList,
  CheckSquare, Sun, Moon, FileText, Award, GraduationCap,
} from 'lucide-react'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { getRoleName, can } from '@/lib/permissions'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard/president', label: 'President Dashboard', icon: Shield, roles: ['president', 'vice_president'] },
      { path: '/dashboard/hod', label: 'HOD Dashboard', icon: Building2, roles: ['hod'] },
      { path: '/dashboard/faculty', label: 'Faculty Dashboard', icon: ClipboardList, roles: ['faculty'] },
      { path: '/dashboard/member', label: 'Member Dashboard', icon: LayoutDashboard, roles: ['member'] },
    ]
  },
  {
    label: 'Work',
    items: [
      { path: '/events', label: 'Events', icon: Calendar, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
      { path: '/tasks', label: 'Tasks', icon: CheckSquare, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
      { path: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['president', 'vice_president', 'faculty'] },
    ]
  },
  {
    label: 'Generate',
    items: [
      { path: '/letters', label: 'Letters', icon: FileText, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
      { path: '/certificates', label: 'Certificates', icon: Award, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
    ]
  },
  {
    label: 'Society',
    items: [
      { path: '/members', label: 'Members', icon: Users, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
      { path: '/departments', label: 'Departments', icon: Building2, roles: ['president', 'vice_president', 'hod'] },
      { path: '/roles', label: 'Roles', icon: GraduationCap, roles: ['president'] },
      { path: '/assistant', label: 'AI Assistant', icon: Bot, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
    ]
  },
  {
    label: 'System',
    items: [
      { path: '/automation', label: 'Automation Rules', icon: Zap, roles: ['president', 'vice_president'] },
      { path: '/settings/society', label: 'Society Settings', icon: Settings, roles: ['president', 'vice_president'] },
      { path: '/notifications', label: 'Notifications', icon: Bell, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
      { path: '/settings/profile', label: 'My Profile', icon: Settings, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
    ]
  },
]

export function AppLayout() {
  const { profile, logout, user } = useAuth()
  const { notifications, unreadCount, markRead } = useNotificationStore()
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const role = getRoleName(profile)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path.startsWith('/dashboard')) return location.pathname.startsWith('/dashboard')
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const getActiveLabel = () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.roles.includes(role) && isActive(item.path)) {
          return item.label
        }
      }
    }
    return 'Dashboard'
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setNotifOpen(false)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-glow">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-sm gradient-text leading-tight">Technovation OS</h1>
          <p className="text-xs text-muted capitalize mt-0.5">{profile?.roles?.name || 'Member'}</p>
        </div>
        <button
          className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-white/5"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => item.roles.includes(role))
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.path)
                  const isBell = item.path === '/notifications'
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={cn(
                        active ? 'sidebar-link-active' : 'sidebar-link'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isBell && unreadCount > 0 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
            {getInitials(profile?.full_name || user?.email)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{profile?.full_name || 'User'}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link text-rose-400 hover:text-rose-300 w-full"
          style={{ color: '#f43f5e' }}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 h-screen transition-transform duration-300 ease-in-out border-r flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 px-4 lg:px-8 py-3.5 border-b flex items-center justify-between gap-4"
          style={{
            background: 'var(--sidebar-bg)',
            borderColor: 'var(--sidebar-border)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl"
              style={{ background: 'var(--bg-hover)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="hidden sm:block">
              <h2 className="font-display font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {getActiveLabel()}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {/* Notifications */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
                className="relative theme-toggle"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-xs font-bold rounded-full flex items-center justify-center text-white leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl py-2 animate-scale-in z-50 shadow-glass border"
                  style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--border)' }}
                >
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => notifications.filter(n => !n.read).forEach(n => markRead(n.id))}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--accent-cyan)' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 8).map(n => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (!n.read) markRead(n.id)
                            if (n.entity_type && n.entity_id) navigate(`/${n.entity_type}/${n.entity_id}`)
                            setNotifOpen(false)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
                          style={{ background: !n.read ? 'var(--bg-hover)' : undefined }}
                        >
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{timeAgo(n.created_at)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                style={{ background: 'var(--bg-hover)' }}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs">
                  {getInitials(profile?.full_name || user?.email)}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{profile?.full_name || 'User'}</p>
                  <p className="text-xs capitalize leading-tight" style={{ color: 'var(--text-muted)' }}>{role}</p>
                </div>
                <ChevronDown className="w-3 h-3 hidden md:block" style={{ color: 'var(--text-muted)' }} />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl py-2 animate-scale-in z-50 shadow-glass border"
                  style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--border)' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{profile?.full_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
                  </div>
                  <NavLink
                    to="/settings/profile"
                    className="block px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profile Settings
                  </NavLink>
                  {can(profile, 'settings', 'update') && (
                    <NavLink
                      to="/settings/society"
                      className="block px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Society Settings
                    </NavLink>
                  )}
                  <div className="my-1 mx-4 h-px" style={{ background: 'var(--border)' }} />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-rose-500/10"
                    style={{ color: '#f43f5e' }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
