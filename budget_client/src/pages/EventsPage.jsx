import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EventTable from '../components/tables/EventTable'
import AlertBox from '../components/ui/AlertBox'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import { useBudget } from '../context/BudgetContext'

const initialFormState = {
  name: '',
  date: '',
  totalBudget: '',
}
const ITEMS_PER_PAGE = 20

function EventsPage() {
  const navigate = useNavigate()
  const { events, addEvent, updateEvent, canEdit, operationError, clearErrors } = useBudget()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [requestedPage, setRequestedPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState(initialFormState)
  const [editForm, setEditForm] = useState({ id: '', name: '', date: '' })

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesSearch = event.name.toLowerCase().includes(search.trim().toLowerCase())
        const matchesStatus = status === 'all' ? true : event.metrics.status === status
        return matchesSearch && matchesStatus
      }),
    [events, search, status],
  )

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages)

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredEvents, currentPage])

  const visiblePages = useMemo(() => {
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)
    const pages = []
    for (let page = start; page <= end; page += 1) {
      pages.push(page)
    }
    return pages
  }, [currentPage, totalPages])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const result = await addEvent(form)
    if (result.success) {
      setForm(initialFormState)
      setIsModalOpen(false)
    }
  }

  const openEditModal = (eventItem) => {
    setEditForm({
      id: eventItem.id,
      name: eventItem.name,
      date: eventItem.date,
    })
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    const result = await updateEvent(editForm.id, { name: editForm.name, date: editForm.date })
    if (result.success) {
      setEditModalOpen(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Monitor each event budget, liabilities, payments, and utilization status"
        action={
          <button
            type="button"
            onClick={() => {
              clearErrors()
              setIsModalOpen(true)
            }}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add New Event
          </button>
        }
      />

      <section className="panel p-5">
        {operationError ? (
          <div className="mb-4">
            <AlertBox title="Action not completed" message={operationError} variant="warning" />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setRequestedPage(1)
            }}
            placeholder="Search by event name"
            className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setRequestedPage(1)
            }}
            className="rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="all">All status</option>
            <option value="Safe">Safe</option>
            <option value="Warning">Warning</option>
            <option value="Overbudget">Overbudget</option>
          </select>
        </div>

        <div className="mt-5">
          <EventTable
            events={paginatedEvents}
            onOpenEvent={(id) => navigate(`/events/${id}`)}
            onEditEvent={openEditModal}
            canEdit={canEdit}
            maxHeightClass="max-h-[36rem]"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Showing {filteredEvents.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length} events
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRequestedPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setRequestedPage(page)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  page === currentPage
                    ? 'bg-brand text-white'
                    : 'border border-line text-muted hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRequestedPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <Modal
        title="Add New Event"
        isOpen={isModalOpen}
        onClose={() => {
          clearErrors()
          setIsModalOpen(false)
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Event Name</label>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Date</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Initial Total Budget</label>
            <input
              required
              type="number"
              min="0"
              value={form.totalBudget}
              onChange={(event) => setForm((previous) => ({ ...previous, totalBudget: event.target.value }))}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
            Save Event
          </button>
        </form>
      </Modal>

      <Modal
        title="Edit Event"
        isOpen={isEditModalOpen}
        onClose={() => {
          clearErrors()
          setEditModalOpen(false)
        }}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Event Name</label>
            <input
              required
              value={editForm.name}
              onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Date</label>
            <input
              required
              type="date"
              value={editForm.date}
              onChange={(event) => setEditForm((previous) => ({ ...previous, date: event.target.value }))}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted">
            Budget updates can be done from the Event Detail page by editing funding sources.
          </p>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
            Update Event
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default EventsPage
