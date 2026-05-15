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

OpenClaw possède toujours le routage de channel, les fichiers de session, la livraison des messages visibles, les outils dynamiques OpenClaw, les approbations, la livraison des médias et un miroir de transcription. Codex possède le thread natif canonique, la boucle de modèle native, la continuation d'outil native et la compactage native.

## Liaisons de thread et changements de modèle

Lorsqu'une session OpenClaw est attachée à un thread Codex existant, le tour suivant envoie à nouveau le modèle OpenAI actuellement sélectionné, la politique d'approbation, le sandbox et le niveau de service à l'app-server. Le passage de `openai/gpt-5.5` à `openai/gpt-5.2` conserve la liaison du thread mais demande à Codex de continuer avec le modèle nouvellement sélectionné.

## Réponses visibles et battements de cœur (heartbeats)

Lorsqu'un tour de chat source traverse le harnais Codex, les réponses visibles sont par défaut l'outil `message` de OpenClaw si le déploiement n'a pas explicitement configuré `messages.visibleReplies`. L'agent peut toujours terminer son tour Codex en privé ; il ne publie sur le channel que lorsqu'il appelle `message(action="send")`. Définissez `messages.visibleReplies: "automatic"` pour conserver les réponses finales du chat direct sur l'ancien chemin de livraison automatique.

Les tours de battement de cœur (heartbeat) Codex obtiennent également `heartbeat_respond` dans le catalogue d'outils recherchable OpenClaw par défaut, afin que l'agent puisse enregistrer si le réveil doit rester silencieux ou notifier sans encoder ce flux de contrôle dans le texte final.

Les directives d'initiative spécifiques aux battements de cœur sont envoyées sous forme d'instruction de développeur en mode collaboration Codex lors du tour de battement de cœur lui-même. Les tours de conversation ordinaires restaurent le mode Codex par défaut au lieu de transporter la philosophie des battements de cœur dans leur invite d'exécution normale.

## Limites des hooks

Le harnais Codex comprend trois couches de hooks :

| Couche                                                | Propriétaire             | Objectif                                                                                   |
| ----------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| Hooks de plugin OpenClaw                              | OpenClaw                 | Compatibilité produit/plugin à travers PI et les harnais Codex.                            |
| Middleware d'extension de serveur d'application Codex | Plugins groupés OpenClaw | Comportement de l'adaptateur par tour autour des outils dynamiques OpenClaw.               |
| Hooks natifs Codex                                    | Codex                    | Cycle de vie de bas niveau Codex et stratégie d'outil natif depuis la configuration Codex. |

OpenClaw n'utilise pas les fichiers `hooks.json` Codex de projet ou global pour acheminer le comportement du plugin OpenClaw. Pour le pont d'outils natifs et de permissions pris en charge, OpenClaw injecte une configuration Codex par thread pour `PreToolUse`, `PostToolUse`, `PermissionRequest` et `Stop`.

Lorsque les approbations du serveur d'application Codex sont activées, c'est-à-dire que `approvalPolicy` n'est pas `"never"`, la configuration de hook natif injectée par défaut omet `PermissionRequest` afin que le réviseur du serveur d'application Codex et le pont d'approbation OpenClaw gèrent les escalades réelles après révision. Les opérateurs peuvent explicitement ajouter `permission_request` à `nativeHookRelay.events` lorsqu'ils ont besoin du relais de compatibilité.

D'autres hooks Codex tels que `SessionStart` et `UserPromptSubmit` restent des contrôles au niveau Codex. Ils ne sont pas exposés en tant que hooks de plugin OpenClaw dans le contrat v1.

Pour les outils dynamiques OpenClaw, OpenClaw exécute l'outil après que Codex a demandé l'appel, donc OpenClaw déclenche le comportement du plugin et du middleware qu'il possède dans l'adaptateur de harnais. Pour les outils natifs Codex, Codex possède l'enregistrement canonique de l'outil. OpenClaw peut mettre en miroir des événements sélectionnés, mais il ne peut pas réécrire le fil de discussion Codex natif à moins que Codex n'expose cette opération via app-server ou des rappels de hook natifs.

Les projections de cycle de vie de compactage et de LLM proviennent des notifications de l'app-server Codex et de l'état de l'adaptateur OpenClaw, et non des commandes de hook Codex natives. Les événements `before_compaction`, `after_compaction`, `llm_input` et `llm_output` de OpenClaw sont des observations au niveau de l'adaptateur, et non des captures octet par octet des requêtes internes ou des charges utiles de compactage de Codex.

Les notifications de l'app-server `hook/started` et `hook/completed` natives de Codex sont projetées en tant qu'événements d'agent `codex_app_server.hook` pour la trajectoire et le débogage. Elles n'invoquent pas les hooks de plugin OpenClaw.

## Contrat de support V1

Pris en charge dans le runtime Codex v1 :

| Surface                                          | Support                                                                                                        | Pourquoi                                                                                                                                                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boucle de modèle OpenAI via Codex                | Pris en charge                                                                                                 | L'app-server Codex possède le tour OpenAI, la reprise de fil native et la continuation d'outil native.                                                                                                                                                           |
| Routage et livraison de canal OpenClaw           | Pris en charge                                                                                                 | Les canaux Telegram, Discord, Slack, WhatsApp, iMessage et autres restent en dehors du runtime du modèle.                                                                                                                                                        |
| Outils dynamiques OpenClaw                       | Pris en charge                                                                                                 | Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.                                                                                                                                                                  |
| Plugins de prompt et de contexte                 | Pris en charge                                                                                                 | OpenClaw construit des superpositions de prompt et projette le contexte dans le tour Codex avant de démarrer ou de reprendre le fil.                                                                                                                             |
| Cycle de vie du moteur de contexte               | Pris en charge                                                                                                 | L'assemblage, l'ingestion, la maintenance après tour et la coordination de la compaction du moteur de contexte s'exécutent pour les tours Codex.                                                                                                                 |
| Hooks d'outil dynamiques                         | Pris en charge                                                                                                 | `before_tool_call`, `after_tool_call` et le middleware de résultat d'outil s'exécutent autour des outils dynamiques détenus par OpenClaw.                                                                                                                        |
| Hooks de cycle de vie                            | Pris en charge en tant qu'observations d'adaptateur                                                            | `llm_input`, `llm_output`, `agent_end`, `before_compaction` et `after_compaction` se déclenchent avec des payloads en mode Codex honnêtes.                                                                                                                       |
| Porte de révision de la réponse finale           | Pris en charge via le relais de hook natif                                                                     | Le `Stop` Codex est relayé vers `before_agent_finalize` ; `revise` demande à Codex une passe de modèle supplémentaire avant la finalisation.                                                                                                                     |
| Shell natif, patch et blocage ou observation MCP | Pris en charge via le relais de hook natif                                                                     | Les `PreToolUse` et `PostToolUse` Codex sont relayés pour les surfaces d'outil natives validées, y compris les payloads MCP sur le serveur d'application Codex `0.125.0` ou plus récent. Le blocage est pris en charge ; la réécriture d'arguments ne l'est pas. |
| Stratégie d'autorisation native                  | Pris en charge via les approbations du serveur d'application Codex et le relais de hook natif de compatibilité | Les demandes d'approbation du serveur d'application Codex transitent par OpenClaw après examen par Codex. Le relais de hook natif `PermissionRequest` est en option pour les modes d'approbation natifs car Codex l'émet avant l'examen du gardien.              |
| Capture de trajectoire du serveur d'application  | Pris en charge                                                                                                 | OpenClaw enregistre la demande qu'il a envoyée au serveur d'application et les notifications du serveur d'application qu'il reçoit.                                                                                                                              |

Non pris en charge dans le runtime Codex v1 :

| Surface                                                              | Limite V1                                                                                                                                                                    | Chemin futur                                                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mutation d'argument d'outil natif                                    | Les hooks pré-outils natifs Codex peuvent bloquer, mais OpenClaw ne réécrit pas les arguments d'outil natifs Codex.                                                          | Nécessite la prise en charge des hooks/schémas Codex pour l'entrée d'outil de remplacement.                            |
| Historique des transcripts natifs Codex modifiable                   | Codex possède l'historique canonique du fil natif. OpenClaw possède un miroir et peut projeter le futur contexte, mais ne doit pas modifier les internes non pris en charge. | Ajoutez des API explicites du serveur d'application Codex si une chirurgie de fil natif est nécessaire.                |
| `tool_result_persist` pour les enregistrements d'outils natifs Codex | Ce hook transforme les écritures de transcription appartenant à OpenClaw, et non les enregistrements d'outils natifs Codex.                                                  | Pourrait mettre en miroir les enregistrements transformés, mais la réécriture canonique nécessite le support de Codex. |
| Métadonnées de compactage natives riches                             | OpenClaw observe le début et la fin du compactage, mais ne reçoit pas de liste stable des éléments conservés/supprimés, de delta de jetons ou de payload de résumé.          | Nécessite des événements de compactage Codex plus riches.                                                              |
| Intervention de compactage                                           | Les hooks de compactage actuels de OpenClaw sont de niveau notification en mode Codex.                                                                                       | Ajoutez des hooks de pré/post compactage Codex si les plugins doivent opposer un véto ou réécrire le compactage natif. |
| Capture des requêtes byte-for-byte de l'API                          | OpenClaw peut capturer les requêtes et les notifications du serveur d'application, mais le cœur de Codex construit la requête finale de l'OpenAI API en interne.             | Nécessite un événement de traçage de requête de modèle Codex ou une API de débogage.                                   |

## Autorisations natives et sollicitations MCP

Pour `PermissionRequest`, OpenClaw ne renvoie que des décisions explicites d'autorisation ou de refus lorsque la politique décide. Un résultat sans décision n'est pas une autorisation. Codex le traite comme l'absence de décision du hook et passe à son propre processus de gardien ou d'approbation utilisateur.

Les modes d'approbation du serveur d'application Codex omettent ce hook natif par défaut. Ce comportement s'applique lorsque `permission_request` est explicitement inclus dans `nativeHookRelay.events` ou qu'un runtime de compatibilité l'installe.

Lorsqu'un opérateur choisit `allow-always` pour une demande d'autorisation native Codex, OpenClaw mémorise cette empreinte exacte de fournisseur/session/tool input/cwd pour une fenêtre de session bornée. La décision mémorisée est intentionnellement une correspondance exacte uniquement : une commande modifiée, des arguments, un payload d'outil ou un cwd crée une nouvelle approbation.

Les sollicitations d'approbation de tool MCP Codex sont acheminées via le flux d'approbation de plugin d'OpenClaw lorsque Codex marque OpenClaw`_meta.codex_approval_kind` comme `"mcp_tool_call"`. Les invites `request_user_input` de Codex sont renvoyées au chat d'origine, et le prochain message de suivi mis en file d'attente répond à cette demande de serveur native au lieu d'être orienté comme contexte supplémentaire. D'autres demandes de sollicitation MCP échouent en mode fermé.

## Orientation de la file d'attente

L'orientation de la file d'attente lors de l'exécution active correspond au `turn/steer` du serveur d'application Codex. Avec le `messages.queue.mode: "steer"`OpenClaw par défaut, OpenClaw regroupe les messages de chat mis en file d'attente pour la fenêtre de silence configurée et les envoie sous forme d'une seule requête `turn/steer` dans l'ordre d'arrivée. Le mode `queue` hérité envoie des requêtes `turn/steer` distinctes.

Les tours de révision Codex et de compactage manuel peuvent rejeter l'orientation au sein du même tour. Dans ce cas, OpenClaw utilise la file d'attente de suivi lorsque le mode sélectionné autorise le repli. Voir [File d'attente d'orientation](OpenClaw/en/concepts/queue-steering).

## Téléchargement des commentaires Codex

Lorsque `/diagnostics [note]`OpenClaw est approuvé pour une session utilisant le harnais Codex natif, OpenClaw appelle également le `feedback/upload` du serveur d'application Codex pour les fils Codex pertinents. Le téléchargement demande au serveur d'application d'inclure les journaux pour chaque fil répertorié et les sous-fils Codex générés, lorsqu'ils sont disponibles.

Le téléchargement passe par le chemin normal des commentaires Codex vers les serveurs OpenAI. Si les commentaires Codex sont désactivés sur ce serveur d'application, la commande renvoie l'erreur du serveur d'application. La réponse de diagnostic terminée répertorie les canaux, les identifiants de session OpenClaw, les identifiants de fil Codex et les commandes OpenAIOpenClaw`codex resume <thread-id>` locales pour les fils qui ont été envoyés.

Si vous refusez ou ignorez l'approbation, OpenClaw n'affiche pas ces identifiants Codex et n'envoie pas les commentaires Codex. Le téléchargement ne remplace pas l'exportation de diagnostic local Gateway. Voir [Exportation de diagnostic](OpenClawGateway/en/gateway/diagnostics) pour l'approbation, la confidentialité, le bundle local et le comportement de chat de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous souhaitez spécifiquement le téléchargement des commentaires Codex pour le fil de discussion actuellement attaché sans le bundle complet de diagnostic du Gateway.

## Compactage et miroir de transcription

Lorsque le modèle sélectionné utilise le harnais Codex, le compactage natif du fil de discussion est délégué au serveur d'application Codex. OpenClaw conserve un miroir de transcription pour l'historique du canal, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais.

Le miroir inclut l'invite de l'utilisateur, le texte final de l'assistant, ainsi que les enregistrements de raisonnement ou de planification légers de Codex lorsque le serveur d'application les émet. Actuellement, OpenClaw n'enregistre que les signaux de début et de fin de compactage natif. Il n'expose pas encore de résumé de compactage lisible par l'homme ni une liste vérifiable des entrées que Codex a conservées après compactage.

Parce que Codex possède le fil de discussion natif canonique, `tool_result_persist` ne réécrit pas actuellement les enregistrements de résultats d'outil natifs de Codex. Il s'applique uniquement lorsque OpenClawOpenClaw écrit un résultat d'outil de transcription de session dont il est propriétaire.

## Médias et diffusion

OpenClaw continue de gérer la diffusion des médias et la sélection du fournisseur de médias. L'image, la vidéo, la musique, le PDF, le TTS et la compréhension des médias utilisent des paramètres de fournisseur/modèle correspondants tels que `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` et `messages.tts`.

Le texte, les images, la vidéo, la musique, le TTS, les approbations et la sortie de l'outil de messagerie passent par le chemin de diffusion normal de OpenClaw. La génération de médias ne nécessite pas PI.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness reference](/fr/plugins/codex-harness-reference)
- [Native Codex plugins](/fr/plugins/codex-native-plugins)
- [Plugin hooks](/fr/plugins/hooks)
- [Agent harness plugins](/fr/plugins/sdk-agent-harness)
- [Diagnostics export](/fr/gateway/diagnostics)
- [Trajectory export](/fr/tools/trajectory)
