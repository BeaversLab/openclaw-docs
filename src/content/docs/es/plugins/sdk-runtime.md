---
summary: "api.runtime: los asistentes de tiempo de ejecución inyectados disponibles para los complementos"
title: "Asistentes de tiempo de ejecución de complementos"
sidebarTitle: "Asistentes de tiempo de ejecución"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

Referencia del objeto `api.runtime` inyectado en cada complemento durante el registro. Utilice estos asistentes en lugar de importar directamente los aspectos internos del host.

<CardGroup cols={2}>
  <Card title="Complementos de canal" href="/es/plugins/sdk-channel-plugins">
    Guía paso a paso que utiliza estos asistentes en el contexto de los complementos de canal.
  </Card>
  <Card title="Complementos de proveedor" href="/es/plugins/sdk-provider-plugins">
    Guía paso a paso que utiliza estos asistentes en el contexto de los complementos de proveedor.
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Carga y escritura de configuraciones

Se prefiere la configuración que ya se ha pasado a la ruta de llamada activa, por ejemplo `api.config` durante el registro o un argumento `cfg` en las devoluciones de llamada de canal/proveedor. Esto mantiene una instantánea del proceso fluyendo a través del trabajo en lugar de volver a analizar la configuración en rutas críticas.

Use `api.runtime.config.current()` solo cuando un controlador de larga duración necesite la instantánea del proceso actual y no se haya pasado ninguna configuración a esa función. El valor devuelto es de solo lectura; clone o use un asistente de mutación antes de editar.

Las fábricas de herramientas reciben `ctx.runtimeConfig` más `ctx.getRuntimeConfig()`. Use el captador dentro de la devolución de llamada `execute` de una herramienta de larga duración cuando la configuración puede cambiar después de que se haya creado la definición de la herramienta.

Persista los cambios con `api.runtime.config.mutateConfigFile(...)` o `api.runtime.config.replaceConfigFile(...)`. Cada escritura debe elegir una política `afterWrite` explícita:

- `afterWrite: { mode: "auto" }` permite que el planificador de recarga de la puerta de enlace decida.
- `afterWrite: { mode: "restart", reason: "..." }` fuerza un reinicio limpio cuando el escritor sabe que la recarga en caliente no es segura.
- `afterWrite: { mode: "none", reason: "..." }` suprime la recarga/reinicio automático solo cuando quien llama es el propietario del seguimiento.

Los auxiliares de mutación devuelven `afterWrite` más un resumen `followUp` tipado para que los llamadores puedan registrar o probar si solicitaron un reinicio. La puerta de enlace sigue siendo la propietaria de cuándo ocurre realmente ese reinicio.

`api.runtime.config.loadConfig()` y `api.runtime.config.writeConfigFile(...)` son auxiliares de compatibilidad en desuso bajo `runtime-config-load-write`. Advierten una vez en tiempo de ejecución y permanecen disponibles para complementos externos antiguos durante la ventana de migración. Los complementos integrados no deben usarlos; los guardianes del límite de configuración fallan si el código del complemento los llama o importa esos auxiliares desde las subrutas del SDK del complemento.

Para las importaciones directas del SDK, utilice las subrutas de configuración centradas en lugar del
barril de compatibilidad amplio `openclaw/plugin-sdk/config-runtime`: `config-contracts` para
tipos, `plugin-config-runtime` para afirmaciones de configuración ya cargadas y búsqueda de entradas de complementos,
`runtime-config-snapshot` para instantáneas del proceso actual y
`config-mutation` para escrituras. Las pruebas de complementos agrupadas deben simular estas subrutas
centradas directamente en lugar de simular el barril de compatibilidad amplio.

El código de tiempo de ejecución interno de OpenClaw tiene la misma dirección: cargar la configuración una vez en el límite de la CLI, la puerta de enlace o el proceso, y luego pasar ese valor. Las escrituras de mutación exitosas actualizan la instantánea del tiempo de ejecución del proceso y avanzan su revisión interna; las cachés de larga duración deben basarse en la clave de caché propiedad del tiempo de ejecución en lugar de serializar la configuración localmente. Los módulos de tiempo de ejecución de larga duración tienen un escáner de tolerancia cero para llamadas `loadConfig()` de ambiente; use un `cfg` pasado, una solicitud `context.getRuntimeConfig()` o `getRuntimeConfig()` en un límite de proceso explícito.

Las rutas de ejecución del proveedor y del canal deben usar la instantánea de configuración del tiempo de ejecución activa, no una instantánea de archivo devuelta para la lectura o edición de la configuración. Las instantáneas de archivo preservan valores de origen como los marcadores SecretRef para la interfaz de usuario y las escrituras; las devoluciones de llamada del proveedor necesitan la vista resuelta del tiempo de ejecución. Cuando un auxiliar puede ser llamado con la instantánea de origen activa o la instantánea de tiempo de ejecución activa, enrute a través de `selectApplicableRuntimeConfig()` antes de leer las credenciales.

## Espacios de nombres del tiempo de ejecución

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Identidad del agente, directorios y gestión de sesiones.

    ```typescript
    // Resolve the agent's working directory
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);

    // Resolve agent workspace
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);

    // Get agent identity
    const identity = api.runtime.agent.resolveAgentIdentity(cfg);

    // Get default thinking level
    const thinking = api.runtime.agent.resolveThinkingDefault({
      cfg,
      provider,
      model,
    });

    // Validate a user-provided thinking level against the active provider profile
    const policy = api.runtime.agent.resolveThinkingPolicy({ provider, model });
    const level = api.runtime.agent.normalizeThinkingLevel("extra high");
    if (level && policy.levels.some((entry) => entry.id === level)) {
      // pass level to an embedded run
    }

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

    `runEmbeddedAgent(...)` es el asistente neutral para iniciar un turno normal del agente OpenClaw desde el código del complemento. Utiliza la misma resolución de proveedor/modelo y selección de arnés del agente que las respuestas activadas por el canal.

    `runEmbeddedPiAgent(...)` permanece como un alias de compatibilidad.

    `resolveThinkingPolicy(...)` devuelve los niveles de pensamiento admitidos por el proveedor/modelo y el predeterminado opcional. Los complementos del proveedor son propietarios del perfil específico del modelo a través de sus ganchos de pensamiento, por lo que los complementos de herramientas deben llamar a este asistente de ejecución en lugar de importar o duplicar las listas de proveedores.

    `normalizeThinkingLevel(...)` convierte el texto del usuario, como `on`, `x-high` o `extra high`, al nivel almacenado canónico antes de verificarlo contra la política resuelta.

    **Los asistentes del almacén de sesiones** están en `api.runtime.agent.session`:

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(storePath);
    await api.runtime.agent.session.updateSessionStore(storePath, (nextStore) => {
      // Patch one entry without replacing the whole file from stale state.
      nextStore[sessionKey] = { ...nextStore[sessionKey], thinkingLevel: "high" };
    });
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

    Prefiera `updateSessionStore(...)` o `updateSessionStoreEntry(...)` para escrituras en tiempo de ejecución. Se enrutan a través del escritor del almacén de sesiones propiedad de Gateway, preservan las actualizaciones simultáneas y reutilizan la memoria caché activa. `saveSessionStore(...)` permanece disponible por compatibilidad y reescrituras de estilo de mantenimiento sin conexión.

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    Constantes predeterminadas de modelo y proveedor:

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm">
    Ejecute una finalización de texto propiedad del host sin importar elementos internos del proveedor o
    duplicar la preparación del modelo/auth/URL base de OpenClaw.

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
    });
    ```

    El ayudante utiliza la misma ruta de preparación de finalización simple que el tiempo de ejecución
    integrado de OpenClaw y la instantánea de configuración del tiempo de ejecución propiedad del host. Los motores de contexto
    reciben una capacidad `llm.complete` vinculada a la sesión, por lo que las llamadas al modelo utilizan el
    agente de la sesión activa y no vuelven silenciosamente al agente predeterminado. El
    resultado incluye la atribución del proveedor/modelo/agente, más tokens normalizados,
    caché y uso de costos estimados cuando esté disponible.

    <Warning>
    Las anulaciones de modelo requieren la aceptación del operador a través de `plugins.entries.<id>.llm.allowModelOverride: true` en la configuración. Use `plugins.entries.<id>.llm.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos. Las finalizaciones entre agentes requieren `plugins.entries.<id>.llm.allowAgentIdOverride: true`.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.subagent">
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
    Las anulaciones de modelo (`provider`/`model`) requieren la aceptación del operador a través de `plugins.entries.<id>.subagent.allowModelOverride: true` en la configuración. Los complementos que no son de confianza aún pueden ejecutar subagentes, pero las solicitudes de anulación se rechazan.
    </Warning>

    `deleteSession(...)` puede eliminar las sesiones creadas por el mismo complemento a través de `api.runtime.subagent.run(...)`. La eliminación de sesiones arbitrarias de usuario u operador aún requiere una solicitud de Gateway con ámbito de administrador.

  </Accordion>
  <Accordion title="api.runtime.nodes">
    Lista los nodos conectados e invoca un comando de host de nodos desde el código de complementos cargados por Gateway o desde los comandos CLI de complementos. Úselo cuando un complemento sea propietario del trabajo local en un dispositivo emparejado, por ejemplo, un navegador o puente de audio en otro Mac.

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    Dentro de Gateway, este tiempo de ejecución es en proceso. En los comandos CLI de complementos, llama al Gateway configurado a través de RPC, por lo que comandos como `openclaw googlemeet recover-tab` pueden inspeccionar los nodos emparejados desde la terminal. Los comandos de nodos todavía pasan por el emparejamiento normal de nodos de Gateway, listas de permitidos de comandos, políticas de invocación de nodos de complementos y el manejo de comandos locales del nodo.

    Los complementos que expongan comandos de host de nodos peligrosos deben registrar una política de invocación de nodos con `api.registerNodeInvokePolicy(...)`. La política se ejecuta en el Gateway después de las comprobaciones de la lista de permitidos y antes de que el comando se reenvía al nodo, por lo que las llamadas directas `node.invoke` y las herramientas de complementos de nivel superior comparten la misma ruta de aplicación.

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows">
    Vincula un tiempo de ejecución de Task Flow a una clave de sesión de OpenClaw existente o a un contexto de herramienta confiable, y luego crea y administra Task Flows sin pasar un propietario en cada llamada.

    Task Flow rastrea el estado del flujo de trabajo de varios pasos duradero. No es un programador:
    use Cron o `api.session.workflow.scheduleSessionTurn(...)` para activaciones
    futuras, y luego use `managedFlows` desde el turno programado cuando ese trabajo
    necesite estado de flujo, tareas secundarias, esperas o cancelación.

    ```typescript
    const taskFlow = api.runtime.tasks.managedFlows.fromToolContext(ctx);

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

    Use `bindSession({ sessionKey, requesterOrigin })` cuando ya tenga una clave de sesión de OpenClaw confiable de su propia capa de vinculación. No se vincule desde la entrada sin procesar del usuario.

  </Accordion>
  <Accordion title="api.runtime.tts">
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

    Utiliza la configuración central `messages.tts` y la selección del proveedor. Devuelve un búfer de audio PCM + tasa de muestreo.

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    Análisis de imagen, audio y video.

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

    // Structured image extraction through a specific provider/model.
    // Include at least one image; text inputs are supplemental context.
    const evidence = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
      provider: "codex",
      model: "gpt-5.5",
      input: [
        {
          type: "image",
          buffer: receiptImageBuffer,
          fileName: "receipt.png",
          mime: "image/png",
        },
        { type: "text", text: "Prefer the printed total over handwritten notes." },
      ],
      instructions: "Extract vendor, total, and searchable tags.",
      schemaName: "receipt.evidence",
      jsonSchema: {
        type: "object",
        properties: {
          vendor: { type: "string" },
          total: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["vendor", "total"],
      },
      cfg: api.config,
    });
    ```

    Devuelve `{ text: undefined }` cuando no se produce ninguna salida (por ejemplo, entrada omitida).

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` permanece como un alias de compatibilidad para `api.runtime.mediaUnderstanding.transcribeAudioFile(...)`.
    </Info>

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    Generación de imágenes.

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    Búsqueda web.

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.media">
    Utilidades de medios de bajo nivel.

    ```typescript
    const webMedia = await api.runtime.media.loadWebMedia(url);
    const mime = await api.runtime.media.detectMime(buffer);
    const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
    const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
    const metadata = await api.runtime.media.getImageMetadata(filePath);
    const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
    const terminalQr = await api.runtime.media.renderQrTerminal("https://openclaw.ai");
    const pngQr = await api.runtime.media.renderQrPngBase64("https://openclaw.ai", {
      scale: 6, // 1-12
      marginModules: 4, // 0-16
    });
    const pngQrDataUrl = await api.runtime.media.renderQrPngDataUrl("https://openclaw.ai");
    const tmpRoot = resolvePreferredOpenClawTmpDir();
    const pngQrFile = await api.runtime.media.writeQrPngTempFile("https://openclaw.ai", {
      tmpRoot,
      dirPrefix: "my-plugin-qr-",
      fileName: "qr.png",
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.config">
    Instantánea de la configuración de tiempo de ejecución actual y escrituras de configuración transaccionales. Se prefiere
    la configuración que ya se pasó a la ruta de llamada activa; use
    `current()` solo cuando el controlador necesita la instantánea del proceso directamente.

    ```typescript
    const cfg = api.runtime.config.current();
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    `mutateConfigFile(...)` y `replaceConfigFile(...)` devuelven un valor
    `followUp`,
    por ejemplo `{ mode: "restart", requiresRestart: true, reason }`,
    que registra la intención del escritor sin quitar el control de reinicio a la
    puerta de enlace.

  </Accordion>
  <Accordion title="api.runtime.system">
    Utilidades de nivel de sistema.

    ```typescript
    await api.runtime.system.enqueueSystemEvent(event);
    api.runtime.system.requestHeartbeat({
      source: "other",
      intent: "event",
      reason: "plugin-event",
    });
    api.runtime.system.requestHeartbeatNow({ reason: "plugin-event" }); // Deprecated compatibility alias.
    const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
    const hint = api.runtime.system.formatNativeDependencyHint(pkg);
    ```

  </Accordion>
  <Accordion title="api.runtime.events">
    Suscripciones de eventos.

    ```typescript
    api.runtime.events.onAgentEvent((event) => {
      /* ... */
    });
    api.runtime.events.onSessionTranscriptUpdate((update) => {
      /* ... */
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.logging">
    Registro de logs.

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    Resolución de autenticación de modelo y proveedor.

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    Resolución del directorio de estado y almacenamiento con clave respaldado por SQLite.

    ```typescript
    const stateDir = api.runtime.state.resolveStateDir(process.env);
    const store = api.runtime.state.openKeyedStore<MyRecord>({
      namespace: "my-feature",
      maxEntries: 200,
      defaultTtlMs: 15 * 60_000,
    });

    await store.register("key-1", { value: "hello" });
    const claimed = await store.registerIfAbsent("dedupe-key", { value: "first" });
    const value = await store.lookup("key-1");
    await store.consume("key-1");
    await store.clear();
    ```

    Los almacenes con clave sobreviven a los reinicios y están aislados por el id del plugin vinculado al tiempo de ejecución. Use `registerIfAbsent(...)` para reclamaciones de deduplicación atómicas: devuelve `true` cuando la clave faltaba o había expirado y se registró, o `false` cuando ya existe un valor activo sin sobrescribir su valor, tiempo de creación o TTL. Límites: `maxEntries` por espacio de nombres, 1,000 filas activas por plugin, valores JSON menores a 64 KB y caducidad TTL opcional.

    <Warning>
    Solo plugins incluidos en esta versión.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tools">
    Fábricas de herramientas de memoria e interfaz de línea de comandos (CLI).

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.channel">
    Asistentes de tiempo de ejecución específicos del canal (disponibles cuando se carga un plugin de canal).

    `api.runtime.channel.mentions` es la superficie compartida de la política de menciones de entrada para los plugins de canal incluidos que usan inyección en tiempo de ejecución:

    ```typescript
    const mentionMatch = api.runtime.channel.mentions.matchesMentionWithExplicit(text, {
      mentionRegexes,
      mentionPatterns,
    });

    const decision = api.runtime.channel.mentions.resolveInboundMentionDecision({
      facts: {
        canDetectMention: true,
        wasMentioned: mentionMatch.matched,
        implicitMentionKinds: api.runtime.channel.mentions.implicitMentionKindWhen(
          "reply_to_bot",
          isReplyToBot,
        ),
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

    Asistentes de menciones disponibles:

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` intencionalmente no expone los asistentes de compatibilidad `resolveMentionGating*` anteriores. Se prefiere la ruta normalizada `{ facts, policy }`.

  </Accordion>
</AccordionGroup>

## Almacenamiento de referencias en tiempo de ejecución

Use `createPluginRuntimeStore` para almacenar la referencia del tiempo de ejecución para usarla fuera de la devolución de llamada `register`:

<Steps>
  <Step title="Crear el almacén">
    ```typescript
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

    const store = createPluginRuntimeStore<PluginRuntime>({
      pluginId: "my-plugin",
      errorMessage: "my-plugin runtime not initialized",
    });
    ```

  </Step>
  <Step title="Wire into the entry point">
    ```typescript
    export default defineChannelPluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Example",
      plugin: myPlugin,
      setRuntime: store.setRuntime,
    });
    ```
  </Step>
  <Step title="Access from other files">
    ```typescript
    export function getRuntime() {
      return store.getRuntime(); // throws if not initialized
    }

    export function tryGetRuntime() {
      return store.tryGetRuntime(); // returns null if not initialized
    }
    ```

  </Step>
</Steps>

<Note>Prefiera `pluginId` para la identidad del runtime-store. El formato de nivel inferior `key` es para casos poco comunes en los que un complemento necesita intencionalmente más de una ranura de tiempo de ejecución.</Note>

## Otros campos de nivel superior `api`

Más allá de `api.runtime`, el objeto API también proporciona:

<ParamField path="api.id" type="string">
  ID del complemento.
</ParamField>
<ParamField path="api.name" type="string">
  Nombre para mostrar del complemento.
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  Instantánea de configuración actual (instantánea de tiempo de ejecución activa en memoria cuando está disponible).
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  Configuración específica del complemento de `plugins.entries.<id>.config`.
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  Registrador con ámbito (`debug`, `info`, `warn`, `error`).
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  Modo de carga actual; `"setup-runtime"` es la ventana de inicio/configuración previa ligera a la entrada completa.
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  Resuelve una ruta relativa a la raíz del complemento.
</ParamField>

## Relacionado

- [Aspectos internos del complemento](/es/plugins/architecture) — modelo de capacidades y registro
- [Puntos de entrada del SDK](/es/plugins/sdk-entrypoints) — opciones `definePluginEntry`
- [Descripción general del SDK](/es/plugins/sdk-overview) — referencia de subruta
