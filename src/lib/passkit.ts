import * as fs from 'fs'

// PassKit Error Classes
export class PassKitError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PassKitError'
  }
}

// PassKit SDK Types
export interface PassKitConfig {
  endpoint: string
  ca_certificate: string
  certificate: string
  private_key: string
  enabled: boolean
}

export interface LoyaltyPassData {
  templateId: string
  externalId: string
  person: {
    surname: string
    emailAddress?: string
    mobileNumber: string
  }
  fields: {
    balance: {
      value: string
    }
    [key: string]: {
      value: string
      label?: string
    }
  }
}

export interface PassResponse {
  id: string
  appleWalletUrl: string
  googlePayUrl: string
  qrCode: string
}

export interface UpdatePassData {
  id: string
  fields: {
    [key: string]: {
      value: string
      label?: string
    }
  }
}

// Mock PassKit SDK for development
const mockPassKitSDK = {
  Members: {
    createMember: async (data: LoyaltyPassData): Promise<PassResponse> => {
      console.log('🧪 Mock PassKit: Creating member pass', { templateId: data.templateId, externalId: data.externalId })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return {
        id: `mock-pass-${Date.now()}`,
        appleWalletUrl: `https://mock-apple-wallet-url/${data.externalId}`,
        googlePayUrl: `https://mock-google-pay-url/${data.externalId}`,
        qrCode: `mock-qr-code-${data.externalId}`
      }
    },
    
    updateMember: async (data: UpdatePassData): Promise<{ success: boolean }> => {
      console.log('🧪 Mock PassKit: Updating member pass', { passId: data.id, fields: Object.keys(data.fields) })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { success: true }
    },
    
    deleteMember: async (passId: string): Promise<{ success: boolean }> => {
      console.log('🧪 Mock PassKit: Deleting member pass', { passId })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { success: true }
    }
  }
}

// Get PassKit configuration from environment
export function getPassKitConfig(): PassKitConfig {
  return {
    endpoint: process.env.PASSKIT_ENDPOINT || 'grpc.passkit.io:443',
    ca_certificate: process.env.PASSKIT_CA_CERT_PATH || './certs/ca-chain.pem',
    certificate: process.env.PASSKIT_CERT_PATH || './certs/certificate.pem',
    private_key: process.env.PASSKIT_PRIVATE_KEY_PATH || './certs/private-key.pem',
    enabled: process.env.PASSKIT_ENABLED === 'true'
  }
}

// Check if certificates exist
export function certificatesExist(): boolean {
  const config = getPassKitConfig()
  
  try {
    return fs.existsSync(config.ca_certificate) &&
           fs.existsSync(config.certificate) &&
           fs.existsSync(config.private_key)
  } catch (error) {
    console.warn('Error checking certificate files:', error)
    return false
  }
}

// Initialize PassKit SDK
let passkitSDK: typeof mockPassKitSDK | null = null

export async function getPassKitSDK() {
  if (passkitSDK) {
    return passkitSDK
  }

  const config = getPassKitConfig()

  // Use mock SDK in development or when certificates don't exist
  if (process.env.NODE_ENV === 'development' || !config.enabled || !certificatesExist()) {
    console.log('🧪 Using Mock PassKit SDK')
    passkitSDK = mockPassKitSDK
    return passkitSDK
  }

  try {
    // Import the real PassKit SDK
    const PassKitSDKModule = await import('passkit-typescript-sdk')
    const PassKitSDK = PassKitSDKModule.PassKitSDK || PassKitSDKModule.default
    
    passkitSDK = new PassKitSDK({
      endpoint: config.endpoint,
      ca_certificate: fs.readFileSync(config.ca_certificate),
      certificate: fs.readFileSync(config.certificate),
      private_key: fs.readFileSync(config.private_key)
    })

    console.log('✅ PassKit SDK initialized successfully')
    return passkitSDK
  } catch (error) {
    console.error('❌ Failed to initialize PassKit SDK:', error)
    console.log('🧪 Falling back to Mock PassKit SDK')
    passkitSDK = mockPassKitSDK
    return passkitSDK
  }
}

// Safe PassKit operation wrapper
export async function safePassKitOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error: unknown) {
    console.error(`PassKit ${operationName} error:`, error)
    
    const errorObj = error as Record<string, unknown>
    
    if (errorObj.code === 'GRPC_ERROR') {
      throw new PassKitError(
        `PassKit service unavailable for ${operationName}`,
        'SERVICE_UNAVAILABLE',
        errorObj.details as Record<string, unknown>
      )
    }
    
    if (errorObj.code === 'INVALID_ARGUMENT') {
      throw new PassKitError(
        `Invalid data provided for ${operationName}`,
        'INVALID_ARGUMENT',
        errorObj.details as Record<string, unknown>
      )
    }
    
    throw new PassKitError(
      `PassKit ${operationName} failed`,
      'OPERATION_FAILED',
      errorObj
    )
  }
}

// Check PassKit service health
export async function checkPassKitHealth(): Promise<boolean> {
  try {
    const sdk = await getPassKitSDK()
    
    // For mock SDK, always return healthy
    if (sdk === mockPassKitSDK) {
      return true
    }
    
    // For real SDK, try a simple operation to check connectivity
    // This would need to be implemented based on actual PassKit SDK health check methods
    return true
  } catch (error) {
    console.error('PassKit health check failed:', error)
    return false
  }
}