import { z } from 'zod'

export const bankAccountSchema = z.object({
  name: z.string().min(1, 'Account Name is required'),
  accountNumber: z.string().min(1, 'Account Number is required'),
  openingBalance: z.number().default(0),
  currency: z.string().default('ETB'),
  isActive: z.boolean().optional(),
})

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>

// Manual Transaction Entry (if needed separate from deposits/payments)
// Usually we have: Deposit, Withdrawal, Transfer.
export const bankTransactionSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank Account is required'),
  date: z.date(),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
  amount: z.number().min(0.01, 'Amount must be positive'),
  reference: z.string().optional(),
  category: z.string().optional(), // Expense Category / Income Category
})

export type BankTransactionFormValues = z.infer<typeof bankTransactionSchema>

export const reconciliationSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank Account is required'),
  statementDate: z.date(),
  statementBalance: z.number(),
})

export type ReconciliationFormValues = z.infer<typeof reconciliationSchema>
