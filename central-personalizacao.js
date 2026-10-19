import { apiFetch, apiUrl } from "./nuve-api.js";
import { auth, requireAdmin, signOut } from "./nuve-auth.js";
import { BRANDING_DEFAULTS, contrastRatio, validarRascunho } from "./branding-ui.js";
import { applyBranding } from "./branding.js";
import { isDemoAdmin, isDemoMode, readDemoBranding, writeDemoBranding } from "./nuve-mode.js";

const form = document.getElementById("branding-form");
const status = document.getElementById("editor-status");
const saveButton = document.getElementById("save-button");
const fileInput = document.getElementById("logo-file");
const preview = document.getElementById("preview-device");
const previewLogo = document.getElementById("preview-logo");
const previewName = document.getElementById("preview-name");
const previewDescription = document.getElementById("preview-description");
const previewTitle = document.getElementById("preview-title");
const previewButton = document.getElementById("preview-button");
const contrastWarning = document.getElementById("contrast-warning");

let saved = structuredClone(BRANDING_DEFAULTS);
let draft = structuredClone(BRANDING_DEFAULTS);
let pickedFile = null;
let removeLogo = false;
let localPreviewUrl = null;
const labels = {
  background: "Fundo geral", surface: "Cartões", primary: "Principal",
  secondary: "Secundária", accent: "Destaque", title: "Títulos", text: "Textos comuns",
  textSecondary: "Textos secundários", buttonBackground: "Fundo dos botões",
  buttonText: "Texto dos botões", border: "Bordas",
};

function showStatus(message, kind = "info") {
  status.textContent = message;
  status.dataset.kind = kind;
}

function normalizeHex(value) { return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : null; }

function initColorInputs() {
  const root = document.getElementById("color-fields");
  root.replaceChildren();
  for (const [key, label] of Object.entries(labels)) {
    const wrapper = document.createElement("div");
    wrapper.className = "color-field";
    const title = document.createElement("label");
    title.htmlFor = `color-text-${key}`;
    title.textContent = label;
    const inputs = document.createElement("div");
    inputs.className = "color-inputs";
    const color = document.createElement("input");
    color.type = "color";
    color.id = `color-picker-${key}`;
    color.setAttribute("aria-label", `Selecionar ${label.toLowerCase()}`);
    const hex = document.createElement("input");
    hex.type = "text";
    hex.id = `color-text-${key}`;
    hex.inputMode = "text";
    hex.maxLength = 7;
    hex.pattern = "#[0-9A-Fa-f]{6}";
    hex.setAttribute("aria-label", `Código hexadecimal de ${label.toLowerCase()}`);
    color.addEventListener("input", () => { draft.colors[key] = color.value.toUpperCase(); hex.value = draft.colors[key]; renderPreview(); });
    hex.addEventListener("input", () => { const valid = normalizeHex(hex.value); if (valid) { draft.colors[key] = valid; color.value = valid; renderPreview(); } });
    hex.addEventListener("blur", () => { if (!normalizeHex(hex.value)) hex.value = draft.colors[key]; });
    inputs.append(color, hex);
    wrapper.append(title, inputs);
    root.append(wrapper);
  }
}

function updatePreview() {
  const c = draft.colors;
  preview.style.setProperty("--p-bg", c.background);
  preview.style.setProperty("--p-surface", c.surface);
  preview.style.setProperty("--p-primary", c.primary);
  preview.style.setProperty("--p-secondary", c.secondary);
  preview.style.setProperty("--p-accent", c.accent);
  preview.style.setProperty("--p-title", c.title);
  preview.style.setProperty("--p-text", c.text);
  preview.style.setProperty("--p-muted", c.textSecondary);
  preview.style.setProperty("--p-border", c.border);
  preview.style.setProperty("--p-button", c.buttonBackground);
  preview.style.setProperty("--p-button-text", c.buttonText);
  preview.style.setProperty("--p-title-font", draft.fonts.title === "DM Sans" ? '"DM Sans", sans-serif' : '"Playfair Display", serif');
  preview.style.setProperty("--p-body-font", draft.fonts.body === "DM Sans" ? '"DM Sans", sans-serif' : '"Playfair Display", serif');
  previewName.textContent = draft.studioName || "Nome do estúdio";
  previewDescription.textContent = draft.description || "Escolha seu serviço e encontre o melhor horário.";
  previewTitle.style.fontFamily = draft.fonts.title === "DM Sans" ? '"DM Sans", sans-serif' : '"Playfair Display", serif';
  previewDescription.style.fontFamily = draft.fonts.body === "DM Sans" ? '"DM Sans", sans-serif' : '"Playfair Display", serif';
  previewButton.style.fontFamily = draft.fonts.body === "DM Sans" ? '"DM Sans", sans-serif' : '"Playfair Display", serif';
  const imageUrl = pickedFile ? localPreviewUrl : (removeLogo ? null : draft.logoUrl);
  previewLogo.replaceChildren();
  if (imageUrl) {
    const img = document.createElement("img");
    img.alt = "Prévia do logotipo";
    img.src = imageUrl.startsWith("blob:") || imageUrl.startsWith("data:") ? imageUrl : apiUrl(imageUrl);
    previewLogo.append(img);
  } else {
    previewLogo.textContent = "N";
  }
  const contrast = [
    contrastRatio(c.text, c.background),
    contrastRatio(c.title, c.background),
    contrastRatio(c.buttonText, c.buttonBackground),
  ];
  const valid = contrast.every((ratio) => ratio >= 4.5) && validarRascunho(draft);
  contrastWarning.hidden = valid;
  contrastWarning.textContent = "Ajuste cores e contraste. Textos e botões precisam de pelo menos 4,5:1 e todos os campos devem ser válidos.";
  saveButton.disabled = !valid;
  if (isDemoMode()) applyBranding(draft);
}

function populate() {
  document.getElementById("studio-name").value = draft.studioName;
  document.getElementById("studio-description").value = draft.description;
  document.getElementById("font-title").value = draft.fonts.title;
  document.getElementById("font-body").value = draft.fonts.body;
  for (const key of Object.keys(labels)) {
    document.getElementById(`color-picker-${key}`).value = draft.colors[key];
    document.getElementById(`color-text-${key}`).value = draft.colors[key];
  }
  updatePreview();
}

function readFields() {
  draft.studioName = document.getElementById("studio-name").value.trim();
  draft.description = document.getElementById("studio-description").value.trim();
  draft.fonts.title = document.getElementById("font-title").value;
  draft.fonts.body = document.getElementById("font-body").value;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o logotipo selecionado."));
    reader.readAsDataURL(file);
  });
}

async function init() {
  initColorInputs();
  const logoutButton = document.getElementById("logout-button");
  logoutButton.addEventListener("click", async () => { await signOut(auth); location.replace("admin-login.html"); });
  if (isDemoMode()) {
    document.body.dataset.appMode = "demo";
    logoutButton.hidden = true;
    if (!isDemoAdmin()) {
      showStatus("Para abrir a Central na demonstração, volte à página principal e ative Admin na chave Cliente/Admin.", "error");
      form.querySelectorAll("input, textarea, select, button").forEach((item) => { item.disabled = true; });
      return;
    }
    saved = readDemoBranding(BRANDING_DEFAULTS);
    draft = structuredClone(saved);
    document.getElementById("logo-hint").textContent = "Demonstração: logotipo e preferências ficam salvos somente neste navegador.";
    document.querySelector('label[for="logo-file"]').textContent = "Logotipo para demonstração (PNG, JPEG ou WebP; até 1 MB)";
    document.getElementById("preview-note").textContent = "Demonstração local: as preferências salvas ficam somente neste navegador.";
    populate();
    showStatus("Modo demonstração: alterações e logotipo são salvos localmente neste navegador; nada é enviado ao servidor.");
    return;
  }
  try {
    document.body.dataset.appMode = "connected";
    const user = await requireAdmin();
    if (!user) return;
    const data = await apiFetch("/api/admin/branding");
    saved = { ...structuredClone(BRANDING_DEFAULTS), ...data, colors: { ...BRANDING_DEFAULTS.colors, ...data.colors }, fonts: { ...BRANDING_DEFAULTS.fonts, ...data.fonts } };
    draft = structuredClone(saved);
    populate();
    showStatus("Configurações carregadas. Suas mudanças aparecem apenas na prévia até serem salvas.");
  } catch (error) {
    showStatus(error.message, "error");
    form.querySelectorAll("input, textarea, select, button").forEach((item) => { item.disabled = true; });
  }
}

form.addEventListener("input", () => { readFields(); updatePreview(); });
form.addEventListener("change", () => { readFields(); updatePreview(); });
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0] || null;
  if (file && !new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
    fileInput.value = "";
    showStatus("Selecione uma imagem PNG, JPEG ou WebP.", "error");
    return;
  }
  const maxSize = isDemoMode() ? 1024 * 1024 : 5 * 1024 * 1024;
  if (file && file.size > maxSize) {
    fileInput.value = "";
    showStatus(`O arquivo excede o limite de ${isDemoMode() ? "1 MB na demonstração" : "5 MB"}.`, "error");
    return;
  }
  if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
  pickedFile = file;
  localPreviewUrl = file ? URL.createObjectURL(file) : null;
  removeLogo = false;
  updatePreview();
});
document.getElementById("remove-logo").addEventListener("click", () => {
  fileInput.value = "";
  pickedFile = null;
  if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
  localPreviewUrl = null;
  removeLogo = true;
  updatePreview();
});
document.getElementById("discard-button").addEventListener("click", () => {
  draft = structuredClone(saved);
  pickedFile = null;
  removeLogo = false;
  fileInput.value = "";
  if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
  localPreviewUrl = null;
  populate();
  if (isDemoMode()) applyBranding(saved);
  showStatus("Alterações descartadas.");
});
document.getElementById("restore-button").addEventListener("click", () => {
  if (isDemoMode()) {
    localStorage.removeItem("nuve-demo-branding-v1");
    saved = structuredClone(BRANDING_DEFAULTS);
    draft = structuredClone(BRANDING_DEFAULTS);
    removeLogo = false;
    pickedFile = null;
    fileInput.value = "";
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    localPreviewUrl = null;
    populate();
    applyBranding(BRANDING_DEFAULTS);
    showStatus("A aparência padrão foi restaurada nesta demonstração.", "success");
    return;
  }
  draft = structuredClone(BRANDING_DEFAULTS);
  removeLogo = true;
  pickedFile = null;
  fileInput.value = "";
  if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
  localPreviewUrl = null;
  populate();
  showStatus("A aparência padrão está na prévia. Salve para publicá-la.");
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  readFields();
  if (!validarRascunho(draft)) return showStatus("Revise os campos antes de salvar.", "error");
  saveButton.disabled = true;
  showStatus("Salvando alterações…");
  try {
    if (isDemoMode()) {
      draft.logoId = null;
      draft.logoUrl = pickedFile ? await fileToDataUrl(pickedFile) : (removeLogo ? null : draft.logoUrl);
      saved = writeDemoBranding(draft, BRANDING_DEFAULTS);
      draft = structuredClone(saved);
      pickedFile = null;
      removeLogo = false;
      fileInput.value = "";
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      localPreviewUrl = null;
      populate();
      showStatus("Preferências salvas neste navegador. Elas não foram publicadas nem enviadas ao backend.", "success");
      return;
    }
    if (pickedFile) {
      const uploaded = await apiFetch("/api/admin/branding/logo", {
        method: "POST",
        headers: { "Content-Type": pickedFile.type },
        body: await pickedFile.arrayBuffer(),
      });
      draft.logoId = uploaded.id;
      draft.logoUrl = null;
    } else if (removeLogo) {
      draft.logoId = null;
      draft.logoUrl = null;
    }
    const savedResult = await apiFetch("/api/admin/branding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    saved = { ...draft, ...savedResult };
    saved.logoUrl = savedResult.logoUrl;
    draft = structuredClone(saved);
    pickedFile = null;
    removeLogo = false;
    fileInput.value = "";
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    localPreviewUrl = null;
    populate();
    showStatus("Alterações salvas e publicadas no aplicativo.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    saveButton.disabled = false;
    updatePreview();
  }
});

init();
