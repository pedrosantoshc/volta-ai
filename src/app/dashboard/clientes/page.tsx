'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { createClient } from '@/lib/supabase-client'
import { getCurrentBusinessId } from '@/lib/business'
import { useRouter } from 'next/navigation'
import { Trash2, Search, Eye, Gift, CheckSquare, Square } from 'lucide-react'
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
    <div className="space-y-6">
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
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {customers.length}
              </div>
              <p className="text-sm text-gray-600">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {customers.filter(c => c.loyalty_cards?.some(card => card.status === 'active')).length}
              </div>
              <p className="text-sm text-gray-600">Clientes Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {customers.reduce((total, customer) => total + getTotalStamps(customer), 0)}
              </div>
              <p className="text-sm text-gray-600">Selos Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {customers.reduce((total, customer) => total + getTotalRedeemed(customer), 0)}
              </div>
              <p className="text-sm text-gray-600">Resgates Realizados</p>
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
            <div className="flex gap-2">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {filteredCustomers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {selectedCustomers.length === filteredCustomers.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedCustomers.length === filteredCustomers.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                
                {selectedCustomers.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedCustomers.length} cliente(s) selecionado(s)
                  </span>
                )}
              </div>
              
              {selectedCustomers.length > 0 && (
                <Button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Excluindo...' : `Excluir ${selectedCustomers.length} cliente(s)`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
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

                    {/* Consent Info */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className={customer.consent.lgpd_accepted ? 'text-green-600' : 'text-red-600'}>
                          LGPD: {customer.consent.lgpd_accepted ? 'Aceito' : 'Não aceito'}
                        </span>
                        <span className={customer.consent.marketing_consent ? 'text-green-600' : 'text-gray-500'}>
                          Marketing: {customer.consent.marketing_consent ? 'Aceito' : 'Não aceito'}
                        </span>
                        <span>
                          Consentimento: {formatDate(customer.consent.consent_date)}
                        </span>
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!customer.consent.lgpd_accepted}
                      onClick={() => handleGiveStamp(customer)}
                      className="flex items-center gap-1"
                    >
                      <Gift className="w-4 h-4" />
                      Dar Selo
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
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum cliente ainda
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Quando clientes se inscreverem nos seus programas de fidelidade, 
              eles aparecerão aqui. Compartilhe o link dos seus cartões para começar!
            </p>
            <Button className="gradient-primary text-white" asChild>
              <Link href="/dashboard/cartoes">
                Ver Meus Cartões
              </Link>
            </Button>
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