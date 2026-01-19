import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, validateWebhookSignature, type ChapaWebhookPayload } from '@/lib/chapa'
import { db } from '@/db'
import { invoices, payments, customers } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

/**
 * Chapa Webhook Handler
 * Receives payment notifications from Chapa and processes them
 *
 * POST /api/payments/chapa/callback
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('Chapa-Signature') || ''

    // Validate webhook signature (optional but recommended)
    // Note: Implement proper HMAC validation in production
    if (process.env.NODE_ENV === 'production' && !validateWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the webhook payload
    const payload: ChapaWebhookPayload = JSON.parse(body)

    console.log('Chapa webhook received:', {
      event: payload.event,
      txRef: payload.tx_ref,
      status: payload.status,
      amount: payload.amount,
    })

    // Only process successful payments
    if (payload.event !== 'charge.success' || payload.status !== 'success') {
      console.log('Payment not successful, skipping:', payload.status)
      return NextResponse.json({ received: true, processed: false })
    }

    const txRef = payload.tx_ref

    // Check if payment already recorded (prevent duplicates)
    const existingPayment = await db.query.payments.findFirst({
      where: eq(payments.reference, txRef),
    })

    if (existingPayment) {
      console.log('Payment already recorded:', txRef)
      return NextResponse.json({ received: true, processed: true, duplicate: true })
    }

    // Extract invoice info from metadata or tx_ref
    const meta = payload.meta as { invoiceId?: string; companyId?: string; customerId?: string } | null

    let invoice
    if (meta?.invoiceId) {
      invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, meta.invoiceId),
      })
    }

    // If no invoice found via meta, try parsing tx_ref
    if (!invoice && txRef.startsWith('INV-')) {
      const invoiceNumber = txRef.split('-').slice(1, -1).join('-')
      invoice = await db.query.invoices.findFirst({
        where: eq(invoices.invoiceNumber, invoiceNumber),
      })
    }

    if (!invoice) {
      console.error('Invoice not found for tx_ref:', txRef)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Record payment in database
    await db.transaction(async (tx) => {
      // Create payment record
      await tx.insert(payments).values({
        companyId: invoice.companyId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        amount: String(payload.amount),
        paymentDate: new Date(),
        paymentMethod: 'chapa',
        reference: txRef,
        notes: `Chapa payment via ${payload.method || 'mobile money'}. Reference: ${payload.reference}`,
      })

      // Update invoice paid amount and status
      const newPaidAmount = Number(invoice.paidAmount) + payload.amount
      const total = Number(invoice.total)
      const newStatus = newPaidAmount >= total ? 'PAID' : 'PARTIALLY_PAID'

      await tx
        .update(invoices)
        .set({
          paidAmount: String(newPaidAmount),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id))

      // Update customer balance
      await tx
        .update(customers)
        .set({
          balance: sql`${customers.balance} - ${payload.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, invoice.customerId))
    })

    console.log('Payment recorded successfully:', {
      txRef,
      invoiceId: invoice.id,
      amount: payload.amount,
    })

    return NextResponse.json({
      received: true,
      processed: true,
      invoiceId: invoice.id,
    })
  } catch (error) {
    console.error('Chapa webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET handler for return URL
 * When customer completes payment and is redirected back
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const txRef = searchParams.get('trx_ref') || searchParams.get('tx_ref')
  const status = searchParams.get('status')

  if (!txRef) {
    return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 })
  }

  try {
    // Verify the payment with Chapa
    const verifyResult = await verifyPayment(txRef)

    if (!verifyResult.success || !verifyResult.data) {
      return NextResponse.json({
        success: false,
        error: verifyResult.error || 'Payment verification failed',
      })
    }

    return NextResponse.json({
      success: true,
      status: verifyResult.data.status,
      amount: verifyResult.data.amount,
      method: verifyResult.data.method,
      reference: verifyResult.data.reference,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
