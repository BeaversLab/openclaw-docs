---
summary: "Limites d'exécution, hooks, outils, autorisations et diagnostics pour le harnais Codex"
title: "Runtime du harnais Codex"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

Cette page documente le contrat d'exécution pour les tours de harnais Codex. Pour la configuration et le routage, commencez par [Codex harness](/fr/plugins/codex-harness). Pour les champs de configuration, voir [Codex harness reference](/fr/plugins/codex-harness-reference).

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

Les notifications d'élément du serveur d'application Codex fournissent également des observations asynchrones `after_tool_call` pour les achèvements d'outils natifs qui ne sont pas déjà couverts par le relai `PostToolUse` natif. Ces observations sont uniquement destinées à la télémétrie et à la compatibilité des plugins ; elles ne peuvent pas bloquer, retarder ou modifier l'appel d'outil natif.

Les projections de cycle de vie de compactage et de LLM proviennent des notifications du serveur d'application Codex et de l'état de l'adaptateur LLMOpenClaw, et non des commandes de hook Codex natif. Les événements OpenClaw `before_compaction`, `after_compaction`, `llm_input` et `llm_output` sont des observations au niveau de l'adaptateur, et non des captures octet par octet des charges utiles de requête ou de compactage internes de Codex.

Les notifications de serveur d'application Codex natif `hook/started` et `hook/completed` sont projetées sous forme d'événements d'agent `codex_app_server.hook` pour la trajectoire et le débogage. Elles n'invoquent pas les hooks de plugin OpenClaw.

## Contrat de support V1

Pris en charge dans Codex runtime v1 :

| Surface                                                    | Support                                                                                                        | Pourquoi                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Boucle de modèle OpenAI via Codex                          | Pris en charge                                                                                                 | Le serveur d'application Codex possède le tour OpenAI, la reprise de fil natif et la continuation d'outil natif.                                                                                                                                                   |
| Routage et livraison de canal OpenClaw                     | Pris en charge                                                                                                 | Telegram, Discord, Slack, WhatsApp, iMessage et d'autres canaux restent en dehors de l'exécution du modèle.                                                                                                                                                        |
| Outils dynamiques OpenClaw                                 | Pris en charge                                                                                                 | Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.                                                                                                                                                                    |
| Plugins de prompt et de contexte                           | Pris en charge                                                                                                 | OpenClaw construit des superpositions de prompt et projette le contexte dans le tour Codex avant de démarrer ou de reprendre le fil.                                                                                                                               |
| Cycle de vie du moteur de contexte                         | Pris en charge                                                                                                 | L'assemblage, l'ingestion, la maintenance après tour et la coordination de la compactage du moteur de contexte s'exécutent pour les tours Codex.                                                                                                                   |
| Hooks d'outil dynamiques                                   | Pris en charge                                                                                                 | `before_tool_call`, `after_tool_call` et le middleware de résultats d'outil s'exécutent autour des outils dynamiques appartenant à OpenClaw.                                                                                                                       |
| Hooks de cycle de vie                                      | Pris en charge en tant qu'observations de l'adaptateur                                                         | `llm_input`, `llm_output`, `agent_end`, `before_compaction` et `after_compaction` se déclenchent avec des charges utiles en mode Codex honnêtes.                                                                                                                   |
| Porte de révision de la réponse finale                     | Pris en charge via le relais de hook natif                                                                     | Codex `Stop` est relayé vers `before_agent_finalize` ; `revise` demande à Codex une passe de modèle supplémentaire avant la finalisation.                                                                                                                          |
| Blocage ou observation natifs du shell, du patch et du MCP | Pris en charge via le relais de hook natif                                                                     | Codex `PreToolUse` et `PostToolUse` sont relayés pour les surfaces d'outil natives validées, y compris les charges utiles MCP sur le serveur d'application Codex `0.125.0` ou plus récent. Le blocage est pris en charge ; la réécriture d'arguments ne l'est pas. |
| Stratégie d'autorisation native                            | Pris en charge via les approbations du serveur d'application Codex et le relais de hook natif de compatibilité | Les demandes d'approbation du serveur d'application Codex sont acheminées via OpenClaw après révision par Codex. Le relais de hook natif `PermissionRequest` est en option pour les modes d'approbation natifs car Codex l'émet avant la révision par le gardien.  |
| Capture de trajectoire du serveur d'application            | Pris en charge                                                                                                 | OpenClaw enregistre la demande qu'il a envoyée au serveur d'application et les notifications du serveur d'application qu'il reçoit.                                                                                                                                |

Non pris en charge dans le runtime Codex v1 :

| Surface                                                              | Limite V1                                                                                                                                                                             | Chemin futur                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mutation des arguments d'outil natif                                 | Les hooks natifs de pré-outil Codex peuvent bloquer, mais OpenClaw ne réécrit pas les arguments d'outil natifs Codex.                                                                 | Nécessite la prise en charge des hooks/schémas Codex pour l'entrée de l'outil de remplacement.                         |
| Historique des transcriptions natifs Codex modifiable                | Codex possède l'historique canonique du fil natif. OpenClaw possède un miroir et peut projeter le contexte futur, mais ne doit pas modifier les éléments internes non pris en charge. | Ajoutez des API explicites de serveur d'application Codex si une chirurgie du fil natif est nécessaire.                |
| `tool_result_persist` pour les enregistrements d'outils natifs Codex | Ce hook transforme les écritures de transcription appartenant à OpenClaw, et non les enregistrements d'outils natifs Codex.                                                           | Pourrait refléter les enregistrements transformés, mais la réécriture canonique nécessite la prise en charge de Codex. |
| Métadonnées de compactage natif riches                               | OpenClaw observe le début et la fin du compactage, mais ne reçoit pas de liste stable des éléments conservés/supprimés, de delta de jetons ou de charge utile de résumé.              | Nécessite des événements de compactage Codex plus riches.                                                              |
| Intervention lors du compactage                                      | Les hooks de compactage actuels de OpenClaw sont de niveau notification en mode Codex.                                                                                                | Ajouter des hooks de compactage Codex pre/post si les plugins doivent opposer un veto ou réécrire le compactage natif. |
| Capture de requête model API octet par octet                         | OpenClaw peut capturer les requêtes et notifications du serveur d'application, mais le cœur de Codex construit en interne la requête finale de l'OpenAI API.                          | Nécessite un événement de traçage de requête de modèle Codex ou une API de débogage.                                   |

## Autorisations natives et sollicitations MCP

Pour `PermissionRequest`, OpenClaw ne renvoie que des décisions explicites d'autorisation ou de refus
lorsque la stratégie décide. Un résultat sans décision n'est pas une autorisation. Codex le considère comme une absence de
décision de hook et revient à son propre chemin de gardien ou d'approbation utilisateur.

Les modes d'approbation du serveur d'application Codex omettent ce hook natif par défaut. Ce comportement
s'applique lorsque `permission_request` est explicitement inclus dans
`nativeHookRelay.events` ou qu'un runtime de compatibilité l'installe.

Lorsqu'un opérateur choisit `allow-always` pour une demande d'autorisation native Codex,
OpenClaw mémorise cette empreinte exacte de fournisseur/session/tool entrée/cwd pour une
fenêtre de session bornée. La décision mémorisée est intentionnellement uniquement une correspondance exacte :
une commande modifiée, des arguments, une charge utile d'outil ou un cwd crée une nouvelle
approbation.

Les sollicitations d'approbation d'outil MCP Codex sont acheminées via le flux d'approbation de plugin d'OpenClaw lorsque Codex marque OpenClaw`_meta.codex_approval_kind` comme `"mcp_tool_call"`. Les invites `request_user_input` de Codex sont renvoyées au chat d'origine, et le prochain message de suivi mis en file d'attente répond à cette demande de serveur natif au lieu d'être orienté comme contexte supplémentaire. Les autres demandes de sollicitation MCP échouent de manière fermée.

## Orientation de la file d'attente

L'orientation de la file d'attente lors d'une exécution active correspond au `turn/steer` du serveur d'application Codex. Avec le `messages.queue.mode: "steer"`OpenClaw par défaut, OpenClaw regroupe les messages de chat mis en file d'attente pour la fenêtre de calme configurée et les envoie comme une seule requête `turn/steer` dans l'ordre d'arrivée. Le mode `queue` hérité envoie des requêtes `turn/steer` séparées.

Les tours de révision Codex et de compactage manuel peuvent rejeter l'orientation au sein du même tour. Dans ce cas, OpenClaw utilise la file d'attente de suivi lorsque le mode sélectionné autorise le repli. Voir [File d'attente d'orientation](OpenClaw/en/concepts/queue-steering).

## Téléchargement des commentaires Codex

Lorsque `/diagnostics [note]`OpenClaw est approuvé pour une session utilisant le harnais natif Codex, OpenClaw appelle également le `feedback/upload` du serveur d'application Codex pour les fils Codex pertinents. Le téléchargement demande au serveur d'application d'inclure les journaux pour chaque fil répertorié et les sous-fils Codex générés, lorsqu'ils sont disponibles.

Le téléchargement passe par le chemin normal de rétroaction de Codex vers les serveurs OpenAI. Si la rétroaction Codex est désactivée sur ce serveur d'application, la commande renvoie l'erreur du serveur d'application. La réponse de diagnostics terminée répertorie les canaux, les identifiants de session OpenClaw, les identifiants de fil Codex et les commandes locales OpenAIOpenClaw`codex resume <thread-id>` pour les fils qui ont été envoyés.

Si vous refusez ou ignorez l'approbation, OpenClaw n'affiche pas ces identifiants Codex et n'envoie pas les commentaires Codex. Le téléchargement ne remplace pas l'export de diagnostics local de Gateway. Voir [Export de diagnostics](OpenClawGateway/en/gateway/diagnostics) pour le comportement concernant l'approbation, la confidentialité, le bundle local et les discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous souhaitez spécifiquement l'envoi des commentaires Codex pour le thread actuellement attaché sans le bundle complet de diagnostics du Gateway.

## Compactage et miroir de transcription

Lorsque le modèle sélectionné utilise le harnais Codex, le compactage natif des threads est délégué au serveur d'application Codex. OpenClaw conserve un miroir de transcription pour l'historique du channel, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais.

Le miroir inclut la invite de l'utilisateur, le texte final de l'assistant, et les enregistrements légers de raisonnement ou de plan Codex lorsque le serveur d'application les émet. Actuellement, OpenClaw n'enregistre que les signaux de début et de fin de compactage natif. Il n'expose pas encore un résumé de compactage lisible par l'homme ou une liste auditable des entrées que Codex a conservées après compactage.

Parce que Codex possède le thread natif canonique, `tool_result_persist` ne réécrit actuellement pas les enregistrements de résultats d'outil natifs de Codex. Cela ne s'applique que lorsque OpenClawOpenClaw écrit un résultat d'outil de transcription de session dont il est propriétaire (%PH:GLOSSARY:146:b38e0912%%-owned).

## Médias et diffusion

OpenClaw continue de gérer la diffusion des médias et la sélection du fournisseur de médias. Les paramètres de fournisseur/modèle correspondants sont utilisés pour l'image, la vidéo, la musique, le PDF, le TTS et la compréhension des médias, tels que `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel`, et `messages.tts`.

Le texte, les images, la vidéo, la musique, le TTS, les approbations et la sortie des outils de messagerie continuent de passer par le chemin de diffusion normal de OpenClaw. La génération de médias ne nécessite pas PI. Lorsque Codex émet un élément de génération d'image natif avec un `savedPath`, OpenClaw transfère ce fichier exact via le chemin normal de réponse média même si le tour Codex n'a pas de texte d'assistant.

## Connexes

- [Harnais Codex](/fr/plugins/codex-harness)
- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Plugins natifs Codex](/fr/plugins/codex-native-plugins)
- [Crochets de plugin (Plugin hooks)](/fr/plugins/hooks)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Export de trajectoire](/fr/tools/trajectory)
