---
summary: "Les schémas TypeBox comme source unique de vérité pour le protocole de la passerelle"
read_when:
  - Mise à jour des schémas de protocole ou de la génération de code
title: "TypeBox"
---

# TypeBox comme source de vérité du protocole

Dernière mise à jour : 2026-01-10

TypeBox est une bibliothèque de schémas centrée sur TypeScript. Nous l'utilisons pour définir le **protocole WebSocket
de la Gateway** (poignée de main, requête/réponse, événements serveur). Ces schémas pilotent la **validation à
l'exécution**, l'**exportation de schémas JSON** et la **génération de code Swift** pour
l'application macOS. Une source unique de vérité ; tout le reste est généré.

Si vous souhaitez comprendre le contexte du protocole de plus haut niveau, commencez par
l'architecture de la Gateway (/en/concepts/architecture).

## Modèle mental (30 secondes)

Chaque message WS Gateway est l'un des trois types de trames :

- **Requête** : `{ type: "req", id, method, params }`
- **Réponse** : `{ type: "res", id, ok, payload | error }`
- **Événement** : `{ type: "event", event, payload, seq?, stateVersion? }`

La première trame **doit** être une requête `connect`. Ensuite, les clients peuvent appeler
des méthodes (ex. `health`, `send`, `chat.send`) et s'abonner à des événements (ex.
`presence`, `tick`, `agent`).

Flux de connexion (minimal) :

```
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

Méthodes courantes + événements :

| Catégorie  | Exemples                                                  | Notes                              |
| --------- | --------------------------------------------------------- | ---------------------------------- |
| Cœur      | `connect`, `health`, `status`                             | `connect` doit être en premier            |
| Messagerie | `send`, `poll`, `agent`, `agent.wait`                     | les effets secondaires nécessitent `idempotencyKey` |
| Chat      | `chat.history`, `chat.send`, `chat.abort`, `chat.inject`  | WebChat les utilise                 |
| Sessions  | `sessions.list`, `sessions.patch`, `sessions.delete`      | administrateur de session                      |
| Nœuds     | `node.list`, `node.invoke`, `node.pair.*`                 | Gateway WS + node actions          |
| Événements    | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown` | push serveur                        |

La liste faisant autorité réside dans `src/gateway/server.ts` (`METHODS`, `EVENTS`).

## Où se trouvent les schémas

- Source : `src/gateway/protocol/schema.ts`
- Validateurs d'exécution (AJV) : `src/gateway/protocol/index.ts`
- Server handshake + method dispatch: `src/gateway/server.ts`
- Node client: `src/gateway/client.ts`
- Generated JSON Schema: `dist/protocol.schema.json`
- Generated Swift models: `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## Pipeline actuel

- `pnpm protocol:gen`
  - writes JSON Schema (draft‑07) to `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - génère les modèles de passerelle Swift
- `pnpm protocol:check`
  - exécute les deux générateurs et vérifie que la sortie est validée

## Comment les schémas sont utilisés à l'exécution

- **Server side**: every inbound frame is validated with AJV. The handshake only
  accepts a `connect` request whose params match `ConnectParams`.
- **Client side**: the JS client validates event and response frames before
  using them.
- **Method surface**: the Gateway advertises the supported `methods` and
  `events` in `hello-ok`.

## Exemples de trames

Connexion (premier message) :

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

Réponse Hello-ok :

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

Requête + réponse :

```json
{ "type": "req", "id": "r1", "method": "health" }
```

```json
{ "type": "res", "id": "r1", "ok": true, "payload": { "ok": true } }
```

Événement :

```json
{ "type": "event", "event": "tick", "payload": { "ts": 1730000000 }, "seq": 12 }
```

## Client minimal (Node.js)

Plus petit flux utile : connexion + santé.

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

## Worked example: add a method end-to-end

Example: add a new `system.echo` request that returns `{ ok: true, text }`.

1. **Schéma (source de vérité)**

Add to `src/gateway/protocol/schema.ts`:

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

Add both to `ProtocolSchemas` and export types:

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **Validation**

In `src/gateway/protocol/index.ts`, export an AJV validator:

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **Comportement du serveur**

Add a handler in `src/gateway/server-methods/system.ts`:

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

Register it in `src/gateway/server-methods.ts` (already merges `systemHandlers`),
then add `"system.echo"` to `METHODS` in `src/gateway/server.ts`.

4. **Régénérer**

```bash
pnpm protocol:check
```

5. **Tests + documentation**

Add a server test in `src/gateway/server.*.test.ts` and note the method in docs.

## Comportement de la génération de code Swift

Le générateur Swift émet :

- `GatewayFrame` enum with `req`, `res`, `event`, and `unknown` cases
- Structures/énumérations de charge utile fortement typées
- `ErrorCode` values and `GATEWAY_PROTOCOL_VERSION`

Les types de trames inconnus sont conservés sous forme de charges utiles brutes pour assurer la compatibilité ascendante.

## Gestion des versions + compatibilité

- `PROTOCOL_VERSION` lives in `src/gateway/protocol/schema.ts`.
- Clients send `minProtocol` + `maxProtocol`; the server rejects mismatches.
- Les modèles Swift conservent les types de trames inconnus pour éviter de casser les anciens clients.

## Modèles et conventions de schémas

- Most objects use `additionalProperties: false` for strict payloads.
- `NonEmptyString` is the default for IDs and method/event names.
- The top-level `GatewayFrame` uses a **discriminator** on `type`.
- Les méthodes avec des effets secondaires nécessitent généralement un `idempotencyKey` dans les paramètres
  (exemple : `send`, `poll`, `agent`, `chat.send`).
- `agent` accepte un `internalEvents` optionnel pour le contexte d'orchestration généré à l'exécution
  (par exemple, transfert après achèvement de tâche de sous-agent/cron) ; traitez cela comme une surface API interne.

## JSON de schéma en direct

Le JSON Schema généré se trouve dans le dépôt à `dist/protocol.schema.json`. Le
fichier brut publié est généralement disponible à l'adresse suivante :

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## Lorsque vous modifiez les schémas

1. Mettez à jour les schémas TypeBox.
2. Exécutez `pnpm protocol:check`.
3. Validez le schéma régénéré + les modèles Swift.

import en from "/components/footer/en.mdx";

<en />
