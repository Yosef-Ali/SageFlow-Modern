'use server'

import { db } from '@/db'
import {
  purchaseOrders, purchaseOrderItems, bills, billPayments, vendors, items, stockMovements,
  PurchaseOrderStatus, BillStatus
} from '@/db/schema'
import { eq, and, or, ilike, gte, lte, desc, asc, count, sql } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  purchaseOrderSchema,
  billSchema,
  billPaymentSchema,
  calculatePOTotals,
  type PurchaseFormValues,
  type BillFormValues,
  type BillPaymentFormValues,
} from '@/lib/validations/purchase'
import { revalidatePath } from 'next/cache'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Generate next PO number
 */
async function generatePONumber(companyId: string): Promise<string> {
  const lastPO = await db.query.purchaseOrders.findFirst({
    where: eq(purchaseOrders.companyId, companyId),
    orderBy: desc(purchaseOrders.poNumber),
    columns: { poNumber: true },
  })

  if (!lastPO) return 'PO-001'
  const lastNumber = parseInt(lastPO.poNumber.split('-')[1] || '0', 10)
  return `PO-${String(lastNumber + 1).padStart(3, '0')}`
}

/**
 * Generate next Bill number (internal ref, though usually we use Vendor's Inv #)
 * But for internal tracking let's have a fallback or just use what user provides.
 * Actually, `billNumber` usually implies the Vendor's Invoice ID. 
 * But let's have a utility if needed, mostly user inputs it.
 */

// --- PURCHASE ORDERS ---

export async function getPurchaseOrders(
  filters?: any // Define strict type later if needed
): Promise<ActionResult<{ purchaseOrders: any[]; total: number }>> {
  try {
    const companyId = await getCurrentCompanyId()
    const whereClause = eq(purchaseOrders.companyId, companyId)
    // Add more filters as needed (date, status, vendor)

    const poList = await db.query.purchaseOrders.findMany({
      where: whereClause,
      orderBy: desc(purchaseOrders.createdAt),
      limit: 50,
      with: {
        vendor: { columns: { name: true } },
      },
    })

    return { success: true, data: { purchaseOrders: poList, total: poList.length } }
  } catch (error) {
    return { success: false, error: 'Failed to fetch Purchase Orders' }
  }
}

export async function getPurchaseOrder(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const po = await db.query.purchaseOrders.findFirst({
      where: and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)),
      with: {
        vendor: true,
        items: { with: { item: true } }
      }
    })
    if (!po) return { success: false, error: 'PO not found' }
    return { success: true, data: po }
  } catch (error) {
    return { success: false, error: 'Failed to fetch PO' }
  }
}

export async function createPurchaseOrder(data: PurchaseFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validated = purchaseOrderSchema.parse(data)
    const { total } = calculatePOTotals(validated.items)
    const poNumber = await generatePONumber(companyId)

    const result = await db.transaction(async (tx) => {
      const [newPO] = await tx.insert(purchaseOrders).values({
        companyId,
        vendorId: validated.vendorId,
        poNumber,
        date: validated.date,
        expectedDate: validated.expectedDate,
        status: validated.status,
        totalAmount: String(total),
        notes: validated.notes,
      }).returning()

      for (const item of validated.items) {
        const lineTotal = item.quantity * item.unitCost
        await tx.insert(purchaseOrderItems).values({
          poId: newPO.id,
          itemId: item.itemId,
          description: item.description,
          quantity: String(item.quantity),
          unitCost: String(item.unitCost),
          total: String(lineTotal),
        })
      }
      return newPO
    })

    revalidatePath('/dashboard/purchases/orders')
    return { success: true, data: result }
  } catch (error) {
    console.error('Create PO Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create PO' }
  }
}

// --- BILLS ---

export async function getBills(): Promise<ActionResult<{ bills: any[]; total: number }>> {
  try {
    const companyId = await getCurrentCompanyId()
    const billList = await db.query.bills.findMany({
      where: eq(bills.companyId, companyId),
      orderBy: desc(bills.date),
      limit: 50,
      with: {
        vendor: { columns: { name: true } },
      },
    })
    return { success: true, data: { bills: billList, total: billList.length } }
  } catch (error) {
    return { success: false, error: 'Failed to fetch Bills' }
  }
}

export async function getBill(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const bill = await db.query.bills.findFirst({
      where: and(eq(bills.id, id), eq(bills.companyId, companyId)),
      with: {
        vendor: true,
        purchaseOrder: true,
        payments: true
      }
    })
    if (!bill) return { success: false, error: 'Bill not found' }
    return { success: true, data: bill }
  } catch (error) {
    return { success: false, error: 'Failed to fetch Bill' }
  }
}

export async function createBill(data: BillFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validated = billSchema.parse(data)

    const result = await db.transaction(async (tx) => {
      const [newBill] = await tx.insert(bills).values({
        companyId,
        vendorId: validated.vendorId,
        poId: validated.poId,
        billNumber: validated.billNumber,
        date: validated.date,
        dueDate: validated.dueDate,
        totalAmount: String(validated.totalAmount),
        status: validated.status,
        notes: validated.notes,
      }).returning()

      // Update Vendor Balance (Increase Payable)
      // Note: In real app we might read current balance first to be safe, or direct sql increment
      /* 
      await tx.execute(sql`
        UPDATE ${vendors} 
        SET balance = balance + ${validated.totalAmount} 
        WHERE id = ${validated.vendorId}
      `) 
      */
      // For now, simple read-update or just rely on calculating from bills later. 
      // Let's do simple separate update for now to keep implementation clear.

      const vendor = await tx.query.vendors.findFirst({
        where: eq(vendors.id, validated.vendorId),
        columns: { balance: true }
      })
      if (vendor) {
        const newBalance = Number(vendor.balance) + validated.totalAmount
        await tx.update(vendors)
          .set({ balance: String(newBalance), updatedAt: new Date() })
          .where(eq(vendors.id, validated.vendorId))
      }

      // If linked to PO, close PO?
      // If linked to PO, close PO and Receive Goods (Update Stock)
      if (validated.poId) {
        // 1. Close PO
        await tx.update(purchaseOrders)
          .set({ status: 'CLOSED', updatedAt: new Date() })
          .where(eq(purchaseOrders.id, validated.poId))

        // 2. Fetch PO Items
        const poItems = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, validated.poId))

        // 3. Update Inventory & Log Movements
        for (const item of poItems) {
          // Update quantity on hand
          await tx.update(items)
            .set({
              quantityOnHand: sql`${items.quantityOnHand} + ${item.quantity}`,
              updatedAt: new Date()
            })
            .where(eq(items.id, item.itemId))

          // Log stock movement
          await tx.insert(stockMovements).values({
            itemId: item.itemId,
            type: 'PURCHASE',
            quantity: item.quantity,
            cost: item.unitCost, // Cost from PO
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: newBill.id, // Link to Bill as the receipt document
            date: validated.date,
          })
        }
      }

      return newBill
    })

    revalidatePath('/dashboard/purchases/bills')
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create Bill' }
  }
}

// --- PAYMENTS ---

export async function recordBillPayment(data: BillPaymentFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validated = billPaymentSchema.parse(data)

    const result = await db.transaction(async (tx) => {
      // 1. Create Payment Record
      const [payment] = await tx.insert(billPayments).values({
        companyId,
        vendorId: validated.vendorId,
        billId: validated.billId,
        amount: String(validated.amount),
        paymentDate: validated.paymentDate,
        paymentMethod: validated.paymentMethod,
        reference: validated.reference,
        notes: validated.notes,
      }).returning()

      // 2. Decrease Vendor Balance (Liability decreases)
      const vendor = await tx.query.vendors.findFirst({
        where: eq(vendors.id, validated.vendorId),
        columns: { balance: true }
      })
      if (vendor) {
        const newBalance = Number(vendor.balance) - validated.amount
        await tx.update(vendors)
          .set({ balance: String(newBalance), updatedAt: new Date() })
          .where(eq(vendors.id, validated.vendorId))
      }

      // 3. Update Bill Paid Amount & Status
      if (validated.billId) {
        const bill = await tx.query.bills.findFirst({
          where: eq(bills.id, validated.billId),
          columns: { totalAmount: true, paidAmount: true }
        })

        if (bill) {
          const newPaidAmount = Number(bill.paidAmount) + validated.amount
          const isFullyPaid = newPaidAmount >= Number(bill.totalAmount)

          await tx.update(bills)
            .set({
              paidAmount: String(newPaidAmount),
              status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
              updatedAt: new Date()
            })
            .where(eq(bills.id, validated.billId))
        }
      }

      return payment
    })

    revalidatePath('/dashboard/purchases/bills')
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record payment' }
  }
}

// --- DROPDOWN HELPERS ---

export async function getVendorsForDropdown(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const vendorList = await db.query.vendors.findMany({
      where: eq(vendors.companyId, companyId),
      columns: { id: true, name: true },
      orderBy: asc(vendors.name),
    })
    return { success: true, data: vendorList }
  } catch (error) {
    return { success: false, error: 'Failed to fetch vendors' }
  }
}

export async function getItemsForDropdown(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const itemList = await db.query.items.findMany({
      where: eq(items.companyId, companyId),
      columns: { id: true, name: true, costPrice: true },
      orderBy: asc(items.name),
    })
    // Map costPrice to unitCost for frontend consistency
    const mappedItems = itemList.map(item => ({
      ...item,
      unitCost: item.costPrice
    }))
    return { success: true, data: mappedItems }
  } catch (error) {
    return { success: false, error: 'Failed to fetch items' }
  }
}

export async function getOpenPurchaseOrdersForDropdown(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const poList = await db.query.purchaseOrders.findMany({
      where: and(
        eq(purchaseOrders.companyId, companyId),
        eq(purchaseOrders.status, 'OPEN')
      ),
      columns: { id: true, poNumber: true, totalAmount: true, vendorId: true },
      orderBy: desc(purchaseOrders.createdAt),
    })
    return { success: true, data: poList }
  } catch (error) {
    return { success: false, error: 'Failed to fetch open POs' }
  }
}
