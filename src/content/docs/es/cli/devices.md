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

Cuando está autenticado con un token de dispositivo emparejado, los llamadores que no son administradores pueden
eliminar solo **su propia** entrada de dispositivo. Eliminar cualquier otro dispositivo requiere
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

Aprobar una solicitud de emparejamiento de dispositivo pendiente mediante su `requestId` exacto. Si se omite `requestId`
o se pasa `--latest`, OpenClaw solo imprime la solicitud pendiente
seleccionada y sale; vuelva a ejecutar la aprobación con el ID de solicitud exacto después de verificar
los detalles.

<Note>Si un dispositivo reintenta el emparejamiento con detalles de autenticación modificados (rol, ámbitos o clave pública), OpenClaw reemplaza la entrada pendiente anterior y emite un nuevo `requestId`. Ejecute `openclaw devices list` justo antes de la aprobación para usar el ID actual.</Note>

Si el dispositivo ya está emparejado y solicita ámbitos más amplios o un rol más amplio,
OpenClaw mantiene la aprobación existente y crea una nueva solicitud de actualización
pendiente. Revise las columnas `Requested` vs `Approved` en `openclaw devices list`
o use `openclaw devices approve --latest` para previsualizar la actualización exacta antes
de aprobarla.

Si el Gateway está configurado explícitamente con
`gateway.nodes.pairing.autoApproveCidrs`, las solicitudes `role: node` por primera vez de
las IP de cliente coincidentes pueden aprobarse antes de que aparezcan en esta lista. Esa política
está deshabilitada de forma predeterminada y nunca se aplica a clientes de operador/navegador o solicitudes
de actualización.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / Aprobación de primera ejecución de `openclaw_gateway`

Cuando un nuevo agente de Paperclip se conecta a través del adaptador `openclaw_gateway` por primera vez, el Gateway puede requerir una aprobación de emparejamiento de dispositivo única antes de que las ejecuciones puedan tener éxito. Si Paperclip informa `openclaw_gateway_pairing_required`, apruebe el dispositivo pendiente y vuelva a intentarlo.

Para gateways locales, previsualice la última solicitud pendiente:

```bash
openclaw devices approve --latest
```

La vista previa imprime el comando exacto `openclaw devices approve <requestId>`. Verifique los detalles de la solicitud y luego vuelva a ejecutar ese comando con el ID de la solicitud para aprobarlo.

Para gateways remotos o credenciales explícitas, pase las mismas opciones mientras se obtiene la vista previa y se aprueba:

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

Para evitar volver a aprobar después de los reinicios, mantenga una clave de dispositivo persistente en la configuración del adaptador de Paperclip en lugar de generar una nueva identidad efímera cada vez que se ejecute:

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

Si la aprobación sigue fallando, ejecute `openclaw devices list` primero para confirmar que existe una solicitud pendiente.

### `openclaw devices reject <requestId>`

Rechazar una solicitud de emparejamiento de dispositivo pendiente.

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

Rotar un token de dispositivo para un rol específico (opcionalmente actualizando los ámbitos).
El rol de destino ya debe existir en el contrato de emparejamiento aprobado de ese dispositivo;
la rotación no puede crear un nuevo rol no aprobado.
Si omite `--scope`, las reconexiones posteriores con el token rotado almacenado reutilizan los
ámbitos aprobados en caché de ese token. Si pasa valores `--scope` explícitos, esos
se convierten en el conjunto de ámbitos almacenados para reconexiones futuras con token en caché.
Los llamadores de dispositivos emparejados que no son administradores solo pueden rotar su **propio** token de dispositivo.
El conjunto de ámbitos del token de destino debe mantenerse dentro de los ámbitos de operador
propios de la sesión del llamador; la rotación no puede crear ni conservar un token de operador más amplio del que
el llamador ya tiene.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Devuelve los metadatos de rotación como JSON. Si el llamador está rotando su propio token mientras
está autenticado con ese token de dispositivo, la respuesta también incluye el token de
reemplazo para que el cliente pueda guardarlo antes de volver a conectarse. Las rotaciones compartidas/de administradores
no repiten el token de portador (bearer token).

### `openclaw devices revoke --device <id> --role <role>`

Revocar un token de dispositivo para un rol específico.

Los llamadores de dispositivos emparejados que no son administradores solo pueden revocar su **propio** token de dispositivo.
Revocar el token de algún otro dispositivo requiere `operator.admin`.
El conjunto de ámbitos del token de destino también debe ajustarse a los propios
ámbitos de operador de la sesión del llamador; los llamadores con solo permisos de emparejamiento no pueden revocar tokens de operador de administrador/escritura.

```
openclaw devices revoke --device <deviceId> --role node
```

Devuelve el resultado de la revocación como JSON.

## Opciones comunes

- `--url <url>`: URL de WebSocket del Gateway (por defecto es `gateway.remote.url` cuando está configurado).
- `--token <token>`: Token del Gateway (si es necesario).
- `--password <password>`: Contraseña del Gateway (autenticación por contraseña).
- `--timeout <ms>`: tiempo de espera de RPC.
- `--json`: salida JSON (recomendado para scripts).

<Warning>Cuando establece `--url`, la CLI no recurre a las credenciales de configuración o del entorno. Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.</Warning>

## Notas

- La rotación de tokens devuelve un nuevo token (sensible). Trátelo como un secreto.
- Estos comandos requieren el alcance `operator.pairing` (o `operator.admin`). Algunas
  aprobaciones también requieren que la persona que llama tenga los alcances del operador que el dispositivo
  objetivo acuñaría o heredaría; consulte [Alcances del operador](/es/gateway/operator-scopes).
- `gateway.nodes.pairing.autoApproveCidrs` es una política opcional de Gateway para
  el emparejamiento de dispositivos de nodos nuevos únicamente; no cambia la autoridad de aprobación de la CLI.
- La rotación y revocación de tokens se mantienen dentro del conjunto de roles de emparejamiento aprobados y la
  línea base de alcance aprobado para ese dispositivo. Una entrada de token en caché aleatoria no
  otorga un objetivo de gestión de tokens.
- Para las sesiones de tokens de dispositivos emparejados, la gestión entre dispositivos es solo para administradores:
  `remove`, `rotate` y `revoke` son solo para sí mismos a menos que la persona que llamada tenga
  `operator.admin`.
- La mutación de tokens también está contenida en el alcance de la persona que llama: una sesión de solo emparejamiento no puede
  rotar ni revocar un token que actualmente lleve `operator.admin` o
  `operator.write`.
- `devices clear` está intencionalmente limitado por `--yes`.
- Si el alcance de emparejamiento no está disponible en el bucle local (y no se pasa un `--url` explícito), la lista/aprobación puede utilizar una alternativa de emparejamiento local.
- `devices approve` requiere un ID de solicitud explícito antes de acuñar tokens; omitir `requestId` o pasar `--latest` solo previsualiza la solicitud pendiente más reciente.

## Lista de verificación para la recuperación de desviación de tokens

Úselo cuando Control UI u otros clientes sigan fallando con `AUTH_TOKEN_MISMATCH`, `AUTH_DEVICE_TOKEN_MISMATCH` o `AUTH_SCOPE_MISMATCH`.

1. Confirme la fuente del token de puerta de enlace actual:

```bash
openclaw config get gateway.auth.token
```

2. Lista los dispositivos emparejados e identifica el ID del dispositivo afectado:

```bash
openclaw devices list
```

3. Rotate el token de operador para el dispositivo afectado:

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. Si la rotación no es suficiente, elimine el emparejamiento obsoleto y apruebe de nuevo:

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Reintente la conexión del cliente con el token/contraseña compartido actual.

Notas:

- La precedencia de autenticación de reconexión normal es primero token/contraseña compartido explícito, luego `deviceToken` explícito, luego token de dispositivo almacenado, luego token de arranque.
- La recuperación de `AUTH_TOKEN_MISMATCH` de confianza puede enviar temporalmente tanto el token compartido como el token de dispositivo almacenado juntos para el único reintento limitado.
- `AUTH_SCOPE_MISMATCH` significa que el token del dispositivo fue reconocido pero no lleva el conjunto de alcance solicitado; corrija el contrato de aprobación de emparejamiento/alcance antes de cambiar la autenticación de la puerta de enlace compartida.

Relacionado:

- [Solución de problemas de autenticación del Dashboard](/es/web/dashboard#if-you-see-unauthorized-1008)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)

## Relacionado

- [Referencia de CLI](/es/cli)
- [Nodos](/es/nodes)
