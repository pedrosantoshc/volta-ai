'use client'

import { useState, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Clock, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ImportError {
  row: number
  error: string
  data: any
}

interface ImportWarning {
  row: number
  warning: string
  data: any
}

interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  errors: ImportError[]
  warnings: ImportWarning[]
}

export default function ImportarClientes() {
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [businessConsentConfirmed, setBusinessConsentConfirmed] = useState(false)
  const router = useRouter()

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true)
      const response = await fetch('/api/customers/import/template')
      
      if (!response.ok) {
        throw new Error('Falha ao gerar template')
      }

      // Get the filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 'template-importacao-clientes.xlsx'

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading template:', error)
      alert('Erro ao baixar template. Tente novamente.')
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        return
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > maxSize) {
        alert('Arquivo muito grande. O tamanho máximo permitido é 10MB.')
        return
      }
      
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Por favor, selecione um arquivo primeiro')
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('business_consent_confirmed', businessConsentConfirmed.toString())
      formData.append('consent_source', 'import_crm_existing')

      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar importação')
      }

      setImportResult(result)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Redirect to customers page after successful import
      if (result.success && result.errorCount === 0) {
        setTimeout(() => {
          router.push('/dashboard/clientes')
        }, 2000) // Wait 2 seconds to show success message
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erro ao processar arquivo. Verifique o formato e tente novamente.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        return
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > maxSize) {
        alert('Arquivo muito grande. O tamanho máximo permitido é 10MB.')
        return
      }
      
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Importar Clientes</h1>
          <p className="text-gray-600">
            Importe sua base de clientes existente usando nosso template Excel
          </p>
        </div>

        {/* Step 1: Download Template */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Baixar Template</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Baixe o template Excel com as colunas pré-configuradas e os cartões fidelidade da sua empresa.
          </p>
          
          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            {isDownloadingTemplate ? (
              <Clock className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {isDownloadingTemplate ? 'Gerando Template...' : 'Baixar Template Excel'}
          </button>
        </div>

        {/* Step 2: Upload File */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Enviar Arquivo</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Preencha o template com os dados dos seus clientes e envie o arquivo para importação.
          </p>

          {/* LGPD Business Consent Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-2">Declaração de Conformidade LGPD</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Ao importar dados de clientes, você declara que:
                </p>
                <ul className="text-sm text-amber-700 space-y-1 mb-4">
                  <li>• Possui base legal válida para o tratamento destes dados</li>
                  <li>• Os clientes forneceram consentimento apropriado em seu sistema/CRM</li>
                  <li>• Está em conformidade com os requisitos da LGPD</li>
                  <li>• É responsável pela validade dos consentimentos importados</li>
                </ul>
                
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={businessConsentConfirmed}
                    onChange={(e) => setBusinessConsentConfirmed(e.target.checked)}
                    className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-800 font-medium">
                    Confirmo que todas as informações dos clientes foram obtidas com o devido consentimento 
                    e que possuo base legal para seu tratamento conforme a LGPD.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors ${
              selectedFile ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Arraste seu arquivo aqui ou clique para selecionar
                </p>
                <p className="text-gray-600 mb-4">Arquivos Excel (.xlsx, .xls) até 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-colors"
                >
                  Selecionar Arquivo
                </button>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="mt-4">
              {!businessConsentConfirmed && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Você deve confirmar a declaração de conformidade LGPD antes de importar.
                  </p>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !businessConsentConfirmed}
                  className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
                    businessConsentConfirmed 
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isUploading ? (
                    <Clock className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {isUploading ? 'Processando...' : 'Importar Clientes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Results */}
        {importResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Resultados da Importação</h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Total de Linhas</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{importResult.totalRows}</span>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Importados</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{importResult.successCount}</span>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Erros</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{importResult.errorCount}</span>
              </div>
            </div>

            {/* Warnings */}
            {importResult.warnings.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Avisos ({importResult.warnings.length})
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {importResult.warnings.map((warning, index) => (
                    <div key={index} className="mb-2 last:mb-0">
                      <span className="font-medium text-yellow-800">Linha {warning.row}:</span>
                      <span className="text-yellow-700 ml-2">{warning.warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Erros ({importResult.errors.length})
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="mb-2 last:mb-0">
                      <span className="font-medium text-red-800">Linha {error.row}:</span>
                      <span className="text-red-700 ml-2">{error.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Message */}
            {importResult.success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Importação concluída com sucesso! {importResult.successCount} cliente(s) importado(s).
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Instruções de Preenchimento</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>nome:</strong> Nome completo do cliente (obrigatório)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>telefone:</strong> Telefone no formato +5511999887766 (obrigatório)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>tem_cartao:</strong> SIM se o cliente já possui cartão, NÃO caso contrário</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>nome_cartao:</strong> Selecione o cartão nas opções disponíveis</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>selos_atuais:</strong> Número de selos (máximo conforme configuração do cartão)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}