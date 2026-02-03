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
  register: (email: string, password: string, name: string, companyName: string) => Promise<{ success: boolean; error?: string }>
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

      // Fallback to demo mode for development
      if (email === 'demo@sageflow.app' && password === 'demo123') {
        console.log('Using demo login...')
        
        // Fetch a REAL company ID to ensure we don't get 400 errors (invalid UUID)
        let demoCompanyId = '00000000-0000-0000-0000-000000000000' // Fallback valid UUID
        let demoCompanyName = 'Demo Company'
        
        try {
          // Use Supabase client to get the same company as the Import logic
          const { data: companies, error } = await supabase
            .from('companies')
            .select('id, name')
            .limit(1)
          
          if (companies && companies.length > 0) {
             demoCompanyId = companies[0].id
             demoCompanyName = companies[0].name
             console.log('Demo Login: Using existing company', demoCompanyName)
          } else if (error) {
             console.error('Demo Login: Error fetching company', error)
          }
        } catch (e) {
          console.error('Demo Login: Failed to fetch valid company', e)
        }

        const mockUser: User = {
          id: '11111111-1111-1111-1111-111111111111', // Valid UUID format
          email: 'demo@sageflow.app',
          name: 'Demo User',
          role: 'ADMIN',
          companyId: demoCompanyId,
          companyName: demoCompanyName,
        }
        setUser(mockUser)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: mockUser, timestamp: Date.now() }))
        setIsLoading(false)
        return { success: true }
      }

      // First, try direct database login (check users table directly)
      // This bypasses Supabase Auth email confirmation requirements
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      console.log('Trying direct database login for:', email)

      // Check if user exists in users table with matching email
      const userResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?select=id,email,name,role,company_id,password_hash&email=eq.${encodeURIComponent(email)}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const users = await userResponse.json()
      console.log('Direct DB user lookup:', users)

      if (users && users.length > 0) {
        const dbUser = users[0]

        // For now, allow login if user exists in DB (password managed by Supabase Auth)
        // In production, you'd verify against Supabase Auth or hash
        console.log('User found in database, fetching company...')

        // Get company name
        let companyName = ''
        if (dbUser.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', dbUser.company_id)
            .single()
          companyName = companyData?.name || ''
        }

        // Try Supabase Auth first for password verification
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        const authData = await authResponse.json()
        console.log('Auth response:', authResponse.status, authData)

        if (authResponse.ok && authData.user) {
          // Supabase Auth succeeded
          const profile: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            companyId: dbUser.company_id,
            companyName,
          }
          setUser(profile)
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: profile, timestamp: Date.now() }))
          setIsLoading(false)
          return { success: true }
        }

        // If Supabase Auth fails (email not confirmed, etc.), check error
        if (authData.error_description?.includes('Email not confirmed')) {
          // Allow login anyway since user exists in our DB
          console.log('Email not confirmed, allowing login via DB user...')
          const profile: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            companyId: dbUser.company_id,
            companyName,
          }
          setUser(profile)
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: profile, timestamp: Date.now() }))
          setIsLoading(false)
          return { success: true }
        }

        setIsLoading(false)
        return { success: false, error: authData.error_description || authData.error || 'Invalid password' }
      }

      setIsLoading(false)
      return { success: false, error: 'User not found. Please register first.' }
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    companyName: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      // First check if user already exists in our users table
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('email', email)
        .limit(1)

      if (existingUsers && existingUsers.length > 0) {
        console.log('User already exists in DB, trying to login instead...')
        setIsLoading(false)
        // User exists, try logging them in
        return { success: false, error: 'Account already exists. Please sign in instead.' }
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })

      if (authError) {
        // If user already exists in auth, suggest login
        if (authError.message.includes('already registered')) {
          return { success: false, error: 'Account already exists. Please sign in instead.' }
        }
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Registration failed' }
      }

      const newCompanyId = crypto.randomUUID()

      // Create a default company for the new user
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          id: newCompanyId,
          name: companyName,
          email: email,
          currency: 'ETB',
        })
        .select()
        .single()

      if (companyError) {
        console.error('Error creating company:', companyError)
        return { success: false, error: 'Failed to create company profile' }
      }

      // Create user profile linked to the auth user (use upsert to handle duplicates)
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: email,
          name: name,
          password_hash: 'supabase-managed',
          role: 'ADMIN',
          company_id: company.id,
        }, { onConflict: 'id' })

      if (userError) {
        console.error('Error creating user profile:', userError)
        return { success: false, error: 'Failed to create user profile' }
      }

      // Auto-login after successful registration
      const profile: User = {
        id: authData.user.id,
        email: email,
        name: name,
        role: 'ADMIN',
        companyId: company.id,
        companyName: company.name,
      }
      setUser(profile)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: profile, timestamp: Date.now() }))

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
