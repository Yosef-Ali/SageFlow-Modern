import { z } from 'zod';

export const employeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  ssn: z.string().optional(),
  payMethod: z.string().optional(),
  payFrequency: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  hireDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  // Peachtree payroll fields
  employeeType: z.string().default('REGULAR'),
  payRate: z.number().min(0).optional(),
  overtimeRate: z.number().min(1).default(1.5),
  bankAccountNo: z.string().optional(),
  bankName: z.string().optional(),
  taxId: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  terminationDate: z.string().optional().nullable(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
