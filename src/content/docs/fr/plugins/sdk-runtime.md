---
title: "Helpers d'exécution de plugin"
sidebarTitle: "Helpers d'exécution"
summary: "api.runtime -- les helpers d'exécution injectés disponibles pour les plugins"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

# Assistants d'exécution de plugin

Référence de l'objet `api.runtime` injecté dans chaque plugin lors de
l'enregistrement. Utilisez ces helpers au lieu d'importer directement les éléments internes de l'hôte.

<Tip>**Vous cherchez un guide pas à pas ?** Consultez [Plugins de canal](/fr/plugins/sdk-channel-plugins) ou [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) pour des guides étape par étape qui présentent ces assistants dans leur contexte.</Tip>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Espaces de noms d'exécution

### `api.runtime.agent`

Identité de l'agent, répertoires et gestion de session.

```typescript
// Resolve the agent's working directory
const agentDir = api.runtime.agent.resolveAgentDir(cfg);

// Resolve agent workspace
const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);

// Get agent identity
const identity = api.runtime.agent.resolveAgentIdentity(cfg);

// Get default thinking level
const thinking = api.runtime.agent.resolveThinkingDefault(cfg, provider, model);

// Get agent timeout
const timeoutMs = api.runtime.agent.resolveAgentTimeoutMs(cfg);

// Ensure workspace exists
await api.runtime.agent.ensureAgentWorkspace(cfg);

// Run an embedded agent turn
const agentDir = api.runtime.agent.resolveAgentDir(cfg);
const result = await api.runtime.agent.runEmbeddedAgent({
  sessionId: "my-plugin:task-1",
  runId: crypto.randomUUID(),
  sessionFile: path.join(agentDir, "sessions", "my-plugin-task-1.jsonl"),
  workspaceDir: api.runtime.agent.resolveAgentWorkspaceDir(cfg),
  prompt: "Summarize the latest changes",
  timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg),
});
```

`runEmbeddedAgent(...)` est l'assistant neutre pour lancer un tour d'agent OpenClaw
normal depuis le code du plugin. Il utilise la même résolution de fournisseur/modèle et la
même sélection de harnais d'agent que les réponses déclenchées par le canal.

`runEmbeddedPiAgent(...)` reste un alias de compatibilité.

**Les assistants de magasin de session** se trouvent sous `api.runtime.agent.session` :

```typescript
const storePath = api.runtime.agent.session.resolveStorePath(cfg);
const store = api.runtime.agent.session.loadSessionStore(cfg);
await api.runtime.agent.session.saveSessionStore(cfg, store);
const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
```

### `api.runtime.agent.defaults`

Constantes par défaut pour le modèle et le fournisseur :

```typescript
const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
```

### `api.runtime.subagent`

Lancez et gérez les exécutions de sous-agent en arrière-plan.

```typescript
// Start a subagent run
const { runId } = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai", // optional override
  model: "gpt-4.1-mini", // optional override
  deliver: false,
});

// Wait for completion
const result = await api.runtime.subagent.waitForRun({ runId, timeoutMs: 30000 });

// Read session messages
const { messages } = await api.runtime.subagent.getSessionMessages({
  sessionKey: "agent:main:subagent:search-helper",
  limit: 10,
});

// Delete a session
await api.runtime.subagent.deleteSession({
  sessionKey: "agent:main:subagent:search-helper",
});
```

<Warning>
  Les substitutions de modèle (`provider`/`model`) nécessitent une acceptation par l'opérateur via
  `plugins.entries.<id>.subagent.allowModelOverride: true` dans la configuration.
  Les plugins non fiables peuvent toujours exécuter des sous-agents, mais les demandes de substitution sont rejetées.
</Warning>

### `api.runtime.taskFlow`

Liez un runtime Task Flow à une clé de session OpenClaw existante ou à un contexte d'outil de confiance,
puis créez et gérez des Task Flows sans avoir à passer un propriétaire à chaque appel.

```typescript
const taskFlow = api.runtime.taskFlow.fromToolContext(ctx);

const created = taskFlow.createManaged({
  controllerId: "my-plugin/review-batch",
  goal: "Review new pull requests",
});

const child = taskFlow.runTask({
  flowId: created.flowId,
  runtime: "acp",
  childSessionKey: "agent:main:subagent:reviewer",
  task: "Review PR #123",
  status: "running",
  startedAt: Date.now(),
});

const waiting = taskFlow.setWaiting({
  flowId: created.flowId,
  expectedRevision: created.revision,
  currentStep: "await-human-reply",
  waitJson: { kind: "reply", channel: "telegram" },
});
```

Utilisez `bindSession({ sessionKey, requesterOrigin })` lorsque vous possédez déjà une
clé de session OpenClaw de confiance issue de votre propre couche de liaison. Ne liez pas à partir de
saisies utilisateur brutes.

### `api.runtime.tts`

Synthèse texte-vers-parole.

```typescript
// Standard TTS
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

// Telephony-optimized TTS
const telephonyClip = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

// List available voices
const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

Utilise la configuration principale `messages.tts` et la sélection du fournisseur. Renvoie le tampon audio
PCM + le taux d'échantillonnage.

### `api.runtime.mediaUnderstanding`

Analyse d'image, d'audio et de vidéo.

```typescript
// Describe an image
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

// Transcribe audio
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  mime: "audio/ogg", // optional, for when MIME cannot be inferred
});

// Describe a video
const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});

// Generic file analysis
const result = await api.runtime.mediaUnderstanding.runFile({
  filePath: "/tmp/inbound-file.pdf",
  cfg: api.config,
});
```

Renvoie `{ text: undefined }` lorsqu aucune sortie n'est produite (par exemple, entrée ignorée).

<Info>`api.runtime.stt.transcribeAudioFile(...)` reste un alias de compatibilité pour `api.runtime.mediaUnderstanding.transcribeAudioFile(...)`.</Info>

### `api.runtime.imageGeneration`

Génération d'images.

```typescript
const result = await api.runtime.imageGeneration.generate({
  prompt: "A robot painting a sunset",
  cfg: api.config,
});

const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
```

### `api.runtime.webSearch`

Recherche web.

```typescript
const providers = api.runtime.webSearch.listProviders({ config: api.config });

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: { query: "OpenClaw plugin SDK", count: 5 },
});
```

### `api.runtime.media`

Utilitaires multimédias de bas niveau.

```typescript
const webMedia = await api.runtime.media.loadWebMedia(url);
const mime = await api.runtime.media.detectMime(buffer);
const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
const metadata = await api.runtime.media.getImageMetadata(filePath);
const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
```

### `api.runtime.config`

Chargement et écriture de la configuration.

```typescript
const cfg = await api.runtime.config.loadConfig();
await api.runtime.config.writeConfigFile(cfg);
```

### `api.runtime.system`

Utilitaires système.

```typescript
await api.runtime.system.enqueueSystemEvent(event);
api.runtime.system.requestHeartbeatNow();
const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
const hint = api.runtime.system.formatNativeDependencyHint(pkg);
```

### `api.runtime.events`

Abonnements aux événements.

```typescript
api.runtime.events.onAgentEvent((event) => {
  /* ... */
});
api.runtime.events.onSessionTranscriptUpdate((update) => {
  /* ... */
});
```

### `api.runtime.logging`

Journalisation.

```typescript
const verbose = api.runtime.logging.shouldLogVerbose();
const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
```

### `api.runtime.modelAuth`

Résolution d'authentification pour le modèle et le fournisseur.

```typescript
const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
  provider: "openai",
  cfg,
});
```

### `api.runtime.state`

Résolution du répertoire d'état.

```typescript
const stateDir = api.runtime.state.resolveStateDir();
```

### `api.runtime.tools`

Fabriques d'outils de mémoire et CLI.

```typescript
const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
api.runtime.tools.registerMemoryCli(/* ... */);
```

### `api.runtime.channel`

Helpers d'exécution spécifiques au canal (disponibles lorsqu'un plugin de canal est chargé).

`api.runtime.channel.mentions` est la surface partagée de la politique de mention entrante pour
les plugins de canal regroupés qui utilisent l'injection d'exécution :

```typescript
const mentionMatch = api.runtime.channel.mentions.matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const decision = api.runtime.channel.mentions.resolveInboundMentionDecision({
  facts: {
    canDetectMention: true,
    wasMentioned: mentionMatch.matched,
    implicitMentionKinds: api.runtime.channel.mentions.implicitMentionKindWhen("reply_to_bot", isReplyToBot),
  },
  policy: {
    isGroup,
    requireMention,
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});
```

Helpers de mention disponibles :

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

`api.runtime.channel.mentions` n'expose intentionnellement pas les anciens
helpers de compatibilité `resolveMentionGating*`. Préférez le chemin normalisé
`{ facts, policy }`.

## Stocker les références d'exécution

Utilisez `createPluginRuntimeStore` pour stocker la référence d'exécution pour une utilisation en dehors
du rappel `register` :

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "my-plugin",
  errorMessage: "my-plugin runtime not initialized",
});

// In your entry point
export default defineChannelPluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Example",
  plugin: myPlugin,
  setRuntime: store.setRuntime,
});

// In other files
export function getRuntime() {
  return store.getRuntime(); // throws if not initialized
}

export function tryGetRuntime() {
  return store.tryGetRuntime(); // returns null if not initialized
}
```

Privilégiez `pluginId` pour l'identité du magasin d'exécution. La forme de bas niveau `key` est destinée aux cas exceptionnels où un plugin a intentionnellement besoin de plus d'un emplacement d'exécution.

## Autres champs de premier niveau `api`

Au-delà de `api.runtime`, l'objet API fournit également :

| Champ                    | Type                      | Description                                                                                                        |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `api.id`                 | `string`                  | Id du plugin                                                                                                       |
| `api.name`               | `string`                  | Nom d'affichage du plugin                                                                                          |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire active lorsqu'il est disponible)        |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin à partir de `plugins.entries.<id>.config`                                       |
| `api.logger`             | `PluginLogger`            | Enregistreur délimité (`debug`, `info`, `warn`, `error`)                                                           |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre légère de démarrage/configuration pré-entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre un chemin relatif à la racine du plugin                                                                   |

## Connexes

- [Aperçu du SDK](/fr/plugins/sdk-overview) -- référence de sous-chemin
- [Points d'entrée du SDK](/fr/plugins/sdk-entrypoints) -- options `definePluginEntry`
- [Internes du plugin](/fr/plugins/architecture) -- modèle de capacité et registre
