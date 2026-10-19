import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { BRANDING_DEFAULTS, validarIdentidade } from "../src/branding.js";
import sharp from "sharp";

function createFirestore() {
  const profiles = new Map([
    ["client-1", { nome: "Ana Lima", email: "ana@example.com", telefone: "11999990000", role: "cliente" }],
  ]);
  function collection(name) {
    if (name === "usuarios") {
      return { doc: (uid) => ({ get: async () => uid === "admin-1"
        ? { exists: true, data: () => ({ role: "admin", ativo: true }) }
        : { exists: false, data: () => ({}) } }) };
    }
    if (name === "clientes") {
      return {
        doc: (id) => ({
          id,
          get: async () => profiles.has(id)
            ? { id, exists: true, data: () => profiles.get(id) }
            : { id, exists: false, data: () => ({}) },
        }),
        orderBy: () => ({
          limit: () => ({ get: async () => ({ empty: false, docs: [...profiles].map(([id, data]) => ({ id, data: () => data })) }) }),
        }),
      };
    }
    if (name === "agendamentos") {
      return { where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) };
    }
    throw new Error(`Unexpected Firestore collection ${name}`);
  }
  return { collection };
}

function createPool() {
  const state = new Map();
  const logos = new Map();
  return {
    state,
    async query(sql, values = []) {
      if (sql.includes("FROM public.nuve_branding WHERE")) {
        const row = state.get(values[0]);
        return { rows: row ? [row] : [] };
      }
      if (sql.includes("SELECT l.content")) {
        const settings = state.get(values[0]);
        const logo = settings?.logo_id ? logos.get(settings.logo_id) : null;
        return { rows: logo?.published && logo.sha256 === values[1] ? [{ ...logo, content: Buffer.from(logo.content) }] : [] };
      }
      if (sql.includes("SELECT sha256 FROM public.nuve_branding_logos")) {
        const logo = logos.get(values[0]);
        return { rows: logo?.installationId === values[1] && logo.published ? [{ sha256: logo.sha256 }] : [] };
      }
      if (sql.includes("FROM public.nuve_branding_logos")) return { rows: [] };
      if (sql.includes("FROM public.nuve_client_notes")) return { rows: [] };
      if (sql.includes("INSERT INTO public.nuve_branding_logos")) {
        logos.set(values[0], { installationId: values[1], content: Buffer.from(values[2]), size_bytes: values[3], sha256: values[4], mime_type: "image/webp", published: false });
        return { rows: [] };
      }
      if (sql.includes("INSERT INTO public.nuve_client_notes")) return { rows: [{ nota: values[2], updated_at: new Date().toISOString() }] };
      if (sql.includes("DELETE FROM public.nuve_branding_logos")) return { rows: [] };
      if (sql.includes("SELECT 1")) return { rows: [{ result: 1 }] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    async connect() {
      return {
        async query(sql, values = []) {
          if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
          if (sql.includes("SELECT id FROM public.nuve_branding_logos")) {
            const logo = logos.get(values[0]);
            return { rows: logo?.installationId === values[1] ? [{ id: values[0] }] : [] };
          }
          if (sql.includes("INSERT INTO public.nuve_branding")) {
            state.set(values[0], {
              studio_name: values[1], description: values[2], colors: JSON.parse(values[3]),
              fonts: JSON.parse(values[4]), logo_id: values[5],
            });
            return { rows: [] };
          }
          if (sql.includes("UPDATE public.nuve_branding_logos")) {
            for (const [id, logo] of logos) if (logo.installationId === values[0]) logo.published = id === values[1];
            return { rows: [] };
          }
          if (sql.includes("SELECT sha256 FROM public.nuve_branding_logos")) {
            const logo = logos.get(values[0]);
            return { rows: logo?.installationId === values[1] && logo.published ? [{ sha256: logo.sha256 }] : [] };
          }
          throw new Error(`Unexpected transaction SQL: ${sql}`);
        },
        release() {},
      };
    },
  };
}

async function withServer(run, { installationId = "nuve-test", imageProcessor } = {}) {
  const pool = createPool();
  const app = createApp({
    pool,
    firestore: createFirestore(),
    firebaseAuth: { verifyIdToken: async (token) => ({ uid: token === "admin-token" ? "admin-1" : "client-1" }) },
    installationId,
    allowedOrigins: ["https://nuve.test"],
    ...(imageProcessor ? { imageProcessor } : {}),
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run({ base, pool }); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("configuração padrão pode ser lida sem expor IDs ou dados administrativos", async () => {
  await withServer(async ({ base }) => {
    const response = await fetch(`${base}/api/public/branding`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.studioName, BRANDING_DEFAULTS.studioName);
    assert.equal("logoId" in data, false);
    assert.equal("updatedByUid" in data, false);
  });
});

test("rota administrativa exige token e papel admin ativo no Firestore", async () => {
  await withServer(async ({ base }) => {
    const denied = await fetch(`${base}/api/admin/branding`);
    assert.equal(denied.status, 401);
    const client = await fetch(`${base}/api/admin/branding`, { headers: { Authorization: "Bearer client-token" } });
    assert.equal(client.status, 403);
    const admin = await fetch(`${base}/api/admin/branding`, { headers: { Authorization: "Bearer admin-token" } });
    assert.equal(admin.status, 200);
  });
});

test("validação aceita tema permitido e rejeita CSS, fonte ou contraste inadequados", () => {
  const valid = { ...structuredClone(BRANDING_DEFAULTS), studioName: "Studio Ana" };
  assert.equal(validarIdentidade(valid).studioName, "Studio Ana");
  assert.throws(() => validarIdentidade({ ...valid, colors: { ...valid.colors, primary: "red; background:url(x)" } }), /formato #RRGGBB/);
  assert.throws(() => validarIdentidade({ ...valid, fonts: { ...valid.fonts, body: "url(https://evil.test)" } }), /fonte da lista permitida/);
  assert.throws(() => validarIdentidade({ ...valid, colors: { ...valid.colors, buttonText: "#777777" } }), /contraste mínimo/);
  assert.throws(() => validarIdentidade({ ...valid, colors: { ...valid.colors, textSecondary: "#999999" } }), /contraste mínimo/);
});

test("somente admin salva personalização e configuração fica isolada pelo ID da instalação", async () => {
  await withServer(async ({ base }) => {
    const denied = await fetch(`${base}/api/admin/branding`, {
      method: "PUT", headers: { Authorization: "Bearer client-token", "Content-Type": "application/json" },
      body: JSON.stringify(BRANDING_DEFAULTS),
    });
    assert.equal(denied.status, 403);
    const response = await fetch(`${base}/api/admin/branding`, {
      method: "PUT", headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
      body: JSON.stringify({ ...structuredClone(BRANDING_DEFAULTS), studioName: "Studio Ana" }),
    });
    assert.equal(response.status, 200);
    const publicData = await (await fetch(`${base}/api/public/branding`)).json();
    assert.equal(publicData.studioName, "Studio Ana");
  }, { installationId: "nuve-anateste" });
  await withServer(async ({ base }) => {
    const data = await (await fetch(`${base}/api/public/branding`)).json();
    assert.equal(data.studioName, BRANDING_DEFAULTS.studioName);
  }, { installationId: "nuve-outra-instalacao" });
});

test("upload exige admin e rejeita conteúdo que não seja imagem real", async () => {
  await withServer(async ({ base }) => {
    const denied = await fetch(`${base}/api/admin/branding/logo`, {
      method: "POST", headers: { Authorization: "Bearer client-token", "Content-Type": "image/png" }, body: Buffer.from("bad"),
    });
    assert.equal(denied.status, 403);
    const invalid = await fetch(`${base}/api/admin/branding/logo`, {
      method: "POST", headers: { Authorization: "Bearer admin-token", "Content-Type": "image/png" }, body: Buffer.from("not a png"),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error, "IMAGEM_INVALIDA");
  });
});

test("upload real é validado, reprocessado como WebP e possui limite de tamanho", async () => {
  await withServer(async ({ base }) => {
    const png = await sharp({ create: { width: 3, height: 3, channels: 3, background: { r: 180, g: 120, b: 114 } } }).png().toBuffer();
    const valid = await fetch(`${base}/api/admin/branding/logo`, {
      method: "POST", headers: { Authorization: "Bearer admin-token", "Content-Type": "image/png" }, body: png,
    });
    assert.equal(valid.status, 201);
    const logo = await valid.json();
    assert.equal(logo.mimeType, "image/webp");
    assert.equal(logo.sizeBytes > 0, true);
    const large = await fetch(`${base}/api/admin/branding/logo`, {
      method: "POST", headers: { Authorization: "Bearer admin-token", "Content-Type": "image/png" }, body: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    assert.equal(large.status, 413);
  });
});

test("logo só é público após salvar, substituição invalida o antigo e remoção limpa a URL pública", async () => {
  await withServer(async ({ base }) => {
    const headers = { Authorization: "Bearer admin-token" };
    const image = async (color) => sharp({
      create: { width: 4, height: 4, channels: 3, background: color },
    }).png().toBuffer();
    const upload = async (png) => {
      const response = await fetch(`${base}/api/admin/branding/logo`, {
        method: "POST", headers: { ...headers, "Content-Type": "image/png" }, body: png,
      });
      assert.equal(response.status, 201);
      return response.json();
    };
    const publish = async (logoId) => fetch(`${base}/api/admin/branding`, {
      method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...structuredClone(BRANDING_DEFAULTS), logoId }),
    });
    const first = await upload(await image({ r: 180, g: 120, b: 114 }));
    assert.equal((await fetch(`${base}/api/public/branding/logo/${first.sha256}`)).status, 404);
    const firstSave = await publish(first.id);
    assert.equal(firstSave.status, 200);
    assert.equal((await firstSave.json()).logoUrl, `/api/public/branding/logo/${first.sha256}`);
    assert.equal((await fetch(`${base}/api/public/branding/logo/${first.sha256}`)).status, 200);

    const second = await upload(await image({ r: 80, g: 30, b: 180 }));
    assert.notEqual(second.sha256, first.sha256);
    assert.equal((await publish(second.id)).status, 200);
    assert.equal((await fetch(`${base}/api/public/branding/logo/${first.sha256}`)).status, 404);
    assert.equal((await fetch(`${base}/api/public/branding/logo/${second.sha256}`)).status, 200);

    assert.equal((await publish(null)).status, 200);
    const publicConfig = await (await fetch(`${base}/api/public/branding`)).json();
    assert.equal(publicConfig.logoUrl, null);
    assert.equal((await fetch(`${base}/api/public/branding/logo/${second.sha256}`)).status, 404);
  });
});

test("listagem administrativa consulta perfis Firestore e mascara dados de erro", async () => {
  await withServer(async ({ base }) => {
    const denied = await fetch(`${base}/api/admin/clients`);
    assert.equal(denied.status, 401);
    const response = await fetch(`${base}/api/admin/clients`, { headers: { Authorization: "Bearer admin-token" } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.items[0].name, "Ana Lima");
    assert.equal(data.items[0].email, "ana@example.com");
    assert.equal("password" in data.items[0], false);
  });
});

test("perfil e observações internas são consultados apenas por admin e não alteram Firestore", async () => {
  await withServer(async ({ base }) => {
    const denied = await fetch(`${base}/api/admin/clients/client-1`, { headers: { Authorization: "Bearer client-token" } });
    assert.equal(denied.status, 403);
    const profile = await fetch(`${base}/api/admin/clients/client-1`, { headers: { Authorization: "Bearer admin-token" } });
    assert.equal(profile.status, 200);
    const detail = await profile.json();
    assert.equal(detail.client.name, "Ana Lima");
    assert.equal(detail.history.length, 0);
    assert.equal(detail.historyComplete, true);
    const saved = await fetch(`${base}/api/admin/clients/client-1/note`, {
      method: "PUT", headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Prefere agendamento pela manhã." }),
    });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).nota, "Prefere agendamento pela manhã.");
  });
});
