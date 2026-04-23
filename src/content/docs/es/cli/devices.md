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

El resultado de la solicitud pendiente muestra el acceso solicitado junto al acceso aprobado actual del dispositivo cuando este ya está emparejado. Esto hace que las actualizaciones de ámbito/rol sean explícitas en lugar de parecer que se ha perdido el emparejamiento.

### `openclaw devices remove <deviceId>`

Eliminar una entrada de dispositivo emparejado.

Cuando está autenticado con un token de dispositivo emparejado, los autores de la llamada que no son administradores pueden
eliminar solo la entrada de dispositivo **propia**. Eliminar cualquier otro dispositivo requiere
`operator.admin`.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Borrar dispositivos emparejados en masa.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

Apruebe una solicitud de emparejamiento de dispositivo pendiente mediante exact `requestId`. Si `requestId`
se omite o se pasa `--latest`, OpenClaw solo imprime la solicitud pendiente
seleccionada y sale; vuelva a ejecutar la aprobación con el ID exacto de la solicitud después de verificar
los detalles.

Nota: si un dispositivo reintenta el emparejamiento con detalles de autenticación cambiados (rol/alcances/clave
pública), OpenClaw reemplaza la entrada pendiente anterior y emite un nuevo
`requestId`. Ejecute `openclaw devices list` justo antes de la aprobación para usar el
ID actual.

Si el dispositivo ya está emparejado y solicita ámbitos más amplios o un rol más amplio, OpenClaw mantiene la aprobación existente y crea una nueva solicitud de actualización pendiente. Revise las columnas `Requested` vs `Approved` en `openclaw devices list` o use `openclaw devices approve --latest` para previsualizar la actualización exacta antes de aprobarla.

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

Rotar un token de dispositivo para un rol específico (opcionalmente actualizando los ámbitos). El rol de destino ya debe existir en el contrato de emparejamiento aprobado de ese dispositivo; la rotación no puede crear un nuevo rol no aprobado. Si omite `--scope`, las reconexiones posteriores con el token rotado almacenado reutilizan los ámbitos aprobados en caché de ese token. Si pasa valores explícitos de `--scope`, esos se convierten en el conjunto de ámbitos almacenado para futuras reconexiones con token en caché. Los llamadores de dispositivos emparejados que no son administradores solo pueden rotar su **propio** token de dispositivo. Además, cualquier valor explícito de `--scope` debe mantenerse dentro de los ámbitos de operador propios de la sesión del llamante; la rotación no puede crear un token de operador más amplio del que el llamante ya tiene.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Devuelve la nueva carga útil del token como JSON.

### `openclaw devices revoke --device <id> --role <role>`

Revocar un token de dispositivo para un rol específico.

Los llamadores de dispositivos emparejados que no son administradores solo pueden revocar su **propio** token de dispositivo. Revocar el token de algún otro dispositivo requiere `operator.admin`.

```
openclaw devices revoke --device <deviceId> --role node
```

Devuelve el resultado de la revocación como JSON.

## Opciones comunes

- `--url <url>`: URL del WebSocket de puerta de enlace (por defecto es `gateway.remote.url` cuando está configurado).
- `--token <token>`: Token de puerta de enlace (si se requiere).
- `--password <password>`: Contraseña de puerta de enlace (autenticación por contraseña).
- `--timeout <ms>`: Tiempo de espera de RPC.
- `--json`: Salida JSON (recomendado para scripting).

Nota: cuando se establece `--url`, la CLI no recurre a las credenciales de configuración o de entorno.
Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

## Notas

- La rotación de tokens devuelve un nuevo token (sensible). Trátelo como un secreto.
- Estos comandos requieren el alcance `operator.pairing` (o `operator.admin`).
- La rotación de tokens se mantiene dentro del conjunto de roles de emparejamiento aprobados y de la línea base de alcance aprobado para ese dispositivo. Una entrada de token en caché huérfana no otorga un nuevo objetivo de rotación.
- Para las sesiones de token de dispositivo emparejado, la administración entre dispositivos es solo para administradores:
  `remove`, `rotate` y `revoke` son exclusivos para uno mismo a menos que la persona que llama tenga
  `operator.admin`.
- `devices clear` está intencionalmente limitado por `--yes`.
- Si el alcance de emparejamiento no está disponible en el bucle invertido local (y no se pasa ningún `--url` explícito), lista/aprobar puede usar una alternativa de emparejamiento local.
- `devices approve` requiere un ID de solicitud explícito antes de acuñar tokens; omitir `requestId` o pasar `--latest` solo previsualiza la solicitud pendiente más reciente.

## Lista de verificación de recuperación de desviación de token

Use esto cuando Control UI u otros clientes sigan fallando con `AUTH_TOKEN_MISMATCH` o `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirme la fuente actual del token de puerta de enlace:

```bash
openclaw config get gateway.auth.token
```

2. Enumere los dispositivos emparejados e identifique el id del dispositivo afectado:

```bash
openclaw devices list
```

3. Rote el token del operador para el dispositivo afectado:

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotación no es suficiente, elimine el emparejamiento obsoleto y apruebe nuevamente:

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Reintente la conexión del cliente con el token/contraseña compartido actual.

Notas:

- La precedencia de autenticación de reconexión normal es primero token/contraseña compartido explícito, luego `deviceToken` explícito, luego token de dispositivo almacenado, luego token de arranque.
- La recuperación de `AUTH_TOKEN_MISMATCH` de confianza puede enviar temporalmente tanto el token compartido como el token de dispositivo almacenado juntos para el único reintento limitado.

Relacionado:

- [Solución de problemas de autenticación del panel de control](/es/web/dashboard#if-you-see-unauthorized-1008)
- [Solución de problemas de puerta de enlace](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)
