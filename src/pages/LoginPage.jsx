import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import AlertBox from '../components/ui/AlertBox'
import { useBudget } from '../context/BudgetContext'

const initialForm = {
  identifier: '',
  password: '',
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, authLoading, loginUser, authError, clearErrors } = useBudget()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  const targetPath = location.state?.from || '/'

  if (!authLoading && isAuthenticated) {
    return <Navigate to={targetPath} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    clearErrors()
    const result = await loginUser(form)
    setSubmitting(false)
    if (result.success) {
      navigate(targetPath, { replace: true })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">DTU Delhi Finance</p>
          <h1 className="mt-1 text-2xl font-bold text-text">Sign In</h1>
          <p className="mt-1 text-sm text-muted">
            Login as admin or user to access the DTU budget monitoring dashboard.
          </p>
        </div>

        {authError ? (
          <div className="mb-4">
            <AlertBox title="Login failed" message={authError} variant="warning" />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Email or Username</label>
            <input
              required
              value={form.identifier}
              onChange={(event) => setForm((previous) => ({ ...previous, identifier: event.target.value }))}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
              placeholder="admin@dtu.ac.in"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Password</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
