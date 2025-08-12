import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'

export async function POST(request: NextRequest) {
  try {
    const { customerId, loyaltyCardId } = await request.json()

    if (!customerId || !loyaltyCardId) {
      return NextResponse.json(
        { error: 'Customer ID and Loyalty Card ID are required' },
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Verify the loyalty card belongs to the correct business
    const { data: cardData, error: cardError } = await supabase
      .from('loyalty_cards')
      .select('business_id')
      .eq('id', loyaltyCardId)
      .eq('is_active', true)
      .single()

    if (cardError || !cardData) {
      return NextResponse.json(
        { error: 'Loyalty card not found or inactive' },
        { status: 404 }
      )
    }

    // Verify the customer belongs to the same business
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('business_id, name')
      .eq('id', customerId)
      .single()

    if (customerError || !customerData) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (customerData.business_id !== cardData.business_id) {
      return NextResponse.json(
        { error: 'Customer and loyalty card do not belong to the same business' },
        { status: 403 }
      )
    }

    // Generate QR code for this customer-card combination
    const qrCode = `${customerId}-${loyaltyCardId}-${Date.now()}`

    // Create customer loyalty card entry
    const { data: customerCardData, error: customerCardError } = await supabase
      .from('customer_loyalty_cards')
      .insert({
        customer_id: customerId,
        loyalty_card_id: loyaltyCardId,
        current_stamps: 0,
        total_redeemed: 0,
        status: 'active',
        qr_code: qrCode
      })
      .select('id')
      .single()

    if (customerCardError) {
      console.error('Error creating customer loyalty card:', customerCardError)
      return NextResponse.json(
        { error: 'Failed to assign card to customer' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Card assigned to ${customerData.name}`,
      customerCardId: customerCardData.id
    })

  } catch (error) {
    console.error('Assign card error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}