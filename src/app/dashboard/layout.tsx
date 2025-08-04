'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User } from '@supabase/supabase-js'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        
        // Check if user needs onboarding
        console.log('Dashboard Layout: Checking onboarding status for user:', user.id)
        try {
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('settings')
            .eq('id', user.id)
            .single()

          console.log('Dashboard Layout: Business data:', business)
          console.log('Dashboard Layout: Business error:', businessError)
          
          // If no business record exists or onboarding not completed, redirect to onboarding
          if (!business || !business.settings?.onboarding_completed) {
            console.log('Dashboard Layout: Redirecting to onboarding - no business or onboarding not completed')
            console.log('Dashboard Layout: business exists:', !!business)
            console.log('Dashboard Layout: onboarding_completed:', business?.settings?.onboarding_completed)
            router.push('/onboarding/step-1')
            return
          }
          
          console.log('Dashboard Layout: User has completed onboarding, allowing dashboard access')
        } catch (error) {
          // If there's an error fetching business data, assume user needs onboarding
          console.log('Dashboard Layout: Error fetching business data, redirecting to onboarding:', error)
          router.push('/onboarding/step-1')
          return
        }
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 gradient-primary rounded-lg mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold gradient-text">Volta.AI</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link 
                href="/dashboard" 
                className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link 
                href="/dashboard/clientes" 
                className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium"
              >
                Clientes
              </Link>
              <Link 
                href="/dashboard/cartoes" 
                className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium"
              >
                Cartões
              </Link>
              <Link 
                href="/dashboard/selos" 
                className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium"
              >
                Selos
              </Link>
              <Link 
                href="/dashboard/campanhas" 
                className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium"
              >
                Campanhas
              </Link>
              <Link 
                href="/dashboard/insights" 
                className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium"
              >
                IA Insights
              </Link>
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, {user.user_metadata?.owner_name || user.email}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}