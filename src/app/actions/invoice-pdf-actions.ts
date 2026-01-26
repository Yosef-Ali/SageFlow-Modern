import type { ActionResult } from "@/types/api"
import type { InvoicePDFData } from "@/components/invoices/invoice-pdf"

export async function getInvoiceForPDF(id: string): Promise<ActionResult<InvoicePDFData>> {
  return { success: false, error: "Not implemented" };
}
