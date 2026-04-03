---
summary: "Emparejamiento de nodos propiedad de la pasarela (Opción B) para iOS y otros nodos remotos"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Emparejamiento propiedad de la pasarela"
---

# Emparejamiento propiedad de la pasarela (Opción B)

En el emparejamiento propiedad de la pasarela, la **Pasarela** es la fuente de verdad de qué nodos
se les permite unirse. Las interfaces de usuario (aplicación macOS, clientes futuros) son solo frontends que
aprueban o rechazan solicitudes pendientes.

**Importante:** Los nodos WS usan **emparejamiento de dispositivos** (rol `node`) durante `connect`.
`node.pair.*` es un almacén de emparejamiento separado y **no** controla el handshake WS.
Solo los clientes que llaman explícitamente a `node.pair.*` usan este flujo.

## Conceptos

- **Solicitud pendiente**: un nodo pidió unirse; requiere aprobación.
- **Nodo emparejado**: nodo aprobado con un token de autenticación emitido.
- **Transporte**: el endpoint WS de la Pasarela reenvía las solicitudes pero no decide
  la pertenencia. (El soporte del puente TCP heredado está obsoleto/eliminado.)

## Cómo funciona el emparejamiento

1. Un nodo se conecta a la Pasarela WS y solicita el emparejamiento.
2. La Pasarela almacena una **solicitud pendiente** y emite `node.pair.requested`.
3. Apruebas o rechazas la solicitud (CLI o UI).
4. Tras la aprobación, la Pasarela emite un **nuevo token** (los tokens se rotan al volver a emparejar).
5. El nodo se reconecta usando el token y ahora está “emparejado”.

Las solicitudes pendientes caducan automáticamente después de **5 minutos**.

## Flujo de trabajo CLI (adecuado para sin cabeza/headless)

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` muestra los nodos emparejados/conectados y sus capacidades.

## Superficie API (protocolo de pasarela)

Eventos:

- `node.pair.requested` — emitido cuando se crea una nueva solicitud pendiente.
- `node.pair.resolved` — emitido cuando una solicitud es aprobada/rechazada/caducada.

Métodos:

- `node.pair.request` — crear o reutilizar una solicitud pendiente.
- `node.pair.list` — listar nodos pendientes + emparejados.
- `node.pair.approve` — aprobar una solicitud pendiente (emite token).
- `node.pair.reject` — rechazar una solicitud pendiente.
- `node.pair.verify` — verificar `{ nodeId, token }`.

Notas:

- `node.pair.request` es idempotente por nodo: las llamadas repetidas devuelven la misma
  solicitud pendiente.
- Las solicitudes repetidas para el mismo nodo pendiente también actualizan los metadatos del nodo almacenado y la última instantánea de comandos declarados en la lista de permitidos para la visibilidad del operador.
- La aprobación **siempre** genera un token nuevo; nunca se devuelve ningún token desde `node.pair.request`.
- Las solicitudes pueden incluir `silent: true` como una sugerencia para los flujos de aprobación automática.

Importante:

- El emparejamiento de nodos es un flujo de confianza/identidad más la emisión de tokens.
- **No** fija la superficie de comandos del nodo en vivo por nodo.
- Los comandos del nodo en vivo provienen de lo que el nodo declara al conectarse después de que se aplica la política global de comandos de nodo de la puerta de enlace (`gateway.nodes.allowCommands` / `denyCommands`).
- La política de permitir/preguntar `system.run` por nodo reside en el nodo en `exec.approvals.node.*`, no en el registro de emparejamiento.

## Bloqueo de comandos de nodo (2026.3.31+)

<Warning>**Cambio importante:** A partir de `2026.3.31`, los comandos de nodo están deshabilitados hasta que se aprueba el emparejamiento del nodo. El emparejamiento del dispositivo por sí solo ya no es suficiente para exponer los comandos de nodo declarados.</Warning>

Cuando un nodo se conecta por primera vez, el emparejamiento se solicita automáticamente. Hasta que se apruebe la solicitud de emparejamiento, todos los comandos de nodo pendientes de ese nodo se filtran y no se ejecutarán. Una vez que se establece la confianza a través de la aprobación del emparejamiento, los comandos declarados del nodo quedan disponibles sujetos a la política de comandos normal.

Esto significa:

- Los nodos que anteriormente dependían únicamente del emparejamiento del dispositivo para exponer comandos ahora deben completar el emparejamiento del nodo.
- Los comandos en cola antes de la aprobación del emparejamiento se descartan, no se posponen.

## Límites de confianza de eventos de nodo (2026.3.31+)

<Warning>**Cambio importante:** Las ejecuciones originadas por el nodo ahora permanecen en una superficie de confianza reducida.</Warning>

Los resúmenes originados por el nodo y los eventos de sesión relacionados están restringidos a la superficie de confianza prevista. Los flujos impulsados por notificaciones o desencadenados por el nodo que anteriormente dependían de un acceso más amplio a las herramientas del host o de la sesión pueden necesitar ajustes. Este endurecimiento asegura que los eventos del nodo no puedan escalar a un acceso a herramientas de nivel host más allá de lo que permite el límite de confianza del nodo.

## Aprobación automática (aplicación macOS)

La aplicación macOS puede intentar opcionalmente una **aprobación silenciosa** cuando:

- la solicitud está marcada como `silent`, y
- la aplicación puede verificar una conexión SSH al host de la puerta de enlace utilizando el mismo usuario.

Si la aprobación silenciosa falla, se vuelve al aviso normal de "Aprobar/Rechazar".

## Almacenamiento (local, privado)

El estado del emparejamiento se almacena en el directorio de estado de la puerta de enlace (predeterminado `~/.openclaw`):

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si anulas `OPENCLAW_STATE_DIR`, la carpeta `nodes/` se mueve con él.

Notas de seguridad:

- Los tokens son secretos; trata `paired.json` como sensible.
- Rotar un token requiere reaprobación (o eliminar la entrada del nodo).

## Comportamiento del transporte

- El transporte es **sin estado**; no almacena la pertenencia.
- Si la puerta de enlace está fuera de línea o el emparejamiento está deshabilitado, los nodos no pueden emparejarse.
- Si la puerta de enlace está en modo remoto, el emparejamiento aún ocurre contra el almacén de la puerta de enlace remota.
