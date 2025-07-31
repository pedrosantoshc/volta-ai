'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-2xl font-bold gradient-text">Volta.AI</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Termos de Uso</CardTitle>
            <CardDescription>
              Condições para uso da plataforma Volta.AI
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Aceitação dos Termos</h3>
              <p className="text-gray-700">
                Ao se cadastrar em qualquer programa de fidelidade através da plataforma Volta.AI, você concorda 
                com estes Termos de Uso e nossa Política de Privacidade. Se não concordar com algum termo, 
                não utilize nossos serviços.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">2. Descrição do Serviço</h3>
              <p className="text-gray-700 mb-2">
                A Volta.AI é uma plataforma que oferece:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Sistema de cartões de fidelidade digitais</li>
                <li>Controle de selos e recompensas</li>
                <li>Comunicação via WhatsApp com estabelecimentos</li>
                <li>Integração com Apple Wallet e Google Pay</li>
                <li>Ferramentas de gestão para empresas</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">3. Cadastro e Responsabilidades do Usuário</h3>
              <p className="text-gray-700 mb-2">
                Para participar dos programas de fidelidade, você deve:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Manter a confidencialidade dos seus dados de acesso</li>
                <li>Usar os serviços apenas para fins legítimos</li>
                <li>Não criar múltiplas contas para o mesmo estabelecimento</li>
                <li>Respeitar as regras específicas de cada programa de fidelidade</li>
                <li>Notificar imediatamente sobre uso não autorizado da sua conta</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">4. Funcionamento dos Programas de Fidelidade</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">4.1 Acúmulo de Selos</h4>
                  <p className="text-gray-700 text-sm">
                    Os selos são creditados conforme as regras específicas de cada estabelecimento. 
                    A Volta.AI não é responsável por decisões sobre concessão ou não de selos.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">4.2 Resgate de Recompensas</h4>
                  <p className="text-gray-700 text-sm">
                    As recompensas devem ser resgatadas conforme as condições estabelecidas por cada estabelecimento. 
                    Prazos de validade e disponibilidade são definidos pelo estabelecimento parceiro.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">4.3 Validade dos Selos</h4>
                  <p className="text-gray-700 text-sm">
                    Selos podem ter prazo de validade conforme definido pelo estabelecimento. 
                    Selos expirados são automaticamente removidos do sistema.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">5. Relacionamento com Estabelecimentos</h3>
              <p className="text-gray-700">
                A Volta.AI atua como intermediária tecnológica. Cada programa de fidelidade é de responsabilidade 
                exclusiva do respectivo estabelecimento. Disputas sobre selos, recompensas ou atendimento devem 
                ser resolvidas diretamente com o estabelecimento.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">6. Comunicações</h3>
              <p className="text-gray-700 mb-2">
                Ao aceitar estes termos, você concorda em receber:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Notificações essenciais sobre sua conta via WhatsApp</li>
                <li>Comunicações transacionais (confirmações, alertas de segurança)</li>
                <li>Comunicações de marketing (apenas com seu consentimento específico)</li>
              </ul>
              <p className="text-gray-700 mt-2 text-sm">
                Você pode cancelar comunicações de marketing a qualquer momento, mas comunicações essenciais 
                são necessárias para o funcionamento do serviço.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">7. Limitações de Responsabilidade</h3>
              <p className="text-gray-700 mb-2">
                A Volta.AI não se responsabiliza por:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Decisões dos estabelecimentos sobre concessão ou recusa de selos</li>
                <li>Qualidade, disponibilidade ou características dos produtos/serviços dos estabelecimentos</li>
                <li>Alterações nas regras dos programas de fidelidade pelos estabelecimentos</li>
                <li>Interrupções temporárias no serviço para manutenção</li>
                <li>Perda de dados decorrente de problemas técnicos do dispositivo do usuário</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">8. Propriedade Intelectual</h3>
              <p className="text-gray-700">
                Todos os direitos sobre a plataforma Volta.AI, incluindo software, designs, marcas e conteúdo, 
                pertencem à empresa ou seus licenciadores. É proibida a reprodução, distribuição ou uso comercial 
                sem autorização prévia.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">9. Suspensão e Encerramento</h3>
              <p className="text-gray-700">
                Podemos suspender ou encerrar sua conta em caso de violação destes termos, uso inadequado 
                da plataforma ou por solicitação do estabelecimento. Você pode encerrar sua participação 
                a qualquer momento solicitando a exclusão da sua conta.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">10. Alterações nos Termos</h3>
              <p className="text-gray-700">
                Estes termos podem ser atualizados periodicamente. Alterações significativas serão comunicadas 
                através dos nossos canais habituais. O uso continuado dos serviços após as alterações constitui 
                aceitação dos novos termos.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">11. Lei Aplicável e Foro</h3>
              <p className="text-gray-700">
                Estes termos são regidos pela legislação brasileira. Eventuais disputas serão resolvidas 
                no foro da comarca de São Paulo/SP, salvo se você for consumidor e residir em local diverso, 
                caso em que se aplicará o foro do seu domicílio.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">12. Contato</h3>
              <p className="text-gray-700 mb-2">
                Para dúvidas sobre estes termos ou suporte técnico:
              </p>
              <ul className="list-none text-gray-700 space-y-1">
                <li><strong>E-mail:</strong> suporte@volta-ai.com</li>
                <li><strong>WhatsApp:</strong> (11) 9 9999-9999</li>
                <li><strong>Horário:</strong> Segunda a sexta, 9h às 18h</li>
              </ul>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>Última atualização:</strong> 31 de julho de 2025<br />
                <strong>Vigência:</strong> Estes termos entram em vigor imediatamente e permanecem válidos até nova atualização.
              </p>
            </div>

            <div className="flex justify-center pt-6">
              <Button onClick={() => window.history.back()} className="gradient-primary text-white">
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}