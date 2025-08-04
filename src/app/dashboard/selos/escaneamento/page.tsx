'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, Search, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

interface CustomerLoyaltyCard {
  id: string
  current_stamps: number
  status: 'active' | 'completed' | 'expired'
  customer: {
    id: string
    name: string
    phone: string
    email?: string
    total_visits: number
  }
  loyalty_card: {
    id: string
    name: string
    rules: {
      stamps_required: number
      reward_description: string
    }
  }
}

export default function EscaneamentoPage() {
  const [qrInput, setQrInput] = useState('')
  const [customerCard, setCustomerCard] = useState<CustomerLoyaltyCard | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const searchCustomerCard = async (qrCode: string) => {
    if (!qrCode.trim()) return

    setLoading(true)
    setError('')
    setCustomerCard(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Search for customer loyalty card by QR code
      const { data: cardData, error: cardError } = await supabase
        .from('customer_loyalty_cards')
        .select(`
          id,
          current_stamps,
          status,
          customer:customers (
            id,
            name,
            phone,
            email,
            total_visits
          ),
          loyalty_card:loyalty_cards (
            id,
            name,
            rules,
            business_id
          )
        `)
        .eq('qr_code', qrCode.trim())
        .single()

      if (cardError || !cardData) {
        setError('QR Code não encontrado. Verifique se o código está correto.')
        return
      }

      // Verify the card belongs to the current business
      if (cardData.loyalty_card.business_id !== user.id) {
        setError('Este QR Code não pertence ao seu estabelecimento.')
        return
      }

      setCustomerCard(cardData)
    } catch (err) {
      console.error('Error searching customer card:', err)
      setError('Erro ao buscar cartão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const addStamp = async () => {
    if (!customerCard) return

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      // Add stamp transaction
      const { error: transactionError } = await supabase
        .from('stamp_transactions')
        .insert({
          customer_loyalty_card_id: customerCard.id,
          stamps_added: 1,
          transaction_type: 'qr_scan',
          notes: 'Selo adicionado via escaneamento QR'
        })

      if (transactionError) {
        throw transactionError
      }

      // Update customer loyalty card
      const newStamps = customerCard.current_stamps + 1
      const requiredStamps = customerCard.loyalty_card.rules.stamps_required
      const newStatus = newStamps >= requiredStamps ? 'completed' : 'active'

      const { error: updateError } = await supabase
        .from('customer_loyalty_cards')
        .update({ 
          current_stamps: newStamps,
          status: newStatus
        })
        .eq('id', customerCard.id)

      if (updateError) {
        throw updateError
      }

      // Update customer visit count and last visit
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          total_visits: supabase.raw('total_visits + 1'),
          last_visit: new Date().toISOString()
        })
        .eq('id', customerCard.customer.id)

      if (customerUpdateError) {
        console.error('Error updating customer:', customerUpdateError)
      }

      // Update local state
      setCustomerCard({
        ...customerCard,
        current_stamps: newStamps,
        status: newStatus,
        customer: {
          ...customerCard.customer,
          total_visits: customerCard.customer.total_visits + 1
        }
      })

      setSuccess(`Selo adicionado com sucesso! ${newStamps}/${requiredStamps} selos.`)
      
      // Clear QR input for next scan
      setQrInput('')
      
      // If card is completed, show completion message
      if (newStatus === 'completed') {
        setSuccess(`🎉 Cartão completo! ${customerCard.customer.name} pode resgatar: ${customerCard.loyalty_card.rules.reward_description}`)
      }

    } catch (err) {
      console.error('Error adding stamp:', err)
      setError('Erro ao adicionar selo. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Não foi possível acessar a câmera. Use a busca manual.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/selos">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escanear QR Code</h1>
          <p className="text-gray-600">Adicione selos escaneando o QR Code do cliente</p>
        </div>
      </div>

      {/* Camera Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Scanner QR Code</span>
          </CardTitle>
          <CardDescription>
            Use a câmera para escanear o QR Code do cartão de fidelidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!cameraActive ? (
            <Button 
              onClick={startCamera}
              className="w-full gradient-primary text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              Abrir Câmera
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
                </div>
              </div>
              <Button 
                onClick={stopCamera}
                variant="outline"
                className="w-full"
              >
                Fechar Câmera
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Busca Manual</span>
          </CardTitle>
          <CardDescription>
            Digite ou cole o código QR do cartão de fidelidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="qr-input">Código QR</Label>
              <Input
                id="qr-input"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Cole o código QR aqui..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchCustomerCard(qrInput)
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => searchCustomerCard(qrInput)}
                disabled={loading || !qrInput.trim()}
                className="gradient-primary text-white"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 p-3 rounded-md">
          <CheckCircle className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Customer Card Result */}
      {customerCard && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{customerCard.customer.name}</CardTitle>
                <CardDescription>
                  {customerCard.customer.phone} • {customerCard.customer.total_visits} visitas
                </CardDescription>
              </div>
              <Badge 
                variant={customerCard.status === 'completed' ? 'default' : 'secondary'}
                className={customerCard.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
              >
                {customerCard.status === 'completed' ? 'Completo' : 
                 customerCard.status === 'expired' ? 'Expirado' : 'Ativo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loyalty Card */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">{customerCard.loyalty_card.name}</h4>
              
              {/* Progress */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{customerCard.current_stamps}/{customerCard.loyalty_card.rules.stamps_required} selos</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(customerCard.current_stamps / customerCard.loyalty_card.rules.stamps_required) * 100}%` 
                    }}
                  ></div>
                </div>
                
                {/* Stamps Visual */}
                <div className="flex justify-center space-x-1 py-2">
                  {Array.from({ length: Math.min(customerCard.loyalty_card.rules.stamps_required, 10) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                        i < customerCard.current_stamps
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-gray-300 text-gray-400'
                      }`}
                    >
                      {i < customerCard.current_stamps ? '⭐' : '○'}
                    </div>
                  ))}
                  {customerCard.loyalty_card.rules.stamps_required > 10 && (
                    <span className="text-xs text-gray-500 self-center">...</span>
                  )}
                </div>
              </div>
              
              {/* Reward Info */}
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Recompensa:</strong> {customerCard.loyalty_card.rules.reward_description}
                </p>
              </div>
              
              {/* Action Button */}
              <div className="mt-4">
                {customerCard.status === 'active' && (
                  <Button
                    onClick={addStamp}
                    disabled={processing}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {processing ? 'Adicionando...' : '+ Adicionar Selo'}
                  </Button>
                )}
                
                {customerCard.status === 'completed' && (
                  <div className="text-center">
                    <div className="text-green-600 font-medium mb-2">
                      🎉 Cartão Completo!
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-green-300 text-green-700"
                    >
                      🎁 Cliente pode resgatar recompensa
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard/selos">
            Ver Todos os Clientes
          </Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard/selos/historico">
            Ver Histórico
          </Link>
        </Button>
      </div>
    </div>
  )
}