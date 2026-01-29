import { pgTable, text, timestamp, decimal, boolean, pgEnum, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============= ENUMS =============
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'ACCOUNTANT', 'MANAGER', 'EMPLOYEE', 'VIEWER']);
export const accountTypeEnum = pgEnum('account_type', ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']);
export const itemTypeEnum = pgEnum('item_type', ['PRODUCT', 'SERVICE', 'BUNDLE']);
export const movementTypeEnum = pgEnum('movement_type', ['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN']);

// ============= TABLES =============

// Users & Authentication
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: userRoleEnum('role').notNull().default('EMPLOYEE'),
  companyId: text('company_id').notNull().references(() => companies.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Company
export const companies = pgTable('companies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  taxId: text('tax_id'),
  logoUrl: text('logo_url'),
  currency: text('currency').notNull().default('ETB'),
  settings: json('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Type Enum (Peachtree standard)
export const customerTypeEnum = pgEnum('customer_type', ['RETAIL', 'WHOLESALE', 'GOVERNMENT', 'NGO', 'CORPORATE', 'OTHER']);

// Payment Terms Enum (Peachtree standard)
export const paymentTermsEnum = pgEnum('payment_terms', [
  'DUE_ON_RECEIPT',
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  '2_10_NET_30', // 2% discount if paid within 10 days, otherwise net 30
  'COD'          // Cash on Delivery
]);

// Customers
export const customers = pgTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  customerNumber: text('customer_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  billingAddress: json('billing_address'),
  shippingAddress: json('shipping_address'),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  taxId: text('tax_id'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  // Peachtree-standard fields
  customerType: customerTypeEnum('customer_type').default('RETAIL'),
  paymentTerms: paymentTermsEnum('payment_terms').default('NET_30'),
  contactName: text('contact_name'),          // Primary contact person
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0'),
  taxExempt: boolean('tax_exempt').notNull().default(false),
  taxExemptNumber: text('tax_exempt_number'),  // Exemption certificate
  priceLevel: text('price_level').default('1'), // 1=Retail, 2=Wholesale, 3=Distributor
  salesRepId: text('sales_rep_id').references(() => employees.id),            // FK to employees
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).default('0'),
  openingBalanceDate: timestamp('opening_balance_date'),
  customerSince: timestamp('customer_since'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  invoiceNumber: text('invoice_number').notNull(),
  date: timestamp('date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  status: invoiceStatusEnum('status').notNull().default('DRAFT'),
  notes: text('notes'),
  terms: text('terms'),
  // Peachtree-standard fields
  salesRepId: text('sales_rep_id').references(() => employees.id),  // FK to employees
  poNumber: text('po_number'),  // Customer's PO reference
  shipMethod: text('ship_method'),  // DHL, EMS, Local Delivery, etc.
  shipDate: timestamp('ship_date'),
  shipAddress: json('ship_address'),
  dropShip: boolean('drop_ship').default(false),  // Ship direct from vendor
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoice Items
export const invoiceItems = pgTable('invoice_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  itemId: text('item_id').references(() => items.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
});

// Payments
export const payments = pgTable('payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  invoiceId: text('invoice_id').references(() => invoices.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  reference: text('reference'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Inventory Items
export const items = pgTable('items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: text('category_id'),
  unitOfMeasure: text('unit_of_measure').notNull(),
  type: itemTypeEnum('type').notNull().default('PRODUCT'),
  costPrice: decimal('cost_price', { precision: 15, scale: 2 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 15, scale: 2 }).notNull(),
  reorderPoint: decimal('reorder_point', { precision: 15, scale: 2 }).notNull().default('0'),
  reorderQuantity: decimal('reorder_quantity', { precision: 15, scale: 2 }).notNull().default('0'),
  quantityOnHand: decimal('quantity_on_hand', { precision: 15, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  // Peachtree-standard fields
  sellingPrice2: decimal('selling_price_2', { precision: 15, scale: 2 }),  // Wholesale price
  sellingPrice3: decimal('selling_price_3', { precision: 15, scale: 2 }),  // Distributor price
  preferredVendorId: text('preferred_vendor_id').references(() => vendors.id),  // FK to vendors
  taxable: boolean('taxable').notNull().default(true),  // Subject to 15% VAT
  weight: decimal('weight', { precision: 10, scale: 4 }),
  weightUnit: text('weight_unit').default('Kg'),  // Kg, Gram, etc.
  barcode: text('barcode'),  // UPC/EAN barcode
  location: text('location'),  // Warehouse location
  lastCostDate: timestamp('last_cost_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Item Categories
export const itemCategories = pgTable('item_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  parentId: text('parent_id').references((): any => itemCategories.id),
});

// Stock Movements
export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: text('item_id').notNull().references(() => items.id),
  type: movementTypeEnum('type').notNull(),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  cost: decimal('cost', { precision: 15, scale: 2 }),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  date: timestamp('date').notNull().defaultNow(),
  notes: text('notes'),
});

// Vendor Type Enum (Peachtree standard)
export const vendorTypeEnum = pgEnum('vendor_type', ['SUPPLIER', 'CONTRACTOR', 'GOVERNMENT', 'UTILITY', 'SERVICE_PROVIDER', 'OTHER']);

// Vendors
export const vendors = pgTable('vendors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  vendorNumber: text('vendor_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: json('address'),
  taxId: text('tax_id'),
  paymentTerms: paymentTermsEnum('payment_terms').default('NET_30'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  // Peachtree-standard fields
  vendorType: vendorTypeEnum('vendor_type').default('SUPPLIER'),
  contactName: text('contact_name'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0'),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }),
  taxExempt: boolean('tax_exempt').notNull().default(false),
  taxExemptNumber: text('tax_exempt_number'),
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).default('0'),
  openingBalanceDate: timestamp('opening_balance_date'),
  vendorSince: timestamp('vendor_since'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chart of Accounts
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  accountNumber: text('account_number').notNull(),
  accountName: text('account_name').notNull(),
  type: accountTypeEnum('type').notNull(),
  parentId: text('parent_id').references((): any => chartOfAccounts.id),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Bank Account Type Enum
export const bankAccountTypeEnum = pgEnum('bank_account_type', ['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'OTHER']);

// Bank Accounts
export const bankAccounts = pgTable('bank_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  accountName: text('account_name').notNull(),
  accountNumber: text('account_number'),
  bankName: text('bank_name'),
  accountType: bankAccountTypeEnum('account_type').notNull().default('CHECKING'),
  currency: text('currency').notNull().default('ETB'),
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Journal Entries
export const journalEntries = pgTable('journal_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  date: timestamp('date').notNull(),
  reference: text('reference'),
  description: text('description').notNull(),
  status: text('status').notNull().default('POSTED'), // 'DRAFT' | 'POSTED' | 'VOID'
  sourceType: text('source_type'), // 'INVOICE' | 'PAYMENT' | 'BILL' | 'MANUAL'
  sourceId: text('source_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Journal Lines
export const journalLines = pgTable('journal_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  journalEntryId: text('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => chartOfAccounts.id),
  description: text('description'),
  debit: decimal('debit', { precision: 15, scale: 2 }).notNull().default('0'),
  credit: decimal('credit', { precision: 15, scale: 2 }).notNull().default('0'),
});

// Employees
export const employees = pgTable('employees', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  userId: text('user_id').references(() => users.id), // Optional link to system user
  employeeCode: text('employee_code').notNull(), // Peachtree ID
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  jobTitle: text('job_title'),
  department: text('department'),
  email: text('email'),
  phone: text('phone'),
  address: json('address'),
  ssn: text('ssn'),
  payMethod: text('pay_method'),
  payFrequency: text('pay_frequency'),
  hireDate: timestamp('hire_date'),
  isActive: boolean('is_active').notNull().default(true),
  // Peachtree-standard payroll fields
  employeeType: text('employee_type').default('REGULAR'),  // REGULAR, CONTRACT, TEMPORARY
  payRate: decimal('pay_rate', { precision: 15, scale: 2 }),  // Hourly or monthly rate
  overtimeRate: decimal('overtime_rate', { precision: 5, scale: 2 }).default('1.5'),  // OT multiplier
  bankAccountNo: text('bank_account_no'),  // Salary deposit account
  bankName: text('bank_name'),
  taxId: text('tax_id'),  // Personal TIN
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  terminationDate: timestamp('termination_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Audit Logs

// ... (existing audit logs)
// auditLogs
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  action: text('action').notNull().default('UNKNOWN'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: text('details'),
  userId: text('user_id'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Purchases Enums
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED']);
export const billStatusEnum = pgEnum('bill_status', ['OPEN', 'PAID', 'OVERDUE', 'PARTIALLY_PAID']);

// Purchase Orders
export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  poNumber: text('po_number').notNull(),
  date: timestamp('date').notNull(),
  expectedDate: timestamp('expected_date'),
  status: purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Purchase Order Items
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  poId: text('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id),
  description: text('description'),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }).notNull(),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
});

// Bills
export const bills = pgTable('bills', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  poId: text('po_id').references(() => purchaseOrders.id), // Optional link to PO
  billNumber: text('bill_number').notNull(),
  date: timestamp('date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  status: billStatusEnum('status').notNull().default('OPEN'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Bill Payments
export const billPayments = pgTable('bill_payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  billId: text('bill_id').references(() => bills.id), // Can be null if deposit/prepayment, but usually linked
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  reference: text('reference'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});


// Bank Transactions
export const bankTransactions = pgTable('bank_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  bankAccountId: text('bank_account_id').notNull().references(() => bankAccounts.id),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  reference: text('reference'),
  category: text('category'),
  isReconciled: boolean('is_reconciled').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============= INVENTORY & SERVICES TABLES =============

// Assemblies (Bill of Materials)
export const assemblies = pgTable('assemblies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  itemId: text('item_id').notNull().references(() => items.id), // The item being built
  description: text('description'),
  yieldQuantity: decimal('yield_quantity', { precision: 15, scale: 4 }).notNull().default('1'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Assembly Items (Components)
export const assemblyItems = pgTable('assembly_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  assemblyId: text('assembly_id').notNull().references(() => assemblies.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id), // The component item
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(), // Qty required per yield
});

// Inventory Adjustments
export const inventoryAdjustments = pgTable('inventory_adjustments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  date: timestamp('date').notNull().defaultNow(),
  reference: text('reference'),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Adjustment Items (Lines)
export const adjustmentItems = pgTable('adjustment_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  adjustmentId: text('adjustment_id').notNull().references(() => inventoryAdjustments.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(), // Positive = add, Negative = remove
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }), // Cost at time of adjustment
});

// ============= BANKING TABLES =============

export const bankReconciliations = pgTable('bank_reconciliations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  bankAccountId: text('bank_account_id').notNull().references(() => bankAccounts.id),
  statementDate: timestamp('statement_date').notNull(),
  statementBalance: decimal('statement_balance', { precision: 15, scale: 2 }).notNull(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, COMPLETED
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const reconciliationItems = pgTable('reconciliation_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reconciliationId: text('reconciliation_id').notNull().references(() => bankReconciliations.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').notNull().references(() => bankTransactions.id),
  isCleared: boolean('is_cleared').notNull().default(false),
});

// ============= RELATIONS =============

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  sessions: many(sessions),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  invoices: many(invoices),
  items: many(items),
  vendors: many(vendors),
  auditLogs: many(auditLogs),
  purchaseOrders: many(purchaseOrders),
  bills: many(bills),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  invoices: many(invoices),
  payments: many(payments),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  item: one(items, {
    fields: [invoiceItems.itemId],
    references: [items.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  company: one(companies, {
    fields: [items.companyId],
    references: [companies.id],
  }),
  category: one(itemCategories, {
    fields: [items.categoryId],
    references: [itemCategories.id],
  }),
  invoiceItems: many(invoiceItems),
  stockMovements: many(stockMovements),
  purchaseOrderItems: many(purchaseOrderItems),
  // Inventory Relations
  assemblies: many(assemblies), // Items that are produced by assemblies
  assemblyComponents: many(assemblyItems), // Items used as components
  adjustmentItems: many(adjustmentItems),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  item: one(items, {
    fields: [stockMovements.itemId],
    references: [items.id],
  }),
}));

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  company: one(companies, {
    fields: [bankAccounts.companyId],
    references: [companies.id],
  }),
  transactions: many(bankTransactions),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankTransactions.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const bankReconciliationsRelations = relations(bankReconciliations, ({ one, many }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankReconciliations.bankAccountId],
    references: [bankAccounts.id],
  }),
  items: many(reconciliationItems),
}));

export const reconciliationItemsRelations = relations(reconciliationItems, ({ one }) => ({
  reconciliation: one(bankReconciliations, {
    fields: [reconciliationItems.reconciliationId],
    references: [bankReconciliations.id],
  }),
  transaction: one(bankTransactions, {
    fields: [reconciliationItems.transactionId],
    references: [bankTransactions.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  company: one(companies, {
    fields: [journalEntries.companyId],
    references: [companies.id],
  }),
  lines: many(journalLines),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  company: one(companies, {
    fields: [employees.companyId],
    references: [companies.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  company: one(companies, {
    fields: [auditLogs.companyId],
    references: [companies.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  company: one(companies, {
    fields: [purchaseOrders.companyId],
    references: [companies.id],
  }),
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  items: many(purchaseOrderItems),
  bills: many(bills),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.poId],
    references: [purchaseOrders.id],
  }),
  item: one(items, {
    fields: [purchaseOrderItems.itemId],
    references: [items.id],
  }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  company: one(companies, {
    fields: [bills.companyId],
    references: [companies.id],
  }),
  vendor: one(vendors, {
    fields: [bills.vendorId],
    references: [vendors.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [bills.poId],
    references: [purchaseOrders.id],
  }),
  payments: many(billPayments),
}));

export const billPaymentsRelations = relations(billPayments, ({ one }) => ({
  company: one(companies, {
    fields: [billPayments.companyId],
    references: [companies.id],
  }),
  vendor: one(vendors, {
    fields: [billPayments.vendorId],
    references: [vendors.id],
  }),
  bill: one(bills, {
    fields: [billPayments.billId],
    references: [bills.id],
  }),
}));


// Inventory Relations Definitions

export const assembliesRelations = relations(assemblies, ({ one, many }) => ({
  company: one(companies, {
    fields: [assemblies.companyId],
    references: [companies.id],
  }),
  item: one(items, {
    fields: [assemblies.itemId],
    references: [items.id],
  }),
  components: many(assemblyItems),
}));

export const assemblyItemsRelations = relations(assemblyItems, ({ one }) => ({
  assembly: one(assemblies, {
    fields: [assemblyItems.assemblyId],
    references: [assemblies.id],
  }),
  item: one(items, {
    fields: [assemblyItems.itemId],
    references: [items.id],
  }),
}));

export const inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one, many }) => ({
  company: one(companies, {
    fields: [inventoryAdjustments.companyId],
    references: [companies.id],
  }),
  items: many(adjustmentItems),
}));

export const adjustmentItemsRelations = relations(adjustmentItems, ({ one }) => ({
  adjustment: one(inventoryAdjustments, {
    fields: [adjustmentItems.adjustmentId],
    references: [inventoryAdjustments.id],
  }),
  item: one(items, {
    fields: [adjustmentItems.itemId],
    references: [items.id],
  }),
}));

// ============= ENUM TYPES =============

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type AccountType = (typeof accountTypeEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type ItemType = (typeof itemTypeEnum.enumValues)[number];
export type MovementType = (typeof movementTypeEnum.enumValues)[number];
export type PurchaseOrderStatus = (typeof purchaseOrderStatusEnum.enumValues)[number];
export type BillStatus = (typeof billStatusEnum.enumValues)[number];
export type CustomerType = (typeof customerTypeEnum.enumValues)[number];
export type PaymentTerms = (typeof paymentTermsEnum.enumValues)[number];
export type VendorType = (typeof vendorTypeEnum.enumValues)[number];

// ============= TABLE TYPES =============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type ItemCategory = typeof itemCategories.$inferSelect;
export type NewItemCategory = typeof itemCategories.$inferInsert;

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export type JournalLine = typeof journalLines.$inferSelect;
export type NewJournalLine = typeof journalLines.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;

export type BillPayment = typeof billPayments.$inferSelect;
export type NewBillPayment = typeof billPayments.$inferInsert;

export type Assembly = typeof assemblies.$inferSelect;
export type NewAssembly = typeof assemblies.$inferInsert;

export type AssemblyItem = typeof assemblyItems.$inferSelect;
export type NewAssemblyItem = typeof assemblyItems.$inferInsert;

export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type NewInventoryAdjustment = typeof inventoryAdjustments.$inferInsert;

export type AdjustmentItem = typeof adjustmentItems.$inferSelect;
export type NewAdjustmentItem = typeof adjustmentItems.$inferInsert;

export type BankReconciliation = typeof bankReconciliations.$inferSelect;
export type NewBankReconciliation = typeof bankReconciliations.$inferInsert;

export type ReconciliationItem = typeof reconciliationItems.$inferSelect;
export type NewReconciliationItem = typeof reconciliationItems.$inferInsert;

// ============= PEACHTREE SYNC TRACKING =============

// Sync Status Enum
export const syncStatusEnum = pgEnum('sync_status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL']);

// Sync Jobs - Track each migration/sync operation
export const syncJobs = pgTable('sync_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  jobType: text('job_type').notNull(), // 'FULL_MIGRATION' | 'SELECTIVE_SYNC' | 'INCREMENTAL_SYNC'
  status: syncStatusEnum('status').notNull().default('PENDING'),
  entities: json('entities').$type<string[]>(), // ['customers', 'invoices', 'items']
  dateRangeStart: timestamp('date_range_start'),
  dateRangeEnd: timestamp('date_range_end'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalRecords: decimal('total_records', { precision: 10, scale: 0 }).default('0'),
  processedRecords: decimal('processed_records', { precision: 10, scale: 0 }).default('0'),
  failedRecords: decimal('failed_records', { precision: 10, scale: 0 }).default('0'),
  errorLog: json('error_log').$type<Array<{ entity: string; id: string; error: string }>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Sync Entity Map - Track individual record mappings
export const syncEntityMap = pgTable('sync_entity_map', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  entityType: text('entity_type').notNull(), // 'customer', 'invoice', 'item', 'vendor', etc.
  peachtreeId: text('peachtree_id').notNull(), // Original ID in Peachtree
  sageflowId: text('sageflow_id').notNull(), // New ID in SageFlow
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
  syncChecksum: text('sync_checksum'), // MD5 hash of data for change detection
  isDeleted: boolean('is_deleted').notNull().default(false),
});

// Sync Configuration - Store connection settings
export const syncConfigs = pgTable('sync_configs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().unique().references(() => companies.id),
  connectionType: text('connection_type').notNull().default('ODBC'), // 'ODBC' | 'FILE_IMPORT'
  dsn: text('dsn'),
  username: text('username'),
  password: text('password'), // Should be encrypted in production
  lastConnectionTest: timestamp('last_connection_test'),
  connectionStatus: text('connection_status'), // 'CONNECTED' | 'FAILED' | 'UNTESTED'
  autoSyncEnabled: boolean('auto_sync_enabled').notNull().default(false),
  autoSyncInterval: text('auto_sync_interval').default('DAILY'), // 'HOURLY', 'DAILY', 'WEEKLY'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations for sync tables
export const syncJobsRelations = relations(syncJobs, ({ one }) => ({
  company: one(companies, {
    fields: [syncJobs.companyId],
    references: [companies.id],
  }),
}));

export const syncEntityMapRelations = relations(syncEntityMap, ({ one }) => ({
  company: one(companies, {
    fields: [syncEntityMap.companyId],
    references: [companies.id],
  }),
}));

export const syncConfigsRelations = relations(syncConfigs, ({ one }) => ({
  company: one(companies, {
    fields: [syncConfigs.companyId],
    references: [companies.id],
  }),
}));

// Types
export type SyncJob = typeof syncJobs.$inferSelect;
export type NewSyncJob = typeof syncJobs.$inferInsert;

export type SyncEntityMap = typeof syncEntityMap.$inferSelect;
export type NewSyncEntityMap = typeof syncEntityMap.$inferInsert;

export type SyncConfig = typeof syncConfigs.$inferSelect;
export type NewSyncConfig = typeof syncConfigs.$inferInsert;
