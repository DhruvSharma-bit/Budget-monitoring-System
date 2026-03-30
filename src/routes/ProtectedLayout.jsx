import { Navigate, useLocation } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import { useBudget } from '../context/BudgetContext'

function ProtectedLayout() {
  const location = useLocation()
  const { authLoading, isAuthenticated } = useBudget()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="panel w-full max-w-md p-6 text-center">
          <p className="text-sm font-medium text-muted">Checking your session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <AppLayout />
}

export default ProtectedLayout
