import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can, getRoleName } from '@/lib/permissions'

// Lazy load pages
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const EventCreate = lazy(() => import('@/pages/events/EventCreate'))

const PresidentDashboard = lazy(() => import('@/pages/dashboard/PresidentDashboard'))
const HODDashboard = lazy(() => import('@/pages/dashboard/HODDashboard'))
const FacultyDashboard = lazy(() => import('@/pages/dashboard/FacultyDashboard'))
const MemberDashboard = lazy(() => import('@/pages/dashboard/MemberDashboard'))

const EventsList = lazy(() => import('@/pages/events/EventsList'))
const EventDetail = lazy(() => import('@/pages/events/EventDetail'))
const EventIdeation = lazy(() => import('@/pages/events/EventIdeation'))
const ProposalBuilder = lazy(() => import('@/pages/events/ProposalBuilder'))
const ApprovalQueue = lazy(() => import('@/pages/events/ApprovalQueue'))
const TaskBoard = lazy(() => import('@/pages/events/TaskBoard'))

const AutomationRules = lazy(() => import('@/pages/automation/AutomationRules'))
const AutomationBuilder = lazy(() => import('@/pages/automation/AutomationBuilder'))
const AutomationLogs = lazy(() => import('@/pages/automation/AutomationLogs'))

const MembersDirectory = lazy(() => import('@/pages/members/MembersDirectory'))
const Departments = lazy(() => import('@/pages/members/Departments'))
const Roles = lazy(() => import('@/pages/members/Roles'))

const Assistant = lazy(() => import('@/pages/assistant/Assistant'))

const Notifications = lazy(() => import('@/pages/notifications/Notifications'))

const ProfileSettings = lazy(() => import('@/pages/settings/ProfileSettings'))
const SocietySettings = lazy(() => import('@/pages/settings/SocietySettings'))

function ProtectedRoute({ children, requiredLevel = 10, requiredPermission }: {
  children: React.ReactNode
  requiredLevel?: number
  requiredPermission?: { resource: string; action: string }
}) {
  const { profile, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner size="lg" message="Checking permissions..." />
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  const userLevel = profile.roles?.level || 10

  if (userLevel < requiredLevel) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredPermission && !can(profile, requiredPermission.resource, requiredPermission.action)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function DashboardRedirect() {
  const { profile } = useAuth()
  if (!profile) return <LoadingSpinner size="lg" />

  const role = getRoleName(profile)
  switch (role) {
    case 'president':
    case 'vice_president':
      return <Navigate to="/dashboard/president" replace />
    case 'hod':
      return <Navigate to="/dashboard/hod" replace />
    case 'faculty':
      return <Navigate to="/dashboard/faculty" replace />
    default:
      return <Navigate to="/dashboard/member" replace />
  }
}

export default function App() {
  useRealtime()

  return (
    <Suspense fallback={<LoadingSpinner size="lg" message="Loading page..." />}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected app routes */}
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/president"
            element={
              <ProtectedRoute requiredLevel={40}>
                <PresidentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/hod"
            element={
              <ProtectedRoute requiredLevel={30}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/faculty"
            element={
              <ProtectedRoute requiredLevel={20}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/member"
            element={
              <ProtectedRoute requiredLevel={10}>
                <MemberDashboard />
              </ProtectedRoute>
            }
          />

          {/* Events */}
          <Route
            path="/events"
            element={
              <ProtectedRoute requiredLevel={10}>
                <EventsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/new"
            element={
              <ProtectedRoute requiredLevel={10} requiredPermission={{ resource: 'events', action: 'create' }}>
                <EventCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute requiredLevel={10}>
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/ideate"
            element={
              <ProtectedRoute requiredLevel={10} requiredPermission={{ resource: 'events', action: 'create' }}>
                <EventIdeation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/proposal"
            element={
              <ProtectedRoute requiredLevel={10} requiredPermission={{ resource: 'proposals', action: 'create' }}>
                <ProposalBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute requiredLevel={20} requiredPermission={{ resource: 'proposals', action: 'approve' }}>
                <ApprovalQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute requiredLevel={10}>
                <TaskBoard />
              </ProtectedRoute>
            }
          />

          {/* Automation */}
          <Route
            path="/automation"
            element={
              <ProtectedRoute requiredLevel={40} requiredPermission={{ resource: 'automations', action: 'read' }}>
                <AutomationRules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/automation/new"
            element={
              <ProtectedRoute requiredLevel={40} requiredPermission={{ resource: 'automations', action: 'create' }}>
                <AutomationBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/automation/:id"
            element={
              <ProtectedRoute requiredLevel={40} requiredPermission={{ resource: 'automations', action: 'read' }}>
                <AutomationBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/automation/logs"
            element={
              <ProtectedRoute requiredLevel={40} requiredPermission={{ resource: 'automations', action: 'read' }}>
                <AutomationLogs />
              </ProtectedRoute>
            }
          />

          {/* Members */}
          <Route
            path="/members"
            element={
              <ProtectedRoute requiredLevel={10}>
                <MembersDirectory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute requiredLevel={30} requiredPermission={{ resource: 'departments', action: 'read' }}>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute requiredLevel={50} requiredPermission={{ resource: 'roles', action: 'read' }}>
                <Roles />
              </ProtectedRoute>
            }
          />

          {/* AI Assistant */}
          <Route
            path="/assistant"
            element={
              <ProtectedRoute requiredLevel={10} requiredPermission={{ resource: 'assistant', action: 'read' }}>
                <Assistant />
              </ProtectedRoute>
            }
          />

          {/* Notifications */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute requiredLevel={10}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings/profile"
            element={
              <ProtectedRoute requiredLevel={10}>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/society"
            element={
              <ProtectedRoute requiredLevel={40} requiredPermission={{ resource: 'settings', action: 'update' }}>
                <SocietySettings />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}