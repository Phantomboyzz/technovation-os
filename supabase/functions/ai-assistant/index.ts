import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { question, userId } = await req.json()

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get relevant context based on question keywords
    const q = question.toLowerCase()
    const contexts: string[] = []

    if (q.includes('event') || q.includes('upcoming') || q.includes('schedule')) {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, status, event_date, venue, departments(name)')
        .in('status', ['approved', 'tasks_allocated', 'in_progress'])
        .order('event_date', { ascending: true })
        .limit(10)
      if (events?.length) {
        contexts.push('Upcoming Events:\n' + events.map(e => `- ${e.title} (${e.departments?.name || 'No dept'}) on ${e.event_date ? new Date(e.event_date).toLocaleDateString() : 'TBD'} at ${e.venue || 'TBD'} [${e.status}]`).join('\n'))
      }
    }

    if (q.includes('task') || q.includes('due') || q.includes('overdue') || q.includes('assignment')) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, departments(name), profiles(full_name)')
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(10)
      if (tasks?.length) {
        contexts.push('Active Tasks:\n' + tasks.map(t => `- ${t.title} for ${t.departments?.name || 'No dept'} assigned to ${t.profiles?.full_name || 'Unassigned'} due ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'} [${t.status}]`).join('\n'))
      }
    }

    if (q.includes('member') || q.includes('hod') || q.includes('department') || q.includes('who')) {
      const { data: members } = await supabase
        .from('members')
        .select('id, roll_number, year, status, profiles(full_name, email), departments(name), roles(name)')
        .eq('status', 'active')
        .limit(15)
      if (members?.length) {
        contexts.push('Active Members:\n' + members.map(m => `- ${m.profiles?.full_name} (${m.roll_number}) - ${m.departments?.name || 'No dept'} - ${m.roles?.name || 'member'}`).join('\n'))
      }
    }

    if (q.includes('proposal') || q.includes('approv') || q.includes('pending')) {
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, title, status, submitted_at, events(title)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })
        .limit(10)
      if (proposals?.length) {
        contexts.push('Pending Proposals:\n' + proposals.map(p => `- ${p.title} for ${p.events?.title || 'Unknown event'} submitted ${new Date(p.submitted_at).toLocaleDateString()}`).join('\n'))
      }
    }

    if (contexts.length === 0) {
      const [eventsCount, tasksCount, membersCount, proposalsCount] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).in('status', ['approved', 'in_progress']),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      contexts.push(`Society Stats: ${eventsCount.count || 0} active events, ${tasksCount.count || 0} open tasks, ${membersCount.count || 0} active members, ${proposalsCount.count || 0} pending proposals`)
    }

    const contextStr = contexts.join('\n\n')

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL') || 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: `You are the AI Assistant for Technovation OS, a society management platform. Answer questions using the provided database context. Be concise, helpful, and reference actual data. If you don't have enough context, say so and ask for clarification.`
          },
          {
            role: 'user',
            content: `Context:\n${contextStr}\n\nQuestion: ${question}`
          },
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    })

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`)
    }

    const groqData = await groqRes.json()
    const answer = groqData.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Log the chat
    await supabase.from('chat_history').insert({
      user_id: userId,
      role: 'user',
      content: question,
    })
    await supabase.from('chat_history').insert({
      user_id: userId,
      role: 'assistant',
      content: answer,
    })

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('ai-assistant error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})