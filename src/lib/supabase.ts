import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getClient(serviceRole = false): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
  }
  return createClient(url, key)
}

export const supabase = {
  from: (table: string) => getClient().from(table),
  auth: { getUser: () => getClient().auth.getUser() },
}

export const supabaseAdmin = {
  from: (table: string) => getClient(true).from(table),
}
