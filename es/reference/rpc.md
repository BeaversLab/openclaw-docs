---
summary: "Adaptadores RPC para CLIs externos (signal-cli, imsg heredado) y patrones de puerta de enlace"
read_when:
  - Adding or changing external CLI integrations
  - Debugging RPC adapters (signal-cli, imsg)
title: "Adaptadores RPC"
---

# Adaptadores RPC

OpenClaw integra CLIs externos a través de JSON-RPC. Hoy se utilizan dos patrones.

## Patrón A: demonio HTTP (signal-cli)

- `signal-cli` se ejecuta como un demonio con JSON-RPC sobre HTTP.
- El flujo de eventos es SSE (`/api/v1/events`).
- Sonda de estado: `/api/v1/check`.
- OpenClaw posee el ciclo de vida cuando `channels.signal.autoStart=true`.

Consulte [Signal](/es/channels/signal) para la configuración y los puntos finales.

## Patrón B: proceso hijo stdio (heredado: imsg)

> **Nota:** Para nuevas configuraciones de iMessage, use [BlueBubbles](/es/channels/bluebubbles) en su lugar.

- OpenClaw genera `imsg rpc` como un proceso hijo (integración heredada de iMessage).
- JSON-RPC está delimitado por líneas sobre stdin/stdout (un objeto JSON por línea).
- No se requiere puerto TCP, ni demonio.

Métodos principales utilizados:

- `watch.subscribe` → notificaciones (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (sonda/diagnóstico)

Consulte [iMessage](/es/channels/imessage) para la configuración heredada y el direccionamiento (se prefiere `chat_id`).

## Pautas del adaptador

- La puerta de enlace posee el proceso (inicio/parada vinculado al ciclo de vida del proveedor).
- Mantenga los clientes RPC resilientes: tiempos de espera, reinicio al salir.
- Prefiera identificadores estables (p. ej., `chat_id`) sobre cadenas de visualización.

import es from "/components/footer/es.mdx";

<es />
