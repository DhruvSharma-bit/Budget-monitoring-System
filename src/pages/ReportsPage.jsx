import { useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import StatCard from '../components/ui/StatCard'
import { useBudget } from '../context/BudgetContext'
import { formatCurrency, formatDate } from '../utils/finance'

function ReportsPage() {
  const { events } = useBudget()
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const searchTarget = `${event.name} ${event.categories.map((category) => category.name).join(' ')}`.toLowerCase()
        const matchesSearch = searchTarget.includes(search.trim().toLowerCase())
        const matchesEvent = eventFilter === 'all' || event.id === eventFilter
        const eventDate = new Date(event.date)
        const selectedDate = dateFilter ? new Date(dateFilter) : null
        const matchesDate = selectedDate ? eventDate >= selectedDate : true
        return matchesSearch && matchesEvent && matchesDate
      }),
    [events, search, eventFilter, dateFilter],
  )

  const categoryRows = useMemo(() => {
    const rows = []

    filteredEvents.forEach((event) => {
      const categories = event.categories || []
      categories.forEach((category, index) => {
        const allocated = Number(category.allocated || 0)
        const paid = Number(category.paid || 0)
        rows.push({
          id: `${event.id}-${category.id}`,
          eventName: event.name,
          categoryName: category.name,
          allocated,
          paid,
          pending: allocated - paid,
          isEventStart: index === 0,
          eventRowSpan: categories.length,
        })
      })
    })

    return rows
  }, [filteredEvents])

  const totals = filteredEvents.reduce(
    (accumulator, event) => ({
      budget: accumulator.budget + event.metrics.totalBudget,
      liability: accumulator.liability + event.metrics.totalLiability,
      paid: accumulator.paid + event.metrics.paid,
      pending: accumulator.pending + event.metrics.pending,
    }),
    { budget: 0, liability: 0, paid: 0, pending: 0 },
  )

  const handleDownload = () => {
    const rows = [
      ['Event Name', 'Date', 'Total Budget', 'Total Liability', 'Paid', 'Pending', 'Remaining'],
      ...filteredEvents.map((event) => [
        event.name,
        formatDate(event.date),
        event.metrics.totalBudget,
        event.metrics.totalLiability,
        event.metrics.paid,
        event.metrics.pending,
        event.metrics.remaining,
      ]),
      [],
      ['Event Name', 'Category', 'Allocated', 'Paid', 'Pending'],
      ...categoryRows.map((row) => [row.eventName, row.categoryName, row.allocated, row.paid, row.pending]),
    ]

    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'college-budget-report.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate budget performance snapshots with event-level and category-level summaries"
        action={
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Download Report
          </button>
        }
      />

      <section className="panel p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search event or category"
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <select
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="all">All events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Budget" value={formatCurrency(totals.budget)} />
        <StatCard title="Total Liability" value={formatCurrency(totals.liability)} accent="text-warning" />
        <StatCard title="Paid" value={formatCurrency(totals.paid)} accent="text-success" />
        <StatCard title="Pending" value={formatCurrency(totals.pending)} accent="text-danger" />
      </section>

      <section className="mt-6 panel p-5">
        <h3 className="text-base font-semibold text-text">Event Summary Cards</h3>
        <div className="mt-4 max-h-[28rem] overflow-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredEvents.map((event) => (
              <article key={event.id} className="rounded-lg border border-line p-4">
                <h4 className="text-sm font-semibold text-text">{event.name}</h4>
                <p className="text-xs text-muted">{formatDate(event.date)}</p>
                <div className="mt-3 grid gap-2 text-sm text-muted">
                  <p>Budget: {formatCurrency(event.metrics.totalBudget)}</p>
                  <p>Liability: {formatCurrency(event.metrics.totalLiability)}</p>
                  <p>Paid: {formatCurrency(event.metrics.paid)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 panel p-5">
        <h3 className="text-base font-semibold text-text">Budget vs Paid Summary</h3>
        <div className="mt-4 max-h-[26rem] space-y-4 overflow-auto pr-1">
          {filteredEvents.map((event) => (
            <div key={event.id}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-text">{event.name}</span>
                <span className="text-muted">
                  {formatCurrency(event.metrics.paid)} of {formatCurrency(event.metrics.totalBudget)}
                </span>
              </div>
              <ProgressBar value={event.metrics.paid} max={event.metrics.totalBudget} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 panel p-5">
        <h3 className="text-base font-semibold text-text">Category-wise Report</h3>
        <p className="mt-1 text-sm text-muted">Organized by event so each category is clearly mapped</p>
        <div className="mt-4 max-h-[36rem] overflow-auto">
          <table className="min-w-[980px]">
            <thead>
              <tr className="table-head">
                <th className="sticky top-0 z-10 px-4 py-3">Event</th>
                <th className="sticky top-0 z-10 px-4 py-3">Category</th>
                <th className="sticky top-0 z-10 px-4 py-3">Allocated</th>
                <th className="sticky top-0 z-10 px-4 py-3">Paid</th>
                <th className="sticky top-0 z-10 px-4 py-3">Pending</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.length ? (
                categoryRows.map((row) => (
                  <tr key={row.id} className="border-b border-line">
                    {row.isEventStart ? (
                      <td
                        className="table-cell align-top font-semibold text-text"
                        rowSpan={row.eventRowSpan}
                      >
                        {row.eventName}
                      </td>
                    ) : null}
                    <td className="table-cell font-medium">{row.categoryName}</td>
                    <td className="table-cell">{formatCurrency(row.allocated)}</td>
                    <td className="table-cell">{formatCurrency(row.paid)}</td>
                    <td className={`table-cell ${row.pending < 0 ? 'font-semibold text-danger' : ''}`}>
                      {formatCurrency(row.pending)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-muted">
                    No category records found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default ReportsPage
