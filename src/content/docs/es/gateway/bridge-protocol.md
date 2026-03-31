---
summary: "Protocolo de puente (nodos heredados): TCP JSONL, emparejamiento, RPC con ámbito"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Protocolo de puente"
---

# Protocolo de puente (transporte de nodo heredado)

El protocolo de puente es un transporte de nodo **heredado** (TCP JSONL). Los nuevos clientes de nodo
deben usar en su lugar el protocolo WebSocket de Gateway unificado.

Si está creando un operador o un cliente de nodo, use el
[protocolo de Gateway](/en/gateway/protocol).

**Nota:** Las compilaciones actuales de OpenClaw ya no incluyen el oyente del puente TCP; este documento se conserva como referencia histórica.
Las claves de configuración heredadas de `bridge.*` ya no forman parte del esquema de configuración.

## Por qué tenemos ambos

- **Límite de seguridad**: el puente expone una lista de permitidos pequeña en lugar de la
  superficie completa de la API del gateway.
- **Emparejamiento + identidad del nodo**: la admisión del nodo es propiedad del gateway y está vinculada
  a un token por nodo.
- **Experiencia de usuario (UX) de descubrimiento**: los nodos pueden descubrir gateways a través de Bonjour en la LAN, o conectarse
  directamente a través de una tailnet.
- **WS de bucle local (loopback)**: el plano de control WS completo permanece local a menos que se tunnel a través de SSH.

## Transporte

- TCP, un objeto JSON por línea (JSONL).
- TLS opcional (cuando `bridge.tls.enabled` es verdadero).
- El puerto de escucha predeterminado heredado era `18790` (las compilaciones actuales no inician un puente TCP).

Cuando TLS está habilitado, los registros TXT de descubrimiento incluyen `bridgeTls=1` más
`bridgeTlsSha256` como una pista no secreta. Tenga en cuenta que los registros TXT de Bonjour/mDNS son
no autenticados; los clientes no deben tratar la huella digital anunciada como un
pin autoritario sin una intención explícita del usuario u otra verificación fuera de banda.

## Protocolo de enlace (handshake) + emparejamiento

1. El cliente envía `hello` con metadatos del nodo + token (si ya está emparejado).
2. Si no está emparejado, el gateway responde `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. El cliente envía `pair-request`.
4. El gateway espera la aprobación y luego envía `pair-ok` y `hello-ok`.

`hello-ok` devuelve `serverName` y puede incluir `canvasHostUrl`.

## Tramas

Cliente → Gateway:

- `req` / `res`: RPC de puerta de enlace con ámbito (chat, sesiones, configuración, estado, voicewake, skills.bins)
- `event`: señales de nodo (transcripción de voz, solicitud de agente, suscripción al chat, ciclo de vida de exec)

Puerta de enlace → Cliente:

- `invoke` / `invoke-res`: comandos de nodo (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`: actualizaciones de chat para sesiones suscritas
- `ping` / `pong`: keepalive

La aplicación heredada de lista de permitidos (allowlist) vivía en `src/gateway/server-bridge.ts` (eliminado).

## Eventos del ciclo de vida de exec

Los nodos pueden emitir eventos `exec.finished` o `exec.denied` para exponer la actividad de system.run.
Estos se asignan a eventos del sistema en la puerta de enlace. (Los nodos heredados aún pueden emitir `exec.started`.)

Campos de carga útil (todos opcionales, a menos que se indique lo contrario):

- `sessionKey` (obligatorio): sesión del agente para recibir el evento del sistema.
- `runId`: id de exec único para agrupación.
- `command`: cadena de comando sin formato o con formato.
- `exitCode`, `timedOut`, `success`, `output`: detalles de finalización (solo finalizado).
- `reason`: motivo de denegación (solo denegado).

## Uso de Tailnet

- Enlace del puente a una IP de tailnet: `bridge.bind: "tailnet"` en
  `~/.openclaw/openclaw.json`.
- Los clientes se conectan mediante el nombre de MagicDNS o la IP de tailnet.
- Bonjour **no** cruza redes; use el host/puerto manual o DNS‑SD de área amplia
  cuando sea necesario.

## Versionado

El puente está actualmente en **versión implícita v1** (sin negociación mín/máx). Se espera compatibilidad hacia atrás;
agregue un campo de versión del protocolo de puente antes de cualquier cambio ruptura.
