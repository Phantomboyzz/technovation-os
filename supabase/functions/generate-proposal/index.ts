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

    const { ideaId } = await req.json()

    if (!ideaId) {
      return new Response(
        JSON.stringify({ error: 'ideaId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the idea and its parent event
    const { data: idea, error: ideaError } = await supabase
      .from('event_ideas')
      .select('*, events(title, description, departments(name))')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      throw new Error('Idea not found')
    }

    const prompt = `You are an event proposal generator. Create a detailed event proposal based on this idea.

Event: ${idea.events?.title}
Department: ${idea.events?.departments?.name}
Idea: ${idea.title}
Description: ${idea.description}
Category: ${idea.category}

Return a JSON object with:
- title: Proposal title
- objectives: Array of objectives
- budget_estimate: Number (INR)
- timeline: String (e.g., "2 weeks planning + 1 day event")
- departments_involved: Array of department names
- tasks: Array of {title, department, due_days, description}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL') || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are an experienced event proposal writer for student societies.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`)
    }

    const groqData = await groqRes.json()
    const content = groqData.choices[0]?.message?.content || '{}'
    const proposal = JSON.parse(content)

    // Get user ID once
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Store the proposal
    const { data: inserted, error } = await supabase
      .from('proposals')
      .insert({
        event_id: idea.event_id,
        title: proposal.title,
        objectives: proposal.objectives?.join('\n') || '',
        budget_estimate: proposal.budget_estimate,
        timeline: proposal.timeline,
        status: 'pending',
        submitted_by: userId,
      })
      .select()
      .single()

    if (error) throw error

    // Also create the tasks
    if (proposal.tasks?.length) {
      const tasksToInsert = proposal.tasks.map((task: any) => ({
        event_id: idea.event_id,
        department_id: (await supabase.from('departments').select('id').eq('name', task.department).single()).data?.id,
        title: task.title,
        description: task.description,
        due_date: new Date(Date.now() + (task.due_days || 7) * 24 * 60 * 60 * 1000).toISOString(),
        created_by: userId,
      }))
      await supabase.from('tasks').insert(tasksToInsert)
    }

    return new Response(
      JSON.stringify({ proposal: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('generate-proposal error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})