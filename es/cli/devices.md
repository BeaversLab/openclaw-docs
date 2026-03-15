---
summary: "Referencia de CLI para `openclaw devices` (emparejamiento de dispositivos + rotación/revocación de tokens)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "dispositivos"
---

# `openclaw devices`

Administre las solicitudes de emparejamiento de dispositivos y los tokens con alcance de dispositivo.

## Comandos

### `openclaw devices list`

Enumere las solicitudes de emparejamiento pendientes y los dispositivos emparejados.

```
openclaw devices list
openclaw devices list --json
```

### `openclaw devices remove <deviceId>`

Elimine una entrada de dispositivo emparejado.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Limpiar dispositivos emparejados en masa.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

Aprobar una solicitud de emparejamiento de dispositivo pendiente. Si se omite `requestId`, OpenClaw
aprueba automáticamente la solicitud pendiente más reciente.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

Rechazar una solicitud de emparejamiento de dispositivo pendiente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Rote un token de dispositivo para un rol específico (opcionalmente actualizando los alcances).

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

Revocar un token de dispositivo para un rol específico.

```
openclaw devices revoke --device <deviceId> --role node
```

## Opciones comunes

- `--url <url>`: URL de WebSocket de Gateway (el valor predeterminado es `gateway.remote.url` cuando está configurado).
- `--token <token>`: Token de puerta de enlace (si es necesario).
- `--password <password>`: Contraseña de puerta de enlace (autenticación por contraseña).
- `--timeout <ms>`: Tiempo de espera de RPC.
- `--json`: Salida JSON (recomendado para secuencias de comandos).

Nota: cuando establece `--url`, la CLI no recurre a credenciales de configuración o de entorno.
Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

## Notas

- La rotación de tokens devuelve un nuevo token (confidencial). Trátelo como un secreto.
- Estos comandos requieren el alcance `operator.pairing` (o `operator.admin`).
- `devices clear` está intencionalmente limitado por `--yes`.
- Si el alcance de emparejamiento no está disponible en el bucle invertido local (y no se pasa ningún `--url` explícito), la lista/aprobación puede usar una reserva de emparejamiento local.

## Lista de verificación de recuperación de deriva de tokens

Use esto cuando la interfaz de usuario de control u otros clientes siguen fallando con `AUTH_TOKEN_MISMATCH` o `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirmar el origen actual del token de la puerta de enlace:

```bash
openclaw config get gateway.auth.token
```

2. Listar los dispositivos emparejados e identificar el ID del dispositivo afectado:

```bash
openclaw devices list
```

3. Rotar el token de operador para el dispositivo afectado:

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotación no es suficiente, eliminar el emparejamiento obsoleto y aprobar de nuevo:

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Reintentar la conexión del cliente con el token/contraseña compartido actual.

Relacionado:

- [Solución de problemas de autenticación del Dashboard](/es/web/dashboard#if-you-see-unauthorized-1008)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)

import es from "/components/footer/es.mdx";

<es />
