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

Use `/debug` en el chat para establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco).
`/debug` está deshabilitado de forma predeterminada; habilítelo con `commands.debug: true`.
Esto es útil cuando necesita alternar configuraciones oscuras sin editar `openclaw.json`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` borra todas las anulaciones y vuelve a la configuración en disco.

## Salida de traza de sesión

Use `/trace` cuando desee ver líneas de traza/depuración propiedad del complemento en una sesión
sin activar el modo completo detallado (verbose).

Ejemplos:

```text
/trace
/trace on
/trace off
```

Use `/trace` para diagnósticos de complementos, como resúmenes de depuración de Memoria Activa.
Siga usando `/verbose` para la salida de herramientas y estado detallado normal, y siga usando
`/debug` para anulaciones de configuración solo en tiempo de ejecución.

## Modo de vigilancia de la puerta de enlace (Gateway watch mode)

Para una iteración rápida, ejecute la puerta de enlace bajo el observador de archivos:

```bash
pnpm gateway:watch
```

Esto equivale a:

```bash
node scripts/watch-node.mjs gateway --force
```

El observador se reinicia en los archivos relevantes para la compilación bajo `src/`, archivos fuente de extensiones,
metadatos de `package.json` y `openclaw.plugin.json` de extensiones, `tsconfig.json`,
`package.json` y `tsdown.config.ts`. Los cambios en los metadatos de la extensión reinician la
puerta de enlace sin forzar una reconstrucción de `tsdown`; los cambios de fuente y configuración aún
reconstruyen `dist` primero.

Agregue cualquier indicador CLI de puerta de enlace después de `gateway:watch` y se pasarán en cada
reinicio. Volver a ejecutar el mismo comando de vigilancia para el mismo repositorio/conjunto de indicadores ahora
reemplaza al observador anterior en lugar de dejar padres de observadores duplicados atrás.

## Perfil de desarrollo + puerta de enlace de desarrollo (--dev)

Use el perfil de desarrollo para aislar el estado y crear una configuración segura y desechable para
la depuración. Hay **dos** indicadores `--dev`:

- **Global `--dev` (profile):** aísla el estado bajo `~/.openclaw-dev` y
  establece el puerto del gateway por defecto en `19001` (los puertos derivados cambian con él).
- **`gateway --dev`: indica al Gateway que cree automáticamente una configuración predeterminada +
  espacio de trabajo** cuando falten (y omitir BOOTSTRAP.md).

Flujo recomendado (perfil de desarrollo + arranque de desarrollo):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si aún no tienes una instalación global, ejecuta la CLI a través de `pnpm openclaw ...`.

Lo que hace esto:

1. **Aislamiento de perfil** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (el navegador/canvas cambian en consecuencia)

2. **Arranque de desarrollo** (`gateway --dev`)
   - Escribe una configuración mínima si falta (`gateway.mode=local`, bind loopback).
   - Establece `agent.workspace` al espacio de trabajo de desarrollo.
   - Establece `agent.skipBootstrap=true` (sin BOOTSTRAP.md).
   - Si faltan, inicializa los archivos del espacio de trabajo:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identidad predeterminada: **C3‑PO** (droide de protocolo).
   - Omite los proveedores de canales en modo de desarrollo (`OPENCLAW_SKIP_CHANNELS=1`).

Flujo de restablecimiento (nuevo inicio):

```bash
pnpm gateway:dev:reset
```

Nota: `--dev` es una marca de perfil **global** y es consumida por algunos ejecutores.
Si necesitas especificarlo, usa la forma de variable de entorno:

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` borra la configuración, las credenciales, las sesiones y el espacio de trabajo de desarrollo (usando
`trash`, no `rm`), y luego recrea la configuración de desarrollo predeterminada.

Consejo: si un gateway que no es de desarrollo ya se está ejecutando (launchd/systemd), deténlo primero:

```bash
openclaw gateway stop
```

## Registro de flujo sin procesar (OpenClaw)

OpenClaw puede registrar el **flujo del asistente sin procesar** antes de cualquier filtrado o formato.
Esta es la mejor manera de ver si el razonamiento llega como deltas de texto plano
(o como bloques de pensamiento separados).

Actívalo a través de la CLI:

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

> Nota: esto solo lo emiten los procesos que utilizan el proveedor
> `openai-completions` de pi-mono.

## Notas de seguridad

- Los registros de flujo sin procesar pueden incluir avisos completos, resultados de herramientas y datos del usuario.
- Mantenga los registros localmente y elimínelos después de la depuración.
- Si comparte registros, elimine primero los secretos y la información personal (PII).
