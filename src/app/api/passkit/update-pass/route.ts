import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'
import { updatePassStamps } from '@/lib/passkit-operations'
import { PassKitError } from '@/lib/passkit'

interface UpdatePassRequest {
  customerLoyaltyCardId: string
  newStampCount?: number
  customFields?: {
    [key: string]: {
      value: string
      label?: string
    }
  }
}

interface UpdatePassResponse {
  success: boolean
  message?: string
  error?: string
  details?: string
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as UpdatePassResponse,
        { status: 401 }
      )
    }

    // Get business ID for the user
    let businessId: string
    try {
      businessId = await getCurrentBusinessId(authSupabase, user.email!)
    } catch (error) {
      console.error('Business lookup error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Business not found for user', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        } as UpdatePassResponse,
        { status: 404 }
      )
    }

    // Parse request body
    let body: UpdatePassRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' } as UpdatePassResponse,
        { status: 400 }
      )
    }

    const { customerLoyaltyCardId, newStampCount, customFields } = body

    // Validate input
    if (!customerLoyaltyCardId) {
      return NextResponse.json(
        { success: false, error: 'customerLoyaltyCardId is required' } as UpdatePassResponse,
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Get customer loyalty card with related data
    const { data: card, error: cardError } = await supabase
      .from('customer_loyalty_cards')
      .select(`
        *,
        customers!inner (
          id,
          name,
          business_id
        ),
        loyalty_cards!inner (
          id,
          name,
          rules,
          wallet_enabled,
          business_id
        )
      `)
      .eq('id', customerLoyaltyCardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { success: false, error: 'Customer loyalty card not found' } as UpdatePassResponse,
        { status: 404 }
      )
    }

    // Validate business access
    if (card.customers.business_id !== businessId || card.loyalty_cards.business_id !== businessId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this loyalty card' } as UpdatePassResponse,
        { status: 403 }
      )
    }

    // Check if wallet is enabled
    if (!card.loyalty_cards.wallet_enabled) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet integration not enabled for this loyalty card' 
        } as UpdatePassResponse,
        { status: 400 }
      )
    }

    // Check if pass has PassKit ID
    if (!card.passkit_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No wallet pass found for this loyalty card',
          details: 'Create a wallet pass first before trying to update it'
        } as UpdatePassResponse,
        { status: 404 }
      )
    }

    // Update pass based on provided data
    if (newStampCount !== undefined) {
      const totalRequired = card.loyalty_cards.rules.stamps_required
      const isCompleted = newStampCount >= totalRequired

      await updatePassStamps(
        card.passkit_id,
        newStampCount,
        totalRequired,
        card.loyalty_cards.rules.reward_description,
        isCompleted
      )

      console.log('✅ Wallet pass updated with stamps:', {
        customerLoyaltyCardId,
        passkitId: card.passkit_id,
        newStampCount,
        totalRequired,
        isCompleted
      })
    }

    // Handle custom fields updates if needed
    if (customFields) {
      // This would require extending the updatePassStamps function
      // or creating a separate function for custom field updates
      console.log('Custom fields update requested (not yet implemented):', customFields)
    }

    const response: UpdatePassResponse = {
      success: true,
      message: 'Wallet pass updated successfully'
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Update pass error:', error)
    
    if (error instanceof PassKitError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          details: error.details
        } as UpdatePassResponse,
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as UpdatePassResponse,
      { status: 500 }
    )
  }
}