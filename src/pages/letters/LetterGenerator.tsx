import { useState } from 'react'
import { FileText, Sparkles, Copy, Printer, Check, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn } from '@/lib/utils'

const LETTER_TYPES = [
  { id: 'invitation', label: 'Event Invitation', desc: 'Invite guests, speakers, or participants' },
  { id: 'appreciation', label: 'Appreciation Letter', desc: 'Recognize contributions and thank members' },
  { id: 'permission', label: 'Permission Request', desc: 'Request venue, resource, or activity permission' },
  { id: 'noc', label: 'NOC / No Objection', desc: 'Get a no-objection certificate from administration' },
  { id: 'sponsorship', label: 'Sponsorship Request', desc: 'Seek financial or in-kind sponsorship' },
  { id: 'announcement', label: 'Official Announcement', desc: 'Formal notice about an event or decision' },
  { id: 'recommendation', label: 'Recommendation Letter', desc: 'Recommend a member for opportunity' },
]

const TONES = ['Formal', 'Semi-Formal', 'Friendly Professional']

async function generateLetterWithGroq(
  letterType: string,
  recipientName: string,
  recipientOrg: string,
  subject: string,
  keyPoints: string,
  tone: string,
  senderName: string,
  senderRole: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return getSampleLetter(letterType, recipientName, subject, senderName, senderRole)

  const prompt = `You are writing an official letter on behalf of the Technovation Society (a college technology society).

Letter Type: ${letterType}
Recipient: ${recipientName}${recipientOrg ? ` (${recipientOrg})` : ''}
Subject: ${subject}
Key Points to Include: ${keyPoints || 'Standard professional content for this letter type'}
Tone: ${tone}
Written by: ${senderName}, ${senderRole}
Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}

Write a complete, well-structured ${letterType} letter. Include:
- Proper salutation
- Opening paragraph
- Body with the key points incorporated
- Closing paragraph
- Professional sign-off

Do NOT include the letterhead, address, or "Dear" line — start directly with the salutation line like "Dear [Name]," and end with "Sincerely," or appropriate closing. Keep it professional, clear, and appropriate for a college society.`

  try {
    const model = import.meta.env.VITE_AI_MODEL || 'openai/gpt-oss-20b'
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })
    if (!resp.ok) throw new Error('API error')
    const data = await resp.json()
    return data.choices?.[0]?.message?.content || getSampleLetter(letterType, recipientName, subject, senderName, senderRole)
  } catch {
    return getSampleLetter(letterType, recipientName, subject, senderName, senderRole)
  }
}

function getSampleLetter(type: string, recipient: string, subject: string, sender: string, role: string): string {
  return `Dear ${recipient || '[Recipient Name]'},

I hope this letter finds you in good health and high spirits.

On behalf of the Technovation Society, I am writing to you regarding "${subject || 'the matter at hand'}". We have been actively working towards fostering a culture of innovation and excellence within our institution, and we believe your involvement would greatly enhance our efforts.

[Main content of the ${type} letter would appear here with specific details about the matter.]

We would be grateful for your kind consideration and look forward to a positive response. Please feel free to reach out to us at technovation@college.edu for any queries or further discussion.

Thank you for your time and consideration.

Warm regards,

${sender || '[Your Name]'}
${role || 'Member'}
Technovation Society`
}

export default function LetterGenerator() {
  const { profile } = useAuthStore()
  const [selectedType, setSelectedType] = useState(LETTER_TYPES[0])
  const [recipientName, setRecipientName] = useState('')
  const [recipientOrg, setRecipientOrg] = useState('')
  const [subject, setSubject] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [tone, setTone] = useState(TONES[0])
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [editableLetter, setEditableLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<'form' | 'preview'>('form')

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const letter = await generateLetterWithGroq(
        selectedType.label,
        recipientName,
        recipientOrg,
        subject,
        keyPoints,
        tone,
        profile?.full_name || 'Society Member',
        profile?.roles?.name || 'Member'
      )
      setGeneratedLetter(letter)
      setEditableLetter(letter)
      setMode('preview')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editableLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Letter Generator</h1>
          <p className="page-subtitle">Generate professional society letters with AI assistance</p>
        </div>
        {generatedLetter && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode(mode === 'form' ? 'preview' : 'form')}
              className="btn-secondary"
            >
              {mode === 'form' ? 'View Preview' : 'Edit Form'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form panel */}
        <div className={cn('space-y-5', mode === 'preview' && 'hidden xl:block')}>
          {/* Letter type */}
          <GlassCard>
            <GlassCardHeader
              title="Letter Type"
              icon={<FileText className="w-4 h-4 text-white" />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LETTER_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'text-left p-3 rounded-xl border transition-all duration-200',
                    selectedType.id === type.id
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-transparent hover:border-purple-500/20'
                  )}
                  style={{
                    background: selectedType.id === type.id ? 'rgba(139,92,246,0.1)' : 'var(--bg-hover)',
                    borderColor: selectedType.id === type.id ? 'rgba(139,92,246,0.4)' : 'var(--border)',
                  }}
                >
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{type.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{type.desc}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Details */}
          <GlassCard>
            <GlassCardHeader title="Letter Details" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Recipient Name *</label>
                  <input
                    className="input"
                    placeholder="Dr. John Smith"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Recipient Organization</label>
                  <input
                    className="input"
                    placeholder="ABC College, Dept. of CS"
                    value={recipientOrg}
                    onChange={e => setRecipientOrg(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Subject *</label>
                <input
                  className="input"
                  placeholder="e.g. Request for Permission to Conduct Hackathon 2026"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Key Points to Include</label>
                <textarea
                  className="input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="• Event date and venue&#10;• Expected attendance&#10;• Any special requirements..."
                  value={keyPoints}
                  onChange={e => setKeyPoints(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Tone</label>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-all')}
                      style={{
                        background: tone === t ? 'rgba(139,92,246,0.15)' : 'var(--bg-hover)',
                        borderColor: tone === t ? 'rgba(139,92,246,0.5)' : 'var(--border)',
                        color: tone === t ? 'var(--accent-purple)' : 'var(--text-secondary)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !recipientName || !subject}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating with AI...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Letter with AI</>
                )}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Preview panel */}
        <div className={cn('space-y-4', mode === 'form' && !generatedLetter && 'hidden xl:flex xl:items-center xl:justify-center')}>
          {!generatedLetter ? (
            <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-16 h-16 mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No letter generated yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Fill in the form and click "Generate with AI"</p>
            </GlassCard>
          ) : (
            <>
              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap no-print">
                <button onClick={handleCopy} className="btn-secondary flex-1 sm:flex-none">
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Text</>}
                </button>
                <button onClick={handlePrint} className="btn-primary flex-1 sm:flex-none no-print">
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
              </div>

              {/* Letter preview — printable */}
              <div
                id="letter-print"
                className="rounded-2xl overflow-hidden border"
                style={{ background: 'white', borderColor: 'var(--border)', color: '#1a1a1a' }}
              >
                {/* Letterhead */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #6d28d9, #0891b2)',
                    padding: '1.5rem 2rem',
                    color: 'white',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 48, height: 48,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24,
                      }}
                    >⚡</div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Technovation Society</h2>
                      <p style={{ fontSize: 12, opacity: 0.8 }}>Technology & Innovation Club · technovation@college.edu</p>
                    </div>
                  </div>
                </div>

                {/* Letter body */}
                <div style={{ padding: '2rem' }}>
                  {/* Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: 13, color: '#555' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#222' }}>Ref: TOS/{new Date().getFullYear()}/{String(Date.now()).slice(-4)}</p>
                    </div>
                    <p>{today}</p>
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontWeight: 700, color: '#222', marginBottom: 2 }}>Subject:</p>
                    <p style={{ fontWeight: 600, color: '#444' }}>{subject || selectedType.label}</p>
                  </div>

                  {/* Editable letter content */}
                  <textarea
                    value={editableLetter}
                    onChange={e => setEditableLetter(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 320,
                      border: 'none',
                      outline: 'none',
                      fontFamily: 'serif',
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: '#222',
                      background: 'transparent',
                      resize: 'vertical',
                    }}
                  />

                  {/* Signature area */}
                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div>
                        <p style={{ fontWeight: 700, color: '#222', fontSize: 14 }}>{profile?.full_name || 'Your Name'}</p>
                        <p style={{ color: '#555', fontSize: 13, textTransform: 'capitalize' }}>{profile?.roles?.name || 'Member'}</p>
                        <p style={{ color: '#555', fontSize: 13 }}>Technovation Society</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ width: 100, height: 48, border: '1px dashed #ccc', borderRadius: 8, marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 11, color: '#aaa' }}>Signature</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
