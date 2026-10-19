import { auth, firebaseConfigured, onAuthStateChanged, signInWithEmailAndPassword } from "./nuve-auth.js";
import { apiUrl } from "./nuve-api-base.js";
import { isDemoMode } from "./nuve-mode.js";

const form = document.getElementById("login-form");
const status = document.getElementById("login-status");
const button = document.getElementById("login-button");

function destination() {
  const allowed = new Set(["central-personalizacao.html", "admin-clientes.html"]);
  const candidate = new URLSearchParams(location.search).get("next") || "central-personalizacao.html";
  return allowed.has(candidate.split("?")[0]) ? candidate : "central-personalizacao.html";
}

if (isDemoMode()) {
  status.textContent = "A demonstração não usa login. Volte à página principal e alterne para Admin na chave de visualização.";
  button.disabled = true;
} else if (!firebaseConfigured) {
  status.textContent = "O Firebase ainda precisa ser configurado nesta instalação. Consulte o README de implantação.";
  button.disabled = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return;
  button.disabled = true;
  status.textContent = "Verificando acesso…";
  try {
    const credential = await signInWithEmailAndPassword(auth, document.getElementById("email").value.trim(), document.getElementById("password").value);
    const response = await fetch(apiUrl("/api/admin/me"), { headers: { Authorization: `Bearer ${await credential.user.getIdToken()}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Esta conta não tem permissão administrativa ativa.");
    location.replace(destination());
  } catch (error) {
    status.textContent = error.code?.startsWith("auth/") ? "E-mail ou senha inválidos." : error.message;
    button.disabled = false;
  }
});
