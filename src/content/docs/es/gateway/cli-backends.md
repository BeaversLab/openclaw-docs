---
summary: "CLI backends: respaldo local de CLI de IA con puente de herramientas MCP opcional"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI backends"
---

OpenClaw puede ejecutar **CLI de IA locales** como un **respaldo de solo texto** cuando los proveedores de API están caídos,
con límites de tasa o comportándose mal temporalmente. Esto es intencionalmente conservador:

- **Las herramientas de OpenClaw no se inyectan directamente**, pero los backends con `bundleMcp: true`
  pueden recibir herramientas de puerta de enlace a través de un puente MCP de bucle de retorno.
- **Transmisión JSONL** para las CLI que lo soportan.
- **Las sesiones son compatibles** (por lo que los turnos de seguimiento se mantienen coherentes).
- **Las imágenes se pueden pasar** si la CLI acepta rutas de imagen.

Esto está diseñado como una **red de seguridad** más que como una ruta principal. Úselo cuando
quiera respuestas de texto que "siempre funcionen" sin depender de APIs externas.

Si desea un tiempo de ejecución de arnés completo con controles de sesión ACP, tareas en segundo plano,
vinculación de subprocesos/conversaciones y sesiones de codificación externas persistentes, use
[ACP Agents](/es/tools/acp-agents) en su lugar. Los backends de CLI no son ACP.

## Inicio rápido para principiantes

Puede usar Codex CLI **sin ninguna configuración** (el complemento OpenAI incluido
registra un backend predeterminado):

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

Si su puerta de enlace se ejecuta bajo launchd/systemd y PATH es mínimo, agregue solo la
ruta del comando:

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
      },
    },
  },
}
```

Eso es todo. No se necesitan claves ni configuración de autenticación adicional más allá de la CLI misma.

Si usa un backend de CLI incluido como el **proveedor de mensajes principal** en un
host de puerta de enlace, OpenClaw ahora carga automáticamente el complemento incluido propietario cuando su configuración
hace referencia explícita a ese backend en una referencia de modelo o en
`agents.defaults.cliBackends`.

## Usarlo como respaldo

Agregue un backend de CLI a su lista de respaldo para que solo se ejecute cuando fallen los modelos principales:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["codex-cli/gpt-5.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.5": {},
      },
    },
  },
}
```

Notas:

- Si usa `agents.defaults.models` (lista de permitidos), también debe incluir sus modelos de backend de CLI allí.
- Si el proveedor principal falla (autenticación, límites de tasa, tiempos de espera), OpenClaw
  intentará el backend de CLI a continuación.

## Descripción general de la configuración

Todos los backends de CLI viven bajo:

```
agents.defaults.cliBackends
```

Cada entrada está codificada por un **id de proveedor** (p. ej., `codex-cli`, `my-cli`).
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
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
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
          serialize: true,
        },
      },
    },
  },
}
```

## Cómo funciona

1. **Selecciona un backend** basado en el prefijo del proveedor (`codex-cli/...`).
2. **Construye un mensaje del sistema** usando el mismo mensaje de OpenClaw + el contexto del espacio de trabajo.
3. **Ejecuta el CLI** con un id de sesión (si es compatible) para que el historial se mantenga consistente.
   El backend `claude-cli` incluido mantiene vivo un proceso stdio de Claude por cada
   sesión de OpenClaw y envía turnos de seguimiento a través de stdin stream-.
4. **Analiza la salida** (JSON o texto plano) y devuelve el texto final.
5. **Persiste los ids de sesión** por cada backend, para que los seguimientos reutilicen la misma sesión del CLI.

<Note>El backend `claude-cli` de Anthropic incluido es compatible nuevamente. El personal de Anthropic nos informó que el uso del CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata el uso de `claude -p` como sancionado para esta integración a menos que Anthropic publique una nueva política.</Note>

El backend `codex-cli` de OpenAI incluido pasa el mensaje del sistema de OpenClaw a través de
la sobrescritura de configuración `model_instructions_file` de Codex (`-c
model_instructions_file="..."`). Codex no expone una opción `--append-system-prompt`
estilo Claude, por lo que OpenClaw escribe el mensaje ensamblado en un
archivo temporal para cada sesión nueva del CLI de Codex.

El backend `claude-cli` de Anthropic incluido recibe la instantánea de habilidades de OpenClaw
de dos formas: el catálogo compacto de habilidades de OpenClaw en el mensaje del sistema anexado, y
un plugin de Claude Code temporal pasado con `--plugin-dir`. El plugin contiene
solo las habilidades elegibles para ese agente/sesión, para que el solucionador de habilidades nativo de Claude Code vea
el mismo conjunto filtrado que OpenClaw de otro modo anunciaría en
el mensaje. Las sobrescrituras de entorno/clave API de habilidades siguen siendo aplicadas por OpenClaw al
entorno del proceso hijo para la ejecución.

Claude CLI también tiene su propio modo de permisos no interactivo. OpenClaw lo asigna a la política de ejecución existente en lugar de añadir una configuración específica de Claude: cuando la política de ejecución efectiva solicitada es YOLO (`tools.exec.security: "full"` y `tools.exec.ask: "off"`), OpenClaw añade `--permission-mode bypassPermissions`. La configuración `agents.list[].tools.exec` por agente anula la `tools.exec` global para ese agente. Para forzar un modo de Claude diferente, establezca argumentos de backend sin procesar explícitos, como `--permission-mode default` o `--permission-mode acceptEdits`, bajo `agents.defaults.cliBackends.claude-cli.args` y el `resumeArgs` coincidente.

Antes de que OpenClaw pueda usar el backend `claude-cli` incluido, el propio Claude Code ya debe haber iniciado sesión en el mismo host:

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Use `agents.defaults.cliBackends.claude-cli.command` solo cuando el binario `claude` aún no esté en `PATH`.

## Sesiones

- Si la CLI admite sesiones, establezca `sessionArg` (por ejemplo, `--session-id`) o `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID deba insertarse en múltiples indicadores.
- Si la CLI usa un **subcomando de reanudación** con diferentes indicadores, establezca `resumeArgs` (reemplaza `args` al reanudar) y, opcionalmente, `resumeOutput` (para reanudaciones que no son JSON).
- `sessionMode`:
  - `always`: siempre enviar un id de sesión (nuevo UUID si no hay ninguno almacenado).
  - `existing`: solo enviar un id de sesión si se había almacenado uno antes.
  - `none`: nunca enviar un id de sesión.
- `claude-cli` tiene como valor predeterminado `liveSession: "claude-stdio"`, `output: "jsonl"`
  y `input: "stdin"`, por lo que los turnos de seguimiento reutilizan el proceso Claude activo mientras
  esté activo. El stdio caliente es el predeterminado ahora, incluso para configuraciones personalizadas
  que omiten los campos de transporte. Si el Gateway se reinicia o el proceso inactivo
  termina, OpenClaw se reanuda desde el id de sesión Claude almacenado. Los ids de sesión
  almacenados se verifican contra una transcripción de proyecto legible existente antes de
  reanudar, por lo que los enlaces fantasma se borran con `reason=transcript-missing`
  en lugar de iniciar silenciosamente una nueva sesión de Claude CLI bajo `--resume`.
- Las sesiones de CLI almacenadas son una continuidad propiedad del proveedor. El restablecimiento implícito diario de la sesión
  no las interrumpe; las políticas `/reset` y `session.reset` explícitas todavía
  lo hacen.

Notas de serialización:

- `serialize: true` mantiene las ejecuciones del mismo carril ordenadas.
- La mayoría de las CLI se serializan en un carril de proveedor.
- OpenClaw abandona la reutilización de la sesión CLI almacenada cuando cambia la identidad de autenticación seleccionada,
  incluyendo un id de perfil de autenticación cambiado, clave API estática, token estático o identidad
  de cuenta OAuth cuando la CLI expone una. La rotación de tokens de acceso y actualización de OAuth
  no interrumpe la sesión CLI almacenada. Si una CLI no expone un
  id de cuenta OAuth estable, OpenClaw permite que esa CLI haga cumplir los permisos de reanudación.

## Imágenes (passthrough)

Si su CLI acepta rutas de imagen, establezca `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está establecido, esas
rutas se pasan como argumentos de CLI. Si `imageArg` falta, OpenClaw añade las
rutas de archivo al prompt (inyección de ruta), lo cual es suficiente para las CLI que cargan
automáticamente archivos locales desde rutas simples.

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- Para la salida JSON de la CLI Gemini, OpenClaw lee el texto de respuesta de `response` y
  el uso de `stats` cuando `usage` falta o está vacío.
- `output: "jsonl"` analiza flujos JSONL (por ejemplo, Codex CLI `--json`) y extrae el mensaje final del agente más los identificadores de sesión
  cuando están presentes.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el prompt como el último argumento del CLI.
- `input: "stdin"` envía el prompt a través de stdin.
- Si el prompt es muy largo y `maxPromptArgChars` está configurado, se usa stdin.

## Valores predeterminados (propiedad del complemento)

El complemento OpenAI incluido también registra un valor predeterminado para `codex-cli`:

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

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

- El texto de la respuesta se lee del campo JSON `response`.
- El uso vuelve a `stats` cuando `usage` está ausente o vacío.
- `stats.cached` se normaliza en OpenClaw `cacheRead`.
- Si falta `stats.input`, OpenClaw deduce los tokens de entrada de
  `stats.input_tokens - stats.cached`.

Anule solo si es necesario (común: ruta absoluta de `command`).

## Valores predeterminados propiedad del complemento

Los valores predeterminados del backend de CLI ahora son parte de la superficie del complemento:

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
sus propios marcadores de control y entrega de canales.

Para las CLI que emiten JSONL compatible con stream- de Claude Code, establezca
`jsonlDialect: "claude-stream-json"` en la configuración de ese backend.

## Superposiciones de MCP agrupadas

Los backends de CLI **no** reciben llamadas a herramientas de OpenClaw directamente, pero un backend puede
optar por una superposición de configuración de MCP generada con `bundleMcp: true`.

Comportamiento agrupado actual:

- `claude-cli`: archivo de configuración MCP estricto generado
- `codex-cli`: anulaciones de configuración en línea para `mcp_servers`; el servidor
  de bucle de retorno de OpenClaw generado está marcado con el modo de aprobación de herramientas por servidor de Codex
  para que las llamadas MCP no se detengan en indicadores de aprobación locales
- `google-gemini-cli`: archivo de configuración del sistema de Gemini generado

Cuando se habilita el MCP agrupado, OpenClaw:

- inicia un servidor MCP HTTP de bucle de retorno que expone las herramientas de la puerta de enlace al proceso de la CLI
- autentica el puente con un token por sesión (`OPENCLAW_MCP_TOKEN`)
- limita el acceso a las herramientas al contexto de la sesión, cuenta y canal actuales
- carga los servidores MCP agrupados habilitados para el espacio de trabajo actual
- los fusiona con cualquier forma de configuración/ajustes de MCP de backend existente
- reescribe la configuración de lanzamiento utilizando el modo de integración propiedad del backend de la extensión propietaria

Si no hay servidores MCP habilitados, OpenClaw aún inyecta una configuración estricta cuando un
backend opta por el MCP agrupado para que las ejecuciones en segundo plano permanezcan aisladas.

Los tiempos de ejecución de MCP agrupados con ámbito de sesión se almacenan en caché para su reutilización dentro de una sesión y luego
se recolectan después de `mcp.sessionIdleTtlMs` milisegundos de tiempo de inactividad (predeterminado 10
minutos; establezca `0` para deshabilitar). Las ejecuciones integradas de un solo uso, como sondas de autenticación,
generación de slugs y limpieza de solicitudes de memoria activa al final de la ejecución, para que los procesos secundarios stdio
y las transmisiones HTTP/SSE transmisibles no sobrevivan a la ejecución.

## Limitaciones

- **No hay llamadas directas a herramientas de OpenClaw.** OpenClaw no inyecta llamadas a herramientas en el protocolo del backend de CLI. Los backends solo ven las herramientas de la puerta de enlace cuando optan por `bundleMcp: true`.
- **La transmisión (streaming) es específica del backend.** Algunos backends transmiten JSONL; otros almacenan en el búfer hasta salir.
- **Las salidas estructuradas** dependen del formato JSON de la CLI.
- **Las sesiones de Codex CLI** se reanudan mediante la salida de texto (sin JSONL), lo cual es menos estructurado que la ejecución inicial `--json`. Las sesiones de OpenClaw siguen funcionando con normalidad.

## Solución de problemas

- **CLI no encontrada**: establezca `command` en una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para asignar `provider/model` → modelo de CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté establecido y `sessionMode` no sea `none` (Codex CLI actualmente no puede reanudar con salida JSON).
- **Imágenes ignoradas**: establezca `imageArg` (y verifique que la CLI admita rutas de archivos).

## Relacionado

- [Manual de operaciones de la puerta de enlace](/es/gateway)
- [Modelos locales](/es/gateway/local-models)
