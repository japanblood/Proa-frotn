import { createContext, useCallback, useMemo, useState } from 'react'
import { authApi } from '../api/authApi'
import { tokenStorage } from './tokenStorage'

export const AuthContext = createContext(null)

// Decodifica el payload del JWT (solo para UI; la autoridad real es el backend)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

function isExpired(claims) {
  return !claims?.exp || claims.exp * 1000 < Date.now()
}

function readSession() {
  const token = tokenStorage.get()
  if (!token) return null
  const claims = decodeJwt(token)
  if (isExpired(claims)) {
    tokenStorage.clear()
    return null
  }
  return { token, claims }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  const login = useCallback(async (credentials) => {
    const { token } = await authApi.login(credentials)
    tokenStorage.set(token)
    setSession({ token, claims: decodeJwt(token) })
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: !!session,
      // Ajusta el claim al que emita tu backend (roles, authorities, role...)
      roles: session?.claims?.roles ?? [],
      login,
      logout,
    }),
    [session, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}