const STATUS_STYLES = {
  Safe: 'bg-green-50 text-success border-green-200',
  Warning: 'bg-amber-50 text-warning border-amber-200',
  Overbudget: 'bg-red-50 text-danger border-red-200',
  ACTIVE: 'bg-blue-50 text-brand border-blue-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-300',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || 'bg-slate-100 text-muted border-slate-200'}`}
    >
      {status}
    </span>
  )
}

export default StatusBadge
