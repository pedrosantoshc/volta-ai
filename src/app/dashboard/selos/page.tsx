'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, QrCode, Users, Award } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  total_visits: number
  last_visit?: string
  customer_loyalty_cards: CustomerLoyaltyCard[]
}

interface CustomerLoyaltyCard {
  id: string
  current_stamps: number
  loyalty_card: {
    id: string
    name: string
    rules: {
      stamps_required: number
      reward_description: string
    }
  }
  status: 'active' | 'completed' | 'expired'
}

interface RecentTransaction {
  id: string
  stamps_added: number
  created_at: string
  customer_loyalty_cards: {
    customer: {
      name: string
      phone: string
    }
    loyalty_card: {
      name: string
    }
  }
}

export default function SelosPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load customers with loyalty cards
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select(`
            id,
            name,
            phone,
            email,
            total_visits,
            last_visit,
            customer_loyalty_cards (
              id,
              current_stamps,
              status,
              loyalty_card:loyalty_cards (
                id,
                name,
                rules
              )
            )
          `)
          .eq('business_id', user.id)
          .order('last_visit', { ascending: false, nullsFirst: false })
          .limit(20)

        if (customersError) {
          console.error('Error loading customers:', customersError)
          setError('Erro ao carregar clientes.')
          return
        }

        // Load recent stamp transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('stamp_transactions')
          .select(`
            id,
            stamps_added,
            created_at,
            customer_loyalty_cards (
              customer:customers (
                name,
                phone
              ),
              loyalty_card:loyalty_cards (
                name
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10)

        if (transactionsError) {
          console.error('Error loading transactions:', transactionsError)
        }

        setCustomers(customersData || [])
        setRecentTransactions(transactionsData || [])
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Erro inesperado ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  )

  const addStamp = async (customerLoyaltyCardId: string, customerId: string) => {
    try {
      // Add stamp transaction
      const { error: transactionError } = await supabase
        .from('stamp_transactions')
        .insert({
          customer_loyalty_card_id: customerLoyaltyCardId,
          stamps_added: 1,
          transaction_type: 'manual',
          notes: 'Selo adicionado manualmente'
        })

      if (transactionError) {
        console.error('Error adding stamp transaction:', transactionError)
        return
      }

      // Update customer loyalty card
      const { data: currentCard, error: fetchError } = await supabase
        .from('customer_loyalty_cards')
        .select('current_stamps, loyalty_card:loyalty_cards(rules)')
        .eq('id', customerLoyaltyCardId)
        .single()

      if (fetchError) {
        console.error('Error fetching current card:', fetchError)
        return
      }

      const newStamps = (currentCard.current_stamps || 0) + 1
      const requiredStamps = currentCard.loyalty_card.rules?.stamps_required || 10
      const newStatus = newStamps >= requiredStamps ? 'completed' : 'active'

      const { error: updateError } = await supabase
        .from('customer_loyalty_cards')
        .update({ 
          current_stamps: newStamps,
          status: newStatus
        })
        .eq('id', customerLoyaltyCardId)

      if (updateError) {
        console.error('Error updating card:', updateError)
        return
      }

      // Update customer visit count and last visit
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          total_visits: supabase.raw('total_visits + 1'),
          last_visit: new Date().toISOString()
        })
        .eq('id', customerId)

      if (customerUpdateError) {
        console.error('Error updating customer:', customerUpdateError)
      }

      // Refresh data
      window.location.reload()
    } catch (err) {
      console.error('Error adding stamp:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Selos</h1>
          <p className="text-gray-600">Adicione selos aos cartões de fidelidade dos seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Button className="gradient-primary text-white" asChild>
            <Link href="/dashboard/selos/escaneamento">
              <QrCode className="w-4 h-4 mr-2" />
              Escanear QR
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/selos/historico">
              Histórico
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {customers.length}
                </div>
                <p className="text-sm text-gray-600">Clientes Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Plus className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {recentTransactions.length}
                </div>
                <p className="text-sm text-gray-600">Selos Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {customers.reduce((count, customer) => 
                    count + customer.customer_loyalty_cards.filter(card => card.status === 'completed').length, 0
                  )}
                </div>
                <p className="text-sm text-gray-600">Cartões Completos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar cliente por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <CardDescription>
                    {customer.phone} • {customer.total_visits} visitas
                  </CardDescription>
                </div>
                {customer.last_visit && (
                  <Badge variant="outline" className="text-xs">
                    Última visita: {new Date(customer.last_visit).toLocaleDateString('pt-BR')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.customer_loyalty_cards.map((card) => (
                <div key={card.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">{card.loyalty_card.name}</h4>
                    <Badge 
                      variant={card.status === 'completed' ? 'default' : 'secondary'}
                      className={card.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {card.status === 'completed' ? 'Completo' : 
                       card.status === 'expired' ? 'Expirado' : 'Ativo'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-600">
                        {card.current_stamps}/{card.loyalty_card.rules.stamps_required} selos
                      </div>
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(card.loyalty_card.rules.stamps_required, 8) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full border ${
                              i < card.current_stamps
                                ? 'bg-purple-600 border-purple-600'
                                : 'border-gray-300'
                            }`}
                          />
                        ))}
                        {card.loyalty_card.rules.stamps_required > 8 && (
                          <span className="text-xs text-gray-500">...</span>
                        )}
                      </div>
                    </div>
                    
                    {card.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => addStamp(card.id, customer.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        + Selo
                      </Button>
                    )}
                    
                    {card.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700"
                      >
                        🎁 Resgatar
                      </Button>
                    )}
                  </div>
                  
                  {card.status === 'completed' && (
                    <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                      Recompensa: {card.loyalty_card.rules.reward_description}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum cliente encontrado
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              {searchQuery 
                ? 'Tente uma busca diferente ou verifique se o cliente está cadastrado.'
                : 'Ainda não há clientes cadastrados no seu programa de fidelidade.'
              }
            </p>
            <Button className="gradient-primary text-white" asChild>
              <Link href="/dashboard/clientes">
                Ver Todos os Clientes
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}