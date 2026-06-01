---
summary: "api.runtime: los auxiliares de tiempo de ejecución inyectados disponibles para los complementos"
title: "Auxiliares de tiempo de ejecución del complemento"
sidebarTitle: "Auxiliares de tiempo de ejecución"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

Referencia del objeto `api.runtime` inyectado en cada complemento durante el registro. Utilice estos auxiliares en lugar de importar directamente los aspectos internos del host.

<CardGroup cols={2}>
  <Card title="Complementos de canal" href="/es/plugins/sdk-channel-plugins">
    Guía paso a paso que utiliza estos auxiliares en contexto para complementos de canal.
  </Card>
  <Card title="Complementos de proveedor" href="/es/plugins/sdk-provider-plugins">
    Guía paso a paso que utiliza estos auxiliares en contexto para complementos de proveedor.
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Carga y escritura de configuraciones

Prefiera la configuración que ya se pasó a la ruta de llamada activa, por ejemplo `api.config` durante el registro o un argumento `cfg` en devoluciones de llamada de canal/proveedor. Esto mantiene una instantánea del proceso fluyendo a través del trabajo en lugar de reanalizar la configuración en rutas críticas.

Use `api.runtime.config.current()` solo cuando un controlador de larga duración necesita la instantánea del proceso actual y no se pasó ninguna configuración a esa función. El valor devuelto es de solo lectura; clone o use un asistente de mutación antes de editar.

Las fábricas de herramientas reciben `ctx.runtimeConfig` además de `ctx.getRuntimeConfig()`. Use el captador dentro de la devolución de llamada `execute` de una herramienta de larga duración cuando la configuración puede cambiar después de que se creó la definición de la herramienta.

Persista los cambios con `api.runtime.config.mutateConfigFile(...)` o `api.runtime.config.replaceConfigFile(...)`. Cada escritura debe elegir una política `afterWrite` explícita:

- `afterWrite: { mode: "auto" }` deja que el planificador de recarga de la puerta de enlace decida.
- `afterWrite: { mode: "restart", reason: "..." }` fuerza un reinicio limpio cuando el escritor sabe que la recarga en caliente no es segura.
- `afterWrite: { mode: "none", reason: "..." }` suprime la recarga/reinicio automático solo cuando la persona que llama es propietaria del seguimiento.

Los ayudantes de mutación devuelven `afterWrite` más un resumen `followUp` tipado para que las personas que llamadas puedan registrar o probar si solicitaron un reinicio. La puerta de enlace sigue decidiendo cuándo ocurre realmente ese reinicio.

`api.runtime.config.loadConfig()` y `api.runtime.config.writeConfigFile(...)` son asistentes de compatibilidad en desuso bajo `runtime-config-load-write`. Advierten una vez en tiempo de ejecución y permanecen disponibles para complementos externos antiguos durante el período de migración. Los complementos integrados no deben usarlos; los guardias de límites de configuración fallan si el código del complemento los llama o importa esos asistentes desde subrutas del SDK del complemento.

Para las importaciones directas del SDK, use las subrutas de configuración específicas en lugar del barril de compatibilidad amplio `openclaw/plugin-sdk/config-runtime`: `config-contracts` para tipos, `plugin-config-runtime` para aserciones de configuración ya cargadas y búsqueda de entradas de complementos, `runtime-config-snapshot` para instantáneas del proceso actual y `config-mutation` para escrituras. Las pruebas de complementos integrados deben simular estas subrutas específicas directamente en lugar de simular el barril de compatibilidad amplio.

El código de tiempo de ejecución interno de OpenClaw tiene la misma dirección: cargar la configuración una vez en el límite de la CLI, la puerta de enlace o el proceso, y luego pasar ese valor. Las escrituras de mutación exitosas actualizan la instantánea del tiempo de ejecución del proceso y avanzan su revisión interna; las cachés de larga duración deben basarse en la clave de caché propiedad del tiempo de ejecución en lugar de serializar la configuración localmente. Los módulos de tiempo de ejecución de larga duración tienen un escáner de tolerancia cero para llamadas `loadConfig()` ambientales; utilice un `cfg` pasado, una `context.getRuntimeConfig()` de solicitud, o `getRuntimeConfig()` en un límite de proceso explícito.

Las rutas de ejecución del proveedor y del canal deben usar la instantánea de configuración de runtime activa, no una instantánea de archivo devuelta para la lectura o edición de la configuración. Las instantáneas de archivo preservan los valores de origen, como los marcadores SecretRef, para la interfaz de usuario y las escrituras; las devoluciones de llamada del proveedor necesitan la vista de runtime resuelta. Cuando un asistente pueda llamarse con la instantánea de origen activa o la instantánea de runtime activa, enrute a través de `selectApplicableRuntimeConfig()` antes de leer las credenciales.

## Utilidades de runtime reutilizables

Utilice los hechos `botLoopProtection` entrantes para mensajes entrantes creados por el bot. Core aplica el guardián de ventana deslizante compartido en memoria antes del registro y despacho de la sesión, sin vincular la política a un solo canal. El guardián rastrea las claves `(scopeId, conversationId, participant pair)`, cuenta ambas direcciones de un par juntas, aplica un tiempo de espera una vez que se excede el presupuesto de la ventana y elimina entradas inactivas oportunamente.

Los complementos de canal que exponen este comportamiento a los operadores deben preferir la forma compartida `channels.defaults.botLoopProtection` para los presupuestos base, y luego agregar anulaciones específicas del canal/proveedor encima. La configuración compartida usa segundos porque está orientada al usuario:

```typescript
type ChannelBotLoopProtectionConfig = {
  enabled?: boolean;
  maxEventsPerWindow?: number;
  windowSeconds?: number;
  cooldownSeconds?: number;
};
```

Pase datos normalizados del par de bots con el turno resuelto. El núcleo resuelve los valores predeterminados, la conversión de unidades y la semántica de `enabled`:

```typescript
return {
  channel: "example",
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  runDispatch,
  botLoopProtection: {
    scopeId: "account-1",
    conversationId: "channel-1",
    senderId: "bot-a",
    receiverId: "bot-b",
    config: channelConfig.botLoopProtection,
    defaultsConfig: runtimeConfig.channels?.defaults?.botLoopProtection,
    defaultEnabled: allowBotsMode !== "off",
  },
};
```

Use `openclaw/plugin-sdk/pair-loop-guard-runtime` directamente solo para bucles de eventos personalizados
de dos partes que no pasan por el ejecutor de respuestas entrantes compartido.

## Espacios de nombres en tiempo de ejecución

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

    `runEmbeddedAgent(...)` es la función auxiliar neutral para iniciar un turno normal de agente OpenClaw desde el código del complemento. Utiliza la misma resolución de proveedor/modelo y selección de arnés de agente que las respuestas activadas por canal.

    `runEmbeddedPiAgent(...)` permanece como un alias de compatibilidad en desuso para complementos existentes. El nuevo código debe usar `runEmbeddedAgent(...)`.

    `resolveThinkingPolicy(...)` devuelve los niveles de pensamiento admitidos por el proveedor/modelo y el predeterminado opcional. Los complementos del proveedor son propietarios del perfil específico del modelo a través de sus ganchos de pensamiento, por lo que los complementos de herramientas deben llamar a esta función auxiliar de tiempo de ejecución en lugar de importar o duplicar las listas de proveedores.

    `normalizeThinkingLevel(...)` convierte el texto del usuario, como `on`, `x-high` o `extra high`, al nivel almacenado canónico antes de verificarlo con la política resuelta.

    **Los auxiliares de almacenamiento de sesiones** están en `api.runtime.agent.session`:

    ```typescript
    const entry = api.runtime.agent.session.getSessionEntry({ agentId, sessionKey });
    for (const { sessionKey, entry } of api.runtime.agent.session.listSessionEntries({ agentId })) {
      // Iterate session rows without depending on the legacy sessions.json shape.
    }
    await api.runtime.agent.session.patchSessionEntry({
      agentId,
      sessionKey,
      update: (entry) => ({ thinkingLevel: "high" }),
    });
    ```

    Preferir `getSessionEntry(...)`, `listSessionEntries(...)`, `patchSessionEntry(...)` o `upsertSessionEntry(...)` para los flujos de trabajo de sesión. Estos auxiliares abordan las sesiones por identidad de agente/sesión, por lo que los complementos no dependen de la forma de almacenamiento heredada `sessions.json`. Use `preserveActivity: true` para parches solo de metadatos que no deben actualizar la actividad de la sesión, y `replaceEntry: true` solo cuando la devolución de llamada devuelve una entrada completa y los campos eliminados deben permanecer eliminados. `loadSessionStore(...)` permanece como una salida de compatibilidad en desuso para las personas que llaman que intencionalmente necesitan un clon mutable de todo el almacén.

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    Constantes de modelo y proveedor predeterminados:

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm">
    Ejecute una finalización de texto propiedad del host sin importar los internos del proveedor o
    duplicar la preparación del modelo/auth/URL base de OpenClaw.

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
    });
    ```

    El asistente utiliza la misma ruta de preparación de finalización simple que el
    tiempo de ejecución integrado de OpenClaw y la instantánea de configuración del tiempo de ejecución propiedad del host. Los motores de contexto
    reciben una capacidad `llm.complete` vinculada a la sesión, por lo que las llamadas al modelo utilizan el
    agente de la sesión activa y no retroceden silenciosamente al agente predeterminado. El
    resultado incluye la atribución del proveedor/modelo/agente, además de tokens normalizados,
    caché y uso de costos estimado cuando esté disponible.

    <Warning>
    Las anulaciones de modelo requieren la aceptación del operador a través de `plugins.entries.<id>.llm.allowModelOverride: true` en la configuración. Use `plugins.entries.<id>.llm.allowedModels` para restringir los complementos de confianza a `provider/model` objetivos canónicos específicos. Las finalizaciones entre agentes requieren `plugins.entries.<id>.llm.allowAgentIdOverride: true`.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.subagent">
    Inicie y administre ejecuciones de subagentes en segundo plano.

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

    `deleteSession(...)` puede eliminar las sesiones creadas por el mismo complemento a través de `api.runtime.subagent.run(...)`. Eliminar sesiones arbitrarias de usuario u operador aún requiere una solicitud de Gateway con alcance de administrador.

  </Accordion>
  <Accordion title="api.runtime.nodes">
    Lista los nodos conectados e invoca un comando de nodo-host desde el código del complemento cargado por Gateway o desde los comandos CLI del complemento. Use esto cuando un complemento realiza trabajo local en un dispositivo emparejado, por ejemplo, un navegador o un puente de audio en otra Mac.

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    Dentro de Gateway, este tiempo de ejecución está en proceso. En los comandos CLI del complemento, llama al Gateway configurado a través de RPC, por lo que comandos como `openclaw googlemeet recover-tab` pueden inspeccionar nodos emparejados desde la terminal. Los comandos de nodo aún pasan por el emparejamiento normal de nodos de Gateway, listas de permitidos de comandos, políticas de invocación de nodos de complementos y manejo de comandos locales de nodo.

    Los complementos que exponen comandos de nodo-host peligrosos deben registrar una política de invocación de nodo con `api.registerNodeInvokePolicy(...)`. La política se ejecuta en el Gateway después de las comprobaciones de la lista de permitidos y antes de que el comando se reenvía al nodo, por lo que las llamadas directas `node.invoke` y las herramientas de complementos de nivel superior comparten la misma ruta de aplicación.

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows">
    Vincula un tiempo de ejecución de Task Flow a una clave de sesión OpenClaw existente o a un contexto de herramienta confiable, luego crea y gestiona Task Flows sin pasar un propietario en cada llamada.

    Task Flow rastrea el estado del flujo de trabajo de varios pasos duradero. No es un programador:
    use Cron o `api.session.workflow.scheduleSessionTurn(...)` para activaciones
    futuras, luego use `managedFlows` desde el turno programado cuando ese trabajo
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

    Use `bindSession({ sessionKey, requesterOrigin })` cuando ya tenga una clave de sesión OpenClaw confiable de su propia capa de vinculación. No vincule desde la entrada sin procesar del usuario.

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

    Utiliza la configuración central `messages.tts` y la selección de proveedor. Devuelve un búfer de audio PCM + frecuencia de muestreo.

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
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

    Devuelve `{ text: undefined }` cuando no se produce ninguna salida (p. ej., entrada omitida).

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
    Instantánea de configuración en tiempo de ejecución actual y escrituras de configuración transaccionales. Se prefiere
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

    `mutateConfigFile(...)` y `replaceConfigFile(...)` devuelven un valor `followUp`,
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
    Suscripciones a eventos.

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

    Los almacenes con clave sobreviven a los reinicios y están aislados por el id del complemento vinculado al tiempo de ejecución. Use `registerIfAbsent(...)` para reclamos de deduplicación atómica: devuelve `true` cuando la clave faltaba o había expirado y se registró, o `false` cuando ya existe un valor activo sin sobrescribir su valor, hora de creación o TTL. Límites: `maxEntries` por espacio de nombres, 6000 filas activas por complemento, valores JSON inferiores a 64 KB y expiración TTL opcional. Cuando una escritura excedería el límite de filas del complemento, el tiempo de ejecución puede expulsar las filas activas más antiguas del espacio de nombres que se está escribiendo; los espacios de nombres hermanos no se expulsan para esa escritura, y la escritura aún falla si el espacio de nombres no puede liberar suficientes filas.

    <Warning>
    Solo complementos incluidos en esta versión.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tools">
    Fábricas de herramientas de memoria y CLI.

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.channel">
    Funciones de ayuda específicas del canal (disponibles cuando se carga un complemento de canal).

    `api.runtime.channel.media` es la superficie preferida para la descarga y almacenamiento de medios del canal:

    ```typescript
    const saved = await api.runtime.channel.media.saveRemoteMedia({
      url,
      subdir: "inbound",
      maxBytes,
      filePathHint: fileName,
    });
    ```

    Use `saveRemoteMedia(...)` cuando una URL remota debe convertirse en un medio de OpenClaw. Use `saveResponseMedia(...)` cuando el complemento ya haya obtenido un `Response` con autenticación propia del complemento, redirección o manejo de lista de permitidos. Use `readRemoteMediaBuffer(...)` solo cuando el complemento necesite bytes sin procesar para inspección, transformaciones, descifrado o re-subida. `fetchRemoteMedia(...)` sigue siendo un alias de compatibilidad en desuso para `readRemoteMediaBuffer(...)`.

    `api.runtime.channel.mentions` es la superficie compartida de política de mención entrante para complementos de canal empaquetados que usan inyección en tiempo de ejecución:

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

    Funciones de ayuda de mención disponibles:

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` intencionalmente no expone las funciones de ayuda de compatibilidad `resolveMentionGating*` más antiguas. Se prefiere la ruta normalizada `{ facts, policy }`.

  </Accordion>
</AccordionGroup>

## Almacenar referencias de tiempo de ejecución

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

<Note>Se prefiere `pluginId` para la identidad del almacén de tiempo de ejecución. La forma de nivel inferior `key` es para casos poco comunes en los que un complemento necesita intencionalmente más de una ranura de tiempo de ejecución.</Note>

## Otros campos de nivel superior `api`

Más allá de `api.runtime`, el objeto API también proporciona:

<ParamField path="api.id" type="string">
  Id. del complemento.
</ParamField>
<ParamField path="api.name" type="string">
  Nombre para mostrar del complemento.
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  Instantánea de configuración actual (instantánea de tiempo de ejecución en memoria activa cuando esté disponible).
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  Configuración específica del complemento de `plugins.entries.<id>.config`.
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  Registrador con ámbito (`debug`, `info`, `warn`, `error`).
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  Modo de carga actual; `"setup-runtime"` es la ventana ligera de inicio/configuración anterior a la entrada completa.
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  Resuelve una ruta relativa a la raíz del complemento.
</ParamField>

## Relacionado

- [Plugin internals](/es/plugins/architecture) — modelo de capacidades y registro
- [SDK entry points](/es/plugins/sdk-entrypoints) — opciones de `definePluginEntry`
- [SDK overview](/es/plugins/sdk-overview) — referencia de subruta
