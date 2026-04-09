import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import { useAuth } from './hooks/useAuth'

function App() {
  const auth = useAuth()

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={auth.token ? '/dashboard' : '/auth'} replace />}
      />
      <Route
        path="/auth"
        element={auth.token ? <Navigate to="/dashboard" replace /> : <AuthPage auth={auth} />}
      />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute token={auth.token}>
            <DashboardPage auth={auth} />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
