---
summary: "Commandes slash : texte vs natif, configuration et commandes prises en charge"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Commandes slash"
sidebarTitle: "Commandes slash"
---

Les commandes sont gérées par le Gateway. La plupart des commandes doivent être envoyées sous forme de message **autonome** commençant par `/`. La commande de chat bash réservée à l'hôte utilise `! <cmd>` (avec `/bash <cmd>` comme alias).

Lorsqu'une conversation ou un fil est lié à une session ACP, le texte de suivi normal est acheminé vers ce harnais ACP. Les commandes de gestion du Gateway restent locales : `/acp ...` atteint toujours le gestionnaire de commandes ACP OpenClaw, et `/status` ainsi que `/unfocus` restent locaux chaque fois que la gestion des commandes est activée pour la surface.

Il existe deux systèmes connexes :

<AccordionGroup>
  <Accordion title="Commandes">
    Messages `/...` autonomes.
  </Accordion>
  <Accordion title="Directives">
    `/think`, `/fast`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.

    - Les directives sont supprimées du message avant que le modèle ne le voie.
    - Dans les messages de chat normaux (pas uniquement des directives), elles sont traitées comme des « indices en ligne » et ne **pas** persistent les paramètres de session.
    - Dans les messages contenant uniquement des directives (le message ne contient que des directives), elles persistent dans la session et répondent par un accusé de réception.
    - Les directives ne sont appliquées que pour les **expéditeurs autorisés**. Si `commands.allowFrom` est défini, c'est la seule liste d'autorisation utilisée ; sinon, l'autorisation provient des listes d'autorisation/appairage de canal ainsi que de `commands.useAccessGroups`. Les expéditeurs non autorisés voient les directives traitées comme du texte brut.

  </Accordion>
  <Accordion title="Raccourcis en ligne">
    Expéditeurs autorisés uniquement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).

    Ils s'exécutent immédiatement, sont supprimés avant que le model ne voie le message, et le texte restant continue via le flux normal.

  </Accordion>
</AccordionGroup>

## Configuration

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

<ParamField path="commands.text" type="boolean" default="true">
  Active l'analyse de `/...` dans les messages de discussion. Sur les surfaces sans commandes natives (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), les commandes texte fonctionnent toujours même si vous définissez ceci sur `false`.
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  Enregistre les commandes natives. Auto : activé pour Discord/Telegram ; désactivé pour Slack (jusqu'à ce que vous ajoutiez des commandes slash) ; ignoré pour les fournisseurs sans support natif. Définissez `channels.discord.commands.native`, `channels.telegram.commands.native` ou `channels.slack.commands.native` pour remplacer par fournisseur (booléen ou `"auto"`). `false` efface les commandes précédemment enregistrées sur Discord/Telegram au démarrage. Les commandes Slack sont gérées dans l'application Slack et ne sont pas supprimées automatiquement.
</ParamField>
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  Enregistre les commandes de **compétence** (skill) de manière native lorsque supporté. Auto : activé pour Discord/Telegram ; désactivé pour Slack (Slack nécessite la création d'une commande slash par compétence). Définissez `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` pour remplacer par fournisseur (booléen ou `"auto"`).
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  Active `! <cmd>` pour exécuter des commandes shell de l'hôte (`/bash <cmd>` est un alias ; nécessite des listes blanches `tools.elevated`).
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  Contrôle la durée d'attente de bash avant de passer en mode arrière-plan (`0` passe immédiatement en arrière-plan).
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  Active `/config` (lit/écrit `openclaw.json`).
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  Active `/mcp` (lit/écrit la config MCP gérée par OpenClaw sous `mcp.servers`).
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  Active `/plugins` (découverte/statut des plugins plus contrôles d'installation + activation/désactivation).
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  Active `/debug` (remplacements uniquement à l'exécution).
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  Active `/restart` ainsi que les actions de l'outil de redémarrage de la passerelle.
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  Définit la liste blanche explicite des propriétaires pour les surfaces de commandes/outils réservés aux propriétaires. Séparé de `commands.allowFrom`.
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  Par canal : fait en sorte que les commandes réservées aux propriétaires nécessitent une **identité de propriétaire** pour s'exécuter sur cette surface. Lorsque `true`, l'expéditeur doit correspondre soit à un candidat propriétaire résolu (par exemple une entrée dans `commands.ownerAllowFrom` ou les métadonnées de propriétaire natives du fournisseur), soit détenir la portée interne `operator.admin` sur un canal de message interne. Une entrée générique dans le canal `allowFrom`, ou une liste de candidats propriétaires vide ou non résolue, n'est **pas** suffisante — les commandes réservées aux propriétaires échouent en mode fermé sur ce canal. Désactivez ceci si vous voulez que les commandes réservées aux propriétaires soient limitées uniquement par `ownerAllowFrom` et les listes blanches de commandes standard.
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  Contrôle l'apparence des identifiants de propriétaire dans l'invite système.
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  Définit facultativement le secret HMAC utilisé lors de `commands.ownerDisplay="hash"`.
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  Liste blanche par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, c'est la seule source d'autorisation pour les commandes et les directives (les listes blanches/appariements de canaux et `commands.useAccessGroups` sont ignorés). Utilisez `"*"` pour une valeur par défaut globale ; les clés spécifiques au fournisseur la remplacent.
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  Applique les listes blanches/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.
</ParamField>

## Liste de commandes

Source actuelle de vérité :

- les commandes intégrées de base proviennent de `src/auto-reply/commands-registry.shared.ts`
- les commandes de dock générées proviennent de `src/auto-reply/commands-registry.data.ts`
- les commandes de plugin proviennent des appels `registerCommand()` du plugin
- la disponibilité réelle sur votre passerelle dépend toujours des indicateurs de configuration, de la surface du channel et des plugins installés/activés

### Commandes intégrées de base

<AccordionGroup>
  <Accordion title="Sessions et exécutions">
    - `/new [model]` démarre une nouvelle session ; `/reset` est l'alias de réinitialisation.
    - `/reset soft [message]` conserve la transcription actuelle, abandonne les identifiants de session backend CLI réutilisés et relance le chargement du démarrage/system-prompt en place.
    - `/compact [instructions]` compacte le contexte de la session. Voir [Compaction](/fr/concepts/compaction).
    - `/stop` interrompt l'exécution actuelle.
    - `/session idle <duration|off>` et `/session max-age <duration|off>` gèrent l'expiration de la liaison de thread.
    - `/export-session [path]` exporte la session actuelle au format HTML. Alias : `/export`.
    - `/export-trajectory [path]` exporte un [bundle de trajectoire](/fr/tools/trajectory) JSONL pour la session actuelle. Alias : `/trajectory`.
  </Accordion>
  <Accordion title="Modèle et contrôles d'exécution">
    - `/think <level>` définit le niveau de réflexion. Les options proviennent du profil du fournisseur du modèle actif ; les niveaux courants sont `off`, `minimal`, `low`, `medium` et `high`, avec des niveaux personnalisés tels que `xhigh`, `adaptive`, `max` ou binaire `on` uniquement lorsqu'ils sont pris en charge. Alias : `/thinking`, `/t`.
    - `/verbose on|off|full` active/désactive la sortie verbeuse. Alias : `/v`.
    - `/trace on|off` active/désactive la sortie de trace du plugin pour la session actuelle.
    - `/fast [status|on|off]` affiche ou définit le mode rapide.
    - `/reasoning [on|off|stream]` active/désactive la visibilité du raisonnement. Alias : `/reason`.
    - `/elevated [on|off|ask|full]` active/désactive le mode élevé. Alias : `/elev`.
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` affiche ou définit les valeurs par défaut d'exécution.
    - `/model [name|#|status]` affiche ou définit le modèle.
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` liste les fournisseurs ou les modèles pour un fournisseur.
    - `/queue <mode>` gère le comportement de la file d'attente (`steer`, `interrupt`, `followup`, `collect`, `steer-backlog`) ainsi que des options telles que `debounce:2s cap:25 drop:summarize`.
  </Accordion>
  <Accordion title="Découverte et statut">
    - `/help` affiche le résumé de l'aide.
    - `/commands` affiche le catalogue de commandes généré.
    - `/tools [compact|verbose]` montre ce que l'agent actuel peut utiliser maintenant.
    - `/status` affiche le statut d'exécution, y compris les étiquettes `Execution`/`Runtime` et l'utilisation/le quota du provider si disponibles.
    - `/crestodian <request>` exécute l'assistant de configuration et de réparation Crestodian depuis un DM de propriétaire.
    - `/tasks` liste les tâches d'arrière-plan actives/récentes pour la session actuelle.
    - `/context [list|detail|json]` explique comment le contexte est assemblé.
    - `/whoami` affiche votre identifiant d'expéditeur. Alias : `/id`.
    - `/usage off|tokens|full|cost` contrôle le pied de page d'utilisation par réponse ou imprime un résumé des coûts locaux.
  </Accordion>
  <Accordion title="Skills, listes d'autorisation, approbations">
    - `/skill <name> [input]` exécute une skill par son nom.
    - `/allowlist [list|add|remove] ...` gère les entrées de la liste d'autorisation. Texte uniquement.
    - `/approve <id> <decision>` résout les invites d'approbation d'exécution.
    - `/btw <question>` pose une question latérale sans changer le contexte futur de la session. Voir [BTW](/fr/tools/btw).
  </Accordion>
  <Accordion title="Sous-agents et ACP">
    - `/subagents list|kill|log|info|send|steer|spawn` gère les exécutions de sous-agents pour la session actuelle.
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gère les sessions ACP et les options d'exécution.
    - `/focus <target>` lie le fil Discord actuel ou le sujet/conversation Telegram à une cible de session.
    - `/unfocus` supprime la liaison actuelle.
    - `/agents` liste les agents liés aux fils pour la session actuelle.
    - `/kill <id|#|all>` abandonne un ou tous les sous-agents en cours d'exécution.
    - `/steer <id|#> <message>` envoie des directives à un sous-agent en cours d'exécution. Alias : `/tell`.
  </Accordion>
  <Accordion title="Écritures réservées au propriétaire et admin">
    - `/config show|get|set|unset` lit ou écrit `openclaw.json`. Réservé au propriétaire. Nécessite `commands.config: true`.
    - `/mcp show|get|set|unset` lit ou écrit la configuration du serveur MCP gérée par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Nécessite `commands.mcp: true`.
    - `/plugins list|inspect|show|get|install|enable|disable` inspecte ou modifie l'état du plugin. `/plugin` est un alias. Réservé au propriétaire pour les écritures. Nécessite `commands.plugins: true`.
    - `/debug show|set|unset|reset` gère les remplacements de configuration uniquement au runtime. Réservé au propriétaire. Nécessite `commands.debug: true`.
    - `/restart` redémarre OpenClaw lorsqu'il est activé. Par défaut : activé ; définissez `commands.restart: false` pour le désactiver.
    - `/send on|off|inherit` définit la politique d'envoi. Réservé au propriétaire.
  </Accordion>
  <Accordion title="Voix, TTS, contrôle du channel">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` contrôle le TTS. Voir [TTS](/fr/tools/tts).
    - `/activation mention|always` définit le mode d'activation de groupe.
    - `/bash <command>` exécute une commande shell de l'hôte. Texte uniquement. Alias : `! <command>`. Nécessite `commands.bash: true` plus les listes blanches `tools.elevated`.
    - `!poll [sessionId]` vérifie une tâche bash en arrière-plan.
    - `!stop [sessionId]` arrête une tâche bash en arrière-plan.
  </Accordion>
</AccordionGroup>

### Commandes de dock générées

Les commandes de dock sont générées à partir des plugins de channel avec prise en charge des commandes natives. Ensemble groupé actuel :

- `/dock-discord` (alias : `/dock_discord`)
- `/dock-mattermost` (alias : `/dock_mattermost`)
- `/dock-slack` (alias : `/dock_slack`)
- `/dock-telegram` (alias : `/dock_telegram`)

### Commandes de plugin groupées

Les plugins groupés peuvent ajouter davantage de commandes slash. Commandes groupées actuelles dans ce dépôt :

- `/dreaming [on|off|status|help]` active/désactive le rêve de la mémoire. Voir [Dreaming](/fr/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gère le flux de couplage/configuration de l'appareil. Voir [Couplage](/fr/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` arme temporairement les commandes à haut risque du nœud téléphonique.
- `/voice status|list [limit]|set <voiceId|name>` gère la configuration vocale de Talk. Sur Discord, le nom de la commande native est `/talkvoice`.
- `/card ...` envoie des préréglages de cartes riches LINE. Voir [LINE](/fr/channels/line).
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` inspecte et contrôle le harnais de serveur d'application Codex fourni. Voir [Harnais Codex](/fr/plugins/codex-harness).
- Commandes exclusives à QQBot :
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### Commandes de compétence dynamiques

Les compétences invocables par l'utilisateur sont également exposées en tant que commandes slash :

- `/skill <name> [input]` fonctionne toujours comme point d'entrée générique.
- les compétences peuvent également apparaître sous forme de commandes directes comme `/prose` lorsque la compétence/le plugin les enregistre.
- l'enregistrement natif des commandes de compétence est contrôlé par `commands.nativeSkills` et `channels.<provider>.commands.nativeSkills`.

<AccordionGroup>
  <Accordion title="Notes sur les arguments et l'analyse">
    - Les commandes acceptent un `:` optionnel entre la commande et les arguments (par ex. `/think: high`, `/send: on`, `/help:`).
    - `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) ; si aucune correspondance n'est trouvée, le texte est traité comme le corps du message.
    - Pour une ventilation complète de l'utilisation du fournisseur, utilisez `openclaw status --usage`.
    - `/allowlist add|remove` nécessite `commands.config=true` et respecte le `configWrites` du canal.
    - Dans les canaux multi-comptes, `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblés sur la configuration respectent également le `configWrites` du compte cible.
    - `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost` imprime un résumé local des coûts à partir des journaux de session OpenClaw.
    - `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
    - `/plugins install <spec>` accepte les mêmes spécifications de plugin que `openclaw plugins install` : chemin d'accès local/archive, package npm, ou `clawhub:<pkg>`.
    - `/plugins enable|disable` met à jour la configuration du plugin et peut demander un redémarrage.
  </Accordion>
  <Accordion title="Comportement spécifique au canal">
    - Commande native exclusive à Discord : `/vc join|leave|status` contrôle les canaux vocaux (non disponible sous forme de texte). `join` nécessite une guilde et un canal vocal/stade sélectionné. Nécessite `channels.discord.voice` et les commandes natives.
    - Commandes de liaison de fil Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent que les liaisons de fil effectives soient activées (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
    - Référence des commandes ACP et comportement d'exécution : [agents ACP](/fr/tools/acp-agents).
  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` est destiné au débogage et à une visibilité accrue ; gardez-le désactivé (**off**) en utilisation normale.
    - `/trace` est plus restreint que `/verbose` : il n'affiche que les lignes de trace/débogage appartenant aux plugins et désactive les bavardages verbeux normaux des outils.
    - `/fast on|off` rend une substitution de session persistante. Utilisez l'option `inherit` de l'interface Sessions pour l'effacer et revenir aux valeurs par défaut de la configuration.
    - `/fast` est spécifique au fournisseur : OpenAI/OpenAI Codex le mappent vers `service_tier=priority` sur les points de terminaison natifs Responses, tandis que les requêtes publiques directes Anthropic, y compris le trafic authentifié via OAuth envoyé à `api.anthropic.com`, le mappent vers `service_tier=auto` ou `standard_only`. Voir [OpenAI](/fr/providers/openai) et [Anthropic](/fr/providers/anthropic).
    - Les résumés d'échecs d'outils sont toujours affichés lorsque pertinent, mais le texte d'échec détaillé n'est inclus que lorsque `/verbose` est `on` ou `full`.
    - `/reasoning`, `/verbose` et `/trace` sont risqués dans les contextes de groupe : ils peuvent révéler le raisonnement interne, la sortie des outils ou les diagnostics des plugins que vous ne souhaitiez pas exposer. Il est préférable de les laisser désactivés, surtout dans les discussions de groupe.
  </Accordion>
  <Accordion title="Model switching">
    - `/model` rend persistant le nouveau modèle de session immédiatement.
    - Si l'agent est inactif, l'exécution suivante l'utilise tout de suite.
    - Si une exécution est déjà active, OpenClaw marque un basculement en direct comme en attente et ne redémarre vers le nouveau modèle qu'à un point de réessayage propre.
    - Si l'activité de l'outil ou la sortie de la réponse a déjà commencé, le basculement en attente peut rester en file jusqu'à une opportunité de réessayage ultérieure ou au prochain tour de l'utilisateur.
    - Dans le TUI local, `/crestodian [request]` retourne du TUI de l'agent normal vers Crestodian. Cela est distinct du mode de secours du canal de messages et n'accorde pas d'autorité de configuration à distance.
  </Accordion>
  <Accordion title="Chemin rapide et raccourcis en ligne">
    - **Chemin rapide :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournent la file d'attente et le model).
    - **Filtrage par mention de groupe :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés contournent les exigences de mention.
    - **Raccourcis en ligne (expéditeurs autorisés uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le model ne voie le texte restant.
      - Exemple : `hey /status` déclenche une réponse de statut, et le texte restant continue selon le flux normal.
    - Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
    - Les messages contenant uniquement des commandes non autorisées sont ignorés silencieusement, et les jetons `/...` en ligne sont traités comme du texte brut.
  </Accordion>
  <Accordion title="Commandes de Skills et arguments natifs">
    - **Commandes de Skills :** les skills `user-invocable` sont exposées en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (par ex. `_2`).
      - `/skill <name> [input]` exécute une skill par son nom (utile lorsque les limites de commandes natives empêchent les commandes par skill).
      - Par défaut, les commandes de skill sont transmises au model en tant que requête normale.
      - Les skills peuvent éventuellement déclarer `command-dispatch: tool` pour acheminer la commande directement vers un tool (déterministe, sans model).
      - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/fr/prose).
    - **Arguments de commandes natifs :** Discord utilise l'autocomplétion pour les options dynamiques (et les menus à boutons lorsque vous omettez les arguments requis). Telegram et Slack affichent un menu à boutons lorsqu'une commande prend en charge les choix et que vous omettez l'argument. Les choix dynamiques sont résolus par rapport au model de la session cible, donc les options spécifiques au model telles que les niveaux `/think` suivent le remplacement `/model` de cette session.
  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` répond à une question d'exécution, et non de configuration : **ce que cet agent peut utiliser maintenant dans cette conversation**.

- Le `/tools` par défaut est compact et optimisé pour une exploration rapide.
- `/tools verbose` ajoute des descriptions courtes.
- Les surfaces de commandes natives qui prennent en charge les arguments exposent le même sélecteur de mode que `compact|verbose`.
- Les résultats sont limités à la session, donc le changement d'agent, de channel, de fil, de l'autorisation de l'expéditeur ou de modèle peut modifier la sortie.
- `/tools` inclut les outils réellement accessibles lors de l'exécution, y compris les outils principaux, les outils de plugin connectés et les outils appartenant au channel.

Pour la modification du profil et des substitutions, utilisez le panneau Outils de l'interface de contrôle ou les surfaces de configuration/catalogue au lieu de traiter `/tools` comme un catalogue statique.

## Surfaces d'utilisation (ce qui s'affiche où)

- **L'utilisation/quota du fournisseur** (exemple : « Claude 80 % restants ») s'affiche dans `/status` pour le fournisseur de modèle actuel lorsque le suivi de l'utilisation est activé. OpenClaw normalise les fenêtres du fournisseur à `% left` ; pour MiniMax, les champs de pourcentage « restant uniquement » sont inversés avant l'affichage, et les réponses `model_remains` préfèrent l'entrée du modèle de chat plus une étiquette de plan balisée par modèle.
- **Les lignes de jetons/cache** dans `/status` peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de session en direct est clairsemé. Les valeurs en direct non nulles existantes l'emportent toujours, et la repli vers la transcription peut également récupérer l'étiquette de modèle d'exécution active ainsi qu'un total orienté prompt plus important lorsque les totaux stockés sont manquants ou plus petits.
- **Exécution vs exécution (runtime) :** `/status` signale `Execution` pour le chemin effectif du bac à sable et `Runtime` pour celui qui exécute réellement la session : `OpenClaw Pi Default`, `OpenAI Codex`, un backend CLI, ou un backend ACP.
- **Les jetets/coût par réponse** sont contrôlés par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **modèles/auth/points de terminaison**, et non l'utilisation.

## Sélection du modèle (`/model`)

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

Remarques :

- `/model` et `/model list` affichent un sélecteur compact et numéroté (famille de modèles + fournisseurs disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des menus déroulants pour le fournisseur et le modèle, ainsi qu'une étape de soumission.
- `/model <#>` effectue une sélection à partir de ce sélecteur (et privilégie le fournisseur actuel si possible).
- `/model status` affiche la vue détaillée, y compris le point de terminaison du fournisseur configuré (`baseUrl`) et le mode API (`api`) si disponible.

## Débogage des remplacements

`/debug` vous permet de définir des remplacements de configuration **uniquement pour l'exécution** (en mémoire, pas sur le disque). Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.debug: true`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>Les remplacements s'appliquent immédiatement aux nouvelles lectures de configuration, mais n'écrivent **pas** dans `openclaw.json`. Utilisez `/debug reset` pour effacer tous les remplacements et revenir à la configuration sur disque.</Note>

## Sortie du traçage du plugin

`/trace` vous permet d'activer ou de désactiver les **lignes de traçage/débogage de plugin limitées à la session** sans activer le mode complet de verbosité.

Exemples :

```text
/trace
/trace on
/trace off
```

Remarques :

- `/trace` sans argument affiche l'état du traçage de la session actuelle.
- `/trace on` active les lignes de traçage du plugin pour la session actuelle.
- `/trace off` les désactive à nouveau.
- Les lignes de traçage du plugin peuvent apparaître dans `/status` et sous forme de message de diagnostic de suite après la réponse normale de l'assistant.
- `/trace` ne remplace pas `/debug` ; `/debug` gère toujours les remplacements de configuration uniquement pour l'exécution.
- `/trace` ne remplace pas `/verbose` ; la sortie verbale normale de l'outil/statut appartient toujours à `/verbose`.

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

<Note>La configuration est validée avant l'écriture ; les modifications non valides sont rejetées. Les mises à jour de `/config` persistent après les redémarrages.</Note>

## Mises à jour MCP

`/mcp` écrit les définitions de serveurs MCP gérées par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Désactivé par défaut ; à activer avec `commands.mcp: true`.

Exemples :

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp` stocke la configuration dans la configuration OpenClaw, et non dans les paramètres de projet possédés par Pi. Les adaptateurs d'exécution décident quels transports sont réellement exécutables.</Note>

## Mises à jour de plugins

`/plugins` permet aux opérateurs d'inspecter les plugins découverts et de basculer leur activation dans la configuration. Les flux en lecture seule peuvent utiliser `/plugin` comme alias. Désactivé par défaut ; à activer avec `commands.plugins: true`.

Exemples :

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>- `/plugins list` et `/plugins show` utilisent la véritable découverte de plugins sur l'espace de travail actuel ainsi que la configuration sur disque. - `/plugins enable|disable` met à jour uniquement la configuration du plugin ; il n'installe ni ne désinstalle les plugins. - Après les modifications d'activation/désactivation, redémarrez la passerelle pour les appliquer.</Note>

## Notes sur les surfaces

<AccordionGroup>
  <Accordion title="Sessions par surface">
    - Les **commandes textuelles** s'exécutent dans la session de chat normale (les DMs partagent `main`, les groupes ont leur propre session).
    - Les **commandes natives** utilisent des sessions isolées :
      - Discord : `agent:<agentId>:discord:slash:<userId>`
      - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`)
      - Telegram : `telegram:slash:<userId>` (cible la session de chat via `CommandTargetSessionKey`)
    - **`/stop`** cible la session de chat active afin qu'elle puisse interrompre l'exécution en cours.
  </Accordion>
  <Accordion title="Spécificités Slack">
    `channels.slack.slashCommand` est toujours pris en charge pour une commande unique de style `/openclaw`. Si vous activez `commands.native`, vous devez créer une commande slash Slack par commande intégrée (les mêmes noms que `/help`). Les menus d'arguments de commande pour Slack sont livrés sous forme de boutons éphémères du Block Kit.

    Exception native Slack : enregistrez `/agentstatus` (pas `/status`) car Slack réserve `/status`. Le texte `/status` fonctionne toujours dans les messages Slack.

  </Accordion>
</AccordionGroup>

## Questions BTW

`/btw` est une **question BTW** rapide sur la session actuelle.

Contrairement au chat normal :

- il utilise la session actuelle comme contexte de fond,
- il s'exécute comme un appel unique séparé **sans outil**,
- il ne modifie pas le contexte futur de la session,
- il n'est pas écrit dans l'historique des transcriptions,
- il est délivré comme un résultat latéral en direct plutôt que comme un message d'assistant normal.

Cela rend `/btw` utile lorsque vous souhaitez une clarification temporaire pendant que la tâche principale se poursuit.

Exemple :

```text
/btw what are we doing right now?
```

Voir [Questions BTW latérales](/fr/tools/btw) pour le comportement complet et les détails de l'expérience utilisateur client.

## Connexes

- [Créer des compétences](/fr/tools/creating-skills)
- [Compétences](/fr/tools/skills)
- [Configuration des compétences](/fr/tools/skills-config)
