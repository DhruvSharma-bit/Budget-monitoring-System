import { NavLink } from 'react-router-dom'
import { useBudget } from '../../context/BudgetContext'

function SidebarLinks({ items, onItemClick, isCollapsed = false }) {
  return (
    <nav className="space-y-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onItemClick}
          title={isCollapsed ? item.label : undefined}
          className={({ isActive }) =>
            `flex items-center rounded-md py-2 text-sm font-medium transition ${
              isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'
            } ${
              isActive ? 'bg-blue-50 text-brand' : 'text-muted hover:bg-slate-50 hover:text-text'
            }`
          }
        >
          {isCollapsed ? (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-xs font-semibold">
              {item.short}
            </span>
          ) : (
            item.label
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const { currentUserRole } = useBudget()
  const navigation = [
    { label: 'Dashboard', short: 'D', to: '/' },
    { label: 'Events', short: 'E', to: '/events' },
    { label: 'Reports', short: 'R', to: '/reports' },
    ...(currentUserRole === 'admin'
      ? [{ label: 'Audit Logs', short: 'A', to: '/admin/audit-logs' }]
      : []),
    { label: 'Settings', short: 'S', to: '/settings' },
  ]

  return (
    <>
      <aside
        className={`hidden h-screen shrink-0 overflow-y-auto border-r border-line bg-white transition-all duration-200 lg:sticky lg:top-0 lg:block ${
          isCollapsed ? 'w-20 px-3 py-5' : 'w-64 p-5'
        }`}
      >
        <div className={`mb-8 flex items-start ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          <div className={isCollapsed ? 'text-center' : ''}>
            {isCollapsed ? null : (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">DTU Delhi Finance</p>
            )}
            <h2
              className={`font-bold text-text ${
                isCollapsed ? 'text-base leading-tight' : 'mt-1 text-[2rem] leading-none'
              }`}
            >
              {isCollapsed ? 'DBM' : 'DTU Budget Monitor'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`rounded-full border border-line text-muted transition hover:bg-slate-100 ${
              isCollapsed ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'
            }`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '>>' : '<<'}
          </button>
        </div>
        {isCollapsed ? null : (
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">Navigation</p>
        )}
        <SidebarLinks items={navigation} isCollapsed={isCollapsed} />
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={onClose} role="presentation">
          <aside
            className="h-full w-72 border-r border-line bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">DTU Delhi Finance</p>
                <h2 className="mt-1 text-[2rem] font-bold leading-none text-text">DTU Budget Monitor</h2>
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
            <SidebarLinks items={navigation} onItemClick={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  )
}

export default Sidebar
