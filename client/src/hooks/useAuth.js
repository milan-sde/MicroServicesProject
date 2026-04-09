import { useState } from 'react'
import api from '../services/api'
import {
  clearAuth,
  getToken,
  getUser,
  setToken as persistToken,
  setUser as persistUser,
} from '../utils/storage'

export function useAuth() {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUserState] = useState(() => getUser())

  const login = async ({ email, password }) => {
    const { data } = await api.post('/users/login', { email, password })
    applyAuth(data.token, data.user)
    return data
  }

  const register = async ({ email, password }) => {
    const username = email.split('@')[0]
    const { data } = await api.post('/users/signup', { username, email, password })
    return data
  }

  const logout = () => {
    clearAuth()
    setTokenState(null)
    setUserState(null)
  }

  const refreshProfile = async () => {
    const { data } = await api.get('/users/profile')
    if (data?.user) {
      applyUser(data.user)
    }
    return data?.user || null
  }

  function applyToken(nextToken) {
    if (!nextToken) {
      clearAuth()
      setTokenState(null)
      return
    }

    setTokenState(nextToken)
    persistToken(nextToken)
  }

  function applyUser(nextUser) {
    setUserState(nextUser)
    if (nextUser) {
      persistUser(nextUser)
    }
  }

  function applyAuth(nextToken, nextUser) {
    applyToken(nextToken)
    applyUser(nextUser)
  }

  return { token, user, login, register, logout, refreshProfile }
}
