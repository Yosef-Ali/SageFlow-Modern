/**
 * AI Actions - Placeholder for AI-powered features
 * TODO: Implement with Gemini/OpenAI when API keys are configured
 */

import type { ActionResult } from "@/types/api"

/**
 * Scan a payment receipt image and extract data
 */
export async function scanPaymentImage(
  imageBase64: string,
  mimeType?: string
): Promise<ActionResult<{
  amount?: number
  date?: string
  reference?: string
  paymentMethod?: string
  description?: string
  confidence?: number
}>> {
  // TODO: Implement with Gemini Vision API
  console.log('AI payment scan not yet implemented')
  return {
    success: false,
    error: 'AI payment scanning is not yet configured. Please add your Gemini API key in Settings.'
  }
}

/**
 * Generate invoice description from items
 */
export async function generateInvoiceDescription(
  items: Array<{ name: string; quantity: number }>
): Promise<ActionResult<string>> {
  // TODO: Implement with Gemini
  const itemList = items.map(i => `${i.quantity}x ${i.name}`).join(', ')
  return {
    success: true,
    data: `Invoice for: ${itemList}`
  }
}

/**
 * Categorize a transaction
 */
export async function categorizeTransaction(
  description: string
): Promise<ActionResult<string>> {
  // Simple rule-based categorization as fallback
  const lower = description.toLowerCase()

  if (lower.includes('salary') || lower.includes('payroll')) return { success: true, data: 'Payroll' }
  if (lower.includes('rent') || lower.includes('lease')) return { success: true, data: 'Rent' }
  if (lower.includes('utility') || lower.includes('electric') || lower.includes('water')) return { success: true, data: 'Utilities' }
  if (lower.includes('office') || lower.includes('supply')) return { success: true, data: 'Office Supplies' }
  if (lower.includes('travel') || lower.includes('transport')) return { success: true, data: 'Travel' }
  if (lower.includes('food') || lower.includes('meal')) return { success: true, data: 'Meals' }

  return { success: true, data: 'Uncategorized' }
}
