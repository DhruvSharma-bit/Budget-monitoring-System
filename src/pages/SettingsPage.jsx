import { useNavigate } from 'react-router-dom'
import AlertBox from '../components/ui/AlertBox'
import PageHeader from '../components/ui/PageHeader'
import { useBudget } from '../context/BudgetContext'

function SettingsPage() {
  const navigate = useNavigate()
  const { currentUser, currentUserRole, canEdit, backendConnected, dataSource, logoutUser } = useBudget()

  const handleLogout = () => {
    logoutUser()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile, role access, and backend connection controls" />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Profile</h3>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-text">Name:</span> {currentUser.name || 'Not available'}
            </p>
            <p>
              <span className="font-medium text-text">Email:</span> {currentUser.email || 'Not available'}
            </p>
            <p>
              <span className="font-medium text-text">Role:</span>{' '}
              {currentUserRole === 'admin' ? 'DTU Finance Admin' : 'DTU Finance User'}
            </p>
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Role and Access</h3>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-text">Edit Access:</span> {canEdit ? 'Enabled' : 'Disabled'}
            </p>
            <p>
              <span className="font-medium text-text">Data Source:</span>{' '}
              {dataSource === 'api' ? 'Backend API' : dataSource === 'mock' ? 'Local Mock Data' : 'Loading'}
            </p>
            <p>
              <span className="font-medium text-text">Backend Status:</span>{' '}
              {backendConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-slate-100"
          >
            Logout
          </button>
        </section>

        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Session Info</h3>
          <div className="mt-4">
            <AlertBox
              title={currentUserRole === 'admin' ? 'Admin session active' : 'User session active'}
              message={
                currentUserRole === 'admin'
                  ? 'You can create and edit events, funding sources, and categories.'
                  : 'You have read-only access. Please login with an admin account to edit data.'
              }
              variant={currentUserRole === 'admin' ? 'success' : 'info'}
            />
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Theme & Notifications</h3>
          <p className="mt-2 text-sm text-muted">
            Light theme is active. Notification rules can be connected to backend triggers later.
          </p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="rounded-md border border-line px-4 py-2 text-sm text-muted" disabled>
              Theme Placeholder
            </button>
            <button type="button" className="rounded-md border border-line px-4 py-2 text-sm text-muted" disabled>
              Notification Placeholder
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
