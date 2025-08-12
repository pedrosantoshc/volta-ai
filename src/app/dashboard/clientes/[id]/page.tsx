'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { getCurrentBusinessId } from '@/lib/business'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Gift, Edit, Trash2, Calendar, Phone, Mail, Shield, ShieldCheck, Activity, Star, CheckCircle } from 'lucide-react'
import Link from "next/link"
import GiveStampDialog from '../_components/GiveStampDialog'

interface CustomerDetail {
  id: string
  name: string
  phone: string
  email?: string
  custom_fields: Record<string, string | number | boolean | string[]>
  enrollment_date: string
  total_visits: number
  total_spent?: number
  last_visit?: string
  tags: string[]
  consent: {
    lgpd_accepted: boolean
    marketing_consent: boolean
    terms_accepted: boolean
    consent_date: string
    consent_source?: string
  }
  customer_loyalty_cards: CustomerLoyaltyCardDetail[]
}

interface ActivityItem {
  id: string
  type: 'enrollment' | 'stamp' | 'redemption' | 'card_completed'
  description: string
  date: string
  icon: any
  color: string
}

interface CustomerLoyaltyCardDetail {
  id: string
  loyalty_card_id: string
  current_stamps: number
  total_redeemed: number
  status: string
  qr_code: string
  wallet_pass_url?: string
  created_at: string
  loyalty_cards: {
    id: string
    name: string
    rules: {
      stamps_required: number
      reward_description: string
      expiry_days?: number
      max_stamps_per_day?: number
    }
  }
}

export default function CustomerDetailPage() {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [giveStampDialog, setGiveStampDialog] = useState<{
    isOpen: boolean
  }>({ isOpen: false })
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get business ID for the user
        const businessId = await getCurrentBusinessId(supabase, user.email!)

        // Load customer with their loyalty cards
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select(`
            *,
            customer_loyalty_cards (
              id,
              loyalty_card_id,
              current_stamps,
              total_redeemed,
              status,
              qr_code,
              wallet_pass_url,
              created_at,
              loyalty_cards (
                id,
                name,
                rules
              )
            )
          `)
          .eq('id', customerId)
          .eq('business_id', businessId)
          .single()

        if (customerError || !customerData) {
          console.error('Error loading customer:', customerError)
          setError('Cliente não encontrado ou você não tem acesso a este cliente.')
          return
        }

        setCustomer(customerData)
        
        // Load customer activities
        await loadCustomerActivities(businessId, customerId)
        
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Erro inesperado ao carregar dados do cliente.')
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      loadCustomer()
    }
  }, [customerId, router, supabase])

  const reloadCustomer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const businessId = await getCurrentBusinessId(supabase, user.email!)

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          *,
          customer_loyalty_cards (
            id,
            loyalty_card_id,
            current_stamps,
            total_redeemed,
            status,
            qr_code,
            wallet_pass_url,
            created_at,
            loyalty_cards (
              id,
              name,
              rules
            )
          )
        `)
        .eq('id', customerId)
        .eq('business_id', businessId)
        .single()

      if (customerError || !customerData) {
        console.error('Error reloading customer:', customerError)
        return
      }

      setCustomer(customerData)
      
      // Reload activities
      await loadCustomerActivities(businessId, customerId)
    } catch (err) {
      console.error('Error reloading customer:', err)
    }
  }

  const handleGiveStamp = () => {
    setGiveStampDialog({ isOpen: true })
  }

  const handleGiveStampSuccess = () => {
    reloadCustomer()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo'
      case 'completed':
        return 'Completo'
      case 'expired':
        return 'Expirado'
      default:
        return 'Inativo'
    }
  }

  const loadCustomerActivities = async (businessId: string, customerId: string) => {
    try {
      // Create timeline from different sources
      const activitiesTimeline: ActivityItem[] = []
      
      // Add enrollment activity
      if (customer) {
        activitiesTimeline.push({
          id: `enrollment-${customer.id}`,
          type: 'enrollment',
          description: `${customer.name} se inscreveu no programa de fidelidade`,
          date: customer.enrollment_date,
          icon: CheckCircle,
          color: 'text-green-600'
        })
      }

      // Load stamp transactions
      const { data: stampData, error: stampError } = await supabase
        .from('stamp_transactions')
        .select(`
          *,
          customer_loyalty_cards (
            loyalty_cards (
              name
            )
          )
        `)
        .eq('customer_loyalty_cards.customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!stampError && stampData) {
        stampData.forEach((stamp) => {
          activitiesTimeline.push({
            id: `stamp-${stamp.id}`,
            type: 'stamp',
            description: `Recebeu ${stamp.stamps_added} selo(s) em ${stamp.customer_loyalty_cards?.loyalty_cards?.name || 'Cartão'}`,
            date: stamp.created_at,
            icon: Star,
            color: 'text-purple-600'
          })
        })
      }

      // Add card completion activities (simulated for now)
      customer?.customer_loyalty_cards.forEach((card) => {
        if (card.status === 'completed') {
          activitiesTimeline.push({
            id: `completion-${card.id}`,
            type: 'card_completed',
            description: `Completou o cartão "${card.loyalty_cards.name}" e ganhou: ${card.loyalty_cards.rules.reward_description}`,
            date: card.created_at, // This should ideally be completion date
            icon: Gift,
            color: 'text-orange-600'
          })
        }
      })

      // Sort by date (most recent first)
      activitiesTimeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      setActivities(activitiesTimeline.slice(0, 10)) // Limit to 10 most recent
      
    } catch (error) {
      console.error('Error loading customer activities:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/clientes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar cliente</h3>
            <p className="text-gray-600 text-center mb-6">
              {error}
            </p>
            <Button asChild>
              <Link href="/dashboard/clientes">
                Voltar para Lista
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!customer) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/clientes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600">Detalhes do cliente</p>
          </div>
        </div>
      </div>

      {/* Customer Info Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-700 font-bold text-xl">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* Basic Info */}
              <div className="space-y-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{formatPhone(customer.phone)}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Tags */}
                {customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Consent Badges */}
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${customer.consent.lgpd_accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {customer.consent.lgpd_accepted ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    <span>LGPD</span>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${customer.consent.marketing_consent ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    <Mail className="w-3 h-3" />
                    <span>Marketing</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              <Button
                variant="default"
                size="sm"
                disabled={!customer.consent.lgpd_accepted}
                onClick={handleGiveStamp}
                className="flex items-center gap-1"
              >
                <Gift className="w-4 h-4" />
                Dar Selo
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!customer.consent.lgpd_accepted}
                onClick={() => alert(`Editar ${customer.name} - Funcionalidade em desenvolvimento`)}
                className="flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => alert(`Remover ${customer.name} - Funcionalidade em desenvolvimento`)}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Remover
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {customer.customer_loyalty_cards.reduce((total, card) => total + card.current_stamps, 0)}
            </div>
            <p className="text-sm text-gray-600">Selos Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {customer.customer_loyalty_cards.reduce((total, card) => total + card.total_redeemed, 0)}
            </div>
            <p className="text-sm text-gray-600">Resgates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {customer.total_visits}
            </div>
            <p className="text-sm text-gray-600">Visitas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {customer.total_spent ? `R$ ${customer.total_spent.toFixed(2)}` : 'N/A'}
            </div>
            <p className="text-sm text-gray-600">Total Gasto</p>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Cartões de Fidelidade</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.customer_loyalty_cards.length > 0 ? (
            <div className="space-y-4">
              {customer.customer_loyalty_cards.map((card) => (
                <div key={card.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-lg">{card.loyalty_cards.name}</h3>
                        <Badge className={getStatusColor(card.status)}>
                          {getStatusLabel(card.status)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <strong>Progresso:</strong> {card.current_stamps} de {card.loyalty_cards.rules.stamps_required} selos
                        </div>
                        <div>
                          <strong>Recompensa:</strong> {card.loyalty_cards.rules.reward_description}
                        </div>
                        <div>
                          <strong>Total de resgates:</strong> {card.total_redeemed}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span><strong>Criado em:</strong> {formatDate(card.created_at)}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min((card.current_stamps / card.loyalty_cards.rules.stamps_required) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {Math.min((card.current_stamps / card.loyalty_cards.rules.stamps_required) * 100, 100).toFixed(1)}% completo
                      </p>
                    </div>
                    
                    {card.wallet_pass_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={card.wallet_pass_url} target="_blank" rel="noopener noreferrer">
                          Ver na Carteira
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Nenhum cartão de fidelidade</h3>
              <p className="text-gray-600 mb-4">Este cliente ainda não possui cartões de fidelidade.</p>
              <Button variant="outline" size="sm">
                Adicionar Cartão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const IconComponent = activity.icon
                return (
                  <div key={activity.id} className="flex items-start space-x-3 relative">
                    {/* Timeline line */}
                    {index < activities.length - 1 && (
                      <div className="absolute left-4 top-8 w-px h-12 bg-gray-200" />
                    )}
                    
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center z-10 ${
                      activity.type === 'enrollment' ? 'border-green-300 bg-green-50' :
                      activity.type === 'stamp' ? 'border-purple-300 bg-purple-50' :
                      activity.type === 'card_completed' ? 'border-orange-300 bg-orange-50' :
                      'border-gray-300 bg-gray-50'
                    }`}>
                      <IconComponent className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900">
                        {activity.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTime(activity.date)}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {activities.length >= 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    Ver mais atividades
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Nenhuma atividade ainda</h3>
              <p className="text-gray-600">
                As atividades do cliente aparecerão aqui conforme ele interage com o programa de fidelidade.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consent Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes de Consentimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Status do Consentimento</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">LGPD Aceito</span>
                    <Badge className={customer.consent.lgpd_accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {customer.consent.lgpd_accepted ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Marketing</span>
                    <Badge className={customer.consent.marketing_consent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {customer.consent.marketing_consent ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Termos</span>
                    <Badge className={customer.consent.terms_accepted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {customer.consent.terms_accepted ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informações do Consentimento</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <strong>Data:</strong> {formatDateTime(customer.consent.consent_date)}
                  </div>
                  {customer.consent.consent_source && (
                    <div>
                      <strong>Origem:</strong> {customer.consent.consent_source}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      {Object.keys(customer.custom_fields).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Informações Personalizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(customer.custom_fields).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <h4 className="font-medium text-gray-900 capitalize">{key.replace(/_/g, ' ')}</h4>
                  <p className="text-sm text-gray-600">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Give Stamp Dialog */}
      {customer && (
        <GiveStampDialog
          isOpen={giveStampDialog.isOpen}
          onClose={() => setGiveStampDialog({ isOpen: false })}
          customerId={customer.id}
          customerName={customer.name}
          cards={customer.customer_loyalty_cards.map(card => ({
            id: card.loyalty_card_id,
            name: card.loyalty_cards.name,
            current_stamps: card.current_stamps,
            required: card.loyalty_cards.rules.stamps_required || 10,
            status: card.status
          }))}
          onSuccess={handleGiveStampSuccess}
        />
      )}
    </div>
  )
}