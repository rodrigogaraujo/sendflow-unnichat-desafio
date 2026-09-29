import type { Timestamp } from "firebase/firestore";
export const dateTime = (date?: Timestamp | null) =>
  date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date.toDate())
    : "—";
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const localInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
export const errorMessage = (error: unknown): string => {
  const e = error as { code?: string; message?: string };
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use":
      "Este e-mail já está cadastrado. Entre na sua conta.",
    "auth/weak-password": "Use uma senha com pelo menos 8 caracteres.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
    "functions/unavailable":
      "O serviço está indisponível. Tente novamente em instantes.",
    "functions/internal": "Não foi possível concluir. Tente novamente.",
    "functions/deadline-exceeded":
      "A operação demorou mais que o esperado. Confira a lista antes de tentar novamente.",
  };
  return (
    messages[e.code || ""] ||
    (e.code?.startsWith("functions/")
      ? e.message || "Não foi possível concluir a operação."
      : "Não foi possível concluir. Tente novamente.")
  );
};
