import "dotenv/config";
import pg from "pg";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createApp } from "./app.js";

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error("FIREBASE_PROJECT_ID precisa ser configurado.");
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = createApp({ pool, firebaseAuth: getAuth(), firestore: getFirestore() });
const port = Number(process.env.PORT || 3010);

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`API Nuvé iniciada na porta ${port}`);
});

async function shutdown(signal) {
  console.log(`Recebido ${signal}; encerrando API Nuvé.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
