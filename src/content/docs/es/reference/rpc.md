---
summary: "Adaptadores RPC para CLIs externos (signal-cli, imsg) y patrones de pasarela"
read_when:
  - Adding or changing external CLI integrations
  - Debugging RPC adapters (signal-cli, imsg)
title: "Adaptadores RPC"
---

OpenClaw integra CLIs externos a través de JSON-RPC. Hoy se utilizan dos patrones.

## Patrón A: Demonio HTTP (signal-cli)

- `signal-cli` se ejecuta como un demonio con JSON-RPC sobre HTTP.
- El flujo de eventos es SSE (`/api/v1/events`).
- Sonda de estado: `/api/v1/check`.
- OpenClaw posee el ciclo de vida cuando `channels.signal.autoStart=true`.

Consulte [Signal](/es/channels/signal) para la configuración y los endpoints.

## Patrón B: proceso hijo stdio (imsg)

- OpenClaw inicia `imsg rpc` como un proceso hijo para [iMessage](/es/channels/imessage).
- JSON-RPC está delimitado por líneas sobre stdin/stdout (un objeto JSON por línea).
- No se requiere puerto TCP ni demonio.

Métodos principales utilizados:

- `watch.subscribe` → notificaciones (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (sondeo/diagnósticos)

Consulte [iMessage](/es/channels/imessage) para la configuración heredada y el direccionamiento (se prefiere `chat_id`).

## Directrices del adaptador

- La pasarela es propietaria del proceso (inicio/parada vinculado al ciclo de vida del proveedor).
- Mantenga los clientes RPC resistentes: tiempos de espera, reinicio al salir.
- Prefiera identificadores estables (p. ej., `chat_id`) sobre cadenas de visualización.

## Relacionado

- [Protocolo de pasarela](/es/gateway/protocol)
