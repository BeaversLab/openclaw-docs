---
summary: "Protocolo WebSocket de Gateway: handshake, tramas, versionado"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocolo de Gateway"
---

# Protocolo de Gateway (WebSocket)

El protocolo WS de Gateway es el **único plano de control + transporte de nodos** para
OpenClaw. Todos los clientes (CLI, interfaz web, aplicación macOS, nodos iOS/Android, nodos
sin cabeza) se conectan a través de WebSocket y declaran su **rol** + **alcance** en el
momento del handshake.

## Transporte

- WebSocket, tramas de texto con payloads JSON.
- La primera trama **debe** ser una solicitud `connect`.

## Handshake (conexión)

Gateway → Cliente (desafío previo a la conexión):

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Cliente → Gateway:

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway → Cliente:

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

Cuando se emite un token de dispositivo, `hello-ok` también incluye:

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### Ejemplo de nodo

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## Tramas

- **Solicitud**: `{type:"req", id, method, params}`
- **Respuesta**: `{type:"res", id, ok, payload|error}`
- **Evento**: `{type:"event", event, payload, seq?, stateVersion?}`

Los métodos con efectos secundarios requieren **claves de idempotencia** (ver esquema).

## Roles + alcances

### Roles

- `operator` = cliente del plano de control (CLI/interfaz/automatización).
- `node` = host de capacidades (cámara/pantalla/lienzo/system.run).

### Alcances (operador)

Alcances comunes:

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

El alcance del método es solo la primera puerta. Algunos comandos de barra alcanzados a través de
`chat.send` aplican verificaciones más estrictas a nivel de comando encima. Por ejemplo, las escrituras persistentes de
`/config set` y `/config unset` requieren `operator.admin`.

### Caps/comandos/permisos (nodo)

Los nodos declaran reclamaciones de capacidad en el momento de la conexión:

- `caps`: categorías de capacidades de alto nivel.
- `commands`: lista de permitidos (allowlist) de comandos para invocar.
- `permissions`: interruptores granulares (ej. `screen.record`, `camera.capture`).

El Gateway trata estos como **reclamaciones** y hace cumplir las listas de permitidos del lado del servidor.

## Presencia

- `system-presence` devuelve entradas claveadas por la identidad del dispositivo.
- Las entradas de presencia incluyen `deviceId`, `roles` y `scopes` para que las interfaces de usuario puedan mostrar una sola fila por dispositivo
  incluso cuando se conecta tanto como **operador** como **nodo**.

### Métodos auxiliares de nodo

- Los nodos pueden llamar a `skills.bins` para obtener la lista actual de ejecutables de habilidades
  para las comprobaciones de permiso automático.

### Métodos auxiliares de operador

- Los operadores pueden llamar a `tools.catalog` (`operator.read`) para obtener el catálogo de herramientas en tiempo de ejecución de un
  agente. La respuesta incluye herramientas agrupadas y metadatos de procedencia:
  - `source`: `core` o `plugin`
  - `pluginId`: propietario del complemento cuando `source="plugin"`
  - `optional`: si una herramienta de complemento es opcional
- Los operadores pueden llamar a `tools.effective` (`operator.read`) para obtener el inventario de herramientas efectivo en tiempo de ejecución para una sesión.
  - Se requiere `sessionKey`.
  - El gateway deriva el contexto de tiempo de ejecución confiable de la sesión del lado del servidor en lugar de aceptar el contexto de autenticación o entrega proporcionado por el llamador.
  - La respuesta está limitada a la sesión y refleja lo que la conversación activa puede usar ahora mismo, incluyendo herramientas principales, de complementos y de canal.

## Aprobaciones de ejecución

- Cuando una solicitud de ejecución necesita aprobación, el gateway transmite `exec.approval.requested`.
- Los clientes del operador resuelven llamando a `exec.approval.resolve` (requiere el alcance `operator.approvals`).
- Para `host=node`, `exec.approval.request` debe incluir `systemRunPlan` (metadatos canónicos de `argv`/`cwd`/`rawCommand`/session). Las solicitudes que carecen de `systemRunPlan` son rechazadas.

## Respaldo de entrega de agente

- Las solicitudes `agent` pueden incluir `deliver=true` para solicitar la entrega saliente.
- `bestEffortDeliver=false` mantiene un comportamiento estricto: los objetivos de entrega no resueltos o solo internos devuelven `INVALID_REQUEST`.
- `bestEffortDeliver=true` permite el respaldo a la ejecución solo de sesión cuando no se puede resolver ninguna ruta de entrega externa (por ejemplo, sesiones internas/webchat o configuraciones multicanales ambiguas).

## Versionado

- `PROTOCOL_VERSION` reside en `src/gateway/protocol/schema.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza las discordancias.
- Los esquemas y modelos se generan a partir de definiciones TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Autenticación

- Si se establece `OPENCLAW_GATEWAY_TOKEN` (o `--token`), `connect.params.auth.token`
  debe coincidir o se cerrará el socket.
- Después del emparejamiento, el Gateway emite un **token de dispositivo** con ámbito al rol + alcances de la
  conexión. Se devuelve en `hello-ok.auth.deviceToken` y debe ser
  persistido por el cliente para futuras conexiones.
- Los tokens de dispositivo se pueden rotar/revocar a través de `device.token.rotate` y
  `device.token.revoke` (requiere el alcance `operator.pairing`).
- Los fallos de autenticación incluyen `error.details.code` más sugerencias de recuperación:
  - `error.details.canRetryWithDeviceToken` (booleano)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportamiento del cliente para `AUTH_TOKEN_MISMATCH`:
  - Los clientes de confianza pueden intentar un reintento limitado con un token en caché por dispositivo.
  - Si ese reintento falla, los clientes deben detener los bucles de reconexión automática y mostrar la guía de acción del operador.

## Identidad del dispositivo + emparejamiento

- Los nodos deben incluir una identidad de dispositivo estable (`device.id`) derivada de una
  huella digital de un par de claves.
- Los Gateways emiten tokens por dispositivo + rol.
- Se requieren aprobaciones de emparejamiento para nuevos ID de dispositivo a menos que la autoaprobación
  local esté habilitada.
- Las conexiones **locales** incluyen el bucle invertido y la propia dirección de tailnet del host de la puerta de enlace
  (por lo que los enlaces de tailnet en el mismo host aún pueden autoaprobarse).
- Todos los clientes WS deben incluir la identidad `device` durante el `connect` (operador + nodo).
  La interfaz de control puede omitirla solo en estos modos:
  - `gateway.controlUi.allowInsecureAuth=true` para compatibilidad HTTP insegura solo para localhost.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (romper-cristal, degradación de seguridad grave).
- Todas las conexiones deben firmar el nonce `connect.challenge` proporcionado por el servidor.

### Diagnósticos de migración de autenticación de dispositivos

Para clientes heredados que aún utilizan el comportamiento de firma previa al desafío, `connect` ahora devuelve
códigos de detalle `DEVICE_AUTH_*` bajo `error.details.code` con un `error.details.reason` estable.

Fallos comunes de migración:

| Mensaje                     | details.code                     | details.reason           | Significado                                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | El cliente omitió `device.nonce` (o lo envió en blanco).           |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | El cliente firmó con un nonce obsoleto/incorrecto.                 |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | El payload de la firma no coincide con el payload v2.              |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | La marca de tiempo firmada está fuera de la desviación permitida.  |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` no coincide con la huella digital de la clave pública. |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Falló el formato/canonicalización de la clave pública.             |

Objetivo de migración:

- Espere siempre `connect.challenge`.
- Firme el payload v2 que incluye el nonce del servidor.
- Envíe el mismo nonce en `connect.params.device.nonce`.
- La carga útil de firma preferida es `v3`, que vincula `platform` y `deviceFamily`
  además de los campos device/client/role/scopes/token/nonce.
- Las firmas `v2` heredadas siguen siendo aceptadas por compatibilidad, pero la fijación de metadatos del dispositivo emparejado todavía controla la política de comandos al reconectar.

## TLS + fijación

- TLS es compatible para las conexiones WS.
- Los clientes pueden fijar opcionalmente la huella digital del certificado de la puerta de enlace (ver configuración `gateway.tls`
  más `gateway.remote.tlsFingerprint` o CLI `--tls-fingerprint`).

## Ámbito

Este protocolo expone la **API de puerta de enlace completa** (estado, canales, modelos, chat,
agente, sesiones, nodos, aprobaciones, etc.). La superficie exacta se define por los
esquemas TypeBox en `src/gateway/protocol/schema.ts`.
