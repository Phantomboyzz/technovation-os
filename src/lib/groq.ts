const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || 'demo'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = import.meta.env.VITE_AI_MODEL || 'openai/gpt-oss-20b'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: unknown[]
}

export interface GroqTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface GroqResponse {
  choices: Array<{ message: GroqMessage }>
}

export async function groqChat(
  messages: GroqMessage[],
  options: { temperature?: number; maxTokens?: number; json?: boolean } = {}
): Promise<string> {
  if (GROQ_API_KEY === 'demo' || !GROQ_API_KEY) {
    return fallbackResponse(messages)
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      response_format: options.json ? { type: 'json_object' } : undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error: ${res.status} - ${err}`)
  }

  const data: GroqResponse = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

export async function groqAgent(
  messages: GroqMessage[],
  tools: GroqTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  maxIterations = 4
): Promise<string> {
  if (GROQ_API_KEY === 'demo' || !GROQ_API_KEY) {
    return fallbackResponse(messages)
  }

  const conversation: any[] = [...messages]

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: conversation,
        tools,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq API error: ${res.status} - ${err}`)
    }

    const data: any = await res.json()
    const message = data.choices?.[0]?.message
    if (!message) throw new Error('Groq returned no response')

    const toolCalls = message.tool_calls as Array<{
      id: string
      function: { name: string; arguments: string }
    }> | undefined

    if (!toolCalls?.length) {
      return message.content || 'I completed the request.'
    }

    conversation.push(message)

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        args = {}
      }
      const result = await executeTool(call.function.name, args)
      conversation.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
  }

  return 'The agent reached its action limit before completing the request.'
}

function fallbackResponse(messages: GroqMessage[]): string {
  const last = messages[messages.length - 1]?.content?.toLowerCase() || ''
  if (last.includes('idea') || last.includes('ideation')) {
    return JSON.stringify({
      ideas: [
        { title: 'Tech Innovation Hackathon 2026', description: 'A 24-hour hackathon featuring AI, Web3, and sustainability tracks.', category: 'Technical', budget_estimate: 25000, timeline: '2 days' },
      ],
    })
  }
  if (last.includes('proposal')) {
    return JSON.stringify({
      title: 'Generated Event Proposal',
      objectives: ['Engage members', 'Build community'],
      budget_estimate: 20000,
      timeline: '1 week planning',
      departments_involved: ['Technical'],
      tasks: [{ title: 'Coordinate the event', department: 'Technical', due_days: 7, description: 'Coordinate planning and execution.' }],
    })
  }
  return 'Groq AI is not configured. Add VITE_GROQ_API_KEY and restart the frontend.'
}

export function isDemoMode(): boolean {
  return !import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY === 'demo'
}
