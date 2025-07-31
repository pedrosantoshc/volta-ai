'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PrivacidadePage() {
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
            <CardTitle className="text-2xl">Política de Privacidade</CardTitle>
            <CardDescription>
              Como coletamos, usamos e protegemos suas informações pessoais
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Introdução</h3>
              <p className="text-gray-700">
                Esta Política de Privacidade descreve como a Volta.AI coleta, usa, armazena e protege suas 
                informações pessoais quando você utiliza nossos serviços de programas de fidelidade digital. 
                Estamos comprometidos com a transparência e a proteção da sua privacidade conforme a 
                Lei Geral de Proteção de Dados (LGPD).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">2. Informações que Coletamos</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">2.1 Informações Fornecidas por Você</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-4">
                    <li>Nome completo e dados de contato (telefone, e-mail)</li>
                    <li>Respostas a perguntas de cadastro personalizadas</li>
                    <li>Preferências de comunicação e consentimentos</li>
                    <li>Informações de feedback e atendimento ao cliente</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">2.2 Informações Coletadas Automaticamente</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-4">
                    <li>Histórico de selos, resgates e participação nos programas</li>
                    <li>Data e hora de acesso aos serviços</li>
                    <li>Informações do dispositivo e navegador (quando aplicável)</li>
                    <li>Endereço IP e dados de localização aproximada</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">2.3 Informações de Terceiros</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-4">
                    <li>Dados compartilhados pelos estabelecimentos parceiros</li>
                    <li>Informações de provedores de autenticação (Google, Apple)</li>
                    <li>Dados de integrações com sistemas de pagamento</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">3. Como Usamos Suas Informações</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">3.1 Finalidades Principais</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-4">
                    <li>Operar e manter os programas de fidelidade</li>
                    <li>Processar selos, recompensas e resgates</li>
                    <li>Fornecer suporte técnico e atendimento ao cliente</li>
                    <li>Enviar notificações essenciais sobre sua conta</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">3.2 Finalidades Secundárias (com seu consentimento)</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-4">
                    <li>Enviar comunicações promocionais e de marketing</li>
                    <li>Personalizar ofertas e recomendações</li>
                    <li>Realizar pesquisas de satisfação e análises</li>
                    <li>Desenvolver novos recursos e melhorias</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">4. Compartilhamento de Informações</h3>
              <p className="text-gray-700 mb-2">
                Compartilhamos suas informações apenas nas seguintes situações:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>Com Estabelecimentos Parceiros:</strong> Dados necessários para o funcionamento do programa de fidelidade</li>
                <li><strong>Prestadores de Serviços:</strong> Empresas que nos ajudam a operar a plataforma (hospedagem, envio de mensagens)</li>
                <li><strong>Obrigações Legais:</strong> Quando exigido por autoridades competentes ou decisão judicial</li>
                <li><strong>Proteção de Direitos:</strong> Para proteger nossos direitos, propriedade ou segurança</li>
              </ul>
              <p className="text-gray-700 mt-3 font-medium">
                Nunca vendemos ou alugamos suas informações pessoais para terceiros.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">5. Cookies e Tecnologias Similares</h3>
              <p className="text-gray-700 mb-2">
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Manter sua sessão ativa e preferências</li>
                <li>Melhorar a performance e funcionamento da plataforma</li>
                <li>Analisar o uso dos serviços e identificar melhorias</li>
                <li>Personalizar sua experiência (com seu consentimento)</li>
              </ul>
              <p className="text-gray-700 mt-2 text-sm">
                Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">6. Segurança e Proteção</h3>
              <p className="text-gray-700 mb-2">
                Implementamos medidas de segurança técnicas e organizacionais, incluindo:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Controles de acesso e autenticação multifator</li>
                <li>Monitoramento contínuo e detecção de ameaças</li>
                <li>Auditorias regulares de segurança</li>
                <li>Backups seguros e planos de recuperação</li>
                <li>Treinamento de equipe em segurança da informação</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">7. Retenção de Dados</h3>
              <p className="text-gray-700 mb-2">
                Mantemos suas informações pelo tempo necessário para:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>Dados da Conta:</strong> Enquanto você mantiver a conta ativa</li>
                <li><strong>Histórico de Transações:</strong> 5 anos para fins contábeis e fiscais</li>
                <li><strong>Dados de Marketing:</strong> Até a revogação do consentimento</li>
                <li><strong>Dados de Auditoria:</strong> Conforme exigido por regulamentações aplicáveis</li>
              </ul>
              <p className="text-gray-700 mt-2 text-sm">
                Contas inativas por mais de 2 anos são automaticamente excluídas após notificação prévia.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">8. Seus Direitos</h3>
              <p className="text-gray-700 mb-2">
                Conforme a LGPD, você tem os seguintes direitos:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>Confirmação e Acesso:</strong> Saber se tratamos seus dados e ter acesso a eles</li>
                <li><strong>Correção:</strong> Atualizar dados incompletos, inexatos ou desatualizados</li>
                <li><strong>Anonimização ou Exclusão:</strong> Quando desnecessários, excessivos ou tratados ilicitamente</li>
                <li><strong>Portabilidade:</strong> Receber seus dados estruturados e de uso comum</li>
                <li><strong>Informação:</strong> Sobre entidades com quem compartilhamos seus dados</li>
                <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
                <li><strong>Oposição:</strong> Se opor ao tratamento em certas situações</li>
              </ul>
              <p className="text-gray-700 mt-3 text-sm">
                Para exercer esses direitos, entre em contato conosco através dos canais listados na seção de contato.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">9. Transferência Internacional</h3>
              <p className="text-gray-700">
                Seus dados são processados e armazenados no Brasil. Em casos específicos de integração com 
                serviços internacionais, garantimos que a transferência atenda aos requisitos da LGPD e 
                seja realizada apenas para países com nível de proteção adequado.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">10. Menores de Idade</h3>
              <p className="text-gray-700">
                Nossos serviços são destinados a pessoas com 18 anos ou mais. Não coletamos intencionalmente 
                dados de menores de 18 anos. Se identificarmos tal coleta, os dados serão imediatamente removidos 
                e os responsáveis legais serão notificados.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">11. Alterações nesta Política</h3>
              <p className="text-gray-700">
                Esta política pode ser atualizada periodicamente para refletir mudanças em nossos serviços ou 
                na legislação. Alterações significativas serão comunicadas com pelo menos 30 dias de antecedência 
                através dos nossos canais habituais de comunicação.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">12. Contato e DPO</h3>
              <p className="text-gray-700 mb-2">
                Para dúvidas sobre privacidade ou exercer seus direitos:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="list-none text-gray-700 space-y-2">
                  <li><strong>Encarregado de Dados (DPO):</strong> Maria Silva</li>
                  <li><strong>E-mail:</strong> dpo@volta-ai.com</li>
                  <li><strong>E-mail Geral:</strong> privacidade@volta-ai.com</li>
                  <li><strong>Telefone:</strong> (11) 3000-0000</li>
                  <li><strong>Endereço:</strong> Rua da Tecnologia, 123 - São Paulo/SP</li>
                  <li><strong>Horário:</strong> Segunda a sexta, 9h às 17h</li>
                </ul>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>Última atualização:</strong> 31 de julho de 2025<br />
                <strong>Versão:</strong> 2.0<br />
                <strong>Vigência:</strong> Esta política entra em vigor imediatamente e permanece válida até nova atualização.
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