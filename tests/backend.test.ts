import { after, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { executeCommand, dispatchDueMessages } from "../functions/src/service";

const app = initializeApp({ projectId: "demo-broadcast" }, "tests");
const db = getFirestore(app, "(default)");
const uid = `alice-${Date.now()}`;
const other = `bob-${Date.now()}`;
const run = (data: unknown, tenant = uid) => executeCommand(db, tenant, data);
after(() => deleteApp(app));

test("autenticação, validação e isolamento entre clientes", async () => {
  await assert.rejects(
    () =>
      executeCommand(db, undefined, {
        action: "connection.create",
        name: "Equipe",
      }),
    { code: "unauthenticated" },
  );
  await assert.rejects(() => run({ action: "connection.create", name: "A" }), {
    code: "invalid-argument",
  });
  await assert.rejects(
    () => run({ action: "connection.create", name: "Equipe", tenantId: other }),
    { code: "invalid-argument" },
  );
  const { id } = await run({
    action: "connection.create",
    name: "Equipe comercial",
  });
  await assert.rejects(
    () => run({ action: "connection.update", id, name: "Invasão" }, other),
    { code: "not-found" },
  );
  await assert.rejects(
    () =>
      run(
        {
          action: "contact.create",
          connectionId: id,
          name: "Contato indevido",
          phone: "+5571999999999",
        },
        other,
      ),
    { code: "not-found" },
  );
  await assert.rejects(() => run({ action: "connection.delete", id }, other), {
    code: "not-found",
  });
  await run({ action: "connection.update", id, name: "Equipe atualizada" });
  assert.equal(
    (await db.collection("connections").doc(id).get()).data()?.name,
    "Equipe atualizada",
  );
});

test("CRUD de contatos, telefones e destinatários pertencentes à conexão", async () => {
  const a = await run({ action: "connection.create", name: "Conexão A" });
  const b = await run({ action: "connection.create", name: "Conexão B" });
  const contact = await run({
    action: "contact.create",
    connectionId: a.id,
    name: "Ana",
    phone: "+5571999999999",
  });
  await assert.rejects(
    () =>
      run({
        action: "contact.create",
        connectionId: a.id,
        name: "Duplicado",
        phone: "+5571999999999",
      }),
    { code: "already-exists" },
  );
  await assert.rejects(
    () =>
      run({
        action: "contact.create",
        connectionId: a.id,
        name: "Inválido",
        phone: "123",
      }),
    { code: "invalid-argument" },
  );
  await assert.rejects(
    () =>
      run(
        {
          action: "contact.update",
          id: contact.id,
          name: "Invasor",
          phone: "+5571988888888",
        },
        other,
      ),
    { code: "not-found" },
  );
  await run({
    action: "contact.update",
    id: contact.id,
    name: "Ana Oliveira",
    phone: "+5571988888888",
  });
  await assert.rejects(
    () =>
      run({
        action: "message.create",
        connectionId: b.id,
        body: "Mensagem",
        contactIds: [contact.id],
        scheduledAt: null,
      }),
    { code: "invalid-argument" },
  );
  await run({ action: "contact.delete", id: contact.id });
  assert.equal(
    (await db.collection("contacts").doc(contact.id).get()).exists,
    false,
  );
});

test("envio imediato, edição, agendamento sem cliente aberto e execução idempotente", async () => {
  const connection = await run({
    action: "connection.create",
    name: "Agendamentos",
  });
  const contact = await run({
    action: "contact.create",
    connectionId: connection.id,
    name: "Bruno",
    phone: "+5511988887777",
  });
  const base = {
    action: "message.create",
    connectionId: connection.id,
    body: "Olá, Bruno!",
    contactIds: [contact.id],
  };
  const immediate = await run({ ...base, scheduledAt: null });
  assert.equal(
    (await db.collection("messages").doc(immediate.id).get()).data()?.status,
    "sent",
  );
  await run({
    action: "message.update",
    id: immediate.id,
    body: "Texto corrigido",
  });
  await assert.rejects(
    () =>
      run({
        action: "message.update",
        id: immediate.id,
        body: "Reenviar",
        scheduledAt: null,
      }),
    { code: "failed-precondition" },
  );
  await assert.rejects(
    () =>
      run({ ...base, scheduledAt: new Date(Date.now() - 10000).toISOString() }),
    { code: "invalid-argument" },
  );
  await assert.rejects(
    () => run({ ...base, contactIds: [], scheduledAt: null }),
    { code: "invalid-argument" },
  );
  const dueTime = Date.now() + 600000;
  const scheduled = await run({
    ...base,
    scheduledAt: new Date(dueTime).toISOString(),
  });
  await run({
    action: "message.update",
    id: scheduled.id,
    body: "Mensagem editada",
  });
  await dispatchDueMessages(db, Timestamp.fromMillis(dueTime - 1000));
  assert.equal(
    (await db.collection("messages").doc(scheduled.id).get()).data()?.status,
    "scheduled",
  );
  await run({ action: "contact.delete", id: contact.id });
  const [a, b] = await Promise.all([
    dispatchDueMessages(db, Timestamp.fromMillis(dueTime + 1000)),
    dispatchDueMessages(db, Timestamp.fromMillis(dueTime + 1000)),
  ]);
  assert.equal(a + b, 1);
  const delivered = (
    await db.collection("messages").doc(scheduled.id).get()
  ).data();
  assert.equal(delivered?.status, "sent");
  assert.equal(delivered?.body, "Mensagem editada");
  assert.equal(delivered?.recipients[0].name, "Bruno");
  assert.equal(
    await dispatchDueMessages(db, Timestamp.fromMillis(dueTime + 2000)),
    0,
  );
  await assert.rejects(
    () => run({ action: "message.delete", id: scheduled.id }, other),
    { code: "not-found" },
  );
  await run({ action: "message.delete", id: scheduled.id });
  assert.equal(
    (await db.collection("messages").doc(scheduled.id).get()).exists,
    false,
  );
});

test("reagendamento e exclusão em cascata preservam outros clientes", async () => {
  const connection = await run({
    action: "connection.create",
    name: "Campanha",
  });
  const contact = await run({
    action: "contact.create",
    connectionId: connection.id,
    name: "Carla",
    phone: "+5571999991234",
  });
  const oldDate = Date.now() + 600000;
  const message = await run({
    action: "message.create",
    connectionId: connection.id,
    body: "Campanha",
    contactIds: [contact.id],
    scheduledAt: new Date(oldDate).toISOString(),
  });
  await run({
    action: "message.update",
    id: message.id,
    body: "Reagendada",
    scheduledAt: new Date(oldDate + 600000).toISOString(),
    contactIds: [contact.id],
  });
  await dispatchDueMessages(db, Timestamp.fromMillis(oldDate + 1000));
  assert.equal(
    (await db.collection("messages").doc(message.id).get()).data()?.status,
    "scheduled",
  );
  const preserved = await run(
    { action: "connection.create", name: "Outro cliente" },
    other,
  );
  await run({ action: "connection.delete", id: connection.id });
  assert.equal(
    (await db.collection("connections").doc(connection.id).get()).exists,
    false,
  );
  assert.equal(
    (await db.collection("contacts").doc(contact.id).get()).exists,
    false,
  );
  assert.equal(
    (await db.collection("messages").doc(message.id).get()).exists,
    false,
  );
  assert.equal(
    (await db.collection("connections").doc(preserved.id).get()).exists,
    true,
  );
});
