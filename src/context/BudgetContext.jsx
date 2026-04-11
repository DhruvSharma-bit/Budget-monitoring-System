import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMeApi, loginApi } from '../api/authApi'
import {
  addCategoryApi,
  addFundingSourceApi,
  closeEventApi,
  createEventApi,
  listEventsApi,
  reopenEventApi,
  updateCategoryApi,
  updateEventApi,
  updateFundingSourceApi,
} from '../api/eventsApi'
import { getStoredToken, setStoredToken } from '../api/http'
import { initialEvents } from '../data/mockData'
import {
  buildWarnings,
  calculateEventMetrics,
  getDashboardMetrics,
  getMonthlyTrend,
} from '../utils/finance'

const BudgetContext = createContext(null)
const ADMIN_ROLE = 'admin'
const FINANCE_ROLE = 'finance'

const normalizeAmount = (value) => Number(value || 0)
const initialUser = { id: '', name: '', email: '', role: 'guest' }

const toDateInput = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

const normalizeEvent = (event) => {
  const lifecycleStatusRaw = String(event.lifecycleStatus || event.status || 'ACTIVE')
    .trim()
    .toUpperCase()
  const lifecycleStatus = lifecycleStatusRaw === 'CLOSED' ? 'CLOSED' : 'ACTIVE'

  const normalized = {
    ...event,
    date: toDateInput(event.date || event.eventDate),
    status: lifecycleStatus,
    lifecycleStatus,
    closedAt: event.closedAt || event.closed_at || null,
    closedBy: event.closedBy || event.closed_by || null,
    closingNote: event.closingNote || event.closing_note || '',
    fundingSources: (event.fundingSources || []).map((source) => ({
      ...source,
      amount: normalizeAmount(source.amount),
    })),
    categories: (event.categories || []).map((category) => ({
      ...category,
      allocated: normalizeAmount(category.allocated),
      paid: normalizeAmount(category.paid),
    })),
  }

  normalized.metrics = event.metrics || calculateEventMetrics(normalized)
  return normalized
}

const parseErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage

export function BudgetProvider({ children }) {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataSource, setDataSource] = useState('loading')
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [authError, setAuthError] = useState('')
  const [operationError, setOperationError] = useState('')

  const currentUserRole = currentUser.role || 'guest'
  const isAuthenticated = Boolean(currentUser.id)
  const canEdit = currentUserRole === ADMIN_ROLE
  const canCloseEvent = [ADMIN_ROLE, FINANCE_ROLE].includes(currentUserRole)
  const canReopenEvent = currentUserRole === ADMIN_ROLE

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      setIsLoading(true)
      setAuthLoading(true)
      setOperationError('')

      const token = getStoredToken()
      if (token) {
        try {
          const profile = await getMeApi()
          if (mounted) {
            setCurrentUser({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role || 'user',
            })
          }
        } catch {
          setStoredToken(null)
          if (mounted) {
            setCurrentUser(initialUser)
          }
        }
      } else if (mounted) {
        setCurrentUser(initialUser)
      }

      if (mounted) {
        setAuthLoading(false)
      }

      try {
        const remoteEvents = await listEventsApi()
        if (mounted) {
          setEvents(remoteEvents.map(normalizeEvent))
          setDataSource('api')
        }
      } catch {
        if (mounted) {
          setEvents(initialEvents.map(normalizeEvent))
          setDataSource('mock')
          setOperationError('Backend unavailable. Showing local mock data.')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    bootstrap()
    return () => {
      mounted = false
    }
  }, [])

  const requireAdminAccess = () => {
    if (currentUserRole !== ADMIN_ROLE) {
      throw new Error('Only admin can edit budget data.')
    }
  }

  const requireCloseAccess = () => {
    if (![ADMIN_ROLE, FINANCE_ROLE].includes(currentUserRole)) {
      throw new Error('Only admin or finance role can close an event.')
    }
  }

  const getEventById = (eventId) => events.find((event) => event.id === eventId)

  const requireEventEditable = (eventId) => {
    const target = getEventById(eventId)
    if (!target) {
      throw new Error('Event not found')
    }
    if (String(target.lifecycleStatus || '').toUpperCase() === 'CLOSED') {
      throw new Error('This event is CLOSED and cannot be modified.')
    }
  }

  const upsertEventInState = (nextEvent) => {
    const normalized = normalizeEvent(nextEvent)
    setEvents((previous) => {
      const existingIndex = previous.findIndex((event) => event.id === normalized.id)
      if (existingIndex === -1) {
        return [normalized, ...previous]
      }
      return previous.map((event) => (event.id === normalized.id ? normalized : event))
    })
  }

  const addEvent = async ({ name, date, totalBudget }) => {
    try {
      setOperationError('')
      requireAdminAccess()
      if (dataSource === 'api') {
        const created = await createEventApi({ name, date, totalBudget })
        upsertEventInState(created)
      } else {
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
        upsertEventInState(event)
      }
      return { success: true }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to create event')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const updateEvent = async (eventId, payload) => {
    try {
      setOperationError('')
      requireAdminAccess()
      requireEventEditable(eventId)
      if (dataSource === 'api') {
        const updated = await updateEventApi(eventId, payload)
        upsertEventInState(updated)
      } else {
        setEvents((previous) =>
          previous.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  name: payload.name,
                  date: payload.date,
                  metrics: calculateEventMetrics({
                    ...event,
                    name: payload.name,
                    date: payload.date,
                  }),
                }
              : event,
          ),
        )
      }
      return { success: true }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to update event')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const addFundingSource = async (eventId, source) => {
    try {
      setOperationError('')
      requireAdminAccess()
      requireEventEditable(eventId)
      if (dataSource === 'api') {
        const updated = await addFundingSourceApi(eventId, source)
        upsertEventInState(updated)
      } else {
        setEvents((previous) =>
          previous.map((event) =>
            event.id === eventId
              ? normalizeEvent({
                  ...event,
                  fundingSources: [
                    ...event.fundingSources,
                    {
                      id: `fs-${Date.now()}`,
                      name: source.name,
                      amount: normalizeAmount(source.amount),
                    },
                  ],
                })
              : event,
          ),
        )
      }
      return { success: true }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to add funding source')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const updateFundingSource = async (eventId, sourceId, payload) => {
    try {
      setOperationError('')
      requireAdminAccess()
      requireEventEditable(eventId)
      if (dataSource === 'api') {
        const updated = await updateFundingSourceApi(eventId, sourceId, payload)
        upsertEventInState(updated)
      } else {
        setEvents((previous) =>
          previous.map((event) =>
            event.id === eventId
              ? normalizeEvent({
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
                })
              : event,
          ),
        )
      }
      return { success: true }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to update funding source')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const addCategory = async (eventId, category) => {
    try {
      setOperationError('')
      requireAdminAccess()
      requireEventEditable(eventId)
      if (dataSource === 'api') {
        const updated = await addCategoryApi(eventId, category)
        upsertEventInState(updated)
      } else {
        setEvents((previous) =>
          previous.map((event) =>
            event.id === eventId
              ? normalizeEvent({
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
                })
              : event,
          ),
        )
      }
      return { success: true }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to add category')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const updateCategory = async (eventId, categoryId, payload) => {
    try {
      setOperationError('')
      requireAdminAccess()
      requireEventEditable(eventId)
      if (dataSource === 'api') {
        const updated = await updateCategoryApi(eventId, categoryId, payload)
        upsertEventInState(updated)
      } else {
        setEvents((previous) =>
          previous.map((event) =>
            event.id === eventId
              ? normalizeEvent({
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
                })
              : event,
          ),
        )
      }
      return { success: true }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to update category')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const closeEvent = async (eventId, payload = {}) => {
    try {
      setOperationError('')
      requireCloseAccess()
      requireEventEditable(eventId)

      if (dataSource === 'api') {
        const response = await closeEventApi(eventId, payload)
        upsertEventInState(response.data)
        if (response.warning?.message) {
          setOperationError(response.warning.message)
        }
        return { success: true, warning: response.warning || null, message: response.message }
      }

      const target = getEventById(eventId)
      if (!target) {
        throw new Error('Event not found')
      }
      const pending = Number(target.metrics?.pending || 0)
      const warning =
        pending > 0
          ? {
              code: 'EVENT_CLOSED_WITH_PENDING',
              message: `Event closed with pending amount ${pending}.`,
            }
          : null

      const now = new Date().toISOString()
      setEvents((previous) =>
        previous.map((event) =>
          event.id === eventId
            ? normalizeEvent({
                ...event,
                lifecycleStatus: 'CLOSED',
                status: 'CLOSED',
                closedAt: now,
                closedBy: currentUser.email || currentUser.name || currentUser.id,
                closingNote: payload.closingNote || '',
              })
            : event,
        ),
      )
      if (warning?.message) {
        setOperationError(warning.message)
      }
      return { success: true, warning, message: 'Event closed successfully' }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to close event')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const reopenEvent = async (eventId) => {
    try {
      setOperationError('')
      requireAdminAccess()

      if (dataSource === 'api') {
        const response = await reopenEventApi(eventId)
        upsertEventInState(response.data)
        return { success: true, message: response.message }
      }

      setEvents((previous) =>
        previous.map((event) =>
          event.id === eventId
            ? normalizeEvent({
                ...event,
                lifecycleStatus: 'ACTIVE',
                status: 'ACTIVE',
                closedAt: null,
                closedBy: null,
                closingNote: '',
              })
            : event,
        ),
      )
      return { success: true, message: 'Event reopened successfully' }
    } catch (error) {
      const message = parseErrorMessage(error, 'Failed to reopen event')
      setOperationError(message)
      return { success: false, message }
    }
  }

  const loginUser = async ({ identifier, password }) => {
    try {
      setAuthError('')
      const data = await loginApi({ identifier, password })
      setStoredToken(data.token)
      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || 'user',
      })
      return { success: true }
    } catch (error) {
      const message = parseErrorMessage(error, 'Login failed')
      setAuthError(message)
      return { success: false, message }
    }
  }

  const logoutUser = () => {
    setStoredToken(null)
    setCurrentUser(initialUser)
    setAuthError('')
    setOperationError('')
  }

  const eventsWithMetrics = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        metrics: event.metrics || calculateEventMetrics(event),
      })),
    [events],
  )

  const dashboardMetrics = useMemo(() => getDashboardMetrics(eventsWithMetrics), [eventsWithMetrics])
  const warnings = useMemo(() => buildWarnings(eventsWithMetrics), [eventsWithMetrics])
  const monthlyTrend = useMemo(() => getMonthlyTrend(eventsWithMetrics), [eventsWithMetrics])

  const value = {
    events: eventsWithMetrics,
    rawEvents: events,
    isLoading,
    authLoading,
    isAuthenticated,
    dataSource,
    backendConnected: dataSource === 'api',
    currentUser,
    currentUserRole,
    canEdit,
    canCloseEvent,
    canReopenEvent,
    authError,
    operationError,
    dashboardMetrics,
    warnings,
    monthlyTrend,
    loginUser,
    logoutUser,
    loginAdmin: loginUser,
    logoutAdmin: logoutUser,
    clearErrors: () => {
      setAuthError('')
      setOperationError('')
    },
    addEvent,
    updateEvent,
    addFundingSource,
    updateFundingSource,
    addCategory,
    updateCategory,
    closeEvent,
    reopenEvent,
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
