# DeepSeek API Documentation
## AI-Powered Campaign Generation for Volta.AI

### Overview
DeepSeek provides advanced language models for generating personalized marketing campaigns, customer insights, and automated content creation. This documentation covers integration for Brazilian Portuguese marketing automation.

### Authentication
- **API Key**: `sk-a1ebdaeadc6b44459940d3bc40fb6f36`
- **Base URL**: `https://api.deepseek.com`
- **Compatibility**: OpenAI SDK format

### Available Models
- **`deepseek-chat`** (DeepSeek-V3-0324) - General conversation and content generation
- **`deepseek-reasoner`** (DeepSeek-R1-0528) - Advanced reasoning and analysis

### Installation & Setup
```bash
npm install openai
```

```javascript
import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
});
```

### Core Implementation for Volta.AI

#### 1. WhatsApp Campaign Generation
```javascript
async function generateWhatsAppCampaign(businessData, customerSegment, campaignType) {
  const prompt = `
Você é um especialista em marketing para restaurantes brasileiros. 
Crie uma campanha de WhatsApp para o ${businessData.name}.

Contexto do Negócio:
- Nome: ${businessData.name}
- Tipo: ${businessData.type || 'Restaurante'}
- Tom da marca: ${businessData.settings.ai_tone || 'amigável'}
- Voz da marca: ${businessData.settings.brand_voice || 'Casual e acolhedor'}

Segmento de Clientes: ${customerSegment.description}
Tipo de Campanha: ${campaignType}

Crie uma mensagem que:
1. Seja natural e brasileira (use expressões locais apropriadas)
2. Tenha no máximo 160 caracteres
3. Inclua um call-to-action claro
4. Use emojis relevantes mas sem exagero
5. Seja personalizada para o segmento específico

Formato de resposta JSON:
{
  "message": "mensagem completa",
  "cta": "call to action específico",
  "expected_engagement": "porcentagem estimada",
  "best_time": "melhor horário para envio",
  "reasoning": "explicação da estratégia"
}
`;

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em marketing digital para o mercado brasileiro, especializado em campanhas de WhatsApp para restaurantes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw new Error('Failed to generate campaign');
  }
}
```

#### 2. Customer Behavior Analysis
```javascript
async function analyzeCustomerBehavior(customerData, businessContext) {
  const prompt = `
Analise o comportamento dos clientes deste restaurante brasileiro e forneça insights acionáveis.

Dados do Negócio: ${businessContext.name}
Dados dos Clientes:
${customerData.map(customer => 
  `- ${customer.name}: ${customer.total_visits} visitas, última visita: ${customer.last_visit}, gasto total: R$ ${customer.total_spent || 'N/A'}`
).join('\n')}

Forneça:
1. Segmentação de clientes (VIP, regulares, em risco, inativos)
2. Padrões de comportamento identificados
3. 3 sugestões específicas de campanhas
4. Predição de ROI para cada campanha

Responda em português brasileiro, focado em ações práticas.
`;

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-reasoner',
    messages: [
      {
        role: 'system',
        content: 'Você é um analista de dados especializado no mercado brasileiro de restaurantes, com foco em programas de fidelidade.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 1500
  });

  return response.choices[0].message.content;
}
```

#### 3. AI Insights Generation
```javascript
async function generateAIInsights(businessId, metricsData) {
  const insights = [];
  
  // Inactive customers insight
  if (metricsData.inactive_customers > 0) {
    const campaignSuggestion = await generateWhatsAppCampaign(
      metricsData.business,
      { description: `${metricsData.inactive_customers} clientes inativos há mais de 15 dias` },
      'reativação'
    );

    insights.push({
      type: 'customer_segment',
      title: `${metricsData.inactive_customers} clientes inativos identificados`,
      description: `Clientes que não visitam há mais de 15 dias. Taxa de reativação esperada: ${campaignSuggestion.expected_engagement}.`,
      recommended_action: campaignSuggestion.message,
      priority: 'high',
      business_id: businessId
    });
  }

  // Completed cards insight
  if (metricsData.completed_cards > 0) {
    const loyaltyCampaign = await generateWhatsAppCampaign(
      metricsData.business,
      { description: `${metricsData.completed_cards} clientes com cartões completos` },
      'recompensa'
    );

    insights.push({
      type: 'revenue_opportunity',
      title: `${metricsData.completed_cards} recompensas não resgatadas`,
      description: 'Clientes com cartões completos podem retornar para resgatar recompensas.',
      recommended_action: loyaltyCampaign.message,
      priority: 'medium',
      business_id: businessId
    });
  }

  return insights;
}
```

#### 4. Campaign Content Personalization
```javascript
async function personalizeMessage(baseMessage, customerData, businessData) {
  const prompt = `
Personalize esta mensagem de WhatsApp para o cliente específico:

Mensagem base: "${baseMessage}"

Dados do cliente:
- Nome: ${customerData.name}
- Última visita: ${customerData.last_visit}
- Visitas totais: ${customerData.total_visits}
- Status de fidelidade: ${customerData.loyalty_status}

Dados do negócio:
- Nome: ${businessData.name}
- Tom: ${businessData.settings.ai_tone}

Regras:
1. Use o nome do cliente naturalmente
2. Mencione informações relevantes (última visita, fidelidade) se apropriado
3. Mantenha o tom consistente com a marca
4. Limite a 160 caracteres
5. Seja genuíno e brasileiro

Retorne apenas a mensagem personalizada.
`;

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'Você especializa em personalização de mensagens para o mercado brasileiro.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 200
  });

  return response.choices[0].message.content.trim();
}
```

### Volta.AI Integration Patterns

#### 1. Supabase Edge Function Integration
```javascript
// supabase/functions/generate-ai-insights/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'https://esm.sh/openai@4.0.0';

const deepseek = new OpenAI({
  apiKey: Deno.env.get('DEEPSEEK_API_KEY'),
  baseURL: 'https://api.deepseek.com'
});

serve(async (req) => {
  const { business_id } = await req.json();
  
  // Get business data and metrics
  const metricsData = await getBusinessMetrics(business_id);
  
  // Generate AI insights
  const insights = await generateAIInsights(business_id, metricsData);
  
  // Save insights to database
  for (const insight of insights) {
    await supabase
      .from('ai_insights')
      .insert(insight);
  }

  return new Response(JSON.stringify({ insights }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### 2. Real-time Campaign Creation
```javascript
// API route: /api/campaigns/generate
export default async function handler(req, res) {
  const { business_id, segment_id, campaign_type } = req.body;

  try {
    // Get business and segment data
    const businessData = await getBusinessData(business_id);
    const segmentData = await getCustomerSegment(segment_id);

    // Generate campaign with DeepSeek
    const campaign = await generateWhatsAppCampaign(
      businessData,
      segmentData,
      campaign_type
    );

    // Save to database
    const { data } = await supabase
      .from('campaigns')
      .insert({
        business_id,
        name: `Campanha IA: ${campaign_type}`,
        type: 'ai_generated',
        content: {
          message: campaign.message,
          cta_text: campaign.cta
        },
        target_audience: { segment_id },
        performance: {
          expected_engagement: campaign.expected_engagement
        }
      })
      .select()
      .single();

    res.status(200).json({ campaign: data });
  } catch (error) {
    console.error('Campaign generation error:', error);
    res.status(500).json({ error: 'Failed to generate campaign' });
  }
}
```

### Environment Configuration
```env
# .env.local
DEEPSEEK_API_KEY=sk-a1ebdaeadc6b44459940d3bc40fb6f36
```

### Cost Optimization Strategies

#### 1. Prompt Caching
```javascript
const promptCache = new Map();

async function getCachedResponse(promptKey, prompt) {
  if (promptCache.has(promptKey)) {
    return promptCache.get(promptKey);
  }

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }]
  });

  promptCache.set(promptKey, response);
  return response;
}
```

#### 2. Batch Processing
```javascript
async function batchGenerateCampaigns(requests) {
  const batchPrompt = requests.map((req, index) => 
    `Campanha ${index + 1}: ${req.description}`
  ).join('\n\n');

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'Gere múltiplas campanhas de WhatsApp em um único response.'
      },
      {
        role: 'user',
        content: batchPrompt
      }
    ]
  });

  return parseMultipleCampaigns(response.choices[0].message.content);
}
```

### Error Handling & Fallbacks
```javascript
async function safeDeepSeekCall(prompt, fallbackResponse) {
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      timeout: 10000 // 10 second timeout
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    
    // Return fallback response for critical flows
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    throw new Error('AI service temporarily unavailable');
  }
}
```

### Quality Assurance

#### 1. Response Validation
```javascript
function validateCampaignResponse(response) {
  const required = ['message', 'cta', 'expected_engagement'];
  const missing = required.filter(field => !response[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (response.message.length > 160) {
    throw new Error('Message exceeds WhatsApp character limit');
  }
  
  return true;
}
```

#### 2. A/B Testing Integration
```javascript
async function generateCampaignVariants(baseRequest, variantCount = 3) {
  const variants = [];
  
  for (let i = 0; i < variantCount; i++) {
    const variant = await generateWhatsAppCampaign(
      baseRequest.businessData,
      baseRequest.customerSegment,
      baseRequest.campaignType
    );
    
    variants.push({
      ...variant,
      variant_id: `v${i + 1}`,
      created_at: new Date().toISOString()
    });
  }
  
  return variants;
}
```

### Performance Monitoring
```javascript
class DeepSeekMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      avgResponseTime: 0
    };
  }

  async trackRequest(operation) {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const result = await operation();
      this.metrics.successes++;
      
      const responseTime = Date.now() - startTime;
      this.updateAvgResponseTime(responseTime);
      
      return result;
    } catch (error) {
      this.metrics.failures++;
      throw error;
    }
  }

  updateAvgResponseTime(newTime) {
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime + newTime) / 2;
  }

  getHealthStats() {
    return {
      ...this.metrics,
      successRate: this.metrics.successes / this.metrics.requests,
      isHealthy: this.metrics.successRate > 0.95
    };
  }
}
```

### Next Steps for Implementation
1. Add DeepSeek API key to environment variables
2. Install OpenAI SDK package
3. Create AI insights generation system
4. Implement campaign generation API routes
5. Add customer behavior analysis dashboard
6. Set up monitoring and error handling
7. Test with real business data

### References
- [DeepSeek API Documentation](https://api-docs.deepseek.com)
- [OpenAI SDK Documentation](https://github.com/openai/openai-node)
- [WhatsApp Business API Guidelines](https://developers.facebook.com/docs/whatsapp)