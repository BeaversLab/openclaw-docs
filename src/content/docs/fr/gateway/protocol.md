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
    "minProtocol": 3,
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

L'amorçage QR/code de configuration intégré est réservé aux nœuds. Une fois que le propriétaire a approuvé la
requête de nœud en attente, `hello-ok.auth` inclut le jeton de nœud principal :

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": []
  }
}
```

Le flux de code de configuration intégré n'inclut pas d'entrées `deviceTokens` supplémentaires
ni ne transmet de jeton d'opérateur. Les auteurs de clients doivent considérer le champ facultatif
`hello-ok.auth.deviceTokens` comme des données d'extension d'amorçage héritées/personnalisées :
ne les conserver que lorsqu'elles sont présentes sur un transport de confiance, et ne pas les exiger pour
l'appariement intégré.

### Exemple de nœud

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
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

Pour le modèle complet de portée d'opérateur, les vérifications lors de l'approbation et la sémantique des secrets partagés,
voir [Portées d'opérateur](/fr/gateway/operator-scopes).

### Rôles

- `operator` = client du plan de contrôle (CLI/interface utilisateur/automatisation).
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

Les méthodes de RPC de passerelle enregistrées par le plugin peuvent demander leur propre portée d'opérateur, mais
les préfixes d'administration principale réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
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
- `commands` : liste blanche de commandes pour l'appel.
- `permissions` : commutateurs granulaires (ex. `screen.record`, `camera.capture`).

Le Gateway traite celles-ci comme des **revendications** (claims) et applique des listes d'autorisation côté serveur.

## Presence

- `system-presence` renvoie des entrées indexées par l'identité de l'appareil.
- Les entrées de présence incluent `deviceId`, `roles` et `scopes` afin que les interfaces puissent afficher une seule ligne par appareil
  même lorsqu'il se connecte à la fois en tant qu'**opérateur** et **nœud**.
- `node.list` inclut des champs facultatifs `lastSeenAtMs` et `lastSeenReason`. Les nœuds connectés signalent
  leur heure de connexion actuelle en tant que `lastSeenAtMs` avec la raison `connect` ; les nœuds appariés peuvent également signaler
  une présence de fond durable lorsqu'un événement de nœud de confiance met à jour leurs métadonnées d'appariement.

### Événement de vie en arrière-plan du nœud

Les nœuds peuvent appeler `node.event` avec `event: "node.presence.alive"` pour enregistrer qu'un nœud apparié était
en vie lors d'un réveil en arrière-plan sans le marquer comme connecté.

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` est une énumération fermée : `background`, `silent_push`, `bg_app_refresh`,
`significant_location`, `manual`, ou `connect`. Les chaînes de déclencheur inconnues sont normalisées en
`background` par la passerelle avant la persistance. L'événement est durable uniquement pour les sessions de périphérique de nœud
authentifiées ; les sessions sans périphérique ou non appariées renvoient `handled: false`.

Les passerelles réussies renvoient un résultat structuré :

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

Les passerelles plus anciennes peuvent toujours renvoyer `{ "ok": true }` pour `node.event` ; les clients doivent le considérer comme un RPC reconnu, et non comme une persistance durable de la présence.

## Portée des événements de diffusion

Les événements de diffusion WebSocket poussés par le serveur sont limités par la portée afin que les sessions à portée de couplage ou les sessions de nœud uniquement ne reçoivent pas passivement le contenu de session.

- **Les trames de chat, d'agent et de résultat d'outil** (y compris les événements `agent` en continu et les résultats d'appels d'outils) nécessitent au moins `operator.read`. Les sessions sans `operator.read` ignorent entièrement ces trames.
- **Les diffusions `plugin.*` définies par le plugin** sont limitées à `operator.write` ou `operator.admin`, selon la manière dont le plugin les a enregistrées.
- **Les événements de statut et de transport** (`heartbeat`, `presence`, `tick`, cycle de vie de connexion/déconnexion, etc.) restent sans restriction afin que l'état du transport reste observable pour chaque session authentifiée.
- **Les familles d'événements de diffusion inconnus** sont filtrées par portée par défaut (fermeture par défaut) sauf si un gestionnaire enregistré les assouplit explicitement.

Chaque connexion client conserve son propre numéro de séquence par client afin que les diffusions préservent l'ordre monotone sur ce socket, même lorsque différents clients voient des sous-ensembles différents filtrés par portée du flux d'événements.

## Familles de méthodes RPC courantes

La surface publique WS est plus large que les exemples de poignée de main/d'authentification ci-dessus. Ce n'est pas une vidange générée — `hello-ok.features.methods` est une liste de découverte conservative construite à partir de `src/gateway/server-methods-list.ts` plus les exportations de méthodes de plugin/channel chargées. Traitez-le comme une découverte de fonctionnalités, et non comme une énumération complète de `src/gateway/server-methods/*.ts`.

<AccordionGroup>
  <Accordion title="Système et identité">
    - `health` retourne l'instantané de santé de la passerelle mis en cache ou sondé à nouveau.
    - `diagnostics.stability` retourne l'enregistreur de stabilité de diagnostic récent borné. Il conserve des métadonnées opérationnelles telles que les noms d'événements, les comptages, les tailles en octets, les lectures de mémoire, l'état de la file d'attente/session, les noms de channel/plugin et les identifiants de session. Il ne conserve pas le texte du chat, les corps de webhook, les sorties d'outil, les corps de requêtes ou réponses brutes, les jetons, les cookies ou les valeurs secrètes. La portée de lecture de l'opérateur est requise.
    - `status` retourne le résumé de la passerelle de style `/status` ; les champs sensibles sont inclus uniquement pour les clients opérateurs avec une portée d'administrateur.
    - `gateway.identity.get` retourne l'identité de l'appareil de la passerelle utilisée par les flux de relais et d'appariement.
    - `system-presence` retourne l'instantané de présence actuel pour les appareils opérateurs/nœuds connectés.
    - `system-event` ajoute un événement système et peut mettre à jour/diffuser le contexte de présence.
    - `last-heartbeat` retourne le dernier événement de battement de cœur persisté.
    - `set-heartbeats` active ou désactive le traitement des battements de cœur sur la passerelle.

  </Accordion>

  <Accordion title="Modèles et utilisation">
    - `models.list` renvoie le catalogue de modèles autorisés au runtime. Passez `{ "view": "configured" }` pour les modèles configurés de taille de sélecteur (`agents.defaults.models` d'abord, puis `models.providers.*.models`), ou `{ "view": "all" }` pour le catalogue complet.
    - `usage.status` renvoie les résumés des fenêtres d'utilisation/quota restant du fournisseur.
    - `usage.cost` renvoie les résumés d'utilisation des coûts agrégés pour une plage de dates.
    - `doctor.memory.status` renvoie la disponibilité de la mémoire vectorielle / des embeddings mis en cache pour l'espace de travail de l'agent par défaut actif. Passez `{ "probe": true }` ou `{ "deep": true }` uniquement lorsque l'appelant souhaite explicitement un ping en direct du fournisseur d'embeddings.
    - `doctor.memory.remHarness` renvoie un aperçu harnais REM délimité et en lecture seule pour les clients du plan de contrôle distant. Il peut inclure des chemins d'espace de travail, des extraits de mémoire, du markdown ancré rendu et des candidats à la promotion approfondie, les appelants ont donc besoin de `operator.read`.
    - `sessions.usage` renvoie les résumés d'utilisation par session.
    - `sessions.usage.timeseries` renvoie l'utilisation des séries temporelles pour une session.
    - `sessions.usage.logs` renvoie les entrées du journal d'utilisation pour une session.

  </Accordion>

  <Accordion title="Canaux et assistants de connexion">
    - `channels.status` renvoie les résumés de l'état des canaux/plugins intégrés et groupés.
    - `channels.logout` déconnecte un compte/canal spécifique lorsque le canal prend en charge la déconnexion.
    - `web.login.start` lance un flux de connexion QR/Web pour le fournisseur de canal Web actuel compatible QR.
    - `web.login.wait` attend que ce flux de connexion QR/Web se termine et lance le canal en cas de succès.
    - `push.test`iOS envoie une notification push APNs de test à un nœud iOS enregistré.
    - `voicewake.get` renvoie les déclencheurs de mot de réveil stockés.
    - `voicewake.set` met à jour les déclencheurs de mot de réveil et diffuse la modification.

  </Accordion>

  <Accordion title="Messagerie et journaux">
    - `send`RPC est le RPC de livraison sortante directe pour les envois ciblés vers channel/account/thread en dehors du chat runner.
    - `logs.tail` retourne la queue configurée du fichier-journal de la passerelle avec les contrôles curseur/limite et octets maximum.

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` renvoie le catalogue de fournisseurs Talk en lecture seule pour la reconnaissance vocale, la transcription en flux et la voix en temps réel. Il inclut les identifiants des fournisseurs, les étiquettes, l'état configuré, les identifiants de modèle/voix exposés, les modes canoniques, les transports, les stratégies cérébrales et les indicateurs de capacité audio/temps réel, sans retourner les secrets des fournisseurs ni modifier la configuration globale.
    - `talk.config` renvoie la charge utile de configuration Talk effective ; `includeSecrets` nécessite `operator.talk.secrets` (ou `operator.admin`).
    - `talk.session.create` crée une session Talk détenue par Gateway pour `realtime/gateway-relay`, `transcription/gateway-relay`, ou `stt-tts/managed-room`. Pour `stt-tts/managed-room`, les appelants `operator.write` qui transmettent `sessionKey` doivent également transmettre `spawnedBy` pour la visibilité de la clé de session délimitée ; la création de `sessionKey` non délimitée et `brain: "direct-tools"` nécessitent `operator.admin`.
    - `talk.session.join` valide un jeton de session de salle gérée, émet les événements `session.ready` ou `session.replaced` si nécessaire, et renvoie les métadonnées de la salle/session ainsi que les événements Talk récents, sans le jeton en texte clair ni le haché du jeton stocké.
    - `talk.session.appendAudio` ajoute de l'audio d'entrée PCM en base64 aux sessions de relais et de transcription en temps réel détenues par Gateway.
    - `talk.session.startTurn`, `talk.session.endTurn` et `talk.session.cancelTurn` pilotent le cycle de vie des tours de salle gérée avec un rejet des tours périmés avant que l'état ne soit effacé.
    - `talk.session.cancelOutput` arrête la sortie audio de l'assistant, principalement pour les interruptions contrôlées par le VAD dans les sessions de relais Gateway.
    - `talk.session.submitToolResult` termine un appel d'outil de fournisseur émis par une session de relais en temps réel détenue par Gateway. Transmettez `options: { willContinue: true }` pour la sortie intermédiaire de l'outil lorsqu'un résultat final suivra, ou `options: { suppressResponse: true }` lorsque le résultat de l'outil doit satisfaire l'appel du fournisseur sans démarrer une autre réponse d'assistant en temps réel.
    - `talk.session.close` ferme une session de relais, de transcription ou de salle gérée détenue par Gateway et émet des événements Talk terminaux.
    - `talk.mode` définit/diffuse l'état actuel du mode Talk pour les clients WebChat/Control UI.
    - `talk.client.create` crée une session de fournisseur en temps réel détenue par le client en utilisant `webrtc` ou `provider-websocket` tandis que Gateway possède la configuration, les informations d'identification, les instructions et la politique d'outils.
    - `talk.client.toolCall` permet aux transports en temps réel détenus par le client de transmettre les appels d'outils du fournisseur à la politique Gateway. Le premier outil pris en charge est `openclaw_agent_consult` ; les clients reçoivent un identifiant d'exécution et attendent les événements normaux du cycle de vie du chat avant de soumettre le résultat de l'outil spécifique au fournisseur.
    - `talk.event` est le canal d'événement Talk unique pour les adaptateurs en temps réel, de transcription, STT/TTS, de salle gérée, de téléphonie et de réunion.
    - `talk.speak` synthétise la parole via le fournisseur de parole Talk actif.
    - `tts.status` renvoie l'état d'activation TTS, le fournisseur actif, les fournisseurs de secours et l'état de configuration du fournisseur.
    - `tts.providers` renvoie l'inventaire visible des fournisseurs TTS.
    - `tts.enable` et `tts.disable` activent/désactivent l'état des préférences TTS.
    - `tts.setProvider` met à jour le fournisseur TTS préféré.
    - `tts.convert` exécute une conversion texte-vers-parole ponctuelle.

  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` résout à nouveau les SecretRefs actifs et n'échange l'état des secrets d'exécution qu'en cas de succès complet.
    - `secrets.resolve` résout les affectations de secrets commande-cible pour un ensemble commande/cible spécifique.
    - `config.get` renvoie l'instantané de configuration actuel et son hachage.
    - `config.set` écrit une charge utile de configuration validée.
    - `config.patch` fusionne une mise à jour partielle de la configuration.
    - `config.apply` valide + remplace la charge utile complète de la configuration.
    - `config.schema` renvoie la charge utile du schéma de configuration en direct utilisée par l'interface de contrôle et les outils CLI : schéma, `uiHints`, version et métadonnées de génération, y compris les métadonnées de schéma du plugin + channel lorsque l'exécution peut les charger. Le schéma comprend les métadonnées de champ `title` / `description` dérivées des mêmes étiquettes et textes d'aide utilisés par l'interface, y compris les branches de composition d'objet imbriqué, de caractère générique, d'élément de tableau et `anyOf` / `oneOf` / `allOf` lorsque la documentation du champ correspondant existe.
    - `config.schema.lookup` renvoie une charge utile de recherche dans un chemin pour un chemin de configuration : chemin normalisé, un nœud de schéma superficiel, indice correspondant + `hintPath`, et résumés des enfants immédiats pour le forage dans l'interface/CLI. Les nœuds de schéma de recherche conservent la documentation orientée utilisateur et les champs de validation courants (`title`, `description`, `type`, `enum`, `const`, `format`, `pattern`, limites numériques/chaîne/tableau/objet, et drapeaux comme `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`). Les résumés des enfants exposent `key`, `path` normalisé, `type`, `required`, `hasChildren`, ainsi que le `hint` / `hintPath` correspondant.
    - `update.run` exécute le flux de mise à jour de la passerelle et planifie un redémarrage uniquement lorsque la mise à jour elle-même a réussi ; les appelants avec une session peuvent inclure `continuationMessage` pour que le démarrage reprenne un tour d'agent de suivi via la file d'attente de continuation de redémarrage. Les mises à jour du gestionnaire de packages à partir du plan de contrôle utilisent un transfert de service géré détaché au lieu de remplacer l'arborescence des packages à l'intérieur du Gateway en cours d'exécution. Un transfert démarré renvoie `ok: true` avec `result.reason: "managed-service-handoff-started"` et `handoff.status: "started"` ; les transferts indisponibles ou échoués renvoient `ok: false` avec `managed-service-handoff-unavailable` ou `managed-service-handoff-failed`, plus `handoff.command` lorsqu'une mise à jour manuelle du shell est requise. Lors d'un transfert démarré, la sentinelle de redémarrage peut signaler brièvement `stats.reason: "restart-health-pending"` ; la continuation est retardée jusqu'à ce que le CLI vérifie la Gateway redémarrée et écrive la sentinelle finale `ok`.
    - `update.status` renvoie la dernière sentinelle de redémarrage de mise à jour en cache, y compris la version d'exécution après redémarrage si disponible.
    - `wizard.start`, `wizard.next`, `wizard.status` et `wizard.cancel` exposent l'assistant d'intégration via WS RPC.

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` renvoie les entrées d'agent configurées, y compris les métadonnées effectives du model et de l'exécution.
    - `agents.create`, `agents.update` et `agents.delete` gèrent les enregistrements d'agents et le câblage de l'espace de travail.
    - `agents.files.list`, `agents.files.get` et `agents.files.set` gèrent les fichiers d'amorçage de l'espace de travail exposés pour un agent.
    - `tasks.list`, `tasks.get` et `tasks.cancel` exposent le grand livre des tâches du Gateway aux clients SDK et opérateurs.
    - `artifacts.list`, `artifacts.get` et `artifacts.download` exposent les résumés et les téléchargements d'artefacts dérivés de la transcription pour une portée `sessionKey`, `runId` ou `taskId` explicite. Les requêtes d'exécution et de tâche résolvent la session propriétaire côté serveur et ne renvoient que les médias de transcription correspondants ; les sources d'URL non sécurisées ou locales renvoient des téléchargements non pris en charge au lieu de récupérer côté serveur.
    - `environments.list` et `environments.status` exposent la découverte de l'environnement local au Gateway et du nœud en lecture seule pour les clients SDK.
    - `agent.identity.get` renvoie l'identité effective de l'assistant pour un agent ou une session.
    - `agent.wait` attend la fin d'une exécution et renvoie l'instantané terminal lorsqu'il est disponible.

  </Accordion>

  <Accordion title="Contrôle de session">
    - `sessions.list` renvoie l'index de session actuel, y compris les métadonnées `agentRuntime` par ligne lorsqu'un backend d'exécution d'agent est configuré.
    - `sessions.subscribe` et `sessions.unsubscribe` activent ou désactivent les abonnements aux événements de changement de session pour le client WS actuel.
    - `sessions.messages.subscribe` et `sessions.messages.unsubscribe` activent ou désactivent les abonnements aux événements de transcription/message pour une session.
    - `sessions.preview` renvoie des aperçus de transcription bornés pour des clés de session spécifiques.
    - `sessions.describe` renvoie une ligne de session Gateway pour une clé de session exacte.
    - `sessions.resolve` résout ou canonise une cible de session.
    - `sessions.create` crée une nouvelle entrée de session.
    - `sessions.send` envoie un message dans une session existante.
    - `sessions.steer` est la variante d'interruption et de guidage pour une session active.
    - `sessions.abort` interrompt le travail actif pour une session. Un appelant peut passer `key` plus optionnellement `runId`, ou passer `runId` seul pour les exécutions actives que le Gateway peut résoudre en une session.
    - `sessions.patch` met à jour les métadonnées/overrides de session et rapporte le  canonique résolu ainsi que `agentRuntime` effectif.
    - `sessions.reset`, `sessions.delete`, et `sessions.compact` effectuent la maintenance de session.
    - `sessions.get` renvoie la ligne de session stockée complète.
    - L'exécution du chat utilise toujours `chat.history`, `chat.send`, `chat.abort`, et `chat.inject`. `chat.history` est normalisé pour l'affichage pour les clients UI : les balises de directive en ligne sont supprimées du texte visible, les payloads XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués) et les jetons de contrôle de  ASCII/pleine largeur fuyants sont supprimés, les lignes d'assistant purement silencieuses telles que `NO_REPLY` / `no_reply` exacts sont omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés.

  </Accordion>

  <Accordion title="Jumelage d'appareils et jetons d'appareil">
    - `device.pair.list` renvoie les appareils jumelés en attente et approuvés.
    - `device.pair.approve`, `device.pair.reject` et `device.pair.remove` gèrent les enregistrements de jumelage d'appareils.
    - `device.token.rotate` fait tourner un jeton d'appareil jumelé dans les limites de son rôle approuvé et de la portée de l'appelant.
    - `device.token.revoke` révoque un jeton d'appareil jumelé dans les limites de son rôle approuvé et de la portée de l'appelant.

  </Accordion>

  <Accordion title="Jumelage de nœud, invocation et travail en attente">
    - `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove` et `node.pair.verify` couvrent le jumelage de nœuds et la vérification de l'amorçage.
    - `node.list` et `node.describe` renvoient l'état des nœuds connus/connectés.
    - `node.rename` met à jour une étiquette de nœud jumelé.
    - `node.invoke` transmet une commande à un nœud connecté.
    - `node.invoke.result` renvoie le résultat d'une demande d'invocation.
    - `node.event` achemine les événements d'origine nœud vers la passerelle.
    - `node.pending.pull` et `node.pending.ack` sont les API de file d'attente des nœuds connectés.
    - `node.pending.enqueue` et `node.pending.drain` gèrent le travail en attente durable pour les nœuds hors ligne/déconnectés.

  </Accordion>

  <Accordion title="Familles d'approbations">
    - `exec.approval.request`, `exec.approval.get`, `exec.approval.list` et `exec.approval.resolve` couvrent les demandes d'approbation d'exécution ponctuelles ainsi que la recherche/relecture des approbations en attente.
    - `exec.approval.waitDecision` attend une approbation d'exécution en attente et renvoie la décision finale (ou `null` en cas d'expiration du délai).
    - `exec.approvals.get` et `exec.approvals.set` gèrent les instantanés de la stratégie d'approbation d'exécution de la passerelle.
    - `exec.approvals.node.get` et `exec.approvals.node.set` gèrent la stratégie d'approbation d'exécution locale au nœud via les commandes de relais du nœud.
    - `plugin.approval.request`, `plugin.approval.list`, `plugin.approval.waitDecision` et `plugin.approval.resolve` couvrent les flux d'approbation définis par des plugins.

  </Accordion>

  <Accordion title="Automatisation, compétences et outils">
    - Automatisation : `wake` planifie une injection de texte de réveil immédiate ou au prochain battement de cœur ; `cron.get`, `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`, `cron.run` et `cron.runs` gèrent le travail planifié.
    - `cron.run`RPC reste un RPC de type mise en file d'attente pour les exécutions manuelles. Les clients qui ont besoin d'une sémantique d'achèvement doivent lire le `runId` renvoyé et interroger `cron.runs`.
    - `cron.runs` accepte un filtre `runId` non vide facultatif afin que les clients puissent suivre une exécution manuelle mise en file d'attente sans entrer en concurrence avec d'autres entrées d'historique pour le même travail.
    - Compétences et outils : `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`, `tools.invoke`.

  </Accordion>
</AccordionGroup>

### Familles d'événements courantes

- `chat` : mises à jour du chat de l'interface utilisateur telles que `chat.inject` et d'autres événements de chat uniquement pour la transcription. Dans le protocole v4, les charges utiles delta contiennent `deltaText` ; `message` reste l'instantané cumulatif de l'assistant. Les remplacements non préfixés définissent `replace=true` et utilisent `deltaText` comme texte de remplacement.
- `session.message` , `session.operation` et `session.tool` : transcription, opération de session en cours et mises à jour du flux d'événements pour une session abonnée.
- `sessions.changed` : l'index ou les métadonnées de la session ont changé.
- `presence` : mises à jour de l'instantané de présence du système.
- `tick` : événement périodique de maintien en vie (keepalive) / de vérification de l'état (liveness).
- `health` : mise à jour de l'instantané de santé de la passerelle.
- `heartbeat` : mise à jour du flux d'événements de heartbeat.
- `cron` : événement de modification de l'exécution/tâche cron.
- `shutdown` : notification d'arrêt de la passerelle.
- `node.pair.requested` / `node.pair.resolved` : cycle de vie de l'appairage de nœuds.
- `node.invoke.request` : diffusion de la demande d'appel de nœud (node invoke).
- `device.pair.requested` / `device.pair.resolved` : cycle de vie de l'appareil appairé.
- `voicewake.changed` : la configuration du déclencheur par mot de réveil a changé.
- `exec.approval.requested` / `exec.approval.resolved` : cycle de vie de l'approbation d'exécution.
- `plugin.approval.requested` / `plugin.approval.resolved` : cycle de vie de l'approbation de plugin.

### Méthodes d'assistance de nœud

- Les nœuds peuvent appeler `skills.bins` pour récupérer la liste actuelle des exécutables de compétences pour les vérifications d'autorisation automatique.

### RPC du registre de tâches

Les clients opérateurs peuvent inspecter et annuler les enregistrements de tâches d'arrière-plan du Gateway via les RPC du registre de tâches. Ces méthodes renvoient des résumés de tâches nettoyés, et non l'état d'exécution brut.

- `tasks.list` nécessite `operator.read`.
  - Paramètres : `status` facultatif (`"queued"`, `"running"`, `"completed"`,
    `"failed"`, `"cancelled"` ou `"timed_out"`) ou un tableau de ces statuts,
    `agentId` facultatif, `sessionKey` facultatif, `limit` facultatif de `1` à
    `500`, et chaîne `cursor` facultative.
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

`TaskSummary` inclut `id`, `status` et des métadonnées facultatives telles que `kind`,
`runtime`, `title`, `agentId`, `sessionKey`, `childSessionKey`, `ownerKey`,
`runId`, `taskId`, `flowId`, `parentTaskId`, `sourceId`, les horodatages, la progression,
le résumé de fin et le texte d'erreur nettoyé.

### Méthodes d'aide pour les opérateurs

- Les opérateurs peuvent appeler `commands.list` (`operator.read`) pour récupérer l'inventaire
  des commandes d'exécution pour un agent.
  - `agentId` est facultatif ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - `scope` contrôle la surface cible du `name` principal :
    - `text` renvoie le jeton de commande textuel principal sans le `/` initial
    - `native` et le chemin `both` par défaut renvoient des noms natifs conscients du fournisseur
      lorsqu'ils sont disponibles
  - `textAliases` contient des alias de slash exacts tels que `/model` et `/m`.
  - `nativeName` contient le nom de commande natif conscient du fournisseur lorsqu'il existe.
  - `provider` est facultatif et n'affecte que la nomination native ainsi que la disponibilité des commandes de plugins natifs.
  - `includeArgs=false` omet les métadonnées d'arguments sérialisées de la réponse.
- Les opérateurs peuvent appeler `tools.catalog` (`operator.read`) pour récupérer le catalogue d'outils d'exécution pour un
  agent. La réponse inclut les outils groupés et les métadonnées de provenance :
  - `source` : `core` ou `plugin`
  - `pluginId` : propriétaire du plugin lorsque `source="plugin"`
  - `optional` : indique si un outil de plugin est facultatif
- Les opérateurs peuvent appeler `tools.effective` (`operator.read`) pour récupérer l'inventaire d'outils effectif à l'exécution pour une session.
  - `sessionKey` est requis.
  - La passerelle dérive un contexte d'exécution de confiance à partir de la session côté serveur au lieu d'accepter
    le contexte d'authentification ou de livraison fourni par l'appelant.
  - La réponse est limitée à la session et reflète ce que la conversation active peut utiliser maintenant,
    y compris les outils principaux, de plugin et de canal.
- Les opérateurs peuvent appeler `tools.invoke` (`operator.write`) pour invoquer un outil disponible via le
  même chemin de stratégie de passerelle que `/tools/invoke`.
  - `name` est requis. `args`, `sessionKey`, `agentId`, `confirm` et
    `idempotencyKey` sont facultatifs.
  - Si à la fois `sessionKey` et `agentId` sont présents, l'agent de session résolu doit correspondre à
    `agentId`.
  - La réponse est une enveloppe orientée SDK avec `ok`, `toolName`, `output` facultatif, et les champs typés
    `error`. Les refus d'approbation ou de stratégie renvoient `ok:false` dans la charge utile plutôt que
    de contourner le pipeline de stratégie d'outils de la passerelle.
- Les opérateurs peuvent appeler `skills.status` (`operator.read`) pour récupérer l'inventaire de compétences visible pour un agent.
  - `agentId` est facultatif ; omettez-le pour lire l'espace de travail de l'agent par défaut.
  - La réponse comprend l'éligibilité, les exigences manquantes, les vérifications de configuration et
    les options d'installation nettoyées sans exposer les valeurs brutes des secrets.
- Les opérateurs peuvent appeler `skills.search` et `skills.detail` (`operator.read`) pour obtenir les métadonnées de découverte ClawHub.
- Les opérateurs peuvent appeler `skills.upload.begin`, `skills.upload.chunk` et `skills.upload.commit` (`operator.admin`) pour préparer une archive de compétences privée avant de l'installer. Il s'agit d'un chemin d'administration de téléchargement distinct pour les clients de confiance, et non du flux d'installation normal des compétences ClawHub, et il est désactivé par défaut sauf si `skills.install.allowUploadedArchives` est activé.
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    crée un téléchargement lié à ce slug et à cette valeur de force.
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` ajoute des octets au
    décodage exact à l'offset indiqué.
  - `skills.upload.commit({ uploadId, sha256? })` vérifie la taille finale et
    le SHA-256. L'opération de commit finalise uniquement le téléchargement ; elle n'installe pas la compétence.
  - Les archives de compétences téléchargées sont des archives zip contenant une racine `SKILL.md`. Le
    nom du répertoire interne de l'archive ne sélectionne jamais la cible de l'installation.
- Les opérateurs peuvent appeler `skills.install` (`operator.admin`) dans trois modes :
  - Mode ClawHub : `{ source: "clawhub", slug, version?, force? }` installe un
    dossier de compétences dans le répertoire de l'espace de travail de l'agent par défaut `skills/`.
  - Mode de téléchargement : `{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    installe un téléchargement validé dans le répertoire de l'espace de travail de l'agent par défaut `skills/<slug>`.
    Le slug et la valeur de force doivent correspondre à la requête `skills.upload.begin` d'origine. Ce mode est rejeté sauf si
    `skills.install.allowUploadedArchives` est activé. Ce paramètre n'affecte pas les installations ClawHub.
  - Mode d'installation Gateway : `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    exécute une action `metadata.openclaw.install` déclarée sur l'hôte de la passerelle.
- Les opérateurs peuvent appeler `skills.update` (`operator.admin`) dans deux modes :
  - Le mode ClawHub met à jour un slug suivi ou toutes les installations ClawHub suivies dans
    l'espace de travail de l'agent par défaut.
  - Le mode Config corrige les `skills.entries.<skillKey>` valeurs telles que `enabled`,
    `apiKey` et `env`.

### Vues `models.list`

`models.list` accepte un paramètre `view` optionnel :

- Omis ou `"default"` : comportement d'exécution actuel. Si `agents.defaults.models` est configuré, la réponse est le catalogue autorisé, incluant les modèles découverts dynamiquement pour les entrées `provider/*`. Sinon, la réponse est le catalogue complet du Gateway.
- `"configured"` : comportement de taille de sélecteur. Si `agents.defaults.models` est configuré, il prévaut toujours, incluant la découverte délimitée par fournisseur pour les entrées `provider/*`. Sans liste blanche, la réponse utilise des entrées `models.providers.*.models` explicites, revenant au catalogue complet uniquement lorsqu'aucune ligne de modèle configurée n'existe.
- `"all"` : catalogue complet du Gateway, en contournant `agents.defaults.models`. Utilisez ceci pour les diagnostics et les interfaces de découverte, et non pour les sélecteurs de modèles normaux.

## Approbations d'exécution

- Lorsqu'une requête d'exécution nécessite une approbation, la passerelle diffuse `exec.approval.requested`.
- Les clients opérateurs résolvent en appelant `exec.approval.resolve` (nécessite la portée `operator.approvals`).
- Pour `host=node`, `exec.approval.request` doit inclure `systemRunPlan` (métadonnées canoniques `argv`/`cwd`/`rawCommand`/session). Les demandes manquant `systemRunPlan` sont rejetées.
- Après approbation, les appels transférés `node.invoke system.run` réutilisent ce canonique
  `systemRunPlan` comme contexte de commande/répertoire/session autoritaire.
- Si un appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou
  `sessionKey` entre la préparation et la réexpédition finale approuvée `system.run`, la passerelle
  rejette l'exécution au lieu de faire confiance à la charge utile modifiée.

## Secours de livraison d'agent

- Les requêtes `agent` peuvent inclure `deliver=true` pour demander la livraison sortante.
- `bestEffortDeliver=false` conserve un comportement strict : les cibles de livraison non résolues ou uniquement internes renvoient `INVALID_REQUEST`.
- `bestEffortDeliver=true` permet un repli sur une exécution en session seule lorsqu'aucune route de livraison externe ne peut être résolue (par exemple pour les sessions internes/webchat ou les configurations multi-canaux ambiguës).
- Les résultats finaux `agent` peuvent inclure `result.deliveryStatus` lorsque la livraison a été
  demandée, en utilisant les mêmes statuts `sent`, `suppressed`, `partial_failed` et `failed`
  documentés pour [`openclaw agent --json --deliver`](/fr/cli/agent#json-delivery-status).

## Versioning

- `PROTOCOL_VERSION` se trouve dans `src/gateway/protocol/version.ts`.
- Les clients envoient `minProtocol` + `maxProtocol` ; le serveur rejette les plages qui
  n'incluent pas son protocole actuel. Les clients et serveurs actuels nécessitent
  le protocole v4.
- Les schémas et modèles sont générés à partir des définitions TypeBox :
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Client constants

Le client de référence dans `src/gateway/client.ts` utilise ces valeurs par défaut. Les valeurs sont
stables sur le protocole v4 et constituent la base attendue pour les clients tiers.

| Constante                                                               | Par défaut                                                  | Source                                                                                           |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `PROTOCOL_VERSION`                                                      | `4`                                                         | `src/gateway/protocol/version.ts`                                                                |
| `MIN_CLIENT_PROTOCOL_VERSION`                                           | `4`                                                         | `src/gateway/protocol/version.ts`                                                                |
| Délai d'expiration de la requête (par RPC)                              | `30_000` ms                                                 | `src/gateway/client.ts` (`requestTimeoutMs`)                                                     |
| Délai d'expiration de préauth / de défi de connexion                    | `15_000` ms                                                 | `src/gateway/handshake-timeouts.ts` (config/env peut augmenter le budget serveur/client associé) |
| Délai de reconnexion initial                                            | `1_000` ms                                                  | `src/gateway/client.ts` (`backoffMs`)                                                            |
| Délai maximal de reconnexion                                            | `30_000` ms                                                 | `src/gateway/client.ts` (`scheduleReconnect`)                                                    |
| Limite de nouvelle tentative rapide après fermeture du jeton d'appareil | `250` ms                                                    | `src/gateway/client.ts`                                                                          |
| Délai de grâce avant l'arrêt forcé avant `terminate()`                  | `250` ms                                                    | `FORCE_STOP_TERMINATE_GRACE_MS`                                                                  |
| Délai d'expiration par défaut `stopAndWait()`                           | `1_000` ms                                                  | `STOP_AND_WAIT_TIMEOUT_MS`                                                                       |
| Intervalle de tick par défaut (pré `hello-ok`)                          | `30_000` ms                                                 | `src/gateway/client.ts`                                                                          |
| Fermeture par expiration du tick                                        | code `4000` lorsque le silence dépasse `tickIntervalMs * 2` | `src/gateway/client.ts`                                                                          |
| `MAX_PAYLOAD_BYTES`                                                     | `25 * 1024 * 1024` (25 Mo)                                  | `src/gateway/server-constants.ts`                                                                |

Le serveur annonce le `policy.tickIntervalMs`, `policy.maxPayload`
et `policy.maxBufferedBytes` effectifs dans `hello-ok` ; les clients doivent respecter ces valeurs
plutôt que les valeurs par défaut pré-handshake.

## Authentification

- L'authentification de la passerelle par secret partagé utilise `connect.params.auth.token` ou
  `connect.params.auth.password`, selon le mode d'authentification configuré.
- Les modes avec identité tels que Tailscale Serve
  (`gateway.auth.allowTailscale: true`) ou `gateway.auth.mode: "trusted-proxy"` non bouclé
  satisfont la vérification d'authentification de connexion à partir des
  en-têtes de requête au lieu de `connect.params.auth.*`.
- Le `gateway.auth.mode: "none"` d'entrée privée ignore complètement l'authentification
  de connexion par secret partagé ; n'exposez pas ce mode sur une entrée publique/non fiable.
- Après l'appairage, le Gateway émet un **jeton d'appareil** délimité au rôle
  de connexion + scopes. Il est renvoyé dans `hello-ok.auth.deviceToken` et doit être
  conservé par le client pour les connexions futures.
- Les clients doivent conserver le `hello-ok.auth.deviceToken` principal après toute
  connexion réussie.
- La reconnexion avec ce jeton d'appareil **stocké** doit également réutiliser
  l'ensemble de portées approuvées stockées pour ce jeton. Cela préserve l'accès
  lecture/sondage/statut déjà accordé et évite de réduire silencieusement les
  reconnexions à une portée implicite administrateur plus restreinte.
- Assemblage de l'authentification de connexion côté client (`selectConnectAuth` dans
  `src/gateway/client.ts`) :
  - `auth.password` est orthogonal et est toujours transmis lorsqu'il est défini.
  - `auth.token` est rempli par ordre de priorité : le jeton partagé explicite d'abord,
    puis un `deviceToken` explicite, puis un jeton stocké par appareil (indexé par
    `deviceId` + `role`).
  - `auth.bootstrapToken` n'est envoyé que si aucun des éléments ci-dessus n'a permis de résoudre un
    `auth.token`. Un jeton partagé ou tout jeton d'appareil résolu le supprime.
  - La promotion automatique d'un jeton d'appareil stocké lors de la tentative unique
    `AUTH_TOKEN_MISMATCH` est limitée aux **points de terminaison de confiance uniquement** —
    boucle locale, ou `wss://` avec un `tlsFingerprint` épinglé. Un `wss://` public
    sans épinglage ne remplit pas les conditions.
- L'amorçage par code de configuration intégré renvoie uniquement le `hello-ok.auth.deviceToken` du nœud principal ;
  les clients ne doivent pas s'attendre à un jeton d'opérateur supplémentaire dans
  `hello-ok.auth.deviceTokens`.
- Pendant que l'amorçage par code de configuration intégré attend l'approbation, les détails
  `PAIRING_REQUIRED` incluent `recommendedNextStep: "wait_then_retry"`, `retryable: true`,
  et `pauseReconnect: false`. Les clients doivent continuer à se reconnecter avec le même
  jeton d'amorçage jusqu'à ce que la demande soit approuvée ou que le jeton devienne invalide.
- Si un flux d'amorçage de confiance personnalisé ou ancien inclut des entrées `hello-ok.auth.deviceTokens` facultatives,
  ne les persistez que lorsque la connexion utilisait une authentification d'amorçage sur un transport de confiance tel que `wss://` ou un appariement en boucle locale/local.
- Si un client fournit un `deviceToken` **explicite** ou un `scopes` explicite, cet ensemble
  de portées demandé par l'appelant reste autoritaire ; les portées mises en cache ne sont
  réutilisées que lorsque le client réutilise le jeton stocké par appareil.
- Les jetons d'appareil peuvent être révoqués/rotatifs via `device.token.rotate` et
  `device.token.revoke` (nécessite la portée `operator.pairing`).
- `device.token.rotate` renvoie les métadonnées de rotation. Il renvoie le jeton de remplacement (bearer token) uniquement pour les appels provenant du même appareil qui sont déjà authentifiés avec ce jeton d'appareil, afin que les clients basés uniquement sur un jeton puissent conserver leur remplacement avant de se reconnecter. Les rotations partagées/admin ne renvoient pas le jeton bearer.
- L'émission, la rotation et la révocation des jetons restent limitées à l'ensemble de rôles approuvés enregistré dans l'entrée de couplage (pairing) de cet appareil ; la mutation des jetons ne peut pas étendre ou cibler un rôle d'appareil que l'approbation de couplage n'a jamais accordé.
- Pour les sessions de jetons d'appareils couplés, la gestion des appareils est à portée autonome (self-scoped) sauf si l'appelant possède également `operator.admin` : les appelants non-admin peuvent supprimer/révoquer/faire pivoter uniquement leur propre entrée d'appareil.
- `device.token.rotate` et `device.token.revoke` vérifient également l'ensemble des portées (scope set) du jeton d'opérateur cible par rapport aux portées de session actuelles de l'appelant. Les appelants non-admin ne peuvent pas faire pivoter ou révoquer un jeton d'opérateur plus large que celui qu'ils détiennent déjà.
- Les échecs d'authentification incluent `error.details.code` ainsi que des indices de récupération :
  - `error.details.canRetryWithDeviceToken` (booléen)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportement du client pour `AUTH_TOKEN_MISMATCH` :
  - Les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton par appareil mis en cache.
  - Si cette nouvelle tentative échoue, les clients doivent arrêter les boucles de reconnexion automatique et présenter des directives d'action pour l'opérateur.
- `AUTH_SCOPE_MISMATCH` signifie que le jeton de l'appareil a été reconnu mais ne couvre pas les rôles/portées demandés. Les clients ne doivent pas présenter cela comme un mauvais jeton ; invitez l'opérateur à recoupler ou à approuver le contrat de portée plus étroit ou plus large.

## Identité de l'appareil + couplage

- Les nœuds doivent inclure une identité d'appareil stable (`device.id`) dérivée d'une empreinte digitale de paire de clés.
- Les passerelles émettent des jetons par appareil + rôle.
- Les approbations de couplage sont requises pour les nouveaux ID d'appareil, sauf si l'auto-approbation locale est activée.
- L'auto-approbation du couplage est centrée sur les connexions directes en boucle locale (local loopback).
- OpenClaw possède également un chemin étroit de connexion automatique backend/conteneur-local pour les flux d'assistance de confiance à secret partagé.
- Les connexions tailnet ou LAN sur le même hôte sont toujours traitées comme distantes pour l'appariement et nécessitent une approbation.
- Les clients WS incluent normalement l'identité `device` lors du `connect` (opérateur + nœud). Les seules exceptions d'opérateur sans appareil sont les chemins de confiance explicites :
  - `gateway.controlUi.allowInsecureAuth=true` pour la compatibilité HTTP non sécurisée réservée à localhost.
  - authentification réussie de l'opérateur `gateway.auth.mode: "trusted-proxy"` Control UI.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass, dégradation sévère de la sécurité).
  - RPC backend `gateway-client` en boucle directe authentifiés avec le jeton/mot de passe de passerelle partagé.
- Toutes les connexions doivent signer le nonce `connect.challenge` fourni par le serveur.

### Diagnostics de migration de l'authentification de l'appareil

Pour les clients hérités qui utilisent encore le comportement de signature pré-défi, `connect` renvoie désormais des codes de détail `DEVICE_AUTH_*` sous `error.details.code` avec un `error.details.reason` stable.

Échecs de migration courants :

| Message                     | details.code                     | details.reason           | Signification                                                           |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | Le client a omis `device.nonce` (ou a envoyé une valeur vide).          |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | Le client a signé avec un nonce périmé ou incorrect.                    |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | La charge utile de la signature ne correspond pas à la charge utile v2. |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | L'horodatage signé est en dehors de la dérive autorisée.                |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` ne correspond pas à l'empreinte de la clé publique.         |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Échec du format ou de la canonicalisation de la clé publique.           |

Cible de migration :

- Attendez toujours le `connect.challenge`.
- Signez la charge utile v2 qui inclut le nonce du serveur.
- Envoyez le même nonce dans `connect.params.device.nonce`.
- La charge utile de signature préférée est `v3`, qui lie `platform` et `deviceFamily`
  en plus des champs device/client/role/scopes/token/nonce.
- Les signatures `v2` héritées restent acceptées pour des raisons de compatibilité, mais l'épinglage des métadonnées des appareils jumelés contrôle toujours la stratégie de commande lors de la reconnexion.

## TLS + épinglage (pinning)

- TLS est pris en charge pour les connexions WS.
- Les clients peuvent éventuellement épingler l'empreinte du certificat de la passerelle (voir la configuration `gateway.tls`
  ainsi que `gateway.remote.tlsFingerprint` ou la CLI `--tls-fingerprint`).

## Portée (Scope)

Ce protocole expose l'API complète de la passerelle (statut, canaux, modèles, chat,
agent, sessions, nœuds, approbations, etc.). La surface exacte est définie par les
schémas TypeBox dans `src/gateway/protocol/schema.ts`.

## Connexes

- [Protocole de pont](/fr/gateway/bridge-protocol)
- [Guide de procédures Gateway](/fr/gateway)
