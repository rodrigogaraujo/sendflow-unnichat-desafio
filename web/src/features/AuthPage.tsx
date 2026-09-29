import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Send,
  Clock3,
  Users,
  ShieldCheck,
} from "lucide-react";
import { auth } from "../lib/firebase";
import { errorMessage } from "../lib/format";
import { Brand } from "../components/Brand";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setNotice(
          "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.",
        );
      } else if (mode === "register") {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(result.user, {
          displayName: String(data.get("name")).trim(),
        });
      } else await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand light />
        <div className="story-content">
          <span className="eyebrow">
            <span className="live-dot" /> CADA CONVERSA COMEÇA COM VOCÊ
          </span>
          <h1>
            Sua mensagem.
            <br />
            As pessoas certas.
            <br />
            <span>No melhor momento.</span>
          </h1>
          <p>
            Conecte seus contatos e transforme boas ideias em mensagens que
            chegam na hora certa.
          </p>
          <div className="story-visual">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="floating-avatar avatar-one">AL</div>
            <div className="floating-avatar avatar-two">MC</div>
            <div className="floating-avatar avatar-three">JS</div>
            <div className="message-preview">
              <div className="preview-top">
                <span className="mini-logo">
                  <Send size={18} />
                </span>
                <div>
                  <strong>Uma nova conexão</strong>
                  <small>Sua próxima conversa começa aqui</small>
                </div>
                <span className="preview-check">
                  <Check size={16} />
                </span>
              </div>
              <div className="preview-bubble">
                Olá! Temos uma novidade para você. ✨
                <span>
                  09:41 <Check size={12} />
                  <Check size={12} />
                </span>
              </div>
              <div className="preview-bottom">
                <Clock3 size={14} />
                <span>Na hora certa, automaticamente.</span>
              </div>
            </div>
            <span className="delivery-badge">
              <span className="live-dot" /> Mensagem enviada
            </span>
          </div>
          <div className="story-benefits">
            <span>
              <Users size={17} /> Contatos organizados
            </span>
            <span>
              <Clock3 size={17} /> Envios programados
            </span>
          </div>
        </div>
        <footer>Feito para aproximar pessoas.</footer>
      </section>
      <section className="auth-form-side">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="section-kicker">SEU ESPAÇO DE CONEXÕES</span>
          <h2>
            {mode === "register"
              ? "Comece uma boa conversa."
              : mode === "reset"
                ? "Vamos recuperar seu acesso."
                : "Bom ter você por aqui."}
          </h2>
          <p className="muted">
            {mode === "register"
              ? "Crie sua conta e organize suas mensagens em um só lugar."
              : mode === "reset"
                ? "Informe seu e-mail para receber um link de redefinição."
                : "Entre na sua conta e dê continuidade às suas conexões."}
          </p>
          {mode !== "reset" && (
            <div className="auth-tabs">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => changeMode("login")}
              >
                Entrar
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => changeMode("register")}
              >
                Criar conta
              </button>
            </div>
          )}
          <form onSubmit={submit} className="flex flex-col gap-5" key={mode}>
            {error && <Alert severity="error">{error}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}
            {mode === "register" && (
              <TextField
                label="Seu nome"
                name="name"
                required
                autoComplete="name"
                slotProps={{ htmlInput: { minLength: 2, maxLength: 80 } }}
              />
            )}
            <TextField
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@empresa.com"
            />
            {mode !== "reset" && (
              <TextField
                label="Senha"
                name="password"
                type={visible ? "text" : "password"}
                required
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                helperText={
                  mode === "register"
                    ? "Use pelo menos 8 caracteres."
                    : undefined
                }
                slotProps={{
                  htmlInput: { minLength: mode === "register" ? 8 : 1 },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setVisible(!visible)}
                          aria-label={
                            visible ? "Ocultar senha" : "Mostrar senha"
                          }
                          edge="end"
                        >
                          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}{" "}
            {mode === "login" && (
              <button
                type="button"
                className="forgot-link"
                onClick={() => changeMode("reset")}
              >
                Esqueceu sua senha?
              </button>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              endIcon={
                busy ? <CircularProgress size={17} /> : <ArrowRight size={18} />
              }
            >
              {busy
                ? "Aguarde…"
                : mode === "register"
                  ? "Criar minha conta"
                  : mode === "reset"
                    ? "Enviar link de recuperação"
                    : "Entrar na minha conta"}
            </Button>
            {mode === "reset" && (
              <Button onClick={() => changeMode("login")}>
                Voltar para entrar
              </Button>
            )}
          </form>
          <div className="secure-note">
            <ShieldCheck size={16} />
            <span>Um espaço seguro. Seus dados são só seus.</span>
          </div>
        </div>
        <footer className="auth-footer">
          Broadcast <span>•</span> Mais conexão em cada mensagem.
        </footer>
      </section>
    </main>
  );
}
