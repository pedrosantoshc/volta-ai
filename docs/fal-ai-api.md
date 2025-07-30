# FAL.AI FLUX API Documentation
## AI Image Generation for Volta.AI Marketing Content

### Overview
FAL.AI provides access to FLUX.1 models for generating high-quality promotional images, loyalty card designs, and marketing content. This documentation covers integration for Brazilian restaurant marketing automation.

### Authentication
- **API Key**: `791c05e6-beb4-4114-8036-64a52f39c6fa:4f5b9a7f03021af62598985027156208`
- **Base URL**: `https://fal.run`
- **Documentation**: https://docs.fal.ai

### Installation & Setup
```bash
npm install @fal-ai/client
```

```javascript
import { fal } from "@fal-ai/client";

// Configure API key
fal.config({
  credentials: process.env.FAL_AI_API_KEY
});
```

### Available FLUX Models for Volta.AI

#### 1. FLUX.1 Pro (Highest Quality)
- **Model ID**: `fal-ai/flux-pro`
- **Best for**: Final marketing materials, high-resolution loyalty cards
- **Cost**: Higher but premium quality

#### 2. FLUX.1 Dev (Development)
- **Model ID**: `fal-ai/flux/dev`  
- **Best for**: Testing, prototyping, batch generation
- **Cost**: More economical for development

#### 3. FLUX LoRA (Style Consistency)
- **Model ID**: `fal-ai/flux-lora`
- **Best for**: Brand-consistent imagery with trained style
- **Cost**: Medium, great for consistent branding

### Core Implementation for Volta.AI

#### 1. Promotional Campaign Image Generation
```javascript
async function generateCampaignImage(campaignData, businessData) {
  const prompt = buildPrompt(campaignData, businessData);
  
  try {
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: prompt,
        image_size: "landscape_4_3", // Perfect for WhatsApp
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("Generating image:", update.logs?.map(log => log.message).join('\n'));
        }
      }
    });

    return {
      imageUrl: result.data.images[0].url,
      prompt: prompt,
      requestId: result.requestId,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('FAL.AI Error:', error);
    throw new Error('Failed to generate campaign image');
  }
}

function buildPrompt(campaignData, businessData) {
  const basePrompt = `
Crie uma imagem promocional atraente para WhatsApp de um restaurante brasileiro.

Contexto:
- Restaurante: ${businessData.name}
- Tipo de campanha: ${campaignData.type}
- Oferta: ${campaignData.offer || 'Programa de fidelidade'}
- Tom da marca: ${businessData.settings.ai_tone || 'amigável'}

Estilo visual:
- Cores vibrantes e apetitosas
- Estilo brasileiro moderno
- Foco na comida/bebida quando relevante
- Texto mínimo (será adicionado depois)
- Qualidade profissional
- Dimensões adequadas para WhatsApp (landscape 4:3)

Elementos obrigatórios:
- Ambiente acolhedor de restaurante brasileiro
- Iluminação calorosa e convidativa
- Comida fresca e apetitosa em destaque
- Sem texto sobreposto (será adicionado na pós-produção)
`;

  // Add specific elements based on campaign type
  if (campaignData.type === 'reativação') {
    return basePrompt + '\n- Atmosfera "saudade" e nostalgia\n- Elemento que sugere retorno/volta';
  } else if (campaignData.type === 'recompensa') {
    return basePrompt + '\n- Elemento de celebração ou recompensa\n- Destaque especial na oferta';
  } else if (campaignData.type === 'novo_cliente') {
    return basePrompt + '\n- Atmosfera de boas-vindas\n- Ambiente convidativo e acessível';
  }

  return basePrompt;
}
```

#### 2. Loyalty Card Background Generation
```javascript
async function generateLoyaltyCardBackground(cardDesign, businessData) {
  const prompt = `
Crie um fundo elegante para cartão de fidelidade digital.

Especificações:
- Restaurante: ${businessData.name}
- Cor principal: ${cardDesign.background_color}
- Estilo: Moderno, profissional, brasileiro
- Dimensões: Portrait, adequado para carteira digital
- Textura sutil e elegante
- Gradiente suave se apropriado
- Elementos gastronômicos sutis (${cardDesign.stamp_icon})
- Sem texto (será adicionado programaticamente)

Requisitos técnicos:
- Alta resolução para carteira digital
- Contraste adequado para texto branco/escuro
- Compatível com Apple Wallet e Google Pay
- Estilo minimalista mas sofisticado
`;

  const result = await fal.subscribe("fal-ai/flux-pro", {
    input: {
      prompt: prompt,
      image_size: "portrait_4_3",
      num_inference_steps: 40, // Higher quality for card backgrounds
      guidance_scale: 4.0,
      num_images: 1
    }
  });

  return {
    backgroundUrl: result.data.images[0].url,
    cardDesign: cardDesign,
    generatedFor: businessData.name
  };
}
```

#### 3. Seasonal/Holiday Campaign Images
```javascript
async function generateSeasonalCampaign(holidayType, businessData) {
  const holidayPrompts = {
    'festa_junina': `
      Festa Junina brasileira em restaurante acolhedor.
      Bandeirinhas coloridas, comida típica (pamonha, canjica, milho).
      Iluminação calorosa com fogueira ao fundo.
      Ambiente festivo mas elegante.
    `,
    'natal': `
      Decoração natalina brasileira em restaurante.
      Mesa farta com ceia natalina.
      Luzes douradas e vermelhas.
      Ambiente familiar e acolhedor.
    `,
    'carnaval': `
      Ambiente festivo de carnaval em restaurante brasileiro.
      Cores vibrantes (amarelo, verde, azul).
      Comida brasileira em destaque.
      Energia alegre mas sofisticada.
    `
  };

  const seasonalPrompt = holidayPrompts[holidayType] || holidayPrompts['festa_junina'];
  
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt: `${seasonalPrompt}
      
      Restaurante: ${businessData.name}
      Estilo: Profissional, gastronômico, brasileiro
      Qualidade: Alta resolução para WhatsApp
      Sem texto sobreposto
      `,
      image_size: "landscape_4_3",
      num_inference_steps: 30
    }
  });

  return result.data.images[0].url;
}
```

#### 4. Batch Image Generation
```javascript
async function generateMultipleCampaignVariants(campaignData, businessData, variantCount = 3) {
  const basePrompt = buildPrompt(campaignData, businessData);
  const variants = [];

  // Generate multiple style variations
  const styleVariations = [
    "estilo fotográfico realista, iluminação natural",
    "estilo ilustração moderna, cores saturadas", 
    "estilo minimalista, foco no produto"
  ];

  for (let i = 0; i < variantCount; i++) {
    const styledPrompt = `${basePrompt}\n\nEstilo específico: ${styleVariations[i % styleVariations.length]}`;
    
    try {
      const result = await fal.subscribe("fal-ai/flux/dev", {
        input: {
          prompt: styledPrompt,
          image_size: "landscape_4_3",
          num_inference_steps: 25,
          seed: Math.floor(Math.random() * 1000000) // Random seed for variation
        }
      });

      variants.push({
        imageUrl: result.data.images[0].url,
        style: styleVariations[i % styleVariations.length],
        variant: i + 1,
        prompt: styledPrompt
      });
    } catch (error) {
      console.error(`Failed to generate variant ${i + 1}:`, error);
    }
  }

  return variants;
}
```

### Volta.AI Integration Patterns

#### 1. Campaign Generation Workflow
```javascript
// API route: /api/campaigns/generate-with-image
export default async function handler(req, res) {
  const { business_id, campaign_type, campaign_data } = req.body;

  try {
    // Get business data
    const businessData = await getBusinessData(business_id);

    // Generate campaign text with DeepSeek
    const campaignText = await generateWhatsAppCampaign(
      businessData,
      campaign_data.segment,
      campaign_type
    );

    // Generate promotional image with FAL.AI
    const campaignImage = await generateCampaignImage(
      { type: campaign_type, offer: campaign_data.offer },
      businessData
    );

    // Save campaign to database
    const { data } = await supabase
      .from('campaigns')
      .insert({
        business_id,
        name: `Campanha ${campaign_type} com IA`,
        type: 'ai_generated',
        content: {
          message: campaignText.message,
          image_url: campaignImage.imageUrl,
          cta_text: campaignText.cta
        },
        ai_metadata: {
          text_prompt: campaignText.reasoning,
          image_prompt: campaignImage.prompt,
          generation_cost: calculateCost(campaignImage, campaignText)
        }
      })
      .select()
      .single();

    res.status(200).json({ 
      campaign: data,
      preview: {
        text: campaignText.message,
        image: campaignImage.imageUrl
      }
    });
  } catch (error) {
    console.error('Campaign generation error:', error);
    res.status(500).json({ error: 'Failed to generate campaign with image' });
  }
}
```

#### 2. Loyalty Card Design Enhancement
```javascript
async function enhanceLoyaltyCardDesign(cardId, businessId) {
  // Get card design data
  const { data: cardData } = await supabase
    .from('loyalty_cards')
    .select(`
      *,
      businesses (name, settings)
    `)
    .eq('id', cardId)
    .single();

  // Generate AI background if requested
  if (cardData.design.ai_generated) {
    const backgroundImage = await generateLoyaltyCardBackground(
      cardData.design,
      cardData.businesses
    );

    // Update card design with AI background
    await supabase
      .from('loyalty_cards')
      .update({
        design: {
          ...cardData.design,
          custom_background_url: backgroundImage.backgroundUrl,
          ai_generated: true
        }
      })
      .eq('id', cardId);

    return backgroundImage.backgroundUrl;
  }

  return null;
}
```

#### 3. Supabase Edge Function Integration
```javascript
// supabase/functions/generate-campaign-image/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { fal } from 'https://esm.sh/@fal-ai/client@0.7.3';

fal.config({
  credentials: Deno.env.get('FAL_AI_API_KEY')
});

serve(async (req) => {
  const { campaign_data, business_data } = await req.json();

  try {
    const image = await generateCampaignImage(campaign_data, business_data);
    
    // Store image metadata in Supabase Storage if needed
    const storagePath = `campaign-images/${business_data.id}/${Date.now()}.jpg`;
    
    return new Response(JSON.stringify({ 
      imageUrl: image.imageUrl,
      storagePath,
      metadata: image
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### Environment Configuration
```env
# .env.local
FAL_AI_API_KEY=791c05e6-beb4-4114-8036-64a52f39c6fa:4f5b9a7f03021af62598985027156208
```

### Cost Management & Optimization

#### 1. Image Caching Strategy
```javascript
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
  }

  getCacheKey(prompt, options) {
    return btoa(prompt + JSON.stringify(options));
  }

  async getOrGenerate(prompt, options, generator) {
    const key = this.getCacheKey(prompt, options);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      console.log('Using cached image');
      return cached.data;
    }

    const result = await generator();
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }
}

const imageCache = new ImageCache();
```

#### 2. Cost Tracking
```javascript
function calculateGenerationCost(imageSize, model, numImages = 1) {
  const costs = {
    'fal-ai/flux-pro': { base: 0.05, multiplier: 1.5 },
    'fal-ai/flux/dev': { base: 0.025, multiplier: 1.0 },
    'fal-ai/flux-lora': { base: 0.035, multiplier: 1.2 }
  };

  const modelCost = costs[model] || costs['fal-ai/flux/dev'];
  const sizeMutiplier = imageSize.includes('4_3') ? 1.0 : 1.2;
  
  return (modelCost.base * modelCost.multiplier * sizeMutiplier * numImages).toFixed(4);
}

async function generateWithCostTracking(model, input, businessId) {
  const estimatedCost = calculateGenerationCost(
    input.image_size, 
    model, 
    input.num_images
  );

  console.log(`Estimated cost: $${estimatedCost} for business ${businessId}`);

  const result = await fal.subscribe(model, { input });

  // Log actual usage for billing
  await logImageGeneration({
    business_id: businessId,
    model,
    cost: estimatedCost,
    prompt: input.prompt,
    generated_at: new Date().toISOString()
  });

  return result;
}
```

### Quality Control & Validation

#### 1. Image Quality Checks
```javascript
async function validateGeneratedImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    
    return {
      isValid: response.ok,
      size: buffer.byteLength,
      contentType: response.headers.get('content-type'),
      dimensions: await getImageDimensions(buffer)
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

async function getImageDimensions(buffer) {
  // Use sharp or similar library to get dimensions
  // For now, returning mock data
  return { width: 1024, height: 768 };
}
```

#### 2. Content Safety
```javascript
async function checkContentSafety(prompt) {
  // Basic safety checks for Brazilian market
  const restricted = [
    'violent', 'adult', 'political', 'discriminatory'
  ];

  const hasRestricted = restricted.some(word => 
    prompt.toLowerCase().includes(word)
  );

  if (hasRestricted) {
    throw new Error('Content violates safety guidelines');
  }

  return true;
}
```

### Error Handling & Fallbacks

#### 1. Retry Logic
```javascript
async function generateWithRetry(model, input, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Generation attempt ${attempt}/${maxRetries}`);
      return await fal.subscribe(model, { input });
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

#### 2. Fallback Images
```javascript
const FALLBACK_IMAGES = {
  'reativação': 'https://your-cdn.com/fallback-reactivation.jpg',
  'recompensa': 'https://your-cdn.com/fallback-reward.jpg',
  'novo_cliente': 'https://your-cdn.com/fallback-welcome.jpg'
};

async function generateWithFallback(campaignType, businessData) {
  try {
    return await generateCampaignImage({ type: campaignType }, businessData);
  } catch (error) {
    console.error('Image generation failed, using fallback:', error);
    
    return {
      imageUrl: FALLBACK_IMAGES[campaignType] || FALLBACK_IMAGES['novo_cliente'],
      isFallback: true,
      error: error.message
    };
  }
}
```

### Performance Monitoring

#### 1. Generation Metrics
```javascript
class FALMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalCost: 0,
      avgGenerationTime: 0
    };
  }

  async trackGeneration(operation, estimatedCost) {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const result = await operation();
      this.metrics.successes++;
      this.metrics.totalCost += parseFloat(estimatedCost);
      
      const generationTime = Date.now() - startTime;
      this.updateAvgTime(generationTime);
      
      return result;
    } catch (error) {
      this.metrics.failures++;
      throw error;
    }
  }

  updateAvgTime(newTime) {
    this.metrics.avgGenerationTime = 
      (this.metrics.avgGenerationTime + newTime) / 2;
  }

  getHealthStats() {
    return {
      ...this.metrics,
      successRate: this.metrics.successes / this.metrics.requests,
      isHealthy: this.metrics.successRate > 0.90,
      avgCostPerImage: this.metrics.totalCost / this.metrics.successes
    };
  }
}
```

### Next Steps for Implementation
1. Add FAL.AI API key to environment variables
2. Install @fal-ai/client package
3. Create image generation API routes
4. Implement campaign image generation workflow
5. Add loyalty card background enhancement
6. Set up cost tracking and monitoring
7. Test with real campaign scenarios
8. Implement caching and optimization

### References
- [FAL.AI Documentation](https://docs.fal.ai)
- [FLUX Model Documentation](https://docs.fal.ai/models/flux)
- [Image Generation Best Practices](https://docs.fal.ai/guides/image-generation)
- [API Client Documentation](https://docs.fal.ai/api-reference/client)