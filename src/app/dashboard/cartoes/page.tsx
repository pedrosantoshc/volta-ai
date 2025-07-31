'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'

interface LoyaltyCard {
  id: string
  name: string
  description: string
  design: {
    background_color?: string
    stamp_icon?: string
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
}

export default function CartoesFidelidade() {
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null)
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

        // Load loyalty cards with customer counts
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
          .order('created_at', { ascending: false })

        if (cardsError) {
          console.error('Error loading loyalty cards:', cardsError)
          // Don't show error for empty results, only for actual errors
          if (cardsError.code !== 'PGRST116') {
            setError('Erro ao carregar cartões de fidelidade.')
          }
          return
        }

        // Process cards with customer statistics
        const processedCards = cards?.map((card: any) => {
          const customerCards = card.customer_loyalty_cards || []
          const totalStamps = customerCards.reduce((sum: number, cc: any) => sum + (cc.current_stamps || 0), 0)
          
          return {
            ...card,
            customer_count: customerCards.length,
            total_stamps: totalStamps
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

  const getStampIcon = (stampIcon?: string) => {
    switch (stampIcon) {
      case 'coffee': return '☕'
      case 'pizza': return '🍕'
      case 'burger': return '🍔'
      case 'beer': return '🍺'
      default: return '⭐'
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
          <h1 className="text-3xl font-bold text-gray-900">Cartões de Fidelidade</h1>
          <p className="text-gray-600">Gerencie seus programas de fidelidade</p>
        </div>
        <Button className="gradient-primary text-white" asChild>
          <Link href="/dashboard/cartoes/novo">
            + Criar Novo Cartão
          </Link>
        </Button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      {loyaltyCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {loyaltyCards.length}
              </div>
              <p className="text-sm text-gray-600">Cartões Criados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {loyaltyCards.filter(card => card.is_active).length}
              </div>
              <p className="text-sm text-gray-600">Cartões Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {loyaltyCards.reduce((sum, card) => sum + (card.customer_count || 0), 0)}
              </div>
              <p className="text-sm text-gray-600">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {loyaltyCards.reduce((sum, card) => sum + (card.total_stamps || 0), 0)}
              </div>
              <p className="text-sm text-gray-600">Selos Distribuídos</p>
            </CardContent>
          </Card>
        </div>
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
                  className="rounded-lg p-4 text-white text-center"
                  style={{ 
                    backgroundColor: card.design?.background_color || '#7c3aed',
                    minHeight: '120px'
                  }}
                >
                  <div className="text-sm font-medium mb-2">
                    {card.design?.header_text || card.name}
                  </div>
                  <div className="flex justify-center space-x-1 mb-2">
                    {Array.from({ length: Math.min(card.rules?.stamps_required || 10, 10) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-xs"
                      >
                        {i < 3 ? getStampIcon(card.design?.stamp_icon) : ''}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs opacity-90">
                    {card.rules?.reward_description || 'Recompensa'}
                  </div>
                </div>

                {/* Card Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{card.customer_count || 0}</div>
                    <div className="text-gray-500">Clientes</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{card.total_stamps || 0}</div>
                    <div className="text-gray-500">Selos</div>
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
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum cartão de fidelidade ainda
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Crie seu primeiro cartão de fidelidade para começar a engajar seus clientes 
              e aumentar a frequência de visitas.
            </p>
            <Button className="gradient-primary text-white" asChild>
              <Link href="/dashboard/cartoes/novo">
                Criar Primeiro Cartão
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}