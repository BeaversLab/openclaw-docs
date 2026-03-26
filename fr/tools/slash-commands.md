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
- `commands.plugins` (par défaut `false`) active `/plugins` (découverte/état des plugins plus interrupteurs d'activation/désactivation).
- `commands.debug` (par défaut `false`) active `/debug` (remplacements uniquement à l'exécution).
- `commands.allowFrom` (facultatif) définit une liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, elle est la seule source d'autorisation pour les commandes et les directives (les listes d'autorisation/appariements de canal et `commands.useAccessGroups` sont ignorés). Utilisez `"*"` pour un défaut global ; les clés spécifiques au fournisseur la remplacent.
- `commands.useAccessGroups` (par défaut `true`) applique les listes d'autorisation/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.

## Liste des commandes

Texte + natif (lorsqu'activé) :

- `/help`
- `/commands`
- `/skill <name> [input]` (exécuter une compétence par son nom)
- `/status` (afficher l'état actuel ; inclut l'utilisation/le quota du provider pour le provider de model actuel si disponible)
- `/allowlist` (lister/ajouter/supprimer les entrées de la liste d'autorisation)
- `/approve <id> allow-once|allow-always|deny` (résoudre les invites d'approbation d'exécution)
- `/context [list|detail|json]` (expliquer le « contexte » ; `detail` affiche la taille du prompt par fichier + par tool + par compétence + système)
- `/btw <question>` (poser une question éphémère sur la session actuelle sans modifier le contexte futur de la session ; voir [/tools/btw](/fr/tools/btw))
- `/export-session [path]` (alias : `/export`) (exporter la session actuelle au format HTML avec le prompt système complet)
- `/whoami` (afficher votre identifiant d'expéditeur ; alias : `/id`)
- `/session idle <duration|off>` (gérer le désauto-focalisation par inactivité pour les liaisons de fils focalisés)
- `/session max-age <duration|off>` (gérer le désauto-focalisation par âge maximal strict pour les liaisons de fils focalisés)
- `/subagents list|kill|log|info|send|steer|spawn` (inspecter, contrôler ou générer des exécutions de sous-agents pour la session actuelle)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspecter et contrôler les sessions d'exécution ACP)
- `/agents` (lister les agents liés au fil pour cette session)
- `/focus <target>` (Discord : lier ce fil, ou un nouveau fil, à une cible de session/sous-agent)
- `/unfocus` (Discord : supprimer la liaison du fil actuel)
- `/kill <id|#|all>` (interrompre immédiatement un ou tous les sous-agents en cours d'exécution pour cette session ; sans message de confirmation)
- `/steer <id|#> <message>` (diriger immédiatement un sous-agent en cours d'exécution : en cours d'exécution si possible, sinon interrompre le travail actuel et redémarrer sur le message de direction)
- `/tell <id|#> <message>` (alias pour `/steer`)
- `/config show|get|set|unset` (enregistrer la configuration sur le disque, propriétaire uniquement ; nécessite `commands.config: true`)
- `/mcp show|get|set|unset` (gérer la configuration du serveur MCP OpenClaw , propriétaire uniquement ; nécessite `commands.mcp: true`)
- `/plugins list|show|get|enable|disable` (inspecter les plugins découverts et activer/désactiver, réservé au propriétaire pour l'écriture ; nécessite `commands.plugins: true`)
- `/debug show|set|unset|reset` (remplacements à l'exécution, réservé au propriétaire ; nécessite `commands.debug: true`)
- `/usage off|tokens|full|cost` (pied de page d'utilisation par réponse ou résumé des coûts locaux)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (contrôler le TTS ; voir [/tts](/fr/tools/tts))
  - Discord : la commande native est `/voice` (Discord réserve `/tts`) ; le texte `/tts` fonctionne toujours.
- `/stop`
- `/restart`
- `/dock-telegram` (alias : `/dock_telegram`) (basculer les réponses vers Telegram)
- `/dock-discord` (alias : `/dock_discord`) (change les réponses vers Discord)
- `/dock-slack` (alias : `/dock_slack`) (change les réponses vers Slack)
- `/activation mention|always` (groupes uniquement)
- `/send on|off|inherit` (propriétaire uniquement)
- `/reset` ou `/new [model]` (indicateur de model facultatif ; le reste est transmis)
- `/think <off|minimal|low|medium|high|xhigh>` (choix dynamiques par model/provider ; alias : `/thinking`, `/t`)
- `/fast status|on|off` (l'omission de l'arg affiche l'état actuel effectif du mode rapide)
- `/verbose on|full|off` (alias : `/v`)
- `/reasoning on|off|stream` (alias : `/reason` ; lorsqu'activé, envoie un message séparé préfixé par `Reasoning:` ; `stream` = brouillon Telegram uniquement)
- `/elevated on|off|ask|full` (alias : `/elev` ; `full` ignore les approbations d'exécution)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (envoyez `/exec` pour afficher l'actuel)
- `/model <name>` (alias : `/models` ; ou `/<alias>` depuis `agents.defaults.models.*.alias`)
- `/queue <mode>` (plus des options comme `debounce:2s cap:25 drop:summarize` ; envoyez `/queue` pour voir les paramètres actuels)
- `/bash <command>` (hôte uniquement ; alias pour `! <command>` ; nécessite les listes d'autorisation `commands.bash: true` + `tools.elevated`)

Texte uniquement :

- `/compact [instructions]` (voir [/concepts/compaction](/fr/concepts/compaction))
- `! <command>` (hôte uniquement ; un à la fois ; utilisez `!poll` + `!stop` pour les tâches de longue durée)
- `!poll` (vérifier la sortie / le statut ; accepte `sessionId` en option ; `/bash poll` fonctionne également)
- `!stop` (arrêter la tâche bash en cours ; accepte `sessionId` en option ; `/bash stop` fonctionne également)

Notes :

- Les commandes acceptent un `:` optionnel entre la commande et les arguments (par ex. `/think: high`, `/send: on`, `/help:`).
- `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) ; si aucune correspondance n'est trouvée, le texte est traité comme le corps du message.
- Pour une ventilation complète de l'utilisation du fournisseur, utilisez `openclaw status --usage`.
- `/allowlist add|remove` nécessite `commands.config=true` et respecte le `configWrites` du canal.
- Dans les canaux multi-comptes, `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblant la configuration respectent également le `configWrites` du compte cible.
- `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost` imprime un résumé des coûts locaux à partir des journaux de session OpenClaw.
- `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
- Commande native exclusive à Discord : `/vc join|leave|status` contrôle les canaux vocaux (nécessite `channels.discord.voice` et les commandes natives ; non disponible sous forme de texte).
- Les commandes de liaison de discussion Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent l'activation des liaisons de discussion effectives (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
- Référence des commandes ACP et comportement à l'exécution : [ACP Agents](/fr/tools/acp-agents).
- `/verbose` est destiné au débogage et à une visibilité accrue ; gardez-le **désactivé** lors d'une utilisation normale.
- `/fast on|off` enregistre une substitution de session. Utilisez l'option `inherit` de l'interface Sessions pour l'effacer et revenir aux paramètres par défaut de la configuration.
- Les résumés des échecs d'outils sont toujours affichés si pertinent, mais le texte d'échec détaillé n'est inclus que lorsque `/verbose` est `on` ou `full`.
- `/reasoning` (et `/verbose`) présentent des risques dans les contextes de groupe : ils peuvent révéler un raisonnement interne ou des sorties d'outils que vous ne souhaitiez pas exposer. Il est préférable de les laisser désactivés, en particulier dans les conversations de groupe.
- **Chemin rapide :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournent la file d'attente + le modèle).
- **Filtrage des mentions de groupe :** les messages de commande uniquement provenant des expéditeurs sur la liste autorisée contournent les exigences de mention.
- **Raccourcis en ligne (expéditeurs sur liste autorisée uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le modèle ne voie le texte restant.
  - Exemple : `hey /status` déclenche une réponse d'état, et le texte restant continue via le flux normal.
- Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Les messages de commande uniquement non autorisés sont silencieusement ignorés, et les jetons en ligne `/...` sont traités comme du texte brut.
- **Commandes de Skills :** les compétences `user-invocable` sont exposées en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (par ex. `_2`).
  - `/skill <name> [input]` exécute une compétence par son nom (utile lorsque les limites de commandes natives empêchent les commandes par compétence).
  - Par défaut, les commandes de compétences sont transmises au modèle en tant que requête normale.
  - Les compétences peuvent éventuellement déclarer `command-dispatch: tool` pour router la commande directement vers un outil (déterministe, pas de modèle).
  - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/fr/prose).
- **Arguments de commande native :** Discord utilise l'autocomplétion pour les options dynamiques (et les menus à boutons lorsque vous omettez les arguments requis). Telegram et Slack affichent un menu à boutons lorsqu'une commande prend en charge les choix et que vous omettez l'argument.

## Surfaces d'utilisation (ce qui s'affiche où)

- **Utilisation/quota du provider** (exemple : « 80 % restants pour Claude ») s'affiche dans `/status` pour le provider de model actuel lorsque le suivi de l'utilisation est activé.
- **Jetets/coût par réponse** est contrôlé par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **models/auth/endpoints**, pas l'utilisation.

## Sélection de model (`/model`)

`/model` est implémenté en tant que directive.

Exemples :

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model opus@anthropic:default
/model status
```

Notes :

- `/model` et `/model list` affichent un sélecteur compact et numéroté (famille de models + providers disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes pour le provider et le model, ainsi qu'une étape de soumission.
- `/model <#>` sélectionne depuis ce sélecteur (et préfère le provider actuel si possible).
- `/model status` affiche la vue détaillée, y compris le endpoint du provider configuré (`baseUrl`) et le mode API (`api`) lorsque disponibles.

## Débogage des overrides

`/debug` vous permet de définir des overrides de configuration **uniquement à l'exécution** (en mémoire, pas sur disque). Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.debug: true`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Notes :

- Les overrides s'appliquent immédiatement aux nouvelles lectures de la configuration, mais n'écrivent **pas** dans `openclaw.json`.
- Utilisez `/debug reset` pour effacer tous les overrides et revenir à la configuration sur disque.

## Mises à jour de la configuration

`/config` écrit dans votre configuration sur disque (`openclaw.json`). Réservé au propriétaire. Désactivé par défaut ; activez avec `commands.config: true`.

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
- Les mises à jour de `/config` persistent après les redémarrages.

## Mises à jour MCP

`/mcp` écrit les définitions de serveur MCP gérées par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Désactivé par défaut ; activez avec `commands.mcp: true`.

Exemples :

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

Notes :

- `/mcp` stocke la configuration dans la config OpenClaw, et non dans les paramètres de projet détenus par Pi.
- Les adaptateurs d'exécution décident quels transports sont réellement exécutables.

## Mises à jour de plugins

`/plugins` permet aux opérateurs d'inspecter les plugins découverts et d'activer ou désactiver leur activation dans la configuration. Les flux en lecture seule peuvent utiliser `/plugin` comme alias. Désactivé par défaut ; activez-le avec `commands.plugins: true`.

Exemples :

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

Remarques :

- `/plugins list` et `/plugins show` utilisent une découverte réelle de plugins basée sur l'espace de travail actuel ainsi que sur la configuration sur disque.
- `/plugins enable|disable` met uniquement à jour la configuration des plugins ; il n'installe ni ne désinstalle les plugins.
- Après des modifications d'activation/désactivation, redémarrez la passerelle pour les appliquer.

## Notes de surface

- Les **commandes texte** s'exécutent dans la session de chat normale (les DMs partagent `main`, les groupes ont leur propre session).
- Les **commandes natives** utilisent des sessions isolées :
  - Discord : `agent:<agentId>:discord:slash:<userId>`
  - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`)
  - Telegram : `telegram:slash:<userId>` (cible la session de discussion via `CommandTargetSessionKey`)
- **`/stop`** cible la session de discussion active afin qu'elle puisse interrompre l'exécution en cours.
- **Slack :** `channels.slack.slashCommand` est toujours pris en charge pour une seule commande de style `/openclaw`. Si vous activez `commands.native`, vous devez créer une commande slash Slack pour chaque commande intégrée (mêmes noms que `/help`). Les menus d'arguments de commande pour Slack sont livrés sous forme de boutons éphémères du Block Kit.
  - Slack exception native : enregistrez `/agentstatus` (pas `/status`) car Slack réserve `/status`. Le texte `/status` fonctionne toujours dans les messages Slack.

## Questions BTW annexes

`/btw` est une **question annexe** rapide sur la session actuelle.

Contrairement au chat normal :

- il utilise la session actuelle comme contexte d'arrière-plan,
- il s'exécute comme un appel unique séparé **sans tool**,
- il ne modifie pas le contexte futur de la session,
- il n'est pas écrit dans l'historique des transcriptions,
- il est délivré comme un résultat annexe en direct plutôt que comme un message d'assistant normal.

Cela rend `/btw` utile lorsque vous souhaitez une clarification temporaire pendant que la tâche principale continue.

Exemple :

```text
/btw what are we doing right now?
```

Voir [Questions BTW annexes](/fr/tools/btw) pour le comportement complet et les détails de l'expérience utilisateur client.

import fr from "/components/footer/fr.mdx";

<fr />
