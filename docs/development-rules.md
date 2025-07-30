# Development Rules & Workflow for Volta.AI
## Claude Development Guidelines

### Core Development Principles

#### 1. Always Check Documentation First
Before implementing any feature, **ALWAYS** follow this order:
1. **Check PRD** (`docs/PRD.md`) for requirements and specifications
2. **Check API Documentation** (`docs/passkit-api.md`, `docs/deepseek-api.md`, `docs/fal-ai-api.md`)
3. **Ask for clarification** if information is missing or unclear
4. **Never assume** API capabilities without checking documentation

#### 2. PRD-First Development
- Every feature must align with the PRD requirements
- Check user stories and acceptance criteria before starting
- Verify feature fits within the current development phase
- Ensure Brazilian market compliance (LGPD, Portuguese language)

#### 3. API Documentation Workflow
```
User Request → Check PRD → Check API Docs → Ask if Unclear → Implement → Test
```

**Example Workflow:**
```markdown
User: "Add WhatsApp campaign generation"
1. ✅ Check PRD: Feature is in Phase 1C, requires DeepSeek integration
2. ✅ Check deepseek-api.md: API key available, examples provided
3. ✅ Implementation: Use documented patterns
4. ✅ Test: Verify with PRD success metrics
```

### Development Rules

#### Rule 1: Documentation Verification
**BEFORE** writing any code that integrates with external APIs:
- [ ] Read the relevant API documentation file
- [ ] Verify API keys are available in environment
- [ ] Check rate limits and cost implications
- [ ] Review error handling patterns

#### Rule 2: PRD Alignment Check
**BEFORE** implementing any feature:
- [ ] Confirm feature exists in PRD
- [ ] Check which development phase it belongs to
- [ ] Verify it matches current work priorities
- [ ] Ensure Brazilian localization requirements

#### Rule 3: Never Assume - Always Ask
**WHEN** encountering unclear requirements:
- 🚫 DON'T assume functionality
- 🚫 DON'T implement based on similar apps
- ✅ DO ask specific questions about:
  - API capabilities not documented
  - Business logic edge cases
  - Integration requirements
  - Performance expectations

#### Rule 4: Brazilian Market First
**ALL** implementations must consider:
- Portuguese language (pt-BR)
- LGPD compliance for data handling
- Brazilian business hours and timezone
- WhatsApp as primary communication channel
- PIX payment integration readiness

### Implementation Patterns

#### 1. API Integration Pattern
```javascript
// ✅ CORRECT: Check docs, use documented patterns
import { deepseek } from '@/lib/deepseek-client';
import { validateCampaignResponse } from '@/lib/validators';

async function generateCampaign(businessData, segment) {
  // Use documented prompt structure from deepseek-api.md
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'Você é um especialista em marketing digital...' // From docs
      }
    ]
  });
  
  // Use documented validation
  validateCampaignResponse(response);
  return response;
}

// ❌ INCORRECT: Assuming API behavior
async function generateCampaign() {
  // Assuming without checking docs
  return await someAPI.generate("make campaign");
}
```

#### 2. Feature Implementation Pattern
```javascript
// ✅ CORRECT: PRD-aligned implementation
async function implementLoyaltyCardCreation(cardData) {
  // Check PRD: Feature in Phase 1, requires PassKit integration
  // Check passkit-api.md: Use documented createLoyaltyPass function
  
  // Validate against PRD requirements
  if (!cardData.business_id) {
    throw new Error('Business ID required per PRD data model');
  }
  
  // Use documented PassKit pattern
  const pass = await createLoyaltyPass(
    cardData.customer_id,
    cardData.loyalty_card_id,
    cardData.customer_data
  );
  
  // PRD requires LGPD compliance
  await logDataProcessing(cardData.customer_id, 'loyalty_card_created');
  
  return pass;
}
```

### Error Handling Standards

#### 1. API Error Handling
```javascript
// Follow documented error patterns from API docs
async function safeAPICall(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    console.error('API Error:', error);
    
    // Use documented fallback strategies
    if (fallback) {
      return fallback;
    }
    
    throw new Error('Service temporarily unavailable');
  }
}
```

#### 2. LGPD Compliance Errors
```javascript
// Always check data processing consent per PRD
function validateLGPDConsent(customerData) {
  if (!customerData.consent?.lgpd_accepted) {
    throw new Error('LGPD consent required per PRD compliance');
  }
  
  if (!customerData.consent?.marketing_consent && marketingOperation) {
    throw new Error('Marketing consent required for this operation');
  }
}
```

### Testing Requirements

#### 1. API Integration Testing
```javascript
// Test with documented API patterns
describe('DeepSeek Integration', () => {
  it('should generate campaign using documented prompt structure', async () => {
    // Use exact patterns from deepseek-api.md
    const result = await generateWhatsAppCampaign(
      mockBusinessData,
      mockSegment,
      'reativação'
    );
    
    // Validate against documented response format
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('cta');
    expect(result).toHaveProperty('expected_engagement');
  });
});
```

#### 2. PRD Compliance Testing
```javascript
describe('PRD Compliance', () => {
  it('should meet MVP acceptance criteria', async () => {
    // Test against PRD Definition of Done
    const campaign = await createAICampaign(testData);
    
    expect(campaign.message.length).toBeLessThanOrEqual(160); // WhatsApp limit
    expect(campaign.language).toBe('pt-BR'); // Brazilian Portuguese
    expect(campaign.lgpd_compliant).toBe(true); // LGPD requirement
  });
});
```

### Code Review Checklist

Before submitting any code, verify:

#### PRD Compliance
- [ ] Feature matches PRD specification
- [ ] Implements correct data models from PRD
- [ ] Follows Brazilian localization requirements
- [ ] Includes LGPD compliance measures

#### API Documentation Adherence
- [ ] Uses documented API patterns
- [ ] Includes proper error handling from docs
- [ ] Implements cost optimization strategies
- [ ] Follows rate limiting guidelines

#### Quality Standards
- [ ] Portuguese language strings
- [ ] Proper TypeScript interfaces matching PRD
- [ ] Mobile-first responsive design
- [ ] Performance optimizations implemented

### Environment Variable Management

#### Required API Keys (from documentation)
```env
# DeepSeek AI (from deepseek-api.md)
DEEPSEEK_API_KEY=sk-a1ebdaeadc6b44459940d3bc40fb6f36

# FAL.AI FLUX (from fal-ai-api.md)  
FAL_AI_API_KEY=791c05e6-beb4-4114-8036-64a52f39c6fa:4f5b9a7f03021af62598985027156208

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://ayrcywkhtnipaufowxyp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WhatsApp Business API (to be configured - PRD Phase 1C)
WHATSAPP_API_TOKEN=your_whatsapp_token_here
WHATSAPP_VERIFY_TOKEN=your_verify_token_here
```

### Common Mistakes to Avoid

#### ❌ Don't Do This
```javascript
// Assuming API behavior without checking docs
const result = await unknownAPI.magicMethod(data);

// Implementing features not in PRD
function addInstagramIntegration() { /* PRD explicitly excludes this */ }

// Ignoring Brazilian localization
const message = "Welcome to our loyalty program"; // Should be Portuguese

// Skipping LGPD compliance
await storeCustomerData(data); // Without consent checks
```

#### ✅ Do This Instead
```javascript
// Check API docs first, use documented patterns
const result = await deepseek.chat.completions.create({
  // Use exact structure from deepseek-api.md
});

// Implement only PRD-approved features
function addWhatsAppIntegration() { /* PRD Phase 1C feature */ }

// Always use Brazilian Portuguese
const message = "Bem-vindo ao nosso programa de fidelidade";

// Always check LGPD compliance
validateLGPDConsent(customerData);
await storeCustomerData(data);
```

### Communication Patterns

#### When to Ask Questions
- API documentation is unclear or missing details
- PRD requirements seem contradictory
- Business logic edge cases aren't defined
- Integration patterns aren't documented

#### How to Ask Questions
```markdown
**Context**: Working on [feature name] from PRD Phase [X]
**Issue**: [Specific problem]
**Checked**: 
- ✅ PRD section [X.Y]
- ✅ API docs: [file-name.md]
- ❌ Missing: [specific information needed]

**Question**: [Specific question about the missing information]
```

### Performance Standards

#### Response Time Targets (from PRD)
- Dashboard pages: <200ms
- API endpoints: <500ms
- AI generation: <10s with progress indicators
- Image generation: <30s with streaming updates

#### Cost Management
- DeepSeek: <$0.01 per campaign generation
- FAL.AI: <$0.05 per promotional image
- Total AI cost: <R$1/month per active customer

### Success Metrics Tracking

Every feature must support PRD success metrics:
- 60%+ customer enrollment rate
- 25%+ WhatsApp campaign engagement
- 99.5%+ uptime
- <200ms dashboard response times

### Deployment Checklist

Before deploying any feature:
- [ ] PRD requirements fully implemented
- [ ] API integrations tested with real keys
- [ ] Brazilian Portuguese strings verified
- [ ] LGPD compliance validated
- [ ] Mobile responsiveness confirmed
- [ ] Error handling tested
- [ ] Performance metrics within targets

---

**Remember**: When in doubt, check the PRD and API docs first. When still unclear, ask specific questions. Never assume functionality that isn't documented.

This approach ensures we build exactly what's specified, with proper integrations, following Brazilian market requirements, and maintaining high quality throughout the development process.