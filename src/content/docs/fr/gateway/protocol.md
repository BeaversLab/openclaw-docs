---
summary: "Protocole WebSocket Gateway : handshake, trames, versioning"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocole Gateway"
---

Le protocole WS Gateway est le **plan de contrôle unique + transport de nœud** pour
OpenClaw. Tous les clients (CLI, interface Web, application macOS, nœuds
iOS/Android, nœuds sans interface) se connectent via WebSocket et déclarent leur **rôle** + **portée** lors
de la poignée de main.

## Transport

- WebSocket, trames de texte avec charges utiles JSON.
- La première trame **doit** être une requête `connect`.
- Les trames de pré-connexion sont plafonnées à 64 KiB. Après une négociation réussie, les clients
  doivent respecter les limites `hello-ok.policy.maxPayload` et
  `hello-ok.policy.maxBufferedBytes`. Avec les diagnostics activés,
  les trames entrantes trop volumineuses et les tampons de sortie lents émettent des événements `payload.large`
  avant que la passerelle ne ferme ou n'abandonne la trame concernée. Ces événements conservent
  les tailles, les limites, les surfaces et les codes de motif sécurisés. Ils ne conservent pas le corps du message,
  le contenu des pièces jointes, le corps brut de la trame, les jetons, les cookies ou les valeurs secrètes.

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
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

`server`, `features`, `snapshot` et `policy` sont tous requis par le schéma
(`src/gateway/protocol/schema/frames.ts`). `auth` est également requis et signale
le rôle et les périmètres (scopes) négociés. `canvasHostUrl` est facultatif.

Lorsqu'aucun jeton d'appareil n'est émis, `hello-ok.auth` signale les autorisations
négociées sans les champs de jeton :

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

Les clients backend de confiance du même processus (`client.id: "gateway-client"`,
`client.mode: "backend"`) peuvent omettre `device` sur les connexions directes en boucle locale lorsqu'ils
s'authentifient avec le jeton/mot de passe de passerelle partagé. Ce chemin est réservé
aux RPC du plan de contrôle interne et empêche les lignes de base d'appariement CLI/appareil
obsolètes de bloquer le travail backend local tel que les mises à jour de session du sous-agent. Les clients distants,
les clients d'origine navigateur, les clients nœuds et les clients jeton d'appareil/identité d'appareil
explicites utilisent toujours les vérifications d'appariement et de mise à niveau de portée normales.

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

Pendant le transfert de démarrage approuvé, `hello-ok.auth` peut également inclure des entrées de rôle supplémentaires limitées dans `deviceTokens` :

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

Pour le flux de démarrage de nœud/opérateur intégré, le jeton de nœud principal reste `scopes: []` et tout jeton d'opérateur transféré reste limité à la liste autorisée des opérateurs de démarrage (`operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`). Les vérifications de portée de démarrage restent préfixées par rôle : les entrées d'opérateur ne satisfont que les demandes d'opérateur, et les rôles non-opérateurs ont toujours besoin de portées sous leur propre préfixe de rôle.

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

Les méthodes à effets secondaires nécessitent des **clés d'idempotence** (voir le schéma).

## Rôles et portées

### Rôles

- `operator` = client du plan de contrôle (CLI/UI/automatisation).
- `node` = hôte de fonctionnalité (caméra/écran/canvas/system.run).

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

Les méthodes de passerelle RPC enregistrées par des plugins peuvent demander leur propre portée d'opérateur, mais
les préfixes d'administration core réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) se résolvent toujours à `operator.admin`.

La portée de la méthode n'est que la première barrière. Certaines commandes slash atteintes via `chat.send` appliquent des vérifications plus strictes au niveau de la commande par-dessus. Par exemple, les écritures persistantes de `/config set` et `/config unset` nécessitent `operator.admin`.

`node.pair.approve` possède également une vérification de portée supplémentaire au moment de l'approbation par-dessus la portée de base de la méthode :

- requêtes sans commande : `operator.pairing`
- requêtes avec des commandes de nœud non-exec : `operator.pairing` + `operator.write`
- requêtes qui incluent `system.run`, `system.run.prepare` ou `system.which` :
  `operator.pairing` + `operator.admin`

### Caps/commandes/autorisations (nœud)

Les nœuds déclarent les revendications de fonctionnalité au moment de la connexion :

- `caps` : catégories de capacités de haut niveau.
- `commands` : liste blanche des commandes pour l'appel (invoke).
- `permissions` : bascules granulaires (p. ex. `screen.record`, `camera.capture`).

Le Gateway traite celles-ci comme des **revendications** et applique des listes d'autorisation côté serveur.

## Présence

- `system-presence` renvoie des entrées indexées par l'identité de l'appareil.
- Les entrées de présence incluent `deviceId`, `roles` et `scopes` afin que les interfaces puissent afficher une seule ligne par appareil
  même lorsqu'il se connecte à la fois en tant qu'**opérateur** et **nœud**.

## Portée des événements de diffusion

Les événements de diffusion WebSocket envoyés par le serveur sont filtrés par portée (scope-gated) afin que les sessions limitées à l'appairage ou réservées aux nœuds ne reçoivent pas passivement le contenu des sessions.

- **Les trames de chat, d'agent et de résultat d'outil** (y compris les événements `agent` diffusés en continu et les résultats d'appel d'outil) nécessitent au moins `operator.read`. Les sessions sans `operator.read` ignorent entièrement ces trames.
- Les **diffusions `plugin.*` définies par le plugin** sont limitées à `operator.write` ou `operator.admin`, selon la manière dont le plugin les a enregistrées.
- Les **événements de statut et de transport** (`heartbeat`, `presence`, `tick`, cycle de vie de connexion/déconnexion, etc.) restent sans restriction afin que l'état du transport reste observable pour chaque session authentifiée.
- **Les familles d'événements de diffusion inconnues** sont filtrées par portée par défaut (échec fermé/fail-closed) à moins qu'un gestionnaire enregistré ne les assouplisse explicitement.

Chaque connexion client conserve son propre numéro de séquence par client afin que les diffusions préservent un ordre monotone sur cette socket, même lorsque différents clients voient des sous-ensembles différents du flux d'événements filtrés par portée.

## Familles de méthodes RPC courantes

La surface publique WS est plus large que les exemples de handshake/auth ci-dessus. Ce n'est pas une liste générée — `hello-ok.features.methods` est une liste de découverte conservatrice construite à partir de `src/gateway/server-methods-list.ts` plus les exportations de méthodes de plugin/chargées. Traitez-la comme une découverte de fonctionnalités, et non comme une énumération complète de `src/gateway/server-methods/*.ts`.

<AccordionGroup>
  <Accordion title="Système et identité">
    - `health` renvoie l'instantané d'état de santé de la passerelle, mis en cache ou fraîchement sondé.
    - `diagnostics.stability` renvoie l'enregistreur de stabilité diagnostique récent borné. Il conserve des métadonnées opérationnelles telles que les noms d'événements, les comptes, les tailles en octets, les lectures de mémoire, l'état de la file/session, les noms de channel/plugin, et les identifiants de session. Il ne conserve pas le texte de chat, les corps de webhook, les sorties d'outil, les corps de requête ou de réponse bruts, les jetons, les cookies, ou les valeurs secrètes. Le périmètre de lecture opérateur est requis.
    - `status` renvoie le résumé de la passerelle de style `/status` ; les champs sensibles ne sont inclus que pour les clients opérateurs avec périmètre administrateur.
    - `gateway.identity.get` renvoie l'identité de l'appareil de la passerelle utilisée par les flux de relais et d'appariement.
    - `system-presence` renvoie l'instantané de présence actuel pour les appareils opérateurs/nœuds connectés.
    - `system-event` ajoute un événement système et peut mettre à jour/diffuser le contexte de présence.
    - `last-heartbeat` renvoie le dernier événement de persistance (heartbeat).
    - `set-heartbeats` bascule le traitement du heartbeat sur la passerelle.
  </Accordion>

  <Accordion title="Modèles et utilisation">
    - `models.list` renvoie le catalogue de modèles autorisés lors de l'exécution.
    - `usage.status` renvoie les résumés des fenêtres d'utilisation/quota restant du fournisseur.
    - `usage.cost` renvoie les résumés d'utilisation des coûts agrégés pour une plage de dates.
    - `doctor.memory.status` renvoie la disponibilité de la mémoire vectorielle / des intégrations mises en cache pour l'espace de travail de l'agent par défaut actif. Passez `{ "probe": true }` ou `{ "deep": true }` uniquement lorsque l'appelant veut explicitement un ping en direct du fournisseur d'intégration.
    - `sessions.usage` renvoie les résumés d'utilisation par session.
    - `sessions.usage.timeseries` renvoie l'utilisation des séries temporelles pour une session.
    - `sessions.usage.logs` renvoie les entrées du journal d'utilisation pour une session.
  </Accordion>

<Accordion title="Channels and login helpers">
  - `channels.status` returns built-in + bundled channel/plugin status summaries. - `channels.logout` logs out a specific channel/account where the channel supports logout. - `web.login.start` starts a QR/web login flow for the current QR-capable web channel provider. - `web.login.wait` waits for that QR/web login flow to complete and starts the channel on success. - `push.test` sends a test APNs
  push to a registered iOS node. - `voicewake.get` returns the stored wake-word triggers. - `voicewake.set` updates wake-word triggers and broadcasts the change.
</Accordion>

<Accordion title="Messaging and logs">- `send` is the direct outbound-delivery RPC for channel/account/thread-targeted sends outside the chat runner. - `logs.tail` returns the configured gateway file-log tail with cursor/limit and max-byte controls.</Accordion>

<Accordion title="Talk and TTS">
  - `talk.config` returns the effective Talk config payload; `includeSecrets` requires `operator.talk.secrets` (or `operator.admin`). - `talk.mode` sets/broadcasts the current Talk mode state for WebChat/Control UI clients. - `talk.speak` synthesizes speech through the active Talk speech provider. - `tts.status` returns TTS enabled state, active provider, fallback providers, and provider config
  state. - `tts.providers` returns the visible TTS provider inventory. - `tts.enable` and `tts.disable` toggle TTS prefs state. - `tts.setProvider` updates the preferred TTS provider. - `tts.convert` runs one-shot text-to-speech conversion.
</Accordion>

<Accordion title="Secrets, config, update, and wizard">
  - `secrets.reload` résout à nouveau les SecretRefs actifs et remplace l'état des secrets d'exécution uniquement en cas de succès total. - `secrets.resolve` résout les affectations de secrets cible de commande pour un ensemble commande/cible spécifique. - `config.get` renvoie l'instantané de configuration actuel et son hachage. - `config.set` écrit une charge utile de configuration validée. -
  `config.patch` fusionne une mise à jour partielle de la configuration. - `config.apply` valide + remplace la charge utile complète de la configuration. - `config.schema` renvoie la charge utile du schéma de configuration en direct utilisée par l'interface de contrôle et les outils CLI : schéma, `uiHints`, version et métadonnées de génération, y compris les métadonnées du schéma de plugin + CLI
  lorsque le runtime peut le charger. Le schéma comprend les métadonnées de champ `title` / `description` dérivées des mêmes libellés et textes d'aide utilisés par l'interface, y compris les branches de composition d'objet imbriqué, de caractère générique, d'élément de tableau et de `anyOf` / `oneOf` / `allOf` lorsque la documentation du champ correspondant existe. - `config.schema.lookup` renvoie
  une charge utile de recherche délimitée par un chemin pour un chemin de configuration : chemin normalisé, un nœud de schéma superficiel, indice correspondant + `hintPath`, et résumés des enfants immédiats pour le forage dans l'interface/RPC. Les nœuds de schéma de recherche conservent la documentation orientée utilisateur et les champs de validation courants (`title`, `description`, `type`,
  `enum`, `const`, `format`, `pattern`, limites numériques/chaîne/tableau/objet, et drapeaux comme `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`). Les résumés des enfants exposent `key`, `path` normalisé, `type`, `required`, `hasChildren`, ainsi que l'`hint` / `hintPath` correspondant. - `update.run` exécute le flux de mise à jour de la passerelle et planifie un redémarrage
  uniquement lorsque la mise à jour elle-même a réussi. - `update.status` renvoie la dernière sentinelle de redémarrage de mise à jour en cache, y compris la version d'exécution après redémarrage si disponible. - `wizard.start`, `wizard.next`, `wizard.status` et `wizard.cancel` exposent l'assistant d'intégration via WS RPC.
</Accordion>

<Accordion title="Assistants d'agent et helpers d'espace de travail">
  - `agents.list` renvoie les entrées d'agent configurées. - `agents.create`, `agents.update` et `agents.delete` gèrent les enregistrements d'agent et le câblage de l'espace de travail. - `agents.files.list`, `agents.files.get` et `agents.files.set` gèrent les fichiers de démarrage de l'espace de travail exposés pour un agent. - `agent.identity.get` renvoie l'identité effective de l'assistant pour
  un agent ou une session. - `agent.wait` attend qu'une exécution se termine et renvoie l'instantané du terminal lorsque disponible.
</Accordion>

<Accordion title="Contrôle de session">
  - `sessions.list` renvoie l'index de session actuel. - `sessions.subscribe` et `sessions.unsubscribe` activent ou désactivent les abonnements aux événements de changement de session pour le client WS actuel. - `sessions.messages.subscribe` et `sessions.messages.unsubscribe` activent ou désactivent les abonnements aux événements de transcription/message pour une session. - `sessions.preview`
  renvoie des aperçus bornés de transcription pour des clés de session spécifiques. - `sessions.resolve` résout ou canonise une cible de session. - `sessions.create` crée une nouvelle entrée de session. - `sessions.send` envoie un message dans une session existante. - `sessions.steer` est la variante d'interruption et de guidage pour une session active. - `sessions.abort` interrompt le travail
  actif pour une session. - `sessions.patch` met à jour les métadonnées/les substitutions de session. - `sessions.reset`, `sessions.delete` et `sessions.compact` effectuent la maintenance de session. - `sessions.get` renvoie la ligne complète stockée de la session. - L'exécution du chat utilise toujours `chat.history`, `chat.send`, `chat.abort` et `chat.inject`. `chat.history` est normalisé pour
  l'affichage pour les clients d'interface utilisateur : les balises de directive en ligne sont supprimées du texte visible, les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel d'outil tronqués) et les jetons de contrôle de
  modèle ASCII/pleine largeur divulgués sont supprimés, les lignes d'assistant silencieuses pures telles que `NO_REPLY` / `no_reply` exacts sont omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés.
</Accordion>

<Accordion title="Jumelage d'appareils et jetons d'appareil">
  - `device.pair.list` renvoie les appareils jumelés en attente et approuvés. - `device.pair.approve`, `device.pair.reject` et `device.pair.remove` gèrent les enregistrements de jumelage d'appareils. - `device.token.rotate` fait pivoter un jeton d'appareil jumelé dans les limites de son rôle approuvé et de la portée de l'appelant. - `device.token.revoke` révoque un jeton d'appareil jumelé dans les
  limites de son rôle approuvé et de la portée de l'appelant.
</Accordion>

<Accordion title="Jumelage de nœud, invocation et travail en attente">
  - `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove` et `node.pair.verify` couvrent le jumelage de nœud et la vérification du bootstrap. - `node.list` et `node.describe` renvoient l'état des nœuds connus/connectés. - `node.rename` met à jour une étiquette de nœud jumelé. - `node.invoke` transfère une commande vers un nœud connecté. -
  `node.invoke.result` renvoie le résultat d'une demande d'invocation. - `node.event` transporte les événements originating from the nœud vers la passerelle. - `node.canvas.capability.refresh` actualise les jetons de capacité de canvas délimités. - `node.pending.pull` et `node.pending.ack` sont les API de file d'attente de nœuds connectés. - `node.pending.enqueue` et `node.pending.drain` gèrent le
  travail en attente durable pour les nœuds hors ligne/déconnectés.
</Accordion>

<Accordion title="Approval families">
  - `exec.approval.request`, `exec.approval.get`, `exec.approval.list`, et `exec.approval.resolve` couvrent les demandes d'approbation d'exécution ponctuelles ainsi que la recherche/relecture des approbations en attente. - `exec.approval.waitDecision` attend une approbation d'exécution en attente et renvoie la décision finale (ou `null` en cas d'expiration). - `exec.approvals.get` et
  `exec.approvals.set` gèrent les instantanés de la stratégie d'approbation d'exécution de la passerelle. - `exec.approvals.node.get` et `exec.approvals.node.set` gèrent la stratégie d'approbation d'exécution locale au nœud via les commandes de relais du nœud. - `plugin.approval.request`, `plugin.approval.list`, `plugin.approval.waitDecision`, et `plugin.approval.resolve` couvrent les flux
  d'approbation définis par des plugins.
</Accordion>

  <Accordion title="Automation, skills, and tools">
    - Automatisation : `wake` planifie une injection de texte de réveil immédiate ou au prochain battement de cœur ; `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`, et `cron.runs` gèrent le travail planifié.
    - Skills et outils : `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`.
  </Accordion>
</AccordionGroup>

### Familles d'événements courantes

- `chat` : mises à jour du chat de l'interface utilisateur telles que `chat.inject` et autres événements de chat
  réservés à la transcription.
- `session.message` et `session.tool` : mises à jour de la transcription/du flux d'événements pour une
  session abonnée.
- `sessions.changed` : l'index ou les métadonnées de la session ont changé.
- `presence` : mises à jour de l'instantané de la présence système.
- `tick` : événement périodique de maintien de vie / de vivacité.
- `health` : mise à jour de l'instantané de l'état de santé de la passerelle.
- `heartbeat` : mise à jour du flux d'événements de battement de cœur.
- `cron` : événement de changement de tâche/exécution cron.
- `shutdown` : notification d'arrêt de la passerelle.
- `node.pair.requested` / `node.pair.resolved` : cycle de vie du jumelage de nœud.
- `node.invoke.request` : diffusion de la demande d'appel de nœud.
- `device.pair.requested` / `device.pair.resolved` : cycle de vie de l'appareil jumelé.
- `voicewake.changed` : la configuration du déclencheur par mot d'éveil a changé.
- `exec.approval.requested` / `exec.approval.resolved` : cycle de vie
  de l'approbation d'exécution.
- `plugin.approval.requested` / `plugin.approval.resolved` : cycle de vie
  de l'approbation de plugin.

### Méthodes d'assistance de nœud

- Les nœuds peuvent appeler `skills.bins` pour récupérer la liste actuelle des exécutables de compétences
  pour les vérifications d'autorisation automatique.

### Méthodes d'assistance d'opérateur

- Les opérateurs peuvent appeler `commands.list` (`operator.read`) pour récupérer l'inventaire
  des commandes d'exécution pour un agent.
  - `agentId` est facultatif ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - `scope` contrôle quelle surface le `name` principal cible :
    - `text` renvoie le jeton de commande de texte principal sans le `/` au début
    - `native` et le chemin `both` par défaut renvoient des noms natifs conscients du fournisseur
      lorsque disponibles
  - `textAliases` porte des alias de barre oblique exacts tels que `/model` et `/m`.
  - `nativeName` porte le nom de commande natif conscient du fournisseur lorsqu'il existe.
  - `provider` est facultatif et n'affecte que la dénomination native ainsi que la disponibilité
    des commandes de plugins natifs.
  - `includeArgs=false` omet les métadonnées d'argument sérialisées de la réponse.
- Les opérateurs peuvent appeler `tools.catalog` (`operator.read`) pour récupérer le catalogue d'outils d'exécution pour un
  agent. La réponse inclut les outils groupés et les métadonnées de provenance :
  - `source` : `core` ou `plugin`
  - `pluginId` : propriétaire du plugin quand `source="plugin"`
  - `optional` : si un outil de plugin est optionnel
- Les opérateurs peuvent appeler `tools.effective` (`operator.read`) pour récupérer l'inventaire d'outils effectif à l'exécution pour une session.
  - `sessionKey` est requis.
  - La gateway dérive le contexte d'exécution de confiance à partir de la session côté serveur au lieu d'accepter le contexte d'authentification ou de livraison fourni par l'appelant.
  - La réponse est délimitée à la session et reflète ce que la conversation active peut utiliser maintenant, y compris les outils principaux, de plugin et de channel.
- Les opérateurs peuvent appeler `skills.status` (`operator.read`) pour récupérer l'inventaire de compétences visible pour un agent.
  - `agentId` est optionnel ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - La réponse inclut l'éligibilité, les prérequis manquants, les vérifications de configuration et les options d'installation nettoyées sans exposer les valeurs brutes des secrets.
- Les opérateurs peuvent appeler `skills.search` et `skills.detail` (`operator.read`) pour les métadonnées de découverte ClawHub.
- Les opérateurs peuvent appeler `skills.install` (`operator.admin`) dans deux modes :
  - Mode ClawHub : `{ source: "clawhub", slug, version?, force? }` installe un dossier de compétence dans le répertoire `skills/` de l'espace de travail de l'agent par défaut.
  - Mode installateur Gateway : `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` exécute une action `metadata.openclaw.install` déclarée sur l'hôte de la gateway.
- Les opérateurs peuvent appeler `skills.update` (`operator.admin`) dans deux modes :
  - Le mode ClawHub met à jour un slug suivi ou toutes les installations ClawHub suivies dans l'espace de travail de l'agent par défaut.
  - Le mode Configuration applique des correctifs aux valeurs `skills.entries.<skillKey>` telles que `enabled`, `apiKey` et `env`.

## Approbations d'exécution

- Lorsqu'une demande d'exécution nécessite une approbation, la gateway diffuse `exec.approval.requested`.
- Les clients opérateurs résolvent en appelant `exec.approval.resolve` (nécessite la portée `operator.approvals`).
- Pour `host=node`, `exec.approval.request` doit inclure `systemRunPlan` (métadonnées canoniques `argv`/`cwd`/`rawCommand`/session). Les requêtes sans `systemRunPlan` sont rejetées.
- Après approbation, les appels `node.invoke system.run` transmis réutilisent ce `systemRunPlan` canonique comme contexte de commande/répertoire de travail/session faisant autorité.
- Si un appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou
  `sessionKey` entre la préparation et la transmission finale approuvée `system.run`, la passerelle
  rejette l'exécution au lieu de faire confiance à la charge utile modifiée.

## Secours de livraison de l'agent

- Les requêtes `agent` peuvent inclure `deliver=true` pour demander une livraison sortante.
- `bestEffortDeliver=false` conserve un comportement strict : les cibles de livraison non résolues ou uniquement internes renvoient `INVALID_REQUEST`.
- `bestEffortDeliver=true` permet de revenir à une exécution en session uniquement lorsqu'aucune route de livraison externe ne peut être résolue (par exemple pour les sessions internes/webchat ou les configurations multicanaux ambiguës).

## Versionnage

- `PROTOCOL_VERSION` réside dans `src/gateway/protocol/schema/protocol-schemas.ts`.
- Les clients envoient `minProtocol` + `maxProtocol` ; le serveur rejette les incompatibilités.
- Les schémas et modèles sont générés à partir des définitions TypeBox :
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Constantes client

Le client de référence dans `src/gateway/client.ts` utilise ces valeurs par défaut. Les valeurs sont
stables pour le protocole v3 et constituent la base attendue pour les clients tiers.

| Constante                                                              | Par défaut                                                  | Source                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                                                     | `3`                                                         | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| Délai d'expiration de la requête (par RPC)                             | `30_000` ms                                                 | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| Délai d'expiration de préauth / de défi de connexion                   | `10_000` ms                                                 | `src/gateway/handshake-timeouts.ts` (plage `250`–`10_000`) |
| Délai de reconnexion initial                                           | `1_000` ms                                                  | `src/gateway/client.ts` (`backoffMs`)                      |
| Délai maximal de reconnexion                                           | `30_000` ms                                                 | `src/gateway/client.ts` (`scheduleReconnect`)              |
| Plage de nouvelle tentative rapide après fermeture du jeton d'appareil | `250` ms                                                    | `src/gateway/client.ts`                                    |
| Délai de grâce d'arrêt forcé avant `terminate()`                       | `250` ms                                                    | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| Délai d'expiration par défaut `stopAndWait()`                          | `1_000` ms                                                  | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| Intervalle de tick par défaut (pré `hello-ok`)                         | `30_000` ms                                                 | `src/gateway/client.ts`                                    |
| Fermeture pour dépassement de délai de tick                            | code `4000` lorsque le silence dépasse `tickIntervalMs * 2` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                                                    | `25 * 1024 * 1024` (25 Mo)                                  | `src/gateway/server-constants.ts`                          |

Le serveur annonce les `policy.tickIntervalMs`, `policy.maxPayload`
et `policy.maxBufferedBytes` effectifs dans `hello-ok` ; les clients doivent respecter ces valeurs
plutôt que les valeurs par défaut pré-poignée de main.

## Authentification

- L'authentification de passerelle par secret partagé utilise `connect.params.auth.token` ou
  `connect.params.auth.password`, selon le mode d'authentification configuré.
- Les modes porteurs d'identité tels que Tailscale Serve
  (`gateway.auth.allowTailscale: true`) ou `gateway.auth.mode: "trusted-proxy"` non-boucle
  satisfont la vérification d'authentification de connexion à partir de
  en-têtes de requête au lieu de `connect.params.auth.*`.
- Le `gateway.auth.mode: "none"` à entrée privée ignore totalement l'authentification de connexion par secret partagé ;
  n'exposez pas ce mode sur une entrée publique/non fiable.
- Après l'appairage, le Gateway émet un **jeton d'appareil** limité au rôle de connexion
  - aux portées. Il est renvoyé dans `hello-ok.auth.deviceToken` et doit être
    persisté par le client pour les futures connexions.
- Les clients doivent conserver le `hello-ok.auth.deviceToken` principal après toute
  connexion réussie.
- La reconnexion avec ce jeton d'appareil **stocké** doit également réutiliser le jeu
  d'étendues approuvées stocké pour ce jeton. Cela préserve l'accès en lecture/sondage/état
  qui a déjà été accordé et évite de réduire silencieusement les reconnexions à une
  étendue implicite plus étroite réservée aux administrateurs.
- Assemblage de l'authentification de connexion côté client (`selectConnectAuth` dans
  `src/gateway/client.ts`) :
  - `auth.password` est orthogonal et est toujours transmis lorsqu'il est défini.
  - `auth.token` est rempli par ordre de priorité : jeton partagé explicite d'abord,
    puis un `deviceToken` explicite, puis un jeton stocké par appareil (indexé par
    `deviceId` + `role`).
  - `auth.bootstrapToken` est envoyé uniquement si aucun des éléments ci-dessus n'a résolu un
    `auth.token`. Un jeton partagé ou tout jeton d'appareil résolu le supprime.
  - La promotion automatique d'un jeton d'appareil stocké lors de la réessai en une seule fois
    `AUTH_TOKEN_MISMATCH` est limitée aux **points de terminaison de confiance uniquement** —
    bouclage, ou `wss://` avec un `tlsFingerprint` épinglé. Les `wss://` publics
    sans épinglage ne sont pas éligibles.
- Les entrées `hello-ok.auth.deviceTokens` supplémentaires sont des jetons de transfert d'amorçage.
  Conservez-les uniquement lorsque la connexion a utilisé une authentification d'amorçage sur un transport de confiance
  tel que `wss://` ou un appairage bouclage/local.
- Si un client fournit un `deviceToken` **explicite** ou un `scopes` explicite, ce jeu
  d'étendues demandé par l'appelant reste autoritaire ; les étendues mises en cache ne sont
  réutilisées que lorsque le client réutilise le jeton stocké par appareil.
- Les jetons d'appareil peuvent être rotatifs/révoqués via `device.token.rotate` et
  `device.token.revoke` (nécessite l'étendue `operator.pairing`).
- `device.token.rotate` renvoie les métadonnées de rotation. Il renvoie le jeton
  porteur de remplacement uniquement pour les appels du même appareil qui sont déjà authentifiés avec
  ce jeton d'appareil, afin que les clients exclusivement par jeton puissent conserver leur remplacement avant
  de se reconnecter. Les rotations partagées/admin ne renvoient pas le jeton porteur.
- L'émission, la rotation et la révocation des jetons restent limitées à l'ensemble de rôles approuvés enregistré dans l'entrée de jumelage de cet appareil ; la modification d'un jeton ne peut pas étendre ou cibler un rôle d'appareil que l'approbation de jumelage n'a jamais accordé.
- Pour les sessions de jetons d'appareils jumelés, la gestion des appareils est à portée autonome, sauf si l'appelant possède également `operator.admin` : les appelants non-administrateurs peuvent supprimer/révoquer/faire tourner uniquement leur propre entrée d'appareil.
- `device.token.rotate` et `device.token.revoke` vérifient également l'ensemble des portées de jetons d'opérateur cibles par rapport aux portées de session actuelles de l'appelant. Les appelants non-administrateurs ne peuvent pas faire tourner ou révoquer un jeton d'opérateur plus large que celui qu'ils possèdent déjà.
- Les échecs d'authentification incluent `error.details.code` ainsi que des conseils de récupération :
  - `error.details.canRetryWithDeviceToken` (booléen)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportement du client pour `AUTH_TOKEN_MISMATCH` :
  - Les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton mis en cache par appareil.
  - Si cette nouvelle tentative échoue, les clients doivent arrêter les boucles de reconnexion automatique et présenter des directives d'action pour l'opérateur.

## Identité de l'appareil + appairage

- Les nœuds doivent inclure une identité d'appareil stable (`device.id`) dérivée d'une
  empreinte de paire de clés.
- Les passerelles émettent des jetons par appareil + rôle.
- Les approbations d'appairage sont requises pour les nouveaux ID d'appareil, sauf si l'auto-approbation
  locale est activée.
- L'auto-approbation de l'appairage est centrée sur les connexions directes en local loopback.
- OpenClaw dispose également d'un chemin étroit de connexion automatique local au backend/conteneur pour
  les flux d'assistance de confiance à secret partagé.
- Les connexions tailnet ou LAN sur le même hôte sont toujours traitées comme distantes pour l'appairage et nécessitent une approbation.
- Les clients WS incluent normalement l'`device` identité lors du `connect` (opérateur + nœud). Les seules exceptions pour les opérateurs sans appareil sont les chemins de confiance explicites :
  - `gateway.controlUi.allowInsecureAuth=true` pour la compatibilité HTTP non sécurisée uniquement sur localhost.
  - `gateway.auth.mode: "trusted-proxy"` réussi de l'authentification de l'opérateur de l'interface de contrôle.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (bris de glace, rétrogradation de sécurité sévère).
  - RPC `gateway-client` de bouclage direct backend authentifiés avec le jeton/mot de passe de passerelle partagé.
- Toutes les connexions doivent signer le nonce `connect.challenge` fourni par le serveur.

### Diagnostics de migration de l'authentification des appareils

Pour les clients hérités qui utilisent encore le comportement de signature pré-défi, `connect` renvoie désormais
des codes de détail `DEVICE_AUTH_*` sous `error.details.code` avec un `error.details.reason` stable.

Échecs courants de la migration :

| Message                     | details.code                     | details.reason           | Signification                                                           |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | Client `device.nonce` omis (ou a envoyé une valeur vide).               |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | Le client a signé avec un nonce obsolète ou incorrect.                  |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | La charge utile de la signature ne correspond pas à la charge utile v2. |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | L'horodatage signé est hors de la dérive autorisée.                     |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` ne correspond pas à l'empreinte de la clé publique.         |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Le format ou la canonicalisation de la clé publique a échoué.           |

Cible de migration :

- Attendez toujours `connect.challenge`.
- Signez la charge utile v2 qui inclut le nonce du serveur.
- Envoyez le même nonce dans `connect.params.device.nonce`.
- La charge utile de signature préférée est `v3`, qui lie `platform` et `deviceFamily`
  en plus des champs device/client/role/scopes/token/nonce.
- Les signatures `v2` héritées restent acceptées pour des raisons de compatibilité, mais l'épinglage des métadonnées des appareils appariés contrôle toujours la stratégie de commande lors de la reconnexion.

## TLS + épinglage (pinning)

- TLS est pris en charge pour les connexions WS.
- Les clients peuvent éventuellement épingler l'empreinte du certificat de la passerelle (voir la configuration `gateway.tls` ainsi que `gateway.remote.tlsFingerprint` ou le CLI `--tls-fingerprint`).

## Portée (Scope)

Ce protocole expose l'API complète de la passerelle (status, channels, models, chat, agent, sessions, nodes, approvals, etc.). La surface exacte est définie par les schémas TypeBox dans `src/gateway/protocol/schema.ts`.

## Connexes

- [Protocole de pont](/fr/gateway/bridge-protocol)
- [Manuel d'exécution de la Gateway](/fr/gateway)
