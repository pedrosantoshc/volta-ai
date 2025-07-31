'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface BusinessData {
  id: string
  name: string
  settings: any
  logo_url?: string
}

export default function OnboardingComplete() {
  const [user, setUser] = useState<User | null>(null)
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (!user) {
        router.push('/login')
        return
      }

      // Get business data
      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !businessData) {
        router.push('/onboarding/step-1')
        return
      }

      setBusiness(businessData)
      setLoading(false)

      // Mark onboarding as completed if not already done
      if (!businessData.settings?.onboarding_completed) {
        await supabase
          .from('businesses')
          .update({
            settings: {
              ...businessData.settings,
              onboarding_completed: true,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', user.id)
      }
    }

    getUser()
  }, [router, supabase])

  const handleCreateFirstCard = () => {
    router.push('/dashboard/cartoes/novo')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user || !business) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-2xl font-bold gradient-text">Volta.AI</span>
          </Link>
          
          {/* Success Animation */}
          <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl gradient-text">Parabéns! 🎉</CardTitle>
            <CardDescription className="text-lg">
              Sua conta foi configurada com sucesso. Agora você está pronto para revolucionar 
              a fidelidade do seu restaurante!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Business Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-4">Resumo da configuração</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-purple-900">Restaurante</p>
                    <p className="text-purple-700">{business.name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">Tipo de negócio</p>
                    <p className="text-purple-700">
                      {business.settings?.business_type === 'restaurant' && 'Restaurante'}
                      {business.settings?.business_type === 'cafe' && 'Café / Cafeteria'}
                      {business.settings?.business_type === 'bar' && 'Bar / Boteco'}
                      {business.settings?.business_type === 'bakery' && 'Padaria'}
                      {business.settings?.business_type === 'pizzeria' && 'Pizzaria'}
                      {business.settings?.business_type === 'fast_food' && 'Fast Food'}
                      {business.settings?.business_type === 'ice_cream' && 'Sorveteria'}
                      {business.settings?.business_type === 'juice_bar' && 'Casa de Açaí'}
                      {business.settings?.business_type === 'other' && 'Outro'}
                      {!business.settings?.business_type && 'Não especificado'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">Tom da IA</p>
                    <p className="text-purple-700 capitalize">
                      {business.settings?.ai_tone || 'Não configurado'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">Equipe</p>
                    <p className="text-purple-700">
                      {business.settings?.team_members?.length || 0} membros convidados
                    </p>
                  </div>
                </div>
              </div>

              {/* Features Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 gradient-primary rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-1">Carteiras Digitais</h4>
                  <p className="text-sm text-gray-600">Apple Wallet & Google Pay</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 gradient-primary rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-1">WhatsApp IA</h4>
                  <p className="text-sm text-gray-600">Campanhas automáticas</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 gradient-primary rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-1">Analytics</h4>
                  <p className="text-sm text-gray-600">Insights inteligentes</p>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-bold text-lg text-green-900 mb-4">Próximos passos</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">1</div>
                    <div>
                      <p className="font-medium text-green-900">Crie seu primeiro cartão de fidelidade</p>
                      <p className="text-sm text-green-700">Configure as regras, design e recompensas</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">2</div>
                    <div>
                      <p className="font-medium text-green-900">Gere códigos QR para os clientes</p>
                      <p className="text-sm text-green-700">Imprima ou mostre na tela para cadastro</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">3</div>
                    <div>
                      <p className="font-medium text-green-900">Comece a adicionar selos</p>
                      <p className="text-sm text-green-700">Use o painel para dar selos aos clientes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  onClick={handleCreateFirstCard}
                  className="flex-1 gradient-primary text-white py-3 text-lg"
                >
                  Criar Primeiro Cartão 🎯
                </Button>
                <Button 
                  onClick={handleGoToDashboard}
                  variant="outline"
                  className="flex-1 py-3 text-lg"
                >
                  Ir para Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Precisa de ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Recursos úteis:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <Link href="/docs/guia-rapido" className="hover:text-purple-600 underline">Guia rápido de uso</Link></li>
                  <li>• <Link href="/docs/perguntas-frequentes" className="hover:text-purple-600 underline">Perguntas frequentes</Link></li>
                  <li>• <Link href="/docs/melhores-praticas" className="hover:text-purple-600 underline">Melhores práticas</Link></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Suporte:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <Link href="/contato" className="hover:text-purple-600 underline">Central de ajuda</Link></li>
                  <li>• Email: suporte@volta.ai</li>
                  <li>• WhatsApp: (11) 99999-9999</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}