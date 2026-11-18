import { Outlet } from 'react-router-dom'
import { Layout, Sparkles } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Brand sidebar */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-background via-background/80 to-background soft">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-cyan mb-8">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-display font-bold gradient-text mb-4">
            Technovation OS
          </h1>
          <p className="text-lg text-muted mb-12 max-w-lg mx-auto">
            AI-powered Society Management & Event Automation Platform.
            From idea to execution — automated.
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="glass-card p-4">
              <div className="text-3xl font-bold gradient-text">10+</div>
              <div className="text-sm text-muted">Events Managed</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-3xl font-bold gradient-text">50+</div>
              <div className="text-sm text-muted">Automation Rules</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-3xl font-bold gradient-text">99%</div>
              <div className="text-sm text-muted">Task Completion</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}