import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const name = z
  .string()
  .trim()
  .min(2, "Informe pelo menos 2 caracteres.")
  .max(80);
const body = z.string().trim().min(1, "Escreva uma mensagem.").max(4000);
const contactIds = z
  .array(id)
  .min(1)
  .max(100)
  .refine((v) => new Set(v).size === v.length, "Contatos duplicados.");
const scheduledAt = z.string().datetime({ offset: true }).nullable();
export const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connection.create"), name }).strict(),
  z.object({ action: z.literal("connection.update"), id, name }).strict(),
  z.object({ action: z.literal("connection.delete"), id }).strict(),
  z
    .object({
      action: z.literal("contact.create"),
      connectionId: id,
      name,
      phone: z
        .string()
        .regex(/^\+[1-9]\d{7,14}$/, "Use DDI e telefone, ex.: +5571999999999."),
    })
    .strict(),
  z
    .object({
      action: z.literal("contact.update"),
      id,
      name,
      phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    })
    .strict(),
  z.object({ action: z.literal("contact.delete"), id }).strict(),
  z
    .object({
      action: z.literal("message.create"),
      connectionId: id,
      body,
      contactIds,
      scheduledAt,
    })
    .strict(),
  z
    .object({
      action: z.literal("message.update"),
      id,
      body,
      contactIds: contactIds.optional(),
      scheduledAt: scheduledAt.optional(),
    })
    .strict(),
  z.object({ action: z.literal("message.delete"), id }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;
