import type { ActionResult } from "@/types/api"

export async function createPaymentLink(invoiceId: string): Promise<ActionResult<{ checkoutUrl: string }>> {
  return { success: false, error: "Not implemented" };
}
