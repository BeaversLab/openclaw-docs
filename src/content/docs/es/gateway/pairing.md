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
4. Al aprobar, el Gateway emite un **nuevo token** (los tokens se rotan al volver a emparejar).
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

- `node.pair.requested` - emitido cuando se crea una nueva solicitud pendiente.
- `node.pair.resolved` - emitido cuando una solicitud es aprobada/rechazada/expirada.

Métodos:

- `node.pair.request` - crear o reutilizar una solicitud pendiente.
- `node.pair.list` - listar nodos pendientes + emparejados (`operator.pairing`).
- `node.pair.approve` - aprobar una solicitud pendiente (emite token).
- `node.pair.reject` - rechazar una solicitud pendiente.
- `node.pair.remove` - eliminar una entrada de nodo emparejado obsoleta.
- `node.pair.verify` - verificar `{ nodeId, token }`.

Notas:

- `node.pair.request` es idempotente por nodo: las llamadas repetidas devuelven la misma solicitud pendiente.
- Las solicitudes repetidas para el mismo nodo pendiente también actualizan los metadatos del nodo almacenado y la última instantánea de comandos declarados en la lista de permitidos para la visibilidad del operador.
- La aprobación **siempre** genera un token nuevo; ningún token se devuelve nunca desde `node.pair.request`.
- Los niveles de alcance del operador y las comprobaciones en el momento de la aprobación se resumen en
  [Operator scopes](/es/gateway/operator-scopes).
- Las solicitudes pueden incluir `silent: true` como una sugerencia para los flujos de aprobación automática.
- `node.pair.approve` utiliza los comandos declarados de la solicitud pendiente para forzar
  alcances de aprobación adicionales:
  - solicitud sin comandos: `operator.pairing`
  - solicitud de comando no exec: `operator.pairing` + `operator.write`
  - solicitud `system.run` / `system.run.prepare` / `system.which`:
    `operator.pairing` + `operator.admin`

<Warning>
El emparejamiento de nodos es un flujo de confianza e identidad más emisión de tokens. **No** fija la superficie de comandos del nodo en vivo por nodo.

- Los comandos de nodo en vivo provienen de lo que el nodo declara al conectarse después de que se aplica la política global de comandos de nodo del gateway (`gateway.nodes.allowCommands` y `denyCommands`).
- La política de permitir y preguntar por nodo `system.run` vive en el nodo en `exec.approvals.node.*`, no en el registro de emparejamiento.

</Warning>

## Bloqueo de comandos de nodo (2026.3.31+)

<Warning>**Cambio importante:** A partir de `2026.3.31`, los comandos de nodo están deshabilitados hasta que se apruebe el emparejamiento del nodo. El emparejamiento de dispositivos por sí solo ya no es suficiente para exponer los comandos de nodo declarados.</Warning>

Cuando un nodo se conecta por primera vez, el emparejamiento se solicita automáticamente. Hasta que se apruebe la solicitud de emparejamiento, todos los comandos pendientes del nodo se filtran y no se ejecutarán. Una vez que se establece la confianza a través de la aprobación del emparejamiento, los comandos declarados del nodo están disponibles sujetos a la política de comandos normal.

Esto significa:

- Los nodos que anteriormente dependían únicamente del emparejamiento de dispositivos para exponer comandos ahora deben completar el emparejamiento de nodos.
- Los comandos en cola antes de la aprobación del emparejamiento se descartan, no se posponen.

## Límites de confianza de eventos del nodo (2026.3.31+)

<Warning>**Cambio importante:** Las ejecuciones originadas por el nodo ahora permanecen en una superficie de confianza reducida.</Warning>

Los resúmenes originados por el nodo y los eventos de sesión relacionados se restringen a la superficie de confianza prevista. Los flujos impulsados por notificaciones o desencadenados por el nodo que anteriormente dependían de un acceso más amplio a herramientas de host o de sesión pueden necesitar ajustes. Este endurecimiento garantiza que los eventos del nodo no puedan escalar a un acceso a herramientas de nivel de host más allá de lo que permite el límite de confianza del nodo.

Las actualizaciones duraderas de presencia del nodo siguen el mismo límite de identidad. El evento `node.presence.alive` se
acepta solo desde sesiones de dispositivos de nodo autenticadas y actualiza los metadatos de emparejamiento solo cuando la
identidad del dispositivo/nodo ya está emparejada. Los valores `client.id` autodeclarados no son suficientes para escribir
el estado de última visualización.

## Aprobación automática (aplicación macOS)

La aplicación macOS puede intentar opcionalmente una **aprobación silenciosa** cuando:

- la solicitud está marcada como `silent`, y
- la aplicación puede verificar una conexión SSH al host de la puerta de enlace utilizando el mismo usuario.

Si la aprobación silenciosa falla, se vuelve al mensaje normal de "Aprobar/Rechazar".

## Aprobación automática de dispositivos de CIDR de confianza

El emparejamiento de dispositivos WS para `role: node` sigue siendo manual por defecto. Para redes de
nodos privadas donde la Puerta de enlace ya confía en la ruta de red, los operadores pueden
optar por participar con CIDRs explícitos o IPs exactas:

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

- Deshabilitado cuando `gateway.nodes.pairing.autoApproveCidrs` no está configurado.
- No existe ningún modo de aprobación automática general para LAN o redes privadas.
- Solo el emparejamiento de dispositivos `role: node` nuevo sin alcances solicitados es elegible.
- Los clientes de Operador, navegador, Interfaz de usuario de control y WebChat siguen siendo manuales.
- Las actualizaciones de rol, alcance, metadatos y clave pública siguen siendo manuales.
- Las rutas de encabezados de proxy de confianza de bucle local del mismo host no son elegibles porque esa ruta puede ser falsificada por llamadores locales.

## Autoaprobación de actualización de metadatos

Cuando un dispositivo ya emparejado se reconecta solo con cambios de metadatos no sensibles (por ejemplo, nombre para mostrar o pistas de la plataforma del cliente), OpenClaw lo trata como una `metadata-upgrade`. La autoaprobación silenciosa es limitada: solo se aplica a reconexiones locales de confianza que no sean del navegador y que ya hayan demostrado la posesión de credenciales locales o compartidas, incluidas las reconexiones de aplicaciones nativas del mismo host después de cambios de metadatos de la versión del sistema operativo. Los clientes del navegador/interfaz de control y los clientes remotos aún usan el flujo de reprobación explícita. Las actualizaciones de alcance (de lectura a escritura/administrador) y los cambios de clave pública **no** son elegibles para la autoaprobación de actualización de metadatos; permanecen como solicitudes de reprobación explícita.

## Auxiliares de emparejamiento QR

`/pair qr` representa la carga útil de emparejamiento como medios estructurados para que los clientes móviles y del navegador puedan escanearla directamente.

Eliminar un dispositivo también barrerá las solicitudes de emparejamiento pendientes obsoletas para ese ID de dispositivo, por lo que `nodes pending` no muestra filas huérfanas después de una revocación.

## Localidad y encabezados reenviados

El emparejamiento de Gateway trata una conexión como de bucle local (loopback) solo cuando tanto el socket sin procesar como cualquier evidencia de proxy ascendente coinciden. Si una solicitud llega en bucle local pero lleva `Forwarded`, cualquier `X-Forwarded-*`, o evidencia de encabezado `X-Real-IP`, esa evidencia de encabezado reenviado descalifica la reclamación de localidad de bucle local. La ruta de emparejamiento entonces requiere aprobación explícita en lugar de tratar silenciosamente la solicitud como una conexión del mismo host. Consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth) para la regla equivalente sobre la autenticación del operador.

## Almacenamiento (local, privado)

El estado de emparejamiento se almacena en el directorio de estado de Gateway (predeterminado `~/.openclaw`):

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si anula `OPENCLAW_STATE_DIR`, la carpeta `nodes/` se mueve con él.

Notas de seguridad:

- Los tokens son secretos; trate `paired.json` como sensible.
- Rotar un token requiere reaprobación (o eliminar la entrada del nodo).

## Comportamiento del transporte

- El transporte es **sin estado**; no almacena la membresía.
- Si el Gateway está desconectado o el emparejamiento está deshabilitado, los nodos no pueden emparejarse.
- Si el Gateway está en modo remoto, el emparejamiento aún se realiza contra el almacenamiento del Gateway remoto.

## Relacionado

- [Emparejamiento de canales](/es/channels/pairing)
- [Nodos](/es/nodes)
- [CLI de dispositivos](/es/cli/devices)
