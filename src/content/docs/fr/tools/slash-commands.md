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
  Active l'analyse de `/...` dans les messages de chat. Sur les surfaces sans commandes natives (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), les commandes textuelles fonctionnent toujours même si vous définissez ceci sur `false`.
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  Enregistre les commandes natives. Auto : activé pour Discord/Telegram ; désactivé pour Slack (jusqu'à ce que vous ajoutiez des commandes slash) ; ignoré pour les fournisseurs sans support natif. Définissez `channels.discord.commands.native`, `channels.telegram.commands.native` ou `channels.slack.commands.native` pour remplacer par fournisseur (booléen ou `"auto"`). Sur Discord, `false` saute l'enregistrement et le nettoyage des commandes slash lors du démarrage ; les commandes précédemment enregistrées peuvent rester visibles jusqu'à ce que vous les supprimiez de l'application Discord. Les commandes Slack sont gérées dans l'application Slack et ne sont pas supprimées automatiquement.
</ParamField>
Sur Discord, les spécifications de commandes natives peuvent inclure `descriptionLocalizations`, que OpenClaw publie en tant que Discord `description_localizations` et inclut dans les comparaisons de réconciliation.
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  Enregistre les commandes de **compétence** de manière native lorsque pris en charge. Auto : activé pour Discord/Telegram ; désactivé pour Slack (Slack nécessite la création d'une commande slash par compétence). Définissez `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` pour remplacer par fournisseur (booléen ou `"auto"`).
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
  Active `/debug` (remplacements uniquement au moment de l'exécution).
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  Active `/restart` ainsi que les actions de l'outil de redémarrage de la passerelle.
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  Définit la liste d'autorisation de propriétaire explicite pour les surfaces de commandes/outils réservés au propriétaire. Il s'agit du compte de l'opérateur humain qui peut approuver les actions dangereuses et exécuter des commandes telles que `/diagnostics`, `/export-trajectory` et `/config`. Elle est distincte de `commands.allowFrom` et de l'accès au jumelage DM.
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  Par canal : oblige les commandes réservées au propriétaire à nécessiter une **identité de propriétaire** pour s'exécuter sur cette surface. Lorsque `true`, l'expéditeur doit soit correspondre à un candidat propriétaire résolu (par exemple une entrée dans `commands.ownerAllowFrom` ou les métadonnées de propriétaire natives du fournisseur), soit détenir la portée interne `operator.admin` sur un canal de message interne. Une entrée générique dans le canal `allowFrom`, ou une liste de candidats propriétaires vide ou non résolue, n'est **pas** suffisante — les commandes réservées au propriétaire échouent en mode fermé sur ce canal. Désactivez ceci si vous souhaitez que les commandes réservées au propriétaire soient limitées uniquement par `ownerAllowFrom` et les listes d'autorisation de commandes standard.
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  Contrôle la façon dont les identifiants de propriétaire apparaissent dans le invite système.
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  Définit facultativement le secret HMAC utilisé lors de `commands.ownerDisplay="hash"`.
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  Liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, elle est la seule source d'autorisation pour les commandes et les directives (les listes d'autorisation/jumelage de canal et `commands.useAccessGroups` sont ignorés). Utilisez `"*"` pour une valeur par défaut globale ; les clés spécifiques au fournisseur la remplacent.
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
    - `/new [model]` démarre une nouvelle session ; `/reset` est l'alias de réinitialisation.
    - L'interface de contrôle intercepte la frappe de `/new` pour créer et basculer vers une nouvelle session de tableau de bord, sauf si `session.dmScope: "main"` est configuré et que le parent actuel est la session principale de l'agent ; dans ce cas, `/new` réinitialise la session principale en place. La frappe de `/reset` exécute toujours la réinitialisation en place du Gateway.
    - `/reset soft [message]` conserve la transcription actuelle, supprime les identifiants de session backend CLI réutilisés et recharge le démarrage/system-prompt en place.
    - `/compact [instructions]` compresse le contexte de la session. Voir [Compression](/fr/concepts/compaction).
    - `/stop` interrompt l'exécution actuelle.
    - `/session idle <duration|off>` et `/session max-age <duration|off>` gèrent l'expiration de la liaison de fil de discussion.
    - `/export-session [path]` exporte la session actuelle au format HTML. Alias : `/export`.
    - `/export-trajectory [path]` demande une approbation d'exécution, puis exporte un [bundle de trajectoire](/fr/tools/trajectory) JSONL pour la session actuelle. Utilisez-le lorsque vous avez besoin de la chronologie du prompt, de l'outil et de la transcription pour une session OpenClaw. Dans les discussions de groupe, l'invite d'approbation et le résultat de l'exportation sont envoyés en privé au propriétaire. Alias : `/trajectory`.

  </Accordion>
  <Accordion title="Contrôle du modèle et de l'exécution">
    - `/think <level|default>` définit le niveau de réflexion ou efface la substitution de session. Les options proviennent du profil du fournisseur du modèle actif ; les niveaux courants sont `off`, `minimal`, `low`, `medium` et `high`, avec des niveaux personnalisés tels que `xhigh`, `adaptive`, `max` ou binaire `on` uniquement lorsqu'ils sont pris en charge. Alias : `/thinking`, `/t`.
    - `/verbose on|off|full` active/désactive la sortie détaillée. Alias : `/v`.
    - `/trace on|off` active/désactive la sortie de trace du plugin pour la session actuelle.
    - `/fast [status|on|off|default]` affiche, définit ou efface le mode rapide.
    - `/reasoning [on|off|stream]` active/désactive la visibilité du raisonnement. Alias : `/reason`.
    - `/elevated [on|off|ask|full]` active/désactive le mode élevé. Alias : `/elev`.
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` affiche ou définit les valeurs par défaut d'exécution.
    - `/model [name|#|status]` affiche ou définit le modèle.
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` liste les fournisseurs configurés/disponibles pour l'authentification ou les modèles pour un fournisseur ; ajoutez `all` pour parcourir le catalogue complet de ce fournisseur. Les entrées `provider/*` dans `agents.defaults.models` font que `/model` et `/models` affichent les modèles découverts uniquement pour ces fournisseurs.
    - `/queue <mode>` gère le comportement de la file d'attente (`steer`, ancien `queue`, `followup`, `collect`, `steer-backlog`, `interrupt`) ainsi que des options comme `debounce:0.5s cap:25 drop:summarize` ; `/queue default` ou `/queue reset` efface la substitution de session. Voir [File d'attente de commandes](/fr/concepts/queue) et [File d'attente de pilotage](/fr/concepts/queue-steering).
    - `/steer <message>` injecte des directives dans l'exécution active pour la session actuelle, indépendamment du mode `/queue`. Il ne démarre pas une nouvelle exécution lorsque la session est inactive. Alias : `/tell`. Voir [Piloter](/fr/tools/steer).

  </Accordion>
  <Accordion title="Découverte et statut">
    - `/help` affiche le bref résumé d'aide.
    - `/commands` affiche le catalogue de commandes généré.
    - `/tools [compact|verbose]` affiche ce que l'agent actuel peut utiliser maintenant.
    - `/status` affiche le statut d'exécution, la disponibilité du Gateway et du système, ainsi que l'utilisation/quota du provider si disponible.
    - `/diagnostics [note]` est le flux de rapport de support réservé au propriétaire pour les bugs du Gateway et les exécutions du harnais Codex. Il demande une approbation explicite à chaque exécution avant de lancer `openclaw gateway diagnostics export --json` ; n'approuvez pas les diagnostics avec une règle autorisant tout. Après approbation, il envoie un rapport collable avec le chemin du bundle local, le résumé du manifeste, les notes de confidentialité et les identifiants de session pertinents. Dans les chats de groupe, la demande d'approbation et le rapport sont envoyés en privé au propriétaire. Lorsque la session active utilise le harnais Codex OpenAI, la même approbation envoie également les commentaires Codex pertinents aux serveurs OpenAI et la réponse terminée liste les identifiants de session OpenClaw, les identifiants de thread Codex et les commandes `codex resume <thread-id>`. Voir [Diagnostics Export](/fr/gateway/diagnostics).
    - `/crestodian <request>` lance l'assistant de configuration et de réparation Crestodian depuis un MP de propriétaire.
    - `/tasks` liste les tâches d'arrière-plan actives/récentes pour la session actuelle.
    - `/context [list|detail|json]` explique comment le contexte est assemblé.
    - `/whoami` affiche votre identifiant d'expéditeur. Alias : `/id`.
    - `/usage off|tokens|full|cost` contrôle le pied de page d'utilisation par réponse ou imprime un résumé des coûts locaux.

  </Accordion>
  <Accordion title="Skills, listes d'autorisation, approbations">
    - `/skill <name> [input]` exécute un skill par son nom.
    - `/allowlist [list|add|remove] ...` gère les entrées de la liste d'autorisation. Texte uniquement.
    - `/approve <id> <decision>` résout les invites d'approbation d'exécution.
    - `/btw <question>` pose une question annexe sans modifier le contexte de la session future. Alias : `/side`. Voir [BTW](/fr/tools/btw).

  </Accordion>
  <Accordion title="Sous-agents et ACP">
    - `/subagents list|kill|log|info|send|steer|spawn` gère les exécutions de sous-agents pour la session actuelle.
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` gère les sessions ACP et les options d'exécution.
    - `/focus <target>` lie le fil Discord ou le sujet/conversation Telegram actuel à une cible de session.
    - `/unfocus` supprime la liaison actuelle.
    - `/agents` liste les agents liés au fil pour la session actuelle.
    - `/kill <id|#|all>` interrompt un ou tous les sous-agents en cours d'exécution.
    - `/subagents steer <id|#> <message>` envoie des directives à un sous-agent en cours d'exécution. Voir [Steer](/fr/tools/steer).

  </Accordion>
  <Accordion title="Écritures réservées au propriétaire et administration">
    - `/config show|get|set|unset` lit ou écrit `openclaw.json`. Réservé au propriétaire. Nécessite `commands.config: true`.
    - `/mcp show|get|set|unset` lit ou écrit la configuration du serveur MCP gérée par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Nécessite `commands.mcp: true`.
    - `/plugins list|inspect|show|get|install|enable|disable` inspecte ou modifie l'état du plugin. `/plugin` est un alias. Réservé au propriétaire pour les écritures. Nécessite `commands.plugins: true`.
    - `/debug show|set|unset|reset` gère les redéfinitions de configuration d'exécution uniquement. Réservé au propriétaire. Nécessite `commands.debug: true`.
    - `/restart` redémarre OpenClaw lorsqu'il est activé. Par défaut : activé ; définissez `commands.restart: false` pour le désactiver.
    - `/send on|off|inherit` définit la politique d'envoi. Réservé au propriétaire.

  </Accordion>
  <Accordion title="Voix, TTS, contrôle de channel">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` contrôle le TTS. Voir [TTS](/fr/tools/tts).
    - `/activation mention|always` définit le mode d'activation de groupe.
    - `/bash <command>` exécute une commande shell de l'hôte. Texte uniquement. Alias : `! <command>`. Nécessite `commands.bash: true` ainsi que les listes d'autorisation `tools.elevated`.
    - `!poll [sessionId]` vérifie une tâche bash en arrière-plan.
    - `!stop [sessionId]` arrête une tâche bash en arrière-plan.

  </Accordion>
</AccordionGroup>

### Commandes de dock générées

Les commandes d'amarrage (Dock commands) redirigent le trajet de réponse de la session actuelle vers un autre channel lié.
Voir [Channel docking](/fr/concepts/channel-docking) pour la configuration,
les exemples et le troubleshooting.

Les commandes d'amarrage sont générées à partir des plugins de channel avec prise en charge des commandes natives. Ensemble groupé actuel :

- `/dock-discord` (alias : `/dock_discord`)
- `/dock-mattermost` (alias : `/dock_mattermost`)
- `/dock-slack` (alias : `/dock_slack`)
- `/dock-telegram` (alias : `/dock_telegram`)

Utilisez les commandes d'amarrage depuis un chat direct pour basculer l'itinéraire de réponse de la session actuelle vers un autre canal lié. L'agent conserve le même contexte de session, mais les futures réponses pour cette session sont acheminées vers le canal sélectionné.

Les commandes d'amarrage nécessitent `session.identityLinks`. L'expéditeur source et le pair cible doivent appartenir au même groupe d'identité, par exemple `["telegram:123", "discord:456"]`Telegram. Si un utilisateur Telegram avec l'id `123` envoie `/dock_discord`OpenClaw, OpenClaw stocke `lastChannel: "discord"` et `lastTo: "456"`Discord sur la session active. Si l'expéditeur n'est pas lié à un pair Discord, la commande répond par une indication de configuration au lieu de poursuivre vers le chat normal.

L'amarrage modifie uniquement l'itinéraire de la session active. Il ne crée pas de comptes de canal, n'accorde pas d'accès, ne contourne pas les listes d'autorisation des canaux et ne déplace pas l'historique des transcriptions vers une autre session. Utilisez `/dock-telegram`, `/dock-slack`, `/dock-mattermost`, ou une autre commande d'amarrage générée pour basculer à nouveau l'itinéraire.

### Commandes de plugin groupées

Les plugins groupés peuvent ajouter d'autres commandes slash. Commandes groupées actuelles dans ce dépôt :

- `/dreaming [on|off|status|help]` active/désactive le rêve de la mémoire. Voir [Dreaming](/fr/concepts/dreaming).
- `/pair [qr|status|pending|approve|cleanup|notify]` gère le flux de jumelage/configuration de l'appareil. Voir [Pairing](/fr/channels/pairing).
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` arme temporairement les commandes de nœud téléphonique à haut risque.
- `/voice status|list [limit]|set <voiceId|name>`Discord gère la configuration vocale Talk. Sur Discord, le nom de la commande native est `/talkvoice`.
- `/card ...` envoie des présélections de cartes riches LINE. Voir [LINE](/fr/channels/line).
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` inspecte et contrôle le harnais app-server Codex groupé. Voir [Codex harness](/fr/plugins/codex-harness).
- Commandes réservées à QQBot :
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### Commandes de compétence dynamiques

Les compétences invoquables par l'utilisateur sont également exposées en tant que commandes slash :

- `/skill <name> [input]` fonctionne toujours comme le point d'entrée générique.
- Les compétences peuvent également apparaître sous forme de commandes directes comme `/prose` lorsque la compétence/le plugin les enregistre.
- L'enregistrement natif des commandes de compétences est contrôlé par `commands.nativeSkills` et `channels.<provider>.commands.nativeSkills`.
- Les spécifications de commande peuvent fournir `descriptionLocalizations` pour les surfaces natives qui prennent en charge les descriptions localisées, y compris Discord.

<AccordionGroup>
  <Accordion title="Argument and parser notes">
    - Les commandes acceptent un `:` optionnel entre la commande et les arguments (par ex. `/think: high`, `/send: on`, `/help:`).
    - `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) ; si aucune correspondance n'est trouvée, le texte est traité comme le corps du message.
    - Pour une ventilation complète de l'utilisation du fournisseur, utilisez `openclaw status --usage`.
    - `/allowlist add|remove` nécessite `commands.config=true` et respecte le `configWrites` du channel.
    - Dans les channels multi-comptes, `/allowlist --account <id>` et `/config set channels.<provider>.accounts.<id>...` ciblées sur la configuration respectent également le `configWrites` du compte cible.
    - `/usage` contrôle le pied de page d'utilisation par réponse ; `/usage cost` imprime un résumé des coûts locaux à partir des journaux de session OpenClaw.
    - `/restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.
    - `/plugins install <spec>` accepte les mêmes spécifications de plugin que `openclaw plugins install` : chemin local/archive, package npm, `git:<repo>`, ou `clawhub:<pkg>`, puis demande un redémarrage du Gateway car les modules sources du plugin ont changé.
    - `/plugins enable|disable` met à jour la configuration du plugin et déclenche le rechargement du plugin Gateway pour les nouveaux tours d'agent.

  </Accordion>
  <Accordion title="Comportement spécifique au canal"Discord>
    - Commande native Discord uniquement : `/vc join|leave|status` contrôle les canaux vocaux (non disponible sous forme de texte). `join` nécessite une guilde et un canal vocal/scène sélectionné. Nécessite `channels.discord.voice`Discord et les commandes natives.
    - Commandes de liaison de fil Discord (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) nécessitent que les liaisons de fil effectives soient activées (`session.threadBindings.enabled` et/ou `channels.discord.threadBindings.enabled`).
    - Référence de commande ACP et comportement d'exécution : [Agents ACP](/fr/tools/acp-agents).

  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` est destiné au débogage et à une visibilité accrue ; gardez-le **désactivé** lors d'une utilisation normale.
    - `/trace` est plus restreint que `/verbose` : il ne révèle que les lignes de trace/débogage appartenant aux plugins et désactive les bavardages verbeux habituels des outils.
    - `/fast on|off` persiste dans une substitution de session. Utilisez l'option `inherit` de l'interface Sessions pour l'effacer et revenir aux valeurs par défaut de la configuration.
    - `/fast` est spécifique au fournisseur : OpenAI/OpenAI Codex le mappent vers `service_tier=priority` sur les points de terminaison Responses natifs, tandis que les requêtes publiques directes vers Anthropic, y compris le trafic authentifié via OAuth envoyé à `api.anthropic.com`, le mappent vers `service_tier=auto` ou `standard_only`. Voir [OpenAI](/fr/providers/openai) et [Anthropic](/fr/providers/anthropic).
    - Les résumés d'échecs d'outils sont toujours affichés lorsque pertinents, mais le texte d'échec détaillé n'est inclus que lorsque `/verbose` est `on` ou `full`.
    - `/reasoning`, `/verbose` et `/trace` présentent des risques dans les contextes de groupe : ils peuvent révéler un raisonnement interne, une sortie d'outil ou des diagnostics de plugin que vous ne souhaitiez pas exposer. Il est préférable de les laisser désactivés, surtout dans les discussions de groupe.

  </Accordion>
  <Accordion title="Changement de modèle">
    - `/model` persiste le nouveau modèle de session immédiatement.
    - Si l'agent est inactif, la prochaine exécution l'utilise immédiatement.
    - Si une exécution est déjà active, OpenClaw marque un basculement en direct comme en attente et redémarre uniquement sur le nouveau modèle à un point de réessai propre.
    - Si l'activité de l'outil ou la sortie de réponse a déjà commencé, le basculement en attente peut rester en file jusqu'à une prochaine opportunité de réessai ou au prochain tour de l'utilisateur.
    - Dans le TUI local, `/crestodian [request]` renvoie de l'TUI de l'agent normal à Crestodian. Cela est distinct du mode de sauvetage du canal de message et n'accorde pas d'autorité de configuration distante.

  </Accordion>
  <Accordion title="Chemin rapide et raccourcis en ligne">
    - **Chemin rapide :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournement de la file + modèle).
    - **Filtrage par mention de groupe :** les messages contenant uniquement des commandes provenant d'expéditeurs autorisés contournent les exigences de mention.
    - **Raccourcis en ligne (expéditeurs autorisés uniquement) :** certaines commandes fonctionnent également lorsqu'elles sont intégrées dans un message normal et sont supprimées avant que le modèle ne voit le texte restant.
      - Exemple : `hey /status` déclenche une réponse de statut, et le texte restant poursuit le flux normal.
    - Actuellement : `/help`, `/commands`, `/status`, `/whoami` (`/id`).
    - Les messages contenant uniquement des commandes non autorisées sont ignorés silencieusement, et les jetons `/...` en ligne sont traités comme du texte brut.

  </Accordion>
  <Accordion title="Commandes de compétences et arguments natifs">
    - **Commandes de compétences :** Les compétences `user-invocable` sont exposées en tant que commandes slash. Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques (par ex. `_2`).
      - `/skill <name> [input]` exécute une compétence par son nom (utile lorsque les limites de commandes natives empêchent les commandes par compétence).
      - Par défaut, les commandes de compétences sont transmises au modèle en tant que demande normale.
      - Les compétences peuvent éventuellement déclarer `command-dispatch: tool` pour acheminer la commande directement vers un outil (déterministe, sans modèle).
      - Exemple : `/prose` (plugin OpenProse) — voir [OpenProse](/fr/prose).
    - **Arguments de commande natifs :** Discord utilise l'autocomplétion pour les options dynamiques (et les menus de boutons lorsque vous omettez les arguments requis). Telegram et Slack affichent un menu de boutons lorsqu'une commande prend en charge des choix et que vous omettez l'argument. Les choix dynamiques sont résolus par rapport au modèle de session cible, donc les options spécifiques au modèle telles que les niveaux `/think` suivent la priorité `/model` de cette session.

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` répond à une question d'exécution, et non à une question de configuration : **ce que cet agent peut utiliser dès maintenant dans cette conversation**.

- Le `/tools` par défaut est compact et optimisé pour un examen rapide.
- `/tools verbose` ajoute de courtes descriptions.
- Les surfaces de commandes natives qui prennent en charge les arguments exposent le même sélecteur de mode que `compact|verbose`.
- Les résultats sont limités à la session, donc le changement d'agent, de channel, de fil, d'autorisation de l'expéditeur ou de modèle peut modifier la sortie.
- `/tools` inclut les outils réellement accessibles lors de l'exécution, y compris les outils de base, les outils de plugin connectés et les outils appartenant au channel.

Pour la modification du profil et des priorités, utilisez le panneau Outils de l'interface de contrôle ou les surfaces de configuration/catalogue au lieu de traiter `/tools` comme un catalogue statique.

## Surfaces d'utilisation (ce qui s'affiche où)

- **Utilisation/quota du provider** (exemple : « Claude 80 % restants ») s'affiche dans `/status`OpenClaw pour le provider de model actuel lorsque le suivi de l'utilisation est activé. OpenClaw normalise les fenêtres des providers à `% left`MiniMax ; pour MiniMax, les champs de pourcentage restant uniquement sont inversés avant l'affichage, et les réponses `model_remains` privilégient l'entrée du model de discussion plus une étiquette de plan marquée par le model.
- **Lignes de jetons/cache** dans `/status` peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de la session en direct est peu dense. Les valeurs en direct non nulles existantes priment toujours, et le repli sur la transcription peut également récupérer l'étiquette du model d'exécution actif ainsi qu'un total orienté prompt plus important lorsque les totaux stockés sont manquants ou plus petits.
- **Exécution vs runtime :** `/status` rapporte `Execution` pour le chemin effectif du bac à sable et `Runtime` pour celui qui exécute réellement la session : `OpenClaw Pi Default`, `OpenAI Codex`CLI, un backend CLI, ou un backend ACP.
- **Jetets/coût par réponse** est contrôlé par `/usage off|tokens|full` (ajouté aux réponses normales).
- `/model status` concerne les **models/auth/endpoints**, pas l'utilisation.

## Sélection de model (`/model`)

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

Notes :

- `/model` et `/model list` affichent un sélecteur compact et numéroté (famille de models + providers disponibles).
- Sur Discord, Discord`/model` et `/models` ouvrent un sélecteur interactif avec des listes déroulantes de provider et de model plus une étape de soumission. Le sélecteur respecte `agents.defaults.models`, y compris les entrées `provider/*`Discord, de sorte que la découverte délimitée par provider peut garder le sélecteur sous la limite de 25 options des composants de Discord.
- `/model <#>` effectue une sélection à partir de ce sélecteur (et privilégie le provider actuel si possible).
- `/model status` affiche la vue détaillée, y compris le point de terminaison API configuré (`baseUrl`) et le mode API (`api`) si disponible.

## Débogage des substitutions

`/debug` vous permet de définir des substitutions de configuration **uniquement à l'exécution** (en mémoire, pas sur disque). Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.debug: true`.

Exemples :

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>Les substitutions s'appliquent immédiatement aux nouvelles lectures de configuration, mais n'écrivent **pas** dans `openclaw.json`. Utilisez `/debug reset` pour effacer toutes les substitutions et revenir à la configuration sur disque.</Note>

## Sortie de trace du plugin

`/trace` vous permet d'activer ou de désactiver les **lignes de trace/débogage de plugin étendues à la session** sans activer le mode verbeux complet.

Exemples :

```text
/trace
/trace on
/trace off
```

Notes :

- `/trace` sans argument affiche l'état de trace de la session actuelle.
- `/trace on` active les lignes de trace du plugin pour la session actuelle.
- `/trace off` les désactive à nouveau.
- Les lignes de trace du plugin peuvent apparaître dans `/status` et sous forme de message de diagnostic suite à la réponse normale de l'assistant.
- `/trace` ne remplace pas `/debug` ; `/debug` gère toujours les substitutions de configuration uniquement à l'exécution.
- `/trace` ne remplace pas `/verbose` ; la sortie verbeuse normale des outils/états appartient toujours à `/verbose`.

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

<Note>La configuration est validée avant l'écriture ; les modifications invalides sont rejetées. Les mises à jour de `/config` persistent après redémarrage.</Note>

## Mises à jour MCP

`/mcp` écrit les définitions de serveur MCP gérées par OpenClaw sous `mcp.servers`. Réservé au propriétaire. Désactivé par défaut ; activez-le avec `commands.mcp: true`.

Exemples :

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp`OpenClaw stocke la configuration dans la configuration OpenClaw, et non dans les paramètres du projet détenus par Pi. Les adaptateurs d'exécution décident quels transports sont réellement exécutables.</Note>

## Mises à jour des plugins

`/plugins` permet aux opérateurs d'inspecter les plugins découverts et de basculer l'activation dans la configuration. Les flux en lecture seule peuvent utiliser `/plugin` comme alias. Désactivé par défaut ; activez-le avec `commands.plugins: true`.

Exemples :

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` et `/plugins show` utilisent une vraie découverte de plugins par rapport à l'espace de travail actuel plus la configuration sur disque.
- `/plugins install`ClawHubnpm installe depuis ClawHub, npm, git, des répertoires locaux et des archives.
- `/plugins enable|disable`GatewayGateway met à jour uniquement la configuration du plugin ; il n'installe ni ne désinstalle les plugins.
- Les modifications d'activation et de désactivation rechargent à chaud les surfaces d'exécution des plugins Gateway pour les nouveaux tours d'agent ; l'installation demande un redémarrage du Gateway car les modules source des plugins ont changé.

</Note>

## Notes sur les surfaces

<AccordionGroup>
  <Accordion title="Sessions par surface">
    - Les **commandes de texte** s'exécutent dans la session de discussion normale (les DMs partagent `main`Discord, les groupes ont leur propre session).
    - Les **commandes natives** utilisent des sessions isolées :
      - Discord : `agent:<agentId>:discord:slash:<userId>`Slack
      - Slack : `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`Telegram)
      - Telegram : `telegram:slash:<userId>` (cible la session de discussion via `CommandTargetSessionKey`)
    - **`/stop`** cible la session de discussion active afin qu'elle puisse annuler l'exécution actuelle.

  </Accordion>
  <Accordion title="SlackSlack specifics">
    `channels.slack.slashCommand` est toujours pris en charge pour une commande unique de style `/openclaw`. Si vous activez `commands.native`Slack, vous devez créer une commande slash Slack pour chaque commande intégrée (mêmes noms que `/help`SlackSlack). Les menus d'arguments de commande pour Slack sont livrés sous forme de boutons éphémères du Block Kit.

    Exception native Slack : enregistrez `/agentstatus` (pas `/status`Slack) car Slack réserve `/status`. Le texte `/status`Slack fonctionne toujours dans les messages Slack.

  </Accordion>
</AccordionGroup>

## Questions BTW

`/btw` est une **question BTW** rapide sur la session en cours. `/side` est un alias.

Contrairement au chat normal :

- il utilise la session actuelle comme contexte de fond,
- il s'exécute comme un appel ponctuel séparé **sans outil**,
- il ne modifie pas le contexte futur de la session,
- il n'est pas écrit dans l'historique des transcriptions,
- il est livré comme un résultat latéral en direct au lieu d'un message d'assistant normal.

Cela rend `/btw` utile lorsque vous souhaitez une clarification temporaire pendant que la tâche principale se poursuit.

Exemple :

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

Voir [BTW Side Questions](/fr/tools/btw) pour le comportement complet et les détails de l'expérience client.

## Connexes

- [Creating skills](/fr/tools/creating-skills)
- [Skills](/fr/tools/skills)
- [Skills config](/fr/tools/skills-config)
