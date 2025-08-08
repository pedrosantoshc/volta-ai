'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Gift, CheckCircle, AlertCircle } from 'lucide-react'

interface LoyaltyCardInfo {
  id: string
  name: string
  current_stamps: number
  required: number
  status: string
}

interface GiveStampDialogProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
  customerName: string
  cards: LoyaltyCardInfo[]
  onSuccess: () => void
}

interface AddStampsResponse {
  ok: boolean
  current_stamps: number
  status: string
  total_redeemed: number
}

interface ApiErrorResponse {
  error: string
  details?: string
}

export default function GiveStampDialog({
  isOpen,
  onClose,
  customerId,
  customerName,
  cards,
  onSuccess
}: GiveStampDialogProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [stamps, setStamps] = useState<string>('1')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Reset form when dialog opens
  const handleOpen = () => {
    if (isOpen) {
      setSelectedCardId(cards.length === 1 ? cards[0].id : '')
      setStamps('1')
      setError('')
      setSuccess('')
    }
  }

  React.useEffect(() => {
    handleOpen()
  }, [isOpen, cards])

  const selectedCard = cards.find(card => card.id === selectedCardId)
  const maxStamps = selectedCard ? selectedCard.required - selectedCard.current_stamps : 0
  const stampsNumber = parseInt(stamps) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!selectedCardId) {
      setError('Por favor, selecione um cartão')
      return
    }

    if (!stamps || stampsNumber <= 0) {
      setError('Por favor, insira um número válido de selos')
      return
    }

    if (stampsNumber > maxStamps) {
      setError(`Máximo de ${maxStamps} selos pode ser adicionado a este cartão`)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/stamps/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          loyalty_card_id: selectedCardId,
          stamps: stampsNumber
        })
      })

      const data: AddStampsResponse | ApiErrorResponse = await response.json()

      if (!response.ok) {
        const errorData = data as ApiErrorResponse
        setError(errorData.error || 'Erro ao adicionar selos')
        return
      }

      const successData = data as AddStampsResponse
      
      // Show success message
      if (successData.status === 'completed') {
        setSuccess(`🎉 Parabéns! Cartão completado com ${successData.current_stamps} selos. Total de resgates: ${successData.total_redeemed}`)
      } else {
        setSuccess(`✅ ${stampsNumber} selo(s) adicionado(s) com sucesso! Total atual: ${successData.current_stamps}`)
      }

      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)

    } catch (error) {
      console.error('Error adding stamps:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            Dar Selos para {customerName}
          </DialogTitle>
        </DialogHeader>

        {cards.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Nenhum cartão disponível</h3>
            <p className="text-sm text-gray-600">
              Este cliente não possui cartões de fidelidade ativos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Selection */}
            {cards.length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="card">Cartão de Fidelidade</Label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{card.name}</span>
                          <div className="flex items-center space-x-2 ml-4">
                            <span className="text-sm text-gray-500">
                              {card.current_stamps}/{card.required}
                            </span>
                            <Badge
                              variant={card.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {card.status === 'active' ? 'Ativo' : 'Completo'}
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cartão de Fidelidade</Label>
                <div className="p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cards[0].name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {cards[0].current_stamps}/{cards[0].required}
                      </span>
                      <Badge
                        variant={cards[0].status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {cards[0].status === 'active' ? 'Ativo' : 'Completo'}
                      </Badge>
                    </div>
                  </div>
                  {cards[0].status === 'completed' && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Cartão já está completo
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Card Progress (if card selected) */}
            {selectedCard && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progresso atual</span>
                  <span className="text-gray-600">
                    {selectedCard.current_stamps} de {selectedCard.required} selos
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((selectedCard.current_stamps / selectedCard.required) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {Math.min((selectedCard.current_stamps / selectedCard.required) * 100, 100).toFixed(1)}% completo
                </p>
              </div>
            )}

            {/* Stamps Input */}
            <div className="space-y-2">
              <Label htmlFor="stamps">Número de Selos</Label>
              <Input
                id="stamps"
                type="number"
                min="1"
                max={maxStamps}
                value={stamps}
                onChange={(e) => setStamps(e.target.value)}
                placeholder="1"
                disabled={isLoading || maxStamps === 0}
              />
              {selectedCard && (
                <p className="text-xs text-gray-500">
                  {maxStamps > 0 
                    ? `Máximo: ${maxStamps} selos (restam ${maxStamps} para completar)`
                    : 'Este cartão já está completo'
                  }
                </p>
              )}
            </div>

            {/* Preview */}
            {selectedCard && stampsNumber > 0 && stampsNumber <= maxStamps && (
              <div className="p-3 bg-blue-50 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">Prévia</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>Selos atuais: {selectedCard.current_stamps}</div>
                  <div>Selos a adicionar: +{stampsNumber}</div>
                  <div className="font-medium">
                    Novo total: {selectedCard.current_stamps + stampsNumber}
                  </div>
                  {selectedCard.current_stamps + stampsNumber >= selectedCard.required && (
                    <div className="flex items-center gap-1 text-green-700 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Cartão será completado! 🎉
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || maxStamps === 0 || stampsNumber <= 0 || stampsNumber > maxStamps}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? 'Adicionando...' : `Dar ${stampsNumber || 0} Selo(s)`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}