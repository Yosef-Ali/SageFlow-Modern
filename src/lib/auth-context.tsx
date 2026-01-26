import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'
import { getErrorMessage } from './error-utils'

export interface User {
  id: string
  email: string
  name: string | null
  role: string
  companyId: string
  companyName: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'sageflow_auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    console.log('fetchUserProfile called with:', userId)

    try {
      console.log('Fetching user from users table using direct fetch...')

      // Use direct fetch to bypass any Supabase client issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(
        `${supabaseUrl}/rest/v1/users?select=id,email,name,role,company_id&id=eq.${userId}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('Fetch response status:', response.status)
      const data = await response.json()
      console.log('Fetch response data:', data)

      const userData = Array.isArray(data) ? data[0] : null
      const userError = !userData ? { message: 'User not found' } : null

      console.log('User query result:', { userData, userError })

      if (userError || !userData) {
        console.error('Error fetching user:', userError)
        return null
      }

      // Then get company name
      let companyName = ''
      if (userData.company_id) {
        console.log('Fetching company name for:', userData.company_id)
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', userData.company_id)
          .single()
        companyName = companyData?.name || ''
        console.log('Company query result:', companyData)
      }

      const profile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        companyId: userData.company_id,
        companyName,
      }
      console.log('Returning profile:', profile)
      return profile
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
    }
  }

  // Initialize auth state on mount - using localStorage only (no Supabase calls)
  useEffect(() => {
    console.log('Initializing auth from localStorage...')

    // Check localStorage for cached user
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Use cached data if less than 24 hours old
        if (parsed.user && parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          console.log('Using cached user:', parsed.user.email)
          setUser(parsed.user)
        } else {
          console.log('Cached user expired, clearing')
          localStorage.removeItem(AUTH_STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    } else {
      console.log('No cached user found')
    }

    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      console.log('Login attempt for:', email)

      // Clear localStorage only (don't call signOut - it may hang)
      localStorage.removeItem(AUTH_STORAGE_KEY)

      // Fallback to demo mode for development - fetch real company from database
      if (email === 'demo@sageflow.app' && password === 'demo123') {
        // Get the first company from the database
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .limit(1)

        const company = companies?.[0]

        const mockUser: User = {
          id: 'demo-user-id',
          email: 'demo@sageflow.app',
          name: 'Demo User',
          role: 'ADMIN',
          companyId: company?.id || 'demo-company-id',
          companyName: company?.name || 'Demo Company',
        }
        console.log('Demo login with company:', company)
        setUser(mockUser)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: mockUser, timestamp: Date.now() }))
        setIsLoading(false)
        return { success: true }
      }

      // Try Supabase Auth using direct fetch (bypass Supabase client)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const requestBody = JSON.stringify({ email, password })
      const requestUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`

      console.log('Auth request details:', {
        url: requestUrl,
        apiKeyLength: supabaseKey?.length,
        body: requestBody,
      })

      const authResponse = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      console.log('Auth response status:', authResponse.status)
      const authData = await authResponse.json()
      console.log('Auth response full:', authData)

      if (!authResponse.ok || authData.error) {
        setIsLoading(false)
        return { success: false, error: authData.error_description || authData.error || 'Login failed' }
      }

      if (authData.user) {
        console.log('Fetching profile for:', authData.user.id)
        const profile = await fetchUserProfile(authData.user.id)
        console.log('Profile result:', profile)

        if (profile) {
          setUser(profile)
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: profile, timestamp: Date.now() }))
          setIsLoading(false)
          return { success: true }
        }
        setIsLoading(false)
        return { success: false, error: 'User profile not found. Please contact support.' }
      }

      setIsLoading(false)
      return { success: false, error: 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Registration failed' }
      }

      // Create a default company for the new user
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: `${name}'s Company`,
          email: email,
          currency: 'ETB',
        })
        .select()
        .single()

      if (companyError) {
        console.error('Error creating company:', companyError)
        return { success: false, error: 'Failed to create company profile' }
      }

      // Create user profile linked to the auth user
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          name: name,
          password_hash: 'supabase-managed',
          role: 'ADMIN',
          company_id: company.id,
        })

      if (userError) {
        console.error('Error creating user profile:', userError)
        return { success: false, error: 'Failed to create user profile' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: getErrorMessage(error) }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: updatedUser, timestamp: Date.now() }))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
