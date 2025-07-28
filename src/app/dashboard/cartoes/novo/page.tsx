'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function NovoCartao() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stamps_required: 10,
    reward_description: '',
    header_text: '',
    footer_text: '',
    background_color: '#7c3aed',
    stamp_icon: 'coffee'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const loyaltyCardData = {
        business_id: user.id,
        name: formData.name,
        description: formData.description,
        design: {
          template_id: 'default',
          background_color: formData.background_color,
          logo_url: '',
          header_text: formData.header_text,
          footer_text: formData.footer_text,
          stamp_icon: formData.stamp_icon
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Criar Cartão de Fidelidade</h1>
        <p className="text-gray-600">Configure seu programa de fidelidade personalizado</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Configure os detalhes principais do seu cartão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cartão</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Cartão Fidelidade Café"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Ex: Ganhe um café grátis a cada 10 compras"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalização Visual</CardTitle>
              <CardDescription>
                Personalize a aparência do seu cartão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="header_text">Texto do Cabeçalho</Label>
                <Input
                  id="header_text"
                  name="header_text"
                  placeholder="Ex: CAFÉ REDENTOR"
                  value={formData.header_text}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer_text">Texto do Rodapé</Label>
                <Input
                  id="footer_text"
                  name="footer_text"
                  placeholder="Ex: Seu café favorito"
                  value={formData.footer_text}
                  onChange={handleChange}
                />
              </div>

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

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                onClick={handleSubmit}
                className="w-full gradient-primary text-white"
                disabled={loading}
              >
                {loading ? 'Criando cartão...' : 'Criar Cartão de Fidelidade'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
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
                      {formData.header_text || 'SEU RESTAURANTE'}
                    </h3>
                    
                    <div className="my-6">
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {Array.from({ length: formData.stamps_required }).map((_, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs"
                          >
                            {index < 3 ? (
                              <span>
                                {formData.stamp_icon === 'coffee' ? '☕' : 
                                 formData.stamp_icon === 'pizza' ? '🍕' : 
                                 formData.stamp_icon === 'burger' ? '🍔' :
                                 formData.stamp_icon === 'beer' ? '🍺' : '⭐'}
                              </span>
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