'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from "next/image"

interface BusinessData {
  id: string
  name: string
  settings: any
}

export default function OnboardingStep2() {
  const [user, setUser] = useState<User | null>(null)
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [secondaryColor, setSecondaryColor] = useState('#a855f7')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
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

      // Get business data to ensure step 1 is completed
      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !businessData) {
        // Step 1 not completed, redirect back
        router.push('/onboarding/step-1')
        return
      }

      setBusiness(businessData)

      // Load existing logo if available
      if (businessData.logo_url) {
        setLogoPreview(businessData.logo_url)
      }

      // Load existing brand colors if available
      if (businessData.settings?.primary_color) {
        setPrimaryColor(businessData.settings.primary_color)
      }
      if (businessData.settings?.secondary_color) {
        setSecondaryColor(businessData.settings.secondary_color)
      }
    }

    getUser()
  }, [router, supabase])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem.')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 5MB.')
        return
      }

      setLogoFile(file)
      setError('')

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null

    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${user.id}-logo-${Date.now()}.${fileExt}`
    const filePath = `business-logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, logoFile)

    if (uploadError) {
      console.error('Logo upload error:', uploadError)
      throw new Error('Erro ao fazer upload da logo')
    }

    const { data } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business) return

    setLoading(true)
    setError('')

    try {
      let logoUrl = business.logo_url

      // Upload new logo if selected
      if (logoFile) {
        logoUrl = await uploadLogo()
      }

      // Update business record
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          logo_url: logoUrl,
          settings: {
            ...business.settings,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            onboarding_step: 2
          }
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Business update error:', updateError)
        setError('Erro ao salvar configurações. Tente novamente.')
        return
      }

      // Proceed to step 3
      router.push('/onboarding/step-3')
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/onboarding/step-3')
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
            <div className="w-8 h-1 bg-purple-600 rounded"></div>
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-medium">2</div>
            <div className="w-8 h-1 bg-gray-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">3</div>
            <div className="w-8 h-1 bg-gray-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">4</div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Identidade Visual</CardTitle>
            <CardDescription>
              Personalize a aparência da sua marca no programa de fidelidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label>Logo do restaurante</Label>
                <div className="flex flex-col items-center space-y-4">
                  {logoPreview ? (
                    <div className="relative">
                      <div className="w-32 h-32 rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={120}
                          height={120}
                          className="object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 rounded-full w-8 h-8 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Sem logo</p>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview ? 'Alterar Logo' : 'Adicionar Logo'}
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />

                  <p className="text-sm text-gray-500 text-center">
                    Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                  </p>
                </div>
              </div>

              {/* Brand Colors */}
              <div className="space-y-6">
                <Label>Cores da marca</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Cor primária</Label>
                    <div className="flex items-center space-x-3">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-12 rounded-lg cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1"
                        placeholder="#7c3aed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Cor secundária</Label>
                    <div className="flex items-center space-x-3">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-16 h-12 rounded-lg cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1"
                        placeholder="#a855f7"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="p-4 rounded-lg border-2 border-gray-200">
                  <Label className="block mb-3">Prévia do cartão de fidelidade</Label>
                  <div 
                    className="w-full max-w-sm mx-auto rounded-lg p-4 text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      {logoPreview ? (
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
                          <Image
                            src={logoPreview}
                            alt="Logo"
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                          <span className="text-sm font-bold">{business.name[0]}</span>
                        </div>
                      )}
                      <h3 className="font-bold text-sm">{business.name}</h3>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Selos: 3/10</span>
                      <span>☕ ☕ ☕ ○ ○ ○ ○ ○ ○ ○</span>
                    </div>
                  </div>
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
      </div>
    </div>
  )
}