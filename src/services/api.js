import axios from "axios";
import { clearToken, getToken, loginPath } from "./auth";

/**
 * Origin of the backend API.
 *
 * Set VITE_API_URL at build time to point at a deployed backend, e.g.
 *   VITE_API_URL=https://menu-backend.onrender.com
 * It falls back to the local dev server, which is where `npm run dev` in
 * ../server listens.
 */
export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:1337"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

/**
 * Turns a relative upload path from the API (`/uploads/latte_a1b2.png`) into a
 * URL the browser can load. Absolute URLs are passed through untouched, so
 * switching the backend to an external file host later needs no code change.
 */
export function mediaUrl(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;

  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or revoked token should drop the admin back to the login page
    // rather than leaving the panel silently failing every request.
    if (error.response?.status === 401 && getToken()) {
      clearToken();

      if (window.location.pathname !== loginPath()) {
        window.location.assign(loginPath());
      }
    }

    return Promise.reject(error);
  }
);

export default api;
