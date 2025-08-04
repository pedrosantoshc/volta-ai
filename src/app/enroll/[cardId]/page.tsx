'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import Image from "next/image"

interface LoyaltyCard {
  id: string
  business_id: string
  name: string
  description: string
  design: any
  rules: any
  enrollment_form: any
  is_active: boolean
}

interface Business {
  id: string
  name: string
  logo_url?: string
  settings: any
}

interface CustomQuestion {
  id: string
  question: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'phone' | 'email' | 'number'
  options?: string[]
  required: boolean
  order: number
  placeholder?: string
  description?: string
}

interface FormData {
  name: string
  phone: string
  email: string
  custom_fields: Record<string, any>
  consent: {
    lgpd_accepted: boolean
    marketing_consent: boolean
    terms_accepted: boolean
  }
}

export default function CustomerEnrollment() {
  const params = useParams()
  const cardId = params.cardId as string
  const supabase = createClient()

  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    custom_fields: {},
    consent: {
      lgpd_accepted: false,
      marketing_consent: false,
      terms_accepted: false
    }
  })

  // Extract custom questions from loyalty card
  const customQuestions: CustomQuestion[] = loyaltyCard?.enrollment_form?.custom_questions || []

  useEffect(() => {
    const loadEnrollmentData = async () => {
      try {
        console.log('Looking for card ID:', cardId)
        
        // Get loyalty card data with business info
        const { data: cardData, error: cardError } = await supabase
          .from('loyalty_cards')
          .select(`
            *,
            businesses (*)
          `)
          .eq('id', cardId)
          .single()

        console.log('Card query result:', { cardData, cardError })

        if (cardError || !cardData) {
          console.error('Card lookup error:', cardError)
          setError('Cartão de fidelidade não encontrado.')
          setLoading(false)
          return
        }

        if (!cardData.is_active) {
          setError('Este cartão de fidelidade está inativo.')
          setLoading(false)
          return
        }

        setLoyaltyCard(cardData)
        setBusiness(cardData.businesses)
      } catch (err) {
        console.error('Error loading enrollment data:', err)
        setError('Erro ao carregar informações. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    if (cardId) {
      loadEnrollmentData()
    }
  }, [cardId, supabase])

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Apply Brazilian phone formatting
    if (digits.length <= 2) {
      return digits
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    } else if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('consent.')) {
      const consentField = field.replace('consent.', '')
      setFormData(prev => ({
        ...prev,
        consent: {
          ...prev.consent,
          [consentField]: value
        }
      }))
    } else if (field.startsWith('custom_fields.')) {
      const customField = field.replace('custom_fields.', '')
      setFormData(prev => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [customField]: value
        }
      }))
    } else if (field === 'phone') {
      const formattedPhone = formatPhoneNumber(value)
      setFormData(prev => ({
        ...prev,
        phone: formattedPhone
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const validateForm = (): boolean => {
    // Basic validation
    if (!formData.name.trim()) {
      setError('Nome é obrigatório.')
      return false
    }

    if (!formData.phone.trim()) {
      setError('Telefone é obrigatório.')
      return false
    }

    // Phone format validation (more flexible Brazilian format)
    const digits = formData.phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) {
      setError('Por favor, insira um telefone válido.')
      return false
    }

    // Email validation if required
    if (loyaltyCard?.enrollment_form?.require_email && !formData.email.trim()) {
      setError('Email é obrigatório.')
      return false
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('Por favor, insira um email válido.')
        return false
      }
    }

    // LGPD consent validation
    if (!formData.consent.lgpd_accepted) {
      setError('Você deve aceitar o processamento de dados conforme a LGPD.')
      return false
    }

    if (!formData.consent.terms_accepted) {
      setError('Você deve aceitar os termos de uso.')
      return false
    }

    // Custom questions validation
    for (const question of customQuestions) {
      if (question.required && !formData.custom_fields[question.id]) {
        setError(`O campo "${question.question}" é obrigatório.`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !loyaltyCard || !business) return

    setSubmitting(true)
    setError('')

    try {
      // Use API endpoint for enrollment with elevated permissions
      const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: loyaltyCard.id,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          customFields: formData.custom_fields,
          consent: formData.consent
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Enrollment failed')
      }

      setSuccess(true)

      // TODO: In production, this would:
      // 1. Generate actual PassKit pass
      // 2. Send WhatsApp welcome message
      // 3. Send email confirmation if provided

    } catch (err) {
      console.error('Enrollment error:', err)
      setError('Erro ao processar cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
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

  if (error && !loyaltyCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <CardTitle className="text-xl">Ops! Algo deu errado</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full gradient-primary text-white"
              >
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl">Bem-vindo! 🎉</CardTitle>
              <CardDescription>
                Você foi cadastrado com sucesso no programa de fidelidade do {business?.name}!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Próximos passos:</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Seu cartão de fidelidade foi criado</li>
                  <li>• Você receberá notificações via WhatsApp</li>
                  <li>• A cada visita, peça para adicionar selos</li>
                  <li>• Complete o cartão e ganhe sua recompensa!</li>
                </ul>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Mantenha seu telefone por perto para receber as notificações!
                </p>
                <Button 
                  onClick={() => window.close()}
                  className="gradient-primary text-white"
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!loyaltyCard || !business) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-3 mb-4">
            {business.logo_url ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-sm">
                <Image
                  src={business.logo_url}
                  alt={business.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">{business.name[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{business.name}</h1>
              <p className="text-sm text-gray-600">Programa de Fidelidade</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{loyaltyCard.name}</CardTitle>
            <CardDescription>
              {loyaltyCard.description}
            </CardDescription>
            
            {/* Card Preview */}
            <div 
              className="w-full max-w-xs mx-auto rounded-lg p-4 text-white shadow-lg mt-4"
              style={{
                background: loyaltyCard.design?.background_color 
                  ? loyaltyCard.design.background_color
                  : business.settings?.primary_color 
                    ? `linear-gradient(135deg, ${business.settings.primary_color} 0%, ${business.settings.secondary_color || business.settings.primary_color} 100%)`
                    : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
              }}
            >
              {/* Business Logo and Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {business.logo_url ? (
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-white/20 flex items-center justify-center">
                      <Image
                        src={business.logo_url}
                        alt={business.name}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{business.name[0]}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium">{loyaltyCard.design?.header_text || business.name}</span>
                </div>
              </div>
              
              {/* Stamp Collection Area */}
              <div className="text-center mb-3">
                <div className="text-xs mb-2 opacity-90">
                  Colete: {loyaltyCard.rules?.stamps_required || 10} selos
                </div>
                <div className="flex justify-center space-x-1 mb-2">
                  {Array.from({ length: Math.min(loyaltyCard.rules?.stamps_required || 10, 10) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-white/60 flex items-center justify-center text-xs bg-white/10"
                    >
                      {i < 0 ? (loyaltyCard.design?.stamp_icon === 'coffee' ? '☕' : loyaltyCard.design?.stamp_icon === 'pizza' ? '🍕' : '⭐') : ''}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Reward Description */}
              <div className="text-center text-xs font-medium bg-white/20 rounded-md py-2 px-3">
                <strong>🎁 {loyaltyCard.rules?.reward_description || "Brinde especial"}</strong>
              </div>
              
              {/* Footer */}
              {loyaltyCard.design?.footer_text && (
                <div className="text-center text-xs mt-2 opacity-75">
                  {loyaltyCard.design.footer_text}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Usaremos para enviar notificações sobre seus selos
                  </p>
                </div>

                {loyaltyCard.enrollment_form?.require_email && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Custom Questions */}
              {customQuestions.length > 0 && (
                <div className="space-y-4">
                  <hr className="my-4" />
                  {customQuestions
                    .sort((a: CustomQuestion, b: CustomQuestion) => a.order - b.order)
                    .map((question: CustomQuestion) => (
                      <div key={question.id} className="space-y-2">
                        <Label htmlFor={question.id}>
                          {question.question} {question.required && '*'}
                        </Label>
                        {question.description && (
                          <p className="text-sm text-gray-500">{question.description}</p>
                        )}
                        
                        {question.type === 'text' && (
                          <Input
                            id={question.id}
                            value={formData.custom_fields[question.id] || ''}
                            onChange={(e) => handleInputChange(`custom_fields.${question.id}`, e.target.value)}
                            placeholder={question.placeholder || ''}
                            required={question.required}
                          />
                        )}
                        
                        {question.type === 'textarea' && (
                          <Textarea
                            id={question.id}
                            value={formData.custom_fields[question.id] || ''}
                            onChange={(e) => handleInputChange(`custom_fields.${question.id}`, e.target.value)}
                            placeholder={question.placeholder || ''}
                            required={question.required}
                            rows={3}
                          />
                        )}
                        
                        {question.type === 'select' && (
                          <Select
                            value={formData.custom_fields[question.id] || ''}
                            onValueChange={(value) => handleInputChange(`custom_fields.${question.id}`, value)}
                            required={question.required}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={question.placeholder || "Selecione uma opção"} />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options?.map((option, index) => (
                                <SelectItem key={index} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {question.type === 'multiselect' && (
                          <div className="space-y-2">
                            {question.options?.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${question.id}_${index}`}
                                  checked={(formData.custom_fields[question.id] || []).includes(option)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = formData.custom_fields[question.id] || []
                                    const newValues = checked 
                                      ? [...currentValues, option]
                                      : currentValues.filter((v: string) => v !== option)
                                    handleInputChange(`custom_fields.${question.id}`, newValues)
                                  }}
                                />
                                <Label htmlFor={`${question.id}_${index}`} className="text-sm">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {(question.type === 'date' || question.type === 'email' || question.type === 'phone' || question.type === 'number') && (
                          <Input
                            id={question.id}
                            type={question.type === 'date' ? 'date' : question.type === 'email' ? 'email' : question.type === 'number' ? 'number' : 'tel'}
                            value={formData.custom_fields[question.id] || ''}
                            onChange={(e) => handleInputChange(`custom_fields.${question.id}`, e.target.value)}
                            placeholder={question.placeholder || ''}
                            required={question.required}
                          />
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* LGPD Consent */}
              <div className="space-y-5">
                <hr className="my-6" />
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="lgpd_consent"
                      checked={formData.consent.lgpd_accepted}
                      onCheckedChange={(checked) => handleInputChange('consent.lgpd_accepted', checked)}
                      required
                    />
                    <Label htmlFor="lgpd_consent" className="text-sm leading-5">
                      Aceito o processamento dos meus dados pessoais conforme a{' '}
                      <Link href="/lgpd" className="text-purple-600 underline">Lei Geral de Proteção de Dados (LGPD)</Link>
                      {' '}para participar do programa de fidelidade. *
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="marketing_consent"
                      checked={formData.consent.marketing_consent}
                      onCheckedChange={(checked) => handleInputChange('consent.marketing_consent', checked)}
                    />
                    <Label htmlFor="marketing_consent" className="text-sm leading-5">
                      Aceito receber comunicações de marketing via WhatsApp sobre promoções e novidades.
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms_consent"
                      checked={formData.consent.terms_accepted}
                      onCheckedChange={(checked) => handleInputChange('consent.terms_accepted', checked)}
                      required
                    />
                    <Label htmlFor="terms_consent" className="text-sm leading-5">
                      Aceito os{' '}
                      <Link href="/termos" className="text-purple-600 underline">Termos de Uso</Link>
                      {' '}do programa de fidelidade. *
                    </Label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full gradient-primary text-white py-3"
                disabled={submitting}
              >
                {submitting ? 'Cadastrando...' : 'Participar do Programa 🎉'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>
            Powered by{' '}
            <Link href="/" className="text-purple-600 font-medium">
              Volta.AI
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}