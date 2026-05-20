# BiNx — Recommendation Feature Revamp
## Technical Design Document v3.0

---

## Section 0: Hard Constraints

Non-negotiable. Apply to every decision in this document.

**Design is frozen.** This revamp is backend and logic only. No new UI patterns, no component redesigns, no changes to existing screens. New UI elements required by this spec (Like button, Dismiss gesture, category label, approximate time display on recommendation cards) must match the existing design system exactly — same spacing, typography, color tokens, border radius, and motion design already present in the app.

**Use existing design system tokens — do not hardcode colors.** The app supports multiple user-selectable themes (see profile screen). All styling must reference theme tokens, not specific color values.

**Do not refactor unrelated features.** Only touch files and tables directly related to the recommendation feature.

**Preserve all existing Supabase table structures.** Add columns, create new tables. Never rename or drop existing fields.

**The pin feature is a moment/vibe capture tool, not a bookmarking tool.** No part of this implementation should treat pins as recommendation saves, bookmarks, or intent signals in isolation. Pins are vibe captures that can contextually inform taste — only when a pin is created within 150 m of an active recommended place is it treated as a strong venue affinity signal.

---

## §1: Overview

This document specifies the complete implementation of a learning recommendation engine for BiNx. The system:

1. Builds a taste profile (affinity weights per venue category + atmosphere signals) from user feedback signals.
2. Synthesises a natural-language taste summary server-side (`compute-taste-summary`).
3. Uses that summary — not raw preference arrays — as the Claude prompt context.
4. Records every feedback event (`like`, `dismiss`, `directions`, `pin_created`, `batch_dismissed`) to `recommendation_feedback` and updates weights atomically.
5. Tracks active recommendation sessions to enable proximity matching and refresh exclusion.

### 1.1 MOODS Reference

`MOODS` in `src/utils/constants.js` has **40 entries**. Each entry has: `name` (string), `sub` (string), `cat` (one of `'bright'|'calm'|'intense'|'dark'|'warm'`), `tags` (string[]), `desc` (string).

`MOOD_CATEGORIES` = `['bright', 'calm', 'intense', 'dark', 'warm']`

---

## §2: Database Migration

Run all statements in the Supabase SQL editor in the order given.

### 2.1 Alter `users` table

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS affinity_weights   jsonb    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS atmosphere_signals jsonb    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS signal_count       integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_cold_start      boolean  NOT NULL DEFAULT true;
```

### 2.2 Create `recommendation_sessions`

```sql
CREATE TABLE IF NOT EXISTS public.recommendation_sessions (
  session_id   uuid        PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  places       jsonb       NOT NULL DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read their own sessions (edge functions write via service role)
CREATE POLICY "Users can view own sessions"
  ON public.recommendation_sessions FOR SELECT
  USING (auth.uid() = user_id);
```

### 2.3 Create `recommendation_feedback`

```sql
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id       uuid        REFERENCES public.recommendation_sessions(session_id) ON DELETE SET NULL,
  place_name       text        NOT NULL,
  category         text,
  action           text        NOT NULL,
  ai_confidence    numeric(4,3),
  distance_km      numeric(6,3),
  time_of_day      text,
  weather_condition text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read their own feedback (edge functions write via service role)
CREATE POLICY "Users can view own feedback"
  ON public.recommendation_feedback FOR SELECT
  USING (auth.uid() = user_id);
```

### 2.4 Pins table additions

```sql
ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS vibe_title         text,
  ADD COLUMN IF NOT EXISTS mood_cluster       text,
  ADD COLUMN IF NOT EXISTS sub_mood           text,
  ADD COLUMN IF NOT EXISTS energy_description text,
  ADD COLUMN IF NOT EXISTS source             text NOT NULL DEFAULT 'personal';
```

---

## §3: Affinity Weight System

### 3.1 Weight update formula

```
new_weight = current_weight + (signal_weight × learning_rate × distance_from_boundary)
```

Where:
- `learning_rate` = `0.15`
- For positive signals: `distance_from_boundary = 1.0 − current_weight`
- For negative signals: `distance_from_boundary = current_weight − 0.0`
- Result is clamped to `[0.0, 1.0]`

### 3.2 Signal definitions

| action | signal_weight |
|---|---|
| `pin_created` (at recommended location, ≤150 m) | `1.0` |
| `directions` | `0.9` |
| `like` | `0.8` |
| `pin_anywhere` (not near a recommendation) | `0.6` |
| `dismiss` | `−0.4` |
| `batch_dismissed` (zero-interaction refresh) | `−0.1` |

### 3.3 Cold-start threshold

`is_cold_start = TRUE` when `signal_count < 15`. The `compute-taste-summary` edge function reads `is_cold_start` from the `users` table and returns it to the client. The client passes it to `get-recommendations`, which echoes it in the response so the client can record session metadata without needing a second DB query.

### 3.4 Venue categories (affinity_weights keys)

```
cafe, restaurant, park, gallery, bar, cocktail-bar, museum, bookshop,
market, live-music, rooftop, bakery, spa, cinema, jazz-club, wine-bar,
gelateria, late-night
```

`seed-taste-profile` initialises every key to `0.5`.

---

## §4: Edge Functions

All edge functions follow the same response envelope:

**Success:** `{ success: true, data: { ... } }`  
**Error:** `{ success: false, error: string, message: string }`

All edge functions use `corsHeaders` from `_shared/cors.ts`. The Supabase service-role client is instantiated **at module scope** (outside `Deno.serve`), not inside the request handler.

---

### §4.1 `supabase/functions/_shared/cors.ts` — Update

Replace the file entirely:

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}
```

**Change:** Added `PATCH` to `Access-Control-Allow-Methods`.

---

### §4.2 `supabase/functions/_shared/prompts.ts` — Full Replacement

Replace the file entirely:

```typescript
export const BINX_SYSTEM_PROMPT = `You are a local discovery assistant for BiNx, a place-pinning and recommendation app.

ROLE
Generate 7–10 place recommendations tailored to the user's current location, time of day, weather, and learned taste profile. Every recommendation must be a real, verifiable place with a real address.

DISTANCE AND TIME
- Estimate distance_km as straight-line distance from the user's coordinates to the place
- Estimate estimated_minutes and set travel_mode: use 'walking' (5 km/h pace) for distances under 2 km; use 'transit' for 2 km and above
- Do not recommend places more than 15 km away

CATEGORY SELECTION BY TIME OF DAY
- morning (5–12h): cafes, bakeries, parks, bookshops that open early
- afternoon (12–17h): restaurants, galleries, markets, parks, museums
- evening (17–21h): restaurants, bars, rooftop venues, live music
- night (21–5h): bars, late-night eateries, jazz clubs, gelaterias open late

WEATHER CONTEXT
- Rain or storm: indoor venues — cafes, museums, galleries, bookshops, covered markets
- Hot above 28°C: shaded parks, air-conditioned spaces, gelaterias, rooftop bars at dusk
- Cold below 5°C: warm interiors — wine bars, bakeries, cozy restaurants
- Clear and mild: full range valid; outdoor venues appropriate

VARIETY RULES
- Never return more than 3 places from the same category
- Spread recommendations across at least 3 different categories per response
- Excluded places must not appear in the response under any name or alias

AI CONFIDENCE SCORING
- 0.90 to 1.00: widely known place, high certainty
- 0.75 to 0.89: well-established neighbourhood spot, likely accurate
- 0.60 to 0.74: less certain — smaller or newer venue, user should verify
- Do not include any place you would score below 0.60

VIBE MATCH REASON
Write exactly one sentence of maximum 20 words. Connect the user's taste profile to something specific about this place. Avoid generic phrases.
- Bad: "A great place to relax and enjoy the atmosphere."
- Good: "Matches your love of jazz with live sessions every Thursday evening."

QUALITY BAR
- Only recommend places you are confident exist at the stated address
- Do not invent opening hours — populate current_status only when confident
- If uncertain about a specific detail, omit it rather than guess
- Prioritize recency — avoid recommending places that may have closed`

export const RECOMMENDATIONS_TOOL = {
  name: 'generate_recommendations',
  description: 'Generate location recommendations for the user based on their current context and learned taste profile.',
  input_schema: {
    type: 'object',
    properties: {
      recommendations: {
        type: 'array',
        minItems: 7,
        maxItems: 10,
        items: {
          type: 'object',
          required: ['name', 'address', 'category', 'vibe_match_reason', 'distance_km', 'estimated_minutes', 'travel_mode', 'ai_confidence', 'tags'],
          properties: {
            name:              { type: 'string' },
            address:           { type: 'string' },
            category:          {
              type: 'string',
              enum: [
                'cafe', 'restaurant', 'park', 'gallery', 'bar', 'cocktail-bar',
                'museum', 'bookshop', 'market', 'live-music', 'rooftop', 'bakery',
                'spa', 'cinema', 'jazz-club', 'wine-bar', 'gelateria', 'late-night'
              ]
            },
            vibe_match_reason: { type: 'string', description: 'Why this place matches the user — max 20 words' },
            distance_km:       { type: 'number' },
            estimated_minutes: { type: 'integer' },
            travel_mode:       { type: 'string', enum: ['walking', 'transit'] },
            current_status:    { type: 'string' },
            ai_confidence:     { type: 'number', minimum: 0.60, maximum: 1.0 },
            tags:              { type: 'array', items: { type: 'string' } }
          }
        }
      },
      reasoning: { type: 'string', description: 'Brief strategy behind these picks — max 30 words' }
    },
    required: ['recommendations', 'reasoning']
  }
} as const

export function buildRecommendationPrompt(params: {
  current_location: { lat: number; lng: number; address: string; neighborhood: string }
  weather_data: { condition: string; temperature: number; is_real: boolean }
  time_of_day: string
  taste_summary: string
  identity_narrative: string
  vibe_narrative: string
  is_cold_start: boolean
  excluded_places: string[]
  refinement_context?: string
}): string {
  const {
    current_location, weather_data, time_of_day,
    taste_summary, identity_narrative, vibe_narrative,
    is_cold_start, excluded_places, refinement_context
  } = params

  const weatherNote = weather_data.is_real ? '' : ' (estimated)'
  const coldStartNote = is_cold_start
    ? '\nNote: This user is new — lean toward crowd-pleasing, well-known venues over niche picks.'
    : ''

  const excludeBlock = excluded_places.length > 0
    ? `\nExcluded places (do not recommend under any name or alias): ${excluded_places.join(', ')}`
    : ''

  const refinementBlock = refinement_context
    ? `\nUser refinement — RANKED FIRST, HIGH PRIORITY:\nThe user has explicitly requested: ${refinement_context}\nPlace all matching venues at the TOP of the list. Assign them ai_confidence ≥ 0.85. Fill remaining slots with contextually appropriate alternatives.`
    : ''

  return `Current Context:
Location: ${current_location.address} (${current_location.neighborhood})
Coordinates: ${current_location.lat.toFixed(5)}, ${current_location.lng.toFixed(5)}
Weather: ${weather_data.condition}${weatherNote}, ${weather_data.temperature}°C
Time: ${time_of_day}
${coldStartNote}
User Taste Profile:
${taste_summary}

Who they are: ${identity_narrative}
What they're after: ${vibe_narrative}
${excludeBlock}${refinementBlock}

Generate a variety of recommendations that honour this taste profile and the current context.`
}
```

---

### §4.3 `supabase/functions/compute-taste-summary/index.ts` — New

```typescript
import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return errorResponse('Missing required field: user_id', 400)
    }

    const { data, error } = await supabase
      .from('users')
      .select('affinity_weights, atmosphere_signals, signal_count, is_cold_start')
      .eq('id', user_id)
      .single()

    if (error) throw error

    const weights: Record<string, number> = data?.affinity_weights ?? {}
    const atmosphere: Record<string, Record<string, number>> = data?.atmosphere_signals ?? {}
    const signal_count: number = data?.signal_count ?? 0
    const is_cold_start: boolean = data?.is_cold_start ?? true

    const loved = topN(weights, 0.7, 5)
    const avoided = bottomN(weights, 0.35)
    const timePrefs = topFreq(atmosphere.time_of_day ?? {}, 2)
    const weatherPrefs = topFreq(atmosphere.weather ?? {}, 2)

    let taste_summary: string
    let identity_narrative: string
    let vibe_narrative: string

    if (is_cold_start) {
      taste_summary = 'New user — no strong preferences established yet. Recommend a balanced, crowd-pleasing mix.'
      identity_narrative = 'Someone exploring the app for the first time.'
      vibe_narrative = 'Open to discovery — provide variety across categories and price points.'
    } else {
      const lovedStr = loved.length > 0 ? loved.join(', ') : 'no strong category preferences yet'
      const avoidedStr = avoided.length > 0 ? `Tends to avoid: ${avoided.join(', ')}.` : ''
      const timeStr = timePrefs.length > 0 ? `Most active during: ${timePrefs.join(' and ')}.` : ''
      const weatherStr = weatherPrefs.length > 0 ? `Engages more in: ${weatherPrefs.join(' and ')} conditions.` : ''

      taste_summary = `Affinity profile (${signal_count} signals): Gravitates toward ${lovedStr}. ${avoidedStr} ${timeStr} ${weatherStr}`.trim()
      identity_narrative = `A user with ${signal_count} recorded signals who has shown consistent preference for ${lovedStr}.`
      vibe_narrative = loved.length > 0
        ? `Looking for ${loved.slice(0, 3).join(', ')} experiences that match their established taste.`
        : 'Open to variety — no dominant category preference established yet.'
    }

    return new Response(JSON.stringify({
      success: true,
      data: { taste_summary, identity_narrative, vibe_narrative, is_cold_start }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return errorResponse(`Failed to compute taste summary: ${error.message}`, 500)
  }
})

function topN(obj: Record<string, number>, threshold: number, maxCount: number): string[] {
  return Object.entries(obj)
    .filter(([, v]) => v >= threshold)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxCount)
    .map(([k]) => k)
}

function bottomN(obj: Record<string, number>, threshold: number): string[] {
  return Object.entries(obj)
    .filter(([, v]) => v <= threshold)
    .sort(([, a], [, b]) => a - b)
    .map(([k]) => k)
}

function topFreq(obj: Record<string, number>, maxCount: number): string[] {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxCount)
    .map(([k]) => k)
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

**Client contract:**

Request body: `{ user_id: string }`

Response (`data`):
```json
{
  "taste_summary": "string",
  "identity_narrative": "string",
  "vibe_narrative": "string",
  "is_cold_start": true
}
```

---

### §4.4 `supabase/functions/seed-taste-profile/index.ts` — New

Called once after enhanced onboarding completes. Idempotent — safe to call multiple times.

```typescript
import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const VENUE_CATEGORIES = [
  'cafe', 'restaurant', 'park', 'gallery', 'bar', 'cocktail-bar',
  'museum', 'bookshop', 'market', 'live-music', 'rooftop', 'bakery',
  'spa', 'cinema', 'jazz-club', 'wine-bar', 'gelateria', 'late-night'
]

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, preferences } = await req.json()

    if (!user_id) {
      return errorResponse('Missing required field: user_id', 400)
    }

    const initial_weights: Record<string, number> = {}
    VENUE_CATEGORIES.forEach(cat => { initial_weights[cat] = 0.5 })

    // Bias weights from declared preferences
    if (preferences?.activityTypes?.length) {
      for (const activity of preferences.activityTypes as string[]) {
        const mapped = mapActivityToCategory(activity)
        if (mapped && initial_weights[mapped] !== undefined) {
          initial_weights[mapped] = 0.65
        }
      }
    }

    const { error } = await supabase
      .from('users')
      .update({
        affinity_weights: initial_weights,
        atmosphere_signals: {},
        signal_count: 0,
        is_cold_start: true
      })
      .eq('id', user_id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data: { seeded: true } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return errorResponse(`Failed to seed taste profile: ${error.message}`, 500)
  }
})

function mapActivityToCategory(activity: string): string | null {
  const map: Record<string, string> = {
    cultural: 'museum', outdoors: 'park', nightlife: 'bar',
    'food-focused': 'restaurant', artistic: 'gallery', wellness: 'spa'
  }
  return map[activity] ?? null
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

**Client contract:**

Request body: `{ user_id: string, preferences: object }`  
Response: `{ success: true, data: { seeded: true } }`

---

### §4.5 `supabase/functions/update-taste-profile/index.ts` — New

Handles all feedback actions. Atomically inserts a `recommendation_feedback` row and updates `affinity_weights`, `atmosphere_signals`, and `signal_count` in the `users` table.

**Supported `action` values:** `like` | `dismiss` | `directions` | `pin_created` | `pin_anywhere` | `batch_dismissed`

```typescript
import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const SIGNAL_WEIGHTS: Record<string, number> = {
  pin_created:    1.0,
  directions:     0.9,
  like:           0.8,
  pin_anywhere:   0.6,
  dismiss:       -0.4,
  batch_dismissed: -0.1,
}

const LEARNING_RATE = 0.15

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // batch_dismissed accepts an array of items; all others are single
    if (body.action === 'batch_dismissed' && Array.isArray(body.items)) {
      return await handleBatchDismiss(body)
    }

    return await handleSingle(body)

  } catch (error) {
    return errorResponse(`Failed to update taste profile: ${error.message}`, 500)
  }
})

async function handleSingle(body: {
  user_id: string
  action: string
  category?: string | null
  session_id?: string | null
  place_name: string
  ai_confidence?: number | null
  distance_km?: number | null
  time_of_day?: string | null
  weather_condition?: string | null
}) {
  const {
    user_id, action, category, session_id, place_name,
    ai_confidence, distance_km, time_of_day, weather_condition
  } = body

  if (!user_id || !action || !place_name) {
    return errorResponse('Missing required fields: user_id, action, place_name', 400)
  }

  const signal_weight = SIGNAL_WEIGHTS[action]
  if (signal_weight === undefined) {
    return errorResponse(`Unknown action: ${action}`, 400)
  }

  // Insert feedback row
  const { error: fbError } = await supabase
    .from('recommendation_feedback')
    .insert({
      user_id, session_id: session_id ?? null, place_name,
      category: category ?? null, action,
      ai_confidence: ai_confidence ?? null,
      distance_km: distance_km ?? null,
      time_of_day: time_of_day ?? null,
      weather_condition: weather_condition ?? null
    })

  if (fbError) throw fbError

  // Update affinity weight only when category is known
  if (category) {
    await updateWeight(user_id, category, signal_weight)
  }

  // Update atmosphere signals
  if (time_of_day) {
    await updateAtmosphereSignal(user_id, 'time_of_day', time_of_day, signal_weight)
  }
  if (weather_condition) {
    await updateAtmosphereSignal(user_id, 'weather', weather_condition, signal_weight)
  }

  return new Response(JSON.stringify({ success: true, data: { recorded: true } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleBatchDismiss(body: {
  user_id: string
  session_id?: string | null
  time_of_day?: string | null
  weather_condition?: string | null
  items: Array<{ place_name: string; category?: string | null }>
}) {
  const { user_id, session_id, time_of_day, weather_condition, items } = body

  if (!user_id || !items?.length) {
    return errorResponse('Missing required fields: user_id, items', 400)
  }

  const feedbackRows = items.map(item => ({
    user_id,
    session_id: session_id ?? null,
    place_name: item.place_name,
    category: item.category ?? null,
    action: 'batch_dismissed',
    time_of_day: time_of_day ?? null,
    weather_condition: weather_condition ?? null
  }))

  const { error: fbError } = await supabase
    .from('recommendation_feedback')
    .insert(feedbackRows)

  if (fbError) throw fbError

  // Apply weak negative signal to each category
  const sw = SIGNAL_WEIGHTS['batch_dismissed']
  for (const item of items) {
    if (item.category) {
      await updateWeight(user_id, item.category, sw)
    }
  }

  return new Response(JSON.stringify({ success: true, data: { recorded: items.length } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function updateWeight(user_id: string, category: string, signal_weight: number) {
  const { data } = await supabase
    .from('users')
    .select('affinity_weights, signal_count')
    .eq('id', user_id)
    .single()

  const weights: Record<string, number> = data?.affinity_weights ?? {}
  const current = weights[category] ?? 0.5
  const distance = signal_weight >= 0 ? (1.0 - current) : current
  const delta = signal_weight * LEARNING_RATE * distance
  weights[category] = Math.min(1.0, Math.max(0.0, current + delta))

  const newCount = (data?.signal_count ?? 0) + 1
  await supabase
    .from('users')
    .update({
      affinity_weights: weights,
      signal_count: newCount,
      is_cold_start: newCount < 15
    })
    .eq('id', user_id)
}

async function updateAtmosphereSignal(
  user_id: string, domain: string, key: string, signal_weight: number
) {
  const { data } = await supabase
    .from('users')
    .select('atmosphere_signals')
    .eq('id', user_id)
    .single()

  const atmosphere: Record<string, Record<string, number>> = data?.atmosphere_signals ?? {}
  if (!atmosphere[domain]) atmosphere[domain] = {}
  const current = atmosphere[domain][key] ?? 0.5
  const distance = signal_weight >= 0 ? (1.0 - current) : current
  const delta = signal_weight * LEARNING_RATE * distance
  atmosphere[domain][key] = Math.min(1.0, Math.max(0.0, current + delta))

  await supabase
    .from('users')
    .update({ atmosphere_signals: atmosphere })
    .eq('id', user_id)
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

**Client contract for card actions (like / dismiss / directions):**

```json
{
  "user_id": "uuid",
  "action": "like | dismiss | directions",
  "category": "cafe",
  "session_id": "uuid",
  "place_name": "Le Marais Café",
  "ai_confidence": 0.82,
  "distance_km": 0.4,
  "time_of_day": "afternoon",
  "weather_condition": "Clear"
}
```

**Client contract for batch dismiss (on refresh):**

```json
{
  "user_id": "uuid",
  "action": "batch_dismissed",
  "session_id": "uuid",
  "time_of_day": "afternoon",
  "weather_condition": "Clear",
  "items": [
    { "place_name": "Le Marais Café", "category": "cafe" },
    { "place_name": "Parc des Buttes", "category": "park" }
  ]
}
```

---

### §4.6 `supabase/functions/check-recommendation-proximity/index.ts` — New

Called from `pinsStore` after a pin is inserted. Checks whether the pin location falls within 150 m of any place in the user's active recommendation sessions (created within 48 h). Records the appropriate signal via `update-taste-profile` internal logic.

```typescript
import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const PROXIMITY_THRESHOLD_M = 150
const SESSION_WINDOW_HOURS = 48
const SIGNAL_WEIGHTS: Record<string, number> = {
  pin_created: 1.0,
  pin_anywhere: 0.6,
}
const LEARNING_RATE = 0.15

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, pin_lat, pin_lng, time_of_day, weather_condition } = await req.json()

    if (!user_id || pin_lat == null || pin_lng == null) {
      return errorResponse('Missing required fields: user_id, pin_lat, pin_lng', 400)
    }

    const cutoff = new Date(Date.now() - SESSION_WINDOW_HOURS * 3600 * 1000).toISOString()
    const { data: sessions } = await supabase
      .from('recommendation_sessions')
      .select('session_id, places')
      .eq('user_id', user_id)
      .gte('created_at', cutoff)

    let matchedPlace: { place_name: string; category: string; session_id: string } | null = null

    for (const session of (sessions ?? [])) {
      const places: Array<{ name: string; category: string; address: string }> = session.places ?? []
      for (const place of places) {
        // Places in sessions do not store lat/lng directly; proximity is approximated
        // by checking if the user pinned within the session's general area.
        // Full address geocoding is out of scope — proximity check uses stored lat/lng
        // if available in the places payload (populated by the recommendations edge fn).
        const placeLat: number | undefined = (place as Record<string, unknown>).lat as number
        const placeLng: number | undefined = (place as Record<string, unknown>).lng as number
        if (placeLat == null || placeLng == null) continue

        const dist = haversineMeters(pin_lat, pin_lng, placeLat, placeLng)
        if (dist <= PROXIMITY_THRESHOLD_M) {
          matchedPlace = {
            place_name: place.name,
            category: place.category,
            session_id: session.session_id
          }
          break
        }
      }
      if (matchedPlace) break
    }

    const action = matchedPlace ? 'pin_created' : 'pin_anywhere'
    const signal_weight = SIGNAL_WEIGHTS[action]
    const category = matchedPlace?.category ?? null
    const session_id = matchedPlace?.session_id ?? null
    const place_name = matchedPlace?.place_name ?? `pin@${pin_lat.toFixed(4)},${pin_lng.toFixed(4)}`

    // Insert feedback row
    await supabase.from('recommendation_feedback').insert({
      user_id,
      session_id,
      place_name,
      category,
      action,
      time_of_day: time_of_day ?? null,
      weather_condition: weather_condition ?? null
    })

    // Update affinity weight if category known
    if (category) {
      await updateWeight(user_id, category, signal_weight)
    }

    return new Response(JSON.stringify({
      success: true,
      data: { action, matched: !!matchedPlace }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return errorResponse(`Proximity check failed: ${error.message}`, 500)
  }
})

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function updateWeight(user_id: string, category: string, signal_weight: number) {
  const { data } = await supabase
    .from('users')
    .select('affinity_weights, signal_count')
    .eq('id', user_id)
    .single()

  const weights: Record<string, number> = data?.affinity_weights ?? {}
  const current = weights[category] ?? 0.5
  const distance = signal_weight >= 0 ? (1.0 - current) : current
  weights[category] = Math.min(1.0, Math.max(0.0, current + signal_weight * LEARNING_RATE * distance))

  const newCount = (data?.signal_count ?? 0) + 1
  await supabase
    .from('users')
    .update({
      affinity_weights: weights,
      signal_count: newCount,
      is_cold_start: newCount < 15
    })
    .eq('id', user_id)
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

**Note on lat/lng in session places:** The `recommendations` edge function (§4.8) must include `lat` and `lng` in each place object stored in `recommendation_sessions`. See §4.8 for the places payload shape.

**Client contract:**

```json
{
  "user_id": "uuid",
  "pin_lat": 48.8566,
  "pin_lng": 2.3522,
  "time_of_day": "afternoon",
  "weather_condition": "Clear"
}
```

---

### §4.7 `supabase/functions/recommendation-session/index.ts` — New

Resource-oriented endpoint. `POST` creates a session. `PATCH` updates session metadata.

```typescript
import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
```

**POST request body:**

```json
{
  "user_id": "uuid",
  "session_id": "uuid",
  "places": [
    { "name": "Le Marais Café", "category": "cafe", "address": "12 Rue ...", "ai_confidence": 0.82, "lat": 48.857, "lng": 2.352 }
  ]
}
```

**PATCH request body:**

```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "places": [ ... ]
}
```

---

### §4.8 `supabase/functions/recommendations/index.ts` — Full Replacement

**Changes from current version:**
- Anthropic client moved to module scope
- `transformToUserContext()` deleted entirely
- Accepts `taste_summary`, `identity_narrative`, `vibe_narrative`, `is_cold_start`, `excluded_places` instead of `user_preferences`, `pin_history`, `data_quality`
- Renames `hasRealWeather` to `is_real` in `weather_data`
- Timeout changed from 100 000 ms to 28 000 ms
- Error handling uses `instanceof Anthropic.APIError` instead of string matching
- Generates `session_id` and includes it in the response
- Enriched place objects include `lat`/`lng` (pass-through from tool output if present; null otherwise)

```typescript
import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders } from '../_shared/cors.ts'
import { BINX_SYSTEM_PROMPT, RECOMMENDATIONS_TOOL, buildRecommendationPrompt } from '../_shared/prompts.ts'

// Module scope — instantiated once per cold start, reused across requests
const anthropic = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY')! })

const hour = new Date().getHours()
const time_of_day =
  hour >= 5  && hour < 12 ? 'morning' :
  hour >= 12 && hour < 17 ? 'afternoon' :
  hour >= 17 && hour < 21 ? 'evening' : 'night'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const body = await req.json()
    const {
      current_location,
      user_id,
      weather_data = {},
      taste_summary = '',
      identity_narrative = '',
      vibe_narrative = '',
      is_cold_start = true,
      excluded_places = [],
      refinement_context,
    } = body

    if (!current_location?.lat || !current_location?.lng) {
      return errorResponse('Missing required field: current_location with lat/lng', 400)
    }
    if (!user_id) {
      return errorResponse('Missing required field: user_id', 400)
    }

    const lat = parseFloat(current_location.lat)
    const lng = parseFloat(current_location.lng)

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return errorResponse(`Invalid coordinates: lat=${lat}, lng=${lng}`, 400)
    }

    const prompt = buildRecommendationPrompt({
      current_location: {
        lat,
        lng,
        address: current_location.address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        neighborhood: current_location.neighborhood ?? 'Unknown area'
      },
      weather_data: {
        condition: weather_data.condition ?? 'Clear',
        temperature: weather_data.temperature ?? 20,
        is_real: weather_data.is_real ?? false
      },
      time_of_day,
      taste_summary,
      identity_narrative,
      vibe_narrative,
      is_cold_start,
      excluded_places: Array.isArray(excluded_places) ? excluded_places : [],
      refinement_context
    })

    const session_id = crypto.randomUUID()

    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: [{ type: 'text', text: BINX_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: [{ ...RECOMMENDATIONS_TOOL, cache_control: { type: 'ephemeral' } }],
        tool_choice: { type: 'tool', name: 'generate_recommendations' },
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Claude API timeout')), 28000)
      ),
    ])

    const toolBlock = (response as Anthropic.Message).content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Generated recommendations could not be processed. Please try again.')
    }

    const result = toolBlock.input as { recommendations: Record<string, unknown>[]; reasoning: string }

    if (!Array.isArray(result.recommendations)) {
      throw new Error('Generated recommendations could not be processed. Please try again.')
    }

    const enriched = result.recommendations.map((r: Record<string, unknown>) => ({
      ...r,
      lat: (r.lat as number) ?? null,
      lng: (r.lng as number) ?? null,
    }))

    const processingTime = Date.now() - startTime

    return new Response(JSON.stringify({
      success: true,
      data: {
        recommendations: enriched,
        reasoning: result.reasoning,
        session_id,
        is_cold_start,
        processing_time: processingTime,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return errorResponse('Monthly usage limit exceeded — please try again later.', 429)
      }
      return errorResponse(`Claude API error: ${error.message}`, 502)
    }

    if (error.message?.includes('timeout')) {
      return errorResponse('The recommendation service is taking longer than expected. Please try again.', 504)
    }

    return errorResponse(`Failed to generate recommendations: ${error.message}`, 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

---

## §5: Frontend Changes

---

### §5.1 `src/utils/constants.js` — Add API endpoints

Add the following entries to the existing `API_ENDPOINTS` object:

```javascript
export const API_ENDPOINTS = {
  WEATHER:                    `${_supabaseBase}/functions/v1/weather`,
  GEOCODE:                    `${_supabaseBase}/functions/v1/geocode`,
  RECOMMENDATIONS:            `${_supabaseBase}/functions/v1/recommendations`,
  SEED_TASTE_PROFILE:         `${_supabaseBase}/functions/v1/seed-taste-profile`,
  UPDATE_TASTE_PROFILE:       `${_supabaseBase}/functions/v1/update-taste-profile`,
  CHECK_REC_PROXIMITY:        `${_supabaseBase}/functions/v1/check-recommendation-proximity`,
  COMPUTE_TASTE_SUMMARY:      `${_supabaseBase}/functions/v1/compute-taste-summary`,
  RECOMMENDATION_SESSION:     `${_supabaseBase}/functions/v1/recommendation-session`,
}
```

No other changes to `constants.js`.

---

### §5.2 `src/utils/helpers.js` — Add helper

Add after the `getGreeting` function:

```javascript
export const getCurrentTimeOfDay = () => {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}
```

No other changes to `helpers.js`.

---

### §5.3 `src/store/authStore.js` — Targeted changes

**Three targeted changes. Do not rewrite the file.**

**Change 1:** Update `loadUserProfile` select query (line 81):

```javascript
// Before:
.select('profile')

// After:
.select('profile, affinity_weights, atmosphere_signals, signal_count, is_cold_start')
```

**Change 2:** In `loadUserProfile`, update the `set()` call to include the new top-level fields alongside `profile` (lines 89–117). The new `set` call:

```javascript
set({
  user: {
    ...user,
    profilePic: user.profilePic || saved.profilePic || null,
    affinity_weights: data?.affinity_weights ?? null,
    atmosphere_signals: data?.atmosphere_signals ?? null,
    signal_count: data?.signal_count ?? 0,
    is_cold_start: data?.is_cold_start ?? true,
    profile: {
      alterEgo:                    saved.alterEgo ?? '',
      currentResidence:            saved.currentResidence ?? '',
      occupation:                  saved.occupation ?? '',
      currentlyReading:            saved.currentlyReading ?? '',
      lastMovieWatched:            saved.lastMovieWatched ?? '',
      nextMovie:                   saved.nextMovie ?? '',
      currentlyWearing:            saved.currentlyWearing ?? '',
      favoriteBrand:               saved.favoriteBrand ?? '',
      favoriteAuthors:             saved.favoriteAuthors ?? '',
      favoriteVibe:                saved.favoriteVibe ?? '',
      idealSunday:                 saved.idealSunday ?? '',
      onboardingCompleted:         saved.onboardingCompleted ?? false,
      cuisinePreferences:          saved.cuisinePreferences ?? [],
      activityTypes:               saved.activityTypes ?? [],
      priceComfort:                saved.priceComfort ?? null,
      discoveryStyle:              saved.discoveryStyle ?? null,
      socialPreference:            saved.socialPreference ?? null,
      aestheticPreferences:        saved.aestheticPreferences ?? [],
      avoidancePreferences:        saved.avoidancePreferences ?? [],
      enhancedOnboardingCompleted: saved.enhancedOnboardingCompleted ?? false,
      savedLocations:              saved.savedLocations ?? []
    }
  },
  profileLoaded: true
})
```

**Change 3:** In the `onAuthStateChange` handler, the placeholder `profile` block (lines 39–61) must include the four new fields with the same defaults used in `loadUserProfile`:

```javascript
profile: existingProfile || {
  // ... existing fields unchanged ...
  priceComfort:    null,    // was 'mid-range' — remove hardcoded fallback
  discoveryStyle:  null,    // was 'hidden-gems' — remove hardcoded fallback
  socialPreference: null,   // was 'intimate-pairs' — remove hardcoded fallback
  // ... rest of existing fields unchanged ...
},
affinity_weights:   null,
atmosphere_signals: null,
signal_count:       0,
is_cold_start:      true,
```

The four new fields (`affinity_weights`, `atmosphere_signals`, `signal_count`, `is_cold_start`) are set at the **top level of the `user` object**, not inside `profile`.

---

### §5.4 `src/store/uiStore.js` — Targeted changes

**Change 1:** Extend the `recommendationsModal` initial state slice (lines 45–53):

```javascript
recommendationsModal: {
  isOpen: false,
  loading: false,
  error: null,
  currentRecommendations: [],
  savedRecommendations: [],
  cacheKey: null,
  lastUpdated: null,
  sessionId: null,
  currentSessionPlaces: [],
  interactionCount: 0,
},
```

**Change 2:** Add three new actions after `clearRecommendations`:

```javascript
setSessionId: (sessionId) => {
  set({
    recommendationsModal: {
      ...get().recommendationsModal,
      sessionId
    }
  })
},

setCurrentSessionPlaces: (places) => {
  set({
    recommendationsModal: {
      ...get().recommendationsModal,
      currentSessionPlaces: places
    }
  })
},

incrementInteractionCount: () => {
  set({
    recommendationsModal: {
      ...get().recommendationsModal,
      interactionCount: get().recommendationsModal.interactionCount + 1
    }
  })
},

resetSession: () => {
  set({
    recommendationsModal: {
      ...get().recommendationsModal,
      sessionId: null,
      currentSessionPlaces: [],
      interactionCount: 0
    }
  })
},
```

**Change 3:** Update the `resetUI` method's `recommendationsModal` block to include all new fields:

```javascript
recommendationsModal: {
  isOpen: false,
  loading: false,
  error: null,
  currentRecommendations: [],
  savedRecommendations: [],
  cacheKey: null,
  lastUpdated: null,
  sessionId: null,
  currentSessionPlaces: [],
  interactionCount: 0,
},
```

**Change 4:** Apply the same complete block to `closeAllModals`. Both `resetUI` and `closeAllModals` must use the identical `recommendationsModal` object so new fields are never left stale.

---

### §5.5 `src/store/pinsStore.js` — Targeted changes

**Change 1:** Update imports at the top of the file:

```javascript
import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { DEMO_USER, DEMO_PINS, MOODS, API_ENDPOINTS } from '../utils/constants'
import { sortPinsByTimestamp, dataURLtoFile, blobToFile, getCurrentTimeOfDay } from '../utils/helpers'
import { handleSupabaseError } from '../services/errorInterceptor'
import { edgeFunctionHeaders } from '../services/supabase'
```

**Change 2:** In `addPin`, extend `pinData` with vibe fields. Place these additions after `timestamp`:

```javascript
const moodEntry = MOODS.find(m => m.name === newPin.mood) ?? null

const pinData = {
  id: pinId,
  user_id: currentUserId,
  title: newPin.title,
  note: newPin.note,
  mood: newPin.mood,
  location: newPin.location,
  cultural_context: newPin.culturalContext || 'Personal discovery',
  photo: uploadedPhotoUrl,
  audio_url: uploadedAudioUrl,
  timestamp: new Date().toISOString(),
  vibe_title:         moodEntry?.name ?? null,
  mood_cluster:       moodEntry ? moodEntry.cat.charAt(0).toUpperCase() + moodEntry.cat.slice(1) : null,
  sub_mood:           moodEntry?.sub ?? null,
  energy_description: moodEntry?.desc ?? null,
  source:             'personal',
}
```

**Change 3:** After `const { error } = await supabase.from('pins').insert(pinData)` succeeds, add fire-and-forget proximity check. This runs after the `if (error) throw error` guard:

```javascript
const { error } = await supabase.from('pins').insert(pinData)
if (error) throw error

// Fire-and-forget — does not affect pin creation success
const pinLat = newPin.location?.lat ?? null
const pinLng = newPin.location?.lng ?? null
if (pinLat != null && pinLng != null) {
  fetch(API_ENDPOINTS.CHECK_REC_PROXIMITY, {
    method: 'POST',
    headers: edgeFunctionHeaders,
    body: JSON.stringify({
      user_id: currentUserId,
      pin_lat: pinLat,
      pin_lng: pinLng,
      time_of_day: getCurrentTimeOfDay(),
      weather_condition: null
    })
  }).catch(console.error)
}

set({ loading: false })
return { success: true }
```

The `DEMO_USER` path (lines 108–119) returns early before these calls — that is correct. No changes needed there.

---

### §5.6 `src/components/profile/EnhancedOnboardingModal.jsx` — Targeted changes

File is at `src/components/profile/EnhancedOnboardingModal.jsx`.

**Change 1:** Add imports at the top:

```javascript
import { API_ENDPOINTS } from '../../utils/constants'
import { edgeFunctionHeaders } from '../../services/supabase'
```

**Change 2:** Fix `discoveryOptions` values to match canonical enum:

```javascript
const discoveryOptions = [
  { value: 'hidden-gems',  label: 'Hidden gems & local secrets' },
  { value: 'popular',      label: 'Popular & well-known places' },
  { value: 'trending',     label: 'Trending & newly opened' },
  { value: 'word-of-mouth', label: 'Word-of-mouth recommendations' },
  { value: 'established',  label: 'Established favorites' }
]
```

**Change 3:** Fix `socialOptions` values to match canonical enum:

```javascript
const socialOptions = [
  { value: 'solo',        label: 'Solo explorer' },
  { value: 'intimate',    label: 'Intimate pairs/couples' },
  { value: 'small-group', label: 'Small groups (3–5 people)' },
  { value: 'large-group', label: 'Large groups & social scenes' }
]
```

**Change 4:** In `useState` initial state (lines 20–28), remove hardcoded fallbacks for single-value preferences:

```javascript
const [preferences, setPreferences] = useState({
  cuisinePreferences:   [],
  activityTypes:        [],
  priceComfort:         null,
  discoveryStyle:       null,
  socialPreference:     null,
  aestheticPreferences: [],
  avoidancePreferences: []
})
```

**Change 5:** In the `useEffect` that populates preferences from `user.profile` (lines 31–48), remove `|| 'fallback'` patterns:

```javascript
useEffect(() => {
  if (isOpen) {
    setStep(0)
    if (user?.profile?.enhancedOnboardingCompleted) {
      setPreferences({
        cuisinePreferences:   user.profile.cuisinePreferences   ?? [],
        activityTypes:        user.profile.activityTypes        ?? [],
        priceComfort:         user.profile.priceComfort         ?? null,
        discoveryStyle:       user.profile.discoveryStyle       ?? null,
        socialPreference:     user.profile.socialPreference     ?? null,
        aestheticPreferences: user.profile.aestheticPreferences ?? [],
        avoidancePreferences: user.profile.avoidancePreferences ?? []
      })
    }
  }
}, [isOpen, user])
```

**Change 6:** In `handleSave`, after `updateProfile` resolves, add fire-and-forget seed call:

```javascript
const handleSave = async () => {
  setLoading(true)
  try {
    await updateProfile({
      ...preferences,
      enhancedOnboardingCompleted: true
    })

    // Fire-and-forget — initialise taste profile weights on the server
    fetch(API_ENDPOINTS.SEED_TASTE_PROFILE, {
      method: 'POST',
      headers: edgeFunctionHeaders,
      body: JSON.stringify({ user_id: user.id, preferences })
    }).catch(console.error)

    onComplete?.()
    onClose()
  } catch (error) {
    console.error('Enhanced onboarding failed:', error)
  } finally {
    setLoading(false)
  }
}
```

---

### §5.7 `src/components/shared/RecommendationCard.jsx` — Targeted changes

**Change 1:** Add `onLike`, `onDismiss` to props destructuring:

```javascript
const RecommendationCard = ({ recommendation, onSave, onRemove, onDirections, onLike, onDismiss, isSaved, showSavedDate }) => {
```

**Change 2:** Add local `liked` state at the top of the component body (after the destructure):

```javascript
const [liked, setLiked] = React.useState(false)
```

**Change 3:** Update the header row to include Like and Dismiss buttons alongside the confidence score:

Replace the existing `<div className="flex justify-between items-start mb-2">` block with:

```jsx
<div className="flex justify-between items-start mb-2">
  <div className="flex items-center space-x-1">
    {onDismiss && !isSaved && (
      <button
        onClick={onDismiss}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-customBackground text-customPurpleText transition-colors"
        title="Not interested"
        aria-label="Dismiss recommendation"
      >
        <i className="fas fa-times text-xs"></i>
      </button>
    )}
  </div>
  <h4 className="font-medium text-gray-900 text-sm flex-1 text-center px-2">{recommendation.name}</h4>
  <div className="flex items-center space-x-1">
    {recommendation.ai_confidence !== undefined && (
      <span className="text-xs text-gray-500">
        {Math.round(recommendation.ai_confidence * 100)}%
      </span>
    )}
    {onLike && !isSaved && (
      <button
        onClick={() => { setLiked(true); onLike() }}
        className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${liked ? 'bg-customPurple text-white' : 'bg-customBackground text-customPurpleText'}`}
        title="Like this recommendation"
        aria-label="Like recommendation"
        disabled={liked}
      >
        <i className="fas fa-heart text-xs"></i>
      </button>
    )}
    {isSaved && onRemove && (
      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-customBackground text-customPurpleText transition-colors ml-2"
        title="Remove from saved"
      >
        <i className="fas fa-trash-alt text-xs"></i>
      </button>
    )}
  </div>
</div>
```

**Change 4:** Add a category label below the name, using `VibeTag` in non-interactive variant. Add import at the top:

```javascript
import VibeTag from '../ui/VibeTag'
```

After the header block and before `<p className="text-xs text-gray-500 mb-2">`, add:

```jsx
{recommendation.category && (
  <div className="mb-2">
    <VibeTag vibe={recommendation.category} size="sm" disabled={true} />
  </div>
)}
```

**Change 5:** Update the time/distance display to use `travel_mode`:

```jsx
<span>
  {recommendation.estimated_minutes != null
    ? `~${recommendation.estimated_minutes} min ${recommendation.travel_mode === 'transit' ? 'transit' : 'walk'}`
    : ''}
  {recommendation.distance_km != null ? ` · ${recommendation.distance_km}km` : ''}
</span>
```

**Change 6:** Update `PropTypes`:

```javascript
RecommendationCard.propTypes = {
  recommendation: PropTypes.object.isRequired,
  onSave:         PropTypes.func,
  onRemove:       PropTypes.func,
  onDirections:   PropTypes.func.isRequired,
  onLike:         PropTypes.func,
  onDismiss:      PropTypes.func,
  isSaved:        PropTypes.bool,
  showSavedDate:  PropTypes.bool
}
```

---

### §5.8 `src/components/shared/RecommendationsModal.jsx` — Full Replacement

```jsx
import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from '../../hooks/useLocation'
import { usePins } from '../../hooks/usePins'
import { useUIStore } from '../../store/uiStore'
import { useLocationStore } from '../../store/locationStore'
import { LoadingSpinner } from '../ui'
import { API_ENDPOINTS } from '../../utils/constants'
import { edgeFunctionHeaders } from '../../services/supabase'
import { getCurrentTimeOfDay } from '../../utils/helpers'
import RecommendationCard from './RecommendationCard'
import RefineSearchModal from './RefineSearchModal'

const REC_CATEGORY_OPTIONS = [
  'restaurant', 'café', 'bar', 'cocktail-bar',
  'museum', 'gallery', 'park', 'bookshop',
  'market', 'live-music', 'rooftop', 'bakery',
  'spa', 'cinema', 'jazz-club', 'wine-bar',
  'gelateria', 'late-night'
]
const REC_PRICE_OPTIONS = [1, 2, 3, 4]

const buildRefinementContext = (filters) => {
  const parts = []
  if (filters.types?.length) parts.push(`Venue types: ${filters.types.join(', ')}`)
  if (filters.prices?.length) parts.push(`Price levels: ${filters.prices.map(p => '$'.repeat(p)).join(', ')}`)
  if (filters.radius) parts.push(`Maximum distance: ${filters.radius < 1000 ? `${filters.radius}m` : `${filters.radius / 1000}km`}`)
  return parts.join('. ')
}

const RecommendationsModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth()
  const { userLocation, loading: locationLoading } = useLocation()
  const { pins } = usePins()

  const currentScrollRef = useRef(null)
  const savedScrollRef = useRef(null)

  const recommendationsModal = useUIStore(state => state.recommendationsModal)
  const showMessage = useUIStore(state => state.showMessageModal)
  const setRecommendationsLoading = useUIStore(state => state.setRecommendationsLoading)
  const setRecommendationsError = useUIStore(state => state.setRecommendationsError)
  const setCurrentRecommendations = useUIStore(state => state.setCurrentRecommendations)
  const addToSavedRecommendations = useUIStore(state => state.addToSavedRecommendations)
  const removeFromSavedRecommendations = useUIStore(state => state.removeFromSavedRecommendations)
  const clearRecommendations = useUIStore(state => state.clearRecommendations)
  const setSessionId = useUIStore(state => state.setSessionId)
  const setCurrentSessionPlaces = useUIStore(state => state.setCurrentSessionPlaces)
  const incrementInteractionCount = useUIStore(state => state.incrementInteractionCount)
  const resetSession = useUIStore(state => state.resetSession)

  const [dataValidation, setDataValidation] = useState({
    locationReady: false,
    userReady: false,
    weatherReady: false,
    allReady: false
  })
  const [showRefine, setShowRefine] = useState(false)
  const [activeFilters, setActiveFilters] = useState(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const validation = validateDataReadiness()
    setDataValidation(validation)
    if (
      validation.allReady &&
      !recommendationsModal.loading &&
      recommendationsModal.currentRecommendations.length === 0
    ) {
      generateRecommendations()
    }
  }, [isOpen, user, userLocation, locationLoading, recommendationsModal.loading, recommendationsModal.currentRecommendations.length])

  const validateDataReadiness = () => {
    const userReady = !!(user?.id && user?.profile)
    const locationReady = !!(userLocation?.lat && userLocation?.lng && !locationLoading)
    const weatherReady = !!(userLocation?.condition && userLocation?.temperature !== undefined)
    return { userReady, locationReady, weatherReady, allReady: userReady && locationReady }
  }

  const generateRecommendations = async ({ filtersOverride = null, excluded_places = [] } = {}) => {
    const filtersToUse = filtersOverride !== null ? filtersOverride : activeFilters
    const validation = validateDataReadiness()

    if (!validation.allReady) {
      if (!validation.locationReady && !locationLoading) {
        try { await useLocationStore.getState().refreshLocation() } catch (_) {}
      }
      const retry = validateDataReadiness()
      if (!retry.allReady) {
        setRecommendationsError(
          !retry.userReady
            ? 'User profile is still loading. Please wait a moment and try again.'
            : 'Location data is not available. Please ensure location access is enabled.'
        )
        return
      }
    }

    setRecommendationsLoading(true)
    setRecommendationsError(null)

    try {
      const lat = Number(userLocation.lat)
      const lng = Number(userLocation.lng)
      if (isNaN(lat) || isNaN(lng)) throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`)

      // Step 1: get taste summary
      const tasteRes = await fetch(API_ENDPOINTS.COMPUTE_TASTE_SUMMARY, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ user_id: user.id })
      })

      let tasteData = { taste_summary: '', identity_narrative: '', vibe_narrative: '', is_cold_start: true }
      if (tasteRes.ok) {
        const tasteJson = await tasteRes.json()
        if (tasteJson.success) tasteData = tasteJson.data
      }

      // Step 2: get recommendations
      const requestData = {
        current_location: {
          lat,
          lng,
          address: userLocation.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          neighborhood: userLocation.locality || userLocation.displayLocation || 'Unknown area'
        },
        user_id: user.id,
        weather_data: {
          condition: userLocation.condition || 'Clear',
          temperature: userLocation.temperature ?? 20,
          is_real: !!(userLocation.condition && userLocation.temperature !== undefined)
        },
        taste_summary:       tasteData.taste_summary,
        identity_narrative:  tasteData.identity_narrative,
        vibe_narrative:      tasteData.vibe_narrative,
        is_cold_start:       tasteData.is_cold_start,
        excluded_places:     Array.isArray(excluded_places) ? excluded_places : [],
        ...(filtersToUse && { refinement_context: buildRefinementContext(filtersToUse) })
      }

      const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data.recommendations) {
        const recommendations = data.data.recommendations
        const sessionId = data.data.session_id

        setCurrentRecommendations(recommendations, null)
        setSessionId(sessionId)
        setCurrentSessionPlaces(
          recommendations.map(r => ({
            name: r.name,
            category: r.category,
            address: r.address,
            ai_confidence: r.ai_confidence,
            lat: r.lat ?? null,
            lng: r.lng ?? null
          }))
        )

        // Step 3: persist session to DB (fire-and-forget)
        fetch(API_ENDPOINTS.RECOMMENDATION_SESSION, {
          method: 'POST',
          headers: edgeFunctionHeaders,
          body: JSON.stringify({
            user_id: user.id,
            session_id: sessionId,
            places: recommendations.map(r => ({
              name: r.name,
              category: r.category,
              address: r.address,
              ai_confidence: r.ai_confidence,
              lat: r.lat ?? null,
              lng: r.lng ?? null
            }))
          })
        }).catch(console.error)

      } else {
        throw new Error('Invalid API response format')
      }

    } catch (error) {
      setRecommendationsError(`Failed to generate recommendations: ${error.message}`)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  const writeFeedback = (recommendation, actionType) => {
    incrementInteractionCount()
    fetch(API_ENDPOINTS.UPDATE_TASTE_PROFILE, {
      method: 'POST',
      headers: edgeFunctionHeaders,
      body: JSON.stringify({
        user_id: user.id,
        action: actionType,
        category: recommendation.category ?? null,
        session_id: recommendationsModal.sessionId ?? null,
        place_name: recommendation.name,
        ai_confidence: recommendation.ai_confidence ?? null,
        distance_km: recommendation.distance_km ?? null,
        time_of_day: getCurrentTimeOfDay(),
        weather_condition: userLocation?.condition ?? null
      })
    }).catch(console.error)
  }

  const handleSaveRecommendation = async (recommendation) => {
    const alreadySaved = savedRecommendations.find(r => r.name === recommendation.name)
    if (alreadySaved) return
    const savedRec = { ...recommendation, saved_at: new Date().toISOString(), original_cache_key: recommendationsModal.cacheKey }
    const updatedSaved = [...savedRecommendations, savedRec]
    addToSavedRecommendations(recommendation)
    await updateProfile({ savedLocations: updatedSaved })
    showMessage('Saved', `${recommendation.name} added to your saved recommendations`)
  }

  const handleRemoveSaved = async (recommendationName) => {
    const updatedSaved = savedRecommendations.filter(r => r.name !== recommendationName)
    removeFromSavedRecommendations(recommendationName)
    await updateProfile({ savedLocations: updatedSaved })
    showMessage('Removed', 'Recommendation removed from saved list')
  }

  const handleGetDirections = (recommendation) => {
    writeFeedback(recommendation, 'directions')
    const address = encodeURIComponent(recommendation.address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
  }

  const handleRefresh = () => {
    const { currentRecommendations, sessionId, interactionCount, currentSessionPlaces } = recommendationsModal

    // Batch dismiss all places that received zero interactions in this session
    if (sessionId && currentRecommendations.length > 0 && interactionCount === 0) {
      fetch(API_ENDPOINTS.UPDATE_TASTE_PROFILE, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({
          user_id: user.id,
          action: 'batch_dismissed',
          session_id: sessionId,
          time_of_day: getCurrentTimeOfDay(),
          weather_condition: userLocation?.condition ?? null,
          items: currentSessionPlaces.map(p => ({ place_name: p.name, category: p.category }))
        })
      }).catch(console.error)
    }

    // Build exclusion list from the old session's place names
    const excluded = currentRecommendations.map(r => r.name)

    // Reset session state and fetch fresh recommendations
    clearRecommendations()
    resetSession()
    generateRecommendations({ excluded_places: excluded })
  }

  if (!isOpen) return null

  const { currentRecommendations, savedRecommendations, loading, error } = recommendationsModal

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleRefresh}
              className="text-customPurpleText transition-colors"
              aria-label="Refresh recommendations"
              disabled={loading}
            >
              {loading
                ? <i className="fas fa-spinner fa-spin text-base"></i>
                : <i className="fas fa-sync-alt text-base"></i>
              }
            </button>
            <h3 className="text-xl font-semibold text-customPurpleText pl-6">Recommendations</h3>
            <button
              onClick={onClose}
              className="text-customPurpleText transition-colors"
              aria-label="Close recommendations"
            >
              ✕
            </button>
          </div>

          {/* Refine button */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setShowRefine(true)}
              className="py-3 px-6 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90"
            >
              Refine Recommendations
            </button>
            {activeFilters && (
              <button
                onClick={() => {
                  setActiveFilters(null)
                  clearRecommendations()
                  resetSession()
                  generateRecommendations()
                }}
                className="text-customPurpleText font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Data readiness indicator */}
          {!dataValidation.allReady && !error && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm font-medium text-blue-800">Preparing recommendations...</span>
              </div>
              <div className="text-xs text-blue-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <i className={`fas ${dataValidation.userReady ? 'fa-check text-green-500' : 'fa-clock text-blue-500'}`}></i>
                  <span>User profile</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className={`fas ${dataValidation.locationReady ? 'fa-check text-green-500' : 'fa-clock text-blue-500'}`}></i>
                  <span>Location data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className={`fas ${dataValidation.weatherReady ? 'fa-check text-green-500' : 'fa-clock text-orange-500'}`}></i>
                  <span>Weather data (optional)</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-customPurpleText font-medium">Hang Tight...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-600"></i>
              </div>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => { clearRecommendations(); resetSession(); generateRecommendations() }}
                className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && currentRecommendations.length === 0 && dataValidation.allReady && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-compass text-gray-400"></i>
              </div>
              <p className="text-gray-500 text-sm mb-4">No recommendations yet</p>
              <button
                onClick={() => generateRecommendations()}
                className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              >
                Generate Recommendations
              </button>
            </div>
          )}

          {/* Current Recommendations */}
          {currentRecommendations.length > 0 && (
            <div className="mb-6">
              {activeFilters?.types?.length > 0 && (() => {
                const selectedTypes = activeFilters.types.map(t => t.toLowerCase())
                const hasMatch = currentRecommendations.some(rec => {
                  const haystack = [rec.category, ...(rec.tags || [])].join(' ').toLowerCase()
                  return selectedTypes.some(t => haystack.includes(t))
                })
                return !hasMatch ? (
                  <div className="mb-4 p-3 bg-customBackground rounded-xl">
                    <p className="text-sm text-customPurpleText">
                      No <span className="font-medium">{activeFilters.types.join(', ')}</span> found nearby. Showing the best alternatives in your area.
                    </p>
                  </div>
                ) : null
              })()}

              <div className="overflow-y-auto scroll-smooth">
                <div className="flex flex-col gap-4" ref={currentScrollRef}>
                  {currentRecommendations.map((rec, index) => (
                    <RecommendationCard
                      key={index}
                      recommendation={rec}
                      onSave={() => handleSaveRecommendation(rec)}
                      onDirections={() => handleGetDirections(rec)}
                      onLike={() => writeFeedback(rec, 'like')}
                      onDismiss={() => writeFeedback(rec, 'dismiss')}
                      isSaved={savedRecommendations.some(saved => saved.name === rec.name)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Saved Recommendations */}
          {savedRecommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-customPurpleText mb-4 pl-6">Saved</h3>
              <div className="overflow-y-auto scroll-smooth">
                <div className="flex flex-col gap-4" ref={savedScrollRef}>
                  {savedRecommendations.map((rec, index) => (
                    <RecommendationCard
                      key={`saved-${index}`}
                      recommendation={rec}
                      onRemove={() => handleRemoveSaved(rec.name)}
                      onDirections={() => handleGetDirections(rec)}
                      isSaved={true}
                      showSavedDate={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRefine && (
        <RefineSearchModal
          onClose={() => setShowRefine(false)}
          initial={activeFilters || {}}
          categoryOptions={REC_CATEGORY_OPTIONS}
          priceOptions={REC_PRICE_OPTIONS}
          onApply={(filters) => {
            setActiveFilters(filters)
            setShowRefine(false)
            clearRecommendations()
            resetSession()
            generateRecommendations({ filtersOverride: filters })
          }}
        />
      )}
    </>
  )
}

RecommendationsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default RecommendationsModal
```

---

## §6: Implementation Sequence

Execute steps in this order. Each step is independently deployable and does not break existing functionality until its dependent step is also deployed.

| Step | Action | Files |
|------|--------|-------|
| 1 | Run database migration | Supabase SQL editor |
| 2 | Update `_shared/cors.ts` | `supabase/functions/_shared/cors.ts` |
| 3 | Replace `_shared/prompts.ts` | `supabase/functions/_shared/prompts.ts` |
| 4 | Add API endpoint constants | `src/utils/constants.js` |
| 5 | Add `getCurrentTimeOfDay` helper | `src/utils/helpers.js` |
| 6 | Update `uiStore.js` | `src/store/uiStore.js` |
| 7 | Update `authStore.js` | `src/store/authStore.js` |
| 8 | Deploy `compute-taste-summary` | `supabase/functions/compute-taste-summary/index.ts` |
| 9 | Deploy `seed-taste-profile` | `supabase/functions/seed-taste-profile/index.ts` |
| 10 | Deploy `update-taste-profile` | `supabase/functions/update-taste-profile/index.ts` |
| 11 | Deploy `check-recommendation-proximity` | `supabase/functions/check-recommendation-proximity/index.ts` |
| 12 | Deploy `recommendation-session` | `supabase/functions/recommendation-session/index.ts` |
| 13 | Deploy updated `recommendations` | `supabase/functions/recommendations/index.ts` |
| 14 | Update `EnhancedOnboardingModal.jsx` | `src/components/profile/EnhancedOnboardingModal.jsx` |
| 15 | Update `pinsStore.js` | `src/store/pinsStore.js` |
| 16 | Update `RecommendationCard.jsx` | `src/components/shared/RecommendationCard.jsx` |
| 17 | Update `RecommendationsModal.jsx` | `src/components/shared/RecommendationsModal.jsx` |

Steps 8–13 are edge function deploys: `supabase functions deploy <function-name>`.

Steps 14–17 are client changes that depend on steps 1–13 being live. Deploy them together as a single frontend release.

---

## §7: Issue Resolution Index

Every issue identified during review is resolved inline in the section above. Reference guide:

| # | Issue | Resolved in |
|---|-------|-------------|
| 1 | Wrong file path for EnhancedOnboardingModal | §5.6 header |
| 2 | `currentUser.id` → `user.id` | §5.6 Change 6 |
| 3 | `formData` → `preferences` | §5.6 Change 4, 5 |
| 4 | Missing imports in EnhancedOnboardingModal | §5.6 Change 1 |
| 5 | Missing imports in pinsStore | §5.5 Change 1 |
| 6 | `writeFeedback` never defined | §5.8 (`writeFeedback` function) |
| 7 | Directions feedback in wrong file | §5.8 (`handleGetDirections` calls `writeFeedback`) |
| 8 | `generateRecommendations` signature | §5.8 (signature `async ({ filtersOverride, excluded_places } = {})`) |
| 9 | `hasRealWeather` → `is_real` | §4.2 prompt builder, §5.8 request body |
| 10 | `session_id` lifecycle contradictory | §4.8 (edge fn generates), §5.8 (client persists) |
| 11 | `compute-taste-summary` contract undefined | §4.3 |
| 12 | authStore `loadUserProfile` fallbacks | §5.3 Change 2 (`?? null`) |
| 13 | EnhancedOnboardingModal `useEffect` fallbacks | §5.6 Change 5 |
| 14 | uiStore pseudocode syntax | §5.4 (valid JS throughout) |
| 15 | CORS missing PATCH | §4.1 |
| 16 | `REC_CATEGORY_OPTIONS` case + missing entries | §5.8 (`REC_CATEGORY_OPTIONS` array) |
| 17 | Error handling string matching | §4.8 (`instanceof Anthropic.APIError`) |
| 18 | Anthropic client at module scope / 28 s timeout | §4.8 |
| 19 | PATCH body extra `categories` field | §4.7 `handlePatch` (only `places`) |
| 20 | `update-taste-profile` null category | §4.5 (`if (category)` guard) |
| 21 | `update-taste-profile` feedback request body | §4.5 client contract block |
| 22 | `topN`/`bottomN`/`topFreq` undefined | §4.3 (defined inline) |
| 23 | `is_cold_start` flow across boundaries | §4.3 returns it → §5.8 passes it → §4.8 echoes it |
| 24 | `setSessionId`/`setCurrentSessionPlaces` call sites | §5.8 (`generateRecommendations` step 2 block) |
