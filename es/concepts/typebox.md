---
summary: "Esquemas TypeBox como la única fuente de verdad para el protocolo de la puerta de enlace"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

# TypeBox como fuente de verdad del protocolo

Última actualización: 2026-01-10

TypeBox es una biblioteca de esquemas con prioridad para TypeScript. La usamos para definir el **protocolo WebSocket de la puerta de enlace** (protocolo de enlace, solicitud/respuesta, eventos del servidor). Esos esquemas impulsan la **validación en tiempo de ejecución**, la **exportación de JSON Schema** y el **código generado para Swift** (Swift codegen) para la aplicación de macOS. Una única fuente de verdad; todo lo demás se genera.

Si deseas el contexto del protocolo de alto nivel, comienza con
[Arquitectura de la puerta de enlace](/es/concepts/architecture).

## Modelo mental (30 segundos)

Cada mensaje de WS de la puerta de enlace es uno de tres tramas:

- **Solicitud**: `{ type: "req", id, method, params }`
- **Respuesta**: `{ type: "res", id, ok, payload | error }`
- **Evento**: `{ type: "event", event, payload, seq?, stateVersion? }`

La primera trama **debe** ser una solicitud `connect`. Después de eso, los clientes pueden llamar
a métodos (p. ej., `health`, `send`, `chat.send`) y suscribirse a eventos (p. ej.
`presence`, `tick`, `agent`).

Flujo de conexión (mínimo):

```
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

Métodos + eventos comunes:

| Categoría  | Ejemplos                                                  | Notas                                              |
| ---------- | --------------------------------------------------------- | -------------------------------------------------- |
| Principal  | `connect`, `health`, `status`                             | `connect` debe ser primero                         |
| Mensajería | `send`, `poll`, `agent`, `agent.wait`                     | los efectos secundarios necesitan `idempotencyKey` |
| Chat       | `chat.history`, `chat.send`, `chat.abort`, `chat.inject`  | WebChat utiliza estos                              |
| Sesiones   | `sessions.list`, `sessions.patch`, `sessions.delete`      | administración de sesiones                         |
| Nodos      | `node.list`, `node.invoke`, `node.pair.*`                 | WS de la puerta de enlace + acciones de nodo       |
| Eventos    | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown` | envío del servidor                                 |

La lista autorizada vive en `src/gateway/server.ts` (`METHODS`, `EVENTS`).

## Dónde viven los esquemas

- Fuente: `src/gateway/protocol/schema.ts`
- Validadores de tiempo de ejecución (AJV): `src/gateway/protocol/index.ts`
- Protocolo de enlace del servidor + despacho de métodos: `src/gateway/server.ts`
- Cliente Node: `src/gateway/client.ts`
- JSON Schema generado: `dist/protocol.schema.json`
- Modelos Swift generados: `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## Canalización actual

- `pnpm protocol:gen`
  - escribe JSON Schema (draft‑07) en `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - genera modelos de puerta de enlace Swift
- `pnpm protocol:check`
  - ejecuta ambos generadores y verifica que la salida se haya confirmado

## Cómo se usan los esquemas en tiempo de ejecución

- **Lado del servidor**: cada trama entrante se valida con AJV. El protocolo de enlace solo
  acepta una solicitud `connect` cuyos parámetros coincidan con `ConnectParams`.
- **Lado del cliente**: el cliente JS valida las tramas de eventos y respuestas antes
  de usarlas.
- **Superficie de métodos**: la puerta de enlace anuncia los `methods` y
  `events` admitidos en `hello-ok`.

## Tramas de ejemplo

Conectar (primer mensaje):

```json
{
  "type": "req",
  "id": "c1",
  "method": "connect",
  "params": {
    "minProtocol": 2,
    "maxProtocol": 2,
    "client": {
      "id": "openclaw-macos",
      "displayName": "macos",
      "version": "1.0.0",
      "platform": "macos 15.1",
      "mode": "ui",
      "instanceId": "A1B2"
    }
  }
}
```

Respuesta Hello-ok:

```json
{
  "type": "res",
  "id": "c1",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 2,
    "server": { "version": "dev", "connId": "ws-1" },
    "features": { "methods": ["health"], "events": ["tick"] },
    "snapshot": {
      "presence": [],
      "health": {},
      "stateVersion": { "presence": 0, "health": 0 },
      "uptimeMs": 0
    },
    "policy": { "maxPayload": 1048576, "maxBufferedBytes": 1048576, "tickIntervalMs": 30000 }
  }
}
```

Solicitud + respuesta:

```json
{ "type": "req", "id": "r1", "method": "health" }
```

```json
{ "type": "res", "id": "r1", "ok": true, "payload": { "ok": true } }
```

Evento:

```json
{ "type": "event", "event": "tick", "payload": { "ts": 1730000000 }, "seq": 12 }
```

## Cliente mínimo (Node.js)

Flujo útil más pequeño: conectar + estado.

```ts
import { WebSocket } from "ws";

const ws = new WebSocket("ws://127.0.0.1:18789");

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "req",
      id: "c1",
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "cli",
          displayName: "example",
          version: "dev",
          platform: "node",
          mode: "cli",
        },
      },
    }),
  );
});

ws.on("message", (data) => {
  const msg = JSON.parse(String(data));
  if (msg.type === "res" && msg.id === "c1" && msg.ok) {
    ws.send(JSON.stringify({ type: "req", id: "h1", method: "health" }));
  }
  if (msg.type === "res" && msg.id === "h1") {
    console.log("health:", msg.payload);
    ws.close();
  }
});
```

## Ejemplo práctico: añadir un método de extremo a extremo

Ejemplo: añadir una nueva solicitud `system.echo` que devuelva `{ ok: true, text }`.

1. **Esquema (fuente de verdad)**

Añadir a `src/gateway/protocol/schema.ts`:

```ts
export const SystemEchoParamsSchema = Type.Object(
  { text: NonEmptyString },
  { additionalProperties: false },
);

export const SystemEchoResultSchema = Type.Object(
  { ok: Type.Boolean(), text: NonEmptyString },
  { additionalProperties: false },
);
```

Añadir ambos a `ProtocolSchemas` y exportar los tipos:

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **Validación**

En `src/gateway/protocol/index.ts`, exportar un validador AJV:

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **Comportamiento del servidor**

Añadir un controlador en `src/gateway/server-methods/system.ts`:

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

Regístrelo en `src/gateway/server-methods.ts` (ya combina `systemHandlers`),
luego agregue `"system.echo"` a `METHODS` en `src/gateway/server.ts`.

4. **Regenerar**

```bash
pnpm protocol:check
```

5. **Pruebas + documentación**

Agregue una prueba de servidor en `src/gateway/server.*.test.ts` y note el método en la documentación.

## Comportamiento de la generación de código Swift

El generador Swift emite:

- Un enum `GatewayFrame` con casos `req`, `res`, `event` y `unknown`
- Structs/enums de carga útil fuertemente tipados
- Valores `ErrorCode` y `GATEWAY_PROTOCOL_VERSION`

Los tipos de trama desconocidos se preservan como cargas útiles sin procesar para la compatibilidad futura.

## Control de versiones + compatibilidad

- `PROTOCOL_VERSION` se encuentra en `src/gateway/protocol/schema.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza las discordancias.
- Los modelos Swift mantienen tipos de trama desconocidos para evitar interrumpir a los clientes antiguos.

## Patrones y convenciones de esquemas

- La mayoría de los objetos usan `additionalProperties: false` para cargas útiles estrictas.
- `NonEmptyString` es el valor predeterminado para los ID y nombres de métodos/eventos.
- El `GatewayFrame` de nivel superior utiliza un **discriminador** en `type`.
- Los métodos con efectos secundarios generalmente requieren un `idempotencyKey` en los parámetros
  (ejemplo: `send`, `poll`, `agent`, `chat.send`).
- `agent` acepta una `internalEvents` opcional para el contexto de orquestación generado en tiempo de ejecución
  (por ejemplo, entrega de finalización de tareas de subagente/cron); trate esto como una superficie de API interna.

## JSON de esquema en vivo

El JSON Schema generado está en el repositorio en `dist/protocol.schema.json`. El
archivo sin procesar publicado generalmente está disponible en:

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## Cuando cambia los esquemas

1. Actualice los esquemas de TypeBox.
2. Ejecute `pnpm protocol:check`.
3. Confirme el esquema regenerado + los modelos Swift.

import es from "/components/footer/es.mdx";

<es />
