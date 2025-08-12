'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, Users, Award, AlertCircle, CheckCircle, History } from 'lucide-react'

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
  const [processingStamp, setProcessingStamp] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [cardCompletionDialog, setCardCompletionDialog] = useState<{
    isOpen: boolean
    customer: Customer | null
    completedCard: CustomerLoyaltyCard | null
  }>({ isOpen: false, customer: null, completedCard: null })
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

  const addStamp = async (customerLoyaltyCardId: string, customerId: string, cardIndex: number, customerIndex: number) => {
    setProcessingStamp(customerLoyaltyCardId)
    setError('')
    setSuccess('')
    
    try {
      // Get current card data for validation
      const customer = customers[customerIndex]
      const card = customer.customer_loyalty_cards[cardIndex]
      const requiredStamps = card.loyalty_card.rules.stamps_required
      const currentStamps = card.current_stamps
      
      // Optimistic UI update
      const newStamps = currentStamps + 1
      const willComplete = newStamps >= requiredStamps
      const newStatus = willComplete ? 'completed' : 'active'
      
      setCustomers(prevCustomers => {
        const updatedCustomers = [...prevCustomers]
        const updatedCustomer = { ...updatedCustomers[customerIndex] }
        const updatedCards = [...updatedCustomer.customer_loyalty_cards]
        updatedCards[cardIndex] = {
          ...updatedCards[cardIndex],
          current_stamps: newStamps,
          status: newStatus
        }
        updatedCustomer.customer_loyalty_cards = updatedCards
        updatedCustomer.total_visits = updatedCustomer.total_visits + 1
        updatedCustomer.last_visit = new Date().toISOString()
        updatedCustomers[customerIndex] = updatedCustomer
        return updatedCustomers
      })
      
      // Call API to add stamp
      const response = await fetch('/api/stamps/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          loyalty_card_id: card.loyalty_card.id,
          stamps: 1
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add stamp')
      }
      
      setSuccess(result.message || 'Selo adicionado com sucesso!')
      
      // If card was completed, show completion dialog
      if (willComplete) {
        setCardCompletionDialog({
          isOpen: true,
          customer: customer,
          completedCard: card
        })
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err: any) {
      console.error('Error adding stamp:', err)
      setError(err.message || 'Erro ao adicionar selo. Tente novamente.')
      
      // Revert optimistic update on error
      const customer = customers[customerIndex]
      const card = customer.customer_loyalty_cards[cardIndex]
      
      setCustomers(prevCustomers => {
        const revertedCustomers = [...prevCustomers]
        const revertedCustomer = { ...revertedCustomers[customerIndex] }
        const revertedCards = [...revertedCustomer.customer_loyalty_cards]
        revertedCards[cardIndex] = {
          ...revertedCards[cardIndex],
          current_stamps: card.current_stamps - 1,
          status: card.current_stamps - 1 >= card.loyalty_card.rules.stamps_required ? 'completed' : 'active'
        }
        revertedCustomer.customer_loyalty_cards = revertedCards
        revertedCustomer.total_visits = Math.max(0, revertedCustomer.total_visits - 1)
        revertedCustomers[customerIndex] = revertedCustomer
        return revertedCustomers
      })
    } finally {
      setProcessingStamp(null)
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
          <Button variant="outline" asChild>
            <Link href="/dashboard/selos/historico">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-md">
          <CheckCircle className="w-4 h-4" />
          {success}
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
        {filteredCustomers.map((customer, customerIndex) => (
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
              {customer.customer_loyalty_cards.map((card, cardIndex) => (
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
                        disabled={processingStamp === card.id}
                        onClick={() => addStamp(card.id, customer.id, cardIndex, customerIndex)}
                        className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                      >
                        {processingStamp === card.id ? 'Adicionando...' : '+ Selo'}
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
      
      {/* Card Completion Dialog */}
      <Dialog 
        open={cardCompletionDialog.isOpen} 
        onOpenChange={(open) => !open && setCardCompletionDialog({ isOpen: false, customer: null, completedCard: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎉 Cartão Completado!
            </DialogTitle>
            <DialogDescription>
              {cardCompletionDialog.customer?.name} completou o cartão "{cardCompletionDialog.completedCard?.loyalty_card.name}"!
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Recompensa disponível:</h4>
              <p className="text-green-800">{cardCompletionDialog.completedCard?.loyalty_card.rules.reward_description}</p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCardCompletionDialog({ isOpen: false, customer: null, completedCard: null })}
            >
              Fechar
            </Button>
            <Button 
              className="gradient-primary text-white"
              onClick={() => {
                // TODO: Implement new card creation
                alert('Funcionalidade de criar novo cartão será implementada em breve!')
                setCardCompletionDialog({ isOpen: false, customer: null, completedCard: null })
              }}
            >
              Criar Novo Cartão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}