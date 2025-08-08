'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { getCurrentBusinessId } from '@/lib/business'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Gift, Phone } from 'lucide-react'
import Link from "next/link"
import GiveStampDialog from '../../clientes/_components/GiveStampDialog'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  customer_loyalty_cards: CustomerLoyaltyCard[]
  consent: {
    lgpd_accepted: boolean
  }
}

interface CustomerLoyaltyCard {
  id: string
  loyalty_card_id: string
  current_stamps: number
  total_redeemed: number
  status: string
  loyalty_cards: {
    id: string
    name: string
    rules: {
      stamps_required: number
    }
  }
}

export default function AddStampsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [giveStampDialog, setGiveStampDialog] = useState<{
    isOpen: boolean
    customer: Customer | null
  }>({ isOpen: false, customer: null })
  const supabase = createClient()

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Usuário não autenticado')
          return
        }

        const businessId = await getCurrentBusinessId(supabase, user.email!)

        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select(`
            id,
            name,
            phone,
            email,
            consent,
            customer_loyalty_cards (
              id,
              loyalty_card_id,
              current_stamps,
              total_redeemed,
              status,
              loyalty_cards (
                id,
                name,
                rules
              )
            )
          `)
          .eq('business_id', businessId)
          .order('name', { ascending: true })

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
  }, [supabase])

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm.replace(/\D/g, '')) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredCustomers(filtered)
    }
  }, [customers, searchTerm])

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }

  const getTotalStamps = (customer: Customer) => {
    return customer.customer_loyalty_cards?.reduce((total, card) => total + card.current_stamps, 0) || 0
  }

  const handleGiveStamp = (customer: Customer) => {
    if (!customer.consent.lgpd_accepted) {
      alert('Este cliente não aceitou os termos LGPD. Não é possível adicionar selos.')
      return
    }

    if (!customer.customer_loyalty_cards || customer.customer_loyalty_cards.length === 0) {
      alert('Este cliente não possui cartões de fidelidade.')
      return
    }

    setGiveStampDialog({ isOpen: true, customer })
  }

  const handleGiveStampSuccess = () => {
    // Reload customers to get updated data
    const reloadCustomers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const businessId = await getCurrentBusinessId(supabase, user.email!)

        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select(`
            id,
            name,
            phone,
            email,
            consent,
            customer_loyalty_cards (
              id,
              loyalty_card_id,
              current_stamps,
              total_redeemed,
              status,
              loyalty_cards (
                id,
                name,
                rules
              )
            )
          `)
          .eq('business_id', businessId)
          .order('name', { ascending: true })

        if (customersError) {
          console.error('Error reloading customers:', customersError)
          return
        }

        setCustomers(customersData || [])
      } catch (err) {
        console.error('Error reloading customers:', err)
      }
    }

    reloadCustomers()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/selos">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Adicionar Selos</h1>
            <p className="text-gray-600">Busque um cliente e adicione selos manualmente</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 text-lg py-6"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : searchTerm && filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-600 text-center mb-6">
              Não encontramos nenhum cliente com &ldquo;{searchTerm}&rdquo;. Tente outro termo.
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Limpar Busca
            </Button>
          </CardContent>
        </Card>
      ) : !searchTerm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Busque um cliente</h3>
            <p className="text-gray-600 text-center mb-6">
              Digite o nome, telefone ou email do cliente na barra de busca acima para adicionar selos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-semibold text-lg">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg text-gray-900">{customer.name}</h3>
                        {!customer.consent.lgpd_accepted && (
                          <Badge variant="destructive" className="text-xs">
                            LGPD não aceito
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{formatPhone(customer.phone)}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            <span>{customer.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Loyalty Cards Info */}
                      {customer.customer_loyalty_cards.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {customer.customer_loyalty_cards.map((card) => (
                            <div key={card.id} className="bg-gray-50 rounded-lg px-3 py-1 text-sm">
                              <span className="font-medium">{card.loyalty_cards.name}:</span>
                              <span className="ml-1">
                                {card.current_stamps}/{card.loyalty_cards.rules.stamps_required} selos
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center text-sm text-gray-600">
                            <Gift className="w-4 h-4 mr-1" />
                            <span>{getTotalStamps(customer)} selos no total</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum cartão de fidelidade</p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleGiveStamp(customer)}
                    disabled={!customer.consent.lgpd_accepted || !customer.customer_loyalty_cards || customer.customer_loyalty_cards.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Dar Selos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Show total results */}
          {searchTerm && (
            <div className="text-center text-sm text-gray-500 py-4">
              {filteredCustomers.length} cliente(s) encontrado(s) para &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Give Stamp Dialog */}
      {giveStampDialog.customer && (
        <GiveStampDialog
          isOpen={giveStampDialog.isOpen}
          onClose={() => setGiveStampDialog({ isOpen: false, customer: null })}
          customerId={giveStampDialog.customer.id}
          customerName={giveStampDialog.customer.name}
          cards={giveStampDialog.customer.customer_loyalty_cards.map(card => ({
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