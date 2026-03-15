---
summary: "Intégrer les agents de codage ACP via un plan de contrôle ACP de premier ordre dans le cœur et les runtimes pris en charge par des plugins (acpx en premier)"
owner: "onutc"
status: "brouillon"
last_updated: "2026-02-25"
title: "Agents ACP liés aux fils de discussion"
---

# Agents ACP liés aux fils de discussion

## Vue d'ensemble

Ce plan définit comment OpenClaw doit prendre en charge les agents de codage ACP dans les canaux prenant en charge les fils de discussion (Discord en priorité) avec un cycle de vie de niveau production et une récupération.

Document connexe :

- [Plan de refactorisation du flux d'exécution unifié](/fr/experiments/plans/acp-unified-streaming-refactor)

Expérience utilisateur cible :

- un utilisateur lance ou focalise une session ACP dans un fil de discussion
- les messages de l'utilisateur dans ce fil sont acheminés vers la session ACP liée
- la sortie de l'agent est diffusée vers la même persona du fil de discussion
- la session peut être persistante ou ponctuelle avec des contrôles de nettoyage explicites

## Résumé de la décision

La recommandation à long terme est une architecture hybride :

- le cœur de OpenClaw gère les préoccupations du plan de contrôle ACP
  - identité et métadonnées de session
  - liaison de fil et décisions de routage
  - invariants de livraison et suppression des doublons
  - sémantique de nettoyage du cycle de vie et de récupération
- le backend du runtime ACP est enfichable
  - le premier backend est un service de plugin pris en charge par acpx
  - le runtime effectue le transport ACP, la mise en file d'attente, l'annulation et la reconnexion

OpenClaw ne doit pas réimplémenter les internes du transport ACP dans le cœur.
OpenClaw ne doit pas reposer sur un chemin d'interception purement par plugin pour le routage.

## Architecture Nord-star (Saint Graal)

Traiter l'ACP comme un plan de contrôle de premier ordre dans OpenClaw, avec des adaptateurs de runtime enfichables.

Invariants non négociables :

- chaque liaison de fil ACP référence un enregistrement de session ACP valide
- chaque session ACP a un état de cycle de vie explicite (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- chaque exécution ACP a un état d'exécution explicite (`queued`, `running`, `completed`, `failed`, `cancelled`)
- le lancement, la liaison et la mise en file d'attente initiale sont atomiques
- les nouvelles tentatives de commande sont idempotentes (pas d'exécutions en double ni de sorties Discord en double)
- la sortie du channel lié au thread est une projection des événements d'exécution ACP, jamais des effets secondaires ad hoc

Modèle de propriété à long terme :

- `AcpSessionManager` est le seul rédacteur et orchestrateur ACP
- le gestionnaire réside d'abord dans le processus de passerelle ; peut être déplacé plus tard vers un sidecar dédié derrière la même interface
- par clé de session ACP, le gestionnaire possède un acteur en mémoire (exécution de commande sérialisée)
- les adaptateurs (`acpx`, futurs backends) sont uniquement des implémentations de transport/runtime

Modèle de persistance à long terme :

- déplacer l'état du plan de contrôle ACP vers un magasin SQLite dédié (mode WAL) sous le répertoire d'état OpenClaw
- garder `SessionEntry.acp` comme projection de compatibilité pendant la migration, pas comme source de vérité
- stocker les événements ACP en ajout seul pour prendre en charge la relecture, la récupération après incident et la livraison déterministe

### Stratégie de livraison (pont vers le saint graal)

- pont à court terme
  - conserver les mécanismes actuels de liaison de thread et la surface de configuration ACP existante
  - corriger les bugs de lacunes de métadonnées et acheminer les tours ACP via une seule branche ACP centrale
  - ajouter immédiatement des clés d'idempotence et des vérifications de routage en échec sécurisé (fail-closed)
- basculement à long terme
  - déplacer la source de vérité ACP vers la base de données du plan de contrôle + les acteurs
  - rendre la livraison liée au thread purement basée sur la projection d'événements
  - supprimer le comportement de repli hérité qui dépend des métadonnées d'entrée de session opportunistes

## Pourquoi pas uniquement un plugin pur

Les crochets de plugin actuels ne sont pas suffisants pour le routage de session ACP de bout en bout sans modifications du cœur.

- le routage entrant depuis la liaison de thread se résout d'abord en une clé de session dans la répartition centrale
- les crochets de message sont de type tirer-et-oublier (fire-and-forget) et ne peuvent pas court-circuiter le chemin de réponse principal
- les commandes de plugin sont adaptées aux opérations de contrôle, mais pas pour remplacer le flux de répartition central par tour

Résultat :

- Le runtime ACP peut être mis en plugin
- La branche de routage ACP doit exister dans le core

## Fondation existante à réutiliser

Déjà implémenté et doit rester canonique :

- la cible de liaison de thread prend en charge `subagent` et `acp`
- la substitution du routage de thread entrant se résout par liaison avant l'expédition normale
- identité de thread sortant via webhook dans la livraison de réponse
- flux `/focus` et `/unfocus` avec compatibilité de cible ACP
- magasin de liaisons persistant avec restauration au démarrage
- cycle de vie de dissociation lors de l'archivage, de la suppression, de la perte de focus, de la réinitialisation et de la suppression

Ce plan étend cette fondation plutôt que de la remplacer.

## Architecture

### Modèle de frontière

Core (doit être dans le core d'OpenClaw) :

- branche d'expédition en mode session ACP dans le pipeline de réponse
- arbitrage de livraison pour éviter la duplication parent plus thread
- persistance du plan de contrôle ACP (avec projection de compatibilité `SessionEntry.acp` pendant la migration)
- sémantique de dissociation du cycle de vie et de détachement du runtime liées à la réinitialisation/suppression de session

Backend de plugin (implémentation acpx) :

- supervision des workers du runtime ACP
- invocation de processus acpx et analyse d'événements
- gestionnaires de commandes ACP (`/acp ...`) et UX de l'opérateur
- valeurs par défaut de configuration spécifiques au backend et diagnostics

### Modèle de propriété du runtime

- un processus passerelle possède l'état d'orchestration ACP
- l'exécution ACP s'exécute dans des processus enfants supervisés via le backend acpx
- la stratégie de processus est longue durée par clé de session ACP active, et non par message

Cela évite les coûts de démarrage à chaque invite et garde les sémantiques d'annulation et de reconnexion fiables.

### Contrat du runtime core

Ajouter un contrat de runtime ACP core afin que le code de routage ne dépende pas des détails de la CLI et puisse changer de backends sans modifier la logique d'expédition :

```ts
export type AcpRuntimePromptMode = "prompt" | "steer";

export type AcpRuntimeHandle = {
  sessionKey: string;
  backend: string;
  runtimeSessionName: string;
};

export type AcpRuntimeEvent =
  | { type: "text_delta"; stream: "output" | "thought"; text: string }
  | { type: "tool_call"; name: string; argumentsText: string }
  | { type: "done"; usage?: Record<string, number> }
  | { type: "error"; code: string; message: string; retryable?: boolean };

export interface AcpRuntime {
  ensureSession(input: {
    sessionKey: string;
    agent: string;
    mode: "persistent" | "oneshot";
    cwd?: string;
    env?: Record<string, string>;
    idempotencyKey: string;
  }): Promise<AcpRuntimeHandle>;

  submit(input: {
    handle: AcpRuntimeHandle;
    text: string;
    mode: AcpRuntimePromptMode;
    idempotencyKey: string;
  }): Promise<{ runtimeRunId: string }>;

  stream(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId: string;
    onEvent: (event: AcpRuntimeEvent) => Promise<void> | void;
    signal?: AbortSignal;
  }): Promise<void>;

  cancel(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId?: string;
    reason?: string;
    idempotencyKey: string;
  }): Promise<void>;

  close(input: { handle: AcpRuntimeHandle; reason: string; idempotencyKey: string }): Promise<void>;

  health?(): Promise<{ ok: boolean; details?: string }>;
}
```

Détail d'implémentation :

- premier backend : `AcpxRuntime` livré en tant que service de plugin
- le core résout le runtime via le registre et échoue avec une erreur explicite de l'opérateur lorsqu'aucun backend de runtime ACP n'est disponible

### Modèle de données et persistance du plan de contrôle

La source de vérité à long terme est une base de données SQLite ACP dédiée (mode WAL), pour les mises à jour transactionnelles et la récupération sécurisée en cas de plantage :

- `acp_sessions`
  - `session_key` (pk), `backend`, `agent`, `mode`, `cwd`, `state`, `created_at`, `updated_at`, `last_error`
- `acp_runs`
  - `run_id` (pk), `session_key` (fk), `state`, `requester_message_id`, `idempotency_key`, `started_at`, `ended_at`, `error_code`, `error_message`
- `acp_bindings`
  - `binding_key` (pk), `thread_id`, `channel_id`, `account_id`, `session_key` (fk), `expires_at`, `bound_at`
- `acp_events`
  - `event_id` (pk), `run_id` (fk), `seq`, `kind`, `payload_json`, `created_at`
- `acp_delivery_checkpoint`
  - `run_id` (pk/fk), `last_event_seq`, `last_discord_message_id`, `updated_at`
- `acp_idempotency`
  - `scope`, `idempotency_key`, `result_json`, `created_at`, unique `(scope, idempotency_key)`

```ts
export type AcpSessionMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

Règles de stockage :

- conserver `SessionEntry.acp` comme une projection de compatibilité pendant la migration
- les identifiants de processus et les sockets restent uniquement en mémoire
- le cycle de vie durable et le statut d'exécution résident dans la base de données ACP, et non dans le JSON de session générique
- si le propriétaire du runtime meurt, la passerelle se réhydrate à partir de la base de données ACP et reprend à partir des points de contrôle

### Routage et livraison

Entrant :

- keep current thread binding lookup as first routing step
- if bound target is ACP session, route to ACP runtime branch instead of `getReplyFromConfig`
- explicit `/acp steer` command uses `mode: "steer"`

Outbound:

- ACP event stream is normalized to OpenClaw reply chunks
- delivery target is resolved through existing bound destination path
- when a bound thread is active for that session turn, parent channel completion is suppressed

Streaming policy:

- stream partial output with coalescing window
- configurable min interval and max chunk bytes to stay under Discord rate limits
- final message always emitted on completion or failure

### State machines and transaction boundaries

Session state machine:

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

Run state machine:

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

Required transaction boundaries:

- spawn transaction
  - create ACP session row
  - create/update ACP thread binding row
  - enqueue initial run row
- close transaction
  - mark session closed
  - delete/expire binding rows
  - write final close event
- cancel transaction
  - mark target run cancelling/cancelled with idempotency key

No partial success is allowed across these boundaries.

### Per-session actor model

`AcpSessionManager` runs one actor per ACP session key:

- actor mailbox serializes `submit`, `cancel`, `close`, and `stream` side effects
- actor owns runtime handle hydration and runtime adapter process lifecycle for that session
- actor writes run events in-order (`seq`) before any Discord delivery
- actor updates delivery checkpoints after successful outbound send

This removes cross-turn races and prevents duplicate or out-of-order thread output.

### Idempotency and delivery projection

Toutes les actions externes ACP doivent comporter des clés d'idempotence :

- clé d'idempotence de spawn
- clé d'idempotence de prompt/steer
- clé d'idempotence d'annulation
- clé d'idempotence de fermeture

Règles de livraison :

- Les messages Discord sont dérivés de `acp_events` plus `acp_delivery_checkpoint`
- les nouvelles tentatives reprennent à partir du point de contrôle sans renvoyer les blocs déjà livrés
- l'émission de la réponse finale est exactement une fois par exécution à partir de la logique de projection

### Récupération et auto-réparation

Au démarrage de la passerelle :

- charger les sessions ACP non terminales (`creating`, `idle`, `running`, `cancelling`, `error`)
- recréer les acteurs de manière paresseuse au premier événement entrant ou de manière proactive sous une limite configurée
- réconcilier toutes les exécutions `running` manquant des battements de cœur et marquer `failed` ou récupérer via l'adaptateur

Sur le message de fil Discord entrant :

- si une liaison existe mais que la session ACP est manquante, échouer en mode fermé avec un message explicite de liaison obsolète
- optionnellement dissocier automatiquement la liaison obsolète après validation sécurisée par l'opérateur
- ne jamais router silencieusement les liaisons ACP obsolètes vers le chemin LLM normal

### Cycle de vie et sécurité

Opérations prises en charge :

- annuler l'exécution en cours : `/acp cancel`
- dissocier le fil : `/unfocus`
- fermer la session ACP : `/acp close`
- fermer automatiquement les sessions inactives par le TTL effectif

Politique TTL :

- le TTL effectif est le minimum de
  - TTL global/session
  - TTL de liaison de fil Discord
  - TTL du propriétaire du runtime ACP

Contrôles de sécurité :

- liste blanche des agents ACP par nom
- restreindre les racines de l'espace de travail pour les sessions ACP
- transmission de la liste blanche d'environnement
- maximum de sessions ACP simultanées par compte et globalement
- temporisation de redémarrage bornée pour les plantages du runtime

## Surface de configuration

Clés principales :

- `acp.enabled`
- `acp.dispatch.enabled` (interrupteur d'arrêt du routage ACP indépendant)
- `acp.backend` (par défaut `acpx`)
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store` (`sqlite` par défaut)
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

Clés de plugin/backend (section plugin acpx) :

- remplacements de commande/chemin backend
- liste d'autorisation env backend
- préréglages backend par agent
- délais d'attente de démarrage/arrêt backend
- maximum d'exécutions en cours par session backend

## Spécification de mise en œuvre

### Modules du plan de contrôle (nouveaux)

Ajouter des modules dédiés au plan de contrôle ACP dans le cœur :

- `src/acp/control-plane/manager.ts`
  - possède les acteurs ACP, les transitions de cycle de vie, la sérialisation des commandes
- `src/acp/control-plane/store.ts`
  - gestion du schéma SQLite, transactions, assistants de requête
- `src/acp/control-plane/events.ts`
  - définitions d'événements ACP typés et sérialisation
- `src/acp/control-plane/checkpoint.ts`
  - points de contrôle de livraison durables et curseurs de relecture
- `src/acp/control-plane/idempotency.ts`
  - réservation de clé d'idempotence et relecture de réponse
- `src/acp/control-plane/recovery.ts`
  - réconciliation au démarrage et plan de réhydratation des acteurs

Modules de pont de compatibilité :

- `src/acp/runtime/session-meta.ts`
  - reste temporairement pour la projection dans `SessionEntry.acp`
  - doit cesser d'être la source de vérité après la bascule de la migration

### Invariants requis (doit être appliqué dans le code)

- La création de session ACP et la liaison de thread sont atomiques (transaction unique)
- il y a au plus une exécution active par acteur de session ACP à la fois
- l'événement `seq` augmente strictement par exécution
- le point de contrôle de livraison n'avance jamais au-delà du dernier événement validé
- la relecture idempotente renvoie la charge utile de succès précédente pour les clés de commande en double
- les métadonnées ACP obsolètes/manquantes ne peuvent pas être acheminées vers le chemin de réponse normal non-ACP

### Points de contact du cœur

Fichiers principaux à modifier :

- `src/auto-reply/reply/dispatch-from-config.ts`
  - appels de branche ACP `AcpSessionManager.submit` et livraison par projection d'événements
  - supprimer le repli direct ACP qui contourne les invariants du plan de contrôle
- `src/auto-reply/reply/inbound-context.ts` (ou la limite de contexte normalisée la plus proche)
  - exposer les clés de routage normalisées et les graines d'idempotence pour le plan de contrôle ACP
- `src/config/sessions/types.ts`
  - conserver `SessionEntry.acp` comme champ de compatibilité projection uniquement
- `src/gateway/server-methods/sessions.ts`
  - reset/delete/archive doit appeler le chemin de transaction close/unbind du gestionnaire ACP
- `src/infra/outbound/bound-delivery-router.ts`
  - appliquer un comportement de destination fail-closed pour les tours de session liés ACP
- `src/discord/monitor/thread-bindings.ts`
  - ajouter des helpers de validation de liaison obsolète ACP connectés aux recherches du plan de contrôle
- `src/auto-reply/reply/commands-acp.ts`
  - acheminer spawn/cancel/close/steer via les API du gestionnaire ACP
- `src/agents/acp-spawn.ts`
  - arrêter les écritures de métadonnées ad hoc ; appeler la transaction de spawn du gestionnaire ACP
- `src/plugin-sdk/**` et pont du runtime du plugin
  - exposer proprement l'enregistrement du backend ACP et la sémantique de santé

Fichiers principaux explicitement non remplacés :

- `src/discord/monitor/message-handler.preflight.ts`
  - garder le comportement de remplacement de liaison de fil comme le résolveur de clé de session canonique

### API du registre runtime ACP

Ajouter un module de registre principal :

- `src/acp/runtime/registry.ts`

API requise :

```ts
export type AcpRuntimeBackend = {
  id: string;
  runtime: AcpRuntime;
  healthy?: () => boolean;
};

export function registerAcpRuntimeBackend(backend: AcpRuntimeBackend): void;
export function unregisterAcpRuntimeBackend(id: string): void;
export function getAcpRuntimeBackend(id?: string): AcpRuntimeBackend | null;
export function requireAcpRuntimeBackend(id?: string): AcpRuntimeBackend;
```

Comportement :

- `requireAcpRuntimeBackend` lance une erreur typée de backend ACP manquant lorsqu'il n'est pas disponible
- le service de plugin enregistre le backend sur `start` et le désenregistre sur `stop`
- les recherches runtime sont en lecture seule et locales au processus

### contrat du plugin runtime acpx (détail d'implémentation)

Pour le premier backend de production (`extensions/acpx`), OpenClaw et acpx sont
connectés avec un contrat de commande strict :

- id du backend : `acpx`
- id du service de plugin : `acpx-runtime`
- encodage du handle runtime : `runtimeSessionName = acpx:v1:<base64url(json)>`
- champs de payload encodés :
  - `name` (session nommée acpx ; utilise `sessionKey` d'OpenClaw)
  - `agent` (commande d'agent acpx)
  - `cwd` (racine de l'espace de travail de session)
  - `mode` (`persistent | oneshot`)

Mapping de commande :

- ensure session :
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- prompt turn :
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- cancel :
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- close :
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

Streaming :

- OpenClaw consomme les événements nd depuis `acpx --format json --json-strict`
- `text` => `text_delta/output`
- `thought` => `text_delta/thought`
- `tool_call` => `tool_call`
- `done` => `done`
- `error` => `error`

### Correctif de schéma de session

Patch `SessionEntry` dans `src/config/sessions/types.ts` :

```ts
type SessionAcpMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

Champ persisté :

- `SessionEntry.acp?: SessionAcpMeta`

Règles de migration :

- phase A : double écriture (projection `acp` + source de vérité SQLite ACP)
- phase B : lecture principale depuis ACP SQLite, lecture de repli depuis l'ancien `SessionEntry.acp`
- phase C : la commande de migration remplit les lignes ACP manquantes à partir d'entrées héritées valides
- phase D : supprimer la lecture de repli et garder la projection optionnelle uniquement pour l'UX
- les champs hérités (`cliSessionIds`, `claudeCliSessionId`) restent intouchés

### Contrat d'erreur

Ajouter des codes d'erreur ACP stables et des messages orientés utilisateur :

- `ACP_BACKEND_MISSING`
  - message : `ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - message : `ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - message : `Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - message : `ACP turn failed before completion.`

Règles :

- renvoyer un message exploitable et sécurisé pour l'utilisateur dans le fil
- enregistrer l'erreur détaillée du backend/système uniquement dans les logs d'exécution
- ne jamais revenir silencieusement au chemin normal LLM lorsque le routage ACP a été explicitement sélectionné

### Arbitrage de livraison en double

Règle de routage unique pour les tours liés à l'ACP :

- si une liaison de fil active existe pour la session ACP cible et le contexte du demandeur, délivrer uniquement à ce fil lié
- ne pas envoyer non plus au channel parent pour le même tour
- si la sélection de la destination liée est ambiguë, échouer en mode fermé avec une erreur explicite (pas de repli implicite vers le parent)
- si aucune liaison active n'existe, utiliser le comportement normal de destination de session

### Observabilité et préparation opérationnelle

Métriques requises :

- Nombre de succès/échecs de génération ACP par backend et code d'erreur
- Centiles de latence d'exécution ACP (attente de file, temps de tour d'exécution, temps de projection de livraison)
- Nombre de redémarrages d'acteur ACP et raison du redémarrage
- nombre de détections de liaison obsolète
- taux de succès de relecture d'idempotence
- compteurs de nouvelle tentative de livraison et de limitation de taux Discord

Journaux requis :

- journaux structurés indexés par `sessionKey`, `runId`, `backend`, `threadId`, `idempotencyKey`
- journaux de transition d'état explicites pour les machines à états de session et d'exécution
- journaux de commande de l'adaptateur avec arguments sûrs pour la rédaction et résumé de sortie

Diagnostics requis :

- `/acp sessions` inclut l'état, l'exécution active, la dernière erreur et l'état de liaison
- `/acp doctor` (ou équivalent) valide l'enregistrement du backend, la santé du magasin et les liaisons obsolètes

### Préséance de la configuration et valeurs effectives

Préséance de l'activation ACP :

- remplacement au niveau du compte : `channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- remplacement au niveau du channel : `channels.discord.threadBindings.spawnAcpSessions`
- portail ACP global : `acp.enabled`
- portail de répartition : `acp.dispatch.enabled`
- disponibilité du backend : backend enregistré pour `acp.backend`

Comportement d'activation automatique :

- lorsque l'ACP est configuré (`acp.enabled=true`, `acp.dispatch.enabled=true`, ou
  `acp.backend=acpx`), l'activation automatique du plugin marque `plugins.entries.acpx.enabled=true`
  sauf s'il est sur la liste de refus ou désactivé explicitement

Valeur effective TTL :

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### Plan de test

Tests unitaires :

- `src/acp/runtime/registry.test.ts` (nouveau)
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts` (nouveau)
- `src/infra/outbound/bound-delivery-router.test.ts` (étendre les cas de fail-closed ACP)
- `src/config/sessions/types.test.ts` ou les tests de session-store les plus proches (persistance des métadonnées ACP)

Tests d'intégration :

- `src/discord/monitor/reply-delivery.test.ts` (comportement de la cible de livraison ACP liée)
- `src/discord/monitor/message-handler.preflight*.test.ts` (continuité du routage par clé de session ACP liée)
- tests du runtime du plugin acpx dans le package backend (enregistrement/démarrage/arrêt du service + normalisation des événements)

Tests de bout en bout du Gateway :

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` (étendre la couverture du cycle de vie de réinitialisation/suppression ACP)
- Aller-retour e2e du tour de thread ACP pour spawn, message, stream, cancel, unfocus, restart recovery

### Garde de déploiement

Ajouter un interrupteur d'arrêt (kill switch) indépendant pour la répartition ACP :

- `acp.dispatch.enabled` par défaut `false` pour la première version
- lorsqu'il est désactivé :
  - Les commandes de contrôle ACP spawn/focus peuvent toujours lier des sessions
  - Le chemin de répartition ACP ne s'active pas
  - l'utilisateur reçoit un message explicite indiquant que la répartition ACP est désactivée par la stratégie
- après validation canary, la valeur par défaut peut être changée pour `true` dans une version ultérieure

## Plan de commande et d'UX

### Nouvelles commandes

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### Compatibilité des commandes existantes

- `/focus <sessionKey>` continue de prendre en charge les cibles ACP
- `/unfocus` conserve la sémantique actuelle
- `/session idle` et `/session max-age` remplacent l'ancienne priorité TTL

## Déploiement par phases

### Phase 0 ADR et gel du schéma

- publier l'ADR pour la propriété du plan de contrôle ACP et les limites de l'adaptateur
- geler le schéma de base de données (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- définir les codes d'erreur ACP stables, le contrat d'événement et les gardes de transition d'état

### Phase 1 Fondation du plan de contrôle dans le cœur

- implémenter `AcpSessionManager` et le runtime d'acteur par session
- implémenter le magasin SQLite ACP et les assistants de transaction
- implémenter le magasin d'idempotence et les assistants de relecture
- implémenter les modules d'ajout d'événements et de point de contrôle de livraison
- connecter les API spawn/cancel/close au gestionnaire avec des garanties transactionnelles

### Phase 2 Intégration du routage principal et du cycle de vie

- acheminer les tours ACP liés au fil du pipeline de distribution vers le gestionnaire ACP
- appliquer le routage échec-fermé lorsque les invariants de liaison/session ACP échouent
- intégrer le cycle de vie reset/delete/archive/unfocus avec les transactions de fermeture/déconnexion ACP
- ajouter la détection de liaison obsolète et une politique de déconnexion automatique facultative

### Phase 3 Adaptateur/plugin backend acpx

- implémenter l'adaptateur `acpx` par rapport au contrat d'exécution (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- ajouter les contrôles de santé du backend et l'enregistrement du démarrage/arrêt
- normaliser les événements nd acpx en événements d'exécution ACP
- appliquer les délais d'attente du backend, la supervision des processus et la politique de redémarrage/attente

### Phase 4 Projection de livraison et expérience utilisateur du channel (Discord d'abord)

- implémenter la projection de channel pilotée par les événements avec reprise du point de contrôle (Discord d'abord)
- regrouper les blocs de streaming avec une politique de vidage consciente des limites de débit
- garantir un message de finition final exactement une fois par exécution
- livrer `/acp spawn`, `/acp cancel`, `/acp steer`, `/acp close`, `/acp sessions`

### Phase 5 Migration et basculement

- introduire l'écriture double vers la projection `SessionEntry.acp` plus la source de vérité SQLite ACP
- ajouter un utilitaire de migration pour les lignes de métadonnées ACP héritées
- basculer le chemin de lecture vers le SQLite ACP principal
- supprimer le routage de repli hérité qui dépend du `SessionEntry.acp` manquant

### Phase 6 Durcissement, SLO et limites d'échelle

- appliquer les limites de concurrence (global/compte/session), les politiques de file d'attente et les budgets de délai d'attente
- ajouter une télémétrie complète, des tableaux de bord et des seuils d'alerte
- tests de chaos pour la reprise après crash et la suppression des livraisons en double
- publier le runbook pour la panne du backend, la corruption de la base de données et la correction des liaisons obsolètes

### Liste de vérification complète de l'implémentation

- modules principaux du plan de contrôle et tests
- migrations de base de données et plan de retour en arrière
- intégration de l'API du gestionnaire ACP via la répartition et les commandes
- interface d'enregistrement de l'adaptateur dans le pont d'exécution du plugin
- implémentation et tests de l'adaptateur acpx
- logique de projection de livraison pour les canaux compatibles avec les fils avec rejeu à partir du point de contrôle (Discord en premier)
- crochets de cycle de vie pour la réinitialisation/suppression/archivage/perte de focus
- détecteur de liaison obsolète et diagnostics orientés opérateur
- tests de validation et de priorité de configuration pour toutes les nouvelles clés ACP
- documentation opérationnelle et runbook de dépannage

## Plan de test

Tests unitaires :

- limites des transactions de la base de données ACP (atomicité spawn/bind/enqueue, annulation, fermeture)
- gardes de transition de la machine à états ACP pour les sessions et les exécutions
- sémantique de réservation/rejeu d'idempotence pour toutes les commandes ACP
- sérialisation de l'acteur par session et ordre de la file d'attente
- analyseur d'événements acpx et regroupeur de blocs
- stratégie de redémarrage et de temporisation du superviseur d'exécution
- priorité de configuration et calcul du TTL effectif
- sélection de branche de routage ACP principale et comportement de fermeture en cas d'échec lorsque le backend/session n'est pas valide

Tests d'intégration :

- faux processus d'adaptateur ACP pour un flux déterministe et un comportement d'annulation
- intégration du gestionnaire ACP + répartition avec persistance transactionnelle
- routage entrant lié au fil vers la clé de session ACP
- la livraison sortante liée au fil supprime la duplication dans le canal parent
- le rejeu à partir du point de contrôle récupère après un échec de livraison et reprend à partir du dernier événement
- enregistrement du service de plugin et démontage du backend d'exécution ACP

Tests de bout en bout Gateway :

- créer un ACP avec un fil, échanger des invites multi-tours, perdre le focus
- redémarrage de la passerelle avec une base de données ACP persistante et des liaisons, puis poursuite de la même session
- les sessions ACP simultanées dans plusieurs fils n'ont aucune interférence croisée
- les nouvelles tentatives de commande en double (même clé d'idempotence) ne créent pas d'exécutions ou de réponses en double
- stale-binding scenario yields explicit error and optional auto-clean behavior

## Risques et atténuations

- Duplicate deliveries during transition
  - Mitigation: single destination resolver and idempotent event checkpoint
- Runtime process churn under load
  - Mitigation: long lived per session owners + concurrency caps + backoff
- Plugin absent or misconfigured
  - Mitigation: explicit operator-facing error and fail-closed ACP routing (no implicit fallback to normal session path)
- Config confusion between subagent and ACP gates
  - Mitigation: explicit ACP keys and command feedback that includes effective policy source
- Control-plane store corruption or migration bugs
  - Mitigation: WAL mode, backup/restore hooks, migration smoke tests, and read-only fallback diagnostics
- Actor deadlocks or mailbox starvation
  - Mitigation: watchdog timers, actor health probes, and bounded mailbox depth with rejection telemetry

## Acceptance checklist

- ACP session spawn can create or bind a thread in a supported channel adapter (currently Discord)
- all thread messages route to bound ACP session only
- ACP outputs appear in the same thread identity with streaming or batches
- no duplicate output in parent channel for bound turns
- spawn+bind+initial enqueue are atomic in persistent store
- ACP command retries are idempotent and do not duplicate runs or outputs
- cancel, close, unfocus, archive, reset, and delete perform deterministic cleanup
- crash restart preserves mapping and resumes multi turn continuity
- concurrent thread bound ACP sessions work independently
- ACP backend missing state produces clear actionable error
- stale bindings are detected and surfaced explicitly (with optional safe auto-clean)
- control-plane metrics and diagnostics are available for operators
- new unit, integration, and e2e coverage passes

## Addendum: targeted refactors for current implementation (status)

These are non-blocking follow-ups to keep the ACP path maintainable after the current feature set lands.

### 1) Centraliser l'évaluation de la politique de distribution ACP (terminé)

- implémenté via des assistants de stratégie ACP partagés dans `src/acp/policy.ts`
- la distribution, les gestionnaires du cycle de vie des commandes ACP et le chemin de lancement ACP consomment désormais la logique de stratégie partagée

### 2) Diviser le gestionnaire de commandes ACP par domaine de sous-commande (terminé)

- `src/auto-reply/reply/commands-acp.ts` est désormais un routeur léger
- le comportement des sous-commandes est divisé en :
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - assistants partagés dans `src/auto-reply/reply/commands-acp/shared.ts`

### 3) Diviser le gestionnaire de session ACP par responsabilité (terminé)

- le gestionnaire est divisé en :
  - `src/acp/control-plane/manager.ts` (façade publique + singleton)
  - `src/acp/control-plane/manager.core.ts` (implémentation du gestionnaire)
  - `src/acp/control-plane/manager.types.ts` (types/dépendances du gestionnaire)
  - `src/acp/control-plane/manager.utils.ts` (normalisation + fonctions d'assistance)

### 4) Nettoyage facultatif de l'adaptateur d'exécution acpx

- `extensions/acpx/src/runtime.ts` peut être divisé en :
- exécution/supervision des processus
- analyse/normalisation des événements nd
- surface de l'API d'exécution (`submit`, `cancel`, `close`, etc.)
- améliore la testabilité et rend le comportement du backend plus facile à auditer

import fr from '/components/footer/fr.mdx';

<fr />
