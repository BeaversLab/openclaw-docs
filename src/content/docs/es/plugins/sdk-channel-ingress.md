---
summary: "API experimental de ingreso de canal para la autorización de mensajes entrantes"
read_when:
  - Building or migrating a messaging channel plugin
  - Changing DM or group allowlists, route gates, command auth, event auth, or mention activation
  - Reviewing channel ingress redaction or SDK compatibility boundaries
title: "API de ingreso de canal"
sidebarTitle: "Ingreso de canal"
---

# API de ingreso de canal

El ingreso de canal es el límite de control de acceso experimental para los eventos entrantes del canal. Utilice `openclaw/plugin-sdk/channel-ingress-runtime` para las rutas de recepción.
La subruta antigua `openclaw/plugin-sdk/channel-ingress` sigue exportándose como fachada de compatibilidad en desuso para complementos de terceros.

Los complementos son propietarios de los datos de la plataforma y los efectos secundarios. Core es propietario de la política genérica: listas de permitidos de DM/grupo, entradas de DM en el almacén de emparejamiento, compuertas de ruta, compuertas de comandos, autenticación de eventos, activación de menciones, diagnósticos redactados y admisión.

## Resolución en tiempo de ejecución

```ts
import { defineStableChannelIngressIdentity, resolveChannelMessageIngress } from "openclaw/plugin-sdk/channel-ingress-runtime";

const identity = defineStableChannelIngressIdentity({
  key: "platform-user-id",
  normalize: normalizePlatformUserId,
  sensitivity: "pii",
});

const result = await resolveChannelMessageIngress({
  channelId: "my-channel",
  accountId,
  identity,
  subject: { stableId: platformUserId },
  conversation: { kind: isGroup ? "group" : "direct", id: conversationId },
  event: { kind: "message", authMode: "inbound", mayPair: !isGroup },
  policy: {
    dmPolicy: config.dmPolicy,
    groupPolicy: config.groupPolicy,
    groupAllowFromFallbackToAllowFrom: true,
  },
  allowFrom: config.allowFrom,
  groupAllowFrom: config.groupAllowFrom,
  accessGroups: cfg.accessGroups,
  route,
  readStoreAllowFrom,
  command: hasControlCommand ? { allowTextCommands: true, hasControlCommand } : undefined,
});
```

No precalcule las listas de permitidos efectivas, los propietarios de los comandos ni los grupos de comandos. El solucionador los deriva de listas de permitidos sin procesar, devoluciones de llamada del almacén, descriptores de ruta, grupos de acceso, política y tipo de conversación.

## Resultado

Los complementos integrados deben consumir directamente las proyecciones modernas:

- `ingress`: decisión de compuerta ordenada y admisión
- `senderAccess`: solo autorización de remitente/conversación
- `routeAccess`: proyección de ruta y remitente de ruta
- `commandAccess`: autorización de comando; falso cuando no se ejecutó ninguna compuerta de comando
- `activationAccess`: resultado de mención/activación

La autorización de eventos permanece disponible en el `ingress.graph` ordenado y el `ingress.reasonCode` decisivo; no se emite ninguna proyección de evento separada.

Los auxiliares del SDK de terceros en desuso pueden reconstruir formas antiguas internamente. Las nuevas rutas de recepción integradas no deben traducir los resultados modernos nuevamente a DTOs locales.

## Grupos de acceso

Las entradas `accessGroup:<name>` permanecen redactadas. Core resuelve los grupos `message.senders` estáticos por sí mismo y llama a `resolveAccessGroupMembership` solo para los grupos dinámicos que requieren una búsqueda en la plataforma. Los grupos faltantes, no compatibles y con errores fallan cerrados.

## Modos de eventos

| `authMode`       | Significado                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| `inbound`        | compuertas de remitente entrantes normales                                        |
| `command`        | compuertas de comandos para devoluciones de llamada o botones con ámbito          |
| `origin-subject` | el actor debe coincidir con el sujeto del mensaje original                        |
| `route-only`     | compuertas de rutas solo para eventos de confianza con ámbito de ruta             |
| `none`           | los eventos internos propiedad del complemento omiten la autenticación compartida |

Use `mayPair: false` para reacciones, botones, devoluciones de llamada y comandos nativos.

## Rutas y activación

Use descriptores de ruta para la política de sala, tema, gremio, hilo o ruta anidada:

```ts
route: {
  id: "room",
  allowed: roomAllowed,
  enabled: roomEnabled,
  senderPolicy: "replace",
  senderAllowFrom: roomAllowFrom,
  blockReason: "room_sender_not_allowlisted",
}
```

Use `channelIngressRoutes(...)` cuando un complemento tiene varios descriptores de ruta opcionales; filtra las ramas deshabilitadas manteniendo los datos de ruta genéricos y ordenados por `precedence` de cada descriptor.

El filtrado de menciones es una compuerta de activación. Un fallo de mención devuelve `admission: "skip"` para que el núcleo de turno no procese un turno de solo observación. La mayoría de los canales deben dejar la activación después de las compuertas de remitente y comando. Las superficies de chat público que deben silenciar el tráfico no mencionado antes del ruido de la lista de permitidos del remitente pueden optar por `activation.order: "before-sender"` cuando la omisión de comandos de texto está deshabilitada. Los canales con activación implícita, como las respuestas en hilos de bots, pueden pasar `activation.allowedImplicitMentionKinds`; el `activationAccess.shouldBypassMention` proyectado luego informa cuándo un comando o la activación implícita omitió una mención explícita.

## Redacción

Los valores de remitente sin procesar y las entradas de lista de permitidos sin procesar son solo entrada del solucionador. No deben aparecer en el estado resuelto, decisiones, diagnósticos, instantáneas o datos de compatibilidad. Utilice ids de sujeto opacos, ids de entrada, ids de ruta e ids de diagnóstico.

## Verificación

```bash
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts
pnpm plugin-sdk:api:check
```
