---
summary: "Commandes slash : texte vs natif, configuration et commandes prises en charge"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Commandes slash"
---

# Commandes Slash

Les commandes sont gérées par le Gateway. La plupart des commandes doivent être envoyées sous forme de message **autonome** commençant par `/`.
La commande de chat bash réservée à l'hôte utilise `! <cmd>` (avec `/bash <cmd>` comme alias).

Il existe deux systèmes connexes :

- **Commandes** : messages `/...` autonomes.
- **Directives** : `/think`, `/fast`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Les directives sont supprimées du message avant que le modèle ne le voie.
  - Dans les messages de chat normaux (pas uniquement des directives), elles sont traitées comme des « indices en ligne » et ne **persistent pas** les paramètres de session.
  - Dans les messages contenant uniquement des directives (le message ne contient que des directives), elles persistent dans la session et répondent par un accusé de réception.
  - Les directives ne sont appliquées que pour les **expéditeurs autorisés**. Si `commands.allowFrom` est défini, c'est la seule
    liste d'autorisation utilisée ; sinon, l'autorisation provient des listes d'autorisation/appariements de canal ainsi que de `commands.useAccessGroups`.
    Les expéditeurs non autorisés voient les directives traitées comme du texte brut.

Il existe également quelques **raccourcis en ligne** (pour les expéditeurs autorisés/liste blanche uniquement) : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
Ils s'exécutent immédiatement, sont supprimés avant que le modèle ne voie le message, et le texte restant continue le flux normal.

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
    restart: true,
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw",
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
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
  - Définissez `channels.discord.commands.native`, `channels.telegram.commands.native` ou `channels.slack.commands.native` pour remplacer par fournisseur (booléen ou `"auto"`).
  - `false` efface les commandes précédemment enregistrées sur Discord/Telegram au démarrage. Les commandes Slack sont gérées dans l'application Slack et ne sont pas supprimées automatiquement.
- `commands.nativeSkills` (par défaut `"auto"`) enregistre les commandes de **compétence** de manière native lorsque cela est pris en charge.
  - Auto : activé pour Discord/Telegram ; désactivé pour Slack (Slack nécessite de créer une commande slash par skill).
  - Définissez `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` pour remplacer par provider (booléen ou `"auto"`).
- `commands.bash` (par défaut `false`) permet à `! <cmd>` d'exécuter des commandes shell de l'hôte (`/bash <cmd>` est un alias ; nécessite des listes d'autorisation `tools.elevated`).
- `commands.bashForegroundMs` (par défaut `2000`) contrôle la durée d'attente de bash avant de passer en mode arrière-plan (`0` passe immédiatement en arrière-plan).
- `commands.config` (par défaut `false`) active `/config` (lit/écrit `openclaw.json`).
- `commands.mcp` (par défaut `false`) active `/mcp` (lit/écrit la configuration MCP gérée par OpenClaw sous `mcp.servers`).
- `commands.plugins` (par défaut `false`) active `/plugins` (découverte/état des plugins plus les contrôles d'installation + activation/désactivation).
- `commands.debug` (par défaut `false`) active `/debug` (remplacements uniquement en cours d'exécution).
- `commands.restart` (par défaut `true`) active `/restart` plus les actions de l'outil de redémarrage de la passerelle.
- `commands.ownerAllowFrom` (facultatif) définit la liste d'autorisation explicite du propriétaire pour les surfaces de commande/tool réservées au propriétaire. Ceci est distinct de `commands.allowFrom`.
- `commands.ownerDisplay` contrôle l'apparence des identifiants de propriétaire dans l'invite système : `raw` ou `hash`.
- `commands.ownerDisplaySecret` définit facultativement la clé secrète HMAC utilisée lors de `commands.ownerDisplay="hash"`.
- `commands.allowFrom` (facultatif) définit une liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, c'est la seule source d'autorisation pour les commandes et les directives (les listes d'autorisation/appariements de canal et `commands.useAccessGroups` sont ignorés). Utilisez `"*"` pour une valeur par défaut globale ; les clés spécifiques au fournisseur la remplacent.
- `commands.useAccessGroups` (par défaut `true`) applique les listes d'autorisation/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.

## Liste des commandes

Source de vérité actuelle :

- les commandes intégrées de base proviennent de `src/auto-reply/commands-registry.shared.ts`
- les commandes de dock générées proviennent de `src/auto-reply/commands-registry.data.ts`
- les commandes de plugin proviennent des appels `registerCommand()` du plugin
- la disponibilité réelle sur votre passerelle dépend toujours des indicateurs de configuration, de la surface du channel et des plugins installés/activés

### Commandes intégrées de base

Commandes intégrées disponibles aujourd'hui :

- `/new [model]` démarre une nouvelle session ; `/reset` est l'alias de réinitialisation.
- `/compact [instructions]` compresse le contexte de session. Voir [/concepts/compaction](/en/concepts/compaction).
- `/stop` interrompt l'exécution en cours.
- `/session idle <duration|off>` et `/session max-age <duration|off>` gèrent l'expiration de la liaison de fil de discussion.
- `/think <off|minimal|low|medium|high|xhigh>` définit le niveau de réflexion. Alias : `/thinking`, `/t`.
- `/verbose on|off|full` active/désactive la sortie détaillée. Alias : `/v`.
- `/trace on|off` active/désactive la sortie de trace du plugin pour la session en cours.
- `/fast [status|on|off]` affiche ou définit le mode rapide.
- `/reasoning [on|off|stream]` active/désactive la visibilité du raisonnement. Alias : `/reason`.
- `/elevated [on|off|ask|full]` active/désactive le mode élevé. Alias : `/elev`.
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` affiche ou définit les valeurs par défaut d'exécution.
- `/model [name|#|status]` affiche ou définit le model.
- `/models [provider] [page] [limit=<n>|size=<n>|all]` liste les providers ou les models pour un provider.
- `/queue <mode>` gère le comportement de la file d'attente (`steer`, `interrupt`, `followup`, `collect`, `steer-backlog`) ainsi que des options comme `debounce:2s cap:25 drop:summarize`.
- `/help` affiche le résumé de l'aide.
- `/commands` affiche le catalogue de commandes généré.
- `/tools [compact|verbose]` montre ce que l'agent actuel peut utiliser maintenant.
- `/status` affiche l'état d'exécution, y compris l'utilisation/le quota du provider lorsque disponible.
- `/tasks` liste les tâches d'arrière-plan actives/récentes pour la session actuelle.
- `/context [list|detail|json]` explique comment le contexte est assemblé.
- `/export-session [path]` exporte la session actuelle vers HTML. Alias : `/export`.
- `/whoami` affiche votre identifiant d'expéditeur. Alias : `/id`.
- `/skill <name> [input]` exécute une compétence par son nom.
- `/allowlist [list|add|remove] ...` gère les entrées de la liste d'autorisation. Texte uniquement.
- `/approve <id> <decision>` résout les invites d'approbation d'exécution.
- `/btw <question>` pose une question annexe sans changer le contexte futur de la session. Voir [/tools/btw](/en/tools/btw).
- `/subagents list|kill|log|info|send|steer|spawn` gère les exécutions de sous-agents pour la session actuelle.
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gère les sessions ACP et les options d'exécution.
- `/focus <target>` lie le fil Discord ou le sujet/conversation Telegram actuel à une cible de session.
- `/unfocus` supprime la liaison actuelle.
- `/agents` liste les agents liés au fil pour la session actuelle.
- `/kill <id|#|all>` interrompt un ou tous les sous-agents en cours d'exécution.
- `/steer <id|#> <message>` envoie des directives à un sous-agent en cours d'exécution. Alias : `/tell`.
- `/config show|get|set|unset` lit ou écrit `openclaw.json`. Réservé au propriétaire. Nécessite `commands.config: true`.
- `/mcp show|get|set|unset` lit ou écrit la config du serveur MCP gérée par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Nécessite `commands.mcp: true`.
- `/plugins list|inspect|show|get|install|enable|disable` inspecte ou modifie l'état du plugin. `/plugin` est un alias. Réservé au propriétaire pour l'écriture. Nécessite `commands.plugins: true`.
- `/debug show|set|unset|reset` gère les remplacements de configuration uniquement pour l'exécution. Propriétaire uniquement. Nécessite `commands.debug: true`.
- `/usage off|tokens|full|cost` contrôle le pied de page d'utilisation par réponse ou imprime un résumé des coûts locaux.
- `/tts on|off|status|provider|limit|summary|audio|help` contrôle le TTS. Voir [/tools/tts](/en/tools/tts).
- `/restart` redémarre OpenClaw lorsqu'il est activé. Par défaut : activé ; définissez `commands.restart: false` pour le désactiver.
- `/activation mention|always` définit le mode d'activation de groupe.
- `/send on|off|inherit` définit la stratégie d'envoi. Propriétaire uniquement.
- `/bash <command>` exécute une commande shell de l'hôte. Texte uniquement. Alias : `! <command>`. Nécessite les listes blanches `commands.bash: true` plus `tools.elevated`.
- `!poll [sessionId]` vérifie une tâche bash en arrière-plan.
- `!stop [sessionId]` arrête une tâche bash en arrière-plan.

### Commandes dock générées

Les commandes dock sont générées à partir des plugins de channel avec support des commandes natives. Ensemble groupé actuel :

- `/dock-discord` (alias : `/dock_discord`)
- `/dock-mattermost` (alias : `/dock_mattermost`)
- `/dock-slack` (alias : `/dock_slack`)
- `/dock-telegram` (alias : `/dock_telegram`)

### Commandes de plugin groupées

Les plugins groupés peuvent ajouter plus de commandes slash. Commandes groupées actuelles dans ce dépôt :

- `/dreaming [on|off|status|help]` bascule le rêve de la mémoire. Voir [Dreaming](/en/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gère le flux de couplage/configuration de l'appareil. Voir [Pairing](/en/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` arme temporairement les commandes de nœud de téléphone à haut risque.
- `/voice status|list [limit]|set <voiceId|name>` gère la configuration vocale Talk. Sur Discord, le nom de la commande native est `/talkvoice`.
- `/card ...` envoie des préréglages de cartes riches LINE. Voir [LINE](/en/channels/line).
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` inspecte et contrôle le harnais de serveur d'application Codex groupé. Voir [Codex Harness](/en/plugins/codex-harness).
- Commandes uniquement pour QQBot :
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### Commandes de compétences dynamiques

Les compétences invocables par l'utilisateur sont également exposées en tant que commandes slash :

- `/skill <name> [input]` fonctionne toujours comme point d'entrée générique.
- Les compétences peuvent également apparaître comme des commandes directes comme `/prose` lorsque la compétence/plugin les enregistre.
- L'enregistrement natif des commandes de compétences est contrôlé par `commands.nativeSkills` et `channels.<provider>.commands.nativeSkills`.

Notes :

- Les commandes acceptent un `:` optionnel entre la commande et les arguments (par ex. `/think: high`, `/send: on`, `/help:`).
- `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) ; si aucune correspondance, le texte est traité comme le corps du message.
- Pour une répartition complète de l'utilisation du fournisseur, utilisez `openclaw status --usage`.
- `/allowlist add|remove` nécessite `commands.config=true` et respecte le `configWrites` du channel.
- Dans les channels multi-comptes, `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblant la configuration respectent également le `configWrites` du compte cible.
- `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost` imprime un résumé des coûts locaux à partir des journaux de session OpenClaw.
- `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
- `/plugins install <spec>` accepte les mêmes spécifications de plugin que `openclaw plugins install` : chemin local/archive, package npm, ou `clawhub:<pkg>`.
- `/plugins enable|disable` met à jour la configuration du plugin et peut demander un redémarrage.
- Commande native uniquement Discord : `/vc join|leave|status` contrôle les canaux vocaux (nécessite `channels.discord.voice` et les commandes natives ; non disponible sous forme de texte).
- Les commandes de liaison de fil Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent que les liaisons de fil effectives soient activées (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
- Référence des commandes ACP et comportement à l'exécution : [ACP Agents](/en/tools/acp-agents).
- `/verbose` est destiné au débogage et à une visibilité supplémentaire ; gardez-le désactivé (**off**) dans une utilisation normale.
- `/trace` est plus restrictif que `/verbose` : il n'affiche que les lignes de trace/débogage appartenant aux plugins et désactive le bavardage verbeux normal des outils.
- `/fast on|off` enregistre une substitution de session. Utilisez l'option `inherit` de l'interface Sessions pour l'effacer et revenir aux valeurs par défaut de la configuration.
- `/fast` est spécifique au fournisseur : OpenAI/OpenAI Codex l'associent à `service_tier=priority` sur les points de terminaison Responses natifs, tandis que les requêtes publiques directes Anthropic, y compris le trafic authentifié OAuth envoyé à `api.anthropic.com`, l'associent à `service_tier=auto` ou `standard_only`. Voir [OpenAI](/en/providers/openai) et [Anthropic](/en/providers/anthropic).
- Les résumés d'échecs d'outils sont toujours affichés lorsque pertinent, mais le texte d'échec détaillé n'est inclus que lorsque `/verbose` est `on` ou `full`.
- `/reasoning`, `/verbose` et `/trace` sont risqués dans les contextes de groupe : ils peuvent révéler un raisonnement interne, une sortie d'outil ou des diagnostics de plugin que vous ne souhaitiez pas exposer. Préférez les laisser désactivés, surtout dans les discussions de groupe.
- `/model` enregistre immédiatement le nouveau modèle de session.
- Si l'agent est inactif, la prochaine exécution l'utilise immédiatement.
- Si une exécution est déjà active, OpenClaw marque un basculement en direct comme en attente et ne redémarre avec le nouveau modèle qu'à un point de réessai propre.
- Si l'activité de l'outil ou la sortie de réponse a déjà commencé, le basculement en attente peut rester en file d'attente jusqu'à une prochaine opportunité de réessai ou au prochain tour de l'utilisateur.
- **Chemin rapide :** les messages composés uniquement de commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournent la file d'attente + le model).
- **Filtrage par mention de groupe :** les messages composés uniquement de commandes provenant d'expéditeurs autorisés contournent les exigences de mention.
- **Raccourcis intégrés (expéditeurs autorisés uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le model ne voie le texte restant.
  - Exemple : `hey /status` déclenche une réponse d'état, et le texte restant poursuit le flux normal.
- Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Les messages composés uniquement de commandes non autorisées sont ignorés silencieusement, et les jetons `/...` intégrés sont traités comme du texte brut.
- **Commandes de Skills :** les compétences `user-invocable` sont exposées en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (par ex. `_2`).
  - `/skill <name> [input]` exécute une compétence par son nom (utile lorsque les limites de commandes natives empêchent les commandes par compétence).
  - Par défaut, les commandes de Skills sont transmises au model en tant que demande normale.
  - Les Skills peuvent éventuellement déclarer `command-dispatch: tool` pour router la commande directement vers un tool (déterministe, sans model).
  - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/en/prose).
- **Arguments de commande natifs :** Discord utilise la saisie automatique pour les options dynamiques (et les menus de boutons lorsque vous omettez les arguments requis). Telegram et Slack affichent un menu de boutons lorsqu'une commande prend en charge des choix et que vous omettez l'argument.

## `/tools`

`/tools` répond à une question d'exécution, et non à une question de configuration : **ce que cet agent peut utiliser right now dans cette conversation**.

- Le `/tools` par défaut est compact et optimisé pour un examen rapide.
- `/tools verbose` ajoute de courtes descriptions.
- Les surfaces de commandes natives qui prennent en charge les arguments exposent le même sélecteur de mode que `compact|verbose`.
- Les résultats sont limités à la session, donc la modification de l'agent, du channel, du fil de discussion, de l'autorisation de l'expéditeur ou du modèle peut changer le résultat.
- `/tools` inclut les outils réellement accessibles lors de l'exécution, y compris les outils principaux, les outils de plugin connectés et les outils appartenant au channel.

Pour la modification du profil et des remplacements, utilisez le panneau des outils de l'interface de contrôle ou les surfaces de configuration/catalogue au lieu de traiter `/tools` comme un catalogue statique.

## Surfaces d'utilisation (ce qui s'affiche où)

- **L'utilisation/quota du fournisseur** (exemple : « Claude 80 % restant ») s'affiche dans `/status` pour le fournisseur de modèle actuel lorsque le suivi de l'utilisation est activé. OpenClaw normalise les fenêtres des fournisseurs à `% left` ; pour MiniMax, les champs de pourcentage restant uniquement sont inversés avant l'affichage, et les réponses `model_remains` privilégient l'entrée du modèle de chat plus une étiquette de plan balisée par modèle.
- Les **lignes de jetons/cache** dans `/status` peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de la session en direct est clairsemé. Les valeurs dynamiques non nulles existantes priment toujours, et la solution de repli de la transcription peut également récupérer l'étiquette du modèle d'exécution active ainsi qu'un total plus orienté vers l'invite lorsque les totaux stockés sont manquants ou plus petits.
- Les **jetets/coûts par réponse** sont contrôlés par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **modèles/auth/points de terminaison**, et non l'utilisation.

## Sélection du modèle (`/model`)

`/model` est implémenté comme une directive.

Exemples :

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

Remarques :

- `/model` et `/model list` affichent un sélecteur compact et numéroté (famille de modèles + fournisseurs disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des menus déroulants pour le fournisseur et le modèle, ainsi qu'une étape de soumission.
- `/model <#>` sélectionne à partir de ce sélecteur (et privilégie le fournisseur actuel lorsque cela est possible).
- `/model status` affiche la vue détaillée, y compris le point de terminaison du fournisseur configuré (`baseUrl`) et le mode API (`api`) lorsque disponibles.

## Remplacements de débogage

`/debug` vous permet de définir des remplacements de configuration **uniquement au runtime** (en mémoire, pas sur disque). Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.debug: true`.

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

## Sortie de trace du plugin

`/trace` vous permet d'activer ou de désactiver les **lignes de trace/débogage de plugin étendues à la session** sans activer le mode complet de verbosité.

Exemples :

```text
/trace
/trace on
/trace off
```

Notes :

- `/trace` sans argument affiche l'état actuel de la trace de la session.
- `/trace on` active les lignes de trace du plugin pour la session actuelle.
- `/trace off` les désactive à nouveau.
- Les lignes de trace du plugin peuvent apparaître dans `/status` et sous forme de message de diagnostic de suivi après la réponse normale de l'assistant.
- `/trace` ne remplace pas `/debug` ; `/debug` gère toujours les remplacements de configuration uniquement au runtime.
- `/trace` ne remplace pas `/verbose` ; la sortie détaillée normale de l'outil/statut appartient toujours à `/verbose`.

## Mises à jour de la configuration

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

- La configuration est validée avant l'écriture ; les modifications non valides sont rejetées.
- Les mises à jour de `/config` persistent après les redémarrages.

## Mises à jour MCP

`/mcp` écrit les définitions de serveur MCP gérées par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.mcp: true`.

Exemples :

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

Notes :

- `/mcp` stocke la configuration dans la configuration OpenClaw, et non dans les paramètres de projet appartenant à Pi.
- Les adaptateurs d'exécution décident quels transports sont réellement exécutables.

## Mises à jour des plugins

`/plugins` permet aux opérateurs d'inspecter les plugins découverts et d'activer ou désactiver leur activation dans la configuration. Les flux en lecture seule peuvent utiliser `/plugin` comme alias. Désactivé par défaut ; activer avec `commands.plugins: true`.

Exemples :

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

Remarques :

- `/plugins list` et `/plugins show` utilisent la véritable découverte de plugins par rapport à l'espace de travail actuel ainsi qu'à la configuration sur disque.
- `/plugins enable|disable` met uniquement à jour la configuration du plugin ; il n'installe ni ne désinstalle les plugins.
- Après les modifications d'activation/désactivation, redémarrez la passerelle pour les appliquer.

## Notes sur les surfaces

- Les **commandes texte** s'exécutent dans la session de discussion normale (les DMs partagent `main`, les groupes ont leur propre session).
- Les **commandes natives** utilisent des sessions isolées :
  - Discord : `agent:<agentId>:discord:slash:<userId>`
  - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`)
  - Telegram : `telegram:slash:<userId>` (cible la session de discussion via `CommandTargetSessionKey`)
- **`/stop`** cible la session de discussion active afin de pouvoir abandonner l'exécution en cours.
- **Slack :** `channels.slack.slashCommand` est toujours pris en charge pour une seule commande de style `/openclaw`. Si vous activez `commands.native`, vous devez créer une commande slash Slack pour chaque commande intégrée (mêmes noms que `/help`). Les menus d'arguments de commande pour Slack sont transmis sous forme de boutons éphémères Block Kit.
  - Exception native Slack : enregistrez `/agentstatus` (pas `/status`) car Slack réserve `/status`. Le texte `/status` fonctionne toujours dans les messages Slack.

## Questions annexes BTW

`/btw` est une **question annexe** rapide sur la session actuelle.

Contrairement à la discussion normale :

- elle utilise la session actuelle comme contexte d'arrière-plan,
- elle s'exécute comme un appel unique et distinct **sans tool**,
- elle ne modifie pas le contexte futur de la session,
- elle n'est pas écrite dans l'historique des transcriptions,
- elle est transmise comme un résultat latéral en direct au lieu d'un message d'assistant normal.

Cela rend `/btw` utile lorsque vous souhaitez une clarification temporaire pendant que la tâche principale
se poursuit.

Exemple :

```text
/btw what are we doing right now?
```

Voir [BTW Side Questions](/en/tools/btw) pour le comportement complet et les détails de l'expérience utilisateur client.
