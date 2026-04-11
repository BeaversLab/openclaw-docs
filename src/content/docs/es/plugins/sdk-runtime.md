---
title: "Asistentes de tiempo de ejecución del complemento"
sidebarTitle: "Asistentes de tiempo de ejecución"
summary: "api.runtime: los asistentes de tiempo de ejecución inyectados disponibles para los complementos"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

# Auxiliares de tiempo de ejecución de complementos

Referencia del objeto `api.runtime` inyectado en cada complemento durante
el registro. Utilice estos asistentes en lugar de importar directamente los internos del host.

<Tip>**¿Buscas un tutorial?** Consulta [Complementos de canal](/en/plugins/sdk-channel-plugins) o [Complementos de proveedor](/en/plugins/sdk-provider-plugins) para obtener guías paso a paso que muestran estos asistentes en contexto.</Tip>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Espacios de nombres de tiempo de ejecución

### `api.runtime.agent`

Identidad del agente, directorios y gestión de sesiones.

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

// Run an embedded Pi agent
const agentDir = api.runtime.agent.resolveAgentDir(cfg);
const result = await api.runtime.agent.runEmbeddedPiAgent({
  sessionId: "my-plugin:task-1",
  runId: crypto.randomUUID(),
  sessionFile: path.join(agentDir, "sessions", "my-plugin-task-1.jsonl"),
  workspaceDir: api.runtime.agent.resolveAgentWorkspaceDir(cfg),
  prompt: "Summarize the latest changes",
  timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg),
});
```

Los **asistentes del almacén de sesión** se encuentran en `api.runtime.agent.session`:

```typescript
const storePath = api.runtime.agent.session.resolveStorePath(cfg);
const store = api.runtime.agent.session.loadSessionStore(cfg);
await api.runtime.agent.session.saveSessionStore(cfg, store);
const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
```

### `api.runtime.agent.defaults`

Constantes predeterminadas de modelo y proveedor:

```typescript
const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
```

### `api.runtime.subagent`

Inicie y gestione ejecuciones de subagentes en segundo plano.

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
  Las anulaciones de modelo (`provider`/`model`) requieren la aceptación del operador a través de
  `plugins.entries.<id>.subagent.allowModelOverride: true` en la configuración.
  Los complementos que no son de confianza aún pueden ejecutar subagentes, pero se rechazan las solicitudes de anulación.
</Warning>

### `api.runtime.taskFlow`

Vincula un tiempo de ejecución de Task Flow a una clave de sesión de OpenClaw existente o a un contexto de herramienta de confianza,
luego crea y gestiona Task Flows sin pasar un propietario en cada llamada.

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

Use `bindSession({ sessionKey, requesterOrigin })` cuando ya tenga una
clave de sesión de OpenClaw confiable de su propia capa de enlace. No se enlace desde la entrada
sin procesar del usuario.

### `api.runtime.tts`

Síntesis de texto a voz.

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

Utiliza la configuración central de `messages.tts` y la selección del proveedor. Devuelve el búfer de audio PCM

- la frecuencia de muestreo.

### `api.runtime.mediaUnderstanding`

Análisis de imágenes, audio y video.

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

Devuelve `{ text: undefined }` cuando no se produce ninguna salida (por ejemplo, entrada omitida).

<Info>`api.runtime.stt.transcribeAudioFile(...)` permanece como un alias de compatibilidad para `api.runtime.mediaUnderstanding.transcribeAudioFile(...)`.</Info>

### `api.runtime.imageGeneration`

Generación de imágenes.

```typescript
const result = await api.runtime.imageGeneration.generate({
  prompt: "A robot painting a sunset",
  cfg: api.config,
});

const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
```

### `api.runtime.webSearch`

Búsqueda web.

```typescript
const providers = api.runtime.webSearch.listProviders({ config: api.config });

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: { query: "OpenClaw plugin SDK", count: 5 },
});
```

### `api.runtime.media`

Utilidades de medios de bajo nivel.

```typescript
const webMedia = await api.runtime.media.loadWebMedia(url);
const mime = await api.runtime.media.detectMime(buffer);
const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
const metadata = await api.runtime.media.getImageMetadata(filePath);
const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
```

### `api.runtime.config`

Carga y escritura de configuración.

```typescript
const cfg = await api.runtime.config.loadConfig();
await api.runtime.config.writeConfigFile(cfg);
```

### `api.runtime.system`

Utilidades a nivel de sistema.

```typescript
await api.runtime.system.enqueueSystemEvent(event);
api.runtime.system.requestHeartbeatNow();
const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
const hint = api.runtime.system.formatNativeDependencyHint(pkg);
```

### `api.runtime.events`

Suscripciones a eventos.

```typescript
api.runtime.events.onAgentEvent((event) => {
  /* ... */
});
api.runtime.events.onSessionTranscriptUpdate((update) => {
  /* ... */
});
```

### `api.runtime.logging`

Registro.

```typescript
const verbose = api.runtime.logging.shouldLogVerbose();
const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
```

### `api.runtime.modelAuth`

Resolución de autenticación de modelos y proveedores.

```typescript
const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
  provider: "openai",
  cfg,
});
```

### `api.runtime.state`

Resolución del directorio de estado.

```typescript
const stateDir = api.runtime.state.resolveStateDir();
```

### `api.runtime.tools`

Factorías de herramientas de memoria y CLI.

```typescript
const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
api.runtime.tools.registerMemoryCli(/* ... */);
```

### `api.runtime.channel`

Asistentes de tiempo de ejecución específicos del canal (disponibles cuando se carga un complemento de canal).

`api.runtime.channel.mentions` es la superficie compartida de la política de menciones entrantes para
los complementos de canal incluidos que utilizan la inyección en tiempo de ejecución:

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

Asistentes de mención disponibles:

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

`api.runtime.channel.mentions` intencionalmente no expone los ayudantes de compatibilidad más antiguos `resolveMentionGating*`. Prefiera la ruta normalizada `{ facts, policy }`.

## Almacenar referencias de tiempo de ejecución

Use `createPluginRuntimeStore` para almacenar la referencia del tiempo de ejecución para usarla fuera de la devolución de llamada `register`:

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>("my-plugin runtime not initialized");

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

## Otros campos de nivel superior `api`

Más allá de `api.runtime`, el objeto de API también proporciona:

| Campo                    | Tipo                      | Descripción                                                                                                       |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id. del complemento                                                                                               |
| `api.name`               | `string`                  | Nombre para mostrar del complemento                                                                               |
| `api.config`             | `OpenClawConfig`          | Instantánea de configuración actual (instantánea de tiempo de ejecución activa en memoria cuando esté disponible) |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuración específica del complemento de `plugins.entries.<id>.config`                                         |
| `api.logger`             | `PluginLogger`            | Registrador con ámbito (`debug`, `info`, `warn`, `error`)                                                         |
| `api.registrationMode`   | `PluginRegistrationMode`  | Modo de carga actual; `"setup-runtime"` es la ventana de inicio/configuración previa ligera a la entrada completa |
| `api.resolvePath(input)` | `(string) => string`      | Resuelve una ruta relativa a la raíz del complemento                                                              |

## Relacionado

- [Información general del SDK](/en/plugins/sdk-overview) -- referencia de subruta
- [Puntos de entrada del SDK](/en/plugins/sdk-entrypoints) -- opciones `definePluginEntry`
- [Funciones internas del complemento](/en/plugins/architecture) -- modelo de capacidad y registro
