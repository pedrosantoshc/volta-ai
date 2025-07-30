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
    description: ''
  })
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      businessType: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

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