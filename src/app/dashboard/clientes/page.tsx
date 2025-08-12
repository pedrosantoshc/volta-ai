'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { createClient } from '@/lib/supabase-client'
import { getCurrentBusinessId } from '@/lib/business'
import { useRouter } from 'next/navigation'
import { Trash2, Search, Eye, Gift, CheckSquare, Square, Plus, MessageCircle, CreditCard, Download, Users } from 'lucide-react'
import Link from "next/link"
import GiveStampDialog from './_components/GiveStampDialog'

interface Customer {
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
  }
  loyalty_cards: CustomerLoyaltyCard[]
}

interface CustomerLoyaltyCard {
  id: string
  loyalty_card_id: string
  current_stamps: number
  total_redeemed: number
  status: string
  qr_code: string
  created_at: string
  loyalty_cards: {
    id: string
    name: string
    rules: {
    stamps_required: number
    reward_description: string
  }
  }
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [giveStampDialog, setGiveStampDialog] = useState<{
    isOpen: boolean
    customer: Customer | null
  }>({ isOpen: false, customer: null })
  const [availableLoyaltyCards, setAvailableLoyaltyCards] = useState<{id: string, name: string}[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get business ID for the user
        const businessId = await getCurrentBusinessId(supabase, user.email!)

        // Load available loyalty cards for this business
        const { data: loyaltyCardsData, error: loyaltyCardsError } = await supabase
          .from('loyalty_cards')
          .select('id, name')
          .eq('business_id', businessId)
          .eq('is_active', true)
          
        if (!loyaltyCardsError && loyaltyCardsData) {
          setAvailableLoyaltyCards(loyaltyCardsData)
        }

        // Load customers with their loyalty cards
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select(`
            *,
            loyalty_cards:customer_loyalty_cards (
              *,
              loyalty_cards (
                id,
                name,
                rules
              )
            )
          `)
          .eq('business_id', businessId)
          .order('enrollment_date', { ascending: false })

        if (customersError) {
          console.error('Error loading customers:', customersError)
          setError('Erro ao carregar clientes.')
          return
        }

        setCustomers(customersData || [])
        setFilteredCustomers(customersData || [])

      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Erro inesperado ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [router, supabase])

  // Filter customers based on search term and filter
  useEffect(() => {
    let filtered = customers

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (selectedFilter === 'active') {
      filtered = filtered.filter(customer => 
        customer.loyalty_cards?.some(card => card.status === 'active') || false
      )
    } else if (selectedFilter === 'inactive') {
      filtered = filtered.filter(customer => 
        !customer.loyalty_cards?.some(card => card.status === 'active')
      )
    }

    setFilteredCustomers(filtered)
  }, [customers, searchTerm, selectedFilter])

  const getTotalStamps = (customer: Customer) => {
    return customer.loyalty_cards?.reduce((total, card) => total + card.current_stamps, 0) || 0
  }

  const getTotalRedeemed = (customer: Customer) => {
    return customer.loyalty_cards?.reduce((total, card) => total + card.total_redeemed, 0) || 0
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }

  // Helper functions for customer card status
  const hasActiveCard = (customer: Customer) => {
    return customer.loyalty_cards?.some(card => card.status === 'active') || false
  }

  const hasNoCard = (customer: Customer) => {
    return !customer.loyalty_cards || customer.loyalty_cards.length === 0
  }

  const canReceiveStamp = (customer: Customer) => {
    return hasActiveCard(customer) && customer.consent.lgpd_accepted
  }

  const canAddCard = (customer: Customer) => {
    return !hasActiveCard(customer) && customer.consent.lgpd_accepted
  }

  const handleAddCard = async (customer: Customer) => {
    if (availableLoyaltyCards.length === 0) {
      alert('Nenhum cartão de fidelidade ativo encontrado. Crie um cartão primeiro.')
      return
    }

    if (availableLoyaltyCards.length === 1) {
      // Auto-assign single available card
      await assignCardToCustomer(customer.id, availableLoyaltyCards[0].id)
    } else {
      // Show dropdown for multiple cards
      const selectedCardId = await showCardSelectionDialog(availableLoyaltyCards)
      if (selectedCardId) {
        await assignCardToCustomer(customer.id, selectedCardId)
      }
    }
  }

  const assignCardToCustomer = async (customerId: string, loyaltyCardId: string) => {
    try {
      const response = await fetch('/api/customers/assign-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          loyaltyCardId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to assign card')
      }

      // Reload customers
      handleGiveStampSuccess()
      alert('Cartão adicionado com sucesso!')
    } catch (error) {
      console.error('Error assigning card:', error)
      alert('Erro ao adicionar cartão. Tente novamente.')
    }
  }

  const showCardSelectionDialog = async (cards: {id: string, name: string}[]): Promise<string | null> => {
    // Simple prompt for now - can be improved with a proper modal
    const cardOptions = cards.map((card, index) => `${index + 1}. ${card.name}`).join('\n')
    const selection = prompt(`Selecione um cartão:\n\n${cardOptions}\n\nDigite o número da opção:`)
    
    if (selection) {
      const index = parseInt(selection) - 1
      if (index >= 0 && index < cards.length) {
        return cards[index].id
      }
    }
    return null
  }

  // Delete functionality
  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${customerName}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error

      // Remove from local state
      setCustomers(prev => prev.filter(c => c.id !== customerId))
      setFilteredCustomers(prev => prev.filter(c => c.id !== customerId))
      
      alert('Cliente excluído com sucesso!')
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Erro ao excluir cliente. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) {
      alert('Selecione pelo menos um cliente para excluir.')
      return
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedCustomers.length} cliente(s)? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', selectedCustomers)

      if (error) throw error

      // Remove from local state
      setCustomers(prev => prev.filter(c => !selectedCustomers.includes(c.id)))
      setFilteredCustomers(prev => prev.filter(c => !selectedCustomers.includes(c.id)))
      setSelectedCustomers([])
      
      alert(`${selectedCustomers.length} cliente(s) excluído(s) com sucesso!`)
    } catch (error) {
      console.error('Error deleting customers:', error)
      alert('Erro ao excluir clientes. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedCustomers(prev => 
      prev.length === filteredCustomers.length ? [] : filteredCustomers.map(c => c.id)
    )
  }

  const handleGiveStamp = (customer: Customer) => {
    setGiveStampDialog({ isOpen: true, customer })
  }

  const handleSendMessage = (customer: Customer) => {
    // TODO: Implement WhatsApp message functionality
    alert(`Funcionalidade de mensagem para ${customer.name} será implementada em breve!`)
  }

  const handleBulkAddToCampaign = () => {
    if (selectedCustomers.length === 0) return
    // TODO: Implement add to campaign functionality
    alert(`Adicionar ${selectedCustomers.length} cliente(s) à campanha - Funcionalidade em desenvolvimento`)
  }

  const handleBulkExport = () => {
    if (selectedCustomers.length === 0) return
    // TODO: Implement export functionality
    alert(`Exportar ${selectedCustomers.length} cliente(s) - Funcionalidade em desenvolvimento`)
  }

  const handleGiveStampSuccess = () => {
    // Reload customers to get updated data
    const loadCustomers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const businessId = await getCurrentBusinessId(supabase, user.email!)

        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select(`
            *,
            loyalty_cards:customer_loyalty_cards (
              *,
              loyalty_cards (
                id,
                name,
                rules
              )
            )
          `)
          .eq('business_id', businessId)
          .order('enrollment_date', { ascending: false })

        if (customersError) {
          console.error('Error reloading customers:', customersError)
          return
        }

        setCustomers(customersData || [])
      } catch (err) {
        console.error('Error reloading customers:', err)
      }
    }

    loadCustomers()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${selectedCustomers.length > 0 ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes do programa de fidelidade</p>
        </div>
        <div>
          <Button className="gradient-primary text-white" asChild>
            <Link href="/dashboard/clientes/importar">
              Importar Clientes
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {customers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {customers.length}
              </div>
              <p className="text-sm text-gray-600 font-medium">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {customers.filter(c => c.loyalty_cards?.some(card => card.status === 'active')).length}
              </div>
              <p className="text-sm text-gray-600 font-medium">Clientes Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {customers.reduce((total, customer) => total + getTotalStamps(customer), 0)}
              </div>
              <p className="text-sm text-gray-600 font-medium">Selos Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {customers.reduce((total, customer) => total + getTotalRedeemed(customer), 0)}
              </div>
              <p className="text-sm text-gray-600 font-medium">Resgates Realizados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('all')}
                size="sm"
              >
                Todos ({customers.length})
              </Button>
              <Button
                variant={selectedFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('active')}
                size="sm"
              >
                Ativos ({customers.filter(c => c.loyalty_cards?.some(card => card.status === 'active')).length})
              </Button>
              <Button
                variant={selectedFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('inactive')}
                size="sm"
              >
                Clientes eventuais ({customers.filter(c => !c.loyalty_cards?.some(card => card.status === 'active')).length})
              </Button>
              
              {/* Select All moved to filter row */}
              {filteredCustomers.length > 0 && (
                <div className="border-l pl-4 ml-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {selectedCustomers.length === filteredCustomers.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedCustomers.length === filteredCustomers.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fixed Bottom Action Bar */}
      {selectedCustomers.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-4">
            <div className="flex items-center gap-6">
              {/* Selection Info */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedCustomers.length} cliente{selectedCustomers.length > 1 ? 's' : ''} selecionado{selectedCustomers.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkAddToCampaign}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  Adicionar à Campanha
                </Button>
                
                <Button
                  onClick={handleBulkExport}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
                
                <Button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Button>
                
                <Button
                  onClick={() => setSelectedCustomers([])}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customers List */}
      {filteredCustomers.length > 0 ? (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => toggleSelectCustomer(customer.id)}
                      className="mt-1 p-1 hover:bg-gray-100 rounded"
                    >
                      {selectedCustomers.includes(customer.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                    {/* Customer Info */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-700 font-semibold">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{formatPhone(customer.phone)}</span>
                          {customer.email && (
                            <span>{customer.email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Loyalty Cards */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {customer.loyalty_cards.map((card) => (
                          <div key={card.id} className="bg-gray-50 rounded-lg p-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{card.loyalty_cards.name}</span>
                              <Badge 
                                variant={card.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {card.status === 'active' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <div className="text-gray-600 mt-1">
                              {card.current_stamps} selos • {card.total_redeemed} resgates
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{getTotalStamps(customer)}</div>
                        <div className="text-gray-500">Selos Ativos</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{getTotalRedeemed(customer)}</div>
                        <div className="text-gray-500">Resgates</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{customer.total_visits || 0}</div>
                        <div className="text-gray-500">Visitas</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{formatDate(customer.enrollment_date)}</div>
                        <div className="text-gray-500">Cadastro</div>
                      </div>
                    </div>

                    {/* Custom Fields */}
                    {Object.keys(customer.custom_fields).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Informações adicionais:</span>
                          <div className="mt-1 space-y-1">
                            {Object.entries(customer.custom_fields).map(([key, value]) => (
                              <div key={key} className="text-gray-600">
                                <span className="font-medium">{key}:</span> {Array.isArray(value) ? value.join(', ') : String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Status Indicators */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            customer.consent.lgpd_accepted ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs text-gray-600">
                            {customer.consent.lgpd_accepted ? 'Dados OK' : 'Sem consentimento'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            customer.consent.marketing_consent ? 'bg-purple-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-xs text-gray-600">
                            {customer.consent.marketing_consent ? 'WhatsApp OK' : 'WhatsApp não autorizado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!customer.consent.lgpd_accepted}
                      onClick={() => router.push(`/dashboard/clientes/${customer.id}`)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalhes
                    </Button>
                    
                    {/* Conditional Action: Add Card or Give Stamp */}
                    {canAddCard(customer) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddCard(customer)}
                        className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Cartão
                      </Button>
                    ) : canReceiveStamp(customer) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGiveStamp(customer)}
                        className="flex items-center gap-1 text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Gift className="w-4 h-4" />
                        Dar Selo
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="flex items-center gap-1 opacity-50"
                      >
                        <CreditCard className="w-4 h-4" />
                        Sem Cartão
                      </Button>
                    )}
                    
                    {/* Send Message Action */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!customer.consent.marketing_consent}
                      onClick={() => handleSendMessage(customer)}
                      className="flex items-center gap-1 text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar Mensagem
                    </Button>
                    
                    <Button
                      onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                      disabled={isDeleting}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : customers.length === 0 ? (
        /* Empty State - No Customers */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum cliente ainda
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Quando clientes se inscreverem nos seus programas de fidelidade, 
              eles aparecerão aqui. Compartilhe o link dos seus cartões para começar!
            </p>
            <div className="flex gap-3">
              <Button className="gradient-primary text-white" asChild>
                <Link href="/dashboard/cartoes">
                  Ver Meus Cartões
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/clientes/importar">
                  Importar Clientes
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Empty State - No Results */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Tente ajustar os filtros ou termo de busca.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setSelectedFilter('all')
              }}
            >
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Give Stamp Dialog */}
      {giveStampDialog.customer && (
        <GiveStampDialog
          isOpen={giveStampDialog.isOpen}
          onClose={() => setGiveStampDialog({ isOpen: false, customer: null })}
          customerId={giveStampDialog.customer.id}
          customerName={giveStampDialog.customer.name}
          cards={giveStampDialog.customer.loyalty_cards.map(card => ({
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