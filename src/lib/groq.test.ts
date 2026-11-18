import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('Groq agent', () => {
  it('executes a tool call and returns the final Groq response', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    vi.stubEnv('VITE_AI_MODEL', 'openai/gpt-oss-20b')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call-1',
                function: { name: 'list_tasks', arguments: '{"status":"pending"}' },
              }],
            },
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'One pending task was found.' },
          }],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { groqAgent } = await import('./groq')
    const toolExecutor = vi.fn().mockResolvedValue([{ id: 'task-1', title: 'Plan execution' }])

    const answer = await groqAgent(
      [{ role: 'user', content: 'List pending tasks' }],
      [{
        type: 'function',
        function: {
          name: 'list_tasks',
          description: 'List tasks',
          parameters: { type: 'object', properties: {} },
        },
      }],
      toolExecutor,
      3
    )

    expect(toolExecutor).toHaveBeenCalledWith('list_tasks', { status: 'pending' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(answer).toBe('One pending task was found.')
  })

  it('uses fallback text when no Groq key is configured', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'demo')
    const { groqChat } = await import('./groq')

    const answer = await groqChat([
      { role: 'user', content: 'Give me society stats' },
    ])

    expect(answer).toContain('Groq AI is not configured')
  })
})
