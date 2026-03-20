---
summary: "Protocolo WebSocket de Gateway: handshake, tramas, versionamiento"
read_when:
  - Implementando o actualizando clientes WS del gateway
  - Depurando desajustes de protocolo o fallos de conexión
  - Regenerando esquema/modelos de protocolo
title: "Protocolo de Gateway"
---

# Protocolo de gateway (WebSocket)

El protocolo WS del Gateway es el **único plano de control + transporte de nodos** para
OpenClaw. Todos los clientes (CLI, interfaz web, aplicación macOS, nodos iOS/Android, nodos
sin cabeza) se conectan a través de WebSocket y declaran su **rol** + **alcance** en el
momento del handshake.

## Transporte

- WebSocket, tramas de texto con cargas JSON.
- La primera trama **debe** ser una solicitud `connect`.

## Handshake (conexión)

Gateway → Cliente (desafío pre-conexión):

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

## Framing (Tramas)

- **Solicitud**: `{type:"req", id, method, params}`
- **Respuesta**: `{type:"res", id, ok, payload|error}`
- **Evento**: `{type:"event", event, payload, seq?, stateVersion?}`

Los métodos con efectos secundarios requieren **claves de idempotencia** (ver esquema).

## Roles + alcances

### Roles

- `operator` = cliente del plano de control (CLI/interfaz/automatización).
- `node` = host de capacidad (cámara/pantalla/lienzo/system.run).

### Alcances (operador)

Alcances comunes:

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

El ámbito del método es solo la primera barrera. Algunos comandos de barra reached through
`chat.send` aplican comprobaciones más estrictas a nivel de comando encima. Por ejemplo, las escrituras persistentes de
`/config set` y `/config unset` requieren `operator.admin`.

### Caps/comandos/permisos (nodo)

Los nodos declaran las reclamaciones de capacidad en el momento de la conexión:

- `caps`: categorías de capacidades de alto nivel.
- `commands`: lista blanca de comandos para invocar.
- `permissions`: interruptores granulares (ej. `screen.record`, `camera.capture`).

El Gateway trata estos como **reclamaciones** y hace cumplir las listas blancas del lado del servidor.

## Presencia

- `system-presence` devuelve entradas indexadas por la identidad del dispositivo.
- Las entradas de presencia incluyen `deviceId`, `roles` y `scopes` para que las interfaces de usuario puedan mostrar una sola fila por dispositivo
  incluso cuando se conecta tanto como **operador** como **nodo**.

### Métodos auxiliares de nodo

- Los nodos pueden llamar a `skills.bins` para obtener la lista actual de ejecutables de habilidades
  para comprobaciones de permiso automático.

### Métodos auxiliares de operador

- Los operadores pueden llamar a `tools.catalog` (`operator.read`) para obtener el catálogo de herramientas en tiempo de ejecución de un
  agente. La respuesta incluye herramientas agrupadas y metadatos de procedencia:
  - `source`: `core` o `plugin`
  - `pluginId`: propietario del complemento cuando `source="plugin"`
  - `optional`: si una herramienta de complemento es opcional

## Aprobaciones de ejecución

- Cuando una solicitud de ejecución necesita aprobación, la puerta de enlace transmite `exec.approval.requested`.
- Los clientes de operador resuelven llamando a `exec.approval.resolve` (requiere el alcance `operator.approvals`).
- Para `host=node`, `exec.approval.request` debe incluir `systemRunPlan` (metadatos canónicos de `argv`/`cwd`/`rawCommand`/sesión). Las solicitudes que no incluyan `systemRunPlan` son rechazadas.

## Control de versiones

- `PROTOCOL_VERSION` reside en `src/gateway/protocol/schema.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza las discordancias.
- Los esquemas y modelos se generan a partir de las definiciones de TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Autenticación

- Si `OPENCLAW_GATEWAY_TOKEN` (o `--token`) está establecido, `connect.params.auth.token`
  debe coincidir o el socket se cierra.
- Después del emparejamiento, la puerta de enlace emite un **token de dispositivo** con alcance al rol
  de conexión + alcances. Se devuelve en `hello-ok.auth.deviceToken` y el cliente debe guardarlo
  para futuras conexiones.
- Los tokens de dispositivo se pueden rotar/revocar mediante `device.token.rotate` y
  `device.token.revoke` (requiere el ámbito `operator.pairing`).
- Los fallos de autenticación incluyen `error.details.code` más sugerencias de recuperación:
  - `error.details.canRetryWithDeviceToken` (booleano)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportamiento del cliente para `AUTH_TOKEN_MISMATCH`:
  - Los clientes de confianza pueden intentar un reintento limitado con un token por dispositivo en caché.
  - Si ese reintento falla, los clientes deben detener los bucles de reconexión automática y mostrar las guías de acción del operador.

## Identidad de dispositivo + emparejamiento

- Los nodos deben incluir una identidad de dispositivo estable (`device.id`) derivada de una
  huella digital del par de claves.
- Las puertas de enlace (gateways) emiten tokens por dispositivo + rol.
- Se requieren aprobaciones de emparejamiento para nuevos ID de dispositivo a menos que la autoaprobación
  local esté habilitada.
- Las conexiones **locales** incluyen loopback y la propia dirección de tailnet del host de la puerta de enlace
  (así, los enlaces de tailnet en el mismo host aún pueden autoaprobarse).
- Todos los clientes de WS deben incluir la identidad `device` durante `connect` (operador + nodo).
  La interfaz de control (Control UI) puede omitirla solo en estos modos:
  - `gateway.controlUi.allowInsecureAuth=true` para compatibilidad HTTP insegura solo en localhost.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass, degradación de seguridad grave).
- Todas las conexiones deben firmar el nonce `connect.challenge` proporcionado por el servidor.

### Diagnósticos de migración de autenticación de dispositivo

Para clientes heredados que aún usan el comportamiento de firma previa al desafío, `connect` ahora devuelve
códigos de detalle `DEVICE_AUTH_*` bajo `error.details.code` con un `error.details.reason` estable.

Fallos comunes de migración:

| Mensaje                     | details.code                     | details.reason           | Significado                                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | El cliente omitió `device.nonce` (o lo envió en blanco).           |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | El cliente firmó con un nonce obsoleto/incorrecto.                 |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | El payload de la firma no coincide con el payload v2.              |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | La marca de tiempo firmada está fuera de la desviación permitida.  |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` no coincide con la huella digital de la clave pública. |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Error en el formato/canonización de la clave pública.              |

Destino de la migración:

- Espere siempre a `connect.challenge`.
- Firme el payload v2 que incluye el nonce del servidor.
- Envíe el mismo nonce en `connect.params.device.nonce`.
- El payload de firma preferido es `v3`, que vincula `platform` y `deviceFamily`
  además de los campos device/client/role/scopes/token/nonce.
- Las firmas `v2` heredadas siguen siendo aceptadas por compatibilidad, pero la fijación de metadatos del dispositivo emparejado todavía controla la política de comandos al reconectar.

## TLS + fijación (pinning)

- TLS es compatible con conexiones WS.
- Los clientes pueden fijar opcionalmente la huella digital del certificado de la puerta de enlace (consulte la configuración `gateway.tls`
  más `gateway.remote.tlsFingerprint` o la CLI `--tls-fingerprint`).

## Ámbito

Este protocolo expone la **API completa de la puerta de enlace** (estado, canales, modelos, chat,
agente, sesiones, nodos, aprobaciones, etc.). La superficie exacta está definida por los
esquemas TypeBox en `src/gateway/protocol/schema.ts`.

import es from "/components/footer/es.mdx";

<es />
