'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Brain, TrendingUp, Users, Zap, RefreshCw, MessageSquare, Target } from 'lucide-react'

interface CustomerInsight {
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

interface BusinessContext {
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

export default function InsightsPage() {
  const [insights, setInsights] = useState<CustomerInsight[]>([])
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setLoading(true)

      // Load business context
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', user.id)
        .single()

      if (businessError || !business) {
        setError('Erro ao carregar dados do negócio.')
        return
      }

      // Load customers data
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          customer_loyalty_cards (
            id,
            current_stamps,
            status,
            total_redeemed,
            loyalty_card:loyalty_cards (
              rules
            )
          )
        `)
        .eq('business_id', user.id)

      if (customersError) {
        console.error('Error loading customers:', customersError)
        setError('Erro ao carregar dados dos clientes.')
        return
      }

      // Load recent transactions for activity analysis
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const { data: recentTransactions, error: transactionsError } = await supabase
        .from('stamp_transactions')
        .select(`
          *,
          customer_loyalty_cards (
            customer:customers (
              enrollment_date
            )
          )
        `)
        .gte('created_at', oneWeekAgo.toISOString())

      if (transactionsError) {
        console.error('Error loading transactions:', transactionsError)
      }

      // Count loyalty cards
      const { count: totalCards } = await supabase
        .from('customer_loyalty_cards')
        .select('*', { count: 'exact', head: true })
        .eq('loyalty_card_id', (await supabase
          .from('loyalty_cards')
          .select('id')
          .eq('business_id', user.id)
          .single()
        ).data?.id || '')

      // Build business context
      const context: BusinessContext = {
        businessName: business.name,
        businessType: business.settings?.business_type || 'restaurant',
        aiTone: business.settings?.ai_tone || 'amigável',
        brandVoice: business.settings?.brand_voice,
        totalCustomers: customers?.length || 0,
        totalCards: totalCards || 0,
        recentActivity: {
          stampsThisWeek: recentTransactions?.length || 0,
          newCustomersThisWeek: recentTransactions?.filter(t => 
            t.customer_loyalty_cards?.customer?.enrollment_date &&
            new Date(t.customer_loyalty_cards.customer.enrollment_date) >= oneWeekAgo
          ).length || 0,
          completedCardsThisWeek: customers?.filter(c =>
            c.customer_loyalty_cards?.some((card: any) => card.status === 'completed')
          ).length || 0
        }
      }

      setBusinessContext(context)

      // Generate AI insights via API
      await generateInsightsAPI(user.id)
    } catch (err) {
      console.error('Error loading insights:', err)
      setError('Erro inesperado ao carregar insights.')
    } finally {
      setLoading(false)
    }
  }

  const generateInsightsAPI = async (businessId: string) => {
    setGenerating(true)
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }

      const data = await response.json()
      setInsights(data.insights)
      
      if (data.businessContext) {
        setBusinessContext(data.businessContext)
      }
    } catch (err) {
      console.error('Error generating insights:', err)
      setError('Erro ao gerar insights. Tente novamente.')
      
      // Fallback to client-side generation if API fails
      if (businessContext) {
        const fallbackInsights = generateFallbackInsights([], [], businessContext)
        setInsights(fallbackInsights)
      }
    } finally {
      setGenerating(false)
    }
  }

  const generateFallbackInsights = (customers: any[], transactions: any[], context: BusinessContext): CustomerInsight[] => {
    const insights: CustomerInsight[] = []
    const now = new Date()
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Analyze inactive customers
    const inactiveCustomers = customers.filter(customer => 
      !customer.last_visit || new Date(customer.last_visit) < fifteenDaysAgo
    )

    if (inactiveCustomers.length > 0) {
      insights.push({
        type: 'inactive_customers',
        title: 'Clientes Inativos Identificados',
        description: `${inactiveCustomers.length} clientes não visitam há mais de 15 dias. Uma campanha de reconquista pode reativá-los e aumentar o faturamento.`,
        count: inactiveCustomers.length,
        recommendedAction: 'Enviar campanha "Sentimos sua falta" com oferta especial',
        expectedImpact: `Retorno de 20-30% dos clientes (${Math.round(inactiveCustomers.length * 0.25)} clientes)`,
        priority: inactiveCustomers.length > 10 ? 'high' : 'medium',
        campaignSuggestion: {
          title: 'Campanha Sentimos Sua Falta',
          message: `Olá! Sentimos sua falta no ${context.businessName} 😊 Volte essa semana e ganhe 15% de desconto!`,
          targetAudience: `${inactiveCustomers.length} clientes inativos há 15+ dias`,
          expectedEngagement: '25%',
          estimatedRevenue: `R$ ${(inactiveCustomers.length * 0.25 * 35).toFixed(0)}`
        }
      })
    }

    // Analyze frequent customers
    const frequentCustomers = customers.filter(customer => customer.total_visits >= 5)
    if (frequentCustomers.length > 0) {
      insights.push({
        type: 'frequent_visitors',
        title: 'Oportunidade Programa VIP',
        description: `${frequentCustomers.length} clientes são frequentes e podem se tornar embaixadores da marca com benefícios exclusivos.`,
        count: frequentCustomers.length,
        recommendedAction: 'Criar programa VIP com benefícios exclusivos',
        expectedImpact: `Aumento de 40% na frequência (${Math.round(frequentCustomers.length * 0.4)} clientes mais ativos)`,
        priority: 'medium',
        campaignSuggestion: {
          title: 'Convite Programa VIP',
          message: `🌟 Parabéns! Você foi selecionado para nosso Programa VIP no ${context.businessName}. Benefícios exclusivos te aguardam!`,
          targetAudience: `${frequentCustomers.length} clientes frequentes`,
          expectedEngagement: '60%',
          estimatedRevenue: `R$ ${(frequentCustomers.length * 0.6 * 50).toFixed(0)}`
        }
      })
    }

    // Analyze near completion cards
    const nearCompletionCustomers = customers.filter(customer =>
      customer.customer_loyalty_cards?.some((card: any) => {
        const stampsRequired = card.loyalty_card?.rules?.stamps_required || 10
        return card.current_stamps >= stampsRequired * 0.8 && card.status === 'active'
      })
    )

    if (nearCompletionCustomers.length > 0) {
      insights.push({
        type: 'completed_cards',
        title: 'Cartões Próximos da Recompensa',
        description: `${nearCompletionCustomers.length} clientes estão próximos de completar seus cartões. Um lembrete pode acelerar a conversão.`,
        count: nearCompletionCustomers.length,
        recommendedAction: 'Enviar lembrete sobre recompensa próxima',
        expectedImpact: `Conversão de 70% dos cartões (${Math.round(nearCompletionCustomers.length * 0.7)} recompensas)`,
        priority: 'high',
        campaignSuggestion: {
          title: 'Quase Lá - Recompensa Próxima',
          message: `🎯 Você está quase ganhando sua recompensa no ${context.businessName}! Faltam poucos selos. Venha hoje!`,
          targetAudience: `${nearCompletionCustomers.length} clientes próximos da recompensa`,
          expectedEngagement: '70%',
          estimatedRevenue: `R$ ${(nearCompletionCustomers.length * 0.7 * 30).toFixed(0)}`
        }
      })
    }

    // Analyze new customers
    const newCustomers = customers.filter(customer =>
      customer.enrollment_date && new Date(customer.enrollment_date) > sevenDaysAgo
    )

    if (newCustomers.length > 0) {
      insights.push({
        type: 'new_customers',
        title: 'Novos Clientes para Engajar',
        description: `${newCustomers.length} novos clientes se cadastraram esta semana. É crucial criar uma primeira impressão positiva.`,
        count: newCustomers.length,
        recommendedAction: 'Enviar mensagem de boas-vindas com dica especial',
        expectedImpact: `Aumento de 35% na retenção de novos clientes`,
        priority: 'medium',
        campaignSuggestion: {
          title: 'Bem-vindos ao Programa',
          message: `Bem-vindo ao ${context.businessName}! 🎉 Como novo membro, ganhe um desconto na sua próxima visita. Seja bem-vindo!`,
          targetAudience: `${newCustomers.length} novos clientes desta semana`,
          expectedEngagement: '45%',
          estimatedRevenue: `R$ ${(newCustomers.length * 0.45 * 25).toFixed(0)}`
        }
      })
    }

    return insights.slice(0, 4) // Limit to 4 main insights
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return 'Média'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'inactive_customers': return Users
      case 'frequent_visitors': return TrendingUp
      case 'completed_cards': return Target
      case 'new_customers': return Zap
      default: return Brain
    }
  }

  const createCampaign = async (insight: CustomerInsight) => {
    if (insight.campaignSuggestion) {
      // Navigate to campaign creation with pre-filled data
      router.push(`/dashboard/campanhas/nova?type=${insight.type}&title=${encodeURIComponent(insight.campaignSuggestion.title)}&message=${encodeURIComponent(insight.campaignSuggestion.message)}`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Brain className="w-8 h-8 text-purple-600" />
            <span>IA Insights</span>
          </h1>
          <p className="text-gray-600">Insights inteligentes para impulsionar seu negócio</p>
        </div>
        <Button
          onClick={loadInsights}
          disabled={generating}
          className="gradient-primary text-white"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Insights
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Business Overview */}
      {businessContext && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {businessContext.totalCustomers}
              </div>
              <p className="text-sm text-gray-600">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {businessContext.recentActivity.stampsThisWeek}
              </div>
              <p className="text-sm text-gray-600">Selos Esta Semana</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {businessContext.recentActivity.newCustomersThisWeek}
              </div>
              <p className="text-sm text-gray-600">Novos Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {businessContext.recentActivity.completedCardsThisWeek}
              </div>
              <p className="text-sm text-gray-600">Cartões Completos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, index) => {
          const IconComponent = getInsightIcon(insight.type)
          return (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getPriorityColor(insight.priority)}>
                          {getPriorityLabel(insight.priority)}
                        </Badge>
                        <Badge variant="outline">
                          {insight.count} clientes
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{insight.description}</p>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">Ação Recomendada:</h4>
                  <p className="text-blue-800 text-sm">{insight.recommendedAction}</p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">Impacto Esperado:</h4>
                  <p className="text-green-800 text-sm">{insight.expectedImpact}</p>
                </div>

                {insight.campaignSuggestion && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Campanha Sugerida
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                      <p className="font-medium text-sm">{insight.campaignSuggestion.title}</p>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                        "{insight.campaignSuggestion.message}"
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Público:</span> {insight.campaignSuggestion.targetAudience}
                        </div>
                        <div>
                          <span className="font-medium">Engajamento:</span> {insight.campaignSuggestion.expectedEngagement}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Receita Estimada:</span> {insight.campaignSuggestion.estimatedRevenue}
                      </div>
                    </div>
                    <Button
                      onClick={() => createCampaign(insight)}
                      className="w-full mt-3 gradient-primary text-white"
                      size="sm"
                    >
                      ✨ Criar Campanha
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {insights.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum insight disponível
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Precisamos de mais dados de clientes para gerar insights inteligentes. 
              Continue usando o programa de fidelidade para obter análises personalizadas.
            </p>
            <Button className="gradient-primary text-white" onClick={loadInsights}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}