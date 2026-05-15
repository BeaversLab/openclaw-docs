---
summary: "Cómo se producen, fusionan y muestran las entradas de presencia de OpenClaw"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presencia"
---

La "presencia" de OpenClaw es una vista ligera, de mejor esfuerzo, de:

- el propio **Gateway**, y
- **clientes conectados al Gateway** (aplicación de Mac, WebChat, CLI, etc.)

La presencia se usa principalmente para renderizar la pestaña **Instancias** de la aplicación de macOS y para proporcionar una rápida visibilidad al operador.

## Campos de presencia (lo que se muestra)

Las entradas de presencia son objetos estructurados con campos como:

- `instanceId` (opcional pero muy recomendado): identidad estable del cliente (generalmente `connect.client.instanceId`)
- `host`: nombre de host amigable para humanos
- `ip`: dirección IP de mejor esfuerzo
- `version`: cadena de versión del cliente
- `deviceFamily` / `modelIdentifier`: pistas de hardware
- `mode`: `ui`, `webchat`, `cli`, `backend`, `probe`, `test`, `node`, ...
- `lastInputSeconds`: "segundos desde la última entrada del usuario" (si se conoce)
- `reason`: `self`, `connect`, `node-connected`, `periodic`, ...
- `ts`: marca de tiempo de la última actualización (ms desde la época)

## Productores (de dónde proviene la presencia)

Las entradas de presencia son producidas por múltiples fuentes y **fusionadas**.

### 1) Entrada propia del Gateway

El Gateway siempre siembra una entrada "self" al inicio para que las interfaces de usuario muestren el host del gateway incluso antes de que cualquier cliente se conecte.

### 2) Conexión WebSocket

Cada cliente WS comienza con una solicitud `connect`. Tras el handshake exitoso, el Gateway realiza un upsert de una entrada de presencia para esa conexión.

#### Por qué los comandos únicos de la CLI no aparecen

La CLI a menudo se conecta para comandos breves y únicos. Para evitar saturar la lista de Instancias, `client.mode === "cli"` **no** se convierte en una entrada de presencia.

### 3) Balizas `system-event`

Los clientes pueden enviar balizas periódicas más ricas a través del método `system-event`. La aplicación de Mac usa esto para reportar el nombre de host, la IP y `lastInputSeconds`.

### 4) Conexiones de nodos (rol: node)

Cuando un nodo se conecta a través del WebSocket del Gateway con `role: node`, el Gateway realiza un upsert de una entrada de presencia para ese nodo (el mismo flujo que otros clientes WS).

## Reglas de fusión y deduplicación (por qué `instanceId` es importante)

Las entradas de presencia se almacenan en un solo mapa en memoria:

- Las entradas se indexan mediante una **clave de presencia**.
- La mejor clave es un `instanceId` estable (de `connect.client.instanceId`) que sobrevive a los reinicios.
- Las claves no distinguen entre mayúsculas y minúsculas.

Si un cliente se vuelve a conectar sin un `instanceId` estable, puede aparecer como una
fila **duplicada**.

## TTL y tamaño limitado

La presencia es intencionalmente efímera:

- **TTL:** se eliminan las entradas de más de 5 minutos
- **Max entries:** 200 (se descartan primero las más antiguas)

Esto mantiene la lista actualizada y evita un crecimiento de memoria sin límites.

## Advertencia sobre remoto/túnel (IPs de loopback)

Cuando un cliente se conecta a través de un túnel SSH / reenvío de puerto local, la puerta de enlace puede
ver la dirección remota como `127.0.0.1`. Para evitar sobrescribir una buena IP reportada por el cliente,
se ignoran las direcciones remotas de loopback.

## Consumidores

### Pestaña de instancias de macOS

La aplicación de macOS renderiza la salida de `system-presence` y aplica un pequeño indicador de
estado (Activo/Inactivo/Obsoleto) basándose en la antigüedad de la última actualización.

## Consejos de depuración

- Para ver la lista sin procesar, llame a `system-presence` contra la puerta de enlace.
- Si ve duplicados:
  - confirmar que los clientes envían un `client.instanceId` estable en el protocolo de enlace
  - confirmar que los balizos periódicos usan el mismo `instanceId`
  - verificar si a la entrada derivada de la conexión le falta el `instanceId` (se esperan duplicados)

## Relacionado

<CardGroup cols={2}>
  <Card title="Indicadores de escritura" href="/es/concepts/typing-indicators" icon="ellipsis">
    Cuándo se envían los indicadores de escritura y cómo ajustarlos.
  </Card>
  <Card title="Streaming y fragmentación" href="/es/concepts/streaming" icon="bars-staggered">
    Streaming de salida, fragmentación y formato por canal.
  </Card>
  <Card title="Arquitectura de la puerta de enlace" href="/es/concepts/architecture" icon="diagram-project">
    Componentes de la puerta de enlace y el protocolo WebSocket que impulsa las actualizaciones de presencia.
  </Card>
  <Card title="Protocolo de puerta de enlace" href="/es/gateway/protocol" icon="plug">
    El protocolo de cable para `connect`, `system-event` y `system-presence`.
  </Card>
</CardGroup>
