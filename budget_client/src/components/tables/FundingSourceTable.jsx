import { formatCurrency } from '../../utils/finance'

function FundingSourceTable({ sources, onEditSource, canEdit = false, maxHeightClass = 'max-h-[20rem]' }) {
  return (
    <div className={`overflow-auto ${maxHeightClass}`}>
      <table className="min-w-[640px]">
        <thead>
          <tr className="table-head">
            <th className="sticky top-0 z-10 px-4 py-3">Source Name</th>
            <th className="sticky top-0 z-10 px-4 py-3">Amount</th>
            {canEdit && onEditSource ? (
              <th className="sticky top-0 z-10 px-4 py-3">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-b border-line">
              <td className="table-cell font-medium">{source.name}</td>
              <td className="table-cell">{formatCurrency(source.amount)}</td>
              {canEdit && onEditSource ? (
                <td className="table-cell">
                  <button
                    type="button"
                    onClick={() => onEditSource(source)}
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-100"
                  >
                    Edit
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FundingSourceTable
