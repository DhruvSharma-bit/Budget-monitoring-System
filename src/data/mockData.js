const EVENT_COUNT = 100

const eventTitlePool = [
  'Tech Summit',
  'Cultural Fest',
  'Sports Meet',
  'Alumni Connect',
  'Innovation Expo',
  'Department Symposium',
  'Startup Bootcamp',
  'Inter-College Debate',
  'Research Conclave',
  'Arts and Music Night',
]

const categoryPool = [
  'Venue',
  'Hospitality',
  'Marketing',
  'Logistics',
  'Security',
  'Equipment',
  'Stage and Sound',
  'Media Coverage',
  'Transport',
  'Catering',
  'Registration Desk',
  'Guest Management',
]

const thirdFundingPool = ['Sponsor Pool', 'Alumni Fund', 'Department Support', 'Student Council']
const allocationWeights = [0.25, 0.22, 0.2, 0.18, 0.15]

const pad = (value) => String(value).padStart(2, '0')
const toDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const addDays = (baseDate, days) => {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next
}

const baseStartDate = new Date('2026-04-01T00:00:00')

const generatedEvents = []

for (let index = 0; index < EVENT_COUNT; index += 1) {
  const eventNumber = index + 1
  const eventId = `evt-${String(eventNumber).padStart(3, '0')}`
  const eventDate = addDays(baseStartDate, index * 2)
  const eventName = `${eventTitlePool[index % eventTitlePool.length]} ${String(eventNumber).padStart(3, '0')}`

  const baseBudget = 140000 + (index % 12) * 9000 + Math.floor(index / 10) * 4500
  const giaAmount = Math.round(baseBudget * 0.48)
  const ugfAmount = Math.round(baseBudget * 0.32)
  const thirdAmount = baseBudget - giaAmount - ugfAmount

  const fundingSources = [
    { id: `fs-${eventNumber}-1`, name: 'GIA', amount: giaAmount },
    { id: `fs-${eventNumber}-2`, name: 'UGF', amount: ugfAmount },
    {
      id: `fs-${eventNumber}-3`,
      name: thirdFundingPool[index % thirdFundingPool.length],
      amount: thirdAmount,
    },
  ]

  const liabilityMultiplier =
    index % 9 === 0 ? 1.14 : index % 7 === 0 ? 1.04 : 0.9 + (index % 3) * 0.04

  const categories = allocationWeights.map((weight, categoryIndex) => {
    const categoryId = `cat-${eventNumber}-${categoryIndex + 1}`
    const categoryName = categoryPool[(index + categoryIndex) % categoryPool.length]
    const allocated = Math.round(baseBudget * liabilityMultiplier * weight)

    let paidFactor = 0.45 + ((index + categoryIndex) % 6) * 0.1
    if (index % 13 === 0 && categoryIndex === 1) {
      paidFactor = 1.08
    }
    if (index % 11 === 0 && categoryIndex === 4) {
      paidFactor = 0
    }

    const paid = Math.round(allocated * paidFactor)

    return {
      id: categoryId,
      name: categoryName,
      allocated,
      paid,
    }
  })

  generatedEvents.push({
    id: eventId,
    name: eventName,
    date: toDateString(eventDate),
    fundingSources,
    categories,
  })
}

export const initialEvents = generatedEvents
