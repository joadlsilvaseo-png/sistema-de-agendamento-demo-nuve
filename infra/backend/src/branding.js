import { createHash, randomUUID } from "node:crypto";

export const BRANDING_DEFAULTS = Object.freeze({
  studioName: "Nuvé Studio",
  description: "Seu estúdio, organizado em um só lugar.",
  colors: Object.freeze({
    background: "#F8F4EF",
    surface: "#FFFFFF",
    primary: "#34233A",
    secondary: "#B87872",
    accent: "#C6A56B",
    title: "#2F2930",
    text: "#2F2930",
    textSecondary: "#746C73",
    buttonBackground: "#34233A",
    buttonText: "#FFFFFF",
    border: "#E9E0DA",
  }),
  fonts: Object.freeze({ title: "Playfair Display", body: "DM Sans" }),
  logoId: null,
  logoUrl: null,
});

export const ALLOWED_FONTS = Object.freeze(["DM Sans", "Playfair Display"]);
export const COLOR_KEYS = Object.freeze(Object.keys(BRANDING_DEFAULTS.colors));
const HEX = /^#[0-9a-fA-F]{6}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function channel(value) {
  const parsed = Number.parseInt(value, 16) / 255;
  return parsed <= 0.04045 ? parsed / 12.92 : ((parsed + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(first, second) {
  const luminance = (hex) => {
    const value = hex.slice(1);
    return 0.2126 * channel(value.slice(0, 2)) +
      0.7152 * channel(value.slice(2, 4)) +
      0.0722 * channel(value.slice(4, 6));
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function validarIdentidade(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "DADOS_INVALIDOS", "Configuração inválida.");
  }
  const studioName = String(input.studioName ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (!studioName || studioName.length > 80 || description.length > 180) {
    throw new ApiError(400, "TEXTO_INVALIDO", "Revise o nome e a descrição do estúdio.");
  }
  const colors = {};
  for (const key of COLOR_KEYS) {
    const value = input.colors?.[key];
    if (typeof value !== "string" || !HEX.test(value)) {
      throw new ApiError(400, "COR_INVALIDA", `A cor ${key} precisa usar o formato #RRGGBB.`);
    }
    colors[key] = value.toUpperCase();
  }
  const fonts = {};
  for (const key of ["title", "body"]) {
    if (!ALLOWED_FONTS.includes(input.fonts?.[key])) {
      throw new ApiError(400, "FONTE_INVALIDA", "Selecione uma fonte da lista permitida.");
    }
    fonts[key] = input.fonts[key];
  }
  const contrastChecks = [
    ["texto", colors.text, colors.background],
    ["título", colors.title, colors.background],
    ["texto secundário", colors.textSecondary, colors.background],
    ["texto de botão", colors.buttonText, colors.buttonBackground],
  ];
  const lowContrast = contrastChecks.filter(([, foreground, background]) =>
    contrastRatio(foreground, background) < 4.5,
  );
  if (lowContrast.length) {
    throw new ApiError(400, "CONTRASTE_INSUFICIENTE", "Ajuste as cores: texto e botões precisam de contraste mínimo de 4,5:1.");
  }
  const logoId = input.logoId === null || input.logoId === "" ? null : input.logoId;
  if (logoId !== null && (typeof logoId !== "string" || !UUID.test(logoId))) {
    throw new ApiError(400, "LOGO_INVALIDA", "A imagem selecionada não é válida.");
  }
  return { studioName, description, colors, fonts, logoId };
}

export function criarRotasBranding({ pool, installationId = "nuve-default", processarImagem }) {
  return {
    async obterPublica(req, res) {
      const result = await pool.query(
        `SELECT studio_name, description, colors, fonts, logo_id
           FROM public.nuve_branding WHERE installation_id = $1`,
        [installationId],
      );
      const row = result.rows[0];
      const data = row ? {
        studioName: row.studio_name,
        description: row.description,
        colors: { ...BRANDING_DEFAULTS.colors, ...row.colors },
        fonts: { ...BRANDING_DEFAULTS.fonts, ...row.fonts },
        logoUrl: null,
      } : {
        studioName: BRANDING_DEFAULTS.studioName,
        description: BRANDING_DEFAULTS.description,
        colors: { ...BRANDING_DEFAULTS.colors },
        fonts: { ...BRANDING_DEFAULTS.fonts },
        logoUrl: null,
      };
      if (row?.logo_id) {
        const logo = await pool.query(
          `SELECT sha256 FROM public.nuve_branding_logos
            WHERE id = $1 AND installation_id = $2 AND published = TRUE`,
          [row.logo_id, installationId],
        );
        if (logo.rows[0]) data.logoUrl = `/api/public/branding/logo/${logo.rows[0].sha256}`;
      }
      res.set("Cache-Control", "no-store").json(data);
    },

    async obterAdmin(req, res) {
      const result = await pool.query(
        `SELECT studio_name, description, colors, fonts, logo_id
           FROM public.nuve_branding WHERE installation_id = $1`,
        [installationId],
      );
      const row = result.rows[0];
      const data = row ? {
        studioName: row.studio_name,
        description: row.description,
        colors: { ...BRANDING_DEFAULTS.colors, ...row.colors },
        fonts: { ...BRANDING_DEFAULTS.fonts, ...row.fonts },
        logoId: row.logo_id,
        logoUrl: null,
      } : { ...structuredClone(BRANDING_DEFAULTS), logoId: null };
      if (row?.logo_id) {
        const logo = await pool.query(
          `SELECT sha256 FROM public.nuve_branding_logos
            WHERE id = $1 AND installation_id = $2 AND published = TRUE`,
          [row.logo_id, installationId],
        );
        if (logo.rows[0]) data.logoUrl = `/api/public/branding/logo/${logo.rows[0].sha256}`;
      }
      res.set("Cache-Control", "no-store").json(data);
    },

    async salvar(req, res) {
      const data = validarIdentidade(req.body);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (data.logoId) {
          const logo = await client.query(
            `SELECT id FROM public.nuve_branding_logos
              WHERE id = $1 AND installation_id = $2`,
            [data.logoId, installationId],
          );
          if (!logo.rows.length) throw new ApiError(400, "LOGO_NAO_ENCONTRADA", "Envie novamente o logotipo antes de salvar.");
        }
        await client.query(
          `INSERT INTO public.nuve_branding
            (installation_id, studio_name, description, colors, fonts, logo_id, updated_by_uid, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, NOW())
           ON CONFLICT (installation_id) DO UPDATE SET
             studio_name = EXCLUDED.studio_name,
             description = EXCLUDED.description,
             colors = EXCLUDED.colors,
             fonts = EXCLUDED.fonts,
             logo_id = EXCLUDED.logo_id,
             updated_by_uid = EXCLUDED.updated_by_uid,
             updated_at = NOW()`,
          [installationId, data.studioName, data.description, JSON.stringify(data.colors), JSON.stringify(data.fonts), data.logoId, req.user.uid],
        );
        await client.query(
          `UPDATE public.nuve_branding_logos SET published = (id = $2)
            WHERE installation_id = $1`,
          [installationId, data.logoId],
        );
        let logoUrl = null;
        if (data.logoId) {
          const logo = await client.query(
            `SELECT sha256 FROM public.nuve_branding_logos
              WHERE id = $1 AND installation_id = $2 AND published = TRUE`,
            [data.logoId, installationId],
          );
          if (logo.rows[0]) logoUrl = `/api/public/branding/logo/${logo.rows[0].sha256}`;
        }
        await client.query("COMMIT");
        res.set("Cache-Control", "no-store").json({ ok: true, ...data, logoUrl });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    async enviarLogo(req, res) {
      const contentType = String(req.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(contentType)) {
        throw new ApiError(415, "FORMATO_NAO_PERMITIDO", "Envie uma imagem PNG, JPEG ou WebP.");
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw new ApiError(400, "IMAGEM_VAZIA", "Selecione um arquivo de imagem.");
      }
      if (req.body.length > 5 * 1024 * 1024) {
        throw new ApiError(413, "IMAGEM_GRANDE", "O arquivo precisa ter no máximo 5 MB.");
      }
      let normalized;
      try {
        normalized = await processarImagem(req.body, contentType);
      } catch {
        throw new ApiError(400, "IMAGEM_INVALIDA", "Não foi possível validar essa imagem. Envie um PNG, JPEG ou WebP válido.");
      }
      if (normalized.length > 1024 * 1024) {
        throw new ApiError(413, "IMAGEM_GRANDE", "A imagem otimizada excede o limite de 1 MB.");
      }
      const id = randomUUID();
      const hash = createHash("sha256").update(normalized).digest("hex");
      await pool.query(
        `DELETE FROM public.nuve_branding_logos
          WHERE installation_id = $1 AND published = FALSE AND created_at < NOW() - INTERVAL '24 hours'`,
        [installationId],
      );
      await pool.query(
        `INSERT INTO public.nuve_branding_logos
          (id, installation_id, content, mime_type, size_bytes, sha256, published, created_by_uid)
         VALUES ($1, $2, $3, 'image/webp', $4, $5, FALSE, $6)`,
        [id, installationId, normalized, normalized.length, hash, req.user.uid],
      );
      res.status(201).json({ id, mimeType: "image/webp", sizeBytes: normalized.length, sha256: hash });
    },

    async obterLogo(req, res) {
      const hash = req.params.hash;
      if (!/^[0-9a-f]{64}$/.test(hash)) throw new ApiError(404, "IMAGEM_NAO_ENCONTRADA", "Imagem não encontrada.");
      const result = await pool.query(
        `SELECT l.content, l.mime_type, l.size_bytes, l.sha256
           FROM public.nuve_branding b
           JOIN public.nuve_branding_logos l ON l.id = b.logo_id
          WHERE b.installation_id = $1 AND l.installation_id = $1
            AND l.published = TRUE AND l.sha256 = $2`,
        [installationId, hash],
      );
      if (!result.rows[0]) throw new ApiError(404, "IMAGEM_NAO_ENCONTRADA", "Imagem não encontrada.");
      res.set({
        "Content-Type": result.rows[0].mime_type,
        "Content-Length": String(result.rows[0].size_bytes),
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": `"${result.rows[0].sha256}"`,
        "X-Content-Type-Options": "nosniff",
      }).send(result.rows[0].content);
    },
  };
}
