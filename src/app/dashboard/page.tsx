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

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCards: 0,
    totalStamps: 0,
    campaignsSent: 0
  })
  // const [recentCustomers, setRecentCustomers] = useState([])
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [hasCards, setHasCards] = useState(false)
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
        const totalStamps = processedCards.reduce((sum, card: any) => {
          const customerCards = card.customer_loyalty_cards || []
          return sum + customerCards.reduce((cardSum: number, cc: any) => cardSum + (cc.current_stamps || 0), 0)
        }, 0)

        setStats({
          totalCustomers: customersCount || 0,
          activeCards: activeCardsCount,
          totalStamps: totalStamps,
          campaignsSent: 0 // Keep this as 0 for now since campaigns aren't implemented yet
        })

        setHasCards(processedCards.length > 0)

        // Update AI insights based on actual data
        if (processedCards.length === 0) {
          setAiInsights([
            {
              id: '1',
              type: 'campaign_suggestion',
              title: 'Oportunidade de Re-engajamento',
              description: 'Seus primeiros clientes estão esperando! Crie seu primeiro cartão de fidelidade para começar a atrair clientes.',
              recommended_action: 'Criar cartão de fidelidade',
              priority: 'high'
            }
          ])
        } else {
          setAiInsights([
            {
              id: '2',
              type: 'growth_opportunity',
              title: 'Excelente Progresso!',
              description: `Você já tem ${processedCards.length} cartão${processedCards.length > 1 ? 'ões' : ''} de fidelidade criado${processedCards.length > 1 ? 's' : ''}. Continue promovendo para atrair mais clientes.`,
              recommended_action: 'Ver analytics detalhados',
              priority: 'medium'
            }
          ])
        }

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-gray-500 mt-1">
              Clientes cadastrados na plataforma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Cartões Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCards}</div>
            <p className="text-xs text-gray-500 mt-1">
              Cartões de fidelidade em uso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Selos Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStamps}</div>
            <p className="text-xs text-gray-500 mt-1">
              Selos atribuídos este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Campanhas Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.campaignsSent}</div>
            <p className="text-xs text-gray-500 mt-1">
              Mensagens enviadas este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span>IA Insights</span>
          </CardTitle>
          <CardDescription>
            Sugestões inteligentes para melhorar seu programa de fidelidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aiInsights.map((insight) => (
              <div key={insight.id} className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {insight.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {insight.description}
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" className="gradient-primary text-white" asChild>
                        <Link href={hasCards ? "/dashboard/cartoes" : "/dashboard/cartoes/novo"}>
                          <Sparkles className="w-4 h-4 mr-1" />
                          {insight.recommended_action}
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium flex items-center ${
                    insight.priority === 'high' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {insight.priority === 'high' ? 'Alta' : 'Média'} Prioridade
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Primeiros Passos</CardTitle>
            <CardDescription>
              Configure sua plataforma de fidelidade em poucos minutos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm">Conta criada</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  hasCards ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {hasCards ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-gray-600 text-xs">1</span>
                  )}
                </div>
                <span className="text-sm">Criar primeiro cartão de fidelidade</span>
              </div>
              {!hasCards ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/cartoes/novo">Criar</Link>
                </Button>
              ) : (
                <span className="text-sm text-green-600 font-medium">Concluído</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs">2</span>
                </div>
                <span className="text-sm">Configurar WhatsApp</span>
              </div>
              <Button size="sm" variant="outline" disabled>
                Em breve
              </Button>
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