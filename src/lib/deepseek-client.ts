import OpenAI from 'openai'

// DeepSeek API client configuration
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-placeholder-key-for-build',
  baseURL: 'https://api.deepseek.com/v1',
})

export interface CustomerInsight {
  type: 'inactive_customers' | 'frequent_visitors' | 'completed_cards' | 'new_customers' | 'vip_potential'
  title: string
  description: string
  count: number
  recommendedAction: string
  expectedImpact: string
  priority: 'low' | 'medium' | 'high'
  campaignSuggestion?: {
    title: string
    message: string
    targetAudience: string
    expectedEngagement: string
    estimatedRevenue: string
  }
}

export interface BusinessContext {
  businessName: string
  businessType: string
  aiTone: string
  brandVoice?: string
  totalCustomers: number
  totalCards: number
  recentActivity: {
    stampsThisWeek: number
    newCustomersThisWeek: number
    completedCardsThisWeek: number
  }
}

// Generate customer insights using DeepSeek AI
export async function generateCustomerInsights(
  customers: any[],
  loyaltyCards: any[],
  recentTransactions: any[],
  businessContext: BusinessContext
): Promise<CustomerInsight[]> {
  // Check if API key is available at runtime
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-placeholder-key-for-build') {
    console.warn('DeepSeek API key not available, using fallback insights')
    const customerAnalysis = analyzeCustomerData(customers)
    return generateFallbackInsights(customerAnalysis, businessContext)
  }

  try {
    // Analyze customer data to create insights
    const customerAnalysis = analyzeCustomerData(customers)
    
    const prompt = `
Você é um especialista em marketing de fidelidade para restaurantes brasileiros. Analise os dados abaixo e forneça insights acionáveis em português brasileiro.

Contexto do Negócio:
- Nome: ${businessContext.businessName}
- Tipo: ${businessContext.businessType}
- Tom da marca: ${businessContext.aiTone}
- Voice da marca: ${businessContext.brandVoice || 'Não definido'}
- Total de clientes: ${businessContext.totalCustomers}
- Cartões ativos: ${businessContext.totalCards}

Atividade Recente:
- Selos dados esta semana: ${businessContext.recentActivity.stampsThisWeek}
- Novos clientes esta semana: ${businessContext.recentActivity.newCustomersThisWeek}
- Cartões completados esta semana: ${businessContext.recentActivity.completedCardsThisWeek}

Análise de Clientes:
- Clientes inativos (15+ dias): ${customerAnalysis.inactiveCustomers.length}
- Clientes frequentes (5+ visitas/mês): ${customerAnalysis.frequentCustomers.length}
- Clientes com cartões próximos do complete: ${customerAnalysis.nearCompletionCustomers.length}
- Novos clientes (últimos 7 dias): ${customerAnalysis.newCustomers.length}
- Clientes VIP potenciais: ${customerAnalysis.vipPotential.length}

Para cada insight relevante (máximo 4), retorne um JSON com:
{
  "type": "tipo_do_insight",
  "title": "Título curto e impactante",
  "description": "Descrição detalhada do insight",
  "count": numero_de_clientes_afetados,
  "recommendedAction": "Ação recomendada específica",
  "expectedImpact": "Impacto esperado (ex: 'Aumento de 25% nas visitas')",
  "priority": "high|medium|low",
  "campaignSuggestion": {
    "title": "Nome da campanha",
    "message": "Mensagem WhatsApp sugerida (max 160 chars, tom ${businessContext.aiTone})",
    "targetAudience": "Público-alvo",
    "expectedEngagement": "Taxa de engajamento esperada",
    "estimatedRevenue": "Receita estimada"
  }
}

Foque em insights que geram ROI mensurável. Use linguagem brasileira natural e seja específico nos números e recomendações.
`

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em marketing de fidelidade para restaurantes brasileiros. Responda sempre em português brasileiro com insights acionáveis e específicos.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('Empty response from DeepSeek API')
    }

    // Parse AI response (expecting JSON array)
    let insights: CustomerInsight[]
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: try to parse entire response
        insights = JSON.parse(aiResponse)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback to manual insights based on data
      insights = generateFallbackInsights(customerAnalysis, businessContext)
    }

    return insights.slice(0, 4) // Limit to 4 insights
  } catch (error) {
    console.error('DeepSeek API error:', error)
    // Return fallback insights based on data analysis
    const customerAnalysis = analyzeCustomerData(customers)
    return generateFallbackInsights(customerAnalysis, businessContext)
  }
}

// Generate campaign content using DeepSeek AI
export async function generateCampaignContent(
  campaignType: string,
  targetAudience: string,
  businessContext: BusinessContext,
  customPrompt?: string
): Promise<{
  title: string
  message: string
  imagePrompt?: string
  expectedResults: string
}> {
  // Check if API key is available at runtime
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-placeholder-key-for-build') {
    console.warn('DeepSeek API key not available, using fallback campaign content')
    return {
      title: `Campanha ${campaignType}`,
      message: `Olá! Temos uma oferta especial para você no ${businessContext.businessName} 😊 Venha nos visitar!`,
      expectedResults: 'Engajamento estimado de 20-25%'
    }
  }

  try {
    const prompt = customPrompt || `
Crie uma campanha de WhatsApp para ${businessContext.businessName} (${businessContext.businessType}).

Tipo de campanha: ${campaignType}
Público-alvo: ${targetAudience}
Tom da marca: ${businessContext.aiTone}
Voice da marca: ${businessContext.brandVoice || 'Casual e acolhedor'}

Crie uma mensagem de WhatsApp que:
- Seja authentic e no tom da marca
- Tenha máximo 160 caracteres
- Inclua um call-to-action claro
- Use emojis apropriados
- Seja específica para o contexto brasileiro

Retorne JSON com:
{
  "title": "Nome da campanha",
  "message": "Mensagem do WhatsApp",
  "imagePrompt": "Descrição para geração de imagem (opcional)",
  "expectedResults": "Resultados esperados da campanha"
}
`

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em marketing digital para restaurantes brasileiros. Crie campanhas engajantes e autênticas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 800,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('Empty response from DeepSeek API')
    }

    // Parse AI response
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      } else {
        return JSON.parse(aiResponse)
      }
    } catch (parseError) {
      console.error('Failed to parse campaign response:', parseError)
      return {
        title: `Campanha ${campaignType}`,
        message: `Olá! Sentimos sua falta no ${businessContext.businessName} 😊 Volte e ganhe um desconto especial!`,
        expectedResults: 'Engajamento estimado de 20-25%'
      }
    }
  } catch (error) {
    console.error('DeepSeek campaign generation error:', error)
    // Return fallback campaign
    return {
      title: `Campanha ${campaignType}`,
      message: `Olá! Sentimos sua falta no ${businessContext.businessName} 😊 Volte e ganhe um desconto especial!`,
      expectedResults: 'Engajamento estimado de 20-25%'
    }
  }
}

// Analyze customer data to extract patterns
function analyzeCustomerData(customers: any[]) {
  const now = new Date()
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  return {
    inactiveCustomers: customers.filter(customer => 
      !customer.last_visit || new Date(customer.last_visit) < fifteenDaysAgo
    ),
    frequentCustomers: customers.filter(customer => 
      customer.total_visits >= 5 && 
      customer.last_visit && new Date(customer.last_visit) > thirtyDaysAgo
    ),
    nearCompletionCustomers: customers.filter(customer =>
      customer.customer_loyalty_cards?.some((card: any) => {
        const stampsRequired = card.loyalty_card?.rules?.stamps_required || 10
        return card.current_stamps >= stampsRequired * 0.8 && card.status === 'active'
      })
    ),
    newCustomers: customers.filter(customer =>
      customer.enrollment_date && new Date(customer.enrollment_date) > sevenDaysAgo
    ),
    vipPotential: customers.filter(customer =>
      customer.total_visits >= 10 && 
      customer.customer_loyalty_cards?.some((card: any) => card.total_redeemed >= 2)
    )
  }
}

// Generate fallback insights when AI fails
function generateFallbackInsights(
  customerAnalysis: any,
  businessContext: BusinessContext
): CustomerInsight[] {
  const insights: CustomerInsight[] = []

  // Inactive customers insight
  if (customerAnalysis.inactiveCustomers.length > 0) {
    insights.push({
      type: 'inactive_customers',
      title: 'Clientes Inativos Identificados',
      description: `${customerAnalysis.inactiveCustomers.length} clientes não visitam há mais de 15 dias. Uma campanha de reconquista pode reativá-los.`,
      count: customerAnalysis.inactiveCustomers.length,
      recommendedAction: 'Enviar campanha "Sentimos sua falta" com desconto especial',
      expectedImpact: 'Retorno de 20-30% dos clientes inativos',
      priority: customerAnalysis.inactiveCustomers.length > 10 ? 'high' : 'medium',
      campaignSuggestion: {
        title: 'Campanha Sentimos Sua Falta',
        message: `Olá! Sentimos sua falta no ${businessContext.businessName} 😊 Volte essa semana e ganhe 15% de desconto!`,
        targetAudience: 'Clientes inativos há 15+ dias',
        expectedEngagement: '25%',
        estimatedRevenue: `R$ ${(customerAnalysis.inactiveCustomers.length * 0.25 * 35).toFixed(0)}`
      }
    })
  }

  // Frequent customers insight
  if (customerAnalysis.frequentCustomers.length > 0) {
    insights.push({
      type: 'frequent_visitors',
      title: 'Oportunidade Programa VIP',
      description: `${customerAnalysis.frequentCustomers.length} clientes são frequentes e podem se tornar embaixadores da marca.`,
      count: customerAnalysis.frequentCustomers.length,
      recommendedAction: 'Criar programa VIP com benefícios exclusivos',
      expectedImpact: 'Aumento de 40% na frequência de visitas',
      priority: 'medium',
      campaignSuggestion: {
        title: 'Convite Programa VIP',
        message: `🌟 Parabéns! Você foi selecionado para nosso Programa VIP no ${businessContext.businessName}. Benefícios exclusivos te aguardam!`,
        targetAudience: 'Clientes frequentes (5+ visitas/mês)',
        expectedEngagement: '60%',
        estimatedRevenue: `R$ ${(customerAnalysis.frequentCustomers.length * 0.6 * 50).toFixed(0)}`
      }
    })
  }

  // Near completion insight
  if (customerAnalysis.nearCompletionCustomers.length > 0) {
    insights.push({
      type: 'completed_cards',
      title: 'Cartões Próximos da Recompensa',
      description: `${customerAnalysis.nearCompletionCustomers.length} clientes estão próximos de completar seus cartões de fidelidade.`,
      count: customerAnalysis.nearCompletionCustomers.length,
      recommendedAction: 'Lembrar sobre recompensa próxima para motivar visita',
      expectedImpact: 'Conversão de 70% dos cartões próximos',
      priority: 'high',
      campaignSuggestion: {
        title: 'Quase Lá - Recompensa Próxima',
        message: `🎯 Você está quase ganhando sua recompensa no ${businessContext.businessName}! Faltam poucos selos. Venha hoje!`,
        targetAudience: 'Clientes com 80%+ do cartão completo',
        expectedEngagement: '70%',
        estimatedRevenue: `R$ ${(customerAnalysis.nearCompletionCustomers.length * 0.7 * 30).toFixed(0)}`
      }
    })
  }

  return insights
}

export { deepseek }