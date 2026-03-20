---
summary: "Herramientas de depuración: modo watch, flujos de modelos sin procesar y rastreo de fugas de razonamiento"
read_when:
  - Necesitas inspeccionar la salida del modelo sin procesar para detectar fugas de razonamiento
  - Quieres ejecutar el Gateway en modo watch mientras iteras
  - Necesitas un flujo de trabajo de depuración repetible
title: "Depuración"
---

# Depuración

Esta página cubre asistentes de depuración para la salida en streaming, especialmente cuando un
proveedor mezcla el razonamiento con el texto normal.

## Anulaciones de depuración en tiempo de ejecución

Usa `/debug` en el chat para establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco).
`/debug` está deshabilitado de forma predeterminada; habilita con `commands.debug: true`.
Esto es útil cuando necesitas alternar configuraciones oscuras sin editar `openclaw.json`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` borra todas las anulaciones y devuelve a la configuración en disco.

## Modo watch del Gateway

Para una iteración rápida, ejecuta el gateway bajo el observador de archivos:

```bash
pnpm gateway:watch --force
```

Esto se asigna a:

```bash
tsx watch src/entry.ts gateway --force
```

Añade cualquier flag CLI del gateway después de `gateway:watch` y se pasarán
cada vez que se reinicie.

## Perfil de desarrollo + gateway de desarrollo (--dev)

Usa el perfil de desarrollo para aislar el estado e iniciar una configuración segura y desechable para
depuración. Hay **dos** flags `--dev`:

- **Global `--dev` (perfil):** aísla el estado bajo `~/.openclaw-dev` y
  establece el puerto del gateway predeterminado en `19001` (los puertos derivados se desplazan con él).
- **`gateway --dev`: le indica al Gateway que cree automáticamente una configuración predeterminada +
  espacio de trabajo** cuando falte (y omita BOOTSTRAP.md).

Flujo recomendado (perfil de desarrollo + arranque de desarrollo):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si aún no tienes una instalación global, ejecuta el CLI a través de `pnpm openclaw ...`.

Lo que esto hace:

1. **Aislamiento de perfil** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (el navegador/canvas se desplazan en consecuencia)

2. **Arranque de desarrollo** (`gateway --dev`)
   - Escribe una configuración mínima si falta (`gateway.mode=local`, vincula loopback).
   - Establece `agent.workspace` al espacio de trabajo de desarrollo.
   - Establece `agent.skipBootstrap=true` (sin BOOTSTRAP.md).
   - Si faltan, siembra los archivos del espacio de trabajo:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identidad predeterminada: **C3‑PO** (droide de protocolo).
   - Omite los proveedores de canales en modo de desarrollo (`OPENCLAW_SKIP_CHANNELS=1`).

Reiniciar el flujo (inicio limpio):

```bash
pnpm gateway:dev:reset
```

Nota: `--dev` es una marca de perfil **global** y es absorbida por algunos ejecutores.
Si necesitas especificarlo, usa la forma de variable de entorno:

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` borra la configuración, las credenciales, las sesiones y el espacio de trabajo de desarrollo (usando
`trash`, no `rm`), y luego recrea la configuración de desarrollo predeterminada.

Consejo: si ya se está ejecutando una puerta de enlace que no es de desarrollo (launchd/systemd), deténla primero:

```bash
openclaw gateway stop
```

## Registro de flujo sin procesar (OpenClaw)

OpenClaw puede registrar el **flujo del asistente sin procesar** antes de cualquier filtrado o formato.
Esta es la mejor manera de ver si el razonamiento está llegando como deltas de texto plano
(o como bloques de pensamiento separados).

Actívalo a través de la CLI:

```bash
pnpm gateway:watch --force --raw-stream
```

Anulación de ruta opcional:

```bash
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
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

> Nota: esto solo es emitido por procesos que usan el
> proveedor `openai-completions` de pi-mono.

## Notas de seguridad

- Los registros de flujo sin procesar pueden incluir mensajes completos, salida de herramientas y datos de usuario.
- Mantén los registros localmente y elimínalos después de depurar.
- Si compartes registros, elimina primero los secretos y la información personal (PII).

import es from "/components/footer/es.mdx";

<es />
