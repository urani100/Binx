import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') || ''

  let pinData = null
  try {
    const upstream = await fetch(
      `${SUPABASE_URL}/functions/v1/get-shared-pin?token=${encodeURIComponent(token)}`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    if (upstream.ok) pinData = await upstream.json()
  } catch {}

  // Fallback: plain BiNx branded image for invalid/expired tokens
  if (!pinData) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f2eff9',
        }}
      >
        <span style={{ fontSize: '88px', fontWeight: 700, color: '#7e6da8', letterSpacing: '14px' }}>
          BiNx
        </span>
      </div>,
      { width: 1200, height: 630 }
    )
  }

  const { pin, share } = pinData
  const titleFontSize = (pin.title || '').length > 35 ? '42px' : '54px'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: '#f2eff9',
        padding: '70px',
        gap: '52px',
      }}
    >
      {/* Left: BiNx stamp + title + sender */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#7e6da8',
            letterSpacing: '8px',
            textTransform: 'uppercase',
            marginBottom: '48px',
          }}
        >
          BiNx
        </span>

        <span
          style={{
            fontSize: titleFontSize,
            fontWeight: 600,
            color: '#2d1f5e',
            lineHeight: 1.2,
            marginBottom: '30px',
          }}
        >
          {pin.title || 'A Vibe'}
        </span>

        <span
          style={{
            fontSize: '26px',
            color: '#7e6da8',
            fontWeight: 400,
          }}
        >
          {share.senderFirstName} sent you a Vibe
        </span>
      </div>

      {/* Right: photo inset */}
      {pin.photo && (
        <div
          style={{
            width: '390px',
            height: '460px',
            borderRadius: '28px',
            backgroundImage: `url(${pin.photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
        />
      )}
    </div>,
    { width: 1200, height: 630 }
  )
}
