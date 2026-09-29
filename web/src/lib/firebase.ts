import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

const env = import.meta.env;
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "demo-broadcast.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-broadcast",
  appId: env.VITE_FIREBASE_APP_ID || "demo-app",
});
export const auth = getAuth(app);
auth.languageCode = "pt-BR";
export const db = getFirestore(
  app,
  env.VITE_FIREBASE_DATABASE_ID || "(default)",
);
export const functions = getFunctions(app, "us-central1");
if (env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
export const mutate = async (data: Record<string, unknown>) =>
  (
    await httpsCallable<Record<string, unknown>, { id: string }>(
      functions,
      "broadcastCommand",
    )(data)
  ).data;
