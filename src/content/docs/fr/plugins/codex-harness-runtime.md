---
summary: "Limites d'exécution, hooks, outils, autorisations et diagnostics pour le harnais Codex"
title: "Runtime du harnais Codex"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

Cette page documente le contrat d'exécution pour les tours du harnais Codex. Pour la configuration et le routage, commencez par [Codex harness](/fr/plugins/codex-harness). Pour les champs de configuration, consultez [Codex harness reference](/fr/plugins/codex-harness-reference).

## Vue d'ensemble

Le mode Codex n'est pas PI avec un appel de modèle différent en dessous. Codex possède une plus grande partie de la boucle de modèle native, et OpenClaw adapte ses surfaces de plugin, d'outil, de session et de diagnostic autour de cette limite.

OpenClaw possède toujours le routage de channel, les fichiers de session, la livraison des messages visibles, les outils dynamiques OpenClaw, les approbations, la livraison des médias et un miroir de transcript. Codex possède le thread natif canonique, la boucle de modèle native, la continuation d'outil native et la compactage native, sauf si le moteur de contexte OpenClaw actif déclare qu'il possède la compactage.

Le routage des invites suit l'exécution sélectionnée, et pas seulement la chaîne du fournisseur. Un tour Codex natif reçoit les instructions de développeur du serveur d'application Codex, tandis qu'un itinéraire de compatibilité PI explicite conserve l'invite système OpenClawOpenAI/PI normal même lorsqu'il utilise l'authentification ou le transport OpenAI de type Codex.

Codex natif conserve les instructions de base/model/personnalité appartenant à Codex et le comportement de la documentation de projet selon la configuration du fil Codex actif. Les exécutions OpenClaw légères préservent toujours leur suppression existante de la documentation de projet. Les instructions de développeur OpenClaw couvrent les préoccupations d'exécution OpenClaw telles que la livraison via le canal source, les outils dynamiques OpenClaw, la délégation ACP, le contexte de l'adaptateur et les fichiers de profil de l'espace de travail de l'agent actif. Les catalogues de compétences OpenClaw ainsi que le contenu `MEMORY.md` et `BOOTSTRAP.md` actif sont projetés comme contexte de référence d'entrée de tour pour Codex natif.

## Liaisons de fil et changements de modèle

Lorsqu'une session OpenClaw est attachée à un fil Codex existant, le tour suivant renvoie le modèle OpenAI actuellement sélectionné, la politique d'approbation, le bac à sable et le niveau de service au serveur d'application. Le passage de `openai/gpt-5.5` à `openai/gpt-5.2` conserve la liaison du fil mais demande à Codex de continuer avec le modèle nouvellement sélectionné.

## Réponses visibles et battements de cœur

Lorsqu'un tour de chat direct/source passe par le harnais Codex, les réponses visibles sont par défaut l'outil de message : le texte final de l'assistant reste privé sauf si l'agent appelle `message(action="send")`. Cela correspond bien aux modèles GPT car ils peuvent décider si la sortie sur le canal source est utile. Définissez `messages.visibleReplies: "automatic"` pour restaurer l'ancien mode où le texte final de l'assistant est publié automatiquement.

Les tours de pulsation Codex obtiennent également `heartbeat_respond`OpenClaw dans le catalogue d'outils OpenClaw searchable par défaut, afin que l'agent puisse enregistrer si le réveil doit rester silencieux ou notifier sans encoder ce flux de contrôle dans le texte final.

Les directives d'initiative spécifiques aux pulsations sont envoyées en tant qu'instruction développeur en mode collaboration Codex sur le tour de pulsation lui-même. Les tours de chat ordinaires restaurent le mode Codex Default au lieu de transporter la philosophie de pulsation dans leur invite d'exécution normale. Lorsqu'un `HEARTBEAT.md` non vide existe, les instructions en mode collaboration de pulsation dirigent Codex vers le fichier au lieu d'insérer son contenu.

## Limites des hooks

Le harnais Codex possède trois couches de hooks :

| Couche                                                | Propriétaire             | Objectif                                                                                           |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| Hooks de plugin OpenClaw                              | OpenClaw                 | Compatibilité produit/plugin à travers PI et les harnais Codex.                                    |
| Middleware d'extension de serveur d'application Codex | Plugins groupés OpenClaw | Comportement de l'adaptateur par tour autour des outils dynamiques OpenClaw.                       |
| Hooks natifs Codex                                    | Codex                    | Cycle de vie de bas niveau de Codex et politique d'outil natif à partir de la configuration Codex. |

OpenClaw n'utilise pas les fichiers `hooks.json` Codex de projet ou global pour acheminer le comportement du plugin OpenClaw. Pour le pont d'outils natifs et de permissions pris en charge, OpenClaw injecte une configuration Codex par thread pour `PreToolUse`, `PostToolUse`, `PermissionRequest` et `Stop`.

Lorsque les approbations du serveur d'application Codex sont activées, ce qui signifie que `approvalPolicy` n'est pas `"never"`, la configuration de hook natif injectée par défaut omet `PermissionRequest` afin que le réviseur du serveur d'application Codex et le pont d'approbation OpenClaw gèrent les escalades réelles après examen. Les opérateurs peuvent explicitement ajouter `permission_request` à `nativeHookRelay.events` lorsqu'ils ont besoin du relais de compatibilité.

D'autres hooks Codex tels que `SessionStart` et `UserPromptSubmit` restent des contrôles au niveau Codex. Ils ne sont pas exposés en tant que hooks de plugin OpenClaw dans le contrat v1.

Pour les outils dynamiques OpenClaw, OpenClaw exécute l'outil après que Codex a demandé l'appel, donc OpenClaw déclenche le comportement du plugin et du middleware qu'il possède dans l'adaptateur du harnais. Pour les outils natifs Codex, Codex possède l'enregistrement de l'outil canonique. OpenClaw peut mettre en miroir des événements sélectionnés, mais il ne peut pas réécrire le fil de discussion natif Codex à moins que Codex n'expose cette opération via app-server ou des rappels de hook natif.

Les notifications d'élément de l'app-server Codex fournissent également des observations asynchrones `after_tool_call` pour les achèvements d'outils natifs qui ne sont pas déjà couverts par le relais natif `PostToolUse`. Ces observations sont destinées uniquement à la télémétrie et à la compatibilité des plugins ; elles ne peuvent pas bloquer, retarder ou modifier l'appel d'outil natif.

Les projections de compactage et du cycle de vie LLM proviennent des notifications de l'app-server Codex et de l'état de l'adaptateur OpenClaw, et non des commandes de hook natif Codex. Les événements `before_compaction`, `after_compaction`, `llm_input` et `llm_output` de OpenClaw sont des observations au niveau de l'adaptateur, et non des captures octet par octet des charges utiles de requête interne ou de compactage de Codex.

Les notifications de l'app-server natives `hook/started` et `hook/completed` de Codex sont projetées en tant qu'événements d'agent `codex_app_server.hook` pour la trajectoire et le débogage. Elles n'invoquent pas les hooks de plugin OpenClaw.

## Contrat de support V1

Pris en charge dans Codex runtime v1 :

| Surface                                                    | Support                                                                                                        | Pourquoi                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boucle de modèle OpenAI via Codex                          | Pris en charge                                                                                                 | L'app-server Codex possède le tour OpenAI, la reprise du fil natif et la continuation de l'outil natif.                                                                                                                                                                                                                                                                                                                                           |
| Routage et livraison de canal OpenClaw                     | Pris en charge                                                                                                 | Telegram, Discord, Slack, WhatsApp, iMessage et d'autres canaux restent en dehors du runtime du modèle.                                                                                                                                                                                                                                                                                                                                           |
| Outils dynamiques OpenClaw                                 | Pris en charge                                                                                                 | Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.                                                                                                                                                                                                                                                                                                                                                   |
| Plug-ins de prompt et de contexte                          | Pris en charge                                                                                                 | OpenClaw projette les prompts/contextes spécifiques à OpenClaw dans le tour Codex tout en laissant les prompts de base, de model, de personnalité et de documents de projet configurés dans la voie native Codex. Les instructions de développeur Codex natives n'acceptent que les directives de commande explicitement délimitées à `codex_app_server` ; les indices de commande globaux hérités restent pour les surfaces de prompt non Codex. |
| Cycle de vie du moteur de contexte                         | Pris en charge                                                                                                 | L'assemblage, l'ingestion, la maintenance après tour et la coordination de la compaction du moteur de contexte s'exécutent pour les tours Codex.                                                                                                                                                                                                                                                                                                  |
| Hooks dynamiques de tool                                   | Pris en charge                                                                                                 | `before_tool_call`, `after_tool_call` et le middleware de résultat de tool s'exécutent autour des tools dynamiques possédés par OpenClaw.                                                                                                                                                                                                                                                                                                         |
| Hooks de cycle de vie                                      | Pris en charge en tant qu'observations d'adaptateur                                                            | `llm_input`, `llm_output`, `agent_end`, `before_compaction` et `after_compaction` se déclenchent avec des payloads honnêtes en mode Codex.                                                                                                                                                                                                                                                                                                        |
| Porte de révision de la réponse finale                     | Pris en charge via le relais de hook natif                                                                     | Le `Stop` de Codex est relayé à `before_agent_finalize` ; `revise` demande à Codex une passe de model supplémentaire avant la finalisation.                                                                                                                                                                                                                                                                                                       |
| Blocage ou observation natifs du shell, du patch et du MCP | Pris en charge via le relais de hook natif                                                                     | Les `PreToolUse` et `PostToolUse` de Codex sont relayés pour les surfaces de tool natives engagées, y compris les payloads MCP sur le `0.125.0` du serveur d'application Codex ou plus récent. Le blocage est pris en charge ; la réécriture d'arguments ne l'est pas.                                                                                                                                                                            |
| Stratégie d'autorisation native                            | Pris en charge via les approbations du serveur d'application Codex et le relais de hook natif de compatibilité | Les demandes d'approbation du serveur d'application Codex sont acheminées via OpenClaw après l'examen Codex. Le relais de hook natif `PermissionRequest` est opt-in pour les modes d'approbation natifs car Codex l'émet avant l'examen du gardien.                                                                                                                                                                                               |
| Capture de trajectoire du serveur d'application            | Pris en charge                                                                                                 | OpenClaw enregistre la demande qu'il a envoyée au serveur d'application et les notifications du serveur d'application qu'il reçoit.                                                                                                                                                                                                                                                                                                               |

Non pris en charge dans le runtime Codex v1 :

| Surface                                                              | Limite V1                                                                                                                                                                                           | Voie future                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Mutation d'argument de tool natif                                    | Les hooks natifs de pré-outil Codex peuvent bloquer, mais OpenClaw ne réécrit pas les arguments des outils natifs Codex.                                                                            | Nécessite la prise en charge des hooks/schémas Codex pour le remplissage de l'entrée de l'outil.                               |
| Historique des transcriptions natif Codex modifiable                 | Codex possède l'historique canonique natif du fil de discussion. OpenClaw possède un miroir et peut projeter le contexte futur, mais ne doit pas modifier les éléments internes non pris en charge. | Ajoutez des API explicites de serveur d'application Codex si une chirurgie native du fil de discussion est nécessaire.         |
| `tool_result_persist` pour les enregistrements d'outils natifs Codex | Ce hook transforme les écritures de transcription détenues par OpenClaw, et non les enregistrements d'outils natifs Codex.                                                                          | Pourrait mettre en miroir les enregistrements transformés, mais la réécriture canonique nécessite la prise en charge de Codex. |
| Métadonnées natives de compactage riches                             | OpenClaw observe le début et la fin du compactage, mais ne reçoit pas de liste stable des éléments conservés/supprimés, de delta de jetons ou de charge utile de résumé.                            | Nécessite des événements de compactage Codex plus riches.                                                                      |
| Intervention de compactage                                           | Les hooks de compactage actuels de OpenClaw sont de niveau notification en mode Codex.                                                                                                              | Ajoutez des hooks de compactage pré/post Codex si les plugins doivent opposer un véto ou réécrire le compactage natif.         |
| Capture de requête d'API de modèle octet par octet                   | OpenClaw peut capturer les requêtes et notifications du serveur d'application, mais le cœur Codex construit en interne la requête finale de l'OpenAI API.                                           | Nécessite un événement de traçage des requêtes de modèle Codex ou une API de débogage.                                         |

## Autorisations natives et sollicitations MCP

Pour `PermissionRequest`, OpenClaw ne renvoie que des décisions explicites d'autorisation ou de refus
lorsque la politique décide. Un résultat sans décision n'est pas une autorisation. Codex le traite comme l'absence
de décision de hook et passe par défaut à son propre chemin de gardien ou d'approbation utilisateur.

Les modes d'approbation du serveur d'application Codex omettent ce hook natif par défaut. Ce comportement
s'applique lorsque `permission_request` est explicitement inclus dans
`nativeHookRelay.events` ou qu'un runtime de compatibilité l'installe.

Lorsqu'un opérateur choisit `allow-always`OpenClaw pour une demande d'autorisation native Codex, OpenClaw mémorise cette empreinte exacte de fournisseur/session/tool d'entrée/répertoire courant pour une fenêtre de session bornée. La décision mémorisée est intentionnellement une correspondance exacte uniquement : une commande modifiée, des arguments, une charge utile de l'outil ou un répertoire courant crée une nouvelle approbation.

Les sollicitations d'approbation d'outil MCP Codex sont acheminées via le flux d'approbation de plugin d'OpenClaw lorsque Codex marque OpenClaw`_meta.codex_approval_kind` comme `"mcp_tool_call"`. Les invites Codex `request_user_input` sont renvoyées au chat d'origine, et le prochain message de suivi mis en file d'attente répond à cette demande de serveur native au lieu d'être dirigé comme contexte supplémentaire. Les autres demandes de sollicitation MCP échouent en mode fermé.

## Orientation de la file d'attente

L'orientation de la file d'attente lors d'une exécution active correspond au `turn/steer` du serveur d'application Codex. Avec le `messages.queue.mode: "steer"`OpenClaw par défaut, OpenClaw regroupe les messages de chat en mode d'orientation pour la fenêtre de silence configurée et les envoie comme une seule requête `turn/steer` dans l'ordre d'arrivée.

Les tours de révision Codex et de compactage manuel peuvent rejeter l'orientation au sein du même tour. Dans ce cas, OpenClaw attend la fin de l'exécution active avant de commencer l'invite. Utilisez OpenClaw`/queue followup` ou `/queue collect` lorsque les messages doivent être mis en file d'attente par défaut au lieu d'être orientés. Voir [File d'attente d'orientation](/fr/concepts/queue-steering).

## Téléchargement de commentaires Codex

Lorsque `/diagnostics [note]`OpenClaw est approuvé pour une session utilisant le harnais natif Codex, OpenClaw appelle également le `feedback/upload` du serveur d'application Codex pour les fils Codex pertinents. Le téléchargement demande au serveur d'application d'inclure les journaux pour chaque fil répertorié et les sous-fils Codex générés lorsqu'ils sont disponibles.

Le téléchargement passe par le chemin de commentaires normal de Codex vers les serveurs OpenAI. Si les commentaires Codex sont désactivés sur ce serveur d'application, la commande renvoie l'erreur du serveur d'application. La réponse de diagnostic terminée répertorie les canaux, les ID de session OpenClaw, les ID de fil Codex et les commandes locales OpenAIOpenClaw`codex resume <thread-id>` pour les fils qui ont été envoyés.

Si vous refusez ou ignorez l'approbation, OpenClaw n'imprime pas ces identifiants Codex et
n'envoie pas de commentaires Codex. Le téléchargement ne remplace pas l'exportation des diagnostics du Gateway
local. Consultez [Diagnostics export](/fr/gateway/diagnostics) pour connaître le
comportement concernant l'approbation, la confidentialité, le bundle local et les discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous souhaitez spécifiquement le téléchargement de commentaires Codex
pour le fil de discussion actuellement attaché sans le bundle complet de diagnostics du Gateway.

## Compaction et miroir de transcript

Lorsque le modèle sélectionné utilise le harnais Codex, la compaction native du fil de discussion est
déléguée au serveur d'application Codex, sauf si un moteur de contexte actif déclare
`ownsCompaction: true`. Les moteurs de contexte propriétaires compactent d'abord et amènent OpenClaw
à abandonner l'ancien fil de discussion backend Codex afin que le prochain tour puisse réhydrater un nouveau
fil de discussion à partir du contexte géré par le moteur. OpenClaw conserve un miroir de transcript pour
l'historique du channel, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais.

Lorsqu'un moteur de contexte demande une projection d'amorçage de fil de discussion Codex, OpenClaw
projette les noms et identifiants des appels d'outils, les formes d'entrée, et le contenu des résultats d'outils expurgés
dans le nouveau fil de discussion Codex. Il ne copie pas les valeurs brutes des arguments des appels d'outils dans
cette projection.

Le miroir inclut l'invite de l'utilisateur, le texte final de l'assistant, et les enregistrements légers de raisonnement
ou de plan Codex lorsque le serveur d'application les émet. Actuellement, OpenClaw n'enregistre
que les signaux de début et de fin de la compaction native. Il n'expose pas encore de
résumé de compaction lisible par l'homme ni une liste auditable des entrées que Codex
a conservées après la compaction.

Parce que Codex possède le fil de discussion natif canonique, `tool_result_persist` ne réécrit pas
currentement les enregistrements de résultats d'outils natifs Codex. Il ne s'applique que lorsque
OpenClaw écrit un résultat d'outil de transcript de session appartenant à OpenClaw.

## Médias et diffusion

OpenClaw continue de posséder la livraison des médias et la sélection du fournisseur de médias. Image, vidéo, musique, PDF, TTS et la compréhension des médias utilisent des paramètres de fournisseur/model correspondants tels que OpenClaw`agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` et `messages.tts`.

Le texte, les images, la vidéo, la musique, le TTS, les approbations et la sortie de l'outil de messagerie continuent via le chemin de livraison normal d'OpenClaw. La génération de médias ne nécessite pas PI. Lorsque Codex émet un élément natif de génération d'image avec un OpenClaw`savedPath`OpenClaw, OpenClaw transfère ce fichier exact via le chemin normal de réponse-médias même si le tour Codex n'a pas de texte d'assistant.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness reference](/fr/plugins/codex-harness-reference)
- [Native Codex plugins](/fr/plugins/codex-native-plugins)
- [Plugin hooks](/fr/plugins/hooks)
- [Agent harness plugins](/fr/plugins/sdk-agent-harness)
- [Diagnostics export](/fr/gateway/diagnostics)
- [Trajectory export](/fr/tools/trajectory)
