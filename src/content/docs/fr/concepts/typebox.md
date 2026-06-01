---
summary: "Schémas TypeBox comme source unique de vérité pour le protocole de passerelle"
read_when:
  - Updating protocol schemas or codegen
title: "TypeBox"
---

TypeBox est une bibliothèque de schémas TypeScript-first. Nous l'utilisons pour définir le **protocole WebSocket TypeBoxGateway** (handshake, requête/réponse, événements serveur). Ces schémas pilotent la **validation à l'exécution**, l'**export JSON Schema** et la **génération de code Swift** pour l'application macOS. Une source unique de vérité ; tout le reste est généré.

Si vous souhaitez le contexte de niveau supérieur du protocole, commencez par
l'[architecture du Gateway](/fr/concepts/architecture).

## Modèle mental (30 secondes)

Chaque message WS Gateway est l'un des trois types de trames :

- **Requête** : `{ type: "req", id, method, params }`
- **Réponse** : `{ type: "res", id, ok, payload | error }`
- **Événement** : `{ type: "event", event, payload, seq?, stateVersion? }`

La première trame **doit** être une requête `connect`. Après cela, les clients peuvent appeler
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

Méthodes + événements courants :

| Catégorie      | Exemples                                                   | Notes                                               |
| -------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Cœur           | `connect`, `health`, `status`                              | `connect` doit être en premier                      |
| Messagerie     | `send`, `agent`, `agent.wait`, `system-event`, `logs.tail` | les effets secondaires nécessitent `idempotencyKey` |
| Chat           | `chat.history`, `chat.send`, `chat.abort`                  | WebChat utilise ceux-ci                             |
| Sessions       | `sessions.list`, `sessions.patch`, `sessions.delete`       | admin session                                       |
| Automatisation | `wake`, `cron.list`, `cron.run`, `cron.runs`               | contrôle wake + cron                                |
| Nœuds          | `node.list`, `node.invoke`, `node.pair.*`                  | WS Gateway + actions de nœud                        |
| Événements     | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown`  | push serveur                                        |

L'inventaire de **découverte** publié de manière faisant autorité réside dans
`src/gateway/server-methods-list.ts` (`listGatewayMethods`, `GATEWAY_EVENTS`).

## Où résident les schémas

- Source : `packages/gateway-protocol/src/schema.ts`
- Validateurs d'exécution (AJV) : `packages/gateway-protocol/src/index.ts`
- Registre de fonctionnalités/découverte publié : `src/gateway/server-methods-list.ts`
- Handshake serveur + répartition des méthodes : `src/gateway/server.impl.ts`
- Client Node : `src/gateway/client.ts`
- Schéma JSON généré : `dist/protocol.schema.json`
- Modèles Swift générés : `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## Pipeline actuel

- `pnpm protocol:gen`
  - écrit le Schéma JSON (draft-07) dans `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - génère les modèles de passerelle Swift
- `pnpm protocol:check`
  - exécute les deux générateurs et vérifie que la sortie est validée

## Utilisation des schémas à l'exécution

- **Côté serveur** : chaque trame entrante est validée avec AJV. Le handshake n'accepte
  qu'une requête `connect` dont les paramètres correspondent à `ConnectParams`.
- **Côté client** : le client JS valide les trames d'événement et de réponse avant
  de les utiliser.
- **Découverte de fonctionnalités** : le Gateway envoie une liste `features.methods`
  et `features.events` prudente dans `hello-ok` à partir de `listGatewayMethods()` et
  `GATEWAY_EVENTS`.
- Cette liste de découverte n'est pas une copie générée de chaque assistant pouvant être appelé dans
  `coreGatewayHandlers` ; certains assistants RPC sont implémentés dans
  `src/gateway/server-methods/*.ts` sans être énumérés dans la liste de fonctionnalités
  publiée.

## Exemples de trames

Connexion (premier message) :

```json
{
  "type": "req",
  "id": "c1",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 4,
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
    "protocol": 4,
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
        minProtocol: 4,
        maxProtocol: 4,
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

## Exemple pas à pas : ajouter une méthode de bout en bout

Exemple : ajouter une nouvelle requête `system.echo` qui renvoie `{ ok: true, text }`.

1. **Schéma (source de vérité)**

Ajouter à `packages/gateway-protocol/src/schema.ts` :

```ts
export const SystemEchoParamsSchema = Type.Object({ text: NonEmptyString }, { additionalProperties: false });

export const SystemEchoResultSchema = Type.Object({ ok: Type.Boolean(), text: NonEmptyString }, { additionalProperties: false });
```

Ajouter les deux à `ProtocolSchemas` et exporter les types :

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **Validation**

Dans `packages/gateway-protocol/src/index.ts`, exporter un validateur AJV :

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **Comportement du serveur**

Ajouter un gestionnaire dans `src/gateway/server-methods/system.ts` :

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

L'enregistrer dans `src/gateway/server-methods.ts` (fusionne déjà `systemHandlers`),
puis ajouter `"system.echo"` à l'entrée `listGatewayMethods` dans
`src/gateway/server-methods-list.ts`.

Si la méthode peut être appelée par les opérateurs ou les nœuds clients, la classer également dans
`src/gateway/method-scopes.ts` afin que l'application de la portée et la publicité des fonctionnalités `hello-ok` restent alignées.

4. **Régénérer**

```bash
pnpm protocol:check
```

5. **Tests + documentation**

Ajouter un test serveur dans `src/gateway/server.*.test.ts` et noter la méthode dans la documentation.

## Comportement de la génération de code Swift

Le générateur Swift émet :

- Enum `GatewayFrame` avec les cas `req`, `res`, `event` et `unknown`
- Structures/enums de charge utile fortement typées
- Valeurs `ErrorCode`, `GATEWAY_PROTOCOL_VERSION` et `GATEWAY_MIN_PROTOCOL_VERSION`

Les types de trames inconnus sont conservés sous forme de charges utiles brutes pour assurer la compatibilité ascendante.

## Versionnage + compatibilité

- `PROTOCOL_VERSION` se trouve dans `packages/gateway-protocol/src/version.ts`.
- Les clients envoient `minProtocol` + `maxProtocol` ; le serveur rejette les plages qui
  n'incluent pas leur protocole actuel.
- Les modèles Swift conservent les types de trames inconnus pour éviter de casser les anciens clients.

## Modèles et conventions de schéma

- La plupart des objets utilisent `additionalProperties: false` pour les payloads stricts.
- `NonEmptyString` est la valeur par défaut pour les ID et les noms de méthodes/événements.
- Le `GatewayFrame` de niveau supérieur utilise un **discriminator** sur `type`.
- Les méthodes ayant des effets secondaires nécessitent généralement un `idempotencyKey` dans les paramètres
  (exemple : `send`, `poll`, `agent`, `chat.send`).
- `agent` accepte un `internalEvents` optionnel pour le contexte d'orchestration généré à l'exécution
  (par exemple, le transfert après achèvement de tâche de sous-agent/cron) ; considérez cela comme une surface API interne.

## JSON de schéma en direct

Le schéma JSON généré est dans le dépôt à `dist/protocol.schema.json`. Le
fichier brut publié est généralement disponible à :

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## Lorsque vous modifiez les schémas

1. Mettez à jour les schémas TypeBox.
2. Enregistrez la méthode/l'événement dans `src/gateway/server-methods-list.ts`.
3. Mettez à jour `src/gateway/method-scopes.ts` lorsque le nouveau RPC nécessite une classification de portée opérateur ou
   nœud.
4. Exécutez `pnpm protocol:check`.
5. Validez le schéma régénéré + les modèles Swift.

## Connexes

- [Protocole de sortie riche](/fr/reference/rich-output-protocol)
- [Adaptateurs RPC](/fr/reference/rpc)
