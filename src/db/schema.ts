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
  companyId: text('company_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
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

// Customers
export const customers = pgTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
  customerId: text('customer_id').notNull(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoice Items
export const invoiceItems = pgTable('invoice_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id').notNull(),
  itemId: text('item_id'),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
});

// Payments
export const payments = pgTable('payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
  customerId: text('customer_id').notNull(),
  invoiceId: text('invoice_id'),
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
  companyId: text('company_id').notNull(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Item Categories
export const itemCategories = pgTable('item_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
});

// Stock Movements
export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: text('item_id').notNull(),
  type: movementTypeEnum('type').notNull(),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  cost: decimal('cost', { precision: 15, scale: 2 }),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  date: timestamp('date').notNull().defaultNow(),
  notes: text('notes'),
});

// Vendors
export const vendors = pgTable('vendors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
  vendorNumber: text('vendor_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: json('address'),
  taxId: text('tax_id'),
  paymentTerms: text('payment_terms'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chart of Accounts
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
  accountNumber: text('account_number').notNull(),
  accountName: text('account_name').notNull(),
  type: accountTypeEnum('type').notNull(),
  parentId: text('parent_id'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Bank Account Type Enum
export const bankAccountTypeEnum = pgEnum('bank_account_type', ['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'OTHER']);

// Bank Accounts
export const bankAccounts = pgTable('bank_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
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
  companyId: text('company_id').notNull(),
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
  journalEntryId: text('journal_entry_id').notNull(),
  accountId: text('account_id').notNull(),
  description: text('description'),
  debit: decimal('debit', { precision: 15, scale: 2 }).notNull().default('0'),
  credit: decimal('credit', { precision: 15, scale: 2 }).notNull().default('0'),
});

// Employees
export const employees = pgTable('employees', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull(),
  userId: text('user_id'), // Optional link to system user
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});



// Bank Transactions
export const bankTransactions = pgTable('bank_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  bankAccountId: text('bank_account_id').notNull(),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  reference: text('reference'),
  category: text('category'),
  isReconciled: boolean('is_reconciled').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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



// ============= ENUM TYPES =============

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type AccountType = (typeof accountTypeEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type ItemType = (typeof itemTypeEnum.enumValues)[number];
export type MovementType = (typeof movementTypeEnum.enumValues)[number];

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
