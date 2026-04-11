import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useBudget } from '../context/BudgetContext'
import DTULogo from '../assest/dtu-logo.png'
import BgImage from '../assest/new.jpg'

const initialForm = {
  identifier: '',
  password: '',
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, authLoading, loginUser, authError, clearErrors } = useBudget()

  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const params = new URLSearchParams(location.search)
  const nextFromQuery = params.get('next')
  const nextFromState = location.state?.from
  const next = nextFromQuery || nextFromState || '/'

  if (!authLoading && isAuthenticated) {
    return <Navigate to={next} replace />
  }

  const validate = () => {
    const validationErrors = {}
    const id = form.identifier.trim()
    const password = form.password

    if (!id) {
      validationErrors.identifier = 'Username is required'
    } else if (id.length < 3) {
      validationErrors.identifier = 'Username must be atleast 3 characters'
    } else if (id.length > 100) {
      validationErrors.identifier = 'Username is too long'
    }

    if (!password) {
      validationErrors.password = 'Password is required'
    } else if (password.length < 8) {
      validationErrors.password = 'Password must be atleast 8 characters'
    } else if (password.length > 100) {
      validationErrors.password = 'Password is too long'
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearErrors()
    if (!validate()) return

    setIsLoading(true)
    const result = await loginUser(form)
    setIsLoading(false)

    if (result.success) {
      navigate(next || '/', { replace: true })
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <img
        src={BgImage}
        alt="DTU Campus"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <img
            src={DTULogo}
            alt="DTU Logo"
            className="mx-auto h-16 w-16 rounded-full object-cover shadow"
          />
          <h2 className="mt-6 text-3xl font-bold text-white">DTU Budget Monitoring System</h2>
          <p className="mt-2 text-sm text-gray-100">Accounts Department - Sign in to your account</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 shadow-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {authError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {authError}
              </p>
            ) : null}

            <div>
              <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-gray-700">
                Username or Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="identifier"
                  type="text"
                  value={form.identifier}
                  onChange={(event) => {
                    const value = event.target.value
                    setForm((previous) => ({ ...previous, identifier: value }))
                    if (errors.identifier) {
                      setErrors((previous) => ({ ...previous, identifier: undefined }))
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-base text-gray-900 outline-none focus:border-brand"
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>
              {errors.identifier ? <p className="mt-1 text-sm text-red-600">{errors.identifier}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => {
                    const value = event.target.value
                    setForm((previous) => ({ ...previous, password: value }))
                    if (errors.password) {
                      setErrors((previous) => ({ ...previous, password: undefined }))
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-10 text-base text-gray-900 outline-none focus:border-brand"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword((previous) => !previous)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c7 0 10 8 10 8a16.4 16.4 0 0 1-3.6 4.5" />
                      <path d="M6.3 6.3C3.7 8 2 12 2 12s3 8 10 8a9.7 9.7 0 0 0 4.2-.9" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password}</p> : null}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-brand px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-xs text-gray-100">
          <p>DTU - Accounts Department</p>
          <p className="mt-1">For authorized personnel only</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
