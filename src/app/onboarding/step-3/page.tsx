'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"

interface BusinessData {
  id: string
  name: string
  settings: any
}

interface AIPreviewData {
  tone: string
  brandVoice: string
  businessName: string
}

export default function OnboardingStep3() {
  const [user, setUser] = useState<User | null>(null)
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [aiTone, setAiTone] = useState('amigável')
  const [brandVoice, setBrandVoice] = useState('')
  const [autoCampaigns, setAutoCampaigns] = useState(true)
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

      // Get business data to ensure previous steps are completed
      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !businessData) {
        router.push('/onboarding/step-1')
        return
      }

      if (!businessData.settings?.onboarding_step || businessData.settings.onboarding_step < 2) {
        router.push('/onboarding/step-2')
        return
      }

      setBusiness(businessData)

      // Load existing AI settings if available
      if (businessData.settings?.ai_tone) {
        setAiTone(businessData.settings.ai_tone)
      }
      if (businessData.settings?.brand_voice) {
        setBrandVoice(businessData.settings.brand_voice)
      }
      if (businessData.settings?.auto_campaigns !== undefined) {
        setAutoCampaigns(businessData.settings.auto_campaigns)
      }
      if (businessData.settings?.whatsapp_enabled !== undefined) {
        setWhatsappEnabled(businessData.settings.whatsapp_enabled)
      }
    }

    getUser()
  }, [router, supabase])

  // Generate AI preview when settings change
  useEffect(() => {
    if (business) {
      generatePreview({
        tone: aiTone,
        brandVoice: brandVoice,
        businessName: business.name
      })
    }
  }, [aiTone, brandVoice, business])

  const generatePreview = (data: AIPreviewData) => {
    const toneExamples = {
      'amigável': 'Oi! 😊 Sentimos sua falta aqui no {restaurante}! Que tal voltar essa semana? Temos uma surpresa especial esperando por você! ✨',
      'profissional': 'Olá! É um prazer tê-lo como cliente do {restaurante}. Gostaríamos de convidá-lo para uma experiência gastronômica especial conosco.',
      'casual': 'E aí! Faz tempo que você não aparece no {restaurante}! Bora dar uma passadinha? Tenho certeza que você vai curtir nossas novidades! 🍴'
    }

    let message = toneExamples[aiTone as keyof typeof toneExamples] || toneExamples['amigável']
    message = message.replace('{restaurante}', data.businessName)

    // Add brand voice influence if provided
    if (data.brandVoice && data.brandVoice.length > 10) {
      const voiceNote = data.brandVoice.toLowerCase()
      if (voiceNote.includes('familiar') || voiceNote.includes('família')) {
        message = message + ' Nossa família está ansiosa para recebê-lo novamente!'
      } else if (voiceNote.includes('sofisticad') || voiceNote.includes('elegant')) {
        message = message.replace('😊', '').replace('🍴', '').replace('✨', '')
      } else if (voiceNote.includes('descontraíd') || voiceNote.includes('divertid')) {
        message = message + ' 🎉'
      }
    }

    setPreview(message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business) return

    setLoading(true)
    setError('')

    try {
      // Update business record with AI settings
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          settings: {
            ...business.settings,
            ai_tone: aiTone,
            brand_voice: brandVoice,
            auto_campaigns: autoCampaigns,
            whatsapp_enabled: whatsappEnabled,
            onboarding_step: 3
          }
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Business update error:', updateError)
        setError('Erro ao salvar configurações de IA. Tente novamente.')
        return
      }

      // Proceed to step 4
      router.push('/onboarding/step-4')
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/onboarding/step-4')
  }

  if (!user || !business) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-2xl font-bold gradient-text">Volta.AI</span>
          </Link>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">✓</div>
            <div className="w-8 h-1 bg-green-500 rounded"></div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">✓</div>
            <div className="w-8 h-1 bg-purple-600 rounded"></div>
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-medium">3</div>
            <div className="w-8 h-1 bg-gray-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">4</div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Configuração da IA</CardTitle>
            <CardDescription>
              Configure como a IA irá se comunicar com seus clientes via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* AI Tone Selection */}
              <div className="space-y-4">
                <Label>Tom de comunicação</Label>
                <p className="text-sm text-gray-500">
                  Como você gostaria que a IA se comunique com seus clientes?
                </p>
                
                <RadioGroup value={aiTone} onValueChange={setAiTone}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="amigável" id="friendly" />
                    <Label htmlFor="friendly" className="cursor-pointer">
                      <span className="font-medium">Amigável</span>
                      <p className="text-sm text-gray-500">Comunicação calorosa e acolhedora, com emojis</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="profissional" id="professional" />
                    <Label htmlFor="professional" className="cursor-pointer">
                      <span className="font-medium">Profissional</span>
                      <p className="text-sm text-gray-500">Comunicação formal e respeitosa</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="casual" id="casual" />
                    <Label htmlFor="casual" className="cursor-pointer">
                      <span className="font-medium">Casual</span>
                      <p className="text-sm text-gray-500">Comunicação descontraída e próxima</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Brand Voice */}
              <div className="space-y-4">
                <Label htmlFor="brandVoice">Voz da marca (opcional)</Label>
                <p className="text-sm text-gray-500">
                  Descreva a personalidade do seu restaurante para que a IA capture sua essência
                </p>
                <Textarea
                  id="brandVoice"
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  placeholder="Ex: Somos um restaurante familiar, acolhedor, que valoriza tradições culinárias brasileiras e o carinho no atendimento..."
                  rows={4}
                />
              </div>

              {/* Preview */}
              {preview && (
                <div className="space-y-4">
                  <Label>Prévia da comunicação</Label>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        IA
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-green-800">{preview}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Esta é uma prévia de como a IA se comunicará com seus clientes
                  </p>
                </div>
              )}

              {/* Automation Settings */}
              <div className="space-y-6">
                <Label>Configurações de automação</Label>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Campanhas automáticas</Label>
                      <p className="text-sm text-gray-500">
                        A IA criará e sugerirá campanhas automaticamente
                      </p>
                    </div>
                    <Switch 
                      checked={autoCampaigns} 
                      onCheckedChange={setAutoCampaigns}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações WhatsApp</Label>
                      <p className="text-sm text-gray-500">
                        Enviar notificações automáticas quando clientes ganham selos
                      </p>
                    </div>
                    <Switch 
                      checked={whatsappEnabled} 
                      onCheckedChange={setWhatsappEnabled}
                    />
                  </div>
                </div>
              </div>

              {/* AI Benefits */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">O que a IA fará por você:</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Identificar clientes inativos e sugerir campanhas de reativação</li>
                  <li>• Criar mensagens personalizadas em português brasileiro</li>
                  <li>• Sugerir promoções baseadas no comportamento dos clientes</li>
                  <li>• Analisar o melhor horário para enviar mensagens</li>
                  <li>• Prever a taxa de engajamento das campanhas</li>
                </ul>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-6">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={handleSkip}
                >
                  Pular por agora
                </Button>
                <Button 
                  type="submit" 
                  className="gradient-primary text-white"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Continuar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* LGPD Notice */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            As configurações de IA seguem as diretrizes da LGPD. 
            Suas mensagens automáticas incluirão sempre a opção de descadastro.
          </p>
        </div>
      </div>
    </div>
  )
}