import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCustomerInsights } from '@/lib/deepseek-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get business context
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get customers data
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select(`
        *,
        customer_loyalty_cards (
          id,
          current_stamps,
          status,
          total_redeemed,
          loyalty_card:loyalty_cards (
            rules
          )
        )
      `)
      .eq('business_id', businessId)

    if (customersError) {
      console.error('Error loading customers:', customersError)
      return NextResponse.json({ error: 'Failed to load customer data' }, { status: 500 })
    }

    // Get recent transactions
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data: recentTransactions, error: transactionsError } = await supabase
      .from('stamp_transactions')
      .select(`
        *,
        customer_loyalty_cards (
          customer:customers (
            enrollment_date
          )
        )
      `)
      .gte('created_at', oneWeekAgo.toISOString())

    if (transactionsError) {
      console.error('Error loading transactions:', transactionsError)
    }

    // Get loyalty cards count
    const { data: loyaltyCards } = await supabase
      .from('loyalty_cards')
      .select('id')
      .eq('business_id', businessId)

    const { count: totalCards } = await supabase
      .from('customer_loyalty_cards')
      .select('*', { count: 'exact', head: true })
      .in('loyalty_card_id', loyaltyCards?.map(card => card.id) || [])

    // Build business context
    const businessContext = {
      businessName: business.name,
      businessType: business.settings?.business_type || 'restaurant',
      aiTone: business.settings?.ai_tone || 'amigável',
      brandVoice: business.settings?.brand_voice,
      totalCustomers: customers?.length || 0,
      totalCards: totalCards || 0,
      recentActivity: {
        stampsThisWeek: recentTransactions?.length || 0,
        newCustomersThisWeek: recentTransactions?.filter(t => 
          t.customer_loyalty_cards?.customer?.enrollment_date &&
          new Date(t.customer_loyalty_cards.customer.enrollment_date) >= oneWeekAgo
        ).length || 0,
        completedCardsThisWeek: customers?.filter(c =>
          c.customer_loyalty_cards?.some((card: any) => card.status === 'completed')
        ).length || 0
      }
    }

    // Generate insights using DeepSeek AI
    const insights = await generateCustomerInsights(
      customers || [],
      loyaltyCards || [],
      recentTransactions || [],
      businessContext
    )

    return NextResponse.json({
      insights,
      businessContext
    })
  } catch (error) {
    console.error('AI insights API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'AI Insights API' })
}