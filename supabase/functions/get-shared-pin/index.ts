import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Look up the share by token
    const { data: share, error: shareError } = await serviceClient
      .from('pin_shares')
      .select('*')
      .eq('token', token)
      .single()

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: 'Share not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check expiry
    if (new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This vibe has expired', expired: true }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch pin data
    const { data: pin, error: pinError } = await serviceClient
      .from('pins')
      .select('title, note, mood, location, photo, audio_url, timestamp')
      .eq('id', share.pin_id)
      .single()

    if (pinError || !pin) {
      return new Response(JSON.stringify({ error: 'Pin not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch sender name from auth.users
    const { data: { user: senderAuth } } = await serviceClient.auth.admin.getUserById(share.user_id)
    const senderName = senderAuth?.user_metadata?.name || senderAuth?.email?.split('@')[0] || 'Someone'
    const senderFirstName = senderName.split(' ')[0]

    // Increment view count (fire and forget)
    serviceClient
      .from('pin_shares')
      .update({ view_count: share.view_count + 1, last_viewed_at: new Date().toISOString() })
      .eq('id', share.id)
      .then(() => {})

    return new Response(JSON.stringify({
      pin: {
        title: pin.title,
        note: pin.note,
        mood: pin.mood,
        location: pin.location,
        photo: pin.photo,
        audioUrl: pin.audio_url,
        timestamp: pin.timestamp
      },
      share: {
        senderFirstName,
        createdAt: share.created_at,
        expiresAt: share.expires_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
