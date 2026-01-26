import { z } from 'zod';

export const purchaseOrderStatusSchema = z.enum(['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED']);
export const billStatusSchema = z.enum(['OPEN', 'PAID', 'OVERDUE', 'PARTIALLY_PAID']);

// --- Purchase Order Schemas ---

export const purchaseOrderItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  description: z.string().optional(),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitCost: z.number().min(0, 'Unit cost must be positive'),
});

export const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  date: z.date({ required_error: 'Date is required' }),
  expectedDate: z.date().optional().nullable(),
  status: purchaseOrderStatusSchema,
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export type PurchaseFormValues = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderFormValues = PurchaseFormValues;

// --- Bill Schemas ---

export const billSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  poId: z.string().optional().nullable(),
  billNumber: z.string().min(1, 'Bill number is required'),
  date: z.date({ required_error: 'Date is required' }),
  dueDate: z.date({ required_error: 'Due date is required' }),
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  status: billStatusSchema,
  notes: z.string().optional(),
});

export type BillFormValues = z.infer<typeof billSchema>;

// --- Bill Payment Schemas ---

export const billPaymentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  billId: z.string().optional().nullable(), // Optional for unapplied payments/prepayments
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.date({ required_error: 'Payment date is required' }),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type BillPaymentFormValues = z.infer<typeof billPaymentSchema>;


// --- Helper Functions ---

export function calculatePOTotals(items: z.infer<typeof purchaseOrderItemSchema>[]) {
  const total = items.reduce((acc, item) => {
    return acc + (item.quantity * item.unitCost);
  }, 0);

  return { total };
}
