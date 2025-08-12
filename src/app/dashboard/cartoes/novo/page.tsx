'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function NovoCartao() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    internal_name: '',
    card_title: '',
    description: '',
    stamps_required: 10,
    reward_description: '',
    footer_text: '',
    background_color: '#7c3aed',
    stamp_icon: 'coffee',
    stamp_icon_type: 'emoji' // 'emoji' or 'custom'
  })
  const [stampIconFile, setStampIconFile] = useState<File | null>(null)
  const [stampIconPreview, setStampIconPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleStampIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/png')) {
        setError('Por favor, selecione apenas arquivos PNG.')
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 2MB.')
        return
      }

      setStampIconFile(file)
      setError('')

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setStampIconPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadStampIcon = async (): Promise<string | null> => {
    if (!stampIconFile || !supabase.auth.getUser()) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const fileExt = stampIconFile.name.split('.').pop()
      const fileName = `${user.id}-stamp-${Date.now()}.${fileExt}`
      const filePath = `stamp-icons/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logo-uploads')
        .upload(filePath, stampIconFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Stamp icon upload error:', uploadError)
        throw new Error(`Erro ao fazer upload do ícone: ${uploadError.message}`)
      }

      const { data } = supabase.storage
        .from('logo-uploads')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3))
    setError('')
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError('')
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.internal_name || !formData.card_title || !formData.description) {
          setError('Por favor, preencha todos os campos obrigatórios.')
          return false
        }
        break
      case 2:
        if (formData.stamp_icon_type === 'custom' && !stampIconFile && !stampIconPreview) {
          setError('Por favor, adicione um ícone personalizado ou volte para emoji.')
          return false
        }
        break
      case 3:
        if (!formData.reward_description) {
          setError('Por favor, descreva a recompensa do programa.')
          return false
        }
        break
    }
    setError('')
    return true
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep === 3) {
        handleSubmit()
      } else {
        nextStep()
      }
    }
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return
    
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let stampIcon = formData.stamp_icon
      
      // Upload custom stamp icon if selected
      if (formData.stamp_icon_type === 'custom' && stampIconFile) {
        const uploadedUrl = await uploadStampIcon()
        if (uploadedUrl) {
          stampIcon = uploadedUrl
        }
      }

      const loyaltyCardData = {
        business_id: user.id,
        name: formData.internal_name,
        description: formData.description,
        design: {
          template_id: 'default',
          background_color: formData.background_color,
          logo_url: '',
          header_text: formData.card_title,
          footer_text: formData.footer_text,
          stamp_icon: stampIcon,
          stamp_icon_type: formData.stamp_icon_type
        },
        rules: {
          stamps_required: formData.stamps_required,
          reward_description: formData.reward_description,
          expiry_days: 365,
          max_stamps_per_day: 1
        },
        enrollment_form: {
          custom_questions: [],
          require_email: true,
          require_phone: true
        },
        is_active: true
      }

      const { error } = await supabase
        .from('loyalty_cards')
        .insert(loyaltyCardData)
        .select()
        .single()

      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard/cartoes')
      }
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internal_name">Nome Interno</Label>
              <Input
                id="internal_name"
                name="internal_name"
                placeholder="Ex: Programa Café 2024"
                value={formData.internal_name}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500">
                Nome para organização interna. Não aparece no cartão do cliente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card_title">Título do Cartão</Label>
              <Input
                id="card_title"
                name="card_title"
                placeholder="Ex: CAFÉ REDENTOR"
                value={formData.card_title}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500">
                Título que aparece no topo do cartão de fidelidade.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição da Oferta</Label>
              <Input
                id="description"
                name="description"
                placeholder="Ex: Ganhe um café grátis a cada 10 compras"
                value={formData.description}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500">
                Resumo da oferta que explica como funciona o programa.
              </p>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="background_color">Cor de Fundo</Label>
              <div className="flex space-x-2">
                <Input
                  id="background_color"
                  name="background_color"
                  type="color"
                  value={formData.background_color}
                  onChange={handleChange}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.background_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                  placeholder="#7c3aed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Ícone do Selo</Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="stamp_icon_type"
                    value="emoji"
                    checked={formData.stamp_icon_type === 'emoji'}
                    onChange={handleChange}
                    className="rounded border-gray-300"
                  />
                  <span>Emoji</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="stamp_icon_type"
                    value="custom"
                    checked={formData.stamp_icon_type === 'custom'}
                    onChange={handleChange}
                    className="rounded border-gray-300"
                  />
                  <span>Imagem personalizada</span>
                </label>
              </div>
            </div>

            {formData.stamp_icon_type === 'emoji' ? (
              <div className="space-y-2">
                <Label htmlFor="stamp_icon">Ícone do Selo</Label>
                <select 
                  id="stamp_icon"
                  name="stamp_icon"
                  value={formData.stamp_icon}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="coffee">☕ Café</option>
                  <option value="pizza">🍕 Pizza</option>
                  <option value="burger">🍔 Hamburger</option>
                  <option value="beer">🍺 Cerveja</option>
                  <option value="generic">⭐ Genérico</option>
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Ícone Personalizado (PNG)</Label>
                <div className="flex flex-col items-center space-y-4">
                  {stampIconPreview ? (
                    <div className="relative">
                      <div className="w-16 h-16 rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                        <Image
                          src={stampIconPreview}
                          alt="Stamp icon preview"
                          width={56}
                          height={56}
                          className="object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStampIconFile(null)
                          setStampIconPreview(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <svg className="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-gray-500">Sem ícone</p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {stampIconPreview ? 'Alterar Ícone' : 'Adicionar Ícone'}
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    onChange={handleStampIconFileChange}
                    className="hidden"
                  />

                  <p className="text-xs text-gray-500 text-center">
                    Recomendado: 256x256px PNG. Máximo: 2MB
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="footer_text">Slogan/Texto do Rodapé</Label>
              <Input
                id="footer_text"
                name="footer_text"
                placeholder="Ex: Seu café favorito"
                value={formData.footer_text}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">
                Slogan ou frase que aparece na parte inferior do cartão (opcional).
              </p>
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stamps_required">Selos Necessários</Label>
              <Input
                id="stamps_required"
                name="stamps_required"
                type="number"
                min="1"
                max="20"
                value={formData.stamps_required}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward_description">Descrição da Recompensa</Label>
              <Input
                id="reward_description"
                name="reward_description"
                placeholder="Ex: 1 café grátis"
                value={formData.reward_description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Configurações Padrão</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Validade dos selos: 365 dias</p>
                <p>• Máximo de selos por dia: 1</p>
                <p>• Campos obrigatórios no cadastro: Email e Telefone</p>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Criar Cartão de Fidelidade</h1>
        <p className="text-gray-600">Configure seu programa de fidelidade personalizado</p>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center mt-6 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                <div className={`text-xs mt-1 ${
                  currentStep >= step ? 'text-purple-600' : 'text-gray-500'
                }`}>
                  {step === 1 ? 'Básico' : step === 2 ? 'Design' : 'Regras'}
                </div>
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  currentStep > step ? 'bg-purple-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 ? 'Informações Básicas' : 
                 currentStep === 2 ? 'Design do Cartão' : 
                 'Regras do Programa'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 ? 'Configure os detalhes principais do seu cartão' :
                 currentStep === 2 ? 'Personalize a aparência visual' :
                 'Defina as regras de funcionamento'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
              
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mt-4">
                  {error}
                </div>
              )}
              
              <div className="flex justify-between pt-6">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleNext}
                  className="gradient-primary text-white"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 
                   currentStep === 3 ? 'Criar Cartão' : 'Próximo'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-6 sticky top-6">
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização em Tempo Real</CardTitle>
              <CardDescription>
                Veja como seu cartão ficará no celular do cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm mx-auto">
                {/* Card Preview */}
                <div 
                  className="rounded-xl p-6 text-white shadow-lg"
                  style={{ backgroundColor: formData.background_color }}
                >
                  <div className="text-center">
                    <h3 className="text-lg font-bold mb-2">
                      {formData.card_title || 'SEU RESTAURANTE'}
                    </h3>
                    
                    <div className="my-6">
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {Array.from({ length: formData.stamps_required }).map((_, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs"
                          >
                            {index < 3 ? (
                              formData.stamp_icon_type === 'custom' && stampIconPreview ? (
                                <div className="w-5 h-5 rounded-full overflow-hidden">
                                  <Image
                                    src={stampIconPreview}
                                    alt="Custom stamp icon"
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                  />
                                </div>
                              ) : (
                                <span>
                                  {formData.stamp_icon === 'coffee' ? '☕' : 
                                   formData.stamp_icon === 'pizza' ? '🍕' : 
                                   formData.stamp_icon === 'burger' ? '🍔' :
                                   formData.stamp_icon === 'beer' ? '🍺' : '⭐'}
                                </span>
                              )
                            ) : null}
                          </div>
                        ))}
                      </div>
                      
                      <p className="text-sm opacity-90">
                        3/{formData.stamps_required} selos
                      </p>
                    </div>

                    <div className="text-sm opacity-90">
                      {formData.reward_description || 'Sua recompensa aqui'}
                    </div>
                    
                    {formData.footer_text && (
                      <div className="text-xs opacity-75 mt-2">
                        {formData.footer_text}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-center text-sm text-gray-600">
                  <p>💡 O cartão será adicionado automaticamente ao Apple Wallet ou Google Pay</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}