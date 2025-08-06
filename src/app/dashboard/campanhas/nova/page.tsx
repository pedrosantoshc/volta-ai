'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from '@/lib/supabase-client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  MessageSquare, 
  Users, 
  Calendar, 
  Sparkles, 
  Send, 
  Eye,
  Plus,
  Target,
  Bot
} from 'lucide-react'

interface Campaign {
  name: string // Internal campaign name
  title: string // WhatsApp message title (can be AI generated)
  type: 'manual' | 'ai_generated'
  content: {
    message: string
    image_url?: string
    cta_text?: string
    offer_details?: string
  }
  target_audience: {
    segments: string[]
    criteria: any
  }
  schedule: {
    send_immediately: boolean
    scheduled_date?: string
    time?: string
  }
}

interface CustomerSegment {
  id: string
  name: string
  description: string
  count: number
  criteria: any
  isCustom?: boolean
}

export default function NovaCampanhaPage() {
  const [campaign, setCampaign] = useState<Campaign>({
    name: '',
    title: '',
    type: 'manual',
    content: {
      message: '',
      cta_text: '',
      offer_details: ''
    },
    target_audience: {
      segments: [],
      criteria: {}
    },
    schedule: {
      send_immediately: true
    }
  })

  const [availableSegments, setAvailableSegments] = useState<CustomerSegment[]>([])
  const [businessContext, setBusinessContext] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showNewSegmentDialog, setShowNewSegmentDialog] = useState(false)
  const [newSegment, setNewSegment] = useState({ name: '', description: '' })

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load business context
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', user.id)
        .single()

      if (businessError || !business) {
        setError('Erro ao carregar dados do negócio.')
        return
      }

      setBusinessContext(business)

      // Load both automatic and custom segments
      await loadAllSegments(user.id)

      // Check if coming from AI insights with pre-filled data
      const prefilledType = searchParams.get('type')
      const prefilledTitle = searchParams.get('title')
      const prefilledMessage = searchParams.get('message')

      if (prefilledType && prefilledTitle && prefilledMessage) {
        setCampaign(prev => ({
          ...prev,
          name: decodeURIComponent(prefilledTitle),
          title: decodeURIComponent(prefilledTitle),
          type: 'ai_generated',
          content: {
            ...prev.content,
            message: decodeURIComponent(prefilledMessage)
          }
        }))
      }
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError('Erro inesperado ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const loadAllSegments = async (businessId: string) => {
    try {
      // Load customers data to analyze automatic segments
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          customer_loyalty_cards (
            id,
            current_stamps,
            status,
            total_redeemed,
            loyalty_card:loyalty_cards (
              rules
            )
          )
        `)
        .eq('business_id', businessId)

      if (customersError) {
        console.error('Error loading customers:', customersError)
      }

      // Create automatic segments (even if empty)
      const automaticSegments = analyzeCustomerSegments(customers || [])
      
      // Always include basic segments even if they have 0 customers
      const basicSegments: CustomerSegment[] = [
        {
          id: 'all_customers',
          name: 'Todos os Clientes',
          description: 'Todos os clientes cadastrados',
          count: customers?.length || 0,
          criteria: { type: 'all' }
        },
        {
          id: 'general_public',
          name: 'Público Geral',
          description: 'Alcance amplo para novos clientes',
          count: 0,
          criteria: { type: 'general' },
          isCustom: true
        }
      ]

      // Combine with automatic segments
      const allSegments = [...basicSegments, ...automaticSegments.filter(seg => !basicSegments.find(basic => basic.id === seg.id))]
      
      setAvailableSegments(allSegments)
    } catch (err) {
      console.error('Error loading customer segments:', err)
      // Set basic segments even if loading fails
      setAvailableSegments([
        {
          id: 'all_customers',
          name: 'Todos os Clientes',
          description: 'Todos os clientes cadastrados',
          count: 0,
          criteria: { type: 'all' }
        },
        {
          id: 'general_public',
          name: 'Público Geral',
          description: 'Alcance amplo para novos clientes',
          count: 0,
          criteria: { type: 'general' },
          isCustom: true
        }
      ])
    }
  }

  const analyzeCustomerSegments = (customers: any[]): CustomerSegment[] => {
    const now = new Date()
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    return [
      {
        id: 'inactive_customers',
        name: 'Clientes Inativos',
        description: 'Não visitam há mais de 15 dias',
        count: customers.filter(c => !c.last_visit || new Date(c.last_visit) < fifteenDaysAgo).length,
        criteria: { type: 'inactive', days: 15 }
      },
      {
        id: 'frequent_customers',
        name: 'Clientes Frequentes',
        description: 'Mais de 5 visitas registradas',
        count: customers.filter(c => c.total_visits >= 5).length,
        criteria: { type: 'frequent', min_visits: 5 }
      },
      {
        id: 'new_customers',
        name: 'Novos Clientes',
        description: 'Cadastrados nos últimos 7 dias',
        count: customers.filter(c => new Date(c.enrollment_date) > sevenDaysAgo).length,
        criteria: { type: 'new', days: 7 }
      },
      {
        id: 'near_completion',
        name: 'Próximos da Recompensa',
        description: 'Cartões com 80%+ dos selos',
        count: customers.filter(c =>
          c.customer_loyalty_cards?.some((card: any) => {
            const stampsRequired = card.loyalty_card?.rules?.stamps_required || 10
            return card.current_stamps >= stampsRequired * 0.8 && card.status === 'active'
          })
        ).length,
        criteria: { type: 'near_completion', completion_rate: 0.8 }
      },
      {
        id: 'completed_cards',
        name: 'Cartões Completos',
        description: 'Clientes com recompensas disponíveis',
        count: customers.filter(c =>
          c.customer_loyalty_cards?.some((card: any) => card.status === 'completed')
        ).length,
        criteria: { type: 'completed' }
      }
    ]
  }

  const createCustomSegment = () => {
    if (!newSegment.name.trim()) return

    const customSegment: CustomerSegment = {
      id: `custom_${Date.now()}`,
      name: newSegment.name,
      description: newSegment.description || 'Segmento personalizado',
      count: 0,
      criteria: { type: 'custom' },
      isCustom: true
    }

    setAvailableSegments(prev => [...prev, customSegment])
    setNewSegment({ name: '', description: '' })
    setShowNewSegmentDialog(false)
  }

  const generateAIContent = async () => {
    if (!businessContext) {
      setError('Erro ao carregar dados do negócio.')
      return
    }

    setGenerating(true)
    try {
      // Use selected segments or default to "general public" for AI generation
      const selectedSegments = campaign.target_audience.segments.length > 0
        ? availableSegments.filter(s => campaign.target_audience.segments.includes(s.id))
        : [{ id: 'general_public', name: 'Público Geral', description: 'Público geral', count: 0, criteria: {} }]

      const response = await fetch('/api/ai/campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessContext.id,
          campaignType: selectedSegments[0]?.name || 'Geral',
          targetAudience: selectedSegments.map(s => s.name).join(', '),
          businessContext: {
            businessName: businessContext.name,
            businessType: businessContext.settings?.business_type || 'restaurant',
            aiTone: businessContext.settings?.ai_tone || 'amigável',
            brandVoice: businessContext.settings?.brand_voice
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI content')
      }

      const data = await response.json()

      setCampaign(prev => ({
        ...prev,
        title: data.title,
        type: 'ai_generated',
        content: {
          ...prev.content,
          message: data.message,
          offer_details: data.expectedResults
        }
      }))

      setError('')
    } catch (err) {
      console.error('Error generating AI content:', err)
      setError('Erro ao gerar conteúdo IA. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSegmentToggle = (segmentId: string, checked: boolean) => {
    setCampaign(prev => ({
      ...prev,
      target_audience: {
        ...prev.target_audience,
        segments: checked
          ? [...prev.target_audience.segments, segmentId]
          : prev.target_audience.segments.filter(id => id !== segmentId)
      }
    }))
  }

  const saveCampaign = async (status: 'draft' | 'active') => {
    if (!businessContext) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuário não autenticado.')
        return
      }

      const campaignData = {
        business_id: user.id,
        name: campaign.name,
        type: campaign.type,
        trigger: {
          type: 'manual',
          conditions: {}
        },
        content: {
          ...campaign.content,
          title: campaign.title // Include the campaign title in content
        },
        target_audience: campaign.target_audience,
        schedule: {
          ...campaign.schedule,
          created_date: new Date().toISOString()
        },
        status,
        performance: {
          sent_count: 0,
          delivered_count: 0,
          read_count: 0,
          clicked_count: 0,
          converted_count: 0
        }
      }

      const { data, error: saveError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single()

      if (saveError) {
        throw saveError
      }

      // If active and send immediately, trigger sending
      if (status === 'active' && campaign.schedule.send_immediately) {
        // TODO: Implement actual WhatsApp sending
        console.log('Would send campaign immediately:', data)
      }

      router.push('/dashboard/campanhas')
    } catch (err) {
      console.error('Error saving campaign:', err)
      setError('Erro ao salvar campanha. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const getTotalAudience = () => {
    return availableSegments
      .filter(segment => campaign.target_audience.segments.includes(segment.id))
      .reduce((sum, segment) => sum + segment.count, 0)
  }

  const getStepValidation = () => {
    return {
      step1: {
        isValid: campaign.name.trim() !== '',
        errors: {
          name: campaign.name.trim() === '' ? 'Nome da campanha é obrigatório' : '',
        }
      },
      step2: {
        isValid: campaign.target_audience.segments.length > 0,
        errors: {
          audience: campaign.target_audience.segments.length === 0 ? 'Selecione pelo menos um público-alvo' : ''
        }
      },
      step3: {
        isValid: campaign.title.trim() !== '' && campaign.content.message.trim() !== '',
        errors: {
          title: campaign.title.trim() === '' ? 'Título da campanha é obrigatório' : '',
          message: campaign.content.message.trim() === '' ? 'Mensagem é obrigatória' : '',
          messageLength: campaign.content.message.length > 160 ? 'Mensagem muito longa (máx. 160 caracteres)' : ''
        }
      },
      step4: {
        isValid: !campaign.schedule.send_immediately ? 
          (campaign.schedule.scheduled_date !== '' && campaign.schedule.time !== '') : true,
        errors: {
          schedule: !campaign.schedule.send_immediately && (!campaign.schedule.scheduled_date || !campaign.schedule.time) 
            ? 'Data e horário são obrigatórios para agendamento' : ''
        }
      }
    }
  }

  const isFormCompletelyValid = () => {
    const validation = getStepValidation()
    return validation.step1.isValid && validation.step2.isValid && validation.step3.isValid && validation.step4.isValid
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/campanhas">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Campanha</h1>
          <p className="text-gray-600">Crie uma campanha de WhatsApp para seus clientes</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-sm font-medium">Nome</span>
        </div>
        <div className={`w-8 h-1 rounded ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-sm font-medium">Público</span>
        </div>
        <div className={`w-8 h-1 rounded ${step >= 3 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-sm font-medium">Conteúdo</span>
        </div>
        <div className={`w-8 h-1 rounded ${step >= 4 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center space-x-2 ${step >= 4 ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
            4
          </div>
          <span className="text-sm font-medium">Envio</span>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1: Campaign Name */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Nome da Campanha</span>
                </CardTitle>
                <CardDescription>
                  Defina um nome interno para organizar suas campanhas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Nome da Campanha *</Label>
                  <Input
                    id="campaign-name"
                    value={campaign.name}
                    onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Campanha Volta Cliente - Janeiro 2024"
                    required
                    className={getStepValidation().step1.errors.name ? 'border-red-500' : ''}
                  />
                  {getStepValidation().step1.errors.name && (
                    <p className="text-red-600 text-xs">{getStepValidation().step1.errors.name}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Este nome é apenas para sua organização interna e não será mostrado aos clientes.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!getStepValidation().step1.isValid}
                    className="gradient-primary text-white"
                  >
                    Próximo: Público
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Target Audience */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Público-Alvo</span>
                </CardTitle>
                <CardDescription>
                  Selecione os segmentos de clientes que receberão a campanha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Segmentos Disponíveis</h4>
                  <Dialog open={showNewSegmentDialog} onOpenChange={setShowNewSegmentDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Segmento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Novo Segmento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="segment-name">Nome do Segmento</Label>
                          <Input
                            id="segment-name"
                            value={newSegment.name}
                            onChange={(e) => setNewSegment(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Clientes VIP"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="segment-description">Descrição</Label>
                          <Textarea
                            id="segment-description"
                            value={newSegment.description}
                            onChange={(e) => setNewSegment(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Ex: Clientes com alto valor de compra"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => setShowNewSegmentDialog(false)} variant="outline" className="flex-1">
                            Cancelar
                          </Button>
                          <Button onClick={createCustomSegment} className="flex-1" disabled={!newSegment.name.trim()}>
                            Criar Segmento
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-3">
                  {availableSegments.map((segment) => (
                    <div key={segment.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <Checkbox
                        id={segment.id}
                        checked={campaign.target_audience.segments.includes(segment.id)}
                        onCheckedChange={(checked) => handleSegmentToggle(segment.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={segment.id} className="flex items-center justify-between cursor-pointer">
                          <div>
                            <div className="font-medium text-gray-900 flex items-center">
                              {segment.name}
                              {segment.isCustom && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Personalizado
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{segment.description}</div>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {segment.count} clientes
                          </Badge>
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>

                {getStepValidation().step2.errors.audience && (
                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {getStepValidation().step2.errors.audience}
                  </p>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!getStepValidation().step2.isValid}
                    className="gradient-primary text-white"
                  >
                    Próximo: Conteúdo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Content Creation */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Conteúdo da Campanha</span>
                </CardTitle>
                <CardDescription>
                  Crie o título e a mensagem que serão enviados no WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* AI Generation Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bot className="w-5 h-5 text-purple-600" />
                      <div>
                        <h4 className="font-medium text-purple-900">Geração Inteligente</h4>
                        <p className="text-sm text-purple-700">Use IA para criar título e conteúdo personalizados</p>
                      </div>
                    </div>
                    <Button
                      onClick={generateAIContent}
                      disabled={generating}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {generating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar com IA
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-title">Título da Campanha (WhatsApp) *</Label>
                  <Input
                    id="campaign-title"
                    value={campaign.title}
                    onChange={(e) => setCampaign(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Oferta Especial para Você!"
                    required
                    className={getStepValidation().step3.errors.title ? 'border-red-500' : ''}
                  />
                  {getStepValidation().step3.errors.title && (
                    <p className="text-red-600 text-xs">{getStepValidation().step3.errors.title}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Este será o título que aparece na mensagem do WhatsApp.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-message">Mensagem do WhatsApp *</Label>
                  <Textarea
                    id="campaign-message"
                    value={campaign.content.message}
                    onChange={(e) => setCampaign(prev => ({
                      ...prev,
                      content: { ...prev.content, message: e.target.value }
                    }))}
                    placeholder="Olá! Temos uma oferta especial para você..."
                    rows={4}
                    className={`resize-none ${getStepValidation().step3.errors.message || getStepValidation().step3.errors.messageLength ? 'border-red-500' : ''}`}
                    maxLength={160}
                    required
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Máximo 160 caracteres para WhatsApp</span>
                    <span className={campaign.content.message.length > 160 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {campaign.content.message.length}/160
                    </span>
                  </div>
                  {(getStepValidation().step3.errors.message || getStepValidation().step3.errors.messageLength) && (
                    <p className="text-red-600 text-xs">
                      {getStepValidation().step3.errors.message || getStepValidation().step3.errors.messageLength}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta-text">Call-to-Action (opcional)</Label>
                  <Input
                    id="cta-text"
                    value={campaign.content.cta_text}
                    onChange={(e) => setCampaign(prev => ({
                      ...prev,
                      content: { ...prev.content, cta_text: e.target.value }
                    }))}
                    placeholder="Ex: Venha hoje e ganhe 15% de desconto!"
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!getStepValidation().step3.isValid}
                    className="gradient-primary text-white"
                  >
                    Próximo: Envio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Send/Schedule */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Agendamento e Envio</span>
                </CardTitle>
                <CardDescription>
                  Defina quando a campanha será enviada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="send-immediately"
                      checked={campaign.schedule.send_immediately}
                      onCheckedChange={(checked) => setCampaign(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, send_immediately: checked }
                      }))}
                    />
                    <Label htmlFor="send-immediately">Enviar imediatamente</Label>
                  </div>

                  {!campaign.schedule.send_immediately && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduled-date">Data</Label>
                        <Input
                          id="scheduled-date"
                          type="date"
                          value={campaign.schedule.scheduled_date}
                          onChange={(e) => setCampaign(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, scheduled_date: e.target.value }
                          }))}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduled-time">Horário</Label>
                        <Input
                          id="scheduled-time"
                          type="time"
                          value={campaign.schedule.time}
                          onChange={(e) => setCampaign(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, time: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {getStepValidation().step4.errors.schedule && (
                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {getStepValidation().step4.errors.schedule}
                  </p>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Voltar
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => saveCampaign('draft')}
                      disabled={saving || !getStepValidation().step1.isValid}
                    >
                      Salvar Rascunho
                    </Button>
                    <Button
                      onClick={() => saveCampaign('active')}
                      disabled={saving || !isFormCompletelyValid()}
                      className="gradient-primary text-white"
                    >
                      {saving ? 'Criando...' : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {campaign.schedule.send_immediately ? 'Criar e Enviar' : 'Agendar Envio'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Prévia</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* WhatsApp Preview */}
              <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                <div className="text-sm font-medium text-green-800 mb-1">
                  {businessContext?.name || 'Seu Negócio'}
                </div>
                <div className="text-sm text-green-700 bg-white p-3 rounded-lg shadow-sm">
                  {campaign.title && (
                    <div className="font-medium mb-2">
                      {campaign.title}
                    </div>
                  )}
                  {campaign.content.message || 'Sua mensagem aparecerá aqui...'}
                  {campaign.content.cta_text && (
                    <div className="mt-2 text-blue-600 font-medium">
                      {campaign.content.cta_text}
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign Stats */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nome interno:</span>
                  <span className="font-medium">{campaign.name || 'Sem nome'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Título WhatsApp:</span>
                  <span className="font-medium">{campaign.title || 'Sem título'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tipo:</span>
                  <Badge className={campaign.type === 'ai_generated' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                    {campaign.type === 'ai_generated' ? 'IA' : 'Manual'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Público-alvo:</span>
                  <span className="font-medium">{getTotalAudience()} clientes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Caracteres:</span>
                  <span className={`font-medium ${campaign.content.message.length > 160 ? 'text-red-600' : 'text-green-600'}`}>
                    {campaign.content.message.length}/160
                  </span>
                </div>
              </div>

              {/* Selected Segments */}
              {campaign.target_audience.segments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Segmentos selecionados:</h4>
                  <div className="space-y-1">
                    {availableSegments
                      .filter(s => campaign.target_audience.segments.includes(s.id))
                      .map(segment => (
                        <div key={segment.id} className="flex justify-between text-xs">
                          <span>{segment.name}</span>
                          <span className="text-gray-500">{segment.count}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}