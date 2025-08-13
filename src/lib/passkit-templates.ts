import { getPassKitSDK, safePassKitOperation, PassKitError } from './passkit'

// Template creation interfaces
export interface LoyaltyCardDesign {
  background_color?: string
  foreground_color?: string
  label_color?: string
  logo_url?: string
  stamp_icon?: string
}

export interface LoyaltyCardRules {
  stamps_required: number
  reward_description: string
  max_stamps_per_day?: number
  expiry_days?: number
}

export interface PassKitTemplate {
  id?: string
  name: string
  description: string
  fields: {
    balance: {
      label: string
      value: string
    }
    [key: string]: {
      label: string
      value: string
    }
  }
  barcode: {
    format: 'QR'
    message: string
    altText: string
  }
  design: {
    backgroundColor: string
    foregroundColor: string
    labelColor: string
  }
}

export interface CreateTemplateRequest {
  loyaltyCardId: string
  businessName: string
  loyaltyCardName: string
  description: string
  design: LoyaltyCardDesign
  rules: LoyaltyCardRules
}

// Convert hex color to PassKit format
function formatColor(color: string): string {
  // Remove # if present
  color = color.replace('#', '')
  
  // Add # back for PassKit
  return `#${color}`
}

// Format date for Brazilian locale
function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

// Calculate expiry date
function calculateExpiryDate(expiryDays?: number): string {
  if (!expiryDays) {
    // Default to 2 years from now
    const date = new Date()
    date.setFullYear(date.getFullYear() + 2)
    return formatDateBR(date)
  }
  
  const date = new Date()
  date.setDate(date.getDate() + expiryDays)
  return formatDateBR(date)
}

// Create PassKit template from Loyaltea loyalty card
export function createPassKitTemplate(request: CreateTemplateRequest): PassKitTemplate {
  const { loyaltyCardName, description, design, rules } = request
  
  // Default colors if not provided
  const backgroundColor = formatColor(design.background_color || '#8B4513')
  const foregroundColor = formatColor(design.foreground_color || '#FFFFFF')
  const labelColor = formatColor(design.label_color || '#FFFFFF')
  
  const template: PassKitTemplate = {
    name: loyaltyCardName,
    description: description,
    fields: {
      balance: {
        label: 'Selos Coletados',
        value: `0/${rules.stamps_required}`
      },
      reward: {
        label: 'Recompensa',
        value: rules.reward_description
      },
      expires: {
        label: 'Válido até',
        value: calculateExpiryDate(rules.expiry_days)
      }
    },
    barcode: {
      format: 'QR',
      message: '{serial}',
      altText: 'Código: {serial}'
    },
    design: {
      backgroundColor,
      foregroundColor,
      labelColor
    }
  }
  
  return template
}

// Create template in PassKit
export async function createTemplate(request: CreateTemplateRequest): Promise<string> {
  const template = createPassKitTemplate(request)
  
  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    
    // For mock SDK, return a mock template ID
    if (sdk?.Members?.createMember) {
      console.log('📄 Creating PassKit template:', template.name)
      return `template-${request.loyaltyCardId}`
    }
    
    // Real SDK template creation would go here
    // const response = await sdk.Templates.createTemplate(template)
    // return response.id
    
    throw new PassKitError('Template creation not implemented', 'NOT_IMPLEMENTED')
  }, 'template creation')
}

// Update template in PassKit
export async function updateTemplate(
  templateId: string, 
  request: CreateTemplateRequest
): Promise<void> {
  const template = createPassKitTemplate(request)
  
  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    
    // For mock SDK, just log the update
    if (sdk?.Members?.updateMember) {
      console.log('📄 Updating PassKit template:', templateId, template.name)
      return
    }
    
    // Real SDK template update would go here
    // await sdk.Templates.updateTemplate(templateId, template)
    
    throw new PassKitError('Template update not implemented', 'NOT_IMPLEMENTED')
  }, 'template update')
}

// Delete template from PassKit
export async function deleteTemplate(templateId: string): Promise<void> {
  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    
    // For mock SDK, just log the deletion
    if (sdk.Members?.deleteMember) {
      console.log('📄 Deleting PassKit template:', templateId)
      return
    }
    
    // Real SDK template deletion would go here
    // await sdk.Templates.deleteTemplate(templateId)
    
    throw new PassKitError('Template deletion not implemented', 'NOT_IMPLEMENTED')
  }, 'template deletion')
}

// Get template from PassKit
export async function getTemplate(templateId: string): Promise<PassKitTemplate | null> {
  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    
    // For mock SDK, return a mock template
    if (sdk.Members?.createMember) {
      console.log('📄 Getting PassKit template:', templateId)
      return {
        id: templateId,
        name: 'Mock Template',
        description: 'Mock template for development',
        fields: {
          balance: {
            label: 'Selos Coletados',
            value: '0/10'
          }
        },
        barcode: {
          format: 'QR',
          message: '{serial}',
          altText: 'Código: {serial}'
        },
        design: {
          backgroundColor: '#8B4513',
          foregroundColor: '#FFFFFF',
          labelColor: '#FFFFFF'
        }
      }
    }
    
    // Real SDK template retrieval would go here
    // const response = await sdk.Templates.getTemplate(templateId)
    // return response
    
    return null
  }, 'template retrieval')
}

// List templates for a business
export async function listTemplates(businessId: string): Promise<PassKitTemplate[]> {
  return safePassKitOperation(async () => {
    const sdk = await getPassKitSDK()
    
    // For mock SDK, return empty array
    if (sdk.Members?.createMember) {
      console.log('📄 Listing PassKit templates for business:', businessId)
      return []
    }
    
    // Real SDK template listing would go here
    // const response = await sdk.Templates.listTemplates({ businessId })
    // return response.templates
    
    return []
  }, 'template listing')
}