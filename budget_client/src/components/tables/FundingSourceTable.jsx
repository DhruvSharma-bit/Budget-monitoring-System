import { formatCurrency, formatDateTimeWithSeconds } from "../../utils/finance";

function FundingSourceTable({
  sources,
  onEditSource,
  onAppendSource,
  canEdit = false,
  maxHeightClass = "max-h-[20rem]",
}) {
  return (
    <div className={`overflow-auto ${maxHeightClass}`}>
      <table className="min-w-[760px]">
        <thead>
          <tr className="table-head">
            <th className="sticky top-0 z-10 px-4 py-3">Source Name</th>
            <th className="sticky top-0 z-10 px-4 py-3">Amount</th>
            <th className="sticky top-0 z-10 px-4 py-3">Created At</th>
            {canEdit && (onEditSource || onAppendSource) ? (
              <th className="sticky top-0 z-10 px-4 py-3">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sources.flatMap((source) => {
            const appendEntries = source.appendEntries || [];
            const rows = [
              <tr key={source.id} className="border-b border-line">
                <td className="table-cell font-medium">{source.name}</td>
                <td className="table-cell">{formatCurrency(source.amount)}</td>
                <td className="table-cell">
                  {formatDateTimeWithSeconds(source.createdAt)}
                </td>
                {canEdit && (onEditSource || onAppendSource) ? (
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {onAppendSource ? (
                        <button
                          type="button"
                          onClick={() => onAppendSource(source)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:bg-blue-50"
                        >
                          Append
                        </button>
                      ) : null}
                      {onEditSource ? (
                        <button
                          type="button"
                          onClick={() => onEditSource(source)}
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

            appendEntries.forEach((entry) => {
              const action = String(entry.action || "APPEND").toUpperCase();
              const isEdit = action === "EDIT";
              const isPositive = Number(entry.amount || 0) >= 0;
              rows.push(
                <tr
                  key={`${source.id}-append-${entry.id}`}
                  className="border-b border-line bg-slate-50/60"
                >
                  <td className="table-cell pl-10 text-xs text-muted">
                    {isEdit ? "Edited Amount" : "Appended Amount"}
                  </td>
                  <td
                    className={`table-cell text-xs font-semibold ${
                      isPositive ? "text-success" : "text-danger"
                    }`}
                  >
                    {isEdit
                      ? `${isPositive ? "+" : "-"} ${formatCurrency(
                          Math.abs(Number(entry.amount || 0)),
                        )}${entry.newAmount != null ? ` (set to ${formatCurrency(entry.newAmount)})` : ""}`
                      : `+ ${formatCurrency(entry.amount)}`}
                  </td>
                  <td className="table-cell text-xs text-muted">
                    {formatDateTimeWithSeconds(entry.createdAt)}
                  </td>
                  {canEdit && (onEditSource || onAppendSource) ? (
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

export default FundingSourceTable;
