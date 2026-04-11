import { useEffect, useMemo, useState } from 'react'
import AlertBox from '../components/ui/AlertBox'
import PageHeader from '../components/ui/PageHeader'
import { listAuditLogsApi } from '../api/adminApi'
import { useBudget } from '../context/BudgetContext'

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function AdminAuditPage() {
  const { currentUserRole } = useBudget()
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 })

  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    eventId: '',
    userId: '',
  })

  const canAccess = currentUserRole === 'admin'

  const queryParams = useMemo(
    () => ({
      page,
      limit: 20,
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    }),
    [filters, page],
  )

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!canAccess) return
      setIsLoading(true)
      setError('')
      try {
        const response = await listAuditLogsApi(queryParams)
        if (!mounted) return
        setRows(response.data || [])
        setMeta(response.meta || { page: 1, totalPages: 1, total: 0, limit: 20 })
      } catch (requestError) {
        if (!mounted) return
        setError(requestError?.response?.data?.message || 'Failed to load audit logs')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [canAccess, queryParams])

  if (!canAccess) {
    return (
      <div className="panel p-6">
        <AlertBox
          title="Admin only"
          message="Only admin users can view audit logs."
          variant="warning"
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Admin Audit Logs"
        subtitle="Track who changed what, when, and where across events, categories, funding, and lifecycle actions."
      />

      <section className="panel p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={filters.eventId}
            onChange={(event) => {
              setPage(1)
              setFilters((previous) => ({ ...previous, eventId: event.target.value }))
            }}
            placeholder="Filter by Event ID"
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <input
            value={filters.userId}
            onChange={(event) => {
              setPage(1)
              setFilters((previous) => ({ ...previous, userId: event.target.value }))
            }}
            placeholder="Filter by User ID"
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <select
            value={filters.action}
            onChange={(event) => {
              setPage(1)
              setFilters((previous) => ({ ...previous, action: event.target.value }))
            }}
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="CLOSE">CLOSE</option>
            <option value="REOPEN">REOPEN</option>
          </select>
          <select
            value={filters.entityType}
            onChange={(event) => {
              setPage(1)
              setFilters((previous) => ({ ...previous, entityType: event.target.value }))
            }}
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="event">event</option>
            <option value="category">category</option>
            <option value="funding_source">funding_source</option>
          </select>
        </div>
      </section>

      <section className="panel mt-6 p-5">
        {error ? (
          <AlertBox title="Unable to load logs" message={error} variant="warning" />
        ) : null}
        {isLoading ? <p className="text-sm text-muted">Loading audit logs...</p> : null}
        {!isLoading ? (
          <>
            <div className="max-h-[36rem] overflow-auto">
              <table className="min-w-[1400px]">
                <thead>
                  <tr className="table-head">
                    <th className="sticky top-0 z-10 px-4 py-3">When</th>
                    <th className="sticky top-0 z-10 px-4 py-3">User</th>
                    <th className="sticky top-0 z-10 px-4 py-3">Role</th>
                    <th className="sticky top-0 z-10 px-4 py-3">Action</th>
                    <th className="sticky top-0 z-10 px-4 py-3">Entity</th>
                    <th className="sticky top-0 z-10 px-4 py-3">Entity ID</th>
                    <th className="sticky top-0 z-10 px-4 py-3">Event ID</th>
                    <th className="sticky top-0 z-10 px-4 py-3">IP</th>
                    <th className="sticky top-0 z-10 px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row) => (
                      <tr key={row.id} className="border-b border-line">
                        <td className="table-cell">{formatDateTime(row.created_at)}</td>
                        <td className="table-cell">{row.user_email || row.user_name || row.user_id || '-'}</td>
                        <td className="table-cell">{row.user_role || '-'}</td>
                        <td className="table-cell">{row.action}</td>
                        <td className="table-cell">{row.entity_type}</td>
                        <td className="table-cell">{row.entity_id || '-'}</td>
                        <td className="table-cell">{row.event_id || '-'}</td>
                        <td className="table-cell">{row.ip_address || '-'}</td>
                        <td className="table-cell">
                          <pre className="max-w-[460px] overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-700">
                            {JSON.stringify(row.details || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="table-cell text-center text-muted">
                        No audit log records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <p className="text-sm text-muted">
                Showing page {meta.page} of {meta.totalPages} ({meta.total} records)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((previous) => Math.min(meta.totalPages || 1, previous + 1))}
                  disabled={page >= (meta.totalPages || 1)}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}

export default AdminAuditPage
