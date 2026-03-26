---
summary: "CLI backends: alternativa solo de texto vía CLIs de IA locales"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Claude Code CLI or other local AI CLIs and want to reuse them
  - You need a text-only, tool-free path that still supports sessions and images
title: "CLI Backends"
---

# CLI backends (entorno de reserva)

OpenClaw puede ejecutar **CLIs de IA locales** como una **alternativa solo de texto** cuando los proveedores de API están caídos,
limitados por tasa o comportándose incorrectamente de forma temporal. Esto es intencionalmente conservador:

- **Las herramientas están deshabilitadas** (sin llamadas a herramientas).
- **Texto de entrada → texto de salida** (confiable).
- **Las sesiones son compatibles** (así, los turnos de seguimiento se mantienen coherentes).
- **Las imágenes se pueden pasar a través** si la CLI acepta rutas de imagen.

Esto está diseñado como una **red de seguridad** más que como una ruta principal. Úselo cuando
quiera respuestas de texto que "siempre funcionen" sin depender de APIs externas.

## Inicio rápido para principiantes

Puede usar Claude Code CLI **sin ninguna configuración** (OpenClaw incluye un valor predeterminado integrado):

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI también funciona directamente:

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
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

Eso es todo. No se necesitan claves ni configuración de autenticación extra más allá de la propia CLI.

## Usarlo como alternativa

Agregue un backend de CLI a su lista de alternativas para que solo se ejecute cuando fallen los modelos principales:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["claude-cli/opus-4.6", "claude-cli/opus-4.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/opus-4.6": {},
        "claude-cli/opus-4.5": {},
      },
    },
  },
}
```

Notas:

- Si usa `agents.defaults.models` (lista de permitidos), debe incluir `claude-cli/...`.
- Si el proveedor principal falla (autenticación, límites de tasa, tiempos de espera), OpenClaw
  intentará el backend de CLI a continuación.

## Resumen de configuración

Todos los backends de CLI residen en:

```
agents.defaults.cliBackends
```

Cada entrada está identificada por un **id de proveedor** (p. ej., `claude-cli`, `my-cli`).
El id del proveedor se convierte en el lado izquierdo de su referencia de modelo:

```
<provider>/<model>
```

### Configuración de ejemplo

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
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

1. **Selecciona un backend** basándose en el prefijo del proveedor (`claude-cli/...`).
2. **Construye un prompt del sistema** usando el mismo prompt de OpenClaw + contexto del espacio de trabajo.
3. **Ejecuta la CLI** con un id de sesión (si es compatible) para que el historial se mantenga consistente.
4. **Analiza la salida** (JSON o texto plano) y devuelve el texto final.
5. **Persiste los ids de sesión** por backend, así los seguimientos reutilizan la misma sesión de CLI.

## Sesiones

- Si la CLI es compatible con sesiones, establezca `sessionArg` (p. ej., `--session-id`) o
  `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID necesita ser insertado
  en múltiples banderas.
- Si la CLI utiliza un **subcomando de reanudación** con diferentes indicadores, configure
  `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput`
  (para reanudaciones que no son JSON).
- `sessionMode`:
  - `always`: siempre enviar un id de sesión (nuevo UUID si no hay ninguno almacenado).
  - `existing`: enviar un id de sesión solo si se almacenó uno anteriormente.
  - `none`: nunca enviar un id de sesión.

## Imágenes (paso a través)

Si su CLI acepta rutas de imagen, configure `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está configurado, esas
rutas se pasan como argumentos de CLI. Si `imageArg` falta, OpenClaw añade las
rutas de archivo al mensaje (inyección de ruta), lo cual es suficiente para CLIs que cargan
automáticamente archivos locales desde rutas simples (comportamiento de la CLI de Claude Code).

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- `output: "jsonl"` analiza flujos JSONL (Codex CLI `--json`) y extrae el
  último mensaje del agente más `thread_id` cuando está presente.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el mensaje como el último argumento de CLI.
- `input: "stdin"` envía el mensaje a través de stdin.
- Si el mensaje es muy largo y `maxPromptArgChars` está configurado, se usa stdin.

## Valores predeterminados (integrados)

OpenClaw incluye un valor predeterminado para `claude-cli`:

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw también incluye un valor predeterminado para `codex-cli`:

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

Anule solo si es necesario (común: ruta `command` absoluta).

## Limitaciones

- **Sin herramientas de OpenClaw** (el backend de CLI nunca recibe llamadas a herramientas). Algunas CLIs
  pueden seguir ejecutando sus propias herramientas de agente.
- **Sin streaming** (la salida de la CLI se recopila y luego se devuelve).
- **Salidas estructuradas** dependen del formato JSON de la CLI.
- **Sesiones de Codex CLI** se reanudan mediante salida de texto (sin JSONL), lo cual es menos
  estructurado que la ejecución inicial `--json`. Las sesiones de OpenClaw aún funcionan
  con normalidad.

## Solución de problemas

- **CLI no encontrada**: establezca `command` a una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para asignar `provider/model` → modelo CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté configurado y `sessionMode` no sea
  `none` (Codex CLI actualmente no puede reanudarse con salida JSON).
- **Imágenes ignoradas**: configure `imageArg` (y verifique que la CLI admita rutas de archivos).

import es from "/components/footer/es.mdx";

<es />
