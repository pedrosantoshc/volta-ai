import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface RouteParams {
  customerCardId: string
}

/**
 * Wallet Pass API Route
 * Phase 1: Returns a placeholder/demo pass
 * Phase 2: Will generate and serve real PassKit passes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { customerCardId } = params

    if (!customerCardId) {
      return NextResponse.json(
        { error: 'Customer card ID is required' },
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Load customer loyalty card data
    const { data: customerCard, error: cardError } = await supabase
      .from('customer_loyalty_cards')
      .select(`
        *,
        customers (
          id,
          name,
          phone,
          email
        ),
        loyalty_cards (
          id,
          name,
          description,
          rules,
          design,
          businesses (
            id,
            name,
            logo_url,
            settings
          )
        )
      `)
      .eq('id', customerCardId)
      .single()

    if (cardError || !customerCard) {
      return NextResponse.json(
        { error: 'Customer card not found' },
        { status: 404 }
      )
    }

    // Phase 1: Return a placeholder HTML page that looks like a wallet pass
    // This allows users to see what the pass would look like and test the flow
    const customer = customerCard.customers
    const loyaltyCard = customerCard.loyalty_cards
    const business = loyaltyCard.businesses

    const placeholderPassHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${loyaltyCard.name} - ${business.name}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .pass-container {
            max-width: 375px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            overflow: hidden;
          }
          .pass-header {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white;
            padding: 20px;
            text-align: center;
          }
          .business-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          .business-logo {
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
          }
          .business-name {
            font-size: 18px;
            font-weight: 600;
          }
          .card-name {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
          }
          .stamps-container {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 16px;
          }
          .stamp {
            width: 32px;
            height: 32px;
            border: 2px solid rgba(255,255,255,0.6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            background: ${customerCard.current_stamps > 0 ? 'rgba(255,255,255,0.3)' : 'transparent'};
          }
          .stamp.filled {
            background: rgba(255,255,255,0.8);
            color: #7c3aed;
            border-color: rgba(255,255,255,0.8);
          }
          .progress-text {
            font-size: 14px;
            opacity: 0.9;
            text-align: center;
          }
          .pass-body {
            padding: 20px;
          }
          .customer-info {
            margin-bottom: 20px;
          }
          .customer-info h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #1f2937;
          }
          .customer-detail {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .reward-section {
            background: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .reward-title {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
          .reward-description {
            color: #6b7280;
            font-size: 14px;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .status-active {
            background: #dbeafe;
            color: #1e40af;
          }
          .status-completed {
            background: #dcfce7;
            color: #166534;
          }
          .qr-section {
            text-align: center;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .qr-placeholder {
            width: 120px;
            height: 120px;
            background: #f3f4f6;
            border-radius: 8px;
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: #9ca3af;
          }
          .qr-text {
            font-size: 12px;
            color: #6b7280;
          }
          .demo-notice {
            background: #fef3c7;
            color: #92400e;
            padding: 16px;
            text-align: center;
            font-size: 14px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="pass-container">
          <div class="demo-notice">
            📱 Demonstração - Em breve disponível na Apple Wallet e Google Pay
          </div>
          
          <div class="pass-header">
            <div class="business-info">
              <div class="business-logo">
                ${business.name.charAt(0)}
              </div>
              <div class="business-name">${business.name}</div>
            </div>
            
            <div class="card-name">${loyaltyCard.name}</div>
            
            <div class="stamps-container">
              ${Array.from({ length: loyaltyCard.rules?.stamps_required || 10 }).map((_, i) => 
                `<div class="stamp ${i < customerCard.current_stamps ? 'filled' : ''}">${i < customerCard.current_stamps ? '⭐' : ''}</div>`
              ).join('')}
            </div>
            
            <div class="progress-text">
              ${customerCard.current_stamps} de ${loyaltyCard.rules?.stamps_required || 10} selos coletados
            </div>
          </div>
          
          <div class="pass-body">
            <div class="customer-info">
              <h3>${customer.name}</h3>
              <div class="customer-detail">📱 ${customer.phone}</div>
              ${customer.email ? `<div class="customer-detail">📧 ${customer.email}</div>` : ''}
              <div style="margin-top: 12px;">
                <span class="status-badge status-${customerCard.status}">
                  ${customerCard.status === 'active' ? 'Ativo' : customerCard.status === 'completed' ? 'Completado' : customerCard.status}
                </span>
              </div>
            </div>
            
            <div class="reward-section">
              <div class="reward-title">🎁 Sua Recompensa</div>
              <div class="reward-description">
                ${loyaltyCard.rules?.reward_description || 'Recompensa especial ao completar o cartão!'}
              </div>
            </div>
          </div>
          
          <div class="qr-section">
            <div class="qr-placeholder">
              📱
            </div>
            <div class="qr-text">
              Apresente este cartão no estabelecimento<br>
              ID: ${customerCard.qr_code}
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    return new NextResponse(placeholderPassHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Wallet pass error:', error)
    return NextResponse.json(
      { error: 'Failed to generate wallet pass' },
      { status: 500 }
    )
  }
}

/**
 * Phase 2 implementation will:
 * 1. Generate actual PassKit passes with proper JSON structure
 * 2. Include proper images, colors, and branding from business settings
 * 3. Sign passes with Apple certificates
 * 4. Store passes in Supabase Storage
 * 5. Handle pass updates and push notifications
 * 6. Support both Apple Wallet (.pkpass) and Google Pay passes
 */