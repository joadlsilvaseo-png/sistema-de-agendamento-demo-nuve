import { apiUrl } from "./nuve-api-base.js";
import { BRANDING_DEFAULTS } from "./branding-ui.js";
import { isDemoMode, readDemoBranding } from "./nuve-mode.js";

const FONT_STACKS = Object.freeze({
  "DM Sans": '"DM Sans", sans-serif',
  "Playfair Display": '"Playfair Display", serif',
});

function mixColor(color, mixWith, weight) {
  const source = color.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  const target = mixWith.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  const mixed = source.map((part, index) => Math.round(part * (1 - weight) + target[index] * weight));
  return `#${mixed.map((part) => part.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function applyBranding(data) {
  const root = document.documentElement;
  const colors = data.colors || {};
  const vars = {
    "--background": colors.background,
    "--color-background": colors.background,
    "--surface": colors.surface,
    "--color-surface": colors.surface,
    "--primary": colors.primary,
    "--color-primary": colors.primary,
    "--primary-dark": mixColor(colors.primary, "#000000", 0.2),
    "--color-primary-dark": colors.primary,
    "--primary-soft": mixColor(colors.primary, "#FFFFFF", 0.78),
    "--color-primary-soft": mixColor(colors.primary, "#FFFFFF", 0.78),
    "--accent": colors.secondary,
    "--color-accent": colors.secondary,
    "--accent-dark": mixColor(colors.secondary, "#000000", 0.18),
    "--color-accent-dark": mixColor(colors.secondary, "#000000", 0.18),
    "--accent-soft": mixColor(colors.secondary, "#FFFFFF", 0.82),
    "--color-accent-soft": mixColor(colors.secondary, "#FFFFFF", 0.82),
    "--gold": colors.accent,
    "--color-gold": colors.accent,
    "--text": colors.text,
    "--color-text": colors.text,
    "--title-color": colors.title,
    "--text-soft": colors.textSecondary,
    "--color-text-soft": colors.textSecondary,
    "--text-light": colors.textSecondary,
    "--border": colors.border,
    "--color-border": colors.border,
    "--button-background": colors.buttonBackground,
    "--button-text": colors.buttonText,
    "--surface-soft": colors.surface,
    "--color-surface-soft": colors.surface,
    "--font-body": FONT_STACKS[data.fonts?.body] || FONT_STACKS["DM Sans"],
    "--font-display": FONT_STACKS[data.fonts?.title] || FONT_STACKS["Playfair Display"],
  };
  for (const [name, value] of Object.entries(vars)) {
    if (value) root.style.setProperty(name, value);
  }
  document.querySelectorAll(".brand-text > strong, .brand-copy > strong").forEach((node) => {
    node.textContent = data.studioName || "Nuvé Studio";
  });
  if (data.description) {
    document.querySelectorAll("[data-studio-description]").forEach((node) => {
      node.textContent = data.description;
    });
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor && colors.primary) themeColor.content = colors.primary;
  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag && data.description) descriptionTag.content = data.description;
  document.title = document.title.replace(/Nuvé Studio|Nuvé/g, data.studioName || "Nuvé Studio");
  document.querySelectorAll(".brand-symbol").forEach((node) => {
    let image = node.querySelector("img");
    if (data.logoUrl) {
      if (!image) {
        image = document.createElement("img");
        image.alt = `Logotipo ${data.studioName || "do estúdio"}`;
        image.loading = "lazy";
        node.replaceChildren(image);
      }
      image.src = data.logoUrl.startsWith("data:") ? data.logoUrl : apiUrl(data.logoUrl);
    } else if (image) {
      image.remove();
      node.textContent = "N";
    }
  });
}

async function loadBranding() {
  if (isDemoMode()) {
    applyBranding(readDemoBranding(BRANDING_DEFAULTS));
    return;
  }
  try {
    const response = await fetch(apiUrl("/api/public/branding"), { cache: "no-store" });
    if (!response.ok) return;
    applyBranding(await response.json());
  } catch {
    // A identidade padrão do CSS permanece quando a API estiver indisponível.
  }
}

loadBranding();
