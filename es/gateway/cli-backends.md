---
summary: "Backends de CLI: alternativa de solo texto mediante CLIs de IA local"
read_when:
  - Desea una alternativa confiable cuando los proveedores de API fallan
  - Está ejecutando Claude Code CLI u otros CLIs de IA local y desea reutilizarlos
  - Necesita una ruta de solo texto y sin herramientas que aún admita sesiones e imágenes
title: "Backends de CLI"
---

# Backends de CLI (runtime de reserva)

OpenClaw puede ejecutar **CLIs de IA local** como una **alternativa de solo texto** cuando los proveedores de API están caídos,
con límites de tasa o comportándose mal temporalmente. Esto es intencionalmente conservador:

- **Las herramientas están deshabilitadas** (sin llamadas a herramientas).
- **Texto de entrada → texto de salida** (confiable).
- **Las sesiones son compatibles** (para que los turnos de seguimiento se mantengan coherentes).
- **Las imágenes se pueden pasar** si la CLI acepta rutas de imagen.

Está diseñado como una **red de seguridad** más que como una ruta principal. Úselo cuando
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

Eso es todo. No se necesitan claves ni configuración de autenticación adicional más allá de la propia CLI.

## Uso como alternativa

Agregue un backend de CLI a su lista de reserva para que solo se ejecute cuando fallen los modelos principales:

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

Cada entrada está identificada por un **id de proveedor** (ej. `claude-cli`, `my-cli`).
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
            "claude-opus-4-5": "opus",
            "claude-sonnet-4-5": "sonnet",
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
5. **Mantiene los ids de sesión** por backend, para que los seguimientos reutilicen la misma sesión de CLI.

## Sesiones

- Si la CLI admite sesiones, establezca `sessionArg` (p. ej. `--session-id`) o
  `sessionArgs` (marcador de posición `{sessionId}`) cuando el ID deba insertarse
  en múltiples indicadores.
- Si la CLI utiliza un **subcomando de reanudación** con diferentes indicadores, establezca
  `resumeArgs` (reemplaza `args` al reanudar) y opcionalmente `resumeOutput`
  (para reanudaciones que no son JSON).
- `sessionMode`:
  - `always`: envíe siempre un id de sesión (nuevo UUID si no hay ninguno almacenado).
  - `existing`: envíe un id de sesión solo si se había almacenado uno antes.
  - `none`: nunca envíe un id de sesión.

## Imágenes (passthrough)

Si su CLI acepta rutas de imágenes, establezca `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw escribirá imágenes base64 en archivos temporales. Si `imageArg` está establecido, esas
rutas se pasan como argumentos de CLI. Si `imageArg` falta, OpenClaw añade las
rutas de archivos al indicador (inyección de ruta), lo cual es suficiente para las CLI que cargan
automáticamente archivos locales desde rutas simples (comportamiento de Claude Code CLI).

## Entradas / salidas

- `output: "json"` (predeterminado) intenta analizar JSON y extraer texto + id de sesión.
- `output: "jsonl"` analiza flujos de JSONL (Codex CLI `--json`) y extrae el
  último mensaje del agente más `thread_id` cuando está presente.
- `output: "text"` trata stdout como la respuesta final.

Modos de entrada:

- `input: "arg"` (predeterminado) pasa el indicador como el último argumento de CLI.
- `input: "stdin"` envía el indicador a través de stdin.
- Si el indicador es muy largo y `maxPromptArgChars` está establecido, se usa stdin.

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

Sobrescribir solo si es necesario (común: ruta absoluta de `command`).

## Limitaciones

- **Sin herramientas de OpenClaw** (el backend de CLI nunca recibe llamadas a herramientas). Algunas CLI aún pueden ejecutar sus propias herramientas de agente.
- **Sin transmisión continua** (la salida de la CLI se recopila y luego se devuelve).
- **Las salidas estructuradas** dependen del formato JSON de la CLI.
- **Las sesiones de Codex CLI** se reanudan mediante salida de texto (sin JSONL), lo cual es menos estructurado que la ejecución inicial de `--json`. Las sesiones de OpenClaw aún funcionan con normalidad.

## Solución de problemas

- **CLI no encontrada**: establezca `command` en una ruta completa.
- **Nombre de modelo incorrecto**: use `modelAliases` para asignar `provider/model` → modelo de CLI.
- **Sin continuidad de sesión**: asegúrese de que `sessionArg` esté establecido y `sessionMode` no sea `none` (Codex CLI actualmente no puede reanudar con salida JSON).
- **Imágenes ignoradas**: establezca `imageArg` (y verifique que la CLI admita rutas de archivo).

import en from "/components/footer/en.mdx";

<en />
