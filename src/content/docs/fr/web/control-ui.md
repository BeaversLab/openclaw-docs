---
summary: "Interface utilisateur de contrôle basée sur le navigateur pour le Gateway (chat, activité, nœuds, configuration)"
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

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de réapprobation, sauf si vous le révoquez avec `openclaw devices revoke --device <id> --role <role>`CLI. Consultez la section [CLI des appareils](/fr/cli/devices) pour la rotation et la révocation des jetons.

Les agents Paperclip qui se connectent via l'adaptateur `openclaw_gateway` utilisent le même flux d'approbation du premier démarrage. Après la tentative de connexion initiale, exécutez `openclaw devices approve --latest` pour prévisualiser la demande en attente, puis réexécutez la commande `openclaw devices approve <requestId>` affichée pour l'approuver. Passez des valeurs explicites pour `--url` et `--token` pour une passerelle distante. Pour garder les approbations stables entre les redémarrages, configurez un `adapterConfig.devicePrivateKeyPem` persistant dans Paperclip au lieu de le laisser générer une nouvelle identité d'appareil éphémère à chaque exécution.

<Note>
- Les connexions directes de navigateur en boucle locale (local loopback) (`127.0.0.1` / `localhost`) sont automatiquement approuvées.
- Tailscale Serve peut ignorer l'allers-retours d'appariement pour les sessions d'opérateur de l'interface de contrôle lorsque `gateway.auth.allowTailscale: true`, l'identité Tailscale est vérifiée et que le navigateur présente son identité d'appareil.
- Les liaisons directes Tailnet, les connexions de navigateur LAN et les profils de navigateur sans identité d'appareil nécessitent toujours une approbation explicite.
- Chaque profil de navigateur génère un ID d'appareil unique, donc changer de navigateur ou effacer les données du navigateur nécessitera un nouvel appariement.

</Note>

## Identité personnelle (locale au navigateur)

L'interface de contrôle prend en charge une identité personnelle par navigateur (nom d'affichage et avatar) attachée aux messages sortants pour l'attribution dans les sessions partagées. Elle réside dans le stockage du navigateur, est limitée au profil de navigateur actuel et n'est pas synchronisée avec d'autres appareils ou persistée côté serveur au-delà des métadonnées normales d'auteur de transcription sur les messages que vous envoyez réellement. Effacer les données du site ou changer de navigateur la réinitialise à vide.

Le même modèle local au navigateur s'applique à la substitution de l'avatar de l'assistant. Les avatars d'assistant téléchargés superposent l'identité résolue par la passerelle uniquement sur le navigateur local et ne font jamais d'allers-retours via `config.patch`. Le champ de configuration partagé `ui.assistant.avatar` reste disponible pour les clients sans interface écrivant directement dans le champ (tels que les passerelles scriptées ou les tableaux de bord personnalisés).

## Point de terminaison de la configuration d'exécution

L'interface de contrôle récupère ses paramètres d'exécution à partir de `/__openclaw/control-ui-config.json`. Ce point de terminaison est protégé par la même authentification de passerelle que le reste de la surface HTTP : les navigateurs non authentifiés ne peuvent pas le récupérer, et une récupération réussie nécessite soit un jeton/mot de passe de passerelle déjà valide, une identité Tailscale Serve, soit une identité de proxy approuvé.

## Prise en charge des langues

L'interface de contrôle peut se localiser lors du premier chargement en fonction des paramètres régionaux de votre navigateur. Pour le modifier ultérieurement, ouvrez **Vue d'ensemble -> Accès Gateway -> Langue**. Le sélecteur de paramètres régionaux se trouve dans la carte Accès Gateway, et non sous Apparence.

- Paramètres régionaux pris en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `ar`, `it`, `tr`, `uk`, `id`, `pl`, `th`, `vi`, `nl`, `fa`
- Les traductions autres que l'anglais sont chargées à la demande dans le navigateur.
- Les paramètres régionaux sélectionnés sont enregistrés dans le stockage du navigateur et réutilisés lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais.

Les traductions de la documentation sont générées pour le même ensemble de paramètres régionaux non anglais, mais le sélecteur de langue intégré de Mintlify du site de documentation est limité aux codes de paramètres régionaux acceptés par Mintlify. Les documentations en thaï (`th`) et en persan (`fa`) sont toujours générées dans le dépôt de publication ; elles peuvent ne pas apparaître dans ce sélecteur tant que Mintlify ne prendra pas en charge ces codes.

## Thèmes d'apparence

Le panneau Apparence conserve les thèmes intégrés Claw, Knot et Dash, ainsi qu'un emplacement d'importation tweakcn local au navigateur. Pour importer un thème, ouvrez l'[éditeur tweakcn](https://tweakcn.com/editor/theme), choisissez ou créez un thème, cliquez sur **Partager**, et collez le lien du thème copié dans Apparence. L'importateur accepte également les URL de registre `https://tweakcn.com/r/themes/<id>`, les URL d'éditeur comme `https://tweakcn.com/editor/theme?theme=amethyst-haze`, les chemins relatifs `/themes/<id>`, les ID de thèmes bruts et les noms de thèmes par défaut tels que `amethyst-haze`.

L'apparence comprend également un paramètre de taille du texte local au navigateur. Ce paramètre est stocké avec le reste des préférences de l'interface de contrôle, s'applique au texte de la discussion, au texte du compositeur, aux cartes d'outils et aux barres latérales de discussion, et maintient les zones de saisie de texte à au moins 16 px afin que Safari mobile ne zoom pas automatiquement lors de la focalisation.

Les thèmes importés sont stockés uniquement dans le profil de navigateur actuel. Ils ne sont pas écrits dans la configuration de la passerelle et ne sont pas synchronisés entre les appareils. Le remplacement du thème importé met à jour l'emplacement local unique ; son effacement ramène le thème actif à Claw si le thème importé était sélectionné.

## Ce qu'il peut faire (aujourd'hui)

<AccordionGroup>
  <Accordion title="Chat et Talk">
    - Discutez avec le modèle via le WS du Gateway (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`).
    - Les actualisations de l'historique de chat demandent une fenêtre récente limitée avec des plages de texte par message, afin que les sessions volumineuses ne forcent pas le navigateur à rendre une charge utile de transcription complète avant que le chat ne devienne utilisable.
    - Parlez via des sessions en temps réel du navigateur. OpenAI utilise le WebRTC direct, Google Live utilise un jeton de navigateur à usage unique contraint sur WebSocket, et les plugins vocaux en temps réel backend-only utilisent le transport de relais du Gateway. Les sessions de fournisseur détenues par le client commencent par `talk.client.create` ; les sessions de relais du Gateway commencent par `talk.session.create`. Le relais conserve les identifiants du fournisseur sur le Gateway tandis que le navigateur diffuse le PCM du microphone via `talk.session.appendAudio`, transfère les appels d'outil du fournisseur `openclaw_agent_consult` via `talk.client.toolCall` pour la stratégie du Gateway et le modèle OpenClaw plus volumineux configuré, et achemine le guidage vocal de l'exécution active via `talk.client.steer` ou `talk.session.steer`.
    - Diffusez les appels d'outil + les cartes de sortie d'outil en direct dans le Chat (événements d'agent).
    - Onglet Activité avec des résumés locaux au navigateur, axés sur la rédaction, de l'activité des outils en direct à partir de la livraison d'événements `session.tool` / d'outil existante.

  </Accordion>
  <Accordion title="Channels, instances, sessions, dreams">
    - Channels : état des canaux intégrés ainsi que des canaux de plugins groupés/externes, connexion QR et configuration par canal (`channels.status`, `web.login.*`, `config.patch`).
    - Les actualisations des sondes de canaux gardent l'instantané précédent visible pendant que les vérifications lentes du provider se terminent, et les instantanés partiels sont étiquetés lorsqu'une sonde ou un audit dépasse son budget d'interface utilisateur.
    - Instances : liste de présence + actualisation (`system-presence`).
    - Sessions : liste les sessions de l'agent configuré par défaut, revient aux clés de session obsolètes de l'agent non configuré et applique les remplacements par session model/thinking/fast/verbose/trace/reasoning (`sessions.list`, `sessions.patch`).
    - Dreams : état de l'activité de rêve, bouton activer/désactiver et lecteur de Dream Diary (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).

  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">
    - Cron jobs : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`).
    - Skills : état, activer/désactiver, installer, mises à jour de clé API (API) (`skills.*`).
    - Nodes : liste + capacités (`node.list`).
    - Exec approvals : modifier les listes d'autorisation (allowlists) de la passerelle ou du nœud + demander la politique pour `exec host=gateway/node` (`exec.approvals.*`).

  </Accordion>
  <Accordion title="Config">
    - Afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`OAuth).
    - MCP dispose d'une page de paramètres dédiée pour les serveurs configurés, l'activation, les résumés OAuth/filtre/parallèle, les commandes d'opérateur courantes et l'éditeur de configuration étendu `mcp`.
    - Appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active.
    - Les écritures incluent une garde de hachage de base pour éviter d'écraser les modifications simultanées.
    - Les écritures (`config.set`/`config.apply`/`config.patch`) effectuent une résolution préalable des SecretRef actifs pour les références dans la charge utile de configuration soumise ; les références actives soumises non résolues sont rejetées avant l'écriture.
    - Les enregistrements de formulaire ignorent les espaces réservés obsolètes expurgés qui ne peuvent pas être restaurés à partir de la configuration enregistrée, tout en préservant les valeurs expurgées qui correspondent toujours aux secrets enregistrés.
    - Rendu de schéma + de formulaire (`config.schema` / `config.schema.lookup`, y compris champ `title` / `description`, indices d'interface utilisateur correspondants, résumés des enfants immédiats, métadonnées de documentation sur les nœuds d'objet/caractère générique/tableau/composition imbriqués, ainsi que les schémas de plugin + channel lorsque disponibles) ; l'éditeur JSON brut n'est disponible que lorsque l'instantané prend en charge un aller-retour brut sûr.
    - Si un instantané ne peut pas effectuer un aller-retour brut en toute sécurité, l'interface de contrôle Force le mode Formulaire et désactive le mode Brut pour cet instantané.
    - L'éditeur JSON brut « Réinitialiser à l'enregistré » préserve la forme d'origine brute (formatage, commentaires, disposition `$include`) au lieu de restituer un instantané aplati, ce qui permet aux modifications externes de survivre à une réinitialisation lorsque l'instantané peut effectuer un aller-retour brut en toute sécurité.
    - Les valeurs d'objet SecretRef structurées sont affichées en lecture seule dans les champs de texte du formulaire pour éviter une corruption accidentelle d'objet en chaîne.

  </Accordion>
  <Accordion title="Débogage, journaux, mise à jour">
    - Débogage : instantanés de l'état/santé/modèles + journal des événements + appels RPC manuels (`status`, `health`, `models.list`).
    - Le journal des événements comprend les temps de rafraîchissement de l'interface de contrôle/RPC, les temps de rendu lent du chat/de la configuration, et les entrées de réactivité du navigateur pour les images d'animation longues ou les tâches longues lorsque le navigateur expose ces types d'entrées PerformanceObserver.
    - Journaux : suivi en temps réel des journaux de fichiers de la passerelle avec filtre/exportation (`logs.tail`).
    - Mise à jour : exécuter une mise à jour de package/git + redémarrage (`update.run`) avec un rapport de redémarrage, puis interroger `update.status` après reconnexion pour vérifier la version de la passerelle en cours d'exécution.

  </Accordion>
  <Accordion title="Notes du panneau des tâches Cron">
    - Pour les tâches isolées, la distribution par défaut est le résumé de l'annonce. Vous pouvez passer à aucun si vous souhaitez des exécutions uniquement internes.
    - Les champs canal/cible apparaissent lorsque l'annonce est sélectionnée.
    - Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide.
    - Pour les tâches de session principale, les modes de distribution webhook et aucun sont disponibles.
    - Les contrôles d'édition avancés incluent la suppression après exécution, l'annulation du remplacement de l'agent, les options exactes/échelonnées du cron, les remplacements de modèle/réflexion de l'agent, et les basculements de livraison au mieux.
    - La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à correction.
    - Définissez `cron.webhookToken` pour envoyer un jeton porteur dédié ; s'il est omis, le webhook est envoyé sans en-tête d'authentification.
    - Solution de repli obsolète : exécutez `openclaw doctor --fix` pour migrer les tâches héritées stockées avec `notify: true` de `cron.webhook` vers une livraison webhook ou de fin explicite par tâche.

  </Accordion>
</AccordionGroup>

## Page MCP

La page MCP dédiée est une vue opérateur pour les serveurs MCP gérés par OpenClaw sous `mcp.servers`. Elle ne démarre pas les transports MCP par elle-même ; utilisez-la pour inspecter et modifier la configuration enregistrée, puis utilisez `openclaw mcp doctor --probe` lorsque vous avez besoin d'une preuve en direct du serveur.

Flux de travail typique :

1. Ouvrir **MCP** depuis la barre latérale.
2. Vérifiez les cartes de résumé pour les totaux, les serveurs activés, OAuth et les comptes filtrés.
3. Examinez chaque ligne de serveur pour le transport, l'activation, l'authentification, les filtres, les délais d'attente et les indices de commande.
4. Basculez l'activation lorsqu'un serveur doit rester configuré mais rester en dehors de la découverte d'exécution.
5. Modifiez la section de configuration `mcp` délimitée pour les définitions de serveur, les en-têtes, les chemins TLS/mTLS, les métadonnées OAuth, les filtres d'outil et les métadonnées de projection Codex.
6. Utilisez **Save** pour une écriture de configuration, ou **Save & Publish** lorsque le Gateway en cours d'exécution doit appliquer la configuration modifiée.
7. Exécutez `openclaw mcp status --verbose`, `openclaw mcp doctor --probe` ou `openclaw mcp reload` depuis un terminal lorsque le processus édité nécessite des diagnostics statiques, une preuve en direct ou une élimination de l'exécution en cache.

La page masque les valeurs de type URL contenant des informations d'identification avant le rendu et met entre guillemets les noms de serveur dans les extraits de commande, de sorte que les commandes copiées fonctionnent toujours avec des espaces ou des métacaractères de shell. La référence complète de la CLI et de la configuration se trouve dans [MCP](/fr/cli/mcp).

## Onglet Activité

L'onglet Activité est un observateur éphémère local au navigateur pour l'activité des outils en direct. Il est dérivé du même flux d'événements Gateway `session.tool` / outil qui alimente les cartes d'outils de Chat ; il n'ajoute pas une autre famille d'événements Gateway, de point de terminaison, de stockage d'activité durable, de flux de mesures ou de flux d'observateur externe.

Les entrées d'activité ne conservent que des résumés nettoyés et des aperçus de sortie masqués et tronqués. Les valeurs des arguments d'outil ne sont pas stockées dans l'état de l'activité ; l'interface utilisateur indique que les arguments sont masqués et enregistre uniquement le nombre de champs d'argument. La liste en mémoire suit l'onglet actuel du navigateur, survit à la navigation dans l'interface de contrôle et est réinitialisée lors du rechargement de la page, du changement de session ou de **Clear**.

## Comportement Chat

<AccordionGroup>
  <Accordion title="Sémantique d'envoi et d'historique">
    - `chat.send` est **non bloquant** : il acquitte immédiatement avec `{ runId, status: "started" }` et la réponse est diffusée par flux via des événements `chat`.
    - Les téléchargements de chat acceptent les images ainsi que les fichiers non vidéo. Les images conservent leur chemin natif ; les autres fichiers sont stockés en tant que médias gérés et affichés dans l'historique sous forme de liens de pièces jointes.
    - Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
    - Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de la transcription sont trop volumineuses, le Gateway peut tronquer les longs champs de texte, omettre les blocs de métadonnées lourds et remplacer les messages surdimensionnés par un espace réservé (`[chat.history omitted: message too large]`).
    - Lorsqu'un message d'assistant visible a été tronqué dans `chat.history`, le lecteur latéral peut récupérer l'entrée complète de la transcription normalisée pour l'affichage à la demande via `chat.message.get` par `sessionKey`, `agentId` actif si nécessaire, et la transcription `messageId`. Si le Gateway ne parvient toujours pas à renvoyer plus, le lecteur affiche un état d'indisponibilité explicite au lieu de répéter silencieusement l'aperçu tronqué.
    - Les images générées par l'assistant sont persistantes sous forme de références de médias gérés et renvoyées via des URL médias authentifiées du Gateway, de sorte que les rechargements ne dépendent pas du maintien des charges utiles d'images brutes en base64 dans la réponse de l'historique du chat.
    - Lors du rendu de `chat.history`, l'interface de contrôle supprime les balises de directive en ligne d'affichage uniquement du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués), et les jetons de contrôle de modèle ASCII/pleine largeur fuités, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply` ou le jeton d'accusé de réception de heartbeat `HEARTBEAT_OK`.
    - Lors d'un envoi actif et de l'actualisation finale de l'historique, la vue de chat garde visibles les messages locaux optimistes de l'utilisateur/de l'assistant si `chat.history` renvoie brièvement un ancien instantané ; la transcription canonique remplace ces messages locaux une fois que l'historique du Gateway a rattrapé son retard.
    - Les événements en direct `chat` sont l'état de livraison, tandis que `chat.history` est reconstruit à partir de la transcription de session durable. Après les événements finaux d'outil, l'interface de contrôle recharge l'historique et fusionne uniquement une petite queue optimiste ; la limite de la transcription est documentée dans [WebChat](/fr/web/webchat).
    - `chat.inject` ajoute une note d'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour de l'interface uniquement (pas d'exécution d'agent, pas de livraison de canal).
    - L'en-tête de chat affiche le filtre d'agent avant le sélecteur de session, et le sélecteur de session est délimité par l'agent sélectionné. Le changement d'agent n'affiche que les sessions liées à cet agent et revient à la session principale de cet agent lorsqu'il n'a pas encore de sessions de tableau de bord enregistrées.
    - Sur les largeurs de bureau, les commandes de chat restent sur une seule ligne compacte et se réduisent lors du défilement vers le bas de la transcription ; le défilement vers le haut, le retour en haut ou l'atteinte du bas restaure les commandes.
    - Les messages texte en double consécutifs s'affichent sous la forme d'une seule bulle avec un badge de comptage. Les messages contenant des images, des pièces jointes, des sorties d'outil ou des aperçus de canevas ne sont pas réduits.
    - Les sélecteurs de modèle et de réflexion de l'en-tête de chat corrigent immédiatement la session active via `sessions.patch` ; ce sont des remplacements persistants de session, et non des options d'envoi pour un seul tour.
    - Si vous envoyez un message alors qu'un changement de sélecteur de modèle pour la même session est toujours en cours d'enregistrement, le compositeur attend que ce correctif de session soit effectué avant d'appeler `chat.send` afin que l'envoi utilise le modèle sélectionné.
    - Taper `/new` dans l'interface de contrôle crée et bascule vers la même session de tableau de bord fraîche que Nouveau chat, sauf si `session.dmScope: "main"` est configuré et que le parent actuel est la session principale de l'agent ; dans ce cas, il réinitialise la session principale en place. Taper `/reset` conserve la réinitialisation explicite en place du Gateway pour la session actuelle.
    - Le sélecteur de modèle de chat demande la vue de modèle configurée du Gateway. Si `agents.defaults.models` est présent, cette liste d'autorisation pilote le sélecteur, y compris les entrées `provider/*` qui gardent les catalogues délimités par fournisseur dynamiques. Sinon, le sélecteur affiche les entrées explicites `models.providers.*.models` ainsi que les fournisseurs avec une authentification utilisable. Le catalogue complet reste disponible via le RPC de débogage `models.list` avec `view: "all"`.
    - Lorsque les rapports d'utilisation de session frais du Gateway incluent des jetons de contexte actuels, la zone du compositeur de chat affiche un indicateur compact d'utilisation du contexte. Il passe à un style d'avertissement en cas de forte pression sur le contexte et, aux niveaux de compactage recommandés, affiche un bouton compact qui exécute le chemin de compactage de session normal. Les instantanés de jetons périmés sont masqués jusqu'à ce que le Gateway signale une nouvelle utilisation fraîche.

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Le mode Talk utilise un fournisseur vocal en temps réel enregistré. Configurez OpenAI avec `talk.realtime.provider: "openai"` plus soit `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY`, ou un profil OAuth `openai` ; configurez Google avec `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`. Pour les modèles temps réel GPT hébergés, OpenClaw préfère le profil OAuth `openai` avant `OPENAI_API_KEY` ; une `apiKey` temps réel explicite OpenAI reste le paramètre de remplacement avancé. Le navigateur ne reçoit jamais de clé API de fournisseur standard. OpenAIAPI reçoit un secret client Realtime éphémère pour WebRTC. Google Live reçoit un jeton d'authentification API Live contraint à usage unique pour une session WebSocket de navigateur, avec des instructions et des déclarations d'outil verrouillées dans le jeton par le Gateway. Les fournisseurs qui n'exposent qu'un pont temps réel backend passent par le transport de relais Gateway, de sorte que les informations d'identification et les sockets fournisseur restent côté serveur pendant que l'audio du navigateur traverse les RPC Gateway authentifiés. Le prompt de session Realtime est assemblé par le Gateway ; `talk.client.create` n'accepte pas les remplacements d'instructions fournis par l'appelant.

    Le compositeur de Chat inclut un bouton d'options Talk à côté du bouton de démarrage/arrêt Talk. Les options s'appliquent à la prochaine session Talk et peuvent remplacer le fournisseur, le transport, le modèle, la voix, l'effort de raisonnement, le seuil VAD, la durée du silence et le remplissage du préfixe. Lorsqu'une option est vide, le Gateway utilise les valeurs par défaut configurées si elles sont disponibles ou la valeur par défaut du fournisseur. Sélectionner le relais Gateway force le chemin de relais backend ; sélectionner WebRTC garde la session propriétaire du client et échoue au lieu de revenir silencieusement au relais si le fournisseur ne peut pas créer une session navigateur.

    Dans le compositeur de Chat, le contrôle Talk est le bouton d'ondes à côté du bouton de dictée microphone. Lorsque Talk démarre, la ligne d'état du compositeur affiche `Connecting Talk...`, puis `Talk live` pendant que l'audio est connecté, ou `Asking OpenClaw...` pendant qu'un appel d'outil temps réel consulte le modèle plus grand configuré via `talk.client.toolCall`.

    Test de fumée en direct du mainteneur : `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` vérifie le pont WebSocket backend OpenAI, l'échange SDP WebRTC navigateur OpenAI, la configuration WebSocket navigateur à jeton contraint Google Live et l'adaptateur navigateur de relais Gateway avec un média de faux microphone. La commande affiche uniquement l'état du fournisseur et ne consigne pas de secrets.

  </Accordion>
  <Accordion title="Arrêt et abandon">
    - Cliquez sur **Stop** (appelle `chat.abort`).
    - Pendant qu'une exécution est active, les suites normales sont mises en file d'attente. Cliquez sur **Steer** sur un message en file d'attente pour injecter cette suite dans le tour en cours.
    - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande.
    - `chat.abort` prend en charge `{ sessionKey }` (sans `runId`) pour abandonner toutes les exécutions actives pour cette session.

  </Accordion>
  <Accordion title="Conservation des partiels abandonnés">
    - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface utilisateur.
    - Le Gateway conserve le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe.
    - Les entrées conservées incluent des métadonnées d'abandon afin que les consommateurs de transcriptions puissent distinguer les partiels abandonnés de la sortie de complétion normale.

  </Accordion>
</AccordionGroup>

## Installation PWA et Web Push

Le Control UI fournit un `manifest.webmanifest` et un service worker, afin que les navigateurs modernes puissent l'installer en tant que PWA autonome. Web Push permet au Gateway de réveiller la PWA installée avec des notifications même lorsque l'onglet ou la fenêtre du navigateur n'est pas ouvert.

Si la page affiche **Protocol mismatch** (Incompatibilité de protocole) juste après une mise à jour d'OpenClaw, rouvrez d'abord le tableau de bord avec `openclaw dashboard` et actualisez fortement la page. Si cela échoue toujours, effacez les données du site pour l'origine du tableau de bord ou testez dans une fenêtre de navigateur privée ; un ancien onglet ou le cache du service worker du navigateur peut continuer à faire fonctionner un bundle Control UI pré-mise à jour contre le Gateway plus récent.

| Surface                                                     | Ce qu'il fait                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                            | Manifeste PWA. Les navigateurs proposent "Install app" une fois qu'il est accessible. |
| `ui/public/sw.js`                                           | Service worker qui gère les événements `push` et les clics sur les notifications.     |
| `push/vapid-keys.json` (sous le répertoire d'état OpenClaw) | Paire de clés VAPID auto-générée utilisée pour signer les charges utiles Web Push.    |
| `push/web-push-subscriptions.json`                          | Points de terminaison d'abonnement du navigateur persistés.                           |

Remplacez la paire de clés VAPID via des env vars sur le processus Gateway lorsque vous souhaitez épingler des clés (pour les déploiements multi-hôtes, la rotation des secrets ou les tests) :

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (par défaut `https://openclaw.ai`)

L'interface de contrôle utilise ces méthodes Gateway limitées par portée pour enregistrer et tester les abonnements du navigateur :

- `push.web.vapidPublicKey` — récupère la clé publique VAPID active.
- `push.web.subscribe` — enregistre un `endpoint` ainsi que `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — supprime un point de terminaison enregistré.
- `push.web.test` — envoie une notification de test à l'abonnement de l'appelant.

<Note>Web Push est indépendant du chemin de relais APNS iOS (voir [Configuration](/fr/gateway/configuration) pour le push pris en charge par le relais) et de la méthode `push.test` existante, qui ciblent l'appairage mobile natif.</Note>

## Intégrations hébergées

Les messages de l'assistant peuvent afficher du contenu Web hébergé en ligne avec le shortcode `[embed ...]`. La stratégie de bac à sable iframe est contrôlée par `gateway.controlUi.embedSandbox` :

<Tabs>
  <Tab title="strict">Désactive l'exécution de scripts dans les intégrations hébergées.</Tab>
  <Tab title="scripts (default)">Autorise les intégrations interactives tout en maintenant l'isolement de l'origine ; c'est le réglage par défaut et est généralement suffisant pour les jeux/widgets de navigateur autonomes.</Tab>
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

<Warning>Utilisez `trusted` uniquement lorsque le document intégré a véritablement besoin d'un comportement de même origine. Pour la plupart des jeux et canevas interactifs générés par des agents, `scripts` est le choix le plus sûr.</Warning>

Les URL d'intégration `http(s)` externes absolues restent bloquées par défaut. Si vous souhaitez intentionnellement que `[embed url="https://..."]` charge des pages tierces, définissez `gateway.controlUi.allowExternalEmbedUrls: true`.

## Largeur des messages de chat

Les messages de chat groupés utilisent une largeur maximale par défaut lisible. Les déploiements sur grands moniteurs peuvent la remplacer sans modifier le CSS groupé en définissant `gateway.controlUi.chatMessageMaxWidth` :

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
  <Tab title="TailscaleTailscale Serve intégré (recommandé)"GatewayTailscale>
    Conservez la Gateway sur le bouclage local (loopback) et laissez Tailscale Serve le proxyer avec HTTPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Ouvrez :

    - `https://<magicdns>/` (ou votre `gateway.controlUi.basePath`Tailscale configuré)

    Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale (`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`OpenClaw. OpenClaw vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec `tailscale whois`Tailscale et en la faisant correspondre à l'en-tête, et n'accepte ces requêtes que lorsqu'elles atteignent le bouclage local avec les en-têtes `x-forwarded-*` de Tailscale. Pour les sessions opérateur de Control UI avec identité d'appareil navigateur, ce chemin Serve vérifié évite également l'aller-retour d'appairage d'appareil ; les navigateurs sans appareil et les connexions de rôle nœud suivent toujours les vérifications d'appareil normales. Définissez `gateway.auth.allowTailscale: false` si vous souhaitez exiger des identifiants de secret partagé explicites même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou `"password"`.

    Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client et le même portée d'authentification sont sérialisées avant les écritures de limitation de débit. Les mauvaises tentatives simultanées du même navigateur peuvent donc afficher `retry later` lors de la deuxième requête au lieu de deux simples inadéquations en parallèle.

    <Warning>
    L'authentification Serve sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.
    </Warning>

  </Tab>
  <Tab title="Lier au tailnet + jeton">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    Puis ouvrez :

    - `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

    Collez le secret partagé correspondant dans les paramètres de l'interface utilisateur (envoyé en tant que `connect.params.auth.token` ou `connect.params.auth.password`).

  </Tab>
</Tabs>

## HTTP non sécurisé

Si vous ouvrez le tableau de bord via HTTP simple (`http://<lan-ip>` ou `http://<tailscale-ip>`), le navigateur fonctionne dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut, OpenClaw **bloque** les connexions au Control UI sans identité d'appareil.

Exceptions documentées :

- compatibilité HTTP non sécurisé localhost uniquement avec `gateway.controlUi.allowInsecureAuth=true`
- authentification réussie de l'opérateur du Control UI via `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` break-glass

**Solution recommandée :** utiliser HTTPS (Tailscale Serve) ou ouvrir l'interface localement :

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

    - Il permet aux sessions localhost du Control UI de procéder sans identité d'appareil dans les contextes HTTP non sécurisés.
    - Il ne contourne pas les vérifications d'appairage.
    - Il n'assouplit pas les exigences d'identité d'appareil distantes (non-localhost).

  </Accordion>
  <Accordion title="Uniquement break-glass">
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
    `dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil du Control UI et constitue une dégradation de sécurité importante. Rétablissez rapidement après une utilisation en cas d'urgence.
    </Warning>

  </Accordion>
  <Accordion title="Note sur le proxy de confiance">
    - Une authentification trusted-proxy réussie peut admettre des sessions du Control UI **opérateur** sans identité d'appareil.
    - Cela ne s'étend **pas** aux sessions du Control UI avec un rôle de nœud.
    - Les proxies inversés en boucle (loopback) sur le même hôte ne satisfont toujours pas l'authentification trusted-proxy ; voir [Trusted proxy auth](/fr/gateway/trusted-proxy-auth).

  </Accordion>
</AccordionGroup>

Voir [Tailscale](/fr/gateway/tailscale) pour obtenir des conseils sur la configuration HTTPS.

## Politique de sécurité du contenu

L'interface de contrôle de l'UI est fournie avec une stratégie `img-src` stricte : seuls les ressources de **même origine**, les URL `data:` et les URL `blob:` générées localement sont autorisées. Les `http(s)` distantes et les URL d'images relatives au protocole sont rejetées par le navigateur et n'émettent pas de récupérations réseau.

Ce que cela signifie en pratique :

- Les avatars et les images servis sous des chemins relatifs (par exemple `/avatars/<id>`) s'affichent toujours, y compris les routes d'avatar authentifiées que l'interface récupère et convertit en URL `blob:` locales.
- Les URL `data:image/...` en ligne s'affichent toujours (utile pour les charges utiles intra-protocole).
- Les URL `blob:` locales créées par l'interface de contrôle s'affichent toujours.
- Les URL d'avatar distantes émises par les métadonnées du canal sont supprimées au niveau des assistants d'avatar de l'interface de contrôle et remplacées par le logo/badge intégré, afin qu'un canal compromis ou malveillant ne puisse pas forcer des récupérations d'images distantes arbitraires à partir du navigateur d'un opérateur.

Vous n'avez rien à modifier pour obtenir ce comportement — il est toujours activé et non configurable.

## Authentification de la route d'avatar

Lorsque l'authentification de la passerelle est configurée, le point de terminaison d'avatar de l'interface de contrôle nécessite le même jeton de passerelle que le reste de l'API :

- `GET /avatar/<agentId>` renvoie l'image de l'avatar uniquement aux appelants authentifiés. `GET /avatar/<agentId>?meta=1` renvoie les métadonnées de l'avatar sous la même règle.
- Les requêtes non authentifiées vers l'une ou l'autre de ces routes sont rejetées (correspondant à la route sœur assistant-media). Cela empêche la route d'avatar de divulguer l'identité de l'agent sur des hôtes qui sont par ailleurs protégés.
- L'interface de contrôle elle-même transmet le jeton de passerelle en tant qu'en-tête Bearer lors de la récupération des avatars, et utilise des URL blob authentifiées pour que l'image s'affiche toujours dans les tableaux de bord.

Si vous désactivez l'authentification de la passerelle (non recommandé sur les hôtes partagés), la route d'avatar devient également non authentifiée, en cohérence avec le reste de la passerelle.

## Authentification de la route des médias de l'assistant

Lorsque l'authentification de la passerelle est configurée, les prévisualisations locales de média de l'assistant utilisent une route en deux étapes :

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` nécessite l'authentification normale de l'opérateur de l'interface de contrôle. Le navigateur envoie le jeton de passerelle en tant qu'en-tête Bearer lors de la vérification de la disponibilité.
- Les réponses de métadonnées réussies incluent un `mediaTicket` à courte durée de validité limité à ce chemin source exact.
- Les URL d'images, de fichiers audio, de vidéos et de documents rendus par le navigateur utilisent `mediaTicket=<ticket>` au lieu du jeton ou du mot de passe actif de la passerelle. Le ticket expire rapidement et ne peut pas autoriser une source différente.

Cela permet de maintenir le rendu média normal compatible avec les éléments média natifs du navigateur sans placer d'identifiants de passerelle réutilisables dans les URL médias visibles.

## Compiler l'interface utilisateur

Le Gateway sert des fichiers statiques depuis `dist/control-ui`. Compilez-les avec :

```bash
pnpm ui:build
```

Base absolue facultative (lorsque vous souhaitez des URL d'éléments fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de développement distinct) :

```bash
pnpm ui:dev
```

Pointez ensuite l'interface utilisateur vers l'URL WS de votre Gateway (par exemple `ws://127.0.0.1:18789`).

## Page vide de l'interface utilisateur de contrôle

Si le navigateur charge un tableau de bord vide et que DevTools n'affiche aucune erreur utile, une extension ou un script de contenu précoce a peut-être empêché l'évaluation de l'application module JavaScript. La page statique inclut un panneau de récupération HTML brut qui apparaît lorsque `<openclaw-app>` n'est pas enregistré après le démarrage.

Utilisez l'action **Réessayer** du panneau après avoir modifié l'environnement du navigateur, ou rechargez manuellement après ces vérifications :

- Désactivez les extensions qui s'injectent dans toutes les pages, en particulier les extensions avec des scripts de contenu `<all_urls>`.
- Essayez une fenêtre privée, un profil de navigateur propre ou un autre navigateur.
- Gardez le Gateway en cours d'exécution et vérifiez la même URL de tableau de bord après avoir changé de navigateur.

## Débogage/tests : serveur de développement + Gateway distant

L'interface utilisateur de contrôle se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous souhaitez le serveur de développement Vite localement mais que le Gateway s'exécute ailleurs.

<Steps>
  <Step title="Démarrer le serveur de développement de l'interface utilisateur">
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
    - `gatewayUrl` est stocké dans localStorage après le chargement et supprimé de l'URL.
    - Si vous passez un point de terminaison `ws://` ou `wss://` complet via `gatewayUrl`, encodez en URL la valeur `gatewayUrl` afin que le navigateur analyse correctement la chaîne de requête.
    - `token` doit être transmis via le fragment d'URL (`#token=...`) chaque fois que c'est possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et le Referer. Les paramètres de requête `?token=` hérités sont toujours importés une fois pour la compatibilité, mais uniquement en guise de solution de repli, et sont supprimés immédiatement après le démarrage.
    - `password` est conservé uniquement en mémoire.
    - Lorsque `gatewayUrl` est défini, l'interface utilisateur ne revient pas aux identifiants de configuration ou d'environnement. Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
    - Utilisez `wss://` lorsque le Gateway se trouve derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` n'est accepté que dans une fenêtre de niveau supérieur (non intégrée) pour empêcher le détournement de clic (clickjacking).
    - Les déploiements publics d'interface utilisateur de contrôle non-bouclage doivent définir `gateway.controlUi.allowedOrigins` explicitement (origines complètes). Les chargements privés de même origine LAN/Tailnet à partir de bouclage, RFC1918/link-local, `.local`, `.ts.net`, ou d'hôtes CGNAT Tailscale sont acceptés sans activer le repli d'en-tête Host.
    - Le démarrage du Gateway peut amorcer des origines locales telles que `http://localhost:<port>` et `http://127.0.0.1:<port>` à partir de la liaison et du port d'exécution effectifs, mais les origines de navigateur distant ont toujours besoin d'entrées explicites.
    - N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux étroitement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur, et non « faire correspondre l'hôte que j'utilise ».
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active le mode de repli d'origine via en-tête Host, mais il s'agit d'un mode de sécurité dangereux.

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
- [Vérifications de santé](/fr/gateway/health) — surveillance de l'état de la passerelle
- [TUI](/fr/web/tui) — interface utilisateur en terminal
- [WebChat](/fr/web/webchat) — interface de chat basée sur le navigateur
