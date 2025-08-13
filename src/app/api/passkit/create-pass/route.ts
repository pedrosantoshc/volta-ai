import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'
import { createCustomerLoyaltyPass } from '@/lib/passkit-operations'
import { PassKitError } from '@/lib/passkit'

interface CreatePassRequest {
  customerId: string
  loyaltyCardId: string
}

interface CreatePassResponse {
  success: boolean
  data?: {
    id: string
    passkit_id: string
    wallet_pass_url: string
    google_pay_url: string
    qr_code: string
  }
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
        { success: false, error: 'Authentication required' } as CreatePassResponse,
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
        } as CreatePassResponse,
        { status: 404 }
      )
    }

    // Parse request body
    let body: CreatePassRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' } as CreatePassResponse,
        { status: 400 }
      )
    }

    const { customerId, loyaltyCardId } = body

    // Validate input
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' } as CreatePassResponse,
        { status: 400 }
      )
    }

    if (!loyaltyCardId) {
      return NextResponse.json(
        { success: false, error: 'loyaltyCardId is required' } as CreatePassResponse,
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Validate customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found or access denied' } as CreatePassResponse,
        { status: 404 }
      )
    }

    // Validate loyalty card belongs to business and has wallet enabled
    const { data: loyaltyCard, error: loyaltyCardError } = await supabase
      .from('loyalty_cards')
      .select('id, name, wallet_enabled')
      .eq('id', loyaltyCardId)
      .eq('business_id', businessId)
      .single()

    if (loyaltyCardError || !loyaltyCard) {
      return NextResponse.json(
        { success: false, error: 'Loyalty card not found or access denied' } as CreatePassResponse,
        { status: 404 }
      )
    }

    if (!loyaltyCard.wallet_enabled) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet integration not enabled for this loyalty card',
          details: 'Enable wallet integration in the loyalty card settings first'
        } as CreatePassResponse,
        { status: 400 }
      )
    }

    // Create wallet pass
    const passData = await createCustomerLoyaltyPass(customerId, loyaltyCardId)

    if (!passData) {
      return NextResponse.json(
        { success: false, error: 'Failed to create wallet pass' } as CreatePassResponse,
        { status: 500 }
      )
    }

    // Return success response
    const response: CreatePassResponse = {
      success: true,
      data: {
        id: passData.id,
        passkit_id: passData.passkit_id!,
        wallet_pass_url: passData.wallet_pass_url!,
        google_pay_url: passData.google_pay_url!,
        qr_code: passData.qr_code || ''
      }
    }

    console.log('✅ Wallet pass created successfully:', {
      customerId,
      loyaltyCardId,
      passId: passData.passkit_id
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Create pass error:', error)
    
    if (error instanceof PassKitError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          details: error.details
        } as CreatePassResponse,
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as CreatePassResponse,
      { status: 500 }
    )
  }
}