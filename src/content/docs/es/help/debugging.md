---
summary: "Herramientas de depuración: modo watch, flujos de modelo sin procesar y rastreo de fugas de razonamiento"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "Depuración"
---

# Depuración

Esta página cubre asistentes de depuración para la salida en streaming, especialmente cuando un
proveedor mezcla el razonamiento con el texto normal.

## Invalidaciones de depuración en tiempo de ejecución

Use `/debug` en el chat para establecer invalidaciones de configuración **solo en tiempo de ejecución** (memoria, no disco).
`/debug` está deshabilitado por defecto; habilítelo con `commands.debug: true`.
Esto es útil cuando necesita alternar configuraciones oscuras sin editar `openclaw.json`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` borra todas las invalidaciones y regresa a la configuración en disco.

## Modo watch de la puerta de enlace

Para una iteración rápida, ejecute la puerta de enlace bajo el observador de archivos:

```bash
pnpm gateway:watch
```

Esto equivale a:

```bash
node scripts/watch-node.mjs gateway --force
```

El observador se reinicia en los archivos relevantes para la compilación bajo `src/`, archivos fuente de extensiones,
metadatos de extensiones `package.json` y `openclaw.plugin.json`, `tsconfig.json`,
`package.json` y `tsdown.config.ts`. Los cambios en los metadatos de la extensión reinician la
gateway sin forzar una reconstrucción de `tsdown`; los cambios en el código fuente y la configuración aún
reconstruyen `dist` primero.

Añade cualquier bandera de CLI de la puerta de enlace después de `gateway:watch` y se pasarán en
cada reinicio. Al volver a ejecutar el mismo comando de vigilancia para el mismo repositorio/conjunto de banderas ahora
reemplaza al vigilante más antiguo en lugar de dejar padres de vigilantes duplicados atrás.

## Perfil de desarrollo + gateway de desarrollo (--dev)

Use el perfil de desarrollo para aislar el estado e iniciar una configuración segura y desechable para
depuración. Hay **dos** flags `--dev`:

- **`--dev` Global (perfil):** aísla el estado bajo `~/.openclaw-dev` y
  establece el puerto de la gateway por defecto en `19001` (los puertos derivados se desplazan con él).
- **`gateway --dev`: le dice a la Gateway que cree automáticamente una configuración predeterminada +
  workspace** cuando falte (y omita BOOTSTRAP.md).

Flujo recomendado (perfil de desarrollo + arranque de desarrollo):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si aún no tiene una instalación global, ejecute la CLI a través de `pnpm openclaw ...`.

Lo que esto hace:

1. **Aislamiento de perfil** (`--dev` global)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (el navegador/canvas se desplazan en consecuencia)

2. **Arranque de desarrollo** (`gateway --dev`)
   - Escribe una configuración mínima si falta (`gateway.mode=local`, bind loopback).
   - Establece `agent.workspace` al espacio de trabajo de desarrollo.
   - Establece `agent.skipBootstrap=true` (sin BOOTSTRAP.md).
   - Siembra los archivos del espacio de trabajo si faltan:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identidad predeterminada: **C3‑PO** (droide de protocolo).
   - Omite los proveedores de canales en modo de desarrollo (`OPENCLAW_SKIP_CHANNELS=1`).

Flujo de restablecimiento (nuevo inicio):

```bash
pnpm gateway:dev:reset
```

Nota: `--dev` es un indicador de perfil **global** y es consumido por algunos ejecutores.
Si necesita escribirlo explícitamente, use la forma de variable de entorno:

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` borra la configuración, las credenciales, las sesiones y el espacio de trabajo de desarrollo (usando
`trash`, no `rm`), y luego recrea la configuración de desarrollo predeterminada.

Consejo: si una puerta de enlace no de desarrollo ya se está ejecutando (launchd/systemd), deténgala primero:

```bash
openclaw gateway stop
```

## Registro de flujo sin procesar (OpenClaw)

OpenClaw puede registrar el **flujo del asistente sin procesar** antes de cualquier filtrado o formato.
Esta es la mejor manera de ver si el razonamiento está llegando como deltas de texto plano
(o como bloques de pensamiento separados).

Actívelo a través de la CLI:

```bash
pnpm gateway:watch --raw-stream
```

Anulación de ruta opcional:

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

Variables de entorno equivalentes:

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

Archivo predeterminado:

`~/.openclaw/logs/raw-stream.jsonl`

## Registro de fragmentos sin procesar (pi-mono)

Para capturar **fragmentos compatibles con OpenAI sin procesar** antes de que se analicen en bloques,
pi-mono expone un registrador separado:

```bash
PI_RAW_STREAM=1
```

Ruta opcional:

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

Archivo predeterminado:

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> Nota: esto solo lo emiten los procesos que usan el proveedor
> `openai-completions` de pi-mono.

## Notas de seguridad

- Los registros de flujo sin procesar pueden incluir avisos completos, resultados de herramientas y datos de usuario.
- Mantenga los registros localmente y elimínelos después de la depuración.
- Si comparte registros, elimine primero los secretos y la PII.
