---
summary: "Cómo se producen, fusionan y muestran las entradas de presencia de OpenClaw"
read_when:
  - Depuración de la pestaña Instancias
  - Investigación de filas de instancias duplicadas o obsoletas
  - Cambiar la conexión WebSocket de la puerta de enlace o los balizos de eventos del sistema
title: "Presencia"
---

# Presencia

La "presencia" de OpenClaw es una vista ligera y de mejor esfuerzo posible de:

- el propio **Gateway**, y
- **los clientes conectados al Gateway** (aplicación Mac, WebChat, CLI, etc.)

La presencia se usa principalmente para representar la pestaña **Instancias** de la aplicación macOS y para
proporcionar una visibilidad rápida al operador.

## Campos de presencia (lo que se muestra)

Las entradas de presencia son objetos estructurados con campos como:

- `instanceId` (opcional pero muy recomendado): identidad estable del cliente (generalmente `connect.client.instanceId`)
- `host`: nombre de host amigable para humanos
- `ip`: dirección IP de mejor esfuerzo posible
- `version`: cadena de versión del cliente
- `deviceFamily` / `modelIdentifier`: indicaciones de hardware
- `mode`: `ui`, `webchat`, `cli`, `backend`, `probe`, `test`, `node`, ...
- `lastInputSeconds`: "segundos desde la última entrada del usuario" (si se conoce)
- `reason`: `self`, `connect`, `node-connected`, `periodic`, ...
- `ts`: marca de tiempo de la última actualización (ms desde la época)

## Productores (de dónde proviene la presencia)

Las entradas de presencia son producidas por múltiples fuentes y **fusionadas**.

### 1) Entrada propia del Gateway

El Gateway siempre siembra una entrada "propia" al inicio para que las interfaces de usuario muestren el host de la puerta de enlace
eincluso antes de que se conecte cualquier cliente.

### 2) Conexión WebSocket

Cada cliente WS comienza con una solicitud `connect`. Tras el protocolo de enlace exitoso, el
Gateway realiza un upsert de una entrada de presencia para esa conexión.

#### Por qué los comandos CLI únicos no aparecen

El CLI a menudo se conecta para comandos cortos y únicos. Para evitar saturar la
lista de Instancias, `client.mode === "cli"` **no** se convierte en una entrada de presencia.

### 3) `system-event` balizas

Los clientes pueden enviar balizas periódicas más ricas a través del método `system-event`. La aplicación de Mac usa esto para reportar el nombre de host, IP y `lastInputSeconds`.

### 4) Conexiones de nodos (rol: node)

Cuando un nodo se conecta a través del WebSocket de Gateway con `role: node`, el Gateway inserta o actualiza una entrada de presencia para ese nodo (mismo flujo que otros clientes WS).

## Reglas de fusión y deduplicación (por qué `instanceId` importa)

Las entradas de presencia se almacenan en un solo mapa en memoria:

- Las entradas están indexadas por una **clave de presencia**.
- La mejor clave es un `instanceId` estable (de `connect.client.instanceId`) que sobrevive a los reinicios.
- Las claves no distinguen entre mayúsculas y minúsculas.

Si un cliente se vuelve a conectar sin un `instanceId` estable, puede aparecer como una fila **duplicada**.

## TTL y tamaño limitado

La presencia es intencionalmente efímera:

- **TTL:** se eliminan las entradas de más de 5 minutos
- **Máximo de entradas:** 200 (las más antiguas se eliminan primero)

Esto mantiene la lista actualizada y evita un crecimiento ilimitado de la memoria.

## Advertencia de remoto/túnel (IPs de loopback)

Cuando un cliente se conecta a través de un túnel SSH / reenvío de puerto local, el Gateway puede ver la dirección remota como `127.0.0.1`. Para evitar sobrescribir una IP reportada correctamente por el cliente, se ignoran las direcciones remotas de loopback.

## Consumidores

### Pestaña macOS Instances

La aplicación de macOS representa la salida de `system-presence` y aplica un pequeño indicador de estado (Activo/Inactivo/Obsoleto) basándose en la antigüedad de la última actualización.

## Consejos de depuración

- Para ver la lista sin procesar, llame a `system-presence` contra el Gateway.
- Si ve duplicados:
  - confirme que los clientes envían un `client.instanceId` estable en el handshake
  - confirme que las balizas periódicas usan el mismo `instanceId`
  - verifique si a la entrada derivada de la conexión le falta el `instanceId` (se esperan duplicados)

import en from "/components/footer/en.mdx";

<en />
