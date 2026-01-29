'use server';

import { db } from '@/lib/server-db';
import {
  customers, vendors, chartOfAccounts, journalEntries, journalLines,
  companies, employees, items
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PtbParseResult } from '@/lib/peachtree/ptb-parser';
// import { revalidatePath } from 'next/cache'; // Next.js not available in Vite

export type ImportResult = {
  success: boolean;
  counts: {
    customers: number;
    vendors: number;
    accounts: number;
    transactions: number;
    employees: number;
    inventory: number;
  };
  errors?: string[];
  message?: string;
};

export async function savePtbImport(
  companyId: string,
  data: Partial<PtbParseResult>
): Promise<ImportResult> {
  if (!companyId) {
    return { success: false, counts: initCounts(), errors: ['Company ID is required'] };
  }

  // console.log('[Server Action] Starting robust PTB import for company:', companyId);

  try {
    const counts = initCounts();

    // Execute in a transaction for atomicity
    await db.transaction(async (tx) => {

      // 1. Customers
      if (data.customers && data.customers.length > 0) {
        // console.log(`Processing ${data.customers.length} customers...`);
        for (const c of data.customers) {
          // Check if exists by Customer Number (Exact Match)
          // We use customer_number as the "dedup key"
          const customerNumber = c.id || `CUST-${c.name.substring(0, 10).replace(/\s/g, '')}`;

          const existing = await tx.query.customers.findFirst({
            where: and(
              eq(customers.companyId, companyId),
              eq(customers.customerNumber, customerNumber)
            )
          });

          if (existing) {
            // Update
            await tx.update(customers)
              .set({
                name: c.name,
                email: c.email || existing.email,
                phone: c.phone || existing.phone,
                updatedAt: new Date()
              })
              .where(eq(customers.id, existing.id));
          } else {
            // Insert
            await tx.insert(customers).values({
              companyId,
              customerNumber: customerNumber,
              name: c.name,
              email: c.email,
              phone: c.phone,
              customerType: 'CORPORATE',
              paymentTerms: 'NET_30',
              isActive: true,
              balance: '0'
            });
            counts.customers++;
          }
        }
      }

      // 2. Vendors
      if (data.vendors && data.vendors.length > 0) {
        for (const v of data.vendors) {
          const vendorNumber = v.id;

          const existing = await tx.query.vendors.findFirst({
            where: and(
              eq(vendors.companyId, companyId),
              eq(vendors.vendorNumber, vendorNumber)
            )
          });

          if (existing) {
            await tx.update(vendors)
              .set({
                name: v.name,
                email: v.email || existing.email,
                phone: v.phone || existing.phone,
                updatedAt: new Date()
              })
              .where(eq(vendors.id, existing.id));
          } else {
            await tx.insert(vendors).values({
              companyId,
              vendorNumber,
              name: v.name,
              email: v.email,
              phone: v.phone,
              vendorType: 'SUPPLIER',
              paymentTerms: 'NET_30',
              isActive: true,
              balance: '0'
            });
            counts.vendors++;
          }
        }
      }

      // 3. Accounts
      if (data.accounts && data.accounts.length > 0) {
        for (const a of data.accounts) {
          const accountNumber = a.accountNumber;

          const existing = await tx.query.chartOfAccounts.findFirst({
            where: and(
              eq(chartOfAccounts.companyId, companyId),
              eq(chartOfAccounts.accountNumber, accountNumber)
            )
          });

          if (existing) {
            await tx.update(chartOfAccounts)
              .set({
                accountName: a.accountName,
                type: a.type as any, // Cast safety
              })
              .where(eq(chartOfAccounts.id, existing.id));
          } else {
            await tx.insert(chartOfAccounts).values({
              companyId,
              accountNumber,
              accountName: a.accountName,
              type: a.type as any,
              balance: '0',
              isActive: true
            });
            counts.accounts++;
          }
        }
      }

      // 4. Employees
      if (data.employees && data.employees.length > 0) {
        for (const e of data.employees) {
          const employeeCode = e.id;

          const existing = await tx.query.employees.findFirst({
            where: and(
              eq(employees.companyId, companyId),
              eq(employees.employeeCode, employeeCode)
            )
          });

          if (existing) {
            await tx.update(employees)
              .set({
                firstName: e.name.split(' ')[0],
                lastName: e.name.split(' ').slice(1).join(' ') || '.',
                updatedAt: new Date()
              })
              .where(eq(employees.id, existing.id));
          } else {
            await tx.insert(employees).values({
              companyId,
              employeeCode,
              firstName: e.name.split(' ')[0],
              lastName: e.name.split(' ').slice(1).join(' ') || '.',
              email: e.email,
              phone: e.phone,
              jobTitle: e.position,
              department: e.department,
              isActive: true
            });
            counts.employees++;
          }
        }
      }

      // 5. Inventory
      if (data.inventoryItems && data.inventoryItems.length > 0) {
        for (const item of data.inventoryItems) {
          const sku = item.itemCode;
          const existing = await tx.query.items.findFirst({
            where: and(
              eq(items.companyId, companyId),
              eq(items.sku, sku)
            )
          });

          if (existing) {
            await tx.update(items)
              .set({
                name: item.itemName,
                description: item.description,
                updatedAt: new Date()
              })
              .where(eq(items.id, existing.id));
          } else {
            await tx.insert(items).values({
              companyId,
              sku: item.itemCode,
              name: item.itemName,
              description: item.description,
              unitOfMeasure: 'PCS', // Default
              costPrice: item.costPrice?.toString() || '0',
              sellingPrice: item.unitPrice?.toString() || '0',
              quantityOnHand: item.quantity?.toString() || '0',
              isActive: true
            });
            counts.inventory++;
          }
        }
      }

      // 6. Journal Entries
      // Logic: If entry with same reference/number exists, we SKIP or Wipe & Replace.
      // Transactions are tricky. Typically we treat the import as the source of truth.
      // But for safety, we'll only insert NEW ones to avoid dupes, or look up by EntryID.
      if (data.journalEntries && data.journalEntries.length > 0) {
        // This is complex because we need Account IDs.
        // We'll skip deep linking for now and just create the Headers if simple
        // Or if 'ptb-parser' provides robust structure.
        // 'ptb-parser' currently returns flat 'journalEntries'.

        // For now, let's just insert checking existence
        // (Implementation simplified for task)
        for (const j of data.journalEntries) {
          // Skip if no ID
          if (!j.entryId) continue;

          // Find existing (Assuming 'reference' or 'description' holds ID for now, as schema has 'reference')
          // Actually create a unique reference string
          const ref = j.entryId;

          const existing = await tx.query.journalEntries.findFirst({
            where: and(
              eq(journalEntries.companyId, companyId),
              eq(journalEntries.reference, ref)
            )
          });

          if (!existing) {
            await tx.insert(journalEntries).values({
              companyId,
              date: new Date(j.date || new Date()),
              description: j.description || `Imported ${j.entryId}`,
              reference: ref,
              status: 'POSTED',
              sourceType: 'MANUAL',
            });
            counts.transactions++;
          }
        }
      }
    });

    // revalidatePath('/dashboard'); // Not available in Vite - React Query handles cache invalidation
    return { success: true, counts };

  } catch (error: any) {
    console.error('[Server Action Error] PTB Import failed:', error);
    // Returning success: false doesn't rollback automatically if we caught it, 
    // BUT db.transaction throws if callback fails, so the rollback happened BEFORE we caught it here.
    return {
      success: false,
      counts: initCounts(),
      errors: [error.message || 'Database transaction failed']
    };
  }
}

function initCounts() {
  return { customers: 0, vendors: 0, accounts: 0, transactions: 0, employees: 0, inventory: 0 };
}
