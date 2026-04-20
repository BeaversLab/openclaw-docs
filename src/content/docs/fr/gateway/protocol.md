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
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

`server`, `features`, `snapshot` et `policy` sont tous requis par le schéma
(`src/gateway/protocol/schema/frames.ts`). `canvasHostUrl` est facultatif. `auth`
rapporte le rôle/portées négociés lorsqu'ils sont disponibles, et inclut `deviceToken`
lorsque la passerelle en émet un.

Lorsqu'aucun jeton d'appareil n'est émis, `hello-ok.auth` peut toujours rapporter les autorisations
négociées :

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
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

Lors du transfert de démarrage approuvé (trusted bootstrap handoff), `hello-ok.auth` peut également inclure des entrées de rôle
bornées supplémentaires dans `deviceTokens` :

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

Pour le flux de démarrage nœud/opérateur intégré, le jeton de nœud principal reste
`scopes: []` et tout jeton d'opérateur transféré reste borné à la liste blanche
d'opérateurs de démarrage (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`). Les vérifications de portée de démarrage restent
préfixées par rôle : les entrées opérateur ne satisfont que les requêtes opérateur, et les rôles
non-opérateurs ont toujours besoin de portées sous leur propre préfixe de rôle.

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

Les méthodes à effets secondaires nécessitent des **clés d'idempotence** (voir schéma).

## Rôles + portées

### Rôles

- `operator` = client du plan de contrôle (CLI/UI/automatisation).
- `node` = hôte de capacités (caméra/écran/toile/system.run).

### Portées (opérateur)

Portées courantes :

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` avec `includeSecrets: true` nécessite `operator.talk.secrets`
(ou `operator.admin`).

Les méthodes RPC de la passerelle enregistrées par le plugin peuvent demander leur propre portée d'opérateur, mais
les préfixes d'administration principale réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) se résolvent toujours à `operator.admin`.

La portée de la méthode n'est que la première porte. Certaines commandes slash atteintes via
`chat.send` appliquent des vérifications plus strictes au niveau de la commande par-dessus. Par exemple, les écritures persistantes
de `/config set` et `/config unset` nécessitent `operator.admin`.

`node.pair.approve` possède également une vérification de portée supplémentaire au moment de l'approbation par-dessus la
portée de méthode de base :

- requêtes sans commande : `operator.pairing`
- requêtes avec des commandes de nœud non-exec : `operator.pairing` + `operator.write`
- requêtes qui incluent `system.run`, `system.run.prepare`, ou `system.which` :
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

Les nœuds déclarent les revendications de capacité au moment de la connexion :

- `caps` : catégories de capacités de haut niveau.
- `commands` : liste d'autorisation des commandes pour l'invocation.
- `permissions` : interrupteurs granulaires (ex. `screen.record`, `camera.capture`).

Le Gateway les traite comme des **revendications** et applique des listes d'autorisation côté serveur.

## Presence

- `system-presence` renvoie des entrées indexées par l'identité de l'appareil.
- Les entrées de présence incluent `deviceId`, `roles`, et `scopes` afin que les interfaces puissent afficher une seule ligne par appareil
  même lorsqu'il se connecte à la fois en tant qu'**opérateur** et **nœud**.

## Familles de méthodes RPC courantes

Cette page n'est pas une vidange complète générée, mais la surface WS publique est plus large
que les exemples de poignée de main/auth ci-dessus. Voici les principales familles de méthodes que le
Gateway expose aujourd'hui.

`hello-ok.features.methods` est une liste de découverte conservatrice créée à partir de `src/gateway/server-methods-list.ts` et des exportations de méthodes de plugin/channel chargées. Traitez-la comme une découverte de fonctionnalités, et non comme une vidange générée de chaque assistant pouvant être appelé implémenté dans `src/gateway/server-methods/*.ts`.

### Système et identité

- `health` renvoie l'instantané d'état de santé de la passerelle mis en cache ou fraîchement sondé.
- `status` renvoie le résumé de la passerelle de style `/status` ; les champs sensibles ne sont inclus que pour les clients opérateurs délimités par le rôle d'administrateur.
- `gateway.identity.get` renvoie l'identité de l'appareil de la passerelle utilisée par les flux de relais et d'appairage.
- `system-presence` renvoie l'instantané de présence actuel pour les appareils opérateurs/nœuds connectés.
- `system-event` ajoute un événement système et peut mettre à jour/diffuser le contexte de présence.
- `last-heartbeat` renvoie le dernier événement de rythme cardiaque (heartbeat) persisté.
- `set-heartbeats` active ou désactive le traitement du rythme cardiaque sur la passerelle.

### Modèles et utilisation

- `models.list` renvoie le catalogue de modèles autorisés au moment de l'exécution.
- `usage.status` renvoie les fenêtres d'utilisation du provider / les résumés du quota restant.
- `usage.cost` renvoie des résumés d'utilisation des coûts agrégés pour une plage de dates.
- `doctor.memory.status` renvoie l'état de préparation de la mémoire vectorielle / de l'incorporation (embedding) pour l'espace de travail de l'agent par défaut actif.
- `sessions.usage` renvoie des résumés d'utilisation par session.
- `sessions.usage.timeseries` renvoie l'utilisation en série chronologique (timeseries) pour une session.
- `sessions.usage.logs` renvoie les entrées du journal d'utilisation pour une session.

### Canaux et assistants de connexion

- `channels.status` renvoie les résumés d'état des canaux/plugins intégrés et groupés.
- `channels.logout` déconnecte un canal/compte spécifique lorsque le canal prend en charge la déconnexion.
- `web.login.start` lance un flux de connexion QR/web pour le provider de canal web actuel compatible QR.
- `web.login.wait` attend que ce flux de connexion QR/web se termine et démarre le canal en cas de succès.
- `push.test` envoie une notification push APNs de test à un nœud iOS enregistré.
- `voicewake.get` renvoie les déclencheurs de mot de réveil stockés.
- `voicewake.set` met à jour les déclencheurs de mot de réveil et diffuse le changement.

### Messagerie et journaux

- `send` est la RPC de livraison sortante directe pour les envois ciblés sur channel/compte/fil en dehors du chat runner.
- `logs.tail` renvoie la fin du fichier journal de la passerelle configurée avec les contrôles curseur/limite et octet maximum.

### Talk et TTS

- `talk.config` renvoie la charge utile de configuration Talk effective ; `includeSecrets` nécessite `operator.talk.secrets` (ou `operator.admin`).
- `talk.mode` définit/diffuse l'état actuel du mode Talk pour les clients WebChat/Control UI.
- `talk.speak` synthétise la parole via le fournisseur de parole Talk actif.
- `tts.status` renvoie l'état d'activation TTS, le fournisseur actif, les fournisseurs de secours et l'état de configuration du fournisseur.
- `tts.providers` renvoie l'inventaire visible des fournisseurs TTS.
- `tts.enable` et `tts.disable` basculent l'état des préférences TTS.
- `tts.setProvider` met à jour le fournisseur TTS préféré.
- `tts.convert` exécute une conversion synthèse vocale unique.

### Secrets, configuration, mise à jour et assistant

- `secrets.reload` résout à nouveau les SecretRefs actifs et échange l'état secret d'exécution uniquement en cas de succès total.
- `secrets.resolve` résout les affectations de secrets de commande cible pour un ensemble commande/cible spécifique.
- `config.get` renvoie l'instantané de configuration actuel et son hachage.
- `config.set` écrit une charge utile de configuration validée.
- `config.patch` fusionne une mise à jour de configuration partielle.
- `config.apply` valide et remplace la charge utile de configuration complète.
- `config.schema` renvoie la charge utile de schéma de configuration en direct utilisée par l'interface de contrôle et les outils CLI : schéma, `uiHints`, version et métadonnées de génération, y compris les métadonnées de schéma de plugin + channel lorsque le runtime peut le charger. Le schéma comprend les métadonnées de champ `title` / `description` dérivées des mêmes étiquettes et textes d'aide que ceux utilisés par l'interface, y compris les branches de composition d'objet imbriqué, de caractère générique, d'élément de tableau et de `anyOf` / `oneOf` / `allOf` lorsque la documentation du champ correspondante existe.
- `config.schema.lookup` renvoie une charge utile de recherche délimitée par un chemin pour un chemin de configuration : chemin normalisé, un nœud de schéma superficiel, indice correspondant + `hintPath`, et résumés enfants immédiats pour le forage de l'interface utilisateur/CLI.
  - Les nœuds de schéma de recherche conservent la documentation orientée utilisateur et les champs de validation courants :
    `title`, `description`, `type`, `enum`, `const`, `format`, `pattern`,
    limites numériques/chaîne/tableau/objet, et indicateurs booléens comme
    `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`.
  - Les résumés enfants exposent `key`, `path` normalisé, `type`, `required`,
    `hasChildren`, ainsi que l'indice `hint` / `hintPath` correspondant.
- `update.run` exécute le flux de mise à jour de la passerelle et planifie un redémarrage uniquement lorsque la mise à jour elle-même a réussi.
- `wizard.start`, `wizard.next`, `wizard.status` et `wizard.cancel` exposent l'assistant d'intégration via WS RPC.

### Familles principales existantes

#### Assistants pour les agents et les espaces de travail

- `agents.list` renvoie les entrées d'agent configurées.
- `agents.create`, `agents.update` et `agents.delete` gèrent les enregistrements d'agents et
  le câblage de l'espace de travail.
- `agents.files.list`, `agents.files.get` et `agents.files.set` gèrent les
  fichiers de l'espace de travail d'amorçage exposés pour un agent.
- `agent.identity.get` renvoie l'identité effective de l'assistant pour un agent ou
  une session.
- `agent.wait` attend qu'une exécution se termine et renvoie l'instantané du terminal lorsqu'il
  est disponible.

#### Contrôle de session

- `sessions.list` renvoie l'index de la session actuelle.
- `sessions.subscribe` et `sessions.unsubscribe` activent/désactivent les abonnements aux événements de
  changement de session pour le client WS actuel.
- `sessions.messages.subscribe` et `sessions.messages.unsubscribe` activent/désactivent
  les abonnements aux événements de transcription/message pour une session.
- `sessions.preview` renvoie des aperçus de transcription bornés pour des clés de
  session spécifiques.
- `sessions.resolve` résout ou canonise une cible de session.
- `sessions.create` crée une nouvelle entrée de session.
- `sessions.send` envoie un message dans une session existante.
- `sessions.steer` est la variante d'interruption et de guidage pour une session active.
- `sessions.abort` abandonne le travail actif pour une session.
- `sessions.patch` met à jour les métadonnées/redéfinitions de session.
- `sessions.reset`, `sessions.delete` et `sessions.compact` effectuent la
  maintenance de session.
- `sessions.get` renvoie la ligne de session stockée complète.
- l'exécution du chat utilise toujours `chat.history`, `chat.send`, `chat.abort` et
  `chat.inject`.
- `chat.history` est normalisé pour l'affichage pour les clients d'interface utilisateur : les balises de directive en ligne sont supprimées du texte visible, les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués) et les jetons de contrôle de modèle ASCII/pleine largeur fuités sont supprimés, les lignes d'assistant de jeton silencieux pur telles que exact `NO_REPLY` / `no_reply` sont omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés.

#### Jumelage d'appareils et jetons d'appareil

- `device.pair.list` renvoie les appareils jumelés en attente et approuvés.
- `device.pair.approve`, `device.pair.reject` et `device.pair.remove` gèrent les enregistrements de jumelage d'appareils.
- `device.token.rotate` fait tourner un jeton d'appareil jumelé dans les limites de son rôle et de sa portée approuvés.
- `device.token.revoke` révoque un jeton d'appareil jumelé.

#### Jumelage de nœud, appel et travail en attente

- `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject` et `node.pair.verify` couvrent le jumelage de nœuds et la vérification du démarrage.
- `node.list` et `node.describe` renvoient l'état des nœuds connus/connectés.
- `node.rename` met à jour une étiquette de nœud jumelé.
- `node.invoke` transmet une commande à un nœud connecté.
- `node.invoke.result` renvoie le résultat pour une demande d'appel.
- `node.event` renvoie les événements d'origine nœud vers la passerelle.
- `node.canvas.capability.refresh` actualise les jetons de capacité de canvas délimités.
- `node.pending.pull` et `node.pending.ack` sont les API de file d'attente de nœuds connectés.
- `node.pending.enqueue` et `node.pending.drain` gèrent le travail en attente durable pour les nœuds hors ligne/déconnectés.

#### Familles d'approbation

- `exec.approval.request`, `exec.approval.get`, `exec.approval.list` et
  `exec.approval.resolve` couvrent les demandes d'approbation d'exécution ponctuelles ainsi que la recherche/relecture des approbations en attente.
- `exec.approval.waitDecision` attend une approbation d'exécution en attente et renvoie
  la décision finale (ou `null` en cas d'expiration du délai).
- `exec.approvals.get` et `exec.approvals.set` gèrent les instantanés de stratégie
  d'approbation d'exécution de la passerelle.
- `exec.approvals.node.get` et `exec.approvals.node.set` gèrent la stratégie d'approbation
  d'exécution locale au nœud via les commandes de relais du nœud.
- `plugin.approval.request`, `plugin.approval.list`,
  `plugin.approval.waitDecision` et `plugin.approval.resolve` couvrent
  les flux d'approbation définis par le plugin.

#### Autres familles majeures

- automatisation :
  - `wake` planifie une injection de texte de réveil immédiate ou au prochain battement de cœur
  - `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`,
    `cron.run`, `cron.runs`
- compétences/outils : `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`

### Familles d'événements courantes

- `chat` : mises à jour du chat de l'interface utilisateur telles que `chat.inject` et autres événements de chat
  destinés uniquement à la transcription.
- `session.message` et `session.tool` : mises à jour de la transcription/du flux d'événements pour
  une session abonnée.
- `sessions.changed` : l'index de session ou les métadonnées ont changé.
- `presence` : mises à jour de l'instantané de présence du système.
- `tick` : événement périodique de maintien de vie / de vivacité.
- `health` : mise à jour de l'instantané de santé de la passerelle.
- `heartbeat` : mise à jour du flux d'événements de battement de cœur.
- `cron` : événement de changement de tâche/exécution cron.
- `shutdown` : notification d'arrêt de la passerelle.
- `node.pair.requested` / `node.pair.resolved` : cycle de vie du jumelage de nœuds.
- `node.invoke.request` : diffusion de la demande d'appel de nœud.
- `device.pair.requested` / `device.pair.resolved` : cycle de vie de l'appareil couplé.
- `voicewake.changed` : configuration du déclencheur du mot d'éveil modifiée.
- `exec.approval.requested` / `exec.approval.resolved` : cycle de vie de l'approbation d'exécution.
- `plugin.approval.requested` / `plugin.approval.resolved` : cycle de vie de l'approbation du plugin.

### Méthodes d'assistance de nœud

- Les nœuds peuvent appeler `skills.bins` pour récupérer la liste actuelle des exécutables de compétences pour les vérifications d'autorisation automatique.

### Méthodes d'assistance d'opérateur

- Les opérateurs peuvent appeler `commands.list` (`operator.read`) pour récupérer l'inventaire des commandes d'exécution pour un agent.
  - `agentId` est optionnel ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - `scope` contrôle quelle surface le `name` principal cible :
    - `text` renvoie le jeton de commande texte principal sans le `/` de tête
    - `native` et le chemin `both` par défaut renvoient des noms natifs conscients du fournisseur lorsque disponibles
  - `textAliases` porte des alias de barre oblique exacts tels que `/model` et `/m`.
  - `nativeName` porte le nom de commande natif conscient du fournisseur lorsqu'il existe.
  - `provider` est optionnel et n'affecte que la dénomination native ainsi que la disponibilité des commandes de plugin natives.
  - `includeArgs=false` omet les métadonnées d'argument sérialisées de la réponse.
- Les opérateurs peuvent appeler `tools.catalog` (`operator.read`) pour récupérer le catalogue d'outils d'exécution pour un agent. La réponse inclut les outils groupés et les métadonnées de provenance :
  - `source` : `core` ou `plugin`
  - `pluginId` : propriétaire du plugin lorsque `source="plugin"`
  - `optional` : indique si un outil de plugin est optionnel
- Les opérateurs peuvent appeler `tools.effective` (`operator.read`) pour récupérer l'inventaire des outils effectifs à l'exécution pour une session.
  - `sessionKey` est requis.
  - La passerelle dérive un contexte d'exécution de confiance à partir de la session côté serveur au lieu d'accepter le contexte d'authentification ou de livraison fourni par l'appelant.
  - La réponse est limitée à la session et reflète ce que la conversation active peut utiliser maintenant, y compris les outils principaux, de plugin et de channel.
- Les opérateurs peuvent appeler `skills.status` (`operator.read`) pour récupérer l'inventaire des compétences visibles pour un agent.
  - `agentId` est facultatif ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - La réponse inclut l'éligibilité, les exigences manquantes, les vérifications de configuration et les options d'installation nettoyées sans exposer les valeurs brutes des secrets.
- Les opérateurs peuvent appeler `skills.search` et `skills.detail` (`operator.read`) pour les métadonnées de découverte ClawHub.
- Les opérateurs peuvent appeler `skills.install` (`operator.admin`) dans deux modes :
  - Mode ClawHub : `{ source: "clawhub", slug, version?, force? }` installe un dossier de compétences dans le répertoire `skills/` de l'espace de travail de l'agent par défaut.
  - Mode installateur Gateway : `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` exécute une action `metadata.openclaw.install` déclarée sur l'hôte de la passerelle.
- Les opérateurs peuvent appeler `skills.update` (`operator.admin`) dans deux modes :
  - Le mode ClawHub met à jour un slug suivi ou toutes les installations ClawHub suivies dans l'espace de travail de l'agent par défaut.
  - Le mode de configuration corrige les valeurs `skills.entries.<skillKey>` telles que `enabled`, `apiKey` et `env`.

## Approbations d'exécution

- Lorsqu'une demande d'exécution nécessite une approbation, la passerelle diffuse `exec.approval.requested`.
- Les clients opérateurs résolvent en appelant `exec.approval.resolve` (nécessite la portée `operator.approvals`).
- Pour `host=node`, `exec.approval.request` doit inclure `systemRunPlan` (métadonnées canoniques `argv`/`cwd`/`rawCommand`/session). Les demandes sans `systemRunPlan` sont rejetées.
- Après approbation, les appels `node.invoke system.run` transmis réutilisent ce `systemRunPlan` canonique comme contexte de commande/cwd/session faisant autorité.
- Si un appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou
  `sessionKey` entre la préparation et la transmission finale approuvée `system.run`, la
  passerelle rejette l'exécution au lieu de faire confiance à la charge utile modifiée.

## Secours de livraison d'agent

- Les demandes `agent` peuvent inclure `deliver=true` pour demander une livraison sortante.
- `bestEffortDeliver=false` conserve un comportement strict : les cibles de livraison non résolues ou uniquement internes renvoient `INVALID_REQUEST`.
- `bestEffortDeliver=true` permet de revenir à une exécution en session uniquement lorsqu'aucune route de livraison externe ne peut être résolue (par exemple, sessions internes/webchat ou configurations multi-canal ambiguës).

## Gestion des versions

- `PROTOCOL_VERSION` se trouve dans `src/gateway/protocol/schema/protocol-schemas.ts`.
- Les clients envoient `minProtocol` + `maxProtocol` ; le serveur rejette les incompatibilités.
- Les schémas et modèles sont générés à partir des définitions TypeBox :
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Constantes client

Le client de référence dans `src/gateway/client.ts` utilise ces valeurs par défaut. Les valeurs sont
stables pour le protocole v3 et constituent la base attendue pour les clients tiers.

| Constante                                                                | Par défaut                                                  | Source                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                                                       | `3`                                                         | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| Délai d'expiration de la demande (par RPC)                               | `30_000` ms                                                 | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| Délai d'expiration de la préauthentification / du défi de connexion      | `10_000` ms                                                 | `src/gateway/handshake-timeouts.ts` (plage `250`–`10_000`) |
| Délai initial de reconnexion                                             | `1_000` ms                                                  | `src/gateway/client.ts` (`backoffMs`)                      |
| Délai maximal de reconnexion                                             | `30_000` ms                                                 | `src/gateway/client.ts` (`scheduleReconnect`)              |
| Limite de nouvelle tentative rapide après fermeture par jeton d'appareil | `250` ms                                                    | `src/gateway/client.ts`                                    |
| Délai de grâce avant l'arrêt forcé `terminate()`                         | `250` ms                                                    | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| Délai d'expiration par défaut `stopAndWait()`                            | `1_000` ms                                                  | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| Intervalle de tick par défaut (pré `hello-ok`)                           | `30_000` ms                                                 | `src/gateway/client.ts`                                    |
| Fermeture pour expiration du tick                                        | code `4000` lorsque le silence dépasse `tickIntervalMs * 2` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                                                      | `25 * 1024 * 1024` (25 Mo)                                  | `src/gateway/server-constants.ts`                          |

Le serveur annonce les `policy.tickIntervalMs`, `policy.maxPayload`
et `policy.maxBufferedBytes` effectifs dans `hello-ok` ; les clients doivent respecter ces valeurs
plutôt que les valeurs par défaut pré-poignée de main.

## Auth

- L'authentification de passerelle par secret partagé utilise `connect.params.auth.token` ou
  `connect.params.auth.password`, selon le mode d'authentification configuré.
- Les modes porteurs d'identité tels que Tailscale Serve
  (`gateway.auth.allowTailscale: true`) ou `gateway.auth.mode: "trusted-proxy"` non-boucle
  satisfont la vérification d'authentification de connexion à partir de
  en-têtes de requête au lieu de `connect.params.auth.*`.
- Le `gateway.auth.mode: "none"` d'entrée privée ignore entièrement l'authentification de connexion par secret partagé
  ; n'exposez pas ce mode sur une entrée publique/non fiable.
- Après l'appairage, le Gateway émet un **jeton d'appareil** délimité au rôle de connexion
  - aux portées. Il est renvoyé dans `hello-ok.auth.deviceToken` et doit être
    persisté par le client pour les connexions futures.
- Les clients doivent conserver le `hello-ok.auth.deviceToken` principal après toute
  connexion réussie.
- La reconnexion avec ce jeton d'appareil **stocké** doit également réutiliser l'ensemble
  des portées approuvées stockées pour ce jeton. Cela préserve l'accès lecture/sondage/statut
  qui a déjà été accordé et évite de réduire silencieusement les reconnexions à une
  portée implicite plus étroite réservée aux administrateurs.
- Assemblage de l'authentification de connexion côté client (`selectConnectAuth` dans
  `src/gateway/client.ts`) :
  - `auth.password` est orthogonal et est toujours transmis lorsqu'il est défini.
  - `auth.token` est rempli par ordre de priorité : d'abord le jeton partagé explicite,
    puis un `deviceToken` explicite, puis un jeton stocké par appareil (indexé par
    `deviceId` + `role`).
  - `auth.bootstrapToken` n'est envoyé que si aucun des éléments ci-dessus n'a résolu de
    `auth.token`. Un jeton partagé ou tout jeton d'appareil résolu le supprime.
  - La promotion automatique d'un jeton d'appareil stocké lors de la tentative
    unique de réessai `AUTH_TOKEN_MISMATCH` est limitée aux **points de terminaison de confiance uniquement** —
    bouclage, ou `wss://` avec un `tlsFingerprint` épinglé. Les `wss://` publics
    sans épinglage ne sont pas éligibles.
- Les entrées `hello-ok.auth.deviceTokens` supplémentaires sont des jetons de transfert d'amorçage.
  Ne les conservez que lorsque la connexion utilise une authentification d'amorçage sur un transport de confiance
  tel que `wss://` ou un appariement bouclage/local.
- Si un client fournit un `deviceToken` **explicite** ou un `scopes` explicite, cet
  ensemble de portées demandé par l'appelant reste autoritaire ; les portées mises en cache ne sont
  réutilisées que lorsque le client réutilise le jeton stocké par appareil.
- Les jetons d'appareil peuvent être révoqués/rotatifs via `device.token.rotate` et
  `device.token.revoke` (nécessite la portée `operator.pairing`).
- L'émission/la rotation des jetons reste limitée à l'ensemble de rôles approuvés enregistré dans
  l'entrée d'appariement de cet appareil ; la rotation d'un jeton ne peut pas étendre l'appareil à un
  rôle que l'approbation d'appariement n'a jamais accordé.
- Pour les sessions de jetons d'appareils couplés, la gestion des appareils est de portée personnelle, sauf si l'appelant dispose également de `operator.admin` : les appelants non-administrateurs peuvent supprimer/révoquer/faire pivoter uniquement leur propre entrée d'appareil.
- `device.token.rotate` vérifie également l'ensemble des portées d'opérateur demandées par rapport aux portées de session actuelles de l'appelant. Les appelants non-administrateurs ne peuvent pas faire pivoter un jeton vers un ensemble de portées d'opérateur plus large que celui qu'ils possèdent déjà.
- Les échecs d'authentification incluent `error.details.code` ainsi que des conseils de récupération :
  - `error.details.canRetryWithDeviceToken` (booléen)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportement du client pour `AUTH_TOKEN_MISMATCH` :
  - Les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton mis en cache par appareil.
  - Si cette nouvelle tentative échoue, les clients doivent arrêter les boucles de reconnexion automatique et présenter des conseils d'action pour l'opérateur.

## Identité de l'appareil + couplage

- Les nœuds doivent inclure une identité d'appareil stable (`device.id`) dérivée d'une empreinte de paire de clés.
- Les passerelles émettent des jetons par appareil + rôle.
- Les approbations de couplage sont requises pour les nouveaux ID d'appareil, sauf si l'auto-approbation locale est activée.
- L'auto-approbation du couplage est centrée sur les connexions en boucle locale directe.
- OpenClaw dispose également d'un chemin étroit de connexion locale backend/conteneur pour les flux d'assistance de secret partagé de confiance.
- Les connexions tailnet ou LAN sur le même hôte sont toujours traitées comme distantes pour le couplage et nécessitent une approbation.
- Tous les clients WS doivent inclure l'identité `device` pendant `connect` (opérateur + nœud).
  L'interface de contrôle peut l'omettre uniquement dans ces modes :
  - `gateway.controlUi.allowInsecureAuth=true` pour la compatibilité HTTP non sécurisée localhost uniquement.
  - authentification réussie de l'interface de contrôle de l'opérateur `gateway.auth.mode: "trusted-proxy"`.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass, dégradation de sécurité grave).
- Toutes les connexions doivent signer le nonce `connect.challenge` fourni par le serveur.

### Diagnostics de migration de l'authentification de l'appareil

Pour les clients hérités qui utilisent toujours le comportement de signature pré-défi, `connect` renvoie désormais
des codes de détail `DEVICE_AUTH_*` sous `error.details.code` avec un `error.details.reason` stable.

Échecs de migration courants :

| Message                     | details.code                     | details.reason           | Signification                                                           |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | Le client a omis `device.nonce` (ou a envoyé une valeur vide).          |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | Le client a signé avec un nonce obsolète/incorrect.                     |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | La charge utile de la signature ne correspond pas à la charge utile v2. |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | L'horodatage signé est en dehors de la dérive autorisée.                |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` ne correspond pas à l'empreinte de la clé publique.         |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Le format ou la canonisation de la clé publique a échoué.               |

Cible de migration :

- Attendez toujours `connect.challenge`.
- Signez la charge utile v2 qui inclut le nonce du serveur.
- Envoyez le même nonce dans `connect.params.device.nonce`.
- La charge utile de signature préférée est `v3`, qui lie `platform` et `deviceFamily`
  en plus des champs device/client/role/scopes/token/nonce.
- Les signatures `v2` héritées restent acceptées pour la compatibilité, mais l'épinglage des métadonnées des appareils associés contrôle toujours la stratégie de commande lors de la reconnexion.

## TLS + épinglage

- TLS est pris en charge pour les connexions WS.
- Les clients peuvent éventuellement épingler l'empreinte du certificat de passerelle (voir la configuration `gateway.tls`
  ainsi que `gateway.remote.tlsFingerprint` ou le CLI `--tls-fingerprint`).

## Scope

Ce protocole expose l'**API de passerelle complète** (statut, canaux, modèles, chat,
agent, sessions, nœuds, approbations, etc.). La surface exacte est définie par les
schémas TypeBox dans `src/gateway/protocol/schema.ts`.
