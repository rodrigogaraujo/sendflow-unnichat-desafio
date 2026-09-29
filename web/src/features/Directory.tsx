import {
  Avatar,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  Clock3,
  Link2,
  Pencil,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { dateTime, initials } from "../lib/format";
import type { Connection, Contact, Message } from "../lib/types";
import type { EditorState } from "./Editor";
type Props = {
  page: "contacts" | "messages";
  connections: Connection[];
  contacts: Contact[];
  messages: Message[];
  search: string;
  setSearch: (value: string) => void;
  selectedConnection: string;
  setConnectionFilter: (id: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  setEditor: (value: EditorState) => void;
  requestDelete: (
    kind: "connection" | "contact" | "message",
    id: string,
    label: string,
  ) => void;
  create: (kind: EditorState["kind"]) => void;
};
export function Directory({
  page,
  connections,
  contacts,
  messages,
  search,
  setSearch,
  selectedConnection,
  setConnectionFilter,
  statusFilter,
  setStatusFilter,
  setEditor,
  requestDelete,
  create,
}: Props) {
  const filteredContacts = contacts
    .filter(
      (c) =>
        (!selectedConnection || c.connectionId === selectedConnection) &&
        `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredMessages = messages
    .filter(
      (m) =>
        (!selectedConnection || m.connectionId === selectedConnection) &&
        (statusFilter === "all" || m.status === statusFilter) &&
        `${m.body} ${m.recipients.map((r) => r.name).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  const connectionName = (id: string) =>
    connections.find((c) => c.id === id)?.name || "Conexão";
  const actions = (kind: "contact" | "message", item: Contact | Message) => (
    <div className="row-actions">
      <Tooltip title="Editar">
        <IconButton
          aria-label={`Editar ${kind === "contact" ? (item as Contact).name : "mensagem"}`}
          onClick={() =>
            setEditor(
              kind === "contact"
                ? { kind, item: item as Contact }
                : { kind, item: item as Message },
            )
          }
          size="small"
        >
          <Pencil size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Excluir">
        <IconButton
          aria-label={`Excluir ${kind === "contact" ? (item as Contact).name : "mensagem"}`}
          onClick={() =>
            requestDelete(
              kind,
              item.id,
              kind === "contact" ? (item as Contact).name : "esta mensagem",
            )
          }
          size="small"
        >
          <Trash2 size={16} />
        </IconButton>
      </Tooltip>
    </div>
  );

  return (
    <section className="panel data-panel">
      <div className="data-toolbar">
        <div className="filter-left">
          {page === "messages" ? (
            <div
              className="status-tabs"
              role="group"
              aria-label="Filtrar mensagens por status"
            >
              {[
                { id: "all", name: "Todas" },
                { id: "sent", name: "Enviadas" },
                { id: "scheduled", name: "Agendadas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={statusFilter === tab.id ? "active" : ""}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.name}
                  <span>
                    {
                      messages.filter(
                        (m) =>
                          (!selectedConnection ||
                            m.connectionId === selectedConnection) &&
                          (tab.id === "all" || m.status === tab.id),
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <h2>
              Seus contatos{" "}
              <span className="count-pill">{filteredContacts.length}</span>
            </h2>
          )}
        </div>
        <TextField
          select
          label="Conexão"
          size="small"
          className="connection-select"
          value={selectedConnection}
          onChange={(e) => setConnectionFilter(e.target.value)}
        >
          <MenuItem value="">Todas as conexões</MenuItem>
          {connections.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <div className="search-toolbar">
        <TextField
          className="search-field"
          placeholder={
            page === "contacts"
              ? "Buscar por nome ou telefone"
              : "Buscar mensagem ou destinatário"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={17} />
                </InputAdornment>
              ),
            },
          }}
        />
        <span>
          {page === "contacts"
            ? filteredContacts.length
            : filteredMessages.length}{" "}
          resultado(s)
        </span>
      </div>
      {page === "contacts" &&
        (filteredContacts.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Conexão</th>
                  <th>Adicionado em</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div className="contact-name">
                        <Avatar
                          sx={{
                            bgcolor: "#edf0ff",
                            color: "#6471bf",
                            width: 34,
                            height: 34,
                            fontSize: 12,
                          }}
                        >
                          {initials(contact.name)}
                        </Avatar>
                        <strong>{contact.name}</strong>
                      </div>
                    </td>
                    <td className="phone-cell">{contact.phone}</td>
                    <td>
                      <span className="connection-label">
                        <Link2 size={13} />
                        {connectionName(contact.connectionId)}
                      </span>
                    </td>
                    <td>{dateTime(contact.createdAt)}</td>
                    <td>{actions("contact", contact)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              search || selectedConnection
                ? "Nenhum contato por aqui"
                : "Sua rede começa com uma pessoa"
            }
            description="Adicione um contato à sua conexão para começar a enviar mensagens."
            action="Adicionar contato"
            onAction={() => create("contact")}
          />
        ))}
      {page === "messages" &&
        (filteredMessages.length ? (
          <div className="message-list">
            {filteredMessages.map((message) => (
              <article className="message-card" key={message.id}>
                <div className="message-card-top">
                  <span className={`status-badge ${message.status}`}>
                    <span />
                    {message.status === "sent" ? "Enviada" : "Agendada"}
                  </span>
                  <span className="connection-label">
                    <Link2 size={13} />
                    {connectionName(message.connectionId)}
                  </span>
                  {actions("message", message)}
                </div>
                <p className="message-body">{message.body}</p>
                <div className="message-meta">
                  <Tooltip
                    title={message.recipients
                      .map((r) => `${r.name} (${r.phone})`)
                      .join(", ")}
                  >
                    <span>
                      <Users size={15} />
                      {message.recipients.length} destinatário(s)
                    </span>
                  </Tooltip>
                  <span>
                    {message.status === "sent" ? (
                      <Send size={14} />
                    ) : (
                      <Clock3 size={15} />
                    )}{" "}
                    {dateTime(
                      message.status === "sent"
                        ? message.sentAt
                        : message.scheduledAt,
                    )}
                  </span>
                </div>
                <details className="recipients-detail">
                  <summary>Ver destinatários</summary>
                  <div>
                    {message.recipients.map((recipient) => (
                      <span key={recipient.id}>
                        {recipient.name} <small>{recipient.phone}</small>
                      </span>
                    ))}
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Pronto para uma nova conversa?"
            description={
              search || statusFilter !== "all"
                ? "Nenhuma mensagem corresponde aos filtros selecionados."
                : "Crie sua primeira mensagem e envie agora ou agende para depois."
            }
            action="Criar mensagem"
            onAction={() => create("message")}
          />
        ))}
    </section>
  );
}
