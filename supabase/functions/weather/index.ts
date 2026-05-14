import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const lat = url.searchParams.get('lat')
    const lng = url.searchParams.get('lng')

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'Missing lat or lng parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('WEATHER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Weather API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lng}`
    const response = await fetch(weatherUrl)
    const data = await response.json()

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch weather data: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
