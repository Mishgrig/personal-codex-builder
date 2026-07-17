import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  GitBranch,
  Link2,
  ListChecks,
  Map as MapIcon,
  MousePointer2,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  CardListItem,
  PlotEvent,
  PlotEventCreatePayload,
  PlotEventUpdatePayload,
} from "../../types/models";

interface PlotsPaneProps {
  events: PlotEvent[];
  cards: CardListItem[];
  onCreateEvent: (payload: PlotEventCreatePayload) => Promise<PlotEvent>;
  onUpdateEvent: (eventId: number, payload: PlotEventUpdatePayload) => Promise<PlotEvent>;
  onDeleteEvent: (eventId: number) => Promise<void>;
  onAddCardLink: (eventId: number, payload: { card_id: number; role: string }) => Promise<PlotEvent>;
  onDeleteCardLink: (linkId: number) => Promise<PlotEvent>;
  onAddEventLink: (
    eventId: number,
    payload: { target_event_id: number; relation_type: string; note: string },
  ) => Promise<PlotEvent>;
  onDeleteEventLink: (linkId: number) => Promise<PlotEvent>;
  onUpdateLayout: (
    eventId: number,
    payload: { view_id: string; x: number; y: number; width: number; height: number },
  ) => Promise<PlotEvent>;
  onOpenCard: (cardId: number) => void;
}

type PlotMode = "list" | "canvas" | "calendar";
type LayoutDraft = { x: number; y: number; width: number; height: number };
type DragState = { eventId: number; offsetX: number; offsetY: number };

const CANVAS_VIEW_ID = "main";
const DEFAULT_EVENT_COLOR = "#4ba8d6";
const DEFAULT_LAYOUT = { x: 96, y: 96, width: 240, height: 128 };

export function PlotsPane({
  events,
  cards,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onAddCardLink,
  onDeleteCardLink,
  onAddEventLink,
  onDeleteEventLink,
  onUpdateLayout,
  onOpenCard,
}: PlotsPaneProps) {
  const [mode, setMode] = useState<PlotMode>("canvas");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(events[0]?.id ?? null);
  const [draft, setDraft] = useState(eventDraft(events[0] ?? null));
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [cardLinkDraft, setCardLinkDraft] = useState({ cardId: "", role: "involved" });
  const [eventLinkDraft, setEventLinkDraft] = useState({ targetId: "", relationType: "leads-to", note: "" });
  const [layoutDrafts, setLayoutDrafts] = useState<Record<number, LayoutDraft>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<number[]>(events[0] ? [events[0].id] : []);
  const [zoom, setZoom] = useState(1);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesStatus = !statusFilter || event.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        event.title.toLowerCase().includes(normalizedQuery) ||
        event.description.toLowerCase().includes(normalizedQuery) ||
        event.card_links.some((link) => link.card_title.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [events, query, statusFilter]);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null;
  const selectableCards = cards.filter(
    (card) => !selectedEvent?.card_links.some((link) => link.card_id === card.id),
  );
  const selectableTargetEvents = events.filter(
    (event) =>
      selectedEvent &&
      event.id !== selectedEvent.id &&
      !selectedEvent.event_links.some((link) => link.target_event_id === event.id),
  );
  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  useEffect(() => {
    setLayoutDrafts(
      Object.fromEntries(
        events.map((event, index) => [
          event.id,
          event.layout
            ? {
                x: event.layout.x,
                y: event.layout.y,
                width: event.layout.width,
                height: event.layout.height,
              }
            : {
                ...DEFAULT_LAYOUT,
                x: DEFAULT_LAYOUT.x + (index % 3) * 280,
                y: DEFAULT_LAYOUT.y + Math.floor(index / 3) * 180,
              },
        ]),
      ),
    );
  }, [events]);

  useEffect(() => {
    if (!selectedEvent && filteredEvents[0]) {
      setSelectedEventId(filteredEvents[0].id);
      setSelectedEventIds([filteredEvents[0].id]);
      return;
    }
    setDraft(eventDraft(selectedEvent));
  }, [filteredEvents, selectedEvent]);

  function selectEvent(eventId: number, additive = false) {
    setSelectedEventId(eventId);
    setSelectedEventIds((current) => {
      if (!additive) {
        return [eventId];
      }
      return current.includes(eventId)
        ? current.filter((selectedId) => selectedId !== eventId)
        : [...current, eventId];
    });
  }

  async function createEvent() {
    const title = newEventTitle.trim() || "Untitled event";
    const created = await onCreateEvent({
      title,
      event_date: newEventDate || null,
      color: DEFAULT_EVENT_COLOR,
      status: "planned",
    });
    setNewEventTitle("");
    setNewEventDate("");
    setSelectedEventId(created.id);
  }

  async function createEventAt(x: number, y: number) {
    const created = await onCreateEvent({
      title: "Untitled event",
      color: DEFAULT_EVENT_COLOR,
      status: "planned",
    });
    await onUpdateLayout(created.id, { view_id: CANVAS_VIEW_ID, x, y, width: DEFAULT_LAYOUT.width, height: DEFAULT_LAYOUT.height });
    setSelectedEventId(created.id);
  }

  async function duplicateSelectedEvents() {
    const selectedEvents = selectedEventIds
      .map((eventId) => events.find((event) => event.id === eventId))
      .filter((event): event is PlotEvent => Boolean(event));
    if (!selectedEvents.length) {
      return;
    }
    const duplicatedIds: number[] = [];
    for (const event of selectedEvents) {
      const created = await onCreateEvent({
        title: `${event.title} copy`,
        description: event.description,
        color: event.color,
        status: event.status,
        event_date: event.event_date,
        card_ids: event.card_links.map((link) => link.card_id),
      });
      const layout = layoutDrafts[event.id] ?? DEFAULT_LAYOUT;
      await onUpdateLayout(created.id, {
        view_id: CANVAS_VIEW_ID,
        x: layout.x + 36,
        y: layout.y + 36,
        width: layout.width,
        height: layout.height,
      });
      duplicatedIds.push(created.id);
    }
    setSelectedEventId(duplicatedIds[0] ?? null);
    setSelectedEventIds(duplicatedIds);
  }

  async function deleteSelectedEvents() {
    const ids = selectedEventIds.length ? selectedEventIds : selectedEvent ? [selectedEvent.id] : [];
    if (!ids.length) {
      return;
    }
    const confirmed = window.confirm(`Delete ${ids.length} selected plot event${ids.length === 1 ? "" : "s"}?`);
    if (!confirmed) {
      return;
    }
    for (const eventId of ids) {
      await onDeleteEvent(eventId);
    }
    setSelectedEventId(null);
    setSelectedEventIds([]);
  }

  async function saveSelectedEvent() {
    if (!selectedEvent) {
      return;
    }
    await onUpdateEvent(selectedEvent.id, draft);
  }

  async function deleteSelectedEvent() {
    if (!selectedEvent) {
      return;
    }
    const confirmed = window.confirm(`Delete plot event "${selectedEvent.title}"?`);
    if (!confirmed) {
      return;
    }
    await onDeleteEvent(selectedEvent.id);
    setSelectedEventId(null);
  }

  async function addCardLink() {
    if (!selectedEvent || !cardLinkDraft.cardId) {
      return;
    }
    await onAddCardLink(selectedEvent.id, {
      card_id: Number(cardLinkDraft.cardId),
      role: cardLinkDraft.role.trim() || "involved",
    });
    setCardLinkDraft({ cardId: "", role: "involved" });
  }

  async function addEventLink() {
    if (!selectedEvent || !eventLinkDraft.targetId) {
      return;
    }
    await onAddEventLink(selectedEvent.id, {
      target_event_id: Number(eventLinkDraft.targetId),
      relation_type: eventLinkDraft.relationType.trim() || "leads-to",
      note: eventLinkDraft.note.trim(),
    });
    setEventLinkDraft({ targetId: "", relationType: "leads-to", note: "" });
  }

  function canvasCoordinates(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round((event.clientX - rect.left) / zoom),
      y: Math.round((event.clientY - rect.top) / zoom),
    };
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, plotEvent: PlotEvent) {
    const layout = layoutDrafts[plotEvent.id] ?? DEFAULT_LAYOUT;
    selectEvent(plotEvent.id, event.shiftKey || event.metaKey || event.ctrlKey);
    const point = pointerToBoard(event, zoom);
    setDragState({
      eventId: plotEvent.id,
      offsetX: point.x - layout.x,
      offsetY: point.y - layout.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState) {
      return;
    }
    setLayoutDrafts((current) => {
      const layout = current[dragState.eventId] ?? DEFAULT_LAYOUT;
      return {
        ...current,
        [dragState.eventId]: {
          ...layout,
          x: Math.max(24, Math.round(pointerToBoard(event, zoom).x - dragState.offsetX)),
          y: Math.max(24, Math.round(pointerToBoard(event, zoom).y - dragState.offsetY)),
        },
      };
    });
  }

  async function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState) {
      return;
    }
    const eventId = dragState.eventId;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragState(null);
    const layout = layoutDrafts[eventId] ?? DEFAULT_LAYOUT;
    await onUpdateLayout(eventId, { view_id: CANVAS_VIEW_ID, ...layout });
  }

  return (
    <section className="plots-pane">
      <div className="plots-header">
        <div>
          <span className="eyebrow">Plots / Chronology</span>
          <h1>Story events and causality map</h1>
          <p>
            Build story beats, connect them to Wiki cards, Characters and Locations, then arrange the chain visually.
          </p>
        </div>
        <div className="segmented-control">
          <button className={mode === "canvas" ? "active" : ""} onClick={() => setMode("canvas")}>
            <MapIcon size={14} />
            Canvas
          </button>
          <button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}>
            <ListChecks size={14} />
            List
          </button>
          <button className={mode === "calendar" ? "active" : ""} onClick={() => setMode("calendar")}>
            <CalendarDays size={14} />
            Calendar
          </button>
        </div>
      </div>

      <div className="plots-toolbar">
        <input
          className="themed-input"
          value={query}
          placeholder="Search events, descriptions or linked cards..."
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="themed-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          <option value="planned">planned</option>
          <option value="draft">draft</option>
          <option value="canon">canon</option>
          <option value="archived">archived</option>
        </select>
        <input
          className="themed-input"
          value={newEventTitle}
          placeholder="New event title..."
          onChange={(event) => setNewEventTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void createEvent();
          }}
        />
        <input
          className="themed-input compact-date"
          type="date"
          value={newEventDate}
          onChange={(event) => setNewEventDate(event.target.value)}
        />
        <button className="primary-button" onClick={() => void createEvent()}>
          <Plus size={14} />
          New event
        </button>
        <button className="secondary-button" disabled={!selectedEventIds.length} onClick={() => void duplicateSelectedEvents()}>
          Duplicate selected
        </button>
        <button className="secondary-button" disabled={!selectedEventIds.length} onClick={() => void deleteSelectedEvents()}>
          Delete selected
        </button>
        <div className="segmented-control compact-segmented">
          <button onClick={() => setZoom((current) => Math.max(0.65, Number((current - 0.1).toFixed(2))))}>-</button>
          <button onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((current) => Math.min(1.65, Number((current + 0.1).toFixed(2))))}>+</button>
        </div>
      </div>

      <div className={`plots-workspace ${mode}`}>
        <aside className="plots-event-list">
          {filteredEvents.length ? (
            filteredEvents.map((event) => (
              <button
                key={event.id}
                className={`plot-event-row ${selectedEventIds.includes(event.id) ? "active" : ""}`}
                onClick={(clickEvent) => selectEvent(event.id, clickEvent.shiftKey || clickEvent.metaKey || clickEvent.ctrlKey)}
              >
                <span className="plot-color-dot" style={{ background: event.color }} />
                <span>
                  <strong>{event.title}</strong>
                  <small>{event.event_date || "undated"} · {event.status} · {event.card_links.length} cards</small>
                </span>
              </button>
            ))
          ) : (
            <div className="empty-block">No plot events yet. Create one from the toolbar or double-click the canvas.</div>
          )}
        </aside>

        <main
          className="plots-stage"
        >
          {mode === "canvas" ? (
            <div
              className="plot-canvas-surface"
              onDoubleClick={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }
                const point = canvasCoordinates(event);
                void createEventAt(point.x, point.y);
              }}
            >
              <div
                className="plot-canvas-board"
                style={{ transform: `scale(${zoom})` }}
                onDoubleClick={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }
                  const point = canvasCoordinates(event);
                  void createEventAt(point.x, point.y);
                }}
              >
                <svg className="plot-canvas-links" aria-hidden="true">
                  {events.flatMap((event) =>
                    event.event_links.map((link) => {
                      const source = layoutDrafts[event.id];
                      const target = layoutDrafts[link.target_event_id];
                      if (!source || !target) {
                        return null;
                      }
                      return (
                        <line
                          key={`${event.id}-${link.id}`}
                          x1={source.x + source.width / 2}
                          y1={source.y + source.height / 2}
                          x2={target.x + target.width / 2}
                          y2={target.y + target.height / 2}
                        />
                      );
                    }),
                  )}
                </svg>
                {filteredEvents.map((event) => {
                  const layout = layoutDrafts[event.id] ?? DEFAULT_LAYOUT;
                  return (
                    <button
                      key={event.id}
                      className={`plot-canvas-card ${selectedEventIds.includes(event.id) ? "active" : ""}`}
                      style={{
                        left: layout.x,
                        top: layout.y,
                        width: layout.width,
                        minHeight: layout.height,
                        borderColor: event.color,
                      }}
                      onPointerDown={(pointerEvent) => startDrag(pointerEvent, event)}
                      onPointerMove={moveDrag}
                      onPointerUp={(pointerEvent) => void endDrag(pointerEvent)}
                      onPointerCancel={(pointerEvent) => void endDrag(pointerEvent)}
                      onDoubleClick={(pointerEvent) => pointerEvent.stopPropagation()}
                    >
                      <span className="plot-card-kicker"><CalendarDays size={12} /> {event.event_date || "undated"}</span>
                      <strong>{event.title}</strong>
                      <small>{event.description || "No description yet."}</small>
                      <span className="plot-card-footer">
                        <GitBranch size={12} />
                        {event.event_links.length} links · {event.card_links.length} cards
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="plot-canvas-hint">
                <MousePointer2 size={14} />
                Drag to arrange. Scroll to pan. Shift-click selects several events.
              </div>
            </div>
          ) : mode === "calendar" ? (
            <div className="plot-calendar">
              <header className="plot-calendar-header">
                <button className="secondary-button small" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}>Previous</button>
                <strong>{formatCalendarMonth(calendarMonth)}</strong>
                <button className="secondary-button small" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>Next</button>
              </header>
              <div className="plot-calendar-weekdays">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="plot-calendar-grid">
                {calendarDays.map((day) => {
                  const dayEvents = filteredEvents.filter((event) => event.event_date === day.iso);
                  return (
                    <div className={`plot-calendar-day ${day.inMonth ? "" : "muted"}`} key={day.iso}>
                      <span>{day.label}</span>
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          className={`plot-calendar-event ${selectedEventIds.includes(event.id) ? "active" : ""}`}
                          style={{ borderColor: event.color }}
                          onClick={(clickEvent) => selectEvent(event.id, clickEvent.shiftKey || clickEvent.metaKey || clickEvent.ctrlKey)}
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="plots-list-table">
              {filteredEvents.map((event) => (
                <article key={event.id} className="plot-list-card">
                  <header>
                    <span className="plot-color-dot" style={{ background: event.color }} />
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.description || "No description yet."}</p>
                    </div>
                    <small>{event.event_date || "undated"}</small>
                  </header>
                  <footer>
                    <span>{event.status}</span>
                    <span>{event.card_links.map((link) => link.card_title).join(", ") || "No linked cards"}</span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </main>

        <aside className="plots-detail-panel">
          {selectedEvent ? (
            <>
              <div className="section-header">
                <div>
                  <h2>{selectedEvent.title}</h2>
                  <p className="helper-text">Edit the event, connect cards and define causal links.</p>
                </div>
                <button className="mini-icon-button" title="Delete event" onClick={() => void deleteSelectedEvent()}>
                  <Trash2 size={14} />
                </button>
              </div>

              <label className="field-stack">
                <span>Title</span>
                <input className="themed-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label className="field-stack">
                <span>Description</span>
                <textarea className="themed-textarea compact" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
              <div className="detail-grid two">
                <label className="field-stack">
                  <span>Date</span>
                  <input className="themed-input" type="date" value={draft.event_date ?? ""} onChange={(event) => setDraft({ ...draft, event_date: event.target.value || null })} />
                </label>
                <label className="field-stack">
                  <span>Status</span>
                  <select className="themed-select" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                    <option value="planned">planned</option>
                    <option value="draft">draft</option>
                    <option value="canon">canon</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
              </div>
              <label className="field-stack">
                <span>Color</span>
                <input className="themed-input color-input" type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
              </label>
              <button className="primary-button full-width" onClick={() => void saveSelectedEvent()}>
                Save event
              </button>

              <div className="plot-detail-section">
                <h3><Link2 size={14} /> Linked cards</h3>
                <div className="dashboard-inline-form">
                  <select className="themed-select" value={cardLinkDraft.cardId} onChange={(event) => setCardLinkDraft({ ...cardLinkDraft, cardId: event.target.value })}>
                    <option value="">Choose card</option>
                    {selectableCards.map((card) => (
                      <option key={card.id} value={card.id}>{card.title}</option>
                    ))}
                  </select>
                  <input className="themed-input" value={cardLinkDraft.role} onChange={(event) => setCardLinkDraft({ ...cardLinkDraft, role: event.target.value })} />
                  <button className="secondary-button small" onClick={() => void addCardLink()}>Add</button>
                </div>
                <div className="plot-chip-list">
                  {selectedEvent.card_links.map((link) => (
                    <span className="plot-chip" key={link.id}>
                      <button onClick={() => onOpenCard(link.card_id)}>{link.card_title}</button>
                      <small>{link.role}</small>
                      <button className="mini-icon-button" title="Remove card link" onClick={() => void onDeleteCardLink(link.id)}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="plot-detail-section">
                <h3><GitBranch size={14} /> Event links</h3>
                <div className="plot-link-form">
                  <select className="themed-select" value={eventLinkDraft.targetId} onChange={(event) => setEventLinkDraft({ ...eventLinkDraft, targetId: event.target.value })}>
                    <option value="">Target event</option>
                    {selectableTargetEvents.map((event) => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                  <input className="themed-input" value={eventLinkDraft.relationType} onChange={(event) => setEventLinkDraft({ ...eventLinkDraft, relationType: event.target.value })} />
                  <input className="themed-input" value={eventLinkDraft.note} placeholder="Optional note" onChange={(event) => setEventLinkDraft({ ...eventLinkDraft, note: event.target.value })} />
                  <button className="secondary-button small" onClick={() => void addEventLink()}>Connect</button>
                </div>
                <div className="plot-linked-event-list">
                  {selectedEvent.event_links.map((link) => (
                    <div className="plot-linked-event" key={link.id}>
                      <span>{link.relation_type}</span>
                      <strong>{eventMap.get(link.target_event_id)?.title ?? link.target_title}</strong>
                      <small>{link.note}</small>
                      <button className="mini-icon-button" title="Remove event link" onClick={() => void onDeleteEventLink(link.id)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-block">Choose or create a plot event to edit chronology details.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function eventDraft(event: PlotEvent | null): PlotEventUpdatePayload {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    color: event?.color ?? DEFAULT_EVENT_COLOR,
    status: event?.status ?? "planned",
    event_date: event?.event_date ?? null,
    sort_order: event?.sort_order ?? 0,
  };
}

function pointerToBoard(event: React.PointerEvent<HTMLElement>, zoom: number) {
  const board = event.currentTarget.parentElement;
  const rect = board?.getBoundingClientRect();
  if (!rect) {
    return { x: event.clientX / zoom, y: event.clientY / zoom };
  }
  return {
    x: (event.clientX - rect.left) / zoom,
    y: (event.clientY - rect.top) / zoom,
  };
}

function buildCalendarDays(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      iso: toDateInputValue(date),
      label: String(date.getDate()),
      inMonth: date.getMonth() === month - 1,
    };
  });
}

function shiftMonth(monthValue: string, delta: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return date.toISOString().slice(0, 7);
}

function formatCalendarMonth(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
