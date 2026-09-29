import { useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Snackbar,
  Tooltip,
} from "@mui/material";
import { signOut, type User } from "firebase/auth";
import {
  ArrowRight,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Brand } from "./components/Brand";
import { Connections } from "./features/Connections";
import { Directory } from "./features/Directory";
import { AuthPage } from "./features/AuthPage";
import { Editor, type EditorState } from "./features/Editor";
import { Overview } from "./features/Overview";
import { auth, mutate } from "./lib/firebase";
import { errorMessage, initials } from "./lib/format";
import { useAuth, useCollection } from "./lib/hooks";
import type { Connection, Contact, Message, Page } from "./lib/types";

const pages = [
  { id: "overview", title: "Visão geral", icon: LayoutDashboard },
  { id: "connections", title: "Conexões", icon: Link2 },
  { id: "contacts", title: "Contatos", icon: Users },
  { id: "messages", title: "Mensagens", icon: MessageSquare },
] as const;
const descriptions = {
  overview: "Um olhar sobre suas conexões e tudo o que está acontecendo.",
  connections: "Organize seus espaços e mantenha cada conversa no lugar certo.",
  contacts: "As pessoas que fazem parte das suas conexões.",
  messages: "Sua mensagem, do primeiro rascunho ao momento de chegar.",
};
export function App() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="app-loading">
        <Brand />
        <CircularProgress size={26} />
      </div>
    );
  return user ? <Workspace key={user.uid} user={user} /> : <AuthPage />;
}
function Workspace({ user }: { user: User }) {
  const [page, setPage] = useState<Page>("overview");
  const [connectionFilter, setConnectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deletion, setDeletion] = useState<{
    kind: "connection" | "contact" | "message";
    id: string;
    label: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const connectionsState = useCollection<Connection>("connections", user.uid);
  const contactsState = useCollection<Contact>("contacts", user.uid);
  const messagesState = useCollection<Message>("messages", user.uid);
  const connections = connectionsState.items;
  const contacts = contactsState.items;
  const messages = messagesState.items;
  const loading =
    connectionsState.loading || contactsState.loading || messagesState.loading;
  const error =
    connectionsState.error || contactsState.error || messagesState.error;
  const selectedConnection = connections.some((c) => c.id === connectionFilter)
    ? connectionFilter
    : "";
  const navigate = (next: Page) => {
    setPage(next);
    setSearch("");
    setMobile(false);
  };
  const create = (kind: EditorState["kind"]) => {
    if (
      kind !== "connection" &&
      !connections.some((c) => c.status === "active")
    ) {
      setNotice("Crie uma conexão para começar.");
      setEditor({ kind: "connection" });
      return;
    }
    if (kind === "message" && !contacts.length) {
      setNotice("Adicione um contato antes de criar uma mensagem.");
      setEditor({ kind: "contact" });
      return;
    }
    setEditor({ kind });
  };
  const remove = async () => {
    if (!deletion) return;
    setBusy(true);
    setDeleteError("");
    try {
      await mutate({ action: `${deletion.kind}.delete`, id: deletion.id });
      setDeletion(null);
      setNotice("Registro excluído com sucesso.");
    } catch (e) {
      setDeleteError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const requestDelete = (
    kind: "connection" | "contact" | "message",
    id: string,
    label: string,
  ) => {
    setDeleteError("");
    setDeletion({ kind, id, label });
  };
  const userName = user.displayName || user.email?.split("@")[0] || "Você";
  return (
    <div className="workspace">
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Brand light />
        <div className="workspace-switch">
          <span className="workspace-avatar">{initials(userName)}</span>
          <div>
            <strong>Meu workspace</strong>
            <small>Seu espaço de conexões</small>
          </div>
          <ShieldCheck size={17} />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Navegação principal">
          {pages.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} />
              <span>{item.title}</span>
              {item.id === "messages" &&
                messages.filter((m) => m.status === "scheduled").length > 0 && (
                  <b>
                    {messages.filter((m) => m.status === "scheduled").length}
                  </b>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Send size={20} />
            </span>
            <strong>Converse no seu tempo.</strong>
            <p>
              Agende hoje.
              <br />
              Aproxime pessoas amanhã.
            </p>
            <button onClick={() => create("message")}>
              Criar mensagem <ArrowRight size={15} />
            </button>
          </div>
          <button className="help-button" onClick={() => setHelp(true)}>
            <HelpCircle size={18} /> Como funciona
          </button>
          <div className="sidebar-user">
            <Avatar
              sx={{ width: 34, height: 34, bgcolor: "#344465", fontSize: 13 }}
            >
              {initials(userName)}
            </Avatar>
            <div>
              <strong>{userName}</strong>
              <small>{user.email}</small>
            </div>
            <Tooltip title="Sair da conta">
              <IconButton
                aria-label="Sair da conta"
                onClick={() => {
                  void signOut(auth).catch((e) => setNotice(errorMessage(e)));
                }}
                sx={{ color: "#9aa9c1" }}
              >
                <LogOut size={17} />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <IconButton
              className="mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </IconButton>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{pages.find((p) => p.id === page)?.title}</strong>
          </div>
          <div className="topbar-right">
            <span className="realtime-label">
              <span className="live-dot" /> Atualizações em tempo real
            </span>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "#e9edff",
                color: "#5266e8",
                fontSize: 12,
              }}
            >
              {initials(userName)}
            </Avatar>
          </div>
        </header>
        <main className="page-content">
          <div className="page-heading">
            <div>
              <span className="section-kicker">
                {page === "overview"
                  ? "SEU DIA, MAIS CONECTADO"
                  : "MAIS CONEXÃO, MENOS COMPLICAÇÃO"}
              </span>
              <h1>
                {page === "overview"
                  ? `Olá, ${userName.split(" ")[0]} 👋`
                  : pages.find((p) => p.id === page)?.title}
              </h1>
              <p>{descriptions[page]}</p>
            </div>
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() =>
                create(
                  page === "connections"
                    ? "connection"
                    : page === "contacts"
                      ? "contact"
                      : "message",
                )
              }
            >
              {page === "connections"
                ? "Nova conexão"
                : page === "contacts"
                  ? "Novo contato"
                  : "Nova mensagem"}
            </Button>
          </div>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => location.reload()}
                >
                  Recarregar
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {loading ? (
            <div className="stats-grid">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" height={150} />
              ))}
            </div>
          ) : (
            <>
              {page === "overview" && (
                <Overview
                  connections={connections}
                  contacts={contacts}
                  messages={messages}
                  navigate={navigate}
                  compose={() => create("message")}
                />
              )}{" "}
              {page === "connections" && (
                <Connections
                  connections={connections}
                  contacts={contacts}
                  messages={messages}
                  search={search}
                  setSearch={setSearch}
                  setEditor={setEditor}
                  requestDelete={requestDelete}
                  create={create}
                  navigate={navigate}
                  setConnectionFilter={setConnectionFilter}
                />
              )}
              {(page === "contacts" || page === "messages") && (
                <Directory
                  page={page}
                  connections={connections}
                  contacts={contacts}
                  messages={messages}
                  search={search}
                  setSearch={setSearch}
                  selectedConnection={selectedConnection}
                  setConnectionFilter={setConnectionFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  setEditor={setEditor}
                  requestDelete={requestDelete}
                  create={create}
                />
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>Feito para aproximar pessoas.</span>
            <span>
              <ShieldCheck size={13} /> Seu workspace é privado
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <Editor
          state={editor}
          connections={connections}
          contacts={contacts}
          defaultConnection={selectedConnection}
          onClose={() => setEditor(null)}
          onSaved={setNotice}
        />
      )}
      <Dialog
        open={!!deletion}
        onClose={busy ? undefined : () => setDeletion(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Excluir{" "}
          {deletion?.kind === "connection"
            ? "conexão"
            : deletion?.kind === "contact"
              ? "contato"
              : "mensagem"}
          ?
        </DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <p>
            Você está excluindo <strong>{deletion?.label}</strong>.
          </p>
          <p className="muted">
            {deletion?.kind === "connection"
              ? "Todos os contatos e mensagens desta conexão também serão excluídos."
              : deletion?.kind === "contact"
                ? "Mensagens já criadas manterão o registro deste destinatário."
                : "Esta mensagem será removida do histórico e, se agendada, não será enviada."}{" "}
            Esta ação não pode ser desfeita.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            disabled={busy}
            onClick={() => setDeletion(null)}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={() => {
              void remove();
            }}
          >
            {busy ? "Excluindo…" : "Sim, excluir"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Uma boa conversa em três passos</DialogTitle>
        <DialogContent>
          <div className="help-steps">
            <p>
              <strong>1. Crie uma conexão</strong>
              <span>
                Separe seus contatos por equipe, projeto ou comunidade.
              </span>
            </p>
            <p>
              <strong>2. Adicione seus contatos</strong>
              <span>
                Cadastre nome e telefone com DDI dentro de cada conexão.
              </span>
            </p>
            <p>
              <strong>3. Escreva e escolha o momento</strong>
              <span>
                Envie para um ou mais contatos agora ou agende um horário. O
                agendamento funciona mesmo quando você fecha o navegador, com
                processamento a cada minuto.
              </span>
            </p>
          </div>
          <Alert severity="info">
            Este é um ambiente de demonstração. Os envios são simulados e nenhum
            telefone recebe mensagens reais.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setHelp(false)} variant="contained">
            Entendi
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!notice}
        autoHideDuration={6000}
        onClose={() => setNotice("")}
        message={notice}
        action={
          <IconButton
            color="inherit"
            aria-label="Fechar aviso"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </IconButton>
        }
      />
    </div>
  );
}
