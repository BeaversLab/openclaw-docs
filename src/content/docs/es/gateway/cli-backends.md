---
summary: "CLI backends: local AI CLI fallback with optional MCP tool bridge"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI backends"
---

OpenClaw puede ejecutar **CLI de IA locales** como un **respaldo de solo texto** cuando los proveedores de API están caídos,
con límites de tasa o comportándose mal temporalmente. Esto es intencionalmente conservador:

- **OpenClaw tools are not injected directly**, pero los backends con `bundleMcp: true`
  pueden recibir herramientas de puerta de enlace a través de un puente MCP de bucle de retorno.
- **Transmisión JSONL** para las CLI que lo soportan.
- **Las sesiones son compatibles** (por lo que los turnos de seguimiento se mantienen coherentes).
- **Las imágenes se pueden pasar** si la CLI acepta rutas de imagen.

Esto está diseñado como una **red de seguridad** en lugar de una ruta principal. Úselo cuando desee respuestas de texto que "siempre funcionen" sin depender de API externas.

Si desea un tiempo de ejecución completo de arnés con controles de sesión ACP, tareas en segundo plano,
vinculación de subprocesos/conversaciones y sesiones de codificación externas persistentes, use
[ACP Agents](/es/tools/acp-agents) en su lugar. Los backends de CLI no son ACP.

<Tip>¿Construyendo un nuevo complemento de backend? Use [CLI backend plugins](/es/plugins/cli-backend-plugins). Esta página es para usuarios que configuran y operan un backend ya registrado.</Tip>

## Inicio rápido fácil para principiantes

Puede usar Claude Code CLI **sin ninguna configuración** (el plugin de Anthropic incluido
registra un backend predeterminado):

```bash
openclaw agent --message "hi" --model claude-cli/claude-sonnet-4-6
```

Si su gateway se ejecuta bajo launchd/systemd y PATH es mínimo, agregue solo la
ruta del comando:

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

Eso es todo. No se necesitan claves ni configuración de autenticación adicional más allá de la propia CLI.

Si usa un backend de CLI empaquetado como el **proveedor principal de mensajes** en un
host de puerta de enlace, OpenClaw ahora carga automáticamente el complemento empaquetado propietario cuando su configuración
hace referencia explícita a ese backend en una referencia de modelo o en
`agents.defaults.cliBackends`.

## Uso como alternativa (fallback)

Agrega un backend CLI a tu lista de alternativas para que solo se ejecute cuando fallen los modelos principales:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["claude-cli/claude-sonnet-4-6"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/claude-sonnet-4-6": {},
      },
    },
  },
}
```

Notas:

- Si usa `agents.defaults.models` (lista de permitidos), también debe incluir sus modelos de backend de CLI allí.
- Si el proveedor principal falla (autenticación, límites de tasa, tiempos de espera), OpenClaw
  intentará con el backend CLI a continuación.

## Resumen de configuración

Todos los backends CLI residen en:

```
agents.defaults.cliBackends
```

Cada entrada está claveada por un **id de proveedor** (ej. `claude-cli`, `my-cli`).
El id del proveedor se convierte en el lado izquierdo de su referencia de modelo:

```
<provider>/<model>
```

### Ejemplo de configuración

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
            "claude-sonnet-4-6": "sonnet",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          // For CLIs with a dedicated prompt-file flag:
          // systemPromptFileArg: "--system-file",
          // Codex-style CLIs can point at a prompt file instead:
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          // Opt in only if this backend may reseed safe invalidated sessions
          // from bounded raw OpenClaw transcript history before compaction.
          reseedFromRawTranscriptWhenUncompacted: true,
          serialize: true,
        },
      },
    },
  },
}
```

## Cómo funciona

1. **Selecciona un backend** basado en el prefijo del proveedor (`claude-cli/...`).
2. **Construye un prompt del sistema** usando el mismo prompt de OpenClaw + contexto del espacio de trabajo.
3. **Ejecuta el CLI** con un id de sesión (si es compatible) para que el historial se mantenga consistente.
   El backend empaquetado `claude-cli` mantiene un proceso Claude stdio vivo por
   sesión de OpenClaw y envía turnos de seguimiento a través de stream- stdin.
4. **Analiza la salida** (JSON o texto sin formato) y devuelve el texto final.
5. **Persiste los ids de sesión** por backend, para que las seguimientos reutilicen la misma sesión CLI.

<Note>El backend empaquetado de Anthropic `claude-cli` es compatible nuevamente. El personal de Anthropic nos informó que el uso de Claude CLI estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata el uso de `claude -p` como sancionado para esta integración a menos que Anthropic publique una nueva política.</Note>

El backend `claude-cli` de Anthropic incluido prefiere el solucionador de habilidades
nativo de Claude Code para las habilidades de OpenClaw. Cuando la instantánea
de habilidades actual incluye al menos una habilidad seleccionada con una ruta
materializada, OpenClaw pasa un complemento temporal de Claude Code con
`--plugin-dir` y omite el catálogo de habilidades duplicado de
OpenClaw del prompt del sistema anexado. Si la instantánea no tiene ninguna
habilidad de complemento materializada, OpenClaw mantiene el catálogo del
prompt como respaldo. Las anulaciones de entorno/clave API de habilidad
todavía son aplicadas por OpenClaw al entorno del proceso secundario para la
ejecución.

Claude CLI también tiene su propio modo de permisos no interactivo. OpenClaw
asigna eso a la política de ejecución existente en lugar de agregar una
configuración de política específica de Claude. Para las sesiones en vivo de
Claude administradas por OpenClaw, la política de ejecución efectiva de
OpenClaw es la autoridad: YOLO (`tools.exec.security: "full"` y
`tools.exec.ask: "off"`) lanza Claude con
`--permission-mode bypassPermissions`, mientras que una política de ejecución
efectiva restrictiva lanza Claude con `--permission-mode default`. La
configuración `agents.list[].tools.exec` por agente anula el
`tools.exec` global para ese agente. Los argumentos
brutos del backend de Claude aún pueden incluir `--permission-mode`,
pero los lanzamientos de Claude en vivo normalizan esa bandera para que
coincida con la política de ejecución efectiva de OpenClaw.

El backend `claude-cli` de Anthropic incluido también asigna los
niveles `/think` de OpenClaw a la bandera nativa
`--effort` de Claude Code para niveles no apagados.
`minimal` y `low` se asignan a
`low`, `adaptive` y
`medium` se asignan a `medium`, y
`high`, `xhigh` y
`max` se asignan directamente. Otros backends de CLI
necesitan que su complemento propietario declare un asignador argv equivalente
antes de que `/think` pueda afectar a la CLI generada.

Antes de que OpenClaw pueda usar el backend `claude-cli` incluido,
Claude Code mismo ya debe haber iniciado sesión en el mismo host:

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Use `agents.defaults.cliBackends.claude-cli.command` solo cuando el binario `claude`
no esté ya en `PATH`.

## Sesiones

- Si la CLI soporta sesiones, establezca `sessionArg` (p. ej., `--session-id`) o
  `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID necesita ser insertado
  en múltiples flags.
- Si la CLI usa un **subcomando de reanudación** con diferentes flags, establezca
  `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput`
  (para reanudaciones no JSON).
- `sessionMode`:
  - `always`: enviar siempre un id de sesión (nuevo UUID si no hay ninguno guardado).
  - `existing`: enviar un id de sesión solo si se ha guardado uno antes.
  - `none`: nunca enviar un id de sesión.
- `claude-cli` por defecto es `liveSession: "claude-stdio"`, `output: "jsonl"`,
  y `input: "stdin"` por lo que los turnos de seguimiento reutilizan el proceso Claude en vivo mientras
  está activo. Warm stdio es el valor predeterminado ahora, incluyendo para configuraciones personalizadas
  que omiten campos de transporte. Si el Gateway se reinicia o el proceso inactivo
  sale, OpenClaw se reanuda desde el id de sesión Claude almacenado. Los ids de sesión
  almacenados se verifican contra una transcripción de proyecto legible existente antes
  de reanudar, por lo que los enlaces fantasma se borran con `reason=transcript-missing`
  en lugar de iniciar silenciosamente una nueva sesión de Claude CLI bajo `--resume`.
- Las sesiones en vivo de Claude mantienen guardas de salida JSONL delimitadas. Los valores predeterminados permiten hasta
  8 MiB y 20,000 líneas JSONL sin procesar por turno. Los turnos de Claude con uso intensivo de herramientas pueden aumentarlas
  por backend con
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  y `maxTurnLines`; OpenClaw limita esos valores a 64 MiB y 100,000
  líneas.
- Las sesiones de CLI almacenadas son continuidad propiedad del proveedor. El reinicio diario implícito
  de la sesión no las corta; `/reset` y las políticas explícitas de `session.reset` todavía
  lo hacen.
- Las sesiones de CLI nuevas normalmente se reinician solo con el resumen de compactación de OpenClaw más la cola posterior a la compactación. Para recuperar sesiones cortas que se invalidan antes de la compactación, un backend puede optar por `reseedFromRawTranscriptWhenUncompacted: true`. OpenClaw sigue manteniendo el reinicio de la transcripción sin procesar limitado y lo restringe a invalidaciones seguras, como transcripciones de CLI faltantes, cambios en el system-prompt/MCP o reintentos por sesión expirada; los cambios en el perfil de autenticación o en la época de credenciales nunca reinician el historial de transcripciones sin procesar.

Notas de serialización:

- `serialize: true` mantiene las ejecuciones del mismo carril ordenadas.
- La mayoría de las CLI se serializan en un carril de proveedor.
- OpenClaw descarta el reuso de la sesión de CLI almacenada cuando cambia la identidad de autenticación seleccionada, incluyendo un id de perfil de autenticación cambiado, clave API estática, token estático o identidad de cuenta OAuth cuando la CLI expone una. La rotación de tokens de acceso y actualización de OAuth no interrumpe la sesión de CLI almacenada. Si una CLI no expone un id de cuenta OAuth estable, OpenClaw permite que esa CLI haga cumplir los permisos de reanudación.

## Preludio de respaldo desde sesiones de claude-cli

Cuando un intento de `claude-cli` cambia a un candidato que no es de CLI en [`agents.defaults.model.fallbacks`](/es/concepts/model-failover), OpenClaw inicializa el siguiente intento con un preludio de contexto recolectado de la transcripción JSONL local de Claude Code en `~/.claude/projects/`. Sin este inicializador, el proveedor de respaldo comenzaría en frío porque la transcripción de la propia sesión de OpenClaw está vacía para las ejecuciones de `claude-cli`.

- El preludio prefiere el último resumen `/compact` o el marcador `compact_boundary`, y luego añade los turnos posteriores al límite más recientes hasta alcanzar un límite de caracteres. Los turnos previos al límite se descartan porque el resumen ya los representa.
- Los bloques de herramientas se fusionan para compactar las sugerencias `(tool call: name)` y `(tool result: …)` para mantener el presupuesto del prompt honesto. El resumen se etiqueta como `(truncated)` si se desborda.
- Las conmutaciones por error de `claude-cli` a `claude-cli` del mismo proveedor se basan en el propio `--resume` de Claude y omiten el preludio.
- La semilla reutiliza la validación existente de la ruta del archivo de sesión de Claude, por lo que no se pueden leer rutas arbitrarias.

## Imágenes (transferencia directa)

Si su CLI acepta rutas de imagen, configure `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si se configura `imageArg`, esas rutas se pasan como argumentos de CLI. Si falta `imageArg`, OpenClaw añade las rutas de archivo al prompt (inyección de ruta), lo cual es suficiente para las CLI que cargan automáticamente archivos locales desde rutas simples.

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- Para la salida JSON de la CLI de Gemini, OpenClaw lee el texto de respuesta de `response` y
  el uso de `stats` cuando `usage` falta o está vacío.
- `output: "jsonl"` analiza flujos JSONL y extrae el mensaje final del agente más identificadores
  de sesión cuando están presentes.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el mensaje como el último argumento de la CLI.
- `input: "stdin"` envía el mensaje a través de stdin.
- Si el mensaje es muy largo y `maxPromptArgChars` está configurado, se usa stdin.

## Valores predeterminados (propiedad del plugin)

Los valores predeterminados del backend de CLI incluidos residen con su complemento propietario. Por ejemplo,
Anthropic posee `claude-cli` y Google posee `google-gemini-cli`. Las ejecuciones del agente OpenAI Codex
usan el arnés del servidor de aplicaciones Codex a través de `openai/*`; OpenClaw ya
no registra un backend `codex-cli` incluido.

El complemento incluido de Anthropic registra un valor predeterminado para `claude-cli`:

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

El complemento incluido de Google también registra un valor predeterminado para `google-gemini-cli`:

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

Requisito previo: la CLI local de Gemini debe estar instalada y disponible como
`gemini` en `PATH` (`brew install gemini-cli` o
`npm install -g @google/gemini-cli`).

Notas sobre JSON de la CLI de Gemini:

- El texto de respuesta se lee del campo JSON `response`.
- El uso recurre a `stats` cuando `usage` está ausente o vacío.
- `stats.cached` se normaliza en OpenClaw `cacheRead`.
- Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
  `stats.input_tokens - stats.cached`.

Anule solo si es necesario (común: ruta `command` absoluta).

## Valores predeterminados propiedad del complemento

Los valores predeterminados del backend de CLI ahora forman parte de la superficie del complemento:

- Los complementos los registran con `api.registerCliBackend(...)`.
- El `id` del backend se convierte en el prefijo del proveedor en las referencias del modelo.
- La configuración del usuario en `agents.defaults.cliBackends.<id>` aún anula el valor predeterminado del complemento.
- La limpieza de configuración específica del backend sigue siendo propiedad del complemento a través del enlace opcional
  `normalizeConfig`.

Los complementos que necesitan pequeños adaptadores de compatibilidad de mensajes/prompt pueden declarar
transformaciones de texto bidireccionales sin reemplazar un proveedor o un backend de CLI:

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` reescribe el prompt del sistema y el prompt del usuario pasados a la CLI. `output`
reescribe los deltas del asistente transmitidos y el texto final analizado antes de que OpenClaw maneje
sus propios marcadores de control y la entrega del canal.

Para las CLI que emiten JSONL compatible con stream- de Claude Code, establezca
`jsonlDialect: "claude-stream-json"` en la configuración de ese backend.

## Propiedad de la compactación nativa

Algunos backends de CLI ejecutan un agente que compacta su **propia** transcripción, por lo que OpenClaw no debe
ejecutar su resumidor de salvaguardia contra ellos; hacerlo va en contra de la propia
compactación del backend y puede hacer que el turno falle irremediablemente.

`claude-cli` no tiene un endpoint de harness - Claude Code compacta internamente - por lo que declara
`ownsNativeCompaction: true`, y OpenClaw devuelve una no-op desde la ruta de compactación.
Las sesiones de harness nativas como Codex siguen enrutando a su endpoint de compactación de harness
en su lugar.

Debido a que el backend es propietario de la compactación, la antigua solución temporal de establecer
`contextTokens: 1_000_000` puramente para evitar que la salvaguardia de OpenClaw se active en una
sesión de claude-cli **ya no es necesaria**: la opción de no participar la reemplaza.

```typescript
api.registerCliBackend({ id: "my-cli", ownsNativeCompaction: true /* ... */ });
```

Solo declare `ownsNativeCompaction` para un backend que realmente sea propietario de su compactación: debe
limitar de manera confiable su propia transcripción a medida que se acerca a su ventana de contexto y persistir una
sesión reanudable (por ejemplo, `--resume` / `--session-id`); de lo contrario, una sesión diferida puede
permanecer por encima del presupuesto. Las sesiones que coinciden con `agentHarnessId` todavía se enrutan al endpoint de harness.

## Superposiciones de MCP en paquetes

Los backends de CLI **no** reciben llamadas a herramientas de OpenClaw directamente, pero un backend puede
optar por una superposición de configuración MCP generada con `bundleMcp: true`.

Comportamiento agrupado actual:

- `claude-cli`: archivo de configuración MCP estricto generado
- `google-gemini-cli`: archivo de configuración del sistema Gemini generado

Cuando el MCP agrupado está habilitado, OpenClaw:

- inicia un servidor MCP HTTP de bucle local que expone las herramientas de la puerta de enlace al proceso de la CLI
- autentica el puente con un token por sesión (`OPENCLAW_MCP_TOKEN`)
- limita el acceso a las herramientas al contexto de la sesión, cuenta y canal actuales
- carga los servidores MCP agrupados habilitados para el espacio de trabajo actual
- los fusiona con cualquier forma de configuración/ajustes MCP de backend existente
- reescribe la configuración de lanzamiento utilizando el modo de integración propiedad del backend de la extensión propietaria

Si no hay servidores MCP habilitados, OpenClaw aún inyecta una configuración estricta cuando un
backend acepta el MCP agrupado para que las ejecuciones en segundo plano permanezcan aisladas.

Los tiempos de ejecución MCP agrupados con ámbito de sesión se almacenan en caché para su reutilización dentro de una sesión y luego
se eliminan después de `mcp.sessionIdleTtlMs` milisegundos de tiempo de inactividad (10 minutos por
defecto; establezca `0` para desactivar). Las ejecuciones integradas de un solo uso, como sondas de autenticación,
generación de slugs y limpieza de solicitudes de recuerdo de memoria activa al final de la ejecución, garantizan que los procesos hijos stdio
y las transmisiones HTTP/SSE transmisibles no sobrevivan a la ejecución.

## Límite de historial de resiembra

Cuando una sesión de CLI nueva se inicializa a partir de una transcripción previa de OpenClaw (por
ejemplo, después de un reintento de `session_expired`), el bloque
`<conversation_history>` renderizado se limita para evitar que los
prompts de resiembra crezcan excesivamente. El valor predeterminado es `12288` caracteres (unos 3000 tokens).

Los backends de la CLI de Claude utilizan automáticamente un límite mayor derivado del nivel
de contexto de Claude resuelto. Las ejecuciones estándar de Claude de 200K tokens mantienen un segmento de transcripción
mayor, y las ejecuciones de Claude de 1M tokens mantienen un segmento aún mayor, mientras que otros backends de
CLI mantienen el valor predeterminado conservador.

- El límite solo rige el bloque de historial previo del prompt de resiembra. Los límites de
  salida de la sesión en vivo se ajustan por separado en `reliability.outputLimits`
  (consulte [Sesiones](#sessions)).

## Limitaciones

- **Sin llamadas directas a herramientas de OpenClaw.** OpenClaw no inyecta llamadas a herramientas en
  el protocolo del backend de la CLI. Los backends solo ven las herramientas de la puerta de enlace cuando aceptan
  `bundleMcp: true`.
- **La transmisión (streaming) es específica del backend.** Algunos backends transmiten JSONL; otros almacenan en el búfer hasta salir.
- **Las salidas estructuradas** dependen del formato JSON del CLI.

## Solución de problemas

- **CLI no encontrado**: establezca `command` en una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para asignar `provider/model` → modelo CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté establecido y `sessionMode` no sea
  `none`.
- **Imágenes ignoradas**: establezca `imageArg` (y verifique que el CLI sea compatible con rutas de archivo).

## Relacionado

- [Manual de procedimientos de puerta de enlace](/es/gateway)
- [Modelos locales](/es/gateway/local-models)
