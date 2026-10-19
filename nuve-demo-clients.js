export const DEMO_CLIENTS = Object.freeze([
  Object.freeze({ id: "demo-cliente-1", name: "Marina Oliveira", phone: "(11) 90000-1001", email: "marina@example.demo", createdAt: "2026-06-03" }),
  Object.freeze({ id: "demo-cliente-2", name: "Luiza Martins", phone: "(11) 90000-1002", email: "luiza@example.demo", createdAt: "2026-06-14" }),
  Object.freeze({ id: "demo-cliente-3", name: "Beatriz Souza", phone: "(11) 90000-1003", email: "beatriz@example.demo", createdAt: "2026-07-02" }),
  Object.freeze({ id: "demo-cliente-4", name: "Fernanda Lima", phone: "(11) 90000-1004", email: "fernanda@example.demo", createdAt: "2026-07-21" }),
  Object.freeze({ id: "demo-cliente-5", name: "Juliana Rocha", phone: "(11) 90000-1005", email: "juliana@example.demo", createdAt: "2026-08-08" }),
]);

export const DEMO_APPOINTMENTS = Object.freeze([
  Object.freeze({ id: "demo-agendamento-1", clientId: "demo-cliente-1", date: "2026-08-12", time: "14:30", service: "Manutenção em Gel", status: "Concluído" }),
  Object.freeze({ id: "demo-agendamento-2", clientId: "demo-cliente-1", date: "2026-11-12", time: "10:00", service: "Banho de Gel", status: "Confirmado" }),
  Object.freeze({ id: "demo-agendamento-3", clientId: "demo-cliente-2", date: "2026-11-08", time: "16:00", service: "Manicure Completa", status: "Confirmado" }),
  Object.freeze({ id: "demo-agendamento-4", clientId: "demo-cliente-3", date: "2026-07-29", time: "17:30", service: "Banho de Gel", status: "Concluído" }),
  Object.freeze({ id: "demo-agendamento-5", clientId: "demo-cliente-4", date: "2026-11-04", time: "10:00", service: "Pedicure Completa", status: "Confirmado" }),
]);

const NOTE_PREFIX = "nuve-demo-client-note-v1:";

export function searchDemoClients(query = "") {
  const normalized = String(query).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return DEMO_CLIENTS.filter((client) =>
    [client.name, client.phone, client.email].some((value) =>
      value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized),
    ),
  );
}

export function getDemoClient(uid) {
  return DEMO_CLIENTS.find((client) => client.id === uid) || null;
}

export function getDemoAppointments(uid) {
  return DEMO_APPOINTMENTS.filter((appointment) => appointment.clientId === uid);
}

export function readDemoClientNote(uid, storage = globalThis.localStorage) {
  try { return storage?.getItem(`${NOTE_PREFIX}${uid}`) || ""; }
  catch { return ""; }
}

export function writeDemoClientNote(uid, note, storage = globalThis.localStorage) {
  if (!getDemoClient(uid)) throw new Error("Cliente de demonstração não encontrada.");
  if (typeof note !== "string" || note.length > 3000) throw new Error("A observação deve conter até 3.000 caracteres.");
  if (!storage) throw new Error("O armazenamento local não está disponível neste navegador.");
  storage.setItem(`${NOTE_PREFIX}${uid}`, note.trim());
}
