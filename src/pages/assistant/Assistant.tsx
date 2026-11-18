import { useEffect, useRef, useState } from 'react'
import { Send, Bot, Sparkles, Loader2, Copy, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { assistantService } from '@/services/assistantService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn } from '@/lib/utils'

export default function Assistant() {
  const { profile } = useAuthStore()
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadSuggestions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSuggestions = async () => {
    const sugg = [
      'What events are coming up this month?',
      'Show me my pending tasks',
      'Who is the HOD of Technical department?',
      'Which proposals need approval?',
      'How many active members do we have?',
      'What automations are currently running?',
    ]
    setSuggestions(sugg)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setLoading(true)

    try {
      const answer = await assistantService.ask(userMessage, profile?.id || '')
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch (err) {
      console.error('Assistant error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion)
    setMessages(prev => [...prev, { role: 'user', content: suggestion }])
    setLoading(true)
    assistantService.ask(suggestion, profile?.id || '')
      .then(answer => setMessages(prev => [...prev, { role: 'assistant', content: answer }]))
      .catch(err => {
        console.error('Assistant error:', err)
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
      })
      .finally(() => setLoading(false))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold gradient-text">AI Society Assistant</h1>
        <p className="text-muted mt-1">Ask questions about events, members, tasks, and more</p>
        <p className="text-xs text-accent-cyan mt-2">
          Autonomous mode: authorized actions are executed through Groq tools and role checks.
        </p>
      </div>

      {/* Suggestions */}
      {messages.length === 0 && suggestions.length > 0 && (
        <GlassCard className="mb-4">
          <GlassCardHeader title="Try asking" subtitle="Quick suggestions to get started" />
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-4 py-2 glass rounded-xl text-sm hover:bg-white/5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted">
            <div className="text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Start a conversation with the AI Assistant</p>
              <p className="text-sm mt-2">Ask about events, members, tasks, proposals, or automations</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={cn('flex gap-3', msg.role === 'user' && 'justify-end')}>
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-accent-purple/30 text-white rounded-br-md'
                    : 'glass rounded-bl-md'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="absolute top-2 right-2 p-1 glass rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <GlassCard padding="sm">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about the society..."
              className="input min-h-[52px] max-h-[150px] resize-none pr-12"
              rows={1}
              disabled={loading}
            />
            {input && (
              <button
                type="submit"
                disabled={loading}
                className="absolute right-3 bottom-3 p-2 glass rounded-xl hover:bg-white/5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            )}
          </div>
        </form>
        <p className="text-xs text-muted text-center mt-2">
          Powered by Groq AI • Data from your society database
        </p>
      </GlassCard>
    </div>
  )
}