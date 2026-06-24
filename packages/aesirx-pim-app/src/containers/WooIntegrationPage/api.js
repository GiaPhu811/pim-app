/*
 * Thin fetch helpers for the WooCommerce integration page. Talks to the
 * express-backend Joomla-compat dispatcher at `/index.php?option=woo-integration`.
 * Mirrors the native-fetch + Bearer pattern used by ProfilePage (the new
 * express-backed pages don't go through the aesirx-lib axios instance).
 */
import { AUTHORIZATION_KEY, Storage, env } from 'aesirx-lib';

export const API_BASE =
  (typeof env !== 'undefined' && env.REACT_APP_ENDPOINT_URL) ||
  process.env.REACT_APP_ENDPOINT_URL ||
  'http://localhost:3001';

const authHeader = () => {
  const stored = Storage.getItem(AUTHORIZATION_KEY.AUTHORIZED_TOKEN_HEADER);
  if (stored) return stored;
  const token = Storage.getItem(AUTHORIZATION_KEY.ACCESS_TOKEN);
  return token ? `Bearer ${token}` : '';
};

const OPTION = 'woo-integration';

const buildUrl = (params = {}) => {
  const usp = new URLSearchParams({ option: OPTION, api: 'hal', ...params });
  return `${API_BASE}/index.php?${usp.toString()}`;
};

/** GET against the woo-integration option. `task` is optional. */
export const wooGet = async (task) => {
  const res = await fetch(buildUrl(task ? { task } : {}), {
    headers: { Authorization: authHeader() },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

/** POST/PUT against the woo-integration option. `task` is optional. */
export const wooSend = async (body, task, method = 'POST') => {
  const res = await fetch(buildUrl(task ? { task } : {}), {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

/** Fetch the PIM language registry (for the sync language dropdown). */
export const fetchLanguages = async () => {
  const usp = new URLSearchParams({ option: 'reditem-item_pim_language', api: 'hal' });
  const res = await fetch(`${API_BASE}/index.php?${usp.toString()}`, {
    headers: { Authorization: authHeader() },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  // List responses wrap items under _embedded.item.
  return data?._embedded?.item ?? [];
};
