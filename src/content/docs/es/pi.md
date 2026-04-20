---
title: "Arquitectura de Integración Pi"
summary: "Arquitectura de la integración del agente Pi integrado en OpenClaw y el ciclo de vida de la sesión"
read_when:
  - Understanding Pi SDK integration design in OpenClaw
  - Modifying agent session lifecycle, tooling, or provider wiring for Pi
---

# Arquitectura de Integración Pi

Este documento describe cómo OpenClaw se integra con [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) y sus paquetes relacionados (`pi-ai`, `pi-agent-core`, `pi-tui`) para potenciar sus capacidades de agente de IA.

## Resumen

OpenClaw utiliza el pi SDK para integrar un agente de codificación de IA en su arquitectura de puerta de enlace de mensajería. En lugar de generar pi como un subproceso o usar el modo RPC, OpenClaw importa e instancia directamente el `AgentSession` de pi a través de `createAgentSession()`. Este enfoque integrado proporciona:

- Control total sobre el ciclo de vida de la sesión y el manejo de eventos
- Inyección de herramientas personalizadas (mensajería, sandbox, acciones específicas del canal)
- Personalización del prompt del sistema por canal/contexto
- Persistencia de sesión con soporte de ramificación/compactación
- Rotación del perfil de autenticación multicuenta con conmutación por error
- Cambio de modelo agnóstico al proveedor

## Dependencias de Paquetes

```json
{
  "@mariozechner/pi-agent-core": "0.64.0",
  "@mariozechner/pi-ai": "0.64.0",
  "@mariozechner/pi-coding-agent": "0.64.0",
  "@mariozechner/pi-tui": "0.64.0"
}
```

| Paquete           | Propósito                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pi-ai`           | Abstracciones principales de LLM: `Model`, `streamSimple`, tipos de mensaje, APIs de proveedor                     |
| `pi-agent-core`   | Bucle del agente, ejecución de herramientas, tipos `AgentMessage`                                                  |
| `pi-coding-agent` | SDK de alto nivel: `createAgentSession`, `SessionManager`, `AuthStorage`, `ModelRegistry`, herramientas integradas |
| `pi-tui`          | Componentes de UI de terminal (utilizados en el modo TUI local de OpenClaw)                                        |

## Estructura de Archivos

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
├── pi-hooks/                      # Custom pi hooks
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

Los tiempos de ejecución de acciones de mensajes específicos del canal ahora residen en los directorios de extensión propiedad del complemento
en lugar de bajo `src/agents/tools`, por ejemplo:

- los archivos de tiempo de ejecución de acciones del complemento de Discord
- el archivo de tiempo de ejecución de acciones del complemento de Slack
- el archivo de tiempo de ejecución de acciones del complemento de Telegram
- el archivo de tiempo de ejecución de acciones del complemento de WhatsApp

## Flujo de Integración Principal

### 1. Ejecución de un Agente Incorporado

El punto de entrada principal es `runEmbeddedPiAgent()` en `pi-embedded-runner/run.ts`:

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
  model: "claude-sonnet-4-6",
  timeoutMs: 120_000,
  runId: "run-abc",
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text, payload.mediaUrls);
  },
});
```

### 2. Creación de Sesión

Dentro de `runEmbeddedAttempt()` (llamado por `runEmbeddedPiAgent()`), se utiliza el pi SDK:

```typescript
import { createAgentSession, DefaultResourceLoader, SessionManager, SettingsManager } from "@mariozechner/pi-coding-agent";

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

### 3. Suscripción de Eventos

`subscribeEmbeddedPiSession()` se suscribe a los eventos `AgentSession` de pi:

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

Los eventos manejados incluyen:

- `message_start` / `message_end` / `message_update` (texto/pensamiento en streaming)
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `turn_start` / `turn_end`
- `agent_start` / `agent_end`
- `auto_compaction_start` / `auto_compaction_end`

### 4. Generación de Prompts

Después de la configuración, se le envía un prompt a la sesión:

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

El SDK maneja el bucle completo del agente: enviar al LLM, ejecutar llamadas a herramientas, transmitir respuestas.

La inyección de imágenes es local al prompt: OpenClaw carga las referencias de imágenes del prompt actual y
las pasa a través de `images` solo para ese turno. No vuelve a escanear turnos de historial antiguos
para volver a inyectar cargas de imágenes.

## Arquitectura de Herramientas

### Canalización de Herramientas

1. **Herramientas base**: el `codingTools` de pi (read, bash, edit, write)
2. **Reemplazos personalizados**: OpenClaw reemplaza bash con `exec`/`process`, personaliza read/edit/write para el sandbox
3. **Herramientas de OpenClaw**: mensajería, navegador, lienzo, sesiones, cron, puerta de enlace, etc.
4. **Herramientas de Canal**: herramientas de acción específicas de Discord/Telegram/Slack/WhatsApp
5. **Filtrado de Políticas**: Herramientas filtradas por perfil, proveedor, agente, grupo, políticas de sandbox
6. **Normalización de Esquemas**: Esquemas limpiados de peculiaridades de Gemini/OpenAI
7. **Envoltura de AbortSignal**: Herramientas envueltas para respetar las señales de aborto

### Adaptador de Definición de Herramientas

El `AgentTool` de pi-agent-core tiene una firma `execute` diferente a la `ToolDefinition` de pi-coding-agent. El adaptador en `pi-tool-definition-adapter.ts` salva esta diferencia:

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

### Estrategia de División de Herramientas

`splitSdkTools()` pasa todas las herramientas a través de `customTools`:

```typescript
export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }) {
  return {
    builtInTools: [], // Empty. We override everything
    customTools: toToolDefinitions(options.tools),
  };
}
```

Esto asegura que el filtrado de políticas de OpenClaw, la integración de sandbox y el conjunto de herramientas extendido permanezcan consistentes entre proveedores.

## Construcción del Prompt del Sistema

El prompt del sistema se construye en `buildAgentSystemPrompt()` (`system-prompt.ts`). Ensambla un prompt completo con secciones que incluyen Tooling, Tool Call Style, Safety guardrails, OpenClaw CLI reference, Skills, Docs, Workspace, Sandbox, Messaging, Reply Tags, Voice, Silent Replies, Heartbeats, Runtime metadata, además de Memory y Reactions cuando están habilitados, y archivos de contexto opcionales y contenido adicional del prompt del sistema. Las secciones se recortan para el modo de prompt mínimo utilizado por los subagentes.

El prompt se aplica después de la creación de la sesión mediante `applySystemPromptOverrideToSession()`:

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## Gestión de Sesiones

### Archivos de Sesión

Las sesiones son archivos JSONL con estructura de árbol (vinculación id/parentId). El `SessionManager` de Pi maneja la persistencia:

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw envuelve esto con `guardSessionManager()` para la seguridad de los resultados de las herramientas.

### Caché de Sesiones

`session-manager-cache.ts` almacena en caché las instancias de SessionManager para evitar el análisis repetido de archivos:

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### Límite del Historial

`limitHistoryTurns()` recorta el historial de conversación según el tipo de canal (DM vs grupo).

### Compactación

La auto-compresión se activa ante un desbordamiento de contexto. Las firmas comunes de desbordamiento
incluyen `request_too_large`, `context length exceeded`, `input exceeds the
maximum number of tokens`, `input token count exceeds the maximum number of
input tokens`, `input is too long for the model`, and `ollama error: context
length exceeded`. `compactEmbeddedPiSessionDirect()` maneja la
compresión manual:

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## Autenticación y Resolución de Modelos

### Perfiles de Autenticación

OpenClaw mantiene un almacén de perfiles de autenticación con múltiples claves API por proveedor:

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

Los perfiles rotan en caso de fallos con seguimiento de tiempo de espera:

```typescript
await markAuthProfileFailure({ store, profileId, reason, cfg, agentDir });
const rotated = await advanceAuthProfile();
```

### Resolución de Modelos

```typescript
import { resolveModel } from "./pi-embedded-runner/model.js";

const { model, error, authStorage, modelRegistry } = resolveModel(provider, modelId, agentDir, config);

// Uses pi's ModelRegistry and AuthStorage
authStorage.setRuntimeApiKey(model.provider, apiKeyInfo.apiKey);
```

### Conmutación por Error

`FailoverError` activa el modelo alternativo cuando está configurado:

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

## Extensiones de Pi

OpenClaw carga extensiones pi personalizadas para un comportamiento especializado:

### Salvaguarda de Compactación

`src/agents/pi-hooks/compaction-safeguard.ts` añade salvaguardas a la compresión, incluyendo la presupuestación adaptativa de tokens además de resúmenes de fallos de herramientas y operaciones de archivos:

```typescript
if (resolveCompactionMode(params.cfg) === "safeguard") {
  setCompactionSafeguardRuntime(params.sessionManager, { maxHistoryShare });
  paths.push(resolvePiExtensionPath("compaction-safeguard"));
}
```

### Poda de Contexto

`src/agents/pi-hooks/context-pruning.ts` implementa la poda de contexto basada en cache-TTL:

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

## Respuestas de Transmisión y Bloques

### Fragmentación de Bloques

`EmbeddedBlockChunker` gestiona el texto de flujo continuo en bloques de respuesta discretos:

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### Eliminación de Etiquetas Thinking/Final

La salida de flujo continuo se procesa para eliminar los bloques `<think>`/`<thinking>` y extraer el contenido `<final>`:

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // Strip <think>...</think> content
  // If enforceFinalTag, only return <final>...</final> content
};
```

### Directivas de Respuesta

Las directivas de respuesta como `[[media:url]]`, `[[voice]]`, `[[reply:id]]` se analizan y extraen:

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## Manejo de Errores

### Clasificación de Errores

`pi-embedded-helpers.ts` clasifica los errores para su manejo adecuado:

```typescript
isContextOverflowError(errorText)     // Context too large
isCompactionFailureError(errorText)   // Compaction failed
isAuthAssistantError(lastAssistant)   // Auth failure
isRateLimitAssistantError(...)        // Rate limited
isFailoverAssistantError(...)         // Should failover
classifyFailoverReason(errorText)     // "auth" | "rate_limit" | "quota" | "timeout" | ...
```

### Respaldo de Nivel de Pensamiento

Si un nivel de pensamiento no es compatible, se retrocede:

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

## Integración con Sandbox

Cuando el modo sandbox está habilitado, las herramientas y las rutas están restringidas:

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

## Manejo Específico del Proveedor

### Anthropic

- Limpieza de cadenas mágicas de rechazo
- Validación de turnos para roles consecutivos
- Validación estricta de parámetros de herramientas Pi de origen

### Google/Gemini

- Saneamiento del esquema de herramientas propiedad del plugin

### OpenAI

- Herramienta `apply_patch` para modelos Codex
- Manejo de degradación del nivel de pensamiento

## Integración TUI

OpenClaw también tiene un modo TUI local que utiliza componentes pi-tui directamente:

```typescript
// src/tui/tui.ts
import { ... } from "@mariozechner/pi-tui";
```

Esto proporciona la experiencia de terminal interactiva similar al modo nativo de pi.

## Diferencias clave con la CLI de Pi

| Aspecto                  | CLI de Pi                                | OpenClaw integrado                                                                            |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Invocación               | Comando `pi` / RPC                       | SDK vía `createAgentSession()`                                                                |
| Herramientas             | Herramientas de codificación por defecto | Suite de herramientas personalizada de OpenClaw                                               |
| Prompt del sistema       | AGENTS.md + prompts                      | Dinámico por canal/contexto                                                                   |
| Almacenamiento de sesión | `~/.pi/agent/sessions/`                  | `~/.openclaw/agents/<agentId>/sessions/` (o `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`) |
| Autenticación            | Credencial única                         | Multi-perfil con rotación                                                                     |
| Extensiones              | Cargadas desde disco                     | Programático + rutas de disco                                                                 |
| Manejo de eventos        | Renderizado TUI                          | Basado en devoluciones de llamada (onBlockReply, etc.)                                        |

## Consideraciones futuras

Áreas para posible reestructuración:

1. **Alineación de firmas de herramientas**: Actualmente adaptando entre firmas de pi-agent-core y pi-coding-agent
2. **Envoltura del gestor de sesiones**: `guardSessionManager` añade seguridad pero aumenta la complejidad
3. **Carga de extensiones**: Podría usar el `ResourceLoader` de pi más directamente
4. **Complejidad del gestor de streaming**: `subscribeEmbeddedPiSession` ha crecido mucho
5. ** peculiaridades del proveedor**: Muchas rutas de código específicas del proveedor que pi podría manejar potencialmente

## Pruebas

La cobertura de la integración de Pi abarca estas suites:

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
- `src/agents/pi-hooks/**/*.test.ts`

En vivo/opcional:

- `src/agents/pi-embedded-runner-extraparams.live.test.ts` (habilitar `OPENCLAW_LIVE_TEST=1`)

Para ver los comandos de ejecución actuales, consulte [Flujo de trabajo de desarrollo de Pi](/es/pi-dev).
