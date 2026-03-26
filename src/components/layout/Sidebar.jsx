import { NavLink } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', to: '/' },
  { label: 'Events', to: '/events' },
  { label: 'Reports', to: '/reports' },
  { label: 'Settings', to: '/settings' },
]

function SidebarLinks({ onItemClick }) {
  return (
    <nav className="space-y-2">
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onItemClick}
          className={({ isActive }) =>
            `block rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-blue-50 text-brand' : 'text-muted hover:bg-slate-50 hover:text-text'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-line bg-white p-5 lg:sticky lg:top-0 lg:block">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">College Finance</p>
          <h2 className="mt-1 text-[2rem] font-bold leading-none text-text">Budget Monitor</h2>
        </div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">Navigation</p>
        <SidebarLinks />
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={onClose} role="presentation">
          <aside
            className="h-full w-72 border-r border-line bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">College Finance</p>
                <h2 className="mt-1 text-[2rem] font-bold leading-none text-text">Budget Monitor</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-2 py-1 text-sm text-muted hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">Navigation</p>
            <SidebarLinks onItemClick={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  )
}

export default Sidebar
