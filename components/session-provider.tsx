'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type User = {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

type SessionContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
})

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/get-session')
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      console.error('Failed to fetch session:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Sign in failed')
    }
    
    await fetchSession()
  }

  const signUp = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Sign up failed')
    }
    
    await fetchSession()
  }

  const signOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    setUser(null)
  }

  return (
    <SessionContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </SessionContext.Provider>
  )
}
