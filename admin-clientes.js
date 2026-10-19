import { apiFetch } from "./nuve-api.js";
import { auth, requireAdmin, signOut } from "./nuve-auth.js";

const list = document.getElementById("clients-list");
const count = document.getElementById("clients-count");
const empty = document.getElementById("empty-state");
const errorBox = document.getElementById("clients-error");
const search = document.getElementById("search-input");
const moreButton = document.getElementById("load-more");
const modal = document.getElementById("client-modal");
let cursor = null;
let hasMore = false;
let query = "";
let loading = false;
let debounce;
let queryVersion = 0;
let pendingReload = false;

function initials(value) {
  return String(value || "Cliente").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "CL";
}

function friendlyDate(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).replace(".", "");
}

function setError(message = "") {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function clientCard(client) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "client-card";
  const avatar = document.createElement("span");
  avatar.className = "client-avatar";
  avatar.textContent = initials(client.name);
  const content = document.createElement("span");
  content.className = "client-card-content";
  const name = document.createElement("strong");
  name.textContent = client.name;
  const phone = document.createElement("span");
  phone.textContent = client.phone || "Telefone não informado";
  const meta = document.createElement("span");
  meta.className = "client-card-meta";
  meta.textContent = client.email || `Cadastro: ${friendlyDate(client.createdAt)}`;
  content.append(name, phone, meta);
  const side = document.createElement("span");
  side.className = "client-card-side";
  const label = document.createElement("span");
  label.className = "client-tag";
  label.textContent = "Perfil";
  side.append(label);
  button.append(avatar, content, side);
  button.addEventListener("click", () => openProfile(client.id));
  return button;
}

async function loadClients({ reset = false } = {}) {
  if (loading) { pendingReload = reset || pendingReload; return; }
  const version = queryVersion;
  const requestedQuery = query;
  if (reset) {
    cursor = null;
    hasMore = false;
    list.replaceChildren();
  }
  loading = true;
  moreButton.disabled = true;
  setError();
  try {
    const params = new URLSearchParams({ limit: "20" });
    if (requestedQuery) params.set("q", requestedQuery);
    if (cursor) params.set("cursor", cursor);
    const result = await apiFetch(`/api/admin/clients?${params}`);
    if (version !== queryVersion) return;
    result.items.forEach((item) => list.append(clientCard(item)));
    cursor = result.nextCursor;
    hasMore = Boolean(result.hasMore);
    const rendered = list.children.length;
    count.textContent = query ? `${rendered} resultado${rendered === 1 ? "" : "s"}` : `${rendered} cliente${rendered === 1 ? "" : "s"} carregada${rendered === 1 ? "" : "s"}`;
    empty.hidden = rendered > 0;
    moreButton.hidden = !hasMore;
    if (result.scanLimitReached) setError("A busca foi paginada por segurança. Use Carregar mais para continuar.");
  } catch (error) {
    if (version === queryVersion) {
      setError(error.message || "Não foi possível carregar a lista de clientes.");
      if (reset) empty.hidden = true;
    }
  } finally {
    loading = false;
    moreButton.disabled = false;
    if (pendingReload) {
      pendingReload = false;
      loadClients({ reset: true });
    }
  }
}

async function openProfile(uid) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("modal-client-name").textContent = "Carregando perfil…";
  document.getElementById("client-history-list").replaceChildren();
  document.getElementById("upcoming-list").replaceChildren();
  document.getElementById("history-empty").hidden = true;
  document.getElementById("upcoming-empty").hidden = true;
  document.getElementById("history-limited").hidden = true;
  document.getElementById("note-status").textContent = "";
  try {
    const result = await apiFetch(`/api/admin/clients/${encodeURIComponent(uid)}`);
    const client = result.client;
    document.getElementById("modal-avatar").textContent = initials(client.name);
    document.getElementById("modal-client-name").textContent = client.name;
    document.getElementById("modal-client-phone").textContent = client.phone || "Telefone não informado";
    document.getElementById("modal-client-email").textContent = client.email || "E-mail não informado";
    document.getElementById("modal-visits").textContent = result.historyComplete ? String(result.completedCount) : `${result.completedCount}+`;
    document.getElementById("modal-last-visit").textContent = friendlyDate(result.lastVisit);
    document.getElementById("internal-note").value = result.internalNote || "";
    document.getElementById("note-form").dataset.uid = uid;
    const renderAppointments = (target, appointments) => appointments.forEach((appointment) => {
      const row = document.createElement("article");
      row.className = "history-item";
      const date = document.createElement("span");
      date.className = "history-date";
      date.textContent = friendlyDate(appointment.date);
      const info = document.createElement("span");
      info.className = "history-info";
      const service = document.createElement("strong");
      service.textContent = appointment.service || "Serviço não informado";
      const detail = document.createElement("span");
      detail.textContent = `${appointment.time || "Horário não informado"} • ${appointment.status || "Agendado"}`;
      info.append(service, detail);
      row.append(date, info);
      target.append(row);
    });
    const history = document.getElementById("client-history-list");
    renderAppointments(history, result.history);
    document.getElementById("history-empty").hidden = result.history.length > 0;
    document.getElementById("history-limited").hidden = result.historyComplete;
    const upcomingList = document.getElementById("upcoming-list");
    renderAppointments(upcomingList, result.upcoming || []);
    document.getElementById("upcoming-empty").hidden = (result.upcoming || []).length > 0;
  } catch (error) {
    document.getElementById("modal-client-name").textContent = "Não foi possível carregar";
    document.getElementById("note-status").textContent = error.message;
  }
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

document.getElementById("search-form").addEventListener("submit", (event) => event.preventDefault());
search.addEventListener("input", () => {
  query = search.value.trim();
  queryVersion += 1;
  document.getElementById("clear-search-button").hidden = !query;
  clearTimeout(debounce);
  debounce = setTimeout(() => loadClients({ reset: true }), 300);
});
document.getElementById("clear-search-button").addEventListener("click", () => {
  search.value = ""; query = ""; document.getElementById("clear-search-button").hidden = true; loadClients({ reset: true }); search.focus();
});
moreButton.addEventListener("click", () => loadClients());
document.getElementById("close-modal-button").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
document.getElementById("logout-button").addEventListener("click", async () => { await signOut(auth); location.replace("admin-login.html"); });
document.getElementById("note-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const uid = event.currentTarget.dataset.uid;
  const note = document.getElementById("internal-note").value;
  const button = document.getElementById("save-note");
  const noteStatus = document.getElementById("note-status");
  button.disabled = true;
  noteStatus.textContent = "Salvando…";
  try {
    await apiFetch(`/api/admin/clients/${encodeURIComponent(uid)}/note`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    noteStatus.textContent = "Observação salva.";
  } catch (error) {
    noteStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

try {
  const user = await requireAdmin();
  if (user) await loadClients({ reset: true });
} catch (error) {
  setError(error.message);
}
