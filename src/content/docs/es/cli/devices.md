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

Aprobar roles de dispositivo de nodo u otros no operadores requiere `operator.admin`.
`operator.pairing` es suficiente para las aprobaciones de dispositivos operadores solo cuando los
alcances del operador solicitados se mantienen dentro de los propios alcances del llamador. Vea
[Operator scopes](/es/gateway/operator-scopes) para las comprobaciones en el momento de la aprobación.

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / `openclaw_gateway` aprobación de primera ejecución

Cuando un nuevo agente Paperclip se conecta a través del adaptador `openclaw_gateway` por primera vez, la Gateway puede requerir una aprobación de emparejamiento de dispositivo única antes de que las ejecuciones puedan tener éxito. Si Paperclip reporta `openclaw_gateway_pairing_required`, apruebe el dispositivo pendiente y reintente.

Para gateways locales, previsualice la última solicitud pendiente:

```bash
openclaw devices approve --latest
```

La vista previa imprime el comando exacto `openclaw devices approve <requestId>`. Verifique los detalles de la solicitud y luego vuelva a ejecutar ese comando con el ID de la solicitud para aprobarlo.

Para gateways remotos o credenciales explícitas, pase las mismas opciones mientras previsualiza y aprueba:

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

Para evitar reaprobar después de los reinicios, mantenga una clave de dispositivo persistente en la configuración del adaptador Paperclip en lugar de generar una nueva identidad efímera en cada ejecución:

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

Rotar un token de dispositivo para un rol específico (opcionalmente actualizando alcances).
El rol objetivo ya debe existir en el contrato de emparejamiento aprobado de ese dispositivo;
la rotación no puede crear un nuevo rol no aprobado.
Si omite `--scope`, las reconexiones posteriores con el token rotado almacenado reutilizan los
alcances aprobados en caché de ese token. Si pasa valores explícitos de `--scope`, esos
se convierten en el conjunto de alcances almacenado para futuras reconexiones con token en caché.
Los llamadores de dispositivos emparejados que no son administradores solo pueden rotar su **propio** token de dispositivo.
El conjunto de alcances del token objetivo debe mantenerse dentro de los propios alcances de operador
de la sesión del llamador; la rotación no puede crear ni conservar un token de operador más amplio del que
el llamador ya tiene.

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

Devuelve los metadatos de rotación como JSON. Si el autor de la llamada está rotando su propio token mientras está autenticado con ese token de dispositivo, la respuesta también incluye el token de reemplazo para que el cliente pueda guardarlo antes de volver a conectarse. Las rotaciones compartidas/de administrador no repiten el token de portador.

### `openclaw devices revoke --device <id> --role <role>`

Revoca un token de dispositivo para un rol específico.

Los autores de llamada de dispositivos emparejados que no son administradores solo pueden revocar su **propio** token de dispositivo.
Revocar el token de algún otro dispositivo requiere `operator.admin`.
El conjunto de ámbitos del token de destino también debe ajustarse a los ámbitos de operador propios de la sesión del autor de la llamada; los autores de llamada solo de emparejamiento no pueden revocar tokens de operador de administrador/escritura.

```
openclaw devices revoke --device <deviceId> --role node
```

Devuelve el resultado de la revocación como JSON.

## Opciones comunes

- `--url <url>`: URL de WebSocket de Gateway (por defecto es `gateway.remote.url` cuando está configurado).
- `--token <token>`: Token de Gateway (si es necesario).
- `--password <password>`: Contraseña de Gateway (autenticación por contraseña).
- `--timeout <ms>`: Tiempo de espera de RPC.
- `--json`: Salida JSON (recomendado para secuencias de comandos).

<Warning>Cuando establece `--url`, la CLI no recurre a credenciales de configuración o de entorno. Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.</Warning>

## Notas

- La rotación de tokens devuelve un nuevo token (sensible). Trátelo como un secreto.
- Estos comandos requieren el ámbito `operator.pairing` (o `operator.admin`). Algunas
  aprobaciones también requieren que el autor de la llamada posea los ámbitos de operador que el dispositivo
  objetivo acuñaría o heredaría. Los roles de dispositivo que no son operadores requieren
  `operator.admin`; consulte [Ámbitos de operador](/es/gateway/operator-scopes).
- `gateway.nodes.pairing.autoApproveCidrs` es una política opcional de Gateway para
  el emparejamiento de dispositivos de nodos nuevos únicamente; no cambia la autoridad de aprobación de la CLI.
- La rotación y revocación de tokens se mantienen dentro del conjunto de roles de emparejamiento aprobados y
  la línea base de ámbito aprobado para ese dispositivo. Una entrada de token en caché extraviada no
  otorga un objetivo de gestión de tokens.
- Para las sesiones de token de dispositivo emparejado, la administración entre dispositivos es exclusiva de administradores:
  `remove`, `rotate` y `revoke` son exclusivos del propio dispositivo a menos que el autor de la llamada tenga
  `operator.admin`.
- La mutación de tokens también está limitada al ámbito del autor de la llamada: una sesión exclusiva de emparejamiento no puede
  rotar ni revocar un token que actualmente tenga `operator.admin` o
  `operator.write`.
- `devices clear` está intencionalmente limitado por `--yes`.
- Si el ámbito de emparejamiento no está disponible en el bucle local (y no se pasa ningún `--url` explícito), listar/aprobar puede usar una alternativa de emparejamiento local.
- `devices approve` requiere un ID de solicitud explícito antes de crear tokens; omitir `requestId` o pasar `--latest` solo previsualiza la solicitud pendiente más reciente.

## Lista de verificación para la recuperación de desviación de tokens

Use esto cuando la interfaz de usuario de Control u otros clientes sigan fallando con `AUTH_TOKEN_MISMATCH`, `AUTH_DEVICE_TOKEN_MISMATCH` o `AUTH_SCOPE_MISMATCH`.

1. Confirmar la fuente actual del token de puerta de enlace:

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

4. Si la rotación no es suficiente, elimine el emparejamiento obsoleto y apruebe nuevamente:

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. Reintentar la conexión del cliente con el token/contraseña compartido actual.

Notas:

- La precedencia de autenticación de reconexión normal es primero el token/contraseña compartido explícito, luego `deviceToken` explícito, luego el token de dispositivo almacenado y finalmente el token de arranque.
- La recuperación confiable de `AUTH_TOKEN_MISMATCH` puede enviar temporalmente tanto el token compartido como el token de dispositivo almacenado juntos para el único reintento limitado.
- `AUTH_SCOPE_MISMATCH` significa que el token del dispositivo fue reconocido pero no lleva el conjunto de ámbitos solicitado; corrija el contrato de aprobación de emparejamiento/ámbito antes de cambiar la autenticación compartida de la puerta de enlace.

Relacionado:

- [Solución de problemas de autenticación del panel](/es/web/dashboard#if-you-see-unauthorized-1008)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)

## Relacionado

- [Referencia de CLI](/es/cli)
- [Nodos](/es/nodes)
