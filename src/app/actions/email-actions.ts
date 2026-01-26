import type { ActionResult } from "@/types/api"

export async function sendInvoiceEmailAction(invoiceId: string, attachPdf: boolean = true): Promise<ActionResult<void>> {
  console.warn("sendInvoiceEmailAction not implemented (Stub)");
  return { success: true };
}

export async function sendPaymentReminderAction(invoiceId: string): Promise<ActionResult<void>> {
  console.warn("sendPaymentReminderAction not implemented (Stub)");
  return { success: true };
}
