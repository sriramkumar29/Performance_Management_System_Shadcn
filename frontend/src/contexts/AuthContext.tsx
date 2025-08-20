import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../utils/api'

export interface Employee {
  emp_id: number
  emp_name: string
  emp_email: string
  emp_department?: string
  emp_roles?: string
  emp_roles_level?: number
  emp_reporting_manager_id?: number | null
  emp_status?: boolean
}

interface AuthContextValue {
  user: Employee | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  loginByEmail: (email: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hydrate user from sessionStorage on first render
  const [user, setUser] = useState<Employee | null>(() => {
    try {
      const raw = sessionStorage.getItem('auth_user')
      return raw ? (JSON.parse(raw) as Employee) : null
    } catch {
      return null
    }
  })
  const [status, setStatus] = useState<AuthContextValue['status']>(() => (sessionStorage.getItem('auth_user') ? 'succeeded' : 'idle'))

  const loginByEmail = async (email: string) => {
    setStatus('loading')
    try {
      const res = await apiFetch<Employee>(`/api/employees/by-email?email=${encodeURIComponent(email)}`)
      if (!res.ok || !res.data) throw new Error(res.error || 'Invalid email')
      setUser(res.data)
      setStatus('succeeded')
    } catch (e) {
      setStatus('failed')
      throw e
    }
  }

  const logout = () => {
    setUser(null)
    setStatus('idle')
  }

  // Persist user to sessionStorage on changes
  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem('auth_user', JSON.stringify(user))
      } else {
        sessionStorage.removeItem('auth_user')
      }
    } catch {
      // no-op
    }
  }, [user])

  const value = useMemo(() => ({ user, status, loginByEmail, logout }), [user, status])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
