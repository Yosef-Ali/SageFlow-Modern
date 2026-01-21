// Peachtree Hybrid Sync Service
// Supports one-time migration + selective re-sync on demand

import { createPeachtreeConnection, defaultPeachtreeConfig, PeachtreeODBCConnection } from './odbc-connection';
import { db } from '@/db';
import {
  companies,
  customers,
  invoices,
  invoiceItems,
  items,
  vendors,
  chartOfAccounts,
  payments,
  syncJobs,
  syncEntityMap,
  syncConfigs,
  type SyncJob,
  type SyncConfig,
} from '@/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { createHash } from 'crypto';

// Entity types that can be synced
export type SyncableEntity = 'customers' | 'vendors' | 'items' | 'invoices' | 'payments' | 'chartOfAccounts';

export interface SyncOptions {
  entities?: SyncableEntity[];  // Which entities to sync (all if not specified)
  dateRangeStart?: Date;        // For invoices/payments - start date
  dateRangeEnd?: Date;          // For invoices/payments - end date
  forceUpdate?: boolean;        // Update even if checksum matches
  dryRun?: boolean;             // Preview changes without applying
}

export interface SyncResult {
  jobId: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  summary: {
    entity: string;
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }[];
  errors: Array<{ entity: string; id: string; error: string }>;
  duration: number;
}

export class PeachtreeHybridSync {
  private peachtree: PeachtreeODBCConnection | null = null;
  private companyId: string;
  private jobId: string | null = null;
  private errors: Array<{ entity: string; id: string; error: string }> = [];
  private config: SyncConfig | null = null;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  /**
   * Initialize connection from stored config or defaults
   */
  async initialize(): Promise<void> {
    // Get stored config
    const [storedConfig] = await db
      .select()
      .from(syncConfigs)
      .where(eq(syncConfigs.companyId, this.companyId))
      .limit(1);

    if (storedConfig) {
      this.config = storedConfig;
      this.peachtree = createPeachtreeConnection({
        dsn: storedConfig.dsn || defaultPeachtreeConfig.dsn,
        username: storedConfig.username || undefined,
        password: storedConfig.password || undefined,
      });
    } else {
      this.peachtree = createPeachtreeConnection(defaultPeachtreeConfig);
    }
  }

  /**
   * Test ODBC connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.initialize();
      await this.peachtree!.connect();

      // Try a simple query
      await this.peachtree!.query('SELECT 1');

      await this.peachtree!.disconnect();

      // Update config status
      await db
        .update(syncConfigs)
        .set({
          connectionStatus: 'CONNECTED',
          lastConnectionTest: new Date(),
        })
        .where(eq(syncConfigs.companyId, this.companyId));

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await db
        .update(syncConfigs)
        .set({
          connectionStatus: 'FAILED',
          lastConnectionTest: new Date(),
        })
        .where(eq(syncConfigs.companyId, this.companyId));

      return { success: false, message };
    }
  }

  /**
   * Run selective sync with options
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const entities = options.entities || ['customers', 'vendors', 'items', 'chartOfAccounts', 'invoices', 'payments'];

    try {
      await this.initialize();
      await this.peachtree!.connect();

      // Create sync job
      const [job] = await db.insert(syncJobs).values({
        companyId: this.companyId,
        jobType: options.entities ? 'SELECTIVE_SYNC' : 'FULL_MIGRATION',
        status: 'IN_PROGRESS',
        entities: entities,
        dateRangeStart: options.dateRangeStart,
        dateRangeEnd: options.dateRangeEnd,
        startedAt: new Date(),
      }).returning();

      this.jobId = job.id;

      const summaries: SyncResult['summary'] = [];

      // Sync each entity type
      for (const entity of entities) {
        const summary = await this.syncEntity(entity, options);
        summaries.push(summary);

        // Update job progress
        await db
          .update(syncJobs)
          .set({
            processedRecords: summaries.reduce((acc, s) => acc + s.total, 0).toString(),
          })
          .where(eq(syncJobs.id, this.jobId));
      }

      // Complete job
      const finalStatus = this.errors.length === 0 ? 'COMPLETED' : 'PARTIAL';

      await db
        .update(syncJobs)
        .set({
          status: finalStatus,
          completedAt: new Date(),
          totalRecords: summaries.reduce((acc, s) => acc + s.total, 0).toString(),
          failedRecords: this.errors.length.toString(),
          errorLog: this.errors.length > 0 ? this.errors : null,
        })
        .where(eq(syncJobs.id, this.jobId));

      return {
        jobId: this.jobId,
        status: finalStatus,
        summary: summaries,
        errors: this.errors,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      // Mark job as failed
      if (this.jobId) {
        await db
          .update(syncJobs)
          .set({
            status: 'FAILED',
            completedAt: new Date(),
            errorLog: [{ entity: 'system', id: 'connection', error: String(error) }],
          })
          .where(eq(syncJobs.id, this.jobId));
      }

      throw error;
    } finally {
      await this.peachtree?.disconnect();
    }
  }

  /**
   * Sync a single entity type
   */
  private async syncEntity(entity: SyncableEntity, options: SyncOptions): Promise<SyncResult['summary'][0]> {
    const summary = { entity, total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    try {
      switch (entity) {
        case 'customers':
          return await this.syncCustomers(options);
        case 'vendors':
          return await this.syncVendors(options);
        case 'items':
          return await this.syncItems(options);
        case 'chartOfAccounts':
          return await this.syncChartOfAccounts(options);
        case 'invoices':
          return await this.syncInvoices(options);
        case 'payments':
          return await this.syncPayments(options);
        default:
          return summary;
      }
    } catch (error) {
      this.errors.push({ entity, id: 'all', error: String(error) });
      summary.failed = 1;
      return summary;
    }
  }

  /**
   * Sync customers with change detection
   */
  private async syncCustomers(options: SyncOptions): Promise<SyncResult['summary'][0]> {
    const summary = { entity: 'customers', total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    const peachtreeCustomers = await this.peachtree!.getCustomers();
    summary.total = peachtreeCustomers.length;

    for (const pc of peachtreeCustomers) {
      try {
        const checksum = this.generateChecksum(pc);

        // Check existing mapping
        const [existingMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'customer'),
            eq(syncEntityMap.peachtreeId, pc.CustomerID)
          ))
          .limit(1);

        // Skip if checksum matches and not force update
        if (existingMap && existingMap.syncChecksum === checksum && !options.forceUpdate) {
          summary.skipped++;
          continue;
        }

        const customerData = {
          companyId: this.companyId,
          customerNumber: pc.CustomerID,
          name: pc.CustomerName,
          email: pc.Email || null,
          phone: pc.Phone || null,
          contactName: pc.Contact || null,
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
          isActive: true,
        };

        if (options.dryRun) {
          summary.created++;
          continue;
        }

        if (existingMap) {
          // Update existing
          await db
            .update(customers)
            .set(customerData)
            .where(eq(customers.id, existingMap.sageflowId));

          await db
            .update(syncEntityMap)
            .set({ lastSyncedAt: new Date(), syncChecksum: checksum })
            .where(eq(syncEntityMap.id, existingMap.id));

          summary.updated++;
        } else {
          // Insert new
          const [newCustomer] = await db.insert(customers).values(customerData).returning();

          await db.insert(syncEntityMap).values({
            companyId: this.companyId,
            entityType: 'customer',
            peachtreeId: pc.CustomerID,
            sageflowId: newCustomer.id,
            syncChecksum: checksum,
          });

          summary.created++;
        }
      } catch (error) {
        this.errors.push({ entity: 'customer', id: pc.CustomerID, error: String(error) });
        summary.failed++;
      }
    }

    return summary;
  }

  /**
   * Sync vendors with change detection
   */
  private async syncVendors(options: SyncOptions): Promise<SyncResult['summary'][0]> {
    const summary = { entity: 'vendors', total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    const peachtreeVendors = await this.peachtree!.getVendors();
    summary.total = peachtreeVendors.length;

    for (const pv of peachtreeVendors) {
      try {
        const checksum = this.generateChecksum(pv);

        const [existingMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'vendor'),
            eq(syncEntityMap.peachtreeId, pv.VendorID)
          ))
          .limit(1);

        if (existingMap && existingMap.syncChecksum === checksum && !options.forceUpdate) {
          summary.skipped++;
          continue;
        }

        const vendorData = {
          companyId: this.companyId,
          vendorNumber: pv.VendorID,
          name: pv.VendorName,
          email: pv.Email || null,
          phone: pv.Phone || null,
          contactName: pv.Contact || null,
          address: {
            address1: pv.Address1,
            address2: pv.Address2,
            city: pv.City,
            state: pv.State,
            zipCode: pv.ZipCode,
          },
          isActive: true,
        };

        if (options.dryRun) {
          summary.created++;
          continue;
        }

        if (existingMap) {
          await db.update(vendors).set(vendorData).where(eq(vendors.id, existingMap.sageflowId));
          await db.update(syncEntityMap).set({ lastSyncedAt: new Date(), syncChecksum: checksum }).where(eq(syncEntityMap.id, existingMap.id));
          summary.updated++;
        } else {
          const [newVendor] = await db.insert(vendors).values(vendorData).returning();
          await db.insert(syncEntityMap).values({
            companyId: this.companyId,
            entityType: 'vendor',
            peachtreeId: pv.VendorID,
            sageflowId: newVendor.id,
            syncChecksum: checksum,
          });
          summary.created++;
        }
      } catch (error) {
        this.errors.push({ entity: 'vendor', id: pv.VendorID, error: String(error) });
        summary.failed++;
      }
    }

    return summary;
  }

  /**
   * Sync inventory items
   */
  private async syncItems(options: SyncOptions): Promise<SyncResult['summary'][0]> {
    const summary = { entity: 'items', total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    const peachtreeItems = await this.peachtree!.getItems();
    summary.total = peachtreeItems.length;

    for (const pi of peachtreeItems) {
      try {
        const checksum = this.generateChecksum(pi);

        const [existingMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'item'),
            eq(syncEntityMap.peachtreeId, pi.ItemID)
          ))
          .limit(1);

        if (existingMap && existingMap.syncChecksum === checksum && !options.forceUpdate) {
          summary.skipped++;
          continue;
        }

        const itemData = {
          companyId: this.companyId,
          sku: pi.ItemID,
          name: pi.ItemName,
          description: pi.Description || null,
          unitOfMeasure: pi.UnitOfMeasure || 'EA',
          type: 'PRODUCT' as const,
          costPrice: pi.Cost?.toString() || '0',
          sellingPrice: pi.UnitPrice?.toString() || '0',
          quantityOnHand: pi.QuantityOnHand?.toString() || '0',
          reorderPoint: pi.ReorderPoint?.toString() || '0',
          reorderQuantity: '0',
          isActive: true,
        };

        if (options.dryRun) {
          summary.created++;
          continue;
        }

        if (existingMap) {
          await db.update(items).set(itemData).where(eq(items.id, existingMap.sageflowId));
          await db.update(syncEntityMap).set({ lastSyncedAt: new Date(), syncChecksum: checksum }).where(eq(syncEntityMap.id, existingMap.id));
          summary.updated++;
        } else {
          const [newItem] = await db.insert(items).values(itemData).returning();
          await db.insert(syncEntityMap).values({
            companyId: this.companyId,
            entityType: 'item',
            peachtreeId: pi.ItemID,
            sageflowId: newItem.id,
            syncChecksum: checksum,
          });
          summary.created++;
        }
      } catch (error) {
        this.errors.push({ entity: 'item', id: pi.ItemID, error: String(error) });
        summary.failed++;
      }
    }

    return summary;
  }

  /**
   * Sync chart of accounts
   */
  private async syncChartOfAccounts(options: SyncOptions): Promise<SyncResult['summary'][0]> {
    const summary = { entity: 'chartOfAccounts', total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    const peachtreeAccounts = await this.peachtree!.getChartOfAccounts();
    summary.total = peachtreeAccounts.length;

    for (const pa of peachtreeAccounts) {
      try {
        const checksum = this.generateChecksum(pa);

        const [existingMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'account'),
            eq(syncEntityMap.peachtreeId, pa.AccountNumber)
          ))
          .limit(1);

        if (existingMap && existingMap.syncChecksum === checksum && !options.forceUpdate) {
          summary.skipped++;
          continue;
        }

        const accountType = this.mapAccountType(pa.AccountType);
        const accountData = {
          companyId: this.companyId,
          accountNumber: pa.AccountNumber,
          accountName: pa.AccountName,
          type: accountType,
          balance: pa.Balance?.toString() || '0',
          isActive: true,
        };

        if (options.dryRun) {
          summary.created++;
          continue;
        }

        if (existingMap) {
          await db.update(chartOfAccounts).set(accountData).where(eq(chartOfAccounts.id, existingMap.sageflowId));
          await db.update(syncEntityMap).set({ lastSyncedAt: new Date(), syncChecksum: checksum }).where(eq(syncEntityMap.id, existingMap.id));
          summary.updated++;
        } else {
          const [newAccount] = await db.insert(chartOfAccounts).values(accountData).returning();
          await db.insert(syncEntityMap).values({
            companyId: this.companyId,
            entityType: 'account',
            peachtreeId: pa.AccountNumber,
            sageflowId: newAccount.id,
            syncChecksum: checksum,
          });
          summary.created++;
        }
      } catch (error) {
        this.errors.push({ entity: 'account', id: pa.AccountNumber, error: String(error) });
        summary.failed++;
      }
    }

    return summary;
  }

  /**
   * Sync invoices with date range support
   */
  private async syncInvoices(options: SyncOptions): Promise<SyncResult['summary'][0]> {
    const summary = { entity: 'invoices', total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    let peachtreeInvoices = await this.peachtree!.getInvoices();

    // Filter by date range if specified
    if (options.dateRangeStart || options.dateRangeEnd) {
      peachtreeInvoices = peachtreeInvoices.filter((inv: any) => {
        const invDate = new Date(inv.InvoiceDate);
        if (options.dateRangeStart && invDate < options.dateRangeStart) return false;
        if (options.dateRangeEnd && invDate > options.dateRangeEnd) return false;
        return true;
      });
    }

    summary.total = peachtreeInvoices.length;

    for (const pi of peachtreeInvoices) {
      try {
        // Get customer mapping
        const [customerMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'customer'),
            eq(syncEntityMap.peachtreeId, pi.CustomerID)
          ))
          .limit(1);

        if (!customerMap) {
          this.errors.push({ entity: 'invoice', id: pi.InvoiceNo, error: `Customer ${pi.CustomerID} not found` });
          summary.failed++;
          continue;
        }

        const checksum = this.generateChecksum(pi);

        const [existingMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'invoice'),
            eq(syncEntityMap.peachtreeId, pi.InvoiceNo)
          ))
          .limit(1);

        if (existingMap && existingMap.syncChecksum === checksum && !options.forceUpdate) {
          summary.skipped++;
          continue;
        }

        const status = this.mapInvoiceStatus(pi.Status, pi.Balance);
        const invoiceData = {
          companyId: this.companyId,
          customerId: customerMap.sageflowId,
          invoiceNumber: pi.InvoiceNo,
          date: new Date(pi.InvoiceDate),
          dueDate: new Date(pi.DueDate),
          subtotal: pi.Subtotal?.toString() || '0',
          taxAmount: pi.TaxAmount?.toString() || '0',
          discountAmount: '0',
          total: pi.TotalAmount?.toString() || '0',
          paidAmount: pi.AmountPaid?.toString() || '0',
          status: status,
        };

        if (options.dryRun) {
          summary.created++;
          continue;
        }

        if (existingMap) {
          await db.update(invoices).set(invoiceData).where(eq(invoices.id, existingMap.sageflowId));
          await db.update(syncEntityMap).set({ lastSyncedAt: new Date(), syncChecksum: checksum }).where(eq(syncEntityMap.id, existingMap.id));
          summary.updated++;
        } else {
          const [newInvoice] = await db.insert(invoices).values(invoiceData).returning();

          // Sync invoice items
          const invItems = await this.peachtree!.getInvoiceItems(pi.InvoiceNo);
          for (const item of invItems) {
            await db.insert(invoiceItems).values({
              invoiceId: newInvoice.id,
              itemId: null,
              description: item.Description,
              quantity: item.Quantity?.toString() || '1',
              unitPrice: item.UnitPrice?.toString() || '0',
              taxRate: '0',
              total: item.LineTotal?.toString() || '0',
            });
          }

          await db.insert(syncEntityMap).values({
            companyId: this.companyId,
            entityType: 'invoice',
            peachtreeId: pi.InvoiceNo,
            sageflowId: newInvoice.id,
            syncChecksum: checksum,
          });
          summary.created++;
        }
      } catch (error) {
        this.errors.push({ entity: 'invoice', id: pi.InvoiceNo, error: String(error) });
        summary.failed++;
      }
    }

    return summary;
  }

  /**
   * Sync payments
   */
  private async syncPayments(options: SyncOptions): Promise<SyncResult['summary'][0]> {
    const summary = { entity: 'payments', total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

    let peachtreePayments = await this.peachtree!.getPayments();

    // Filter by date range if specified
    if (options.dateRangeStart || options.dateRangeEnd) {
      peachtreePayments = peachtreePayments.filter((pmt: any) => {
        const pmtDate = new Date(pmt.PaymentDate);
        if (options.dateRangeStart && pmtDate < options.dateRangeStart) return false;
        if (options.dateRangeEnd && pmtDate > options.dateRangeEnd) return false;
        return true;
      });
    }

    summary.total = peachtreePayments.length;

    for (const pp of peachtreePayments) {
      try {
        // Get customer mapping
        const [customerMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'customer'),
            eq(syncEntityMap.peachtreeId, pp.CustomerID)
          ))
          .limit(1);

        if (!customerMap) {
          this.errors.push({ entity: 'payment', id: pp.PaymentID, error: `Customer ${pp.CustomerID} not found` });
          summary.failed++;
          continue;
        }

        // Get invoice mapping if exists
        let invoiceId = null;
        if (pp.InvoiceNo) {
          const [invoiceMap] = await db
            .select()
            .from(syncEntityMap)
            .where(and(
              eq(syncEntityMap.companyId, this.companyId),
              eq(syncEntityMap.entityType, 'invoice'),
              eq(syncEntityMap.peachtreeId, pp.InvoiceNo)
            ))
            .limit(1);

          if (invoiceMap) {
            invoiceId = invoiceMap.sageflowId;
          }
        }

        const checksum = this.generateChecksum(pp);

        const [existingMap] = await db
          .select()
          .from(syncEntityMap)
          .where(and(
            eq(syncEntityMap.companyId, this.companyId),
            eq(syncEntityMap.entityType, 'payment'),
            eq(syncEntityMap.peachtreeId, pp.PaymentID)
          ))
          .limit(1);

        if (existingMap && existingMap.syncChecksum === checksum && !options.forceUpdate) {
          summary.skipped++;
          continue;
        }

        const paymentData = {
          companyId: this.companyId,
          customerId: customerMap.sageflowId,
          invoiceId: invoiceId,
          amount: pp.Amount?.toString() || '0',
          paymentDate: new Date(pp.PaymentDate),
          paymentMethod: pp.PaymentMethod || 'Cash',
          reference: pp.Reference || null,
        };

        if (options.dryRun) {
          summary.created++;
          continue;
        }

        if (existingMap) {
          await db.update(payments).set(paymentData).where(eq(payments.id, existingMap.sageflowId));
          await db.update(syncEntityMap).set({ lastSyncedAt: new Date(), syncChecksum: checksum }).where(eq(syncEntityMap.id, existingMap.id));
          summary.updated++;
        } else {
          const [newPayment] = await db.insert(payments).values(paymentData).returning();
          await db.insert(syncEntityMap).values({
            companyId: this.companyId,
            entityType: 'payment',
            peachtreeId: pp.PaymentID,
            sageflowId: newPayment.id,
            syncChecksum: checksum,
          });
          summary.created++;
        }
      } catch (error) {
        this.errors.push({ entity: 'payment', id: pp.PaymentID, error: String(error) });
        summary.failed++;
      }
    }

    return summary;
  }

  /**
   * Generate MD5 checksum for change detection
   */
  private generateChecksum(data: any): string {
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
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
    return 'ASSET';
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

  /**
   * Get sync history for company
   */
  static async getSyncHistory(companyId: string, limit = 20): Promise<SyncJob[]> {
    return db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.companyId, companyId))
      .orderBy(syncJobs.createdAt)
      .limit(limit);
  }

  /**
   * Get entity mapping stats
   */
  static async getMappingStats(companyId: string): Promise<Record<string, number>> {
    const mappings = await db
      .select()
      .from(syncEntityMap)
      .where(eq(syncEntityMap.companyId, companyId));

    const stats: Record<string, number> = {};
    for (const m of mappings) {
      stats[m.entityType] = (stats[m.entityType] || 0) + 1;
    }
    return stats;
  }
}

/**
 * Quick sync function for CLI usage
 */
export async function runHybridSync(companyId: string, options?: SyncOptions): Promise<SyncResult> {
  const sync = new PeachtreeHybridSync(companyId);
  return sync.sync(options);
}
