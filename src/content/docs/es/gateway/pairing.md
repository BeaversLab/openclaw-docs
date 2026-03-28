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
- La aprobación **siempre** genera un token nuevo; nunca se devuelve ningún token desde
  `node.pair.request`.
- Las solicitudes pueden incluir `silent: true` como sugerencia para los flujos de aprobación automática.

## Aprobación automática (aplicación macOS)

La aplicación macOS puede intentar opcionalmente una **aprobación silenciosa** cuando:

- la solicitud está marcada como `silent`, y
- la aplicación puede verificar una conexión SSH con el host de la puerta de enlace utilizando el mismo usuario.

Si falla la aprobación silenciosa, se recurre al mensaje normal de "Aprobar/Rechazar".

## Almacenamiento (local, privado)

El estado del emparejamiento se almacena en el directorio de estado de la puerta de enlace (por defecto `~/.openclaw`):

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si anulas `OPENCLAW_STATE_DIR`, la carpeta `nodes/` se mueve con él.

Notas de seguridad:

- Los tokens son secretos; trata `paired.json` como sensible.
- La rotación de un token requiere una nueva aprobación (o la eliminación de la entrada del nodo).

## Comportamiento del transporte

- El transporte es **sin estado**; no almacena la membresía.
- Si la puerta de enlace está desconectada o el emparejamiento está deshabilitado, los nodos no pueden emparejarse.
- Si la puerta de enlace está en modo remoto, el emparejamiento aún se realiza contra el almacenamiento de la puerta de enlace remota.
