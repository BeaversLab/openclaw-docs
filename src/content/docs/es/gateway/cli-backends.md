---
summary: "CLI backends: respaldo local de CLI de IA con puente de herramienta MCP opcional"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI Backends"
---

# CLI backends (entorno de reserva)

OpenClaw puede ejecutar **CLIs de IA locales** como una **alternativa solo de texto** cuando los proveedores de API están caídos,
limitados por tasa o comportándose incorrectamente de forma temporal. Esto es intencionalmente conservador:

- **Las herramientas de OpenClaw no se inyectan directamente**, pero los backends con `bundleMcp: true`
  pueden recibir herramientas de la puerta de enlace a través de un puente MCP de bucle invertido.
- **Transmisión JSONL** para las CLIs que lo soportan.
- **Las sesiones son compatibles** (así, los turnos de seguimiento se mantienen coherentes).
- **Las imágenes se pueden pasar a través** si la CLI acepta rutas de imagen.

Esto está diseñado como una **red de seguridad** más que como una ruta principal. Úselo cuando
quiera respuestas de texto que "siempre funcionen" sin depender de APIs externas.

Si deseas un tiempo de ejecución de harness completo con controles de sesión ACP, tareas en segundo plano,
vinculación de hilos/conversaciones y sesiones de codificación externas persistentes, usa
[ACP Agents](/es/tools/acp-agents) en su lugar. Los backends de CLI no son ACP.

## Inicio rápido fácil para principiantes

Puede usar Codex CLI **sin ninguna configuración** (el complemento OpenAI incluido
registra un backend predeterminado):

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

Si su gateway se ejecuta bajo launchd/systemd y PATH es mínimo, agregue solo la
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

Eso es todo. No se necesitan claves ni configuración de autenticación extra más allá de la propia CLI.

Si usa un backend de CLI incluido como el **proveedor principal de mensajes** en un
host de puerta de enlace, OpenClaw ahora carga automáticamente el complemento incluido propietario cuando su configuración
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
        fallbacks: ["codex-cli/gpt-5.4"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.4": {},
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

Cada entrada está claveada por un **id de proveedor** (ej. `codex-cli`, `my-cli`).
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

1. **Selecciona un backend** basándose en el prefijo del proveedor (`codex-cli/...`).
2. **Construye un prompt del sistema** usando el mismo prompt de OpenClaw + contexto del espacio de trabajo.
3. **Ejecuta la CLI** con un id de sesión (si es compatible) para que el historial se mantenga consistente.
   El backend `claude-cli` incluido mantiene vivo un proceso stdio de Claude por cada
   sesión de OpenClaw y envía turnos de seguimiento a través de stdin en formato stream-.
4. **Analiza la salida** (JSON o texto sin formato) y devuelve el texto final.
5. **Persiste los ids de sesión** por backend, para que las seguimientos reutilicen la misma sesión CLI.

<Note>El backend Anthropic `claude-cli` incluido es compatible de nuevo. El personal de Anthropic nos informó que el uso de la CLI de Claude al estilo OpenClaw está permitido de nuevo, por lo que OpenClaw trata el uso de `claude -p` como sancionado para esta integración a menos que Anthropic publique una nueva política.</Note>

El backend OpenAI `codex-cli` incluido pasa el mensaje del sistema de OpenClaw a través de
la anulación de configuración `model_instructions_file` de Codex (`-c
model_instructions_file="..."`). Codex no expone una opción
`--append-system-prompt` al estilo de Claude, por lo que OpenClaw escribe el mensaje ensamblado en un
archivo temporal para cada sesión fresca de la CLI de Codex.

El backend Anthropic `claude-cli` incluido recibe la instantánea de habilidades de OpenClaw
de dos formas: el catálogo compacto de habilidades de OpenClaw en el mensaje del sistema anexado, y
un complemento (plugin) temporal de Claude Code pasado con `--plugin-dir`. El complemento contiene
solo las habilidades elegibles para ese agente/sesión, de modo que el solucionador nativo de habilidades de
Claude Code ve el mismo conjunto filtrado que OpenClaw anunciaría de otro modo en
el mensaje. Las anulaciones de clave de entorno/API de habilidad siguen siendo aplicadas por OpenClaw al
entorno del proceso secundario para la ejecución.

## Sesiones

- Si la CLI admite sesiones, establece `sessionArg` (p. ej. `--session-id`) o
  `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID deba insertarse
  en múltiples opciones.
- Si la CLI utiliza un **subcomando de reanudación** con diferentes opciones, establece
  `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput`
  (para reanudaciones que no son JSON).
- `sessionMode`:
  - `always`: siempre enviar un id de sesión (nuevo UUID si no hay ninguno almacenado).
  - `existing`: solo envía un id de sesión si se almacenó uno anteriormente.
  - `none`: nunca envía un id de sesión.
- `claude-cli` por defecto es `liveSession: "claude-stdio"`, `output: "jsonl"`
  y `input: "stdin"`, por lo que los turnos de seguimiento reutilizan el proceso Claude en vivo mientras
  esté activo. El stdio caliente es el valor predeterminado ahora, incluso para configuraciones personalizadas
  que omiten campos de transporte. Si el Gateway se reinicia o el proceso inactivo
  finaliza, OpenClaw se reanuda desde el id de sesión Claude almacenado. Los ids de sesión
  almacenados se verifican contra una transcripción de proyecto legible existente antes de
  reanudar, por lo que los enlaces fantasma se borran con `reason=transcript-missing`
  en lugar de iniciar silenciosamente una sesión fresca de Claude CLI bajo `--resume`.
- Las sesiones CLI almacenadas son continuidad propiedad del proveedor. El reinicio diario implícito de sesión
  no las interrumpe; las políticas `/reset` y `session.reset` explícitas aún
  lo hacen.

Notas de serialización:

- `serialize: true` mantiene las ejecuciones del mismo carril ordenadas.
- La mayoría de los CLIs se serializan en un carril de proveedor.
- OpenClaw interrumpe la reutilización de la sesión CLI almacenada cuando cambia la identidad de autenticación seleccionada,
  incluyendo un id de perfil de autenticación cambiado, clave API estática, token estático, o identidad
  de cuenta OAuth cuando el CLI expone una. La rotación de tokens de acceso y actualización de OAuth
  no interrumpe la sesión CLI almacenada. Si un CLI no expone un
  id de cuenta OAuth estable, OpenClaw permite que ese CLI haga cumplir los permisos de reanudación.

## Imágenes (passthrough)

Si su CLI acepta rutas de imagen, establezca `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está establecido, esas
rutas se pasan como argumentos CLI. Si falta `imageArg`, OpenClaw añade las
rutas de archivo al indicador (inyección de ruta), lo cual es suficiente para CLIs que cargan
automáticamente archivos locales desde rutas simples.

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- Para la salida JSON del CLI Gemini, OpenClaw lee el texto de respuesta de `response` y
  el uso de `stats` cuando `usage` falta o está vacío.
- `output: "jsonl"` analiza flujos JSONL (por ejemplo, Codex CLI `--json`) y extrae el mensaje final del agente más los identificadores de sesión cuando están presentes.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el aviso como el último argumento de la CLI.
- `input: "stdin"` envía el aviso a través de stdin.
- Si el aviso es muy largo y `maxPromptArgChars` está establecido, se usa stdin.

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
- `stats.cached` se normaliza en OpenClaw `cacheRead`.
- Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
  `stats.input_tokens - stats.cached`.

Anule solo si es necesario (común: ruta absoluta de `command`).

## Valores predeterminados propiedad del complemento

Los valores predeterminados del backend de CLI ahora son parte de la superficie del complemento:

- Los complementos los registran con `api.registerCliBackend(...)`.
- El `id` del backend se convierte en el prefijo del proveedor en las referencias del modelo.
- La configuración de usuario en `agents.defaults.cliBackends.<id>` todavía anula el valor predeterminado del complemento.
- La limpieza de configuración específica del backend sigue siendo propiedad del complemento a través del enlace opcional
  `normalizeConfig`.

Los complementos que necesitan pequeños adaptadores de compatibilidad de prompts/mensajes pueden declarar
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

## Superposiciones MCP del paquete

Los backends de CLI **no** reciben llamadas a herramientas de OpenClaw directamente, pero un backend puede
optar por una superposición de configuración MCP generada con `bundleMcp: true`.

Comportamiento empaquetado actual:

- `claude-cli`: archivo de configuración MCP estricto generado
- `codex-cli`: anulaciones de configuración en línea para `mcp_servers`
- `google-gemini-cli`: archivo de configuración del sistema Gemini generado

Cuando se habilita el paquete MCP, OpenClaw:

- genera un servidor MCP HTTP de bucle de retorno que expone las herramientas de la puerta de enlace al proceso de la CLI
- autentica el puente con un token por sesión (`OPENCLAW_MCP_TOKEN`)
- limita el acceso a las herramientas a la sesión, cuenta y contexto del canal actuales
- carga los servidores MCP de paquete habilitados para el espacio de trabajo actual
- los combina con cualquier forma de configuración/ajustes MCP de backend existente
- reescribe la configuración de lanzamiento utilizando el modo de integración propiedad del backend de la extensión propietaria

Si no hay servidores MCP habilitados, OpenClaw aún inyecta una configuración estricta cuando un
backend opta por el paquete MCP para que las ejecuciones en segundo plano permanezcan aisladas.

## Limitaciones

- **Sin llamadas a herramientas directas de OpenClaw.** OpenClaw no inyecta llamadas a herramientas en
  el protocolo del backend de CLI. Los backends solo ven las herramientas de la puerta de enlace cuando optan por
  `bundleMcp: true`.
- **La transmisión es específica del backend.** Algunos backends transmiten JSONL; otros almacenan en búfer
  hasta la salida.
- **Las salidas estructuradas** dependen del formato JSON de la CLI.
- **Las sesiones de Codex CLI** se reanudan a través de la salida de texto (sin JSONL), lo cual es menos estructurado que la ejecución inicial de `--json`. Las sesiones de OpenClaw siguen funcionando con normalidad.

## Solución de problemas

- **CLI no encontrado**: establezca `command` en una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para asignar `provider/model` → modelo de CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté establecido y `sessionMode` no sea `none` (Codex CLI actualmente no puede reanudar con salida JSON).
- **Imágenes ignoradas**: establezca `imageArg` (y verifique que la CLI admita rutas de archivos).
