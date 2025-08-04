'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Calendar, Filter, Download } from 'lucide-react'

interface StampTransaction {
  id: string
  stamps_added: number
  transaction_type: 'manual' | 'qr_scan' | 'pos'
  notes?: string
  created_at: string
  customer_loyalty_cards: {
    id: string
    customer: {
      id: string
      name: string
      phone: string
    }
    loyalty_card: {
      id: string
      name: string
    }
  }
}

export default function HistoricoPage() {
  const [transactions, setTransactions] = useState<StampTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<StampTransaction[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load stamp transactions with customer and card info
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('stamp_transactions')
          .select(`
            id,
            stamps_added,
            transaction_type,
            notes,
            created_at,
            customer_loyalty_cards (
              id,
              customer:customers (
                id,
                name,
                phone
              ),
              loyalty_card:loyalty_cards!inner (
                id,
                name,
                business_id
              )
            )
          `)
          .eq('customer_loyalty_cards.loyalty_card.business_id', user.id)
          .order('created_at', { ascending: false })
          .limit(200)

        if (transactionsError) {
          console.error('Error loading transactions:', transactionsError)
          setError('Erro ao carregar histórico.')
          return
        }

        setTransactions(transactionsData || [])
        setFilteredTransactions(transactionsData || [])
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Erro inesperado ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [router, supabase])

  useEffect(() => {
    let filtered = transactions

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(transaction =>
        transaction.customer_loyalty_cards.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.customer_loyalty_cards.customer.phone.includes(searchQuery) ||
        transaction.customer_loyalty_cards.loyalty_card.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by transaction type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.transaction_type === typeFilter)
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const startDate = new Date()

      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        default:
          break
      }

      if (dateFilter !== 'all') {
        filtered = filtered.filter(transaction => 
          new Date(transaction.created_at) >= startDate
        )
      }
    }

    setFilteredTransactions(filtered)
  }, [transactions, searchQuery, typeFilter, dateFilter])

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'manual': return 'Manual'
      case 'qr_scan': return 'QR Code'
      case 'pos': return 'POS'
      default: return type
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800'
      case 'qr_scan': return 'bg-green-100 text-green-800'
      case 'pos': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const exportToCSV = () => {
    const csvData = filteredTransactions.map(transaction => ({
      'Data': new Date(transaction.created_at).toLocaleString('pt-BR'),
      'Cliente': transaction.customer_loyalty_cards.customer.name,
      'Telefone': transaction.customer_loyalty_cards.customer.phone,
      'Cartão': transaction.customer_loyalty_cards.loyalty_card.name,
      'Selos': transaction.stamps_added,
      'Tipo': getTransactionTypeLabel(transaction.transaction_type),
      'Observações': transaction.notes || ''
    }))

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-selos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Selos</h1>
            <p className="text-gray-600">Acompanhe todas as transações de selos</p>
          </div>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          disabled={filteredTransactions.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cliente, telefone ou cartão..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="qr_scan">QR Code</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {filteredTransactions.length}
            </div>
            <p className="text-sm text-gray-600">Total de Transações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredTransactions.reduce((sum, t) => sum + t.stamps_added, 0)}
            </div>
            <p className="text-sm text-gray-600">Selos Distribuídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {filteredTransactions.filter(t => t.transaction_type === 'qr_scan').length}
            </div>
            <p className="text-sm text-gray-600">Via QR Code</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {filteredTransactions.filter(t => t.transaction_type === 'manual').length}
            </div>
            <p className="text-sm text-gray-600">Manuais</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transações ({filteredTransactions.length})</CardTitle>
          <CardDescription>
            Histórico completo de selos adicionados aos cartões de fidelidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold">
                          +{transaction.stamps_added}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.customer_loyalty_cards.customer.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.customer_loyalty_cards.customer.phone} • {transaction.customer_loyalty_cards.loyalty_card.name}
                      </p>
                      {transaction.notes && (
                        <p className="text-xs text-gray-400 mt-1">
                          {transaction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || typeFilter !== 'all' || dateFilter !== 'all'
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'Ainda não há transações de selos registradas.'
                }
              </p>
              <Button className="gradient-primary text-white" asChild>
                <Link href="/dashboard/selos">
                  Adicionar Selos
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}