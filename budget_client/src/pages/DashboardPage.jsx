import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExpenseDistributionChart from '../components/charts/ExpenseDistributionChart'
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart'
import EventTable from '../components/tables/EventTable'
import AlertBox from '../components/ui/AlertBox'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { useBudget } from '../context/BudgetContext'
import { formatCurrency } from '../utils/finance'

function DashboardPage() {
  const navigate = useNavigate()
  const { dashboardMetrics, events, warnings, monthlyTrend } = useBudget()
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '')

  const activeEventId = useMemo(() => {
    const exists = events.some((event) => event.id === selectedEventId)
    return exists ? selectedEventId : events[0]?.id || ''
  }, [events, selectedEventId])

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) || events[0],
    [events, activeEventId],
  )

  const expenseDistribution = useMemo(
    () =>
      selectedEvent
        ? selectedEvent.categories.map((category) => ({
            name: category.name,
            value: Number(category.allocated || 0),
          }))
        : [],
    [selectedEvent],
  )

  return (
    <div>
      <PageHeader
        title="Budget Dashboard"
        subtitle="Overview of events, liabilities, payouts, and financial risk indicators"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Budget" value={formatCurrency(dashboardMetrics.totalBudget)} />
        <StatCard title="Total Liability" value={formatCurrency(dashboardMetrics.totalLiability)} accent="text-warning" />
        <StatCard title="Total Paid" value={formatCurrency(dashboardMetrics.paid)} accent="text-success" />
        <StatCard title="Remaining Budget" value={formatCurrency(dashboardMetrics.remaining)} />
        <StatCard title="Total Pending" value={formatCurrency(dashboardMetrics.pending)} accent="text-danger" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ExpenseDistributionChart
          data={expenseDistribution}
          eventOptions={events}
          selectedEventId={activeEventId}
          onEventChange={setSelectedEventId}
        />
        <MonthlyTrendChart data={monthlyTrend} />
      </section>

      <section className="mt-6 panel">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-semibold text-text">Event Budget Status</h3>
            <p className="text-sm text-muted">Live summary of each event and utilization progress</p>
          </div>
        </div>
        <EventTable
          events={events}
          onOpenEvent={(eventId) => navigate(`/events/${eventId}`)}
          maxHeightClass="max-h-[36rem]"
        />
      </section>

      <section className="mt-6 panel p-5">
        <h3 className="text-base font-semibold text-text">Warnings and Alerts</h3>
        <p className="mt-1 text-sm text-muted">Flags based on liability and overpayment checks</p>
        <div className="mt-4 max-h-[20rem] space-y-3 overflow-auto pr-1">
          {warnings.length ? (
            warnings.map((warning) => (
              <AlertBox
                key={warning.id}
                title={warning.title}
                message={warning.message}
                variant={warning.variant}
              />
            ))
          ) : (
            <AlertBox
              title="All events are financially healthy"
              message="No liabilities above total budget and no category overpayments detected."
              variant="success"
            />
          )}
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
