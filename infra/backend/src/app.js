import express from "express";
import sharp from "sharp";
import { ApiError, criarRotasBranding } from "./branding.js";
import { createClientHandlers } from "./clients.js";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createApp({
  pool,
  firebaseAuth,
  firestore,
  installationId = process.env.NUVE_INSTALLATION_ID || "nuve-default",
  allowedOrigins = (process.env.NUVE_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
  imageProcessor = async (buffer, contentType) => {
    const source = sharp(buffer, { failOn: "error", limitInputPixels: 16_000_000 });
    const metadata = await source.metadata();
    const mimeByFormat = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
    if (!metadata.format || mimeByFormat[metadata.format] !== contentType || !metadata.width || !metadata.height) {
      throw new Error("Formato binário não corresponde ao MIME permitido");
    }
    return sharp(buffer, { failOn: "error", limitInputPixels: 16_000_000 })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
  },
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && allowedOrigins.includes(origin)) {
      res.set({
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      });
    }
    if (req.method === "OPTIONS") return res.sendStatus(origin && !allowedOrigins.includes(origin) ? 403 : 204);
    next();
  });
  app.use(express.json({ limit: "32kb", type: "application/json" }));

  const branding = criarRotasBranding({ pool, installationId, processarImagem: imageProcessor });
  const clients = createClientHandlers({ firestore, pool, installationId });

  async function authenticate(req, _res, next) {
    try {
      const match = /^Bearer\s+(.+)$/i.exec(req.get("authorization") || "");
      if (!match) throw new ApiError(401, "NAO_AUTENTICADO", "Entre com uma conta autorizada.");
      req.user = await firebaseAuth.verifyIdToken(match[1], true);
      next();
    } catch (error) {
      next(error instanceof ApiError ? error : new ApiError(401, "TOKEN_INVALIDO", "Sessão inválida. Entre novamente."));
    }
  }

  async function requireAdmin(req, _res, next) {
    try {
      const user = await firestore.collection("usuarios").doc(req.user.uid).get();
      if (!user.exists || user.data()?.role !== "admin" || user.data()?.ativo !== true) {
        throw new ApiError(403, "ADMIN_NECESSARIO", "Acesso administrativo não autorizado.");
      }
      next();
    } catch (error) {
      next(error);
    }
  }

  app.get("/api/health", asyncRoute(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "online" });
  }));

  app.get("/api/public/branding", asyncRoute(branding.obterPublica));
  app.get("/api/public/branding/logo/:hash", asyncRoute(branding.obterLogo));

  app.get("/api/admin/me", authenticate, requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store").json({ uid: req.user.uid, role: "admin" });
  });
  app.get("/api/admin/branding", authenticate, requireAdmin, asyncRoute(branding.obterAdmin));
  app.put("/api/admin/branding", authenticate, requireAdmin, asyncRoute(branding.salvar));
  app.post(
    "/api/admin/branding/logo",
    authenticate,
    requireAdmin,
    express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "5mb" }),
    asyncRoute(branding.enviarLogo),
  );
  app.get("/api/admin/clients", authenticate, requireAdmin, asyncRoute(clients.buscarPagina));
  app.get("/api/admin/clients/:uid", authenticate, requireAdmin, asyncRoute(clients.obterPerfil));
  app.put("/api/admin/clients/:uid/note", authenticate, requireAdmin, asyncRoute(clients.salvarObservacao));

  app.use((_req, res) => res.status(404).json({ error: "ROTA_NAO_ENCONTRADA", message: "Rota não encontrada." }));
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error("API error:", error.message);
    res.status(status).set("Cache-Control", "no-store").json({
      error: error.code || (status === 413 ? "CORPO_GRANDE" : "ERRO_INTERNO"),
      message: status >= 500 ? "Não foi possível concluir a operação." : error.message,
    });
  });
  return app;
}
