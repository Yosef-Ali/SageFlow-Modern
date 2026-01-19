'use server'

import { hash } from "bcryptjs"
import { db } from "@/db"
import { users, companies, chartOfAccounts, AccountType } from "@/db/schema"
import { eq } from "drizzle-orm"
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth"

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Register a new user with a new company
 */
export async function registerUser(
  data: RegisterFormValues
): Promise<ActionResult<{ userId: string; companyId: string }>> {
  try {
    // Validate data
    const validatedData = registerSchema.parse(data)

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email.toLowerCase()),
    })

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
      }
    }

    // Hash password
    const passwordHash = await hash(validatedData.password, 12)

    // Create company and user in a transaction
    const result = await db.transaction(async (tx) => {
      // Create company
      const [company] = await tx
        .insert(companies)
        .values({
          name: validatedData.companyName,
          email: validatedData.email.toLowerCase(),
          currency: "ETB", // Default to Ethiopian Birr
        })
        .returning()

      // Create user as ADMIN (first user of company)
      const [user] = await tx
        .insert(users)
        .values({
          email: validatedData.email.toLowerCase(),
          passwordHash,
          name: validatedData.name,
          role: "ADMIN",
          companyId: company.id,
        })
        .returning()

      // Create default chart of accounts for Ethiopian businesses
      await createDefaultChartOfAccounts(tx, company.id)

      return { userId: user.id, companyId: company.id }
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error registering user:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register user",
    }
  }
}

/**
 * Create default chart of accounts for a new company
 */
async function createDefaultChartOfAccounts(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  companyId: string
): Promise<void> {
  const defaultAccounts: { accountNumber: string; accountName: string; type: AccountType }[] = [
    // Assets
    { accountNumber: "1000", accountName: "Cash", type: "ASSET" },
    { accountNumber: "1100", accountName: "Bank Account - ETB", type: "ASSET" },
    { accountNumber: "1200", accountName: "Accounts Receivable", type: "ASSET" },
    { accountNumber: "1300", accountName: "Inventory", type: "ASSET" },
    { accountNumber: "1400", accountName: "Prepaid Expenses", type: "ASSET" },
    // Liabilities
    { accountNumber: "2000", accountName: "Accounts Payable", type: "LIABILITY" },
    { accountNumber: "2100", accountName: "VAT Payable", type: "LIABILITY" },
    { accountNumber: "2200", accountName: "Salaries Payable", type: "LIABILITY" },
    { accountNumber: "2300", accountName: "Loans Payable", type: "LIABILITY" },
    // Equity
    { accountNumber: "3000", accountName: "Owner's Equity", type: "EQUITY" },
    { accountNumber: "3100", accountName: "Retained Earnings", type: "EQUITY" },
    // Revenue
    { accountNumber: "4000", accountName: "Sales Revenue", type: "REVENUE" },
    { accountNumber: "4100", accountName: "Service Revenue", type: "REVENUE" },
    { accountNumber: "4200", accountName: "Other Income", type: "REVENUE" },
    // Expenses
    { accountNumber: "5000", accountName: "Cost of Goods Sold", type: "EXPENSE" },
    { accountNumber: "5100", accountName: "Salaries Expense", type: "EXPENSE" },
    { accountNumber: "5200", accountName: "Rent Expense", type: "EXPENSE" },
    { accountNumber: "5300", accountName: "Utilities Expense", type: "EXPENSE" },
    { accountNumber: "5400", accountName: "Office Supplies", type: "EXPENSE" },
    { accountNumber: "5500", accountName: "Marketing Expense", type: "EXPENSE" },
    { accountNumber: "5600", accountName: "Bank Charges", type: "EXPENSE" },
  ]

  for (const account of defaultAccounts) {
    await tx.insert(chartOfAccounts).values({
      companyId,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      type: account.type,
    })
  }
}

/**
 * Add a new user to an existing company (admin only)
 */
export async function addUserToCompany(
  data: {
    email: string
    name: string
    password: string
    role: "ADMIN" | "ACCOUNTANT" | "MANAGER" | "EMPLOYEE" | "VIEWER"
  },
  companyId: string
): Promise<ActionResult<{ userId: string }>> {
  try {
    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    })

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists",
      }
    }

    // Hash password
    const passwordHash = await hash(data.password, 12)

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role,
        companyId,
      })
      .returning()

    return {
      success: true,
      data: { userId: user.id },
    }
  } catch (error) {
    console.error("Error adding user to company:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add user",
    }
  }
}
