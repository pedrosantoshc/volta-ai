import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'

interface AddStampsRequest {
  customer_id: string
  loyalty_card_id?: string
  stamps: number
}

interface AddStampsResponse {
  ok: boolean
  current_stamps: number
  status: string
  total_redeemed: number
}

interface ErrorResponse {
  error: string
  details?: string
}

interface CustomerLoyaltyCardWithCard {
  id: string
  loyalty_card_id: string
  customer_id: string
  current_stamps: number
  total_redeemed: number
  status: string
  loyalty_cards: {
    id: string
    name: string
    rules: {
      stamps_required: number
      max_stamps_per_day?: number
      expiry_days?: number
      reward_description?: string
    }
    business_id: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' } as ErrorResponse,
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
          error: 'Business not found for user', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        } as ErrorResponse,
        { status: 404 }
      )
    }

    // Parse request body
    let body: AddStampsRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' } as ErrorResponse,
        { status: 400 }
      )
    }

    const { customer_id, loyalty_card_id, stamps } = body

    // Validate input
    if (!customer_id) {
      return NextResponse.json(
        { error: 'customer_id is required' } as ErrorResponse,
        { status: 400 }
      )
    }

    if (!stamps || stamps <= 0 || !Number.isInteger(stamps)) {
      return NextResponse.json(
        { error: 'stamps must be a positive integer' } as ErrorResponse,
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Validate customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', customer_id)
      .eq('business_id', businessId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or access denied' } as ErrorResponse,
        { status: 404 }
      )
    }

    // Get customer's loyalty cards
    const { data: customerCards, error: cardsError } = await supabase
      .from('customer_loyalty_cards')
      .select(`
        *,
        loyalty_cards (
          id,
          name,
          rules,
          business_id
        )
      `)
      .eq('customer_id', customer_id)

    if (cardsError) {
      return NextResponse.json(
        { error: 'Failed to fetch customer cards', details: cardsError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    // Filter cards that belong to the business
    const validCards = (customerCards as CustomerLoyaltyCardWithCard[])?.filter((card: CustomerLoyaltyCardWithCard) => 
      card.loyalty_cards?.business_id === businessId
    ) || []

    if (validCards.length === 0) {
      return NextResponse.json(
        { error: 'Customer has no loyalty cards for this business' } as ErrorResponse,
        { status: 404 }
      )
    }

    // Resolve the loyalty card to use
    let selectedCard
    if (loyalty_card_id) {
      // Use specific card if provided
      selectedCard = validCards.find(card => card.loyalty_card_id === loyalty_card_id)
      if (!selectedCard) {
        return NextResponse.json(
          { error: 'Specified loyalty card not found for this customer' } as ErrorResponse,
          { status: 404 }
        )
      }
    } else {
      // Use the first active card if no specific card provided
      selectedCard = validCards.find(card => card.status === 'active')
      if (!selectedCard && validCards.length === 1) {
        selectedCard = validCards[0]
      }
      if (!selectedCard) {
        return NextResponse.json(
          { error: 'Multiple cards found. Please specify loyalty_card_id' } as ErrorResponse,
          { status: 400 }
        )
      }
    }

    // Get card rules
    const stampsRequired = selectedCard.loyalty_cards.rules.stamps_required
    const currentStamps = selectedCard.current_stamps || 0
    const maxStampsPerDay = selectedCard.loyalty_cards.rules.max_stamps_per_day

    // Server-side stamp limit enforcement
    if (maxStampsPerDay && maxStampsPerDay > 0) {
      // Check stamps added today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: todayStamps, error: stampError } = await supabase
        .from('stamp_transactions')
        .select('stamps_added')
        .eq('customer_loyalty_card_id', selectedCard.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      if (stampError) {
        console.error('Error checking daily stamps:', stampError)
      } else {
        const stampsToday = todayStamps?.reduce((total: number, transaction: any) => 
          total + (transaction.stamps_added || 0), 0) || 0
        
        if (stampsToday >= maxStampsPerDay) {
          return NextResponse.json(
            { error: `Limite diário de ${maxStampsPerDay} selo(s) atingido` } as ErrorResponse,
            { status: 400 }
          )
        }
      }
    }

    // Calculate new stamp count (cap at required amount)
    const newStampCount = Math.min(currentStamps + stamps, stampsRequired)

    // Determine new status
    let newStatus = selectedCard.status
    let newTotalRedeemed = selectedCard.total_redeemed || 0

    // Check if card becomes completed
    const wasCompleted = currentStamps >= stampsRequired
    const nowCompleted = newStampCount >= stampsRequired

    if (!wasCompleted && nowCompleted) {
      // Card just became completed
      newStatus = 'completed'
      newTotalRedeemed += 1
    } else if (newStampCount < stampsRequired) {
      // Card is still active
      newStatus = 'active'
    }

    // Add stamp transaction record
    console.log('Creating stamp transaction for card:', selectedCard.id, 'stamps:', stamps)
    const { error: transactionError } = await supabase
      .from('stamp_transactions')
      .insert({
        customer_loyalty_card_id: selectedCard.id,
        stamps_added: stamps,
        transaction_type: 'manual',
        notes: 'Selo adicionado manualmente via dashboard'
      })

    if (transactionError) {
      console.error('Stamp transaction error:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create stamp transaction', details: transactionError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    // Update the customer loyalty card
    const { error: updateError } = await supabase
      .from('customer_loyalty_cards')
      .update({
        current_stamps: newStampCount,
        status: newStatus,
        total_redeemed: newTotalRedeemed,
      })
      .eq('id', selectedCard.id)

    // Update customer visit count and last visit
    // First get current visit count, then increment it
    const { data: currentCustomer, error: customerFetchError } = await supabase
      .from('customers')
      .select('total_visits')
      .eq('id', customer_id)
      .single()

    if (!customerFetchError && currentCustomer) {
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          total_visits: (currentCustomer.total_visits || 0) + 1,
          last_visit: new Date().toISOString()
        })
        .eq('id', customer_id)

      if (customerUpdateError) {
        console.error('Error updating customer:', customerUpdateError)
        // Don't fail the request for this error - it's not critical
      }
    } else {
      console.error('Error fetching customer for visit update:', customerFetchError)
      // Don't fail the request for this error
    }

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update customer card', details: updateError.message } as ErrorResponse,
        { status: 500 }
      )
    }

    // Update PassKit wallet pass if enabled
    try {
      const { handleStampTransaction } = await import('@/lib/passkit-operations')
      await handleStampTransaction(selectedCard.id, stamps)
    } catch (passkitError) {
      // Log PassKit error but don't fail the stamp transaction
      console.warn('PassKit update failed, adding to retry queue:', passkitError)
      
      // Add to retry queue for automatic retry with exponential backoff
      try {
        const { addToRetryQueue } = await import('@/lib/passkit-retry-queue')
        addToRetryQueue(selectedCard.id, stamps)
      } catch (queueError) {
        console.error('Failed to add PassKit update to retry queue:', queueError)
      }
    }

    // Return success response
    const response: AddStampsResponse = {
      ok: true,
      current_stamps: newStampCount,
      status: newStatus,
      total_redeemed: newTotalRedeemed
    }

    console.log('Stamp addition successful:', {
      customer_id,
      selectedCard: selectedCard.id,
      stamps_added: stamps,
      new_total: newStampCount,
      new_status: newStatus
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Add stamps error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ErrorResponse,
      { status: 500 }
    )
  }
}