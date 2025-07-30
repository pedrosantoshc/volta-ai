'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface BusinessFormData {
  name: string
  ownerName: string
  email: string
  phone: string
  address: string
  businessType: string
  cnpj: string
  description: string
  baseline_metrics: {
    monthly_customers: string
    average_ticket: string
    visit_frequency: string
    retention_rate: string
    marketing_spend: string
  }
}

export default function OnboardingStep1() {
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<BusinessFormData>({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    businessType: '',
    cnpj: '',
    description: '',
    baseline_metrics: {
      monthly_customers: '',
      average_ticket: '',
      visit_frequency: '',
      retention_rate: '',
      marketing_spend: ''
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      console.log('Onboarding Step 1: Component mounted')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Onboarding Step 1: User data:', user)
      setUser(user)
      
      if (!user) {
        console.log('Onboarding Step 1: No user found, redirecting to login')
        router.push('/login')
        return
      }

      // Pre-fill data from auth metadata if available
      if (user.user_metadata) {
        setFormData(prev => ({
          ...prev,
          name: user.user_metadata.business_name || '',
          ownerName: user.user_metadata.owner_name || user.user_metadata.full_name || '',
          email: user.email || '',
          phone: user.user_metadata.phone || ''
        }))
      }
    }

    getUser()
  }, [router, supabase])

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }

  const formatCNPJ = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as XX.XXX.XXX/XXXX-XX
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    let formattedValue = value
    if (name === 'phone') {
      formattedValue = formatPhone(value)
    } else if (name === 'cnpj') {
      formattedValue = formatCNPJ(value)
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      businessType: value
    }))
  }

  const handleBaselineMetricChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      baseline_metrics: {
        ...prev.baseline_metrics,
        [field]: value
      }
    }))
  }

  const validateForm = () => {
    // Basic validation
    if (!formData.name.trim()) {
      setError('Nome do restaurante é obrigatório.')
      return false
    }
    
    if (!formData.ownerName.trim()) {
      setError('Nome do proprietário é obrigatório.')
      return false
    }

    if (!formData.email.trim()) {
      setError('Email é obrigatório.')
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, insira um email válido.')
      return false
    }

    if (!formData.phone.trim()) {
      setError('Telefone é obrigatório.')
      return false
    }

    // Brazilian phone validation (11 digits: 11999999999 or formatted)
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('Telefone deve ter 10 ou 11 dígitos.')
      return false
    }

    // Basic phone format check - validate area code
    const validAreaCodes = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '64', '63', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '87', '82', '83', '84', '85', '88', '89', '86', '91', '93', '94', '95', '96', '97', '98', '99']
    const areaCode = phoneDigits.substring(0, 2)
    if (!validAreaCodes.includes(areaCode)) {
      setError('Código de área do telefone inválido.')
      return false
    }

    // CNPJ validation (optional but if provided, must be valid)
    if (formData.cnpj.trim()) {
      const cnpjDigits = formData.cnpj.replace(/\D/g, '')
      if (cnpjDigits.length !== 14) {
        setError('CNPJ deve ter 14 dígitos.')
        return false
      }
      
      // Basic CNPJ format validation (this is a simplified check)
      // In production, you would use a proper CNPJ validation library
      if (!/^\d{14}$/.test(cnpjDigits)) {
        setError('CNPJ inválido.')
        return false
      }
    }

    if (!formData.address.trim()) {
      setError('Endereço é obrigatório.')
      return false
    }

    if (!formData.businessType) {
      setError('Tipo de negócio é obrigatório.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!validateForm()) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create business record
      const { error: businessError } = await supabase
        .from('businesses')
        .insert({
          id: user.id, // Use auth user ID as business ID
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          settings: {
            business_type: formData.businessType,
            cnpj: formData.cnpj,
            description: formData.description,
            owner_name: formData.ownerName,
            baseline_metrics: formData.baseline_metrics,
            onboarding_step: 1,
            onboarding_completed: false,
            ai_tone: null,
            brand_voice: null,
            auto_campaigns: false,
            whatsapp_enabled: false,
            apple_wallet_enabled: false,
            google_pay_enabled: false
          }
        })

      if (businessError) {
        console.error('Business creation error:', businessError)
        setError('Erro ao salvar informações do negócio. Tente novamente.')
        return
      }

      // Proceed to step 2
      router.push('/onboarding/step-2')
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
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
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-medium">1</div>
            <div className="w-8 h-1 bg-purple-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">2</div>
            <div className="w-8 h-1 bg-gray-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">3</div>
            <div className="w-8 h-1 bg-gray-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">4</div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Informações do Negócio</CardTitle>
            <CardDescription>
              Vamos começar com algumas informações básicas sobre o seu restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do restaurante *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Restaurante Bom Sabor"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Owner Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nome do proprietário *</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    placeholder="João Silva"
                    value={formData.ownerName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de negócio *</Label>
                  <Select onValueChange={handleSelectChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurante</SelectItem>
                      <SelectItem value="cafe">Café / Cafeteria</SelectItem>
                      <SelectItem value="bar">Bar / Boteco</SelectItem>
                      <SelectItem value="bakery">Padaria</SelectItem>
                      <SelectItem value="pizzeria">Pizzaria</SelectItem>
                      <SelectItem value="fast_food">Fast Food</SelectItem>
                      <SelectItem value="ice_cream">Sorveteria</SelectItem>
                      <SelectItem value="juice_bar">Casa de Açaí</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="contato@restaurante.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Endereço completo *</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Rua das Flores, 123 - Centro, São Paulo - SP"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* CNPJ (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  placeholder="00.000.000/0001-00"
                  value={formData.cnpj}
                  onChange={handleChange}
                />
                <p className="text-sm text-gray-500">
                  O CNPJ é opcional, mas pode ser útil para integrações futuras
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição do negócio (opcional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Conte um pouco sobre seu restaurante, especialidades, ambiente..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {/* Baseline KPI Metrics */}
              <div className="space-y-6 border-t pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900">Métricas do Negócio</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Essas informações nos ajudarão a medir o sucesso do seu programa de fidelidade
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly_customers">Clientes únicos por mês (aproximado)</Label>
                    <Input
                      id="monthly_customers"
                      placeholder="Ex: 300"
                      value={formData.baseline_metrics.monthly_customers}
                      onChange={(e) => handleBaselineMetricChange('monthly_customers', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="average_ticket">Ticket médio por cliente (R$)</Label>
                    <Input
                      id="average_ticket"
                      placeholder="Ex: 45"
                      value={formData.baseline_metrics.average_ticket}
                      onChange={(e) => handleBaselineMetricChange('average_ticket', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visit_frequency">Frequência de retorno dos clientes</Label>
                    <Select 
                      value={formData.baseline_metrics.visit_frequency}
                      onValueChange={(value) => handleBaselineMetricChange('visit_frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="rarely">Raramente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retention_rate">Taxa de retenção estimada (%)</Label>
                    <Input
                      id="retention_rate"
                      placeholder="Ex: 30"
                      value={formData.baseline_metrics.retention_rate}
                      onChange={(e) => handleBaselineMetricChange('retention_rate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketing_spend">Gasto mensal com marketing (R$)</Label>
                  <Input
                    id="marketing_spend"
                    placeholder="Ex: 500 (deixe em branco se não investe em marketing)"
                    value={formData.baseline_metrics.marketing_spend}
                    onChange={(e) => handleBaselineMetricChange('marketing_spend', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Inclua gastos com redes sociais, panfletos, promoções, etc.
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-800">
                    💡 <strong>Por que coletamos essas informações?</strong><br />
                    Essas métricas nos ajudarão a calcular o ROI (retorno sobre investimento) do seu programa de fidelidade,
                    mostrando como ele impacta no crescimento do seu negócio.
                  </p>
                </div>
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
                  onClick={() => router.push('/dashboard')}
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
            Ao continuar, você confirma que as informações fornecidas são verdadeiras e 
            concorda com nossos{' '}
            <Link href="/termos" className="underline">Termos de Uso</Link>
            {' '}e{' '}
            <Link href="/privacidade" className="underline">Política de Privacidade</Link>.
            Seus dados são protegidos conforme a LGPD.
          </p>
        </div>
      </div>
    </div>
  )
}