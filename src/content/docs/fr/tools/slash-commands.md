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
  Active l'analyse de `/...` dans les messages de chat. Sur les interfaces sans commandes natives (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), les commandes textuelles fonctionnent toujours même si vous définissez ceci sur `false`.
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  Enregistre les commandes natives. Auto : activé pour Discord/Telegram ; désactivé pour Slack (jusqu'à ce que vous ajoutiez des commandes slash) ; ignoré pour les fournisseurs sans support natif. Définissez `channels.discord.commands.native`, `channels.telegram.commands.native` ou `channels.slack.commands.native` pour remplacer par fournisseur (booléen ou `"auto"`). Sur Discord, `false` ignore l'enregistrement et le nettoyage des commandes slash lors du démarrage ; les commandes précédemment enregistrées peuvent rester visibles jusqu'à ce que vous les supprimiez de l'application Discord. Les commandes Slack sont gérées dans l'application Slack et ne sont pas supprimées automatiquement.
</ParamField>
Sur Discord, les spécifications de commandes natives peuvent inclure `descriptionLocalizations`, que OpenClaw publie en tant que Discord `description_localizations` et inclut dans les comparaisons de réconciliation.
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  Enregistre les commandes de **compétence** de manière native lorsque pris en charge. Auto : activé pour Discord/Telegram ; désactivé pour Slack (Slack nécessite de créer une commande slash par compétence). Définissez `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` pour remplacer par fournisseur (booléen ou `"auto"`).
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  Active `! <cmd>` pour exécuter des commandes shell de l'hôte (`/bash <cmd>` est un alias ; nécessite des listes d'autorisation `tools.elevated`).
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  Contrôle la durée d'attente de bash avant de passer en mode arrière-plan (`0` passe immédiatement en arrière-plan).
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  Active `/config` (lit/écrit `openclaw.json`).
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  Active `/mcp` (lit/écrit la configuration MCP gérée par OpenClaw sous `mcp.servers`).
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  Active `/plugins` (découverte/état des plugins plus contrôles d'installation + activation/désactivation).
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  Active `/debug` (remplacements uniquement à l'exécution).
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  Active `/restart` ainsi que les actions de l'outil de redémarrage de la passerelle.
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  Définit la liste d'autorisation explicite du propriétaire pour les surfaces de commande réservées au propriétaire et les actions de canal soumises au propriétaire. Il s'agit du compte de l'opérateur humain qui peut approuver les actions dangereuses et exécuter des commandes telles que `/diagnostics`, `/export-trajectory` et `/config`. Il est distinct de `commands.allowFrom` et de l'accès d'appariement DM.
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  Par canal : exige que les commandes réservées au propriétaire nécessitent une **identité de propriétaire** pour s'exécuter sur cette surface. Lorsque `true`, l'expéditeur doit soit correspondre à un candidat propriétaire résolu (par exemple une entrée dans `commands.ownerAllowFrom` ou les métadonnées de propriétaire natives du fournisseur), soit détenir l'étendue interne `operator.admin` sur un canal de message interne. Une entrée générique dans le canal `allowFrom`, ou une liste de candidats propriétaires vide ou non résolue, n'est **pas** suffisante — les commandes réservées au propriétaire échouent en mode fermé sur ce canal. Désactivez ceci si vous voulez que les commandes réservées au propriétaire ne soient régies que par `ownerAllowFrom` et les listes d'autorisation de commandes standard.
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  Contrôle l'apparence des identifiants de propriétaire dans l'invite système.
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  Définit facultativement le secret HMAC utilisé lors de `commands.ownerDisplay="hash"`.
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  Liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, c'est la seule source d'autorisation pour les commandes et les directives (les listes d'autorisation/appariement de canal et `commands.useAccessGroups` sont ignorés). Utilisez `"*"` pour une valeur par défaut globale ; les clés spécifiques au fournisseur la remplacent.
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  Applique les listes d'autorisation/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.
</ParamField>

## Liste de commandes

Source actuelle de vérité :

- les commandes intégrées de base proviennent de `src/auto-reply/commands-registry.shared.ts`
- les commandes générées du dock proviennent de `src/auto-reply/commands-registry.data.ts`
- les commandes de plugin proviennent des appels `registerCommand()` du plugin
- la disponibilité réelle sur votre passerelle dépend toujours des indicateurs de configuration, de la surface du channel et des plugins installés/activés

### Commandes intégrées de base

<AccordionGroup>
  <Accordion title="Sessions et exécutions">
    - `/new [model]` archive la session actuelle et en démarre une nouvelle ; `/reset` efface la session actuelle sur place. Ce ne sont pas des alias.
    - L'interface de contrôle intercepte les `/new` tapés pour créer et basculer vers une nouvelle session de tableau de bord, sauf si `session.dmScope: "main"` est configuré et que le parent actuel est la session principale de l'agent ; dans ce cas, `/new` réinitialise la session principale sur place. Le `/reset` tapé exécute toujours la réinitialisation sur place du Gateway.
    - `/reset soft [message]` conserve la transcription actuelle, supprime les identifiants de session backend CLI réutilisés et recharge le démarrage/systeme-prompt sur place.
    - `/compact [instructions]` compresse le contexte de la session. Voir [Compression](/fr/concepts/compaction).
    - `/stop` annule l'exécution actuelle.
    - `/session idle <duration|off>` et `/session max-age <duration|off>` gèrent l'expiration de la liaison de discussion.
    - `/export-session [path]` exporte la session actuelle au format HTML. Alias : `/export`.
    - `/export-trajectory [path]` demande une approbation d'exécution, puis exporte un [paquet de trajectoire](/fr/tools/trajectory) JSONL pour la session actuelle. Utilisez-le lorsque vous avez besoin de la chronologie du prompt, de l'outil et de la transcription pour une session OpenClaw. Dans les discussions de groupe, l'invite d'approbation et le résultat de l'exportation sont envoyés en privé au propriétaire. Alias : `/trajectory`.

  </Accordion>
  <Accordion title="Modèle et contrôles d'exécution">
    - `/think <level|default>` définit le niveau de réflexion ou efface la substitution de session. Les options proviennent du profil du fournisseur du modèle actif ; les niveaux courants sont `off`, `minimal`, `low`, `medium` et `high`, avec des niveaux personnalisés tels que `xhigh`, `adaptive`, `max` ou binaire `on` uniquement lorsqu'ils sont pris en charge. Alias : `/thinking`, `/t`.
    - `/verbose on|off|full` active/désactive la sortie détaillée. Les expéditeurs de canal externes autorisés peuvent rendre persistante la substitution de session ; les clients internes de passerine/webchat ont besoin de `operator.admin`. Alias : `/v`.
    - `/trace on|off` active/désactive la sortie de trace du plugin pour la session actuelle.
    - `/fast [status|on|off|default]` affiche, définit ou efface le mode rapide.
    - `/reasoning [on|off|stream]` active/désactive la visibilité du raisonnement. Alias : `/reason`.
    - `/elevated [on|off|ask|full]` active/désactive le mode élevé. Alias : `/elev`.
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` affiche ou définit les valeurs par défaut d'exécution.
    - `/model [name|#|status]` affiche ou définit le modèle.
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` liste les fournisseurs configurés/disponibles via l'authentification ou les modèles d'un fournisseur ; ajoutez `all` pour parcourir le catalogue complet de ce fournisseur. Les entrées `provider/*` dans `agents.defaults.models` font que `/model` et `/models` n'affichent les modèles découverts que pour ces fournisseurs.
    - `/queue <mode>` gère le comportement de la file d'attente d'exécution active (`steer`, `followup`, `collect`, `interrupt`) ainsi que des options comme `debounce:0.5s cap:25 drop:summarize` ; `/queue default` ou `/queue reset` efface la substitution de session. Les invites en cours d'exécution dirigent par défaut sans directive de file d'attente. Voir [File d'attente de commandes](/fr/concepts/queue) et [File d'attente de direction](/fr/concepts/queue-steering).
    - `/steer <message>` injecte des instructions dans l'exécution active pour la session actuelle, indépendamment du mode `/queue`. Si la direction n'est pas disponible ou si la session est inactive, `<message>` continue comme une invite normale. Alias : `/tell`. Voir [Diriger](/fr/tools/steer).

  </Accordion>
  <Accordion title="Discovery and status">
    - `/help` affiche le résumé de l'aide courte.
    - `/commands` affiche le catalogue de commandes généré.
    - `/tools [compact|verbose]` affiche ce que l'agent actuel peut utiliser maintenant.
    - `/status` affiche l'état d'exécution/exécution, la disponibilité du Gateway et du système, ainsi que l'utilisation/le quota du fournisseur si disponibles.
    - `/diagnostics [note]` est le flux de rapport de support réservé au propriétaire pour les bugs du Gateway et les exécutions du harnais Codex. Il demande une approbation exéc explicite à chaque fois avant d'exécuter `openclaw gateway diagnostics export --json` ; n'approuvez pas les diagnostics avec une règle autorisant tout. Après approbation, il envoie un rapport collable avec le chemin du bundle local, le résumé du manifeste, les notes de confidentialité et les identifiants de session pertinents. Dans les chats de groupe, l'invite d'approbation et le rapport sont envoyés au propriétaire en privé. Lorsque la session active utilise le harnais Codex OpenAI, la même approbation envoie également les commentaires Codex pertinents aux serveurs OpenAI et la réponse terminée liste les identifiants de session OpenClaw, les identifiants de thread Codex et les commandes `codex resume <thread-id>`. Voir [Diagnostics Export](/fr/gateway/diagnostics).
    - `/crestodian <request>` exécute l'assistant de configuration et de réparation Crestodian depuis un MP de propriétaire.
    - `/tasks` liste les tâches d'arrière-plan actives/récentes pour la session actuelle.
    - `/context [list|detail|map|json]` explique comment le contexte est assemblé. `map` envoie une image de treemap du contexte de la session actuelle.
    - `/whoami` affiche votre identifiant d'expéditeur. Alias : `/id`.
    - `/usage off|tokens|full|cost` contrôle le pied de page d'utilisation par réponse ou imprime un résumé des coûts locaux.

  </Accordion>
  <Accordion title="Compétences, listes d'autorisation, approbations">
    - `/skill <name> [input]` exécute une compétence par son nom.
    - `/allowlist [list|add|remove] ...` gère les entrées de la liste d'autorisation. Texte uniquement.
    - `/approve <id> <decision>` résout les invites d'approbation exec ou de plugin.
    - `/btw <question>` pose une question annexe sans modifier le contexte de la session future. Alias : `/side`. Voir [BTW](/fr/tools/btw).

  </Accordion>
  <Accordion title="Sous-agents et ACP">
    - `/subagents list|log|info` inspecte les exécutions de sous-agents pour la session actuelle.
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gère les sessions ACP et les options d'exécution.
    - `/focus <target>` lie le fil Discord ou le sujet/conversation Telegram actuel à une cible de session.
    - `/unfocus` supprime la liaison actuelle.
    - `/agents` liste les agents liés au fil pour la session actuelle.

  </Accordion>
  <Accordion title="Écritures propriétaire uniquement et admin">
    - `/config show|get|set|unset` lit ou écrit `openclaw.json`. Propriétaire uniquement. Nécessite `commands.config: true`.
    - `/mcp show|get|set|unset` lit ou écrit la configuration du serveur MCP gérée par OpenClaw sous `mcp.servers`. Propriétaire uniquement. Nécessite `commands.mcp: true`.
    - `/plugins list|inspect|show|get|install|enable|disable` inspecte ou modifie l'état du plugin. `/plugin` est un alias. Propriétaire uniquement pour les écritures. Nécessite `commands.plugins: true`.
    - `/debug show|set|unset|reset` gère les remplacements de configuration uniquement à l'exécution. Propriétaire uniquement. Nécessite `commands.debug: true`.
    - `/restart` redémarre OpenClaw lorsque activé. Par défaut : activé ; définissez `commands.restart: false` pour le désactiver.
    - `/send on|off|inherit` définit la politique d'envoi. Propriétaire uniquement.

  </Accordion>
  <Accordion title="Voix, TTS, contrôle de channel">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` contrôle le TTS. Voir [TTS](/fr/tools/tts).
    - `/activation mention|always` définit le mode d'activation de groupe.
    - `/bash <command>` exécute une commande shell de l'hôte. Texte uniquement. Alias : `! <command>`. Nécessite les listes blanches `commands.bash: true` plus `tools.elevated`.
    - `!poll [sessionId]` vérifie une tâche bash en arrière-plan.
    - `!stop [sessionId]` arrête une tâche bash en arrière-plan.

  </Accordion>
</AccordionGroup>

### Commandes de dock générées

Les commandes d'amarrage (dock) basculent la route de réponse de la session actuelle vers un autre channel lié. Voir [Channel docking](/fr/concepts/channel-docking) pour la configuration, des exemples et le dépannage.

Les commandes d'amarrage sont générées à partir des plugins de channel avec prise en charge des commandes natives. Ensemble groupé actuel :

- `/dock-discord` (alias : `/dock_discord`)
- `/dock-mattermost` (alias : `/dock_mattermost`)
- `/dock-slack` (alias : `/dock_slack`)
- `/dock-telegram` (alias : `/dock_telegram`)

Utilisez les commandes d'amarrage depuis un chat direct pour basculer l'itinéraire de réponse de la session actuelle vers un autre canal lié. L'agent conserve le même contexte de session, mais les futures réponses pour cette session sont acheminées vers le canal sélectionné.

Les commandes d'amarrage nécessitent `session.identityLinks`. L'expéditeur source et le pair cible doivent être dans le même groupe d'identité, par exemple `["telegram:123", "discord:456"]`. Si un utilisateur Telegram avec l'identifiant `123` envoie `/dock_discord`, OpenClaw stocke `lastChannel: "discord"` et `lastTo: "456"` sur la session active. Si l'expéditeur n'est pas lié à un pair Discord, la commande répond avec un indice de configuration au lieu de passer au chat normal.

L'amarrage modifie uniquement la route de la session active. Il ne crée pas de comptes de channel, n'accorde pas d'accès, ne contourne pas les listes blanches de channel, ni ne déplace l'historique des transcripts vers une autre session. Utilisez `/dock-telegram`, `/dock-slack`, `/dock-mattermost`, ou une autre commande d'amarrage générée pour basculer à nouveau la route.

### Commandes de plugin groupées

Les plugins groupés peuvent ajouter d'autres commandes slash. Commandes groupées actuelles dans ce dépôt :

- `/dreaming [on|off|status|help]` bascule le rêve de la mémoire. Voir [Dreaming](/fr/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gère le flux de jumelage/configuration de l'appareil. Voir [Jumelage](/fr/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` arme temporairement les commandes à haut risque du nœud de téléphone.
- `/voice status|list [limit]|set <voiceId|name>` gère la configuration vocale Talk. Sur Discord, le nom de la commande native est `/talkvoice`.
- `/card ...` envoie des présélections de cartes riches LINE. Voir [LINE](/fr/channels/line).
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` inspecte et contrôle le harnais app-server Codex inclus. Voir [Harnais Codex](/fr/plugins/codex-harness).
- Commandes réservées à QQBot :
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### Commandes de compétence dynamiques

Les compétences invoquables par l'utilisateur sont également exposées en tant que commandes slash :

- `/skill <name> [input]` fonctionne toujours comme point d'entrée générique.
- les compétences peuvent également apparaître sous forme de commandes directes comme `/prose` lorsque la compétence/le plugin les enregistre.
- l'enregistrement natif des commandes de compétence est contrôlé par `commands.nativeSkills` et `channels.<provider>.commands.nativeSkills`.
- les spécifications de commande peuvent fournir `descriptionLocalizations` pour les surfaces natives prenant en charge les descriptions localisées, y compris Discord.

<AccordionGroup>
  <Accordion title="Argument and parser notes">
    - Les commandes acceptent un `:` facultatif entre la commande et les arguments (par exemple `/think: high`, `/send: on`, `/help:`).
    - `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) ; si aucune correspondance n'est trouvée, le texte est traité comme le corps du message.
    - Pour une répartition complète de l'utilisation du fournisseur, utilisez `openclaw status --usage`.
    - `/allowlist add|remove` nécessite `commands.config=true` et respecte le `configWrites` du canal.
    - Dans les canaux multi-comptes, `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblés sur la configuration respectent également le `configWrites` du compte cible.
    - `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost`OpenClaw imprime un résumé des coûts locaux à partir des journaux de session OpenClaw.
    - `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
    - `/plugins install <spec>` accepte les mêmes spécifications de plugin que `openclaw plugins install`npm : chemin/archives locaux, package npm, `git:<repo>`, ou `clawhub:<pkg>`. Les Gateways gérés redémarrent automatiquement car les modules source des plugins ont changé.
    - `/plugins enable|disable`Gateway met à jour la configuration du plugin et déclenche le rechargement du plugin Gateway pour les nouveaux tours de l'agent.

  </Accordion>
  <Accordion title="Channel-specific behavior"Discord>
    - Commande native uniquement Discord : `/vc join|leave|status` contrôle les canaux vocaux (non disponible en texte). `join` nécessite une guilde et un canal vocal/stage sélectionné. Nécessite `channels.discord.voice`Discord et les commandes natives.
    - Commandes de liaison de thread Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent que les liaisons de thread effectives soient activées (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
    - Référence de commande ACP et comportement d'exécution : [ACP agents](/fr/tools/acp-agents).

  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` est destiné au débogage et à une visibilité accrue ; gardez-le **désactivé** en utilisation normale.
    - `/trace` est plus spécifique que `/verbose` : il ne révèle que les lignes de trace/débogage appartenant au plugin et désactive les bavardages verbeux normaux des outils.
    - `/fast on|off` maintient une substitution de session. Utilisez l'option `inherit` de l'interface Sessions pour l'effacer et revenir aux valeurs par défaut de la configuration.
    - `/fast` est spécifique au fournisseur : OpenAI/OpenAI Codex le mappent vers `service_tier=priority` sur les points de terminaison Responses natifs, tandis que les requêtes publiques directes vers Anthropic, y compris le trafic authentifié via OAuth envoyé à `api.anthropic.com`, le mappent vers `service_tier=auto` ou `standard_only`. Voir [OpenAI](/fr/providers/openai) et [Anthropic](/fr/providers/anthropic).
    - Les résumés d'échec d'outil sont toujours affichés le cas échéant, mais le texte d'échec détaillé n'est inclus que lorsque `/verbose full` est activé.
    - `/reasoning`, `/verbose` et `/trace` sont risqués dans les contextes de groupe : ils peuvent révéler un raisonnement interne, une sortie d'outil ou des diagnostics de plugin que vous ne souhaitiez pas exposer. Il est préférable de les laisser désactivés, en particulier dans les discussions de groupe.

  </Accordion>
  <Accordion title="Changement de modèle">
    - `/model` enregistre immédiatement le nouveau modèle de session.
    - Si l'agent est inactif, la prochaine exécution l'utilise tout de suite.
    - Si une exécution est déjà active, OpenClaw marque un basculement en direct comme en attente et ne redémarre avec le nouveau modèle qu'à un point de réessai propre.
    - Si l'activité de l'outil ou la sortie de réponse a déjà commencé, le basculement en attente peut rester en file jusqu'à une prochaine opportunité de réessai ou au prochain tour de l'utilisateur.
    - Dans l'TUI local, `/crestodian [request]` revient de l'TUI de l'agent normal vers Crestodian. Cela est distinct du mode de secours du canal de messages et n'accorde pas d'autorité de configuration à distance.

  </Accordion>
  <Accordion title="Raccourcis de chemin rapide et en ligne">
    - **Chemin rapide :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournent la file d'attente + le modèle).
    - **Filtrage par mention de groupe :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés contournent les exigences de mention.
    - **Raccourcis en ligne (expéditeurs autorisés uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le modèle ne voie le texte restant.
      - Exemple : `hey /status` déclenche une réponse de statut, et le texte restant continue selon le flux normal.
    - Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
    - Les messages contenant uniquement des commandes non autorisées sont silencieusement ignorés, et les jetons `/...` en ligne sont traités comme du texte brut.

  </Accordion>
  <Accordion title="Skill commands and native arguments">
    - **Skill commands :** `user-invocable` skills sont exposés en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (par ex. `_2`).
      - `/skill <name> [input]` exécute une skill par nom (utile lorsque les limites de commande natives empêchent les commandes par skill).
      - Par défaut, les commandes de skill sont transmises au modèle en tant que requête normale.
      - Les skills peuvent éventuellement déclarer `command-dispatch: tool` pour acheminer la commande directement vers un outil (déterministe, sans modèle).
      - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/fr/prose).
    - **Arguments de commande natifs :** Discord utilise l'autocomplétion pour les options dynamiques (et les menus à boutons lorsque vous omettez les arguments requis). Telegram et Slack affichent un menu à boutons lorsqu'une commande prend en charge des choix et que vous omettez l'argument. Les choix dynamiques sont résolus par rapport au modèle de la session cible, donc les options spécifiques au modèle telles que les niveaux `/think` suivent la priorité `/model` de cette session.

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` répond à une question d'exécution, et non à une question de configuration : **ce que cet agent peut utiliser maintenant même dans cette conversation**.

- Le `/tools` par défaut est compact et optimisé pour un examen rapide.
- `/tools verbose` ajoute de courtes descriptions.
- Les interfaces de commandes natives qui prennent en charge les arguments exposent le même sélecteur de mode que `compact|verbose`.
- Les résultats sont limités à la session, donc le changement d'agent, de channel, de fil, d'autorisation de l'expéditeur ou de modèle peut modifier la sortie.
- `/tools` inclut les outils réellement accessibles lors de l'exécution, y compris les outils principaux, les outils de plugin connectés et les outils détenus par le channel.

Pour la modification de profil et de priorité, utilisez le panneau Outils de l'interface de contrôle ou les surfaces de configuration/catalogue au lieu de traiter `/tools` comme un catalogue statique.

## Surfaces d'utilisation (ce qui s'affiche où)

- **Utilisation/quota du provider** (exemple : « Claude 80 % restants ») s'affiche dans `/status` pour le provider de modèle actuel lorsque le suivi de l'utilisation est activé. OpenClaw normalise les fenêtres du provider à `% left` ; pour MiniMax, les champs de pourcentage « restants uniquement » sont inversés avant l'affichage, et les réponses `model_remains` préfèrent l'entrée du modèle de chat plus une étiquette de plan balisée par modèle.
- **Lignes de jetons/cache** dans `/status` peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de la session en direct est clairsemé. Les valeurs live non nulles existantes l'emportent toujours, et le repli sur la transcription peut également récupérer l'étiquette du modèle d'exécution active ainsi qu'un total orienté prompt plus important lorsque les totaux stockés sont manquants ou plus petits.
- **Exécution vs runtime :** `/status` rapporte `Execution` pour le chemin effectif du bac à sable et `Runtime` pour celui qui exécute réellement la session : `OpenClaw Default`, `OpenAI Codex`, un backend CLI, ou un backend ACP.
- **Jetets/coût par réponse** est contrôlé par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **modèles/auth/points de terminaison**, pas l'utilisation.

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

Notes :

- `/model` et `/model list` affichent un sélecteur compact numéroté (famille de modèles + providers disponibles).
- Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes de provider et de modèle ainsi qu'une étape Soumettre. Le sélecteur respecte `agents.defaults.models`, y compris les entrées `provider/*`, de sorte que la découverte délimitée au provider peut maintenir le sélecteur sous la limite de composants de 25 options de Discord.
- `/model <#>` sélectionne à partir de ce sélecteur (et préfère le provider actuel si possible).
- `/model status` affiche la vue détaillée, y compris le point de terminaison provider configuré (`baseUrl`API) et le mode API (`api`) lorsqu'ils sont disponibles.

## Débogage des substitutions

`/debug` vous permet de définir des remplacements de configuration **uniquement à l'exécution** (en mémoire, pas sur disque). Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.debug: true`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>Les remplacements s'appliquent immédiatement aux nouvelles lectures de configuration, mais n'écrivent **pas** dans `openclaw.json`. Utilisez `/debug reset` pour effacer tous les remplacements et revenir à la configuration sur disque.</Note>

## Sortie de trace du plugin

`/trace` vous permet d'activer ou de désactiver les **lignes de trace/débogage de plugin étendues à la session** sans activer le mode complet détaillé.

Exemples :

```text
/trace
/trace on
/trace off
```

Notes :

- `/trace` sans argument affiche l'état actuel de la trace de session.
- `/trace on` active les lignes de trace de plugin pour la session en cours.
- `/trace off` les désactive à nouveau.
- Les lignes de trace de plugin peuvent apparaître dans `/status` et sous forme de message de diagnostic de suite après la réponse normale de l'assistant.
- `/trace` ne remplace pas `/debug` ; `/debug` gère toujours les remplacements de configuration uniquement à l'exécution.
- `/trace` ne remplace pas `/verbose` ; la sortie détaillée normale de tool/statut appartient toujours à `/verbose`.

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

<Note>La configuration est validée avant l'écriture ; les modifications non valides sont rejetées. Les mises à jour de `/config` persistent après redémarrage.</Note>

## Mises à jour MCP

`/mcp`OpenClaw écrit les définitions de serveur MCP gérées par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.mcp: true`.

Exemples :

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp`OpenClaw stocke la configuration dans la configuration OpenClaw, et non dans les paramètres du projet d'agent intégré. Les adaptateurs d'exécution décident quels transports sont réellement exécutables.</Note>

## Mises à jour des plugins

`/plugins` permet aux opérateurs d'inspecter les plugins découverts et d'activer ou désactiver leur activation dans la configuration. Les flux en lecture seule peuvent utiliser `/plugin` comme alias. Désactivé par défaut ; activez-le avec `commands.plugins: true`.

Exemples :

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` et `/plugins show` utilisent la vraie découverte de plugins sur l'espace de travail actuel ainsi que la configuration sur disque.
- `/plugins install`ClawHubnpm installe depuis ClawHub, npm, git, des répertoires locaux et des archives.
- `/plugins enable|disable`Gateway met uniquement à jour la configuration des plugins ; il n'installe ni ne désinstalle les plugins.
- Les changements d'activation et de désactivation rechargent à chaud les surfaces d'exécution des plugins du Gateway pour les nouveaux tours d'agent ; l'installation redémarre automatiquement les Gateways gérés car les modules sources des plugins ont changé.

</Note>

## Notes sur les surfaces

<AccordionGroup>
  <Accordion title="Sessions par surface">
    - Les **commandes texte** s'exécutent dans la session de chat normale (les DMs partagent `main`Discord, les groupes ont leur propre session).
    - Les **commandes natives** utilisent des sessions isolées :
      - Discord : `agent:<agentId>:discord:slash:<userId>`Slack
      - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`Telegram)
      - Telegram : `telegram:slash:<userId>` (cible la session de chat via `CommandTargetSessionKey`)
    - **`/stop`** cible la session de chat active afin qu'elle puisse abandonner l'exécution actuelle.

  </Accordion>
  <Accordion title="Spécificités Slack">
    `channels.slack.slashCommand` est toujours pris en charge pour une seule commande de style `/openclaw`. Si vous activez `commands.native`, vous devez créer une commande barre oblique Slack par commande intégrée (mêmes noms que `/help`). Les menus d'arguments de commande pour Slack sont transmis sous forme de boutons éphémères du Block Kit.

    Exception native Slack : enregistrez `/agentstatus` (pas `/status`) car Slack réserve `/status`. Le texte `/status` fonctionne toujours dans les messages Slack.

  </Accordion>
</AccordionGroup>

## Questions BTW

`/btw` est une **question secondaire** rapide sur la session en cours. `/side` est un alias.

Contrairement au chat normal :

- il utilise la session actuelle comme contexte de fond,
- dans les sessions du harnais Codex, il s'exécute en tant que fil latéral éphémère Codex avec les
  autorisations Codex actuelles et la surface native de l'outil,
- dans les sessions non-Codex, il conserve l'ancien comportement d'appel latéral direct ponctuel,
- il ne modifie pas le contexte des sessions futures,
- il n'est pas écrit dans l'historique des transcriptions,
- il est transmis en tant que résultat latéral en direct au lieu d'un message normal de l'assistant.

Cela rend `/btw` utile lorsque vous souhaitez une clarification temporaire pendant que la tâche principale se poursuit.

Exemple :

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

Voir [Questions secondaires BTW](/fr/tools/btw) pour le comportement complet et les détails de l'expérience utilisateur du client.

## Connexes

- [Création de compétences](/fr/tools/creating-skills)
- [Compétences](/fr/tools/skills)
- [Configuration des compétences](/fr/tools/skills-config)
