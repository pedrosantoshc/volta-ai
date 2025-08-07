import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    // Use regular client to get authenticated user session
    const supabase = await createClient(false) // Don't use service role for auth
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get business data for the authenticated user (user ID = business ID)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', user.id)
      .single()

    if (businessError || !business) {
      console.error('Business query error:', businessError)
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Get loyalty cards for this business
    const { data: loyaltyCards, error: cardsError } = await supabase
      .from('loyalty_cards')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name')

    if (cardsError) {
      console.error('Error fetching loyalty cards:', cardsError)
      return NextResponse.json(
        { error: 'Failed to fetch loyalty cards' },
        { status: 500 }
      )
    }

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Define column headers
    const headers = [
      'nome',           // Name (required)
      'telefone',       // Phone (required)
      'email',          // Email (optional)
      'tem_cartao',     // Has Card (SIM/NÃO)
      'nome_cartao',    // Card Name (dropdown from loyalty cards)
      'selos_atuais',   // Current Stamps (number)
      // 'cartao_completo', // REMOVED - now calculated automatically
      'total_gasto',    // Total Spent (currency)
      'total_visitas',  // Total Visits (number)
      'ultima_visita',  // Last Visit (date)
      'tags'            // Tags (comma-separated)
    ]

    // Create sample row with instructions
    const sampleRow = [
      'João Silva',              // nome
      '+5511999887766',          // telefone
      'joao@email.com',          // email
      'SIM',                     // tem_cartao
      loyaltyCards?.[0]?.name || 'Cartão Exemplo', // nome_cartao
      '5',                       // selos_atuais
      // 'NÃO',                     // cartao_completo (REMOVED)
      '150.50',                  // total_gasto
      '10',                      // total_visitas
      '2024-01-15',              // ultima_visita
      'cliente_vip, ativo'       // tags
    ]

    // Create worksheet data
    const worksheetData = [
      headers,
      sampleRow
    ]

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Set column widths
    worksheet['!cols'] = [
      { width: 20 }, // nome
      { width: 15 }, // telefone
      { width: 25 }, // email
      { width: 12 }, // tem_cartao
      { width: 20 }, // nome_cartao
      { width: 15 }, // selos_atuais
      // { width: 15 }, // cartao_completo (REMOVED)
      { width: 12 }, // total_gasto
      { width: 15 }, // total_visitas
      { width: 15 }, // ultima_visita
      { width: 20 }  // tags
    ]

    // Add data validation for dropdowns
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:K1000')
    
    // Add validation for tem_cartao column (D)
    for (let row = 2; row <= 1000; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: 3 }) // Column D (tem_cartao)
      if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' }
      
      // Add data validation (this is a basic approach - full validation would require more complex setup)
      worksheet[cellAddress].s = {
        patternType: 'solid',
        fgColor: { rgb: 'FFFFFFFF' }
      }
    }

    // REMOVED: Validation for cartao_completo column (now calculated automatically)

    // Create dropdown options sheet for loyalty cards
    if (loyaltyCards && loyaltyCards.length > 0) {
      const cardNames = loyaltyCards.map((card: { id: string, name: string }) => card.name)
      const optionsData = [
        ['Cartões Disponíveis'],
        ...cardNames.map((name: string) => [name])
      ]
      
      const optionsSheet = XLSX.utils.aoa_to_sheet(optionsData)
      XLSX.utils.book_append_sheet(workbook, optionsSheet, 'Opções')
    }

    // Add instructions sheet
    const instructionsData = [
      ['INSTRUÇÕES PARA IMPORTAÇÃO DE CLIENTES'],
      [''],
      ['Preenchimento obrigatório:'],
      ['- nome: Nome completo do cliente'],
      ['- telefone: Telefone no formato +5511999887766'],
      [''],
      ['Preenchimento opcional:'],
      ['- email: Email do cliente'],
      ['- tem_cartao: SIM se o cliente já possui cartão, NÃO caso contrário'],
      ['- nome_cartao: Nome do cartão (deve corresponder aos cartões cadastrados)'],
      ['- selos_atuais: Número de selos (máximo conforme configuração do cartão - verificado automaticamente)'],
      // ['- cartao_completo: SIM se o cartão está completo, NÃO caso contrário'], // REMOVED
      ['- total_gasto: Valor total já gasto pelo cliente'],
      ['- total_visitas: Número total de visitas do cliente'],
      ['- ultima_visita: Data da última visita (formato: AAAA-MM-DD)'],
      ['- tags: Tags separadas por vírgula (ex: vip, ativo)'],
      [''],
      ['NOTA: O status de cartão completo é calculado automaticamente com base nos selos vs limite do cartão.'],
      [''],
      ['Cartões disponíveis:'],
      ...(loyaltyCards?.map((card: { id: string, name: string }) => [`- ${card.name}`]) || [['Nenhum cartão encontrado']])
    ]

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instruções')

    // Add main data sheet
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    })

    // Set response headers for file download
    const filename = `template-importacao-clientes-${business.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Template generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}