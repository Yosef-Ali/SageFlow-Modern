import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext, BusinessContext } from '@/app/actions/ai-actions'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

function formatCurrency(amount: number): string {
  return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildContextPrompt(context: BusinessContext): string {
  const { company, stats, topCustomers, overdueInvoices, lowStockItems, recentVendors } = context

  let contextStr = `
CURRENT BUSINESS DATA (Live from database - use this for accurate responses):
Company: ${company?.name || 'Unknown'} | Currency: ${company?.currency || 'ETB'}

KEY METRICS:
- Total Revenue (Paid): ${formatCurrency(stats.totalRevenue)}
- Pending Revenue (Outstanding): ${formatCurrency(stats.pendingRevenue)}
- Active Customers: ${stats.customerCount}
- Total Invoices: ${stats.invoiceCount}
- Overdue Invoices: ${stats.overdueCount}
- Active Vendors: ${stats.vendorCount}
- Active Employees: ${stats.employeeCount}
- Low Stock Items: ${stats.lowStockCount}
`

  if (topCustomers.length > 0) {
    contextStr += `
TOP CUSTOMERS BY BALANCE:
${topCustomers.map((c, i) => `${i + 1}. ${c.name}: ${formatCurrency(c.balance)}`).join('\n')}
`
  }

  if (overdueInvoices.length > 0) {
    contextStr += `
OVERDUE INVOICES (Need Attention):
${overdueInvoices.map(inv => `- ${inv.invoiceNumber} | ${inv.customerName} | ${formatCurrency(inv.total)} | ${inv.daysOverdue} days overdue`).join('\n')}
`
  }

  if (lowStockItems.length > 0) {
    contextStr += `
LOW STOCK ITEMS (Below Reorder Point):
${lowStockItems.map(item => `- ${item.name} (${item.sku}): ${item.quantityOnHand} on hand, reorder at ${item.reorderPoint}`).join('\n')}
`
  }

  if (recentVendors.length > 0) {
    contextStr += `
RECENT VENDORS:
${recentVendors.map(v => `- ${v.name} (${v.vendorType || 'Supplier'}): Balance ${formatCurrency(v.balance)}`).join('\n')}
`
  }

  return contextStr
}

const BASE_SYSTEM_PROMPT = `You are SageFlow AI, a helpful financial assistant for Ethiopian businesses.

Your capabilities:
- Analyze financial data and provide insights
- Answer accounting questions clearly
- Calculate Ethiopian tax requirements (15% VAT, 35% Income Tax, Pension)
- Help with invoicing and payment tracking
- Provide guidance on Ethiopian business practices
- Understand Peachtree-standard fields (Price Levels, Vendor Types, Payroll)

Your Knowledge Base Updates:
- **Vendors:** System now supports Peachtree vendor types (Supplier, Contractor, Gov), credit limits, and tax exemption settings.
- **Inventory:** We support 3 price levels (Retail, Wholesale, Distributor) and weight-based shipping.
- **Payroll:** Employee records include TIN, Pension details, Overtime rates, and bank info.
- **Invoices:** Supports Drop Ship, Ship Methods, and Sales Rep tracking.

IMPORTANT - You have access to LIVE BUSINESS DATA. When the user asks about their revenue, customers, invoices, inventory, etc., use the data provided in the context to give accurate, real answers. DO NOT make up numbers - use the actual data.

IMPORTANT - Response Format Instructions:
When your response contains structured data, use these special formats so the UI can render rich widgets:

1. For financial summaries or metrics, use this JSON block:
\`\`\`widget:stats
{"items":[{"label":"Revenue","value":"ETB 50,000","change":"+12%"},{"label":"Expenses","value":"ETB 30,000","change":"-5%"}]}
\`\`\`

2. For lists of items (invoices, customers, etc.), use:
\`\`\`widget:list
{"title":"Unpaid Invoices","items":[{"primary":"INV-001","secondary":"Abebe Corp","value":"ETB 5,000","status":"overdue"},{"primary":"INV-002","secondary":"Kebede Ltd","value":"ETB 3,500","status":"pending"}]}
\`\`\`

3. For progress or completion status:
\`\`\`widget:progress
{"label":"Monthly Target","current":75000,"target":100000,"unit":"ETB"}
\`\`\`

4. For key-value information cards:
\`\`\`widget:card
{"title":"VAT Calculation","items":[{"label":"Subtotal","value":"ETB 10,000"},{"label":"VAT (15%)","value":"ETB 1,500"},{"label":"Total","value":"ETB 11,500","highlight":true}]}
\`\`\`

5. For collecting user input (human-in-the-loop), use an input form:
\`\`\`widget:form
{"title":"Cash Flow Analysis","fields":[{"id":"inflows","label":"Total Inflows (ETB)","type":"number","placeholder":"e.g. 50000"},{"id":"outflows","label":"Total Outflows (ETB)","type":"number","placeholder":"e.g. 30000"},{"id":"period","label":"Time Period","type":"select","options":["Last Month","Last Quarter","Year to Date"]}]}
\`\`\`

6. For gauge/meter visualizations (health scores, percentages):
\`\`\`widget:gauge
{"value":75,"max":100,"label":"Collection Rate","thresholds":{"warning":60,"critical":40}}
\`\`\`

7. For compact trend lines (sparklines):
\`\`\`widget:sparkline
{"title":"Weekly Revenue","data":[12000,15000,11000,18000,22000,19000,25000],"trend":"up","currentValue":"ETB 25,000"}
\`\`\`

8. For prominent KPI cards with icons:
\`\`\`widget:kpicard
{"icon":"dollar","label":"Total Revenue","value":"ETB 150,000","trend":{"value":"+12%","direction":"up"},"color":"green"}
\`\`\`
Icons: dollar, users, package, alert, trending

9. For distribution/breakdown visualizations:
\`\`\`widget:distribution
{"title":"Expense Breakdown","items":[{"label":"Salaries","value":45000,"color":"#3b82f6"},{"label":"Rent","value":20000,"color":"#10b981"},{"label":"Supplies","value":15000,"color":"#f59e0b"}]}
\`\`\`

Guidelines:
- Be concise and professional
- Use ETB (Ethiopian Birr) for currency
- Use the 15% VAT rate for Ethiopia
- Format numbers with commas
- Use widgets when displaying structured data like calculations, lists, or summaries
- For simple text responses, just respond normally without widgets
- You can mix text and widgets in the same response
- USE THE LIVE DATA PROVIDED - do not invent numbers

Keep responses helpful, accurate, and tailored to Ethiopian business needs.`

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Fetch real business context
    let systemPrompt = BASE_SYSTEM_PROMPT
    try {
      const contextResult = await getBusinessContext()
      if (contextResult.success && contextResult.data) {
        const contextPrompt = buildContextPrompt(contextResult.data)
        systemPrompt = BASE_SYSTEM_PROMPT + '\n\n' + contextPrompt
      }
    } catch (contextError) {
      console.warn('Failed to fetch business context, proceeding without it:', contextError)
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemPrompt
    })

    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    const chat = model.startChat({ history })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response.text()

    return NextResponse.json({ content: response })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Chat API error:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to generate response', details: errorMessage },
      { status: 500 }
    )
  }
}
