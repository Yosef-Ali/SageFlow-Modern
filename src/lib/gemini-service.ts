import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from './env'

// Storage key for settings (same as settings-actions.ts)
const SETTINGS_KEY = 'sageflow_settings'

/**
 * Get Gemini API key from localStorage or environment variables
 * Priority: localStorage (user-provided) > environment variable
 */
export function getGeminiApiKey(): string | null {
  // First check localStorage for user-provided key
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const settings = JSON.parse(stored)
      if (settings.apiKeys?.geminiApiKey) {
        return settings.apiKeys.geminiApiKey
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  // Fall back to environment variable
  return env.VITE_GEMINI_API_KEY || null
}

/**
 * Get GoogleGenerativeAI instance with current API key
 * Creates new instance each time to pick up updated keys from localStorage
 */
function getGenAI(): GoogleGenerativeAI | null {
  const apiKey = getGeminiApiKey()
  if (!apiKey) return null
  return new GoogleGenerativeAI(apiKey)
}

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
    const genAI = getGenAI()
    if (!genAI) {
      return {
        response: '',
        error: 'Gemini API key not configured. Please go to Settings → API Keys to add your Gemini API key.',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    // Build context-aware prompt with A2-UI widget support
    let prompt = `You are an AI assistant for SageFlow, an accounting software designed for Ethiopian businesses.
You help users with:
- Understanding their financial data
- Answering accounting questions
- Providing insights on invoices, payments, and expenses
- Helping with Ethiopian business tax and VAT (15%)
- Currency conversions and ETB calculations

## A2-UI WIDGET RESPONSES - MANDATORY
You MUST use A2-UI widgets to display data. Never show raw numbers or lists as plain text.
ALWAYS wrap financial data, metrics, lists, and calculations in widget blocks.

### Available Widgets (USE THESE FOR EVERY RESPONSE WITH DATA):

1. **Stats** - Show key metrics:
\`\`\`widget:stats
{"items": [{"label": "Revenue", "value": "ETB 50,000", "change": "+12%"}, {"label": "Expenses", "value": "ETB 30,000", "change": "-5%"}]}
\`\`\`

2. **List** - Show items with status:
\`\`\`widget:list
{"title": "Recent Invoices", "items": [{"primary": "INV-001", "secondary": "Abebe Corp", "value": "ETB 5,000", "status": "paid"}, {"primary": "INV-002", "secondary": "Kebede Ltd", "value": "ETB 3,000", "status": "pending"}]}
\`\`\`

3. **Progress** - Show progress towards goal:
\`\`\`widget:progress
{"label": "Monthly Target", "current": 75000, "target": 100000, "unit": "ETB "}
\`\`\`

4. **Card** - Show calculation breakdown:
\`\`\`widget:card
{"title": "VAT Calculation", "items": [{"label": "Subtotal", "value": "ETB 10,000"}, {"label": "VAT (15%)", "value": "ETB 1,500"}, {"label": "Total", "value": "ETB 11,500", "highlight": true}]}
\`\`\`

5. **Chart** - Show bar, pie, or line charts:
\`\`\`widget:chart
{"chartType": "pie", "title": "Expenses by Category", "data": [{"name": "Rent", "value": 5000}, {"name": "Salaries", "value": 15000}, {"name": "Supplies", "value": 3000}]}
\`\`\`

6. **Table** - Show tabular data:
\`\`\`widget:table
{"title": "Top Customers", "headers": ["Customer", "Total", "Status"], "rows": [{"Customer": "ABC Corp", "Total": "ETB 25,000", "Status": "Active"}]}
\`\`\`

7. **Alert** - Show important messages (variant: info, success, warning, error):
\`\`\`widget:alert
{"variant": "warning", "title": "Attention", "message": "You have 3 overdue invoices totaling ETB 15,000"}
\`\`\`

8. **Metric** - Show single important metric:
\`\`\`widget:metric
{"value": "ETB 125,000", "label": "Total Revenue", "trend": "up", "trendValue": "+15%"}
\`\`\`

9. **KPI Card** - Show KPI with icon (icon: dollar, users, package, alert, trending):
\`\`\`widget:kpicard
{"icon": "dollar", "label": "Net Profit", "value": "ETB 45,000", "trend": {"value": "+8%", "direction": "up"}, "color": "green"}
\`\`\`

10. **Distribution** - Show breakdown with bars:
\`\`\`widget:distribution
{"title": "Revenue Sources", "items": [{"label": "Products", "value": 60000}, {"label": "Services", "value": 40000}]}
\`\`\`

## CRITICAL RULES:
1. ALWAYS use widgets in EVERY response - no exceptions
2. Keep text VERY SHORT - max 1-2 sentences before widgets
3. For financial summaries → use stats or kpicard widgets
4. For lists → use list or table widgets
5. For calculations → use card widget
6. For warnings/no data → use alert widget
7. For charts → use chart or distribution widgets
8. JSON must be valid - double quotes, no trailing commas
9. NO markdown formatting (**bold**, *italic*) - plain text only
10. If no data available, show alert widget with info variant
11. Response format: Short intro (1 line) → Widget(s) → Optional 1-line note

Example for no data:
Short intro here.
\`\`\`widget:alert
{"variant": "info", "title": "No Data", "message": "No payment records found. Start by creating invoices and recording payments."}
\`\`\`

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

    prompt += `\nUser Question: ${message}\n\nRespond with: 1 short sentence + widget(s). Keep it concise:`

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
    const genAI = getGenAI()
    if (!genAI) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please go to Settings → API Keys to add your Gemini API key.',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

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
  "taxRate": number or null (Ethiopian VAT is 0.15 for 15%),
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
    const genAI = getGenAI()
    if (!genAI) {
      return {
        insights: '',
        error: 'Gemini API key not configured. Please go to Settings → API Keys to add your Gemini API key.',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

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

/**
 * Auto-scan and extract data from payment receipt images
 */
export async function autoScanPayment(
  imageData: string | Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{
  success: boolean
  data?: {
    amount?: number
    paymentDate?: string
    paymentMethod?: string
    customerName?: string
    reference?: string
    notes?: string
    currency?: string
  }
  error?: string
}> {
  try {
    const genAI = getGenAI()
    if (!genAI) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please go to Settings → API Keys to add your Gemini API key.',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    const prompt = `You are an AI that extracts structured data from payment receipts and bank transfer confirmations.
Extract the following information from this payment receipt/confirmation:

1. Payment Amount
2. Payment Date
3. Payment Method (one of: cash, bank_transfer, chapa, check, credit_card)
4. Customer/Payer Name
5. Transaction Reference or Receipt Number
6. Any notes or memo
7. Currency (default to ETB if not specified)

Return the data in this exact JSON format:
{
  "amount": number or null,
  "paymentDate": "YYYY-MM-DD or null",
  "paymentMethod": "cash" | "bank_transfer" | "chapa" | "check" | "credit_card" | null,
  "customerName": "string or null",
  "reference": "string or null",
  "notes": "string or null",
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
        error: 'Could not parse payment data from image',
      }
    }

    const extractedData = JSON.parse(jsonMatch[0])

    return {
      success: true,
      data: extractedData,
    }
  } catch (error) {
    console.error('Auto-scan payment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan payment receipt',
    }
  }
}

/**
 * Auto-scan and extract data from vendor documents (cards, letterheads, etc.)
 */
export async function autoScanVendor(
  imageData: string | Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{
  success: boolean
  data?: {
    name?: string
    taxId?: string
    email?: string
    phone?: string
    address?: string
    contactName?: string
    website?: string
  }
  error?: string
}> {
  try {
    const genAI = getGenAI()
    if (!genAI) {
      return {
        success: false,
        error: 'Gemini API key not configured',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    const prompt = `You are an AI that extracts vendor business information from images (business cards, letterheads, invoices).
Extract the following information:

1. Vendor/Company Name
2. Tax ID (TIN / VAT Number)
3. Email Address
4. Phone Number
5. Business Address
6. Contact Person Name (if applicable)
7. Website URL

Return the data in this exact JSON format:
{
  "name": "string or null",
  "taxId": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "address": "string or null",
  "contactName": "string or null",
  "website": "string or null"
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
    const jsonMatch = responseText.match(/\\{[\\s\\S]*\\}/)
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse vendor data' }
    }

    const extractedData = JSON.parse(jsonMatch[0])
    return { success: true, data: extractedData }

  } catch (error) {
    console.error('Auto-scan vendor error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan vendor document',
    }
  }
}

/**
 * Auto-scan and extract data from purchase orders / quotes
 */
export async function autoScanPurchaseOrder(
  imageData: string | Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{
  success: boolean
  data?: {
    vendorName?: string
    poNumber?: string
    date?: string
    expectedDate?: string
    items?: Array<{
      description: string
      quantity: number
      unitCost: number
      total: number
    }>
    subtotal?: number
    taxAmount?: number
    totalAmount?: number
    currency?: string
  }
  error?: string
}> {
  try {
    const genAI = getGenAI()
    if (!genAI) {
      return {
        success: false,
        error: 'Gemini API key not configured',
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    const prompt = `You are an AI that extracts data from purchase orders, proforma invoices, or vendor quotes.
Extract the following:

1. Vendor Name
2. Reference/Quote/PO Number
3. Date
4. Expected Delivery Date (if available)
5. Line Items (description, quantity, unit cost, total)
6. Subtotal
7. Tax Amount
8. Total Amount
9. Currency (default to ETB)

Return the data in this exact JSON format:
{
  "vendorName": "string or null",
  "poNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "expectedDate": "YYYY-MM-DD or null",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitCost": number,
      "total": number
    }
  ],
  "subtotal": number or null,
  "taxAmount": number or null,
  "totalAmount": number or null,
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
    const jsonMatch = responseText.match(/\\{[\\s\\S]*\\}/)
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse PO data' }
    }

    const extractedData = JSON.parse(jsonMatch[0])
    return { success: true, data: extractedData }

  } catch (error) {
    console.error('Auto-scan PO error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan purchase order',
    }
  }
}
