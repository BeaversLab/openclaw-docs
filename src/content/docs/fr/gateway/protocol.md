---
summary: "Protocole WebSocket du Gateway : poignée de main, trames, gestion des versions"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocole du Gateway"
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

Pendant le transfert de l'amorçage de confiance, `hello-ok.auth` peut également inclure des entrées de rôle limitées supplémentaires dans `deviceTokens` :

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

Pour le flux d'amorçage nœud/opérateur intégré, le jeton de nœud principal reste
`scopes: []` et tout jeton d'opérateur transféré reste limité à la liste d'autorisation de l'opérateur d'amorçage (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`). Les vérifications de portée d'amorçage restent
préfixées par rôle : les entrées d'opérateur ne satisfont que les requêtes d'opérateur, et les rôles non opérateurs ont toujours besoin de portées sous leur propre préfixe de rôle.

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

Les méthodes avec effets secondaires nécessitent des **clés d'idempotence** (voir le schéma).

## Rôles et portées

### Rôles

- `operator` = client du plan de contrôle (CLI/UI/automatisation).
- `node` = hôte de capacité (caméra/écran/canvas/system.run).

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

Les méthodes de RPC de passerelle enregistrées par le plugin peuvent demander leur propre portée d'opérateur, mais
les préfixes d'administrateur principal réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) sont toujours résolus en `operator.admin`.

La portée de la méthode n'est que la première porte. Certaines commandes slash atteintes via
`chat.send` appliquent des vérifications plus strictes au niveau de la commande par-dessus. Par exemple, les écritures persistantes
`/config set` et `/config unset` nécessitent `operator.admin`.

`node.pair.approve` possède également une vérification de portée supplémentaire au moment de l'approbation par-dessus la
portée de méthode de base :

- requêtes sans commande : `operator.pairing`
- requêtes avec des commandes de nœud non-exec : `operator.pairing` + `operator.write`
- requêtes qui incluent `system.run`, `system.run.prepare`, ou `system.which` :
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

Les nœuds déclarent les revendications de capacité au moment de la connexion :

- `caps` : catégories de capacités de haut niveau.
- `commands` : liste d'autorisation des commandes pour l'appel (invoke).
- `permissions` : bascules granulaires (ex. `screen.record`, `camera.capture`).

Le Gateway traite celles-ci comme des **revendications** et applique des listes d'autorisation côté serveur.

## Presence

- `system-presence` renvoie des entrées indexées par l'identité de l'appareil.
- Les entrées de présence incluent `deviceId`, `roles` et `scopes` afin que les interfaces puissent afficher une seule ligne par appareil
  même lorsqu'il se connecte à la fois en tant qu'**opérateur** et **nœud**.

## Familles de méthodes RPC courantes

Cette page n'est pas une sauvegarde complète générée, mais la surface WS publique est plus large
que les exemples de poignée de main/d'auth ci-dessus. Voici les principales familles de méthodes que le
Gateway expose aujourd'hui.

`hello-ok.features.methods` est une liste de découverte conservatrice construite à partir de
`src/gateway/server-methods-list.ts` plus les exportations de méthodes de plugin/channel chargés.
Traitez-la comme une découverte de fonctionnalités, et non comme une sauvegarde générée de chaque assistant appelable
implémenté dans `src/gateway/server-methods/*.ts`.

### Système et identité

- `health` renvoie l'instantané de santé de la passerelle en cache ou fraîchement sondé.
- `status` renvoie le résumé de passerelle de style `/status` ; les champs sensibles ne sont inclus que pour les clients opérateurs avec une portée administrateur.
- `gateway.identity.get` renvoie l'identité de l'appareil de passerelle utilisée par les flux de relais et d'appairage.
- `system-presence` renvoie l'instantané de présence actuel pour les appareils opérateurs/nœuds connectés.
- `system-event` ajoute un événement système et peut mettre à jour/diffuser le contexte de présence.
- `last-heartbeat` renvoie le dernier événement de heartbeat persisté.
- `set-heartbeats` active/désactive le traitement du heartbeat sur la passerelle.

### Modèles et utilisation

- `models.list` renvoie le catalogue de modèles autorisés lors de l'exécution.
- `usage.status` renvoie les résumés des fenêtres d'utilisation/quota restant du fournisseur.
- `usage.cost` renvoie les résumés d'utilisation des coûts agrégés pour une plage de dates.
- `doctor.memory.status` renvoie l'état de préparation de la mémoire vectorielle / de l'incorporation pour l'espace de travail de l'agent par défaut actif.
- `sessions.usage` renvoie les résumés d'utilisation par session.
- `sessions.usage.timeseries` renvoie l'utilisation des séries temporelles pour une session.
- `sessions.usage.logs` renvoie les entrées du journal d'utilisation pour une session.

### Canaux et assistants de connexion

- `channels.status` renvoie les résumés d'état des canaux/plugins intégrés + groupés.
- `channels.logout` déconnecte un canal/compte spécifique lorsque le canal prend en charge la déconnexion.
- `web.login.start` lance un flux de connexion QR/Web pour le fournisseur de canal Web actuel compatible QR.
- `web.login.wait` attend que ce flux de connexion QR/Web se termine et lance le canal en cas de succès.
- `push.test` envoie une notification push test APNs à un nœud iOS enregistré.
- `voicewake.get` renvoie les déclencheurs de mot de réveil stockés.
- `voicewake.set` met à jour les déclencheurs de mot de réveil et diffuse la modification.

### Messagerie et journaux

- `send` est le RPC de livraison sortante directe pour les envois ciblés sur canal/compte/fil en dehors du runner de chat.
- `logs.tail` renvoie la fin du fichier-journal de passerelle configurée avec les contrôles curseur/limite et octets max.

### Talk et TTS

- `talk.config` renvoie la charge utile de configuration Talk effective ; `includeSecrets` nécessite `operator.talk.secrets` (ou `operator.admin`).
- `talk.mode` définit/diffuse l'état actuel du mode Talk pour les clients WebChat/UI de contrôle.
- `talk.speak` synthétise la parole via le fournisseur de parole Talk actif.
- `tts.status` renvoie l'état d'activation TTS, le fournisseur actif, les fournisseurs de secours et l'état de configuration du fournisseur.
- `tts.providers` renvoie l'inventaire visible des fournisseurs TTS.
- `tts.enable` et `tts.disable` basculent l'état des préférences TTS.
- `tts.setProvider` met à jour le fournisseur TTS préféré.
- `tts.convert` exécute une conversion ponctuelle texte vers parole.

### Secrets, configuration, mise à jour et assistant

- `secrets.reload` résout à nouveau les SecretRefs actifs et échange l'état des secrets d'exécution uniquement en cas de succès complet.
- `secrets.resolve` résout les affectations de secrets commande-cible pour un ensemble commande/cible spécifique.
- `config.get` renvoie l'instantané et le hachage de la configuration actuelle.
- `config.set` écrit une charge utile de configuration validée.
- `config.patch` fusionne une mise à jour partielle de la configuration.
- `config.apply` valide et remplace la charge utile complète de la configuration.
- `config.schema` renvoie la charge utile du schéma de configuration en direct utilisée par l'UI de contrôle et les outils CLI : schéma, `uiHints`, version et métadonnées de génération, y compris les métadonnées de schéma de plugin + channel lorsque le runtime peut les charger. Le schéma comprend des métadonnées de champ `title` / `description` dérivées des mêmes étiquettes et textes d'aide utilisés par l'UI, y compris les branches de composition d'objet imbriqué, de caractère générique, d'élément de tableau et `anyOf` / `oneOf` / `allOf` lorsque la documentation de champ correspondante existe.
- `config.schema.lookup` renvoie une charge utile de recherche délimitée par un chemin pour un chemin de configuration : chemin normalisé, un nœud de schéma superficiel, indice correspondant + `hintPath`, et résumés enfants immédiats pour l'exploration UI/CLI.
  - Les nœuds de schéma de recherche conservent la documentation utilisateur et les champs de validation courants : `title`, `description`, `type`, `enum`, `const`, `format`, `pattern`, limites numériques/chaîne/tableau/objet, et indicateurs booléens comme `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`.
  - Les résumés enfants exposent `key`, `path` normalisé, `type`, `required`, `hasChildren`, ainsi que l'`hint` correspondant / `hintPath`.
- `update.run` exécute le flux de mise à jour de la passerelle et planifie un redémarrage uniquement lorsque la mise à jour elle-même a réussi.
- `wizard.start`, `wizard.next`, `wizard.status` et `wizard.cancel` exposent l'assistant d'intégration via WS RPC.

### Familles majeures existantes

#### Assistants pour les agents et les espaces de travail

- `agents.list` renvoie les entrées d'agent configurées.
- `agents.create`, `agents.update` et `agents.delete` gèrent les enregistrements d'agents et le câblage de l'espace de travail.
- `agents.files.list`, `agents.files.get` et `agents.files.set` gèrent les fichiers d'espace de travail d'amorçage exposés pour un agent.
- `agent.identity.get` renvoie l'identité effective de l'assistant pour un agent ou une session.
- `agent.wait` attend la fin d'une exécution et renvoie l'instantané terminal lorsqu'il est disponible.

#### Contrôle de session

- `sessions.list` renvoie l'index de la session actuelle.
- `sessions.subscribe` et `sessions.unsubscribe` activent/désactivent les abonnements aux événements de changement de session pour le client WS actuel.
- `sessions.messages.subscribe` et `sessions.messages.unsubscribe` activent/désactivent les abonnements aux événements de transcription/message pour une session.
- `sessions.preview` renvoie des aperçus de transcription bornés pour des clés de session spécifiques.
- `sessions.resolve` résout ou canonise une cible de session.
- `sessions.create` crée une nouvelle entrée de session.
- `sessions.send` envoie un message dans une session existante.
- `sessions.steer` est la variante interrompre-et-diriger pour une session active.
- `sessions.abort` abandonne le travail en cours pour une session.
- `sessions.patch` met à jour les métadonnées/remplacements de session.
- `sessions.reset`, `sessions.delete` et `sessions.compact` effectuent la maintenance de session.
- `sessions.get` renvoie la ligne de session stockée complète.
- l'exécution du chat utilise toujours `chat.history`, `chat.send`, `chat.abort` et `chat.inject`.
- `chat.history` est normalisé pour l'affichage pour les clients d'interface utilisateur : les balises de directive en ligne sont supprimées du texte visible, les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel d'outil tronqués) et les jetons de contrôle de modèle ASCII/pleine largeur fuyants sont supprimés, les lignes d'assistant de jeton silencieux pur telles que `NO_REPLY` / `no_reply` exacts sont omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés.

#### Appareillage d'appareils et jetons d'appareil

- `device.pair.list` renvoie les appareils appariés en attente et approuvés.
- `device.pair.approve`, `device.pair.reject` et `device.pair.remove` gèrent les enregistrements d'appareillage d'appareils.
- `device.token.rotate` fait tourner un jeton d'appareil apparié dans ses limites de rôle et de portée approuvées.
- `device.token.revoke` révoque un jeton d'appareil apparié.

#### Appariement de nœuds, appel et travail en attente

- `node.pair.request`, `node.pair.list`, `node.pair.approve`,
  `node.pair.reject` et `node.pair.verify` couvrent l'appariement des nœuds et la vérification du bootstrap.
- `node.list` et `node.describe` renvoient l'état des nœuds connus/connectés.
- `node.rename` met à jour l'étiquette d'un nœud apparié.
- `node.invoke` transfère une commande à un nœud connecté.
- `node.invoke.result` renvoie le résultat d'une demande d'appel.
- `node.event` transporte les événements d'origine du nœud vers la passerelle.
- `node.canvas.capability.refresh` actualise les jetons de capacité de portée avec périmètre.
- `node.pending.pull` et `node.pending.ack` sont les API de file d'attente des nœuds connectés.
- `node.pending.enqueue` et `node.pending.drain` gèrent le travail en attente durable
  pour les nœuds hors ligne/déconnectés.

#### Familles d'approbation

- `exec.approval.request` et `exec.approval.resolve` couvrent les demandes d'approbation
  d'exécution ponctuelle.
- `exec.approval.waitDecision` attend une approbation d'exécution en attente et renvoie
  la décision finale (ou `null` en cas d'expiration du délai).
- `exec.approvals.get` et `exec.approvals.set` gèrent les instantanés de stratégie
  d'approbation d'exécution de la passerelle.
- `exec.approvals.node.get` et `exec.approvals.node.set` gèrent la stratégie d'approbation
  d'exécution locale au nœud via les commandes de relais du nœud.
- `plugin.approval.request`, `plugin.approval.waitDecision` et
  `plugin.approval.resolve` couvrent les flux d'approbation définis par les plugins.

#### Autres familles principales

- automatisation :
  - `wake` planifie une injection de texte de réveil immédiate ou au prochain battement
  - `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`,
    `cron.run`, `cron.runs`
- compétences/outils : `skills.*`, `tools.catalog`, `tools.effective`

### Familles d'événements courantes

- `chat` : mises à jour de chat de l'interface utilisateur telles que `chat.inject` et autres événements de chat limités à la transcription.
- `session.message` et `session.tool` : mises à jour de la transcription/du flux d'événements pour une session abonnée.
- `sessions.changed` : l'index de session ou les métadonnées ont changé.
- `presence` : mises à jour de l'instantané de présence système.
- `tick` : événement périodique de keepalive / de vérification de vie.
- `health` : mise à jour de l'instantané de santé de la passerelle.
- `heartbeat` : mise à jour du flux d'événements de heartbeat.
- `cron` : événement de changement de tâche/exécution cron.
- `shutdown` : notification d'arrêt de la passerelle.
- `node.pair.requested` / `node.pair.resolved` : cycle de vie du jumelage de nœuds.
- `node.invoke.request` : diffusion de la demande d'appel de nœud.
- `device.pair.requested` / `device.pair.resolved` : cycle de vie de l'appareil jumelé.
- `voicewake.changed` : la configuration du déclencheur par mot de réveil a changé.
- `exec.approval.requested` / `exec.approval.resolved` : cycle de vie de l'approbation d'exécution.
- `plugin.approval.requested` / `plugin.approval.resolved` : cycle de vie de l'approbation de plugin.

### Méthodes auxiliaires de nœud

- Les nœuds peuvent appeler `skills.bins` pour récupérer la liste actuelle des exécutables de compétences pour les vérifications d'auto-autorisation.

### Méthodes auxiliaires d'opérateur

- Les opérateurs peuvent appeler `tools.catalog` (`operator.read`) pour récupérer le catalogue d'outils d'exécution pour un agent. La réponse inclut les outils groupés et les métadonnées de provenance :
  - `source` : `core` ou `plugin`
  - `pluginId` : propriétaire du plugin lorsque `source="plugin"`
  - `optional` : indique si un outil de plugin est optionnel
- Les opérateurs peuvent appeler `tools.effective` (`operator.read`) pour récupérer l'inventaire d'outils effectif à l'exécution pour une session.
  - `sessionKey` est requis.
  - La passerelle dérive un contexte d'exécution de confiance à partir de la session côté serveur au lieu d'accepter le contexte d'authentification ou de livraison fourni par l'appelant.
  - La réponse est limitée à la session et reflète ce que la conversation active peut utiliser maintenant,
    y compris les outils principaux, de plugin et de channel.
- Les opérateurs peuvent appeler `skills.status` (`operator.read`) pour récupérer l'inventaire
  de compétences visible pour un agent.
  - `agentId` est facultatif ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - La réponse inclut l'éligibilité, les prérequis manquants, les vérifications de configuration et
    les options d'installation assainies sans exposer les valeurs brutes des secrets.
- Les opérateurs peuvent appeler `skills.search` et `skills.detail` (`operator.read`) pour
  les métadonnées de découverte ClawHub.
- Les opérateurs peuvent appeler `skills.install` (`operator.admin`) en deux modes :
  - Mode ClawHub : `{ source: "clawhub", slug, version?, force? }` installe un
    dossier de compétences dans le répertoire de l'espace de travail de l'agent par défaut `skills/`.
  - Mode installateur Gateway : `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    exécute une action `metadata.openclaw.install` déclarée sur l'hôte de la passerelle.
- Les opérateurs peuvent appeler `skills.update` (`operator.admin`) en deux modes :
  - Le mode ClawHub met à jour un slug suivi ou toutes les installations ClawHub suivies dans
    l'espace de travail de l'agent par défaut.
  - Le mode Config modifie les valeurs `skills.entries.<skillKey>` telles que `enabled`,
    `apiKey` et `env`.

## Approbations d'exécution

- Lorsqu'une demande d'exécution nécessite une approbation, la passerelle diffuse `exec.approval.requested`.
- Les clients opérateurs résolvent en appelant `exec.approval.resolve` (nécessite la portée `operator.approvals`).
- Pour `host=node`, `exec.approval.request` doit inclure `systemRunPlan` (métadonnées canoniques `argv`/`cwd`/`rawCommand`/session). Les demandes sans `systemRunPlan` sont rejetées.
- Après approbation, les appels `node.invoke system.run` transférés réutilisent ce `systemRunPlan`
  canonique comme contexte de commande/répertoire/session faisant autorité.
- Si un appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou
  `sessionKey` entre la préparation et la réexpédition finale approuvée de `system.run`, la
  passerelle rejette l'exécution au lieu de faire confiance à la charge utile modifiée.

## Mode de secours pour la livraison d'agent

- Les requêtes `agent` peuvent inclure `deliver=true` pour demander une livraison sortante.
- `bestEffortDeliver=false` conserve un comportement strict : les cibles de livraison non résolues ou internes uniquement renvoient `INVALID_REQUEST`.
- `bestEffortDeliver=true` permet un repli vers une exécution en session uniquement lorsqu'aucune route livrable externe ne peut être résolue (par exemple pour les sessions internes/webchat ou les configurations multi-canaux ambiguës).

## Gestion des versions

- `PROTOCOL_VERSION` réside dans `src/gateway/protocol/schema.ts`.
- Les clients envoient `minProtocol` + `maxProtocol` ; le serveur rejette les incohérences.
- Les schémas et modèles sont générés à partir des définitions TypeBox :
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Authentification

- L'authentification de passerelle par secret partagé utilise `connect.params.auth.token` ou
  `connect.params.auth.password`, selon le mode d'authentification configuré.
- Les modes porteurs d'identité tels que Tailscale Serve
  (`gateway.auth.allowTailscale: true`) ou `gateway.auth.mode: "trusted-proxy"` non-boucle
  satisfont la vérification d'authentification de connexion à partir des
  en-têtes de requête au lieu de `connect.params.auth.*`.
- Le `gateway.auth.mode: "none"` à entrée privée ignore totalement l'authentification de
  connexion par secret partagé ; n'exposez pas ce mode sur une entrée publique/non fiable.
- Après l'appairage, le Gateway émet un **jeton d'appareil** délimité au rôle + portées de la
  connexion. Il est renvoyé dans `hello-ok.auth.deviceToken` et doit être
  persisté par le client pour les connexions futures.
- Les clients doivent persister le `hello-ok.auth.deviceToken` principal après toute
  connexion réussie.
- La reconnexion avec ce jeton d'appareil **stocké** doit également réutiliser l'ensemble de portées approuvées stockées pour ce jeton. Cela préserve l'accès en lecture/probe/état qui a déjà été accordé et évite de réduire silencieusement les reconnexions à une portée implicite plus restreinte, réservée aux administrateurs.
- La priorité normale de l'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton stocké par appareil, puis le jeton d'amorçage.
- Les entrées `hello-ok.auth.deviceTokens` supplémentaires sont des jetons de transfert d'amorçage. Ne les conservez que lorsque la connexion a utilisé une authentification d'amorçage sur un transport de confiance tel que `wss://` ou un appariement en boucle/locale.
- Si un client fournit un `deviceToken` **explicite** ou un `scopes` explicite, cet ensemble de portées demandé par l'appelant reste autoritaire ; les portées mises en cache ne sont réutilisées que lorsque le client réutilise le jeton stocké par appareil.
- Les jetons d'appareil peuvent être rotatifs/révoqués via `device.token.rotate` et `device.token.revoke` (nécessite la portée `operator.pairing`).
- L'émission/la rotation des jetons reste limitée à l'ensemble de rôles approuvés enregistré dans l'entrée d'appariement de cet appareil ; la rotation d'un jeton ne peut pas étendre l'appareil à un rôle que l'approbation d'appariement n'a jamais accordé.
- Pour les sessions de jeton d'appareil apparié, la gestion des appareils est auto-portée, sauf si l'appelant dispose également de `operator.admin` : les appelants non-administrateurs ne peuvent supprimer/révoquer/faire pivoter que leur **propre** entrée d'appareil.
- `device.token.rotate` vérifie également l'ensemble de portées d'opérateur demandé par rapport aux portées de session actuelles de l'appelant. Les appelants non-administrateurs ne peuvent pas faire pivoter un jeton vers un ensemble de portées d'opérateur plus large que celui qu'ils possèdent déjà.
- Les échecs d'authentification incluent `error.details.code` ainsi que des conseils de récupération :
  - `error.details.canRetryWithDeviceToken` (booléen)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportement du client pour `AUTH_TOKEN_MISMATCH` :
  - Les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton par appareil mis en cache.
  - Si cette nouvelle tentative échoue, les clients doivent arrêter les boucles de reconnexion automatique et présenter des directives d'action pour l'opérateur.

## Identité de l'appareil + appairage

- Les nœuds doivent inclure une identité d'appareil stable (`device.id`) dérivée de
  l'empreinte digitale d'une paire de clés.
- Les passerelles émettent des jetons par appareil + rôle.
- Les approbations d'appairage sont requises pour les nouveaux IDs d'appareil, sauf si l'auto-approbation
  locale est activée.
- L'auto-approbation de l'appairage est centrée sur les connexions en boucle locale directe (local loopback).
- OpenClaw dispose également d'un chemin étroit de connexion autonome backend/conteneur local pour
  les flux auxiliaires de secret partagé de confiance.
- Les connexions tailnet ou LAN sur le même hôte sont toujours traitées comme distantes pour l'appairage et
  nécessitent une approbation.
- Tous les clients WS doivent inclure l'identité `device` lors du `connect` (opérateur + nœud).
  L'interface de contrôle (Control UI) peut l'omettre uniquement dans ces modes :
  - `gateway.controlUi.allowInsecureAuth=true` pour la compatibilité HTTP non sécurisée localhost uniquement.
  - authentification réussie de l'interface de contrôle (Control UI) de l'opérateur `gateway.auth.mode: "trusted-proxy"`.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (bris de glace, dégradation sévère de la sécurité).
- Toutes les connexions doivent signer le nonce `connect.challenge` fourni par le serveur.

### Diagnostics de migration de l'authentification de l'appareil

Pour les clients hérités qui utilisent encore le comportement de signature pré-défi (pre-challenge), `connect` renvoie désormais
des codes de détail `DEVICE_AUTH_*` sous `error.details.code` avec un `error.details.reason` stable.

Échecs courants de migration :

| Message                     | details.code                     | details.reason           | Signification                                                           |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | Le client a omis `device.nonce` (ou a envoyé une valeur vide).          |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | Le client a signé avec un nonce périmé/incorrect.                       |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | La charge utile de la signature ne correspond pas à la charge utile v2. |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | L'horodatage signé est en dehors de la tolérance autorisée.             |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` ne correspond pas à l'empreinte de la clé publique.         |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Échec du formatage ou de la canonicalisation de la clé publique.        |

Cible de migration :

- Attendez toujours `connect.challenge`.
- Signez la charge utile v2 qui inclut le nonce du serveur.
- Envoyez le même nonce dans `connect.params.device.nonce`.
- La charge utile de signature préférée est `v3`, qui lie `platform` et `deviceFamily`
  en plus des champs appareil/client/rôle/portées/jeton/nonce.
- Les signatures `v2` héritées restent acceptées pour compatibilité, mais l'épinglage
  des métadonnées de l'appareil couplé contrôle toujours la stratégie de commande lors de la reconnexion.

## TLS + épinglage

- TLS est pris en charge pour les connexions WS.
- Les clients peuvent éventuellement épingler l'empreinte du certificat de la passerelle (voir la config `gateway.tls`
  ainsi que `gateway.remote.tlsFingerprint` ou la CLI `--tls-fingerprint`).

## Portée

Ce protocole expose l'**API de passerelle complète** (statut, canaux, modèles, chat,
agent, sessions, nœuds, approbations, etc.). La surface exacte est définie par les
schémas TypeBox dans `src/gateway/protocol/schema.ts`.
