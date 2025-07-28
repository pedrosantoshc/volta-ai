import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold gradient-text">Volta.AI</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/sobre" className="text-gray-600 hover:text-purple-600 transition-colors">
              Sobre
            </Link>
            <Link href="/recursos" className="text-gray-600 hover:text-purple-600 transition-colors">
              Recursos
            </Link>
            <Link href="/precos" className="text-gray-600 hover:text-purple-600 transition-colors">
              Preços
            </Link>
          </nav>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button className="gradient-primary text-white" asChild>
              <Link href="/cadastro">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">Fidelidade Inteligente</span>
          <br />
          <span className="text-gray-900">para Restaurantes Brasileiros</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Transforme cartões de papel em experiências digitais inteligentes. 
          IA que sugere campanhas no WhatsApp e cartões na carteira digital.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button size="lg" className="gradient-primary text-white px-8 py-4 text-lg" asChild>
            <Link href="/demo">Ver Demonstração</Link>
          </Button>
          <Button size="lg" variant="outline" className="px-8 py-4 text-lg" asChild>
            <Link href="/cadastro">Começar Gratuitamente</Link>
          </Button>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text mb-2">60%+</div>
            <div className="text-gray-600">Taxa de adesão de clientes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text mb-2">25%+</div>
            <div className="text-gray-600">Engajamento no WhatsApp</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text mb-2">15:1</div>
            <div className="text-gray-600">ROI em campanhas IA</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Como a <span className="gradient-text">Volta.AI</span> Funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-2 hover:border-purple-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 gradient-primary rounded-lg mx-auto flex items-center justify-center mb-4">
                  <span className="text-white text-xl">📱</span>
                </div>
                <CardTitle>Carteira Digital</CardTitle>
                <CardDescription>
                  Clientes adicionam o cartão de fidelidade no Apple Wallet ou Google Pay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  QR Code único para cadastro rápido. Nunca mais perder cartão de papel.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-purple-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 gradient-primary rounded-lg mx-auto flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🤖</span>
                </div>
                <CardTitle>IA Marketing</CardTitle>
                <CardDescription>
                  Inteligência artificial sugere campanhas personalizadas automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Análise comportamental e sugestões de campanhas com um clique.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-purple-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 gradient-primary rounded-lg mx-auto flex items-center justify-center mb-4">
                  <span className="text-white text-xl">💬</span>
                </div>
                <CardTitle>WhatsApp Automático</CardTitle>
                <CardDescription>
                  Notificações automáticas e campanhas de marketing via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Mensagens personalizadas que aumentam o retorno dos clientes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Pronto para Revolucionar Sua Fidelidade?
          </h2>
          <p className="text-purple-100 text-lg mb-8 max-w-2xl mx-auto">
            Junte-se aos restaurantes que já aumentaram suas vendas com campanhas inteligentes
          </p>
          <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg" asChild>
            <Link href="/cadastro">Começar Agora - Grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="text-xl font-bold">Volta.AI</span>
              </div>
              <p className="text-gray-400">
                Plataforma de fidelidade inteligente para restaurantes brasileiros.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/recursos" className="hover:text-white transition-colors">Recursos</Link></li>
                <li><Link href="/precos" className="hover:text-white transition-colors">Preços</Link></li>
                <li><Link href="/demo" className="hover:text-white transition-colors">Demonstração</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link></li>
                <li><Link href="/contato" className="hover:text-white transition-colors">Contato</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link></li>
                <li><Link href="/termos" className="hover:text-white transition-colors">Termos</Link></li>
                <li><Link href="/lgpd" className="hover:text-white transition-colors">LGPD</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Volta.AI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
