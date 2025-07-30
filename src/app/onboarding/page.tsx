'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function OnboardingStart() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)

      // If user is already authenticated, check if they've completed onboarding
      if (user) {
        console.log('Onboarding Page: Checking business status for user:', user.id)
        // Check if business profile exists
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', user.id)
          .single()

        console.log('Onboarding Page: Business data:', business)
        console.log('Onboarding Page: Business error:', businessError)

        if (business && business.settings?.onboarding_completed) {
          console.log('Onboarding Page: Business exists and onboarding completed, redirecting to dashboard')
          // Business exists and onboarding is completed, redirect to dashboard
          router.push('/dashboard')
        } else {
          console.log('Onboarding Page: No business or onboarding not completed, redirecting to step-1')
          // Either no business exists or onboarding not completed, start/continue onboarding
          router.push('/onboarding/step-1')
        }
      }
    }

    getUser()
  }, [router, supabase])

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso necessário</h1>
            <p className="text-gray-600 mb-6">
              Você precisa fazer login para acessar o processo de configuração da sua conta.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full gradient-primary text-white">
                <Link href="/login">Fazer Login</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/cadastro">Criar Conta</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return null // This shouldn't render as the useEffect will redirect
}