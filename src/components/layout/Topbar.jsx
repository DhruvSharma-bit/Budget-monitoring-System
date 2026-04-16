import { useLocation } from 'react-router-dom'
import { useBudget } from '../../context/BudgetContext'

const titleMap = {
  '/': 'Dashboard',
  '/events': 'Events',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

function Topbar({ onMenuClick }) {
  const location = useLocation()
  const { currentUserRole, backendConnected } = useBudget()
  const pageTitle = location.pathname.startsWith('/events/') ? 'Event Detail' : titleMap[location.pathname]

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted lg:hidden"
          >
            Menu
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text">{pageTitle}</h1>
            <p className="text-xs text-muted">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="hidden rounded-md border border-line bg-white px-3 py-2 text-sm text-muted sm:block">
          {currentUserRole === 'admin' ? 'Admin' : 'Viewer'} | {backendConnected ? 'API' : 'Mock'}
        </div>
      </div>
    </header>
  )
}

export default Topbar
