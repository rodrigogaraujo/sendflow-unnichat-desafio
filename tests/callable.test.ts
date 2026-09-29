import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";

test("cadastro real no emulador autentica chamada HTTPS e rejeita chamada anônima", async () => {
  const app = initializeApp(
    { projectId: "demo-broadcast", apiKey: "demo-key" },
    "callable-tests",
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const functions = getFunctions(app, "us-central1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  const call = httpsCallable(functions, "broadcastCommand");
  try {
    await assert.rejects(
      () => call({ action: "connection.create", name: "Anônimo" }),
      { code: "functions/unauthenticated" },
    );
    await createUserWithEmailAndPassword(
      auth,
      `test-${Date.now()}@example.test`,
      "Testing123!",
    );
    const result = await call({
      action: "connection.create",
      name: "Conexão via HTTPS",
    });
    assert.equal(typeof (result.data as { id: string }).id, "string");
  } finally {
    await deleteApp(app);
  }
});
