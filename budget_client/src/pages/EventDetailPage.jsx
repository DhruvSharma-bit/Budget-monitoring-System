import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import CategoryTable from "../components/tables/CategoryTable";
import FundingSourceTable from "../components/tables/FundingSourceTable";
import AlertBox from "../components/ui/AlertBox";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import { useBudget } from "../context/BudgetContext";
import { downloadEventFinancialReport } from "../utils/eventPdf";
import { formatCurrency, formatDate } from "../utils/finance";

const fundingInitialState = { name: "", amount: "" };
const categoryInitialState = { name: "", allocated: "", paid: "0" };
const categoryPaidEntryInitialState = { amount: "" };
const closeFormInitialState = { closingNote: "" };

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function EventDetailPage() {
  const { eventId } = useParams();
  const {
    events,
    canEdit,
    canCloseEvent,
    canReopenEvent,
    backendConnected,
    operationError,
    clearErrors,
    addFundingSource,
    addCategory,
    addCategoryPaidEntry,
    updateEvent,
    updateFundingSource,
    appendFundingSource,
    updateCategory,
    closeEvent,
    reopenEvent,
  } = useBudget();
  const event = events.find((item) => item.id === eventId);

  const [isEventEditModalOpen, setEventEditModalOpen] = useState(false);
  const [isFundingModalOpen, setFundingModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isCategoryPaidEntryModalOpen, setCategoryPaidEntryModalOpen] =
    useState(false);
  const [isCloseModalOpen, setCloseModalOpen] = useState(false);

  const [editingFundingId, setEditingFundingId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [payingCategoryId, setPayingCategoryId] = useState(null);
  const [isAppendingFunding, setAppendingFunding] = useState(false);

  const [eventForm, setEventForm] = useState({ name: "", date: "" });
  const [fundingForm, setFundingForm] = useState(fundingInitialState);
  const [categoryForm, setCategoryForm] = useState(categoryInitialState);
  const [categoryPaidEntryForm, setCategoryPaidEntryForm] = useState(
    categoryPaidEntryInitialState,
  );
  const [closeForm, setCloseForm] = useState(closeFormInitialState);

  const isEditingFunding =
    editingFundingId !== null && editingFundingId !== undefined;
  const isEditingCategory =
    editingCategoryId !== null && editingCategoryId !== undefined;

  const formAllocatedAmount = Number(categoryForm.allocated || 0);
  const formPaidAmount = Number(categoryForm.paid || 0);
  const editingCategoryIdText =
    editingCategoryId !== null && editingCategoryId !== undefined
      ? String(editingCategoryId)
      : null;

  const baseLiabilityWithoutEditing = event
    ? event.categories.reduce((total, category) => {
        if (
          editingCategoryIdText &&
          String(category.id) === editingCategoryIdText
        ) {
          return total;
        }
        return total + Number(category.allocated || 0);
      }, 0)
    : 0;

  const basePaidWithoutEditing = event
    ? event.categories.reduce((total, category) => {
        if (
          editingCategoryIdText &&
          String(category.id) === editingCategoryIdText
        ) {
          return total;
        }
        return total + Number(category.paid || 0);
      }, 0)
    : 0;

  const projectedTotalLiability =
    baseLiabilityWithoutEditing + formAllocatedAmount;
  const projectedTotalPaid = basePaidWithoutEditing + formPaidAmount;
  const projectedRemaining =
    Number(event?.metrics?.totalBudget || 0) - projectedTotalLiability;
  const projectedPending = projectedTotalLiability - projectedTotalPaid;

  if (!event) {
    return (
      <div className="panel p-6">
        <p className="text-base font-semibold text-text">Event not found.</p>
        <Link
          to="/events"
          className="mt-2 inline-block text-sm font-medium text-brand"
        >
          Back to events
        </Link>
      </div>
    );
  }

  const lifecycleStatus = String(
    event.lifecycleStatus || event.status || "ACTIVE",
  ).toUpperCase();
  const isEventClosed = lifecycleStatus === "CLOSED";
  const canEditEventData = canEdit && !isEventClosed;
  const canCloseNow = canCloseEvent && !isEventClosed;
  const canReopenNow = canReopenEvent && isEventClosed;

  const openEventEdit = () => {
    clearErrors();
    setEventForm({ name: event.name, date: event.date });
    setEventEditModalOpen(true);
  };

  const openAddFunding = () => {
    clearErrors();
    setAppendingFunding(false);
    setEditingFundingId(null);
    setFundingForm(fundingInitialState);
    setFundingModalOpen(true);
  };

  const openEditFunding = (source) => {
    clearErrors();
    setAppendingFunding(false);
    setEditingFundingId(String(source.id));
    setFundingForm({
      name: source.name,
      amount: String(source.amount),
    });
    setFundingModalOpen(true);
  };

  const openAppendFunding = (source) => {
    clearErrors();
    setAppendingFunding(true);
    setEditingFundingId(String(source.id));
    setFundingForm({
      name: source.name,
      amount: "",
    });
    setFundingModalOpen(true);
  };

  const openAddCategory = () => {
    clearErrors();
    setEditingCategoryId(null);
    setCategoryForm(categoryInitialState);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category) => {
    clearErrors();
    setEditingCategoryId(String(category.id));
    setCategoryForm({
      name: category.name,
      allocated: String(category.allocated),
      paid: String(category.paid),
    });
    setCategoryModalOpen(true);
  };

  const openAddCategoryPaidEntry = (category) => {
    clearErrors();
    setPayingCategoryId(String(category.id));
    setCategoryPaidEntryForm(categoryPaidEntryInitialState);
    setCategoryPaidEntryModalOpen(true);
  };

  const handleEventSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    const result = await updateEvent(eventId, eventForm);
    if (result.success) {
      setEventEditModalOpen(false);
    }
  };

  const handleFundingSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    let result;
    if (isEditingFunding) {
      if (isAppendingFunding) {
        const appendAmount = Number(fundingForm.amount || 0);
        if (appendAmount <= 0) {
          return;
        }
        result = await appendFundingSource(
          eventId,
          editingFundingId,
          appendAmount,
        );
      } else {
        result = await updateFundingSource(
          eventId,
          editingFundingId,
          fundingForm,
        );
      }
    } else {
      result = await addFundingSource(eventId, fundingForm);
    }

    if (result.success) {
      setFundingForm(fundingInitialState);
      setAppendingFunding(false);
      setEditingFundingId(null);
      setFundingModalOpen(false);
    }
  };

  const handleCategorySubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    let result;
    if (isEditingCategory) {
      result = await updateCategory(eventId, editingCategoryId, categoryForm);
    } else {
      result = await addCategory(eventId, categoryForm);
    }

    if (result.success) {
      setCategoryForm(categoryInitialState);
      setEditingCategoryId(null);
      setCategoryModalOpen(false);
    }
  };

  const handleCategoryPaidEntrySubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    const paidAmount = Number(categoryPaidEntryForm.amount || 0);
    if (!payingCategoryId || paidAmount <= 0) {
      return;
    }

    const result = await addCategoryPaidEntry(
      eventId,
      payingCategoryId,
      paidAmount,
    );
    if (result.success) {
      setCategoryPaidEntryForm(categoryPaidEntryInitialState);
      setPayingCategoryId(null);
      setCategoryPaidEntryModalOpen(false);
    }
  };

  const handleCloseEventSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    const result = await closeEvent(eventId, closeForm);
    if (result.success) {
      setCloseModalOpen(false);
      setCloseForm(closeFormInitialState);
    }
  };

  const handleReopenEvent = async () => {
    await reopenEvent(eventId);
  };

  const handleDownloadPdf = async () => {
    await downloadEventFinancialReport(event);
  };

  const categoryWarnings = event.categories.filter(
    (category) => Number(category.paid) > Number(category.allocated),
  );

  return (
    <div>
      <PageHeader
        title={event.name}
        subtitle={`Event Date: ${formatDate(event.date)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={lifecycleStatus} />
            <StatusBadge status={event.metrics.status} />
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-slate-100"
            >
              Download PDF
            </button>
            {canCloseNow ? (
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setCloseForm(closeFormInitialState);
                  setCloseModalOpen(true);
                }}
                className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-danger hover:bg-red-50"
              >
                Close Event
              </button>
            ) : null}
            {canReopenNow ? (
              <button
                type="button"
                onClick={handleReopenEvent}
                className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-success hover:bg-green-50"
              >
                Reopen Event
              </button>
            ) : null}
            {canEditEventData ? (
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
          title={
            canEditEventData ? "Admin Edit Mode Enabled" : "Read-Only Mode"
          }
          message={
            canEditEventData
              ? "You have admin access to modify budget details for this event."
              : isEventClosed
                ? "This event is CLOSED. Updates to event, categories, and funding are disabled."
                : "Login as admin from Settings to edit funding and category entries."
          }
          variant={canEditEventData ? "info" : "warning"}
        />
      </section>

      {isEventClosed ? (
        <section className="panel mb-6 p-4">
          <h3 className="text-base font-semibold text-text">
            Event Closure Details
          </h3>
          <div className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-3">
            <p>
              Closed At:{" "}
              <span className="font-medium text-text">
                {formatDateTime(event.closedAt)}
              </span>
            </p>
            <p>
              Closed By:{" "}
              <span className="font-medium text-text">
                {event.closedBy || "-"}
              </span>
            </p>
            <p>
              Note:{" "}
              <span className="font-medium text-text">
                {event.closingNote || "-"}
              </span>
            </p>
          </div>
        </section>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Budget"
          value={formatCurrency(event.metrics.totalBudget)}
        />
        <StatCard
          title="Total Liability"
          value={formatCurrency(event.metrics.totalLiability)}
          accent="text-warning"
        />
        <StatCard
          title="Paid"
          value={formatCurrency(event.metrics.paid)}
          accent="text-success"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(event.metrics.pending)}
          accent="text-danger"
        />
        <StatCard
          title="Remaining"
          value={formatCurrency(event.metrics.remaining)}
        />
      </section>

      <section className="mb-6 space-y-3">
        {operationError ? (
          <AlertBox
            title="Action not completed"
            message={operationError}
            variant="warning"
          />
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
            <h3 className="text-base font-semibold text-text">
              Funding Sources
            </h3>
            <p className="text-sm text-muted">
              Total Budget = sum of all funding sources
            </p>
          </div>
          {canEditEventData ? (
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
          onAppendSource={openAppendFunding}
          canEdit={canEditEventData}
          maxHeightClass="max-h-[22rem]"
        />
      </section>

      <section className="panel mb-6">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-semibold text-text">Categories</h3>
            <p className="text-sm text-muted">
              Dynamic category allocation and payment progress monitoring
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Remaining Budget
              </p>
              <p className="text-sm font-semibold text-text">
                {formatCurrency(event.metrics.remaining)}
              </p>
            </div>
            {canEditEventData ? (
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
          onAddPaidEntry={openAddCategoryPaidEntry}
          canEdit={canEditEventData}
          maxHeightClass="max-h-[30rem]"
        />
      </section>

      <Modal
        title="Edit Event Details"
        isOpen={isEventEditModalOpen}
        onClose={() => {
          clearErrors();
          setEventEditModalOpen(false);
        }}
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          {operationError ? (
            <AlertBox
              title="Update failed"
              message={operationError}
              variant="warning"
            />
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Event Name
            </label>
            <input
              required
              value={eventForm.name}
              onChange={(submitEvent) =>
                setEventForm((previous) => ({
                  ...previous,
                  name: submitEvent.target.value,
                }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Date
            </label>
            <input
              required
              type="date"
              value={eventForm.date}
              onChange={(submitEvent) =>
                setEventForm((previous) => ({
                  ...previous,
                  date: submitEvent.target.value,
                }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Save Changes
          </button>
        </form>
      </Modal>

      <Modal
        title={
          isAppendingFunding
            ? "Append Funding Amount"
            : isEditingFunding
              ? "Edit Funding Source"
              : "Add Funding Source"
        }
        isOpen={isFundingModalOpen}
        onClose={() => {
          clearErrors();
          setAppendingFunding(false);
          setFundingModalOpen(false);
        }}
      >
        <form onSubmit={handleFundingSubmit} className="space-y-4">
          {operationError ? (
            <AlertBox
              title="Update failed"
              message={operationError}
              variant="warning"
            />
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Source Name
            </label>
            <input
              required
              value={fundingForm.name}
              onChange={(submitEvent) =>
                setFundingForm((previous) => ({
                  ...previous,
                  name: submitEvent.target.value,
                }))
              }
              readOnly={isAppendingFunding}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              {isAppendingFunding ? "Amount To Append" : "Amount"}
            </label>
            <input
              required
              type="number"
              min="0"
              value={fundingForm.amount}
              onChange={(submitEvent) =>
                setFundingForm((previous) => ({
                  ...previous,
                  amount: submitEvent.target.value,
                }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            {isAppendingFunding ? (
              <p className="mt-1 text-xs text-muted">
                This value will be added to the existing source amount.
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {isAppendingFunding
              ? "Append Amount"
              : isEditingFunding
                ? "Update Source"
                : "Save Source"}
          </button>
        </form>
      </Modal>

      <Modal
        title="Add Paid Entry"
        isOpen={isCategoryPaidEntryModalOpen}
        onClose={() => {
          clearErrors();
          setCategoryPaidEntryModalOpen(false);
          setPayingCategoryId(null);
        }}
      >
        <form onSubmit={handleCategoryPaidEntrySubmit} className="space-y-4">
          {operationError ? (
            <AlertBox
              title="Update failed"
              message={operationError}
              variant="warning"
            />
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Paid Amount To Add
            </label>
            <input
              required
              type="number"
              min="0"
              value={categoryPaidEntryForm.amount}
              onChange={(submitEvent) =>
                setCategoryPaidEntryForm({ amount: submitEvent.target.value })
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              This amount will be added to the category's current paid value and
              logged with timestamp.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Add Paid Entry
          </button>
        </form>
      </Modal>

      <Modal
        title={isEditingCategory ? "Edit Category" : "Add Category"}
        isOpen={isCategoryModalOpen}
        onClose={() => {
          clearErrors();
          setCategoryModalOpen(false);
        }}
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          {operationError ? (
            <AlertBox
              title="Update failed"
              message={operationError}
              variant="warning"
            />
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Category Name
            </label>
            <input
              required
              value={categoryForm.name}
              onChange={(submitEvent) =>
                setCategoryForm((previous) => ({
                  ...previous,
                  name: submitEvent.target.value,
                }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Allocated Amount
            </label>
            <input
              required
              type="number"
              min="0"
              value={categoryForm.allocated}
              onChange={(submitEvent) =>
                setCategoryForm((previous) => ({
                  ...previous,
                  allocated: submitEvent.target.value,
                }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Paid Amount
            </label>
            <input
              required
              type="number"
              min="0"
              value={categoryForm.paid}
              onChange={(submitEvent) =>
                setCategoryForm((previous) => ({
                  ...previous,
                  paid: submitEvent.target.value,
                }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Budget Preview
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <p className="text-muted">Projected Liability</p>
              <p className="text-right font-semibold text-text">
                {formatCurrency(projectedTotalLiability)}
              </p>

              <p className="text-muted">Projected Paid</p>
              <p className="text-right font-semibold text-text">
                {formatCurrency(projectedTotalPaid)}
              </p>

              <p className="text-muted">Projected Pending</p>
              <p
                className={`text-right font-semibold ${projectedPending < 0 ? "text-danger" : "text-warning"}`}
              >
                {formatCurrency(projectedPending)}
              </p>

              <p className="text-muted">Projected Remaining Budget</p>
              <p
                className={`text-right font-semibold ${projectedRemaining < 0 ? "text-danger" : "text-text"}`}
              >
                {formatCurrency(projectedRemaining)}
              </p>
            </div>
            {projectedRemaining < 0 ? (
              <p className="mt-2 text-xs font-medium text-danger">
                This allocation would exceed available budget.
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {isEditingCategory ? "Update Category" : "Save Category"}
          </button>
        </form>
      </Modal>

      <Modal
        title="Close Event"
        isOpen={isCloseModalOpen}
        onClose={() => {
          clearErrors();
          setCloseModalOpen(false);
        }}
      >
        <form onSubmit={handleCloseEventSubmit} className="space-y-4">
          {operationError ? (
            <AlertBox
              title="Close failed"
              message={operationError}
              variant="warning"
            />
          ) : null}
          <p className="text-sm text-muted">
            Closing this event will lock updates for event details, funding
            sources, and categories.
          </p>

          <div className="grid grid-cols-2 gap-3 rounded-md border border-line bg-slate-50 p-3 text-sm">
            <p className="text-muted">Total Budget</p>
            <p className="text-right font-semibold text-text">
              {formatCurrency(event.metrics.totalBudget)}
            </p>
            <p className="text-muted">Total Liability</p>
            <p className="text-right font-semibold text-text">
              {formatCurrency(event.metrics.totalLiability)}
            </p>
            <p className="text-muted">Total Paid</p>
            <p className="text-right font-semibold text-text">
              {formatCurrency(event.metrics.paid)}
            </p>
            <p className="text-muted">Total Pending</p>
            <p
              className={`text-right font-semibold ${event.metrics.pending > 0 ? "text-warning" : "text-text"}`}
            >
              {formatCurrency(event.metrics.pending)}
            </p>
          </div>

          {event.metrics.pending > 0 ? (
            <AlertBox
              title="Pending amount exists"
              message="Event can still be closed, but pending amount will remain outstanding."
              variant="warning"
            />
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Closing Note (Optional)
            </label>
            <textarea
              rows={3}
              value={closeForm.closingNote}
              onChange={(submitEvent) =>
                setCloseForm((previous) => ({
                  ...previous,
                  closingNote: submitEvent.target.value,
                }))
              }
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
              placeholder="Reason or note for closing this event..."
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white"
          >
            Confirm Close Event
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default EventDetailPage;
