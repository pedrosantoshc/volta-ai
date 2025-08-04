import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const {
      cardId,
      name,
      phone,
      email,
      customFields,
      consent
    } = await request.json()

    console.log('Enrollment request received:', { cardId, name, phone: phone?.substring(0, 5) + 'XXX' })

    if (!cardId || !name || !phone) {
      console.error('Missing required fields:', { cardId: !!cardId, name: !!name, phone: !!phone })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create server-side Supabase client with service role for elevated permissions
    // Try service role first, fallback to anon key if not available
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = await createClient(hasServiceRole)
    
    console.log('Supabase client created successfully', { useServiceRole: hasServiceRole })

    // Get loyalty card and business info
    const { data: loyaltyCard, error: cardError } = await supabase
      .from('loyalty_cards')
      .select(`
        *,
        businesses (
          id,
          name,
          logo_url,
          settings
        )
      `)
      .eq('id', cardId)
      .single()

    if (cardError || !loyaltyCard) {
      console.error('Loyalty card error:', cardError)
      return NextResponse.json(
        { error: 'Loyalty card not found' },
        { status: 404 }
      )
    }

    const business = loyaltyCard.businesses
    console.log('Business found:', business?.name)

    // Check if customer already exists (by phone and business)  
    const { data: existingCustomer, error: customerCheckError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .eq('phone', phone)
      .single()

    if (customerCheckError && customerCheckError.code !== 'PGRST116') {
      console.error('Error checking existing customer:', customerCheckError)
    }

    let customerId: string

    if (existingCustomer) {
      // Update existing customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name,
          email: email || null,
          custom_fields: customFields || {},
          consent: {
            ...consent,
            consent_date: new Date().toISOString()
          }
        })
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (updateError) {
        console.error('Customer update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update customer' },
          { status: 500 }
        )
      }

      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          business_id: business.id,
          name,
          phone,
          email: email || null,
          custom_fields: customFields || {},
          consent: {
            ...consent,
            consent_date: new Date().toISOString()
          },
          enrollment_date: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Customer creation error:', createError)
        console.error('Customer creation data:', {
          business_id: business.id,
          name,
          phone,
          email: email || null,
          customFields: customFields || {},
        })
        return NextResponse.json(
          { error: `Failed to create customer: ${createError.message}`, details: createError },
          { status: 500 }
        )
      }

      console.log('Customer created successfully:', newCustomer.id)
      customerId = newCustomer.id
    }

    // Check if customer already has this loyalty card
    const { data: existingCard } = await supabase
      .from('customer_loyalty_cards')
      .select('*')
      .eq('customer_id', customerId)
      .eq('loyalty_card_id', loyaltyCard.id)
      .single()

    if (!existingCard) {
      // Create customer loyalty card instance
      const qrCode = `${customerId}-${loyaltyCard.id}-${Date.now()}`
      
      const { error: cardError } = await supabase
        .from('customer_loyalty_cards')
        .insert({
          customer_id: customerId,
          loyalty_card_id: loyaltyCard.id,
          current_stamps: 0,
          total_redeemed: 0,
          qr_code: qrCode,
          status: 'active'
        })

      if (cardError) {
        console.error('Loyalty card creation error:', cardError)
        return NextResponse.json(
          { error: 'Failed to create loyalty card' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Enrollment successful'
    })

  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}