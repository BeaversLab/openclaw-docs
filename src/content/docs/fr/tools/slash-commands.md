---
summary: "Commandes slash: texte vs natif, configuration et commandes prises en charge"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Commandes slash"
---

# Commandes Slash

Les commandes sont gérées par le Gateway. La plupart des commandes doivent être envoyées sous la forme d'un message **autonome** commençant par `/`.
La commande de chat bash réservée à l'hôte utilise `! <cmd>` (avec `/bash <cmd>` comme alias).

Il existe deux systèmes connexes :

- **Commandes** : messages `/...` autonomes.
- **Directives** : `/think`, `/fast`, `/verbose`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Les directives sont supprimées du message avant que le modèle ne le voie.
  - Dans les messages de chat normaux (pas uniquement des directives), elles sont traitées comme des « indices en ligne » et ne **persistent pas** les paramètres de session.
  - Dans les messages contenant uniquement des directives (le message ne contient que des directives), elles persistent dans la session et répondent par un accusé de réception.
  - Les directives ne sont appliquées que pour les **expéditeurs autorisés**. Si `commands.allowFrom` est défini, c'est la seule
    liste d'autorisation utilisée ; sinon l'autorisation provient des listes d'autorisation/appariement des canaux ainsi que de `commands.useAccessGroups`.
    Les expéditeurs non autorisés voient les directives traitées comme du texte brut.

Il existe également quelques **raccourcis en ligne** (uniquement pour les expéditeurs autorisés/listés) : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
Ils s'exécutent immédiatement, sont supprimés avant que le modèle ne voie le message, et le texte restant continue via le flux normal.

## Config

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    mcp: false,
    plugins: false,
    debug: false,
    restart: false,
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text` (par défaut `true`) active l'analyse de `/...` dans les messages de chat.
  - Sur les surfaces sans commandes natives (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), les commandes texte fonctionnent toujours même si vous définissez ceci sur `false`.
- `commands.native` (par défaut `"auto"`) enregistre les commandes natives.
  - Auto : activé pour Discord/Telegram ; désactivé pour Slack (jusqu'à ce que vous ajoutiez des commandes slash) ; ignoré pour les providers sans support natif.
  - Définissez `channels.discord.commands.native`, `channels.telegram.commands.native`, ou `channels.slack.commands.native` pour remplacer par provider (booléen ou `"auto"`).
  - `false` efface les commandes précédemment enregistrées sur Discord/Telegram au démarrage. Les commandes Slack sont gérées dans l'application Slack et ne sont pas supprimées automatiquement.
- `commands.nativeSkills` (par défaut `"auto"`) enregistre les commandes de **compétence** de manière native lorsque prises en charge.
  - Auto : activé pour Discord/Telegram ; désactivé pour Slack (Slack nécessite de créer une commande slash par skill).
  - Définissez `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` pour remplacer par fournisseur (booléen ou `"auto"`).
- `commands.bash` (par défaut `false`) active `! <cmd>` pour exécuter des commandes shell de l'hôte (`/bash <cmd>` est un alias ; nécessite les listes d'autorisation `tools.elevated`).
- `commands.bashForegroundMs` (par défaut `2000`) contrôle la durée d'attente de bash avant de passer en mode arrière-plan (`0` passe immédiatement en arrière-plan).
- `commands.config` (par défaut `false`) active `/config` (lit/écrit `openclaw.json`).
- `commands.mcp` (par défaut `false`) active `/mcp` (lit/écrit la configuration MCP gérée par OpenClaw sous `mcp.servers`).
- `commands.plugins` (défaut `false`) active `/plugins` (découverte/statut des plugins plus contrôles d'installation + activation/désactivation).
- `commands.debug` (par défaut `false`) active `/debug` (remplacements uniquement à l'exécution).
- `commands.allowFrom` (facultatif) définit une liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, elle est la seule source d'autorisation pour les commandes et les directives (les listes d'autorisation/appariements de canal et `commands.useAccessGroups` sont ignorés). Utilisez `"*"` pour un défaut global ; les clés spécifiques au fournisseur la remplacent.
- `commands.useAccessGroups` (par défaut `true`) applique les listes d'autorisation/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.

## Liste des commandes

Texte + natif (lorsqu'activé) :

- `/help`
- `/commands`
- `/tools [compact|verbose]` (afficher ce que l'agent actuel peut utiliser maintenant ; `verbose` ajoute des descriptions)
- `/skill <name> [input]` (exécuter une compétence par son nom)
- `/status` (afficher l'état actuel ; inclut l'utilisation/le quota du provider pour le model actuel si disponible)
- `/tasks` (liste les tâches d'arrière-plan pour la session actuelle ; affiche les détails des tâches actives et récentes avec les comptes de repli locaux à l'agent)
- `/allowlist` (liste/ajoute/supprime les entrées de la liste d'autorisation)
- `/approve <id> <decision>` (résoudre les invites d'approbation d'exécution ; utiliser le message d'approbation en attente pour les décisions disponibles)
- `/context [list|detail|json]` (explique le « contexte » ; `detail` affiche la taille du prompt système + par fichier + par outil + par compétence)
- `/btw <question>` (poser une question secondaire éphémère sur la session actuelle sans modifier le contexte futur de la session ; voir [/tools/btw](/en/tools/btw))
- `/export-session [path]` (alias : `/export`) (exporter la session actuelle au format HTML avec le prompt système complet)
- `/whoami` (afficher votre identifiant d'expéditeur ; alias : `/id`)
- `/session idle <duration|off>` (gérer le désengagement automatique par inactivité pour les liaisons de fil concentrés)
- `/session max-age <duration|off>` (gérer le désengagement automatique par ancienneté maximale stricte pour les liaisons de fil concentrés)
- `/subagents list|kill|log|info|send|steer|spawn` (inspecter, contrôler ou lancer des exécutions de sous-agents pour la session actuelle)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspecter et contrôler les sessions d'exécution ACP)
- `/agents` (lister les agents liés au fil pour cette session)
- `/focus <target>` (Discord : lier ce fil, ou un nouveau fil, à une cible de session/sous-agent)
- `/unfocus` (Discord : supprimer la liaison du fil actuel)
- `/kill <id|#|all>` (interrompre immédiatement un ou tous les sous-agents en cours d'exécution pour cette session ; sans message de confirmation)
- `/steer <id|#> <message>` (guider immédiatement un sous-agent en cours d'exécution : en cours d'exécution si possible, sinon interrompre le travail actuel et redémarrer sur le message de guidage)
- `/tell <id|#> <message>` (alias pour `/steer`)
- `/config show|get|set|unset` (enregistrer la configuration sur le disque, propriétaire uniquement ; nécessite `commands.config: true`)
- `/mcp show|get|set|unset` (gérer la configuration du serveur MCP OpenClaw, propriétaire uniquement ; nécessite `commands.mcp: true`)
- `/plugins list|show|get|install|enable|disable` (inspect discovered plugins, install new ones, and toggle enablement; owner-only for writes; requires `commands.plugins: true`)
  - `/plugin` est un alias pour `/plugins`.
  - `/plugin install <spec>` accepte les mêmes spécifications de plugin que `openclaw plugins install` : chemin local/archive, package npm, ou `clawhub:<pkg>`.
  - Les écritures d'activation/désactivation répondent toujours avec une indication de redémarrage. Sur une passerelle (gateway) surveillée en premier plan, OpenClaw peut effectuer ce redémarrage automatiquement juste après l'écriture.
- `/debug show|set|unset|reset` (runtime overrides, owner-only; requires `commands.debug: true`)
- `/usage off|tokens|full|cost` (per-response usage footer or local cost summary)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (contrôler le TTS ; voir [/tts](/en/tools/tts))
  - Discord : la commande native est `/voice` (Discord réserve `/tts`) ; le texte `/tts` fonctionne toujours.
- `/stop`
- `/restart`
- `/dock-telegram` (alias : `/dock_telegram`) (switch replies to Telegram)
- `/dock-discord` (alias : `/dock_discord`) (switch replies to Discord)
- `/dock-slack` (alias : `/dock_slack`) (switch replies to Slack)
- `/activation mention|always` (groups only)
- `/send on|off|inherit` (owner-only)
- `/reset` ou `/new [model]` (optional model hint; remainder is passed through)
- `/think <off|minimal|low|medium|high|xhigh>` (dynamic choices by model/provider; aliases: `/thinking`, `/t`)
- `/fast status|on|off` (omitting the arg shows the current effective fast-mode state)
- `/verbose on|full|off` (alias : `/v`)
- `/reasoning on|off|stream` (alias : `/reason` ; when on, sends a separate message prefixed `Reasoning:` ; `stream` = Telegram draft only)
- `/elevated on|off|ask|full` (alias : `/elev` ; `full` ignore les validations d'exécution)
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (envoyez `/exec` pour afficher l'actuel)
- `/model <name>` (alias : `/models` ; ou `/<alias>` depuis `agents.defaults.models.*.alias`)
- `/queue <mode>` (plus des options comme `debounce:2s cap:25 drop:summarize` ; envoyez `/queue` pour voir les paramètres actuels)
- `/bash <command>` (hôte uniquement ; alias pour `! <command>` ; nécessite les listes blanches `commands.bash: true` + `tools.elevated`)
- `/dreaming [on|off|status|help]` (activer/désactiver le rêve global ou afficher l'état ; voir [Dreaming](/en/concepts/dreaming))

Texte uniquement :

- `/compact [instructions]` (voir [/concepts/compaction](/en/concepts/compaction))
- `! <command>` (hôte uniquement ; un à la fois ; utiliser `!poll` + `!stop` pour les tâches de longue durée)
- `!poll` (vérifier la sortie / l'état ; accepte un `sessionId` optionnel ; `/bash poll` fonctionne également)
- `!stop` (arrêter la tâche bash en cours ; accepte un `sessionId` optionnel ; `/bash stop` fonctionne également)

Notes :

- Les commandes acceptent un `:` optionnel entre la commande et les arguments (par ex. `/think: high`, `/send: on`, `/help:`).
- `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) ; en l'absence de correspondance, le texte est traité comme le corps du message.
- Pour un récapitulatif complet de l'utilisation du fournisseur, utilisez `openclaw status --usage`.
- `/allowlist add|remove` nécessite `commands.config=true` et respecte le `configWrites` du canal.
- Dans les canaux multi-comptes, `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblant la configuration respectent également le `configWrites` du compte cible.
- `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost` imprime un résumé local des coûts à partir des journaux de session OpenClaw.
- `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
- Commande native uniquement pour Discord : `/vc join|leave|status` contrôle les canaux vocaux (nécessite `channels.discord.voice` et les commandes natives ; non disponible sous forme de texte).
- Les commandes de liaison de fil de discussion Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent que les liaisons de fil de discussion effectives soient activées (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
- Référence de commande ACP et comportement d'exécution : [ACP Agents](/en/tools/acp-agents).
- `/verbose` est destiné au débogage et à une visibilité supplémentaire ; gardez-le désactivé (**off**) en utilisation normale.
- `/fast on|off` persiste une remplacement (override) de session. Utilisez l'option `inherit` de l'interface utilisateur Sessions pour l'effacer et revenir aux valeurs par défaut de la configuration.
- `/fast` est spécifique au fournisseur : OpenAI/OpenAI Codex le mappent à `service_tier=priority` sur les points de terminaison natifs Responses, tandis que les requêtes publiques directes Anthropic, y compris le trafic authentifié OAuth envoyé à `api.anthropic.com`, le mappent à `service_tier=auto` ou `standard_only`. Voir [OpenAI](/en/providers/openai) et [Anthropic](/en/providers/anthropic).
- Les résumés d'échec d'outil sont toujours affichés le cas échéant, mais le texte d'échec détaillé n'est inclus que lorsque `/verbose` est `on` ou `full`.
- `/reasoning` (et `/verbose`) sont risqués dans les contextes de groupe : ils peuvent révéler un raisonnement interne ou une sortie d'outil que vous ne comptiez pas exposer. Il est préférable de les laisser désactivés, surtout dans les discussions de groupe.
- `/model` persiste le nouveau modèle de session immédiatement.
- Si l'agent est inactif, la prochaine exécution l'utilise tout de suite.
- Si une exécution est déjà active, OpenClaw marque un basculement en direct comme en attente et ne redémarre vers le nouveau modèle qu'à un point de réessai propre.
- Si l'activité de l'outil ou la sortie de réponse a déjà commencé, le basculement en attente peut rester en file d'attente jusqu'à une prochaine opportunité de réessai ou au prochain tour de l'utilisateur.
- **Chemin rapide :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournement de la file d'attente et du model).
- **Filtrage par mention de groupe :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés contournent les exigences de mention.
- **Raccourcis en ligne (expéditeurs autorisés uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le model ne voie le texte restant.
  - Exemple : `hey /status` déclenche une réponse de statut, et le texte restant poursuit le flux normal.
- Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Les messages non autorisés contenant uniquement des commandes sont ignorés silencieusement, et les jetons `/...` en ligne sont traités comme du texte brut.
- **Commandes de Skills :** les skills `user-invocable` sont exposées en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (ex. `_2`).
  - `/skill <name> [input]` exécute un skill par son nom (utile lorsque les limites de commandes natives empêchent les commandes par skill).
  - Par défaut, les commandes de skills sont transmises au model en tant que requête normale.
  - Les skills peuvent éventuellement déclarer `command-dispatch: tool` pour router la commande directement vers un tool (déterministe, sans model).
  - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/en/prose).
- **Arguments de commandes natives :** Discord utilise l'autocomplétion pour les options dynamiques (et les menus à boutons lorsque vous omettez les arguments obligatoires). Telegram et Slack affichent un menu à boutons lorsqu'une commande prend en charge des choix et que vous omettez l'argument.

## `/tools`

`/tools` répond à une question d'exécution, et non à une question de configuration : **ce que cet agent peut utiliser maintenant même dans cette conversation**.

- Le `/tools` par défaut est compact et optimisé pour un balayage rapide.
- `/tools verbose` ajoute de courtes descriptions.
- Les surfaces de commandes natives qui prennent en charge les arguments exposent le même sélecteur de mode que `compact|verbose`.
- Les résultats sont liés à la session, donc le changement d'agent, de channel, de fil, de l'autorisation de l'expéditeur ou de model peut modifier le résultat.
- `/tools` inclut les outils réellement accessibles lors de l'exécution, y compris les outils principaux, les outils de plugin connectés et les outils appartenant au channel.

Pour la modification du profil et des remplacements, utilisez le panneau des outils de l'interface de contrôle ou les surfaces de configuration/catalogue au lieu de traiter `/tools` comme un catalogue statique.

## Surfaces d'utilisation (ce qui s'affiche où)

- **Utilisation/quota du provider** (exemple : « Claude 80 % restant ») s'affiche dans `/status` pour le provider de model actuel lorsque le suivi de l'utilisation est activé. OpenClaw normalise les fenêtres de provider à `% left` ; pour MiniMax, les champs de pourcentage restant uniquement sont inversés avant l'affichage, et les réponses `model_remains` privilégient l'entrée du model de chat plus une étiquette de plan marquée par model.
- **Lignes de jetons/cache** dans `/status` peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de la session en direct est clairsemé. Les valeurs non nulles existantes en direct l'emportent toujours, et le repli sur la transcription peut également récupérer l'étiquette du model d'exécution actif ainsi qu'un total plus orienté vers l'invite lorsque les totaux stockés sont manquants ou plus petits.
- **Jetets/coût par réponse** est contrôlé par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **models/auth/endpoints**, pas l'utilisation.

## Sélection du model (`/model`)

`/model` est implémenté en tant que directive.

Exemples :

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

Notes :

- `/model` et `/model list` affichent un sélecteur compact numéroté (famille de models + providers disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des menus déroulants pour le provider et le model, plus une étape Soumettre.
- `/model <#>` sélectionne à partir de ce sélecteur (et privilégie le provider actuel lorsque cela est possible).
- `/model status` affiche la vue détaillée, y compris le point de terminaison du provider configuré (`baseUrl`) et le mode API (`api`) lorsqu'ils sont disponibles.

## Remplacements de débogage

`/debug` vous permet de définir des remplacements de configuration **uniquement pour l'exécution** (en mémoire, pas sur le disque). Réservé au propriétaire. Désactivé par défaut ; activer avec `commands.debug: true`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Notes :

- Les remplacements s'appliquent immédiatement aux nouvelles lectures de la configuration, mais n'écrivent **pas** dans `openclaw.json`.
- Utilisez `/debug reset` pour effacer tous les remplacements et revenir à la configuration sur disque.

## Mises à jour de la configuration

`/config` écrit dans votre configuration sur disque (`openclaw.json`). Réservé au propriétaire. Désactivé par défaut ; activer avec `commands.config: true`.

Exemples :

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

Notes :

- La configuration est validée avant l'écriture ; les modifications non valides sont rejetées.
- Les mises à jour `/config` persistent après les redémarrages.

## Mises à jour MCP

`/mcp` écrit les définitions de serveurs MCP gérées par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Désactivé par défaut ; activer avec `commands.mcp: true`.

Exemples :

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

Notes :

- `/mcp` stocke la configuration dans la configuration OpenClaw, et non dans les paramètres de projet détenus par Pi.
- Les adaptateurs d'exécution décident quels transports sont réellement exécutables.

## Mises à jour de plugins

`/plugins` permet aux opérateurs d'inspecter les plugins découverts et de basculer leur activation dans la configuration. Les flux en lecture seule peuvent utiliser `/plugin` comme alias. Désactivé par défaut ; activer avec `commands.plugins: true`.

Exemples :

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

Notes :

- `/plugins list` et `/plugins show` utilisent la véritable découverte de plugins sur l'espace de travail actuel ainsi que la configuration sur disque.
- `/plugins enable|disable` met à jour uniquement la configuration du plugin ; il n'installe ni ne désinstalle les plugins.
- Après les modifications d'activation/désactivation, redémarrez la passerelle pour les appliquer.

## Notes de surface

- Les **commandes de texte** s'exécutent dans la session de discussion normale (les DMs partagent `main`, les groupes ont leur propre session).
- Les **commandes natives** utilisent des sessions isolées :
  - Discord : `agent:<agentId>:discord:slash:<userId>`
  - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`)
  - Telegram : `telegram:slash:<userId>` (cible la session de discussion via `CommandTargetSessionKey`)
- **`/stop`** cible la session de chat active afin qu'elle puisse annuler l'exécution en cours.
- **Slack :** `channels.slack.slashCommand` est toujours pris en charge pour une commande unique de style `/openclaw`. Si vous activez `commands.native`, vous devez créer une commande slash Slack pour chaque commande intégrée (mêmes noms que `/help`). Les menus d'arguments de commande pour Slack sont transmis sous forme de boutons éphémères du Block Kit.
  - Exception native Slack : enregistrez `/agentstatus` (et non `/status`) car Slack réserve `/status`. Le texte `/status` fonctionne toujours dans les messages Slack.

## Questions secondaires BTW

`/btw` est une **question secondaire** rapide sur la session actuelle.

Contrairement au chat normal :

- il utilise la session actuelle comme contexte d'arrière-plan,
- il s'exécute comme un appel unique distinct **sans outil**,
- il ne modifie pas le contexte futur de la session,
- il n'est pas écrit dans l'historique des transcripts,
- il est transmis comme un résultat latéral en direct au lieu d'un message assistant normal.

Cela rend `/btw` utile lorsque vous souhaitez une clarification temporaire pendant que la tâche principale se poursuit.

Exemple :

```text
/btw what are we doing right now?
```

Voir [Questions secondaires BTW](/en/tools/btw) pour le comportement complet et les détails de l'expérience utilisateur client.
