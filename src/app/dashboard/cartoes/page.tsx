'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertTriangle, Trash2, ArrowRightLeft, Users as UsersIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import QRCode from 'qrcode'

interface LoyaltyCard {
  id: string
  name: string
  description: string
  design: {
    background_color?: string
    stamp_icon?: string
    stamp_icon_type?: string
    header_text?: string
    footer_text?: string
  }
  rules: {
    stamps_required?: number
    reward_description?: string
    expiry_days?: number
  }
  is_active: boolean
  created_at: string
  customer_count?: number
  total_stamps?: number
  active_customers?: number
  completed_cards?: number
  completion_rate?: number
  avg_stamps_per_customer?: number
  revenue_impact?: number
  businesses?: {
    id: string
    name: string
    logo_url?: string
  }
}

interface CardDeletionInfo {
  card: LoyaltyCard
  activeCustomersCount: number
  totalStamps: number
}

export default function CartoesFidelidade() {
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null)
  const [deletionDialog, setDeletionDialog] = useState<{
    isOpen: boolean
    cardInfo: CardDeletionInfo | null
  }>({ isOpen: false, cardInfo: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadLoyaltyCards = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load loyalty cards with customer counts and business info
        const { data: cards, error: cardsError } = await supabase
          .from('loyalty_cards')
          .select(`
            *,
            customer_loyalty_cards (
              id,
              current_stamps
            ),
            businesses (
              id,
              name,
              logo_url
            )
          `)
          .eq('business_id', user.id)
          .order('created_at', { ascending: false })

        if (cardsError) {
          console.error('Error loading loyalty cards:', cardsError)
          // Don't show error for empty results, only for actual errors
          if (cardsError.code !== 'PGRST116') {
            setError('Erro ao carregar cartões de fidelidade.')
          }
          return
        }

        // Process cards with comprehensive business statistics
        const processedCards = cards?.map((card: any) => {
          const customerCards = card.customer_loyalty_cards || []
          const totalCustomers = customerCards.length
          const totalStamps = customerCards.reduce((sum: number, cc: any) => sum + (cc.current_stamps || 0), 0)
          const activeCustomers = customerCards.filter((cc: any) => cc.current_stamps > 0).length
          const completedCards = customerCards.filter((cc: any) => cc.current_stamps >= (card.rules?.stamps_required || 10)).length
          const completionRate = totalCustomers > 0 ? Math.round((completedCards / totalCustomers) * 100) : 0
          const avgStampsPerCustomer = totalCustomers > 0 ? Math.round((totalStamps / totalCustomers) * 10) / 10 : 0
          
          return {
            ...card,
            customer_count: totalCustomers,
            total_stamps: totalStamps,
            active_customers: activeCustomers,
            completed_cards: completedCards,
            completion_rate: completionRate,
            avg_stamps_per_customer: avgStampsPerCustomer,
            revenue_impact: completedCards * 15 // Estimated R$ 15 per completed reward
          }
        }) || []

        setLoyaltyCards(processedCards)
        setError('') // Clear any previous errors
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Erro inesperado ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    loadLoyaltyCards()
  }, [router, supabase])

  const generateQRCode = async (card: LoyaltyCard) => {
    try {
      const enrollUrl = `${window.location.origin}/enroll/${card.id}`
      console.log('Generated QR URL:', enrollUrl)
      console.log('Card ID:', card.id)
      const qrDataUrl = await QRCode.toDataURL(enrollUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#7c3aed',
          light: '#ffffff'
        }
      })
      setQrCodeUrl(qrDataUrl)
      setSelectedCard(card)
    } catch (err) {
      console.error('Error generating QR code:', err)
    }
  }

  const handleToggleActive = async (cardId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('loyalty_cards')
        .update({ is_active: !currentActive })
        .eq('id', cardId)

      if (error) {
        console.error('Error toggling card status:', error)
        return
      }

      // Update local state
      setLoyaltyCards(prev => 
        prev.map(card => 
          card.id === cardId 
            ? { ...card, is_active: !currentActive }
            : card
        )
      )
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const getStampIcon = (stampIcon?: string, stampIconType?: string) => {
    if (stampIconType === 'custom' && stampIcon?.startsWith('http')) {
      return (
        <div className="w-3 h-3 rounded-full overflow-hidden">
          <Image
            src={stampIcon}
            alt="Custom stamp icon"
            width={12}
            height={12}
            className="object-contain"
          />
        </div>
      )
    }
    
    switch (stampIcon) {
      case 'coffee': return '☕'
      case 'pizza': return '🍕'
      case 'burger': return '🍔'
      case 'beer': return '🍺'
      default: return '⭐'
    }
  }

  const handleDeleteCard = async (card: LoyaltyCard) => {
    try {
      // Check for active customers and their stamps
      const { data: customerCards, error: customerError } = await supabase
        .from('customer_loyalty_cards')
        .select(`
          id,
          current_stamps,
          status,
          customers (
            id,
            name
          )
        `)
        .eq('loyalty_card_id', card.id)
        .neq('status', 'expired')

      if (customerError) {
        console.error('Error checking customer cards:', customerError)
        setError('Erro ao verificar clientes do cartão.')
        return
      }

      const activeCustomers = customerCards?.filter(cc => cc.status === 'active' && cc.current_stamps > 0) || []
      const totalStamps = customerCards?.reduce((sum, cc) => sum + (cc.current_stamps || 0), 0) || 0

      if (activeCustomers.length === 0) {
        // No active customers, can delete directly
        await deleteCardDirectly(card.id)
      } else {
        // Show sophisticated deletion dialog
        setDeletionDialog({
          isOpen: true,
          cardInfo: {
            card,
            activeCustomersCount: activeCustomers.length,
            totalStamps
          }
        })
      }
    } catch (err) {
      console.error('Error preparing card deletion:', err)
      setError('Erro ao verificar cartão para exclusão.')
    }
  }

  const deleteCardDirectly = async (cardId: string) => {
    try {
      setIsDeleting(true)
      
      const { error } = await supabase
        .from('loyalty_cards')
        .delete()
        .eq('id', cardId)

      if (error) {
        console.error('Error deleting card:', error)
        setError('Erro ao excluir cartão.')
        return
      }

      // Update local state
      setLoyaltyCards(prev => prev.filter(card => card.id !== cardId))
      setError('')
      alert('Cartão excluído com sucesso!')
    } catch (err) {
      console.error('Error deleting card:', err)
      setError('Erro ao excluir cartão.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeletionOption = async (option: 'transpose' | 'delete' | 'segment') => {
    if (!deletionDialog.cardInfo) return

    const { card } = deletionDialog.cardInfo

    try {
      setIsDeleting(true)

      switch (option) {
        case 'transpose':
          // TODO: Implement stamp transposition to new card
          alert('Funcionalidade de transposição será implementada em breve!')
          break

        case 'delete':
          // Delete card and orphan stamps
          const { error: deleteError } = await supabase
            .from('loyalty_cards')
            .delete()
            .eq('id', card.id)

          if (deleteError) {
            throw deleteError
          }

          setLoyaltyCards(prev => prev.filter(c => c.id !== card.id))
          alert('Cartão excluído! Os selos em progresso foram perdidos.')
          break

        case 'segment':
          // TODO: Implement customer segmentation
          alert('Funcionalidade de segmentação será implementada em breve!')
          break
      }

      setDeletionDialog({ isOpen: false, cardInfo: null })
    } catch (err) {
      console.error('Error handling deletion option:', err)
      setError('Erro ao processar exclusão do cartão.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Fidelidade</h1>
          <p className="text-gray-600">Performance e métricas dos seus programas de fidelidade</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
            📈 Relatório Mensal
          </Button>
          <Button className="gradient-primary text-white" asChild>
            <Link href="/dashboard/cartoes/novo">
              + Criar Programa
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Performance Dashboard Overview */}
      {loyaltyCards.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {loyaltyCards.length}
                    </div>
                    <p className="text-sm opacity-90">Programas Ativos</p>
                  </div>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    📋
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {loyaltyCards.reduce((sum, card) => sum + (card.customer_count || 0), 0)}
                    </div>
                    <p className="text-sm opacity-90">Total Clientes</p>
                  </div>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    👥
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {loyaltyCards.reduce((sum, card) => sum + (card.completed_cards || 0), 0)}
                    </div>
                    <p className="text-sm opacity-90">Cartões Completos</p>
                  </div>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    ✅
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {loyaltyCards.reduce((sum, card) => sum + (card.total_stamps || 0), 0)}
                    </div>
                    <p className="text-sm opacity-90">Selos Distribuídos</p>
                  </div>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    ⭐
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      R$ {loyaltyCards.reduce((sum, card) => sum + (card.revenue_impact || 0), 0)}
                    </div>
                    <p className="text-sm opacity-90">Impacto Estimado</p>
                  </div>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    💰
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Quick Insights */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Insights Rápidos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-blue-800">
                <span className="font-medium">Melhor Performance:</span> {loyaltyCards.length > 0 && 
                  loyaltyCards.reduce((best, card) => 
                    (card.completion_rate || 0) > (best.completion_rate || 0) ? card : best
                  ).name}
              </div>
              <div className="text-blue-800">
                <span className="font-medium">Taxa Média:</span> {loyaltyCards.length > 0 ? 
                  Math.round(loyaltyCards.reduce((sum, card) => sum + (card.completion_rate || 0), 0) / loyaltyCards.length) : 0}% de conclusão
              </div>
              <div className="text-blue-800">
                <span className="font-medium">Oportunidade:</span> {loyaltyCards.reduce((sum, card) => sum + (card.active_customers || 0), 0)} clientes próximos da recompensa
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loyalty Cards Grid */}
      {loyaltyCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loyaltyCards.map((card) => (
            <Card key={card.id} className={`relative ${!card.is_active ? 'opacity-75' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{card.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {card.description}
                    </CardDescription>
                  </div>
                  <Badge variant={card.is_active ? "default" : "secondary"}>
                    {card.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Card Preview */}
                <div 
                  className="rounded-lg p-4 text-white"
                  style={{ 
                    backgroundColor: card.design?.background_color || '#7c3aed',
                    minHeight: '120px'
                  }}
                >
                  {/* Header with Logo */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {card.businesses?.logo_url ? (
                        <div className="w-6 h-6 rounded-sm overflow-hidden bg-white/20 flex items-center justify-center">
                          <Image
                            src={card.businesses.logo_url}
                            alt={card.businesses.name || 'Logo'}
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-sm bg-white/20 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">
                            {(card.businesses?.name || card.name)[0]}
                          </span>
                        </div>
                      )}
                      <span className="text-xs font-medium truncate">
                        {card.design?.header_text || card.name}
                      </span>
                    </div>
                  </div>
                  
                  {/* Stamps */}
                  <div className="flex justify-center space-x-1 mb-2">
                    {Array.from({ length: Math.min(card.rules?.stamps_required || 10, 10) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-xs"
                      >
                        {i < 3 ? getStampIcon(card.design?.stamp_icon, card.design?.stamp_icon_type) : ''}
                      </div>
                    ))}
                  </div>
                  
                  {/* Reward */}
                  <div className="text-center text-xs bg-white/20 rounded-md py-1 px-2">
                    {card.rules?.reward_description || 'Recompensa'}
                  </div>
                </div>

                {/* Performance KPIs */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-bold text-blue-600">{card.customer_count || 0}</div>
                      <div className="text-blue-500">Clientes</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-bold text-green-600">{card.completed_cards || 0}</div>
                      <div className="text-green-500">Completos</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="font-bold text-orange-600">{card.completion_rate || 0}%</div>
                      <div className="text-orange-500">Taxa</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Selos:</span>
                      <span className="font-medium">{card.total_stamps || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Média:</span>
                      <span className="font-medium">{card.avg_stamps_per_customer || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs pt-2 border-t">
                    <span className="text-gray-500">Impacto Estimado:</span>
                    <span className="font-bold text-green-600">R$ {card.revenue_impact || 0}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(card.id, card.is_active)}
                    className="flex-1"
                  >
                    {card.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/dashboard/cartoes/${card.id}/formulario`}>
                      Formulário
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteCard(card)}
                    disabled={isDeleting}
                    className="px-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const enrollUrl = `${window.location.origin}/enroll/${card.id}`
                      navigator.clipboard.writeText(enrollUrl)
                      alert('Link copiado!')
                    }}
                  >
                    📋 Copiar Link
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => generateQRCode(card)}
                      >
                        📱 QR Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>QR Code - {selectedCard?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center space-y-4">
                        {qrCodeUrl && (
                          <img 
                            src={qrCodeUrl} 
                            alt="QR Code para inscrição" 
                            className="border rounded-lg"
                          />
                        )}
                        <p className="text-sm text-gray-600 text-center">
                          Clientes podem escanear este QR code para se inscrever no programa de fidelidade
                        </p>
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const enrollUrl = `${window.location.origin}/enroll/${selectedCard?.id}`
                              navigator.clipboard.writeText(enrollUrl)
                              alert('Link copiado!')
                            }}
                          >
                            📋 Copiar Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (qrCodeUrl) {
                                const link = document.createElement('a')
                                link.download = `qr-code-${selectedCard?.name}.png`
                                link.href = qrCodeUrl
                                link.click()
                              }
                            }}
                          >
                            💾 Baixar QR
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
          
          {/* Performance Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">📈 Sumário de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {loyaltyCards.length > 0 ? Math.round(loyaltyCards.reduce((sum, card) => sum + (card.completion_rate || 0), 0) / loyaltyCards.length) : 0}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Taxa Média de Conclusão</div>
                  <div className="text-xs text-gray-500 mt-1">Meta: 25% (Excelente)</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {loyaltyCards.reduce((sum, card) => sum + (card.active_customers || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Clientes Engajados</div>
                  <div className="text-xs text-gray-500 mt-1">Com selos em progresso</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    R$ {loyaltyCards.reduce((sum, card) => sum + (card.revenue_impact || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Impacto Total Estimado</div>
                  <div className="text-xs text-gray-500 mt-1">Valor das recompensas entregues</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Empty State - Dashboard Focus */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-6">
                <div className="text-3xl">📈</div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Bem-vindo ao seu Dashboard!
              </h3>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                Crie seu primeiro programa de fidelidade e comece a acompanhar métricas de performance, 
                taxa de conclusão e impacto no seu negócio.
              </p>
              <Button className="gradient-primary text-white text-lg px-8" asChild>
                <Link href="/dashboard/cartoes/novo">
                  🎆 Criar Primeiro Programa
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-purple-900">O que você pode acompanhar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">
                  📈
                </div>
                <div>
                  <div className="font-medium text-gray-900">Performance em Tempo Real</div>
                  <div className="text-sm text-gray-600">Taxa de conclusão, clientes ativos, ROI estimado</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-sm font-bold">
                  ✅
                </div>
                <div>
                  <div className="font-medium text-gray-900">Insights Automáticos</div>
                  <div className="text-sm text-gray-600">Identificação de oportunidades e ações</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-sm font-bold">
                  🎯
                </div>
                <div>
                  <div className="font-medium text-gray-900">Comparação de Campanhas</div>
                  <div className="text-sm text-gray-600">Qual programa performa melhor</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Sophisticated Card Deletion Dialog */}
      <Dialog 
        open={deletionDialog.isOpen} 
        onOpenChange={(open) => !open && setDeletionDialog({ isOpen: false, cardInfo: null })}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <DialogTitle>Excluir Cartão de Fidelidade</DialogTitle>
            </div>
            <DialogDescription>
              O cartão "{deletionDialog.cardInfo?.card.name}" possui {deletionDialog.cardInfo?.activeCustomersCount} cliente(s) ativo(s) com {deletionDialog.cardInfo?.totalStamps} selo(s) em progresso.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-2">O que acontecerá com os selos?</h4>
              <p className="text-sm text-orange-800">
                Existem clientes com selos em progresso. Escolha como proceder:
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 text-left"
                onClick={() => handleDeletionOption('transpose')}
                disabled={isDeleting}
              >
                <div className="flex items-start gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Transpor selos para novo cartão</div>
                    <div className="text-sm text-blue-700 mt-1">
                      Crie um novo cartão e transfira todos os selos em progresso
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 text-left"
                onClick={() => handleDeletionOption('delete')}
                disabled={isDeleting}
              >
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900">Excluir mesmo assim</div>
                    <div className="text-sm text-red-700 mt-1">
                      Os selos em progresso serão perdidos permanentemente
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 text-left"
                onClick={() => handleDeletionOption('segment')}
                disabled={isDeleting}
              >
                <div className="flex items-start gap-3">
                  <UsersIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-900">Criar segmento destes clientes</div>
                    <div className="text-sm text-purple-700 mt-1">
                      Agrupe estes clientes para enviar campanha "programa encerrado"
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setDeletionDialog({ isOpen: false, cardInfo: null })}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}