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

export async function getEmployees(filters?: { search?: string }): Promise<ActionResult<any[]>> {
  try {
    // Fetch employees without nested company relation (FK not configured in Supabase)
    let query = supabase.from('employees').select('*').order('created_at', { ascending: false })

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

export async function getEmployee(id: string) {
  try {
    const { data, error } = await supabase.from('employees').select('*').eq('id', id).single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Failed to fetch employee" }
  }
}

export async function createEmployee(data: EmployeeFormValues) {
  try {
    const { data: newEmployee, error } = await supabase.from('employees').insert({
      employee_code: data.employeeCode,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email || null, // Handle optional empty string
      job_title: data.jobTitle,
      // Add other mapped fields as needed
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
