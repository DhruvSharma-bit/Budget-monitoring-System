import { createContext, useContext, useMemo, useState } from 'react'
import { initialEvents } from '../data/mockData'
import {
  buildWarnings,
  calculateEventMetrics,
  getDashboardMetrics,
  getMonthlyTrend,
} from '../utils/finance'

const BudgetContext = createContext(null)

const normalizeAmount = (value) => Number(value || 0)
const ADMIN_ROLE = 'admin'

export function BudgetProvider({ children }) {
  const [events, setEvents] = useState(initialEvents)
  const currentUserRole = ADMIN_ROLE
  const canEdit = currentUserRole === ADMIN_ROLE

  const eventsWithMetrics = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        metrics: calculateEventMetrics(event),
      })),
    [events],
  )

  const dashboardMetrics = useMemo(() => getDashboardMetrics(events), [events])
  const warnings = useMemo(() => buildWarnings(events), [events])
  const monthlyTrend = useMemo(() => getMonthlyTrend(eventsWithMetrics), [eventsWithMetrics])

  const addEvent = ({ name, date, totalBudget }) => {
    const id = `evt-${Date.now()}`
    const event = {
      id,
      name,
      date,
      fundingSources: [
        {
          id: `fs-${Date.now()}`,
          name: 'Initial Allocation',
          amount: normalizeAmount(totalBudget),
        },
      ],
      categories: [],
    }
    setEvents((previous) => [...previous, event])
  }

  const updateEvent = (eventId, payload) => {
    setEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? {
              ...event,
              name: payload.name,
              date: payload.date,
            }
          : event,
      ),
    )
  }

  const addFundingSource = (eventId, source) => {
    setEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? {
              ...event,
              fundingSources: [
                ...event.fundingSources,
                {
                  id: `fs-${Date.now()}`,
                  name: source.name,
                  amount: normalizeAmount(source.amount),
                },
              ],
            }
          : event,
      ),
    )
  }

  const updateFundingSource = (eventId, sourceId, payload) => {
    setEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? {
              ...event,
              fundingSources: event.fundingSources.map((source) =>
                source.id === sourceId
                  ? {
                      ...source,
                      name: payload.name,
                      amount: normalizeAmount(payload.amount),
                    }
                  : source,
              ),
            }
          : event,
      ),
    )
  }

  const addCategory = (eventId, category) => {
    setEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? {
              ...event,
              categories: [
                ...event.categories,
                {
                  id: `cat-${Date.now()}`,
                  name: category.name,
                  allocated: normalizeAmount(category.allocated),
                  paid: normalizeAmount(category.paid),
                },
              ],
            }
          : event,
      ),
    )
  }

  const updateCategory = (eventId, categoryId, payload) => {
    setEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? {
              ...event,
              categories: event.categories.map((category) =>
                category.id === categoryId
                  ? {
                      ...category,
                      name: payload.name,
                      allocated: normalizeAmount(payload.allocated),
                      paid: normalizeAmount(payload.paid),
                    }
                  : category,
              ),
            }
          : event,
      ),
    )
  }

  const value = {
    events: eventsWithMetrics,
    rawEvents: events,
    currentUserRole,
    canEdit,
    dashboardMetrics,
    warnings,
    monthlyTrend,
    addEvent,
    updateEvent,
    addFundingSource,
    updateFundingSource,
    addCategory,
    updateCategory,
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (!context) {
    throw new Error('useBudget must be used within BudgetProvider')
  }
  return context
}
