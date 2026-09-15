import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase, MOBILE_NATIVE_AUTH_REDIRECT } from './lib/supabase.js';

export const NATIVE_AUTH_REDIRECT = MOBILE_NATIVE_AUTH_REDIRECT;
export const AUTH_ERROR_KEY = 'mobile-liquid-glass-auth-error';
export const AUTH_ERROR_EVENT = 'liquid-glass-auth-error';
const SKIP_AUTH_KEY = 'mobile-liquid-glass-skip-auth';
const handledCodes = new Set();
let bridgeConfigured = false;

function renderAuthError(message) {
  const text = String(message || '').trim();
  if (!text || typeof document === 'undefined') return;

  const render = () => {
    const card = document.querySelector('.auth-card');
    if (!card) return false;
    let node = card.querySelector('[data-native-auth-error]');
    if (!node) {
      node = document.createElement('p');
      node.className = 'message';
      node.setAttribute('data-native-auth-error', 'true');
      card.appendChild(node);
    }
    node.textContent = text;
    return true;
  };

  if (!render()) {
    requestAnimationFrame(() => {
      if (!render()) setTimeout(render, 50);
    });
  }
}

function clearRenderedAuthError() {
  if (typeof document === 'undefined') return;
  document.querySelector('[data-native-auth-error]')?.remove();
}

function publishAuthError(message) {
  const text = String(message || 'Unable to complete sign-in. Please try again.');
  try {
    localStorage.setItem(AUTH_ERROR_KEY, text);
  } catch {
    // Continue to the in-memory event and visible login error.
  }
  renderAuthError(text);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { detail: { message: text } }));
  }
}

export function readNativeAuthError() {
  try {
    return localStorage.getItem(AUTH_ERROR_KEY) || '';
  } catch {
    return '';
  }
}

export function clearNativeAuthError() {
  try {
    localStorage.removeItem(AUTH_ERROR_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
  clearRenderedAuthError();
}

function isNativeAuthUrl(url) {
  return typeof url === 'string' && url.startsWith(NATIVE_AUTH_REDIRECT);
}

async function handleAuthUrl(url) {
  if (!isNativeAuthUrl(url) || !supabase) return;

  let callbackUrl;
  try {
    callbackUrl = new URL(url);
  } catch {
    publishAuthError('The sign-in callback URL was invalid. Please try again.');
    return;
  }

  const code = callbackUrl.searchParams.get('code');
  const errorDescription = callbackUrl.searchParams.get('error_description');
  const errorCode = callbackUrl.searchParams.get('error');

  if (errorDescription || errorCode) {
    publishAuthError(errorDescription || errorCode || 'Google sign-in failed.');
    return;
  }

  if (!code) {
    publishAuthError('The sign-in callback did not include an authorization code. Please try again.');
    return;
  }

  if (handledCodes.has(code)) return;

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      publishAuthError(error.message);
      return;
    }

    handledCodes.add(code);
    clearNativeAuthError();
    localStorage.removeItem(SKIP_AUTH_KEY);
  } catch (error) {
    publishAuthError(error instanceof Error ? error.message : 'Unable to complete sign-in. Please try again.');
  }
}

export async function configureNativeAuth() {
  if (!Capacitor.isNativePlatform() || !supabase || bridgeConfigured) return undefined;
  bridgeConfigured = true;

  const originalSignInWithOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = async (options = {}) => {
    const result = await originalSignInWithOAuth({
      ...options,
      options: {
        ...(options.options || {}),
        redirectTo: NATIVE_AUTH_REDIRECT,
      },
    });
    if (result?.error) publishAuthError(result.error.message);
    return result;
  };

  let active = true;
  const listener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (active) void handleAuthUrl(url);
  });

  try {
    const launch = await CapacitorApp.getLaunchUrl();
    if (active && launch?.url) void handleAuthUrl(launch.url);
  } catch (error) {
    publishAuthError(error instanceof Error ? error.message : 'Unable to read the Android sign-in callback.');
  }

  return () => {
    active = false;
    bridgeConfigured = false;
    void listener.remove();
  };
}
