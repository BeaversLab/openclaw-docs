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

Si desea un tiempo de ejecución de arnés completo con controles de sesión ACP, tareas en segundo plano,
vinculación de subprocesos/conversaciones y sesiones de codificación externas persistentes, use
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
3. **Ejecuta el CLI** con un id de sesión (si es compatible) para que el historial se mantenga coherente.
4. **Analiza la salida** (JSON o texto sin formato) y devuelve el texto final.
5. **Persiste los ids de sesión** por backend, para que las seguimientos reutilicen la misma sesión CLI.

<Note>El backend incluido de Anthropic `claude-cli` es compatible de nuevo. El personal de Anthropic nos dijo que el uso de la CLI de Claude al estilo OpenClaw está permitido de nuevo, por lo que OpenClaw trata el uso de `claude -p` como sancionado para esta integración a menos que Anthropic publique una nueva política.</Note>

El backend incluido de OpenAI `codex-cli` pasa el indicador del sistema de OpenClaw a través de
la anulación de configuración de `model_instructions_file` de Codex (`-c
model_instructions_file="..."`). Codex no expone una opción
`--append-system-prompt` al estilo de Claude, por lo que OpenClaw escribe el indicador ensamblado en un
archivo temporal para cada sesión nueva de la CLI de Codex.

El backend de Anthropic `claude-cli` incluido recibe la instantánea de habilidades de OpenClaw de dos formas: el catálogo compacto de habilidades de OpenClaw en el prompt del sistema anexado, y un plugin temporal de Claude Code pasado con `--plugin-dir`. El plugin contiene solo las habilidades elegibles para ese agente/sesión, por lo que el solucionador nativo de habilidades de Claude Code ve el mismo conjunto filtrado que OpenClaw anunciaría de otro modo en el prompt. Las anulaciones de entorno/clave de API de habilidad todavía son aplicadas por OpenClaw al entorno del proceso secundario para la ejecución.

## Sesiones

- Si la CLI soporta sesiones, configure `sessionArg` (p. ej. `--session-id`) o `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID necesita ser insertado en múltiples indicadores.
- Si la CLI usa un **subcomando de reanudación** con diferentes indicadores, configure `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput` (para reanudaciones que no son JSON).
- `sessionMode`:
  - `always`: siempre enviar un id de sesión (nuevo UUID si no hay ninguno almacenado).
  - `existing`: solo enviar un id de sesión si se había almacenado uno antes.
  - `none`: nunca enviar un id de sesión.

Notas de serialización:

- `serialize: true` mantiene las ejecuciones en el mismo carril ordenadas.
- La mayoría de las CLIs serializan en un carril de proveedor.
- OpenClaw descarta el reuso de sesión de CLI almacenada cuando el estado de autenticación del backend cambia, incluyendo reingreso, rotación de token, o una credencial de perfil de autenticación cambiada.

## Imágenes (passthrough)

Si su CLI acepta rutas de imagen, configure `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está configurado, esas rutas se pasan como argumentos de CLI. Si `imageArg` falta, OpenClaw añade las rutas de archivo al prompt (inyección de ruta), lo cual es suficiente para CLIs que cargan automáticamente archivos locales desde rutas simples.

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- Para la salida JSON de la CLI Gemini, OpenClaw lee el texto de respuesta desde `response` y el uso desde `stats` cuando `usage` falta o está vacío.
- `output: "jsonl"` analiza flujos JSONL (por ejemplo, Codex CLI `--json`) y extrae el mensaje final del agente más los identificadores de sesión cuando están presentes.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el mensaje como el último argumento de CLI.
- `input: "stdin"` envía el mensaje a través de stdin.
- Si el mensaje es muy largo y `maxPromptArgChars` está establecido, se usa stdin.

## Valores predeterminados (propiedad del complemento)

El complemento OpenAI incluido también registra un valor predeterminado para `codex-cli`:

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
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

Notas sobre JSON de Gemini CLI:

- El texto de respuesta se lee del campo JSON `response`.
- El uso recurre a `stats` cuando `usage` está ausente o vacío.
- `stats.cached` se normaliza en `cacheRead` de OpenClaw.
- Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
  `stats.input_tokens - stats.cached`.

Anule solo si es necesario (común: ruta absoluta de `command`).

## Valores predeterminados propiedad del complemento

Los valores predeterminados del backend de CLI ahora son parte de la superficie del complemento:

- Los complementos los registran con `api.registerCliBackend(...)`.
- El `id` del backend se convierte en el prefijo del proveedor en las referencias del modelo.
- La configuración del usuario en `agents.defaults.cliBackends.<id>` sigue anulando el valor predeterminado del complemento.
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

## Superposiciones de MCP agrupadas

Los backends de CLI **no** reciben llamadas a herramientas de OpenClaw directamente, pero un backend puede
optar por una superposición de configuración MCP generada con `bundleMcp: true`.

Comportamiento agrupado actual:

- `claude-cli`: archivo de configuración MCP estricto generado
- `codex-cli`: anulaciones de configuración en línea para `mcp_servers`
- `google-gemini-cli`: archivo de configuración del sistema Gemini generado

Cuando se habilita el MCP agrupado, OpenClaw:

- inicia un servidor MCP HTTP de bucle local que expone las herramientas de la puerta de enlace al proceso de la CLI
- autentica el puente con un token por sesión (`OPENCLAW_MCP_TOKEN`)
- limita el acceso a las herramientas al contexto de la sesión, cuenta y canal actuales
- carga los servidores MCP agrupados habilitados para el espacio de trabajo actual
- los fusiona con cualquier forma de configuración/ajustes de MCP del backend existente
- reescribe la configuración de lanzamiento utilizando el modo de integración propiedad del backend de la extensión propietaria

Si no hay servidores MCP habilitados, OpenClaw aún inyecta una configuración estricta cuando un
backend opta por el MCP agrupado para que las ejecuciones en segundo plano sigan aisladas.

## Limitaciones

- **Sin llamadas directas a herramientas de OpenClaw.** OpenClaw no inyecta llamadas a herramientas en
  el protocolo del backend de CLI. Los backends solo ven las herramientas de la puerta de enlace cuando optan por
  `bundleMcp: true`.
- **La transmisión es específica del backend.** Algunos backends transmiten JSONL; otros almacenan en búfer
  hasta salir.
- Las **salidas estructuradas** dependen del formato JSON de la CLI.
- **Las sesiones de Codex CLI** se reanudan mediante salida de texto (sin JSONL), lo cual es menos
  estructurado que la ejecución inicial de `--json`. Las sesiones de OpenClaw aún funcionan
  con normalidad.

## Solución de problemas

- **CLI no encontrado**: establezca `command` en una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para mapear `provider/model` → modelo de CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté configurado y `sessionMode` no sea
  `none` (Codex CLI actualmente no puede reanudar con salida JSON).
- **Imágenes ignoradas**: establezca `imageArg` (y verifique que el CLI soporte rutas de archivo).
