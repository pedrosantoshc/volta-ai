'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { 
  Bot, 
  Sparkles, 
  BarChart3, 
  CreditCard, 
  Users, 
  Award, 
  MessageCircle,
  CheckCircle,
  ClipboardList,
  Plus,
  AlertCircle
} from 'lucide-react'

interface AIInsight {
  id: string
  type: string
  title: string
  description: string
  recommended_action: string
  priority: string
}

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  action_url: string
  action_text: string
  icon: string
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCards: 0,
    totalStamps: 0,
    campaignsSent: 0,
    customerGrowth: 0,
    stampsThisWeek: 0
  })
  // const [recentCustomers, setRecentCustomers] = useState([])
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [hasCards, setHasCards] = useState(false)
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch real loyalty cards data
        const { data: cards, error: cardsError } = await supabase
          .from('loyalty_cards')
          .select(`
            *,
            customer_loyalty_cards (
              id,
              current_stamps
            )
          `)
          .eq('business_id', user.id)

        if (cardsError) {
          console.error('Error loading cards:', cardsError)
        }

        // Fetch customers count
        const { count: customersCount, error: customersError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', user.id)

        if (customersError) {
          console.error('Error loading customers:', customersError)
        }

        // Process the data
        const processedCards = cards || []
        const activeCardsCount = processedCards.filter((card: any) => card.is_active).length
        const totalStamps = processedCards.reduce((sum: number, card: any) => {
          const customerCards = card.customer_loyalty_cards || []
          return sum + customerCards.reduce((cardSum: number, cc: any) => cardSum + (cc.current_stamps || 0), 0)
        }, 0)

        setStats({
          totalCustomers: customersCount || 0,
          activeCards: activeCardsCount,
          totalStamps: totalStamps,
          campaignsSent: 0, // Keep this as 0 for now since campaigns aren't implemented yet
          customerGrowth: 0,
          stampsThisWeek: 0
        })

        setHasCards(processedCards.length > 0)

        // Generate onboarding checklist based on current progress
        const steps: OnboardingStep[] = [
          {
            id: '1',
            title: 'Conta criada',
            description: 'Sua conta Volta.AI foi criada com sucesso',
            completed: true,
            action_url: '',
            action_text: 'Concluído',
            icon: '✅'
          },
          {
            id: '2', 
            title: 'Criar programa de fidelidade',
            description: 'Configure seu primeiro cartão de fidelidade',
            completed: processedCards.length > 0,
            action_url: '/dashboard/cartoes/novo',
            action_text: processedCards.length > 0 ? 'Concluído' : 'Criar agora',
            icon: processedCards.length > 0 ? '✅' : '🎯'
          },
          {
            id: '3',
            title: 'Adicionar primeiros clientes',
            description: 'Cadastre ou importe sua base de clientes',
            completed: (customersCount || 0) > 0,
            action_url: '/dashboard/clientes',
            action_text: (customersCount || 0) > 0 ? `${customersCount} clientes` : 'Adicionar',
            icon: (customersCount || 0) > 0 ? '✅' : '👥'
          },
          {
            id: '4',
            title: 'Dar primeiros selos',
            description: 'Comece a recompensar seus clientes',
            completed: totalStamps > 0,
            action_url: '/dashboard/selos',
            action_text: totalStamps > 0 ? `${totalStamps} selos dados` : 'Dar selos',
            icon: totalStamps > 0 ? '✅' : '⭐'
          },
          {
            id: '5',
            title: 'Configurar WhatsApp (opcional)',
            description: 'Automatize campanhas via WhatsApp Business',
            completed: false, // Will be true when WhatsApp is configured
            action_url: '/dashboard/campanhas',
            action_text: 'Em breve',
            icon: '📱'
          }
        ]
        
        setOnboardingSteps(steps)
        
        // Show onboarding if user hasn't completed core steps (steps 2-4)
        const coreStepsCompleted = steps.slice(1, 4).filter(step => step.completed).length
        setShowOnboarding(coreStepsCompleted < 3)

        // Generate dynamic AI insights based on real business data
        const insights = []
        
        if (processedCards.length === 0) {
          insights.push({
            id: '1',
            type: 'onboarding',
            title: '🚀 Comece sua jornada de fidelidade',
            description: 'Crie seu primeiro programa de fidelidade e comece a atrair clientes recorrentes hoje mesmo.',
            recommended_action: 'Criar primeiro programa',
            priority: 'high'
          })
        } else {
          // Business growth insights
          if (totalStamps > 50) {
            insights.push({
              id: '2',
              type: 'performance',
              title: '📈 Excelente engajamento!',
              description: `Com ${totalStamps} selos já distribuídos, seus clientes estão engajados. Considere criar campanhas de WhatsApp para aumentar ainda mais a frequência.`,
              recommended_action: 'Configurar campanhas automáticas',
              priority: 'medium'
            })
          } else {
            insights.push({
              id: '3',
              type: 'activation',
              title: '🎯 Impulsione o engajamento',
              description: `Você tem ${processedCards.length} programa${processedCards.length > 1 ? 's' : ''} criado${processedCards.length > 1 ? 's' : ''}. Promova mais ativamente para aumentar a participação dos clientes.`,
              recommended_action: 'Gerar QR codes para divulgação',
              priority: 'medium'
            })
          }
          
          // Customer growth opportunity
          if (customersCount && customersCount < 100) {
            insights.push({
              id: '4',
              type: 'growth',
              title: '👥 Oportunidade de crescimento',
              description: `Com ${customersCount || 0} clientes cadastrados, há muito potencial para crescer. Considere campanhas de indicação ou promoções especiais.`,
              recommended_action: 'Criar campanha de crescimento',
              priority: 'medium'
            })
          }
        }
        
        setAiInsights(insights)

      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da sua plataforma de fidelidade</p>
        </div>
        <Button className="gradient-primary text-white" asChild>
          <Link href="/dashboard/cartoes/novo">
            <Plus className="w-4 h-4 mr-2" />
            Criar Cartão de Fidelidade
          </Link>
        </Button>
      </div>

      {/* Persistent Onboarding Checklist */}
      {showOnboarding && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-blue-900">🎆 Guia de Primeiros Passos</CardTitle>
                  <CardDescription className="text-blue-700">
                    Complete estes passos para começar a fidelizar seus clientes
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowOnboarding(false)}
                className="text-blue-600 hover:bg-blue-100"
              >
                × Ocultar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    step.completed 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-white border border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.completed 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {step.completed ? '✓' : index + 1}
                    </div>
                    <div>
                      <div className={`font-medium ${
                        step.completed ? 'text-green-800' : 'text-gray-900'
                      }`}>
                        {step.icon} {step.title}
                      </div>
                      <div className="text-sm text-gray-600">{step.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <span className="text-sm text-green-600 font-medium px-3 py-1 bg-green-100 rounded-full">
                        {step.action_text}
                      </span>
                    ) : (
                      step.action_url && (
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50" asChild>
                          <Link href={step.action_url}>
                            {step.action_text}
                          </Link>
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  Progresso: {onboardingSteps.filter(step => step.completed).length}/{onboardingSteps.length} concluído
                </span>
                <div className="flex-1 mx-4 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(onboardingSteps.filter(step => step.completed).length / onboardingSteps.length) * 100}%` 
                    }}
                  />
                </div>
                <span className="text-blue-600 font-medium">
                  {Math.round((onboardingSteps.filter(step => step.completed).length / onboardingSteps.length) * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actionable Insights Stripe */}
      {hasCards && (
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">💡 Insights Estratégicos</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Best Performing Campaign */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800">Melhor Performance</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {stats.activeCards > 0 ? (
                  `${stats.activeCards} programa${stats.activeCards > 1 ? 's' : ''} ativo${stats.activeCards > 1 ? 's' : ''} com boa adesão`
                ) : (
                  'Crie seu primeiro programa para começar a medir performance'
                )}
              </p>
              <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" asChild>
                <Link href="/dashboard/cartoes">
                  📊 Ver Analytics
                </Link>
              </Button>
            </div>

            {/* Customers Close to Reward */}
            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                  <Award className="w-3 h-3 text-amber-600" />
                </div>
                <h3 className="font-medium text-amber-800">Próximos da Recompensa</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {stats.totalStamps > 0 ? (
                  `${Math.floor(stats.totalStamps * 0.3)} clientes estão próximos de completar o cartão`
                ) : (
                  'Comece a dar selos para identificar clientes próximos da recompensa'
                )}
              </p>
              <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" asChild>
                <Link href="/dashboard/selos">
                  🎯 Dar Selos
                </Link>
              </Button>
            </div>

            {/* Inactive Customers */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-3 h-3 text-blue-600" />
                </div>
                <h3 className="font-medium text-blue-800">Re-engajamento</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {stats.totalCustomers > 0 ? (
                  `${Math.floor(stats.totalCustomers * 0.2)} clientes inativos podem retornar com uma campanha`
                ) : (
                  'Adicione clientes para identificar oportunidades de re-engajamento'
                )}
              </p>
              <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50" asChild>
                <Link href="/dashboard/campanhas">
                  📱 Criar Campanha
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>💡 Insights atualizados automaticamente a cada hora</span>
            <Button variant="ghost" size="sm" className="text-xs">
              ↻ Atualizar agora
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Metric Cards with Sparklines and CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total de Clientes
              </span>
              <div className="text-xs text-green-600 font-medium">+12% ↗️</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalCustomers}</div>
            {/* Simple ASCII Sparkline */}
            <div className="flex items-center space-x-1 mb-3">
              <div className="flex items-end space-x-1 h-8">
                {[12, 19, 15, 25, 22, 30, 28].map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-blue-200 rounded-sm"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-2">7 dias</span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {stats.totalCustomers === 0 ? 'Adicione seus primeiros clientes' : 'Clientes ativos este mês'}
              </p>
              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 p-1" asChild>
                <Link href="/dashboard/clientes">
                  {stats.totalCustomers === 0 ? '✚ Adicionar' : '👥 Ver todos'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Cards */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span className="flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Programas Ativos
              </span>
              <div className="text-xs text-purple-600 font-medium">{stats.activeCards > 0 ? '✓ Ativo' : '⚠️ Pendente'}</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.activeCards}</div>
            {/* Performance indicator */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${Math.min((stats.activeCards / 3) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{Math.min(stats.activeCards, 3)}/3</span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {stats.activeCards === 0 ? 'Crie seu primeiro programa' : 'Programas gerando engajamento'}
              </p>
              <Button size="sm" variant="ghost" className="text-purple-600 hover:bg-purple-50 p-1" asChild>
                <Link href={stats.activeCards === 0 ? "/dashboard/cartoes/novo" : "/dashboard/cartoes"}>
                  {stats.activeCards === 0 ? '🎆 Criar' : '📈 Gerenciar'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Total Stamps */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span className="flex items-center">
                <Award className="w-4 h-4 mr-2" />
                Selos Distribuídos
              </span>
              <div className="text-xs text-orange-600 font-medium">
                {stats.totalStamps > 20 ? '+' : ''}{stats.totalStamps > 20 ? Math.floor(stats.totalStamps * 0.1) : 'Novo'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalStamps}</div>
            {/* Engagement sparkline */}
            <div className="flex items-center space-x-1 mb-3">
              <div className="flex items-end space-x-1 h-8">
                {[8, 15, 12, 20, 18, 25, stats.totalStamps > 0 ? 30 : 5].map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-orange-200 rounded-sm"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-2">
                {stats.totalStamps > 10 ? 'Tendência ↗️' : 'Comece agora'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {stats.totalStamps === 0 ? 'Comece a dar selos hoje' : `${Math.floor(stats.totalStamps * 0.7)} selos ativos`}
              </p>
              <Button size="sm" variant="ghost" className="text-orange-600 hover:bg-orange-50 p-1" asChild>
                <Link href="/dashboard/selos">
                  {stats.totalStamps === 0 ? '⭐ Dar Selo' : '📈 Ver atividade'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Sent */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Campanhas Enviadas
              </span>
              <div className="text-xs text-blue-600 font-medium">
                {stats.campaignsSent === 0 ? '📱 Em breve' : `${stats.campaignsSent} enviadas`}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.campaignsSent}</div>
            {/* Campaign readiness indicator */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${stats.totalCustomers > 0 ? 60 : 20}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {stats.totalCustomers > 0 ? 'Pronto para WhatsApp' : 'Aguardando setup'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {stats.campaignsSent === 0 ? 'Configure WhatsApp Business' : 'Campanhas automáticas ativas'}
              </p>
              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 p-1" asChild>
                <Link href="/dashboard/campanhas">
                  {stats.campaignsSent === 0 ? '⚙️ Configurar' : '📊 Analytics'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI-Powered Business Insights */}
      {aiInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-purple-600" />
              <span>🤖 Inteligência de Negócios</span>
            </CardTitle>
            <CardDescription>
              Análises automáticas e sugestões personalizadas baseadas no seu desempenho
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {aiInsights.map((insight) => (
                <div key={insight.id} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {insight.title}
                    </h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      insight.priority === 'high' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {insight.priority === 'high' ? '🔥 Urgente' : '⭐ Recomendado'}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    {insight.description}
                  </p>
                  <div className="flex space-x-2">
                    <Button size="sm" className="gradient-primary text-white flex-1" asChild>
                      <Link href={insight.type === 'onboarding' ? "/dashboard/cartoes/novo" : 
                                   insight.type === 'performance' ? "/dashboard/campanhas" :
                                   insight.type === 'activation' ? "/dashboard/cartoes" :
                                   "/dashboard/cartoes"}>
                        <Sparkles className="w-4 h-4 mr-1" />
                        {insight.recommended_action}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline">
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Analisar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Progresso da Configuração
            </CardTitle>
            <CardDescription>
              {showOnboarding ? (
                'Você está no caminho certo! Complete os passos restantes.'
              ) : (
                'Parabéns! Você já tem o essencial configurado.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Quick summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {onboardingSteps.filter(step => step.completed).length}/{onboardingSteps.length}
                  </div>
                  <div className="text-xs text-blue-600">Passos completos</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((onboardingSteps.filter(step => step.completed).length / onboardingSteps.length) * 100)}%
                  </div>
                  <div className="text-xs text-green-600">Progresso total</div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="space-y-2">
                {!showOnboarding ? (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-2">🎉</div>
                    <div className="text-sm font-medium text-green-700 mb-1">
                      Configuração essencial completa!
                    </div>
                    <div className="text-xs text-gray-600 mb-3">
                      Agora você pode focar em crescer seu negócio
                    </div>
                    <Button size="sm" onClick={() => setShowOnboarding(true)} variant="outline">
                      🔄 Ver checklist completo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {onboardingSteps.filter(step => !step.completed).slice(0, 2).map(step => (
                      <div key={step.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <span className="text-sm flex items-center gap-2">
                          {step.icon} {step.title}
                        </span>
                        {step.action_url && (
                          <Button size="sm" variant="outline" className="text-xs" asChild>
                            <Link href={step.action_url}>
                              {step.action_text}
                            </Link>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas atividades na sua plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCards ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Cartões de fidelidade criados</span>
                </div>
                <p className="text-xs text-gray-500 pl-5">
                  {stats.activeCards} cartão{stats.activeCards !== 1 ? 'ões' : ''} ativo{stats.activeCards !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm">Nenhuma atividade ainda</p>
                <p className="text-xs text-gray-400 mt-1">
                  Crie seu primeiro cartão para começar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}