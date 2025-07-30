# PassKit API Documentation
## Apple Wallet + Google Pay Integration for Loyalty Cards

### Overview
PassKit provides unified SDKs for creating and managing digital loyalty cards for both Apple Wallet and Google Pay. This documentation covers the Node.js implementation for Volta.AI.

### Key Features
- Unified API for Apple Wallet and Google Pay
- Loyalty card creation and management
- Real-time card updates (stamp additions)
- QR code generation for enrollment
- Template-based card design
- Analytics and performance tracking

### Installation
```bash
npm install @passkit/passkit-node-grpc-sdk
```

### Authentication
PassKit uses certificate-based authentication:
1. Generate certificates in PassKit Portal
2. Download certificate files (.pem)
3. Configure SDK with certificate paths

```javascript
const PassKitSDK = require('@passkit/passkit-node-grpc-sdk');

const sdk = new PassKitSDK({
  endpoint: 'grpc.passkit.io:443',
  ca_certificate: './certs/ca-chain.pem',
  certificate: './certs/certificate.pem',
  private_key: './certs/private-key.pem'
});
```

### Core Implementation for Volta.AI

#### 1. Loyalty Card Template Creation
```javascript
// Create loyalty card template
const template = {
  name: 'Café Redentor Loyalty Card',
  description: 'Ganhe um café grátis a cada 10 cafés comprados',
  fields: {
    tier: {
      label: 'Nível',
      value: 'Bronze'
    },
    balance: {
      label: 'Selos',
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
};
```

#### 2. Individual Pass Creation
```javascript
async function createLoyaltyPass(customerId, loyaltyCardId, customerData) {
  const pass = {
    templateId: loyaltyCardId,
    externalId: customerId,
    person: {
      surname: customerData.name,
      emailAddress: customerData.email,
      mobileNumber: customerData.phone
    },
    fields: {
      balance: {
        value: '0/10'
      }
    }
  };

  try {
    const response = await sdk.Members.createMember(pass);
    return {
      passId: response.id,
      appleWalletUrl: response.appleWalletUrl,
      googlePayUrl: response.googlePayUrl,
      qrCode: response.qrCode
    };
  } catch (error) {
    console.error('PassKit Error:', error);
    throw new Error('Failed to create loyalty pass');
  }
}
```

#### 3. Update Pass (Add Stamps)
```javascript
async function addStampsToPass(passId, newStampCount, totalRequired) {
  const updateData = {
    id: passId,
    fields: {
      balance: {
        value: `${newStampCount}/${totalRequired}`
      }
    }
  };

  if (newStampCount >= totalRequired) {
    updateData.fields.tier = {
      value: 'Recompensa Disponível!'
    };
  }

  try {
    await sdk.Members.updateMember(updateData);
    return true;
  } catch (error) {
    console.error('PassKit Update Error:', error);
    throw new Error('Failed to update loyalty pass');
  }
}
```

#### 4. Volta.AI Integration Points

##### Database Integration
```javascript
// In your Supabase function
async function createCustomerLoyaltyCard(customerId, loyaltyCardId) {
  // Get customer data
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  // Get loyalty card template
  const { data: loyaltyCard } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('id', loyaltyCardId)
    .single();

  // Create PassKit pass
  const passData = await createLoyaltyPass(customerId, loyaltyCardId, customer);

  // Save to database
  const { data, error } = await supabase
    .from('customer_loyalty_cards')
    .insert({
      customer_id: customerId,
      loyalty_card_id: loyaltyCardId,
      wallet_pass_url: passData.appleWalletUrl,
      google_pay_url: passData.googlePayUrl,
      qr_code: passData.qrCode,
      passkit_id: passData.passId
    });

  return data;
}
```

##### Stamp Attribution Integration
```javascript
// Trigger pass update when stamps are added
async function handleStampTransaction(transactionData) {
  const { customer_loyalty_card_id, stamps_added } = transactionData;

  // Get current card data
  const { data: card } = await supabase
    .from('customer_loyalty_cards')
    .select(`
      *,
      loyalty_cards (rules)
    `)
    .eq('id', customer_loyalty_card_id)
    .single();

  const newStampCount = card.current_stamps + stamps_added;
  const totalRequired = card.loyalty_cards.rules.stamps_required;

  // Update PassKit pass
  await addStampsToPass(card.passkit_id, newStampCount, totalRequired);

  // Update local database
  await supabase
    .from('customer_loyalty_cards')
    .update({ current_stamps: newStampCount })
    .eq('id', customer_loyalty_card_id);
}
```

### Configuration for Production

#### Environment Variables
```env
PASSKIT_ENDPOINT=grpc.passkit.io:443
PASSKIT_CA_CERT_PATH=./certs/ca-chain.pem
PASSKIT_CERT_PATH=./certs/certificate.pem
PASSKIT_PRIVATE_KEY_PATH=./certs/private-key.pem
```

#### Next.js API Route Example
```javascript
// pages/api/passkit/create-pass.js
import { PassKitSDK } from '@/lib/passkit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { customerId, loyaltyCardId } = req.body;
    const passData = await createCustomerLoyaltyCard(customerId, loyaltyCardId);
    
    res.status(200).json(passData);
  } catch (error) {
    console.error('PassKit API Error:', error);
    res.status(500).json({ message: 'Failed to create pass' });
  }
}
```

### Design Considerations for Brazilian Market

#### Portuguese Localization
```javascript
const brazilianTemplate = {
  name: loyaltyCard.name,
  description: loyaltyCard.description,
  fields: {
    balance: {
      label: 'Selos Coletados',
      value: `${currentStamps}/${requiredStamps}`
    },
    reward: {
      label: 'Recompensa',
      value: loyaltyCard.rules.reward_description
    },
    expires: {
      label: 'Válido até',
      value: formatDateBR(expiryDate)
    }
  },
  barcode: {
    altText: `Código do Cliente: ${customerData.phone}`
  }
};
```

#### LGPD Compliance
- Store minimal data in PassKit
- Use encrypted customer IDs as external references
- Implement data deletion workflows
- Provide data export capabilities

### Error Handling
```javascript
class PassKitError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'PassKitError';
    this.code = code;
    this.details = details;
  }
}

async function safePassKitOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'GRPC_ERROR') {
      throw new PassKitError(
        'PassKit service unavailable',
        'SERVICE_UNAVAILABLE',
        error.details
      );
    }
    throw error;
  }
}
```

### Testing Strategy
```javascript
// Mock PassKit SDK for development
const mockPassKitSDK = {
  Members: {
    createMember: async (data) => ({
      id: 'mock-pass-id',
      appleWalletUrl: 'https://mock-apple-wallet-url',
      googlePayUrl: 'https://mock-google-pay-url',
      qrCode: 'mock-qr-code'
    }),
    updateMember: async (data) => ({ success: true })
  }
};

export const PassKitSDK = process.env.NODE_ENV === 'development' 
  ? mockPassKitSDK 
  : require('@passkit/passkit-node-grpc-sdk');
```

### Next Steps for Implementation
1. Set up PassKit developer account
2. Generate and download certificates
3. Install Node.js SDK
4. Create loyalty card templates in PassKit Portal
5. Implement API routes for pass creation/updates
6. Test with real devices (iOS/Android)
7. Configure production certificates

### References
- [PassKit Developer Portal](https://dev.passkit.com)
- [PassKit Node.js SDK](https://github.com/PassKit/passkit-node-grpc-sdk)
- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [Google Pay API Documentation](https://developers.google.com/pay/passes)