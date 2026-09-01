BiNx is a personal discovery app that lets you capture and revisit the places and moments that define your taste.

What it does: At its core, BiNx is a mood-first location journal. Instead of just saving a place, you capture the feeling of being there — the atmosphere, the energy, the vibe. Each entry (called a pin) combines a location, a mood, a written note, a photo, and optionally a voice recording, into a single moment in time.

Three layers work together:

Vibes:  You drop a pin when you experience something worth remembering. A rooftop at golden hour, a hidden bookshop, a restaurant that felt exactly right. You describe the mood, capture the moment, and it's saved to your personal map.

Recommendations — Based on your saved pins and your personal preferences (cuisine, discovery style, price comfort, social setting), an AI surfaces places nearby that match your sensibility — not just what's popular, but what's you. You can refine these on the fly by venue type, price, and distance.

Profile:You choose an illustrated avatar guide, a colour palette that matches your aesthetic, and fill out a personal profile that gives the AI a richer picture of who you are.

The philosophy:

BiNx is built around the idea that the best recommendations come from knowing someone's taste deeply. The more you use it, the more moments you capture, the more personal the experience becomes.

Under the Hood

BiNx is built on a modern full-stack architecture:

Frontend: React + Vite, styled with Tailwind CSS, state managed by Zustand
Backend: Supabase: PostgreSQL database, Auth, and Storage for photos and audio
AI Layer" Anthropic Claude (Haiku) via Supabase Edge Functions (Deno runtime), streaming recommendations in real time
Intelligence: Claude acts as a stateless reasoning engine: it receives your location, weather, time of day, and a personalized taste profile built from your saved pins, then generates contextual place recommendations ranked by confidence
Memory: Your taste profile, pins, and preferences live in Supabase; Claude reads them fresh each session rather than retaining any state itself
Real-time sync: Supabase Realtime pushes pin changes across devices the moment they happen
