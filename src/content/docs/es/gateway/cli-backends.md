---
summary: "CLI backends: respaldo local de CLI de IA con puente de herramientas MCP opcional"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI backends"
---

OpenClaw puede ejecutar **CLI de IA locales** como un **respaldo de solo texto** cuando los proveedores de API están caídos,
con límites de tasa o comportándose mal temporalmente. Esto es intencionalmente conservador:

- **Las herramientas de OpenClaw no se inyectan directamente**, pero los backends con `bundleMcp: true`
  pueden recibir herramientas de puerta de enlace a través de un puente MCP de bucle invertido.
- **Transmisión JSONL** para las CLI que lo soportan.
- **Las sesiones son compatibles** (por lo que los turnos de seguimiento se mantienen coherentes).
- **Las imágenes se pueden pasar** si la CLI acepta rutas de imagen.

Esto está diseñado como una **red de seguridad** en lugar de una ruta principal. Úselo cuando desee respuestas de texto que "siempre funcionen" sin depender de API externas.

Si desea un entorno de ejecución completo con controles de sesión ACP, tareas en segundo plano,
vinculación de hilos/conversaciones y sesiones de codificación externas persistentes, use
[ACP Agents](/es/tools/acp-agents) en su lugar. Los backends de CLI no son ACP.

<Tip>¿Creando un nuevo complemento de backend? Use [Complementos de backend de CLI](/es/plugins/cli-backend-plugins). Esta página es para usuarios que configuran y operan un backend ya registrado.</Tip>

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

Si usa un backend de CLI incluido como el **proveedor de mensajes principal** en un
host de puerta de enlace, OpenClaw ahora carga automáticamente el plugin incluido propietario cuando su configuración
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

Cada entrada está keyed por un **id de proveedor** (ej. `claude-cli`, `my-cli`).
El id de proveedor se convierte en el lado izquierdo de su referencia de modelo:

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

1. **Selecciona un backend** basándose en el prefijo del proveedor (`claude-cli/...`).
2. **Construye un prompt del sistema** usando el mismo prompt de OpenClaw + contexto del espacio de trabajo.
3. **Ejecuta la CLI** con un id de sesión (si es compatible) para que el historial se mantenga coherente.
   El backend `claude-cli` incluido mantiene un proceso stdio de Claude vivo por
   sesión de OpenClaw y envía turnos de seguimiento a través de stdin stream-.
4. **Analiza la salida** (JSON o texto sin formato) y devuelve el texto final.
5. **Persiste los ids de sesión** por backend, para que las seguimientos reutilicen la misma sesión CLI.

<Note>El backend `claude-cli` de Anthropic incluido es compatible de nuevo. El personal de Anthropic nos dijo que el uso de Claude CLI estilo OpenClaw está permitido de nuevo, por lo que OpenClaw trata el uso de `claude -p` como sancionado para esta integración a menos que Anthropic publique una nueva política.</Note>

El backend Anthropic `claude-cli` incluido prefiere el solucionador de habilidades nativo de Claude Code
para las habilidades de OpenClaw. Cuando la instantánea actual de habilidades incluye al menos
una habilidad seleccionada con una ruta materializada, OpenClaw pasa un complemento temporal de Claude
Code con `--plugin-dir` y omite el catálogo duplicado de habilidades de OpenClaw
del mensaje del sistema anexado. Si la instantánea no tiene ninguna habilidad de complemento
materializada, OpenClaw mantiene el catálogo de mensajes como alternativa. Las anulaciones de env/clave API
de habilidad todavía son aplicadas por OpenClaw al entorno del proceso secundario para la
ejecución.

Claude CLI también tiene su propio modo de permiso no interactivo. OpenClaw asigna eso
a la política de ejecución existente en lugar de agregar configuración de política específica de Claude.
Para las sesiones en vivo de Claude administradas por OpenClaw, la política de ejecución efectiva de OpenClaw es
autoritativa: YOLO (`tools.exec.security: "full"` y
`tools.exec.ask: "off"`) inicia Claude con
`--permission-mode bypassPermissions`, mientras que una política de ejecución efectiva restrictiva
inicia Claude con `--permission-mode default`. La configuración
`agents.list[].tools.exec` por agente anula la `tools.exec` global para ese
agente. Los argumentos de backend sin procesar de Claude todavía pueden incluir `--permission-mode`, pero los inicios
de Claude en vivo normalizan esa marca para que coincida con la política de ejecución efectiva de OpenClaw.

El backend de Anthropic `claude-cli` incluido también mapea los niveles `/think` de OpenClaw
al indicador nativo `--effort` de Claude Code para niveles no desactivados. `minimal` y
`low` se mapean a `low`, `adaptive` y `medium` se mapean a `medium`, y `high`,
`xhigh` y `max` se mapean directamente. Otros backends de CLI necesitan que su plugin propietario declare
un mapeador de argv equivalente antes de que `/think` pueda afectar a la CLI iniciada.

Antes de que OpenClaw pueda usar el backend `claude-cli` incluido, el propio Claude Code
debe haber iniciado sesión en el mismo host:

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Use `agents.defaults.cliBackends.claude-cli.command` solo cuando el binario `claude`
ya no esté en `PATH`.

## Sesiones

- Si la CLI admite sesiones, establezca `sessionArg` (por ejemplo, `--session-id`) o
  `sessionArgs` (marcador de posición `{sessionId}`) cuando la ID deba insertarse
  en varios indicadores.
- Si la CLI usa un **subcomando de reanudación** con diferentes indicadores, establezca
  `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput`
  (para reanudaciones no JSON).
- `sessionMode`:
  - `always`: siempre enviar un id de sesión (nuevo UUID si no hay ninguno guardado).
  - `existing`: enviar un id de sesión solo si se había guardado uno antes.
  - `none`: nunca enviar un id de sesión.
- `claude-cli` tiene como valor predeterminado `liveSession: "claude-stdio"`, `output: "jsonl"`
  y `input: "stdin"`, por lo que los turnos de seguimiento reutilizan el proceso Claude activo mientras
  esté activo. Warm stdio es el valor predeterminado ahora, incluso para configuraciones personalizadas
  que omitan los campos de transporte. Si el Gateway se reinicia o el proceso inactivo
  termina, OpenClaw se reanuda desde el id de sesión de Claude almacenado. Los ids de sesión almacenados
  se verifican contra una transcripción de proyecto legible existente antes de
  la reanudación, por lo que los enlaces fantasma se borran con `reason=transcript-missing`
  en lugar de iniciar silenciosamente una nueva sesión de CLI de Claude bajo `--resume`.
- Las sesiones en vivo de Claude mantienen protecciones de salida JSONL delimitadas. Los valores predeterminados permiten hasta
  8 MiB y 20,000 líneas JSONL sin procesar por turno. Los turnos de Claude intensivos en herramientas pueden aumentarlas
  por backend con
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  y `maxTurnLines`; OpenClaw limita esos ajustes a 64 MiB y 100,000
  líneas.
- Las sesiones de CLI almacenadas son una continuidad propiedad del proveedor. El restablecimiento implícito diario de la sesión
  no las interrumpe; las políticas `/reset` y `session.reset` explícitas aún
  lo hacen.
- Las sesiones nuevas de CLI normalmente solo se reinician desde el resumen de compactación
  de OpenClaw más la cola posterior a la compactación. Para recuperar sesiones cortas que se invalidan
  antes de la compactación, un backend puede optar por
  `reseedFromRawTranscriptWhenUncompacted: true`. OpenClaw aún mantiene el
  reinicio de la transcripción sin procesar delimitado y lo limita a invalidaciones seguras, como transcripciones
  de CLI faltantes, cambios de system-prompt/MCP o reintento de sesión expirada; los cambios
  en el perfil de autenticación o en la época de credenciales nunca reinician el historial de transcripciones sin procesar.

Notas de serialización:

- `serialize: true` mantiene las ejecuciones del mismo carril ordenadas.
- La mayoría de las CLI se serializan en un carril de proveedor.
- OpenClaw descarta el reuso de la sesión de CLI almacenada cuando cambia la identidad de autenticación seleccionada, incluyendo un id de perfil de autenticación cambiado, clave API estática, token estático o identidad de cuenta OAuth cuando la CLI expone una. La rotación de tokens de acceso y actualización de OAuth no interrumpe la sesión de CLI almacenada. Si una CLI no expone un id de cuenta OAuth estable, OpenClaw permite que esa CLI haga cumplir los permisos de reanudación.

## Preludio de respaldo desde sesiones de claude-cli

Cuando un intento de `claude-cli` pasa a un candidato que no es de CLI en
[`agents.defaults.model.fallbacks`](/es/concepts/model-failover), OpenClaw siembra
el siguiente intento con un preludio de contexto cosechado de la transcripción JSONL local
de Claude Code en `~/.claude/projects/`. Sin esta semilla, el proveedor de reserva
comenzaría en frío porque la propia transcripción de sesión de OpenClaw está vacía
para las ejecuciones de `claude-cli`.

- El preludio prefiere el último resumen `/compact` o el marcador `compact_boundary`,
  y luego añade los turnos posteriores al límite más recientes hasta alcanzar un
  presupuesto de caracteres. Los turnos previos al límite se omiten porque el resumen
  ya los representa.
- Los bloques de herramientas se unen para compactar las sugerencias `(tool call: name)` y
  `(tool result: …)` para mantener el presupuesto del prompt honesto. El resumen se
  etiqueta como `(truncated)` si se desborda.
- Las reservas `claude-cli` a `claude-cli` del mismo proveedor se basan en la propia
  `--resume` de Claude y omiten el preludio.
- La semilla reutiliza la validación existente de la ruta del archivo de sesión de Claude, por lo que no se pueden leer rutas arbitrarias.

## Imágenes (transferencia directa)

Si su CLI acepta rutas de imagen, establezca `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está configurado, esas
rutas se pasan como argumentos de CLI. Si `imageArg` no está presente, OpenClaw añade las
rutas de archivo al prompt (inyección de ruta), lo cual es suficiente para las CLI que cargan
automáticamente archivos locales desde rutas simples.

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- Para la salida JSON de la CLI de Gemini, OpenClaw lee el texto de respuesta desde `response` y
  el uso desde `stats` cuando `usage` falta o está vacío.
- `output: "jsonl"` analiza flujos JSONL y extrae el mensaje final del agente más los
  identificadores de sesión cuando están presentes.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el prompt como el último argumento de CLI.
- `input: "stdin"` envía el prompt a través de stdin.
- Si el prompt es muy largo y `maxPromptArgChars` está configurado, se usa stdin.

## Valores predeterminados (propiedad del plugin)

Los valores predeterminados del backend de CLI integrados viven con su complemento propietario. Por ejemplo,
Anthropic posee `claude-cli` y Google posee `google-gemini-cli`. Las ejecuciones del agente de
OpenAI Codex utilizan el arnés del servidor de aplicaciones de Codex a través de `openai/*`; OpenClaw ya
no registra un backend `codex-cli` integrado.

El complemento Anthropic integrado registra un valor predeterminado para `claude-cli`:

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

El complemento de Google incluido también registra un valor predeterminado para `google-gemini-cli`:

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
- El uso vuelve a `stats` cuando `usage` está ausente o vacío.
- `stats.cached` se normaliza en OpenClaw `cacheRead`.
- Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
  `stats.input_tokens - stats.cached`.

Anule solo si es necesario (común: ruta absoluta de `command`).

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

`input` reescribe el sistema y el mensaje del usuario pasados a la CLI. `output`
reescribe los deltas del asistente transmitidos y el texto final analizado antes de que OpenClaw maneje
sus propios marcadores de control y entrega de canales.

Para las CLI que emiten JSONL compatible con stream- de Claude Code, establezca
`jsonlDialect: "claude-stream-json"` en la configuración de ese backend.

## Superposiciones MCP incluidas

Los backends de CLI **no** reciben llamadas a herramientas de OpenClaw directamente, pero un backend puede
optar por una superposición de configuración MCP generada con `bundleMcp: true`.

Comportamiento incluido actual:

- `claude-cli`: archivo de configuración MCP estricto generado
- `google-gemini-cli`: archivo de configuración del sistema Gemini generado

Cuando se habilita el MCP incluido, OpenClaw:

- inicia un servidor MCP HTTP de bucle invertido que expone las herramientas de puerta de enlace al proceso de CLI
- autentica el puente con un token por sesión (`OPENCLAW_MCP_TOKEN`)
- limita el acceso a las herramientas a la sesión, cuenta y contexto del canal actuales
- carga los servidores bundle-MCP habilitados para el espacio de trabajo actual
- los fusiona con cualquier forma de configuración/ajustes de MCP del backend existente
- reescribe la configuración de lanzamiento utilizando el modo de integración propiedad del backend desde la extensión propietaria

Si no hay servidores MCP habilitados, OpenClaw aún inyecta una configuración estricta cuando un backend opta por el MCP de paquete para que las ejecuciones en segundo plano sigan aisladas.

Los tiempos de ejecución de MCP empaquetados con ámbito de sesión se almacenan en caché para su reutilización dentro de una sesión y luego se eliminan después de `mcp.sessionIdleTtlMs` milisegundos de inactividad (por defecto 10 minutos; configure `0` para desactivar). Las ejecuciones integradas de un solo uso, como sondas de autenticación, generación de slugs y limpieza de solicitudes de recuperación de memoria activa al final de la ejecución, para que los procesos secundarios stdio y las transmisiones HTTP/SSE transmisibles no sobrevivan a la ejecución.

## Límite del historial de resiembra

Cuando una sesión CLI nueva se siembra a partir de una transcripción anterior de OpenClaw (por ejemplo, después de un reintento de `session_expired`), el bloque `<conversation_history>` renderizado se limita para evitar que los avisos de resiembra exploten. El valor predeterminado es `12288` caracteres (aproximadamente 3000 tokens).

Los backends de la CLI de Claude usan automáticamente un límite mayor derivado del nivel de contexto de Claude resuelto. Las ejecuciones estándar de Claude de 200K tokens mantienen un segmento de transcripción mayor, y las ejecuciones de Claude de 1M tokens mantienen un segmento aún mayor, mientras que otros backends de CLI mantienen el valor predeterminado conservador.

- El límite solo rige el bloque de historial previo del aviso de resiembra. Los límites de salida de la sesión en vivo se ajustan por separado en `reliability.outputLimits`
  (consulte [Sesiones](#sessions)).

## Limitaciones

- **Sin llamadas directas a herramientas de OpenClaw.** OpenClaw no inyecta llamadas a herramientas en el protocolo del backend CLI. Los backends solo ven las herramientas de la puerta de enlace cuando optan por `bundleMcp: true`.
- **La transmisión es específica del backend.** Algunos backends transmiten JSONL; otros almacenan en búfer hasta salir.
- Las **salidas estructuradas** dependen del formato JSON de la CLI.

## Solución de problemas

- **CLI no encontrada**: configure `command` con una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para asignar `provider/model` → modelo CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté configurado y de que `sessionMode` no sea `none`.
- **Imágenes ignoradas**: configure `imageArg` (y verifique que la CLI admita rutas de archivo).

## Relacionado

- [Manual de operaciones de la puerta de enlace](/es/gateway)
- [Modelos locales](/es/gateway/local-models)
