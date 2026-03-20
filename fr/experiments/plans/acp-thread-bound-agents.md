---
summary: "Integrate ACP coding agents via a first-class ACP control plane in core and plugin-backed runtimes (acpx first)"
owner: "onutc"
status: "draft"
last_updated: "2026-02-25"
title: "ACP Thread Bound Agents"
---

# ACP Thread Bound Agents

## Overview

This plan defines how OpenClaw should support ACP coding agents in thread-capable channels (Discord first) with production-level lifecycle and recovery.

Related document:

- [Unified Runtime Streaming Refactor Plan](/fr/experiments/plans/acp-unified-streaming-refactor)

Target user experience:

- a user spawns or focuses an ACP session into a thread
- user messages in that thread route to the bound ACP session
- agent output streams back to the same thread persona
- session can be persistent or one shot with explicit cleanup controls

## Decision summary

Long term recommendation is a hybrid architecture:

- OpenClaw core owns ACP control plane concerns
  - session identity and metadata
  - thread binding and routing decisions
  - delivery invariants and duplicate suppression
  - lifecycle cleanup and recovery semantics
- ACP runtime backend is pluggable
  - first backend is an acpx-backed plugin service
  - runtime does ACP transport, queueing, cancel, reconnect

OpenClaw should not reimplement ACP transport internals in core.
OpenClaw should not rely on a pure plugin-only interception path for routing.

## North-star architecture (holy grail)

Treat ACP as a first-class control plane in OpenClaw, with pluggable runtime adapters.

Non-negotiable invariants:

- every ACP thread binding references a valid ACP session record
- every ACP session has explicit lifecycle state (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- every ACP run has explicit run state (`queued`, `running`, `completed`, `failed`, `cancelled`)
- spawn, bind, and initial enqueue are atomic
- command retries are idempotent (no duplicate runs or duplicate Discord outputs)
- bound-thread channel output is a projection of ACP run events, never ad-hoc side effects

Long-term ownership model:

- `AcpSessionManager` est le seul rédacteur ACP et orchestrateur
- le gestionnaire réside d'abord dans le processus de la passerelle ; peut être déplacé vers un sidecar dédié plus tard derrière la même interface
- par clé de session ACP, le gestionnaire possède un acteur en mémoire (exécution de commandes sérialisée)
- les adaptateurs (`acpx`, futurs backends) sont uniquement des implémentations de transport/runtime

Modèle de persistance à long terme :

- déplacer l'état du plan de contrôle ACP vers un magasin SQLite dédié (mode WAL) sous le répertoire d'état OpenClaw
- garder `SessionEntry.acp` comme une projection de compatibilité pendant la migration, et non comme source de vérité
- stocker les événements ACP en ajout seul pour prendre en charge la relecture, la récupération après plantage et la livraison déterministe

### Stratégie de livraison (pont vers le saint graal)

- pont à court terme
  - garder les mécanismes actuels de liaison de thread et la surface de configuration ACP existante
  - corriger les bugs de métadonnées et acheminer les tours ACP via une seule branche ACP centrale
  - ajouter immédiatement des clés d'idempotence et des vérifications de routage sécurisé par défaut (fail-closed)
- basculement à long terme
  - déplacer la source de vérité ACP vers la base de données du plan de contrôle + acteurs
  - rendre la livraison à thread lié purement basée sur la projection d'événements
  - supprimer le comportement de repli hérité qui dépend des métadonnées d'entrée de session opportunistes

## Pourquoi pas uniquement un plugin pur

Les crochets (hooks) de plugin actuels ne sont pas suffisants pour le routage de bout en bout des sessions ACP sans modifications du cœur.

- le routage entrant à partir de la liaison de thread se résout en une clé de session dans la distribution centrale d'abord
- les crochets de message sont du type « feu et oublie » et ne peuvent pas court-circuiter le chemin de réponse principal
- les commandes de plugin sont adaptées aux opérations de contrôle, mais pas pour remplacer le flux de distribution central par tour

Résultat :

- Le runtime ACP peut être transformé en plugin
- la branche de routage ACP doit exister dans le cœur

## Fondation existante à réutiliser

Déjà implémenté et doit rester canonique :

- la cible de liaison de thread prend en charge `subagent` et `acp`
- la substitution du routage de thread entrant se résout par liaison avant la distribution normale
- identité de thread sortant via webhook dans la livraison de réponse
- flux `/focus` et `/unfocus` avec compatibilité de cible ACP
- magasin de liaisons persistant avec restauration au démarrage
- cycle de vie de dissociation lors de l'archivage, de la suppression, du désaccentuation, de la réinitialisation et de la suppression

Ce plan étend cette fondation plutôt que de la remplacer.

## Architecture

### Modèle de limite (Boundary)

Core (doit être dans le cœur de OpenClaw) :

- Branche de distribution en mode session ACP dans le pipeline de réponse
- arbitrage de la livraison pour éviter la duplication du parent et du thread
- persistance du plan de contrôle ACP (avec une projection de compatibilité `SessionEntry.acp` pendant la migration)
- sémantique de dissociation du cycle de vie et du runtime liée à la réinitialisation/suppression de la session

Backend de plugin (implémentation acpx) :

- supervision des workers du runtime ACP
- invocation du processus acpx et analyse des événements
- gestionnaires de commandes ACP (`/acp ...`) et UX de l'opérateur
- configurations par défaut et diagnostics spécifiques au backend

### Modèle de propriété du runtime

- un processus de passerelle possède l'état d'orchestration ACP
- l'exécution ACP s'exécute dans des processus enfants supervisés via le backend acpx
- la stratégie de processus est de longue durée par clé de session ACP active, et non par message

Cela évite les coûts de démarrage à chaque invite et rend les sémantiques d'annulation et de reconnexion fiables.

### Contrat de runtime Core

Ajouter un contrat de runtime ACP principal afin que le code de routage ne dépende pas des détails de CLI et puisse changer de backends sans modifier la logique de distribution :

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

Détail de l'implémentation :

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
  - `scope`, `idempotency_key`, `result_json`, `created_at`, `(scope, idempotency_key)` unique

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
- les ID de processus et les sockets restent uniquement en mémoire
- le cycle de vie durable et l'état d'exécution résident dans la base de données ACP, et non dans le JSON de session générique
- si le propriétaire du runtime meurt, la passerelle se réhydrate à partir de la base de données ACP et reprend à partir des points de contrôle

### Routage et livraison

Entrant :

- conserver la recherche de liaison de fil actuelle comme première étape de routage
- si la cible liée est une session ACP, router vers la branche du runtime ACP au lieu de `getReplyFromConfig`
- la commande `/acp steer` explicite utilise `mode: "steer"`

Sortant :

- le flux d'événements ACP est normalisé en blocs de réponse OpenClaw
- la cible de livraison est résolue via le chemin de destination lié existant
- lorsqu'un fil lié est actif pour ce tour de session, l'achèvement du channel parent est supprimé

Politique de diffusion en continu :

- diffuser la sortie partielle avec une fenêtre de regroupement
- intervalle min et octets de chunk max configurables pour rester sous les limites de taux Discord
- le message final est toujours émis lors de l'achèvement ou de l'échec

### Machines à états et limites de transaction

Machine à états de session :

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

Machine à états d'exécution :

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

Frontières de transaction requises :

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

Aucun succès partiel n'est autorisé à travers ces frontières.

### Modèle d'acteur par session

`AcpSessionManager` exécute un acteur par clé de session ACP :

- la boîte aux lettres de l'acteur sérialise les effets secondaires `submit`, `cancel`, `close` et `stream`
- l'acteur possède l'hydratation du handle d'exécution et le cycle de vie du processus de l'adaptateur d'exécution pour cette session
- l'acteur écrit les événements d'exécution dans l'ordre (`seq`) avant toute livraison Discord
- l'acteur met à jour les points de contrôle de livraison après un envoi sortant réussi

Cela élimine les conditions de concurrence inter-tours et empêche la sortie de fil en double ou hors ordre.

### Idempotence et projection de livraison

Toutes les actions ACP externes doivent comporter des clés d'idempotence :

- spawn idempotency key
- prompt/steer idempotency key
- cancel idempotency key
- close idempotency key

Règles de livraison :

- Les messages Discord sont dérivés de `acp_events` plus `acp_delivery_checkpoint`
- les nouvelles tentatives reprennent à partir du point de contrôle sans renvoyer les morceaux déjà livrés
- l'émission de la réponse finale est exactement une fois par exécution à partir de la logique de projection

### Récupération et auto-guérison

Au démarrage de la passerelle :

- charger les sessions ACP non terminales (`creating`, `idle`, `running`, `cancelling`, `error`)
- recréer les acteurs paresseusement au premier événement entrant ou avec empressement sous plafond configuré
- réconcilier toutes les exécutions `running` manquant des battements de cœur et marquer `failed` ou récupérer via l'adaptateur

Sur un message de fil Discord entrant :

- si la liaison existe mais que la session ACP est manquante, échouer en mode fermé avec un message explicite de liaison obsolète
- optionnellement dissocier automatiquement la liaison obsolète après validation sûre par l'opérateur
- ne jamais acheminer silencieusement les liaisons ACP obsolètes vers le chemin normal LLM

### Cycle de vie et sécurité

Opérations prises en charge :

- annuler l'exécution actuelle : `/acp cancel`
- dissocier le thread : `/unfocus`
- fermer la session ACP : `/acp close`
- fermeture automatique des sessions inactives par TTL effectif

politique de TTL :

- le TTL effectif est le minimum de
  - TTL global/session
  - TTL de liaison de thread Discord
  - TTL du propriétaire du runtime ACP

Contrôles de sécurité :

- liste d'autorisation des agents ACP par nom
- restreindre les racines de l'espace de travail pour les sessions ACP
- transmission de la liste d'autorisation env
- sessions ACP simultanées maximales par compte et globalement
- temporisation de redémarrage bornée pour les plantages du runtime

## Surface de configuration

Clés Core :

- `acp.enabled`
- `acp.dispatch.enabled` (interrupteur d'arrêt du routage ACP indépendant)
- `acp.backend` (par défaut `acpx`)
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store` (par défaut `sqlite`)
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

Clés Plugin/backend (section plugin acpx) :

- remplacements de commande/chemin backend
- liste d'autorisation env backend
- préréglages backend par agent
- délais d'attente de démarrage/arrêt backend
- nombre maximum d'exécutions en cours par session backend

## Spécification de l'implémentation

### Modules du plan de contrôle (nouveau)

Ajouter des modules de plan de contrôle ACP dédiés dans le core :

- `src/acp/control-plane/manager.ts`
  - possède les acteurs ACP, les transitions de cycle de vie, la sérialisation des commandes
- `src/acp/control-plane/store.ts`
  - gestion du schéma SQLite, transactions, aides aux requêtes
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
  - ne doit plus être la source de vérité après le basculement de la migration

### Invariants requis (doit être appliqué dans le code)

- la création de session ACP et la liaison de thread (thread bind) sont atomiques (transaction unique)
- il y a au plus une exécution active par acteur de session ACP à la fois
- l'événement `seq` augmente strictement par exécution
- le point de contrôle de livraison (delivery checkpoint) ne dépasse jamais le dernier événement validé
- la relecture d'idempotence renvoie la charge utile de succès précédente pour les clés de commande en double
- les métadonnées ACP obsolètes/manquantes ne peuvent pas être acheminées vers le chemin de réponse normal non-ACP

### Points de contact Core

Fichiers Core à modifier :

- `src/auto-reply/reply/dispatch-from-config.ts`
  - la branche ACP appelle `AcpSessionManager.submit` et la livraison par projection d'événements
  - supprimer le repli (fallback) ACP direct qui contourne les invariants du plan de contrôle
- `src/auto-reply/reply/inbound-context.ts` (ou la limite de contexte normalisée la plus proche)
  - exposer les clés de routage normalisées et les graines d'idempotence pour le plan de contrôle ACP
- `src/config/sessions/types.ts`
  - garder `SessionEntry.acp` comme champ de compatibilité projection-seulement
- `src/gateway/server-methods/sessions.ts`
  - réinitialiser/supprimer/archiver doit appeler le chemin de transaction de fermeture/déligation (close/unbind) du gestionnaire ACP
- `src/infra/outbound/bound-delivery-router.ts`
  - appliquer le comportement de destination échouant en position fermée (fail-closed) pour les tours de session liés ACP
- `src/discord/monitor/thread-bindings.ts`
  - ajouter des assistants de validation de liaison obsolète ACP connectés aux recherches du plan de contrôle
- `src/auto-reply/reply/commands-acp.ts`
  - acheminer spawn/cancel/close/steer via les API du gestionnaire ACP
- `src/agents/acp-spawn.ts`
  - arrêter les écritures de métadonnées ad hoc ; appeler la transaction spawn du gestionnaire ACP
- `src/plugin-sdk/**` et le pont du runtime de plugin
  - exposer proprement l'enregistrement du backend ACP et la sémantique de santé

Fichiers Core explicitement non remplacés :

- `src/discord/monitor/message-handler.preflight.ts`
  - garder le comportement de remplacement de liaison de thread (thread binding override) comme le résolveur de clé de session canonique

### API de registre du runtime ACP

Ajouter un module de registre Core :

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
- les recherches de runtime sont en lecture seule et locales au processus

### contrat de plugin de runtime acpx (détail d'implémentation)

Pour le premier backend de production (`extensions/acpx`), OpenClaw et acpx sont
connectés via un contrat de commande strict :

- id du backend : `acpx`
- id du service de plugin : `acpx-runtime`
- encodage du descripteur d'exécution : `runtimeSessionName = acpx:v1:<base64url(json)>`
- champs de charge utile encodés :
  - `name` (session nommée acpx ; utilise OpenClaw `sessionKey`)
  - `agent` (commande d'agent acpx)
  - `cwd` (racine de l'espace de travail de session)
  - `mode` (`persistent | oneshot`)

Mapping des commandes :

- garantir la session :
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- tour d'invite :
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- annuler :
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- fermer :
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

Flux continu :

- OpenClaw consomme les événements nd de `acpx --format json --json-strict`
- `text` => `text_delta/output`
- `thought` => `text_delta/thought`
- `tool_call` => `tool_call`
- `done` => `done`
- `error` => `error`

### Correctif du schéma de session

Correctif `SessionEntry` dans `src/config/sessions/types.ts` :

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

- phase A : double écriture (projection `acp` + source de vérité ACP SQLite)
- phase B : lecture principale depuis ACP SQLite, lecture de secours depuis l'ancien `SessionEntry.acp`
- phase C : la commande de migration remplit les lignes ACP manquantes à partir d'entrées héritées valides
- phase D : suppression de la lecture de secours et maintien de la projection comme optionnelle uniquement pour l'expérience utilisateur
- les champs hérités (`cliSessionIds`, `claudeCliSessionId`) restent inchangés

### Contrat d'erreur

Ajouter des codes d'erreur ACP stables et des messages destinés à l'utilisateur :

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
- journaliser l'erreur détaillée du backend/système uniquement dans les journaux d'exécution
- ne jamais revenir silencieusement au chemin normal LLM lorsque l'acheminement ACP a été explicitement sélectionné

### Arbitrage de livraison en double

Règle de routage unique pour les tours liés à l'ACP :

- si une liaison de fil active existe pour la session ACP cible et le contexte du demandeur, délivrer uniquement à ce fil lié
- ne pas envoyer non plus au channel parent pour le même tour
- si la sélection de la destination liée est ambiguë, échouer en mode fermé avec une erreur explicite (pas de repli implicite vers le parent)
- si aucune liaison active n'existe, utiliser le comportement de destination de session normal

### Observabilité et préparation opérationnelle

Métriques requises :

- nombre de succès/échecs de spawn ACP par backend et code d'erreur
- centiles de latence d'exécution ACP (attente de file d'attente, temps de tour d'exécution, temps de projection de livraison)
- nombre de redémarrages de l'acteur ACP et motif de redémarrage
- nombre de détections de liaison périmée
- taux de réussite de relecture d'idempotence
- compteurs de nouvelle tentative et de limite de taux de livraison Discord

Journaux requis :

- journaux structurés indexés par `sessionKey`, `runId`, `backend`, `threadId`, `idempotencyKey`
- journaux explicites de transition d'état pour les machines à états de session et d'exécution
- journaux de commande de l'adaptateur avec arguments sûrs pour le masquage et résumé de sortie

Diagnostics requis :

- `/acp sessions` inclut l'état, l'exécution active, la dernière erreur et l'état de la liaison
- `/acp doctor` (ou équivalent) valide l'enregistrement du backend, l'intégrité du magasin et les liaisons périmées

### Priorité de configuration et valeurs effectives

Priorité d'activation de l'ACP :

- remplacement de compte : `channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- remplacement de channel : `channels.discord.threadBindings.spawnAcpSessions`
- portail ACP global : `acp.enabled`
- portail de répartition : `acp.dispatch.enabled`
- disponibilité du backend : backend enregistré pour `acp.backend`

Comportement d'activation automatique :

- lorsque l'ACP est configuré (`acp.enabled=true`, `acp.dispatch.enabled=true`, ou
  `acp.backend=acpx`), l'activation automatique du plugin marque `plugins.entries.acpx.enabled=true`
  sauf s'il est sur la liste de refus ou désactivé explicitement

Valeur effective du TTL :

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### Plan de test

Tests unitaires :

- `src/acp/runtime/registry.test.ts` (nouveau)
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts` (nouveau)
- `src/infra/outbound/bound-delivery-router.test.ts` (étendre les cas ACP fail-closed)
- `src/config/sessions/types.test.ts` ou les tests session-store les plus proches (persistance des métadonnées ACP)

Tests d'intégration :

- `src/discord/monitor/reply-delivery.test.ts` (comportement de la cible de livraison ACP liée)
- `src/discord/monitor/message-handler.preflight*.test.ts` (continuité du routage par session-key ACP liée)
- tests du runtime du plugin acpx dans le package backend (service register/start/stop + normalisation des événements)

Tests de bout en bout du Gateway :

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` (étendre la couverture du cycle de vie de réinitialisation/suppression ACP)
- Aller-retour e2e de tour de thread ACP pour spawn, message, stream, cancel, unfocus, reprise après redémarrage

### Garde de déploiement

Ajouter un interrupteur (kill switch) indépendant pour la répartition ACP :

- `acp.dispatch.enabled` par défaut `false` pour la première version
- lorsque désactivé :
  - Les commandes de contrôle ACP spawn/focus peuvent toujours lier des sessions
  - Le chemin de répartition ACP ne s'active pas
  - l'utilisateur reçoit un message explicite indiquant que la répartition ACP est désactivée par la stratégie
- après validation canary, la valeur par défaut peut être basculée sur `true` dans une version ultérieure

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
- `/session idle` et `/session max-age` remplacent l'ancienne substitution du TTL

## Déploiement progressif

### Phase 0 ADR et gel du schéma

- livrer l'ADR pour la propriété du plan de contrôle ACP et les limites de l'adaptateur
- geler le schéma de base de données (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- définir les codes d'erreur ACP stables, le contrat d'événement et les gardes de transition d'état

### Phase 1 Fondations du plan de contrôle dans le cœur

- implémenter `AcpSessionManager` et le runtime d'acteur par session
- implémenter le magasin SQLite ACP et les assistants de transaction
- implémenter le magasin d'idempotence et les assistants de relecture
- implémenter les modules d'ajout d'événements et de point de contrôle de livraison
- connecter les API spawn/cancel/close au gestionnaire avec des garanties transactionnelles

### Phase 2 Intégration du routage et du cycle de vie de base

- acheminer les tours ACP liés au thread depuis le pipeline de répartition vers le gestionnaire ACP
- appliquer un routage fail-closed lorsque les invariants de liaison/session ACP échouent
- intégrer le cycle de vie reset/delete/archive/unfocus avec les transactions de fermeture/déconnexion ACP
- ajouter la détection de liaison obsolète et une stratégie de déconnexion automatique facultative

### Phase 3 Adaptateur/plugin backend acpx

- implémenter l'adaptateur `acpx` par rapport au contrat d'exécution (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- ajouter les contrôles de santé du backend et l'enregistrement du démarrage/arrêt
- normaliser les événements nd acpx en événements d'exécution ACP
- appliquer les délais d'attente backend, la supervision des processus et la stratégie de redémarrage/attente

### Phase 4 Projection de livraison et UX du channel (Discord d'abord)

- implémenter la projection de channel pilotée par les événements avec reprise à partir du point de contrôle (Discord d'abord)
- regrouper les blocs de diffusion en continu avec une stratégie de vidage tenant compte de la limitation du débit
- garantir un message de finition final exactement une fois par exécution
- livrer `/acp spawn`, `/acp cancel`, `/acp steer`, `/acp close`, `/acp sessions`

### Phase 5 Migration et basculement

- introduire l'écriture double vers la projection `SessionEntry.acp` plus la source de vérité ACP SQLite
- ajouter un utilitaire de migration pour les lignes de métadonnées ACP héritées
- basculer le chemin de lecture vers le primaire ACP SQLite
- supprimer le routage de repli hérité qui dépend de `SessionEntry.acp` manquant

### Phase 6 Durcissement, SLO et limites d'échelle

- appliquer les limites de concurrence (global/compte/session), les stratégies de file d'attente et les budgets de délai d'attente
- ajouter la télémétrie complète, les tableaux de bord et les seuils d'alerte
- test de chaos pour la récupération après crash et la suppression des livraisons en double
- publier le runbook pour la panne du backend, la corruption de la base de données et la correction des liaisons obsolètes

### Liste de vérification complète de la mise en œuvre

- modules et tests du plan de contrôle principal
- migrations de base de données et plan de retour en arrière
- Intégration de l'API du gestionnaire ACP via la répartition et les commandes
- interface d'enregistrement de l'adaptateur dans le pont du runtime du plugin
- implémentation et tests de l'adaptateur acpx
- logique de projection de delivery channel compatible avec les threads et relecture à partir du point de contrôle (Discord en priorité)
- hooks de cycle de vie pour la réinitialisation/suppression/archivage/perte de focus
- détecteur de liaison obsolète et diagnostics orientés opérateur
- tests de validation et de priorité de la configuration pour toutes les nouvelles clés ACP
- documentation opérationnelle et manuel de troubleshooting

## Plan de test

Tests unitaires :

- Limites des transactions de la base de données ACP (atomicité du spawn/bind/enqueue, annulation, fermeture)
- Gardes de transition de la machine à états ACP pour les sessions et les exécutions
- sémantique de réservation/relecture d'idempotence pour toutes les commandes ACP
- sérialisation et ordre de la file d'attente de l'acteur par session
- analyseur d'événements acpx et regroupeur de fragments
- redémarrage du superviseur de runtime et politique de backoff
- priorité de configuration et calcul du TTL effectif
- sélection de branche de routage ACP core et comportement fail-closed lorsque le backend/session est invalide

Tests d'intégration :

- faux processus d'adaptateur ACP pour le streaming déterministe et le comportement d'annulation
- intégration du gestionnaire ACP + répartition avec persistance transactionnelle
- routage entrant lié au thread vers la clé de session ACP
- la livraison sortante liée au thread supprime la duplication dans le channel parent
- la relecture à partir du point de contrôle récupère après un échec de livraison et reprend à partir du dernier événement
- enregistrement du service de plugin et démontage du backend du runtime ACP

Tests de bout en bout du Gateway :

- générer un ACP avec un thread, échanger des invites multi-tours, perdre le focus
- redémarrage de la passerelle avec la base de données ACP persistante et les liaisons, puis continuer la même session
- les sessions ACP simultanées dans plusieurs threads n'ont aucune interférence
- les nouvelles tentatives de commande en double (même clé d'idempotence) ne créent pas d'exécutions ou de réponses en double
- le scénario de liaison obsolète génère une erreur explicite et un comportement de nettoyage automatique facultatif

## Risques et atténuations

- Livraisons en double pendant la transition
  - Atténuation : résolveur de destination unique et point de contrôle d'événement idempotent
- Rotation des processus de runtime sous charge
  - Atténuation : propriétaires par session de longue durée + limites de simultanéité + backoff
- Plugin absent ou mal configuré
  - Atténuation : erreur explicite orientée opérateur et routage ACP fail-closed (pas de repli implicite vers le chemin de session normal)
- Confusion de configuration entre les portes subagent et ACP
  - Atténuation : clés ACP explicites et retour de commande incluant la source de la stratégie effective
- Corruption du magasin du plan de contrôle ou bogues de migration
  - Atténuation : mode WAL, hooks de sauvegarde/restauration, tests de fumée de migration et diagnostics de repli en lecture seule
- Interblocages d'acteurs ou famine de la boîte aux lettres
  - Atténuation : chiens de garde, sondes de santé des acteurs et profondeur de boîte aux lettres bornée avec télémétrie de rejet

## Liste de vérification d'acceptation

- La création de session ACP peut créer ou lier un thread dans un adaptateur de canal pris en charge (actuellement Discord)
- tous les messages du thread sont acheminés uniquement vers la session ACP liée
- Les sorties ACP apparaissent dans la même identité de thread avec diffusion en continu ou par lots
- aucune sortie en double dans le canal parent pour les tours liés
- spawn+bind+initial enqueue sont atomiques dans le magasin persistant
- Les nouvelles tentatives de commande ACP sont idempotentes et ne dupliquent pas les exécutions ou les sorties
- cancel, close, unfocus, archive, reset et delete effectuent un nettoyage déterministe
- le redémarrage après crash préserve le mappage et reprend la continuité multi-tours
- les sessions ACP liées à un thread simultanées fonctionnent indépendamment
- l'absence d'état du backend ACP produit une erreur claire et exploitable
- les liaisons obsolètes sont détectées et affichées explicitement (avec un auto-nettoyage sécurisé optionnel)
- les mesures et diagnostics du plan de contrôle sont disponibles pour les opérateurs
- la nouvelle couverture unitaire, d'intégration et e2e passe

## Addendum : refactorisations ciblées pour l'implémentation actuelle (statut)

Ce sont des suites non bloquantes pour garder le chemin ACP maintenable après l'atterrissage de l'ensemble de fonctionnalités actuel.

### 1) Centraliser l'évaluation de la stratégie de distribution ACP (terminé)

- implémenté via des assistants de stratégie ACP partagés dans `src/acp/policy.ts`
- la distribution, les gestionnaires de cycle de vie de commande ACP et le chemin de création ACP consomment désormais la logique de stratégie partagée

### 2) Diviser le gestionnaire de commande ACP par domaine de sous-commande (terminé)

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

import en from "/components/footer/en.mdx";

<en />
