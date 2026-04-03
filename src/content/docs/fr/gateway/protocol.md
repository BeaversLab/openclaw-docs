---
summary: "Protocole WebSocket Gateway : handshake, trames, versioning"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocole Gateway"
---

# Protocole Gateway (WebSocket)

Le protocole WS Gateway est le **plan de contrôle unique + transport de nœud** pour
OpenClaw. Tous les clients (CLI, interface Web, application macOS, nœuds iOS/Android, nœuds
sans tête) se connectent via WebSocket et déclarent leur **rôle** + leur **portée** lors
du handshake.

## Transport

- WebSocket, trames de texte avec payloads JSON.
- La première trame **doit** être une requête `connect`.

## Handshake (connexion)

Gateway → Client (défi pré-connexion) :

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Client → Gateway :

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway → Client :

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

Lorsqu'un jeton d'appareil est émis, `hello-ok` inclut également :

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### Exemple de nœud

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## Tramage

- **Requête** : `{type:"req", id, method, params}`
- **Réponse** : `{type:"res", id, ok, payload|error}`
- **Événement** : `{type:"event", event, payload, seq?, stateVersion?}`

Les méthodes avec effets secondaires nécessitent des **clés d'idempotence** (voir schéma).

## Rôles + portées

### Rôles

- `operator` = client du plan de contrôle (CLI/interface utilisateur/automatisation).
- `node` = hôte de capacité (caméra/écran/toile/system.run).

### Portées (opérateur)

Portées courantes :

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

La portée de la méthode n'est que la première porte. Certaines commandes slash atteintes via
`chat.send` appliquent des vérifications plus strictes au niveau de la commande par-dessus. Par exemple, les écritures persistantes
`/config set` et `/config unset` nécessitent `operator.admin`.

### Caps/commandes/permissions (nœud)

Les nœuds déclarent les revendications de capacité au moment de la connexion :

- `caps` : catégories de capacités de haut niveau.
- `commands` : liste d'autorisation (allowlist) des commandes pour l'invocation.
- `permissions` : commutateurs granulaires (ex. `screen.record`, `camera.capture`).

Le Gateway traite ces éléments comme des **revendications** et applique les listes d'autorisation côté serveur.

## Présence

- `system-presence` renvoie des entrées indexées par l'identité de l'appareil.
- Les entrées de présence incluent `deviceId`, `roles` et `scopes` afin que les interfaces utilisateur puissent afficher une seule ligne par appareil
  même lorsqu'il se connecte à la fois en tant qu'**opérateur** et **nœud**.

### Méthodes d'assistance de nœud

- Les nœuds peuvent appeler `skills.bins` pour récupérer la liste actuelle des exécutables de compétences
  pour les vérifications d'autorisation automatique.

### Méthodes d'assistance d'opérateur

- Les opérateurs peuvent appeler `tools.catalog` (`operator.read`) pour récupérer le catalogue d'outils d'exécution pour un
  agent. La réponse inclut les outils groupés et les métadonnées de provenance :
  - `source` : `core` ou `plugin`
  - `pluginId` : propriétaire du plugin lorsque `source="plugin"`
  - `optional` : indique si un outil de plugin est facultatif
- Les opérateurs peuvent appeler `tools.effective` (`operator.read`) pour récupérer l'inventaire effectif des outils à l'exécution pour une session.
  - `sessionKey` est requis.
  - La passerelle dérive le contexte d'exécution approuvé de la session côté serveur au lieu d'accepter le contexte d'authentification ou de livraison fourni par l'appelant.
  - La réponse est délimitée à la session et reflète ce que la conversation active peut utiliser maintenant, incluant les outils principaux, de plugin et de channel.

## Approbations d'exécution

- Lorsqu'une requête d'exécution nécessite une approbation, la passerelle diffuse `exec.approval.requested`.
- Les clients opérateurs résolvent en appelant `exec.approval.resolve` (nécessite la portée `operator.approvals`).
- Pour `host=node`, `exec.approval.request` doit inclure `systemRunPlan` (métadonnées de session canoniques `argv`/`cwd`/`rawCommand`). Les requêtes sans `systemRunPlan` sont rejetées.

## Secours de livraison par agent

- Les requêtes `agent` peuvent inclure `deliver=true` pour demander une livraison sortante.
- `bestEffortDeliver=false` conserve un comportement strict : les cibles de livraison non résolues ou internes renvoient `INVALID_REQUEST`.
- `bestEffortDeliver=true` autorise le repli vers une exécution en session uniquement lorsqu'aucune route de livraison externe ne peut être résolue (par exemple pour les sessions internes/webchat ou les configurations multi-canaux ambiguës).

## Gestion des versions

- `PROTOCOL_VERSION` réside dans `src/gateway/protocol/schema.ts`.
- Les clients envoient `minProtocol` + `maxProtocol` ; le serveur rejette les incohérences.
- Les schémas et modèles sont générés à partir des définitions TypeBox :
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Auth

- Si `OPENCLAW_GATEWAY_TOKEN` (ou `--token`) est défini, `connect.params.auth.token`
  doit correspondre, sinon la socket est fermée.
- Après l'appariement, le Gateway émet un **jeton d'appareil** limité au rôle
  et aux portées de la connexion. Il est renvoyé dans `hello-ok.auth.deviceToken` et doit être
  persisté par le client pour les futures connexions.
- Les jetons d'appareil peuvent être révoqués/révoqués via `device.token.rotate` et
  `device.token.revoke` (nécessite la portée `operator.pairing`).
- Les échecs d'auth incluent `error.details.code` ainsi que des indices de récupération :
  - `error.details.canRetryWithDeviceToken` (booléen)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportement du client pour `AUTH_TOKEN_MISMATCH` :
  - Les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton mis en cache par appareil.
  - Si cette nouvelle tentative échoue, les clients doivent arrêter les boucles de reconnexion automatique et afficher des directives pour l'opérateur.

## Identité de l'appareil + appariement

- Les nœuds doivent inclure une identité d'appareil stable (`device.id`) dérivée d'une
  empreinte de paire de clés.
- Les passerelles émettent des jetons par appareil + rôle.
- Les approbations d'appariement sont requises pour les nouveaux ID d'appareil, sauf si l'auto-approbation
  locale est activée.
- Les connexions **locales** incluent le bouclage (loopback) et l'adresse tailnet de l'hôte de la passerelle
  (afin que les liaisons tailnet sur le même hôte puissent toujours être approuvées automatiquement).
- Tous les clients WS doivent inclure l'identité `device` pendant `connect` (opérateur + nœud).
  L'interface de contrôle peut l'omettre uniquement dans ces modes :
  - `gateway.controlUi.allowInsecureAuth=true` pour la compatibilité HTTP non sécurisée localhost uniquement.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (mode brise-glace, dégradation sévère de la sécurité).
- Toutes les connexions doivent signer le nonce `connect.challenge` fourni par le serveur.

### Diagnostics de migration de l'authentification des appareils

Pour les clients hérités qui utilisent toujours le comportement de signature pré-défi, `connect` renvoie désormais
des codes de détail `DEVICE_AUTH_*` sous `error.details.code` avec un `error.details.reason` stable.

Échecs courants de migration :

| Message                     | details.code                     | details.reason           | Signification                                                           |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | Le client a omis `device.nonce` (ou a envoyé une valeur vide).          |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | Le client a signé avec un nonce obsolète ou incorrect.                  |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | La charge utile de la signature ne correspond pas à la charge utile v2. |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | L'horodatage signé est en dehors de la dérive autorisée.                |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` ne correspond pas à l'empreinte de la clé publique.         |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Échec du format ou de la canonicalisation de la clé publique.           |

Cible de migration :

- Attendez toujours `connect.challenge`.
- Signez la charge utile v2 qui inclut le nonce du serveur.
- Envoyez le même nonce dans `connect.params.device.nonce`.
- La charge utile de signature préférée est `v3`, qui lie `platform` et `deviceFamily`
  en plus des champs device/client/role/scopes/token/nonce.
- Les signatures `v2` héritées restent acceptées pour la compatibilité, mais l'épinglage des métadonnées de l'appareil apparié contrôle toujours la stratégie de commande lors de la reconnexion.

## TLS + épinglage

- TLS est pris en charge pour les connexions WS.
- Les clients peuvent éventuellement épingler l'empreinte du certificat de la passerelle (voir la configuration `gateway.tls`
  plus `gateway.remote.tlsFingerprint` ou CLI `--tls-fingerprint`).

## Portée

Ce protocole expose l'**API de passerelle complète** (status, channels, models, chat,
agent, sessions, nodes, approvals, etc.). La surface exacte est définie par les
schémas TypeBox dans `src/gateway/protocol/schema.ts`.
