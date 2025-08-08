import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Gets the business ID for the current user by email
 * This utility ensures consistent business lookup across the application
 */
export async function getCurrentBusinessId(
  client: SupabaseClient, 
  userEmail: string
): Promise<string> {
  if (!userEmail) {
    throw new Error('User email is required')
  }

  const { data: business, error } = await client
    .from('businesses')
    .select('id')
    .eq('email', userEmail)
    .single()

  if (error || !business) {
    throw new Error(`Business not found for email: ${userEmail}`)
  }

  return business.id
}