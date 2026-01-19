import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

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
  pdfBuffer?: Buffer
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
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'Email service not configured. Please set RESEND_API_KEY.',
      }
    }

    const attachments = data.pdfBuffer
      ? [
          {
            filename: `${data.invoiceNumber}.pdf`,
            content: data.pdfBuffer,
          },
        ]
      : []

    const { data: result, error } = await resend.emails.send({
      from: `${data.companyName} <invoices@${getDomain()}>`,
      to: data.to,
      subject: `Invoice ${data.invoiceNumber} from ${data.companyName}`,
      html: generateInvoiceEmailHtml(data),
      attachments,
    })

    if (error) {
      console.error('Email send error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      messageId: result?.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send a payment reminder email
 */
export async function sendPaymentReminder(data: PaymentReminderData): Promise<EmailResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'Email service not configured. Please set RESEND_API_KEY.',
      }
    }

    const { data: result, error } = await resend.emails.send({
      from: `${data.companyName} <invoices@${getDomain()}>`,
      to: data.to,
      subject: `Payment Reminder: Invoice ${data.invoiceNumber} is ${data.daysOverdue} days overdue`,
      html: generatePaymentReminderHtml(data),
    })

    if (error) {
      console.error('Email send error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      messageId: result?.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Get the email domain - in development use resend.dev
 */
function getDomain(): string {
  // In production, you would use your verified domain
  // For development/testing, use resend.dev
  return process.env.NODE_ENV === 'production'
    ? (process.env.EMAIL_DOMAIN || 'resend.dev')
    : 'resend.dev'
}

/**
 * Generate HTML for invoice email
 */
function generateInvoiceEmailHtml(data: InvoiceEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f766e; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${data.companyName}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                Dear ${data.customerName},
              </p>

              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.5;">
                Please find attached your invoice from ${data.companyName}.
              </p>

              <!-- Invoice Details Box -->
              <table role="presentation" style="width: 100%; background-color: #f8fafc; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Invoice Number</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                          <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${data.invoiceNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Amount Due</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                          <span style="color: #0f766e; font-size: 18px; font-weight: 700;">${data.amount}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 14px;">Due Date</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${data.dueDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.5;">
                The invoice PDF is attached to this email for your records. Please ensure payment is made by the due date.
              </p>

              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.5;">
                If you have any questions about this invoice, please don't hesitate to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 5px; color: #64748b; font-size: 14px; text-align: center;">
                Thank you for your business!
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                ${data.companyName} | ${data.companyEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate HTML for payment reminder email
 */
function generatePaymentReminderHtml(data: PaymentReminderData): string {
  const urgencyColor = data.daysOverdue > 30 ? '#dc2626' : data.daysOverdue > 14 ? '#ea580c' : '#eab308'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder - Invoice ${data.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Payment Reminder
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                Dear ${data.customerName},
              </p>

              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.5;">
                This is a friendly reminder that your invoice is now <strong style="color: ${urgencyColor};">${data.daysOverdue} days overdue</strong>.
              </p>

              <!-- Invoice Details Box -->
              <table role="presentation" style="width: 100%; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          <span style="color: #64748b; font-size: 14px;">Invoice Number</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right;">
                          <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${data.invoiceNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                          <span style="color: #64748b; font-size: 14px;">Amount Due</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right;">
                          <span style="color: #dc2626; font-size: 18px; font-weight: 700;">${data.amount}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 14px;">Original Due Date</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${data.dueDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.5;">
                Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this reminder.
              </p>

              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.5;">
                If you have any questions or concerns, please contact us immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 5px; color: #64748b; font-size: 14px; text-align: center;">
                ${data.companyName}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                ${data.companyEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
