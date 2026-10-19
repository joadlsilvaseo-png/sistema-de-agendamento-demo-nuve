import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { firebaseConfig, firebaseEstaConfigurado } from "./firebase-config.js";
import { apiUrl } from "./nuve-api-base.js";

export const firebaseConfigured = firebaseEstaConfigurado();
const app = firebaseConfigured
  ? (getApps().find((item) => item.options.projectId === firebaseConfig.projectId) || initializeApp(firebaseConfig))
  : null;
export const auth = app ? getAuth(app) : null;
export { onAuthStateChanged, signInWithEmailAndPassword, signOut };

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
