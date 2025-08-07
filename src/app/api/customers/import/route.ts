import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'

interface ImportRow {
  nome: string
  telefone: string
  email?: string
  tem_cartao?: string
  nome_cartao?: string
  selos_atuais?: string | number
  // cartao_completo?: string  // REMOVED - now calculated automatically
  total_gasto?: string | number
  total_visitas?: string | number
  ultima_visita?: string
  tags?: string
}

interface LoyaltyCardWithRules {
  id: string
  name: string
  rules: {
    stamps_required: number
    reward_description: string
    expiry_days?: number
    max_stamps_per_day?: number
  }
}

interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  errors: Array<{
    row: number
    error: string
    data: ImportRow
  }>
  warnings: Array<{
    row: number
    warning: string
    data: ImportRow
  }>
}

// Utility function to validate and format phone number
function validateAndFormatPhone(phone: string): { valid: boolean; formatted: string; error?: string } {
  if (!phone) return { valid: false, formatted: '', error: 'Telefone é obrigatório' }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Check if it's a valid Brazilian phone number
  if (digits.length < 10 || digits.length > 13) {
    return { valid: false, formatted: phone, error: 'Telefone deve ter entre 10 e 13 dígitos' }
  }
  
  // Add +55 if not present
  let formatted = digits
  if (!formatted.startsWith('55') && formatted.length <= 11) {
    formatted = '55' + formatted
  }
  
  // Add + sign
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted
  }
  
  return { valid: true, formatted }
}

// Utility function to validate email
function validateEmail(email: string): boolean {
  if (!email) return true // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Utility function to parse date
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  // Try different date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
  ]
  
  for (const format of formats) {
    if (format.test(dateStr)) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Use regular client for authentication, service role for operations
    const authSupabase = await createClient(false)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get business data for the authenticated user
    const { data: business, error: businessError } = await authSupabase
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

    // Use service role client for bulk operations
    const supabase = await createClient(true)

    // Get loyalty cards for validation
    const { data: loyaltyCards, error: cardsError } = await supabase
      .from('loyalty_cards')
      .select('id, name, rules')
      .eq('business_id', business.id)
      .eq('is_active', true)

    if (cardsError) {
      console.error('Error fetching loyalty cards:', cardsError)
      return NextResponse.json(
        { error: 'Failed to fetch loyalty cards' },
        { status: 500 }
      )
    }

    const loyaltyCardMap = new Map(loyaltyCards?.map((card: LoyaltyCardWithRules) => [card.name.toLowerCase(), card]) || [])

    // Parse form data to get the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size allowed is 10MB' },
        { status: 400 }
      )
    }

    // Read the Excel file
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Get the first sheet (assuming it's the data sheet)
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('clientes')) || workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) {
      return NextResponse.json(
        { error: 'No valid worksheet found' },
        { status: 400 }
      )
    }

    // Convert worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false
    }) as any[][]

    if (jsonData.length < 2) {
      return NextResponse.json(
        { error: 'No data rows found in the file' },
        { status: 400 }
      )
    }

    // Get headers from first row
    const headers = jsonData[0] as string[]
    const dataRows = jsonData.slice(1) as any[][]

    // Convert rows to objects
    const importData: ImportRow[] = dataRows.map(row => {
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = row[index] || ''
      })
      return obj as ImportRow
    })

    // Limit the number of rows to process (1000 rows max)
    const maxRows = 1000
    if (importData.length > maxRows) {
      return NextResponse.json(
        { error: `Too many rows. Maximum ${maxRows} rows allowed per import` },
        { status: 400 }
      )
    }

    const result: ImportResult = {
      success: false,
      totalRows: importData.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      warnings: []
    }

    // Process each row
    for (let i = 0; i < importData.length; i++) {
      const row = importData[i]
      const rowNumber = i + 2 // +2 because Excel is 1-indexed and we skip header

      try {
        // Skip empty rows
        if (!row.nome && !row.telefone) {
          continue
        }

        // Rate limiting: small delay to prevent overwhelming the database
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay every 10 rows
        }

        // Validate required fields
        if (!row.nome || !row.nome.trim()) {
          result.errors.push({
            row: rowNumber,
            error: 'Nome é obrigatório',
            data: row
          })
          result.errorCount++
          continue
        }

        if (!row.telefone || !row.telefone.trim()) {
          result.errors.push({
            row: rowNumber,
            error: 'Telefone é obrigatório',
            data: row
          })
          result.errorCount++
          continue
        }

        // Validate and format phone
        const phoneValidation = validateAndFormatPhone(row.telefone.toString())
        if (!phoneValidation.valid) {
          result.errors.push({
            row: rowNumber,
            error: phoneValidation.error || 'Telefone inválido',
            data: row
          })
          result.errorCount++
          continue
        }

        // Validate email if provided
        if (row.email && !validateEmail(row.email.toString())) {
          result.errors.push({
            row: rowNumber,
            error: 'Email inválido',
            data: row
          })
          result.errorCount++
          continue
        }

        // Validate loyalty card if specified
        let loyaltyCard: LoyaltyCardWithRules | null = null
        if (row.tem_cartao?.toString().toUpperCase() === 'SIM') {
          if (!row.nome_cartao) {
            result.errors.push({
              row: rowNumber,
              error: 'Nome do cartão é obrigatório quando tem_cartao = SIM',
              data: row
            })
            result.errorCount++
            continue
          }

          loyaltyCard = loyaltyCardMap.get(row.nome_cartao.toString().toLowerCase()) ?? null
          if (!loyaltyCard) {
            result.errors.push({
              row: rowNumber,
              error: `Cartão "${row.nome_cartao}" não encontrado`,
              data: row
            })
            result.errorCount++
            continue
          }
        }

        // Parse numeric fields
        const currentStamps = row.selos_atuais ? parseInt(row.selos_atuais.toString()) : 0
        
        // NEW: Validate stamps against card limits
        if (loyaltyCard && currentStamps > 0) {
          const maxStamps = loyaltyCard.rules.stamps_required
          if (currentStamps > maxStamps) {
            result.errors.push({
              row: rowNumber,
              error: `Número de selos (${currentStamps}) não pode ser maior que o máximo do cartão "${loyaltyCard.name}" (${maxStamps})`,
              data: row
            })
            result.errorCount++
            continue
          }
        }

        const totalSpent = row.total_gasto ? parseFloat(row.total_gasto.toString()) : null
        const totalVisits = row.total_visitas ? parseInt(row.total_visitas.toString()) : 0

        // Parse last visit date
        const lastVisit = row.ultima_visita ? parseDate(row.ultima_visita.toString()) : null

        // Parse tags
        const tags = row.tags ? row.tags.toString().split(',').map(tag => tag.trim()).filter(tag => tag) : []

        // Check if customer already exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('business_id', business.id)
          .eq('phone', phoneValidation.formatted)
          .single()

        let customerId: string

        if (existingCustomer) {
          // Update existing customer
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              name: row.nome.toString().trim(),
              email: row.email?.toString().trim() || null,
              total_spent: totalSpent,
              total_visits: Math.max(totalVisits, 0),
              last_visit: lastVisit?.toISOString() || null,
              tags: tags
            })
            .eq('id', existingCustomer.id)
            .select('id')
            .single()

          if (updateError) {
            result.errors.push({
              row: rowNumber,
              error: `Erro ao atualizar cliente: ${updateError.message}`,
              data: row
            })
            result.errorCount++
            continue
          }

          customerId = existingCustomer.id
          result.warnings.push({
            row: rowNumber,
            warning: 'Cliente já existia e foi atualizado',
            data: row
          })
        } else {
          // Create new customer
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              business_id: business.id,
              name: row.nome.toString().trim(),
              phone: phoneValidation.formatted,
              email: row.email?.toString().trim() || null,
              total_spent: totalSpent,
              total_visits: Math.max(totalVisits, 0),
              last_visit: lastVisit?.toISOString() || null,
              tags: tags,
              consent: {
                marketing: true,
                data_processing: true,
                consent_date: new Date().toISOString()
              },
              enrollment_date: new Date().toISOString()
            })
            .select('id')
            .single()

          if (createError) {
            result.errors.push({
              row: rowNumber,
              error: `Erro ao criar cliente: ${createError.message}`,
              data: row
            })
            result.errorCount++
            continue
          }

          customerId = newCustomer.id
        }

        // Create loyalty card instance if specified
        if (loyaltyCard && row.tem_cartao?.toString().toUpperCase() === 'SIM') {
          // Check if customer already has this card
          const { data: existingCard } = await supabase
            .from('customer_loyalty_cards')
            .select('id')
            .eq('customer_id', customerId)
            .eq('loyalty_card_id', loyaltyCard.id)
            .single()

          if (!existingCard) {
            const qrCode = `${customerId}-${loyaltyCard.id}-${Date.now()}`
            
            // NEW: Auto-calculate completion status based on stamps vs card limit
            const maxStamps = loyaltyCard.rules.stamps_required
            const isCompleted = currentStamps >= maxStamps
            
            const { error: cardError } = await supabase
              .from('customer_loyalty_cards')
              .insert({
                customer_id: customerId,
                loyalty_card_id: loyaltyCard.id,
                current_stamps: Math.max(currentStamps, 0),
                total_redeemed: isCompleted ? 1 : 0,
                qr_code: qrCode,
                status: isCompleted ? 'completed' : 'active'
              })

            if (cardError) {
              result.warnings.push({
                row: rowNumber,
                warning: `Cliente criado mas cartão fidelidade falhou: ${cardError.message}`,
                data: row
              })
            } else if (isCompleted) {
              // Add info message about auto-completion
              result.warnings.push({
                row: rowNumber,
                warning: `Cartão automaticamente marcado como completo (${currentStamps}/${maxStamps} selos)`,
                data: row
              })
            }
          } else {
            // Update existing card
            const maxStamps = loyaltyCard.rules.stamps_required
            const isCompleted = currentStamps >= maxStamps
            
            const { error: updateCardError } = await supabase
              .from('customer_loyalty_cards')
              .update({
                current_stamps: Math.max(currentStamps, 0),
                status: isCompleted ? 'completed' : 'active',
                total_redeemed: isCompleted ? 1 : 0
              })
              .eq('id', existingCard.id)

            if (updateCardError) {
              result.warnings.push({
                row: rowNumber,
                warning: `Cliente criado mas atualização do cartão falhou: ${updateCardError.message}`,
                data: row
              })
            } else if (isCompleted) {
              // Add info message about auto-completion
              result.warnings.push({
                row: rowNumber,
                warning: `Cartão automaticamente marcado como completo (${currentStamps}/${maxStamps} selos)`,
                data: row
              })
            }
          }
        }

        result.successCount++

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error)
        result.errors.push({
          row: rowNumber,
          error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          data: row
        })
        result.errorCount++
      }
    }

    result.success = result.successCount > 0

    return NextResponse.json(result)

  } catch (error) {
    console.error('Import processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    )
  }
}