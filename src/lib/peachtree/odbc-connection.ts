// Peachtree ODBC Connection Configuration
// This connects to legacy Peachtree/Sage 50 database via ODBC

import odbc from 'odbc';

interface PeachtreeConfig {
  dsn: string; // Data Source Name configured in ODBC
  username?: string;
  password?: string;
  connectionString?: string;
}

export class PeachtreeODBCConnection {
  private config: PeachtreeConfig;
  private connection: any = null;

  constructor(config: PeachtreeConfig) {
    this.config = config;
  }

  /**
   * Connect to Peachtree database via ODBC
   */
  async connect(): Promise<void> {
    try {
      const connectionString = this.config.connectionString || 
        `DSN=${this.config.dsn}${this.config.username ? `;UID=${this.config.username}` : ''}${this.config.password ? `;PWD=${this.config.password}` : ''}`;

      this.connection = await odbc.connect(connectionString);
      console.log('✅ Connected to Peachtree database');
    } catch (error) {
      console.error('❌ Failed to connect to Peachtree:', error);
      throw new Error(`Peachtree ODBC connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from Peachtree database
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      console.log('✅ Disconnected from Peachtree database');
    }
  }

  /**
   * Execute a query on Peachtree database
   */
  async query<T = any>(sql: string): Promise<T[]> {
    if (!this.connection) {
      throw new Error('Not connected to Peachtree database. Call connect() first.');
    }

    try {
      const result = await this.connection.query(sql);
      return result as T[];
    } catch (error) {
      console.error('❌ Query failed:', error);
      throw error;
    }
  }

  /**
   * Get all customers from Peachtree
   */
  async getCustomers() {
    const sql = `
      SELECT 
        CustomerID,
        CustomerName,
        Contact,
        Address1,
        Address2,
        City,
        State,
        ZipCode,
        Country,
        Phone,
        Fax,
        Email,
        Balance,
        CreditLimit
      FROM Customer
      WHERE IsActive = 1
    `;

    return this.query(sql);
  }

  /**
   * Get all invoices from Peachtree
   */
  async getInvoices() {
    const sql = `
      SELECT 
        InvoiceNo,
        CustomerID,
        InvoiceDate,
        DueDate,
        Subtotal,
        TaxAmount,
        TotalAmount,
        AmountPaid,
        Balance,
        Status
      FROM Invoice
      ORDER BY InvoiceDate DESC
    `;

    return this.query(sql);
  }

  /**
   * Get invoice line items
   */
  async getInvoiceItems(invoiceNo: string) {
    const sql = `
      SELECT 
        InvoiceNo,
        LineNumber,
        ItemID,
        Description,
        Quantity,
        UnitPrice,
        TaxAmount,
        LineTotal
      FROM InvoiceItem
      WHERE InvoiceNo = '${invoiceNo}'
      ORDER BY LineNumber
    `;

    return this.query(sql);
  }

  /**
   * Get all inventory items from Peachtree
   */
  async getItems() {
    const sql = `
      SELECT 
        ItemID,
        ItemName,
        Description,
        UnitOfMeasure,
        UnitPrice,
        Cost,
        QuantityOnHand,
        ReorderPoint,
        IsActive
      FROM InventoryItem
      WHERE IsActive = 1
    `;

    return this.query(sql);
  }

  /**
   * Get all vendors from Peachtree
   */
  async getVendors() {
    const sql = `
      SELECT 
        VendorID,
        VendorName,
        Contact,
        Address1,
        Address2,
        City,
        State,
        ZipCode,
        Phone,
        Email,
        PaymentTerms,
        IsActive
      FROM Vendor
      WHERE IsActive = 1
    `;

    return this.query(sql);
  }

  /**
   * Get chart of accounts
   */
  async getChartOfAccounts() {
    const sql = `
      SELECT 
        AccountNumber,
        AccountName,
        AccountType,
        Balance,
        IsActive
      FROM ChartOfAccounts
      WHERE IsActive = 1
      ORDER BY AccountNumber
    `;

    return this.query(sql);
  }

  /**
   * Get payments
   */
  async getPayments() {
    const sql = `
      SELECT 
        PaymentID,
        CustomerID,
        InvoiceNo,
        PaymentDate,
        Amount,
        PaymentMethod,
        Reference
      FROM Payment
      ORDER BY PaymentDate DESC
    `;

    return this.query(sql);
  }
}

/**
 * Create Peachtree ODBC connection instance
 */
export function createPeachtreeConnection(config: PeachtreeConfig) {
  return new PeachtreeODBCConnection(config);
}

/**
 * Default Peachtree ODBC configuration
 * Update these values in .env.local
 */
export const defaultPeachtreeConfig: PeachtreeConfig = {
  dsn: process.env.PEACHTREE_DSN || 'Peachtree',
  username: process.env.PEACHTREE_USERNAME,
  password: process.env.PEACHTREE_PASSWORD,
};
