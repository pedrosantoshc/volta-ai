'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Smartphone, Download, QrCode, CheckCircle, AlertCircle } from 'lucide-react'

interface WalletIntegrationProps {
  customerId: string
  loyaltyCardId: string
  customerName: string
  loyaltyCardName: string
  onSuccess?: (walletData: WalletData) => void
  onError?: (error: string) => void
}

interface WalletData {
  id: string
  passkit_id: string
  wallet_pass_url: string
  google_pay_url: string
  qr_code: string
}

interface WalletStatus {
  loading: boolean
  success: boolean
  error: string | null
  walletData: WalletData | null
}

// Detect if user is on iOS or Android
function detectDevice(): 'ios' | 'android' | 'unknown' {
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios'
  } else if (/android/.test(userAgent)) {
    return 'android'
  }
  
  return 'unknown'
}

// Check if device supports wallet apps
function supportsWallet(): boolean {
  const device = detectDevice()
  return device === 'ios' || device === 'android'
}

export default function WalletIntegration({
  customerId,
  loyaltyCardId,
  customerName: _customerName,
  loyaltyCardName,
  onSuccess,
  onError
}: WalletIntegrationProps) {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({
    loading: false,
    success: false,
    error: null,
    walletData: null
  })
  const [device] = useState(() => detectDevice())
  const [showQR, setShowQR] = useState(false)

  // Create wallet pass
  const createWalletPass = async () => {
    setWalletStatus({
      loading: true,
      success: false,
      error: null,
      walletData: null
    })

    try {
      const response = await fetch('/api/passkit/create-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          loyaltyCardId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao criar carteira digital')
      }

      const walletData = result.data
      setWalletStatus({
        loading: false,
        success: true,
        error: null,
        walletData
      })

      onSuccess?.(walletData)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setWalletStatus({
        loading: false,
        success: false,
        error: errorMessage,
        walletData: null
      })

      onError?.(errorMessage)
    }
  }

  // Open wallet app
  const openWallet = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Download QR code (simple implementation)
  const downloadQR = () => {
    if (!walletStatus.walletData?.qr_code) return
    
    // In a real implementation, you'd generate and download an actual QR code image
    const qrData = walletStatus.walletData?.qr_code
    const blob = new Blob([`QR Code: ${qrData}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${loyaltyCardName}-qr-code.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!supportsWallet()) {
    return (
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4 text-center">
          <Smartphone className="w-8 h-8 text-orange-600 mx-auto mb-2" />
          <h3 className="font-medium text-orange-900 mb-1">Carteira Digital Não Disponível</h3>
          <p className="text-sm text-orange-800">
            A carteira digital está disponível apenas em dispositivos iOS e Android.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (walletStatus.loading) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
          <h3 className="font-medium text-blue-900 mb-1">Criando Carteira Digital</h3>
          <p className="text-sm text-blue-800">
            Preparando seu cartão de fidelidade para a carteira...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (walletStatus.error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 mb-1">Erro na Carteira Digital</h3>
              <p className="text-sm text-red-800 mb-3">{walletStatus.error}</p>
              <Button
                onClick={createWalletPass}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (walletStatus.success && walletStatus.walletData) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-medium text-green-900 mb-1">Carteira Digital Criada! 🎉</h3>
            <p className="text-sm text-green-800">
              Seu cartão de fidelidade está pronto para ser adicionado à carteira.
            </p>
          </div>

          <div className="space-y-3">
            {/* Apple Wallet Button */}
            {device === 'ios' && walletStatus.walletData?.wallet_pass_url && (
              <Button
                onClick={() => walletStatus.walletData?.wallet_pass_url && openWallet(walletStatus.walletData.wallet_pass_url)}
                className="w-full bg-black hover:bg-gray-800 text-white flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Adicionar à Apple Wallet
              </Button>
            )}

            {/* Google Pay Button */}
            {device === 'android' && walletStatus.walletData?.google_pay_url && (
              <Button
                onClick={() => walletStatus.walletData?.google_pay_url && openWallet(walletStatus.walletData.google_pay_url)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.65 10.41c-.36-.29-.61-.4-1.05-.4-.64 0-1.1.46-1.1 1.07 0 .61.46 1.07 1.1 1.07.44 0 .69-.11 1.05-.4v-.34h-.89v-.58h1.54v1.34c-.41.36-.96.58-1.7.58-1.06 0-1.92-.86-1.92-1.92s.86-1.92 1.92-1.92c.74 0 1.29.22 1.7.58l-.65.52zm1.67 2.03V9.59h.82v2.85h-.82zm2.15-2.85v.58h-.95v.71h.86v.58h-.86v.98h-.82V9.59h1.77zm1.67 2.85V9.59h.82v2.85h-.82z"/>
                </svg>
                Adicionar ao Google Pay
              </Button>
            )}

            {/* Universal wallet button for unknown devices */}
            {device === 'unknown' && (walletStatus.walletData?.wallet_pass_url || walletStatus.walletData?.google_pay_url) && (
              <div className="grid grid-cols-2 gap-2">
                {walletStatus.walletData?.wallet_pass_url && (
                  <Button
                    onClick={() => walletStatus.walletData?.wallet_pass_url && openWallet(walletStatus.walletData.wallet_pass_url)}
                    size="sm"
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    Apple Wallet
                  </Button>
                )}
                {walletStatus.walletData?.google_pay_url && (
                  <Button
                    onClick={() => walletStatus.walletData?.google_pay_url && openWallet(walletStatus.walletData.google_pay_url)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Google Pay
                  </Button>
                )}
              </div>
            )}

            {/* QR Code Section */}
            <div className="pt-2 border-t border-green-200">
              <Button
                onClick={() => setShowQR(!showQR)}
                variant="ghost"
                size="sm"
                className="w-full text-green-700 hover:text-green-900 hover:bg-green-100"
              >
                <QrCode className="w-4 h-4 mr-2" />
                {showQR ? 'Ocultar QR Code' : 'Mostrar QR Code'}
              </Button>
              
              {showQR && walletStatus.walletData?.qr_code && (
                <div className="mt-3 text-center space-y-2">
                  <div className="bg-white p-4 rounded-lg border inline-block">
                    <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-gray-400" />
                      <div className="absolute text-xs text-gray-500 mt-20">QR Code</div>
                    </div>
                  </div>
                  <div className="text-xs text-green-700">
                    Código: {walletStatus.walletData?.qr_code?.slice(0, 20)}...
                  </div>
                  <Button
                    onClick={downloadQR}
                    size="sm"
                    variant="ghost"
                    className="text-green-700 hover:text-green-900"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar QR Code
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Initial state - show create wallet button
  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardContent className="p-4 text-center">
        <Smartphone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
        <h3 className="font-medium text-purple-900 mb-2">Adicionar à Carteira Digital</h3>
        <p className="text-sm text-purple-800 mb-4">
          Tenha seu cartão de fidelidade sempre à mão no seu celular.
        </p>
        <Button
          onClick={createWalletPass}
          className="w-full gradient-primary text-white"
        >
          Criar Carteira Digital
        </Button>
      </CardContent>
    </Card>
  )
}