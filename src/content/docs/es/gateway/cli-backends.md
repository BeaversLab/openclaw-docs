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

Si desea un tiempo de ejecución completo con controles de sesión ACP, tareas en segundo plano,
vinculación de hilos/conversaciones y sesiones de codificación externas persistentes, use
[ACP Agents](/es/tools/acp-agents) en su lugar. Los backends de CLI no son ACP.

<Tip>¿Construyendo un nuevo plugin de backend? Use [Plugins de backend de CLI](/es/plugins/cli-backend-plugins). Esta página es para usuarios que configuran y operan un backend ya registrado.</Tip>

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

El backend `claude-cli` de Anthropic incluido recibe la instantánea de habilidades de OpenClaw
de dos formas: el catálogo compacto de habilidades de OpenClaw en el mensaje del sistema anexado, y
un complemento temporal de Claude Code pasado con `--plugin-dir`. El complemento contiene
solo las habilidades elegibles para ese agente/sesión, por lo que el solucionador nativo de habilidades de
Claude Code ve el mismo conjunto filtrado que OpenClaw anunciaría de otro modo en el mensaje. Las
anulaciones de clave de entorno/API de habilidades todavía son aplicadas por OpenClaw al
entorno del proceso secundario para la ejecución.

Claude CLI también tiene su propio modo de permisos no interactivo. OpenClaw lo asigna
a la política de ejecución existente en lugar de agregar configuración específica de Claude: cuando la
política de ejecución solicitada efectiva es YOLO (`tools.exec.security: "full"` y
`tools.exec.ask: "off"`), OpenClaw agrega `--permission-mode bypassPermissions`.
La configuración `agents.list[].tools.exec` por agente anula el `tools.exec` global para
ese agente. Para forzar un modo diferente de Claude, establezca argumentos de backend sin procesar explícitos
tales como `--permission-mode default` o `--permission-mode acceptEdits` bajo
`agents.defaults.cliBackends.claude-cli.args` y `resumeArgs` coincidentes.

El backend `claude-cli` de Anthropic incluido también asigna los niveles `/think` de OpenClaw
al indicador `--effort` nativo de Claude Code para niveles no desactivados. `minimal` y
`low` se asignan a `low`, `adaptive` y `medium` se asignan a `medium`, y `high`,
`xhigh` y `max` se asignan directamente. Otros backends de CLI necesitan que su complemento propietario
declare un asignador argv equivalente antes de que `/think` pueda afectar a la CLI generada.

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

- Si la CLI admite sesiones, configure `sessionArg` (p. ej., `--session-id`) o
  `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID deba insertarse
  en múltiples indicadores.
- Si la CLI utiliza un **subcomando de reanudación** con diferentes indicadores, configure
  `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput`
  (para reanudaciones que no son JSON).
- `sessionMode`:
  - `always`: siempre enviar un id de sesión (nuevo UUID si no hay ninguno almacenado).
  - `existing`: enviar un id de sesión solo si se ha almacenado uno anteriormente.
  - `none`: nunca enviar un id de sesión.
- `claude-cli` tiene como valores predeterminados `liveSession: "claude-stdio"`, `output: "jsonl"`,
  y `input: "stdin"`, por lo que los turnos de seguimiento reutilizan el proceso activo de Claude mientras
  esté activo. El stdio precalentado es el valor predeterminado ahora, incluso para configuraciones personalizadas
  que omiten campos de transporte. Si se reinicia la puerta de enlace o el proceso inactivo
  sale, OpenClaw se reanuda desde el id de sesión de Claude almacenado. Los ids de sesión
  almacenados se verifican contra una transcripción de proyecto legible existente antes
  de reanudar, por lo que los enlaces fantasma se borran con `reason=transcript-missing`
  en lugar de iniciar silenciosamente una nueva sesión de Claude CLI bajo `--resume`.
- Las sesiones en vivo de Claude mantienen protecciones de salida JSONL delimitadas. Los valores predeterminados permiten hasta
  8 MiB y 20,000 líneas JSONL sin procesar por turno. Los turnos de Claude con muchas herramientas pueden aumentarlas
  por backend con
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  y `maxTurnLines`; OpenClaw limita esas configuraciones a 64 MiB y 100,000
  líneas.
- Las sesiones de CLI almacenadas son continuidad propiedad del proveedor. El reinicio implícito diario de la sesión
  no las interrumpe; las políticas `/reset` y explícitas `session.reset` todavía
  lo hacen.
- Las sesiones nuevas de CLI normalmente se resembran solo desde el resumen de compactación de OpenClaw más la cola posterior a la compactación. Para recuperar sesiones cortas que se invalidan antes de la compactación, un backend puede optar por participar con `reseedFromRawTranscriptWhenUncompacted: true`. OpenClaw aún mantiene el resembrado de la transcripción sin procesar limitado y lo restringe a invalidaciones seguras, como transcripciones de CLI faltantes, cambios en el prompt del sistema/MCP o reintentos por sesión expirada; los cambios en el perfil de autenticación o en la época de las credenciales nunca reseembran el historial de transcripciones sin procesar.

Notas de serialización:

- `serialize: true` mantiene las ejecuciones del mismo carril ordenadas.
- La mayoría de las CLI se serializan en un carril de proveedor.
- OpenClaw descarta el reuso de la sesión de CLI almacenada cuando cambia la identidad de autenticación seleccionada, incluyendo un id de perfil de autenticación cambiado, clave API estática, token estático o identidad de cuenta OAuth cuando la CLI expone una. La rotación de tokens de acceso y actualización de OAuth no interrumpe la sesión de CLI almacenada. Si una CLI no expone un id de cuenta OAuth estable, OpenClaw permite que esa CLI haga cumplir los permisos de reanudación.

## Preludio de respaldo desde sesiones de claude-cli

Cuando un intento de `claude-cli` pasa a un candidato no CLI en [`agents.defaults.model.fallbacks`](/es/concepts/model-failover), OpenClaw siembra el siguiente intento con un preludio de contexto recolectado de la transcripción JSONL local de Claude Code en `~/.claude/projects/`. Sin esta semilla, el proveedor de respaldo comenzaría en frío porque la transcripción de sesión propia de OpenClaw está vacía para ejecuciones de `claude-cli`.

- El preludio prefiere el resumen más reciente de `/compact` o el marcador `compact_boundary`, y luego añade los turnos posteriores al límite más recientes hasta alcanzar un presupuesto de caracteres. Se descartan los turnos previos al límite porque el resumen ya los representa.
- Los bloques de herramientas se fusionan para compactar las sugerencias `(tool call: name)` y `(tool result: …)` para mantener el presupuesto del prompt honesto. El resumen se etiqueta como `(truncated)` si se desborda.
- Los respaldos del mismo proveedor de `claude-cli` a `claude-cli` se basan en el `--resume` propio de Claude y omiten el preludio.
- La semilla reutiliza la validación existente de la ruta del archivo de sesión de Claude, por lo que no se pueden leer rutas arbitrarias.

## Imágenes (transferencia directa)

Si su CLI acepta rutas de imagen, establezca `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está establecido, esas
rutas se pasan como argumentos de CLI. Si `imageArg` falta, OpenClaw añade las
rutas de archivo al mensaje (inyección de ruta), lo cual es suficiente para CLIs que cargan
automáticamente archivos locales desde rutas simples.

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- Para la salida JSON de la CLI Gemini, OpenClaw lee el texto de respuesta de `response` y
  el uso de `stats` cuando `usage` falta o está vacío.
- `output: "jsonl"` analiza flujos JSONL y extrae el mensaje final del agente más los identificadores
  de sesión cuando están presentes.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el mensaje como el último argumento de CLI.
- `input: "stdin"` envía el mensaje a través de stdin.
- Si el mensaje es muy largo y `maxPromptArgChars` está establecido, se usa stdin.

## Valores predeterminados (propiedad del plugin)

Los valores predeterminados del backend de CLI incluidos viven con su complemento propietario. Por ejemplo,
Anthropic posee `claude-cli` y Google posee `google-gemini-cli`. Las ejecuciones del agente
OpenAI Codex usan el harness del servidor de aplicaciones Codex a través de `openai/*`; OpenClaw ya
no registra un backend `codex-cli` incluido.

El complemento Anthropic incluido registra un valor predeterminado para `claude-cli`:

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

El complemento Google incluido también registra un valor predeterminado para `google-gemini-cli`:

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
- `stats.cached` se normaliza en `cacheRead` de OpenClaw.
- Si falta `stats.input`, OpenClaw deduce los tokens de entrada de
  `stats.input_tokens - stats.cached`.

Sobrescriba solo si es necesario (común: ruta absoluta de `command`).

## Valores predeterminados propiedad del complemento

Los valores predeterminados del backend de CLI ahora forman parte de la superficie del complemento:

- Los complementos los registran con `api.registerCliBackend(...)`.
- El `id` del backend se convierte en el prefijo del proveedor en las referencias de modelos.
- La configuración del usuario en `agents.defaults.cliBackends.<id>` todavía anula el valor predeterminado del complemento.
- La limpieza de configuración específica del backend sigue siendo propiedad del complemento a través del gancho opcional
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
sus propios marcadores de control y la entrega del canal.

Para las CLI que emiten JSONL compatible con stream- de Claude Code, configure
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

Los tiempos de ejecución de MCP empaquetados con alcance de sesión se almacenan en caché para su reutilización dentro de una sesión y luego se recolectan después de `mcp.sessionIdleTtlMs` milisegundos de tiempo de inactividad (predeterminado 10 minutos; establezca `0` para deshabilitar). Las ejecuciones integradas de un solo tiro, como sondas de autenticación, generación de slugs y limpieza de solicitudes de recuperación de memoria activa al final de la ejecución, para que los hijos stdio y las transmisiones HTTP/SSE transmisibles no sobrevivan a la ejecución.

## Limitaciones

- **No hay llamadas directas a herramientas de OpenClaw.** OpenClaw no inyecta llamadas a herramientas en el protocolo del backend CLI. Los backends solo ven las herramientas de la puerta de enlace cuando optan por `bundleMcp: true`.
- **La transmisión es específica del backend.** Algunos backends transmiten JSONL; otros almacenan en búfer hasta salir.
- **Las salidas estructuradas** dependen del formato JSON del CLI.

## Solución de problemas

- **CLI no encontrado**: establezca `command` en una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para asignar `provider/model` → modelo CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté configurado y `sessionMode` no sea `none`.
- **Imágenes ignoradas**: configure `imageArg` (y verifique que el CLI admita rutas de archivo).

## Relacionado

- [Manual de procedimientos de la puerta de enlace](/es/gateway)
- [Modelos locales](/es/gateway/local-models)
