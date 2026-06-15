---
title: "Commandes slash"
sidebarTitle: "Commandes slash"
summary: "Toutes les commandes slash, directives et raccourcis en ligne disponibles — configuration, routage et comportement par surface."
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
  - Understanding how skill commands are registered
---

Le Gateway gère les commandes envoyées sous forme de messages autonomes commençant par `/`.
Les commandes bash réservées à l'hôte utilisent `! <cmd>` (avec `/bash <cmd>` comme alias).

Lorsqu'une conversation est liée à une session ACP, le texte normal est acheminé vers le harnais ACP.
Les commandes de gestion du Gateway restent locales : `/acp ...` atteint toujours le gestionnaire de commandes OpenClaw, et `/status` ainsi que `/unfocus` restent locales chaque fois que la gestion des commandes est activée pour la surface.

## Trois types de commandes

<CardGroup cols={3}>
  <Card title="Commands" icon="terminal">
    Messages autonomes `/...` gérés par le Gateway. Doivent être envoyés comme seul contenu du message.
  </Card>
  <Card title="Directives" icon="sliders">
    `/think`, `/fast`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue` — retirés du message avant que le model ne le voie. Enregistrent les paramètres de session lorsqu'ils sont envoyés seuls ; agissent comme des indices en ligne lorsqu'ils sont envoyés avec d'autres textes.
  </Card>
  <Card title="Raccourcis en ligne" icon="bolt">
    `/help`, `/commands`, `/status`, `/whoami` — sont exécutés immédiatement et sont supprimés avant que le modèle ne voie le texte restant. Expéditeurs autorisés uniquement.
  </Card>
</CardGroup>

<AccordionGroup>
  <Accordion title="Détails du comportement des directives">
    - Les directives sont supprimées du message avant que le modèle ne le voie. - Dans les messages **uniquement de directives** (le message ne contient que des directives), elles persistent dans la session et répondent par un accusé de réception. - Dans les messages de **chat normal** avec d'autres textes, elles agissent comme des indices en ligne et ne **persistent pas** les paramètres de la
    session. - Les directives ne s'appliquent que pour les **expéditeurs autorisés**. Si `commands.allowFrom` est défini, c'est la seule liste d'autorisation utilisée ; sinon, l'autorisation provient des listes d'autorisation de canal/appariement ainsi que de `commands.useAccessGroups`. Les expéditeurs non autorisés voient les directives traitées comme du texte brut.
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
  Active l'analyse des `/...` dans les messages de chat. Sur les interfaces sans commandes natives (WhatsApp, WebChat, Signal, iMessage, Google Chat, Microsoft Teams), les commandes texte fonctionnent même lorsqu'elles sont définies sur `false`.
</ParamField>

<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  Enregistre les commandes natives. Auto : activé pour Discord/Telegram ; désactivé pour Slack ;
  ignoré pour les fournisseurs sans support natif. Remplacer par canal avec
  `channels.<provider>.commands.native`. Sur Discord, `false` ignore l'enregistrement
  des commandes slash ; les commandes précédemment enregistrées peuvent rester visibles jusqu'à leur suppression.
</ParamField>

<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  Enregistre nativement les commandes de compétence lorsque pris en charge. Auto : activé pour
  Discord/Telegram ; désactivé pour Slack. Remplacer par
  `channels.<provider>.commands.nativeSkills`.
</ParamField>

<ParamField path="commands.bash" type="boolean" default="false">
  Active `! <cmd>` pour exécuter des commandes shell de l'hôte (alias `/bash <cmd>`). Nécessite
  des listes d'autorisation `tools.elevated`.
</ParamField>

<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  Durée d'attente de bash avant de passer en mode arrière-plan (`0` passe en arrière-plan immédiatement).
</ParamField>

<ParamField path="commands.config" type="boolean" default="false">
  Active `/config` (lit/écrit `openclaw.json`). Réservé au propriétaire.
</ParamField>

<ParamField path="commands.mcp" type="boolean" default="false">
  Active `/mcp` (lit/écrit la config MCP gérée par OpenClaw sous `mcp.servers`). Réservé au propriétaire.
</ParamField>

<ParamField path="commands.plugins" type="boolean" default="false">
  Active `/plugins` (découverte/statut des plugins plus installation + activation/désactivation). Réservé au propriétaire pour l'écriture.
</ParamField>

<ParamField path="commands.debug" type="boolean" default="false">
  Active `/debug` (surcharges de configuration uniquement à l'exécution). Réservé au propriétaire.
</ParamField>

<ParamField path="commands.restart" type="boolean" default="true">
  Active `/restart` et les actions de l'outil de redémarrage de la passerelle.
</ParamField>

<ParamField path="commands.ownerAllowFrom" type="string[]">
  Liste d'autorisation explicite du propriétaire pour les surfaces de commande réservées au propriétaire. Séparé de `commands.allowFrom` et de l'accès par jumelage DM.
</ParamField>

<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  Par canal : nécessite l'identité du propriétaire pour les commandes réservées au propriétaire. Lorsque `true`, l'expéditeur doit correspondre à `commands.ownerAllowFrom` ou détenir la portée `operator.admin` interne. Une entrée avec caractère générique `allowFrom` n'est **pas** suffisante.
</ParamField>

<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  Contrôle l'apparence des identifiants de propriétaire dans l'invite système.
</ParamField>

<ParamField path="commands.ownerDisplaySecret" type="string">
  Secret HMAC utilisé lors de `commands.ownerDisplay: "hash"`.
</ParamField>

<ParamField path="commands.allowFrom" type="object">
  Liste d'autorisation par fournisseur pour l'autorisation des commandes. Lorsqu'elle est configurée, c'est l'**unique** source d'autorisation pour les commandes et les directives. Utilisez `"*"` pour un paramètre par défaut global ; les clés spécifiques au fournisseur la remplacent.
</ParamField>

<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  Applique les listes d'autorisation/stratégies pour les commandes lorsque `commands.allowFrom` n'est pas défini.
</ParamField>

## Liste des commandes

Les commandes proviennent de trois sources :

- **Intégrées de base :** `src/auto-reply/commands-registry.shared.ts`
- **Commandes générées par le dock :** `src/auto-reply/commands-registry.data.ts`
- **Commandes de plugin :** appels plugin `registerCommand()`

La disponibilité dépend des indicateurs de configuration, de la surface du canal et des plugins installés/activés.

### Commandes de base

<AccordionGroup>
  <Accordion title="Sessions et exécutions">
    | Commande | Description |
    | --- | --- |
    | `/new [model]` | Archiver la session actuelle et en démarrer une nouvelle |
    | `/reset [soft [message]]` | Réinitialiser la session actuelle sur place. `soft`CLI conserve la transcription, supprime les identifiants de session backend CLI réutilisés et relance le démarrage |
    | `/compact [instructions]` | Compacter le contexte de la session. Voir [Compactage](/fr/concepts/compaction) |
    | `/stop` | Annuler l'exécution actuelle |
    | `/session idle <duration\|off>` | Gérer l'expiration d'inactivité de la liaison de thread |
    | `/session max-age <duration\|off>` | Gérer l'expiration de l'ancienneté maximale de la liaison de thread |
    | `/export-session [path]` | Exporter la session actuelle au format HTML. Alias : `/export` |
    | `/export-trajectory [path]` | Exporter un bundle de trajectoire JSONL pour la session actuelle. Alias : `/trajectory` |

    <Note>
      L'interface de contrôle intercepte la commande `/new` saisie pour créer et passer à une nouvelle session de tableau de bord, sauf si `session.dmScope: "main"` est configuré et que le parent actuel est la session principale de l'agent — dans ce cas, `/new` réinitialise la session principale sur place. La commande `/reset` saisie exécute toujours la réinitialisation sur place du Gateway.
    </Note>

  </Accordion>

  <Accordion title="Modèle et contrôles d'exécution">
    | Commande | Description |
    | --- | --- |
    | `/think <level\|default>` | Définit le niveau de réflexion ou efface la substitution de session. Alias : `/thinking`, `/t` |
    | `/verbose on\|off\|full` | Active/désactive la sortie verbeuse. Alias : `/v` |
    | `/trace on\|off` | Active/désactive la sortie de trace du plugin pour la session actuelle |
    | `/fast [status\|on\|off\|default]` | Affiche, définit ou efface le mode rapide |
    | `/reasoning [on\|off\|stream]` | Active/désactive la visibilité du raisonnement. Alias : `/reason` |
    | `/elevated [on\|off\|ask\|full]` | Active/désactive le mode élevé. Alias : `/elev` |
    | `/exec host=<auto\|sandbox\|gateway\|node> security=<deny\|allowlist\|full> ask=<off\|on-miss\|always> node=<id>` | Affiche ou définit les valeurs par défaut d'exécution |
    | `/model [name\|#\|status]` | Affiche ou définit le modèle |
    | `/models [provider] [page] [limit=<n>\|all]` | Liste les fournisseurs ou modèles configurés/disponibles via authentification |
    | `/queue <mode>` | Gère le comportement de la file d'exécution active. Voir [File d'attente](/fr/concepts/queue) et [Pilotage de la file d'attente](/fr/concepts/queue-steering) |
    | `/steer <message>` | Injecte des directives dans l'exécution active. Alias : `/tell`. Voir [Pilotage](/fr/tools/steer) |

    <AccordionGroup>
      <Accordion title="verbeux / trace / rapide / sécurité du raisonnement">
        - `/verbose` est destiné au débogage — gardez-le désactivé en usage normal.
        - `/trace` n'affiche que les lignes de trace/débogage appartenant au plugin ; les bavardages verbeux normaux restent désactivés.
        - `/fast on|off` persiste une substitution de session ; utilisez l'option `inherit` de l'interface Sessions pour l'effacer.
        - `/fast` est spécifique au fournisseur : OpenAI/Codex le mappent à `service_tier=priority` ; les requêtes directes Anthropic le mappent à `service_tier=auto` ou `standard_only`.
        - `/reasoning`, `/verbose`, et `/trace` sont risqués dans les contextes de groupe — ils peuvent révéler le raisonnement interne ou des diagnostics de plugins. Gardez-les désactivés dans les discussions de groupe.

      </Accordion>
      <Accordion title="Détails du changement de modèle">
        - `/model` enregistre le nouveau modèle immédiatement dans la session.
        - Si l'agent est inactif, la prochaine exécution l'utilise tout de suite.
        - Si une exécution est active, le changement est marqué en attente et appliqué au prochain point propre de nouvelle tentative.

      </Accordion>
    </AccordionGroup>

  </Accordion>

  <Accordion title="Discovery et statut">
    | Commande | Description |
    | --- | --- |
    | `/help` | Afficher le bref résumé de l'aide |
    | `/commands` | Afficher le catalogue de commandes généré |
    | `/tools [compact\|verbose]` | Afficher ce que l'agent actuel peut utiliser maintenant |
    | `/status` | Afficher le statut d'exécution, la disponibilité du Gateway et du système, ainsi que l'utilisation/quota du provider |
    | `/goal [status\|start\|pause\|resume\|complete\|block\|clear] ...` | Gérer l'objectif durable [goal](/fr/tools/goal) de la session actuelle |
    | `/diagnostics [note]` | Flux de rapport de support réservé au propriétaire. Demande une approbation d'exécution à chaque fois |
    | `/crestodian <request>` | Exécuter l'assistant de configuration et de réparation de Crestodian depuis un DM de propriétaire |
    | `/tasks` | Lister les tâches d'arrière-plan actives/récentes pour la session actuelle |
    | `/context [list\|detail\|map\|json]` | Expliquer comment le contexte est assemblé |
    | `/whoami` | Afficher votre identifiant d'expéditeur. Alias : `/id` |
    | `/usage off\|tokens\|full\|cost` | Contrôler le pied de page d'utilisation par réponse ou imprimer un résumé des coûts locaux |
  </Accordion>

  <Accordion title="Skills, listes d'autorisation, approbations">
    | Commande | Description |
    | --- | --- |
    | `/skill <name> [input]` | Exécuter une skill par son nom |
    | `/allowlist [list\|add\|remove] ...` | Gérer les entrées de la liste d'autorisation. Texte uniquement |
    | `/approve <id> <decision>` | Résoudre les invites d'approbation exec ou plugin |
    | `/btw <question>` | Poser une question annexe sans changer le contexte de la session. Alias : `/side`. Voir [BTW](/fr/tools/btw) |
  </Accordion>

  <Accordion title="Subagents and ACP">
    | Command | Description |
    | --- | --- |
    | `/subagents list\|log\|info` | Inspect sub-agent runs for the current session |
    | `/acp spawn\|cancel\|steer\|close\|sessions\|status\|set-mode\|set\|cwd\|permissions\|timeout\|model\|reset-options\|doctor\|install\|help` | Manage ACP sessions and runtime options |
    | `/focus <target>` | Bind the current Discord thread or Telegram topic to a session target |
    | `/unfocus` | Remove the current thread binding |
    | `/agents` | List thread-bound agents for the current session |
  </Accordion>

<Accordion title="Owner-only writes and admin">
  | Command | Requires | Description | | --- | --- | --- | | `/config show\|get\|set\|unset` | `commands.config: true` | Read or write `openclaw.json`. Owner-only | | `/mcp show\|get\|set\|unset` | `commands.mcp: true` | Read or write OpenClaw-managed MCP server config. Owner-only | | `/plugins list\|inspect\|show\|get\|install\|enable\|disable` | `commands.plugins: true` | Inspect or mutate
  plugin state. Owner-only for writes. Alias: `/plugin` | | `/debug show\|set\|unset\|reset` | `commands.debug: true` | Runtime-only config overrides. Owner-only | | `/restart` | `commands.restart: true` (default) | Restart OpenClaw | | `/send on\|off\|inherit` | owner | Set send policy |
</Accordion>

  <Accordion title="Voice, TTS, channel control">
    | Command | Description |
    | --- | --- |
    | `/tts on\|off\|status\|chat\|latest\|provider\|limit\|summary\|audio\|help` | Control TTS. See [TTS](/fr/tools/tts) |
    | `/activation mention\|always` | Set group activation mode |
    | `/bash <command>` | Run a host shell command. Alias: `! <command>`. Requires `commands.bash: true` |
    | `!poll [sessionId]` | Check a background bash job |
    | `!stop [sessionId]` | Stop a background bash job |
  </Accordion>
</AccordionGroup>

### Dock commands

Les commandes d'amarrage redirigent la route de réponse de la session active vers un autre canal lié.
Voir [Amarrage de canal](/fr/concepts/channel-docking) pour la configuration et le dépannage.

Générées à partir de plugins de canal prenant en charge les commandes natives :

- `/dock-discord` (alias : `/dock_discord`)
- `/dock-mattermost` (alias : `/dock_mattermost`)
- `/dock-slack` (alias : `/dock_slack`)
- `/dock-telegram` (alias : `/dock_telegram`)

Les commandes d'amarrage nécessitent `session.identityLinks`. L'expéditeur source et le pair cible
doivent appartenir au même groupe d'identité.

### Commandes de plugin groupées

| Commande                                                                                     | Description                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/dreaming [on\|off\|status\|help]`                                                          | Activer/désactiver le rêve de la mémoire. Voir [Rêve](/fr/concepts/dreaming)                         |
| `/pair [qr\|status\|pending\|approve\|cleanup\|notify]`                                      | Gérer l'appairage des appareils. Voir [Appairage](/fr/channels/pairing)                              |
| `/phone status\|arm ...\|disarm`                                                             | Armer temporairement les commandes de nœud de téléphone à haut risque                                |
| `/voice status\|list\|set <voiceId>`                                                         | Gérer la configuration vocale de Talk. Nom natif Discord : `/talkvoice`                              |
| `/card ...`                                                                                  | Envoyer des présélections de cartes riches LINE. Voir [LINE](/fr/channels/line)                      |
| `/codex status\|models\|threads\|resume\|compact\|review\|diagnostics\|account\|mcp\|skills` | Contrôler le harnais de serveur d'application Codex. Voir [Harnais Codex](/fr/plugins/codex-harness) |

Uniquement QQBot : `/bot-ping`, `/bot-version`, `/bot-help`, `/bot-upgrade`, `/bot-logs`

### Commandes de Skills

Les skills invocables par l'utilisateur sont exposées en tant que commandes slash :

- `/skill <name> [input]` fonctionne toujours comme point d'entrée générique.
- Les skills peuvent s'enregistrer en tant que commandes directes (par exemple `/prose` pour OpenProse).
- L'enregistrement natif des commandes de skills est contrôlé par `commands.nativeSkills` et
  `channels.<provider>.commands.nativeSkills`.
- Les noms sont nettoyés en `a-z0-9_` (max 32 caractères) ; les collisions reçoivent des suffixes numériques.

<AccordionGroup>
  <Accordion title="Skill command dispatch">
    Par défaut, les commandes de compétences sont routées vers le modèle comme une demande normale.

    Les compétences peuvent déclarer `command-dispatch: tool` pour router directement vers un outil
    (déterministe, sans intervention du modèle). Exemple : `/prose` (plugin OpenProse)
    — voir [OpenProse](/fr/prose).

  </Accordion>
  <Accordion title="Native command arguments">
    Discord utilise l'autocomplétion pour les options dynamiques et les menus de boutons lorsque les
    arguments requis sont omis. Telegram et Slack affichent un menu de boutons pour les commandes avec
    choix. Les choix dynamiques sont résolus par rapport au modèle de session cible, donc les options
    spécifiques au modèle comme les niveaux `/think` suivent la substitution de `/model` de la session.
  </Accordion>
</AccordionGroup>

## `/tools` — ce que l'agent peut utiliser maintenant

`/tools` répond à une question d'exécution : **ce que cet agent peut utiliser right now in this
conversation** — pas un catalogue de configuration statique.

```text
/tools         # compact view
/tools verbose # with short descriptions
```

Les résultats sont limités à la session. Changer l'agent, le channel, le fil, l'autorisation
de l'expéditeur ou le modèle peut modifier la sortie. Pour l'édition du profil et des substitutions,
utilisez le panneau Outils de l'interface de contrôle ou les surfaces de configuration.

## `/model` — sélection du modèle

```text
/model             # show model picker
/model list        # same
/model 3           # select by number from picker
/model openai/gpt-5.4
/model opus@anthropic:default
/model status      # detailed view with endpoint and API mode
```

Sur Discord, `/model` et `/models` ouvrent un sélecteur interactif avec des menus déroulants pour le fournisseur et
le modèle. Le sélecteur respecte `agents.defaults.models`, y compris
les entrées `provider/*`.

## `/config` — écritures de configuration sur disque

<Note>Réservé au propriétaire. Désactivé par défaut — activer avec `commands.config: true`.</Note>

```text
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

La configuration est validée avant l'écriture. Les modifications non valides sont rejetées. Les mises à jour `/config`
persistent après les redémarrages.

## `/mcp` — configuration du serveur MCP

<Note>Réservé au propriétaire. Désactivé par défaut — activer avec `commands.mcp: true`.</Note>

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

`/mcp` stocke la configuration dans la configuration OpenClaw, et non dans les paramètres du projet embedded-agent.

## `/debug` — substitutions uniquement à l'exécution

<Note>Réservé au propriétaire. Désactivé par défaut — activez avec `commands.debug: true`. Les substitutions s'appliquent immédiatement aux nouvelles lectures de configuration mais n'écrivent **pas** sur le disque.</Note>

```text
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

## `/plugins` — gestion des plugins

<Note>Réservé au propriétaire pour l'écriture. Désactivé par défaut — activez avec `commands.plugins: true`.</Note>

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
/plugins install ./path/to/plugin
```

`/plugins enable|disable` met à jour la configuration du plugin et recharge à chaud le runtime du plugin Gateway
pour les nouveaux tours de l'agent. `/plugins install` redémarre automatiquement
les Gateways gérés car les modules source des plugins ont changé.

## `/trace` — sortie de trace du plugin

```text
/trace          # show current trace state
/trace on
/trace off
```

`/trace` révèle les lignes de trace/débogage du plugin limitées à la session sans activer le mode
verbeux complet. Cela ne remplace pas `/debug` (substitutions à l'exécution) ni `/verbose` (sortie
d'outil normale).

## `/btw` — questions secondaires

`/btw` est une question secondaire rapide sur le contexte de la session actuelle. Alias : `/side`.

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

Contrairement à un message normal :

- Utilise la session actuelle comme contexte d'arrière-plan.
- Dans les sessions de harnais Codex, s'exécute en tant que fil secondaire éphémère Codex.
- Ne modifie **pas** le contexte de la session future.
- N'est pas écrit dans l'historique de la transcription.

Voir [Questions secondaires BTW](/fr/tools/btw) pour le comportement complet.

## Notes de surface

<AccordionGroup>
  <Accordion title="Portée de la session par surface">
    - **Commandes texte :** exécutées dans la session de chat normale (les DMs partagent `main`Discord, les groupes ont leur propre session).
    - **Commandes natives Discord :** `agent:<agentId>:discord:slash:<userId>`Slack
    - **Commandes natives Slack :** `agent:<agentId>:slack:slash:<userId>` (préfixe configurable via `channels.slack.slashCommand.sessionPrefix`Telegram)
    - **Commandes natives Telegram :** `telegram:slash:<userId>` (cible la session de chat via `CommandTargetSessionKey`)
    - **`/stop`** cible la session de chat active pour abandonner l'exécution en cours.

  </Accordion>
  <Accordion title="SlackSpécificités Slack">
    `channels.slack.slashCommand` prend en charge une seule commande de style `/openclaw`.
    Avec `commands.native: true`Slack, créez une commande slash Slack par commande
    intégrée. Enregistrez `/agentstatus` (et non `/status`Slack) car Slack réserve
    `/status`. Le texte `/status`Slack fonctionne toujours dans les messages Slack.
  </Accordion>
  <Accordion title="Raccourcis de chemin rapide et en ligne">
    - Les messages contenant uniquement des commandes provenant d'expéditeurs autorisés sont traités immédiatement (contournent la file + le modèle).
    - Les raccourcis en ligne (`/help`, `/commands`, `/status`, `/whoami`) fonctionnent également intégrés dans les messages normaux et sont supprimés avant que le modèle ne voie le texte restant.
    - Les messages contenant uniquement des commandes non autorisées sont ignorés silencieusement ; les jetons `/...` en ligne sont traités comme du texte brut.

  </Accordion>
  <Accordion title="Notes sur les arguments">
    - Les commandes acceptent un `:` facultatif entre la commande et les arguments (`/think: high`, `/send: on`).
    - `/new <model>` accepte un alias de modèle, `provider/model`, ou un nom de fournisseur (correspondance approximative) ; en l'absence de correspondance, le texte est traité comme le corps du message.
    - `/allowlist add|remove` nécessite `commands.config: true` et respecte le `configWrites` du canal.

  </Accordion>
</AccordionGroup>

## Utilisation et statut du fournisseur

- **Utilisation/quota du fournisseur** (par exemple, « Claude 80 % restant ») s'affiche dans `/status` pour le fournisseur de modèle actuel lorsque le suivi de l'utilisation est activé.
- **Lignes de jetons/cache** dans `/status` peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de la session en direct est clairsemé.
- **Exécution vs runtime :** `/status` signale `Execution` pour le chemin effectif du bac à sable et `Runtime` pour celui qui exécute la session : `OpenClaw Default`, `OpenAI Codex`, un backend CLI, ou un backend ACP.
- **Jetons/coût par réponse :** contrôlés par `/usage off|tokens|full`.
- `/model status` concerne les modèles/auth/points de terminaison, pas l'utilisation.

## Connexes

<CardGroup cols={2}>
  <Card title="Skills" href="/fr/tools/skills" icon="puzzle-piece">
    Comment les commandes slash de compétences sont enregistrées et contrôlées.
  </Card>
  <Card title="Créer des compétences" href="/fr/tools/creating-skills" icon="hammer">
    Construire une compétence qui enregistre sa propre commande slash.
  </Card>
  <Card title="BTW" href="/fr/tools/btw" icon="comments">
    Questions annexes sans changer le contexte de la session.
  </Card>
  <Card title="Diriger" href="/fr/tools/steer" icon="boussole">
    Guidez l'agent en cours d'exécution avec `/steer`.
  </Card>
</CardGroup>
