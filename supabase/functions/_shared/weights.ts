import { createClient } from 'npm:@supabase/supabase-js'

const LEARNING_RATE = 0.15

export async function updateWeight(
  supabase: ReturnType<typeof createClient>,
  user_id: string,
  category: string,
  signal_weight: number,
  countSignal: boolean = true
): Promise<void> {
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

  const currentCount: number = data?.signal_count ?? 0
  const newCount = countSignal ? currentCount + 1 : currentCount

  await supabase
    .from('users')
    .update({
      affinity_weights: weights,
      signal_count: newCount,
      is_cold_start: newCount < 15
    })
    .eq('id', user_id)
}
