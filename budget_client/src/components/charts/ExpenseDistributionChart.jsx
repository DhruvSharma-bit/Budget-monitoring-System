import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '../../utils/finance'

const chartColors = ['#2563eb', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626', '#9333ea']

function ExpenseDistributionChart({
  data,
  eventOptions = [],
  selectedEventId = '',
  onEventChange,
}) {
  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-text">Expense Distribution</h3>
          <p className="mt-1 text-sm text-muted">Category-wise liability split for selected event</p>
        </div>
        {onEventChange ? (
          <select
            value={selectedEventId}
            onChange={(event) => onEventChange(event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {eventOptions.map((eventOption) => (
              <option key={eventOption.id} value={eventOption.id}>
                {eventOption.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {data.length ? (
        <>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={95}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: chartColors[index % chartColors.length] }}
                />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-md border border-dashed border-line bg-slate-50 p-6 text-sm text-muted">
          No category allocation found for this event yet.
        </div>
      )}
    </div>
  )
}

export default ExpenseDistributionChart
