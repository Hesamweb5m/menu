const TOKEN_KEY = "menu.admin.jwt";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing modes can throw on access rather than returning null.
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Not fatal: the session just won't survive a refresh.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do.
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

/** Path to the login page, honouring the Vite base path used on GitHub Pages. */
export function loginPath() {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/admin`;
}
