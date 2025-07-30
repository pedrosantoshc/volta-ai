'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface BusinessData {
  id: string
  name: string
  settings: any
}

interface TeamMember {
  id: string
  email: string
  role: string
  status: 'pending' | 'accepted'
}

export default function OnboardingStep4() {
  const [user, setUser] = useState<User | null>(null)
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('staff')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
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

      // Get business data to ensure previous steps are completed
      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !businessData) {
        router.push('/onboarding/step-1')
        return
      }

      if (!businessData.settings?.onboarding_step || businessData.settings.onboarding_step < 3) {
        router.push('/onboarding/step-3')
        return
      }

      setBusiness(businessData)

      // Load existing team members if any
      loadTeamMembers(user.id)
    }

    getUser()
  }, [router, supabase])

  const loadTeamMembers = async (businessId: string) => {
    // For now, we'll use a simple array. In production, this would come from a team_members table
    // Since we don't have team management in the current schema, we'll simulate it
    const existingTeam = business?.settings?.team_members || []
    setTeamMembers(existingTeam)
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business || !newMemberEmail.trim()) return

    setInviteLoading(true)
    setError('')

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newMemberEmail)) {
        setError('Por favor, insira um email válido.')
        setInviteLoading(false)
        return
      }

      // Check if member already exists
      const memberExists = teamMembers.some(member => 
        member.email.toLowerCase() === newMemberEmail.toLowerCase()
      )

      if (memberExists) {
        setError('Este email já foi convidado.')
        setInviteLoading(false)
        return
      }

      // Create new team member (simulated - in production this would be in database)
      const newMember: TeamMember = {
        id: Date.now().toString(),
        email: newMemberEmail,
        role: newMemberRole,
        status: 'pending'
      }

      const updatedTeamMembers = [...teamMembers, newMember]
      setTeamMembers(updatedTeamMembers)

      // Update business settings with team members
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          settings: {
            ...business.settings,
            team_members: updatedTeamMembers
          }
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Team member update error:', updateError)
        setError('Erro ao adicionar membro da equipe. Tente novamente.')
        setTeamMembers(teamMembers) // Revert on error
        return
      }

      // TODO: In production, send actual invitation email
      console.log(`Invitation would be sent to: ${newMemberEmail} with role: ${newMemberRole}`)

      // Reset form
      setNewMemberEmail('')
      setNewMemberRole('staff')

    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setInviteLoading(false)
    }
  }

  const removeMember = async (memberId: string) => {
    if (!user || !business) return

    const updatedTeamMembers = teamMembers.filter(member => member.id !== memberId)
    setTeamMembers(updatedTeamMembers)

    // Update business settings
    await supabase
      .from('businesses')
      .update({
        settings: {
          ...business.settings,
          team_members: updatedTeamMembers
        }
      })
      .eq('id', user.id)
  }

  const handleComplete = async () => {
    if (!user || !business) return

    setLoading(true)
    setError('')

    try {
      // Mark onboarding as completed
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          settings: {
            ...business.settings,
            onboarding_step: 4,
            onboarding_completed: true,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Onboarding completion error:', updateError)
        setError('Erro ao finalizar configuração. Tente novamente.')
        return
      }

      // Redirect to onboarding completion page
      router.push('/onboarding/complete')
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/onboarding/complete')
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

  const roleLabels = {
    'owner': 'Proprietário',
    'manager': 'Gerente',
    'staff': 'Funcionário'
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
            <div className="w-8 h-1 bg-green-500 rounded"></div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">✓</div>
            <div className="w-8 h-1 bg-green-500 rounded"></div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">✓</div>
            <div className="w-8 h-1 bg-purple-600 rounded"></div>
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-medium">4</div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Equipe do Restaurante</CardTitle>
            <CardDescription>
              Convide funcionários para ajudar na gestão do programa de fidelidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Owner Info */}
              <div className="space-y-4">
                <Label>Proprietário</Label>
                <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-gray-500">Você - Acesso total</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Proprietário</Badge>
                </div>
              </div>

              {/* Add Team Member Form */}
              <div className="space-y-4">
                <Label>Convidar funcionário</Label>
                <form onSubmit={handleInviteMember} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Input
                        type="email"
                        placeholder="email@funcionario.com"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Funcionário</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    variant="outline" 
                    disabled={inviteLoading}
                    className="w-full md:w-auto"
                  >
                    {inviteLoading ? 'Convidando...' : 'Enviar Convite'}
                  </Button>
                </form>
              </div>

              {/* Team Members List */}
              {teamMembers.length > 0 && (
                <div className="space-y-4">
                  <Label>Equipe convidada</Label>
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.email}</p>
                            <p className="text-sm text-gray-500">
                              {roleLabels[member.role as keyof typeof roleLabels]} - {' '}
                              {member.status === 'pending' ? 'Convite pendente' : 'Ativo'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={member.status === 'pending' ? 'outline' : 'default'}>
                            {member.status === 'pending' ? 'Pendente' : 'Ativo'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Níveis de acesso:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>Funcionário:</strong> Pode adicionar selos e ver dados básicos dos clientes</li>
                  <li><strong>Gerente:</strong> Acesso completo aos clientes e campanhas, não pode alterar configurações</li>
                  <li><strong>Proprietário:</strong> Acesso total a todas as funcionalidades</li>
                </ul>
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
                  onClick={handleComplete}
                  className="gradient-primary text-white"
                  disabled={loading}
                >
                  {loading ? 'Finalizando...' : 'Finalizar Configuração'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note about invitations */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            Os convites serão enviados por email. Os funcionários precisarão criar uma conta 
            para aceitar o convite e acessar o sistema.
          </p>
        </div>
      </div>
    </div>
  )
}