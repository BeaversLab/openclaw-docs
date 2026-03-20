---
summary: "Herramientas de depuración: modo de observación, flujos de modelos sin procesar y rastreo de filtraciones de razonamiento"
read_when:
  - Necesitas inspeccionar la salida del modelo sin procesar en busca de filtraciones de razonamiento
  - Quieres ejecutar el Gateway en modo de observación mientras iteras
  - Necesitas un flujo de trabajo de depuración repetible
title: "Depuración"
---

# Depuración

Esta página cubre asistentes de depuración para la salida en streaming, especialmente cuando un
proveedor mezcla el razonamiento en el texto normal.

## Anulaciones de depuración en tiempo de ejecución

Usa `/debug` en el chat para establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco).
`/debug` está deshabilitado por defecto; actívalo con `commands.debug: true`.
Esto es útil cuando necesitas alternar configuraciones oscuras sin editar `openclaw.json`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` borra todas las anulaciones y retorna a la configuración en disco.

## Modo de observación del Gateway

Para una iteración rápida, ejecuta el gateway bajo el observador de archivos:

```bash
pnpm gateway:watch
```

Esto se asigna a:

```bash
node scripts/watch-node.mjs gateway --force
```

El observador se reinicia en los archivos relevantes para la compilación bajo `src/`, archivos fuente de extensiones,
metadatos `package.json` y `openclaw.plugin.json` de extensiones, `tsconfig.json`,
`package.json`, y `tsdown.config.ts`. Los cambios en los metadatos de la extensión reinician el
gateway sin forzar una reconstrucción `tsdown`; los cambios en el código fuente y la configuración aún
reconstruyen `dist` primero.

Agrega cualquier indicador CLI del gateway después de `gateway:watch` y se pasarán en
cada reinicio.

## Perfil de desarrollo + gateway de desarrollo (--dev)

Usa el perfil de desarrollo para aislar el estado e iniciar una configuración segura y desechable para
depuración. Hay **dos** indicadores `--dev`:

- **`--dev` global (perfil):** aisla el estado bajo `~/.openclaw-dev` y
  establece el puerto del gateway por defecto en `19001` (los puertos derivados cambian con él).
- **`gateway --dev`: indica al Gateway que cree automáticamente una configuración predeterminada +
  espacio de trabajo** cuando falten (y omita BOOTSTRAP.md).

Flujo recomendado (perfil de desarrollo + arranque de desarrollo):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si aún no tienes una instalación global, ejecuta la CLI a través de `pnpm openclaw ...`.

Lo que hace esto:

1. **Aislamiento de perfiles** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (el navegador/canvas se desplaza en consecuencia)

2. **Arranque de desarrollo** (`gateway --dev`)
   - Escribe una configuración mínima si falta (`gateway.mode=local`, bind loopback).
   - Establece `agent.workspace` en el espacio de trabajo de desarrollo.
   - Establece `agent.skipBootstrap=true` (sin BOOTSTRAP.md).
   - Si faltan, inicializa los archivos del espacio de trabajo:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identidad predeterminada: **C3‑PO** (droide de protocolo).
   - Omite los proveedores de canales en modo de desarrollo (`OPENCLAW_SKIP_CHANNELS=1`).

Flujo de restablecimiento (nuevo inicio):

```bash
pnpm gateway:dev:reset
```

Nota: `--dev` es una marca de perfil **global** y algunos ejecutores la consumen.
Si necesita especificarlo, use la forma de variable de entorno:

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` borra la configuración, las credenciales, las sesiones y el espacio de trabajo de desarrollo (usando
`trash`, no `rm`) y luego recrea la configuración de desarrollo predeterminada.

Consejo: si ya se está ejecutando una puerta de enlace que no es de desarrollo (launchd/systemd), deténgala primero:

```bash
openclaw gateway stop
```

## Registro de flujo sin procesar (OpenClaw)

OpenClaw puede registrar el **flujo del asistente sin procesar** antes de cualquier filtrado o formato.
Esta es la mejor manera de ver si el razonamiento llega como deltas de texto plano
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

> Nota: esto solo lo emiten los procesos que utilizan el
> proveedor `openai-completions` de pi-mono.

## Notas de seguridad

- Los registros de flujo sin procesar pueden incluir avisos completos, resultados de herramientas y datos de usuario.
- Mantenga los registros localmente y elimínelos después de depurar.
- Si comparte registros, elimine primero los secretos y la información personal.

import es from "/components/footer/es.mdx";

<es />
