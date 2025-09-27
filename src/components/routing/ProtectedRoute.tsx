import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactElement
  redirectTo?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectTo = '/signin' }) => {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return null
  }

  if (status !== 'authorized') {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
