'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LGPDPage() {
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
            <CardTitle className="text-2xl">Lei Geral de Proteção de Dados (LGPD)</CardTitle>
            <CardDescription>
              Como tratamos e protegemos seus dados pessoais
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Informações que Coletamos</h3>
              <p className="text-gray-700 mb-2">
                Coletamos apenas as informações necessárias para o funcionamento do programa de fidelidade:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>Dados de Identificação:</strong> Nome completo, telefone e e-mail (quando fornecido)</li>
                <li><strong>Dados de Participação:</strong> Histórico de selos, resgates e visitas</li>
                <li><strong>Dados Personalizados:</strong> Respostas a perguntas específicas do estabelecimento</li>
                <li><strong>Dados de Comunicação:</strong> Preferências de contato e consentimentos</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">2. Como Utilizamos Seus Dados</h3>
              <p className="text-gray-700 mb-2">
                Seus dados pessoais são utilizados exclusivamente para:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Gerenciar sua participação no programa de fidelidade</li>
                <li>Contabilizar selos e processar resgates de recompensas</li>
                <li>Enviar notificações sobre seu cartão via WhatsApp (com seu consentimento)</li>
                <li>Enviar comunicações de marketing (apenas com seu consentimento explícito)</li>
                <li>Melhorar nossos serviços e personalizar ofertas</li>
                <li>Cumprir obrigações legais e regulatórias</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">3. Base Legal para o Tratamento</h3>
              <p className="text-gray-700 mb-2">
                O tratamento dos seus dados pessoais é baseado em:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>Consentimento:</strong> Para comunicações de marketing e dados não essenciais</li>
                <li><strong>Execução de Contrato:</strong> Para o funcionamento do programa de fidelidade</li>
                <li><strong>Legítimo Interesse:</strong> Para melhorar nossos serviços e segurança</li>
                <li><strong>Cumprimento de Obrigação Legal:</strong> Quando exigido por lei</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">4. Compartilhamento de Dados</h3>
              <p className="text-gray-700 mb-2">
                Seus dados podem ser compartilhados apenas com:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>O Estabelecimento:</strong> Proprietário do programa de fidelidade que você se inscreveu</li>
                <li><strong>Prestadores de Serviço:</strong> Empresas que nos ajudam a operar a plataforma (hospedagem, comunicação)</li>
                <li><strong>Autoridades:</strong> Quando exigido por lei ou decisão judicial</li>
              </ul>
              <p className="text-gray-700 mt-2">
                <strong>Nunca vendemos ou compartilhamos seus dados para fins comerciais com terceiros.</strong>
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">5. Seus Direitos</h3>
              <p className="text-gray-700 mb-2">
                Conforme a LGPD, você tem direito a:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>Acesso:</strong> Saber quais dados temos sobre você</li>
                <li><strong>Correção:</strong> Atualizar dados incorretos ou incompletos</li>
                <li><strong>Exclusão:</strong> Solicitar a remoção dos seus dados</li>
                <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                <li><strong>Oposição:</strong> Se opor ao tratamento baseado em legítimo interesse</li>
                <li><strong>Revogação:</strong> Retirar seu consentimento a qualquer momento</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">6. Segurança dos Dados</h3>
              <p className="text-gray-700">
                Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra 
                acesso não autorizado, alteração, divulgação ou destruição, incluindo criptografia, controles de acesso 
                e monitoramento contínuo.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">7. Retenção de Dados</h3>
              <p className="text-gray-700">
                Mantemos seus dados apenas pelo tempo necessário para as finalidades descritas ou conforme exigido por lei. 
                Dados de programas de fidelidade inativos são excluídos após 2 anos de inatividade.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">8. Alterações nesta Política</h3>
              <p className="text-gray-700">
                Esta política pode ser atualizada periodicamente. Notificaremos sobre alterações importantes através 
                dos nossos canais de comunicação habituais.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">9. Contato</h3>
              <p className="text-gray-700 mb-2">
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados:
              </p>
              <ul className="list-none text-gray-700 space-y-1">
                <li><strong>E-mail do DPO:</strong> dpo@volta-ai.com</li>
                <li><strong>E-mail de Suporte:</strong> privacidade@volta-ai.com</li>
                <li><strong>Telefone:</strong> (11) 3000-0000</li>
              </ul>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>Última atualização:</strong> 31 de julho de 2025<br />
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