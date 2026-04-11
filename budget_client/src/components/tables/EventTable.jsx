import ProgressBar from '../ui/ProgressBar'
import StatusBadge from '../ui/StatusBadge'
import { formatCurrency, formatDate } from '../../utils/finance'

function EventTable({
  events,
  onOpenEvent,
  onEditEvent,
  canEdit = false,
  maxHeightClass = 'max-h-[34rem]',
}) {
  return (
    <div className={`overflow-auto ${maxHeightClass}`}>
      <table className="min-w-[1150px] border-separate border-spacing-0">
        <thead>
          <tr className="table-head">
            <th className="sticky top-0 z-10 px-4 py-3">Event</th>
            <th className="sticky top-0 z-10 px-4 py-3">Date</th>
            <th className="sticky top-0 z-10 px-4 py-3">Budget</th>
            <th className="sticky top-0 z-10 px-4 py-3">Liability</th>
            <th className="sticky top-0 z-10 px-4 py-3">Paid</th>
            <th className="sticky top-0 z-10 px-4 py-3">Pending</th>
            <th className="sticky top-0 z-10 px-4 py-3">Remaining</th>
            <th className="sticky top-0 z-10 px-4 py-3">Paid Progress</th>
            <th className="sticky top-0 z-10 px-4 py-3">Status</th>
            <th className="sticky top-0 z-10 px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {events.map((event) => (
            <tr key={event.id} className="border-b border-line hover:bg-slate-50/60">
              <td className="table-cell font-medium">{event.name}</td>
              <td className="table-cell">{formatDate(event.date)}</td>
              <td className="table-cell">{formatCurrency(event.metrics.totalBudget)}</td>
              <td className="table-cell">{formatCurrency(event.metrics.totalLiability)}</td>
              <td className="table-cell">{formatCurrency(event.metrics.paid)}</td>
              <td className="table-cell">{formatCurrency(event.metrics.pending)}</td>
              <td className="table-cell">{formatCurrency(event.metrics.remaining)}</td>
              <td className="table-cell min-w-32">
                <ProgressBar
                  value={event.metrics.paid}
                  max={event.metrics.totalLiability}
                  color={event.metrics.status === 'Overbudget' ? 'bg-danger' : 'bg-brand'}
                />
              </td>
              <td className="table-cell">
                <StatusBadge status={event.metrics.status} />
              </td>
              <td className="table-cell">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenEvent(event.id)}
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:bg-blue-50"
                  >
                    View
                  </button>
                  {canEdit && onEditEvent ? (
                    <button
                      type="button"
                      onClick={() => onEditEvent(event)}
                      className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EventTable
