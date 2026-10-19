import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { BRANDING_DEFAULTS } from "../../../branding-ui.js";
import { apiFetch } from "../../../nuve-api.js";
import { requireAdmin } from "../../../nuve-auth.js";
import {
  DEMO_BRANDING_KEY,
  DEMO_MODE_KEY,
  isDemoAdmin,
  isDemoMode,
  readDemoBranding,
  resolveAppMode,
  writeDemoBranding,
} from "../../../nuve-mode.js";
import {
  DEMO_CLIENTS,
  getDemoAppointments,
  readDemoClientNote,
  searchDemoClients,
  writeDemoClientNote,
} from "../../../nuve-demo-clients.js";

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("Live Server seleciona demonstração por padrão e o modo conectado é explícito", () => {
  assert.equal(resolveAppMode(undefined), "demo");
  assert.equal(resolveAppMode({}), "demo");
  assert.equal(resolveAppMode({ mode: "connected" }), "connected");
  assert.equal(isDemoMode({ mode: "connected" }), false);
});

test("a chave Admin existente só concede navegação demo e não autenticação real", async () => {
  const storage = makeStorage({ [DEMO_MODE_KEY]: "admin" });
  assert.equal(isDemoAdmin(storage, { mode: "demo" }), true);
  assert.equal(isDemoAdmin(storage, { mode: "connected" }), false);
  await assert.rejects(() => apiFetch("/api/admin/clients"), /desativada no modo demonstração/);
  await assert.rejects(() => requireAdmin(), /não autentica usuários reais/);
});

test("preferências de demonstração salvam e carregam localmente com campos inseguros saneados", () => {
  const storage = makeStorage();
  const custom = structuredClone(BRANDING_DEFAULTS);
  custom.studioName = "Ateliê Teste";
  custom.colors.primary = "#445566";
  custom.logoUrl = "https://example.test/logo.svg";
  custom.fonts.body = "url(https://example.test/font)";
  const saved = writeDemoBranding(custom, BRANDING_DEFAULTS, storage);
  assert.equal(storage.getItem(DEMO_BRANDING_KEY) !== null, true);
  assert.equal(saved.studioName, "Ateliê Teste");
  const loaded = readDemoBranding(BRANDING_DEFAULTS, storage);
  assert.equal(loaded.studioName, "Ateliê Teste");
  assert.equal(loaded.colors.primary, "#445566");
  assert.equal(loaded.logoUrl, null);
  assert.equal(loaded.fonts.body, BRANDING_DEFAULTS.fonts.body);
});

test("gestão demo usa apenas clientes fictícias próprias e salva observações no navegador", () => {
  const storage = makeStorage();
  assert.equal(DEMO_CLIENTS.length, 5);
  assert.equal(DEMO_CLIENTS.every((client) => client.id.startsWith("demo-")), true);
  assert.equal(DEMO_CLIENTS.some((client) => /isabele/i.test(client.name + client.email)), false);
  assert.equal(searchDemoClients("marina")[0].id, "demo-cliente-1");
  assert.equal(getDemoAppointments("demo-cliente-1").length, 2);
  writeDemoClientNote("demo-cliente-1", "Nota da amostra", storage);
  assert.equal(readDemoClientNote("demo-cliente-1", storage), "Nota da amostra");
  assert.throws(() => writeDemoClientNote("uid-real", "Não permitido", storage), /não encontrada/);
});

test("entrada Live Server mantém a chave original e oferece links para as duas áreas admin", async () => {
  const [principal, clients, branding, runtime] = await Promise.all([
    readFile(new URL("../../../principal.html", import.meta.url), "utf8"),
    readFile(new URL("../../../admin-clientes.html", import.meta.url), "utf8"),
    readFile(new URL("../../../central-personalizacao.html", import.meta.url), "utf8"),
    readFile(new URL("../../../runtime-config.js", import.meta.url), "utf8"),
  ]);
  assert.match(principal, /id="demo-mode-toggle"/);
  assert.match(principal, /href="admin-clientes\.html"/);
  assert.match(principal, /href="central-personalizacao\.html"/);
  assert.match(clients, /type="module" src="admin-clientes\.js"/);
  assert.match(branding, /type="module" src="central-personalizacao\.js"/);
  assert.match(runtime, /mode: "demo"/);
});

test("páginas e módulos demo são servidos por HTTP estático sem configurar serviços", async () => {
  const root = new URL("../../../", import.meta.url);
  const allowedFiles = new Set([
    "principal.html", "admin-clientes.html", "central-personalizacao.html", "runtime-config.js",
    "principal.js", "admin-clientes.js", "central-personalizacao.js", "nuve-mode.js", "nuve-demo-clients.js",
  ]);
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname.slice(1));
    if (!allowedFiles.has(path)) { response.writeHead(404).end(); return; }
    try {
      const body = await readFile(new URL(path, root));
      response.writeHead(200, { "Content-Type": path.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8" }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ["principal.html", "admin-clientes.html", "central-personalizacao.html", "runtime-config.js", "admin-clientes.js", "central-personalizacao.js", "nuve-mode.js", "nuve-demo-clients.js"]) {
      const response = await fetch(`${base}/${path}`);
      assert.equal(response.status, 200, `${path} precisa estar acessível pelo Live Server`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
