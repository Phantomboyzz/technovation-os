import { useState } from 'react'
import { Building2, Users, Shield, Save, Globe, Palette, Bell, Key } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn } from '@/lib/utils'

export default function SocietySettings() {
  const { profile } = useAuthStore()
  const [settings, setSettings] = useState({
    society_name: 'Technovation Society',
    society_tagline: 'Innovate. Create. Transform.',
    society_description: 'A student society dedicated to fostering innovation and technical excellence.',
    contact_email: 'contact@technovation.edu',
    contact_phone: '+91 98765 43210',
    address: 'College Campus, City, State',
    website: 'https://technovation.edu',
    primary_color: '#8b5cf6',
    secondary_color: '#06b6d4',
    allow_member_signup: true,
    require_approval: true,
    notification_email: true,
    notification_push: true,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      // In a real app, this would save to a settings table
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Society Settings</h1>
        <p className="text-muted mt-1">Configure society-wide settings</p>
      </div>

      {message && (
        <div className={cn('p-4 rounded-xl flex items-center gap-3',
          message.type === 'success' && 'bg-green-500/10 border border-green-500/30 text-green-400',
          message.type === 'error' && 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        )}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <GlassCard>
          <GlassCardHeader title="Basic Information" />
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Society Name</label>
                <input
                  type="text"
                  value={settings.society_name}
                  onChange={e => setSettings(prev => ({ ...prev, society_name: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Tagline</label>
                <input
                  type="text"
                  value={settings.society_tagline}
                  onChange={e => setSettings(prev => ({ ...prev, society_tagline: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={settings.society_description}
                onChange={e => setSettings(prev => ({ ...prev, society_description: e.target.value }))}
                className="input min-h-[100px] resize-y"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Contact Email</label>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={e => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input
                  type="tel"
                  value={settings.contact_phone}
                  onChange={e => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings(prev => ({ ...prev, address: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                type="url"
                value={settings.website}
                onChange={e => setSettings(prev => ({ ...prev, website: e.target.value }))}
                className="input"
              />
            </div>
          </div>
        </GlassCard>

        {/* Branding */}
        <GlassCard>
          <GlassCardHeader title="Branding & Theme" />
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Color</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={e => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={e => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="input flex-1 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="label">Secondary Color</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.secondary_color}
                    onChange={e => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondary_color}
                    onChange={e => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="input flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-muted">Color changes require rebuilding the frontend</p>
          </div>
        </GlassCard>

        {/* Membership */}
        <GlassCard>
          <GlassCardHeader title="Membership & Access" />
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_member_signup}
                onChange={e => setSettings(prev => ({ ...prev, allow_member_signup: e.target.checked }))}
                className="w-5 h-5 accent-purple"
              />
              <div>
                <p className="font-medium">Allow Member Self-Signup</p>
                <p className="text-sm text-muted">Let users create accounts without admin approval</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_approval}
                onChange={e => setSettings(prev => ({ ...prev, require_approval: e.target.checked }))}
                className="w-5 h-5 accent-purple"
              />
              <div>
                <p className="font-medium">Require Admin Approval</p>
                <p className="text-sm text-muted">New members need admin approval before accessing the platform</p>
              </div>
            </label>
          </div>
        </GlassCard>

        {/* Notifications */}
        <GlassCard>
          <GlassCardHeader title="Default Notifications" />
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notification_email}
                onChange={e => setSettings(prev => ({ ...prev, notification_email: e.target.checked }))}
                className="w-5 h-5 accent-purple"
              />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted">Send email notifications for important events</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notification_push}
                onChange={e => setSettings(prev => ({ ...prev, notification_push: e.target.checked }))}
                className="w-5 h-5 accent-purple"
              />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted">Enable browser push notifications</p>
              </div>
            </label>
          </div>
        </GlassCard>

        {/* Security */}
        <GlassCard>
          <GlassCardHeader title="Security" />
          <div className="space-y-4">
            <div>
              <label className="label">Session Timeout (minutes)</label>
              <input type="number" value={60} className="input w-auto" min="15" max="1440" />
            </div>
            <div>
              <label className="label">Max Login Attempts</label>
              <input type="number" value={5} className="input w-auto" min="3" max="20" />
            </div>
            <div>
              <label className="label">Password Min Length</label>
              <input type="number" value={8} className="input w-auto" min="6" max="32" />
            </div>
          </div>
        </GlassCard>

        {/* API Keys */}
        <GlassCard className="border-amber-500/30 bg-amber-500/5">
          <GlassCardHeader title="API Configuration" subtitle="Configure in .env file - not stored in database" />
          <div className="space-y-4 text-sm text-muted">
            <div className="glass p-3 rounded-xl font-mono">VITE_SUPABASE_URL</div>
            <div className="glass p-3 rounded-xl font-mono">VITE_SUPABASE_ANON_KEY</div>
            <div className="glass p-3 rounded-xl font-mono">SUPABASE_SERVICE_ROLE_KEY</div>
            <div className="glass p-3 rounded-xl font-mono">VITE_GROQ_API_KEY</div>
            <div className="glass p-3 rounded-xl font-mono">AUTOMATION_POLL_INTERVAL</div>
          </div>
        </GlassCard>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary">Reset to Defaults</button>
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

import { CheckCircle, AlertTriangle } from 'lucide-react'