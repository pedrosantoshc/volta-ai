import { NextRequest, NextResponse } from 'next/server'
import { generateCampaignContent } from '@/lib/deepseek-client'

export async function POST(request: NextRequest) {
  try {
    const { businessId, campaignType, targetAudience, businessContext, customPrompt } = await request.json()

    if (!businessId || !campaignType || !targetAudience || !businessContext) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }

    // Generate campaign content using DeepSeek AI
    const campaignContent = await generateCampaignContent(
      campaignType,
      targetAudience,
      businessContext,
      customPrompt
    )

    return NextResponse.json(campaignContent)
  } catch (error) {
    console.error('AI campaign generation error:', error)
    
    // Return fallback content if AI fails
    const fallbackContent = {
      title: `Campanha ${request.body?.campaignType || 'Marketing'}`,
      message: `Olá! Sentimos sua falta no ${request.body?.businessContext?.businessName || 'nosso estabelecimento'} 😊 Volte e ganhe um desconto especial!`,
      expectedResults: 'Engajamento estimado de 20-25%'
    }

    return NextResponse.json(fallbackContent)
  }
}

export async function GET() {
  return NextResponse.json({ message: 'AI Campaign Generation API' })
}