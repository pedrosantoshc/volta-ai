import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Volta.AI - Plataforma de Fidelidade Inteligente",
  description: "Transforme cartões de fidelidade em papel em experiências digitais inteligentes com WhatsApp e IA. Feito para restaurantes brasileiros.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-pt`}
      >
        {children}
      </body>
    </html>
  );
}
