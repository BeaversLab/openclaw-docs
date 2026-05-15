---
summary: "GatewayGateway WebSocket protocol : handshake, frames, versioning"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "GatewayGateway protocol"
---

Le protocole WS Gateway est le **plan de contrôle unique + transport de nœud** pour
OpenClaw. Tous les clients (CLI, interface Web, application macOS, nœuds
iOS/Android, nœuds sans interface) se connectent via WebSocket et déclarent leur **rôle** + **portée** lors
de la poignée de main.

## Transport

- WebSocket, trames de texte avec charges utiles JSON.
- La première trame **doit** être une requête `connect`.
- Les trames de pré-connexion sont limitées à 64 Kio. Après une poignée de main réussie, les clients
  doivent respecter les limites `hello-ok.policy.maxPayload` et
  `hello-ok.policy.maxBufferedBytes`. Avec les diagnostics activés,
  les trames entrantes trop volumineuses et les tampons de sortie lents émettent des événements `payload.large`
  avant que la passerne ne ferme ou n'abandonne la trame concernée. Ces événements conservent
  les tailles, les limites, les surfaces et les codes deraison sûrs. Ils ne conservent pas le corps du
  message, le contenu des pièces jointes, le corps brut de la trame, les jetons, les cookies ou les valeurs secrètes.

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
    "minProtocol": 4,
    "maxProtocol": 4,
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
    "protocol": 4,
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

Alors que le Gateway termine encore les sidecars de démarrage, la requête `connect` peut
renvoyer une erreur réessable `UNAVAILABLE` avec `details.reason` défini à
`"startup-sidecars"` et `retryAfterMs`. Les clients devraient réessayer cette réponse
dans le cadre de leur budget global de connexion au lieu de la présenter comme un échec
de poignée de main terminal.

`server`, `features`, `snapshot` et `policy` sont tous requis par le schéma
(`src/gateway/protocol/schema/frames.ts`). `auth` est également requis et signale
le rôle/les portées négociés. `pluginSurfaceUrls` est optionnel et mappe les noms de surface de
plugin, tels que `canvas`, à des URL hébergées avec portée.

Les URL de surface de plugin avec portée peuvent expirer. Les nœuds peuvent appeler
`node.pluginSurface.refresh` avec `{ "surface": "canvas" }` pour recevoir une nouvelle
entrée dans `pluginSurfaceUrls`. La refactorisation expérimentale du plugin Canvas ne prend pas
en charge le chemin de compatibilité obsolète `canvasHostUrl`, `canvasCapability` ou
`node.canvas.capability.refresh` ; les clients natifs et les passerelles actuels doivent utiliser les surfaces de plugin.

Lorsqu'aucun jeton d'appareil n'est émis, `hello-ok.auth` rapporte les autorisations négociées sans les champs de jeton :

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

Les clients backend de confiance du même processus (`client.id: "gateway-client"`,
`client.mode: "backend"`) peuvent omettre `device` sur les connexions de bouclage directes lorsqu'ils s'authentifient avec le jeton/mot de passe de passerelle partagé. Ce chemin est réservé
aux RPC du plan de contrôle interne et empêche les lignes de base d'appairage CLI/appareil obsolètes de
bloquer le travail backend local, tel que les mises à jour de session de sous-agent. Les clients distants,
les clients d'origine navigateur, les clients nœuds et les clients jeton d'appareil/identité d'appareil explicites utilisent toujours les vérifications d'appairage normales et de mise à niveau de portée.

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

Pendant le transfert d'amorçage de confiance, `hello-ok.auth` peut également inclure des entrées de rôle bornées supplémentaires dans `deviceTokens` :

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
`scopes: []` et tout jeton d'opérateur transféré reste borné à la liste d'autorisation de l'opérateur d'amorçage (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`). Les vérifications de portée d'amorçage restent
préfixées par rôle : les entrées d'opérateur ne satisfont que les demandes d'opérateur, et les rôles non-opérateurs
ont toujours besoin de portées sous leur propre préfixe de rôle.

### Exemple de nœud

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 4,
    "maxProtocol": 4,
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

## Encadrement

- **Requête** : `{type:"req", id, method, params}`
- **Réponse** : `{type:"res", id, ok, payload|error}`
- **Événement** : `{type:"event", event, payload, seq?, stateVersion?}`

Les méthodes avec effets secondaires nécessitent des **clés d'idempotence** (voir le schéma).

## Rôles + portées

Pour le modèle complet de portée d'opérateur, les vérifications au moment de l'approbation et la sémantique du secret partagé,
voyez [Portées d'opérateur](/fr/gateway/operator-scopes).

### Rôles

- `operator` = client du plan de contrôle (CLI/UI/automatisation).
- `node` = hôte de capacité (camera/screen/canvas/system.run).

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

Les méthodes RPC de passerelle enregistrées par le plugin peuvent demander leur propre portée d'opérateur, mais
les préfixes d'administration de base réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) sont toujours résolus en `operator.admin`.

La portée de la méthode n'est que la première porte. Certaines commandes slash atteintes via
`chat.send` appliquent des vérifications plus strictes au niveau de la commande par-dessus. Par exemple, les écritures persistantes
`/config set` et `/config unset` nécessitent `operator.admin`.

`node.pair.approve` possède également une vérification de portée supplémentaire au moment de l'approbation par-dessus la
portée de méthode de base :

- requêtes sans commande : `operator.pairing`
- requêtes avec des commandes de nœud non-exéc : `operator.pairing` + `operator.write`
- requêtes incluant `system.run`, `system.run.prepare`, ou `system.which` :
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

Les nœuds déclarent des revendications de capacité au moment de la connexion :

- `caps` : catégories de capacités de haut niveau telles que `camera`, `canvas`, `screen`,
  `location`, `voice`, et `talk`.
- `commands` : liste d'autorisation (allowlist) des commandes pour l'invocation.
- `permissions` : bascules granulaires (ex. `screen.record`, `camera.capture`).

Le Gateway traite celles-ci comme des **revendications** (claims) et applique des listes d'autorisation côté serveur.

## Presence

- `system-presence` renvoie des entrées indexées par l'identité de l'appareil.
- Les entrées de présence incluent `deviceId`, `roles` et `scopes` afin que les interfaces utilisateur puissent afficher une seule ligne par appareil
  même lorsqu'il se connecte à la fois en tant qu'**opérateur** et **nœud**.
- `node.list` inclut les champs facultatifs `lastSeenAtMs` et `lastSeenReason`. Les nœuds connectés signalent
  leur heure de connexion actuelle sous forme de `lastSeenAtMs` avec la raison `connect` ; les nœuds couplés peuvent également signaler
  une présence durable en arrière-plan lorsqu'un événement de nœud de confiance met à jour leurs métadonnées de couplage.

### Événement de vie en arrière-plan du nœud

Les nœuds peuvent appeler `node.event` avec `event: "node.presence.alive"` pour enregistrer qu'un nœud couplé était
en vie lors d'un réveil en arrière-plan sans le marquer comme connecté.

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` est une énumération fermée : `background`, `silent_push`, `bg_app_refresh`,
`significant_location`, `manual` ou `connect`. Les chaînes de déclencheur inconnues sont normalisées en
`background` par la passerelle avant la persistance. L'événement est durable uniquement pour les sessions de périphérique de nœud
authentifiées ; les sessions sans périphérique ou non couplées renvoient `handled: false`.

Les passerelles réussies renvoient un résultat structuré :

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

Les passerelles plus anciennes peuvent encore renvoyer `{ "ok": true }` pour `node.event` ; les clients doivent traiter cela comme un
RPC reconnu, et non comme une persistance de présence durable.

## Portée des événements de diffusion

Les événements de diffusion WebSocket poussés par le serveur sont limités par la portée afin que les sessions à portée de couplage ou les sessions de nœud uniquement ne reçoivent pas passivement le contenu de session.

- **Les trames de chat, d'agent et de résultat d'outil** (y compris les événements `agent` diffusés et les résultats d'appels d'outil) nécessitent au moins `operator.read`. Les sessions sans `operator.read` ignorent entièrement ces trames.
- **Les diffusions `plugin.*` définies par le plugin** sont limitées à `operator.write` ou `operator.admin`, selon la manière dont le plugin les a enregistrées.
- **Les événements de statut et de transport** (`heartbeat`, `presence`, `tick`, cycle de vie de connexion/déconnexion, etc.) restent non restreints afin que l'état du transport reste observable pour chaque session authentifiée.
- **Les familles d'événements de diffusion inconnus** sont filtrées par portée par défaut (fermeture par défaut) sauf si un gestionnaire enregistré les assouplit explicitement.

Chaque connexion client conserve son propre numéro de séquence par client afin que les diffusions préservent l'ordre monotone sur ce socket, même lorsque différents clients voient des sous-ensembles différents filtrés par portée du flux d'événements.

## Familles de méthodes RPC courantes

La surface WS publique est plus large que les exemples de négociation/d'authentification ci-dessus. Ce n'est pas une vidange générée — `hello-ok.features.methods` est une liste de découverte conservative construite à partir de `src/gateway/server-methods-list.ts` plus les exportations de méthodes de plugin/channel chargées. Traitez-la comme une découverte de fonctionnalités, et non comme une énumération complète de `src/gateway/server-methods/*.ts`.

<AccordionGroup>
  <Accordion title="Système et identité">
    - `health` renvoie l'instantané d'état de santé de la passerelle mis en cache ou fraîchement sondé.
    - `diagnostics.stability` renvoie l'enregistreur de stabilité de diagnostic borné récent. Il conserve des métadonnées opérationnelles telles que les noms d'événements, les comptes, les tailles en octets, les lectures de mémoire, l'état de file/session, les noms de plugin/channel et les ids de session. Il ne conserve pas le texte de chat, les corps de webhook, les sorties d'outil, les corps de requête ou de réponse bruts, les jetons, les cookies ou les valeurs secrètes. La portée de lecture opérateur est requise.
    - `status` renvoie le résumé de passerelle de style `/status` ; les champs sensibles ne sont inclus que pour les clients opérateurs avec portée admin.
    - `gateway.identity.get` renvoie l'identité de l'appareil de la passerelle utilisée par les flux de relais et d'appariement.
    - `system-presence` renvoie l'instantané de présence actuel pour les appareils opérateur/nœud connectés.
    - `system-event` ajoute un événement système et peut mettre à jour/diffuser le contexte de présence.
    - `last-heartbeat` renvoie le dernier événement de persistance persistant.
    - `set-heartbeats` active/désactive le traitement des battements de cœur sur la passerelle.

  </Accordion>

  <Accordion title="Modèles et utilisation">
    - `models.list` renvoie le catalogue de modèles autorisés lors de l'exécution. Passez `{ "view": "configured" }` pour les modèles configurés de taille de sélecteur (`agents.defaults.models` d'abord, puis `models.providers.*.models`), ou `{ "view": "all" }` pour le catalogue complet.
    - `usage.status` renvoie les résumés des fenêtres d'utilisation/quota restant du fournisseur.
    - `usage.cost` renvoie les résumés d'utilisation des coûts agrégés pour une plage de dates.
    - `doctor.memory.status` renvoie l'état de préparation de la mémoire vectorielle/des intégrations mises en cache pour l'espace de travail de l'agent par défaut actif. Passez `{ "probe": true }` ou `{ "deep": true }` uniquement lorsque l'appelant souhaite explicitement un ping en direct du fournisseur d'intégration.
    - `doctor.memory.remHarness` renvoie un aperçu harnaché REM limité et en lecture seule pour les clients du plan de contrôle distant. Il peut inclure des chemins d'accès à l'espace de travail, des extraits de mémoire, du markdown ancré rendu et des candidats à la promotion approfondie, les appelants ont donc besoin de `operator.read`.
    - `sessions.usage` renvoie des résumés d'utilisation par session.
    - `sessions.usage.timeseries` renvoie l'utilisation en séries chronologiques pour une session.
    - `sessions.usage.logs` renvoie les entrées du journal d'utilisation pour une session.

  </Accordion>

  <Accordion title="Chaînes et assistants de connexion">
    - `channels.status` renvoie les résumés d'état des chaînes/plugins intégrés et groupés.
    - `channels.logout` déconnecte une chaîne/compte spécifique lorsque la chaîne prend en charge la déconnexion.
    - `web.login.start` lance un flux de connexion QR/Web pour le fournisseur de chaîne Web actuel compatible QR.
    - `web.login.wait` attend que ce flux de connexion QR/Web se termine et lance la chaîne en cas de succès.
    - `push.test`iOS envoie une notification push APNs de test à un nœud iOS enregistré.
    - `voicewake.get` renvoie les déclencheurs de mot de réveil stockés.
    - `voicewake.set` met à jour les déclencheurs de mot de réveil et diffuse la modification.

  </Accordion>

  <Accordion title="Messagerie et journaux">
    - `send` est le RPC RPC de livraison directe vers l'extérieur pour les envois ciblés vers un channel/compte/fil en dehors du moteur de chat.
    - `logs.tail` retourne la fin configurée du journal de fichiers de la passerelle avec des contrôles de curseur/limite et d'octets maximum.

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` renvoie le catalogue de fournisseurs Talk en lecture seule pour la synthèse vocale, la transcription en continu et la voix en temps réel. Il inclut les identifiants des fournisseurs, les étiquettes, l'état configuré, les identifiants de modèle/voix exposés, les modes canoniques, les transports, les stratégies cérébrales et les indicateurs audio/capacités en temps réel sans renvoyer de secrets de fournisseur ni modifier la configuration globale.
    - `talk.config` renvoie la charge utile de configuration Talk effective ; `includeSecrets` nécessite `operator.talk.secrets` (ou `operator.admin`).
    - `talk.session.create` crée une session Talk détenue par le Gateway pour `realtime/gateway-relay`, `transcription/gateway-relay` ou `stt-tts/managed-room`. `brain: "direct-tools"` nécessite `operator.admin`.
    - `talk.session.join` valide un jeton de session de salle gérée, émet des événements `session.ready` ou `session.replaced` selon les besoins, et renvoie les métadonnées de salle/session ainsi que les événements Talk récents sans le jeton en texte clair ni le hachage du jeton stocké.
    - `talk.session.appendAudio` ajoute de l'audio d'entrée PCM en base64 aux sessions de relais et de transcription en temps réel détenues par le Gateway.
    - `talk.session.startTurn`, `talk.session.endTurn` et `talk.session.cancelTurn` pilotent le cycle de vie des tours dans les salles gérées avec rejet des tours périmés avant que l'état ne soit effacé.
    - `talk.session.cancelOutput` arrête la sortie audio de l'assistant, principalement pour les interruptions activées par VAD dans les sessions de relais du Gateway.
    - `talk.session.submitToolResult` complète un appel d'outil de fournisseur émis par une session de relais en temps réel détenue par le Gateway. Passez `options: { willContinue: true }` pour la sortie intermédiaire de l'outil lorsqu'un résultat final suivra, ou `options: { suppressResponse: true }` lorsque le résultat de l'outil doit satisfaire l'appel du fournisseur sans démarrer une autre réponse d'assistant en temps réel.
    - `talk.session.close` ferme une session de relais, de transcription ou de salle gérée détenue par le Gateway et émet des événements Talk terminaux.
    - `talk.mode` définit/diffuse l'état actuel du mode Talk pour les clients WebChat/Control UI.
    - `talk.client.create` crée une session de fournisseur en temps réel détenue par le client en utilisant `webrtc` ou `provider-websocket` tandis que le Gateway possède la configuration, les informations d'identification, les instructions et la stratégie d'outils.
    - `talk.client.toolCall` permet aux transports en temps réel détenus par le client de transmettre les appels d'outils de fournisseur à la stratégie du Gateway. Le premier outil pris en charge est `openclaw_agent_consult` ; les clients reçoivent un identifiant d'exécution et attendent les événements normaux du cycle de vie du chat avant de soumettre le résultat spécifique au fournisseur.
    - `talk.event` est le canal unique d'événements Talk pour les adaptateurs en temps réel, de transcription, STT/TTS, de salle gérée, de téléphonie et de réunion.
    - `talk.speak` synthétise la parole via le fournisseur de parole Talk actif.
    - `tts.status` renvoie l'état d'activation de la synthèse vocale (TTS), le fournisseur actif, les fournisseurs de secours et l'état de la configuration du fournisseur.
    - `tts.providers` renvoie l'inventaire visible des fournisseurs TTS.
    - `tts.enable` et `tts.disable` basculent l'état des préférences TTS.
    - `tts.setProvider` met à jour le fournisseur TTS préféré.
    - `tts.convert` exécute une conversion ponctuelle texte-parole.

  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` résout à nouveau les SecretRefs actifs et échange l'état des secrets d'exécution uniquement en cas de succès total.
    - `secrets.resolve` résout les affectations de secrets de commande-cible pour un ensemble de commandes/cibles spécifique.
    - `config.get` renvoie l'instantané de configuration actuel et son hachage.
    - `config.set` écrit une charge utile de configuration validée.
    - `config.patch` fusionne une mise à jour partielle de la configuration.
    - `config.apply` valide + remplace la charge utile complète de la configuration.
    - `config.schema` renvoie la charge utile du schéma de configuration en direct utilisée par l'interface de contrôle et les outils CLI : schéma, `uiHints`, version et métadonnées de génération, y compris les métadonnées du schéma du plugin + channel lorsque le runtime peut les charger. Le schéma comprend des métadonnées de champ `title` / `description` dérivées des mêmes libellés et textes d'aide que ceux utilisés par l'interface, y compris les branches de composition d'objet imbriqué, de caractère générique, d'élément de tableau et de `anyOf` / `oneOf` / `allOf` lorsque la documentation du champ correspondante existe.
    - `config.schema.lookup` renvoie une charge utile de recherche limitée à un chemin pour un chemin de configuration : chemin normalisé, un nœud de schéma superficiel, indice correspondant + `hintPath`, et résumés enfants immédiats pour l'exploration UI/CLI. Les nœuds de schéma de recherche conservent la documentation orientée utilisateur et les champs de validation courants (`title`, `description`, `type`, `enum`, `const`, `format`, `pattern`, limites numériques/chaîne/tableau/objet, et indicateurs tels que `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`). Les résumés enfants exposent `key`, `path` normalisé, `type`, `required`, `hasChildren`, ainsi que l'`hint` / `hintPath` correspondant.
    - `update.run` exécute le flux de mise à jour du Gateway et planifie un redémarrage uniquement lorsque la mise à jour elle-même a réussi ; les appelants disposant d'une session peuvent inclure `continuationMessage` afin que le démarrage reprenne un tour d'agent de suivi via la file d'attente de continuation de redémarrage. Les mises à jour du gestionnaire de paquets forcent un redémarrage de mise à jour non différé et sans refroidissement après l'échange de paquets afin que l'ancien processus RPC ne continue pas à charger paresseusement à partir d'un arbre `dist` remplacé.
    - `update.status` renvoie la dernière sentinelle de redémarrage de mise à jour mise en cache, y compris la version en cours après redémarrage si disponible.
    - `wizard.start`, `wizard.next`, `wizard.status` et `wizard.cancel` exposent l'assistant d'intégration via WS RPC.

  </Accordion>

  <Accordion title="Assistants et helpers de l'espace de travail">
    - `agents.list` renvoie les entrées d'assistants configurées, y compris les métadonnées effectives du modèle et de l'exécution.
    - `agents.create`, `agents.update` et `agents.delete` gèrent les enregistrements d'assistants et le câblage de l'espace de travail.
    - `agents.files.list`, `agents.files.get` et `agents.files.set` gèrent les fichiers d'amorçage de l'espace de travail exposés pour un assistant.
    - `tasks.list`, `tasks.get` et `tasks.cancel` exposent le registre de tâches du Gateway aux clients SDK et opérateurs.
    - `artifacts.list`, `artifacts.get` et `artifacts.download` exposent les résumés d'artefacts dérivés de la transcription et les téléchargements pour une portée `sessionKey`, `runId` ou `taskId` explicite. Les requêtes de run et de tâche résolvent la session propriétaire côté serveur et ne renvoient les médias de transcription que s'ils correspondent à leur provenance ; les sources d'URL non sécurisées ou locales renvoient des téléchargements non pris en charge au lieu d'effectuer une récupération côté serveur.
    - `environments.list` et `environments.status` exposent la découverte de l'environnement local au Gateway et du nœud en lecture seule pour les clients SDK.
    - `agent.identity.get` renvoie l'identité effective de l'assistant pour un assistant ou une session.
    - `agent.wait` attend qu'une exécution se termine et renvoie l'instantané terminal lorsqu'il est disponible.

  </Accordion>

  <Accordion title="Session control">
    - `sessions.list` renvoie l'index de session actuel, y compris les métadonnées `agentRuntime` par ligne lorsqu'un backend de runtime d'agent est configuré.
    - `sessions.subscribe` et `sessions.unsubscribe` activent ou désactivent les abonnements aux événements de changement de session pour le client WS actuel.
    - `sessions.messages.subscribe` et `sessions.messages.unsubscribe` activent ou désactivent les abonnements aux événements de transcription/message pour une session.
    - `sessions.preview` renvoie des aperçus limités de la transcription pour des clés de session spécifiques.
    - `sessions.describe` renvoie une ligne de session Gateway pour une clé de session exacte.
    - `sessions.resolve` résout ou canonise une cible de session.
    - `sessions.create` crée une nouvelle entrée de session.
    - `sessions.send` envoie un message dans une session existante.
    - `sessions.steer` est la variante d'interruption et de guidage pour une session active.
    - `sessions.abort` interrompt le travail actif pour une session. Un appelant peut passer `key` plus un `runId` facultatif, ou passer `runId` seul pour les exécutions actives que le Gateway peut résoudre en session.
    - `sessions.patch` met à jour les métadonnées/remplacements de session et rapporte le  canonique résolu ainsi que les `agentRuntime` effectifs.
    - `sessions.reset`, `sessions.delete` et `sessions.compact` effectuent la maintenance de session.
    - `sessions.get` renvoie la ligne de session stockée complète.
    - L'exécution du chat utilise toujours `chat.history`, `chat.send`, `chat.abort` et `chat.inject`. `chat.history` est normalisé pour l'affichage pour les clients UI : les balises de directive en ligne sont supprimées du texte visible, les payloads XML d'appel  en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel  tronqués) et les jetons de contrôle de modèle ASCII/pleine largeur fuyants sont supprimés, les lignes d'assistant à jeton silencieux pur telles que `NO_REPLY` / `no_reply` exacts sont omises, et les lignes surdimensionnées peuvent être remplacées par des espaces réservés.

  </Accordion>

  <Accordion title="Jumelage d'appareils et jetons d'appareil">
    - `device.pair.list` renvoie les appareils jumelés en attente et approuvés.
    - `device.pair.approve`, `device.pair.reject` et `device.pair.remove` gèrent les enregistrements de jumelage d'appareils.
    - `device.token.rotate` fait tourner un jeton d'appareil jumelé dans les limites de son rôle approuvé et de la portée de l'appelant.
    - `device.token.revoke` révoque un jeton d'appareil jumelé dans les limites de son rôle approuvé et de la portée de l'appelant.

  </Accordion>

  <Accordion title="Jumelage de nœuds, invocation et travail en attente">
    - `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove` et `node.pair.verify` couvrent le jumelage de nœuds et la vérification de l'amorçage.
    - `node.list` et `node.describe` renvoient l'état des nœuds connus/connectés.
    - `node.rename` met à jour l'étiquette d'un nœud jumelé.
    - `node.invoke` transfère une commande vers un nœud connecté.
    - `node.invoke.result` renvoie le résultat d'une requête d'invocation.
    - `node.event` transporte les événements originaires du nœud vers la passerelle.
    - `node.pending.pull` et `node.pending.ack` sont les API de file d'attente des nœuds connectés.
    - `node.pending.enqueue` et `node.pending.drain` gèrent le travail en attente durable pour les nœuds hors ligne/déconnectés.

  </Accordion>

  <Accordion title="Approval families">
    - `exec.approval.request`, `exec.approval.get`, `exec.approval.list`, et `exec.approval.resolve` couvrent les demandes d'approbation d'exécution ponctuelles ainsi que la recherche/relecture des approbations en attente.
    - `exec.approval.waitDecision` attend une approbation d'exécution en attente et renvoie la décision finale (ou `null` en cas d'expiration du délai).
    - `exec.approvals.get` et `exec.approvals.set` gèrent les instantanés de la stratégie d'approbation d'exécution de la passerelle.
    - `exec.approvals.node.get` et `exec.approvals.node.set` gèrent la stratégie d'approbation d'exécution locale au nœud via les commandes de relais du nœud.
    - `plugin.approval.request`, `plugin.approval.list`, `plugin.approval.waitDecision`, et `plugin.approval.resolve` couvrent les flux d'approbation définis par les plugins.

  </Accordion>

  <Accordion title="Automation, skills, and tools">
    - Automatisation : `wake` planifie une injection de texte de réveil immédiate ou au prochain battement de cœur (heartbeat) ; `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`, `cron.runs` gèrent le travail planifié.
    - Skills et outils : `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`, `tools.invoke`.

  </Accordion>
</AccordionGroup>

### Familles d'événements courantes

- `chat` : mises à jour du chat de l'interface utilisateur telles que `chat.inject` et autres événements de chat
  réservés à la transcription.
- `session.message` et `session.tool` : mises à jour de la transcription/du flux d'événements pour une
  session abonnée.
- `sessions.changed` : l'index ou les métadonnées de la session ont changé.
- `presence` : mises à jour de l'instantané de présence système.
- `tick` : événement périodique de maintien en vie / de vivacité.
- `health` : mise à jour de l'instantané de santé de la passerelle.
- `heartbeat` : mise à jour du flux d'événements de heartbeat.
- `cron` : événement de changement de tâche/exécution cron.
- `shutdown` : notification d'arrêt de la passerelle.
- `node.pair.requested` / `node.pair.resolved` : cycle de vie de l'appairage de nœud.
- `node.invoke.request` : diffusion de la demande d'appel de nœud.
- `device.pair.requested` / `device.pair.resolved` : cycle de vie de l'appareil jumelé.
- `voicewake.changed` : configuration du déclencheur de mot de réveil modifiée.
- `exec.approval.requested` / `exec.approval.resolved` : cycle de vie de l'approbation d'exécution.
- `plugin.approval.requested` / `plugin.approval.resolved` : cycle de vie de l'approbation de plugin.

### Méthodes d'assistance de nœud

- Les nœuds peuvent appeler `skills.bins` pour récupérer la liste actuelle des exécutables de compétences pour les vérifications d'autorisation automatique.

### RPC du registre de tâches

Les clients opérateurs peuvent inspecter et annuler les enregistrements de tâches d'arrière-plan du Gateway via les RPC du registre de tâches. Ces méthodes renvoient des résumés de tâches nettoyés, et non l'état d'exécution brut.

- `tasks.list` nécessite `operator.read`.
  - Paramètres : `status` facultatif (`"queued"`, `"running"`, `"completed"`, `"failed"`, `"cancelled"` ou `"timed_out"`) ou un tableau de ces statuts, `agentId` facultatif, `sessionKey` facultatif, `limit` facultatif de `1` à `500`, et chaîne facultative `cursor`.
  - Résultat : `{ "tasks": TaskSummary[], "nextCursor"?: string }`.
- `tasks.get` nécessite `operator.read`.
  - Paramètres : `{ "taskId": string }`.
  - Résultat : `{ "task": TaskSummary }`.
  - Les IDs de tâches manquants renvoient la structure d'erreur non trouvée du Gateway.
- `tasks.cancel` nécessite `operator.write`.
  - Paramètres : `{ "taskId": string, "reason"?: string }`.
  - Résultat :
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`.
  - `found` indique si le registre contenait une tâche correspondante. `cancelled`
    indique si le runtime a accepté ou enregistré l'annulation.

`TaskSummary` inclut `id`, `status`, et des métadonnées optionnelles telles que `kind`,
`runtime`, `title`, `agentId`, `sessionKey`, `childSessionKey`, `ownerKey`,
`runId`, `taskId`, `flowId`, `parentTaskId`, `sourceId`, les horodatages, la progression,
le résumé terminal, et le texte d'erreur nettoyé.

### Méthodes d'aide pour les opérateurs

- Les opérateurs peuvent appeler `commands.list` (`operator.read`) pour récupérer l'inventaire des
  commandes runtime pour un agent.
  - `agentId` est optionnel ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - `scope` contrôle quelle surface la commande `name` cible principalement :
    - `text` renvoie le jeton de la commande texte principale sans le `/` initial
    - `native` et le chemin par défaut `both` renvoient des noms natifs conscients du fournisseur
      (provider-aware) lorsque disponibles
  - `textAliases` contient des alias de slash exacts tels que `/model` et `/m`.
  - `nativeName` contient le nom de commande natif conscient du fournisseur lorsqu'il existe.
  - `provider` est optionnel et n'affecte que la dénomination native ainsi que la disponibilité des
    commandes de plugins natifs.
  - `includeArgs=false` omet les métadonnées d'arguments sérialisées de la réponse.
- Les opérateurs peuvent appeler `tools.catalog` (`operator.read`) pour récupérer le catalogue d'outils (tool) runtime pour un
  agent. La réponse inclut les outils groupés et les métadonnées de provenance :
  - `source` : `core` ou `plugin`
  - `pluginId` : propriétaire du plugin lorsque `source="plugin"`
  - `optional` : si un outil de plugin est optionnel
- Les opérateurs peuvent appeler `tools.effective` (`operator.read`) pour récupérer l'inventaire d'outils effectif à l'exécution
  pour une session.
  - `sessionKey` est requis.
  - La passerelle dérive un contexte d'exécution de confiance à partir de la session côté serveur au lieu d'accepter
    le contexte d'authentification ou de livraison fourni par l'appelant.
  - La réponse est limitée à la session et reflète ce que la conversation active peut utiliser maintenant,
    y compris les outils principaux, de plugin et de canal.
- Les opérateurs peuvent appeler `tools.invoke` (`operator.write`) pour invoquer un outil disponible via le
  même chemin de stratégie de passerelle que `/tools/invoke`.
  - `name` est requis. `args`, `sessionKey`, `agentId`, `confirm` et
    `idempotencyKey` sont optionnels.
  - Si `sessionKey` et `agentId` sont tous deux présents, l'agent de session résolu doit correspondre
    à `agentId`.
  - La réponse est une enveloppe orientée SDK avec des champs `ok`, `toolName`, optionnel `output`, et typé
    `error`. Les approbations ou les refus de stratégie renvoient `ok:false` dans la charge utile plutôt que
    de contourner le pipeline de stratégie d'outil de la passerelle.
- Les opérateurs peuvent appeler `skills.status` (`operator.read`) pour récupérer l'inventaire de
  compétences visible pour un agent.
  - `agentId` est optionnel ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - La réponse comprend l'éligibilité, les exigences manquantes, les vérifications de configuration et
    les options d'installation nettoyées sans exposer les valeurs brutes des secrets.
- Les opérateurs peuvent appeler `skills.search` et `skills.detail` (`operator.read`) pour
  les métadonnées de découverte ClawHub.
- Les opérateurs peuvent appeler `skills.upload.begin`, `skills.upload.chunk` et
  `skills.upload.commit` (`operator.admin`) pour préparer une archive de compétences privée
  avant de l'installer. Il s'agit d'un chemin de téléchargement administrateur distinct pour les clients de confiance,
  et non du flux d'installation normal des compétences ClawHub, et il est désactivé par défaut sauf si
  `skills.install.allowUploadedArchives` est activé.
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    crée un téléchargement lié à ce slug et à cette valeur de force.
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` ajoute des octets à
    l'offset décodé exact.
  - `skills.upload.commit({ uploadId, sha256? })` vérifie la taille finale et
    le SHA-256. La validation finalise uniquement le téléchargement ; elle n'installe pas la compétence.
  - Les archives de compétences téléchargées sont des archives zip contenant une racine `SKILL.md`. Le
    nom du répertoire interne de l'archive ne sélectionne jamais la cible d'installation.
- Les opérateurs peuvent appeler `skills.install` (`operator.admin`) dans trois modes :
  - Mode ClawHub : `{ source: "clawhub", slug, version?, force? }` installe un
    dossier de compétence dans le répertoire de l'espace de travail de l'agent par défaut `skills/`.
  - Mode de téléchargement : `{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    installe un téléchargement validé dans le répertoire de l'espace de travail de l'agent par défaut `skills/<slug>`.
    Le slug et la valeur de force doivent correspondre à la demande
    `skills.upload.begin` originale. Ce mode est rejeté sauf si
    `skills.install.allowUploadedArchives` est activé. Le paramètre n'affecte pas
    les installations ClawHub.
  - Mode installateur Gateway : `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    exécute une action `metadata.openclaw.install` déclarée sur l'hôte de la passerelle.
- Les opérateurs peuvent appeler `skills.update` (`operator.admin`) dans deux modes :
  - Le mode ClawHub met à jour un slug suivi ou toutes les installations ClawHub suivies dans
    l'espace de travail de l'agent par défaut.
  - Le mode Config modifie les valeurs `skills.entries.<skillKey>` telles que `enabled`,
    `apiKey` et `env`.

### Vues `models.list`

`models.list` accepte un paramètre `view` facultatif :

- Omis ou `"default"` : comportement actuel de l'exécution. Si `agents.defaults.models` est configuré, la réponse est le catalogue autorisé, y compris les modèles découverts dynamiquement pour les entrées `provider/*`. Sinon, la réponse est le catalogue complet du Gateway.
- `"configured"` : comportement de taille de sélecteur. Si `agents.defaults.models` est configuré, il l'emporte toujours, y compris pour la découverte limitée au fournisseur pour les entrées `provider/*`. Sans liste d'autorisation, la réponse utilise des entrées `models.providers.*.models` explicites, revenant au catalogue complet uniquement lorsque aucune ligne de modèle configurée n'existe.
- `"all"` : catalogue complet du Gateway, contournant `agents.defaults.models`. Utilisez ceci pour les diagnostics et les interfaces de découverte, et non pour les sélecteurs de modèles normaux.

## Approbations d'exécution

- Lorsqu'une demande d'exécution nécessite une approbation, la passerelle diffuse `exec.approval.requested`.
- Les clients opérateurs résolvent en appelant `exec.approval.resolve` (nécessite la portée `operator.approvals`).
- Pour `host=node`, `exec.approval.request` doit inclure `systemRunPlan` (métadonnées canoniques `argv`/`cwd`/`rawCommand`/session). Les demandes sans `systemRunPlan` sont rejetées.
- Après approbation, les appels `node.invoke system.run` transférés réutilisent ce `systemRunPlan`
  canonique comme contexte de commande/cwd/session faisant autorité.
- Si un appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou
  `sessionKey` entre la préparation et le transfert final approuvé `system.run`, la
  passerelle rejette l'exécution au lieu de faire confiance à la charge utile modifiée.

## Secours de livraison d'agent

- Les demandes `agent` peuvent inclure `deliver=true` pour demander une livraison sortante.
- `bestEffortDeliver=false` conserve un comportement strict : les cibles de livraison non résolues ou uniquement internes renvoient `INVALID_REQUEST`.
- `bestEffortDeliver=true` permet un repli vers une exécution en session uniquement lorsqu'aucune route de livraison externe ne peut être résolue (par exemple pour les sessions internes/webchat ou les configurations multi-canal ambiguës).

## Gestion des versions

- `PROTOCOL_VERSION` se trouve dans `src/gateway/protocol/version.ts`.
- Les clients envoient `minProtocol` + `maxProtocol` ; le serveur rejette les incohérences.
- Les schémas et modèles sont générés à partir des définitions TypeBox :
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Constantes client

Le client de référence dans `src/gateway/client.ts` utilise ces valeurs par défaut. Les valeurs sont
stables pour le protocole v4 et constituent la base attendue pour les clients tiers.

| Constante                                                               | Par défaut                                                  | Source                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                                                      | `4`                                                         | `src/gateway/protocol/version.ts`                                                                 |
| Délai d'expiration de la requête (par RPC)                              | `30_000` ms                                                 | `src/gateway/client.ts` (`requestTimeoutMs`)                                                      |
| Délai d'expiration de préauth / de connexion (challenge)                | `15_000` ms                                                 | `src/gateway/handshake-timeouts.ts` (config/env peuvent augmenter le budget serveur/client pairé) |
| Délai initial de reconnexion (backoff)                                  | `1_000` ms                                                  | `src/gateway/client.ts` (`backoffMs`)                                                             |
| Délai maximal de reconnexion (backoff)                                  | `30_000` ms                                                 | `src/gateway/client.ts` (`scheduleReconnect`)                                                     |
| Plage de nouvelle tentative rapide après fermeture par jeton d'appareil | `250` ms                                                    | `src/gateway/client.ts`                                                                           |
| Délai de grâce d'arrêt forcé avant `terminate()`                        | `250` ms                                                    | `FORCE_STOP_TERMINATE_GRACE_MS`                                                                   |
| Délai d'expiration par défaut `stopAndWait()`                           | `1_000` ms                                                  | `STOP_AND_WAIT_TIMEOUT_MS`                                                                        |
| Intervalle de tick par défaut (pré `hello-ok`)                          | `30_000` ms                                                 | `src/gateway/client.ts`                                                                           |
| Fermeture par délai d'attente de tick                                   | code `4000` lorsque le silence dépasse `tickIntervalMs * 2` | `src/gateway/client.ts`                                                                           |
| `MAX_PAYLOAD_BYTES`                                                     | `25 * 1024 * 1024` (25 Mo)                                  | `src/gateway/server-constants.ts`                                                                 |

Le serveur annonce les `policy.tickIntervalMs` effectifs, `policy.maxPayload`
et `policy.maxBufferedBytes` dans `hello-ok` ; les clients doivent respecter ces valeurs
plutôt que les valeurs par défaut pré-poignée de main.

## Auth

- L'authentification Gateway par secret partagé utilise `connect.params.auth.token` ou
  `connect.params.auth.password`, selon le mode d'authentification configuré.
- Les modes porteurs d'identité tels que Tailscale Serve
  (`gateway.auth.allowTailscale: true`) ou `gateway.auth.mode: "trusted-proxy"` non-bouclage
  satisfont la vérification d'authentification de connexion
  à partir des en-têtes de requête au lieu de `connect.params.auth.*`.
- Le `gateway.auth.mode: "none"` à entrée privée ignore entièrement l'authentification de
  connexion par secret partagé ; n'exposez pas ce mode sur une entrée publique ou non fiable.
- Après l'appairage, le Gateway émet un **device token** délimité au rôle
  de connexion + scopes. Il est renvoyé dans `hello-ok.auth.deviceToken` et doit être
  persisté par le client pour les futures connexions.
- Les clients doivent persister le `hello-ok.auth.deviceToken` principal après toute
  connexion réussie.
- La reconnexion avec ce **device token** **stocké** doit également réutiliser l'ensemble
  de scopes approuvés stocké pour ce token. Cela préserve l'accès read/probe/status
  qui a déjà été accordé et évite de réduire silencieusement les reconnexions à un
  scope implicite plus étendu réservé aux administrateurs.
- Assemblage de l'authentification de connexion côté client (`selectConnectAuth` dans
  `src/gateway/client.ts`) :
  - `auth.password` est orthogonal et est toujours transmis lorsqu'il est défini.
  - `auth.token` est rempli par ordre de priorité : token partagé explicite d'abord,
    puis un `deviceToken` explicite, puis un token par périphérique stocké (indexé par
    `deviceId` + `role`).
  - `auth.bootstrapToken` n'est envoyé que si aucun des éléments ci-dessus n'a résolu un
    `auth.token`. Un token partagé ou tout token de périphérique résolu le supprime.
  - La promotion automatique d'un jeton d'appareil stocké lors de la nouvelle tentative ponctuelle `AUTH_TOKEN_MISMATCH` est réservée **aux points de terminaison de confiance uniquement** — bouclage, ou `wss://` avec un `tlsFingerprint` épinglé. Un `wss://` public sans épinglage ne remplit pas les conditions.
- Les entrées `hello-ok.auth.deviceTokens` supplémentaires sont des jetons de transfert d'amorçage. Ne les conservez que lorsque la connexion a utilisé une authentification d'amorçage sur un transport de confiance tel que `wss://` ou un appariement bouclage/local.
- Si un client fournit une `deviceToken` ou une `scopes` **explicite**, cet ensemble de portées demandé par l'appelant reste faisant autorité ; les portées mises en cache ne sont réutilisées que lorsque le client réutilise le jeton stocké par appareil.
- Les jetons d'appareil peuvent être révoqués/rotatifs via `device.token.rotate` et `device.token.revoke` (nécessite la portée `operator.pairing`).
- `device.token.rotate` renvoie les métadonnées de rotation. Il renvoie le jeton porteur de remplacement uniquement pour les appels du même appareil déjà authentifiés avec ce jeton d'appareil, afin que les clients basés uniquement sur le jeton puissent enregistrer leur remplacement avant de se reconnecter. Les rotations partagées/administrateur ne renvoient pas le jeton porteur.
- L'émission, la rotation et la révocation de jetons restent limitées à l'ensemble de rôles approuvé enregistré dans l'entrée d'appariement de cet appareil ; la mutation de jetons ne peut pas étendre ou cibler un rôle d'appareil que l'approbation d'appariement n'a jamais accordé.
- Pour les sessions de jeton d'appareil apparié, la gestion des appareils est auto-portée, sauf si l'appelant possède également `operator.admin` : les appelants non-administrateurs ne peuvent supprimer/révoquer/rotater que leur propre entrée d'appareil.
- `device.token.rotate` et `device.token.revoke` vérifient également l'ensemble de portées du jeton d'opérateur cible par rapport aux portées de session actuelles de l'appelant. Les appelants non-administrateurs ne peuvent pas faire tourner ou révoquer un jeton d'opérateur plus large que celui qu'ils détiennent déjà.
- Les échecs d'authentification incluent `error.details.code` ainsi que des indices de récupération :
  - `error.details.canRetryWithDeviceToken` (booléen)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportement du client pour `AUTH_TOKEN_MISMATCH` :
  - Les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton mis en cache par appareil.
  - Si cette nouvelle tentative échoue, les clients doivent arrêter les boucles de reconnexion automatique et afficher des conseils d'action pour l'opérateur.

## Identité de l'appareil + appairage

- Les nœuds doivent inclure une identité d'appareil stable (`device.id`) dérivée de
  l'empreinte d'une paire de clés.
- Les passerelles émettent des jetons par appareil et par rôle.
- Les approbations d'appairage sont requises pour les nouveaux ID d'appareil, sauf si l'auto-approbation
  locale est activée.
- L'auto-approbation de l'appairage est centrée sur les connexions en boucle locale directe.
- OpenClaw dispose également d'un chemin étroit de connexion automatique backend/conteneur-local pour
  les flux d'assistance de confiance à secret partagé.
- Les connexions tailnet ou LAN sur le même hôte sont toujours traitées comme distantes pour l'appairage et
  nécessitent une approbation.
- Les clients WS incluent normalement l'identité `device` lors du `connect` (opérateur +
  nœud). Les seules exceptions d'opérateur sans appareil concernent les chemins de confiance explicites :
  - `gateway.controlUi.allowInsecureAuth=true` pour la compatibilité HTTP non sécurisée uniquement sur localhost.
  - authentification `gateway.auth.mode: "trusted-proxy"` réussie de l'interface de contrôle de l'opérateur.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass, rétrogradation de sécurité sévère).
  - RPC backend `gateway-client` en boucle directe authentifiés avec le
    jeton/mot de passe de passerelle partagé.
- Toutes les connexions doivent signer le nonce `connect.challenge` fourni par le serveur.

### Diagnostics de migration de l'authentification des appareils

Pour les clients hérités qui utilisent encore le comportement de signature pré-défi, `connect` renvoie désormais
des codes de détail `DEVICE_AUTH_*` sous `error.details.code` avec un `error.details.reason` stable.

Échecs courants de migration :

| Message                     | details.code                     | details.reason           | Signification                                                           |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | Le client a omis `device.nonce` (ou a envoyé une valeur vide).          |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | Le client a signé avec un nonce obsolète/incorrect.                     |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | La charge utile de la signature ne correspond pas à la charge utile v2. |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | L'horodatage signé est en dehors de la dérive autorisée.                |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` ne correspond pas à l'empreinte de la clé publique.         |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Échec du format ou de la canonisation de la clé publique.               |

Cible de migration :

- Attendez toujours `connect.challenge`.
- Signez la charge utile v2 qui inclut le nonce du serveur.
- Envoyez le même nonce dans `connect.params.device.nonce`.
- La charge utile de signature préférée est `v3`, qui lie `platform` et `deviceFamily`
  en plus des champs device/client/role/scopes/token/nonce.
- Les signatures `v2` héritées restent acceptées pour la compatibilité, mais l'épinglage
  des métadonnées de l'appareil appairé contrôle toujours la stratégie de commande lors de la reconnexion.

## TLS + épinglage (pinning)

- TLS est pris en charge pour les connexions WS.
- Les clients peuvent éventuellement épingler l'empreinte du certificat de la passerelle (voir la configuration `gateway.tls`
  plus `gateway.remote.tlsFingerprint` ou le CLI `--tls-fingerprint`).

## Portée (Scope)

Ce protocole expose l'**API complète de la passerelle** (statut, canaux, modèles, chat,
agent, sessions, nœuds, approbations, etc.). La surface exacte est définie par les
schémas TypeBox dans `src/gateway/protocol/schema.ts`.

## Connexes

- [Protocole de passerelle (Bridge protocol)](/fr/gateway/bridge-protocol)
- [Manuel de procédures de la passerelle (Gateway runbook)](/fr/gateway)
