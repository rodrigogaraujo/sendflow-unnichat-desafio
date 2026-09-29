import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";

test("regras negam leitura cruzada, consultas sem tenant e escrita direta", async () => {
  const env = await initializeTestEnvironment({
    projectId: "demo-broadcast",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  try {
    await env.withSecurityRulesDisabled(async (context) => {
      for (const name of ["connections", "contacts", "messages"])
        await setDoc(doc(context.firestore(), name, "owned"), {
          tenantId: "alice",
          name: "Privado",
          connectionId: "owned",
        });
    });
    for (const name of ["connections", "contacts", "messages"]) {
      const alice = env.authenticatedContext("alice").firestore();
      const bob = env.authenticatedContext("bob").firestore();
      await assertSucceeds(getDoc(doc(alice, name, "owned")));
      await assertSucceeds(
        getDocs(
          query(collection(alice, name), where("tenantId", "==", "alice")),
        ),
      );
      await assertFails(getDoc(doc(bob, name, "owned")));
      await assertFails(
        getDoc(doc(env.unauthenticatedContext().firestore(), name, "owned")),
      );
      await assertFails(getDocs(collection(alice, name)));
      await assertFails(
        setDoc(doc(alice, name, "forged"), { tenantId: "alice" }),
      );
      await assertFails(deleteDoc(doc(alice, name, "owned")));
    }
  } finally {
    await env.cleanup();
  }
});
