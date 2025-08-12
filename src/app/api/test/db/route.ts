import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Test various database operations
    const tests = []

    // Test 1: Check if businesses table exists
    try {
      const { data: businesses, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, email')
        .limit(5)

      tests.push({
        name: 'businesses_table',
        success: !businessError,
        error: businessError?.message,
        data: businesses
      })
    } catch (error) {
      tests.push({
        name: 'businesses_table',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Check if stamp_transactions table exists
    try {
      const { data: transactions, error: transactionError } = await supabase
        .from('stamp_transactions')
        .select('id')
        .limit(1)

      tests.push({
        name: 'stamp_transactions_table',
        success: !transactionError,
        error: transactionError?.message,
        data: transactions
      })
    } catch (error) {
      tests.push({
        name: 'stamp_transactions_table',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Check business lookup by user email
    try {
      const { data: business, error: businessLookupError } = await supabase
        .from('businesses')
        .select('id, name, email')
        .eq('email', user.email!)
        .single()

      tests.push({
        name: 'business_lookup',
        success: !businessLookupError && !!business,
        error: businessLookupError?.message,
        data: business
      })
    } catch (error) {
      tests.push({
        name: 'business_lookup',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      user_email: user.email,
      tests,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}