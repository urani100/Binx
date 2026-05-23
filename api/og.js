import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Builds a React-compatible element object without JSX
function el(type, props, ...children) {
  const flat = children.flat().filter(c => c != null && c !== false)
  return {
    type,
    props: {
      ...props,
      ...(flat.length === 1 && { children: flat[0] }),
      ...(flat.length > 1  && { children: flat })
    }
  }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') || ''

  let pinData = null
  try {
    const upstream = await fetch(
      `${SUPABASE_URL}/functions/v1/get-shared-pin?token=${encodeURIComponent(token)}`,
      { headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' } }
    )
    if (upstream.ok) pinData = await upstream.json()
  } catch {}

  // Fallback: plain branded image for invalid / expired tokens
  if (!pinData) {
    return new ImageResponse(
      el('div', {
        style: {
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: '#f2eff9'
        }
      },
        el('span', { style: { fontSize: '88px', fontWeight: 700, color: '#7e6da8', letterSpacing: '14px' } }, 'BiNx')
      ),
      { width: 1200, height: 630 }
    )
  }

  const { pin, share } = pinData
  const titleSize = (pin.title || '').length > 35 ? '42px' : '54px'

  return new ImageResponse(
    el('div', {
      style: {
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', background: '#f2eff9', padding: '60px', gap: '52px'
      }
    },
      // Left: stamp + title + sender
      el('div', {
        style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }
      },
        el('span', {
          style: { fontSize: '20px', fontWeight: 700, color: '#7e6da8', letterSpacing: '8px', textTransform: 'uppercase', marginBottom: '48px' }
        }, 'BiNx'),

        el('span', {
          style: { fontSize: titleSize, fontWeight: 600, color: '#2d1f5e', lineHeight: 1.2, marginBottom: '30px' }
        }, pin.title || 'A Vibe'),

        el('span', {
          style: { fontSize: '26px', color: '#7e6da8', fontWeight: 400 }
        }, `${share.senderFirstName} sent you a Vibe`)
      ),

      // Right: photo inset
      pin.photo && el('div', {
        style: {
          width: '360px', height: '400px', borderRadius: '28px', flexShrink: 0,
          backgroundImage: `url(${pin.photo})`, backgroundSize: 'cover', backgroundPosition: 'center'
        }
      })
    ),
    { width: 1200, height: 630 }
  )
}
