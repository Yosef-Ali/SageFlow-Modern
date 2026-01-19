// Peachtree to SageFlow Modern - Data Migration Script
// Syncs data from old Peachtree ODBC to new Drizzle database

import { createPeachtreeConnection, defaultPeachtreeConfig } from './odbc-connection';
import { db } from '@/db';
import { 
  companies, 
  customers, 
  invoices, 
  invoiceItems,
  items,
  vendors,
  chartOfAccounts,
  payments 
} from '@/db/schema';

export class PeachtreeDataMigration {
  private peachtree: any;
  private companyId: string;

  constructor(companyId: string) {
    this.peachtree = createPeachtreeConnection(defaultPeachtreeConfig);
    this.companyId = companyId;
  }

  /**
   * Run complete migration
   */
  async migrateAll() {
    try {
      await this.peachtree.connect();

      console.log('🚀 Starting Peachtree data migration...');

      await this.migrateCustomers();
      await this.migrateVendors();
      await this.migrateItems();
      await this.migrateChartOfAccounts();
      await this.migrateInvoices();
      await this.migratePayments();

      console.log('✅ Migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.peachtree.disconnect();
    }
  }

  /**
   * Migrate customers from Peachtree
   */
  async migrateCustomers() {
    console.log('📦 Migrating customers...');

    const peachtreeCustomers = await this.peachtree.getCustomers();

    for (const pc of peachtreeCustomers) {
      try {
        await db.insert(customers).values({
          companyId: this.companyId,
          customerNumber: pc.CustomerID,
          name: pc.CustomerName,
          email: pc.Email || null,
          phone: pc.Phone || null,
          billingAddress: {
            address1: pc.Address1,
            address2: pc.Address2,
            city: pc.City,
            state: pc.State,
            zipCode: pc.ZipCode,
            country: pc.Country || 'Ethiopia',
          },
          creditLimit: pc.CreditLimit?.toString() || null,
          balance: pc.Balance?.toString() || '0',
          notes: null,
          isActive: true,
        }).onConflictDoUpdate({
          target: [customers.companyId, customers.customerNumber],
          set: {
            name: pc.CustomerName,
            email: pc.Email || null,
            phone: pc.Phone || null,
            balance: pc.Balance?.toString() || '0',
          },
        });

        console.log(`✅ Migrated customer: ${pc.CustomerName}`);
      } catch (error) {
        console.error(`❌ Failed to migrate customer ${pc.CustomerID}:`, error);
      }
    }

    console.log(`✅ Migrated ${peachtreeCustomers.length} customers`);
  }

  /**
   * Migrate vendors from Peachtree
   */
  async migrateVendors() {
    console.log('📦 Migrating vendors...');

    const peachtreeVendors = await this.peachtree.getVendors();

    for (const pv of peachtreeVendors) {
      try {
        await db.insert(vendors).values({
          companyId: this.companyId,
          vendorNumber: pv.VendorID,
          name: pv.VendorName,
          email: pv.Email || null,
          phone: pv.Phone || null,
          address: {
            address1: pv.Address1,
            address2: pv.Address2,
            city: pv.City,
            state: pv.State,
            zipCode: pv.ZipCode,
          },
          paymentTerms: pv.PaymentTerms || null,
          balance: '0',
          isActive: true,
        }).onConflictDoUpdate({
          target: [vendors.companyId, vendors.vendorNumber],
          set: {
            name: pv.VendorName,
            email: pv.Email || null,
            phone: pv.Phone || null,
          },
        });

        console.log(`✅ Migrated vendor: ${pv.VendorName}`);
      } catch (error) {
        console.error(`❌ Failed to migrate vendor ${pv.VendorID}:`, error);
      }
    }

    console.log(`✅ Migrated ${peachtreeVendors.length} vendors`);
  }

  /**
   * Migrate inventory items from Peachtree
   */
  async migrateItems() {
    console.log('📦 Migrating inventory items...');

    const peachtreeItems = await this.peachtree.getItems();

    for (const pi of peachtreeItems) {
      try {
        await db.insert(items).values({
          companyId: this.companyId,
          sku: pi.ItemID,
          name: pi.ItemName,
          description: pi.Description || null,
          unitOfMeasure: pi.UnitOfMeasure || 'EA',
          type: 'PRODUCT',
          costPrice: pi.Cost?.toString() || '0',
          sellingPrice: pi.UnitPrice?.toString() || '0',
          quantityOnHand: pi.QuantityOnHand?.toString() || '0',
          reorderPoint: pi.ReorderPoint?.toString() || '0',
          isActive: true,
        }).onConflictDoUpdate({
          target: [items.companyId, items.sku],
          set: {
            name: pi.ItemName,
            description: pi.Description || null,
            costPrice: pi.Cost?.toString() || '0',
            sellingPrice: pi.UnitPrice?.toString() || '0',
            quantityOnHand: pi.QuantityOnHand?.toString() || '0',
          },
        });

        console.log(`✅ Migrated item: ${pi.ItemName}`);
      } catch (error) {
        console.error(`❌ Failed to migrate item ${pi.ItemID}:`, error);
      }
    }

    console.log(`✅ Migrated ${peachtreeItems.length} items`);
  }

  /**
   * Migrate chart of accounts from Peachtree
   */
  async migrateChartOfAccounts() {
    console.log('📦 Migrating chart of accounts...');

    const peachtreeAccounts = await this.peachtree.getChartOfAccounts();

    for (const pa of peachtreeAccounts) {
      try {
        // Map Peachtree account type to Drizzle enum
        const accountType = this.mapAccountType(pa.AccountType);

        await db.insert(chartOfAccounts).values({
          companyId: this.companyId,
          accountNumber: pa.AccountNumber,
          accountName: pa.AccountName,
          type: accountType,
          balance: pa.Balance?.toString() || '0',
          isActive: true,
        }).onConflictDoUpdate({
          target: [chartOfAccounts.companyId, chartOfAccounts.accountNumber],
          set: {
            accountName: pa.AccountName,
            balance: pa.Balance?.toString() || '0',
          },
        });

        console.log(`✅ Migrated account: ${pa.AccountName}`);
      } catch (error) {
        console.error(`❌ Failed to migrate account ${pa.AccountNumber}:`, error);
      }
    }

    console.log(`✅ Migrated ${peachtreeAccounts.length} accounts`);
  }

  /**
   * Migrate invoices from Peachtree
   */
  async migrateInvoices() {
    console.log('📦 Migrating invoices...');

    const peachtreeInvoices = await this.peachtree.getInvoices();

    for (const pi of peachtreeInvoices) {
      try {
        // Get customer ID from our database
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.customerNumber, pi.CustomerID))
          .limit(1);

        if (!customer) {
          console.warn(`⚠️ Customer ${pi.CustomerID} not found, skipping invoice ${pi.InvoiceNo}`);
          continue;
        }

        // Map invoice status
        const status = this.mapInvoiceStatus(pi.Status, pi.Balance);

        // Insert invoice
        const [newInvoice] = await db.insert(invoices).values({
          companyId: this.companyId,
          customerId: customer.id,
          invoiceNumber: pi.InvoiceNo,
          date: new Date(pi.InvoiceDate),
          dueDate: new Date(pi.DueDate),
          subtotal: pi.Subtotal?.toString() || '0',
          taxAmount: pi.TaxAmount?.toString() || '0',
          total: pi.TotalAmount?.toString() || '0',
          paidAmount: pi.AmountPaid?.toString() || '0',
          status: status,
        }).onConflictDoUpdate({
          target: [invoices.companyId, invoices.invoiceNumber],
          set: {
            paidAmount: pi.AmountPaid?.toString() || '0',
            status: status,
          },
        }).returning();

        // Get and migrate invoice items
        const peachtreeItems = await this.peachtree.getInvoiceItems(pi.InvoiceNo);

        for (const item of peachtreeItems) {
          await db.insert(invoiceItems).values({
            invoiceId: newInvoice.id,
            itemId: null, // Can lookup if needed
            description: item.Description,
            quantity: item.Quantity?.toString() || '1',
            unitPrice: item.UnitPrice?.toString() || '0',
            taxRate: '0', // Calculate if needed
            total: item.LineTotal?.toString() || '0',
          }).onConflictDoNothing();
        }

        console.log(`✅ Migrated invoice: ${pi.InvoiceNo} with ${peachtreeItems.length} items`);
      } catch (error) {
        console.error(`❌ Failed to migrate invoice ${pi.InvoiceNo}:`, error);
      }
    }

    console.log(`✅ Migrated ${peachtreeInvoices.length} invoices`);
  }

  /**
   * Migrate payments from Peachtree
   */
  async migratePayments() {
    console.log('📦 Migrating payments...');

    const peachtreePayments = await this.peachtree.getPayments();

    for (const pp of peachtreePayments) {
      try {
        // Get customer
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.customerNumber, pp.CustomerID))
          .limit(1);

        if (!customer) {
          console.warn(`⚠️ Customer ${pp.CustomerID} not found, skipping payment`);
          continue;
        }

        // Get invoice if exists
        let invoiceId = null;
        if (pp.InvoiceNo) {
          const [invoice] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.invoiceNumber, pp.InvoiceNo))
            .limit(1);
          
          if (invoice) {
            invoiceId = invoice.id;
          }
        }

        await db.insert(payments).values({
          companyId: this.companyId,
          customerId: customer.id,
          invoiceId: invoiceId,
          amount: pp.Amount?.toString() || '0',
          paymentDate: new Date(pp.PaymentDate),
          paymentMethod: pp.PaymentMethod || 'Cash',
          reference: pp.Reference || null,
        });

        console.log(`✅ Migrated payment: ${pp.PaymentID}`);
      } catch (error) {
        console.error(`❌ Failed to migrate payment ${pp.PaymentID}:`, error);
      }
    }

    console.log(`✅ Migrated ${peachtreePayments.length} payments`);
  }

  /**
   * Map Peachtree account type to Drizzle enum
   */
  private mapAccountType(peachtreeType: string): 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' {
    const type = peachtreeType?.toUpperCase();

    if (type?.includes('ASSET')) return 'ASSET';
    if (type?.includes('LIABILITY')) return 'LIABILITY';
    if (type?.includes('EQUITY') || type?.includes('CAPITAL')) return 'EQUITY';
    if (type?.includes('REVENUE') || type?.includes('INCOME')) return 'REVENUE';
    if (type?.includes('EXPENSE')) return 'EXPENSE';

    return 'ASSET'; // Default
  }

  /**
   * Map Peachtree invoice status to Drizzle enum
   */
  private mapInvoiceStatus(
    peachtreeStatus: string, 
    balance: number
  ): 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' {
    const status = peachtreeStatus?.toUpperCase();

    if (status?.includes('CANCEL')) return 'CANCELLED';
    if (status?.includes('DRAFT')) return 'DRAFT';
    if (balance === 0) return 'PAID';
    if (balance > 0 && balance < 100) return 'PARTIALLY_PAID';
    if (status?.includes('OVERDUE')) return 'OVERDUE';

    return 'SENT';
  }
}

/**
 * Run migration from command line
 */
export async function runPeachtreeMigration(companyId: string) {
  const migration = new PeachtreeDataMigration(companyId);
  await migration.migrateAll();
}

// Import statements for the functions used
import { eq } from 'drizzle-orm';
