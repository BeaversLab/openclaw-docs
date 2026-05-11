---
summary: "Cómo se producen, fusionan y muestran las entradas de presencia de OpenClaw"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presencia"
---

La “presencia” de OpenClaw es una vista ligera y de mejor esfuerzo de:

- el propio **Gateway**, y
- **clientes conectados al Gateway** (aplicación de Mac, WebChat, CLI, etc.)

La presencia se utiliza principalmente para representar la pestaña **Instancias** (Instances) de la aplicación de macOS y para
proporcionar una rápida visibilidad al operador.

## Campos de presencia (lo que se muestra)

Las entradas de presencia son objetos estructurados con campos como:

- `instanceId` (opcional pero muy recomendado): identidad estable del cliente (generalmente `connect.client.instanceId`)
- `host`: nombre de host amigable para humanos
- `ip`: dirección IP de mejor esfuerzo
- `version`: cadena de versión del cliente
- `deviceFamily` / `modelIdentifier`: indicaciones de hardware
- `mode`: `ui`, `webchat`, `cli`, `backend`, `probe`, `test`, `node`, ...
- `lastInputSeconds`: “segundos desde la última entrada del usuario” (si se conoce)
- `reason`: `self`, `connect`, `node-connected`, `periodic`, ...
- `ts`: marca de tiempo de la última actualización (ms desde la época)

## Productores (de dónde proviene la presencia)

Las entradas de presencia son producidas por múltiples fuentes y **fusionadas**.

### 1) Entrada propia del Gateway

El Gateway siempre siembra una entrada “self” (propia) al inicio para que las interfaces de usuario muestren el host del gateway
e incluso antes de que cualquier cliente se conecte.

### 2) Conexión WebSocket

Cada cliente WS comienza con una solicitud `connect`. En un protocolo de enlace exitoso, el
Gateway actualiza (upsert) una entrada de presencia para esa conexión.

#### Por qué los comandos únicos de la CLI no aparecen

La CLI a menudo se conecta para comandos breves y únicos. Para evitar saturar la
lista de Instancias, `client.mode === "cli"` **no** se convierte en una entrada de presencia.

### 3) Balizas `system-event`

Los clientes pueden enviar balizas periódicas más ricas a través del método `system-event`. La aplicación de Mac
utiliza esto para reportar el nombre del host, la IP y `lastInputSeconds`.

### 4) Conexiones de nodos (rol: node)

Cuando un nodo se conecta a través del WebSocket de Gateway con `role: node`, el Gateway
actualiza o inserta una entrada de presencia para ese nodo (el mismo flujo que otros clientes WS).

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

Cuando un cliente se conecta a través de un túnel SSH / reenvío de puerto local, es posible que Gateway
vea la dirección remota como `127.0.0.1`. Para evitar sobrescribir una buena IP reportada por el cliente,
se ignoran las direcciones remotas de loopback.

## Consumidores

### Pestaña de instancias de macOS

La aplicación de macOS procesa la salida de `system-presence` y aplica un pequeño indicador de
estado (Activo/Inactivo/Obsoleto) basándose en la antigüedad de la última actualización.

## Consejos de depuración

- Para ver la lista sin procesar, llame a `system-presence` contra el Gateway.
- Si ve duplicados:
  - confirme que los clientes envían un `client.instanceId` estable en el protocolo de enlace
  - confirme que las balizas periódicas usan el mismo `instanceId`
  - verifique si a la entrada derivada de la conexión le falta el `instanceId` (se esperan duplicados)

## Relacionado

- [Indicadores de escritura](/es/concepts/typing-indicators)
- [Transmisión y fragmentación](/es/concepts/streaming)
