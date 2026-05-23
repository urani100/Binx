import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { pin_id, recipient_note } = await req.json()
    if (!pin_id) {
      return new Response(JSON.stringify({ error: 'pin_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify pin belongs to this user
    const { data: pin, error: pinError } = await serviceClient
      .from('pins')
      .select('id, user_id')
      .eq('id', pin_id)
      .eq('user_id', user.id)
      .single()

    if (pinError || !pin) {
      return new Response(JSON.stringify({ error: 'Pin not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate a cryptographically random URL-safe token (12 chars)
    const randomBytes = new Uint8Array(9)
    crypto.getRandomValues(randomBytes)
    const token = btoa(String.fromCharCode(...randomBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    const expiresAt = new Date(Date.now() + 33 * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await serviceClient
      .from('pin_shares')
      .insert({
        token,
        pin_id,
        user_id: user.id,
        recipient_note: recipient_note || null,
        expires_at: expiresAt
      })

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to create share' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const shareUrl = `https://binx.social/vibe/${token}`

    return new Response(JSON.stringify({ token, shareUrl, expiresAt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
