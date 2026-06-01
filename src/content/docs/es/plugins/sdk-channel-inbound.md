---
summary: "Ayudantes de eventos entrantes para complementos de canal: construcción de contexto, orquestación de ejecutor compartido, registro de sesión y envío de respuesta preparada"
title: "API entrante de canal"
read_when:
  - You are building or refactoring a messaging channel plugin receive path
  - You need shared inbound context construction, session recording, or prepared reply dispatch
  - You are migrating old channel turn helpers to inbound/message APIs
---

Los complementos de canal deben modelar las rutas de recepción con sustantivos entrantes y de mensaje:

```text
platform event -> inbound facts/context -> agent reply -> message delivery
```

Use `openclaw/plugin-sdk/channel-inbound` para la normalización,
formato, raíces y orquestación de eventos entrantes. Use
`openclaw/plugin-sdk/channel-outbound` para el envío nativo,
recepción, entrega duradera y el comportamiento de vista previa en vivo.

## Asistentes principales

```ts
import { buildChannelInboundEventContext, runChannelInboundEvent, dispatchChannelInboundReply } from "openclaw/plugin-sdk/channel-inbound";
```

- `buildChannelInboundEventContext(...)`: proyecta los hechos normalizados del canal en
  el contexto del mensaje/sesión.
- `runChannelInboundEvent(...)`: ejecuta ingestión, clasificación, previa, resolución,
  registro, envío y finalización para un evento entrante de la plataforma.
- `dispatchChannelInboundReply(...)`: registra y envía una respuesta de entrada ya ensamblada
  con un adaptador de entrega.

El tiempo de ejecución del complemento inyectado expone los mismos asistentes de alto nivel bajo
`runtime.channel.inbound.*` para canales integrados/nativos que ya reciben el
objeto de tiempo de ejecución.

```ts
await runtime.channel.inbound.run({
  channel: "demo",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest: normalizePlatformEvent,
    resolveTurn: resolveInboundReply,
  },
});
```

Los despachadores de compatibilidad deben ensamblar las entradas de `dispatchChannelInboundReply(...)`
y mantener la entrega de la plataforma en el adaptador de entrega. Las nuevas rutas de envío deben
preferir los adaptadores de mensaje y los asistentes de mensajes duraderos.

## Migración

Se eliminaron los antiguos alias de tiempo de ejecución de `runtime.channel.turn.*`. Use:

- `runtime.channel.inbound.run(...)` para eventos de entrada brutos.
- `runtime.channel.inbound.dispatchReply(...)` para contextos de respuesta ensamblados.
- `runtime.channel.inbound.buildContext(...)` para cargas útiles de contexto de entrada.
- `runtime.channel.inbound.runPreparedReply(...)` solo para rutas de despacho preparadas propiedad del canal que ya ensamblan su propio cierre de despacho.

El nuevo código de complemento no debe introducir APIs de canal con el nombre `turn`. Mantenga el vocabulario de turno del modelo o agente dentro del código del agente/proveedor; los complementos de canal utilizan términos de entrada, mensaje, entrega y respuesta.
