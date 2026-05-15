---
summary: "Référence de conception pour l'API publique du SDK d'application OpenClawAPI, la taxonomie des événements, les artefacts, les approbations et la structure du package"
title: "Conception de l'API du SDK d'application OpenClawAPI"
sidebarTitle: "APIConception de l'API du SDK d'application"
read_when:
  - You are implementing the proposed public OpenClaw app SDK
  - You need the draft namespace, event, result, artifact, approval, or security contract for the app SDK
  - You are comparing Gateway protocol resources with the high-level OpenClaw App SDK wrapper
---

Cette page est la conception de référence détaillée de l'API publique pour le
[SDK d'application OpenClaw](/fr/concepts/openclaw-sdk). Elle est intentionnellement distincte du
[SDK de plugin](/fr/plugins/sdk-overview).

<Note>`@openclaw/sdk` est le package externe application/client pour communiquer avec le Gateway. `openclaw/plugin-sdk/*` est le contrat de création de plugin en cours de processus. N'importez pas les sous-chemins du SDK de plugin depuis les applications qui ont uniquement besoin d'exécuter des agents.</Note>

Le SDK d'application public doit être construit en deux couches :

1. Un client généré de bas niveau pour le Gateway.
2. Un wrapper ergonomique de haut niveau avec des objets `OpenClaw`, `Agent`, `Session`, `Run`,
   `Task`, `Artifact`, `Approval` et `Environment`.

## Conception de l'espace de noms

Les espaces de noms de bas niveau doivent suivre de près les ressources du Gateway :

```typescript
oc.agents.list();
oc.agents.get("main");
oc.agents.create(...);
oc.agents.update(...);

oc.sessions.list();
oc.sessions.create(...);
oc.sessions.resolve(...);
oc.sessions.send(...);
oc.sessions.messages(...);
oc.sessions.fork(...);
oc.sessions.compact(...);
oc.sessions.abort(...);

oc.runs.create(...);
oc.runs.get(runId);
oc.runs.events(runId, { after });
oc.runs.wait(runId);
oc.runs.cancel(runId);

oc.tasks.list({ status: "running" });
oc.tasks.get(taskId);
oc.tasks.cancel(taskId, { reason });
oc.tasks.events(taskId, { after }); // future API

oc.models.list();
oc.models.status(); // Gateway models.authStatus

oc.tools.list();
oc.tools.invoke("tool-name", { sessionKey, idempotencyKey });

oc.artifacts.list({ runId });
oc.artifacts.get(artifactId, { runId });
oc.artifacts.download(artifactId, { runId });

oc.approvals.list();
oc.approvals.respond(approvalId, ...);

oc.environments.list();
oc.environments.create(...); // future API: current SDK throws unsupported
oc.environments.status(environmentId);
oc.environments.delete(environmentId); // future API: current SDK throws unsupported
```

Les wrappers de haut niveau doivent renvoyer des objets qui rendent les flux courants agréables :

```typescript
const run = await agent.run(inputOrParams);
await run.cancel();
await run.wait();

for await (const event of run.events()) {
  // normalized event stream
}

const artifacts = await run.artifacts.list();
const session = await run.session();
```

## Contrat d'événement

Le SDK public doit exposer des événements versionnés, répétables et normalisés.

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
  raw?: unknown;
};
```

`id` est un curseur de relecture. Les consommateurs doivent être en mesure de se reconnecter avec
`events({ after: id })` et de recevoir les événements manqués lorsque la rétention le permet.

Familles d'événements normalisés recommandées :

| Événement             | Signification                                                                 |
| --------------------- | ----------------------------------------------------------------------------- |
| `run.created`         | Exécution acceptée.                                                           |
| `run.queued`          | L'exécution attend une voie de session, un runtime ou un environnement.       |
| `run.started`         | Le runtime a démarré l'exécution.                                             |
| `run.completed`       | L'exécution s'est terminée avec succès.                                       |
| `run.failed`          | L'exécution s'est terminée avec une erreur.                                   |
| `run.cancelled`       | L'exécution a été annulée.                                                    |
| `run.timed_out`       | L'exécution a dépassé son délai d'attente.                                    |
| `assistant.delta`     | Delta de texte de l'assistant.                                                |
| `assistant.message`   | Message complet de l'assistant ou remplacement.                               |
| `thinking.delta`      | Delta de raisonnement ou de plan, lorsque la stratégie autorise l'exposition. |
| `tool.call.started`   | L'appel de tool a commencé.                                                   |
| `tool.call.delta`     | L'appel de tool a diffusé la progression ou une sortie partielle.             |
| `tool.call.completed` | L'appel de tool a réussi.                                                     |
| `tool.call.failed`    | L'appel de tool a échoué.                                                     |
| `approval.requested`  | Une exécution ou un tool nécessite une approbation.                           |
| `approval.resolved`   | L'approbation a été accordée, refusée, expirée ou annulée.                    |
| `question.requested`  | Le runtime demande une entrée à l'utilisateur ou à l'application hôte.        |
| `question.answered`   | L'application hôte a fourni une réponse.                                      |
| `artifact.created`    | Nouvel artefact disponible.                                                   |
| `artifact.updated`    | Artefact existant modifié.                                                    |
| `session.created`     | Session créée.                                                                |
| `session.updated`     | Métadonnées de session modifiées.                                             |
| `session.compacted`   | Compactage de session effectué.                                               |
| `task.updated`        | L'état de la tâche en arrière-plan a changé.                                  |
| `git.branch`          | Le runtime a observé ou modifié l'état de la branche.                         |
| `git.diff`            | Le runtime a produit ou modifié un diff.                                      |
| `git.pr`              | Le runtime a ouvert, mis à jour ou lié une demande de tirage (pull request).  |

Les charges utiles natives du runtime devraient être disponibles via `raw`, mais les applications ne devraient pas
avoir à analyser `raw` pour l'interface utilisateur normale.

## Contrat de résultat

`Run.wait()` devrait renvoyer une enveloppe de résultat stable :

```typescript
type RunResult = {
  runId: string;
  status: "accepted" | "completed" | "failed" | "cancelled" | "timed_out";
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  startedAt?: string | number;
  endedAt?: string | number;
  output?: {
    text?: string;
    messages?: SDKMessage[];
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    costUsd?: number;
  };
  artifacts?: ArtifactSummary[];
  error?: SDKError;
};
```

Le résultat doit être ennuyeux et stable. Les valeurs d'horodatage préservent la forme Gateway,
de sorte que les exécutions actuelles basées sur le cycle de vie signalent généralement des nombres
en millisecondes depuis l'époque, tandis que les adaptateurs peuvent encore présenter des chaînes ISO.
L'interface utilisateur riche, les traces de tool et les détails natifs du runtime appartiennent aux événements et artefacts.

`accepted` est un résultat d'attente non terminal : cela signifie que le délai d'attente du Gateway a expiré avant que l'exécution ne produise une fin de cycle de vie ou une erreur. Il ne doit pas être traité comme `timed_out` ; `timed_out` est réservé à une exécution qui a dépassé son propre délai d'exécution.

## Approbations et questions

Les approbations doivent être de première classe car les agents de codage traversent constamment les limites de sécurité.

```typescript
run.onApproval(async (request) => {
  if (request.kind === "tool" && request.toolName === "exec") {
    return request.approveOnce({ reason: "CI command allowed by policy" });
  }

  return request.askUser();
});
```

Les événements d'approbation doivent contenir :

- id d'approbation
- id d'exécution et id de session
- type de demande
- résumé de l'action demandée
- nom de l'outil ou action de l'environnement
- niveau de risque
- décisions disponibles
- expiration
- si la décision peut être réutilisée

Les questions sont distinctes des approbations. Une question demande à l'utilisateur ou à l'application hôte des informations. Une approbation demande la permission d'effectuer une action.

## Modèle ToolSpace

Les applications doivent comprendre la surface de l'outil sans importer les éléments internes du plugin.

```typescript
const tools = await run.toolSpace();

for (const tool of tools.list()) {
  console.log(tool.name, tool.source, tool.requiresApproval);
}
```

Le SDK doit exposer :

- métadonnées d'outil normalisées
- source : OpenClaw, MCP, plugin, canal, runtime ou application
- résumé du schéma
- politique d'approbation
- compatibilité du runtime
- si un outil est masqué, en lecture seule, capable d'écriture ou capable d'hébergement

L'invocation d'outils via le SDK doit être explicite et délimitée. La plupart des applications doivent exécuter des agents, et non appeler des outils arbitraires directement.

## Modèle d'artefact

Les artefacts doivent couvrir plus que les fichiers.

```typescript
type ArtifactSummary = {
  id: string;
  runId?: string;
  sessionId?: string;
  type: "file" | "patch" | "diff" | "log" | "media" | "screenshot" | "trajectory" | "pull_request" | "workspace";
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  expiresAt?: string;
};
```

Exemples courants :

- modifications de fichiers et fichiers générés
- lots de correctifs
- diffs VCS
- captures d'écran et sorties multimédias
- journaux et lots de traces
- liens de demande d'extraction
- trajectoires de runtime
- instantanés d'espace de travail d'environnement géré

L'accès aux artefacts doit prendre en charge la rédaction, la rétention et les URL de téléchargement sans supposer que chaque artefact est un fichier local normal.

## Modèle de sécurité

Le SDK d'application doit être explicite concernant l'autorité.

Portées de jeton recommandées :

| Portée              | Autorise                                                        |
| ------------------- | --------------------------------------------------------------- |
| `agent.read`        | Répertorier et inspecter les agents.                            |
| `agent.run`         | Démarrer les exécutions.                                        |
| `session.read`      | Lire les métadonnées de session et les messages.                |
| `session.write`     | Créer, envoyer à, bifurquer, compacter et avorter des sessions. |
| `task.read`         | Lire l'état des tâches d'arrière-plan.                          |
| `task.write`        | Annuler ou modifier la politique de notification de tâche.      |
| `approval.respond`  | Approuver ou refuser les demandes.                              |
| `tools.invoke`      | Invoquer directement les outils exposés.                        |
| `artifacts.read`    | Lister et télécharger des artefacts.                            |
| `environment.write` | Créer ou détruire des environnements gérés.                     |
| `admin`             | Opérations administratives.                                     |

Par défaut :

- pas de transfert de secrets par défaut
- pas de passage de variable d'environnement non restreint
- références de secrets au lieu de valeurs de secrets
- stratégie de bac à sable et de réseau explicite
- rétention explicite de l'environnement distant
- approbations pour l'exécution sur l'hôte, sauf si la politique prouve le contraire
- événements d'exécution bruts expurgés avant leur départ du Gateway sauf si l'appelant dispose d'une
  portée diagnostique plus élevée

## Provider d'environnement géré

Les agents gérés doivent être implémentés en tant que providers d'environnement.

```typescript
type EnvironmentProvider = {
  id: string;
  capabilities: {
    checkout?: boolean;
    sandbox?: boolean;
    networkPolicy?: boolean;
    secrets?: boolean;
    artifacts?: boolean;
    logs?: boolean;
    pullRequests?: boolean;
    longRunning?: boolean;
  };
};
```

La première implémentation n'a pas besoin d'être un SaaS hébergé. Elle peut cibler
les hôtes de nœud existants, les espaces de travail éphémères, les runners de type CI
ou les environnements de type Testbox. Le contrat important est :

1. préparer l'espace de travail
2. lier l'environnement sécurisé et les secrets
3. démarrer l'exécution
4. diffuser les événements
5. collecter les artefacts
6. nettoyer ou conserver selon la politique

Une fois que cela est stable, un service cloud hébergé peut implémenter le même contrat
provider.

## Structure du package

Packages recommandés :

| Package                 | Objectif                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `@openclaw/sdk`         | SDK public de haut niveau et client de bas niveau généré pour le Gateway.         |
| `@openclaw/sdk-react`   | React hooks optionnels pour les tableaux de bord et les créateurs d'applications. |
| `@openclaw/sdk-testing` | Helpers de test et faux serveur Gateway pour les intégrations d'applications.     |

Le dépôt dispose déjà de `openclaw/plugin-sdk/*` pour les plugins. Gardez cet espace de noms
séparé pour éviter de confondre les auteurs de plugins avec les développeurs d'applications.

## Stratégie de client généré

Le client de bas niveau doit être généré à partir de schémas de protocole du Gateway versionnés,
puis enveloppé par des classes ergonomiques écrites à la main.

Superposition :

1. Schéma Gateway source de vérité.
2. Client TypeScript de bas niveau généré.
3. Validateurs d'exécution pour les entrées externes et les charges utables d'événements.
4. Wrappers de haut niveau `OpenClaw`, `Agent`, `Session`, `Run`, `Task` et `Artifact`.
5. Exemples de cookbook et tests d'intégration.

Avantages :

- la dérive du protocole est visible
- les tests peuvent comparer les méthodes générées avec les exportations Gateway
- App SDK reste indépendant des composants internes de Plugin SDK
- les consommateurs de bas niveau ont toujours un accès complet au protocole
- les consommateurs de haut niveau bénéficient de la petite API produit API

## Connexes

- [App SDK OpenClaw](/fr/concepts/openclaw-sdk)
- [Référence Gateway RPC](/fr/reference/rpc)
- [Boucle d'agent](/fr/concepts/agent-loop)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Tâches en arrière-plan](/fr/automation/tasks)
- [Agents ACP](/fr/tools/acp-agents)
- [Vue d'ensemble de Plugin SDK](/fr/plugins/sdk-overview)
