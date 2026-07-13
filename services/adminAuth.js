// Real admin authentication against POST /api/admin/login, replacing the
// old AdminGate that only checked a password against a value baked into
// the client bundle (ADMIN_PASSWORD is visible to anyone who opens
// devtools) and never actually verified anything with the backend.
//
// The JWT this issues is what makes requireAdminRole on the server work -
// every admin fetch must carry it as `Authorization: Bearer <token>`.

const TOKEN_KEY = 'taigour_admin_token';
const TOKEN_EXPIRY_KEY = 'taigour_admin_token_expiry';

export function getAdminToken() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    clearAdminSession();
    return null;
  }
  return token;
}

export function isAdminAuthenticated() {
  return Boolean(getAdminToken());
}

export function clearAdminSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export async function adminLogin(username, password) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || result.error || 'Invalid credentials');
  }
  sessionStorage.setItem(TOKEN_KEY, result.token);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + (result.expiresIn || 8 * 60 * 60) * 1000));
  return result;
}

export function adminLogout() {
  clearAdminSession();
}

/**
 * fetch() wrapper that attaches the admin JWT automatically. Use this for
 * every request to an /api/admin/* route. On 401 it clears the session so
 * the AdminGate re-prompts for login.
 */
export async function adminFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAdminSession();
    window.dispatchEvent(new Event('admin-session-expired'));
  }
  return response;
}
