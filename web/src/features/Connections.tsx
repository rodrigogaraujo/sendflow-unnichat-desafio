import { IconButton, InputAdornment, TextField } from "@mui/material";
import {
  ArrowRight,
  Link2,
  MessageSquare,
  Pencil,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import type { Connection, Contact, Message, Page } from "../lib/types";
import type { EditorState } from "./Editor";
type Props = {
  connections: Connection[];
  contacts: Contact[];
  messages: Message[];
  search: string;
  setSearch: (value: string) => void;
  setEditor: (value: EditorState) => void;
  requestDelete: (
    kind: "connection" | "contact" | "message",
    id: string,
    label: string,
  ) => void;
  create: (kind: EditorState["kind"]) => void;
  navigate: (page: Page) => void;
  setConnectionFilter: (id: string) => void;
};
export function Connections({
  connections,
  contacts,
  messages,
  search,
  setSearch,
  setEditor,
  requestDelete,
  create,
  navigate,
  setConnectionFilter,
}: Props) {
  return (
    <>
      <div className="list-toolbar">
        <span>
          <strong>{connections.length}</strong> conexões no seu workspace
        </span>
        <TextField
          className="search-field"
          placeholder="Buscar conexão"
          aria-label="Buscar conexão"
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
      </div>
      <div className="connections-grid">
        {connections
          .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((connection, index) => (
            <section className="connection-card" key={connection.id}>
              <div className="connection-top">
                <span className={`connection-icon color-${index % 3}`}>
                  <Link2 size={23} />
                </span>
                <div className="row-actions">
                  <IconButton
                    aria-label={`Editar ${connection.name}`}
                    disabled={connection.status !== "active"}
                    onClick={() =>
                      setEditor({
                        kind: "connection",
                        item: connection,
                      })
                    }
                    size="small"
                  >
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    aria-label={`Excluir ${connection.name}`}
                    onClick={() =>
                      requestDelete(
                        "connection",
                        connection.id,
                        connection.name,
                      )
                    }
                    size="small"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
              <h2>{connection.name}</h2>
              <span
                className={`status-badge ${connection.status === "active" ? "sent" : "scheduled"}`}
              >
                <span />
                {connection.status === "active" ? "Ativa" : "Exclusão pendente"}
              </span>
              <div className="connection-counts">
                <span>
                  <Users size={16} />
                  <strong>
                    {
                      contacts.filter((c) => c.connectionId === connection.id)
                        .length
                    }
                  </strong>{" "}
                  contatos
                </span>
                <span>
                  <MessageSquare size={16} />
                  <strong>
                    {
                      messages.filter((m) => m.connectionId === connection.id)
                        .length
                    }
                  </strong>{" "}
                  mensagens
                </span>
              </div>
              <button
                className="connection-open"
                onClick={() => {
                  setConnectionFilter(connection.id);
                  navigate("contacts");
                }}
              >
                Gerenciar conexão <ArrowRight size={16} />
              </button>
            </section>
          ))}
      </div>
      {!connections.length && (
        <section className="panel">
          <EmptyState
            title="Crie seu primeiro espaço de conversa"
            description="Uma conexão reúne os contatos e as mensagens de uma equipe, projeto ou comunidade."
            action="Criar conexão"
            onAction={() => create("connection")}
          />
        </section>
      )}
      {connections.length > 0 &&
        !connections.some((c) =>
          c.name.toLowerCase().includes(search.toLowerCase()),
        ) && (
          <EmptyState
            title="Nenhuma conexão encontrada"
            description="Tente buscar por outro nome."
          />
        )}
    </>
  );
}
