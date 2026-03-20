---
title: "Architecture d'intégration Pi"
summary: "Architecture de l'intégration de l'agent Pi embarqué d'OpenClaw et du cycle de vie de session"
read_when:
  - Compréhension de la conception de l'intégration du SDK Pi dans OpenClaw
  - Modification du cycle de vie de session de l'agent, des outils ou du câblage du provider pour Pi
---

# Architecture d'intégration Pi

Ce document décrit comment OpenClaw s'intègre avec [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) et ses packages associés (`pi-ai`, `pi-agent-core`, `pi-tui`) pour alimenter ses capacités d'agent IA.

## Vue d'ensemble

OpenClaw utilise le SDK Pi pour intégrer un agent de codage IA dans son architecture de passerelle de messagerie. Au lieu de lancer pi en tant que sous-processus ou d'utiliser le mode RPC, OpenClaw importe et instancie directement le `AgentSession` de pi via `createAgentSession()`. Cette approche intégrée permet :

- Contrôle total du cycle de vie de la session et de la gestion des événements
- Injection d'outils personnalisés (messagerie, sandbox, actions spécifiques au canal)
- Personnalisation du système de prompt par canal/contexte
- Persistance de la session avec prise en charge de la ramification/compaction
- Rotation des profils d'authentification multi-comptes avec basculement
- Changement de modèle agnostique par fournisseur

## Dépendances de paquets

```json
{
  "@mariozechner/pi-agent-core": "0.49.3",
  "@mariozechner/pi-ai": "0.49.3",
  "@mariozechner/pi-coding-agent": "0.49.3",
  "@mariozechner/pi-tui": "0.49.3"
}
```

| Paquet           | Objectif                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `pi-ai`           | Abstractions LLM principales : `Model`, `streamSimple`, types de messages, APIs fournisseur                           |
| `pi-agent-core`   | Boucle d'agent, exécution d'outils, types `AgentMessage`                                                       |
| `pi-coding-agent` | SDK de haut niveau : `createAgentSession`, `SessionManager`, `AuthStorage`, `ModelRegistry`, outils intégrés |
| `pi-tui`          | Composants de l'interface utilisateur Terminal (utilisés dans le mode TUI local d'OpenClaw)                                             |

## Structure des fichiers

```
src/agents/
├── pi-embedded-runner.ts          # Re-exports from pi-embedded-runner/
├── pi-embedded-runner/
│   ├── run.ts                     # Main entry: runEmbeddedPiAgent()
│   ├── run/
│   │   ├── attempt.ts             # Single attempt logic with session setup
│   │   ├── params.ts              # RunEmbeddedPiAgentParams type
│   │   ├── payloads.ts            # Build response payloads from run results
│   │   ├── images.ts              # Vision model image injection
│   │   └── types.ts               # EmbeddedRunAttemptResult
│   ├── abort.ts                   # Abort error detection
│   ├── cache-ttl.ts               # Cache TTL tracking for context pruning
│   ├── compact.ts                 # Manual/auto compaction logic
│   ├── extensions.ts              # Load pi extensions for embedded runs
│   ├── extra-params.ts            # Provider-specific stream params
│   ├── google.ts                  # Google/Gemini turn ordering fixes
│   ├── history.ts                 # History limiting (DM vs group)
│   ├── lanes.ts                   # Session/global command lanes
│   ├── logger.ts                  # Subsystem logger
│   ├── model.ts                   # Model resolution via ModelRegistry
│   ├── runs.ts                    # Active run tracking, abort, queue
│   ├── sandbox-info.ts            # Sandbox info for system prompt
│   ├── session-manager-cache.ts   # SessionManager instance caching
│   ├── session-manager-init.ts    # Session file initialization
│   ├── system-prompt.ts           # System prompt builder
│   ├── tool-split.ts              # Split tools into builtIn vs custom
│   ├── types.ts                   # EmbeddedPiAgentMeta, EmbeddedPiRunResult
│   └── utils.ts                   # ThinkLevel mapping, error description
├── pi-embedded-subscribe.ts       # Session event subscription/dispatch
├── pi-embedded-subscribe.types.ts # SubscribeEmbeddedPiSessionParams
├── pi-embedded-subscribe.handlers.ts # Event handler factory
├── pi-embedded-subscribe.handlers.lifecycle.ts
├── pi-embedded-subscribe.handlers.types.ts
├── pi-embedded-block-chunker.ts   # Streaming block reply chunking
├── pi-embedded-messaging.ts       # Messaging tool sent tracking
├── pi-embedded-helpers.ts         # Error classification, turn validation
├── pi-embedded-helpers/           # Helper modules
├── pi-embedded-utils.ts           # Formatting utilities
├── pi-tools.ts                    # createOpenClawCodingTools()
├── pi-tools.abort.ts              # AbortSignal wrapping for tools
├── pi-tools.policy.ts             # Tool allowlist/denylist policy
├── pi-tools.read.ts               # Read tool customizations
├── pi-tools.schema.ts             # Tool schema normalization
├── pi-tools.types.ts              # AnyAgentTool type alias
├── pi-tool-definition-adapter.ts  # AgentTool -> ToolDefinition adapter
├── pi-settings.ts                 # Settings overrides
├── pi-extensions/                 # Custom pi extensions
│   ├── compaction-safeguard.ts    # Safeguard extension
│   ├── compaction-safeguard-runtime.ts
│   ├── context-pruning.ts         # Cache-TTL context pruning extension
│   └── context-pruning/
├── model-auth.ts                  # Auth profile resolution
├── auth-profiles.ts               # Profile store, cooldown, failover
├── model-selection.ts             # Default model resolution
├── models-config.ts               # models.json generation
├── model-catalog.ts               # Model catalog cache
├── context-window-guard.ts        # Context window validation
├── failover-error.ts              # FailoverError class
├── defaults.ts                    # DEFAULT_PROVIDER, DEFAULT_MODEL
├── system-prompt.ts               # buildAgentSystemPrompt()
├── system-prompt-params.ts        # System prompt parameter resolution
├── system-prompt-report.ts        # Debug report generation
├── tool-summaries.ts              # Tool description summaries
├── tool-policy.ts                 # Tool policy resolution
├── transcript-policy.ts           # Transcript validation policy
├── skills.ts                      # Skill snapshot/prompt building
├── skills/                        # Skill subsystem
├── sandbox.ts                     # Sandbox context resolution
├── sandbox/                       # Sandbox subsystem
├── channel-tools.ts               # Channel-specific tool injection
├── openclaw-tools.ts              # OpenClaw-specific tools
├── bash-tools.ts                  # exec/process tools
├── apply-patch.ts                 # apply_patch tool (OpenAI)
├── tools/                         # Individual tool implementations
│   ├── browser-tool.ts
│   ├── canvas-tool.ts
│   ├── cron-tool.ts
│   ├── gateway-tool.ts
│   ├── image-tool.ts
│   ├── message-tool.ts
│   ├── nodes-tool.ts
│   ├── session*.ts
│   ├── web-*.ts
│   └── ...
└── ...
```

Les environnements d'exécution des actions de message spécifiques au canal résident désormais dans les répertoires d'extension détenus par le plugin au lieu d'être sous `src/agents/tools`, par exemple :

- `extensions/discord/src/actions/runtime*.ts`
- `extensions/slack/src/action-runtime.ts`
- `extensions/telegram/src/action-runtime.ts`
- `extensions/whatsapp/src/action-runtime.ts`

## Flux d'intégration principal

### 1. Exécution d'un agent intégré

Le point d'entrée principal est `runEmbeddedPiAgent()` dans `pi-embedded-runner/run.ts` :

```typescript
import { runEmbeddedPiAgent } from "./agents/pi-embedded-runner.js";

const result = await runEmbeddedPiAgent({
  sessionId: "user-123",
  sessionKey: "main:whatsapp:+1234567890",
  sessionFile: "/path/to/session.jsonl",
  workspaceDir: "/path/to/workspace",
  config: openclawConfig,
  prompt: "Hello, how are you?",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  timeoutMs: 120_000,
  runId: "run-abc",
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text, payload.mediaUrls);
  },
});
```

### 2. Création de session

Dans `runEmbeddedAttempt()` (appelé par `runEmbeddedPiAgent()`), le SDK pi est utilisé :

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";

const resourceLoader = new DefaultResourceLoader({
  cwd: resolvedWorkspace,
  agentDir,
  settingsManager,
  additionalExtensionPaths,
});
await resourceLoader.reload();

const { session } = await createAgentSession({
  cwd: resolvedWorkspace,
  agentDir,
  authStorage: params.authStorage,
  modelRegistry: params.modelRegistry,
  model: params.model,
  thinkingLevel: mapThinkingLevel(params.thinkLevel),
  tools: builtInTools,
  customTools: allCustomTools,
  sessionManager,
  settingsManager,
  resourceLoader,
});

applySystemPromptOverrideToSession(session, systemPromptOverride);
```

### 3. Abonnement aux événements

`subscribeEmbeddedPiSession()` s'abonne aux événements `AgentSession` de pi :

```typescript
const subscription = subscribeEmbeddedPiSession({
  session: activeSession,
  runId: params.runId,
  verboseLevel: params.verboseLevel,
  reasoningMode: params.reasoningLevel,
  toolResultFormat: params.toolResultFormat,
  onToolResult: params.onToolResult,
  onReasoningStream: params.onReasoningStream,
  onBlockReply: params.onBlockReply,
  onPartialReply: params.onPartialReply,
  onAgentEvent: params.onAgentEvent,
});
```

Les événements gérés incluent :

- `message_start` / `message_end` / `message_update` (texte/réflexion en flux continu)
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `turn_start` / `turn_end`
- `agent_start` / `agent_end`
- `auto_compaction_start` / `auto_compaction_end`

### 4. Prompting

Après la configuration, la session est sollicitée :

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

Le SDK gère la boucle complète de l'agent : envoi au LLM, exécution des appels de tool, diffusion des réponses.

L'injection d'images est locale au prompt : OpenClaw charge les références d'image à partir du prompt actuel et
les transmet via `images` uniquement pour ce tour. Il ne réexamine pas les tours d'historique plus anciens
pour réinjecter les charges utiles d'image.

## Tool Architecture

### Tool Pipeline

1. **Base Tools** : pi's `codingTools` (read, bash, edit, write)
2. **Custom Replacements** : OpenClaw remplace bash par `exec`/`process`, personnalise read/edit/write pour le bac à sable
3. **OpenClaw Tools** : messaging, browser, canvas, sessions, cron, gateway, etc.
4. **Channel Tools** : outils d'action spécifiques à Discord/Telegram/Slack/WhatsApp
5. **Policy Filtering** : Outils filtrés par profil, provider, agent, groupe, stratégies de bac à sable
6. **Schema Normalization** : Schémas nettoyés pour les particularités de Gemini/OpenAI
7. **AbortSignal Wrapping** : Outils encapsulés pour respecter les signaux d'abandon

### Tool Definition Adapter

Le `AgentTool` de pi-agent-core a une signature `execute` différente de celle du `ToolDefinition` de pi-coding-agent. L'adaptateur dans `pi-tool-definition-adapter.ts` fait le pont entre les deux :

```typescript
export function toToolDefinitions(tools: AnyAgentTool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    label: tool.label ?? name,
    description: tool.description ?? "",
    parameters: tool.parameters,
    execute: async (toolCallId, params, onUpdate, _ctx, signal) => {
      // pi-coding-agent signature differs from pi-agent-core
      return await tool.execute(toolCallId, params, signal, onUpdate);
    },
  }));
}
```

### Stratégie de séparation des outils

`splitSdkTools()` passe tous les outils via `customTools` :

```typescript
export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }) {
  return {
    builtInTools: [], // Empty. We override everything
    customTools: toToolDefinitions(options.tools),
  };
}
```

Cela garantit que le filtrage des stratégies, l'integration du bac à sable et l'ensemble d'outils étendus de OpenClaw restent cohérents entre les fournisseurs.

## Construction du prompt système

Le prompt système est construit dans `buildAgentSystemPrompt()` (`system-prompt.ts`). Il assemble un prompt complet avec des sections incluant Tooling, Tool Call Style, Safety guardrails, la référence OpenClaw CLI, Skills, Docs, Workspace, Sandbox, Messaging, Reply Tags, Voice, Silent Replies, Heartbeats, Runtime metadata, plus Memory et Reactions lorsqu'ils sont activés, ainsi que des fichiers de contexte optionnels et du contenu de prompt système supplémentaire. Les sections sont réduites pour le mode de prompt minimal utilisé par les sous-agents.

Le prompt est appliqué après la création de la session via `applySystemPromptOverrideToSession()` :

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## Gestion de session

### Fichiers de session

Les sessions sont des fichiers JSONL avec une structure d'arbre (liaison id/parentId). Le `SessionManager` de Pi gère la persistance :

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw encapsule ceci avec `guardSessionManager()` pour la sécurité des résultats des outils.

### Mise en cache de session

`session-manager-cache.ts` met en cache les instances SessionManager pour éviter l'analyse répétée des fichiers :

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### Limitation de l'historique

`limitHistoryTurns()` réduit l'historique des conversations en fonction du type de canal (DM vs groupe).

### Compactage

L'auto-compactage se déclenche lors d'un dépassement de contexte. `compactEmbeddedPiSessionDirect()` gère le compactage manuel :

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## Authentification et résolution de modèle

### Profils d'authentification

OpenClaw maintient un magasin de profils d'authentification avec plusieurs clés API par fournisseur :

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

Les profils tournent en cas d'échec avec un suivi du temps de refroidissement :

```typescript
await markAuthProfileFailure({ store, profileId, reason, cfg, agentDir });
const rotated = await advanceAuthProfile();
```

### Résolution de modèle

```typescript
import { resolveModel } from "./pi-embedded-runner/model.js";

const { model, error, authStorage, modelRegistry } = resolveModel(
  provider,
  modelId,
  agentDir,
  config,
);

// Uses pi's ModelRegistry and AuthStorage
authStorage.setRuntimeApiKey(model.provider, apiKeyInfo.apiKey);
```

### Basculement (Failover)

`FailoverError` déclenche le basculement de modèle lorsqu'il est configuré :

```typescript
if (fallbackConfigured && isFailoverErrorMessage(errorText)) {
  throw new FailoverError(errorText, {
    reason: promptFailoverReason ?? "unknown",
    provider,
    model: modelId,
    profileId,
    status: resolveFailoverStatus(promptFailoverReason),
  });
}
```

## Extensions Pi

OpenClaw charge des extensions pi personnalisées pour des comportements spécialisés :

### Sauvegarde de compactage

`src/agents/pi-extensions/compaction-safeguard.ts` ajoute des garde-fous au compactage, y compris une budgétisation adaptative des jetons ainsi que des résumés des échecs d'outils et des opérations de fichiers :

```typescript
if (resolveCompactionMode(params.cfg) === "safeguard") {
  setCompactionSafeguardRuntime(params.sessionManager, { maxHistoryShare });
  paths.push(resolvePiExtensionPath("compaction-safeguard"));
}
```

### Élagage de contexte

`src/agents/pi-extensions/context-pruning.ts` implémente l'élagage de contexte basé sur le cache-TTL :

```typescript
if (cfg?.agents?.defaults?.contextPruning?.mode === "cache-ttl") {
  setContextPruningRuntime(params.sessionManager, {
    settings,
    contextWindowTokens,
    isToolPrunable,
    lastCacheTouchAt,
  });
  paths.push(resolvePiExtensionPath("context-pruning"));
}
```

## Streaming et réponses de bloc

### Découpage de bloc

`EmbeddedBlockChunker` gère le texte continu vers des blocs de réponse discrets :

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### Suppression des balises Thinking/Final

La sortie continue est traitée pour supprimer les blocs `<think>`/`<thinking>` et extraire le contenu `<final>` :

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // Strip <think>...</think> content
  // If enforceFinalTag, only return <final>...</final> content
};
```

### Directives de réponse

Les directives de réponse comme `[[media:url]]`, `[[voice]]`, `[[reply:id]]` sont analysées et extraites :

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## Gestion des erreurs

### Classification des erreurs

`pi-embedded-helpers.ts` classe les erreurs pour une gestion appropriée :

```typescript
isContextOverflowError(errorText)     // Context too large
isCompactionFailureError(errorText)   // Compaction failed
isAuthAssistantError(lastAssistant)   // Auth failure
isRateLimitAssistantError(...)        // Rate limited
isFailoverAssistantError(...)         // Should failover
classifyFailoverReason(errorText)     // "auth" | "rate_limit" | "quota" | "timeout" | ...
```

### Recours du niveau de réflexion

Si un niveau de réflexion n'est pas pris en charge, il revient à :

```typescript
const fallbackThinking = pickFallbackThinkingLevel({
  message: errorText,
  attempted: attemptedThinking,
});
if (fallbackThinking) {
  thinkLevel = fallbackThinking;
  continue;
}
```

## Intégration du Sandbox

Lorsque le mode Sandbox est activé, les outils et les chemins sont contraints :

```typescript
const sandbox = await resolveSandboxContext({
  config: params.config,
  sessionKey: sandboxSessionKey,
  workspaceDir: resolvedWorkspace,
});

if (sandboxRoot) {
  // Use sandboxed read/edit/write tools
  // Exec runs in container
  // Browser uses bridge URL
}
```

## Gestion spécifique au provider

### Anthropic

- Nettoyage de la chaîne magique de refus
- Validation des tours pour les rôles consécutifs
- Compatibilité des paramètres Claude Code

### Google/Gemini

- Corrections de l'ordre des tours (`applyGoogleTurnOrderingFix`)
- Assainissement du schéma d'outil (`sanitizeToolsForGoogle`)
- Assainissement de l'historique de session (`sanitizeSessionHistory`)

### OpenAI

- Outil `apply_patch` pour les modèles Codex
- Gestion de la rétrogradation du niveau de réflexion

## Intégration TUI

OpenClaw possède également un mode local TUI qui utilise directement les composants pi-tui :

```typescript
// src/tui/tui.ts
import { ... } from "@mariozechner/pi-tui";
```

Cela offre l'expérience interactive de terminal similaire au mode natif de pi.

## Différences clés avec le Pi CLI

| Aspect          | Pi CLI                  | OpenClaw Embedded                                                                              |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| Invocation      | Commande `pi` / RPC      | SDK via `createAgentSession()`                                                                 |
| Outils           | Outils de codage par défaut    | Suite d'outils personnalisée OpenClaw                                                                     |
| Invite système   | AGENTS.md + invites     | Dynamique par channel/contexte                                                                    |
| Stockage de session | `~/.pi/agent/sessions/` | `~/.openclaw/agents/<agentId>/sessions/` (ou `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`) |
| Auth            | Identifiant unique       | Multi-profil avec rotation                                                                    |
| Extensions      | Chargées depuis le disque        | Programmatique + chemins disque                                                                      |
| Gestion des événements  | Rendu TUI           | Basé sur des rappels (onBlockReply, etc.)                                                            |

## Considérations futures

Domaines potentiellement à retravailler :

1. **Alignement des signatures d'outils** : Adaptation actuellement entre les signatures pi-agent-core et pi-coding-agent
2. **Encapsulation du gestionnaire de session** : `guardSessionManager` ajoute de la sécurité mais augmente la complexité
3. **Chargement des extensions** : Pourrait utiliser le `ResourceLoader` de pi plus directement
4. **Complexité du gestionnaire de streaming** : `subscribeEmbeddedPiSession` est devenu volumineux
5. **Spécificités des providers** : De nombreux chemins de code spécifiques aux providers que pi pourrait potentiellement gérer

## Tests

La couverture de l'intégration Pi s'étend sur ces suites :

- `src/agents/pi-*.test.ts`
- `src/agents/pi-auth-json.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-embedded-helpers*.test.ts`
- `src/agents/pi-embedded-runner*.test.ts`
- `src/agents/pi-embedded-runner/**/*.test.ts`
- `src/agents/pi-embedded-subscribe*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-tool-definition-adapter*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-extensions/**/*.test.ts`

En direct/opt-in :

- `src/agents/pi-embedded-runner-extraparams.live.test.ts` (activer `OPENCLAW_LIVE_TEST=1`)

Pour les commandes d'exécution actuelles, voir [Pi Development Workflow](/fr/pi-dev).

import en from "/components/footer/en.mdx";

<en />
