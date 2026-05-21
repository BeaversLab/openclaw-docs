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

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de nouvelle approbation, sauf si vous le révoquez avec `openclaw devices revoke --device <id> --role <role>`. Voir [Devices CLI](/fr/cli/devices) pour la rotation et la révocation des jetons.

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

Le panneau Apparence conserve les thèmes intégrés Claw, Knot et Dash, plus un emplacement d'importation tweakcn local au navigateur. Pour importer un thème, ouvrez [tweakcn editor](https://tweakcn.com/editor/theme), choisissez ou créez un thème, cliquez sur **Share**, et collez le lien du thème copié dans Apparence. L'importateur accepte également les URL de registre `https://tweakcn.com/r/themes/<id>`, les URL d'éditeur comme `https://tweakcn.com/editor/theme?theme=amethyst-haze`, les chemins relatifs `/themes/<id>`, les ID de thème bruts et les noms de thème par défaut tels que `amethyst-haze`.

L'Apparence comprend également un paramètre de taille de texte local au navigateur. Le paramètre est stocké avec le reste des préférences de l'interface de contrôle, s'applique au texte du chat, au texte du compositeur, aux cartes d'outils et aux barres latérales du chat, et maintient les zones de saisie de texte à au moins 16 px afin que Safari mobile ne zoome pas automatiquement lors de la mise au point.

Les thèmes importés sont stockés uniquement dans le profil de navigateur actuel. Ils ne sont pas écrits dans la configuration de la passerelle et ne se synchronisent pas entre les appareils. Le remplacement du thème importé met à jour l'emplacement local ; son effacement ramène le thème actif à Claw si le thème importé était sélectionné.

## Ce qu'il peut faire (à ce jour)

<AccordionGroup>
  <Accordion title="Chat and Talk">
    - Discutez avec le modèle via le WS du Gateway (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`).
    - Les actualisations de l'historique de chat demandent une fenêtre récente bornée avec des limites de texte par message, afin que les grandes sessions ne forcent pas le navigateur à rendre une charge utile de transcription complète avant que le chat ne soit utilisable.
    - Parlez via des sessions en temps réel du navigateur. OpenAI utilise WebRTC direct, Google Live utilise un jeton de navigateur à usage unique contraint sur WebSocket, et les plugins vocaux en temps réel backend uniquement utilisent le transport de relais Gateway. Les sessions de propriété client commencent par `talk.client.create`; les sessions de relais Gateway commencent par `talk.session.create`. Le relais conserve les identifiants du fournisseur sur le Gateway tandis que le navigateur diffuse le PCM du microphone via `talk.session.appendAudio` et transmet les appels d'outil `openclaw_agent_consult` du fournisseur via `talk.client.toolCall` pour la stratégie Gateway et le modèle OpenClaw plus grand configuré.
    - Diffusez les appels d'outil + les cartes de sortie d'outil en direct dans le Chat (événements d'agent).

  </Accordion>
  <Accordion title="Channels, instances, sessions, dreams">
    - Channels : statut des canaux intégrés ainsi que des plugins groupés/externes, connexion QR et configuration par canal (`channels.status`, `web.login.*`, `config.patch`).
    - Les actualisations des sondes de canaux gardent l'instantané précédent visible pendant que les vérifications lentes du fournisseur se terminent, et les instantanés partiels sont étiquetés lorsqu'une sonde ou un audit dépasse son budget UI.
    - Instances : liste de présence + actualisation (`system-presence`).
    - Sessions : liste les sessions d'agents configurées par défaut, revient aux clés de session d'agents non configurés obsolètes, et applique les substitutions par session model/thinking/fast/verbose/trace/reasoning (`sessions.list`, `sessions.patch`).
    - Dreams : statut de rêverie, bouton d'activation/désactivation, et lecteur de Dream Diary (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).

  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">
    - Cron jobs : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`).
    - Skills : statut, activation/désactivation, installation, mises à jour de clé API (`skills.*`).
    - Nodes : liste + caps (`node.list`).
    - Exec approvals : modifier les listes d'autorisation de la passerelle ou des nœuds + demander la politique pour `exec host=gateway/node` (`exec.approvals.*`).

  </Accordion>
  <Accordion title="Config">
    - Afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`).
    - Appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active.
    - Les écritures incluent une protection de hachage de base pour empêcher l'écrasement des modifications simultanées.
    - Les écritures (`config.set`/`config.apply`/`config.patch`) effectuent une résolution préalable des SecretRef actifs pour les références dans la charge utile de configuration soumise ; les références soumises actives non résolues sont rejetées avant l'écriture.
    - Les enregistrements de formulaire ignorent les espaces réservés de rédaction périmés qui ne peuvent pas être restaurés à partir de la configuration enregistrée, tout en préservant les valeurs rédactionnées qui correspondent toujours aux secrets enregistrés.
    - Rendu de schéma + de formulaire (`config.schema` / `config.schema.lookup`, y compris le champ `title` / `description`, les indices d'interface utilisateur correspondants, les résumés des enfants immédiats, les métadonnées de documentation sur les nœuds d'objet/wildcard/tableau/composition imbriqués, ainsi que les schémas de plugin + channel si disponibles) ; l'éditeur JSON brut n'est disponible que lorsque l'instantané peut effectuer un aller-retour brut sûr.
    - Si un instantané ne peut pas effectuer un aller-retour brut sûr, l'interface de contrôle Force le mode Formulaire et désactive le mode Brut pour cet instantané.
    - L'éditeur JSON brut « Réinitialiser à l'enregistré » préserve la forme originale brute (formatage, commentaires, disposition `$include`) au lieu de restituer un instantané aplati, de sorte que les modifications externes survivent à une réinitialisation lorsque l'instantané peut effectuer un aller-retour sûr.
    - Les valeurs d'objet SecretRef structurées sont affichées en lecture seule dans les zones de texte du formulaire pour empêcher une corruption accidentelle d'objet en chaîne.

  </Accordion>
  <Accordion title="Débogage, journaux, mise à jour"RPC>
    - Débogage : instantanés d'état/santé/modèles + journal d'événements + appels RPC manuels (`status`, `health`, `models.list`RPC).
    - Le journal d'événements inclut les temps de rafraîchissement/RPC de l'interface de contrôle, les temps de rendu lent du chat/config, et les entrées de réactivité du navigateur pour les images d'animation longues ou les tâches longues lorsque le navigateur expose ces types d'entrées PerformanceObserver.
    - Journaux : suivi en direct des fichiers journaux de la passerelle avec filtre/exportation (`logs.tail`).
    - Mise à jour : exécuter une mise à jour de paquet/git + redémarrage (`update.run`) avec un rapport de redémarrage, puis interroger `update.status` après reconnexion pour vérifier la version de la passerelle en cours d'exécution.

  </Accordion>
  <Accordion title="Notes du panneau des tâches Cron">
    - Pour les tâches isolées, la distribution par défaut est le résumé de l'annonce. Vous pouvez passer à aucun si vous souhaitez des exécutions uniquement internes.
    - Les champs canal/cible apparaissent lorsque l'annonce est sélectionnée.
    - Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL webhook HTTP(S) valide.
    - Pour les tâches de session principale, les modes de distribution webhook et aucun sont disponibles.
    - Les contrôles d'édition avancés incluent la suppression après exécution, l'effacement de la priorité de l'agent, les options exactes/échelonnées de cron, les priorités de modèle/réflexion de l'agent, et les basculements de distribution au mieux.
    - La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à correction.
    - Définissez `cron.webhookToken` pour envoyer un jeton bearer dédié, si omis le webhook est envoyé sans en-tête d'authentification.
    - Solution de repli dépréciée : les tâches héritées stockées avec `notify: true` peuvent toujours utiliser `cron.webhook` jusqu'à la migration.

  </Accordion>
</AccordionGroup>

## Comportement du chat

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` est **non-bloquant** : il acquitte immédiatement avec `{ runId, status: "started" }` et la réponse diffuse via des événements `chat`.
    - Les téléversements de chat acceptent les images ainsi que les fichiers non vidéo. Les images conservent leur chemin d'origine ; les autres fichiers sont stockés en tant que média géré et affichés dans l'historique sous forme de liens de pièces jointes.
    - Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution et `{ status: "ok" }` après l'achèvement.
    - Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de la transcription sont trop volumineuses, le Gateway peut tronquer les champs de texte longs, omettre les blocs de métadonnées lourds et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
    - Les images générées par l'assistant sont persistantes sous forme de références de média géré et renvoyées via des URL média authentifiées du Gateway, de sorte que les rechargements ne dépendent pas du maintien des charges utiles d'image base64 brutes dans la réponse de l'historique du chat.
    - Lors du rendu de `chat.history`, l'interface de contrôle (Control UI) supprime les balises de directive en ligne d'affichage uniquement du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués), et les jetons de contrôle de modèle ASCII/largeur totale fuyants, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply` ou le jeton d'accusé de réception de battement de cœur `HEARTBEAT_OK`.
    - Pendant un envoi actif et l'actualisation finale de l'historique, la vue de chat maintient les messages utilisateur/assistant optimistes locaux visibles si `chat.history` renvoie brièvement un instantané plus ancien ; la transcription canonique remplace ces messages locaux une fois que l'historique du Gateway a rattrapé son retard.
    - Les événements en direct `chat` sont l'état de livraison, tandis que `chat.history` est reconstruit à partir de la transcription de session durable. Après les événements finaux d'outil, l'interface de contrôle recharge l'historique et fusionne uniquement une petite queue optimiste ; la limite de la transcription est documentée dans [WebChat](/fr/web/webchat).
    - `chat.inject` ajoute une note d'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour uniquement de l'interface (pas d'exécution d'agent, pas de livraison de canal).
    - L'en-tête de chat affiche le filtre d'agent avant le sélecteur de session, et le sélecteur de session est délimité par l'agent sélectionné. Le changement d'agent n'affiche que les sessions liées à cet agent et revient à la session principale de cet agent lorsqu'il n'a pas encore de sessions de tableau de bord enregistrées.
    - Sur les largeurs de bureau, les contrôles de chat restent sur une ligne compacte et se replient lors du défilement vers le bas de la transcription ; le défilement vers le haut, le retour en haut ou l'atteinte du bas restaure les contrôles.
    - Les messages texte consécutifs en double s'affichent sous la forme d'une seule bulle avec un badge de comptage. Les messages contenant des images, des pièces jointes, des résultats d'outils ou des aperçus de canvas ne sont pas réduits.
    - Les sélecteurs de modèle et de réflexion de l'en-tête de chat corrigent immédiatement la session active via `sessions.patch` ; il s'agit de substitutions persistantes de session, et non d'options d'envoi pour un seul tour.
    - Si vous envoyez un message alors qu'un changement de sélecteur de modèle pour la même session est toujours en cours d'enregistrement, le composeur attend ce correctif de session avant d'appeler `chat.send` afin que l'envoi utilise le modèle sélectionné.
    - Taper `/new` dans l'interface de contrôle crée et bascule vers la même session de tableau de bord fraîche que Nouveau chat, sauf si `session.dmScope: "main"` est configuré et que le parent actuel est la session principale de l'agent ; dans ce cas, il réinitialise la session principale en place. Taper `/reset` conserve la réinitialisation explicite en place du Gateway pour la session actuelle.
    - Le sélecteur de modèle de chat demande la vue de modèle configurée du Gateway. Si `agents.defaults.models` est présent, cette liste d'autorisation pilote le sélecteur, y compris les entrées `provider/*` qui gardent les catalogues délimités par fournisseur dynamiques. Sinon, le sélecteur affiche les entrées explicites `models.providers.*.models` plus les fournisseurs avec une authentification utilisable. Le catalogue complet reste disponible via le RPC de débogage `models.list` avec `view: "all"`.
    - Lorsque les rapports d'utilisation de session frais du Gateway incluent des jetons de contexte actuels, la zone du composeur de chat affiche un indicateur compact d'utilisation du contexte. Il passe à un style d'avertissement en cas de forte pression sur le contexte et, aux niveaux de compactage recommandés, affiche un bouton compact qui exécute le chemin de compactage de session normal. Les instantanés de jetons périmés sont masqués jusqu'à ce que le Gateway signale à nouveau une utilisation fraîche.

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Le mode Talk utilise un fournisseur de voix en temps réel enregistré. Configurez OpenAI avec `talk.realtime.provider: "openai"` plus soit `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY``openai-codex`, ou un profil OAuth ; configurez Google avec `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`API. Le navigateur ne reçoit jamais de clé API standard de fournisseur. OpenAIAPI reçoit un secret client éphémère Realtime pour WebRTC. Google Live reçoit un jeton d'authentification Live API à usage unique et contraint pour une session WebSocket de navigateur, avec des instructions et des déclarations d'outil verrouillées dans le jeton par le Gateway. Les fournisseurs qui exposent uniquement un pont backend en temps réel passent par le transport de relais du Gateway, de sorte que les identifiants et les sockets fournisseur restent côté serveur tandis que l'audio du navigateur passe par des RPC Gateway authentifiés. Le prompt de session Realtime est assemblé par le Gateway ; `talk.client.create` n'accepte pas les substitutions d'instructions fournies par l'appelant.

    Le compositeur de chat inclut un bouton d'options Talk à côté du bouton de démarrage/arrêt Talk. Les options s'appliquent à la prochaine session Talk et peuvent remplacer le fournisseur, le transport, le modèle, la voix, l'effort de raisonnement, le seuil VAD, la durée de silence et le remplissage du préfixe. Lorsqu'une option est vide, le Gateway utilise les valeurs par défaut configurées si disponibles ou la valeur par défaut du fournisseur. Sélectionner le relais Gateway force le chemin de relais backend ; sélectionner WebRTC garde la session propriété du client et échoue au lieu de revenir silencieusement au relais si le fournisseur ne peut pas créer une session de navigateur.

    Dans le compositeur de chat, le contrôle Talk est le bouton des ondes à côté du bouton de dictée microphone. Lorsque Talk démarre, la ligne d'état du compositeur affiche `Connecting Talk...`, puis `Talk live` tant que l'audio est connecté, ou `Asking OpenClaw...` pendant qu'un appel d'outil en temps réel consulte le modèle plus grand configuré via `talk.client.toolCall`.

    Maintainer live smoke : `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` vérifie le pont WebSocket backend OpenAI, l'échange SDP WebRTC navigateur OpenAI, la configuration WebSocket navigateur à jeton contraint Google Live, et l'adaptateur navigateur de relais du Gateway avec un faux média microphone. La commande n'imprime que l'état du fournisseur et ne enregistre pas de secrets.

  </Accordion>
  <Accordion title="Stop and abort">
    - Cliquez sur **Stop** (appelle `chat.abort`).
    - Pendant qu'une exécution est active, les suites normales sont mises en file d'attente. Cliquez sur **Steer** sur un message en file d'attente pour injecter cette suite dans le tour en cours.
    - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande.
    - `chat.abort` prend en charge `{ sessionKey }` (sans `runId`) pour abandonner toutes les exécutions actives pour cette session.

  </Accordion>
  <Accordion title="Abort partial retention">
    - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface utilisateur.
    - Le Gateway conserve le texte partiel de l'assistant abandonné dans l'historique des transcripts lorsque la sortie tamponnée existe.
    - Les entrées conservées incluent des métadonnées d'abandon afin que les consommateurs de transcripts puissent distinguer les partiels d'abandon de la sortie de complétion normale.

  </Accordion>
</AccordionGroup>

## Installation PWA et Web Push

Le Control UI inclut un `manifest.webmanifest` et un service worker, afin que les navigateurs modernes puissent l'installer en tant que PWA autonome. Le Web Push permet au Gateway de réveiller la PWA installée avec des notifications même lorsque l'onglet ou la fenêtre du navigateur n'est pas ouvert.

Si la page affiche **Protocol mismatch** juste après une mise à jour de OpenClaw, rouvrez d'abord le tableau de bord avec `openclaw dashboard` et actualisez la page de force. Si cela échoue toujours, effacez les données du site pour l'origine du tableau de bord ou testez dans une fenêtre de navigation privée ; un ancien onglet ou le cache du service worker du navigateur peut continuer à exécuter un bundle Control UI pré-mise à jour contre le Gateway plus récent.

| Surface                                                     | Ce qu'il fait                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                            | Manifeste PWA. Les navigateurs proposent « Install app » une fois qu'il est accessible.       |
| `ui/public/sw.js`                                           | Service worker qui gère les événements `push` et les clics sur les notifications.             |
| `push/vapid-keys.json` (sous le répertoire d'état OpenClaw) | Paire de clés VAPID générée automatiquement utilisée pour signer les charges utiles Web Push. |
| `push/web-push-subscriptions.json`                          | Points de terminaison d'abonnement du navigateur persistants.                                 |

Remplacez la paire de clés VAPID via les env vars sur le processus Gateway lorsque vous souhaitez épingler des clés (pour les déploiements multi-hôtes, la rotation des secrets ou les tests) :

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (par défaut `https://openclaw.ai`)

L'interface de contrôle utilise ces méthodes Gateway limitées par portée pour enregistrer et tester les abonnements du navigateur :

- `push.web.vapidPublicKey` — récupère la clé publique VAPID active.
- `push.web.subscribe` — enregistre un `endpoint` ainsi que `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — supprime un point de terminaison enregistré.
- `push.web.test` — envoie une notification de test à l'abonnement de l'appelant.

<Note>Web Push est indépendant du chemin de relais APNS iOS (voir [Configuration](/fr/gateway/configuration) pour le push relayé) et de la méthode `push.test` existante, qui ciblent l'appairage mobile natif.</Note>

## Intégrations hébergées

Les messages de l'assistant peuvent afficher du contenu Web hébergé en ligne avec le shortcode `[embed ...]`. La stratégie de bac à sable iframe est contrôlée par `gateway.controlUi.embedSandbox` :

<Tabs>
  <Tab title="strict">Désactive l'exécution de scripts dans les intégrations hébergées.</Tab>
  <Tab title="scripts (default)">Autorise les intégrations interactives tout en maintenant l'isolation d'origine ; c'est le paramètre par défaut et est généralement suffisant pour les jeux/widgets de navigateur autonomes.</Tab>
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

<Warning>Utilisez `trusted` uniquement lorsque le document intégré a réellement besoin d'un comportement de même origine. Pour la plupart des jeux et canevas interactifs générés par des agents, `scripts` est le choix le plus sûr.</Warning>

Les URL d'intégration externes absolues `http(s)` restent bloquées par défaut. Si vous voulez intentionnellement que `[embed url="https://..."]` charge des pages tierces, définissez `gateway.controlUi.allowExternalEmbedUrls: true`.

## Largeur des messages de chat

Les messages de chat groupés utilisent une largeur maximale par défaut lisible. Les déploiements sur grands écrans peuvent la remplacer sans modifier le CSS regroupé en définissant `gateway.controlUi.chatMessageMaxWidth` :

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

La valeur est validée avant d'atteindre le navigateur. Les valeurs prises en charge incluent des longueurs et des pourcentages simples tels que `960px` ou `82%`, ainsi que des expressions de largeur `min(...)`, `max(...)`, `clamp(...)`, `calc(...)` et `fit-content(...)` contraintes.

## Accès Tailnet (recommandé)

<Tabs>
  <Tab title="TailscaleServe Tailscale intégré (préféré)"GatewayTailscale>
    Gardez le Gateway en boucle locale (loopback) et laissez Tailscale Serve le proxyer avec HTTPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Ouvrez :

    - `https://<magicdns>/` (ou votre `gateway.controlUi.basePath`Tailscale configuré)

    Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale (`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`OpenClaw. OpenClaw vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec `tailscale whois`Tailscale et en la correspondant à l'en-tête, et n'accepte celles-ci que lorsque la requête atteint la boucle locale avec les en-têtes `x-forwarded-*` de Tailscale. Pour les sessions opérateur de Control UI avec l'identité de l'appareil du navigateur, ce chemin Serve vérifié évite également l'aller-retour d'appariement d'appareil ; les navigateurs sans appareil et les connexions de rôle nœud suivent toujours les vérifications d'appareil normales. Définissez `gateway.auth.allowTailscale: false` si vous souhaitez exiger des informations d'identification de secret partagé explicites même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou `"password"`.

    Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client et le même périmètre d'authentification sont sérialisées avant les écritures de limitation de débit. Les mauvaises tentatives simultanées du même navigateur peuvent donc afficher `retry later` sur la deuxième requête au lieu de deux inadéquations simples en parallèle.

    <Warning>
    L'authentification Serve sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.
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

Si vous ouvrez le tableau de bord via un HTTP simple (`http://<lan-ip>` ou `http://<tailscale-ip>`), le navigateur fonctionne dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut, OpenClaw **bloque** les connexions Control UI sans identité d'appareil.

Exceptions documentées :

- compatibilité HTTP non sécurisé uniquement pour localhost avec `gateway.controlUi.allowInsecureAuth=true`
- authentification réussie de l'opérateur Control UI via `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` de secours

**Solution recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface localement :

- `https://<magicdns>/` (Serve)
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

    `allowInsecureAuth` est un commutateur de compatibilité local uniquement :

    - Il permet aux sessions Control UI localhost de procéder sans identité d'appareil dans des contextes HTTP non sécurisés.
    - Il ne contourne pas les vérifications d'appariement.
    - Il ne relâche pas les exigences d'identité d'appareil distantes (non localhost).

  </Accordion>
  <Accordion title="Uniquement en cas de secours">
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
    `dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil de Control UI et constitue une dégradation grave de la sécurité. Rétablissez-la rapidement après une utilisation d'urgence.
    </Warning>

  </Accordion>
  <Accordion title="Remarque sur le proxy de confiance">
    - Une authentification proxy de confiance réussie peut admettre des sessions Control UI **d'opérateur** sans identité d'appareil.
    - Cela **ne s'étend pas** aux sessions Control UI avec rôle de nœud.
    - Les proxys inversés de bouclage sur le même hôte ne satisfont toujours pas l'authentification proxy de confiance ; voir [Authentification proxy de confiance](/fr/gateway/trusted-proxy-auth).

  </Accordion>
</AccordionGroup>

Voir Tailscale (/en/gateway/tailscale) pour des conseils sur la configuration HTTPS.

## Politique de sécurité du contenu

L'interface de contrôle est fournie avec une stratégie `img-src` stricte : seuls les ressources de **même origine**, les URLs `data:` et les URLs `blob:` générées localement sont autorisées. Les `http(s)` distantes et les URLs d'images relatives au protocole sont rejetées par le navigateur et n'émettent pas de requêtes réseau.

Ce que cela signifie en pratique :

- Les avatars et les images servis sous des chemins relatifs (par exemple `/avatars/<id>`) s'affichent toujours, y compris les routes d'avatar authentifiées que l'interface récupère et convertit en URLs `blob:` locales.
- Les URLs `data:image/...` en ligne s'affichent toujours (utile pour les charges utiles intra-protocole).
- Les URLs `blob:` locales créées par l'interface de contrôle s'affichent toujours.
- Les URLs d'avatar distantes émises par les métadonnées de channel sont supprimées au niveau des assistants d'avatar de l'interface de contrôle et remplacées par le logo/insigne intégré, de sorte qu'un channel compromis ou malveillant ne peut pas forcer des récupérations d'images distantes arbitraires à partir du navigateur d'un opérateur.

Vous n'avez rien à modifier pour obtenir ce comportement — il est toujours actif et non configurable.

## Authentification de la route d'avatar

Lorsque l'authentification de la passerelle est configurée, le point de terminaison d'avatar de l'interface de contrôle nécessite le même jeton de passerelle que le reste de l'API :

- `GET /avatar/<agentId>` renvoie l'image de l'avatar uniquement aux appelants authentifiés. `GET /avatar/<agentId>?meta=1` renvoie les métadonnées de l'avatar sous la même règle.
- Les demandes non authentifiées vers l'une ou l'autre de ces routes sont rejetées (correspondant à la route sœur assistant-media). Cela empêche la route d'avatar de divulguer l'identité de l'agent sur les hôtes qui sont par ailleurs protégés.
- L'interface de contrôle elle-même transmet le jeton de passerelle sous forme d'en-tête bearer lors de la récupération des avatars, et utilise des URL blob authentifiées pour que l'image s'affiche toujours dans les tableaux de bord.

Si vous désactivez l'authentification de la passerelle (non recommandé sur les hôtes partagés), la route d'avatar devient également non authentifiée, en cohérence avec le reste de la passerelle.

## Authentification de la route des médias de l'assistant

Lorsque l'authentification de la passerelle est configurée, les aperçus de médias locaux de l'assistant utilisent une route en deux étapes :

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` nécessite l'authentification normale de l'opérateur de l'interface de contrôle. Le navigateur envoie le jeton de passerelle sous forme d'en-tête bearer lors de la vérification de la disponibilité.
- Les réponses de métadonnées réussies incluent un `mediaTicket` à courte durée de validité, limité à ce chemin source exact.
- Les URL d'images, d'audio, de vidéo et de documents rendus par le navigateur utilisent un `mediaTicket=<ticket>` au lieu du jeton ou du mot de passe actif de la passerelle. Le billet expire rapidement et ne peut pas autoriser une source différente.

Cela permet de maintenir le rendu média normal compatible avec les éléments média natifs du navigateur, sans placer d'identifiants de passerelle réutilisables dans les URL média visibles.

## Construire l'interface utilisateur

Le Gateway sert des fichiers statiques à partir de `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build
```

Base absolue facultative (lorsque vous souhaitez des URL d'actifs fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de dev distinct) :

```bash
pnpm ui:dev
```

Pointez ensuite l'interface utilisateur vers l'URL WS de votre Gateway (par ex. `ws://127.0.0.1:18789`).

## Page vide de l'interface utilisateur de contrôle

Si le navigateur charge un tableau de bord vide et que DevTools n'affiche aucune erreur utile, une extension ou un script de contenu anticipé a peut-être empêché l'évaluation de l'application module JavaScript. La page statique comprend un panneau de récupération HTML simple qui apparaît lorsque `<openclaw-app>` n'est pas enregistré après le démarrage.

Utilisez l'action **Réessayer** du panneau après avoir modifié l'environnement du navigateur, ou rechargez manuellement après ces vérifications :

- Désactivez les extensions qui s'injectent dans toutes les pages, en particulier les extensions avec des scripts de contenu `<all_urls>`.
- Essayez une fenêtre privée, un profil de navigateur propre ou un autre navigateur.
- Gardez le Gateway en cours d'exécution et vérifiez la même URL de tableau de bord après le changement de navigateur.

## Débogage/tests : serveur de dev + Gateway distant

L'interface utilisateur de contrôle se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous souhaitez le serveur de dev Vite localement mais que le Gateway s'exécute ailleurs.

<Steps>
  <Step title="Démarrer le serveur de dev de l'interface utilisateur">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="Ouvrir avec gatewayUrl">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    Authentification unique facultative (si nécessaire) :

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes">
    - `gatewayUrl` est stocké dans le localStorage après le chargement et supprimé de l'URL.
    - Si vous passez un point de terminaison `ws://` ou `wss://` complet via `gatewayUrl`, encodez l'URL de la valeur `gatewayUrl` afin que le navigateur analyse correctement la chaîne de requête.
    - `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et le référent. Les paramètres de requête `?token=` hérités sont toujours importés une fois pour compatibilité, mais seulement en repli, et sont supprimés immédiatement après l'amorçage.
    - `password` est conservé uniquement en mémoire.
    - Lorsque `gatewayUrl` est défini, l'interface utilisateur ne revient pas aux identifiants de configuration ou d'environnement. Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
    - Utilisez `wss://` lorsque le Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` n'est accepté que dans une fenêtre de premier niveau (non intégrée) pour empêcher le détournement de clic.
    - Les déploiements publics d'interface utilisateur de contrôle non bouclés doivent définir `gateway.controlUi.allowedOrigins` explicitement (origines complètes). Les chargements privés de même origine LAN/Tailnet à partir de bouclage, RFC1918/link-local, `.local`, `.ts.net` ou d'hôtes CGNAT Tailscale sont acceptés sans activer le repli d'en-tête Host.
    - Le démarrage du Gateway peut amorcer des origines locales telles que `http://localhost:<port>` et `http://127.0.0.1:<port>` à partir de la liaison et du port d'exécution effectifs, mais les origines du navigateur distant ont toujours besoin d'entrées explicites.
    - N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux strictement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur, et non « correspondre à l'hôte que j'utilise ».
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active le mode de repli d'origine d'en-tête Host, mais c'est un mode de sécurité dangereux.

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

Détails de la configuration de l'accès distant : [Remote access](/fr/gateway/remote).

## Connexes

- [Dashboard](/fr/web/dashboard) — tableau de bord de la passerelle
- [Health Checks](/fr/gateway/health) — surveillance de l'état de la passerelle
- [TUI](/fr/web/tui) — interface utilisateur en mode terminal
- [WebChat](/fr/web/webchat) — interface de discussion basée sur le navigateur
