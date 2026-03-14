export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem("vigen-session");
  return raw ? JSON.parse(raw) : null;
}

export function setStoredSession(session) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("vigen-session", JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("vigen-session");
}

export function getAccessToken() {
  return getStoredSession()?.access_token ?? null;
}

