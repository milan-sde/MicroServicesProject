import { Navigate } from 'react-router-dom'

function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/auth" replace />
  }

  return children
}

export default ProtectedRoute
