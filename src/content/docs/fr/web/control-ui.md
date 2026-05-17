---
summary: "GatewayInterface de contrôle basée sur le navigateur pour le Gateway (chat, nœuds, config)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Interface de contrôle"
sidebarTitle: "Interface de contrôle"
---

Le Control UI est une petite application monopage **Vite + Lit** servie par le Gateway :

- par défaut : `http://<host>:18789/`
- préfixe facultatif : définissez `gateway.controlUi.basePath` (par ex. `/openclaw`)

Il communique **directement avec le WebSocket du Gateway** sur le même port.

## Ouverture rapide (local)

Si le Gateway s'exécute sur le même ordinateur, ouvrez :

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (ou [http://localhost:18789/](http://localhost:18789/))

Si la page échoue à charger, démarrez d'abord le Gateway : Gateway`openclaw gateway`.

L'authentification est fournie lors de la poignée de main WebSocket via :

- `connect.params.auth.token`
- `connect.params.auth.password`
- En-têtes d'identité Tailscale Serve quand Tailscale`gateway.auth.allowTailscale: true`
- en-têtes d'identité trusted-proxy quand `gateway.auth.mode: "trusted-proxy"`

Le panneau des paramètres du tableau de bord conserve un jeton pour la session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée ; les mots de passe ne sont pas persistants. L'onboarding génère généralement un jeton de passerelle pour l'authentification par secret partagé lors de la première connexion, mais l'authentification par mot de passe fonctionne également quand `gateway.auth.mode` est `"password"`.

## Appareillage des appareils (première connexion)

Lorsque vous vous connectez à l'interface de contrôle depuis un nouveau navigateur ou appareil, le Gateway nécessite généralement une **approbation d'appariement unique**. Il s'agit d'une mesure de sécurité pour empêcher tout accès non autorisé.

**Ce que vous verrez :** « déconnecté (1008) : appareillage requis »

<Steps>
  <Step title="Lister les demandes en attente">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="Approuver par ID de demande">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

Si le navigateur réessaie l'appairage avec des détails d'authentification modifiés (rôle/portées/clé publique), la demande en attente précédente est remplacée et un nouveau `requestId` est créé. Réexécutez `openclaw devices list` avant l'approbation.

Si le navigateur est déjà apparié et que vous le modifiez pour passer d'un accès en lecture à un accès en écriture/administrateur, cela est considéré comme une mise à niveau de l'approbation, et non comme une reconnexion silencieuse. OpenClaw conserve l'ancienne approbation active, bloque la reconnexion plus large et vous demande d'approuver explicitement le nouvel ensemble de portées.

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de nouvelle approbation, sauf si vous le révoquez avec `openclaw devices revoke --device <id> --role <role>`CLI. Consultez [CLI Devices](/fr/cli/devices) pour la rotation et la révocation des jetons.

<Note>
- Les connexions directes de navigateur en boucle locale (`127.0.0.1` / `localhost`Tailscale) sont automatiquement approuvées.
- Tailscale Serve peut ignorer l'aller-retour d'appariement pour les sessions d'opérateur de l'interface de contrôle lorsque `gateway.auth.allowTailscale: true`Tailscale, l'identité Tailscale est vérifiée et que le navigateur présente son identité d'appareil.
- Les liaisons directes Tailnet, les connexions de navigateur LAN et les profils de navigateur sans identité d'appareil nécessitent toujours une approbation explicite.
- Chaque profil de navigateur génère un ID d'appareil unique ; le changement de navigateur ou l'effacement des données du navigateur nécessitera donc un nouvel appariement.

</Note>

## Personal identity (browser-local)

The Control UI supports a per-browser personal identity (display name and avatar) attached to outgoing messages for attribution in shared sessions. It lives in browser storage, is scoped to the current browser profile, and is not synced to other devices or persisted server-side beyond the normal transcript authorship metadata on messages you actually send. Clearing site data or switching browsers resets it to empty.

Le même modèle local au navigateur s'applique à la substitution de l'avatar de l'assistant. Les avatars d'assistant téléchargés superposent l'identité résolue par la passerelle uniquement sur le navigateur local et ne font jamais l'aller-retour via `config.patch`. Le champ de configuration partagé `ui.assistant.avatar` est toujours disponible pour les clients sans interface utilisateur écrivant directement dans ce champ (tels que les passerelles scriptées ou les tableaux de bord personnalisés).

## Runtime config endpoint

L'interface de contrôle récupère ses paramètres d'exécution à partir de `/__openclaw/control-ui-config.json`Tailscale. Ce point de terminaison est protégé par la même authentification de passerelle que le reste de la surface HTTP : les navigateurs non authentifiés ne peuvent pas le récupérer, et une récupération réussie nécessite soit un jeton/mot de passe de passerelle déjà valide, une identité Tailscale Serve, soit une identité de proxy approuvé.

## Language support

The Control UI can localize itself on first load based on your browser locale. To override it later, open **Overview -> Gateway Access -> Language**. The locale picker lives in the Gateway Access card, not under Appearance.

- Paramètres régionaux pris en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `ar`, `it`, `tr`, `uk`, `id`, `pl`, `th`, `vi`, `nl`, `fa`
- Les traductions non anglophones sont chargées à la demande dans le navigateur.
- Le paramètre régional sélectionné est enregistré dans le stockage du navigateur et réutilisé lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais par défaut.

Les traductions de la documentation sont générées pour le même ensemble de paramètres régionaux non anglophones, mais le sélecteur de langue intégré du site de documentation Mintlify est limité aux codes de paramètres régionaux acceptés par Mintlify. Les documents en thaï (`th`) et en persan (`fa`) sont toujours générés dans le dépôt de publication ; ils peuvent ne pas apparaître dans ce sélecteur tant que Mintlify ne prendra pas en charge ces codes.

## Thèmes d'apparence

Le panneau Apparence conserve les thèmes intégrés Claw, Knot et Dash, plus un emplacement d'importation tweakcn local au navigateur. Pour importer un thème, ouvrez [tweakcn editor](https://tweakcn.com/editor/theme), choisissez ou créez un thème, cliquez sur **Share**, et collez le lien du thème copié dans Apparence. L'importateur accepte également les URL de registre `https://tweakcn.com/r/themes/<id>`, les URL d'éditeur comme `https://tweakcn.com/editor/theme?theme=amethyst-haze`, les chemins relatifs `/themes/<id>`, les identifiants de thèmes bruts, et les noms de thèmes par défaut tels que `amethyst-haze`.

Les thèmes importés sont stockés uniquement dans le profil de navigateur actuel. Ils ne sont pas écrits dans la configuration de la passerelle et ne sont pas synchronisés entre les appareils. Le remplacement du thème importé met à jour l'emplacement local unique ; son effacement remet le thème actif sur Claw si le thème importé était sélectionné.

## Ce qu'il peut faire (aujourd'hui)

<AccordionGroup>
  <Accordion title="Chat et Talk">
    - Discutez avec le modèle via le Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`).
    - Les actualisations de l'historique de chat demandent une fenêtre récente limitée avec des plafonds de texte par message, afin que les grandes sessions ne forcent pas le navigateur à rendre une charge utile de transcription complète avant que le chat ne devienne utilisable.
    - Parlez via des sessions en temps réel du navigateur. OpenAI utilise un WebRTC direct, Google Live utilise un jeton de navigateur à usage unique limité sur WebSocket, et les plugins vocaux en temps réel backend-only utilisent le transport relais du Gateway. Les sessions de provider détenues par le client commencent par `talk.client.create` ; les sessions relais du Gateway commencent par `talk.session.create`. Le relai conserve les informations d'identification du provider sur le Gateway tandis que le navigateur diffuse le PCM du microphone via `talk.session.appendAudio` et transfère les appels d'outil du provider `openclaw_agent_consult` via `talk.client.toolCall` pour la politique du Gateway et le modèle OpenClaw plus grand configuré.
    - Diffusez les appels d'outil + les cartes de sortie d'outil en direct dans le Chat (événements d'agent).

  </Accordion>
  <Accordion title="Channels, instances, sessions, dreams">
    - Channels : statuts des canaux intégrés, groupés et de plugins externes, connexion QR et configuration par canal (`channels.status`, `web.login.*`, `config.patch`).
    - Les actualisations des sondages de canaux gardent l'instantané précédent visible pendant que les vérifications lentes du provider se terminent, et les instantanés partiels sont étiquetés lorsqu'un sondage ou un audit dépasse son budget d'interface utilisateur.
    - Instances : liste de présence + actualisation (`system-presence`).
    - Sessions : liste les sessions d'agents configurées par défaut, revient aux clés de session d'agents non configurés obsolètes, et applique les priorités par session model/thinking/fast/verbose/trace/reasoning (`sessions.list`, `sessions.patch`).
    - Dreams : statut de rêverie, bouton d'activation/désactivation, et lecteur de Dream Diary (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).

  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">
    - Tâches Cron : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`).
    - Skills : statut, activer/désactiver, installer, mises à jour de la clé API (`skills.*`).
    - Nœuds : liste + capacités (`node.list`).
    - Approbations d'exécution : modifier les listes d'autorisation de la passerelle ou des nœuds + demander la politique pour `exec host=gateway/node` (`exec.approvals.*`).

  </Accordion>
  <Accordion title="Config">
    - Afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`).
    - Appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active.
    - Les écritures incluent une protection de base de hachage pour éviter d'écraser les modifications simultanées.
    - Les écritures (`config.set`/`config.apply`/`config.patch`) effectuent une résolution active avant vol de SecretRef pour les références dans la charge utile de configuration soumise ; les références actives soumises non résolues sont rejetées avant l'écriture.
    - Rendu de schéma + de formulaire (`config.schema` / `config.schema.lookup`, y compris le champ `title` / `description`, indices d'interface utilisateur correspondants, résumés des enfants immédiats, métadonnées de documentation sur les nœuds d'objet imbriqué/générique/tableau/composition, ainsi que les schémas de plugin + de canal lorsque disponibles) ; l'éditeur JSON brut n'est disponible que lorsque l'instantané possède un aller-retour brut sécurisé.
    - Si un instantané ne peut pas effectuer un aller-retour brut sécurisé, l'interface de contrôle Force le mode Formulaire et désactive le mode Brut pour cet instantané.
    - L'éditeur JSON brut "Réinitialiser à la sauvegarde" préserve la forme brute d'origine (formatage, commentaires, disposition `$include`) au lieu de restituer un instantané aplati, ce qui permet aux modifications externes de survivre à une réinitialisation lorsque l'instantané peut effectuer un aller-retour sécurisé.
    - Les valeurs d'objet SecretRef structurées sont affichées en lecture seule dans les champs de texte du formulaire pour éviter une corruption accidentelle d'objet en chaîne.

  </Accordion>
  <Accordion title="Débogage, journaux, mise à jour">
    - Débogage : instantanés de l'état/santé/modèles + journal des événements + appels RPC manuels (`status`, `health`, `models.list`).
    - Le journal des événements inclut les minutages de rafraîchissement de l'interface de contrôle/RPC, les minutages de rendu lent de la conversation/configuration, et les entrées de réactivité du navigateur pour les images d'animation longues ou les tâches longues lorsque le navigateur expose ces types d'entrées PerformanceObserver.
    - Journaux : suivi en direct des journaux de fichiers de la passerelle avec filtre/exportation (`logs.tail`).
    - Mise à jour : exécuter une mise à jour de paquet/git + redémarrage (`update.run`) avec un rapport de redémarrage, puis interroger `update.status` après reconnexion pour vérifier la version de la passerelle en cours d'exécution.

  </Accordion>
  <Accordion title="Notes du panneau Tâches Cron">
    - Pour les tâches isolées, la livraison est par défaut réglée sur annonce du résumé. Vous pouvez basculer sur aucun si vous souhaitez des exécutions uniquement internes.
    - Les champs de canal/cible apparaissent lorsque l'annonce est sélectionnée.
    - Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide.
    - Pour les tâches de session principale, les modes de livraison webhook et aucun sont disponibles.
    - Les contrôles d'édition avancés incluent la suppression après exécution, l'annulation de la substitution de l'agent, les options d'exactitude/décalage cron, les substitutions de modèle/réflexion de l'agent, et les commutateurs de livraison au mieux effort.
    - La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à correction.
    - Définissez `cron.webhookToken` pour envoyer un jeton de porteur dédié, si omis le webhook est envoyé sans en-tête d'authentification.
    - Fallback obsolète : les tâches héritées stockées avec `notify: true` peuvent encore utiliser `cron.webhook` jusqu'à migration.

  </Accordion>
</AccordionGroup>

## Comportement de la conversation

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` est **non bloquant** : il accuse réception immédiatement avec `{ runId, status: "started" }` et la réponse diffuse via des événements `chat`.
    - Les téléchargements de chat acceptent les images ainsi que les fichiers non vidéo. Les images conservent leur chemin d'origine ; les autres fichiers sont stockés en tant que média géré et affichés dans l'historique sous forme de liens de pièces jointes.
    - Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
    - Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de la transcription sont trop volumineuses, le Gateway peut tronquer les champs de texte longs, omettre les blocs de métadonnées lourds et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
    - Les images générées par l'assistant sont persistantes sous forme de références de média géré et renvoyées via des URL média authentifiées du Gateway, de sorte que les rechargements ne dépendent pas du fait que les charges utiles d'image brutes en base64 restent dans la réponse de l'historique du chat.
    - Lors du rendu de `chat.history`, l'interface utilisateur de contrôle supprime les balises de directive inline affichage uniquement du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel d'outil tronqués), et les jetons de contrôle de modèle ASCII/pleine largeur fuités, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply` ou le jeton d'accusation de réception de battement de cœur `HEARTBEAT_OK`.
    - Pendant un envoi actif et l'actualisation finale de l'historique, la vue de chat maintient visibles les messages utilisateur/assistant optimistes locaux si `chat.history` renvoie brièvement un instantané plus ancien ; la transcription canonique remplace ces messages locaux une fois que l'historique du Gateway a rattrapé son retard.
    - Les événements en direct `chat` sont l'état de livraison, tandis que `chat.history` est reconstruit à partir de la transcription de session durable. Après les événements finaux d'outil, l'interface utilisateur de contrôle recharge l'historique et fusionne uniquement une petite queue optimiste ; la limite de la transcription est documentée dans [WebChat](/fr/web/webchat).
    - `chat.inject` ajoute une note d'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour de l'interface uniquement (pas d'exécution d'agent, pas de livraison de canal).
    - L'en-tête de chat affiche le filtre d'agent avant le sélecteur de session, et le sélecteur de session est délimité par l'agent sélectionné. Le changement d'agent n'affiche que les sessions liées à cet agent et revient à la session principale de cet agent lorsqu'il n'a pas encore de sessions de tableau de bord enregistrées.
    - Sur les largeurs de bureau, les commandes de chat restent sur une ligne compacte et se réduisent lors du défilement vers le bas de la transcription ; le défilement vers le haut, le retour en haut ou l'atteinte du bas restaure les commandes.
    - Les messages texte consécutifs en double s'affichent sous forme d'une seule bulle avec un badge de comptage. Les messages contenant des images, des pièces jointes, des sorties d'outil ou des aperçus de canevas ne sont pas réduits.
    - Les sélecteurs de modèle et de réflexion de l'en-tête de chat corrigent immédiatement la session active via `sessions.patch` ; il s'agit de remplacements persistants de session, et non d'options d'envoi pour un seul tour.
    - Si vous envoyez un message alors qu'un changement de sélecteur de modèle pour la même session est toujours en cours d'enregistrement, le compositeur attend que cette correction de session soit effectuée avant d'appeler `chat.send` afin que l'envoi utilise le modèle sélectionné.
    - Taper `/new` dans l'interface utilisateur de contrôle crée et bascule vers la même session de tableau de bord fraîche que Nouveau chat, sauf si `session.dmScope: "main"` est configuré et que le parent actuel est la session principale de l'agent ; dans ce cas, il réinitialise la session principale sur place. Taper `/reset` conserve la réinitialisation explicite sur place du Gateway pour la session actuelle.
    - Le sélecteur de modèle de chat demande la vue de modèle configurée du Gateway. Si `agents.defaults.models` est présent, cette liste d'autorisation pilote le sélecteur, y compris les entrées `provider/*` qui gardent les catalogues délimités par fournisseur dynamiques. Sinon, le sélecteur affiche les entrées `models.providers.*.models` explicites plus les fournisseurs avec une authentification utilisable. Le catalogue complet reste disponible via le RPC de débogage `models.list` avec `view: "all"`.
    - Lorsque les rapports d'utilisation de session fraîche du Gateway incluent des jetons de contexte actuels, la zone du compositeur de chat affiche un indicateur compact d'utilisation du contexte. Il passe au style d'avertissement en cas de forte pression de contexte et, aux niveaux de compactage recommandés, affiche un bouton compact qui exécute le chemin de compactage de session normal. Les instantanés de jetons obsolètes sont masqués jusqu'à ce que le Gateway signale une nouvelle utilisation.

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice provider. Configure OpenAI with `talk.realtime.provider: "openai"` plus either `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY`, or an `openai-codex` OAuth profile; configure Google with `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`. The browser never receives a standard provider API key. OpenAI receives an ephemeral Realtime client secret for WebRTC. Google Live receives a one-use constrained Live API auth token for a browser WebSocket session, with instructions and tool declarations locked into the token by the Gateway. Providers that only expose a backend realtime bridge run through the Gateway relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway RPCs. The Realtime session prompt is assembled by the Gateway; `talk.client.create` does not accept caller-provided instruction overrides.

    The Chat composer includes a Talk options button next to the Talk start/stop button. The options apply to the next Talk session and can override provider, transport, model, voice, reasoning effort, VAD threshold, silence duration, and prefix padding. When an option is blank, the Gateway uses configured defaults where available or the provider default. Selecting Gateway relay forces the backend relay path; selecting WebRTC keeps the session client-owned and fails instead of silently falling back to relay if the provider cannot create a browser session.

    In the Chat composer, the Talk control is the waves button next to the microphone dictation button. When Talk starts, the composer status row shows `Connecting Talk...`, then `Talk live` while audio is connected, or `Asking OpenClaw...` while a realtime tool call is consulting the configured larger model through `talk.client.toolCall`.

    Maintainer live smoke: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifies the OpenAI backend WebSocket bridge, OpenAI browser WebRTC SDP exchange, Google Live constrained-token browser WebSocket setup, and the Gateway relay browser adapter with fake microphone media. The command prints provider status only and does not log secrets.

  </Accordion>
  <Accordion title="Arrêter et abandonner">
    - Cliquez sur **Stop** (appelle `chat.abort`).
    - Pendant qu'une exécution est active, les suites normales sont mises en file d'attente. Cliquez sur **Steer** sur un message en file d'attente pour injecter cette suite dans le tour en cours.
    - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande.
    - `chat.abort` prend en charge `{ sessionKey }` (sans `runId`) pour abandonner toutes les exécutions actives pour cette session.

  </Accordion>
  <Accordion title="Conservation partielle en cas d'abandon">
    - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface utilisateur.
    - Gateway conserve le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe.
    - Les entrées conservées incluent des métadonnées d'abandon afin que les consommateurs de transcriptions puissent distinguer les partiels d'abandon de la sortie de complétion normale.

  </Accordion>
</AccordionGroup>

## Installation PWA et Web Push

L'interface de contrôle (Control UI) fournit un `manifest.webmanifest` et un service worker, de sorte que les navigateurs modernes peuvent l'installer en tant que PWA autonome. Web Push permet au Gateway de réveiller la PWA installée avec des notifications même lorsque l'onglet ou la fenêtre du navigateur n'est pas ouvert.

| Surface                                                     | Ce qu'il fait                                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                            | Manifeste PWA. Les navigateurs proposent « Installer l'application » une fois qu'il est accessible. |
| `ui/public/sw.js`                                           | Service worker qui gère les événements `push` et les clics sur les notifications.                   |
| `push/vapid-keys.json` (sous le répertoire d'état OpenClaw) | Paire de clés VAPID générée automatiquement utilisée pour signer les charges utiles Web Push.       |
| `push/web-push-subscriptions.json`                          | Points de terminaison d'abonnement du navigateur persistants.                                       |

Remplacez la paire de clés VAPID par des variables d'environnement (env vars) sur le processus Gateway lorsque vous souhaitez épingler des clés (pour les déploiements multi-hôtes, la rotation des secrets ou les tests) :

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (par défaut `mailto:openclaw@localhost`)

L'interface de contrôle utilise ces méthodes de passerie limitées par portée pour enregistrer et tester les abonnements du navigateur :

- `push.web.vapidPublicKey` — récupère la clé publique VAPID active.
- `push.web.subscribe` — enregistre un `endpoint` ainsi que `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — supprime un point de terminaison enregistré.
- `push.web.test` — envoie une notification de test à l'abonnement de l'appelant.

<Note>Web Push est indépendant du chemin de relais APNS iOS (voir [Configuration](/fr/gateway/configuration) pour la push via relais) et de la méthode `push.test` existante, qui ciblent l'appairage mobile natif.</Note>

## Intégrations hébergées

Les messages de l'assistant peuvent afficher du contenu Web hébergé en ligne via le shortcode `[embed ...]`. La stratégie du bac à sable (sandbox) de l'iframe est contrôlée par `gateway.controlUi.embedSandbox` :

<Tabs>
  <Tab title="strict">Désactive l'exécution de scripts dans les intégrations hébergées.</Tab>
  <Tab title="scripts (default)">Autorise les intégrations interactives tout en maintenant l'isolation de l'origine ; c'est la valeur par défaut et elle suffit généralement pour les jeux/widgets de navigateur autonomes.</Tab>
  <Tab title="trusted">Ajoute `allow-same-origin` par-dessus `allow-scripts` pour les documents de même site qui ont intentionnellement besoin de privilèges plus élevés.</Tab>
</Tabs>

Exemple :

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

<Warning>Utilisez `trusted` uniquement lorsque le document incorporé a réellement besoin d'un comportement de même origine. Pour la plupart des jeux et canevas interactifs générés par des agents, `scripts` est le choix le plus sûr.</Warning>

Les URL d'intégration externes absolues `http(s)` restent bloquées par défaut. Si vous souhaitez intentionnellement que `[embed url="https://..."]` charge des pages tierces, définissez `gateway.controlUi.allowExternalEmbedUrls: true`.

## Largeur des messages de chat

Les messages de chat groupés utilisent une largeur maximale par défaut lisible. Les déploiements sur grands écrans peuvent la remplacer sans modifier le CSS groupé en définissant `gateway.controlUi.chatMessageMaxWidth` :

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

La valeur est validée avant d'atteindre le navigateur. Les valeurs prises en charge incluent des longueurs simples et des pourcentages tels que `960px` ou `82%`, ainsi que des expressions de largeur contraintes `min(...)`, `max(...)`, `clamp(...)`, `calc(...)` et `fit-content(...)`.

## Accès Tailnet (recommandé)

<Tabs>
  <Tab title="Serve Tailscale intégré (préféré)">
    Gardez le Gateway en boucle locale (loopback) et laissez Tailscale Serve le proxyer avec HTTPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Ouvrez :

    - `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

    Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale (`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`. OpenClaw vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec `tailscale whois` et en la faisant correspondre à l'en-tête, et n'accepte celles-ci que lorsque la requête atteint la boucle locale avec les en-têtes `x-forwarded-*` de Tailscale. Pour les sessions d'opérateur Control UI avec l'identité de l'appareil du navigateur, ce chemin Serve vérifié évite également l'aller-retour d'appairage d'appareil ; les navigateurs sans appareil et les connexions de rôle nœud suivent toujours les vérifications d'appareil normales. Définissez `gateway.auth.allowTailscale: false` si vous souhaitez exiger des identifiants de secret partagé explicites même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou `"password"`.

    Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client et le même périmètre d'authentification sont sérialisées avant les écritures de limitation de débit. Les mauvaises tentatives simultanées du même navigateur peuvent donc afficher `retry later` sur la deuxième requête au lieu de deux simples inadéquations se concurrençant en parallèle.

    <Warning>
    L'authentification Serve sans jeton suppose que l'hôte de la passerelle est de confiance. Si du code local non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.
    </Warning>

  </Tab>
  <Tab title="Lier au tailnet + jeton">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    Ensuite, ouvrez :

    - `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

    Collez le secret partagé correspondant dans les paramètres de l'interface utilisateur (envoyé en tant que `connect.params.auth.token` ou `connect.params.auth.password`).

  </Tab>
</Tabs>

## HTTP non sécurisé

Si vous ouvrez le tableau de bord sur HTTP simple (`http://<lan-ip>` ou `http://<tailscale-ip>`), le navigateur fonctionne dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut, OpenClaw **bloque** les connexions à l'interface de contrôle (Control UI) sans identité d'appareil.

Exceptions documentées :

- compatibilité HTTP non sécurisé localhost uniquement avec `gateway.controlUi.allowInsecureAuth=true`
- authentification réussie de l'opérateur via l'interface de contrôle (Control UI) via `gateway.auth.mode: "trusted-proxy"`
- break-glass `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**Correction recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface localement :

- `https://<magicdns>/` (Servir)
- `http://127.0.0.1:18789/` (sur l'hôte de la passerelle)

<AccordionGroup>
  <Accordion title="Comportement du basculement d'authentification non sécurisée">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` est un basculement de compatibilité local uniquement :

    - Il permet aux sessions de l'interface de contrôle (Control UI) localhost de procéder sans identité d'appareil dans des contextes HTTP non sécurisés.
    - Il ne contourne pas les vérifications d'appariement.
    - Il ne relâche pas les exigences d'identité d'appareil distantes (non-localhost).

  </Accordion>
  <Accordion title="Break-glass uniquement">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil de l'interface de contrôle (Control UI) et constitue une dégradation de sécurité importante. Rétablissez rapidement après une utilisation d'urgence.
    </Warning>

  </Accordion>
  <Accordion title="Trusted-proxy note">
    - Une authentification trusted-proxy réussie peut admettre des sessions **opérateur** de l'interface de contrôle (Control UI) sans identité d'appareil.
    - Cela ne s'étend **pas** aux sessions Control UI de rôle nœud.
    - Les proxies inversés en boucle locale (loopback) sur le même hôte ne satisfont toujours pas l'authentification trusted-proxy ; voir [Trusted proxy auth](/fr/gateway/trusted-proxy-auth).

  </Accordion>
</AccordionGroup>

Voir [Tailscale](/fr/gateway/tailscale) pour des conseils sur la configuration HTTPS.

## Politique de sécurité du contenu

L'interface de contrôle Control UI est livrée avec une politique `img-src` stricte : seuls les ressources de même origine (**same-origin**), les URL `data:` et les URL `blob:` générées localement sont autorisées. Les `http(s)` distantes et les URL d'images relatives au protocole sont rejetées par le navigateur et n'émettent pas de requêtes réseau.

Ce que cela signifie en pratique :

- Les avatars et les images servis sous des chemins relatifs (par exemple `/avatars/<id>`) s'affichent toujours, y compris les routes d'avatar authentifiées que l'interface récupère et convertit en URL `blob:` locales.
- Les URL `data:image/...` en ligne s'affichent toujours (utile pour les charges utiles intra-protocole).
- Les URL `blob:` locales créées par l'interface de contrôle Control UI s'affichent toujours.
- Les URL d'avatar distantes émises par les métadonnées de canal sont supprimées au niveau des assistants d'avatar de l'interface Control UI et remplacées par le logo/badge intégré, ce qui empêche un canal compromis ou malveillant de forcer des récupérations d'images distantes arbitraires à partir du navigateur d'un opérateur.

Vous n'avez rien à modifier pour obtenir ce comportement — il est toujours actif et n'est pas configurable.

## Authentification de la route d'avatar

Lorsque l'authentification de la passerelle est configurée, le point de terminaison d'avatar de l'interface Control UI nécessite le même jeton de passerelle que le reste de l'API :

- `GET /avatar/<agentId>` renvoie l'image de l'avatar uniquement aux appelants authentifiés. `GET /avatar/<agentId>?meta=1` renvoie les métadonnées de l'avatar sous la même règle.
- Les requêtes non authentifiées vers l'une ou l'autre de ces routes sont rejetées (correspondant à la route sœur assistant-media). Cela empêche la route d'avatar de divulguer l'identité de l'agent sur les hôtes qui sont par ailleurs protégés.
- L'interface Control UI elle-même transmet le jeton de passerelle sous forme d'en-tête bearer lors de la récupération des avatars et utilise des URL d'objets blob authentifiées afin que l'image s'affiche toujours dans les tableaux de bord.

Si vous désactivez l'authentification de la passerelle (non recommandé sur les hôtes partagés), la route d'avatar devient également non authentifiée, conformément au reste de la passerelle.

## Authentification de la route des médias de l'assistant

Lorsque l'authentification de la passerelle est configurée, les prévisualisations locales des médias de l'assistant utilisent une route en deux étapes :

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` nécessite l'authentification normale de l'opérateur de l'interface Control UI. Le navigateur envoie le jeton de passerelle sous forme d'en-tête bearer lors de la vérification de la disponibilité.
- Les réponses de métadonnées réussies incluent un `mediaTicket` éphémère limité à ce chemin source exact.
- Les URL d'image, d'audio, de vidéo et de document rendues par le navigateur utilisent un `mediaTicket=<ticket>` au lieu du jeton ou du mot de passe actif de la passerelle. Le ticket expire rapidement et ne peut pas autoriser une source différente.

Cela permet de garder le rendu multimédia normal compatible avec les éléments multimédias natifs du navigateur sans mettre d'identifiants de passerelle réutilisables dans les URL multimédias visibles.

## Construction de l'interface utilisateur

Le Gateway sert des fichiers statiques à partir de `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build
```

Base absolue facultative (lorsque vous souhaitez des URL d'actifs fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de développement distinct) :

```bash
pnpm ui:dev
```

Ensuite, pointez l'interface utilisateur vers l'URL WS de votre Gateway (par exemple `ws://127.0.0.1:18789`).

## Page vide de l'interface de contrôle (Control UI)

Si le navigateur charge un tableau de bord vide et que les DevTools n'affichent aucune erreur utile, une extension ou un script de contenu précoce a peut-être empêché l'évaluation de l'application module JavaScript. La page statique inclut un panneau de récupération HTML brut qui apparaît lorsque `<openclaw-app>` n'est pas enregistré après le démarrage.

Utilisez l'action **Réessayer** du panneau après avoir modifié l'environnement du navigateur, ou rechargez manuellement après ces vérifications :

- Désactivez les extensions qui s'injectent dans toutes les pages, en particulier les extensions avec des scripts de contenu `<all_urls>`.
- Essayez une fenêtre privée, un profil de navigateur propre ou un autre navigateur.
- Gardez le Gateway en cours d'exécution et vérifiez la même URL de tableau de bord après le changement de navigateur.

## Débogage/tests : serveur de développement + Gateway distant

L'interface de contrôle (Control UI) se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous voulez le serveur de développement Vite localement mais que le Gateway s'exécute ailleurs.

<Steps>
  <Step title="Start the UI dev server">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="Open with gatewayUrl">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    Authentification ponctuelle optionnelle (si nécessaire) :

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes">
    - `gatewayUrl` est stocké dans localStorage après le chargement et supprimé de l'URL.
    - Si vous passez un point de terminaison `ws://` ou `wss://` complet via `gatewayUrl`, encodez l'URL de la valeur `gatewayUrl` afin que le navigateur analyse correctement la chaîne de requête.
    - `token` doit être passé via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requête et l'en-tête Referer. Les paramètres de requête `?token=` hérités sont toujours importés une fois pour compatibilité, mais uniquement en tant que solution de secours, et sont supprimés immédiatement après l'amorçage.
    - `password` est conservé uniquement en mémoire.
    - Lorsque `gatewayUrl` est défini, l'UI ne revient pas aux identifiants de configuration ou d'environnement. Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites est une erreur.
    - Utilisez `wss://` lorsque le GatewayTailscale est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` n'est accepté que dans une fenêtre de niveau supérieur (non intégrée) pour empêcher le détournement de clic.
    - Les déploiements de l'UI de contrôle non-bouclage doivent définir `gateway.controlUi.allowedOrigins` explicitement (origines complètes). Cela inclut les configurations de développement à distance.
    - Le démarrage du Gateway peut amorcer des origines locales telles que `http://localhost:<port>` et `http://127.0.0.1:<port>` à partir de la liaison d'exécution effective et du port, mais les origines du navigateur distant ont toujours besoin d'entrées explicites.
    - N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux strictement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur, et non « correspondre à l'hôte que j'utilise ».
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active le mode de repli d'origine basé sur l'en-tête Host, mais c'est un mode de sécurité dangereux.

  </Accordion>
</AccordionGroup>

Exemple :

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

Détails de la configuration de l'accès à distance : [Accès à distance](/fr/gateway/remote).

## Connexes

- [Tableau de bord](/fr/web/dashboard) — tableau de bord de la passerelle
- [Contrôles de santé](/fr/gateway/health) — surveillance de santé de la passerelle
- [TUI](/fr/web/tui) — interface utilisateur en terminal
- [WebChat](/fr/web/webchat) — interface de chat basée sur le navigateur
