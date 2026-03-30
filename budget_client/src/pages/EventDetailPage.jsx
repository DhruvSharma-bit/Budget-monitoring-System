import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CategoryTable from '../components/tables/CategoryTable'
import FundingSourceTable from '../components/tables/FundingSourceTable'
import AlertBox from '../components/ui/AlertBox'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { useBudget } from '../context/BudgetContext'
import { formatCurrency, formatDate } from '../utils/finance'

const fundingInitialState = { name: '', amount: '' }
const categoryInitialState = { name: '', allocated: '', paid: '0' }

function EventDetailPage() {
  const { eventId } = useParams()
  const {
    events,
    canEdit,
    backendConnected,
    operationError,
    clearErrors,
    addFundingSource,
    addCategory,
    updateEvent,
    updateFundingSource,
    updateCategory,
  } = useBudget()
  const event = events.find((item) => item.id === eventId)

  const [isEventEditModalOpen, setEventEditModalOpen] = useState(false)
  const [isFundingModalOpen, setFundingModalOpen] = useState(false)
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false)

  const [editingFundingId, setEditingFundingId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)

  const [eventForm, setEventForm] = useState({ name: '', date: '' })
  const [fundingForm, setFundingForm] = useState(fundingInitialState)
  const [categoryForm, setCategoryForm] = useState(categoryInitialState)

  if (!event) {
    return (
      <div className="panel p-6">
        <p className="text-base font-semibold text-text">Event not found.</p>
        <Link to="/events" className="mt-2 inline-block text-sm font-medium text-brand">
          Back to events
        </Link>
      </div>
    )
  }

  const openEventEdit = () => {
    clearErrors()
    setEventForm({ name: event.name, date: event.date })
    setEventEditModalOpen(true)
  }

  const openAddFunding = () => {
    clearErrors()
    setEditingFundingId(null)
    setFundingForm(fundingInitialState)
    setFundingModalOpen(true)
  }

  const openEditFunding = (source) => {
    clearErrors()
    setEditingFundingId(source.id)
    setFundingForm({
      name: source.name,
      amount: String(source.amount),
    })
    setFundingModalOpen(true)
  }

  const openAddCategory = () => {
    clearErrors()
    setEditingCategoryId(null)
    setCategoryForm(categoryInitialState)
    setCategoryModalOpen(true)
  }

  const openEditCategory = (category) => {
    clearErrors()
    setEditingCategoryId(category.id)
    setCategoryForm({
      name: category.name,
      allocated: String(category.allocated),
      paid: String(category.paid),
    })
    setCategoryModalOpen(true)
  }

  const handleEventSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    const result = await updateEvent(eventId, eventForm)
    if (result.success) {
      setEventEditModalOpen(false)
    }
  }

  const handleFundingSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    let result
    if (editingFundingId) {
      result = await updateFundingSource(eventId, editingFundingId, fundingForm)
    } else {
      result = await addFundingSource(eventId, fundingForm)
    }

    if (result.success) {
      setFundingForm(fundingInitialState)
      setEditingFundingId(null)
      setFundingModalOpen(false)
    }
  }

  const handleCategorySubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    let result
    if (editingCategoryId) {
      result = await updateCategory(eventId, editingCategoryId, categoryForm)
    } else {
      result = await addCategory(eventId, categoryForm)
    }

    if (result.success) {
      setCategoryForm(categoryInitialState)
      setEditingCategoryId(null)
      setCategoryModalOpen(false)
    }
  }

  const categoryWarnings = event.categories.filter(
    (category) => Number(category.paid) > Number(category.allocated),
  )

  return (
    <div>
      <PageHeader
        title={event.name}
        subtitle={`Event Date: ${formatDate(event.date)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={event.metrics.status} />
            {canEdit ? (
              <button
                type="button"
                onClick={openEventEdit}
                className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-slate-100"
              >
                Edit Event
              </button>
            ) : null}
          </div>
        }
      />

      <section className="mb-6">
        <AlertBox
          title={canEdit ? 'Admin Edit Mode Enabled' : 'Read-Only Mode'}
          message={
            canEdit
              ? 'You have admin access to modify budget details for this event.'
              : 'Login as admin from Settings to edit funding and category entries.'
          }
          variant={canEdit ? 'info' : 'warning'}
        />
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Budget" value={formatCurrency(event.metrics.totalBudget)} />
        <StatCard title="Total Liability" value={formatCurrency(event.metrics.totalLiability)} accent="text-warning" />
        <StatCard title="Paid" value={formatCurrency(event.metrics.paid)} accent="text-success" />
        <StatCard title="Pending" value={formatCurrency(event.metrics.pending)} accent="text-danger" />
        <StatCard title="Remaining" value={formatCurrency(event.metrics.remaining)} />
      </section>

      <section className="mb-6 space-y-3">
        {operationError ? (
          <AlertBox title="Action not completed" message={operationError} variant="warning" />
        ) : null}
        {!backendConnected ? (
          <AlertBox
            title="Backend not connected"
            message="You are currently viewing mock data. Start backend and database to save data permanently."
            variant="info"
          />
        ) : null}
        {event.metrics.totalLiability > event.metrics.totalBudget ? (
          <AlertBox
            title="Liability exceeds total budget"
            message={`${event.name} has liabilities greater than available funding.`}
            variant="danger"
          />
        ) : null}
        {categoryWarnings.map((warning) => (
          <AlertBox
            key={warning.id}
            title={`${warning.name} is overpaid`}
            message={`Paid ${formatCurrency(warning.paid)} against allocated ${formatCurrency(warning.allocated)}.`}
            variant="warning"
          />
        ))}
      </section>

      <section className="panel mb-6">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-semibold text-text">Funding Sources</h3>
            <p className="text-sm text-muted">Total Budget = sum of all funding sources</p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={openAddFunding}
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              Add Funding Source
            </button>
          ) : null}
        </div>
        <FundingSourceTable
          sources={event.fundingSources}
          onEditSource={openEditFunding}
          canEdit={canEdit}
          maxHeightClass="max-h-[22rem]"
        />
      </section>

      <section className="panel mb-6">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-semibold text-text">Categories</h3>
            <p className="text-sm text-muted">Dynamic category allocation and payment progress monitoring</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Remaining Budget</p>
              <p className="text-sm font-semibold text-text">{formatCurrency(event.metrics.remaining)}</p>
            </div>
            {canEdit ? (
              <button
                type="button"
                onClick={openAddCategory}
                className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
              >
                Add Category
              </button>
            ) : null}
          </div>
        </div>
        <CategoryTable
          categories={event.categories}
          totalBudget={event.metrics.totalBudget}
          onEditCategory={openEditCategory}
          canEdit={canEdit}
          maxHeightClass="max-h-[30rem]"
        />
      </section>

      <Modal
        title="Edit Event Details"
        isOpen={isEventEditModalOpen}
        onClose={() => {
          clearErrors()
          setEventEditModalOpen(false)
        }}
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Event Name</label>
            <input
              required
              value={eventForm.name}
              onChange={(submitEvent) =>
                setEventForm((previous) => ({ ...previous, name: submitEvent.target.value }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Date</label>
            <input
              required
              type="date"
              value={eventForm.date}
              onChange={(submitEvent) =>
                setEventForm((previous) => ({ ...previous, date: submitEvent.target.value }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
            Save Changes
          </button>
        </form>
      </Modal>

      <Modal
        title={editingFundingId ? 'Edit Funding Source' : 'Add Funding Source'}
        isOpen={isFundingModalOpen}
        onClose={() => {
          clearErrors()
          setFundingModalOpen(false)
        }}
      >
        <form onSubmit={handleFundingSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Source Name</label>
            <input
              required
              value={fundingForm.name}
              onChange={(submitEvent) =>
                setFundingForm((previous) => ({ ...previous, name: submitEvent.target.value }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Amount</label>
            <input
              required
              type="number"
              min="0"
              value={fundingForm.amount}
              onChange={(submitEvent) =>
                setFundingForm((previous) => ({ ...previous, amount: submitEvent.target.value }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
            {editingFundingId ? 'Update Source' : 'Save Source'}
          </button>
        </form>
      </Modal>

      <Modal
        title={editingCategoryId ? 'Edit Category' : 'Add Category'}
        isOpen={isCategoryModalOpen}
        onClose={() => {
          clearErrors()
          setCategoryModalOpen(false)
        }}
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Category Name</label>
            <input
              required
              value={categoryForm.name}
              onChange={(submitEvent) =>
                setCategoryForm((previous) => ({ ...previous, name: submitEvent.target.value }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Allocated Amount</label>
            <input
              required
              type="number"
              min="0"
              value={categoryForm.allocated}
              onChange={(submitEvent) =>
                setCategoryForm((previous) => ({ ...previous, allocated: submitEvent.target.value }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Paid Amount</label>
            <input
              required
              type="number"
              min="0"
              value={categoryForm.paid}
              onChange={(submitEvent) =>
                setCategoryForm((previous) => ({ ...previous, paid: submitEvent.target.value }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
            {editingCategoryId ? 'Update Category' : 'Save Category'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default EventDetailPage
