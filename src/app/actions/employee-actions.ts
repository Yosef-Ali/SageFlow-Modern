import { supabase } from "@/lib/supabase"
import { EmployeeFormValues } from "@/lib/validations/employee"
import { ActionResult } from "@/types/api"
export type { EmployeeFormValues }

function mapEmployeeResponse(data: any) {
  return {
    id: data.id,
    employeeCode: data.employee_code,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    jobTitle: data.job_title,
    department: data.department,
    phone: data.phone,
    isActive: data.is_active,
    createdAt: data.created_at
  }
}

export async function getEmployees(companyId: string, filters?: { search?: string }): Promise<ActionResult<any[]>> {
  try {
    if (!companyId) {
      return { success: true, data: [] }
    }

    // Fetch employees for this company only
    let query = supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('Employees query error:', error)
      return { success: false, error: error.message }
    }

    // Map to camelCase
    const mapped = (data || []).map(mapEmployeeResponse)

    return { success: true, data: mapped }
  } catch (error) {
    console.error("Error fetching employees:", error)
    return { success: false, error: "Failed to fetch employees" }
  }
}

export async function getEmployee(id: string, companyId?: string) {
  try {
    let query = supabase.from('employees').select('*').eq('id', id)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query.single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Failed to fetch employee" }
  }
}

export async function createEmployee(data: EmployeeFormValues, companyId: string) {
  try {
    if (!companyId) {
      return { success: false, error: "Company ID is required" }
    }

    const { data: newEmployee, error } = await supabase.from('employees').insert({
      company_id: companyId,
      employee_code: data.employeeCode,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email || null,
      job_title: data.jobTitle,
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
