(() => {
  'use strict';

  const AI_KEYS = new Set([
    'liquid-glass-ai-study-review-v4',
    'liquid-glass-learning-suite-v1',
  ]);
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  function findAuthUserId() {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
        const raw = originalGetItem.call(localStorage, key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.user?.id) return String(parsed.user.id);
        if (parsed?.access_token) {
          const parts = String(parsed.access_token).split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
            if (payload?.sub) return String(payload.sub);
          }
        }
      }
    } catch {
      // Anonymous scope is the safe fallback.
    }
    return 'anonymous';
  }

  const scopeKey = (key) => AI_KEYS.has(key) ? `${key}:${findAuthUserId()}` : key;

  Storage.prototype.getItem = function(key) {
    return originalGetItem.call(this, scopeKey(String(key)));
  };
  Storage.prototype.setItem = function(key, value) {
    return originalSetItem.call(this, scopeKey(String(key)), value);
  };
  Storage.prototype.removeItem = function(key) {
    return originalRemoveItem.call(this, scopeKey(String(key)));
  };

  let lastUserId = findAuthUserId();
  const checkAuthChange = () => {
    const nextUserId = findAuthUserId();
    if (nextUserId === lastUserId) return;
    lastUserId = nextUserId;
    window.location.reload();
  };
  setInterval(checkAuthChange, 1000);

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (new URL(url, window.location.href).pathname === '/api/study-review') {
        const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
        if (!headers.has('Authorization')) {
          const userId = findAuthUserId();
          if (userId !== 'anonymous') {
            for (let i = 0; i < localStorage.length; i += 1) {
              const key = localStorage.key(i);
              if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
              const raw = originalGetItem.call(localStorage, key);
              try {
                const parsed = raw ? JSON.parse(raw) : null;
                if (parsed?.access_token) {
                  headers.set('Authorization', `Bearer ${parsed.access_token}`);
                  break;
                }
              } catch {}
            }
          }
        }
        return originalFetch(input, { ...init, headers });
      }
    } catch {}
    return originalFetch(input, init);
  };
})();
