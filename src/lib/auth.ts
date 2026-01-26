// Auth utilities for Vite React SPA
// Note: This replaces NextAuth with a simple client-side auth system
// For production, integrate with your backend API

export interface User {
  id: string
  email: string
  name: string | null
  role: string
  companyId: string
  companyName: string
}

export interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

// Mock authentication - replace with actual API calls
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  // Demo credentials
  if (email === 'demo@sageflow.app' && password === 'demo123') {
    return {
      success: true,
      user: {
        id: 'demo-user-1',
        email: 'demo@sageflow.app',
        name: 'Demo User',
        role: 'admin',
        companyId: 'demo-company-1',
        companyName: 'SageFlow Demo',
      }
    }
  }

  return {
    success: false,
    error: 'Invalid email or password'
  }
}

export function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('auth-user')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

export function storeUser(user: User): void {
  localStorage.setItem('auth-user', JSON.stringify(user))
}

export function clearStoredUser(): void {
  localStorage.removeItem('auth-user')
}
