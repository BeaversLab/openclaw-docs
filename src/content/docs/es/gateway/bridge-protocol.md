---
summary: "Protocolo de puente (nodos heredados): TCP JSONL, emparejamiento, RPC con ámbito"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Protocolo de puente"
---

# Protocolo de puente (transporte de nodo heredado)

<Warning>El puente TCP ha sido **eliminado**. Las compilaciones actuales de OpenClaw no incluyen el escucha del puente y las claves de configuración `bridge.*` ya no están en el esquema. Esta página se conserva solo como referencia histórica. Utilice el [Gateway Protocol](/en/gateway/protocol) para todos los clientes de nodo/operador.</Warning>

## Por qué tenemos ambos

- **Límite de seguridad**: el puente expone una pequeña lista de permitidos en lugar de
  la superficie completa de la API de la puerta de enlace.
- **Emparejamiento + identidad de nodo**: la admisión de nodos es propiedad de la puerta de enlace y está vinculada
  a un token por nodo.
- **Experiencia de usuario (UX) de descubrimiento**: los nodos pueden descubrir puertas de enlace a través de Bonjour en la LAN, o conectarse
  directamente a través de una tailnet.
- **WS de bucle local (loopback)**: el plano de control WS completo permanece local a menos que se tunelice a través de SSH.

## Transporte

- TCP, un objeto JSON por línea (JSONL).
- TLS opcional (cuando `bridge.tls.enabled` es verdadero).
- El puerto de escucha predeterminado heredado era `18790` (las compilaciones actuales no inician un puente TCP).

Cuando TLS está habilitado, los registros TXT de descubrimiento incluyen `bridgeTls=1` más
`bridgeTlsSha256` como una pista no secreta. Tenga en cuenta que los registros TXT de Bonjour/mDNS son
no autenticados; los clientes no deben tratar la huella digital anunciada como un
pin autoritativo sin la intención explícita del usuario u otra verificación fuera de banda.

## Protocolo de enlace (Handshake) + emparejamiento

1. El cliente envía `hello` con metadatos del nodo + token (si ya está emparejado).
2. Si no está emparejado, la puerta de enlace responde `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. El cliente envía `pair-request`.
4. La puerta de enlace espera la aprobación y luego envía `pair-ok` y `hello-ok`.

`hello-ok` devuelve `serverName` y puede incluir `canvasHostUrl`.

## Tramas

Cliente → Puerta de enlace:

- `req` / `res`: RPC con ámbito de puerta de enlace (chat, sesiones, configuración, salud, voicewake, skills.bins)
- `event`: señales de nodo (transcripción de voz, solicitud de agente, suscripción de chat, ciclo de vida de exec)

Puerta de enlace → Cliente:

- `invoke` / `invoke-res`: comandos de nodo (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`: actualizaciones de chat para sesiones suscritas
- `ping` / `pong`: keepalive

El cumplimiento de la lista de permitidos (allowlist) heredado vivía en `src/gateway/server-bridge.ts` (eliminado).

## Eventos del ciclo de vida de ejecución

Los nodos pueden emitir eventos `exec.finished` o `exec.denied` para exponer la actividad de system.run.
Estos se asignan a eventos del sistema en la puerta de enlace. (Los nodos heredados aún pueden emitir `exec.started`.)

Campos de carga útil (todos son opcionales a menos que se indique lo contrario):

- `sessionKey` (obligatorio): sesión del agente para recibir el evento del sistema.
- `runId`: id de ejecución único para agrupar.
- `command`: cadena de comando sin formato o con formato.
- `exitCode`, `timedOut`, `success`, `output`: detalles de finalización (solo finalizado).
- `reason`: motivo de denegación (solo denegado).

## Uso de Tailnet

- Enlace del puente a una IP de tailnet: `bridge.bind: "tailnet"` en
  `~/.openclaw/openclaw.json`.
- Los clientes se conectan a través del nombre MagicDNS o la IP de tailnet.
- Bonjour **no** cruza redes; use host/puerto manual o DNS‑SD de área amplia
  cuando sea necesario.

## Control de versiones

Bridge actualmente está en la **v1 implícita** (sin negociación mín/máx). Se espera compatibilidad
con versiones anteriores; agregue un campo de versión de protocolo de puente antes de cualquier cambio ruptura.
