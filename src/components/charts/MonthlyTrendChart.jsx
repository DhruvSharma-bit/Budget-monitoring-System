import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../utils/finance'

function MonthlyTrendChart({ data }) {
  return (
    <div className="panel p-5">
      <h3 className="text-base font-semibold text-text">Monthly Budget Trend</h3>
      <p className="mt-1 text-sm text-muted">Aggregated paid and pending amounts by event month</p>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#475569', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
              }}
            />
            <Line type="monotone" dataKey="paid" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center gap-6 text-xs font-medium text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          Paid
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" />
          Pending
        </span>
      </div>
    </div>
  )
}

export default MonthlyTrendChart
