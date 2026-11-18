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

    const { eventId, department, theme, count = 5 } = await req.json()

    if (!eventId || !department) {
      return new Response(
        JSON.stringify({ error: 'eventId and department are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch past events for context
    const { data: pastEvents } = await supabase
      .from('events')
      .select('title, description, category')
      .eq('department_id', department)
      .in('status', ['completed', 'archived'])
      .limit(10)

    const pastContext = pastEvents?.map(e => `- ${e.title}: ${e.description}`).join('\n') || 'No past events'

    const prompt = `You are an event ideation AI for a student society. Generate ${count} creative event ideas for the "${department}" department.

Theme: ${theme || 'General'}
Past events for context:
${pastContext}

Return a JSON array of ideas with: title, description, category, budget_estimate (INR), timeline (e.g., "1 day", "2 days", "1 week").`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL') || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are a creative event planner for student societies.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`)
    }

    const groqData = await groqRes.json()
    const content = groqData.choices[0]?.message?.content || '{}'
    const ideas = JSON.parse(content).ideas || []

    // Get user ID once
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Store ideas in database
    const ideasToInsert = ideas.map((idea: any) => ({
      event_id: eventId,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      ai_generated: true,
      upvotes: 0,
      created_by: userId,
    }))

    const { data: inserted, error } = await supabase
      .from('event_ideas')
      .insert(ideasToInsert)
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ ideas: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('ideate-event error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})