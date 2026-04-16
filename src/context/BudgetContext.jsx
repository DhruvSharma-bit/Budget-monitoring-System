import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMeApi, loginApi } from "../api/authApi";
import {
  addCategoryApi,
  addCategoryPaidEntryApi,
  appendFundingSourceApi,
  addFundingSourceApi,
  createEventApi,
  listEventsApi,
  updateCategoryApi,
  updateEventApi,
  updateFundingSourceApi,
} from "../api/eventsApi";
import { getStoredToken, setStoredToken } from "../api/http";
import { initialEvents } from "../data/mockData";
import {
  buildWarnings,
  calculateEventMetrics,
  getDashboardMetrics,
  getMonthlyTrend,
} from "../utils/finance";

const BudgetContext = createContext(null);
const ADMIN_ROLE = "admin";

const normalizeAmount = (value) => Number(value || 0);
const initialUser = { id: "", name: "", email: "", role: "guest" };

const toDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const normalizeEvent = (event) => {
  const normalized = {
    ...event,
    date: toDateInput(event.date || event.eventDate),
    fundingSources: (event.fundingSources || []).map((source) => ({
      ...source,
      amount: normalizeAmount(source.amount),
      appendEntries: (source.appendEntries || []).map((entry) => ({
        ...entry,
        amount: normalizeAmount(entry.amount),
      })),
    })),
    categories: (event.categories || []).map((category) => ({
      ...category,
      allocated: normalizeAmount(category.allocated),
      paid: normalizeAmount(category.paid),
      paidEntries: (category.paidEntries || []).map((entry) => ({
        ...entry,
        amount: normalizeAmount(entry.amount),
        newPaid:
          entry.newPaid === null || entry.newPaid === undefined
            ? null
            : normalizeAmount(entry.newPaid),
      })),
    })),
  };

  normalized.metrics = event.metrics || calculateEventMetrics(normalized);
  return normalized;
};

const parseErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

export function BudgetProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataSource, setDataSource] = useState("loading");
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [authError, setAuthError] = useState("");
  const [operationError, setOperationError] = useState("");

  const currentUserRole = currentUser.role || "guest";
  const isAuthenticated = Boolean(currentUser.id);
  const canEdit = currentUserRole === ADMIN_ROLE;

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setIsLoading(true);
      setAuthLoading(true);
      setOperationError("");

      const token = getStoredToken();
      if (token) {
        try {
          const profile = await getMeApi();
          if (mounted) {
            setCurrentUser({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role || "user",
            });
          }
        } catch (error) {
          setStoredToken(null);
          if (mounted) {
            setCurrentUser(initialUser);
          }
        }
      } else if (mounted) {
        setCurrentUser(initialUser);
      }

      if (mounted) {
        setAuthLoading(false);
      }

      try {
        const remoteEvents = await listEventsApi();
        if (mounted) {
          setEvents(remoteEvents.map(normalizeEvent));
          setDataSource("api");
        }
      } catch (error) {
        if (mounted) {
          setEvents(initialEvents.map(normalizeEvent));
          setDataSource("mock");
          setOperationError("Backend unavailable. Showing local mock data.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const requireAdminAccess = () => {
    if (currentUserRole !== ADMIN_ROLE) {
      throw new Error("Only admin can edit budget data.");
    }
  };

  const upsertEventInState = (nextEvent) => {
    const normalized = normalizeEvent(nextEvent);
    setEvents((previous) => {
      const existingIndex = previous.findIndex(
        (event) => event.id === normalized.id,
      );
      if (existingIndex === -1) {
        return [normalized, ...previous];
      }
      return previous.map((event) =>
        event.id === normalized.id ? normalized : event,
      );
    });
  };

  const addEvent = async ({ name, date, totalBudget }) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const created = await createEventApi({ name, date, totalBudget });
        upsertEventInState(created);
      } else {
        const id = `evt-${Date.now()}`;
        const event = {
          id,
          name,
          date,
          fundingSources: [
            {
              id: `fs-${Date.now()}`,
              name: "Initial Allocation",
              amount: normalizeAmount(totalBudget),
            },
          ],
          categories: [],
        };
        upsertEventInState(event);
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(error, "Failed to create event");
      setOperationError(message);
      return { success: false, message };
    }
  };

  const updateEvent = async (eventId, payload) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const updated = await updateEventApi(eventId, payload);
        upsertEventInState(updated);
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
        );
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(error, "Failed to update event");
      setOperationError(message);
      return { success: false, message };
    }
  };

  const addFundingSource = async (eventId, source) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const updated = await addFundingSourceApi(eventId, source);
        upsertEventInState(updated);
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
        );
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(error, "Failed to add funding source");
      setOperationError(message);
      return { success: false, message };
    }
  };

  const updateFundingSource = async (eventId, sourceId, payload) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const updated = await updateFundingSourceApi(
          eventId,
          sourceId,
          payload,
        );
        upsertEventInState(updated);
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
        );
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(
        error,
        "Failed to update funding source",
      );
      setOperationError(message);
      return { success: false, message };
    }
  };

  const appendFundingSource = async (eventId, sourceId, amount) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const updated = await appendFundingSourceApi(eventId, sourceId, amount);
        upsertEventInState(updated);
      } else {
        const appendAmount = normalizeAmount(amount);
        setEvents((previous) =>
          previous.map((event) =>
            event.id === eventId
              ? normalizeEvent({
                  ...event,
                  fundingSources: event.fundingSources.map((source) =>
                    source.id === sourceId
                      ? {
                          ...source,
                          amount: normalizeAmount(source.amount) + appendAmount,
                          appendEntries: [
                            {
                              id: `fa-${Date.now()}`,
                              amount: appendAmount,
                              createdAt: new Date().toISOString(),
                            },
                            ...(source.appendEntries || []),
                          ],
                        }
                      : source,
                  ),
                })
              : event,
          ),
        );
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(
        error,
        "Failed to append funding amount",
      );
      setOperationError(message);
      return { success: false, message };
    }
  };

  const addCategory = async (eventId, category) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const updated = await addCategoryApi(eventId, category);
        upsertEventInState(updated);
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
        );
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(error, "Failed to add category");
      setOperationError(message);
      return { success: false, message };
    }
  };

  const updateCategory = async (eventId, categoryId, payload) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const updated = await updateCategoryApi(eventId, categoryId, payload);
        upsertEventInState(updated);
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
        );
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(error, "Failed to update category");
      setOperationError(message);
      return { success: false, message };
    }
  };

  const addCategoryPaidEntry = async (eventId, categoryId, amount) => {
    try {
      setOperationError("");
      requireAdminAccess();
      if (dataSource === "api") {
        const updated = await addCategoryPaidEntryApi(
          eventId,
          categoryId,
          amount,
        );
        upsertEventInState(updated);
      } else {
        const paidAmount = normalizeAmount(amount);
        setEvents((previous) =>
          previous.map((event) =>
            event.id === eventId
              ? normalizeEvent({
                  ...event,
                  categories: event.categories.map((category) =>
                    category.id === categoryId
                      ? {
                          ...category,
                          paid: normalizeAmount(category.paid) + paidAmount,
                          paidEntries: [
                            {
                              id: `cp-${Date.now()}`,
                              amount: paidAmount,
                              action: "APPEND",
                              newPaid:
                                normalizeAmount(category.paid) + paidAmount,
                              createdAt: new Date().toISOString(),
                            },
                            ...(category.paidEntries || []),
                          ],
                        }
                      : category,
                  ),
                })
              : event,
          ),
        );
      }
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(error, "Failed to append paid amount");
      setOperationError(message);
      return { success: false, message };
    }
  };

  const loginUser = async ({ identifier, password }) => {
    try {
      setAuthError("");
      const data = await loginApi({ identifier, password });
      setStoredToken(data.token);
      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || "user",
      });
      return { success: true };
    } catch (error) {
      const message = parseErrorMessage(error, "Login failed");
      setAuthError(message);
      return { success: false, message };
    }
  };

  const logoutUser = () => {
    setStoredToken(null);
    setCurrentUser(initialUser);
    setAuthError("");
    setOperationError("");
  };

  const eventsWithMetrics = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        metrics: event.metrics || calculateEventMetrics(event),
      })),
    [events],
  );

  const dashboardMetrics = useMemo(
    () => getDashboardMetrics(eventsWithMetrics),
    [eventsWithMetrics],
  );
  const warnings = useMemo(
    () => buildWarnings(eventsWithMetrics),
    [eventsWithMetrics],
  );
  const monthlyTrend = useMemo(
    () => getMonthlyTrend(eventsWithMetrics),
    [eventsWithMetrics],
  );

  const value = {
    events: eventsWithMetrics,
    rawEvents: events,
    isLoading,
    authLoading,
    isAuthenticated,
    dataSource,
    backendConnected: dataSource === "api",
    currentUser,
    currentUserRole,
    canEdit,
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
      setAuthError("");
      setOperationError("");
    },
    addEvent,
    updateEvent,
    addFundingSource,
    updateFundingSource,
    appendFundingSource,
    addCategory,
    updateCategory,
    addCategoryPaidEntry,
  };

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error("useBudget must be used within BudgetProvider");
  }
  return context;
}
