import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './supabase'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return a mock client if environment variables are not set (for build time)
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url_here') {
    return {
      auth: {
        signInWithPassword: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        signUp: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        signInWithOAuth: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        getUser: () => Promise.resolve({ data: { user: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => Promise.resolve({ error: null })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) })
      })
    } as any
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}