export const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

export const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const sumBy = (items, key) =>
  items.reduce((total, item) => total + Number(item[key] || 0), 0)

export const calculateEventMetrics = (event) => {
  const totalBudget = sumBy(event.fundingSources, 'amount')
  const totalLiability = sumBy(event.categories, 'allocated')
  const paid = sumBy(event.categories, 'paid')
  const pending = totalLiability - paid
  const remaining = totalBudget - totalLiability
  const hasCategoryOverpay = event.categories.some(
    (category) => Number(category.paid) > Number(category.allocated),
  )

  let status = 'Safe'
  if (totalLiability > totalBudget || hasCategoryOverpay || paid > totalLiability) {
    status = 'Overbudget'
  } else if (pending > 0 || (totalBudget > 0 && remaining / totalBudget < 0.2)) {
    status = 'Warning'
  }

  return {
    totalBudget,
    totalLiability,
    paid,
    pending,
    remaining,
    status,
  }
}

export const getDashboardMetrics = (events) => {
  const aggregate = events.reduce(
    (accumulator, event) => {
      const metrics = calculateEventMetrics(event)
      return {
        totalBudget: accumulator.totalBudget + metrics.totalBudget,
        totalLiability: accumulator.totalLiability + metrics.totalLiability,
        paid: accumulator.paid + metrics.paid,
        pending: accumulator.pending + metrics.pending,
        remaining: accumulator.remaining + metrics.remaining,
      }
    },
    { totalBudget: 0, totalLiability: 0, paid: 0, pending: 0, remaining: 0 },
  )

  return aggregate
}

export const buildWarnings = (events) => {
  const warnings = []

  events.forEach((event) => {
    const metrics = calculateEventMetrics(event)

    if (metrics.totalLiability > metrics.totalBudget) {
      warnings.push({
        id: `${event.id}-liability-warning`,
        title: `${event.name} has exceeded budget allocation`,
        message: `Liability is ${formatCurrency(metrics.totalLiability)} against a budget of ${formatCurrency(metrics.totalBudget)}.`,
        variant: 'danger',
      })
    }

    event.categories.forEach((category) => {
      if (Number(category.paid) > Number(category.allocated)) {
        warnings.push({
          id: `${event.id}-${category.id}-paid-warning`,
          title: `${event.name}: ${category.name} is overpaid`,
          message: `Paid ${formatCurrency(category.paid)} against allocated ${formatCurrency(category.allocated)}.`,
          variant: 'warning',
        })
      }
    })
  })

  return warnings
}

export const getExpenseDistribution = (events) => {
  const map = new Map()

  events.forEach((event) => {
    event.categories.forEach((category) => {
      map.set(category.name, (map.get(category.name) || 0) + Number(category.allocated || 0))
    })
  })

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

export const getMonthlyTrend = (events) => {
  const monthMap = new Map()

  events.forEach((event) => {
    const date = new Date(event.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const metrics = event.metrics ?? calculateEventMetrics(event)

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        paid: 0,
        pending: 0,
      })
    }

    const current = monthMap.get(key)
    current.paid += Number(metrics.paid || 0)
    current.pending += Number(metrics.pending || 0)
  })

  return [...monthMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value)
}

export const buildCategoryReport = (events, eventId = 'all') => {
  const selectedEvents = eventId === 'all' ? events : events.filter((event) => event.id === eventId)
  const categoryMap = new Map()

  selectedEvents.forEach((event) => {
    event.categories.forEach((category) => {
      if (!categoryMap.has(category.name)) {
        categoryMap.set(category.name, { allocated: 0, paid: 0 })
      }
      const current = categoryMap.get(category.name)
      current.allocated += Number(category.allocated || 0)
      current.paid += Number(category.paid || 0)
    })
  })

  return [...categoryMap.entries()].map(([name, values]) => ({
    name,
    allocated: values.allocated,
    paid: values.paid,
    pending: values.allocated - values.paid,
  }))
}
