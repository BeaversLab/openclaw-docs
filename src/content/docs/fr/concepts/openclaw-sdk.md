---
summary: "OpenClawSDK d'application OpenClaw public pour les applications externes, les scripts, les tableaux de bord, les travaux CI et les extensions IDE"
title: "OpenClawSDK d'application OpenClaw"
sidebarTitle: "SDK d'application"
read_when:
  - You are building an external app, script, dashboard, CI job, or IDE extension that talks to OpenClaw
  - You are choosing between the App SDK and the Plugin SDK
  - You are integrating with Gateway agent runs, sessions, events, approvals, models, or tools
---

Le **SDK d'application OpenClaw** est l'API cliente publique pour les applications externes au processus OpenClaw. Utilisez OpenClawAPIOpenClaw`@openclaw/sdk`GatewayGateway lorsqu'un script, un tableau de bord, un travail CI, une extension IDE ou une autre application externe souhaite se connecter au Gateway, démarrer des exécutions d'agent, diffuser des événements, attendre des résultats, annuler du travail ou inspecter les ressources du Gateway.

<Note>
  Le SDK d'application est différent du [Plugin SDK](/fr/plugins/sdk-overview). `@openclaw/sdk`GatewayOpenClaw communique avec le Gateway depuis l'extérieur d'OpenClaw. `openclaw/plugin-sdk/*`OpenClaw est uniquement destiné aux plugins qui s'exécutent à l'intérieur d'OpenClaw et enregistrent des fournisseurs, des canaux, des outils, des hooks ou des environnements d'exécution de confiance.
</Note>

## Ce qui est livré aujourd'hui

`@openclaw/sdk` est livré avec :

| Surface                   | Statut  | Ce qu'il fait                                                                                               |
| ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `OpenClaw`                | Prêt    | Point d'entrée principal du client. Gère le transport, la connexion, les requêtes et les événements.        |
| `GatewayClientTransport`  | Prêt    | Transport WebSocket pris en charge par le client Gateway.                                                   |
| `oc.agents`               | Prêt    | Liste, crée, met à jour, supprime et obtient les gestionnaires d'agents.                                    |
| `Agent.run()`             | Prêt    | Démarre une exécution d'agent Gateway`agent` du Gateway et renvoie un `Run`.                                |
| `oc.runs`                 | Prêt    | Crée, obtient, attend, annule et diffuse des exécutions.                                                    |
| `Run.events()`            | Prêt    | Diffuse des événements normalisés par exécution avec relecture pour les exécutions rapides.                 |
| `Run.wait()`              | Prêt    | Appelle `agent.wait` et renvoie un `RunResult` stable.                                                      |
| `Run.cancel()`            | Prêt    | Appelle `sessions.abort` par identifiant d'exécution, avec la clé de session lorsque disponible.            |
| `oc.sessions`             | Prêt    | Crée, résout, envoie à, corrige, compresse et obtient des gestionnaires de session.                         |
| `Session.send()`          | Prêt    | Appelle `sessions.send` et renvoie un `Run`.                                                                |
| `oc.tasks`                | Prêt    | Liste, lit et annule les entrées du grand livre de tâches Gateway.                                          |
| `oc.models`               | Prêt    | Appelle `models.list` et le RPC de statut `models.authStatus` actuel.                                       |
| `oc.tools`                | Prêt    | Liste, délimite et invoque les outils Gateway via le pipeline de stratégies.                                |
| `oc.artifacts`            | Prêt    | Liste, obtient et télécharge les artefacts de transcription Gateway.                                        |
| `oc.approvals`            | Prêt    | Liste et résout les approbations d'exécution via les d'approbation Gateway.                                 |
| `oc.environments`         | Partiel | Liste les candidats d'environnement local Gateway et de nœud ; la création/suppression n'est pas connectée. |
| `oc.rawEvents()`          | Prêt    | Expose les événements bruts Gateway pour les consommateurs avancés.                                         |
| `normalizeGatewayEvent()` | Prêt    | Convertit les événements bruts Gateway en forme d'événement SDK stable.                                     |

Le SDK exporte également les types principaux utilisés par ces surfaces :
`AgentRunParams`, `RunResult`, `RunStatus`, `OpenClawEvent`,
`OpenClawEventType`, `GatewayEvent`, `OpenClawTransport`,
`GatewayRequestOptions`, `SessionCreateParams`, `SessionSendParams`,
`ArtifactSummary`, `ArtifactQuery`, `ArtifactsListResult`,
`ArtifactsGetResult`, `ArtifactsDownloadResult`,
`TaskSummary`, `TaskStatus`, `TasksListParams`, `TasksListResult`,
`TasksGetResult`, `TasksCancelResult`, `RuntimeSelection`,
`EnvironmentSelection`, `WorkspaceSelection`, `ApprovalMode`, et les types de
résultats associés.

## Se connecter à un Gateway

Créez un client avec une URL explicite de Gateway, ou injectez un transport personnalisé pour
les tests et les environnements d'exécution d'application intégrés.

```typescript
import { OpenClaw } from "@openclaw/sdk";

const oc = new OpenClaw({
  url: "ws://127.0.0.1:18789",
  token: process.env.OPENCLAW_GATEWAY_TOKEN,
  requestTimeoutMs: 30_000,
});

await oc.connect();
```

`new OpenClaw({ gateway: "ws://..." })` est équivalent à `url`. L'option
`gateway: "auto"` est acceptée par le constructeur, mais la découverte automatique du
Gateway n'est pas encore une fonctionnalité distincte du SDK ; passez `url` lorsque l'application ne
sait pas encore comment découvrir le Gateway.

Pour les tests, passez un objet qui implémente `OpenClawTransport` :

```typescript
const oc = new OpenClaw({
  transport: {
    async request(method, params) {
      return { method, params };
    },
    async *events() {},
  },
});
```

## Exécuter un agent

Utilisez `oc.agents.get(id)` lorsque l'application souhaite un handle d'agent, puis appelez
`agent.run()`.

```typescript
const agent = await oc.agents.get("main");

const run = await agent.run({
  input: "Review this pull request and suggest the smallest safe fix.",
  model: "openai/gpt-5.5",
  sessionKey: "main",
  timeoutMs: 30_000,
});

for await (const event of run.events()) {
  const data = event.data as { delta?: unknown };
  if (event.type === "assistant.delta" && typeof data.delta === "string") {
    process.stdout.write(data.delta);
  }
}

const result = await run.wait({ timeoutMs: 120_000 });
console.log(result.status);
```

Les références de modèle qualifiées par fournisseur telles que `openai/gpt-5.5` sont divisées en
remplacements Gateway `provider` et `model`. `timeoutMs` reste en millisecondes dans le SDK et
est converti en secondes de délai d'attente du Gateway pour le RPC `agent`.

`run.wait()` utilise le Gateway `agent.wait` RPC. Un délai d'attente qui expire alors que l'exécution est toujours active renvoie `status: "accepted"` au lieu de prétendre que l'exécution elle-même a expiré. Les délais d'exécution, les exécutions abandonnées et les exécutions annulées sont normalisés en `timed_out` ou `cancelled`.

## Créer et réutiliser des sessions

Utilisez des sessions lorsque l'application souhaite un état de transcription durable.

```typescript
const session = await oc.sessions.create({
  agentId: "main",
  label: "release-review",
});

const run = await session.send("Prepare release notes from the current diff.");
await run.wait();
```

`Session.send()` appelle `sessions.send` et renvoie un `Run`. Les handles de session prennent également en charge :

```typescript
await session.abort(run.id);
await session.patch({ label: "renamed-session" });
await session.compact({ maxLines: 200 });
```

## Flux d'événements

Le SDK normalise les événements bruts du Gateway dans une enveloppe stable `OpenClawEvent` :

```typescript
type OpenClawEvent = {
  version: 1;
  id: string;
  ts: number;
  type: OpenClawEventType;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  agentId?: string;
  data: unknown;
  raw?: GatewayEvent;
};
```

Les types d'événements courants incluent :

| Type d'événement      | Événement Gateway source                         |
| --------------------- | ------------------------------------------------ |
| `run.started`         | début du cycle de vie `agent`                    |
| `run.completed`       | fin du cycle de vie `agent`                      |
| `run.failed`          | erreur du cycle de vie `agent`                   |
| `run.cancelled`       | Fin du cycle de vie abandonné/annulé             |
| `run.timed_out`       | Fin du cycle de vie expiré                       |
| `assistant.delta`     | Delta de diffusion en continu de l'assistant     |
| `assistant.message`   | Message de l'assistant                           |
| `thinking.delta`      | Flux de réflexion ou de plan                     |
| `tool.call.started`   | Début d'outil/élément/commande                   |
| `tool.call.delta`     | Mise à jour d'outil/élément/commande             |
| `tool.call.completed` | Achèvement d'outil/élément/commande              |
| `tool.call.failed`    | Échec ou état bloqué de l'outil/élément/commande |
| `approval.requested`  | Demande d'approbation exec ou plugin             |
| `approval.resolved`   | Résolution d'approbation exec ou plugin          |
| `session.created`     | création `sessions.changed`                      |
| `session.updated`     | mise à jour `sessions.changed`                   |
| `session.compacted`   | compactage `sessions.changed`                    |
| `task.updated`        | Événements de mise à jour de tâche               |
| `artifact.updated`    | Événements de flux de correctifs                 |
| `raw`                 | Tout événement sans mappage SDK stable encore    |

`Run.events()` filtre les événements par un identifiant d'exécution et rejoue les événements déjà vus pour les exécutions rapides. Cela signifie que le flux documenté est sûr :

```typescript
const run = await agent.run("Summarize the latest session.");

for await (const event of run.events()) {
  if (event.type === "run.completed") {
    break;
  }
}
```

Pour les flux à l'échelle de l'application, utilisez `oc.events()`. Pour les trames brutes du Gateway, utilisez `oc.rawEvents()`.

## Modèles, outils, artefacts et approbations

Les assistants de modèle correspondent aux méthodes actuelles du Gateway :

```typescript
await oc.models.list();
await oc.models.status({ probe: false }); // calls models.authStatus
```

Les assistants d'outil exposent le catalogue du Gateway, la vue effective de l'outil et l'invocation directe de l'outil Gateway. `oc.tools.invoke()` renvoie une enveloppe typée au lieu de lancer une exception en cas de refus de stratégie ou d'approbation.

```typescript
await oc.tools.list();
await oc.tools.effective({ sessionKey: "main" });
await oc.tools.invoke("tool-name", {
  args: { input: "value" },
  sessionKey: "main",
  confirm: false,
  idempotencyKey: "tool-call-1",
});
```

Les assistants d'artefact exposent la projection d'artefact du Gateway pour le contexte de session, d'exécution ou de tâche. Chaque appel nécessite une portée explicite `sessionKey`, `runId` ou `taskId` :

```typescript
const { artifacts } = await oc.artifacts.list({ sessionKey: "main" });
const first = artifacts[0];

if (first) {
  const { artifact } = await oc.artifacts.get(first.id, { sessionKey: "main" });
  const download = await oc.artifacts.download(artifact.id, { sessionKey: "main" });
  console.log(download.encoding, download.url);
}
```

Les assistants d'approbation utilisent les RPC d'approbation d'exécution :

```typescript
const approvals = await oc.approvals.list();
await oc.approvals.respond("approval-id", { decision: "approve" });
```

Les assistants de tâche utilisent le registre de tâches durables qui prend également en charge `openclaw tasks` :

```typescript
const tasks = await oc.tasks.list({ status: "running", sessionKey: "agent:main:main" });
const task = await oc.tasks.get(tasks.tasks[0].id);
await oc.tasks.cancel(task.task.id, { reason: "user stopped task" });
```

Les assistants d'environnement exposent la découverte des nœuds et du Gateway en lecture seule :

```typescript
const { environments } = await oc.environments.list();
await oc.environments.status(environments[0].id);
```

## Explicitement non pris en charge aujourd'hui

Le SDK inclut des noms pour le modèle de produit que nous souhaitons, mais il ne prétend pas silencieusement que les RPC Gateway existent. Ces appels lancent actuellement des erreurs de non-prise en charge explicites :

```typescript
await oc.environments.create({});
await oc.environments.delete("environment-id");
```

Les champs par exécution `workspace`, `runtime`, `environment` et `approvals` sont typés comme une forme future, mais le Gateway actuel ne prend pas en charge ces substitutions sur le RPC `agent`. Si les appelants les transmettent, le SDK lance une exception avant de soumettre l'exécution afin que le travail ne s'exécute pas accidentellement avec le comportement par défaut de l'espace de travail, du runtime, de l'environnement ou de l'approbation.

## App SDK vs Plugin SDK

Utilisez l'App SDK lorsque le code réside en dehors de OpenClaw :

- Scripts Node qui démarrent ou observent des exécutions d'agent
- Tâches CI qui appellent un Gateway
- tableaux de bord et panneaux d'administration
- extensions IDE
- ponts externes qui n'ont pas besoin de devenir des plugins de canal
- tests d'intégration avec des transports Gateway factices ou réels Gateway

Utilisez le Plugin SDK lorsque le code s'exécute dans OpenClaw :

- plugins de provider
- plugins de channel
- hooks de cycle de vie ou tool
- plugins de harnais d'agent
- assistants d'exécution de confiance

Le code de l'App SDK doit être importé depuis `@openclaw/sdk`. Le code des plugins doit être importé depuis les sous-chemins `openclaw/plugin-sdk/*` documentés. Ne mélangez pas les deux contrats.

## Connexes

- [Conception de l'OpenClaw de l'App SDK API](/fr/reference/openclaw-sdk-api-design)
- [Référence du Gateway RPC](/fr/reference/rpc)
- [Boucle d'agent](/fr/concepts/agent-loop)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Sessions](/fr/concepts/session)
- [Tâches d'arrière-plan](/fr/automation/tasks)
- [Agents ACP](/fr/tools/acp-agents)
- [Aperçu du Plugin SDK](/fr/plugins/sdk-overview)
