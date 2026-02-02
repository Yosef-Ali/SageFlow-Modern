import { supabase } from "@/lib/supabase"
import { EmployeeFormValues } from "@/lib/validations/employee"
import { ActionResult } from "@/types/api"
export type { EmployeeFormValues }

function mapEmployeeFromDb(dbEmployee: any) {
  if (!dbEmployee) return null
  return {
    id: dbEmployee.id,
    companyId: dbEmployee.company_id,
    employeeCode: dbEmployee.employee_code,
    firstName: dbEmployee.first_name,
    lastName: dbEmployee.last_name,
    email: dbEmployee.email || '',
    phone: dbEmployee.phone || '',
    jobTitle: dbEmployee.job_title || '',
    department: dbEmployee.department || '',
    ssn: dbEmployee.ssn || '',
    payMethod: dbEmployee.pay_method || '',
    payFrequency: dbEmployee.pay_frequency || '',
    address: dbEmployee.address || { street: '', city: '', state: '', zipCode: '', country: '' },
    hireDate: dbEmployee.hire_date,
    isActive: dbEmployee.is_active,
    employeeType: dbEmployee.employee_type || 'REGULAR',
    payRate: dbEmployee.pay_rate,
    overtimeRate: dbEmployee.overtime_rate || 1.5,
    bankAccountNo: dbEmployee.bank_account_no || '',
    bankName: dbEmployee.bank_name || '',
    taxId: dbEmployee.tax_id || '',
    emergencyContactName: dbEmployee.emergency_contact_name || '',
    emergencyContactPhone: dbEmployee.emergency_contact_phone || '',
    terminationDate: dbEmployee.termination_date,
    createdAt: dbEmployee.created_at,
    updatedAt: dbEmployee.updated_at,
  }
}

export async function getEmployees(companyId: string, filters?: { search?: string }): Promise<ActionResult<any[]>> {
  try {
    if (!companyId) {
      return { success: false, error: "Company ID is required" }
    }
    // Fetch employees without nested company relation (FK not configured in Supabase)
    let query = supabase.from('employees').select('*').eq('company_id', companyId).order('created_at', { ascending: false })

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('Employees query error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, data: data?.map(mapEmployeeFromDb) || [] }
  } catch (error) {
    console.error("Error fetching employees:", error)
    return { success: false, error: "Failed to fetch employees" }
  }
}

export async function getEmployee(id: string) {
  try {
    const { data, error } = await supabase.from('employees').select('*').eq('id', id).single()
    if (error) throw error
    return { success: true, data: mapEmployeeFromDb(data) }
  } catch (error) {
    return { success: false, error: "Failed to fetch employee" }
  }
}

export async function createEmployee(data: EmployeeFormValues & { companyId: string }) {
  try {
    if (!data.companyId) {
      return { success: false, error: "Company ID is required" }
    }
    const { data: newEmployee, error } = await supabase.from('employees').insert({
      company_id: data.companyId,
      employee_code: data.employeeCode,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email || null,
      job_title: data.jobTitle,
      department: data.department,
      phone: data.phone,
      ssn: data.ssn,
      pay_method: data.payMethod,
      pay_frequency: data.payFrequency,
      address: data.address,
      hire_date: data.hireDate || null,
      is_active: data.isActive,
      employee_type: data.employeeType,
      pay_rate: data.payRate,
      overtime_rate: data.overtimeRate,
      bank_account_no: data.bankAccountNo,
      bank_name: data.bankName,
      tax_id: data.taxId,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone,
      termination_date: data.terminationDate || null,
    }).select().single()

    if (error) throw error
    return { success: true, data: newEmployee }
  } catch (error) {
    console.error("Error creating employee:", error)
    return { success: false, error: "Failed to create employee" }
  }
}

export async function updateEmployee(id: string, data: EmployeeFormValues) {
  try {
    const { error } = await supabase.from('employees').update({
      employee_code: data.employeeCode,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email || null,
      job_title: data.jobTitle,
      department: data.department,
      phone: data.phone,
      ssn: data.ssn,
      pay_method: data.payMethod,
      pay_frequency: data.payFrequency,
      address: data.address,
      hire_date: data.hireDate || null,
      is_active: data.isActive,
      employee_type: data.employeeType,
      pay_rate: data.payRate,
      overtime_rate: data.overtimeRate,
      bank_account_no: data.bankAccountNo,
      bank_name: data.bankName,
      tax_id: data.taxId,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone,
      termination_date: data.terminationDate || null,
      updated_at: new Date()
    }).eq('id', id)

    if (error) throw error
    return { success: true, data: { id } }
  } catch (error) {
    return { success: false, error: "Failed to update employee" }
  }
}

export async function deleteEmployee(id: string) {
  try {
    const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to delete employee" }
  }
}
