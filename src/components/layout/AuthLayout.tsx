import { Outlet } from 'react-router-dom'
import { Sparkles, Shield, Zap, Users } from 'lucide-react'

const features = [
  { icon: Shield, title: 'Role-Based Access', desc: 'President, VP, HOD, Faculty & Member roles with granular permissions' },
  { icon: Zap, title: 'AI-Powered', desc: 'Groq AI for event ideation, proposal generation & society assistant' },
  { icon: Users, title: 'Full Lifecycle', desc: 'From idea to execution — events, proposals, tasks, certificates & letters' },
]

export function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden border-r"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        {/* Background decoration */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 20% 20%, rgba(139,92,246,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.3) 0%, transparent 60%)',
          }}
        />

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-glow">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl gradient-text">Technovation OS</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Society Management Platform</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h2 className="text-4xl font-display font-bold leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
              From Idea to<br />
              <span className="gradient-text">Execution</span>
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              AI-powered society management. Automate events, proposals, tasks, and member management with intelligent workflows.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map(f => (
              <div
                key={f.title}
                className="flex items-start gap-4 p-4 rounded-2xl"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-3 gap-3">
          {[
            { value: '5', label: 'Role Levels' },
            { value: 'AI', label: 'Groq Powered' },
            { value: '∞', label: 'Automations' },
          ].map(s => (
            <div
              key={s.label}
              className="text-center p-3 rounded-xl"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <p className="text-2xl font-display font-bold gradient-text">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display font-bold text-lg gradient-text">Technovation OS</h1>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
