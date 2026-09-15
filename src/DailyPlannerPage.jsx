import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Bell, BellOff, Calendar, Clock, Edit2, X } from 'lucide-react';
import { supabase } from './lib/supabase.js';
import './DailyPlannerPage.css';

const TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 330;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TYPES = [
  { value: 'reminder', label: '🔔 Reminder' },
  { value: 'exam', label: '📝 Exam' },
  { value: 'project', label: '📦 Project' },
  { value: 'deadline', label: '⏰ Deadline' },
];
const RECURRENCES = [
  { value: 'none', label: 'Once (specific date)' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Selected weekdays' },
  { value: 'specific', label: 'Specific date' },
];
const LEAD_OPTIONS = [
  { value: 0, label: 'At reminder time' },
  { value: 60, label: '1 hour before' },
  { value: 240, label: '4 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
];

const EMPTY_FORM = {
  title: '',
  type: 'reminder',
  recurrence: 'daily',
  weekdays: [1, 2, 3, 4, 5],
  specific_date: '',
  notify_time: '09:00',
  lead_time_minutes: 0,
  notifications_enabled: true,
  timezone: TIMEZONE,
};

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
}

function addDaysISO(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayWeekday() {
  const [year, month, day] = todayISO().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function localISTDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = (timeStr || '09:00:00').slice(0, 5).split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MINUTES * 60000);
}

function istDateISO(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);
}

function currentISTTime() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.slice(0, 5).split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 || 12;
  return `${display}:${m} ${ampm}`;
}

function recurrenceLabel(item) {
  if (item.recurrence === 'daily') return 'Every day';
  if (item.recurrence === 'weekdays') {
    const days = (item.weekdays || []).map((d) => DAYS[d]).join(', ');
    return days || 'Selected days';
  }
  if (item.recurrence === 'specific' || item.recurrence === 'none') {
    return item.specific_date || 'No date set';
  }
  return '';
}

function itemFireDateISO(item) {
  if (!item.specific_date) return null;
  const eventDate = localISTDateTime(item.specific_date, item.notify_time || '09:00:00');
  const fireAt = new Date(eventDate.getTime() - (item.lead_time_minutes || 0) * 60000);
  return istDateISO(fireAt);
}

function isItemToday(item) {
  const today = todayISO();
  if (item.recurrence === 'daily') return true;
  if (item.recurrence === 'weekdays') return (item.weekdays || []).includes(todayWeekday());
  if (item.recurrence === 'specific' || item.recurrence === 'none') {
    return itemFireDateISO(item) === today;
  }
  return false;
}

function isItemUpcoming(item) {
  const today = todayISO();
  const in7Days = addDaysISO(today, 7);
  if (item.recurrence === 'daily' || item.recurrence === 'weekdays') return true;
  if (item.recurrence === 'specific' || item.recurrence === 'none') {
    const fireDay = itemFireDateISO(item);
    return Boolean(fireDay && fireDay >= today && fireDay <= in7Days);
  }
  return false;
}

function typeIcon(type) {
  return { reminder: '🔔', exam: '📝', project: '📦', deadline: '⏰' }[type] || '🔔';
}

function ItemFormModal({ initial, onSave, onClose, busy }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initial || {}),
    timezone: TIMEZONE,
    notify_time: (initial?.notify_time || '09:00:00').slice(0, 5),
    weekdays: initial?.weekdays || EMPTY_FORM.weekdays,
  }));

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleDay = (d) => {
    const next = form.weekdays.includes(d)
      ? form.weekdays.filter((x) => x !== d)
      : [...form.weekdays, d].sort((a, b) => a - b);
    set('weekdays', next);
  };

  const needsDate = form.recurrence === 'none' || form.recurrence === 'specific';
  const showLeadTime = ['exam', 'project', 'deadline'].includes(form.type);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (needsDate && !form.specific_date) return;
    if (form.recurrence === 'weekdays' && !form.weekdays.length) return;
    onSave({
      ...form,
      timezone: TIMEZONE,
      title: form.title.trim(),
      notify_time: form.notify_time + ':00',
      weekdays: form.recurrence === 'weekdays' ? form.weekdays : null,
      specific_date: needsDate ? form.specific_date : null,
      lead_time_minutes: showLeadTime ? Number(form.lead_time_minutes) : 0,
    });
  };

  return (
    <div className="planner-modal-backdrop" onClick={onClose}>
      <section className="planner-modal glass-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="planner-modal-header">
          <h2>{initial ? 'Edit reminder' : 'New reminder'}</h2>
          <button className="planner-modal-close icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <form onSubmit={handleSubmit} className="planner-form">
          <label className="planner-field">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Study Mathematics"
              required
              autoFocus
            />
          </label>

          <label className="planner-field">
            <span>Type</span>
            <div className="planner-chip-row">
              {TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`planner-chip${form.type === value ? ' active' : ''}`}
                  onClick={() => set('type', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>

          <label className="planner-field">
            <span>Repeats</span>
            <select value={form.recurrence} onChange={(e) => set('recurrence', e.target.value)}>
              {RECURRENCES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {form.recurrence === 'weekdays' && (
            <div className="planner-field">
              <span>Days</span>
              <div className="planner-day-row">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`planner-day-chip${form.weekdays.includes(i) ? ' active' : ''}`}
                    onClick={() => toggleDay(i)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsDate && (
            <label className="planner-field">
              <span>Date</span>
              <input
                type="date"
                value={form.specific_date}
                min={todayISO()}
                onChange={(e) => set('specific_date', e.target.value)}
                required
              />
            </label>
          )}

          <label className="planner-field">
            <span>Time (IST)</span>
            <input
              type="time"
              value={form.notify_time}
              onChange={(e) => set('notify_time', e.target.value)}
              required
            />
            <small className="planner-timezone-help">India Standard Time · Asia/Kolkata</small>
          </label>

          {showLeadTime && (
            <label className="planner-field">
              <span>Remind me</span>
              <select
                value={form.lead_time_minutes}
                onChange={(e) => set('lead_time_minutes', Number(e.target.value))}
              >
                {LEAD_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          )}

          <div className="planner-field planner-toggle-row">
            <span>Push notification</span>
            <button
              type="button"
              className={`planner-toggle${form.notifications_enabled ? ' on' : ''}`}
              onClick={() => set('notifications_enabled', !form.notifications_enabled)}
              aria-label={form.notifications_enabled ? 'Disable notification' : 'Enable notification'}
            >
              {form.notifications_enabled ? <Bell size={14} /> : <BellOff size={14} />}
              <span>{form.notifications_enabled ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className="planner-form-actions">
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? 'Saving…' : initial ? 'Save changes' : 'Add reminder'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete, onToggleNotif }) {
  return (
    <article className="planner-item-card glass-card">
      <div className="planner-item-icon">{typeIcon(item.type)}</div>
      <div className="planner-item-body">
        <strong>{item.title}</strong>
        <span className="planner-item-meta">
          <Clock size={10} />
          {formatTime(item.notify_time)}
          {item.lead_time_minutes > 0 && ` · ${item.lead_time_minutes / 60 >= 1 ? `${item.lead_time_minutes / 60}h` : `${item.lead_time_minutes}m`} before`}
          <span className="planner-item-dot" />
          <Calendar size={10} />
          {recurrenceLabel(item)}
        </span>
      </div>
      <div className="planner-item-actions">
        <button
          className={`planner-notif-btn icon-button${item.notifications_enabled ? ' notif-on' : ' notif-off'}`}
          onClick={() => onToggleNotif(item)}
          title={item.notifications_enabled ? 'Disable notification' : 'Enable notification'}
        >
          {item.notifications_enabled ? <Bell size={14} /> : <BellOff size={14} />}
        </button>
        <button className="icon-button" onClick={() => onEdit(item)} title="Edit"><Edit2 size={14} /></button>
        <button className="icon-button planner-delete-btn" onClick={() => onDelete(item)} title="Delete"><Trash2 size={14} /></button>
      </div>
    </article>
  );
}

export default function DailyPlannerPage({ session, onBack }) {
  const userId = session?.user?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [view, setView] = useState('today');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!supabase || !userId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('daily_planner_items')
        .select('*')
        .eq('user_id', userId)
        .order('notify_time', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setMessage(`Could not load planner: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const handleSave = async (formData) => {
    if (!supabase || !userId) return;
    setBusy(true);
    setMessage('');
    try {
      if (editItem) {
        const { error } = await supabase
          .from('daily_planner_items')
          .update({ ...formData, timezone: TIMEZONE, updated_at: new Date().toISOString() })
          .eq('id', editItem.id)
          .eq('user_id', userId);
        if (error) throw error;
        setMessage('Reminder updated.');
      } else {
        const { error } = await supabase
          .from('daily_planner_items')
          .insert({ ...formData, timezone: TIMEZONE, user_id: userId });
        if (error) throw error;
        setMessage('Reminder added.');
      }
      await fetchItems();
      setShowForm(false);
      setEditItem(null);
    } catch (err) {
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('daily_planner_items')
        .delete()
        .eq('id', item.id)
        .eq('user_id', userId);
      if (error) throw error;
      setMessage('Reminder deleted.');
      await fetchItems();
    } catch (err) {
      setMessage(`Delete failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleNotif = async (item) => {
    try {
      const { error } = await supabase
        .from('daily_planner_items')
        .update({ notifications_enabled: !item.notifications_enabled })
        .eq('id', item.id)
        .eq('user_id', userId);
      if (error) throw error;
      await fetchItems();
    } catch (err) {
      setMessage(`Update failed: ${err.message}`);
    }
  };

  const openCreate = () => { setEditItem(null); setShowForm(true); };
  const openEdit = (item) => { setEditItem(item); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditItem(null); };
  const displayed = view === 'today' ? items.filter(isItemToday) : items.filter(isItemUpcoming);

  const examples = [
    { icon: '🔔', text: 'Every day 7 PM → Study Python' },
    { icon: '📅', text: 'Mon/Wed/Fri 6 PM → Mathematics' },
    { icon: '📝', text: 'Exam on Oct 15 — remind 1 day before' },
    { icon: '📦', text: 'Project deadline Dec 1 → 1 week lead' },
  ];

  return (
    <main className="screen feature-screen planner-screen">
      <section className="full-glass-panel planner-panel">
        <header className="feature-header centered-header planner-header">
          <button className="back-button" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button>
          <div className="header-title">
            <span className="eyebrow">Daily Planner</span>
            <h1>Reminders</h1>
          </div>
          <button className="icon-button planner-add-btn" onClick={openCreate} aria-label="Add reminder"><Plus size={20} /></button>
        </header>

        <div className="planner-view-tabs">
          <button className={`planner-tab${view === 'today' ? ' active' : ''}`} onClick={() => setView('today')}>Today</button>
          <button className={`planner-tab${view === 'upcoming' ? ' active' : ''}`} onClick={() => setView('upcoming')}>Upcoming</button>
        </div>

        <div className="planner-stats glass-card">
          <div className="planner-stat"><span>Total</span><strong>{items.length}</strong></div>
          <div className="planner-stat"><span>Today</span><strong>{items.filter(isItemToday).length}</strong></div>
          <div className="planner-stat"><span>Active</span><strong>{items.filter((i) => i.notifications_enabled).length}</strong></div>
        </div>

        <div className="planner-content">
          {loading ? (
            <div className="planner-loading">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="planner-empty glass-card">
              <div className="planner-empty-icon">📅</div>
              <h3>{view === 'today' ? 'Nothing scheduled today' : 'Nothing in the next 7 days'}</h3>
              <p>Add your first reminder using the <strong>+</strong> button above.</p>
              <div className="planner-examples">
                {examples.map((ex, i) => (
                  <div key={i} className="planner-example"><span>{ex.icon}</span><span>{ex.text}</span></div>
                ))}
              </div>
              <button className="primary-button planner-empty-cta" onClick={openCreate}><Plus size={16} /> Add reminder</button>
            </div>
          ) : (
            <div className="planner-list">
              {displayed.map((item) => (
                <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} onToggleNotif={handleToggleNotif} />
              ))}
            </div>
          )}
        </div>

        <p className="planner-utc-note">
          All times are in India Standard Time (IST). Current IST: {currentISTTime()}
        </p>

        {message && <p className="message planner-message">{message}</p>}
      </section>

      {showForm && (
        <ItemFormModal initial={editItem} onSave={handleSave} onClose={closeForm} busy={busy} />
      )}
    </main>
  );
}
