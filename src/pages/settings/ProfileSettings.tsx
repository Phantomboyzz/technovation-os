import { useState } from 'react'
import { User, Mail, Phone, Save, Camera, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { memberService } from '@/services/memberService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, getInitials } from '@/lib/utils'

export default function ProfileSettings() {
  const { profile, setProfile } = useAuthStore()
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
  })
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await memberService.updateProfile(profile?.id || '', formData)
      setProfile({ ...profile!, ...formData })
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.new !== passwordData.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      // Use Supabase auth update
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.auth.updateUser({ password: passwordData.new })
      if (error) throw error
      setPasswordData({ current: '', new: '', confirm: '' })
      setMessage({ type: 'success', text: 'Password updated successfully!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Profile Settings</h1>
        <p className="text-muted mt-1">Manage your personal information</p>
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

      {/* Profile Info */}
      <GlassCard>
        <GlassCardHeader title="Personal Information" />
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center font-bold text-white text-2xl">
              {getInitials(profile?.full_name)}
            </div>
            <div>
              <p className="text-sm text-muted">Avatar</p>
              <p className="text-sm">Custom avatars coming soon</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input"
                disabled
              />
              <p className="text-xs text-muted mt-1">Email changes require re-verification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <input
                type="text"
                value={profile?.roles?.name || 'member'}
                className="input"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              className="input min-h-[100px] resize-y"
              placeholder="Tell us about yourself..."
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </GlassCard>

      {/* Change Password */}
      <GlassCard>
        <GlassCardHeader title="Change Password" />
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={passwordData.current}
                onChange={e => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                className="input pr-12"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={passwordData.new}
                onChange={e => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                className="input pr-12"
                minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              value={passwordData.confirm}
              onChange={e => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
              className="input"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-secondary">
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard className="border-rose-500/30 bg-rose-500/5">
        <GlassCardHeader title="Danger Zone" subtitle="Irreversible actions" />
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-rose-400">Delete Account</h4>
            <p className="text-sm text-muted">Permanently delete your account and all data</p>
          </div>
          <button className="btn-danger">Delete Account</button>
        </div>
      </GlassCard>
    </div>
  )
}

import { CheckCircle, AlertTriangle } from 'lucide-react'