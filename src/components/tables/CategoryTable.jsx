import ProgressBar from "../ui/ProgressBar";
import { formatCurrency, formatDateTimeWithSeconds } from "../../utils/finance";

function CategoryTable({
  categories,
  totalBudget,
  onEditCategory,
  onAddPaidEntry,
  canEdit = false,
  maxHeightClass = "max-h-[28rem]",
}) {
  const categoryRows = categories.reduce((rows, category) => {
    const allocated = Number(category.allocated || 0);
    const paid = Number(category.paid || 0);
    const previousRemaining =
      rows.length === 0
        ? Number(totalBudget || 0)
        : rows[rows.length - 1].remainingAfterAllocation;
    const remainingAfterAllocation = previousRemaining - allocated;

    rows.push({
      ...category,
      allocated,
      paid,
      pending: allocated - paid,
      remainingAfterAllocation,
      isOverpaid: paid > allocated,
    });

    return rows;
  }, []);

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
            <th className="sticky top-0 z-10 px-4 py-3">Created At</th>
            {canEdit && (onEditCategory || onAddPaidEntry) ? (
              <th className="sticky top-0 z-10 px-4 py-3">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {categoryRows.flatMap((category) => {
            const paidEntries = category.paidEntries || [];
            const rows = [
              <tr key={category.id} className="border-b border-line">
                <td className="table-cell font-medium">{category.name}</td>
                <td className="table-cell">
                  {formatCurrency(category.allocated)}
                </td>
                <td
                  className={`table-cell ${category.isOverpaid ? "font-semibold text-danger" : ""}`}
                >
                  {formatCurrency(category.paid)}
                </td>
                <td
                  className={`table-cell ${category.pending < 0 ? "font-semibold text-danger" : ""}`}
                >
                  {formatCurrency(category.pending)}
                </td>
                <td
                  className={`table-cell ${category.remainingAfterAllocation < 0 ? "font-semibold text-danger" : ""}`}
                >
                  {formatCurrency(category.remainingAfterAllocation)}
                </td>
                <td className="table-cell min-w-32">
                  <ProgressBar
                    value={category.paid}
                    max={category.allocated}
                    color={category.isOverpaid ? "bg-danger" : "bg-success"}
                  />
                </td>
                <td className="table-cell">
                  {formatDateTimeWithSeconds(category.createdAt)}
                </td>
                {canEdit && (onEditCategory || onAddPaidEntry) ? (
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {onAddPaidEntry ? (
                        <button
                          type="button"
                          onClick={() => onAddPaidEntry(category)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:bg-blue-50"
                        >
                          Add Paid
                        </button>
                      ) : null}
                      {onEditCategory ? (
                        <button
                          type="button"
                          onClick={() => onEditCategory(category)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-100"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>,
            ];

            paidEntries.forEach((entry) => {
              const action = String(entry.action || "APPEND").toUpperCase();
              const isEdit = action === "EDIT";
              const isPositive = Number(entry.amount || 0) >= 0;
              rows.push(
                <tr
                  key={`${category.id}-paid-${entry.id}`}
                  className="border-b border-line bg-slate-50/60"
                >
                  <td className="table-cell pl-10 text-xs text-muted">
                    {isEdit ? "Edited Paid" : "Paid Entry"}
                  </td>
                  <td className="table-cell text-xs text-muted">-</td>
                  <td
                    className={`table-cell text-xs font-semibold ${
                      isPositive ? "text-success" : "text-danger"
                    }`}
                  >
                    {isEdit
                      ? `${isPositive ? "+" : "-"} ${formatCurrency(
                          Math.abs(Number(entry.amount || 0)),
                        )}${entry.newPaid != null ? ` (set to ${formatCurrency(entry.newPaid)})` : ""}`
                      : `+ ${formatCurrency(entry.amount)}`}
                  </td>
                  <td className="table-cell text-xs text-muted">-</td>
                  <td className="table-cell text-xs text-muted">-</td>
                  <td className="table-cell text-xs text-muted">-</td>
                  <td className="table-cell text-xs text-muted">
                    {formatDateTimeWithSeconds(entry.createdAt)}
                  </td>
                  {canEdit && (onEditCategory || onAddPaidEntry) ? (
                    <td className="table-cell" />
                  ) : null}
                </tr>,
              );
            });

            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CategoryTable;
