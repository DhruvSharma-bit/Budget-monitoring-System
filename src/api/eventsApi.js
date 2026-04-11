import api from './http'

export const listEventsApi = async () => {
  const response = await api.get('/events')
  return response.data.data
}

export const createEventApi = async ({ name, date, totalBudget }) => {
  const response = await api.post('/events', {
    name,
    eventDate: date,
    initialFunding: Number(totalBudget || 0),
    initialFundingSourceName: 'Initial Allocation',
  })
  return response.data.data
}

export const updateEventApi = async (eventId, payload) => {
  const response = await api.patch(`/events/${eventId}`, {
    name: payload.name,
    eventDate: payload.date,
  })
  return response.data.data
}

export const closeEventApi = async (eventId, payload = {}) => {
  const response = await api.post(`/events/${eventId}/close`, {
    closingNote: payload.closingNote || '',
  })
  return response.data
}

export const reopenEventApi = async (eventId) => {
  const response = await api.post(`/events/${eventId}/reopen`)
  return response.data
}

export const addFundingSourceApi = async (eventId, source) => {
  const response = await api.post(`/events/${eventId}/funding-sources`, {
    name: source.name,
    amount: Number(source.amount || 0),
  })
  return response.data.data
}

export const updateFundingSourceApi = async (eventId, sourceId, payload) => {
  const response = await api.patch(`/events/${eventId}/funding-sources/${sourceId}`, {
    name: payload.name,
    amount: Number(payload.amount || 0),
  })
  return response.data.data
}

export const addCategoryApi = async (eventId, category) => {
  const response = await api.post(`/events/${eventId}/categories`, {
    name: category.name,
    allocated: Number(category.allocated || 0),
    paid: Number(category.paid || 0),
  })
  return response.data.data
}

export const updateCategoryApi = async (eventId, categoryId, payload) => {
  const response = await api.patch(`/events/${eventId}/categories/${categoryId}`, {
    name: payload.name,
    allocated: Number(payload.allocated || 0),
    paid: Number(payload.paid || 0),
  })
  return response.data.data
}
