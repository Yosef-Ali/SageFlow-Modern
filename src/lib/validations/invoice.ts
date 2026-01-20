import { z } from "zod"

// Ethiopian VAT rate (15%)
export const ETHIOPIAN_VAT_RATE = 0.15

// Invoice line item schema
export const invoiceItemSchema = z.object({
  id: z.string().optional(), // For existing items during edit
  itemId: z.string().optional(), // Reference to inventory item (optional)
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  taxRate: z.number().min(0).max(1).default(ETHIOPIAN_VAT_RATE),
})

// Main invoice schema
export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.date({ required_error: "Invoice date is required" }),
  dueDate: z.date({ required_error: "Due date is required" }),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]).default("DRAFT"),
  // Peachtree-standard fields
  salesRepId: z.string().optional(),
  poNumber: z.string().optional(),
  shipMethod: z.string().optional(),
  shipDate: z.date().optional().nullable(),
  dropShip: z.boolean().default(false),
  // We can add shipAddress validation later if needed structure is complex, 
  // for now keep it simple or omitted from form validation if handled separately
})

// Invoice filters schema
export const invoiceFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "all"]).optional(),
  customerId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  sortBy: z.enum(["invoiceNumber", "date", "dueDate", "total", "status", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// Type exports
export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>
export type InvoiceFormValues = z.infer<typeof invoiceSchema>
export type InvoiceFiltersValues = z.infer<typeof invoiceFiltersSchema>

// Helper to calculate line item total
export function calculateLineItemTotal(quantity: number, unitPrice: number, taxRate: number = ETHIOPIAN_VAT_RATE): {
  subtotal: number
  tax: number
  total: number
} {
  const subtotal = quantity * unitPrice
  const tax = subtotal * taxRate
  const total = subtotal + tax
  return { subtotal, tax, total }
}

// Helper to calculate invoice totals
export function calculateInvoiceTotals(items: InvoiceItemFormValues[]): {
  subtotal: number
  taxAmount: number
  total: number
} {
  let subtotal = 0
  let taxAmount = 0

  for (const item of items) {
    const lineSubtotal = item.quantity * item.unitPrice
    const lineTax = lineSubtotal * (item.taxRate ?? ETHIOPIAN_VAT_RATE)
    subtotal += lineSubtotal
    taxAmount += lineTax
  }

  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  }
}
