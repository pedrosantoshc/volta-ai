import { getPassKitSDK, safePassKitOperation, LoyaltyPassData, PassResponse, UpdatePassData } from './passkit'
import { createClient } from './supabase-server'
import { 
  generatePrivacyCompliantPassData, 
  createPrivacyAuditEntry, 
  validateLGPDCompliance
} from './privacy-utils'

// Customer and loyalty card data interfaces
export interface CustomerData {
  id: string
  name: string
  email?: string
  phone: string
}

export interface LoyaltyCardData {
  id: string
  name: string
  description: string
  rules: {
    stamps_required: number
    reward_description: string
    expiry_days?: number
  }
}

export interface CustomerLoyaltyCardData {
  id: string
  customer_id: string
  loyalty_card_id: string
  current_stamps: number
  total_redeemed: number
  status: string
  passkit_id?: string
  wallet_pass_url?: string
  google_pay_url?: string
  qr_code?: string
}

// Create a new loyalty pass for a customer
export async function createLoyaltyPass(
  customer: CustomerData,
  loyaltyCard: LoyaltyCardData,
  _customerLoyaltyCardId: string
): Promise<PassResponse> {
  // Generate privacy-compliant pass data
  const privacyCompliantData = generatePrivacyCompliantPassData(
    customer,
    { ...loyaltyCard, businessId: 'business-id' } // TODO: Pass actual business ID
  )

  const passData: LoyaltyPassData = {
    templateId: loyaltyCard.id,
    externalId: privacyCompliantData.externalId, // Use privacy-safe external ID
    person: privacyCompliantData.person,
    fields: {
      balance: {
        value: `0/${loyaltyCard.rules.stamps_required}`
      },
      reward: {
        value: loyaltyCard.rules.reward_description,
        label: 'Recompensa'
      }
    }
  }

  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    if (!sdk) {
      throw new Error('PassKit SDK not available')
    }
    const response = await sdk.Members.createMember(passData)
    
    // Log with anonymized data for privacy compliance
    console.log('✅ Created PassKit pass:', {
      passId: response.id,
      customerRef: privacyCompliantData.metadata.customerReference,
      loyaltyCardId: loyaltyCard.id,
      privacyCompliant: privacyCompliantData.metadata.privacyCompliant
    })
    
    // Create privacy audit entry
    const auditEntry = createPrivacyAuditEntry(
      'data_export', // PassKit pass creation involves data export to PassKit
      customer.id,
      'system',
      {
        action: 'passkit_pass_created',
        passId: response.id,
        loyaltyCardId: loyaltyCard.id
      },
      ['Dados minimizados enviados para PassKit', 'External ID não-identificável usado']
    )
    
    console.log('🔍 Privacy audit entry created:', {
      timestamp: auditEntry.timestamp,
      action: auditEntry.action,
      customerId: auditEntry.customerId,
      performedBy: auditEntry.performedBy
    })
    
    return response
  }, 'pass creation')
}

// Update pass with new stamp count
export async function updatePassStamps(
  passkitId: string,
  newStampCount: number,
  totalRequired: number,
  rewardDescription: string,
  isCompleted: boolean = false
): Promise<void> {
  const updateData: UpdatePassData = {
    id: passkitId,
    fields: {
      balance: {
        value: `${newStampCount}/${totalRequired}`,
        label: 'Selos Coletados'
      }
    }
  }

  // Update status if card is completed
  if (isCompleted) {
    updateData.fields.status = {
      value: 'Recompensa Disponível! 🎉',
      label: 'Status'
    }
  }

  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    if (!sdk) {
      throw new Error('PassKit SDK not available')
    }
    await sdk.Members.updateMember(updateData)
    
    console.log('✅ Updated PassKit pass stamps:', {
      passId: passkitId,
      newStampCount,
      totalRequired,
      isCompleted
    })
  }, 'pass update')
}

// Delete a pass (for LGPD compliance)
export async function deletePass(passkitId: string): Promise<void> {
  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    if (!sdk) {
      throw new Error('PassKit SDK not available')
    }
    await sdk.Members.deleteMember(passkitId)
    
    console.log('✅ Deleted PassKit pass:', { passId: passkitId })
  }, 'pass deletion')
}

// Create pass and save to database
export async function createCustomerLoyaltyPass(
  customerId: string,
  loyaltyCardId: string
): Promise<CustomerLoyaltyCardData | null> {
  const supabase = await createClient(true)

  try {
    // Get customer data with consent information
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone, consent, enrollment_date')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      throw new Error(`Customer not found: ${customerId}`)
    }

    // LGPD Compliance: Validate consent for wallet integration
    if (!customer.consent?.lgpd_accepted) {
      throw new Error('LGPD consent required for wallet integration')
    }

    // LGPD Compliance: Validate data for wallet pass creation
    const complianceCheck = validateLGPDCompliance({
      customerId: customer.id,
      personalDataStored: ['name', 'phone', ...(customer.email ? ['email'] : [])],
      consentDate: customer.consent?.consent_date,
      createdAt: customer.enrollment_date || new Date().toISOString()
    })

    if (!complianceCheck.isCompliant) {
      console.warn('⚠️ LGPD compliance issues detected:', {
        customerId: customer.id.slice(0, 8) + '***',
        issues: complianceCheck.issues,
        recommendations: complianceCheck.recommendations
      })
      
      // For non-critical issues, proceed but log warnings
      // For critical issues (like missing consent), throw error
      const criticalIssues = complianceCheck.issues.filter(issue => 
        issue.includes('consentimento') || issue.includes('retenção')
      )
      
      if (criticalIssues.length > 0) {
        throw new Error(`LGPD compliance error: ${criticalIssues.join(', ')}`)
      }
    }

    // Get loyalty card data
    const { data: loyaltyCard, error: loyaltyCardError } = await supabase
      .from('loyalty_cards')
      .select('id, name, description, rules, wallet_enabled')
      .eq('id', loyaltyCardId)
      .single()

    if (loyaltyCardError || !loyaltyCard) {
      throw new Error(`Loyalty card not found: ${loyaltyCardId}`)
    }

    // Check if wallet is enabled for this card
    if (!loyaltyCard.wallet_enabled) {
      throw new Error(`Wallet integration not enabled for loyalty card: ${loyaltyCardId}`)
    }

    // Check if customer already has this loyalty card
    const { data: existingCard } = await supabase
      .from('customer_loyalty_cards')
      .select('id, passkit_id, wallet_pass_url, google_pay_url')
      .eq('customer_id', customerId)
      .eq('loyalty_card_id', loyaltyCardId)
      .single()

    if (existingCard) {
      // If pass already exists, return existing data
      if (existingCard.passkit_id) {
        console.log('✅ Pass already exists for customer:', { customerId, loyaltyCardId })
        return existingCard as CustomerLoyaltyCardData
      }
    }

    // Create PassKit pass
    const passResponse = await createLoyaltyPass(
      customer,
      loyaltyCard,
      existingCard?.id || ''
    )

    // Update or create customer loyalty card record
    if (existingCard) {
      // Update existing record
      const { data: updatedCard, error: updateError } = await supabase
        .from('customer_loyalty_cards')
        .update({
          passkit_id: passResponse.id,
          wallet_pass_url: passResponse.appleWalletUrl,
          google_pay_url: passResponse.googlePayUrl,
          qr_code: passResponse.qrCode
        })
        .eq('id', existingCard.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update customer loyalty card: ${updateError.message}`)
      }

      return updatedCard as CustomerLoyaltyCardData
    } else {
      // Create new record
      const { data: newCard, error: insertError } = await supabase
        .from('customer_loyalty_cards')
        .insert({
          customer_id: customerId,
          loyalty_card_id: loyaltyCardId,
          current_stamps: 0,
          total_redeemed: 0,
          status: 'active',
          passkit_id: passResponse.id,
          wallet_pass_url: passResponse.appleWalletUrl,
          google_pay_url: passResponse.googlePayUrl,
          qr_code: passResponse.qrCode
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to create customer loyalty card: ${insertError.message}`)
      }

      return newCard as CustomerLoyaltyCardData
    }

  } catch (error) {
    console.error('Error creating customer loyalty pass:', error)
    throw error
  }
}

// Handle stamp transaction and update pass
export async function handleStampTransaction(
  customerLoyaltyCardId: string,
  stampsAdded: number
): Promise<void> {
  const supabase = await createClient(true)

  try {
    // Get current card data
    const { data: card, error: cardError } = await supabase
      .from('customer_loyalty_cards')
      .select(`
        *,
        loyalty_cards (
          id,
          name,
          rules,
          wallet_enabled
        )
      `)
      .eq('id', customerLoyaltyCardId)
      .single()

    if (cardError || !card) {
      throw new Error(`Customer loyalty card not found: ${customerLoyaltyCardId}`)
    }

    // Skip if wallet not enabled or no PassKit ID
    if (!card.loyalty_cards.wallet_enabled || !card.passkit_id) {
      console.log('Skipping PassKit update - wallet not enabled or no PassKit ID')
      return
    }

    const newStampCount = card.current_stamps + stampsAdded
    const totalRequired = card.loyalty_cards.rules.stamps_required
    const isCompleted = newStampCount >= totalRequired

    // Update PassKit pass
    await updatePassStamps(
      card.passkit_id,
      newStampCount,
      totalRequired,
      card.loyalty_cards.rules.reward_description,
      isCompleted
    )

    console.log('✅ PassKit pass updated for stamp transaction:', {
      customerLoyaltyCardId,
      stampsAdded,
      newStampCount,
      totalRequired,
      isCompleted
    })

  } catch (error) {
    // Log error but don't fail the stamp transaction
    console.error('Error updating PassKit pass for stamp transaction:', error)
    // In production, you might want to queue this for retry
  }
}

// Bulk update passes (for campaigns or batch operations)
export async function bulkUpdatePasses(
  customerLoyaltyCardIds: string[],
  updateType: 'stamps' | 'message',
  updateData: { stampsToAdd: number }
): Promise<{ success: string[], errors: { id: string, error: string }[] }> {
  const results = {
    success: [] as string[],
    errors: [] as { id: string, error: string }[]
  }

  for (const cardId of customerLoyaltyCardIds) {
    try {
      if (updateType === 'stamps') {
        await handleStampTransaction(cardId, updateData.stampsToAdd)
        results.success.push(cardId)
      }
      // Add other update types as needed
    } catch (error) {
      results.errors.push({
        id: cardId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  console.log('📊 Bulk PassKit update completed:', {
    total: customerLoyaltyCardIds.length,
    success: results.success.length,
    errors: results.errors.length
  })

  return results
}