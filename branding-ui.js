export const BRANDING_DEFAULTS = Object.freeze({
  studioName: "Nuvé Studio",
  description: "Seu estúdio, organizado em um só lugar.",
  colors: Object.freeze({
    background: "#F8F4EF", surface: "#FFFFFF", primary: "#34233A", secondary: "#B87872",
    accent: "#C6A56B", title: "#2F2930", text: "#2F2930", textSecondary: "#746C73",
    buttonBackground: "#34233A", buttonText: "#FFFFFF", border: "#E9E0DA",
  }),
  fonts: Object.freeze({ title: "Playfair Display", body: "DM Sans" }),
  logoId: null,
  logoUrl: null,
});

const allowedFonts = new Set(["DM Sans", "Playfair Display"]);
const colorKeys = Object.keys(BRANDING_DEFAULTS.colors);
const hex = /^#[0-9a-f]{6}$/i;

function luminance(value) {
  const channels = value.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255)
    .map((part) => part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function validarRascunho(value) {
  if (!value || !String(value.studioName || "").trim() || String(value.studioName).length > 80 || String(value.description || "").length > 180) return false;
  if (!colorKeys.every((key) => typeof value.colors?.[key] === "string" && hex.test(value.colors[key]))) return false;
  if (!["title", "body"].every((key) => allowedFonts.has(value.fonts?.[key]))) return false;
  return contrastRatio(value.colors.text, value.colors.background) >= 4.5 &&
    contrastRatio(value.colors.title, value.colors.background) >= 4.5 &&
    contrastRatio(value.colors.textSecondary, value.colors.background) >= 4.5 &&
    contrastRatio(value.colors.buttonText, value.colors.buttonBackground) >= 4.5;
}
