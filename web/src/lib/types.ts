import type { Timestamp } from "firebase/firestore";
export type Connection = {
  id: string;
  tenantId: string;
  name: string;
  status: "active" | "deleting";
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
export type Contact = {
  id: string;
  tenantId: string;
  connectionId: string;
  name: string;
  phone: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
export type Recipient = { id: string; name: string; phone: string };
export type Message = {
  id: string;
  tenantId: string;
  connectionId: string;
  body: string;
  recipients: Recipient[];
  status: "scheduled" | "sent";
  scheduledAt: Timestamp | null;
  sentAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
export type Page = "overview" | "connections" | "contacts" | "messages";
