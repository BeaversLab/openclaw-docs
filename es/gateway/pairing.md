---
summary: "Emparejamiento de nodos propiedad de Gateway (Option B) para iOS y otros nodos remotos"
read_when:
  - Implementación de aprobaciones de emparejamiento de nodos sin la interfaz de usuario de macOS
  - Adición de flujos de CLI para aprobar nodos remotos
  - Ampliación del protocolo de gateway con gestión de nodos
title: "Emparejamiento propiedad de Gateway"
---

# Emparejamiento propiedad de Gateway (Option B)

En el emparejamiento propiedad de Gateway, el **Gateway** es la fuente de verdad de qué nodos
tienen permiso para unirse. Las interfaces de usuario (aplicación macOS, clientes futuros) son solo frontends que
aprueban o rechazan solicitudes pendientes.

**Importante:** Los nodos WS usan el **emparejamiento de dispositivos** (rol `node`) durante `connect`.
`node.pair.*` es un almacén de emparejamiento separado y **no** limita el handshake WS.
Solo los clientes que llaman explícitamente a `node.pair.*` usan este flujo.

## Conceptos

- **Solicitud pendiente**: un nodo solicitó unirse; requiere aprobación.
- **Nodo emparejado**: nodo aprobado con un token de autenticación emitido.
- **Transporte**: el endpoint WS del Gateway reenvía las solicitudes pero no decide
  la pertenencia. (El soporte para puente TCP heredado está en desuso/eliminado.)

## Cómo funciona el emparejamiento

1. Un nodo se conecta al WS del Gateway y solicita el emparejamiento.
2. El Gateway almacena una **solicitud pendiente** y emite `node.pair.requested`.
3. Apruebas o rechazas la solicitud (CLI o interfaz de usuario).
4. Tras la aprobación, el Gateway emite un **nuevo token** (los tokens se rotan al volver a emparejar).
5. El nodo se reconecta usando el token y ahora está "emparejado".

Las solicitudes pendientes caducan automáticamente después de **5 minutos**.

## Flujo de trabajo de CLI (adecuado para headless)

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` muestra los nodos emparejados/conectados y sus capacidades.

## Superficie de la API (protocolo de gateway)

Eventos:

- `node.pair.requested` — emitido cuando se crea una nueva solicitud pendiente.
- `node.pair.resolved` — emitido cuando una solicitud es aprobada/rechazada/caducada.

Métodos:

- `node.pair.request` — crear o reutilizar una solicitud pendiente.
- `node.pair.list` — listar nodos pendientes y emparejados.
- `node.pair.approve` — aprobar una solicitud pendiente (emite token).
- `node.pair.reject` — rechazar una solicitud pendiente.
- `node.pair.verify` — verificar `{ nodeId, token }`.

Notas:

- `node.pair.request` es idempotente por nodo: las llamadas repetidas devuelven la misma solicitud pendiente.
- La aprobación **siempre** genera un token nuevo; nunca se devuelve ningún token desde `node.pair.request`.
- Las solicitudes pueden incluir `silent: true` como una sugerencia para los flujos de aprobación automática.

## Aprobación automática (aplicación macOS)

La aplicación macOS puede intentar opcionalmente una **aprobación silenciosa** cuando:

- la solicitud está marcada como `silent`, y
- la aplicación puede verificar una conexión SSH al host de la puerta de enlace utilizando el mismo usuario.

Si la aprobación silenciosa falla, se recurre al indicador normal de "Aprobar/Rechazar".

## Almacenamiento (local, privado)

El estado del emparejamiento se almacena en el directorio de estado de la Gateway (por defecto `~/.openclaw`):

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si anulas `OPENCLAW_STATE_DIR`, la carpeta `nodes/` se mueve con ella.

Notas de seguridad:

- Los tokens son secretos; trata `paired.json` como sensible.
- Rotar un token requiere una nueva aprobación (o eliminar la entrada del nodo).

## Comportamiento del transporte

- El transporte es **sin estado**; no almacena la pertenencia.
- Si la Gateway está desconectada o el emparejamiento está deshabilitado, los nodos no pueden emparejarse.
- Si la Gateway está en modo remoto, el emparejamiento aún ocurre contra el almacenamiento de la Gateway remota.

import es from "/components/footer/es.mdx";

<es />
