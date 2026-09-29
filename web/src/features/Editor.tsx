import { useState, type FormEvent } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import { Send, Clock3 } from "lucide-react";
import { mutate } from "../lib/firebase";
import { errorMessage, localInput } from "../lib/format";
import type { Connection, Contact, Message, Recipient } from "../lib/types";

export type EditorState =
  | { kind: "connection"; item?: Connection }
  | { kind: "contact"; item?: Contact }
  | { kind: "message"; item?: Message };
export function Editor({
  state,
  connections,
  contacts,
  defaultConnection,
  onClose,
  onSaved,
}: {
  state: EditorState;
  connections: Connection[];
  contacts: Contact[];
  defaultConnection: string;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const item = state.item;
  const [connectionId, setConnectionId] = useState(
    item && "connectionId" in item
      ? item.connectionId
      : defaultConnection ||
          connections.find((c) => c.status === "active")?.id ||
          "",
  );
  const [name, setName] = useState(item && "name" in item ? item.name : "");
  const [phone, setPhone] = useState(
    state.kind === "contact" ? state.item?.phone || "+55" : "",
  );
  const [body, setBody] = useState(
    state.kind === "message" ? state.item?.body || "" : "",
  );
  const [timing, setTiming] = useState(
    state.kind === "message" && state.item?.status === "scheduled"
      ? "later"
      : "now",
  );
  const [scheduledAt, setScheduledAt] = useState(
    localInput(
      state.kind === "message" && state.item?.scheduledAt
        ? state.item.scheduledAt.toDate()
        : new Date(Date.now() + 3600000),
    ),
  );
  const [recipientIds, setRecipientIds] = useState(
    state.kind === "message"
      ? state.item?.recipients.map((r) => r.id) || []
      : [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sent = state.kind === "message" && state.item?.status === "sent";
  const available = contacts.filter((c) => c.connectionId === connectionId);
  const originalRecipients =
    state.kind === "message" ? state.item?.recipients || [] : [];
  const removed = originalRecipients.filter(
    (r) => !available.some((c) => c.id === r.id),
  );
  const options: Recipient[] = [...available, ...removed].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const recipientsUnchanged =
    state.kind === "message" &&
    !!state.item &&
    recipientIds.length === originalRecipients.length &&
    originalRecipients.every((r) => recipientIds.includes(r.id));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (state.kind === "message" && !sent && recipientIds.length === 0) {
      setError("Selecione pelo menos um contato.");
      return;
    }
    if (
      state.kind === "message" &&
      !sent &&
      timing === "later" &&
      (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())
    ) {
      setError("Escolha uma data e horário futuros.");
      return;
    }
    setBusy(true);
    try {
      const action = `${state.kind}.${item ? "update" : "create"}`;
      const identity = item
        ? { id: item.id }
        : state.kind !== "connection"
          ? { connectionId }
          : {};
      const fields =
        state.kind === "connection"
          ? { name }
          : state.kind === "contact"
            ? { name, phone: "+" + phone.replace(/\D/g, "") }
            : sent
              ? { body }
              : {
                  body,
                  ...(recipientsUnchanged ? {} : { contactIds: recipientIds }),
                  scheduledAt:
                    timing === "later"
                      ? new Date(scheduledAt).toISOString()
                      : null,
                };
      await mutate({ action, ...identity, ...fields });
      onSaved(
        state.kind === "message" && !item
          ? timing === "later"
            ? "Mensagem agendada com sucesso."
            : "Mensagem enviada em modo de simulação."
          : "Alterações salvas com sucesso.",
      );
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const title =
    state.kind === "connection"
      ? item
        ? "Editar conexão"
        : "Nova conexão"
      : state.kind === "contact"
        ? item
          ? "Editar contato"
          : "Novo contato"
        : item
          ? "Editar mensagem"
          : "Nova mensagem";
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-5 pt-2">
            {error && <Alert severity="error">{error}</Alert>}
            {state.kind !== "connection" && (
              <TextField
                select
                label="Conexão"
                value={connectionId}
                disabled={!!item || busy}
                required
                onChange={(e) => {
                  setConnectionId(e.target.value);
                  setRecipientIds([]);
                }}
              >
                {connections
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
            {state.kind !== "message" && (
              <TextField
                autoFocus
                label={
                  state.kind === "connection"
                    ? "Nome da conexão"
                    : "Nome do contato"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                slotProps={{ htmlInput: { minLength: 2, maxLength: 80 } }}
                placeholder={
                  state.kind === "connection"
                    ? "Ex.: Atendimento comercial"
                    : "Ex.: Ana Oliveira"
                }
              />
            )}{" "}
            {state.kind === "connection" && (
              <p className="field-help">
                Uma conexão organiza seus contatos e mensagens em um espaço
                próprio.
              </p>
            )}
            {state.kind === "contact" && (
              <TextField
                label="Telefone com DDI"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                type="tel"
                placeholder="+55 71 99999-9999"
                helperText="Inclua o código do país e o DDD."
                slotProps={{ htmlInput: { maxLength: 22 } }}
              />
            )}{" "}
            {state.kind === "message" && (
              <>
                {sent ? (
                  <Alert severity="info">
                    Edite o texto no histórico. O status e os destinatários do
                    envio serão preservados.
                  </Alert>
                ) : (
                  <>
                    <Autocomplete
                      multiple
                      options={options}
                      value={options.filter((c) => recipientIds.includes(c.id))}
                      getOptionLabel={(c) =>
                        `${c.name} · ${c.phone}${removed.some((r) => r.id === c.id) ? " (removido)" : ""}`
                      }
                      getOptionDisabled={(c) =>
                        removed.some((r) => r.id === c.id)
                      }
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      onChange={(_, value) =>
                        setRecipientIds(value.map((v) => v.id))
                      }
                      noOptionsText="Nenhum contato nesta conexão"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Destinatários"
                          placeholder="Selecione seus contatos"
                          helperText={`${recipientIds.length} de até 100 contatos selecionados`}
                        />
                      )}
                    />
                    <div className="flex justify-between -mt-4">
                      <Button
                        size="small"
                        disabled={!available.length || available.length > 100}
                        onClick={() =>
                          setRecipientIds(available.map((c) => c.id))
                        }
                      >
                        Selecionar todos
                      </Button>
                      <Button size="small" onClick={() => setRecipientIds([])}>
                        Limpar seleção
                      </Button>
                    </div>
                    {removed.length > 0 && (
                      <Alert severity="info">
                        Destinatários removidos permanecem no agendamento
                        original. Para mudar a seleção, remova-os e escolha
                        contatos atuais.
                      </Alert>
                    )}
                    {!options.length && (
                      <Alert severity="info">
                        Cadastre contatos nesta conexão antes de criar uma
                        mensagem.
                      </Alert>
                    )}
                  </>
                )}
                <TextField
                  autoFocus
                  multiline
                  minRows={4}
                  maxRows={9}
                  label="Sua mensagem"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  placeholder="O que você gostaria de compartilhar?"
                  helperText={`${body.length}/4.000 caracteres`}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
                {!sent && (
                  <>
                    <div>
                      <span className="form-label">Quando deseja enviar?</span>
                      <RadioGroup
                        row
                        value={timing}
                        onChange={(e) => setTiming(e.target.value)}
                      >
                        <FormControlLabel
                          value="now"
                          control={<Radio size="small" />}
                          label={
                            <span className="radio-label">
                              <Send size={16} /> Enviar agora
                            </span>
                          }
                        />
                        <FormControlLabel
                          value="later"
                          control={<Radio size="small" />}
                          label={
                            <span className="radio-label">
                              <Clock3 size={16} /> Agendar envio
                            </span>
                          }
                        />
                      </RadioGroup>
                    </div>
                    {timing === "later" && (
                      <TextField
                        label="Data e horário"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        required
                        helperText={`Seu fuso horário: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. O envio pode levar até um minuto após o horário.`}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            min: localInput(new Date(Date.now() + 60000)),
                          },
                        }}
                      />
                    )}
                    <div className="simulation-note">
                      Ambiente de demonstração. Nenhuma mensagem será enviada
                      para telefones reais.
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button disabled={busy} onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || (state.kind !== "connection" && !connectionId)}
            startIcon={
              busy ? (
                <CircularProgress size={16} />
              ) : state.kind === "message" && !item ? (
                timing === "later" ? (
                  <Clock3 size={16} />
                ) : (
                  <Send size={16} />
                )
              ) : undefined
            }
          >
            {busy
              ? "Salvando…"
              : item
                ? "Salvar alterações"
                : state.kind === "message"
                  ? timing === "later"
                    ? "Agendar mensagem"
                    : "Enviar mensagem"
                  : state.kind === "contact"
                    ? "Criar contato"
                    : "Criar conexão"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
