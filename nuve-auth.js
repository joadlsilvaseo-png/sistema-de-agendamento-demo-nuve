import { isDemoMode } from "./nuve-mode.js";
import { firebaseConfig, firebaseEstaConfigurado } from "./firebase-config.js";
import { apiUrl } from "./nuve-api-base.js";

export const firebaseConfigured = !isDemoMode() && firebaseEstaConfigurado();
const firebaseSdk = firebaseConfigured
  ? await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js"),
  ])
  : null;
const appSdk = firebaseSdk?.[0];
const authSdk = firebaseSdk?.[1];
const app = appSdk
  ? (appSdk.getApps().find((item) => item.options.projectId === firebaseConfig.projectId) || appSdk.initializeApp(firebaseConfig))
  : null;
export const auth = app ? authSdk.getAuth(app) : null;

export function onAuthStateChanged(...args) {
  if (!authSdk) throw new Error("Autenticação Firebase indisponível no modo demonstração.");
  return authSdk.onAuthStateChanged(...args);
}

export function signInWithEmailAndPassword(...args) {
  if (!authSdk) throw new Error("O login Firebase está disponível apenas no modo conectado.");
  return authSdk.signInWithEmailAndPassword(...args);
}

export async function signOut(...args) {
  if (!authSdk || !auth) return;
  return authSdk.signOut(...args);
}

function waitForAuth() {
  return new Promise((resolve) => {
    if (!auth) return resolve(null);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function requireAdmin() {
  if (isDemoMode()) {
    throw new Error("A demonstração usa a chave Admin/Cliente e não autentica usuários reais.");
  }
  if (!firebaseConfigured || !auth) {
    throw new Error("O Firebase ainda não foi configurado para esta instalação.");
  }
  const user = await waitForAuth();
  if (!user) {
    const next = encodeURIComponent(`${location.pathname.split("/").pop()}${location.search}`);
    location.replace(`admin-login.html?next=${next}`);
    return null;
  }
  const response = await fetch(apiUrl("/api/admin/me"), {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    cache: "no-store",
  });
  if (!response.ok) {
    await signOut(auth);
    const next = encodeURIComponent(`${location.pathname.split("/").pop()}${location.search}`);
    location.replace(`admin-login.html?next=${next}&reason=unauthorized`);
    return null;
  }
  return user;
}
