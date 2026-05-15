---
summary: "Referencia de CLI para `openclaw devices` (emparejamiento de dispositivos + rotación/revocación de tokens)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "Dispositivos"
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

<Note>Si un dispositivo reintentar el emparejamiento con detalles de autenticación cambiados (rol, alcances o clave pública), OpenClaw reemplaza la entrada pendiente anterior y emite un nuevo `requestId`. Ejecute `openclaw devices list` justo antes de la aprobación para usar el ID actual.</Note>

Si el dispositivo ya está emparejado y solicita ámbitos más amplios o un rol más amplio, OpenClaw mantiene la aprobación existente y crea una nueva solicitud de actualización pendiente. Revise las columnas `Requested` vs `Approved` en `openclaw devices list` o use `openclaw devices approve --latest` para previsualizar la actualización exacta antes de aprobarla.

Si la Gateway está explícitamente configurada con
`gateway.nodes.pairing.autoApproveCidrs`, las solicitudes de primer `role: node` de
IPs de cliente coincidentes pueden aprobarse antes de que aparezcan en esta lista. Esa política
está deshabilitada por defecto y nunca se aplica a clientes operador/navegador o solicitudes de
actualización.

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

Rotar un token de dispositivo para un rol específico (opcionalmente actualizando los alcances).
El rol de destino ya debe existir en el contrato de emparejamiento aprobado de ese dispositivo;
la rotación no puede crear un nuevo rol no aprobado.
Si omite `--scope`, las reconexiones posteriores con el token rotado almacenado reutilizan esos
alcances aprobados en caché del token. Si pasa valores explícitos de `--scope`, esos
se convierten en el conjunto de alcances almacenado para futuras reconexiones con token en caché.
Los llamadores de dispositivos emparejados que no sean administradores solo pueden rotar su **propio** token de dispositivo.
El conjunto de alcances del token de destino debe permanecer dentro de los alcances de operador
propios de la sesión del llamador; la rotación no puede crear ni conservar un token de operador más amplio del que
el llamador ya tiene.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Devuelve los metadatos de rotación como JSON. Si el llamador está rotando su propio token mientras
está autenticado con ese token de dispositivo, la respuesta también incluye el token de
reemplazo para que el cliente pueda persistirlo antes de reconectarse. Las rotaciones compartidas/de administrador
no repiten el token de portador.

### `openclaw devices revoke --device <id> --role <role>`

Revocar un token de dispositivo para un rol específico.

Los llamadores de dispositivos emparejados que no sean administradores solo pueden revocar su **propio** token de dispositivo.
Revocar el token de algún otro dispositivo requiere `operator.admin`.
El conjunto de alcances del token de destino también debe ajustarse a los alcances de operador
propios de la sesión del llamador; los llamadores solo de emparejamiento no pueden revocar tokens de operador de administrador/escritura.

```
openclaw devices revoke --device <deviceId> --role node
```

Devuelve el resultado de la revocación como JSON.

## Opciones comunes

- `--url <url>`: URL de WebSocket de la puerta de enlace (predeterminado a `gateway.remote.url` cuando está configurado).
- `--token <token>`: Token de la puerta de enlace (si es necesario).
- `--password <password>`: Contraseña de la puerta de enlace (autenticación por contraseña).
- `--timeout <ms>`: Tiempo de espera de RPC.
- `--json`: Salida JSON (recomendado para scripts).

<Warning>Cuando establece `--url`, la CLI no recurre a las credenciales de configuración o del entorno. Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.</Warning>

## Notas

- La rotación de tokens devuelve un nuevo token (sensible). Trátelo como un secreto.
- Estos comandos requieren el alcance `operator.pairing` (o `operator.admin`). Algunas aprobaciones también requieren que el solicitante posea los alcances del operador que el dispositivo de destino acuñaría o heredaría; consulte [Operator scopes](/es/gateway/operator-scopes).
- `gateway.nodes.pairing.autoApproveCidrs` es una política opcional de la puerta de enlace para
  el emparejamiento de dispositivos de nodo nuevos únicamente; no cambia la autoridad de aprobación de la CLI.
- La rotación y revocación de tokens se mantienen dentro del conjunto de roles de emparejamiento aprobados y la línea de base de ámbito aprobado para ese dispositivo. Una entrada de token en caché extraviada no
  concede un objetivo de gestión de tokens.
- Para las sesiones de token de dispositivos emparejados, la gestión entre dispositivos es solo para administradores:
  `remove`, `rotate` y `revoke` son exclusivos del propio usuario a menos que la persona que llama tenga
  `operator.admin`.
- La mutación de tokens también está contenida en el ámbito de la persona que llama: una sesión de solo emparejamiento no puede
  rotar ni revocar un token que actualmente lleva `operator.admin` o
  `operator.write`.
- `devices clear` está intencionalmente limitado por `--yes`.
- Si el ámbito de emparejamiento no está disponible en el bucle local (y no se pasa un `--url` explícito), listar/aprobar puede usar una reserva de emparejamiento local.
- `devices approve` requiere un ID de solicitud explícito antes de acuñar tokens; omitir `requestId` o pasar `--latest` solo previsualiza la solicitud pendiente más reciente.

## Lista de verificación para la recuperación de deriva de token

Use esto cuando la interfaz de usuario de Control u otros clientes sigan fallando con `AUTH_TOKEN_MISMATCH` o `AUTH_DEVICE_TOKEN_MISMATCH`.

1. Confirme la fuente actual del token de la puerta de enlace:

```bash
openclaw config get gateway.auth.token
```

2. Enumere los dispositivos emparejados e identifique el id del dispositivo afectado:

```bash
openclaw devices list
```

3. Rote el token de operador para el dispositivo afectado:

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotación no es suficiente, elimine el emparejamiento obsoleto y apruébelo de nuevo:

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Reintente la conexión del cliente con el token/contraseña compartido actual.

Notas:

- La precedencia de autenticación de reconexión normal es primero el token/contraseña compartido explícito, luego `deviceToken` explícito, luego el token de dispositivo almacenado y luego el token de arranque.
- La recuperación de `AUTH_TOKEN_MISMATCH` de confianza puede enviar temporalmente tanto el token compartido como el token de dispositivo almacenado juntos para el único reintento limitado.

Relacionado:

- [Solución de problemas de autenticación del Dashboard](/es/web/dashboard#if-you-see-unauthorized-1008)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Nodos](/es/nodes)
