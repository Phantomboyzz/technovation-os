import { useState, useRef } from 'react'
import { Award, Sparkles, Printer, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { GlassCard, GlassCardHeader } from '@/components/common'

const CERT_TYPES = [
  { id: 'participation', label: 'Participation Certificate', desc: 'For event participants' },
  { id: 'appreciation', label: 'Appreciation Certificate', desc: 'For contributors and volunteers' },
  { id: 'achievement', label: 'Achievement Certificate', desc: 'For winners and top performers' },
  { id: 'completion', label: 'Course Completion', desc: 'For workshop/training completion' },
  { id: 'excellence', label: 'Excellence Award', desc: 'For outstanding performance' },
  { id: 'membership', label: 'Membership Certificate', desc: 'Society membership certification' },
]

const THEMES = [
  { id: 'purple', label: 'Purple Gradient', from: '#6d28d9', to: '#0891b2' },
  { id: 'gold', label: 'Royal Gold', from: '#b45309', to: '#d97706' },
  { id: 'green', label: 'Emerald', from: '#065f46', to: '#059669' },
  { id: 'rose', label: 'Rose', from: '#9f1239', to: '#e11d48' },
  { id: 'navy', label: 'Navy Blue', from: '#1e3a5f', to: '#2563eb' },
]

async function generateCertDescription(
  certType: string,
  recipientName: string,
  eventName: string,
  role: string,
  apiKey: string,
  model: string
): Promise<string> {
  if (!apiKey) {
    return `for outstanding ${role} in ${eventName || 'the Society Event'}`
  }

  const prompt = `Write a single short phrase (10-20 words) for a ${certType} certificate for "${recipientName}" for their role as "${role}" in "${eventName}". The phrase goes after "This certifies that [Name] has been awarded this certificate". Keep it formal, inspiring, and specific. No quotes in output.`

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 60,
      }),
    })
    const data = await resp.json()
    return data.choices?.[0]?.message?.content?.trim() || `for active participation and contribution in ${eventName}`
  } catch {
    return `for active participation and contribution in ${eventName}`
  }
}

export default function CertificateGenerator() {
  const { profile } = useAuthStore()
  const certRef = useRef<HTMLDivElement>(null)

  const [certType, setCertType] = useState(CERT_TYPES[0])
  const [theme, setTheme] = useState(THEMES[0])
  const [recipientName, setRecipientName] = useState('')
  const [eventName, setEventName] = useState('')
  const [role, setRole] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = async () => {
    if (!recipientName) return
    setLoading(true)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY || ''
      const model = import.meta.env.VITE_AI_MODEL || 'openai/gpt-oss-20b'
      const desc = await generateCertDescription(
        certType.label,
        recipientName,
        eventName,
        role || 'participant',
        apiKey,
        model
      )
      setDescription(desc)
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Certificate Generator</h1>
        <p className="page-subtitle">Create beautiful certificates for events, achievements, and participation</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form — 2 cols */}
        <div className="xl:col-span-2 space-y-5 no-print">
          {/* Type */}
          <GlassCard>
            <GlassCardHeader title="Certificate Type" icon={<Award className="w-4 h-4 text-white" />} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CERT_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setCertType(ct)}
                  className="text-left p-3 rounded-xl border transition-all"
                  style={{
                    background: certType.id === ct.id ? 'rgba(139,92,246,0.1)' : 'var(--bg-hover)',
                    borderColor: certType.id === ct.id ? 'rgba(139,92,246,0.4)' : 'var(--border)',
                  }}
                >
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{ct.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ct.desc}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Theme */}
          <GlassCard>
            <GlassCardHeader title="Color Theme" />
            <div className="flex gap-2 flex-wrap">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm"
                  style={{
                    background: theme.id === t.id ? 'rgba(139,92,246,0.1)' : 'var(--bg-hover)',
                    borderColor: theme.id === t.id ? 'rgba(139,92,246,0.5)' : 'var(--border)',
                  }}
                >
                  <span
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                      display: 'inline-block', flexShrink: 0,
                    }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Details */}
          <GlassCard>
            <GlassCardHeader title="Certificate Details" />
            <div className="space-y-4">
              <div>
                <label className="label">Recipient Name *</label>
                <input className="input" placeholder="Priya Sharma" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
              </div>
              <div>
                <label className="label">Event / Program Name</label>
                <input className="input" placeholder="TechFest 2026 — Hackathon" value={eventName} onChange={e => setEventName(e.target.value)} />
              </div>
              <div>
                <label className="label">Role / Achievement</label>
                <input className="input" placeholder="Best Project Award Winner / Volunteer / Participant" value={role} onChange={e => setRole(e.target.value)} />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              {generated && (
                <div>
                  <label className="label">Description (AI Generated — Editable)</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 72, resize: 'vertical' }}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading || !recipientName}
                className="btn-primary w-full py-3"
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                  : <><Sparkles className="w-5 h-5" /> Generate Certificate</>
                }
              </button>
              {generated && (
                <button onClick={handlePrint} className="btn-secondary w-full">
                  <Printer className="w-4 h-4" /> Print / Save as PDF
                </button>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Certificate preview — 3 cols */}
        <div className="xl:col-span-3">
          {!generated ? (
            <GlassCard className="flex flex-col items-center justify-center py-24 text-center">
              <Award className="w-20 h-20 mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="font-semibold text-lg" style={{ color: 'var(--text-secondary)' }}>Certificate Preview</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Fill in the details and click "Generate Certificate"</p>
            </GlassCard>
          ) : (
            <div
              ref={certRef}
              id="certificate-print"
              style={{
                background: 'white',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                aspectRatio: '1.414 / 1',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Top gradient bar */}
              <div style={{ height: 8, background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }} />

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  padding: '32px 48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  background: `radial-gradient(ellipse at center, rgba(255,255,255,1) 60%, ${theme.from}10 100%)`,
                  position: 'relative',
                }}
              >
                {/* Corner decorations */}
                <div style={{ position: 'absolute', top: 12, left: 12, width: 60, height: 60, border: `2px solid ${theme.from}30`, borderRadius: 8 }} />
                <div style={{ position: 'absolute', top: 12, right: 12, width: 60, height: 60, border: `2px solid ${theme.from}30`, borderRadius: 8 }} />
                <div style={{ position: 'absolute', bottom: 12, left: 12, width: 60, height: 60, border: `2px solid ${theme.from}30`, borderRadius: 8 }} />
                <div style={{ position: 'absolute', bottom: 12, right: 12, width: 60, height: 60, border: `2px solid ${theme.from}30`, borderRadius: 8 }} />

                {/* Society name */}
                <div>
                  <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.from, fontWeight: 700 }}>
                    Technovation Society
                  </p>
                </div>

                {/* Main content */}
                <div style={{ maxWidth: '80%' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 32,
                    background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 28,
                    boxShadow: `0 8px 24px ${theme.from}40`,
                  }}>
                    🏆
                  </div>

                  <h2 style={{
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#1a1a1a',
                    marginBottom: 4,
                    fontFamily: 'serif',
                  }}>
                    {certType.label}
                  </h2>

                  <p style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase', marginBottom: 20 }}>
                    This is to certify that
                  </p>

                  <p style={{
                    fontSize: 32,
                    fontWeight: 700,
                    fontFamily: 'Georgia, serif',
                    background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: 16,
                    lineHeight: 1.1,
                  }}>
                    {recipientName || 'Recipient Name'}
                  </p>

                  <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
                    {description || `has successfully participated in ${eventName || 'the Society Event'}`}
                  </p>

                  {eventName && (
                    <div style={{
                      marginTop: 12, padding: '6px 20px',
                      background: `${theme.from}12`,
                      border: `1px solid ${theme.from}30`,
                      borderRadius: 20,
                      display: 'inline-block',
                    }}>
                      <p style={{ fontSize: 12, color: theme.from, fontWeight: 600 }}>{eventName}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  paddingTop: 16,
                  borderTop: `1px solid ${theme.from}20`,
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ width: 100, height: 1, background: '#ccc', marginBottom: 4 }} />
                    <p style={{ fontSize: 11, color: '#888' }}>Date</p>
                    <p style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>{formattedDate}</p>
                  </div>

                  <div style={{
                    width: 60, height: 60, borderRadius: 30,
                    background: `linear-gradient(135deg, ${theme.from}20, ${theme.to}20)`,
                    border: `2px solid ${theme.from}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: theme.from, fontWeight: 700,
                    letterSpacing: '0.05em', textAlign: 'center',
                  }}>
                    SEAL
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ width: 100, height: 1, background: '#ccc', marginBottom: 4, marginLeft: 'auto' }} />
                    <p style={{ fontSize: 11, color: '#888' }}>Authorized by</p>
                    <p style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>{profile?.full_name || 'Society President'}</p>
                    <p style={{ fontSize: 10, color: '#888', textTransform: 'capitalize' }}>{profile?.roles?.name || 'President'}</p>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div style={{ height: 8, background: `linear-gradient(90deg, ${theme.to}, ${theme.from})` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
