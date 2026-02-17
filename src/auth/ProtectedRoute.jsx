import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { hasPermission } from './permissions.js'

/**
 * Route guard that checks authentication and role-based access
 *
 * @param {string} module - The module key (e.g., 'orders', 'products')
 * @param {string} [action='read'] - The action to check ('read' or 'write')
 * @param {React.ReactNode} children - The protected component
 */
export default function ProtectedRoute({ module, action = 'read', children }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (module && !hasPermission(user.role, module, action)) {
    return <Navigate to="/403" replace />
  }

  return children
}
