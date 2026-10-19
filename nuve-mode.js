export const DEMO_MODE_KEY = "nuve-demo-mode";
export const DEMO_BRANDING_KEY = "nuve-demo-branding-v1";

export function resolveAppMode(config = globalThis.window?.NUVE_RUNTIME_CONFIG) {
  return config?.mode === "connected" ? "connected" : "demo";
}

export function isDemoMode(config) {
  return resolveAppMode(config) === "demo";
}

export function isDemoAdmin(storage = globalThis.localStorage, config) {
  if (!isDemoMode(config) || !storage) return false;
  try {
    return storage.getItem(DEMO_MODE_KEY) === "admin";
  } catch {
    return false;
  }
}

function safeBranding(value, defaults) {
  const candidate = {
    ...defaults,
    ...value,
    studioName: typeof value?.studioName === "string" ? value.studioName.slice(0, 80) : defaults.studioName,
    description: typeof value?.description === "string" ? value.description.slice(0, 180) : defaults.description,
    colors: { ...defaults.colors, ...(value?.colors || {}) },
    fonts: { ...defaults.fonts, ...(value?.fonts || {}) },
    logoId: null,
    logoUrl: null,
  };
  const validColors = Object.values(candidate.colors).every((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color));
  if (!validColors) candidate.colors = { ...defaults.colors };
  if (!new Set(["DM Sans", "Playfair Display"]).has(candidate.fonts.title)) candidate.fonts.title = defaults.fonts.title;
  if (!new Set(["DM Sans", "Playfair Display"]).has(candidate.fonts.body)) candidate.fonts.body = defaults.fonts.body;
  if (typeof value?.logoUrl === "string" && value.logoUrl.length <= 1_500_000 && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value.logoUrl)) {
    candidate.logoUrl = value.logoUrl;
  }
  return candidate;
}

export function readDemoBranding(defaults, storage = globalThis.localStorage) {
  if (!storage) return safeBranding({}, defaults);
  try {
    const raw = storage.getItem(DEMO_BRANDING_KEY);
    return safeBranding(raw ? JSON.parse(raw) : {}, defaults);
  } catch {
    return safeBranding({}, defaults);
  }
}

export function writeDemoBranding(value, defaults, storage = globalThis.localStorage) {
  if (!storage) throw new Error("O armazenamento local não está disponível neste navegador.");
  const safe = safeBranding(value, defaults);
  storage.setItem(DEMO_BRANDING_KEY, JSON.stringify(safe));
  return safe;
}
