---
summary: "Emparejamiento de nodos propiedad de Gateway (Opción B) para iOS y otros nodos remotos"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Emparejamiento propiedad de Gateway"
---

En el emparejamiento propiedad de Gateway, el **Gateway** es la fuente de verdad sobre qué nodos
tienen permiso para unirse. Las interfaces de usuario (aplicación macOS, clientes futuros) son solo frontends que
aprueban o rechazan las solicitudes pendientes.

**Importante:** Los nodos WS usan **emparejamiento de dispositivos** (rol `node`) durante `connect`.
`node.pair.*` es un almacén de emparejamiento separado y **no** controla el handshake WS.
Solo los clientes que llaman explícitamente a `node.pair.*` usan este flujo.

## Conceptos

- **Solicitud pendiente**: un nodo solicitó unirse; requiere aprobación.
- **Nodo emparejado**: nodo aprobado con un token de autenticación emitido.
- **Transporte**: el endpoint WS del Gateway reenvía las solicitudes pero no decide
  la pertenencia. (El soporte para el puente TCP heredado se ha eliminado).

## Cómo funciona el emparejamiento

1. Un nodo se conecta al WS del Gateway y solicita el emparejamiento.
2. El Gateway almacena una **solicitud pendiente** y emite `node.pair.requested`.
3. Apruebas o rechazas la solicitud (CLI o UI).
4. Tras la aprobación, el Gateway emite un **nuevo token** (los tokens se rotan al volver a emparejar).
5. El nodo se vuelve a conectar usando el token y ahora está "emparejado".

Las solicitudes pendientes caducan automáticamente después de **5 minutos**.

## Flujo de trabajo de CLI (compatible sin interfaz gráfica)

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` muestra los nodos emparejados/conectados y sus capacidades.

## Superficie de la API (protocolo de gateway)

Eventos:

- `node.pair.requested` — emitido cuando se crea una nueva solicitud pendiente.
- `node.pair.resolved` — emitido cuando una solicitud es aprobada/rechazada/caducada.

Métodos:

- `node.pair.request` — crear o reutilizar una solicitud pendiente.
- `node.pair.list` — listar nodos pendientes + emparejados (`operator.pairing`).
- `node.pair.approve` — aprobar una solicitud pendiente (emite token).
- `node.pair.reject` — rechazar una solicitud pendiente.
- `node.pair.remove` — eliminar una entrada de nodo emparejado obsoleta.
- `node.pair.verify` — verificar `{ nodeId, token }`.

Notas:

- `node.pair.request` es idempotente por nodo: las llamadas repetidas devuelven la misma solicitud pendiente.
- Las solicitudes repetidas para el mismo nodo pendiente también actualizan los metadatos del nodo almacenado y la última instantánea de comandos declarados en la lista de permitidos para la visibilidad del operador.
- La aprobación **siempre** genera un token nuevo; ningún token se devuelve nunca desde `node.pair.request`.
- Las solicitudes pueden incluir `silent: true` como una sugerencia para los flujos de autoaprobación.
- `node.pair.approve` utiliza los comandos declarados en la solicitud pendiente para forzar alcances de aprobación adicionales:
  - solicitud sin comandos: `operator.pairing`
  - solicitud de comando no ejecutable: `operator.pairing` + `operator.write`
  - solicitud `system.run` / `system.run.prepare` / `system.which`:
    `operator.pairing` + `operator.admin`

<Warning>
La vinculación de nodos es un flujo de confianza e identidad más emisión de tokens. **No** fija la superficie de comandos del nodo en vivo por nodo.

- Los comandos del nodo en vivo provienen de lo que el nodo declara al conectarse después de que se aplica la política global de comandos de nodo de la puerta de enlace (`gateway.nodes.allowCommands` y `denyCommands`).
- La política de permitir y pedir de `system.run` por nodo vive en el nodo en `exec.approvals.node.*`, no en el registro de vinculación.
  </Warning>

## Bloqueo de comandos de nodo (2026.3.31+)

<Warning>**Cambio importante:** A partir de `2026.3.31`, los comandos de nodo están deshabilitados hasta que se aprueba la vinculación del nodo. La vinculación de dispositivos por sí sola ya no es suficiente para exponer los comandos de nodo declarados.</Warning>

Cuando un nodo se conecta por primera vez, el emparejamiento se solicita automáticamente. Hasta que se apruebe la solicitud de emparejamiento, todos los comandos de nodo pendientes de ese nodo se filtran y no se ejecutarán. Una vez que se establece la confianza a través de la aprobación del emparejamiento, los comandos declarados del nodo quedan disponibles sujetos a la política de comandos normal.

Esto significa:

- Los nodos que anteriormente dependían únicamente del emparejamiento del dispositivo para exponer comandos ahora deben completar el emparejamiento del nodo.
- Los comandos en cola antes de la aprobación del emparejamiento se descartan, no se posponen.

## Límites de confianza de eventos de nodo (2026.3.31+)

<Warning>**Cambio importante:** Las ejecuciones originadas por el nodo ahora permanecen en una superficie de confianza reducida.</Warning>

Los resúmenes originados por el nodo y los eventos de sesión relacionados están restringidos a la superficie de confianza prevista. Los flujos impulsados por notificaciones o desencadenados por el nodo que anteriormente dependían de un acceso más amplio a las herramientas del host o de la sesión pueden necesitar ajustes. Este endurecimiento asegura que los eventos del nodo no puedan escalar a un acceso a herramientas de nivel host más allá de lo que permite el límite de confianza del nodo.

## Aprobación automática (aplicación macOS)

La aplicación macOS puede intentar opcionalmente una **aprobación silenciosa** cuando:

- la solicitud se marca como `silent`, y
- la aplicación puede verificar una conexión SSH al host de la puerta de enlace utilizando el mismo usuario.

Si la aprobación silenciosa falla, se vuelve al aviso normal de "Aprobar/Rechazar".

## Autoaprobación de dispositivos de CIDR confiable

La vinculación de dispositivos WS para `role: node` sigue siendo manual por defecto. Para redes de nodos privadas donde la Gateway ya confía en la ruta de red, los operadores pueden optar por participar con CIDR explícitos o IPs exactas:

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Límite de seguridad:

- Deshabilitado cuando `gateway.nodes.pairing.autoApproveCidrs` no está establecido.
- No existe ningún modo de autoaprobación general para LAN o redes privadas.
- Solo la vinculación de dispositivos `role: node` nueva sin alcances solicitados es elegible.
- Los clientes de Operador, navegador, Control UI y WebChat siguen siendo manuales.
- Las actualizaciones de rol, alcance, metadatos y clave pública siguen siendo manuales.
- Las rutas de encabezado de proxy de confianza de bucle invertido del mismo host no son elegibles porque esa ruta puede ser falsificada por llamadores locales.

## Autoaprobación de actualización de metadatos

Cuando un dispositivo ya emparejado se vuelve a conectar solo con cambios de metadatos no sensibles
(por ejemplo, nombre para mostrar o pistas de la plataforma del cliente), OpenClaw lo trata
como un `metadata-upgrade`. La aprobación automática silenciosa es limitada: se aplica solo
a reconexiones locales de confianza que no sean del navegador y que ya hayan demostrado la posesión de credenciales
locales o compartidas, incluyendo reconexiones de aplicaciones nativas en el mismo host después de cambios de metadatos de la versión del SO.
Los clientes del navegador / interfaz de control y los clientes remotos aún
usan el flujo de reaprobación explícito. Las actualizaciones de alcance (de lectura a escritura/admin) y
los cambios de clave pública **no** son elegibles para la aprobación automática por actualización de metadatos —
permanecen como solicitudes de reaprobación explícitas.

## Asistentes de emparejamiento QR

`/pair qr` renderiza la carga útil de emparejamiento como medios estructurados para que los clientes
móviles y de navegador puedan escanearla directamente.

Eliminar un dispositivo también limpia cualquier solicitud de emparejamiento pendiente obsoleta para ese
id de dispositivo, por lo que `nodes pending` no muestra filas huérfanas después de una revocación.

## Localidad y cabeceras reenviadas

El emparejamiento de Gateway trata una conexión como loopback solo cuando el socket sin procesar
y cualquier evidencia de proxy ascendente coinciden. Si una solicitud llega en loopback pero
lleva cabeceras `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto`
que apuntan a un origen no local, esa evidencia de cabecera reenviada descalifica
la afirmación de localidad de loopback. La ruta de emparejamiento entonces requiere aprobación explícita
en lugar de tratar silenciosamente la solicitud como una conexión del mismo host. Vea
[Trusted Proxy Auth](/es/gateway/trusted-proxy-auth) para la regla equivalente sobre
la autenticación del operador.

## Almacenamiento (local, privado)

El estado de emparejamiento se almacena en el directorio de estado de Gateway (por defecto `~/.openclaw`):

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si anula `OPENCLAW_STATE_DIR`, la carpeta `nodes/` se mueve con ella.

Notas de seguridad:

- Los tokens son secretos; trate `paired.json` como sensible.
- Rotar un token requiere reaprobación (o eliminar la entrada del nodo).

## Comportamiento del transporte

- El transporte es **sin estado**; no almacena la membresía.
- Si el Gateway está fuera de línea o el emparejamiento está deshabilitado, los nodos no pueden emparejarse.
- Si la puerta de enlace está en modo remoto, el emparejamiento aún ocurre contra el almacén de la puerta de enlace remota.

## Relacionado

- [Emparejamiento de canales](/es/channels/pairing)
- [Nodos](/es/nodes)
- [CLI de dispositivos](/es/cli/devices)
