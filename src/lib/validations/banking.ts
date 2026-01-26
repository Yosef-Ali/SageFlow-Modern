import { z } from 'zod'

export const bankAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().optional(),
  accountType: z.string().min(1, 'Account type is required'),
  currency: z.string().default('ETB'),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true)
})

export const bankTransactionSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank account is required'),
  date: z.date(),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
  category: z.string().optional(),
  reference: z.string().optional()
})

export const reconciliationSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank account is required'),
  statementDate: z.date(),
  statementBalance: z.number(),
  status: z.enum(['DRAFT', 'COMPLETED']).default('DRAFT')
})

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>
export type BankTransactionFormValues = z.infer<typeof bankTransactionSchema>
export type ReconciliationFormValues = z.infer<typeof reconciliationSchema>
