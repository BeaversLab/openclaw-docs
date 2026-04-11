---
summary: "Backends de CLI: respaldo local de IA CLI con puente de herramienta MCP opcional"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "Backends de CLI"
---

# CLI backends (entorno de reserva)

OpenClaw puede ejecutar **CLIs de IA locales** como una **alternativa solo de texto** cuando los proveedores de API están caídos,
limitados por tasa o comportándose incorrectamente de forma temporal. Esto es intencionalmente conservador:

- **Las herramientas de OpenClaw no se inyectan directamente**, pero los backends con `bundleMcp: true`
  pueden recibir herramientas de puerta de enlace a través de un puente MCP de bucle invertido.
- **Transmisión JSONL** para las CLIs que lo soportan.
- **Las sesiones son compatibles** (así, los turnos de seguimiento se mantienen coherentes).
- **Las imágenes se pueden pasar a través** si la CLI acepta rutas de imagen.

Esto está diseñado como una **red de seguridad** más que como una ruta principal. Úselo cuando
quiera respuestas de texto que "siempre funcionen" sin depender de APIs externas.

Si desea un tiempo de ejecución de arnés completo con controles de sesión ACP, tareas en segundo plano,
vinculación de hilos/conversaciones y sesiones de codificación externas persistentes, use
[Agentes ACP](/en/tools/acp-agents) en su lugar. Los backends de CLI no son ACP.

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

Si usas un backend CLI incluido como el **proveedor de mensajes principal** en un
host de gateway, OpenClaw ahora carga automáticamente el complemento incluido propietario cuando tu configuración
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

Cada entrada está claveada por un **id de proveedor** (por ejemplo, `codex-cli`, `my-cli`).
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

<Note>El backend `claude-cli` de Anthropic incluido es compatible de nuevo. El personal de Anthropic nos informó que el uso de Claude CLI estilo OpenClaw está permitido de nuevo, por lo que OpenClaw trata el uso de `claude -p` como sancionado para esta integración a menos que Anthropic publique una nueva política.</Note>

## Sesiones

- Si la CLI soporta sesiones, establezca `sessionArg` (por ejemplo, `--session-id`) o
  `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID necesite ser insertado
  en múltiples indicadores.
- Si la CLI usa un **subcomando de reanudación** con diferentes indicadores, establezca
  `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput`
  (para reanudaciones que no son JSON).
- `sessionMode`:
  - `always`: siempre enviar un id de sesión (nuevo UUID si no se ha almacenado ninguno).
  - `existing`: solo enviar un id de sesión si se almacenó uno anteriormente.
  - `none`: nunca enviar un id de sesión.

Notas de serialización:

- `serialize: true` mantiene las ejecuciones del mismo carril ordenadas.
- La mayoría de los CLIs se serializan en un carril de proveedor.
- OpenClaw elimina el reuso de la sesión CLI almacenada cuando cambia el estado de autenticación del backend, incluyendo el relogin, la rotación de tokens o una credencial de perfil de autenticación modificada.

## Imágenes (passthrough)

Si su CLI acepta rutas de imagen, configure `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está configurado, esas
rutas se pasan como argumentos CLI. Si `imageArg` falta, OpenClaw añade las
rutas de archivo al prompt (inyección de ruta), lo cual es suficiente para los CLIs que cargan
automáticamente archivos locales desde rutas simples.

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- Para la salida JSON de Gemini CLI, OpenClaw lee el texto de respuesta de `response` y
  el uso de `stats` cuando `usage` falta o está vacío.
- `output: "jsonl"` analiza flujos JSONL (por ejemplo, Codex CLI `--json`) y extrae el mensaje final del agente más los
  identificadores de sesión cuando están presentes.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el prompt como el último argumento CLI.
- `input: "stdin"` envía el prompt a través de stdin.
- Si el prompt es muy largo y `maxPromptArgChars` está configurado, se usa stdin.

## Valores predeterminados (propiedad del plugin)

El plugin OpenAI incluido también registra un valor predeterminado para `codex-cli`:

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

El plugin Google incluido también registra un valor predeterminado para `google-gemini-cli`:

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
- `stats.cached` se normaliza a `cacheRead` de OpenClaw.
- Si falta `stats.input`, OpenClaw deriva los tokens de entrada de
  `stats.input_tokens - stats.cached`.

Sobrescribir solo si es necesario (común: ruta absoluta de `command`).

## Valores predeterminados propiedad del complemento

Los valores predeterminados del backend de CLI ahora forman parte de la superficie del complemento:

- Los complementos los registran con `api.registerCliBackend(...)`.
- El `id` del backend se convierte en el prefijo del proveedor en las referencias del modelo.
- La configuración del usuario en `agents.defaults.cliBackends.<id>` aún anula el valor predeterminado del complemento.
- La limpieza de configuración específica del backend sigue siendo propiedad del complemento a través del enlace opcional
  `normalizeConfig`.

## Superposiciones de MCP agrupadas

Los backends de CLI **no** reciben llamadas a herramientas de OpenClaw directamente, pero un backend puede
optar por una superposición de configuración MCP generada con `bundleMcp: true`.

Comportamiento agrupado actual:

- `claude-cli`: archivo de configuración MCP estricto generado
- `codex-cli`: anulaciones de configuración en línea para `mcp_servers`
- `google-gemini-cli`: archivo de configuración del sistema de Gemini generado

Cuando el MCP agrupado está habilitado, OpenClaw:

- inicia un servidor MCP HTTP de bucle invertido que expone las herramientas de puerta de enlace al proceso CLI
- autentica el puente con un token por sesión (`OPENCLAW_MCP_TOKEN`)
- limita el acceso a las herramientas al contexto de la sesión, cuenta y canal actual
- carga los servidores MCP de paquete habilitados para el espacio de trabajo actual
- los fusiona con cualquier forma existente de configuración/ajustes de MCP del backend
- reescribe la configuración de lanzamiento utilizando el modo de integración propiedad del backend de la extensión propietaria

Si no hay servidores MCP habilitados, OpenClaw aún inyecta una configuración estricta cuando un
backend opta por el MCP agrupado para que las ejecuciones en segundo plano permanezcan aisladas.

## Limitaciones

- **No hay llamadas directas a herramientas de OpenClaw.** OpenClaw no inyecta llamadas a herramientas en
  el protocolo del backend de CLI. Los backends solo ven las herramientas de la puerta de enlace cuando optan por
  `bundleMcp: true`.
- **El streaming es específico del backend.** Algunos backends transmiten JSONL; otros almacenan en búfer
  hasta salir.
- Las **salidas estructuradas** dependen del formato JSON de la CLI.
- Las **sesiones de Codex CLI** se reanudan mediante salida de texto (sin JSONL), lo cual es menos
  estructurado que la ejecución inicial de `--json`. Las sesiones de OpenClaw todavía funcionan
  con normalidad.

## Solución de problemas

- **CLI no encontrada**: establezca `command` en una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para mapear `provider/model` → modelo CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté establecido y `sessionMode` no sea
  `none` (Codex CLI actualmente no puede reanudar con salida JSON).
- **Imágenes ignoradas**: establezca `imageArg` (y verifique que la CLI sea compatible con rutas de archivos).
