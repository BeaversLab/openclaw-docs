---
summary: "Protocolo de puente histórico (nodos heredados): TCP JSONL, emparejamiento, RPC con ámbito"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Puente de protocolo"
---

<Warning>El puente TCP ha sido **eliminado**. Las compilaciones actuales de OpenClaw no incluyen el listener del puente y las claves de configuración `bridge.*` ya no están en el esquema. Esta página se conserva solo como referencia histórica. Utilice el [Gateway Protocol](/es/gateway/protocol) para todos los clientes de nodo/operador.</Warning>

## Por qué existía

- **Límite de seguridad**: el puente expone una pequeña lista de permitidos en lugar de
  toda la superficie de la API de la puerta de enlace.
- **Emparejamiento + identidad de nodo**: la admisión del nodo es propiedad de la puerta de enlace y está vinculada
  a un token por nodo.
- **UX de descubrimiento**: los nodos pueden descubrir puertas de enlace a través de Bonjour en la red local, o conectarse
  directamente a través de una red tailnet.
- **WS de bucle local**: el plano de control WS completo permanece local a menos que se tunelice a través de SSH.

## Transporte

- TCP, un objeto JSON por línea (JSONL).
- TLS opcional (cuando `bridge.tls.enabled` es verdadero).
- El puerto de escucha predeterminado histórico era `18790` (las compilaciones actuales no inician un
  puente TCP).

Cuando TLS está habilitado, los registros TXT de descubrimiento incluyen `bridgeTls=1` más
`bridgeTlsSha256` como una pista no secreta. Tenga en cuenta que los registros TXT de Bonjour/mDNS son
no autenticados; los clientes no deben tratar la huella digital anunciada como un
pin autoritario sin la intención explícita del usuario u otra verificación fuera de banda.

## Protocolo de enlace + emparejamiento

1. El cliente envía `hello` con metadatos del nodo + token (si ya está emparejado).
2. Si no está emparejado, la puerta de enlace responde `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. El cliente envía `pair-request`.
4. La puerta de enlace espera la aprobación y luego envía `pair-ok` y `hello-ok`.

Históricamente, `hello-ok` devolvía `serverName`; ahora las superficies de los complementos alojados se anuncian a través de `pluginSurfaceUrls`. Canvas/A2UI utiliza
`pluginSurfaceUrls.canvas`; el alias obsoleto `canvasHostUrl` no forma parte del
protocolo refactorizado.

## Tramas

Cliente → Puerta de enlace:

- `req` / `res`: RPC de puerta de enlace con ámbito (chat, sesiones, configuración, salud, activación por voz, skills.bins)
- `event`: señales del nodo (transcripción de voz, solicitud del agente, suscripción al chat, ciclo de vida de exec)

Puerta de enlace → Cliente:

- `invoke` / `invoke-res`: comandos del nodo (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`: actualizaciones de chat para sesiones suscritas
- `ping` / `pong`: keepalive

La aplicación heredada de la lista de permitidos (allowlist) vivía en `src/gateway/server-bridge.ts` (eliminado).

## Eventos del ciclo de vida de exec

Los nodos pueden emitir eventos `exec.finished` o `exec.denied` para exponer la actividad de system.run.
Estos se asignan a eventos del sistema en la puerta de enlace. (Los nodos heredados aún pueden emitir `exec.started`.)

Campos de carga útil (todos opcionales, a menos que se indique lo contrario):

- `sessionKey` (obligatorio): sesión del agente para recibir el evento del sistema.
- `runId`: id de exec único para agrupación.
- `command`: cadena de comando sin formato o formateada.
- `exitCode`, `timedOut`, `success`, `output`: detalles de finalización (solo finalizado).
- `reason`: motivo de denegación (solo denegado).

## Uso histórico de tailnet

- Vincular el puente a una IP de tailnet: `bridge.bind: "tailnet"` en
  `~/.openclaw/openclaw.json` (solo histórico; `bridge.*` ya no es válido).
- Los clientes se conectan a través del nombre de MagicDNS o la IP de tailnet.
- Bonjour **no** cruza redes; use host/puerto manual o DNS-SD de área amplia
  cuando sea necesario.

## Versionado

El puente era **v1 implícita** (sin negociación min/max). Esta sección es
solo de referencia histórica; los clientes de nodo/operador actuales usan el WebSocket
[Gateway Protocol](/es/gateway/protocol).

## Relacionado

- [Gateway protocol](/es/gateway/protocol)
- [Nodes](/es/nodes)
