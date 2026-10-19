import { auth } from "./nuve-auth.js";

export function apiUrl(path) {
  const base = String(window.NUVE_RUNTIME_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(path, options = {}, { authenticated = true } = {}) {
  const headers = new Headers(options.headers || {});
  if (authenticated) {
    if (!auth?.currentUser) throw new Error("Entre com uma conta administrativa para continuar.");
    headers.set("Authorization", `Bearer ${await auth.currentUser.getIdToken()}`);
  }
  const response = await fetch(apiUrl(path), { ...options, headers });
  const type = response.headers.get("content-type") || "";
  const result = type.includes("application/json") ? await response.json() : await response.arrayBuffer();
  if (!response.ok) {
    const error = new Error(result?.message || "Não foi possível concluir a solicitação.");
    error.status = response.status;
    error.code = result?.error;
    throw error;
  }
  return result;
}
