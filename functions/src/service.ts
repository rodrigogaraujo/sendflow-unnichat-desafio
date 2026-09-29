import {
  FieldValue,
  Timestamp,
  type Firestore,
  type Transaction,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { commandSchema } from "./schema";

const owned = (snapshot: DocumentSnapshot, tenantId: string) => {
  const data = snapshot.data();
  if (!data || data.tenantId !== tenantId)
    throw new HttpsError("not-found", "Registro não encontrado.");
  return data;
};

const activeConnection = async (
  db: Firestore,
  tx: Transaction,
  id: string,
  tenantId: string,
) => {
  const data = owned(
    await tx.get(db.collection("connections").doc(id)),
    tenantId,
  );
  if (data.status !== "active")
    throw new HttpsError(
      "failed-precondition",
      "A conexão está sendo excluída.",
    );
  return data;
};

const recipientSnapshots = async (
  db: Firestore,
  tx: Transaction,
  ids: string[],
  connectionId: string,
  tenantId: string,
) => {
  const snapshots = await tx.getAll(
    ...ids.map((id) => db.collection("contacts").doc(id)),
  );
  return snapshots.map((snapshot) => {
    const data = owned(snapshot, tenantId);
    if (data.connectionId !== connectionId)
      throw new HttpsError(
        "invalid-argument",
        "Os contatos devem pertencer à conexão selecionada.",
      );
    return {
      id: snapshot.id,
      name: data.name as string,
      phone: data.phone as string,
    };
  });
};

const schedule = (value: string | null, now: Timestamp) => {
  if (value === null) return null;
  const time = Timestamp.fromDate(new Date(value));
  if (time.toMillis() <= now.toMillis())
    throw new HttpsError(
      "invalid-argument",
      "Escolha uma data e horário futuros.",
    );
  return time;
};

const purgeConnection = async (db: Firestore, id: string, tenantId: string) => {
  const ref = db.collection("connections").doc(id);
  await db.runTransaction(async (tx) => {
    owned(await tx.get(ref), tenantId);
    tx.update(ref, {
      status: "deleting",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  for (const collection of ["contacts", "messages"]) {
    while (true) {
      const batch = await db
        .collection(collection)
        .where("tenantId", "==", tenantId)
        .where("connectionId", "==", id)
        .limit(200)
        .get();
      if (batch.empty) break;
      const writes = db.batch();
      batch.docs.forEach((doc) => writes.delete(doc.ref));
      await writes.commit();
    }
  }
  await ref.delete();
  return { id };
};

export const executeCommand = async (
  db: Firestore,
  tenantId: string | undefined,
  input: unknown,
) => {
  if (!tenantId)
    throw new HttpsError(
      "unauthenticated",
      "Entre na sua conta para continuar.",
    );
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success)
    throw new HttpsError(
      "invalid-argument",
      parsed.error.issues[0]?.message ?? "Dados inválidos.",
    );
  const command = parsed.data;
  if (command.action === "connection.delete")
    return purgeConnection(db, command.id, tenantId);
  const collection = command.action.startsWith("connection.")
    ? "connections"
    : command.action.startsWith("contact.")
      ? "contacts"
      : "messages";
  const ref = db
    .collection(collection)
    .doc("id" in command ? command.id : db.collection(collection).doc().id);
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const previous =
      "id" in command ? owned(await tx.get(ref), tenantId) : undefined;
    const connectionId =
      "connectionId" in command ? command.connectionId : previous?.connectionId;
    if (collection !== "connections")
      await activeConnection(db, tx, connectionId, tenantId);
    if (command.action.endsWith(".delete")) {
      tx.delete(ref);
      return { id: ref.id };
    }
    if (command.action === "connection.create") {
      tx.create(ref, {
        tenantId,
        name: command.name,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    } else if (command.action === "connection.update") {
      if (previous?.status !== "active")
        throw new HttpsError(
          "failed-precondition",
          "A conexão está sendo excluída.",
        );
      tx.update(ref, { name: command.name, updatedAt: now });
    } else if (
      command.action === "contact.create" ||
      command.action === "contact.update"
    ) {
      const duplicate = await tx.get(
        db
          .collection("contacts")
          .where("tenantId", "==", tenantId)
          .where("connectionId", "==", connectionId)
          .where("phone", "==", command.phone),
      );
      if (duplicate.docs.some((doc) => doc.id !== ref.id))
        throw new HttpsError(
          "already-exists",
          "Este telefone já está cadastrado nesta conexão.",
        );
      const data = { name: command.name, phone: command.phone, updatedAt: now };
      if (command.action === "contact.create")
        tx.create(ref, { ...data, tenantId, connectionId, createdAt: now });
      else tx.update(ref, data);
    } else if (command.action === "message.create") {
      const recipients = await recipientSnapshots(
        db,
        tx,
        command.contactIds,
        connectionId,
        tenantId,
      );
      const scheduledAt = schedule(command.scheduledAt, now);
      tx.create(ref, {
        tenantId,
        connectionId,
        body: command.body,
        recipients,
        status: scheduledAt ? "scheduled" : "sent",
        scheduledAt,
        sentAt: scheduledAt ? null : now,
        createdAt: now,
        updatedAt: now,
      });
    } else if (command.action === "message.update") {
      if (previous?.status === "sent") {
        if (
          command.contactIds !== undefined ||
          command.scheduledAt !== undefined
        )
          throw new HttpsError(
            "failed-precondition",
            "Uma mensagem enviada permite editar apenas o texto do histórico.",
          );
        tx.update(ref, { body: command.body, updatedAt: now });
      } else {
        const recipients = command.contactIds
          ? await recipientSnapshots(
              db,
              tx,
              command.contactIds,
              connectionId,
              tenantId,
            )
          : previous?.recipients;
        const scheduledAt =
          command.scheduledAt === undefined
            ? previous?.scheduledAt
            : schedule(command.scheduledAt, now);
        if (scheduledAt && scheduledAt.toMillis() <= now.toMillis())
          throw new HttpsError(
            "failed-precondition",
            "O horário já chegou. Atualize a lista ou escolha um novo horário.",
          );
        tx.update(ref, {
          body: command.body,
          recipients,
          scheduledAt,
          status: scheduledAt ? "scheduled" : "sent",
          sentAt: scheduledAt ? null : now,
          updatedAt: now,
        });
      }
    }
    return { id: ref.id };
  });
};

export const dispatchDueMessages = async (
  db: Firestore,
  now = Timestamp.now(),
) => {
  const due = await db
    .collection("messages")
    .where("status", "==", "scheduled")
    .where("scheduledAt", "<=", now)
    .orderBy("scheduledAt")
    .limit(200)
    .get();
  let delivered = 0;
  for (let offset = 0; offset < due.size; offset += 20) {
    await Promise.all(
      due.docs.slice(offset, offset + 20).map((doc) =>
        db
          .runTransaction(async (tx) => {
            const fresh = await tx.get(doc.ref);
            const message = fresh.data();
            if (
              !message ||
              message.status !== "scheduled" ||
              message.scheduledAt.toMillis() > now.toMillis()
            )
              return false;
            const connection = await tx.get(
              db.collection("connections").doc(message.connectionId),
            );
            if (
              !connection.exists ||
              connection.data()?.tenantId !== message.tenantId ||
              connection.data()?.status !== "active"
            )
              return false;
            tx.update(doc.ref, { status: "sent", sentAt: now, updatedAt: now });
            return true;
          })
          .then((sent) => {
            if (sent) delivered += 1;
          }),
      ),
    );
  }
  return delivered;
};
