---
summary: "Slash commands : texte vs natif, configuration et commandes prises en charge"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Commandes Slash"
---

# Commandes Slash

Les commandes sont gérées par le Gateway. La plupart des commandes doivent être envoyées en tant que message **autonome** commençant par `/`.
La commande de chat bash réservée à l'hôte utilise `! <cmd>` (avec `/bash <cmd>` comme alias).

Il existe deux systèmes connexes :

- **Commandes** : messages `/...` autonomes.
- **Directives** : `/think`, `/fast`, `/verbose`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Les directives sont supprimées du message avant que le modèle ne le voie.
  - Dans les messages de chat normaux (pas uniquement des directives), elles sont traitées comme des « indices en ligne » et ne **persistent pas** les paramètres de session.
  - Dans les messages contenant uniquement des directives (le message ne contient que des directives), elles persistent dans la session et répondent par un accusé de réception.
  - Les directives sont appliquées uniquement pour les **expéditeurs autorisés**. Si `commands.allowFrom` est défini, c'est la seule
    liste d'autorisation utilisée ; sinon, l'autorisation provient des listes d'autorisation/appairage de channel ainsi que de `commands.useAccessGroups`.
    Les expéditeurs non autorisés voient les directives traitées comme du texte brut.

Il existe également quelques **raccourcis en ligne** (expéditeurs autorisés/listés uniquement) : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
Ils s'exécutent immédiatement, sont supprimés avant que le modèle ne voie le message, et le texte restant continue à travers le flux normal.

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

- `commands.text` (par défaut `true`) active l'analyse `/...` dans les messages de chat.
  - Sur les surfaces sans commandes natives (WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams), les commandes texte fonctionnent toujours même si vous définissez ceci sur `false`.
- `commands.native` (par défaut `"auto"`) enregistre les commandes natives.
  - Auto : activé pour Discord/Telegram ; désactivé pour Slack (jusqu'à ce que vous ajoutiez des commandes slash) ; ignoré pour les providers sans support natif.
  - Définissez `channels.discord.commands.native`, `channels.telegram.commands.native` ou `channels.slack.commands.native` pour remplacer par provider (booléen ou `"auto"`).
  - `false` efface les commandes précédemment enregistrées sur Discord/Telegram au démarrage. Les commandes Slack sont gérées dans l'application Slack et ne sont pas supprimées automatiquement.
- `commands.nativeSkills` (par défaut `"auto"`) enregistre les commandes de **skill** de manière native lorsque cela est pris en charge.
  - Auto : activé pour Discord/Telegram ; désactivé pour Slack (Slack nécessite de créer une commande slash par skill).
  - Définissez `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` pour remplacer par provider (booléen ou `"auto"`).
- `commands.bash` (par défaut `false`) permet à `! <cmd>` d'exécuter des commandes shell de l'hôte (`/bash <cmd>` est un alias ; nécessite des listes d'autorisation `tools.elevated`).
- `commands.bashForegroundMs` (par défaut `2000`) contrôle la durée d'attente de bash avant de passer en mode arrière-plan (`0` passe immédiatement en arrière-plan).
- `commands.config` (par défaut `false`) active `/config` (lit/écrit `openclaw.json`).
- `commands.debug` (par défaut `false`) active `/debug` (remplacements uniquement au moment de l'exécution).
- `commands.allowFrom` (optionnel) définit une liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'il est configuré, il est la seule source d'autorisation pour les commandes et les directives (les listes d'autorisation de channel/appariements et `commands.useAccessGroups` sont ignorées). Utilisez `"*"` pour une valeur par défaut globale ; les clés spécifiques au fournisseur la remplacent.
- `commands.useAccessGroups` (par défaut `true`) applique les listes d'autorisation/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.

## Liste des commandes

Texte + natif (lorsqu'activé) :

- `/help`
- `/commands`
- `/skill <name> [input]` (exécuter une compétence par son nom)
- `/status` (afficher le statut actuel ; inclut l'utilisation/le quota du fournisseur pour le fournisseur de model actuel si disponible)
- `/allowlist` (list/ajouter/supprimer les entrées de la liste d'autorisation)
- `/approve <id> allow-once|allow-always|deny` (résoudre les invites d'approbation d'exécution)
- `/context [list|detail|json]` (expliquer le « contexte » ; `detail` montre la taille par fichier + par tool + par compétence + du système d'invite)
- `/export-session [path]` (alias : `/export`) (exporter la session actuelle vers HTML avec l'invite système complète)
- `/whoami` (afficher votre id d'expéditeur ; alias : `/id`)
- `/session idle <duration|off>` (gérer le défocus automatique par inactivité pour les liaisons de thread focalisées)
- `/session max-age <duration|off>` (gérer le défocus automatique max-age strict pour les liaisons de thread focalisées)
- `/subagents list|kill|log|info|send|steer|spawn` (inspecter, contrôler ou générer des exécutions de sous-agent pour la session actuelle)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspecter et contrôler les sessions d'exécution ACP)
- `/agents` (lister les agents liés au thread pour cette session)
- `/focus <target>` (Discord : lier ce thread, ou un nouveau thread, à une cible de session/sous-agent)
- `/unfocus` (Discord : supprimer la liaison du thread actuel)
- `/kill <id|#|all>` (interrompt immédiatement un ou tous les sous-agents en cours d'exécution pour cette session ; aucun message de confirmation)
- `/steer <id|#> <message>` (guide immédiatement un sous-agent en cours d'exécution : en cours d'exécution si possible, sinon interrompt le travail actuel et redémarre sur le message de guidage)
- `/tell <id|#> <message>` (alias pour `/steer`)
- `/config show|get|set|unset` (enregistre la configuration sur le disque, propriétaire uniquement ; nécessite `commands.config: true`)
- `/debug show|set|unset|reset` (remplacements lors de l'exécution, propriétaire uniquement ; nécessite `commands.debug: true`)
- `/usage off|tokens|full|cost` (pied de page d'utilisation par réponse ou résumé des coûts locaux)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (contrôle le TTS ; voir [/tts](/fr/tts))
  - Discord : la commande native est `/voice` (Discord réserve `/tts`) ; le texte `/tts` fonctionne toujours.
- `/stop`
- `/restart`
- `/dock-telegram` (alias : `/dock_telegram`) (basculer les réponses vers Telegram)
- `/dock-discord` (alias : `/dock_discord`) (basculer les réponses vers Discord)
- `/dock-slack` (alias : `/dock_slack`) (basculer les réponses vers Slack)
- `/activation mention|always` (groupes uniquement)
- `/send on|off|inherit` (propriétaire uniquement)
- `/reset` ou `/new [model]` (indicateur de modèle facultatif ; le reste est transmis tel quel)
- `/think <off|minimal|low|medium|high|xhigh>` (choix dynamiques par model/provider ; alias : `/thinking`, `/t`)
- `/fast status|on|off` (l'omission de l'argument affiche l'état actuel effectif du mode rapide)
- `/verbose on|full|off` (alias : `/v`)
- `/reasoning on|off|stream` (alias : `/reason` ; lorsqu'il est activé, envoie un message distinct préfixé par `Reasoning:` ; `stream` = brouillon Telegram uniquement)
- `/elevated on|off|ask|full` (alias : `/elev` ; `full` ignore les validations d'exécution)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (envoyez `/exec` pour afficher l'actuel)
- `/model <name>` (alias : `/models` ; ou `/<alias>` depuis `agents.defaults.models.*.alias`)
- `/queue <mode>` (plus des options comme `debounce:2s cap:25 drop:summarize` ; envoyez `/queue` pour voir les paramètres actuels)
- `/bash <command>` (hôte uniquement ; alias pour `! <command>` ; nécessite les listes d'autorisation `commands.bash: true` + `tools.elevated`)

Texte uniquement :

- `/compact [instructions]` (voir [/concepts/compaction](/fr/concepts/compaction))
- `! <command>` (hôte uniquement ; un à la fois ; utilisez `!poll` + `!stop` pour les tâches de longue durée)
- `!poll` (vérifier la sortie / le statut ; accepte `sessionId` en option ; `/bash poll` fonctionne également)
- `!stop` (arrêter la tâche bash en cours d'exécution ; accepte `sessionId` en option ; `/bash stop` fonctionne également)

Notes :

- Les commandes acceptent un `:` facultatif entre la commande et les arguments (par ex. `/think: high`, `/send: on`, `/help:`).
- `/new <model>` accepte un alias de model, `provider/model`, ou un nom de provider (correspondance approximative) ; en l'absence de correspondance, le texte est traité comme le corps du message.
- Pour une répartition complète de l'utilisation du provider, utilisez `openclaw status --usage`.
- `/allowlist add|remove` nécessite `commands.config=true` et respecte le `configWrites` du channel.
- Dans les salons multi-comptes, les `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblant la configuration respectent également les `configWrites` du compte cible.
- `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost` affiche un résumé local des coûts à partir des journaux de session OpenClaw.
- `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
- Commande native exclusive à Discord : `/vc join|leave|status` contrôle les canaux vocaux (nécessite `channels.discord.voice` et les commandes natives ; non disponible sous forme de texte).
- Les commandes de liaison de discussion Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent que les liaisons de discussion effectives soient activées (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
- Référence des commandes ACP et comportement à l'exécution : [ACP Agents](/fr/tools/acp-agents).
- `/verbose` est destiné au débogage et à une visibilité supplémentaire ; gardez-le **désactivé** lors d'une utilisation normale.
- `/fast on|off` rend persistante une priorité de session. Utilisez l'option `inherit` de l'interface Sessions pour l'effacer et revenir aux paramètres par défaut de la configuration.
- Les résumés d'échecs d'outils sont toujours affichés si pertinents, mais le texte d'échec détaillé n'est inclus que lorsque `/verbose` est `on` ou `full`.
- `/reasoning` (et `/verbose`) sont risqués dans les contextes de groupe : ils peuvent révéler un raisonnement interne ou des sorties d'outils que vous ne souhaitiez pas exposer. Il est préférable de les laisser désactivés, surtout dans les discussions de groupe.
- **Chemin rapide** : les messages contenant uniquement des commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournent la file d'attente + le model).
- **Filtrage par mention de groupe** : les messages contenant uniquement des commandes provenant d'expéditeurs autorisés contournent les exigences de mention.
- **Raccourcis en ligne (expéditeurs autorisés uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le model ne voie le texte restant.
  - Exemple : `hey /status` déclenche une réponse de statut, et le texte restant continue via le flux normal.
- Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Les messages non autorisés contenant uniquement des commandes sont ignorés silencieusement, et les jetons `/...` en ligne sont traités comme du texte brut.
- **Commandes de Skills :** Les skills `user-invocable` sont exposés en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (par ex. `_2`).
  - `/skill <name> [input]` exécute un skill par son nom (utile lorsque les limites de commandes natives empêchent les commandes par skill).
  - Par défaut, les commandes de skills sont transmises au model en tant que demande normale.
  - Les skills peuvent éventuellement déclarer `command-dispatch: tool` pour router la commande directement vers un tool (déterministe, sans model).
  - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/fr/prose).
- **Arguments de commandes natives :** Discord utilise l'autocomplétion pour les options dynamiques (et les menus à boutons lorsque vous omettez les arguments requis). Telegram et Slack affichent un menu à boutons lorsqu'une commande prend en charge des choix et que vous omettez l'argument.

## Surfaces d'utilisation (ce qui s'affiche où)

- **Utilisation/quota du provider** (exemple : « 80 % restants pour Claude ») s'affiche dans `/status` pour le provider de model actuel lorsque le suivi de l'utilisation est activé.
- **Jetons/coût par réponse** est contrôlé par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **models/auth/points de terminaison**, pas l'utilisation.

## Sélection du model (`/model`)

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

- `/model` et `/model list` affichent un sélecteur compact numéroté (famille de modèles + providers disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes pour le provider et le modèle, ainsi qu'une étape de validation (Submit).
- `/model <#>` effectue une sélection depuis ce sélecteur (et privilégie le provider actuel si possible).
- `/model status` affiche la vue détaillée, incluant le point de terminaison (endpoint) du provider configuré (`baseUrl`) et le mode API (`api`) lorsque disponibles.

## Debug overrides

`/debug` vous permet de définir des remplacements de configuration **uniquement à l'exécution** (en mémoire, pas sur disque). Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.debug: true`.

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

## Config updates

`/config` écrit dans votre configuration sur disque (`openclaw.json`). Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.config: true`.

Exemples :

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

Notes :

- La configuration est validée avant l'écriture ; les modifications invalides sont rejetées.
- Les mises à jour de `/config` persistent après les redémarrages.

## Surface notes

- Les **commandes texte** s'exécutent dans la session de chat normale (les DMs partagent `main`, les groupes ont leur propre session).
- Les **commandes natives** utilisent des sessions isolées :
  - Discord : `agent:<agentId>:discord:slash:<userId>`
  - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`)
  - Telegram : `telegram:slash:<userId>` (cible la session de chat via `CommandTargetSessionKey`)
- **`/stop`** cible la session de chat active afin qu'elle puisse interrompre l'exécution en cours.
- **Slack :** `channels.slack.slashCommand` est toujours pris en charge pour une seule commande de style `/openclaw`. Si vous activez `commands.native`, vous devez créer une commande slash Slack par commande intégrée (les mêmes noms que `/help`). Les menus d'arguments de commande pour Slack sont fournis sous forme de boutons éphémères Block Kit.
  - Exception native Slack : enregistrez `/agentstatus` (pas `/status`) car Slack réserve `/status`. Le texte `/status` fonctionne toujours dans les messages Slack.

import fr from '/components/footer/fr.mdx';

<fr />
