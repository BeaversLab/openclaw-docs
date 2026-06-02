---
summary: "Referencia de configuración de Gateway para claves principales de OpenClaw, valores predeterminados y enlaces a referencias de subsistemas dedicados"
title: "Referencia de configuración"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

Referencia de configuración principal para `~/.openclaw/openclaw.json`. Para obtener una visión general orientada a tareas, consulte [Configuration](/es/gateway/configuration).

Cubre las principales superficies de configuración de OpenClaw y proporciona enlaces cuando un subsistema tiene su propia referencia más detallada. Los catálogos de comandos propiedad de canales y complementos, así como los controles profundos de memoria/QMD, se encuentran en sus propias páginas en lugar de en esta.

Verdad del código:

- `openclaw config schema` imprime el esquema JSON en vivo que se utiliza para la validación y la interfaz de usuario de Control, con los metadatos integrados/complementos/canal combinados cuando estén disponibles
- `config.schema.lookup` devuelve un nodo de esquema con ámbito de ruta para herramientas de análisis detallado
- `pnpm config:docs:check` / `pnpm config:docs:gen` validan el hash de referencia del documento de configuración contra la superficie del esquema actual

Ruta de búsqueda del agente: use la acción de herramienta `gateway` `config.schema.lookup` para
obtener documentación y restricciones exactas a nivel de campo antes de las ediciones. Use
[Configuration](/es/gateway/configuration) para obtener orientación orientada a tareas y esta página
para el mapa de campos más amplio, los valores predeterminados y los enlaces a las referencias de subsistemas.

Referencias profundas dedicadas:

- [Referencia de configuración de memoria](/es/reference/memory-config) para `agents.defaults.memorySearch.*`, `memory.qmd.*`, `memory.citations` y configuración de sueño bajo `plugins.entries.memory-core.config.dreaming`
- [Comandos de barra](/es/tools/slash-commands) para el catálogo de comandos integrado + empaquetado actual
- páginas de canales/complementos propietarios para superficies de comandos específicas del canal

El formato de configuración es **JSON5** (se permiten comentarios y comas finales). Todos los campos son opcionales; OpenClaw utiliza valores predeterminados seguros cuando se omiten.

---

## Canales

Las claves de configuración por canal se han movido a una página dedicada; consulte
[Configuration - channels](/es/gateway/config-channels) para `channels.*`,
incluyendo Slack, Discord, Telegram, WhatsApp, Matrix, iMessage y otros
canales empaquetados (autenticación, control de acceso, multicuenta, filtrado de menciones).

## Valores predeterminados del agente, multiagente, sesiones y mensajes

Se ha movido a una página dedicada; consulte
[Configuration - agents](/es/gateway/config-agents) para:

- `agents.defaults.*` (espacio de trabajo, modelo, pensamiento, latido, memoria, medios, habilidades, espacio aislado)
- `multiAgent.*` (enrutamiento y vínculos multiagente)
- `session.*` (ciclo de vida de la sesión, compactación, poda)
- `messages.*` (entrega de mensajes, TTS, renderizado de markdown)
- `talk.*` (modo Talk)
  - `talk.consultThinkingLevel`: anulación del nivel de pensamiento para toda la ejecución del agente OpenClaw detrás de las consultas en tiempo real de Talk de Control UI
  - `talk.consultFastMode`: anulación del modo rápido de un solo disparo para las consultas en tiempo real de Talk de Control UI
  - `talk.speechLocale`: id de configuración regional BCP 47 opcional para el reconocimiento de voz de Talk en iOS/macOS
  - `talk.silenceTimeoutMs`: cuando no está configurado, Talk mantiene la ventana de pausa predeterminada de la plataforma antes de enviar la transcripción (`700 ms on macOS and Android, 900 ms on iOS`)
  - `talk.realtime.consultRouting`: Respaldo de retransmisión de la puerta de enlace para las transcripciones de Talk en tiempo real finalizadas que omiten `openclaw_agent_consult`

## Herramientas y proveedores personalizados

La política de herramientas, los interruptores experimentales, la configuración de herramientas respaldadas por el proveedor y la configuración de
proveedores personalizados / URL base se han movido a una página dedicada; consulte
[Configuration - tools and custom providers](/es/gateway/config-tools).

## Modelos

Las definiciones de proveedores, las listas de permitidos de modelos y la configuración de proveedores personalizados se encuentran en
[Configuration - tools and custom providers](/es/gateway/config-tools#custom-providers-and-base-urls).
La raíz `models` también posee el comportamiento global del catálogo de modelos.

```json5
{
  models: {
    // Optional. Default: true. Requires a Gateway restart when changed.
    pricing: { enabled: false },
  },
}
```

- `models.mode`: comportamiento del catálogo de proveedores (`merge` o `replace`).
- `models.providers`: mapa de proveedores personalizados clave por id de proveedor.
- `models.providers.*.localService`: administrador de procesos bajo demanda opcional para
  servidores de modelos locales. OpenClaw sondea el punto de conexión de salud configurado, inicia
  el `command` absoluto cuando es necesario, espera la preparación y luego envía la solicitud de
  modelo. Consulte [Local model services](/es/gateway/local-model-services).
- `models.pricing.enabled`: controla la inicialización de precios en segundo plano que
  se inicia después de que los sidecars y los canales alcanzan la ruta lista de la Gateway. Cuando `false`,
  la Gateway omite las recuperaciones de catálogos de precios de OpenRouter y LiteLLM; los valores
  `models.providers.*.models[].cost` configurados aún funcionan para estimaciones de costos locales.

## MCP

Las definiciones de servidores MCP administrados por OpenClaw se encuentran en `mcp.servers` y son consumidas por OpenClaw integrado y otros adaptadores de tiempo de ejecución. Los comandos `openclaw mcp list`, `show`, `set` y `unset` gestionan este bloque sin conectarse al servidor de destino durante las ediciones de configuración.

```json5
{
  mcp: {
    // Optional. Default: 600000 ms (10 minutes). Set 0 to disable idle eviction.
    sessionIdleTtlMs: 600000,
    servers: {
      docs: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      remote: {
        url: "https://example.com/mcp",
        transport: "streamable-http", // streamable-http | sse
        timeout: 20,
        connectTimeout: 5,
        supportsParallelToolCalls: true,
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
        auth: "oauth",
        oauth: {
          scope: "docs.read",
        },
        sslVerify: true,
        clientCert: "/path/to/client.crt",
        clientKey: "/path/to/client.key",
        toolFilter: {
          include: ["search_*"],
          exclude: ["admin_*"],
        },
        // Optional Codex app-server projection controls.
        codex: {
          agents: ["main"],
          defaultToolsApprovalMode: "approve", // auto | prompt | approve
        },
      },
    },
  },
}
```

- `mcp.servers`: definiciones con nombre de servidores MCP stdio o remotos para tiempos de ejecución que
  exponen herramientas MCP configuradas.
  Las entradas remotas usan `transport: "streamable-http"` o `transport: "sse"`;
  `type: "http"` es un alias nativo de la CLI que `openclaw mcp set` y
  `openclaw doctor --fix` normalizan en el campo canónico `transport`.
- `mcp.servers.<name>.enabled`: establezca `false` para mantener una definición de servidor guardada
  mientras la excluye del descubrimiento y proyección de herramientas MCP de OpenClaw integrado.
- `mcp.servers.<name>.timeout` / `requestTimeoutMs`: tiempo de espera de
  la solicitud MCP por servidor, en segundos o milisegundos.
- `mcp.servers.<name>.connectTimeout` / `connectionTimeoutMs`: tiempo de espera de
  conexión por servidor, en segundos o milisegundos.
- `mcp.servers.<name>.supportsParallelToolCalls`: sugerencia opcional de concurrencia para
  los adaptadores que pueden elegir si emitir llamadas a herramientas MCP en paralelo.
- `mcp.servers.<name>.auth`: establezca `"oauth"` para los servidores MCP HTTP que requieran
  OAuth. Ejecute `openclaw mcp login <name>` para almacenar los tokens bajo el estado de OpenClaw.
- `mcp.servers.<name>.oauth`: anulaciones opcionales de ámbito OAuth, URL de redirección
  y URL de metadatos del cliente.
- `mcp.servers.<name>.sslVerify`, `clientCert`, `clientKey`: controles TLS de HTTP
  para endpoints privados y TLS mutuo.
- `mcp.servers.<name>.toolFilter`: selección opcional de herramientas por servidor. `include`
  limita las herramientas MCP descubiertas a los nombres coincidentes; `exclude` oculta los
  nombres coincidentes. Las entradas son nombres exactos de herramientas MCP o patrones glob `*` simples.
  Los servidores con recursos o prompts también generan nombres de herramientas de utilidad (`resources_list`,
  `resources_read`, `prompts_list`, `prompts_get`), y esos nombres utilizan el
  mismo filtro.
- `mcp.servers.<name>.codex`: controles opcionales de proyección del servidor de aplicaciones de Codex.
  Este bloque es metadatos de OpenClaw solo para los hilos del servidor de aplicaciones de Codex; no afecta
  a las sesiones de ACP, a la configuración genérica del arnés de Codex ni a otros adaptadores de tiempo de ejecución.
  Un `codex.agents` no vacío limita el servidor a los ids de agente de OpenClaw enumerados.
  Las listas de agentes con ámbito vacías, en blanco o no válidas son rechazadas por la validación de configuración
  y omitidas por la ruta de proyección en tiempo de ejecución en lugar de volverse globales.
  `codex.defaultToolsApprovalMode` emite el
  `default_tools_approval_mode` nativo de Codex para ese servidor. OpenClaw elimina el bloque `codex`
  antes de pasar la configuración nativa `mcp_servers` a Codex. Omita el bloque para
  mantener el servidor proyectado para cada agente del servidor de aplicaciones de Codex con el comportamiento
  de aprobación MCP predeterminado de Codex.
- `mcp.sessionIdleTtlMs`: TTL inactivo para entornos de ejecución de MCP agrupados con alcance de sesión.
  Las ejecuciones integradas de un solo uso solicitan la limpieza al final de la ejecución; este TTL es el red de seguridad para
  sesiones de larga duración y futuros llamantes.
- Los cambios bajo `mcp.*` se aplican en caliente desechando los entornos de ejecución MCP de sesión en caché.
  El siguiente descubrimiento/uso de herramientas los recrea con la nueva configuración, por lo que las entradas
  `mcp.servers` eliminadas se recolectan inmediatamente en lugar de esperar al TTL inactivo.
- El descubrimiento de entornos de ejecución también respeta las notificaciones de cambio de lista de herramientas MCP descartando
  el catálogo en caché para esa sesión. Los servidores que anuncian recursos o
  prompts obtienen herramientas de utilidad para listar/leer recursos y listar/recuperar
  prompts. Los fallos repetidos de llamadas a herramientas pausan brevemente el servidor afectado antes
  de intentar otra llamada.

Consulte [MCP](/es/cli/mcp#openclaw-as-an-mcp-client-registry) y
[backends de CLI](/es/gateway/cli-backends#bundle-mcp-overlays) para conocer el comportamiento del entorno de ejecución.

## Skills

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`: lista de permitidos opcional solo para habilidades agrupadas (las habilidades gestionadas/del espacio de trabajo no se ven afectadas).
- `load.extraDirs`: raíces compartidas de habilidades adicionales (menor precedencia).
- `load.allowSymlinkTargets`: raíces de destino reales confiables en las que los enlaces simbólicos de habilidades pueden
  resolverse cuando el enlace vive fuera de su raíz de origen configurada.
- `install.preferBrew`: cuando es true, prefiere los instaladores de Homebrew cuando `brew` está
  disponible antes de recurrir a otros tipos de instaladores.
- `install.nodeManager`: preferencia del instalador de nodos para `metadata.openclaw.install`
  especificaciones (`npm` | `pnpm` | `yarn` | `bun`).
- `install.allowUploadedArchives`: permitir a los clientes de Gateway `operator.admin` de confianza
  instalar archivos zip privados preparados a través de `skills.upload.*`
  (predeterminado: false). Esto solo habilita la ruta de archivo cargado; las instalaciones
  normales de ClawHub no lo requieren.
- `entries.<skillKey>.enabled: false` deshabilita una habilidad incluso si está agrupada/instalada.
- `entries.<skillKey>.apiKey`: conveniencia para habilidades que declaran una variable de entorno principal (cadena de texto plano u objeto SecretRef).

---

## Plugins

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-plugin"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

- Se cargan desde directorios de paquetes o paquetes bajo `~/.openclaw/extensions` y `<workspace>/.openclaw/extensions`, además de los archivos o directorios listados en `plugins.load.paths`.
- Coloque los archivos de complementos independientes en `plugins.load.paths`; las raíces de extensiones detectadas automáticamente ignoran los archivos de nivel superior `.js`, `.mjs` y `.ts` para que los scripts auxiliares en esas raíces no bloqueen el inicio.
- El descubrimiento acepta complementos nativos de OpenClaw además de paquetes compatibles de Codex y Claude, incluidos los paquetes de diseño predeterminado de Claude sin manifiesto.
- **Los cambios de configuración requieren reiniciar la puerta de enlace.**
- `allow`: lista blanca opcional (solo se cargan los complementos listados). `deny` tiene prioridad.
- `plugins.entries.<id>.apiKey`: campo de conveniencia de clave API a nivel de complemento (cuando el complemento lo admite).
- `plugins.entries.<id>.env`: mapa de variables de entorno con alcance de complemento.
- `plugins.entries.<id>.hooks.allowPromptInjection`: cuando es `false`, el núcleo bloquea `before_prompt_build` e ignora los campos de modificación de mensajes del `before_agent_start` heredado, al tiempo que conserva los `modelOverride` y `providerOverride` heredados. Aplicable a ganchos de complementos nativos y directorios de ganchos proporcionados por paquetes compatibles.
- `plugins.entries.<id>.hooks.allowConversationAccess`: cuando es `true`, los complementos de confianza no empaquetados pueden leer el contenido de conversación sin procesar desde ganchos escritos como `llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize` y `agent_end`.
- `plugins.entries.<id>.subagent.allowModelOverride`: confía explícitamente en este complemento para solicitar anulaciones por ejecución de `provider` y `model` para ejecuciones en segundo plano de subagentes.
- `plugins.entries.<id>.subagent.allowedModels`: lista blanca opcional de objetivos canónicos de `provider/model` para anulaciones de subagentes de confianza. Use `"*"` solo cuando intencionalmente desee permitir cualquier modelo.
- `plugins.entries.<id>.llm.allowModelOverride`: confiar explícitamente en este complemento para solicitar anulaciones de modelo para `api.runtime.llm.complete`.
- `plugins.entries.<id>.llm.allowedModels`: lista de permitidos opcional de objetivos `provider/model` canónicos para anulaciones de finalización de LLM de complementos de confianza. Use `"*"` solo cuando intencionalmente desee permitir cualquier modelo.
- `plugins.entries.<id>.llm.allowAgentIdOverride`: confiar explícitamente en este complemento para ejecutar `api.runtime.llm.complete` contra un ID de agente no predeterminado.
- `plugins.entries.<id>.config`: objeto de configuración definido por el complemento (validado por el esquema nativo del complemento OpenClaw cuando esté disponible).
- La configuración de cuenta/tiempo de ejecución del complemento de canal vive bajo `channels.<id>` y debe ser descrita por los metadatos `channelConfigs` del manifiesto del complemento propietario, no por un registro central de opciones de OpenClaw.

### Configuración del complemento de arnés Codex

El complemento `codex` incluido posee la configuración nativa del arnés del servidor de aplicaciones Codex bajo
`plugins.entries.codex.config`. Consulte
[Referencia del arnés Codex](/es/plugins/codex-harness-reference) para conocer la superficie de configuración
completa y [Arnés Codex](/es/plugins/codex-harness) para el modelo de tiempo de ejecución.

`codexPlugins` se aplica solo a las sesiones que seleccionan el arnés nativo de Codex.
No habilita los complementos de Codex para ejecuciones de proveedor de OpenClaw, enlaces de
conversación ACP, ni ningún arnés que no sea de Codex.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
                allow_destructive_actions: false,
              },
            },
          },
        },
      },
    },
  },
}
```

- `plugins.entries.codex.config.codexPlugins.enabled`: habilita el soporte nativo de complementos/aplicaciones de Codex
  para el arnés de Codex. Predeterminado: `false`.
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`:
  política de acción destructiva predeterminada para elicitaciones de aplicaciones de complementos migradas.
  Predeterminado: `true`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`: habilita una
  entrada de complemento migrada cuando el `codexPlugins.enabled` global también es verdadero.
  Predeterminado: `true` para entradas explícitas.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`:
  identidad estable del mercado. V1 solo admite `"openai-curated"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`: identidad
  estable del complemento de Codex desde la migración, por ejemplo `"google-calendar"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`:
  anulación de acción destructiva por complemento. Cuando se omite, se utiliza el valor
  global `allow_destructive_actions`.

`codexPlugins.enabled` es la directiva global de habilitación. Las entradas explícitas
de complementos escritas por la migración son el conjunto duradero de elegibilidad de instalación y reparación.
`plugins["*"]` no es compatible, no hay un interruptor `install`, y los valores locales
`marketplacePath` intencionalmente no son campos de configuración porque son
específicos del host.

Las comprobaciones de preparación de `app/list` se almacenan en caché durante una hora y se actualizan
de forma asíncrona cuando están obsoletas. La configuración de la aplicación del hilo de Codex se calcula en el establecimiento
de la sesión del arnés de Codex, no en cada turno; use `/new`, `/reset`, o reinicie la
puerta de enlace después de cambiar la configuración del complemento nativo.

- `plugins.entries.firecrawl.config.webFetch`: configuración del proveedor de obtención web de Firecrawl.
  - `apiKey`: clave de API de Firecrawl (acepta SecretRef). Recurre a `plugins.entries.firecrawl.config.webSearch.apiKey`, `tools.web.fetch.firecrawl.apiKey` heredado, o variable de entorno `FIRECRAWL_API_KEY`.
  - `baseUrl`: URL base de la API de Firecrawl (predeterminado: `https://api.firecrawl.dev`; las anulaciones autohospedadas deben apuntar a puntos finales privados/internos).
  - `onlyMainContent`: extrae solo el contenido principal de las páginas (predeterminado: `true`).
  - `maxAgeMs`: antigüedad máxima de la caché en milisegundos (predeterminado: `172800000` / 2 días).
  - `timeoutSeconds`: tiempo de espera de la solicitud de raspado en segundos (predeterminado: `60`).
- `plugins.entries.xai.config.xSearch`: configuración de búsqueda web de xAI X Search (Grok).
  - `enabled`: habilita el proveedor X Search.
  - `model`: modelo Grok para usar en la búsqueda (p. ej., `"grok-4-1-fast"`).
- `plugins.entries.memory-core.config.dreaming`: configuración de "soñar" de la memoria. Consulte [Dreaming](/es/concepts/dreaming) para conocer las fases y los umbrales.
  - `enabled`: interruptor maestro de "soñar" (predeterminado `false`).
  - `frequency`: cadencia cron para cada barrido completo de "dreaming" (`"0 3 * * *"` por defecto).
  - `model`: invalidación opcional del modelo del subagente Dream Diary. Requiere `plugins.entries.memory-core.subagent.allowModelOverride: true`; combinar con `allowedModels` para restringir objetivos. Los errores de modelo no disponible se reintentan una vez con el modelo predeterminado de la sesión; los fallos de confianza o lista blanca no retroceden silenciosamente.
  - la política de fase y los umbrales son detalles de implementación (no claves de configuración visibles para el usuario).
- La configuración completa de memoria se encuentra en [Referencia de configuración de memoria](/es/reference/memory-config):
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- Los complementos (plugins) del paquete Claude habilitados también pueden contribuir con valores predeterminados incrustados de OpenClaw desde `settings.json`; OpenClaw los aplica como configuraciones de agente saneadas, no como parches de configuración sin procesar de OpenClaw.
- `plugins.slots.memory`: elija el id del complemento de memoria activo, o `"none"` para desactivar los complementos de memoria.
- `plugins.slots.contextEngine`: elija el id del complemento del motor de contexto activo; el valor predeterminado es `"legacy"` a menos que instale y seleccione otro motor.

Consulte [Complementos (Plugins)](/es/tools/plugin).

---

## Compromisos

`commitments` controla la memoria de seguimiento inferida: OpenClaw puede detectar registros de seguimiento (check-ins) desde los turnos de conversación y entregarlos a través de ejecuciones de latido (heartbeat).

- `commitments.enabled`: activar la extracción, almacenamiento y entrega de latido oculta por LLM para compromisos de seguimiento inferidos. Predeterminado: `false`.
- `commitments.maxPerDay`: máximo de compromisos de seguimiento inferidos entregados por sesión de agente en un día móvil. Predeterminado: `3`.

Consulte [Compromisos inferidos](/es/concepts/commitments).

---

## Navegador

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    tabCleanup: {
      enabled: true,
      idleMinutes: 120,
      maxTabsPerSession: 8,
      sweepMinutes: 5,
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` desactiva `act:evaluate` y `wait --fn`.
- `tabCleanup` reclama las pestañas del agente principal rastreadas después de un tiempo de inactividad o cuando una sesión excede su límite. Configure `idleMinutes: 0` o `maxTabsPerSession: 0` para desactivar esos modos de limpieza individuales.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` está desactivado cuando no está configurado, por lo que la navegación del navegador se mantiene estricta de forma predeterminada.
- Configure `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` solo cuando confíe intencionalmente en la navegación del navegador de red privada.
- En modo estricto, los puntos finales de perfil CDP remotos (`profiles.*.cdpUrl`) están sujetos al mismo bloqueo de red privada durante las comprobaciones de accesibilidad/descubrimiento.
- `ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como alias heredado.
- En modo estricto, use `ssrfPolicy.hostnameAllowlist` y `ssrfPolicy.allowedHostnames` para excepciones explícitas.
- Los perfiles remotos son solo de conexión (inicio/parada/reinicio desactivados).
- `profiles.*.cdpUrl` acepta `http://`, `https://`, `ws://` y `wss://`.
  Use HTTP(S) cuando desee que OpenClaw descubra `/json/version`; use WS(S)
  cuando su proveedor le proporcione una URL directa de WebSocket de DevTools.
- `remoteCdpTimeoutMs` y `remoteCdpHandshakeTimeoutMs` se aplican a la accesibilidad CDP remota y `attachOnly`, además de las solicitudes de apertura de pestañas. Los perfiles de loopback administrados mantienen los valores predeterminados de CDP local.
- Si un servicio CDP administrado externamente es accesible a través de loopback, configure el `attachOnly: true` de ese perfil; de lo contrario, OpenClaw tratará el puerto de loopback como un perfil de navegador administrado local y puede informar errores de propiedad del puerto local.
- Los perfiles `existing-session` usan Chrome MCP en lugar de CDP y pueden conectarse en el host seleccionado o a través de un nodo de navegador conectado.
- Los perfiles `existing-session` pueden establecer `userDataDir` para apuntar a un perfil de navegador específico basado en Chromium, como Brave o Edge.
- Los perfiles `existing-session` mantienen los límites de ruta actuales de Chrome MCP: acciones basadas en instantáneas/referencias en lugar de orientación por selectores CSS, ganchos de carga de un solo archivo, sin anulaciones de tiempo de espera de diálogo, sin `wait --load networkidle` y sin `responsebody`, exportación de PDF, intercepción de descargas o acciones por lotes.
- Los perfiles `openclaw` administrados localmente asignan automáticamente `cdpPort` y `cdpUrl`; establezca `cdpUrl` explícitamente solo para CDP remoto.
- Los perfiles administrados localmente pueden establecer `executablePath` para anular el `browser.executablePath` global para ese perfil. Use esto para ejecutar un perfil en Chrome y otro en Brave.
- Los perfiles administrados localmente usan `browser.localLaunchTimeoutMs` para el descubrimiento HTTP de CDP de Chrome después del inicio del proceso y `browser.localCdpReadyTimeoutMs` para la preparación del websocket CDP posterior al lanzamiento. Auméntelos en hosts más lentos donde Chrome se inicie correctamente pero las verificaciones de preparación compitan con el inicio. Ambos valores deben ser enteros positivos hasta `120000` ms; los valores de configuración no válidos se rechazan.
- Orden de detección automática: navegador predeterminado si está basado en Chromium → Chrome → Brave → Edge → Chromium → Chrome Canary.
- Tanto `browser.executablePath` como `browser.profiles.<name>.executablePath` aceptan `~` y `~/...` para su directorio de inicio del sistema operativo antes del lanzamiento de Chromium. `userDataDir` por perfil en los perfiles `existing-session` también se expande con tilde.
- Servicio de control: solo loopback (puerto derivado de `gateway.port`, por defecto `18791`).
- `extraArgs` añade banderas de lanzamiento adicionales al inicio local de Chromium (por ejemplo, `--disable-gpu`, tamaño de ventana o banderas de depuración).

---

## IU

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji, short text, image URL, or data URI
    },
  },
}
```

- `seamColor`: color de acento para el cromo de la IU de la aplicación nativa (tinte de la burbuja del modo Talk, etc.).
- `assistant`: anulación de identidad de la IU de control. Se recurre a la identidad del agente activo.

---

## Pasarela

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
      token: "your-token",
      // password: "your-password", // or OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // for mode=trusted-proxy; see /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // off | serve | funnel
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
      // chatMessageMaxWidth: "min(1280px, 82%)", // optional grouped chat message max-width
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://127.0.0.1:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // Optional. Default false.
    allowRealIpFallback: false,
    nodes: {
      pairing: {
        // Optional. Default unset/disabled.
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
      },
      allowCommands: ["canvas.navigate"],
      denyCommands: ["system.run"],
    },
    tools: {
      // Additional /tools/invoke HTTP denies
      deny: ["browser"],
      // Remove tools from the default HTTP deny list
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="Detalles de los campos de Gateway">

- `mode`: `local` (ejecutar gateway) o `remote` (conectarse a un gateway remoto). El gateway se niega a iniciarse a menos que `local`.
- `port`: puerto multiplexado único para WS + HTTP. Precedencia: `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind`: `auto`, `loopback` (predeterminado), `lan` (`0.0.0.0`), `tailnet` (solo IP de Tailscale) o `custom`.
- **Alias de enlace heredados**: use valores de modo de enlace en `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), no alias de host (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Nota de Docker**: el enlace `loopback` predeterminado escucha en `127.0.0.1` dentro del contenedor. Con la red puente de Docker (`-p 18789:18789`), el tráfico llega a `eth0`, por lo que el gateway es inalcanzable. Use `--network host`, o configure `bind: "lan"` (o `bind: "custom"` con `customBindHost: "0.0.0.0"`) para escuchar en todas las interfaces.
- **Auth**: requerido de forma predeterminada. Los enlaces que no son de loopback requieren autenticación del gateway. En la práctica, eso significa un token/contraseña compartido o un proxy inverso con reconocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`. El asistente de incorporación genera un token de forma predeterminada.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados (incluyendo SecretRefs), establezca `gateway.auth.mode` explícitamente en `token` o `password`. Los flujos de inicio y de instalación/reparación del servicio fallan cuando ambos están configurados y el modo no está establecido.
- `gateway.auth.mode: "none"`: modo sin autenticación explícito. Úselo solo para configuraciones locales de confianza de loopback; esto intencionalmente no se ofrece en las indicaciones de incorporación.
- `gateway.auth.mode: "trusted-proxy"`: delegar la autenticación del navegador/usuario a un proxy inverso con reconocimiento de identidad y confiar en los encabezados de identidad de `gateway.trustedProxies` (consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)). Este modo espera una fuente de proxy **que no sea de loopback** de forma predeterminada; los proxies inversos de loopback en el mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito. Los llamadores internos del mismo host pueden usar `gateway.auth.password` como respaldo local directo; `gateway.auth.token` permanece mutuamente excluyente con el modo de proxy de confianza.
- `gateway.auth.allowTailscale`: cuando `true`, los encabezados de identidad de Tailscale Serve pueden satisfacer la autenticación de Control UI/WebSocket (verificados a través de `tailscale whois`). Los endpoints de la API HTTP **no** usan esa autenticación de encabezado de Tailscale; en su lugar, siguen el modo de autenticación HTTP normal del gateway. Este flujo sin token asume que el host del gateway es confiable. El valor predeterminado es `true` cuando `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit`: limitador opcional de autenticación fallida. Se aplica por IP de cliente y por alcance de autenticación (shared-secret y device-token se rastrean de forma independiente). Los intentos bloqueados devuelven `429` + `Retry-After`.
  - En la ruta asíncrona de Control UI de Tailscale Serve, los intentos fallidos para el mismo `{scope, clientIp}` se serializan antes de la escritura de falla. Por lo tanto, los intentos incorrectos simultáneos del mismo cliente pueden activar el limitador en la segunda solicitud en lugar de competir ambos como simple desajuste.
  - `gateway.auth.rateLimit.exemptLoopback` se predetermina en `true`; configure `false` cuando intencionalmente desee que el tráfico de localhost también tenga límite de velocidad (para configuraciones de prueba o implementaciones de proxy estrictas).
- Los intentos de autenticación WS de origen del navegador siempre se limitan con la exención de loopback deshabilitada (defensa en profundidad contra la fuerza bruta de localhost basada en navegador).
- En el loopback, esos bloqueos de origen del navegador se aíslan por valor `Origin` normalizado, por lo que los fallos repetidos desde un origen de localhost no bloquean automáticamente un origen diferente.
- `tailscale.mode`: `serve` (solo tailnet, enlace de loopback) o `funnel` (público, requiere autenticación).
- `tailscale.preserveFunnel`: cuando `true` y `tailscale.mode = "serve"`, OpenClaw verifica `tailscale funnel status` antes de volver a aplicar Serve en el inicio y lo omite si una ruta de Funnel configurada externamente ya cubre el puerto del gateway. El valor predeterminado es `false`.
- `controlUi.allowedOrigins`: lista de permitidos explícita de origen del navegador para conexiones WebSocket de Gateway. Requerido para orígenes de navegador públicos que no sean de loopback. Las cargas de UI de LAN/Tailnet del mismo origen privado desde loopback, RFC1918/link-local, `.local`, `.ts.net` o hosts Tailscale CGNAT se aceptan sin habilitar la reserva de encabezado de Host.
- `controlUi.chatMessageMaxWidth`: ancho máximo opcional para mensajes de chat agrupados de Control UI. Acepta valores de ancho CSS restringidos como `960px`, `82%`, `min(1280px, 82%)` y `calc(100% - 2rem)`.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: modo peligroso que habilita la reserva de origen del encabezado de Host para implementaciones que dependen intencionalmente de la política de origen del encabezado de Host.
- `remote.transport`: `ssh` (predeterminado) o `direct` (ws/wss). Para `direct`, `remote.url` debe ser `wss://` para hosts públicos; se acepta `ws://` de texto sin formato solo para loopback, LAN, link-local, `.local`, `.ts.net` y hosts Tailscale CGNAT.
- `remote.remotePort`: puerto de gateway en el host SSH remoto. El valor predeterminado es `18789`; use esto cuando el puerto del túnel local difiera del puerto del gateway remoto.
- `gateway.remote.token` / `.password` son campos de credenciales de cliente remoto. No configuran la autenticación del gateway por sí mismos.
- `gateway.push.apns.relay.baseUrl`: URL HTTPS base para el relé APNs externo utilizado por compilaciones oficiales/TestFlight de iOS después de publicar registros respaldados por relé al gateway. Esta URL debe coincidir con la URL del relé compilada en la compilación de iOS.
- `gateway.push.apns.relay.timeoutMs`: tiempo de espera de envío de gateway a relé en milisegundos. El valor predeterminado es `10000`.
- Los registros respaldados por relé se delegan a una identidad de gateway específica. La aplicación iOS emparejada obtiene `gateway.identity.get`, incluye esa identidad en el registro de relé y reenvía una concesión de envío con alcance de registro al gateway. Otro gateway no puede reutilizar ese registro almacenado.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: anulaciones de entorno temporales para la configuración de relé anterior.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: escapatoria solo para desarrollo para URLs de relé HTTP de loopback. Las URLs de relé de producción deben mantenerse en HTTPS.
- `gateway.handshakeTimeoutMs`: tiempo de espera del protocolo de enlace de WebSocket de Gateway previo a la autenticación en milisegundos. Valor predeterminado: `15000`. `OPENCLAW_HANDSHAKE_TIMEOUT_MS` tiene prioridad cuando se establece. Aumente esto en hosts con carga o de baja potencia donde los clientes locales pueden conectarse mientras el calentamiento del inicio aún se está asentando.
- `gateway.channelHealthCheckMinutes`: intervalo de monitor de salud del canal en minutos. Configure `0` para deshabilitar globalmente los reinicios del monitor de salud. Valor predeterminado: `5`.
- `gateway.channelStaleEventThresholdMinutes`: umbral de socket obsoleto en minutos. Mantenga esto mayor o igual que `gateway.channelHealthCheckMinutes`. Valor predeterminado: `30`.
- `gateway.channelMaxRestartsPerHour`: reinicios máximos del monitor de salud por canal/cuenta en una hora móvil. Valor predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: opción de no participación por canal para los reinicios del monitor de salud manteniendo el monitor global habilitado.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación por cuenta para canales multicuenta. Cuando se establece, tiene prioridad sobre la anulación a nivel de canal.
- Las rutas de llamadas de gateway local pueden usar `gateway.remote.*` como respaldo solo cuando `gateway.auth.*` no está establecido.
- Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente a través de SecretRef y no resuelto, la resolución falla cerrada (sin enmascaramiento de respaldo remoto).
- `trustedProxies`: IPs de proxy inverso que terminan TLS o inyectan encabezados de cliente reenviado. Enumere solo los proxies que controle. Las entradas de loopback siguen siendo válidas para configuraciones de proxy/detección local en el mismo host (por ejemplo, Tailscale Serve o un proxy inverso local), pero **no** hacen que las solicitudes de loopback sean elegibles para `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback`: cuando `true`, el gateway acepta `X-Real-IP` si falta `X-Forwarded-For`. El valor predeterminado es `false` para el comportamiento de fallo cerrado.
- `gateway.nodes.pairing.autoApproveCidrs`: lista de permitidos CIDR/IP opcional para aprobar automáticamente el emparejamiento de dispositivos de nodo por primera vez sin alcances solicitados. Está deshabilitado cuando no está establecido. Esto no aprueba automáticamente el emparejamiento de operador/navegador/Control UI/WebChat, y no aprueba automáticamente actualizaciones de rol, alcance, metadatos o clave pública.
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`: configuración global de permitir/denegar para comandos de nodo declarados después del emparejamiento y la evaluación de la lista de permitidos de la plataforma. Use `allowCommands` para optar por comandos de nodo peligrosos como `camera.snap`, `camera.clip` y `screen.record`; `denyCommands` elimina un comando incluso si una permisión predeterminada de la plataforma o explícita de lo contrario lo incluiría. Después de que un nodo cambie su lista de comandos declarados, rechace y vuelva a aprobar ese emparejamiento de dispositivos para que el gateway almacene la instantánea de comandos actualizada.
- `gateway.tools.deny`: nombres de herramientas adicionales bloqueadas para HTTP `POST /tools/invoke` (extiende la lista de denegación predeterminada).
- `gateway.tools.allow`: elimina nombres de herramientas de la lista de denegación HTTP predeterminada.

</Accordion>

### Endpoints compatibles con OpenAI

- Admin HTTP RPC: desactivado de forma predeterminada como el complemento `admin-http-rpc`. Habilite el complemento para registrar `POST /api/v1/admin/rpc`. Consulte [Admin HTTP RPC](/es/plugins/admin-http-rpc).
- Chat Completions: desactivado de forma predeterminada. Actívelo con `gateway.http.endpoints.chatCompletions.enabled: true`.
- Responses API: `gateway.http.endpoints.responses.enabled`.
- Endurecimiento de entrada de URL de respuestas:
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    Las listas de permitidos vacías se tratan como no establecidas; use `gateway.http.endpoints.responses.files.allowUrl=false`
    y/o `gateway.http.endpoints.responses.images.allowUrl=false` para deshabilitar la recuperación de URL.
- Encabezado opcional de endurecimiento de respuesta:
  - `gateway.http.securityHeaders.strictTransportSecurity` (establezca solo para orígenes HTTPS que controle; consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### Aislamiento de múltiples instancias

Ejecute múltiples gateways en un solo host con puertos únicos y directorios de estado:

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

Marcadores de conveniencia: `--dev` (usa `~/.openclaw-dev` + puerto `19001`), `--profile <name>` (usa `~/.openclaw-<name>`).

Consulte [Multiple Gateways](/es/gateway/multiple-gateways).

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled`: habilita la terminación TLS en el oyente de la puerta de enlace (HTTPS/WSS) (predeterminado: `false`).
- `autoGenerate`: genera automáticamente un par de certificado/clave autofirmado local cuando no se configuran archivos explícitos; solo para uso local/desarrollo.
- `certPath`: ruta del sistema de archivos al archivo de certificado TLS.
- `keyPath`: ruta del sistema de archivos al archivo de clave privada TLS; manténgalo con permisos restringidos.
- `caPath`: ruta opcional del paquete de CA para verificación del cliente o cadenas de confianza personalizadas.

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode`: controla cómo se aplican las ediciones de configuración en tiempo de ejecución.
  - `"off"`: ignorar ediciones en vivo; los cambios requieren un reinicio explícito.
  - `"restart"`: reiniciar siempre el proceso de puerta de enlace al cambiar la configuración.
  - `"hot"`: aplicar cambios en proceso sin reiniciar.
  - `"hybrid"` (predeterminado): intentar la recarga en caliente primero; volver al reinicio si es necesario.
- `debounceMs`: ventana de antirrebote en ms antes de que se apliquen los cambios de configuración (entero no negativo).
- `deferralTimeoutMs`: tiempo máximo opcional en ms para esperar a que terminen las operaciones en curso antes de forzar un reinicio o una recarga en caliente del canal. Omítalo para usar la espera acotada predeterminada (`300000`); establece `0` para esperar indefinidamente y registrar advertencias periódicas de operaciones pendientes.

---

## Ganchos (Hooks)

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:", "hook:gmail:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

Auth: `Authorization: Bearer <token>` o `x-openclaw-token: <token>`.
Los tokens de gancho de cadena de consulta (query-string) son rechazados.

Notas de validación y seguridad:

- `hooks.enabled=true` requiere un `hooks.token` no vacío.
- `hooks.token` debe ser distinto de `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`; reutilizar el token de Gateway falla la validación de inicio.
- `openclaw security audit` también marca la `hooks.token` reutilización de la autenticación por contraseña activa de Gateway (`gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, o `--auth password --password <password>`) como un hallazgo crítico; la reutilización en modo contraseña sigue siendo compatible con el inicio y debe repararse rotando uno de los secretos.
- `hooks.path` no puede ser `/`; usa una subruta dedicada como `/hooks`.
- Si `hooks.allowRequestSessionKey=true`, restringe `hooks.allowedSessionKeyPrefixes` (por ejemplo `["hook:"]`).
- Si una asignación o preajuste usa una `sessionKey` con plantilla, establece `hooks.allowedSessionKeyPrefixes` y `hooks.allowRequestSessionKey=true`. Las claves de asignación estáticas no requieren esa participación explícita (opt-in).

**Puntos de conexión (Endpoints):**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - `sessionKey` del payload de la solicitud se acepta solo cuando `hooks.allowRequestSessionKey=true` (predeterminado: `false`).
- `POST /hooks/<name>` → resuelto vía `hooks.mappings`
  - Los valores de asignación `sessionKey` renderizados por plantilla se tratan como suministrados externamente y también requieren `hooks.allowRequestSessionKey=true`.

<Accordion title="Detalles del mapeo">

- `match.path` coincide con la sub-ruta después de `/hooks` (p. ej., `/hooks/gmail` → `gmail`).
- `match.source` coincide con un campo de payload para rutas genéricas.
- Las plantillas como `{{messages[0].subject}}` leen del payload.
- `transform` puede apuntar a un módulo JS/TS que devuelva una acción de hook.
  - `transform.module` debe ser una ruta relativa y permanecer dentro de `hooks.transformsDir` (se rechazan las rutas absolutas y el cruce de directorios).
  - Mantenga `hooks.transformsDir` bajo `~/.openclaw/hooks/transforms`; se rechazan los directorios de habilidades del espacio de trabajo. Si `openclaw doctor` informa que esta ruta no es válida, mueva el módulo de transformación al directorio de transformaciones de hooks o elimine `hooks.transformsDir`.
- `agentId` enruta a un agente específico; los IDs desconocidos vuelven al agente predeterminado.
- `allowedAgentIds`: restringe el enrutamiento efectivo del agente, incluyendo la ruta del agente predeterminado cuando se omite `agentId` (`*` u omitido = permitir todo, `[]` = denegar todo).
- `defaultSessionKey`: clave de sesión fija opcional para ejecuciones de agente de hook sin `sessionKey` explícito.
- `allowRequestSessionKey`: permite a los llamadores `/hooks/agent` y a las claves de sesión de mapeo controladas por plantillas establecer `sessionKey` (predeterminado: `false`).
- `allowedSessionKeyPrefixes`: lista de permitidos de prefijo opcional para valores `sessionKey` explícitos (solicitud + mapeo), p. ej., `["hook:"]`. Es obligatorio cuando cualquier mapeo o preajuste usa un `sessionKey` con plantilla.
- `deliver: true` envía la respuesta final a un canal; `channel` predeterminado es `last`.
- `model` anula el LLM para esta ejecución de hook (debe permitirse si se establece el catálogo de modelos).

</Accordion>

### Integración de Gmail

- La preconfiguración integrada de Gmail utiliza `sessionKey: "hook:gmail:{{messages[0].id}}"`.
- Si mantiene ese enrutamiento por mensaje, configure `hooks.allowRequestSessionKey: true` y restrinja `hooks.allowedSessionKeyPrefixes` para que coincida con el espacio de nombres de Gmail, por ejemplo `["hook:", "hook:gmail:"]`.
- Si necesita `hooks.allowRequestSessionKey: false`, anule la preconfiguración con una `sessionKey` estática en lugar del valor predeterminado con plantilla.

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

- El Gateway inicia automáticamente `gog gmail watch serve` al arrancar cuando está configurado. Establezca `OPENCLAW_SKIP_GMAIL_WATCHER=1` para desactivar.
- No ejecute un `gog gmail watch serve` separado junto al Gateway.

---

## Host del complemento Canvas

```json5
{
  plugins: {
    entries: {
      canvas: {
        config: {
          host: {
            root: "~/.openclaw/workspace/canvas",
            liveReload: true,
            // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
          },
        },
      },
    },
  },
}
```

- Sirve HTML/CSS/JS editable por el agente y A2UI a través de HTTP bajo el puerto del Gateway:
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- Solo local: mantenga `gateway.bind: "loopback"` (predeterminado).
- Enlaces que no son de bucle invertido: las rutas de canvas requieren autenticación del Gateway (token/contraseña/proxy de confianza), al igual que otras superficies HTTP del Gateway.
- Los WebViews de los nodos generalmente no envían encabezados de autenticación; después de que un nodo se empareja y conecta, el Gateway anuncia URLs de capacidades con ámbito de nodo para el acceso a canvas/A2UI.
- Las URL de capacidades están vinculadas a la sesión WS del nodo activo y caducan rápidamente. No se utiliza una alternativa basada en IP.
- Inyecta un cliente de recarga en vivo (live-reload) en el HTML servido.
- Crea automáticamente un `index.html` inicial cuando está vacío.
- También sirve A2UI en `/__openclaw__/a2ui/`.
- Los cambios requieren un reinicio del gateway.
- Desactive la recarga en vivo para directorios grandes o errores de `EMFILE`.

---

## Descubrimiento

### mDNS (Bonjour)

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal` (predeterminado cuando el complemento `bonjour` incluido está activado): omite `cliPath` + `sshPort` de los registros TXT.
- `full`: incluye `cliPath` + `sshPort`; la publicidad multicast de LAN todavía requiere que el complemento `bonjour` incluido esté activado.
- `off`: suprime la publicidad multicast de LAN sin cambiar la activación del complemento.
- El complemento `bonjour` incluido se inicia automáticamente en hosts macOS y es opcional en Linux, Windows y despliegues del Gateway en contenedores.
- El nombre de host predeterminado es el nombre de host del sistema cuando es una etiqueta DNS válida; de lo contrario, se usa `openclaw`. Anule con `OPENCLAW_MDNS_HOSTNAME`.

### Área amplia (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

Escribe una zona DNS-SD unicast bajo `~/.openclaw/dns/`. Para el descubrimiento entre redes, empareje con un servidor DNS (se recomienda CoreDNS) + DNS dividido de Tailscale.

Configuración: `openclaw dns setup --apply`.

---

## Entorno

### `env` (variables de entorno en línea)

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- Las variables de entorno en línea solo se aplican si falta la clave en el entorno del proceso.
- Archivos `.env`: CWD `.env` + `~/.openclaw/.env` (ninguno anula las variables existentes).
- `shellEnv`: importa las claves esperadas faltantes desde su perfil de shell de inicio de sesión.
- Consulte [Environment](/es/help/environment) para conocer la precedencia completa.

### Sustitución de variables de entorno

Referencie las variables de entorno en cualquier cadena de configuración con `${VAR_NAME}`:

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- Solo se coinciden los nombres en mayúsculas: `[A-Z_][A-Z0-9_]*`.
- Las variables faltantes o vacías generan un error al cargar la configuración.
- Escápelo con `$${VAR}` para un `${VAR}` literal.
- Funciona con `$include`.

---

## Secretos

Las referencias de secretos son aditivas: los valores de texto plano todavía funcionan.

### `SecretRef`

Use una forma de objeto:

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

Validación:

- patrón `provider`: `^[a-z][a-z0-9_-]{0,63}$`
- patrón de id `source: "env"`: `^[A-Z][A-Z0-9_]{0,127}$`
- id `source: "file"`: puntero JSON absoluto (por ejemplo, `"/providers/openai/apiKey"`)
- patrón de id `source: "exec"`: `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$` (admite selectores estilo AWS `secret#json_key`)
- Los ids `source: "exec"` no deben contener `.` o `..` segmentos de ruta delimitados por barras (por ejemplo, se rechaza `a/../b`)

### Superficie de credenciales admitida

- Matriz canónica: [SecretRef Credential Surface](/es/reference/secretref-credential-surface)
- Los destinos `secrets apply` admiten rutas de credenciales `openclaw.json`.
- Las referencias `auth-profiles.json` se incluyen en la resolución en tiempo de ejecución y la cobertura de auditoría.

### Configuración de proveedores de secretos

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // optional explicit env provider
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

Notas:

- El proveedor `file` admite `mode: "json"` y `mode: "singleValue"` (`id` debe ser `"value"` en modo singleValue).
- Las rutas de los proveedores File y exec fallan cerradas cuando la verificación de ACL de Windows no está disponible. Establezca `allowInsecurePath: true` solo para rutas confiables que no se puedan verificar.
- El proveedor `exec` requiere una ruta `command` absoluta y usa cargas útiles de protocolo en stdin/stdout.
- De forma predeterminada, se rechazan las rutas de comandos de enlaces simbólicos. Establezca `allowSymlinkCommand: true` para permitir rutas de enlaces simbólicos mientras se valida la ruta de destino resuelta.
- Si se configura `trustedDirs`, la verificación de directorio confiable se aplica a la ruta de destino resuelta.
- El entorno secundario de `exec` es mínimo de forma predeterminada; pase las variables necesarias explícitamente con `passEnv`.
- Las referencias de secretos se resuelven en el momento de la activación en una instantánea en memoria; luego, las rutas de solicitud solo leen la instantánea.
- El filtrado de superficie activa se aplica durante la activación: las referencias sin resolver en superficies habilitadas fallan el inicio/recarga, mientras que las superficies inactivas se omiten con diagnósticos.

---

## Almacenamiento de autenticación

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal"],
    },
  },
}
```

- Los perfiles por agente se almacenan en `<agentDir>/auth-profiles.json`.
- `auth-profiles.json` admite referencias a nivel de valor (`keyRef` para `api_key`, `tokenRef` para `token`) para modos de credenciales estáticas.
- Los mapas planos heredados de `auth-profiles.json` como `{ "provider": { "apiKey": "..." } }` no son un formato en tiempo de ejecución; `openclaw doctor --fix` los reescribe a perfiles de API-key canónicos `provider:default` con una copia de seguridad `.legacy-flat.*.bak`.
- Los perfiles en modo OAuth (`auth.profiles.<id>.mode = "oauth"`) no admiten credenciales de perfil de autenticación respaldadas por SecretRef.
- Las credenciales estáticas en tiempo de ejecución provienen de instantáneas resueltas en memoria; las entradas heredadas estáticas `auth.json` se eliminan cuando se descubren.
- Las importaciones heredadas de OAuth proceden de `~/.openclaw/credentials/oauth.json`.
- Consulte [OAuth](/es/concepts/oauth).
- Comportamiento en tiempo de ejecución de Secrets y herramientas de `audit/configure/apply`: [Secrets Management](/es/gateway/secrets).

### `auth.cooldowns`

```json5
{
  auth: {
    cooldowns: {
      billingBackoffHours: 5,
      billingBackoffHoursByProvider: { anthropic: 3, openai: 8 },
      billingMaxHours: 24,
      authPermanentBackoffMinutes: 10,
      authPermanentMaxMinutes: 60,
      failureWindowHours: 24,
      overloadedProfileRotations: 1,
      overloadedBackoffMs: 0,
      rateLimitedProfileRotations: 1,
    },
  },
}
```

- `billingBackoffHours`: retroceso base en horas cuando un perfil falla debido a errores reales
  de facturación/crédito insuficiente (predeterminado: `5`). El texto de facturación explícito aún
  puede aparecer aquí incluso en las respuestas `401`/`403`, pero los comparadores de texto
  específicos del proveedor siguen limitados al proveedor que los posee (por ejemplo, OpenRouter
  `Key limit exceeded`). Los mensajes reintentables de ventana de uso de HTTP `402` o
  de límite de gasto de la organización/espacio de trabajo permanecen en su lugar en la ruta `rate_limit`.
- `billingBackoffHoursByProvider`: anulaciones opcionales por proveedor para las horas de retroceso de facturación.
- `billingMaxHours`: límite en horas para el crecimiento exponencial del retroceso de facturación (predeterminado: `24`).
- `authPermanentBackoffMinutes`: retroceso base en minutos para fallos de `auth_permanent` de alta confianza (predeterminado: `10`).
- `authPermanentMaxMinutes`: límite en minutos para el crecimiento del retroceso de `auth_permanent` (predeterminado: `60`).
- `failureWindowHours`: ventana móvil en horas utilizada para los contadores de retroceso (predeterminado: `24`).
- `overloadedProfileRotations`: máximo de rotaciones de perfil de autenticación del mismo proveedor para errores de sobrecarga antes de cambiar a la alternativa del modelo (predeterminado: `1`). Las formas de proveedor ocupado, como `ModelNotReadyException`\*\*, se incluyen aquí.
- `overloadedBackoffMs`: retraso fijo antes de reintentar una rotación de proveedor/perfil sobrecargado (predeterminado: `0`).
- `rateLimitedProfileRotations`: rotaciones máximas de perfiles de autenticación del mismo proveedor para errores de límite de velocidad antes de cambiar al respaldo del modelo (predeterminado: `1`). Ese cubo de límite de velocidad incluye texto con forma de proveedor como `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded` y `resource exhausted`.

---

## Registro

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- Archivo de registro predeterminado: `/tmp/openclaw/openclaw-YYYY-MM-DD.log`.
- Establezca `logging.file` para una ruta estable.
- `consoleLevel` cambia a `debug` cuando `--verbose`.
- `maxFileBytes`: tamaño máximo del archivo de registro activo en bytes antes de la rotación (entero positivo; predeterminado: `104857600` = 100 MB). OpenClaw mantiene hasta cinco archivos numerados junto al archivo activo.
- `redactSensitive` / `redactPatterns`: enmascaramiento de mejor esfuerzo para la salida de la consola, registros de archivos, registros OTLP y texto de transcripción de sesión persistente. `redactSensitive: "off"` solo deshabilita esta política general de registro/transcripción; las superficies de seguridad de la interfaz de usuario/herramienta/diagnóstico todavía redactan secretos antes de la emisión.

---

## Diagnóstico

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 300000,
    memoryPressureSnapshot: false,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      tracesEndpoint: "https://traces.example.com/v1/traces",
      metricsEndpoint: "https://metrics.example.com/v1/metrics",
      logsEndpoint: "https://logs.example.com/v1/logs",
      protocol: "http/protobuf", // http/protobuf | grpc
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
        toolDefinitions: false,
      },
    },

    cacheTrace: {
      enabled: false,
      filePath: "~/.openclaw/logs/cache-trace.jsonl",
      includeMessages: true,
      includePrompt: true,
      includeSystem: true,
    },
  },
}
```

- `enabled`: interruptor maestro para la salida de instrumentación (predeterminado: `true`).
- `flags`: matriz de cadenas de banderas que habilitan la salida de registro dirigida (admite comodines como `"telegram.*"` o `"*"`).
- `stuckSessionWarnMs`: umbral de edad sin progreso en ms para clasificar sesiones de procesamiento de larga duración como `session.long_running`, `session.stalled` o `session.stuck`. El progreso de respuesta, herramienta, estado, bloque y ACP restablece el temporizador; los diagnósticos repetidos de `session.stuck` se reducen mientras no cambian.
- `stuckSessionAbortMs`: umbral de edad sin progreso en ms antes de que el trabajo activo detenido elegible pueda ser drenado por aborto para la recuperación. Cuando no está establecido, OpenClaw utiliza la ventana extendida más segura de ejecución integrada de al menos 5 minutos y 3x `stuckSessionWarnMs`.
- `memoryPressureSnapshot`: captura una instantánea de estabilidad redactada anterior al OOM cuando la presión de memoria alcanza `critical` (predeterminado: `false`). Establézcalo en `true` para agregar el escaneo/escritura del archivo de paquete de estabilidad manteniendo los eventos normales de presión de memoria.
- `otel.enabled`: habilita la canalización de exportación de OpenTelemetry (predeterminado: `false`). Para obtener la configuración completa, el catálogo de señales y el modelo de privacidad, consulte [OpenTelemetry export](/es/gateway/opentelemetry).
- `otel.endpoint`: URL del recolector para la exportación de OTel.
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`: endpoints OTLP opcionales específicos de la señal. Cuando se establecen, anulan `otel.endpoint` solo para esa señal.
- `otel.protocol`: `"http/protobuf"` (predeterminado) o `"grpc"`.
- `otel.headers`: encabezados de metadatos HTTP/gRPC adicionales enviados con las solicitudes de exportación de OTel.
- `otel.serviceName`: nombre del servicio para los atributos de recursos.
- `otel.traces` / `otel.metrics` / `otel.logs`: habilitan la exportación de trazas, métricas o registros.
- `otel.sampleRate`: tasa de muestreo de trazas `0`-`1`.
- `otel.flushIntervalMs`: intervalo de vaciado de telemetría periódica en ms.
- `otel.captureContent`: captura de contenido sin procesar opcional para los atributos del intervalo OTEL. El valor predeterminado es desactivado. El booleano `true` captura el contenido de mensajes/herramientas que no sean del sistema; el formato de objeto le permite habilitar `inputMessages`, `outputMessages`, `toolInputs`, `toolOutputs`, `systemPrompt` y `toolDefinitions` explícitamente.
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`: interruptor de entorno para la forma más reciente de span de inferencia experimental de GenAI, incluyendo nombres de span `{gen_ai.operation.name} {gen_ai.request.model}`, tipo de span `CLIENT`, y `gen_ai.provider.name` en lugar de `gen_ai.system` heredado. De forma predeterminada, los spans mantienen `openclaw.model.call` y `gen_ai.system` por compatibilidad; las métricas de GenAI usan atributos semánticos limitados.
- `OPENCLAW_OTEL_PRELOADED=1`: interruptor de entorno para hosts que ya han registrado un SDK global de OpenTelemetry. OpenClaw entonces omite el inicio/apagado del SDK propiedad del plugin mientras mantiene los escuchas de diagnóstico activos.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` y `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`: variables de entorno de endpoint específicas de la señal utilizadas cuando la clave de configuración coincidente no está establecida.
- `cacheTrace.enabled`: registrar instantáneas de traza de caché para ejecuciones integradas (predeterminado: `false`).
- `cacheTrace.filePath`: ruta de salida para la traza de caché JSONL (predeterminado: `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`).
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`: controlan qué se incluye en la salida de traza de caché (todos predeterminado: `true`).

---

## Actualizar

```json5
{
  update: {
    channel: "stable", // stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

- `channel`: canal de lanzamiento para instalaciones npm/git - `"stable"`, `"beta"` o `"dev"`.
- `checkOnStart`: buscar actualizaciones de npm cuando se inicia la puerta de enlace (predeterminado: `true`).
- `auto.enabled`: habilitar la autoactualización en segundo plano para instalaciones de paquetes (predeterminado: `false`).
- `auto.stableDelayHours`: retraso mínimo en horas antes de la autoaplicación del canal estable (predeterminado: `6`; máximo: `168`).
- `auto.stableJitterHours`: ventana de dispersión adicional de despliegue del canal estable en horas (predeterminado: `12`; máximo: `168`).
- `auto.betaCheckIntervalHours`: cada cuánto se ejecutan las comprobaciones del canal beta en horas (predeterminado: `1`; máx: `24`).

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
      hiddenBoundarySeparator: "paragraph", // none | space | newline | paragraph
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled`: puerta de enlace de características global de ACP (predeterminado: `true`; establezca `false` para ocultar el despacho de ACP y las capacidades de generación).
- `dispatch.enabled`: puerta de enlace independiente para el despacho de turnos de sesión de ACP (predeterminado: `true`). Establezca `false` para mantener los comandos de ACP disponibles mientras se bloquea la ejecución.
- `backend`: id del backend de tiempo de ejecución de ACP predeterminado (debe coincidir con un complemento de tiempo de ejecución de ACP registrado).
  Instale primero el complemento del backend y, si `plugins.allow` está configurado, incluya el id del complemento del backend (por ejemplo `acpx`) o el backend de ACP no se cargará.
- `defaultAgent`: id del agente de destino ACP de reserva cuando las generaciones no especifican un objetivo explícito.
- `allowedAgents`: lista de permitidos de ids de agentes permitidos para sesiones de tiempo de ejecución de ACP; vacío significa que no hay restricción adicional.
- `maxConcurrentSessions`: máximo de sesiones ACP activas simultáneamente.
- `stream.coalesceIdleMs`: ventana de vaciado inactivo en ms para texto transmitido.
- `stream.maxChunkChars`: tamaño máximo del fragmento antes de dividir la proyección del bloque transmitido.
- `stream.repeatSuppression`: suprimir líneas de estado/herramienta repetidas por turno (predeterminado: `true`).
- `stream.deliveryMode`: `"live"` transmite incrementalmente; `"final_only"` almacena en búfer hasta los eventos de terminal de turno.
- `stream.hiddenBoundarySeparator`: separador antes del texto visible después de eventos de herramientas ocultos (predeterminado: `"paragraph"`).
- `stream.maxOutputChars`: máximo de caracteres de salida del asistente proyectados por turno de ACP.
- `stream.maxSessionUpdateChars`: máximo de caracteres para las líneas de estado/actualización proyectadas de ACP.
- `stream.tagVisibility`: registro de nombres de etiquetas a anulaciones de visibilidad booleanas para eventos transmitidos.
- `runtime.ttlMinutes`: TTL inactivo en minutos para los trabajadores de sesión de ACP antes de ser elegibles para la limpieza.
- `runtime.installCommand`: comando de instalación opcional para ejecutar al iniciar un entorno de ejecución de ACP.

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `cli.banner.taglineMode` controla el estilo del eslogan del banner:
  - `"random"` (predeterminado): eslogan gracioso/estacional rotativo.
  - `"default"`: eslogan neutral fijo (`All your chats, one OpenClaw.`).
  - `"off"`: sin texto de eslogan (aún se muestra el título/versión del banner).
- Para ocultar todo el banner (no solo los eslóganes), establezca la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

---

## Asistente

Metadatos escritos por los flujos de configuración guiados de la CLI (`onboard`, `configure`, `doctor`):

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
  },
}
```

---

## Identidad

Consulte los campos de identidad `agents.list` en [Valores predeterminados del agente](/es/gateway/config-agents#agent-defaults).

---

## Puente (heredado, eliminado)

Las compilaciones actuales ya no incluyen el puente TCP. Los nodos se conectan a través del WebSocket de Gateway. Las claves `bridge.*` ya no forman parte del esquema de configuración (la validación falla hasta que se eliminen; `openclaw doctor --fix` puede eliminar claves desconocidas).

<Accordion title="Configuración del puente heredado (referencia histórica)">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## Cron

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

- `sessionRetention`: cuánto tiempo mantener las sesiones de ejecución de cron aisladas completadas antes de podarlas de `sessions.json`. También controla la limpieza de las transcripciones de cron archivadas y eliminadas. Predeterminado: `24h`; establezca `false` para desactivar.
- `runLog.maxBytes`: aceptado por compatibilidad con registros de ejecución de cron antiguos respaldados en archivo. Predeterminado: `2_000_000` bytes.
- `runLog.keepLines`: filas más recientes del historial de ejecuciones de SQLite conservadas por trabajo. Predeterminado: `2000`.
- `webhookToken`: token de portador utilizado para la entrega POST del webhook de cron (`delivery.mode = "webhook"`); si se omite, no se envía ningún encabezado de autenticación.
- `webhook`: URL de webhook de respaldo heredada en desuso (http/https) utilizada solo para trabajos almacenados que todavía tienen `notify: true`.

### `cron.retry`

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [30000, 60000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "timeout", "server_error"],
    },
  },
}
```

- `maxAttempts`: número máximo de reintentos para trabajos cron en errores transitorios (predeterminado: `3`; rango: `0`-`10`).
- `backoffMs`: matriz de retrasos de retroceso en ms para cada intento de reintento (predeterminado: `[30000, 60000, 300000]`; 1-10 entradas).
- `retryOn`: tipos de error que activan reintentos - `"rate_limit"`, `"overloaded"`, `"network"`, `"timeout"`, `"server_error"`. Omitir para reintentar todos los tipos transitorios.

Los trabajos de una sola vez permanecen habilitados hasta que se agoten los intentos de reintento, luego se deshabilitan manteniendo el estado de error final. Los trabajos recurrentes utilizan la misma política de reintento transitorio para ejecutarse nuevamente después del retroceso antes de su siguiente intervalo programado; los errores permanentes o los reintentos transitorios agotados vuelven al programa recurrente normal con retroceso por error.

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 3,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled`: habilitar alertas de falla para trabajos cron (predeterminado: `false`).
- `after`: fallos consecutivos antes de que se active una alerta (entero positivo, mínimo: `1`).
- `cooldownMs`: milisegundos mínimos entre alertas repetidas para el mismo trabajo (entero no negativo).
- `includeSkipped`: contar ejecuciones omitidas consecutivas hacia el umbral de alerta (predeterminado: `false`). Las ejecuciones omitidas se rastrean por separado y no afectan el retroceso por error de ejecución.
- `mode`: modo de entrega - `"announce"` envía a través de un mensaje de canal; `"webhook"` publica en el webhook configurado.
- `accountId`: id de cuenta o canal opcional para delimitar la entrega de alertas.

### `cron.failureDestination`

```json5
{
  cron: {
    failureDestination: {
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

- Destino predeterminado para las notificaciones de fallas de cron en todos los trabajos.
- `mode`: `"announce"` o `"webhook"`; predeterminado a `"announce"` cuando existen suficientes datos de destino.
- `channel`: anulación del canal para la entrega de anuncios. `"last"` reutiliza el último canal de entrega conocido.
- `to`: objetivo de anuncio explícito o URL de webhook. Obligatorio para el modo webhook.
- `accountId`: anulación opcional de la cuenta para la entrega.
- El `delivery.failureDestination` por trabajo anula este valor predeterminado global.
- Cuando no se establece ni un destino de error global ni por trabajo, los trabajos que ya se entregan a través de `announce` recurren a ese objetivo de anuncio principal en caso de error.
- `delivery.failureDestination` solo es compatible con trabajos `sessionTarget="isolated"` a menos que el `delivery.mode` principal del trabajo sea `"webhook"`.

Consulte [Cron Jobs](/es/automation/cron-jobs). Las ejecuciones de cron aisladas se rastrean como [tareas en segundo plano](/es/automation/tasks).

---

## Variables de plantilla de modelo multimedia

Marcadores de posición de plantilla expandidos en `tools.media.models[].args`:

| Variable           | Descripción                                                  |
| ------------------ | ------------------------------------------------------------ |
| `{{Body}}`         | Cuerpo completo del mensaje entrante                         |
| `{{RawBody}}`      | Cuerpo sin procesar (sin envoltorios de historial/remitente) |
| `{{BodyStripped}}` | Cuerpo sin menciones de grupo                                |
| `{{From}}`         | Identificador del remitente                                  |
| `{{To}}`           | Identificador del destino                                    |
| `{{MessageSid}}`   | ID del mensaje del canal                                     |
| `{{SessionId}}`    | UUID de la sesión actual                                     |
| `{{IsNewSession}}` | `"true"` cuando se crea una nueva sesión                     |
| `{{MediaUrl}}`     | Pseudo-URL multimedia entrante                               |
| `{{MediaPath}}`    | Ruta multimedia local                                        |
| `{{MediaType}}`    | Tipo de medio (imagen/audio/documento/…)                     |
| `{{Transcript}}`   | Transcripción de audio                                       |
| `{{Prompt}}`       | Prompt multimedia resuelto para entradas de CLI              |
| `{{MaxChars}}`     | Máximo de caracteres de salida resuelto para entradas de CLI |
| `{{ChatType}}`     | `"direct"` o `"group"`                                       |
| `{{GroupSubject}}` | Asunto del grupo (mejor esfuerzo)                            |
| `{{GroupMembers}}` | Vista previa de los miembros del grupo (mejor esfuerzo)      |
| `{{SenderName}}`   | Nombre para mostrar del remitente (mejor esfuerzo)           |
| `{{SenderE164}}`   | Número de teléfono del remitente (mejor esfuerzo)            |
| `{{Provider}}`     | Pista del proveedor (whatsapp, telegram, discord, etc.)      |

---

## Inclusiones de configuración (`$include`)

Dividir la configuración en varios archivos:

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**Comportamiento de fusión:**

- Archivo único: reemplaza el objeto que lo contiene.
- Matriz de archivos: fusionados en profundidad por orden (los posteriores anulan a los anteriores).
- Claves hermanas: fusionadas después de las inclusiones (anulan los valores incluidos).
- Inclusiones anidadas: hasta 10 niveles de profundidad.
- Rutas: resueltas en relación con el archivo que incluye, pero deben permanecer dentro del directorio de configuración de nivel superior (`dirname` de `openclaw.json`). Solo se permiten las formas absolutas/`../` cuando aún se resuelven dentro de ese límite. Las rutas no deben contener bytes nulos y deben ser estrictamente menores a 4096 caracteres antes y después de la resolución.
- Las escrituras propiedad de OpenClaw que cambian solo una sección de nivel superior respaldada por una inclusión de archivo único se escriben directamente en ese archivo incluido. Por ejemplo, `plugins install` actualiza `plugins: { $include: "./plugins.json5" }` en `plugins.json5` y deja `openclaw.json` intacto.
- Las inclusiones raíz, las matrices de inclusión y las inclusiones con anulaciones hermanas son de solo lectura para las escrituras propiedad de OpenClaw; esas escrituras fallan cerradas en lugar de aplanar la configuración.
- Errores: mensajes claros para archivos faltantes, errores de análisis, inclusiones circulares, formato de ruta no válido y longitud excesiva.

---

_Relacionado: [Configuración](/es/gateway/configuration) · [Ejemplos de configuración](/es/gateway/configuration-examples) · [Doctor](/es/gateway/doctor)_

## Relacionado

- [Configuración](/es/gateway/configuration)
- [Ejemplos de configuración](/es/gateway/configuration-examples)
