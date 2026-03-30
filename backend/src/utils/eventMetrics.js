const toNumber = (value) => Number(value || 0)

const sumBy = (items, key) => items.reduce((total, item) => total + toNumber(item[key]), 0)

const calculateEventMetrics = (event) => {
  const totalBudget = sumBy(event.fundingSources, 'amount')
  const totalLiability = sumBy(event.categories, 'allocated')
  const paid = sumBy(event.categories, 'paid')
  const pending = totalLiability - paid
  const remaining = totalBudget - totalLiability
  const hasCategoryOverpay = event.categories.some((category) => toNumber(category.paid) > toNumber(category.allocated))

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

module.exports = {
  calculateEventMetrics,
}
