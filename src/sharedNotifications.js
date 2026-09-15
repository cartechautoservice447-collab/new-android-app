import { Capacitor } from '@capacitor/core';
import { supabase } from './lib/supabase.js';

const WEB_PUSH_PUBLIC_KEY = 'BIPdLNtmyxIQ_hB7b1wjTnPJxh8mrrvYtpbuvj1Zm_efLvActyompli_L_PUHWmsGQb3QbCKblysFT4rvzALdx0';

// Custom event name dispatched on window whenever notification state changes.
// dashboard-enhancer.js (plain IIFE, no module imports) listens for this event
// to update the badge dot and notification overlay content.
const BADGE_EVENT = 'mobile-glass-notifications-update';

// Window global used as a bridge for plain-JS scripts that cannot import ES
// modules.  Always read via window.__mobileGlassNotificationData; never
// localStorage.
if (typeof window !== 'undefined') {
  window.__mobileGlassNotificationData = { notifications: [], unread: 0 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function getRegistration() {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    const registration = existing ?? await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    // Guard: only await navigator.serviceWorker.ready if registration resolved
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    // Registration failed (sw.js unreachable, HTTPS required, etc.) — fail
    // gracefully so the rest of the app is unaffected.
    return null;
  }
}

// ─── Web Push subscription ────────────────────────────────────────────────────

export async function registerSharedPushSubscription(userId) {
  if (!supabase || !userId) return null;
  const registration = await getRegistration();
  if (!registration) return null;

  try {
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission !== 'granted') return null;

    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const currentKeyBuf = urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY);
      const subKey = subscription.options?.applicationServerKey ? new Uint8Array(subscription.options.applicationServerKey) : null;
      const matches = subKey && subKey.length === currentKeyBuf.length && subKey.every((byte, i) => byte === currentKeyBuf[i]);
      if (!matches) {
        try { await subscription.unsubscribe(); } catch {}
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
      });
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return null;

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh, auth },
      { onConflict: 'endpoint' },
    );
    if (error) throw error;
    return endpoint;
  } catch {
    return null;
  }
}

// ─── Notification data layer ──────────────────────────────────────────────────

/**
 * Fetch the authenticated user's notifications from Supabase, newest first.
 * Returns an empty array on any error so callers never need to guard for null.
 */
export async function fetchNotifications(userId, { limit = 50, unreadOnly = false } = {}) {
  if (!supabase || !userId || userId === 'anonymous') return [];
  try {
    let query = supabase
      .from('notifications')
      .select('id, title, body, type, source, read, metadata, action_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('read', false);

    const { data, error } = await query;
    if (error) {
      // Table may not exist yet in a local dev environment — warn but don't
      // throw so startup is unaffected.
      console.warn('Notifications: fetch failed:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Mark specific notification IDs as read for a user.
 * Fire-and-forget safe: errors are swallowed; the badge will self-correct on
 * the next Realtime event or page load.
 */
export async function markNotificationsRead(userId, ids) {
  if (!supabase || !userId || userId === 'anonymous' || !ids?.length) return;
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .in('id', ids);
  } catch {
    // Silent — badge self-corrects on next fetch
  }
}

/**
 * Mark ALL unread notifications as read for a user.
 */
export async function markAllNotificationsRead(userId) {
  if (!supabase || !userId || userId === 'anonymous') return;
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  } catch {}
}

// ─── Badge broadcast ──────────────────────────────────────────────────────────

/**
 * Update the window global and dispatch the badge event so the existing
 * dashboard-enhancer.js bell button can reflect the live unread count without
 * needing ES-module imports.
 */
function broadcastBadgeUpdate(notifications) {
  if (typeof window === 'undefined') return;
  const unread = Array.isArray(notifications) ? notifications.filter((n) => !n.read).length : 0;
  window.__mobileGlassNotificationData = { notifications: notifications || [], unread };
  window.dispatchEvent(
    new CustomEvent(BADGE_EVENT, {
      detail: { unread, notifications: notifications || [] },
      bubbles: false,
    }),
  );
}

// ─── Realtime subscription ────────────────────────────────────────────────────

/**
 * Subscribe to Supabase Realtime for INSERT and UPDATE events on the
 * notifications table scoped to this user.  Calls onUpdate(notifications[])
 * with a freshly-fetched array whenever the table changes.
 *
 * Returns an unsubscribe function.
 */
function subscribeToNotifications(userId, onUpdate) {
  if (!supabase || !userId || userId === 'anonymous') return () => {};

  const channelName = `notifications-${userId}`;

  // Remove any stale channel with the same name before creating a new one
  const staleChannels = supabase.getChannels?.() || [];
  const stale = staleChannels.find((ch) => ch.topic === `realtime:${channelName}`);
  if (stale) supabase.removeChannel(stale);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        // Re-fetch the full list so unread count and ordering are always accurate
        void fetchNotifications(userId).then(onUpdate);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void fetchNotifications(userId).then(onUpdate);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Main lifecycle ───────────────────────────────────────────────────────────

export function configureSharedNotifications() {
  if (!supabase) return () => {};

  let disposed = false;
  let currentUserId = null;
  let unsubscribeRealtime = () => {};

  // Wire up Web Push subscription (existing behaviour — unchanged)
  const registerForSession = (session) => {
    if (disposed || !session?.user?.id) return;
    void registerSharedPushSubscription(session.user.id);
  };

  // Wire up notification data layer for a signed-in user
  const startNotificationSession = (userId) => {
    if (disposed || !userId || userId === 'anonymous') return;
    // Guard against double-setup on the same user (getSession + INITIAL_SESSION
    // can both fire for the same userId on first load)
    if (userId === currentUserId) return;
    currentUserId = userId;

    // Tear down any existing Realtime subscription for a previous user
    unsubscribeRealtime();

    // Initial fetch — populate badge before any Realtime events arrive
    void fetchNotifications(userId).then((notifications) => {
      if (!disposed) broadcastBadgeUpdate(notifications);
    });

    // Subscribe to live changes
    unsubscribeRealtime = subscribeToNotifications(userId, (notifications) => {
      if (!disposed) broadcastBadgeUpdate(notifications);
    });
  };

  // Handle session changes (sign-in, sign-out, token refresh)
  const handleSession = (session) => {
    registerForSession(session);
    const userId = session?.user?.id ? String(session.user.id) : null;
    if (userId) {
      startNotificationSession(userId);
    } else {
      // Signed out — clear badge and tear down Realtime
      currentUserId = null;
      unsubscribeRealtime();
      unsubscribeRealtime = () => {};
      broadcastBadgeUpdate([]);
    }
  };

  // Listen for "mark all read" requests dispatched from dashboard-enhancer.js
  const handleMarkAllRead = () => {
    if (!currentUserId) return;
    void markAllNotificationsRead(currentUserId).then(() => {
      void fetchNotifications(currentUserId).then((notifications) => {
        if (!disposed) broadcastBadgeUpdate(notifications);
      });
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('mobile-glass-mark-all-read', handleMarkAllRead, { passive: true });
  }

  // Bootstrap from the current session
  void supabase.auth.getSession().then(({ data }) => {
    if (!disposed) handleSession(data.session);
  });

  // Keep in sync with future auth state changes
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!disposed) handleSession(session);
  });

  // Return a disposal function for HMR / component unmount
  return () => {
    disposed = true;
    unsubscribeRealtime();
    listener.subscription.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('mobile-glass-mark-all-read', handleMarkAllRead);
    }
  };
}
