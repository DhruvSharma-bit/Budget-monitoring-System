import ProgressBar from '../ui/ProgressBar'
import { formatCurrency } from '../../utils/finance'

function CategoryTable({
  categories,
  totalBudget,
  onEditCategory,
  canEdit = false,
  maxHeightClass = 'max-h-[28rem]',
}) {
  const categoryRows = categories.reduce((rows, category) => {
    const allocated = Number(category.allocated || 0)
    const paid = Number(category.paid || 0)
    const previousRemaining =
      rows.length === 0 ? Number(totalBudget || 0) : rows[rows.length - 1].remainingAfterAllocation
    const remainingAfterAllocation = previousRemaining - allocated

    rows.push({
      ...category,
      allocated,
      paid,
      pending: allocated - paid,
      remainingAfterAllocation,
      isOverpaid: paid > allocated,
    })

    return rows
  }, [])

  return (
    <div className={`overflow-auto ${maxHeightClass}`}>
      <table className="min-w-[980px]">
        <thead>
          <tr className="table-head">
            <th className="sticky top-0 z-10 px-4 py-3">Category</th>
            <th className="sticky top-0 z-10 px-4 py-3">Allocated</th>
            <th className="sticky top-0 z-10 px-4 py-3">Paid</th>
            <th className="sticky top-0 z-10 px-4 py-3">Pending</th>
            <th className="sticky top-0 z-10 px-4 py-3">Remaining</th>
            <th className="sticky top-0 z-10 px-4 py-3">Progress</th>
            {canEdit && onEditCategory ? (
              <th className="sticky top-0 z-10 px-4 py-3">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {categoryRows.map((category) => {
            return (
              <tr key={category.id} className="border-b border-line">
                <td className="table-cell font-medium">{category.name}</td>
                <td className="table-cell">{formatCurrency(category.allocated)}</td>
                <td className={`table-cell ${category.isOverpaid ? 'font-semibold text-danger' : ''}`}>
                  {formatCurrency(category.paid)}
                </td>
                <td className={`table-cell ${category.pending < 0 ? 'font-semibold text-danger' : ''}`}>
                  {formatCurrency(category.pending)}
                </td>
                <td
                  className={`table-cell ${category.remainingAfterAllocation < 0 ? 'font-semibold text-danger' : ''}`}
                >
                  {formatCurrency(category.remainingAfterAllocation)}
                </td>
                <td className="table-cell min-w-32">
                  <ProgressBar
                    value={category.paid}
                    max={category.allocated}
                    color={category.isOverpaid ? 'bg-danger' : 'bg-success'}
                  />
                </td>
                {canEdit && onEditCategory ? (
                  <td className="table-cell">
                    <button
                      type="button"
                      onClick={() => onEditCategory(category)}
                      className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default CategoryTable
