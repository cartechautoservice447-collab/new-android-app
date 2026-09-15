// api/planner-cron.js
// Vercel Cron Function. Planner clock values are interpreted in India Standard Time.
// The existing /api/send-notification.js remains the single Web Push sender.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INTERNAL_NOTIFICATIONS_SECRET = process.env.INTERNAL_NOTIFICATIONS_SECRET;

const TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 330;

async function supabaseRest(path, { method = 'GET', body } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'GET' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase REST ${method} ${path} → ${res.status}: ${text}`);
  }
  if (method === 'GET') return res.json();
  return null;
}

function istParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function istWeekday(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function localISTDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = (timeStr || '09:00:00').slice(0, 5).split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MINUTES * 60000);
}

function istDateTimeParts(date) {
  return istParts(date);
}

function isDue(item, now = new Date()) {
  if (!item.notifications_enabled) return false;

  if (item.last_notified_at) {
    const lastFired = new Date(item.last_notified_at);
    const minutesSinceLast = (now - lastFired) / 60000;
    if (minutesSinceLast < 1) return false;
  }

  const current = istParts(now);
  const itemTime = (item.notify_time || '').slice(0, 5);
  if (itemTime !== current.time) return false;

  const rec = item.recurrence;

  if (rec === 'daily') return true;

  if (rec === 'weekdays') {
    const weekdays = Array.isArray(item.weekdays) ? item.weekdays : [];
    return weekdays.includes(istWeekday(current.date));
  }

  if ((rec === 'specific' || rec === 'none') && item.specific_date) {
    const eventDate = localISTDateTime(item.specific_date, item.notify_time);
    const fireAt = new Date(eventDate.getTime() - (item.lead_time_minutes || 0) * 60000);
    const fire = istDateTimeParts(fireAt);
    return fire.date === current.date && fire.time === current.time;
  }

  return false;
}

function buildNotificationPayload(item) {
  const typeLabels = {
    reminder: '🔔 Reminder',
    exam: '📝 Exam',
    project: '📦 Project',
    deadline: '⏰ Deadline',
  };
  const prefix = typeLabels[item.type] || '🔔 Reminder';
  const leadNote = item.lead_time_minutes > 0
    ? ` (in ${Math.round(item.lead_time_minutes / 60)} hour${item.lead_time_minutes >= 120 ? 's' : ''})`
    : '';
  return {
    title: `${prefix}${leadNote}`,
    body: item.title,
    action_url: '/daily-planner',
    type: 'planner_reminder',
  };
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== INTERNAL_NOTIFICATIONS_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !INTERNAL_NOTIFICATIONS_SECRET) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  const now = new Date();
  const current = istParts(now);

  let items;
  try {
    items = await supabaseRest(
      'daily_planner_items?notifications_enabled=eq.true&select=id,user_id,title,type,recurrence,weekdays,specific_date,notify_time,lead_time_minutes,last_notified_at,timezone',
    );
  } catch (err) {
    console.error('[planner-cron] Failed to query daily_planner_items:', err.message);
    return res.status(502).json({ error: err.message });
  }

  const dueItems = (items || []).filter((item) => isDue(item, now));
  console.log(`[planner-cron] ${current.date} ${current.time} IST — ${dueItems.length} item(s) due out of ${(items || []).length}`);

  const results = [];
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://mobile-liquid-glass.vercel.app';

  for (const item of dueItems) {
    const notification = buildNotificationPayload(item);
    let delivered = 0;
    let failed = 0;

    try {
      const sendRes = await fetch(`${baseUrl}/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': INTERNAL_NOTIFICATIONS_SECRET,
        },
        body: JSON.stringify({ user_id: item.user_id, notification }),
      });
      const json = await sendRes.json().catch(() => ({}));
      delivered = json.delivered ?? 0;
      failed = json.failed ?? 0;
      console.log(`[planner-cron] item ${item.id} → send-notification ${sendRes.status}: delivered=${delivered} failed=${failed}`);
    } catch (err) {
      console.error(`[planner-cron] item ${item.id} → send-notification error:`, err.message);
      failed = 1;
    }

    try {
      await supabaseRest(
        `daily_planner_items?id=eq.${encodeURIComponent(item.id)}`,
        { method: 'PATCH', body: { last_notified_at: now.toISOString() } },
      );
    } catch (err) {
      console.warn(`[planner-cron] Could not update last_notified_at for item ${item.id}:`, err.message);
    }

    results.push({ id: item.id, user_id: item.user_id, delivered, failed });
  }

  return res.status(200).json({
    success: true,
    timezone: TIMEZONE,
    checked: (items || []).length,
    due: dueItems.length,
    results,
    timestamp: now.toISOString(),
  });
}
