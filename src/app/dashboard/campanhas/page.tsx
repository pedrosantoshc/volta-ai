'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Plus, Search, Send, Eye } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  type: 'manual' | 'ai_generated'
  trigger: {
    type: string
    conditions: any
  }
  content: {
    message: string
    image_url?: string
    cta_text?: string
    offer_details?: string
  }
  target_audience: {
    segments: string[]
    criteria: any
  }
  schedule: {
    send_immediately?: boolean
    scheduled_date?: string
    recurring?: boolean
  }
  status: 'draft' | 'active' | 'paused' | 'completed'
  performance: {
    sent_count: number
    delivered_count: number
    read_count: number
    clicked_count: number
    converted_count: number
    revenue_attributed?: number
  }
  created_at: string
}

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCampaigns()
  }, [])

  useEffect(() => {
    filterCampaigns()
  }, [campaigns, searchQuery, statusFilter, typeFilter])

  const loadCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false })

      if (campaignsError) {
        console.error('Error loading campaigns:', campaignsError)
        setError('Erro ao carregar campanhas.')
        return
      }

      setCampaigns(campaignsData || [])
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const filterCampaigns = () => {
    let filtered = campaigns

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.content.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter)
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.type === typeFilter)
    }

    setFilteredCampaigns(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa'
      case 'draft': return 'Rascunho'
      case 'paused': return 'Pausada'
      case 'completed': return 'Concluída'
      default: return status
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'manual': return 'Manual'
      case 'ai_generated': return 'IA'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800'
      case 'ai_generated': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateEngagementRate = (performance: Campaign['performance']) => {
    if (performance.sent_count === 0) return 0
    return Math.round((performance.read_count / performance.sent_count) * 100)
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
            <MessageSquare className="w-8 h-8 text-purple-600" />
            <span>Campanhas</span>
          </h1>
          <p className="text-gray-600">Gerencie suas campanhas de marketing via WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Button className="gradient-primary text-white" asChild>
            <Link href="/dashboard/campanhas/nova">
              <Plus className="w-4 h-4 mr-2" />
              Nova Campanha
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/insights">
              ✨ IA Insights
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {campaigns.length}
              </div>
              <p className="text-sm text-gray-600">Total Campanhas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {campaigns.filter(c => c.status === 'active').length}
              </div>
              <p className="text-sm text-gray-600">Campanhas Ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {campaigns.reduce((sum, c) => sum + c.performance.sent_count, 0)}
              </div>
              <p className="text-sm text-gray-600">Mensagens Enviadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {campaigns.length > 0 
                  ? Math.round(campaigns.reduce((sum, c) => sum + calculateEngagementRate(c.performance), 0) / campaigns.length)
                  : 0}%
              </div>
              <p className="text-sm text-gray-600">Taxa Engajamento</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar campanhas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="ai_generated">IA Gerada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{campaign.name}</CardTitle>
                    <CardDescription className="text-sm">
                      Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                    <Badge className={getTypeColor(campaign.type)}>
                      {getTypeLabel(campaign.type)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Message Preview */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 line-clamp-3">
                    &quot;{campaign.content.message}&quot;
                  </p>
                </div>

                {/* Audience */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Público-alvo:</h4>
                  <div className="flex flex-wrap gap-1">
                    {campaign.target_audience.segments.map((segment, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {segment}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Performance */}
                {campaign.performance.sent_count > 0 && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Send className="w-3 h-3" />
                        <span>Enviadas</span>
                      </div>
                      <div className="font-medium">{campaign.performance.sent_count}</div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Eye className="w-3 h-3" />
                        <span>Lidas</span>
                      </div>
                      <div className="font-medium">
                        {campaign.performance.read_count} ({calculateEngagementRate(campaign.performance)}%)
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/dashboard/campanhas/${campaign.id}`}>
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Link>
                  </Button>
                  {campaign.status === 'draft' && (
                    <Button
                      size="sm"
                      className="flex-1 gradient-primary text-white"
                      asChild
                    >
                      <Link href={`/dashboard/campanhas/${campaign.id}/editar`}>
                        Editar
                      </Link>
                    </Button>
                  )}
                  {campaign.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      Pausar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Nenhuma campanha encontrada'
                : 'Nenhuma campanha criada ainda'
              }
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Tente ajustar os filtros para ver mais resultados.'
                : 'Crie sua primeira campanha de WhatsApp para engajar seus clientes e aumentar as vendas.'
              }
            </p>
            <div className="flex gap-2">
              <Button className="gradient-primary text-white" asChild>
                <Link href="/dashboard/campanhas/nova">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Campanha
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/insights">
                  ✨ Ver Insights IA
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}