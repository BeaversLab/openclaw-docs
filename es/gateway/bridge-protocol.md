---
summary: "Bridge protocol (legacy nodes): TCP JSONL, pairing, scoped RPC"
read_when:
  - Crear o depurar clientes de nodo (modo de nodo iOS/Android/macOS)
  - Investigar fallos de emparejamiento o autenticación del puente
  - Auditar la superficie de nodo expuesta por la puerta de enlace
title: "Bridge Protocol"
---

# Bridge protocol (legacy node transport)

El protocolo Bridge es un transporte de nodo **heredado** (TCP JSONL). Los nuevos clientes de nodo
deben usar el protocolo WebSocket de Gateway unificado en su lugar.

Si está creando un operador o un cliente de nodo, use el
[Gateway protocol](/es/gateway/protocol).

**Nota:** Las compilaciones actuales de OpenClaw ya no incluyen el oyente del puente TCP; este documento se mantiene por motivos históricos.
Las claves de configuración `bridge.*` heredadas ya no forman parte del esquema de configuración.

## Por qué tenemos ambos

- **Límite de seguridad**: el puente expone una pequeña lista de permitidos en lugar de la
  superficie completa de la API de la puerta de enlace.
- **Emparejamiento + identidad de nodo**: la admisión del nodo es propiedad de la puerta de enlace y está vinculada
  a un token por nodo.
- **UX de descubrimiento**: los nodos pueden descubrir puertas de enlace a través de Bonjour en la LAN, o conectarse
  directamente a través de una tailnet.
- **WS de bucle de retorno**: el plano de control WS completo permanece local a menos que se acceda a través de un túnel SSH.

## Transporte

- TCP, un objeto JSON por línea (JSONL).
- TLS opcional (cuando `bridge.tls.enabled` es verdadero).
- El puerto de escucha predeterminado heredado era `18790` (las compilaciones actuales no inician un puente TCP).

Cuando TLS está habilitado, los registros TXT de descubrimiento incluyen `bridgeTls=1` más
`bridgeTlsSha256` como una sugerencia no secreta. Tenga en cuenta que los registros TXT de Bonjour/mDNS son
no autenticados; los clientes no deben tratar la huella digital anunciada como un
pin autoritario sin la intención explícita del usuario u otra verificación fuera de banda.

## Protocolo de enlace + emparejamiento

1. El cliente envía `hello` con metadatos del nodo + token (si ya está emparejado).
2. Si no está emparejado, la puerta de enlace responde `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. El cliente envía `pair-request`.
4. La puerta de enlace espera la aprobación y luego envía `pair-ok` y `hello-ok`.

`hello-ok` devuelve `serverName` y puede incluir `canvasHostUrl`.

## Marcos

Cliente → Puerta de enlace:

- `req` / `res`: RPC de puerta de enlace con ámbito (chat, sesiones, configuración, estado de salud, activación por voz, skills.bins)
- `event`: señales del nodo (transcripción de voz, solicitud de agente, suscripción al chat, ciclo de vida de exec)

Puerta de enlace → Cliente:

- `invoke` / `invoke-res`: comandos del nodo (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`: actualizaciones de chat para sesiones suscritas
- `ping` / `pong`: keepalive

La aplicación heredada de la lista de permitidos (allowlist) vivía en `src/gateway/server-bridge.ts` (eliminado).

## Eventos del ciclo de vida de exec

Los nodos pueden emitir eventos `exec.finished` o `exec.denied` para exponer la actividad de system.run.
Estos se asignan a eventos del sistema en la puerta de enlace. (Los nodos heredados aún pueden emitir `exec.started`.)

Campos del payload (todos son opcionales a menos que se indique lo contrario):

- `sessionKey` (requerido): sesión del agente para recibir el evento del sistema.
- `runId`: ID de exec único para agrupación.
- `command`: cadena de comando sin formato o con formato.
- `exitCode`, `timedOut`, `success`, `output`: detalles de finalización (solo finalizado).
- `reason`: motivo de la denegación (solo denegado).

## Uso de Tailnet

- Enlace del puente a una IP de tailnet: `bridge.bind: "tailnet"` en
  `~/.openclaw/openclaw.json`.
- Los clientes se conectan a través del nombre de MagicDNS o la IP de tailnet.
- Bonjour **no** cruza redes; use host/puerto manual o DNS‑SD de área amplia
  cuando sea necesario.

## Versionado

El puente está actualmente en la **v1 implícita** (sin negociación mín/máx). Se espera compatibilidad hacia atrás;
agregue un campo de versión del protocolo de puente antes de cualquier cambio importante.

import es from "/components/footer/es.mdx";

<es />
