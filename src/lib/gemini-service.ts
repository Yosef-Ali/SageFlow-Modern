import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from './env'

// Initialize Gemini AI
const genAI = env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(env.GEMINI_API_KEY)
  : null

/**
 * Chat with AI Assistant about accounting and business queries
 */
export async function chatWithAI(
  message: string,
  context?: {
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    companyContext?: string
    financialData?: any
  }
): Promise<{ response: string; error?: string }> {
  try {
    if (!genAI) {
      return {
        response: '',
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Build context-aware prompt
    let prompt = `You are an AI assistant for SageFlow, an accounting software designed for Ethiopian businesses.
You help users with:
- Understanding their financial data
- Answering accounting questions
- Providing insights on invoices, payments, and expenses
- Helping with Ethiopian business tax and VAT (15%)
- Currency conversions and ETB calculations

`

    if (context?.companyContext) {
      prompt += `\nCompany Context: ${context.companyContext}\n`
    }

    if (context?.financialData) {
      prompt += `\nFinancial Data: ${JSON.stringify(context.financialData, null, 2)}\n`
    }

    if (context?.conversationHistory && context.conversationHistory.length > 0) {
      prompt += '\nConversation History:\n'
      context.conversationHistory.forEach((msg) => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
      })
    }

    prompt += `\nUser Question: ${message}\n\nProvide a helpful, concise response:`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return { response }
  } catch (error) {
    console.error('Gemini AI error:', error)
    return {
      response: '',
      error: error instanceof Error ? error.message : 'Failed to get AI response',
    }
  }
}

/**
 * Auto-scan and extract data from invoice/receipt images or text
 */
export async function autoScanInvoice(
  imageData: string | Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{
  success: boolean
  data?: {
    invoiceNumber?: string
    date?: string
    dueDate?: string
    customerName?: string
    items?: Array<{
      description: string
      quantity: number
      unitPrice: number
      total: number
    }>
    subtotal?: number
    taxAmount?: number
    taxRate?: number
    total?: number
    currency?: string
  }
  error?: string
}> {
  try {
    if (!genAI) {
      return {
        success: false,
        error: 'Gemini API key not configured',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are an AI that extracts structured data from invoice and receipt images.
Extract the following information from this invoice/receipt:

1. Invoice Number
2. Invoice Date
3. Due Date
4. Customer Name
5. Line Items (description, quantity, unit price, total)
6. Subtotal
7. Tax Amount and Tax Rate (Ethiopian VAT is typically 15%)
8. Total Amount
9. Currency (default to ETB if not specified)

Return the data in this exact JSON format:
{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "customerName": "string or null",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ],
  "subtotal": number or null,
  "taxAmount": number or null,
  "taxRate": number or null (e.g., 15 for 15%),
  "total": number or null,
  "currency": "ETB or other"
}

Only return valid JSON, no additional text.`

    const imagePart = {
      inlineData: {
        data: typeof imageData === 'string' ? imageData : imageData.toString('base64'),
        mimeType,
      },
    }

    const result = await model.generateContent([prompt, imagePart])
    const responseText = result.response.text()

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Could not parse invoice data from image',
      }
    }

    const extractedData = JSON.parse(jsonMatch[0])

    return {
      success: true,
      data: extractedData,
    }
  } catch (error) {
    console.error('Auto-scan error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan invoice',
    }
  }
}

/**
 * Get financial insights and recommendations
 */
export async function getFinancialInsights(financialData: {
  revenue?: number
  expenses?: number
  profit?: number
  outstandingInvoices?: number
  overdueInvoices?: number
  topCustomers?: Array<{ name: string; total: number }>
}): Promise<{ insights: string; error?: string }> {
  try {
    if (!genAI) {
      return {
        insights: '',
        error: 'Gemini API key not configured',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Analyze this financial data for an Ethiopian business and provide actionable insights and recommendations:

${JSON.stringify(financialData, null, 2)}

Provide:
1. Key observations about the financial health
2. Areas of concern (if any)
3. Actionable recommendations
4. Cash flow insights

Keep the response concise (3-5 bullet points).`

    const result = await model.generateContent(prompt)
    const insights = result.response.text()

    return { insights }
  } catch (error) {
    console.error('Financial insights error:', error)
    return {
      insights: '',
      error: error instanceof Error ? error.message : 'Failed to generate insights',
    }
  }
}
