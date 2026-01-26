import type { ActionResult } from "@/types/api"
import type { InvoicePDFData } from "@/components/invoices/invoice-pdf"
import { supabase } from "@/lib/supabase"

export async function getInvoiceForPDF(id: string): Promise<ActionResult<InvoicePDFData>> {
  try {
    // Fetch invoice with customer
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) throw new Error('Invoice not found')

    // Fetch customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', invoice.customer_id)
      .single()

    if (customerError) throw customerError
    if (!customer) throw new Error('Customer not found')

    // Fetch invoice items with item details
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)

    if (itemsError) throw itemsError

    // Fetch item details for each item
    const itemsWithDetails = await Promise.all(
      (items || []).map(async (item: any) => {
        if (item.item_id) {
          const { data: itemDetail } = await supabase
            .from('items')
            .select('name, sku')
            .eq('id', item.item_id)
            .single()

          return {
            id: item.id,
            description: item.description || '',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            taxRate: item.tax_rate || 0,
            total: item.total,
            item: itemDetail ? { name: itemDetail.name, sku: itemDetail.sku } : null
          }
        }

        return {
          id: item.id,
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate || 0,
          total: item.total,
          item: null
        }
      })
    )

    // Fetch company info (use first company or default)
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
      .single()

    const pdfData: InvoicePDFData = {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number || '',
        date: invoice.date,
        dueDate: invoice.due_date,
        subtotal: invoice.subtotal || 0,
        taxAmount: invoice.tax_amount || 0,
        discountAmount: invoice.discount_amount || 0,
        total: invoice.total || 0,
        paidAmount: invoice.paid_amount || 0,
        status: invoice.status || 'DRAFT',
        notes: invoice.notes,
        terms: invoice.terms
      },
      items: itemsWithDetails,
      customer: {
        name: customer.name || '',
        email: customer.email,
        phone: customer.phone,
        billingAddress: customer.billing_address
      },
      company: {
        name: company?.name || 'SageFlow Modern',
        email: company?.email || 'info@sageflow.com',
        phone: company?.phone,
        address: company?.address,
        taxId: company?.tax_id
      }
    }

    return { success: true, data: pdfData }
  } catch (error: any) {
    console.error("Error fetching invoice for PDF:", error)
    return { success: false, error: error.message || "Failed to fetch invoice data" }
  }
}
