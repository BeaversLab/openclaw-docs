---
summary: "Slash commands : texte vs natif, configuration et commandes prises en charge"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash Commands"
---

# Commandes Slash

Les commandes sont gérées par le Gateway. La plupart des commandes doivent être envoyées sous forme de message **autonome** commençant par `/`.
La commande de chat bash réservée à l'hôte utilise `! <cmd>` (avec `/bash <cmd>` comme alias).

Il existe deux systèmes connexes :

- **Commandes** : messages `/...` autonomes.
- **Directives** : `/think`, `/fast`, `/verbose`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Les directives sont supprimées du message avant que le modèle ne le voie.
  - Dans les messages de chat normaux (pas uniquement des directives), elles sont traitées comme des « indices en ligne » et ne **persistent pas** les paramètres de session.
  - Dans les messages contenant uniquement des directives (le message ne contient que des directives), elles persistent dans la session et répondent par un accusé de réception.
  - Les directives ne sont appliquées que pour les **expéditeurs autorisés**. Si `commands.allowFrom` est défini, c'est la seule
    liste d'autorisation utilisée ; sinon, l'autorisation provient des listes d'autorisation/appariements des canaux ainsi que de `commands.useAccessGroups`.
    Les expéditeurs non autorisés voient les directives traitées comme du texte brut.

Il existe également quelques **raccourcis en ligne** (uniquement pour les expéditeurs sur liste d'autorisation/autorisés) : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
Ils s'exécutent immédiatement, sont supprimés avant que le modèle ne voie le message, et le texte restant poursuit le flux normal.

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
  - Sur les surfaces sans commandes natives (WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams), les commandes texte fonctionnent toujours même si vous réglez ceci sur `false`.
- `commands.native` (par défaut `"auto"`) enregistre les commandes natives.
  - Auto : activé pour Discord/Telegram ; désactivé pour Slack (jusqu'à ce que vous ajoutiez des commandes slash) ; ignoré pour les providers sans support natif.
  - Définissez `channels.discord.commands.native`, `channels.telegram.commands.native` ou `channels.slack.commands.native` pour remplacer par fournisseur (booléen ou `"auto"`).
  - `false` efface les commandes précédemment enregistrées sur Discord/Telegram au démarrage. Les commandes Slack sont gérées dans l'application Slack et ne sont pas supprimées automatiquement.
- `commands.nativeSkills` (par défaut `"auto"`) enregistre les commandes de **compétence** de manière native lorsque cela est pris en charge.
  - Auto : activé pour Discord/Telegram ; désactivé pour Slack (Slack nécessite de créer une commande slash par skill).
  - Définissez `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` pour remplacer par fournisseur (booléen ou `"auto"`).
- `commands.bash` (par défaut `false`) permet à `! <cmd>` d'exécuter des commandes shell de l'hôte (`/bash <cmd>` est un alias ; nécessite des listes d'autorisation `tools.elevated`).
- `commands.bashForegroundMs` (par défaut `2000`) contrôle la durée d'attente de bash avant de passer en mode arrière-plan (`0` passe immédiatement en arrière-plan).
- `commands.config` (par défaut `false`) active `/config` (lit/écrit `openclaw.json`).
- `commands.debug` (par défaut `false`) active `/debug` (remplacements uniquement en cours d'exécution).
- `commands.allowFrom` (facultatif) définit une liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, c'est la
  seule source d'autorisation pour les commandes et les directives (les listes d'autorisation/appariements de canal et `commands.useAccessGroups`
  sont ignorés). Utilisez `"*"` pour une valeur par défaut globale ; les clés spécifiques au fournisseur la remplacent.
- `commands.useAccessGroups` (par défaut `true`) applique les listes d'autorisation/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.

## Liste des commandes

Texte + natif (lorsqu'activé) :

- `/help`
- `/commands`
- `/skill <name> [input]` (exécuter une compétence par nom)
- `/status` (afficher l'état actuel ; inclut l'utilisation/quota du fournisseur pour le fournisseur de modèle actuel si disponible)
- `/allowlist` (lister/ajouter/supprimer les entrées de la liste d'autorisation)
- `/approve <id> allow-once|allow-always|deny` (résoudre les invites d'approbation d'exécution)
- `/context [list|detail|json]` (explique le « contexte » ; `detail` affiche la taille par fichier + par tool + par compétence + du prompt système)
- `/btw <question>` (poser une question latérale éphémère sur la session actuelle sans modifier le contexte de la session future ; voir [/tools/btw](/fr/tools/btw))
- `/export-session [path]` (alias : `/export`) (exporter la session actuelle vers HTML avec le prompt système complet)
- `/whoami` (afficher votre identifiant d'expéditeur ; alias : `/id`)
- `/session idle <duration|off>` (gérer l'auto-défocus par inactivité pour les liaisons de fils de discussion focalisés)
- `/session max-age <duration|off>` (gérer l'auto-défocus par âge maximal strict pour les liaisons de fils de discussion focalisés)
- `/subagents list|kill|log|info|send|steer|spawn` (inspecter, contrôler ou lancer des exécutions de sous-agents pour la session actuelle)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspecter et contrôler les sessions d'exécution ACP)
- `/agents` (lister les agents liés aux fils pour cette session)
- `/focus <target>` (Discord : lier ce fil, ou un nouveau fil, à une cible de session/sous-agent)
- `/unfocus` (Discord : supprimer la liaison du fil actuel)
- `/kill <id|#|all>` (abandonner immédiatement un ou tous les sous-agents en cours d'exécution pour cette session ; aucun message de confirmation)
- `/steer <id|#> <message>` (orienter immédiatement un sous-agent en cours d'exécution : en cours d'exécution si possible, sinon abandonner le travail actuel et redémarrer sur le message d'orientation)
- `/tell <id|#> <message>` (alias pour `/steer`)
- `/config show|get|set|unset` (enregistrer la configuration sur le disque, propriétaire uniquement ; nécessite `commands.config: true`)
- `/debug show|set|unset|reset` (remplacements à l'exécution, propriétaire uniquement ; nécessite `commands.debug: true`)
- `/usage off|tokens|full|cost` (pied de page d'utilisation par réponse ou résumé des coûts locaux)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (contrôler le TTS ; voir [/tts](/fr/tts))
  - Discord : la commande native est `/voice` (Discord réserve `/tts`) ; le texte `/tts` fonctionne toujours.
- `/stop`
- `/restart`
- `/dock-telegram` (alias : `/dock_telegram`) (switch replies to Telegram)
- `/dock-discord` (alias : `/dock_discord`) (switch replies to Discord)
- `/dock-slack` (alias : `/dock_slack`) (switch replies to Slack)
- `/activation mention|always` (groups only)
- `/send on|off|inherit` (owner-only)
- `/reset` or `/new [model]` (optional model hint; remainder is passed through)
- `/think <off|minimal|low|medium|high|xhigh>` (dynamic choices by model/provider; aliases: `/thinking`, `/t`)
- `/fast status|on|off` (omitting the arg shows the current effective fast-mode state)
- `/verbose on|full|off` (alias : `/v`)
- `/reasoning on|off|stream` (alias : `/reason`; when on, sends a separate message prefixed `Reasoning:`; `stream` = Telegram draft only)
- `/elevated on|off|ask|full` (alias : `/elev`; `full` skips exec approvals)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (send `/exec` to show current)
- `/model <name>` (alias : `/models`; or `/<alias>` from `agents.defaults.models.*.alias`)
- `/queue <mode>` (plus options like `debounce:2s cap:25 drop:summarize`; send `/queue` to see current settings)
- `/bash <command>` (host-only; alias for `! <command>`; requires `commands.bash: true` + `tools.elevated` allowlists)

Text-only :

- `/compact [instructions]` (see [/concepts/compaction](/fr/concepts/compaction))
- `! <command>` (host-only; one at a time; use `!poll` + `!stop` for long-running jobs)
- `!poll` (check output / status; accepts optional `sessionId`; `/bash poll` also works)
- `!stop` (arrête le travail bash en cours ; accepte `sessionId` facultatif ; `/bash stop` fonctionne également)

Notes :

- Les commandes acceptent un `:` facultatif entre la commande et les arguments (ex. `/think: high`, `/send: on`, `/help:`).
- `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance floue) ; s'il n'y a pas de correspondance, le texte est traité comme le corps du message.
- Pour une ventilation complète de l'utilisation du fournisseur, utilisez `openclaw status --usage`.
- `/allowlist add|remove` nécessite `commands.config=true` et respecte `configWrites` du channel.
- Dans les channels multi-comptes, `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblées sur la configuration respectent également `configWrites` du compte cible.
- `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost` imprime un résumé local des coûts à partir des journaux de session OpenClaw.
- `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
- Commande native uniquement Discord : `/vc join|leave|status` contrôle les canaux vocaux (nécessite `channels.discord.voice` et les commandes natives ; non disponible sous forme de texte).
- Les commandes de liaison de fils Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent que les liaisons de fils effectives soient activées (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
- Référence de commande ACP et comportement d'exécution : [ACP Agents](/fr/tools/acp-agents).
- `/verbose` est destiné au débogage et à une visibilité supplémentaire ; gardez-le **désactivé** lors d'une utilisation normale.
- `/fast on|off` rend persistante une priorité de session. Utilisez l'option `inherit` de l'interface Sessions pour l'effacer et revenir aux paramètres par défaut de la configuration.
- Les résumés des échecs d'outil sont toujours affichés lorsque pertinent, mais le texte détaillé de l'échec n'est inclus que lorsque `/verbose` est `on` ou `full`.
- `/reasoning` (et `/verbose`) sont risqués dans les contextes de groupe : ils peuvent révéler un raisonnement interne ou une sortie d'outil que vous ne souhaitiez pas exposer. Préférez les désactiver, surtout dans les chats de groupe.
- **Chemin rapide :** les messages de commande uniquement des expéditeurs autorisés sont traités immédiatement (contournement de la file + model).
- **Blocage par mention de groupe :** les messages de commande uniquement des expéditeurs autorisés contournent les exigences de mention.
- **Raccourcis en ligne (expéditeurs autorisés uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le model ne voie le texte restant.
  - Exemple : `hey /status` déclenche une réponse de statut, et le texte restant continue via le flux normal.
- Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Les messages de commande uniquement non autorisés sont silencieusement ignorés, et les jetons `/...` en ligne sont traités comme du texte brut.
- **Commandes de compétences :** les compétences `user-invocable` sont exposées en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (ex. `_2`).
  - `/skill <name> [input]` exécute une compétence par nom (utile lorsque les limites de commandes natives empêchent les commandes par compétence).
  - Par défaut, les commandes de compétences sont transmises au model en tant que demande normale.
  - Les compétences peuvent éventuellement déclarer `command-dispatch: tool` pour router la commande directement vers un tool (déterministe, sans model).
  - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/fr/prose).
- **Arguments de commande natifs :** Discord utilise l'autocomplétion pour les options dynamiques (et des menus à boutons lorsque vous omettez les arguments requis). Telegram et Slack affichent un menu à boutons lorsqu'une commande prend en charge les choix et que vous omettez l'argument.

## Surfaces d'utilisation (ce qui s'affiche où)

- L'utilisation/le quota du **provider** (exemple : « Claude 80 % restants ») s'affiche dans `/status` pour le provider de modèle actuel lorsque le suivi de l'utilisation est activé.
- Les jetets/coût **par réponse** sont contrôlés par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **modèles/auth/points de terminaison**, pas l'utilisation.

## Sélection de modèle (`/model`)

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

Remarques :

- `/model` et `/model list` affichent un sélecteur compact numéroté (famille de modèles + providers disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes de provider et de modèle ainsi qu'une étape de soumission.
- `/model <#>` sélectionne depuis ce sélecteur (et préfère le provider actuel lorsque c'est possible).
- `/model status` affiche la vue détaillée, y compris le point de terminaison du provider configuré (`baseUrl`) et le mode API (`api`) lorsqu'ils sont disponibles.

## Remplacements de débogage

`/debug` vous permet de définir des remplacements de configuration **uniquement lors de l'exécution** (en mémoire, pas sur le disque). Réservé au propriétaire. Désactivé par défaut ; activez avec `commands.debug: true`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Remarques :

- Les remplacements s'appliquent immédiatement aux nouvelles lectures de la configuration, mais n'écrivent **pas** dans `openclaw.json`.
- Utilisez `/debug reset` pour effacer tous les remplacements et revenir à la configuration sur le disque.

## Mises à jour de la configuration

`/config` écrit dans votre configuration sur le disque (`openclaw.json`). Réservé au propriétaire. Désactivé par défaut ; activez avec `commands.config: true`.

Exemples :

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

Remarques :

- La configuration est validée avant l'écriture ; les modifications non valides sont rejetées.
- Les mises à jour de `/config` persistent après les redémarrages.

## Remarques sur les surfaces

- Les **commandes de texte** s'exécutent dans la session de chat normale (les DMs partagent `main`, les groupes ont leur propre session).
- Les **commandes natives** utilisent des sessions isolées :
  - Discord : `agent:<agentId>:discord:slash:<userId>`
  - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`)
  - Telegram : `telegram:slash:<userId>` (cible la session de chat via `CommandTargetSessionKey`)
- **`/stop`** cible la session de chat active afin qu'elle puisse annuler l'exécution en cours.
- **Slack :** `channels.slack.slashCommand` est toujours pris en charge pour une seule commande de style `/openclaw`. Si vous activez `commands.native`, vous devez créer une commande slash Slack par commande intégrée (les mêmes noms que `/help`). Les menus d'arguments de commande pour Slack sont livrés sous forme de boutons éphémères de Block Kit.
  - Exception native Slack : enregistrez `/agentstatus` (pas `/status`) car Slack réserve `/status`. Le texte `/status` fonctionne toujours dans les messages Slack.

## Questions annexes BTW

`/btw` est une **question annexe** rapide sur la session actuelle.

Contrairement au chat normal :

- il utilise la session actuelle comme contexte d'arrière-plan,
- il s'exécute comme un appel unique **sans tool** distinct,
- il ne modifie pas le contexte futur de la session,
- il n'est pas écrit dans l'historique des transcripts,
- il est livré comme un résultat latéral en direct au lieu d'un message d'assistant normal.

Cela rend `/btw` utile lorsque vous souhaitez une clarification temporaire pendant que la tâche
principale continue.

Exemple :

```text
/btw what are we doing right now?
```

Voir [Questions annexes BTW](/fr/tools/btw) pour le comportement complet et les détails de l'UX client.

import fr from "/components/footer/fr.mdx";

<fr />
