'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface LoyaltyCard {
  id: string
  business_id: string
  name: string
  description: string
  enrollment_form: {
    custom_questions: CustomQuestion[]
    require_email: boolean
    require_phone: boolean
    require_name: boolean
  }
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

export default function FormularioPersonalizado() {
  const params = useParams()
  const router = useRouter()
  const cardId = params.id as string
  const supabase = createClient()

  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null)
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [requireEmail, setRequireEmail] = useState(true)
  const [requirePhone, setRequirePhone] = useState(true)
  const [requireName, setRequireName] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newQuestion, setNewQuestion] = useState<Partial<CustomQuestion>>({
    question: '',
    type: 'text',
    required: false,
    placeholder: '',
    description: ''
  })

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load loyalty card data
        const { data: cardData, error: cardError } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('id', cardId)
          .eq('business_id', user.id)
          .single()

        if (cardError || !cardData) {
          setError('Cartão não encontrado ou você não tem permissão para editá-lo.')
          setLoading(false)
          return
        }

        setLoyaltyCard(cardData)
        
        // Set form configuration
        const enrollmentForm = cardData.enrollment_form || {}
        setCustomQuestions(enrollmentForm.custom_questions || [])
        setRequireEmail(enrollmentForm.require_email !== false)
        setRequirePhone(enrollmentForm.require_phone !== false)
        setRequireName(enrollmentForm.require_name !== false)

      } catch (err) {
        console.error('Error loading form data:', err)
        setError('Erro ao carregar formulário.')
      } finally {
        setLoading(false)
      }
    }

    loadFormData()
  }, [cardId, router, supabase])

  const addCustomQuestion = () => {
    if (!newQuestion.question?.trim()) {
      setError('Por favor, insira uma pergunta.')
      return
    }

    const question: CustomQuestion = {
      id: Date.now().toString(),
      question: newQuestion.question.trim(),
      type: newQuestion.type || 'text',
      required: newQuestion.required || false,
      order: customQuestions.length,
      placeholder: newQuestion.placeholder || '',
      description: newQuestion.description || '',
      options: newQuestion.type === 'select' || newQuestion.type === 'multiselect' 
        ? newQuestion.options?.filter(opt => opt.trim()) || []
        : undefined
    }

    setCustomQuestions(prev => [...prev, question])
    setNewQuestion({
      question: '',
      type: 'text',
      required: false,
      placeholder: '',
      description: '',
      options: []
    })
    setError('')
  }

  const removeQuestion = (questionId: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== questionId))
  }

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = customQuestions.findIndex(q => q.id === questionId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= customQuestions.length) return

    const updatedQuestions = [...customQuestions]
    const [movedQuestion] = updatedQuestions.splice(currentIndex, 1)
    updatedQuestions.splice(newIndex, 0, movedQuestion)

    // Update order values
    const reorderedQuestions = updatedQuestions.map((q, index) => ({
      ...q,
      order: index
    }))

    setCustomQuestions(reorderedQuestions)
  }

  const handleSaveForm = async () => {
    if (!loyaltyCard) return

    setSaving(true)
    setError('')

    try {
      const enrollmentForm = {
        custom_questions: customQuestions,
        require_email: requireEmail,
        require_phone: requirePhone,
        require_name: requireName
      }

      const { error: updateError } = await supabase
        .from('loyalty_cards')
        .update({ enrollment_form: enrollmentForm })
        .eq('id', cardId)

      if (updateError) {
        console.error('Error saving form:', updateError)
        setError('Erro ao salvar formulário. Tente novamente.')
        return
      }

      // Update local state
      setLoyaltyCard(prev => prev ? { ...prev, enrollment_form: enrollmentForm } : null)
      
      // Show success message or redirect
      router.push(`/dashboard/cartoes?saved=true`)

    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!loyaltyCard) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cartão não encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                O cartão que você está tentando editar não foi encontrado.
              </p>
              <Button asChild>
                <Link href="/dashboard/cartoes">Voltar aos Cartões</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/cartoes" className="hover:text-purple-600">
              Cartões
            </Link>
            <span>•</span>
            <span>{loyaltyCard.name}</span>
            <span>•</span>
            <span>Formulário</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Formulário de Inscrição</h1>
          <p className="text-gray-600">Personalize o formulário de inscrição para este cartão</p>
        </div>
        <Button 
          onClick={handleSaveForm}
          disabled={saving}
          className="gradient-primary text-white"
        >
          {saving ? 'Salvando...' : 'Salvar Formulário'}
        </Button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Configuration */}
        <div className="space-y-6">
          {/* Required Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Campos Obrigatórios</CardTitle>
              <CardDescription>
                Configure quais campos básicos são obrigatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Nome completo</Label>
                  <p className="text-sm text-gray-500">Sempre obrigatório para identificação</p>
                </div>
                <Switch 
                  checked={requireName} 
                  onCheckedChange={setRequireName}
                  disabled
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Telefone</Label>
                  <p className="text-sm text-gray-500">Recomendado para WhatsApp</p>
                </div>
                <Switch 
                  checked={requirePhone} 
                  onCheckedChange={setRequirePhone}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>E-mail</Label>
                  <p className="text-sm text-gray-500">Para campanhas de marketing</p>
                </div>
                <Switch 
                  checked={requireEmail} 
                  onCheckedChange={setRequireEmail}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Custom Question */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Pergunta Personalizada</CardTitle>
              <CardDescription>
                Crie perguntas específicas para conhecer melhor seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Pergunta</Label>
                <Input
                  id="question"
                  placeholder="Ex: Qual seu prato favorito?"
                  value={newQuestion.question || ''}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de resposta</Label>
                <Select 
                  value={newQuestion.type} 
                  onValueChange={(value) => setNewQuestion(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto curto</SelectItem>
                    <SelectItem value="textarea">Texto longo</SelectItem>
                    <SelectItem value="select">Seleção única</SelectItem>
                    <SelectItem value="multiselect">Múltipla escolha</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(newQuestion.type === 'select' || newQuestion.type === 'multiselect') && (
                <div className="space-y-2">
                  <Label>Opções de resposta</Label>
                  <Textarea
                    placeholder="Digite uma opção por linha&#10;Ex:&#10;Pizza&#10;Hambúrguer&#10;Salada"
                    value={newQuestion.options?.join('\n') || ''}
                    onChange={(e) => setNewQuestion(prev => ({ 
                      ...prev, 
                      options: e.target.value.split('\n').filter(line => line.trim()) 
                    }))}
                    rows={4}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="placeholder">Texto de exemplo (opcional)</Label>
                <Input
                  id="placeholder"
                  placeholder="Ex: Digite aqui..."
                  value={newQuestion.placeholder || ''}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, placeholder: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição/ajuda (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Ex: Esta informação nos ajuda a personalizar ofertas"
                  value={newQuestion.description || ''}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={newQuestion.required || false}
                  onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, required: checked }))}
                />
                <Label htmlFor="required">Campo obrigatório</Label>
              </div>

              <Button onClick={addCustomQuestion} className="w-full">
                Adicionar Pergunta
              </Button>
            </CardContent>
          </Card>

          {/* Current Questions */}
          {customQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Personalizadas ({customQuestions.length})</CardTitle>
                <CardDescription>
                  Gerencie as perguntas do seu formulário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customQuestions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{question.question}</h4>
                            <Badge variant="outline" className="text-xs">
                              {question.type}
                            </Badge>
                            {question.required && (
                              <Badge variant="secondary" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                          {question.description && (
                            <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                          )}
                          {question.options && question.options.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <strong>Opções:</strong> {question.options.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveQuestion(question.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveQuestion(question.id, 'down')}
                            disabled={index === customQuestions.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuestion(question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Form Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização do Formulário</CardTitle>
              <CardDescription>
                Veja como o formulário aparecerá para seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 bg-white border-2 border-dashed border-gray-200 rounded-lg p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {loyaltyCard.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {loyaltyCard.description}
                  </p>
                </div>

                {/* Required Fields Preview */}
                {requireName && (
                  <div className="space-y-2">
                    <Label>Nome completo *</Label>
                    <Input placeholder="Seu nome completo" disabled />
                  </div>
                )}

                {requirePhone && (
                  <div className="space-y-2">
                    <Label>Telefone {requirePhone ? '*' : ''}</Label>
                    <Input placeholder="(11) 99999-9999" disabled />
                  </div>
                )}

                {requireEmail && (
                  <div className="space-y-2">
                    <Label>E-mail {requireEmail ? '*' : ''}</Label>
                    <Input placeholder="seu@email.com" disabled />
                  </div>
                )}

                {/* Custom Questions Preview */}
                {customQuestions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <Label>
                      {question.question} {question.required && '*'}
                    </Label>
                    {question.description && (
                      <p className="text-sm text-gray-500">{question.description}</p>
                    )}
                    {question.type === 'textarea' ? (
                      <Textarea 
                        placeholder={question.placeholder || 'Digite sua resposta...'} 
                        disabled 
                        rows={3}
                      />
                    ) : question.type === 'select' ? (
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma opção" />
                        </SelectTrigger>
                      </Select>
                    ) : (
                      <Input 
                        type={question.type === 'email' ? 'email' : question.type === 'number' ? 'number' : question.type === 'date' ? 'date' : 'text'}
                        placeholder={question.placeholder || 'Digite sua resposta...'} 
                        disabled 
                      />
                    )}
                  </div>
                ))}

                {/* LGPD Consent Preview */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="font-medium mb-3">Consentimento LGPD</h4>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-start space-x-2">
                      <input type="checkbox" disabled className="mt-1" />
                      <span>Aceito os termos de uso e política de privacidade *</span>
                    </label>
                    <label className="flex items-start space-x-2">
                      <input type="checkbox" disabled className="mt-1" />
                      <span>Aceito receber comunicações de marketing</span>
                    </label>
                  </div>
                </div>

                <Button className="w-full gradient-primary text-white" disabled>
                  Cadastrar no Programa de Fidelidade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}