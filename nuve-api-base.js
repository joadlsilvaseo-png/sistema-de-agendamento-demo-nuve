// Arquivo separado para evitar ciclo de importação entre cliente API e autenticação.
export function apiUrl(path) {
  const base = String(window.NUVE_RUNTIME_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
