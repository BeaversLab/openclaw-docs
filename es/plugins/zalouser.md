---
summary: "Plugin Zalo Personal: inicio de sesión QR + mensajería a través de zca-js nativo (instalación del plugin + configuración del canal + herramienta)"
read_when:
  - Deseas soporte para Zalo Personal (no oficial) en OpenClaw
  - Estás configurando o desarrollando el plugin zalouser
title: "Plugin Zalo Personal"
---

# Zalo Personal (plugin)

Soporte de Zalo Personal para OpenClaw a través de un plugin, utilizando `zca-js` nativo para automatizar una cuenta de usuario normal de Zalo.

> **Advertencia:** La automatización no oficial puede dar lugar a la suspensión o prohibición de la cuenta. Úsalo bajo tu propia responsabilidad.

## Nomenclatura

El ID del canal es `zalouser` para dejar explírito que esto automatiza una **cuenta de usuario personal de Zalo** (no oficial). Mantenemos `zalo` reservado para una posible futura integración con la API oficial de Zalo.

## Dónde se ejecuta

Este plugin se ejecuta **dentro del proceso Gateway**.

Si utilizas un Gateway remoto, instálalo/configúralo en la **máquina que ejecuta el Gateway** y luego reinicia el Gateway.

No se requiere ningún binario CLI externo `zca`/`openzca`.

## Instalación

### Opción A: instalar desde npm

```bash
openclaw plugins install @openclaw/zalouser
```

Reinicia el Gateway después.

### Opción B: instalar desde una carpeta local (desarrollo)

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

Reinicia el Gateway después.

## Configuración

La configuración del canal se encuentra en `channels.zalouser` (no en `plugins.entries.*`):

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## Herramienta de agente

Nombre de la herramienta: `zalouser`

Acciones: `send`, `image`, `link`, `friends`, `groups`, `me`, `status`

Las acciones de mensajes del canal también admiten `react` para reacciones a mensajes.

import es from "/components/footer/es.mdx";

<es />
