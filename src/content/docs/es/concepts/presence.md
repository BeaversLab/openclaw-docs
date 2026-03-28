---
summary: "Cómo se producen, fusionan y muestran las entradas de presencia de OpenClaw"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presencia"
---

# Presencia

La "presencia" de OpenClaw es una vista ligera, de mejor esfuerzo, de:

- el propio **Gateway**, y
- **clientes conectados al Gateway** (app de Mac, WebChat, CLI, etc.)

La presencia se utiliza principalmente para representar la pestaña **Instancias** de la aplicación macOS y para
proporcionar una rápida visibilidad al operador.

## Campos de presencia (lo que se muestra)

Las entradas de presencia son objetos estructurados con campos como:

- `instanceId` (opcional pero muy recomendado): identidad de cliente estable (generalmente `connect.client.instanceId`)
- `host`: nombre de host legible para humanos
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

El Gateway siempre inicializa una entrada propia ("self") al inicio para que las interfaces muestren el host del gateway
e incluso antes de que se conecten clientes.

### 2) Conexión WebSocket

Cada cliente WS comienza con una solicitud `connect`. Tras el handshake exitoso, el
Gateway realiza un upsert de una entrada de presencia para esa conexión.

#### Por qué los comandos de CLI puntuales no aparecen

La CLI a menudo se conecta para comandos cortos y únicos. Para evitar saturar la
lista de Instancias, `client.mode === "cli"` **no** se convierte en una entrada de presencia.

### 3) Balizas `system-event`

Los clientes pueden enviar balizas periódicas más ricas a través del método `system-event`. La aplicación de Mac utiliza esto para informar el nombre del host, la IP y `lastInputSeconds`.

### 4) Conexiones de nodo (rol: node)

Cuando un nodo se conecta a través del WebSocket de la Gateway con `role: node`, la Gateway actualiza o inserta una entrada de presencia para ese nodo (mismo flujo que otros clientes WS).

## Reglas de fusión y deduplicación (por qué `instanceId` importa)

Las entradas de presencia se almacenan en un único mapa en memoria:

- Las entradas se indexan mediante una **clave de presencia**.
- La mejor clave es una `instanceId` estable (de `connect.client.instanceId`) que sobreviva a los reinicios.
- Las claves no distinguen entre mayúsculas y minúsculas.

Si un cliente se vuelve a conectar sin una `instanceId` estable, puede aparecer como una fila **duplicada**.

## TTL y tamaño limitado

La presencia es intencionalmente efímera:

- **TTL:** las entradas de más de 5 minutos se eliminan
- **Máximo de entradas:** 200 (las más antiguas se descartan primero)

Esto mantiene la lista actualizada y evita un crecimiento ilimitado de la memoria.

## Advertencia sobre túneles/remotos (IPs de loopback)

Cuando un cliente se conecta a través de un túnel SSH / redirección de puerto local, la Gateway puede ver la dirección remota como `127.0.0.1`. Para evitar sobrescribir una IP buena reportada por el cliente, las direcciones remotas de loopback se ignoran.

## Consumidores

### Pestaña de instancias de macOS

La aplicación de macOS representa la salida de `system-presence` y aplica un pequeño indicador de estado (Activo/Inactivo/Obsoleto) basado en la antigüedad de la última actualización.

## Consejos de depuración

- Para ver la lista sin procesar, llame a `system-presence` contra la Gateway.
- Si ve duplicados:
  - confirme que los clientes envían una `client.instanceId` estable en el protocolo de enlace (handshake)
  - confirme que las balizas periódicas usan la misma `instanceId`
  - verifique si a la entrada derivada de la conexión le falta `instanceId` (se esperan duplicados)
