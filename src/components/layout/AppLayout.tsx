import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationStore } from '@/store/notificationStore'
import {
  LayoutDashboard,
  Calendar,
  Zap,
  Users,
  Bot,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Building2,
  Shield,
  ClipboardList,
} from 'lucide-react'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { getRoleName, can } from '@/lib/permissions'
import { useEventStore } from '@/store/eventStore'

const NAV_ITEMS = [
  { path: '/dashboard/president', label: 'President', icon: Shield, roles: ['president', 'vice_president'] },
  { path: '/dashboard/hod', label: 'HOD', icon: Building2, roles: ['hod'] },
  { path: '/dashboard/faculty', label: 'Faculty', icon: ClipboardList, roles: ['faculty'] },
  { path: '/dashboard/member', label: 'Dashboard', icon: LayoutDashboard, roles: ['member'] },
  { path: '/events', label: 'Events', icon: Calendar, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
  { path: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
  { path: '/automation', label: 'Automation', icon: Zap, roles: ['president', 'vice_president'] },
  { path: '/members', label: 'Members', icon: Users, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
  { path: '/assistant', label: 'AI Assistant', icon: Bot, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
  { path: '/notifications', label: 'Notifications', icon: Bell, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
  { path: '/settings/profile', label: 'Profile', icon: Settings, roles: ['president', 'vice_president', 'hod', 'faculty', 'member'] },
  { path: '/settings/society', label: 'Society', icon: Settings, roles: ['president', 'vice_president'] },
]

export function AppLayout() {
  const { profile, logout, user } = useAuth()
  const { notifications, unreadCount, markRead } = useNotificationStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const role = getRoleName(profile)
  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(role))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname.startsWith('/dashboard')
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static z-50 w-64 h-full lg:h-screen glass border-r transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg gradient-text">Technovation OS</h1>
              <p className="text-xs text-muted">{profile?.roles?.name || 'Member'}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {filteredNav.map(item => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'sidebar-link',
                    active && 'sidebar-link-active'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Bottom: Logout */}
          <button
            onClick={handleLogout}
            className="sidebar-link text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-white/5"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="font-display text-xl font-semibold hidden sm:block">
                {filteredNav.find(n => isActive(n.path))?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Bell className="w-5 h-5 text-muted" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-rose text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 glass-card shadow-glass rounded-2xl py-2">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            notifications.filter(n => !n.read).forEach(n => markRead(n.id))
                          }}
                          className="text-xs text-accent-cyan hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-muted text-sm">No notifications</div>
                      ) : (
                        notifications.slice(0, 10).map(n => (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (!n.read) markRead(n.id)
                              if (n.entity_type && n.entity_id) {
                                navigate(`/${n.entity_type}/${n.entity_id}`)
                              }
                              setNotifOpen(false)
                            }}
                            className={cn(
                              'w-full px-4 py-3 text-left hover:bg-white/5 transition-colors',
                              !n.read && 'bg-white/5'
                            )}
                          >
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-muted mt-1 truncate">{n.message}</p>
                            <p className="text-xs text-dim mt-1">{timeAgo(n.created_at)}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center font-medium text-white text-sm">
                    {getInitials(profile?.full_name || user?.email)}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted capitalize">{role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 glass-card shadow-glass rounded-2xl py-2">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="font-medium">{profile?.full_name}</p>
                      <p className="text-xs text-muted">{profile?.email}</p>
                    </div>
                    <NavLink
                      to="/settings/profile"
                      className="block px-4 py-2 text-sm hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Profile Settings
                    </NavLink>
                    {can(profile, 'settings', 'update') && (
                      <NavLink
                        to="/settings/society"
                        className="block px-4 py-2 text-sm hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Society Settings
                      </NavLink>
                    )}
                    <hr className="my-2 border-white/10" />
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 text-left"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}