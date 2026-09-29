import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { info } from "firebase-functions/logger";
import { executeCommand, dispatchDueMessages } from "./service";

initializeApp();
setGlobalOptions({
  region: "us-central1",
  maxInstances: 3,
  memory: "256MiB",
  timeoutSeconds: 120,
});
const db = getFirestore("(default)");
export const broadcastCommand = onCall({ cors: true }, (request) =>
  executeCommand(db, request.auth?.uid, request.data),
);
export const broadcastDispatch = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "UTC",
    retryCount: 3,
    maxInstances: 1,
  },
  async () => {
    const delivered = await dispatchDueMessages(db);
    if (delivered) info("Simulated broadcasts delivered", { delivered });
  },
);
