import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') return handlePost(req)
  if (req.method === 'PATCH') return handlePatch(req)

  return errorResponse('Method not allowed', 405)
})

async function handlePost(req: Request) {
  try {
    const { user_id, session_id, places } = await req.json()

    if (!user_id || !session_id || !Array.isArray(places)) {
      return errorResponse('Missing required fields: user_id, session_id, places', 400)
    }

    const { error } = await supabase
      .from('recommendation_sessions')
      .insert({ session_id, user_id, places })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data: { session_id } }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return errorResponse(`Failed to create session: ${error.message}`, 500)
  }
}

async function handlePatch(req: Request) {
  try {
    const { session_id, user_id, places } = await req.json()

    if (!session_id || !user_id) {
      return errorResponse('Missing required fields: session_id, user_id', 400)
    }

    const updates: Record<string, unknown> = {}
    if (places !== undefined) updates.places = places

    if (Object.keys(updates).length === 0) {
      return errorResponse('No updatable fields provided', 400)
    }

    const { error } = await supabase
      .from('recommendation_sessions')
      .update(updates)
      .eq('session_id', session_id)
      .eq('user_id', user_id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data: { session_id } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return errorResponse(`Failed to update session: ${error.message}`, 500)
  }
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
