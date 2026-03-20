---
summary: "Referencia de CLI para `openclaw devices` (emparejamiento de dispositivos + rotación/revocación de token)"
read_when:
  - Estás aprobando solicitudes de emparejamiento de dispositivos
  - Necesitas rotar o revocar tokens de dispositivo
title: "devices"
---

# `openclaw devices`

Administra las solicitudes de emparejamiento de dispositivos y los tokens con ámbito de dispositivo.

## Comandos

### `openclaw devices list`

Enumera las solicitudes de emparejamiento pendientes y los dispositivos emparejados.

```
openclaw devices list
openclaw devices list --json
```

### `openclaw devices remove <deviceId>`

Elimina una entrada de dispositivo emparejado.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Borra dispositivos emparejados en masa.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

Aprueba una solicitud de emparejamiento de dispositivo pendiente. Si se omite `requestId`, OpenClaw
aprueba automáticamente la solicitud pendiente más reciente.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

Rechaza una solicitud de emparejamiento de dispositivo pendiente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Rota un token de dispositivo para un rol específico (opcionalmente actualizando los alcances).

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

Revoca un token de dispositivo para un rol específico.

```
openclaw devices revoke --device <deviceId> --role node
```

## Opciones comunes

- `--url <url>`: URL de WebSocket de la puerta de enlace (por defecto es `gateway.remote.url` cuando está configurado).
- `--token <token>`: Token de la puerta de enlace (si es necesario).
- `--password <password>`: Contraseña de la puerta de enlace (autenticación por contraseña).
- `--timeout <ms>`: Tiempo de espera de RPC.
- `--json`: Salida JSON (recomendado para scripts).

Nota: cuando configuras `--url`, la CLI no recurre a las credenciales de configuración o del entorno.
Pasa `--token` o `--password` explícitamente. Faltar credenciales explícitas es un error.

## Notas

- La rotación de tokens devuelve un nuevo token (sensible). Trátalo como un secreto.
- Estos comandos requieren el alcance `operator.pairing` (o `operator.admin`).
- `devices clear` está limitado intencionalmente por `--yes`.
- Si el alcance de emparejamiento no está disponible en el bucle local (y no se pasa `--url` explícito), listar/aprobar puede usar una alternativa de emparejamiento local.

## Lista de verificación de recuperación de desviación de token

Usa esto cuando la interfaz de usuario de Control u otros clientes sigan fallando con `AUTH_TOKEN_MISMATCH` o `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirmar el origen actual del token de la puerta de enlace:

```bash
openclaw config get gateway.auth.token
```

2. Listar los dispositivos emparejados e identificar el id del dispositivo afectado:

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

- [Solución de problemas de autenticación del Panel](/es/web/dashboard#if-you-see-unauthorized-1008)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)

import en from "/components/footer/en.mdx";

<en />
