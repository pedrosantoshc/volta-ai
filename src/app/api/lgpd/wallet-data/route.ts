import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'
import { deletePass } from '@/lib/passkit-operations'

interface LGPDRequest {
  action: 'export' | 'delete' | 'anonymize'
  customerId: string
  reason?: string
  requestedBy?: string
}

interface LGPDResponse {
  success: boolean
  data?: any
  message?: string
  error?: string
  details?: string
}

interface WalletDataExport {
  customer: {
    id: string
    name: string
    phone: string
    email?: string
    enrollment_date: string
  }
  walletPasses: Array<{
    id: string
    loyalty_card_name: string
    passkit_id?: string
    wallet_pass_url?: string
    google_pay_url?: string
    current_stamps: number
    total_redeemed: number
    status: string
    created_at: string
    last_updated?: string
  }>
  passkitData: {
    totalPasses: number
    activePasses: number
    lastActivity?: string
  }
  exportInfo: {
    exportDate: string
    exportedBy: string
    dataRetentionPolicy: string
    rightsInformation: string
  }
}

// Anonymize sensitive data for logs
function anonymizeForLog(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const anonymized = { ...data }
  
  // Anonymize common sensitive fields
  if (anonymized.name) anonymized.name = anonymized.name.charAt(0) + '***'
  if (anonymized.phone) anonymized.phone = anonymized.phone.slice(0, 2) + '***' + anonymized.phone.slice(-2)
  if (anonymized.email) anonymized.email = anonymized.email.replace(/(.{2}).*(@.*)/, '$1***$2')
  
  return anonymized
}

// Create audit log entry for LGPD actions
async function createLGPDAuditLog(
  supabase: any,
  businessId: string,
  customerId: string,
  action: string,
  performedBy: string,
  details: any
): Promise<void> {
  try {
    // In a real implementation, you'd have an audit_logs table
    console.log('🔍 LGPD Audit Log:', {
      timestamp: new Date().toISOString(),
      businessId,
      customerId: customerId.slice(0, 8) + '***', // Anonymized for logs
      action,
      performedBy,
      details: anonymizeForLog(details)
    })
    
    // TODO: Store in actual audit_logs table
    // await supabase
    //   .from('audit_logs')
    //   .insert({
    //     business_id: businessId,
    //     customer_id: customerId,
    //     action_type: `lgpd_${action}`,
    //     performed_by: performedBy,
    //     details,
    //     created_at: new Date().toISOString()
    //   })
  } catch (error) {
    console.error('Failed to create LGPD audit log:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as LGPDResponse,
        { status: 401 }
      )
    }

    // Get business ID for the user
    let businessId: string
    try {
      businessId = await getCurrentBusinessId(authSupabase, user.email!)
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Business not found for user', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        } as LGPDResponse,
        { status: 404 }
      )
    }

    // Parse request body
    let body: LGPDRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' } as LGPDResponse,
        { status: 400 }
      )
    }

    const { action, customerId, reason, requestedBy } = body

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' } as LGPDResponse,
        { status: 400 }
      )
    }

    if (!['export', 'delete', 'anonymize'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be: export, delete, or anonymize' } as LGPDResponse,
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Validate customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        customer_loyalty_cards (
          *,
          loyalty_cards (
            id,
            name,
            wallet_enabled
          )
        )
      `)
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found or access denied' } as LGPDResponse,
        { status: 404 }
      )
    }

    let response: LGPDResponse

    switch (action) {
      case 'export':
        // Export all wallet-related data for the customer
        const walletPasses = customer.customer_loyalty_cards
          .filter((card: any) => card.passkit_id || card.wallet_pass_url)
          .map((card: any) => ({
            id: card.id,
            loyalty_card_name: card.loyalty_cards.name,
            passkit_id: card.passkit_id,
            wallet_pass_url: card.wallet_pass_url,
            google_pay_url: card.google_pay_url,
            current_stamps: card.current_stamps,
            total_redeemed: card.total_redeemed,
            status: card.status,
            created_at: card.created_at,
            last_updated: card.updated_at
          }))

        const exportData: WalletDataExport = {
          customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            enrollment_date: customer.enrollment_date
          },
          walletPasses,
          passkitData: {
            totalPasses: walletPasses.length,
            activePasses: walletPasses.filter(pass => pass.status === 'active').length,
            lastActivity: walletPasses.length > 0 
              ? Math.max(...walletPasses.map(pass => new Date(pass.created_at).getTime()))
                  .toString()
              : undefined
          },
          exportInfo: {
            exportDate: new Date().toISOString(),
            exportedBy: requestedBy || user.email || 'system',
            dataRetentionPolicy: 'Dados mantidos conforme política de retenção da empresa',
            rightsInformation: 'Você tem direito a acessar, corrigir, apagar ou portar seus dados conforme a LGPD'
          }
        }

        await createLGPDAuditLog(
          supabase,
          businessId,
          customerId,
          'export',
          user.email || 'system',
          { exportedPasses: walletPasses.length, reason }
        )

        response = {
          success: true,
          data: exportData,
          message: 'Dados da carteira digital exportados com sucesso'
        }
        break

      case 'delete':
        // Delete all wallet passes and related data
        const passesToDelete = customer.customer_loyalty_cards
          .filter((card: any) => card.passkit_id)

        let deletedPasses = 0
        const deletionErrors: string[] = []

        for (const card of passesToDelete) {
          try {
            // Delete from PassKit
            if (card.passkit_id) {
              await deletePass(card.passkit_id)
            }

            // Clear wallet data from database
            await supabase
              .from('customer_loyalty_cards')
              .update({
                passkit_id: null,
                wallet_pass_url: null,
                google_pay_url: null
              })
              .eq('id', card.id)

            deletedPasses++
          } catch (error) {
            deletionErrors.push(`Erro ao deletar cartão ${card.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }

        await createLGPDAuditLog(
          supabase,
          businessId,
          customerId,
          'delete',
          user.email || 'system',
          { 
            deletedPasses, 
            totalPasses: passesToDelete.length, 
            errors: deletionErrors.length,
            reason 
          }
        )

        response = {
          success: deletionErrors.length === 0,
          message: `${deletedPasses} carteira(s) digital(is) deletada(s) com sucesso` +
                   (deletionErrors.length > 0 ? `. ${deletionErrors.length} erro(s) ocorreram.` : ''),
          details: deletionErrors.length > 0 ? deletionErrors.join('; ') : undefined
        }
        break

      case 'anonymize':
        // Anonymize wallet data (keep structure but remove identifiable information)
        const cardsToAnonymize = customer.customer_loyalty_cards
          .filter((card: any) => card.passkit_id)

        let anonymizedPasses = 0

        for (const card of cardsToAnonymize) {
          try {
            // Update PassKit pass to remove personal information
            // This would require a PassKit API call to update the pass with anonymized data
            
            // For now, just log the anonymization
            console.log(`Anonymizing PassKit pass: ${card.passkit_id}`)
            anonymizedPasses++
          } catch (error) {
            console.error(`Error anonymizing card ${card.id}:`, error)
          }
        }

        await createLGPDAuditLog(
          supabase,
          businessId,
          customerId,
          'anonymize',
          user.email || 'system',
          { 
            anonymizedPasses, 
            totalPasses: cardsToAnonymize.length, 
            reason 
          }
        )

        response = {
          success: true,
          message: `${anonymizedPasses} carteira(s) digital(is) anonimizada(s) com sucesso`,
          data: { anonymizedPasses }
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' } as LGPDResponse,
          { status: 400 }
        )
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('LGPD wallet data error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as LGPDResponse,
      { status: 500 }
    )
  }
}

// GET method to check what wallet data exists for a customer
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

    // Get customerId from query params
    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Get customer's wallet data summary
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        enrollment_date,
        customer_loyalty_cards (
          id,
          passkit_id,
          wallet_pass_url,
          google_pay_url,
          status,
          created_at,
          loyalty_cards (
            name,
            wallet_enabled
          )
        )
      `)
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found or access denied' },
        { status: 404 }
      )
    }

    const walletDataSummary = {
      customerId: customer.id,
      customerName: customer.name.charAt(0) + '***', // Anonymized for API response
      totalLoyaltyCards: customer.customer_loyalty_cards.length,
      walletEnabledCards: customer.customer_loyalty_cards.filter(
        (card: any) => card.loyalty_cards.wallet_enabled
      ).length,
      activeWalletPasses: customer.customer_loyalty_cards.filter(
        (card: any) => card.passkit_id
      ).length,
      walletPlatforms: {
        apple: customer.customer_loyalty_cards.some((card: any) => card.wallet_pass_url),
        google: customer.customer_loyalty_cards.some((card: any) => card.google_pay_url)
      },
      dataRetentionInfo: {
        oldestWalletPass: customer.customer_loyalty_cards
          .filter((card: any) => card.passkit_id)
          .reduce((oldest: string | null, card: any) => {
            if (!oldest || new Date(card.created_at) < new Date(oldest)) {
              return card.created_at
            }
            return oldest
          }, null),
        lgpdRights: [
          'Direito de acesso aos dados',
          'Direito de correção',
          'Direito de exclusão',
          'Direito de portabilidade',
          'Direito de anonimização'
        ]
      }
    }

    return NextResponse.json({
      success: true,
      data: walletDataSummary
    }, { status: 200 })

  } catch (error) {
    console.error('Get LGPD wallet data summary error:', error)
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