import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'
import { deletePass } from '@/lib/passkit-operations'
import { PassKitError } from '@/lib/passkit'

interface DeletePassRequest {
  customerLoyaltyCardId: string
  reason?: 'customer_request' | 'data_deletion' | 'account_closure' | 'other'
}

interface DeletePassResponse {
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
        { success: false, error: 'Authentication required' } as DeletePassResponse,
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
        } as DeletePassResponse,
        { status: 404 }
      )
    }

    // Parse request body
    let body: DeletePassRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' } as DeletePassResponse,
        { status: 400 }
      )
    }

    const { customerLoyaltyCardId, reason = 'other' } = body

    // Validate input
    if (!customerLoyaltyCardId) {
      return NextResponse.json(
        { success: false, error: 'customerLoyaltyCardId is required' } as DeletePassResponse,
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
          business_id
        )
      `)
      .eq('id', customerLoyaltyCardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { success: false, error: 'Customer loyalty card not found' } as DeletePassResponse,
        { status: 404 }
      )
    }

    // Validate business access
    if (card.customers.business_id !== businessId || card.loyalty_cards.business_id !== businessId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this loyalty card' } as DeletePassResponse,
        { status: 403 }
      )
    }

    // Check if pass has PassKit ID
    if (!card.passkit_id) {
      // No PassKit pass to delete, just clean up database
      const { error: updateError } = await supabase
        .from('customer_loyalty_cards')
        .update({
          passkit_id: null,
          wallet_pass_url: null,
          google_pay_url: null
        })
        .eq('id', customerLoyaltyCardId)

      if (updateError) {
        throw new Error(`Failed to clean up wallet pass data: ${updateError.message}`)
      }

      return NextResponse.json({
        success: true,
        message: 'No wallet pass found to delete, database cleaned up'
      } as DeletePassResponse, { status: 200 })
    }

    // Delete pass from PassKit
    await deletePass(card.passkit_id)

    // Clear PassKit data from database
    const { error: updateError } = await supabase
      .from('customer_loyalty_cards')
      .update({
        passkit_id: null,
        wallet_pass_url: null,
        google_pay_url: null
      })
      .eq('id', customerLoyaltyCardId)

    if (updateError) {
      console.error('Failed to clean up wallet pass data after deletion:', updateError)
      // Log but don't fail the request since PassKit pass was already deleted
    }

    // Log deletion for audit purposes
    console.log('✅ Wallet pass deleted successfully:', {
      customerLoyaltyCardId,
      passkitId: card.passkit_id,
      customerName: card.customers.name,
      loyaltyCardName: card.loyalty_cards.name,
      reason,
      deletedBy: user.email,
      deletedAt: new Date().toISOString()
    })

    const response: DeletePassResponse = {
      success: true,
      message: 'Wallet pass deleted successfully'
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Delete pass error:', error)
    
    if (error instanceof PassKitError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          details: error.details
        } as DeletePassResponse,
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as DeletePassResponse,
      { status: 500 }
    )
  }
}

// GET method for retrieving pass status
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get business ID for the user
    let businessId: string
    try {
      businessId = await getCurrentBusinessId(authSupabase, user.email!)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Business not found for user' },
        { status: 404 }
      )
    }

    // Get customerLoyaltyCardId from query params
    const url = new URL(request.url)
    const customerLoyaltyCardId = url.searchParams.get('customerLoyaltyCardId')

    if (!customerLoyaltyCardId) {
      return NextResponse.json(
        { success: false, error: 'customerLoyaltyCardId is required' },
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Get pass status
    const { data: card, error: cardError } = await supabase
      .from('customer_loyalty_cards')
      .select(`
        id,
        passkit_id,
        wallet_pass_url,
        google_pay_url,
        customers!inner (
          business_id
        )
      `)
      .eq('id', customerLoyaltyCardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { success: false, error: 'Customer loyalty card not found' },
        { status: 404 }
      )
    }

    // Validate business access
    if (card.customers.business_id !== businessId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this loyalty card' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        hasPasskitPass: !!card.passkit_id,
        passkitId: card.passkit_id,
        walletPassUrl: card.wallet_pass_url,
        googlePayUrl: card.google_pay_url
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get pass status error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}