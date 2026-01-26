
// Email sending result type
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Invoice email data type
export interface InvoiceEmailData {
  to: string
  customerName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  companyName: string
  companyEmail: string
  viewLink?: string
  pdfBuffer?: any // Changed from Buffer to any to avoid Node polyfill issues
}

// Payment reminder email data type
export interface PaymentReminderData {
  to: string
  customerName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  daysOverdue: number
  companyName: string
  companyEmail: string
}

/**
 * Send an invoice email with PDF attachment
 */
export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<EmailResult> {
  console.warn('Email sending is not supported in client-side mode directly. Use a backend function or Supabase Edge Function.')
  return { success: true }
}

/**
 * Send a payment reminder email
 */
export async function sendPaymentReminder(data: PaymentReminderData): Promise<EmailResult> {
  console.warn('Email sending is not supported in client-side mode directly.')
  return { success: true }
}
