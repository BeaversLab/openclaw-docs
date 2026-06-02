---
summary: "Limites d'exécution, hooks, outils, autorisations et diagnostics pour le harnais Codex"
title: "Runtime du harnais Codex"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across OpenClaw and Codex harness turns
---

Cette page documente le contrat d'exécution pour les tours de harnais Codex. Pour la configuration et le routage, commencez par [Codex harness](/fr/plugins/codex-harness). Pour les champs de configuration, consultez [Codex harness reference](/fr/plugins/codex-harness-reference).

## Vue d'ensemble

Le mode Codex n'est pas OpenClaw avec un appel de modèle différent en dessous. Codex possède une plus grande partie de la boucle de modèle native, et OpenClaw adapte ses surfaces de plugin, d'outil, de session et de diagnostic autour de cette limite.

OpenClaw possède toujours le routage de channel, les fichiers de session, la livraison des messages visibles, les outils dynamiques OpenClaw, les approbations, la livraison des médias et un miroir de transcription. Codex possède le thread natif canonique, la boucle de modèle native, la continuation d'outil native et la compactage native.

Le routage des invites suit l'exécution sélectionnée, et pas seulement la chaîne du fournisseur. Un tour Codex natif reçoit les instructions de développeur du serveur d'application Codex, tandis qu'un itinéraire de compatibilité OpenClaw explicite conserve l'invite système normal OpenClaw même lorsqu'il utilise l'authentification ou le transport OpenAI de type Codex.

Codex natif conserve les instructions de base/model de Codex et le comportement de la documentation de projet selon la configuration du thread Codex actif. OpenClaw démarre et reprend les threads Codex natifs avec la personnalité intégrée de Codex désactivée, afin que les fichiers de personnalité de l'espace de travail et l'identité de l'agent OpenClaw restent faisant autorité. Les exécutions légères OpenClaw préservent toujours leur suppression existante de la documentation de projet. Les instructions développeur OpenClaw couvrent les préoccupations d'exécution OpenClaw telles que la livraison source-channel, les outils dynamiques OpenClaw, la délégation ACP, le contexte de l'adaptateur et les fichiers de profil de l'espace de travail de l'agent actif. Les catalogues de compétences et les pointeurs `MEMORY.md` routés par outils OpenClaw sont projetés en tant qu'instructions développeur de collaboration limitées au tour pour Codex natif. Le contenu `BOOTSTRAP.md` actif et l'injection de repli `MEMORY.md` complet utilisent toujours le contexte de référence d'entrée du tour.

## Liaisons de fil et changements de modèle

Lorsqu'une session OpenClaw est attachée à un thread Codex existant, le tour suivant renvoie le model OpenAI actuellement sélectionné, la politique d'approbation, le sandbox et le niveau de service au serveur d'application. Le basculement de `openai/gpt-5.5` à `openai/gpt-5.2` conserve la liaison du thread mais demande à Codex de continuer avec le model nouvellement sélectionné.

## Réponses visibles et battements de cœur

Lorsqu'un tour de discussion direct/source traverse le harnais Codex, les réponses visibles sont par défaut livrées automatiquement en tant que texte final de l'assistant pour les surfaces internes WebChat. Cela permet de garder Codex aligné avec le contrat d'invite du harnais Pi : les agents répondent normalement, et OpenClaw publie le texte final dans la conversation source. Définissez `messages.visibleReplies: "message_tool"` lorsqu'une discussion direct/source doit intentionnellement garder le texte final de l'assistant privé, sauf si l'agent appelle `message(action="send")`.

Les tours de pulsation Codex obtiennent également `heartbeat_respond` dans le catalogue de OpenClaw
tool consultable par défaut, afin que l'agent puisse enregistrer si le réveil doit rester
silencieux ou notifier sans encoder ce flux de contrôle dans le texte final.

Les directives d'initiative spécifiques aux pulsations sont envoyées sous forme d'instruction de développeur en mode collaboration Codex sur le tour de pulsation lui-même. Les tours de conversation ordinaires restaurent le mode Codex par défaut au lieu de transporter la philosophie de pulsation dans leur invite d'exécution normale. Lorsqu'un `HEARTBEAT.md` non vide existe, les instructions de mode collaboration de pulsation dirigent Codex vers le fichier au lieu d'insérer son
contenu.

## Limites des hooks

Le harnais Codex possède trois couches de hooks :

| Couche                                                | Propriétaire             | Objectif                                                                                           |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| Hooks de plugin OpenClaw                              | OpenClaw                 | Compatibilité produit/plugin entre OpenClaw et les harnais Codex.                                  |
| Middleware d'extension de serveur d'application Codex | Plugins groupés OpenClaw | Comportement de l'adaptateur par tour autour des outils dynamiques OpenClaw.                       |
| Hooks natifs Codex                                    | Codex                    | Cycle de vie de bas niveau de Codex et politique d'outil natif à partir de la configuration Codex. |

OpenClaw n'utilise pas les fichiers de configuration Codex `hooks.json` de projet ou globaux pour acheminer
le comportement du plugin OpenClaw. Pour le tool natif et le pont de permission pris en charge,
OpenClaw injecte une configuration Codex par thread pour `PreToolUse`, `PostToolUse`,
`PermissionRequest`, et `Stop`.

Lorsque les approbations du serveur d'application Codex sont activées, c'est-à-dire que `approvalPolicy` n'est pas
`"never"`, la configuration de hook natif injectée par défaut omet `PermissionRequest` afin que
le réviseur du serveur d'application Codex et le pont d'approbation de OpenClaw gèrent les réelles
escalades après révision. Les opérateurs peuvent explicitement ajouter `permission_request` à
`nativeHookRelay.events` lorsqu'ils ont besoin du relais de compatibilité.

D'autres hooks Codex tels que `SessionStart` et `UserPromptSubmit` restent
des contrôles au niveau Codex. Ils ne sont pas exposés en tant que hooks de plugin OpenClaw dans le contrat
v1.

Pour les outils dynamiques OpenClaw, OpenClaw exécute l'outil après que Codex a demandé l'appel, donc OpenClaw déclenche le comportement du plugin et du middleware qu'il possède dans l'adaptateur du harnais. Pour les outils natifs Codex, Codex possède l'enregistrement de l'outil canonique. OpenClaw peut mettre en miroir des événements sélectionnés, mais il ne peut pas réécrire le fil de discussion natif Codex à moins que Codex n'expose cette opération via app-server ou des rappels de hook natif.

Les événements en mode rapport de l'app-server Codex `PreToolUse` diffèrent les demandes d'approbation du plugin vers l'approbation correspondante de l'app-server. Si un hook OpenClaw `before_tool_call` renvoie `requireApproval` alors que la charge utile native définit le mode d'approbation du rapport (`openclaw_approval_mode` est `"report"`), le relais du hook natif enregistre l'exigence d'approbation du plugin et ne renvoie aucune décision native. Lorsque Codex envoie la demande d'approbation de l'app-server pour la même utilisation d'outil, OpenClaw ouvre l'invite d'approbation du plugin et renvoie la décision à Codex. Les événements `PermissionRequest` de Codex constituent un chemin d'approbation distinct et peuvent toujours passer par les approbations OpenClaw lorsque le runtime est configuré pour ce pont.

Les notifications d'éléments de l'app-server Codex fournissent également des observations `after_tool_call` asynchrones pour les achèvements d'outils natifs qui ne sont pas déjà couverts par le relais `PostToolUse` natif. Ces observations sont destinées uniquement à la télémétrie et à la compatibilité des plugins ; elles ne peuvent pas bloquer, retarder ou modifier l'appel de l'outil natif.

Les projections du cycle de vie de la compression et du LLM proviennent des notifications de l'app-server Codex et de l'état de l'adaptateur OpenClaw, et non des commandes du hook Codex natif. Les événements OpenClaw `before_compaction`, `after_compaction`, `llm_input` et `llm_output` sont des observations au niveau de l'adaptateur, et non des captures octet par octet des demandes internes ou des charges utiles de compression de Codex.

Les notifications de l'app-server Codex native `hook/started` et `hook/completed` sont projetées en tant qu'événements d'agent `codex_app_server.hook` pour la trajectoire et le débogage. Elles n'invoquent pas les hooks de plugin OpenClaw.

## Contrat de support V1

Pris en charge dans le runtime Codex v1 :

| Surface                                                     | Support                                                                                                        | Pourquoi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boucle de modèle OpenAI via Codex                           | Pris en charge                                                                                                 | L'application serveur Codex possède le tour OpenAI, la reprise du fil natif et la continuation de l'outil natif.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Routage et livraison des OpenClaw channel                   | Pris en charge                                                                                                 | Telegram, Discord, Slack, WhatsApp, iMessage et autres channels restent en dehors du runtime du model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Outils dynamiques OpenClaw                                  | Pris en charge                                                                                                 | Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Plugins de prompt et de contexte                            | Pris en charge                                                                                                 | OpenClaw projette le contexte/invite spécifique à OpenClaw dans le tour Codex tout en laissant les invites de base, de model et de doc de projet configurées appartenant à Codex dans la voie native Codex. OpenClaw désactive la personnalité intégrée de Codex pour les fils natifs afin que les fichiers de personnalité de l'espace de travail de l'agent restent autoritaires. Les instructions de développeur Codex natives n'acceptent que les conseils de commande explicitement délimités à `codex_app_server` ; les indices de commande globaux hérités restent pour les surfaces d'invite non-Codex. |
| Cycle de vie du moteur de contexte                          | Pris en charge                                                                                                 | L'assemblage, l'ingestion et la maintenance après tour s'exécutent autour des tours Codex. Les moteurs de contexte ne remplacent pas la compaction native Codex.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Hooks d'outil dynamiques                                    | Pris en charge                                                                                                 | `before_tool_call`, `after_tool_call` et le middleware de résultat d'outil s'exécutent autour des outils dynamiques détenus par OpenClaw.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Hooks de cycle de vie                                       | Pris en charge en tant qu'observations d'adaptateur                                                            | `llm_input`, `llm_output`, `agent_end`, `before_compaction` et `after_compaction` se déclenchent avec des charges utiles en mode Codex honnêtes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Porte de révision de la réponse finale                      | Pris en charge via le relais de hook natif                                                                     | Le `Stop` de Codex est relayé à `before_agent_finalize` ; `revise` demande à Codex une passe de model supplémentaire avant la finalisation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Shell natif, correctif (patch) et MCP bloquent ou observent | Pris en charge via le relais de hook natif                                                                     | Le `PreToolUse` et le `PostToolUse` de Codex sont relayés pour les surfaces d'outil natives engagées, y compris les charges utiles MCP sur le serveur d'application Codex `0.125.0` ou plus récent. Le blocage est pris en charge ; la réécriture d'arguments ne l'est pas.                                                                                                                                                                                                                                                                                                                                     |
| Stratégie d'autorisation native                             | Pris en charge via les approbations du serveur d'application Codex et le relais de hook natif de compatibilité | Les demandes d'approbation du serveur d'application Codex sont acheminées via OpenClaw après l'examen par Codex. Le relais du hook natif `PermissionRequest` est optionnel pour les modes d'approbation natifs car Codex l'émet avant l'examen par le gardien.                                                                                                                                                                                                                                                                                                                                                  |
| Capture de trajectoire du serveur d'application             | Pris en charge                                                                                                 | OpenClaw enregistre la demande qu'il a envoyée au serveur d'application et les notifications du serveur d'application qu'il reçoit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

Non pris en charge dans le runtime Codex v1 :

| Surface                                                             | Limite V1                                                                                                                                                                                 | Chemin futur                                                                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mutation des arguments d'outil natif                                | Les hooks pré-outil natifs Codex peuvent bloquer, mais OpenClaw ne réécrit pas les arguments d'outil natifs Codex.                                                                        | Nécessite la prise en charge des hooks/schémas Codex pour le remplacement de l'entrée de l'outil.                      |
| Historique des transcripts natifs Codex modifiable                  | Codex possède l'historique canonique des fils natifs. OpenClaw possède un miroir et peut projeter le contexte futur, mais ne doit pas modifier les éléments internes non pris en charge.  | Ajoutez des API explicites de serveur d'application Codex si une chirurgie de fil natif est nécessaire.                |
| `tool_result_persist` pour les enregistrements d'outil natifs Codex | Ce hook transforme les écritures de transcripts appartenant à OpenClaw, et non les enregistrements d'outils natifs Codex.                                                                 | Pourrait refléter les enregistrements transformés, mais la réécriture canonique nécessite la prise en charge de Codex. |
| Métadonnées de compactage natives riches                            | OpenClaw peut demander un compactage natif, mais ne reçoit pas de liste stable des éléments conservés/supprimés, de delta de jetons, de résumé d'achèvement ou de charge utile de résumé. | Nécessite des événements de compactage Codex plus riches.                                                              |
| Intervention de compactage                                          | OpenClaw n'autorise pas les plugins ou les moteurs de contexte à opposer un veto, réécrire ou remplacer le compactage natif Codex.                                                        | Ajoutez des hooks de pré/post compactage Codex si les plugins doivent opposer un veto ou réécrire le compactage natif. |
| Capture des requêtes d'API de modèle octet par octet                | OpenClaw peut capturer les requêtes et notifications du serveur d'application, mais le cœur de Codex construit la requête d'API OpenAI API en interne.                                    | Nécessite un événement de traçage de demande de modèle Codex ou une API de débogage API.                               |

## Autorisations natives et sollicitations MCP

Pour `PermissionRequest`, OpenClaw ne renvoie des décisions d'autorisation ou de refus explicites que lorsque la politique décide. Un résultat sans décision n'est pas une autorisation. Codex le traite comme l'absence de décision de hook et retourne à son propre chemin d'approbation par le gardien ou l'utilisateur.

Les modes d'approbation du serveur d'application Codex omettent ce hook natif par défaut. Ce comportement s'applique lorsque `permission_request` est explicitement inclus dans `nativeHookRelay.events` ou qu'un runtime de compatibilité l'installe.

Lorsqu'un opérateur choisit `allow-always`OpenClaw pour une demande d'autorisation native Codex, OpenClaw mémorise cette empreinte exacte de fournisseur/session/tool entrée/cwd pour une fenêtre de session bornée. La décision mémorisée est intentionnellement une correspondance exacte uniquement : une commande modifiée, des arguments, une charge utile de l'outil ou un cwd crée une nouvelle approbation.

Les sollicitations d'approbation d'outil MCP Codex sont acheminées via le flux d'approbation de plugin d'OpenClaw lorsque Codex marque OpenClaw`_meta.codex_approval_kind` comme `"mcp_tool_call"`. Les invites Codex `request_user_input` sont renvoyées au chat d'origine, et le message de suivi mis en file d'attente suivant répond à cette demande de serveur native au lieu d'être dirigé comme contexte supplémentaire. Les autres demandes de sollicitation MCP échouent en mode fermé.

Pour le flux d'approbation de plugin général qui transporte ces invites, voir [Plugin permission requests](/fr/plugins/plugin-permission-requests).

## Direction de file d'attente

La direction de la file d'attente d'exécution active correspond au `turn/steer` du serveur d'application Codex. Avec le `messages.queue.mode: "steer"`OpenClaw par défaut, OpenClaw regroupe les messages de chat en mode de direction pour la fenêtre de silence configurée et les envoie comme une seule requête `turn/steer` dans l'ordre d'arrivée.

Les tours de révision Codex et de compactage manuel peuvent rejeter la direction au même tour. Dans ce cas, OpenClaw attend que l'exécution active se termine avant de démarrer l'invite. Utilisez OpenClaw`/queue followup` ou `/queue collect` lorsque les messages doivent être mis en file d'attente par défaut au lieu d'être dirigés. Voir [Steering queue](/fr/concepts/queue-steering).

## Téléchargement de commentaires Codex

Lorsque `/diagnostics [note]`OpenClaw est approuvé pour une session utilisant le harnais natif Codex, OpenClaw appelle également le `feedback/upload` du serveur d'application Codex pour les threads Codex pertinents. Le téléchargement demande au serveur d'application d'inclure les journaux pour chaque thread répertorié et les sous-threads Codex générés, le cas échéant.

Le téléchargement passe par le chemin de retour normal de Codex vers les serveurs OpenAI. Si le retour d'information Codex est désactivé sur ce serveur d'application, la commande renvoie l'erreur du serveur d'application. La réponse de diagnostic terminée répertorie les canaux, les identifiants de session OpenClaw, les identifiants de fil Codex et les commandes `codex resume <thread-id>` locales pour les fils qui ont été envoyés.

Si vous refusez ou ignorez l'approbation, OpenClaw n'imprime pas ces identifiants Codex et n'envoie pas le retour d'information Codex. Le téléchargement ne remplace pas l'exportation de diagnostic local Gateway. Voir [Diagnostics export](/fr/gateway/diagnostics) pour le comportement concernant l'approbation, la confidentialité, le bundle local et les discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous voulez spécifiquement le téléchargement du retour d'information Codex pour le fil actuellement attaché sans le bundle de diagnostic complet Gateway.

## Compactage et miroir de transcription

Lorsque le modèle sélectionné utilise le harnais Codex, la compactage natif des fils appartient au serveur d'application Codex. OpenClaw n'exécute pas la compactage préalable pour les tours Codex, ne remplace pas la compactage Codex par la compactage du moteur de contexte, et ne revient pas à la résumé OpenClaw ou publique OpenAI lorsque la compactage natif Codex ne peut pas être démarré. OpenClaw conserve un miroir de transcription pour l'historique du canal, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais.

Les demandes explicites de compactage, telles que `/compact` ou une opération de compactage manuelle demandée par un plugin, démarrent la compactage natif Codex avec `thread/compact/start`. OpenClaw retourne après avoir démarré cette opération native. Il n'attend pas la fin, n'impose pas de délai d'attente séparé OpenClaw, ne redémarre pas le serveur d'application Codex partagé, ni n'enregistre l'opération comme une compactage terminée OpenClaw.

Lorsqu'un moteur de contexte demande une projection d'amorçage de fil Codex, OpenClaw projette les noms et identifiants des appels d'outil, les formes d'entrée et le contenu des résultats d'outil expurgés dans le nouveau fil Codex. Il ne copie pas les valeurs brutes des arguments des appels d'outil dans cette projection.

Le miroir inclut l'invite de l'utilisateur, le texte final de l'assistant et les enregistrements de raisonnement ou de plan légers Codex lorsque le serveur d'application les émet. Aujourd'hui, OpenClaw n'enregistre que les signaux de début de compactage natif explicites lorsqu'il demande un compactage. Il n'expose pas de résumé de compactage lisible par l'homme ni une liste vérifiable des entrées que Codex a conservées après le compactage.

Parce que Codex possède le fil natif canonique, `tool_result_persist` ne réécrit actuellement pas les enregistrements de résultats d'outil natifs Codex. Il ne s'applique que lorsque OpenClaw écrit un résultat d'outil de transcription de session OpenClaw.

## Médias et diffusion

OpenClaw continue de gérer la diffusion des médias et la sélection du fournisseur de médias. Image, vidéo, musique, PDF, TTS et la compréhension des médias utilisent les paramètres de fournisseur/model correspondants tels que OpenClaw`agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` et `messages.tts`.

Le texte, les images, les vidéos, la musique, le TTS, les approbations et la sortie de l'outil de messagerie continuent de passer par le chemin de diffusion normal d'OpenClaw. La génération de médias ne nécessite pas le runtime hérité. Lorsque Codex émet un élément de génération d'image natif avec un OpenClaw`savedPath`OpenClaw, OpenClaw transmet ce fichier exact via le chemin normal de réponse média même si le tour Codex n'a pas de texte d'assistant.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness reference](/fr/plugins/codex-harness-reference)
- [Native Codex plugins](/fr/plugins/codex-native-plugins)
- [Plugin hooks](/fr/plugins/hooks)
- [Agent harness plugins](/fr/plugins/sdk-agent-harness)
- [Diagnostics export](/fr/gateway/diagnostics)
- [Trajectory export](/fr/tools/trajectory)
