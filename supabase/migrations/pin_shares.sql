-- Run this in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/ttnunlnryjtvnnqvpplb/sql

CREATE TABLE IF NOT EXISTS public.pin_shares (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token        text        UNIQUE NOT NULL,
  pin_id       uuid        REFERENCES public.pins(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_note text,
  created_at   timestamptz DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  view_count   int         DEFAULT 0,
  last_viewed_at timestamptz
);

ALTER TABLE public.pin_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own shares"
  ON public.pin_shares FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read their own shares"
  ON public.pin_shares FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can revoke their own shares"
  ON public.pin_shares FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
