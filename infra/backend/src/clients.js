import { ApiError } from "./branding.js";

const UID = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_PAGE = 50;
const SEARCH_BATCH = 100;
const MAX_SEARCH_SCAN = 500;
const CANCELLED = new Set(["cancelado", "cancelada", "cancelled", "canceled"]);
const COMPLETED = new Set(["concluido", "concluída", "realizado", "finalizado", "completed"]);

function agoraSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function safeString(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function dateValue(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return safeString(value, 32);
}

function appointmentProjection(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    date: dateValue(data.data || data.dataAgendamento || data.date),
    time: safeString(data.horario || data.hora || data.time, 20),
    service: safeString(data.servico || data.nomeServico || data.servicoNome, 120),
    status: safeString(data.status || "agendado", 40),
  };
}

function profileProjection(uid, data = {}) {
  return {
    id: uid,
    name: safeString(data.nome || data.nomeCliente || data.name || "Cliente", 120),
    phone: safeString(data.telefone || data.phone, 40),
    email: safeString(data.email, 180),
    createdAt: dateValue(data.dataCadastro || data.createdAt || ""),
  };
}

export function createClientHandlers({ firestore, pool, installationId = "nuve-default" }) {
  const clients = firestore.collection("clientes");

  async function buscarPagina(req, res) {
    const limitValue = Number.parseInt(req.query.limit || "20", 10);
    const limit = Number.isInteger(limitValue) ? Math.max(1, Math.min(MAX_PAGE, limitValue)) : 20;
    const query = normalize(req.query.q).slice(0, 100);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
    if (cursor && !UID.test(cursor)) throw new ApiError(400, "CURSOR_INVALIDO", "Cursor de paginação inválido.");

    if (!query) {
      let request = clients.orderBy("__name__").limit(limit + 1);
      if (cursor) request = request.startAfter(clients.doc(cursor));
      const snapshot = await request.get();
      const hasMore = snapshot.docs.length > limit;
      const page = snapshot.docs.slice(0, limit).filter((doc) => {
        const role = normalize(doc.data()?.role);
        return role !== "admin";
      });
      return res.set("Cache-Control", "no-store").json({
        items: page.map((doc) => profileProjection(doc.id, doc.data())),
        nextCursor: hasMore ? snapshot.docs[limit - 1].id : null,
        hasMore,
      });
    }

    // Firestore não oferece busca textual parcial. A pesquisa percorre documentos
    // em lotes limitados, sem trazer a coleção inteira numa única leitura.
    let lastId = cursor;
    let scanned = 0;
    const matches = [];
    let exhausted = false;
    while (scanned < MAX_SEARCH_SCAN && matches.length <= limit) {
      let request = clients.orderBy("__name__").limit(SEARCH_BATCH);
      if (lastId) request = request.startAfter(clients.doc(lastId));
      const snapshot = await request.get();
      if (snapshot.empty) {
        exhausted = true;
        break;
      }
      for (const doc of snapshot.docs) {
        lastId = doc.id;
        scanned += 1;
        const data = doc.data();
        if (normalize(data.role) === "admin") continue;
        const haystack = normalize([data.nome, data.nomeCliente, data.name, data.telefone, data.phone, data.email].join(" "));
        if (haystack.includes(query)) matches.push(profileProjection(doc.id, data));
        if (matches.length > limit) break;
      }
      if (snapshot.docs.length < SEARCH_BATCH) {
        exhausted = true;
        break;
      }
    }
    const hasMore = matches.length > limit || !exhausted;
    const items = matches.slice(0, limit);
    const nextCursor = matches.length > limit ? items.at(-1)?.id : (!exhausted ? lastId : null);
    res.set("Cache-Control", "no-store").json({
      items,
      nextCursor: hasMore ? nextCursor : null,
      hasMore,
      scanLimitReached: !exhausted && scanned >= MAX_SEARCH_SCAN && matches.length <= limit,
    });
  }

  async function obterPerfil(req, res) {
    const uid = req.params.uid;
    if (!UID.test(uid)) throw new ApiError(400, "CLIENTE_INVALIDA", "Identificador da cliente inválido.");
    const profile = await clients.doc(uid).get();
    if (!profile.exists || normalize(profile.data()?.role) === "admin") {
      throw new ApiError(404, "CLIENTE_NAO_ENCONTRADA", "Cadastro de cliente não encontrado.");
    }
    const appointmentCollection = firestore.collection("agendamentos");
    const fields = ["clienteId", "idCliente", "usuarioId", "uidCliente", "userId"];
    const snapshots = await Promise.all(fields.map((field) =>
      appointmentCollection.where(field, "==", uid).limit(200).get(),
    ));
    const seen = new Map();
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) seen.set(doc.id, appointmentProjection(doc));
    }
    const allHistory = [...seen.values()].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
    const activeHistory = allHistory.filter((item) => !CANCELLED.has(normalize(item.status)));
    const completed = activeHistory.filter((item) => COMPLETED.has(normalize(item.status)));
    const upcoming = activeHistory.filter((item) =>
      !COMPLETED.has(normalize(item.status)) &&
      `${String(item.date).slice(0, 10)}T${item.time || "00:00"}` >= agoraSaoPaulo(),
    ).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    const upcomingIds = new Set(upcoming.map((item) => item.id));
    const history = allHistory.filter((item) => !upcomingIds.has(item.id));
    const lastVisit = completed[0]?.date || null;
    const noteResult = await pool.query(
      `SELECT nota, updated_at FROM public.nuve_client_notes
        WHERE installation_id = $1 AND cliente_uid = $2`,
      [installationId, uid],
    );
    res.set("Cache-Control", "no-store").json({
      client: profileProjection(uid, profile.data()),
      appointmentCount: history.length,
      completedCount: completed.length,
      historyComplete: snapshots.every((snapshot) => snapshot.docs.length < 200),
      lastVisit,
      upcoming,
      history,
      internalNote: noteResult.rows[0]?.nota || "",
      internalNoteUpdatedAt: noteResult.rows[0]?.updated_at || null,
    });
  }

  async function salvarObservacao(req, res) {
    const uid = req.params.uid;
    const note = req.body?.note;
    if (!UID.test(uid) || typeof note !== "string" || note.length > 3000) {
      throw new ApiError(400, "OBSERVACAO_INVALIDA", "A observação deve conter até 3.000 caracteres.");
    }
    const profile = await clients.doc(uid).get();
    if (!profile.exists || normalize(profile.data()?.role) === "admin") {
      throw new ApiError(404, "CLIENTE_NAO_ENCONTRADA", "Cadastro de cliente não encontrado.");
    }
    const result = await pool.query(
      `INSERT INTO public.nuve_client_notes (installation_id, cliente_uid, nota, updated_by_uid, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (installation_id, cliente_uid) DO UPDATE SET
         nota = EXCLUDED.nota, updated_by_uid = EXCLUDED.updated_by_uid, updated_at = NOW()
       RETURNING nota, updated_at`,
      [installationId, uid, note.trim(), req.user.uid],
    );
    res.set("Cache-Control", "no-store").json({ ok: true, ...result.rows[0] });
  }

  return { buscarPagina, obterPerfil, salvarObservacao };
}
