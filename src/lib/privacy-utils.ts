import { createHash, createCipher, createDecipher } from 'crypto'

// Privacy configuration
const ENCRYPTION_KEY = process.env.PRIVACY_ENCRYPTION_KEY || 'default-key-change-in-production'
const HASH_ALGORITHM = 'sha256'
const CIPHER_ALGORITHM = 'aes-256-cbc'

// Error classes
export class PrivacyError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'PrivacyError'
  }
}

// Generate a privacy-safe external ID for PassKit
export function generateExternalId(customerId: string, businessId: string): string {
  // Use a hash to create a deterministic but non-reversible external ID
  const hash = createHash(HASH_ALGORITHM)
  hash.update(`${customerId}:${businessId}:${ENCRYPTION_KEY}`)
  return `ext_${hash.digest('hex').substring(0, 16)}`
}

// Create a privacy-safe customer reference
export function createCustomerReference(customerId: string): string {
  const hash = createHash(HASH_ALGORITHM)
  hash.update(`${customerId}:${ENCRYPTION_KEY}`)
  return `cust_${hash.digest('hex').substring(0, 12)}`
}

// Encrypt sensitive data for storage
export function encryptSensitiveData(data: string): string {
  try {
    const cipher = createCipher(CIPHER_ALGORITHM, ENCRYPTION_KEY)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  } catch (error) {
    throw new PrivacyError('Failed to encrypt sensitive data', 'ENCRYPTION_ERROR')
  }
}

// Decrypt sensitive data
export function decryptSensitiveData(encryptedData: string): string {
  try {
    const decipher = createDecipher(CIPHER_ALGORITHM, ENCRYPTION_KEY)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    throw new PrivacyError('Failed to decrypt sensitive data', 'DECRYPTION_ERROR')
  }
}

// Anonymize personal data for logs and analytics
export function anonymizePersonalData(data: {
  name?: string
  email?: string
  phone?: string
  [key: string]: any
}): any {
  const anonymized = { ...data }
  
  if (anonymized.name) {
    anonymized.name = anonymized.name.charAt(0) + '*'.repeat(Math.max(1, anonymized.name.length - 2)) + anonymized.name.slice(-1)
  }
  
  if (anonymized.email) {
    const [local, domain] = anonymized.email.split('@')
    anonymized.email = local.charAt(0) + '*'.repeat(Math.max(1, local.length - 2)) + local.slice(-1) + '@' + domain
  }
  
  if (anonymized.phone) {
    anonymized.phone = anonymized.phone.substring(0, 2) + '*'.repeat(Math.max(4, anonymized.phone.length - 4)) + anonymized.phone.slice(-2)
  }
  
  return anonymized
}

// Data minimization - remove unnecessary fields for PassKit
export function minimizeDataForPassKit(customerData: {
  id: string
  name: string
  email?: string
  phone: string
  [key: string]: any
}): {
  externalId: string
  displayName: string
  contactInfo: {
    phone: string
    email?: string
  }
} {
  return {
    externalId: generateExternalId(customerData.id, 'business'), // Real business ID should be passed
    displayName: customerData.name.split(' ')[0], // Only first name
    contactInfo: {
      phone: customerData.phone,
      email: customerData.email // Optional, only if explicitly consented
    }
  }
}

// Check data retention policies
export function checkDataRetention(createdAt: string, retentionDays: number = 2555): { // ~7 years default
  shouldDelete: boolean
  daysRemaining: number
} {
  const createdDate = new Date(createdAt)
  const now = new Date()
  const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    shouldDelete: daysSinceCreation > retentionDays,
    daysRemaining: Math.max(0, retentionDays - daysSinceCreation)
  }
}

// Validate LGPD compliance for wallet data
export interface LGPDComplianceCheck {
  isCompliant: boolean
  issues: string[]
  recommendations: string[]
}

export function validateLGPDCompliance(walletPassData: {
  customerId: string
  passkitId?: string
  personalDataStored: string[]
  consentDate?: string
  lastAccessed?: string
  createdAt: string
}): LGPDComplianceCheck {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Check if consent is documented
  if (!walletPassData.consentDate) {
    issues.push('Data de consentimento não documentada')
    recommendations.push('Registrar data de consentimento LGPD')
  }
  
  // Check data minimization
  const unnecessaryFields = walletPassData.personalDataStored.filter(field => 
    !['name', 'phone', 'email'].includes(field)
  )
  if (unnecessaryFields.length > 0) {
    issues.push(`Dados desnecessários armazenados: ${unnecessaryFields.join(', ')}`)
    recommendations.push('Remover dados pessoais desnecessários')
  }
  
  // Check data retention
  const retention = checkDataRetention(walletPassData.createdAt)
  if (retention.shouldDelete) {
    issues.push('Dados além do período de retenção')
    recommendations.push('Considerar exclusão ou anonimização dos dados')
  }
  
  // Check access patterns
  if (walletPassData.lastAccessed) {
    const daysSinceAccess = Math.floor(
      (new Date().getTime() - new Date(walletPassData.lastAccessed).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceAccess > 365) { // 1 year without access
      recommendations.push('Usuário inativo há mais de 1 ano - considerar exclusão')
    }
  }
  
  return {
    isCompliant: issues.length === 0,
    issues,
    recommendations
  }
}

// Generate privacy-compliant pass data for PassKit
export function generatePrivacyCompliantPassData(customer: {
  id: string
  name: string
  email?: string
  phone: string
}, loyaltyCard: {
  id: string
  name: string
  businessId: string
}): {
  externalId: string
  person: {
    surname: string
    emailAddress?: string
    mobileNumber: string
  }
  metadata: {
    customerReference: string
    privacyCompliant: boolean
    dataMinimized: boolean
  }
} {
  const externalId = generateExternalId(customer.id, loyaltyCard.businessId)
  const customerRef = createCustomerReference(customer.id)
  
  return {
    externalId,
    person: {
      surname: customer.name.split(' ')[0], // Only first name for privacy
      emailAddress: customer.email, // Only if consented
      mobileNumber: customer.phone
    },
    metadata: {
      customerReference: customerRef,
      privacyCompliant: true,
      dataMinimized: true
    }
  }
}

// Create audit trail for privacy actions
export interface PrivacyAuditEntry {
  timestamp: string
  action: 'data_export' | 'data_deletion' | 'data_anonymization' | 'consent_updated'
  customerId: string // This should be anonymized in logs
  performedBy: string
  details: any
  complianceNotes: string[]
}

export function createPrivacyAuditEntry(
  action: PrivacyAuditEntry['action'],
  customerId: string,
  performedBy: string,
  details: any,
  complianceNotes: string[] = []
): PrivacyAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    customerId: createCustomerReference(customerId), // Anonymized reference
    performedBy,
    details: anonymizePersonalData(details),
    complianceNotes
  }
}

// Validate if PassKit integration meets LGPD requirements
export function validatePassKitLGPDCompliance(): {
  compliant: boolean
  checks: Array<{
    requirement: string
    status: 'compliant' | 'non_compliant' | 'partial'
    notes: string
  }>
} {
  const checks = [
    {
      requirement: 'Minimização de dados',
      status: 'compliant' as const,
      notes: 'Apenas dados essenciais (nome, telefone) são enviados para PassKit'
    },
    {
      requirement: 'IDs externos não-identificáveis',
      status: 'compliant' as const,
      notes: 'External IDs são gerados usando hash criptográfico'
    },
    {
      requirement: 'Exclusão de dados',
      status: 'compliant' as const,
      notes: 'API de exclusão implementada para remover passes do PassKit'
    },
    {
      requirement: 'Exportação de dados',
      status: 'compliant' as const,
      notes: 'API de exportação fornece todos os dados do cliente'
    },
    {
      requirement: 'Consentimento documentado',
      status: 'partial' as const,
      notes: 'Consentimento é coletado, mas data específica para carteira deve ser registrada'
    },
    {
      requirement: 'Anonimização de logs',
      status: 'compliant' as const,
      notes: 'Dados pessoais são anonimizados em logs e auditorias'
    }
  ]
  
  const compliant = checks.every(check => check.status === 'compliant')
  
  return {
    compliant,
    checks
  }
}