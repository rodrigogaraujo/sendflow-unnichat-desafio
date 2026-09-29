import {
  ArrowDownLeft,
  ArrowRight,
  Clock3,
  Link2,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@mui/material";
import type { Connection, Contact, Message, Page } from "../lib/types";
import { dateTime } from "../lib/format";
import { EmptyState } from "../components/EmptyState";
export function Overview({
  connections,
  contacts,
  messages,
  navigate,
  compose,
}: {
  connections: Connection[];
  contacts: Contact[];
  messages: Message[];
  navigate: (page: Page) => void;
  compose: () => void;
}) {
  const sent = messages.filter((m) => m.status === "sent");
  const scheduled = messages
    .filter((m) => m.status === "scheduled")
    .sort(
      (a, b) =>
        (a.scheduledAt?.toMillis() || 0) - (b.scheduledAt?.toMillis() || 0),
    );
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    const key = date.toDateString();
    return {
      label: date
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", ""),
      count: sent.filter((m) => m.sentAt?.toDate().toDateString() === key)
        .length,
      today: i === 6,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <>
      <div className="stats-grid">
        {[
          {
            label: "Conexões",
            value: connections.length,
            icon: Link2,
            color: "blue",
            hint: "Seus espaços de conversa",
          },
          {
            label: "Contatos",
            value: contacts.length,
            icon: Users,
            color: "purple",
            hint: "Pessoas na sua rede",
          },
          {
            label: "Mensagens enviadas",
            value: sent.length,
            icon: Send,
            color: "green",
            hint: "Conversas que começaram",
          },
          {
            label: "Agendadas",
            value: scheduled.length,
            icon: Clock3,
            color: "amber",
            hint: "Tudo pronto para depois",
          },
        ].map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-top">
              <span>{stat.label}</span>
              <span className={`stat-icon ${stat.color}`}>
                <stat.icon size={18} />
              </span>
            </div>
            <strong>{stat.value.toLocaleString("pt-BR")}</strong>
            <small>{stat.hint}</small>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Suas mensagens em movimento</h2>
              <p>Envios simulados nos últimos 7 dias</p>
            </div>
            <span className="subtle-chip">Últimos 7 dias</span>
          </div>
          <div className="chart-summary">
            <strong>{days.reduce((sum, day) => sum + day.count, 0)}</strong>
            <span>mensagens enviadas</span>
          </div>
          <div
            className="bar-chart"
            aria-label="Gráfico de mensagens enviadas nos últimos 7 dias"
          >
            {days.map((day, i) => (
              <div className="bar-column" key={i}>
                <div className="bar-track">
                  <div
                    className={`bar ${day.today ? "today" : ""}`}
                    style={{
                      height: `${day.count ? Math.max(6, (day.count / max) * 100) : 2}%`,
                    }}
                    title={`${day.label}: ${day.count} mensagens`}
                  >
                    {day.count > 0 && <span>{day.count}</span>}
                  </div>
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Próximos envios</h2>
              <p>Você agenda. A gente cuida do resto.</p>
            </div>
            <span className="count-pill">{scheduled.length}</span>
          </div>
          {scheduled.length ? (
            <div className="upcoming-list">
              {scheduled.slice(0, 3).map((message) => (
                <div className="upcoming-item" key={message.id}>
                  <span className="stat-icon amber">
                    <Clock3 size={18} />
                  </span>
                  <div>
                    <strong>{message.body}</strong>
                    <small>{dateTime(message.scheduledAt)}</small>
                    <span>{message.recipients.length} destinatário(s)</span>
                  </div>
                </div>
              ))}
              <Button
                endIcon={<ArrowRight size={15} />}
                onClick={() => navigate("messages")}
              >
                Ver todas as mensagens
              </Button>
            </div>
          ) : (
            <div className="schedule-empty">
              <span>
                <Clock3 size={30} />
              </span>
              <h3>Seu próximo envio começa aqui</h3>
              <p>
                Prepare uma mensagem e escolha
                <br />o melhor momento para enviar.
              </p>
              <Button onClick={compose} endIcon={<ArrowRight size={15} />}>
                Agendar uma mensagem
              </Button>
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Atividade recente</h2>
            <p>As últimas mensagens das suas conexões</p>
          </div>
          <Button
            endIcon={<ArrowRight size={16} />}
            onClick={() => navigate("messages")}
          >
            Ver todas
          </Button>
        </div>
        {messages.length ? (
          <div className="activity-list">
            {[...messages]
              .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
              .slice(0, 4)
              .map((message) => (
                <div className="activity-row" key={message.id}>
                  <span
                    className={`activity-icon ${message.status === "sent" ? "green" : "amber"}`}
                  >
                    {message.status === "sent" ? (
                      <ArrowDownLeft size={18} />
                    ) : (
                      <Clock3 size={18} />
                    )}
                  </span>
                  <div className="activity-copy">
                    <strong>{message.body}</strong>
                    <span>
                      {connections.find((c) => c.id === message.connectionId)
                        ?.name || "Conexão"}{" "}
                      · {message.recipients.length} destinatário(s)
                    </span>
                  </div>
                  <span className={`status-badge ${message.status}`}>
                    <span />
                    {message.status === "sent" ? "Enviada" : "Agendada"}
                  </span>
                  <time>{dateTime(message.createdAt)}</time>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="Uma nova história para começar"
            description="Suas mensagens aparecem aqui assim que você fizer o primeiro envio."
            action="Criar primeira mensagem"
            onAction={compose}
          />
        )}
      </section>
    </>
  );
}
