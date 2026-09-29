# Broadcast

Aplicação SaaS de broadcast desenvolvida para o teste Full Stack SendFlow | UnniChat. Cada usuário do Firebase Authentication é um cliente independente, com suas conexões, contatos e mensagens. Todos os envios são simulados: nenhum serviço de WhatsApp ou SMS é chamado.

Aplicação: https://broadcast-uc-rodrigo-0926.web.app

## Stack

React 19, TypeScript, Vite, Material UI, Tailwind CSS 4, Firebase Authentication, Firestore, Cloud Functions de segunda geração e Firebase Hosting. Componentes, hooks, validadores e serviços seguem composição funcional, sem classes de domínio.

## Executar localmente

Requisitos: Node.js 22, npm e Java 21 para o Firestore Emulator.

```sh
npm ci
cp web/.env.example web/.env.local
npm run emulators
```

Em outro terminal:

```sh
npm run dev
```

Abra a URL mostrada pelo Vite. O arquivo de exemplo direciona os SDKs ao projeto isolado `demo-broadcast` e aos emuladores locais. Não são necessárias credenciais de produção. Crie uma conta pela interface e depois uma conexão, um contato e uma mensagem.

O Cloud Scheduler não dispara automaticamente no Emulator Suite. Os testes chamam a mesma função de processamento utilizada pelo agendador em produção, com um relógio controlado, para validar a transição de status sem cliente conectado.

## Verificar

```sh
npm run check
npm test
npm run build
npm run format:check
```

Os testes executam Authentication, Firestore e Functions reais do Emulator Suite. Cobrem acesso anônimo, isolamento entre clientes, validação de entrada, CRUD, contatos de outra conexão, telefones duplicados, envio imediato, edição, reagendamento, exclusão em cascata, execução concorrente do agendador e regras de segurança. Há também um teste ponta a ponta do cadastro no Auth seguido de uma chamada HTTPS autenticada.

## Estrutura

```text
functions/src/
  index.ts       Entradas callable e agendada, configurações de execução
  schema.ts      Contratos de entrada e validação com Zod
  service.ts     Operações transacionais, autorização e processamento
web/src/
  components/    Elementos visuais compartilhados
  features/      Autenticação, painel, conexões, diretório e edição
  lib/           Firebase, hooks em tempo real, tipos e formatação
  App.tsx        Navegação e composição do workspace
  styles.css     Layout responsivo e identidade visual
  main.tsx       Tema Material UI e inicialização
firestore.rules
firestore.indexes.json
tests/
```

## Modelagem e isolamento

São utilizadas apenas três coleções de primeiro nível, sem subcoleções:

| Coleção       | Campos principais                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `connections` | `tenantId`, `name`, `status`, `createdAt`, `updatedAt`                                                        |
| `contacts`    | `tenantId`, `connectionId`, `name`, `phone`, `createdAt`, `updatedAt`                                         |
| `messages`    | `tenantId`, `connectionId`, `body`, `recipients`, `status`, `scheduledAt`, `sentAt`, `createdAt`, `updatedAt` |

O `tenantId` é sempre obtido do token de autenticação no servidor. Ele nunca é aceito como entrada de uma operação. Toda escrita passa pela função callable `broadcastCommand`, que valida o esquema, a propriedade do documento, a conexão e cada destinatário. As regras bloqueiam todas as escritas diretas do navegador e permitem leituras apenas ao proprietário autenticado.

Os listeners `onSnapshot` consultam explicitamente `tenantId == uid`. Consultas sem esse filtro são negadas pelas regras; esconder dados na interface não é a barreira de segurança. Cada sessão desmonta seus listeners ao sair da conta.

A conexão é marcada como `deleting` em transação antes da exclusão em lotes. Operações de contatos e mensagens também leem a conexão em transação, impedindo novas gravações concorrentes durante a limpeza. Se uma exclusão for interrompida, o usuário pode repeti-la para concluir a limpeza.

## Agendamento

`broadcastDispatch` é executada pelo Cloud Scheduler a cada minuto. Ela busca até 200 mensagens com status `scheduled` e `scheduledAt <= agora`, usando o índice composto versionado no repositório. Cada mensagem é relida dentro de uma transação antes de mudar para `sent`. Duas execuções concorrentes não processam a mesma mensagem duas vezes. Reagendamentos e exclusões concorrentes também são reavaliados antes do commit.

Datas são armazenadas como `Timestamp` em UTC e exibidas no fuso do navegador. O processamento pode ocorrer até cerca de um minuto após o horário escolhido, além da latência da infraestrutura. Se houver mais de 200 mensagens vencidas, o restante é processado nos ciclos seguintes. A interface não altera status por temporizador local.

## Decisões de produto

- Um broadcast contém de 1 a 100 destinatários da mesma conexão e até 4.000 caracteres.
- Telefones são normalizados no formato internacional com `+` e DDI, com 8 a 15 dígitos; a validação não garante que a linha exista.
- Mensagens armazenam um snapshot dos nomes e telefones dos destinatários. Excluir ou renomear um contato não reescreve o histórico nem invalida um envio já agendado.
- Mensagens agendadas podem mudar de texto, destinatários e horário, ou ser enviadas imediatamente.
- Mensagens enviadas permitem corrigir apenas o texto do histórico, mantendo destinatários, status e horário original. Não há reenvio implícito.
- Excluir uma conexão remove também seus contatos e mensagens. Excluir uma mensagem agendada cancela seu processamento.
- Contas novas começam vazias; números e atividades no painel sempre vêm de dados reais do próprio workspace.

## Deploy

Projeto: `broadcast-uc-rodrigo-0926`, conta proprietária `uaimedsocial@gmail.com`. Banco `(default)` e Cloud Functions em `us-central1` para manter os serviços próximos. O projeto anterior do usuário não é usado.

1. Ative o plano Blaze, necessário para Cloud Functions e Cloud Scheduler.
2. Ative Authentication com e-mail e senha e crie o Firestore em modo nativo.
3. Registre um aplicativo Web e preencha `web/.env.production` com sua configuração pública do SDK. Use `VITE_USE_EMULATORS=false`, `VITE_FIREBASE_DATABASE_ID=(default)` e o ID real do projeto.
4. Faça login com `npx firebase login`.
5. Execute `npm run deploy`.

A CLI publica somente o site de Hosting configurado, o codebase `broadcast` e as regras/índices do Firestore. As configurações do SDK Web não são credenciais administrativas. Tokens de deploy, contas de serviço e arquivos `.env` não são versionados.

As funções usam instâncias mínimas iguais a zero e limites de instâncias para reduzir o consumo ocioso. O plano Blaze cobra por uso; limites de instâncias não são um teto financeiro.

## Limites deliberados

O teste não pede envio real, anexos, importação de contatos, times com vários membros ou métricas de entrega. O cliente assina os dados do próprio workspace e filtra localmente; uma versão para grandes volumes deve adicionar paginação e contadores agregados. App Check, limites por cliente e observabilidade adicional são extensões indicadas para exposição em escala.

O repositório permanece privado. A submissão ao formulário da seleção deve ser feita pelo candidato após revisar a aplicação e conceder aos avaliadores o acesso necessário ao código.
