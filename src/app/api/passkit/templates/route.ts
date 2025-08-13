import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'
import { 
  createTemplate, 
  updateTemplate, 
  deleteTemplate, 
  getTemplate,
  CreateTemplateRequest 
} from '@/lib/passkit-templates'
import { PassKitError } from '@/lib/passkit'

interface CreateTemplateResponse {
  success: boolean
  templateId?: string
  error?: string
  details?: string
}

interface TemplateActionRequest {
  loyaltyCardId: string
  action: 'create' | 'update' | 'delete' | 'get'
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as CreateTemplateResponse,
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
        } as CreateTemplateResponse,
        { status: 404 }
      )
    }

    // Parse request body
    let body: TemplateActionRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' } as CreateTemplateResponse,
        { status: 400 }
      )
    }

    const { loyaltyCardId, action } = body

    // Validate input
    if (!loyaltyCardId) {
      return NextResponse.json(
        { success: false, error: 'loyaltyCardId is required' } as CreateTemplateResponse,
        { status: 400 }
      )
    }

    if (!action || !['create', 'update', 'delete', 'get'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid action is required (create, update, delete, get)' } as CreateTemplateResponse,
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Get loyalty card and business data
    const { data: loyaltyCard, error: loyaltyCardError } = await supabase
      .from('loyalty_cards')
      .select(`
        *,
        businesses (
          id,
          name,
          logo_url
        )
      `)
      .eq('id', loyaltyCardId)
      .eq('business_id', businessId)
      .single()

    if (loyaltyCardError || !loyaltyCard) {
      return NextResponse.json(
        { success: false, error: 'Loyalty card not found or access denied' } as CreateTemplateResponse,
        { status: 404 }
      )
    }

    // Prepare template request data
    const templateRequest: CreateTemplateRequest = {
      loyaltyCardId: loyaltyCard.id,
      businessName: loyaltyCard.businesses.name,
      loyaltyCardName: loyaltyCard.name,
      description: loyaltyCard.description || `Programa de fidelidade ${loyaltyCard.name}`,
      design: {
        background_color: loyaltyCard.design?.background_color || '#8B4513',
        foreground_color: loyaltyCard.design?.foreground_color || '#FFFFFF',
        label_color: loyaltyCard.design?.label_color || '#FFFFFF',
        logo_url: loyaltyCard.businesses.logo_url || loyaltyCard.design?.logo_url,
        stamp_icon: loyaltyCard.design?.stamp_icon || 'star'
      },
      rules: {
        stamps_required: loyaltyCard.rules?.stamps_required || 10,
        reward_description: loyaltyCard.rules?.reward_description || 'Recompensa especial',
        max_stamps_per_day: loyaltyCard.rules?.max_stamps_per_day,
        expiry_days: loyaltyCard.rules?.expiry_days
      }
    }

    let response: CreateTemplateResponse

    // Handle different actions
    switch (action) {
      case 'create':
        try {
          const templateId = await createTemplate(templateRequest)
          
          // Update loyalty card with template reference (could be stored in design field)
          await supabase
            .from('loyalty_cards')
            .update({
              design: {
                ...loyaltyCard.design,
                passkit_template_id: templateId
              }
            })
            .eq('id', loyaltyCardId)

          response = {
            success: true,
            templateId,
          }
          
          console.log('✅ PassKit template created:', { loyaltyCardId, templateId })
        } catch (error) {
          throw error
        }
        break

      case 'update':
        try {
          const existingTemplateId = loyaltyCard.design?.passkit_template_id
          if (!existingTemplateId) {
            return NextResponse.json(
              { success: false, error: 'No template found to update. Create template first.' } as CreateTemplateResponse,
              { status: 404 }
            )
          }

          await updateTemplate(existingTemplateId, templateRequest)
          
          response = {
            success: true,
            templateId: existingTemplateId
          }
          
          console.log('✅ PassKit template updated:', { loyaltyCardId, templateId: existingTemplateId })
        } catch (error) {
          throw error
        }
        break

      case 'delete':
        try {
          const existingTemplateId = loyaltyCard.design?.passkit_template_id
          if (!existingTemplateId) {
            return NextResponse.json(
              { success: false, error: 'No template found to delete' } as CreateTemplateResponse,
              { status: 404 }
            )
          }

          await deleteTemplate(existingTemplateId)
          
          // Remove template reference from loyalty card
          const updatedDesign = { ...loyaltyCard.design }
          delete updatedDesign.passkit_template_id
          
          await supabase
            .from('loyalty_cards')
            .update({ design: updatedDesign })
            .eq('id', loyaltyCardId)

          response = {
            success: true,
            templateId: existingTemplateId
          }
          
          console.log('✅ PassKit template deleted:', { loyaltyCardId, templateId: existingTemplateId })
        } catch (error) {
          throw error
        }
        break

      case 'get':
        try {
          const existingTemplateId = loyaltyCard.design?.passkit_template_id
          if (!existingTemplateId) {
            return NextResponse.json(
              { success: false, error: 'No template found' } as CreateTemplateResponse,
              { status: 404 }
            )
          }

          const template = await getTemplate(existingTemplateId)
          
          response = {
            success: true,
            templateId: existingTemplateId,
            details: template ? JSON.stringify(template) : 'Template not found'
          }
        } catch (error) {
          throw error
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' } as CreateTemplateResponse,
          { status: 400 }
        )
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Template management error:', error)
    
    if (error instanceof PassKitError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          details: error.details
        } as CreateTemplateResponse,
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as CreateTemplateResponse,
      { status: 500 }
    )
  }
}

// GET method for bulk template operations
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

    // Use service role client for database operations
    const supabase = await createClient(true)

    // Get all loyalty cards with wallet integration enabled
    const { data: loyaltyCards, error: loyaltyCardsError } = await supabase
      .from('loyalty_cards')
      .select('id, name, wallet_enabled, design')
      .eq('business_id', businessId)
      .eq('wallet_enabled', true)
      .eq('is_active', true)

    if (loyaltyCardsError) {
      throw new Error(`Failed to fetch loyalty cards: ${loyaltyCardsError.message}`)
    }

    // Analyze template status
    const templateStatus = loyaltyCards?.map((card: { id: string; name: string; wallet_enabled: boolean }) => ({
      loyaltyCardId: card.id,
      loyaltyCardName: card.name,
      walletEnabled: card.wallet_enabled,
      hasTemplate: !!card.design?.passkit_template_id,
      templateId: card.design?.passkit_template_id || null
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        totalCards: loyaltyCards?.length || 0,
        cardsWithTemplates: templateStatus.filter(card => card.hasTemplate).length,
        cardsWithoutTemplates: templateStatus.filter(card => !card.hasTemplate).length,
        cards: templateStatus
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get template status error:', error)
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