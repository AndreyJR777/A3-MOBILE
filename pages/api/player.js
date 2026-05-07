import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, ...body } = req.body

    if (action === 'create') {
      const { data, error } = await supabase
        .from('players')
        .insert({ name: body.name })
        .select()
        .single()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json(data)
    }

    if (action === 'save') {
      const { id, ...updates } = body
      updates.last_activity = new Date().toISOString()
      const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    }

    return res.status(400).json({ error: 'Invalid action' })
  }

  if (req.method === 'GET') {
    const { id } = req.query
    if (id) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()
      if (error) return res.status(404).json({ error: 'Player not found' })
      return res.status(200).json(data)
    }

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('missions_completed', { ascending: false })
      .limit(10)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
