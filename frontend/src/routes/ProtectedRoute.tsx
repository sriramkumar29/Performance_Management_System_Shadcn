import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = () => {
  const { user } = useAuth()
  const location = useLocation()
  return user ? (
    <div key={location.pathname} className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
      <Outlet />
    </div>
  ) : (
    <Navigate to="/login" replace />
  )
}

export default ProtectedRoute
