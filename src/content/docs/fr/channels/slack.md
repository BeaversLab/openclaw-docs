---
summary: "Configuration et comportement d'exécution de Slack (Mode Socket + API d'événements HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

État : prêt pour la production pour les MDs + les canaux via les intégrations d'applications Slack. Le mode par défaut est le Mode Socket ; le mode API d'événements HTTP est également pris en charge.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    Les messages privés Slack (DMs) sont en mode couplage par défaut.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/en/tools/slash-commands">
    Comportement des commandes natives et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/en/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-canal.
  </Card>
</CardGroup>

## Configuration rapide

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create Slack app and tokens">
        Dans les paramètres de l'application Slack :

        - activer le **Mode Socket**
        - créer un **Jeton d'application** (`xapp-...`) avec `connections:write`
        - installer l'application et copier le **Jeton Bot** (`xoxb-...`)
      </Step>

      <Step title="Configure OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        Fallback d'environnement (compte par défaut uniquement) :

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Subscribe app events">
        Abonnez les événements bot pour :

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        Activez également l'onglet **Messages** de l'accueil de l'application pour les DMs.
      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="Mode API événements HTTP">
    <Steps>
      <Step title="Configurer l'application Slack pour HTTP">

        - définir le mode sur HTTP (`channels.slack.mode="http"`)
        - copier le **Signing Secret** Slack
        - définir les URL de requête des abonnements aux événements + interactivité + commandes slash sur le même chemin webhook (par défaut `/slack/events`)

      </Step>

      <Step title="Configurer le mode HTTP OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

      </Step>

      <Step title="Utiliser des chemins webhook uniques pour le HTTP multi-compte">
        Le mode HTTP par compte est pris en charge.

        Attribuez un `webhookPath` distinct à chaque compte afin que les enregistrements n'entrent pas en collision.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Modèle de jeton

- `botToken` + `appToken` sont requis pour le mode Socket.
- Le mode HTTP nécessite `botToken` + `signingSecret`.
- Les jetons de configuration prévalent sur le repli d'environnement.
- Le repli d'environnement `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` s'applique uniquement au compte par défaut.
- `userToken` (`xoxp-...`) est en configuration uniquement (pas de repli d'environnement) et par défaut à un comportement en lecture seule (`userTokenReadOnly: true`).
- Optionnel : ajoutez `chat:write.customize` si vous voulez que les messages sortants utilisent l'identité de l'agent actif (`username` personnalisé et icône). `icon_emoji` utilise la syntaxe `:emoji_name:`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être préféré lorsqu'il est configuré. Pour les écritures, le jeton bot reste préféré ; les écritures par jeton utilisateur ne sont autorisées que lorsque `userTokenReadOnly: false` et que le jeton bot n'est pas disponible.</Tip>

## Contrôle d'accès et routage

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` contrôle l'accès aux DM (ancien : `channels.slack.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite `channels.slack.allowFrom` pour inclure `"*"` ; ancien : `channels.slack.dm.allowFrom`)
    - `disabled`

    Indicateurs DM :

    - `dm.enabled` (true par défaut)
    - `channels.slack.allowFrom` (préféré)
    - `dm.allowFrom` (ancien)
    - `dm.groupEnabled` (les DM de groupe sont false par défaut)
    - `dm.groupChannels` (liste d'autorisation MPIM facultative)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas défini.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    L'appairage dans les DM utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des channels se trouve sous `channels.slack.channels` et doit utiliser des IDs de channel stables.

    Note d'exécution : si `channels.slack` est totalement manquant (configuration uniquement env), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution Nom/ID :

    - les entrées de la liste d'autorisation des channels et les entrées de la liste d'autorisation des DM sont résolues au démarrage lorsque l'accès par jeton le permet
    - les entrées de nom de channel non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels sont basés sur l'ID par défaut ; la correspondance directe du nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions and channel users">
    Les messages de canal sont filtrés par mention par défaut.

    Sources de mention :

    - mention explicite de l'application (`<@botId>`)
    - motifs de regex de mention (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans un fil

    Contrôles par canal (`channels.slack.channels.<id>`; noms uniquement via résolution au démarrage ou `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (liste d'autorisation)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - format de clé `toolsBySender` : `id:`, `e164:`, `username:`, `name:`, ou joker `"*"`
      (les clés héritées sans préfixe mappent toujours uniquement vers `id:`)

  </Tab>
</Tabs>

## Commandes et comportement slash

- Le mode automatique des commandes natives est **désactivé** pour Slack (`commands.native: "auto"` n'active pas les commandes natives Slack).
- Activez les gestionnaires de commandes natives Slack avec `channels.slack.commands.native: true` (ou `commands.native: true` global).
- Lorsque les commandes natives sont activées, enregistrez les commandes slash correspondantes dans Slack (noms `/<command>`), avec une exception :
  - enregistrez `/agentstatus` pour la commande de statut (Slack réserve `/status`)
- Si les commandes natives ne sont pas activées, vous pouvez exécuter une seule commande slash configurée via `channels.slack.slashCommand`.
- Les menus d'arguments natifs adaptent désormais leur stratégie de rendu :
  - jusqu'à 5 options : blocs de boutons
  - 6-100 options : menu de sélection statique
  - plus de 100 options : sélection externe avec filtrage asynchrone des options lorsque les gestionnaires d'options d'interactivité sont disponibles
  - si les valeurs d'option encodées dépassent les limites Slack, le flux revient aux boutons
- Pour les payloads d'option longs, les menus d'arguments de commande Slash utilisent une boîte de dialogue de confirmation avant d'envoyer une valeur sélectionnée.

## Réponses interactives

Slack peut restituer des contrôles de réponse interactifs créés par l'agent, mais cette fonctionnalité est désactivée par défaut.

Activez-la globalement :

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

Ou activez-la pour un seul compte Slack :

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

Lorsqu'elle est activée, les agents peuvent émettre des directives de réponse exclusives à Slack :

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Ces directives sont compilées en Slack Block Kit et acheminent les clics ou les sélections via le chemin d'événement d'interaction Slack existant.

Remarques :

- Il s'agit d'une interface utilisateur spécifique à Slack. Les autres canaux ne traduisent pas les directives Slack Block Kit dans leurs propres systèmes de boutons.
- Les valeurs de rappel interactives sont des jetons opaques générés par OpenClaw, et non des valeurs brutes créées par l'agent.
- Si les blocs interactifs générés dépassaient les limites de Slack Block Kit, OpenClaw reviendrait à la réponse textuelle d'origine au lieu d'envoyer un payload de blocs non valide.

Paramètres par défaut des commandes Slash :

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Les sessions Slash utilisent des clés isolées :

- `agent:<agentId>:slack:slash:<userId>`

et toujours router l'exécution de la commande vers la session de conversation cible (`CommandTargetSessionKey`).

## Fils de discussion, sessions et balises de réponse

- Les DMs routent en tant que `direct` ; les canaux en tant que `channel` ; les MPIM en tant que `group`.
- Avec `session.dmScope=main` par défaut, les Slack DMs sont réduits à la session principale de l'agent.
- Sessions de channel : `agent:<agentId>:slack:channel:<channelId>`.
- Les réponses aux fils peuvent créer des suffixes de session de fil (`:thread:<threadTs>`) le cas échéant.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; la valeur par défaut de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle combien de messages de fil existants sont récupérés lorsqu'une nouvelle session de fil commence (par défaut `20` ; définir `0` pour désactiver).

Contrôles des fils de réponse :

- `channels.slack.replyToMode` : `off|first|all` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les chats directs : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Remarque : `replyToMode="off"` désactive **tous** les fils de réponse dans Slack, y compris les balises `[[reply_to_*]]` explicites. Cela diffère de Telegram, où les balises explicites sont toujours respectées en mode `"off"`. La différence reflète les modèles de fils de discussion des plateformes : les fils de Slack masquent les messages du channel, tandis que les réponses Telegram restent visibles dans le flux de chat principal.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes">
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de requêtes authentifiées par token) et écrites dans le média store lorsque la récupération réussit et que les limites de taille le permettent.

    La limite de taille entrante à l'exécution est `20MB` par défaut, sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texte et fichiers sortants">
  - les segments de texte utilisent `channels.slack.textChunkLimit` (par défaut 4000) - `channels.slack.chunkMode="newline"` active le découpage prioritaire par paragraphe - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil (`thread_ts`) - la limite des médias sortants suit `channels.slack.mediaMaxMb` lorsqu'elle est configurée ; sinon, les
  envois vers le channel utilisent les valeurs par défaut de type MIME du pipeline média
</Accordion>

  <Accordion title="Cibles de livraison">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les channels

    Les DMs Slack sont ouverts via les API de conversation Slack lors de l'envoi vers des cibles utilisateur.

  </Accordion>
</AccordionGroup>

## Actions et portes

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans les outils Slack actuels :

| Groupe     | Par défaut |
| ---------- | ---------- |
| messages   | activé     |
| réactions  | activé     |
| épingles   | activé     |
| memberInfo | activé     |
| emojiList  | activé     |

Les actions de message Slack actuelles incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`.

## Événements et comportement opérationnel

- Les modifications/suppressions de messages et les diffusions de fils de discussion sont mappées sur des événements système.
- Les événements d'ajout et de suppression de réactions sont mappés sur des événements système.
- Les événements d'arrivée/départ de membres, de création/de renommage de canal et d'ajout/suppression d'épingles sont mappés sur des événements système.
- Les mises à jour de statut de fil de l'assistant (pour les indicateurs "est en train d'écrire..." dans les fils) utilisent `assistant.threads.setStatus` et nécessitent la portée de bot `assistant:write`.
- `channel_id_changed` peut migrer les clés de configuration du channel lorsque `configWrites` est activé.
- Les métadonnées de sujet/d'objet du canal sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- Les actions de bloc et les interactions modales émettent des événements système `Slack interaction: ...` structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, étiquettes, valeurs du sélecteur et métadonnées `workflow_*`
  - événements modaux `view_submission` et `view_closed` avec des métadonnées de channel routées et des entrées de formulaire

## Réactions d'accusé de réception

`ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de repli pour l'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des shortcodes (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Secours de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message entrant Slack pendant que OpenClaw traite une réponse, puis la supprime une fois l'exécution terminée. Il s'agit d'un mécanisme de secours utile lorsque la frappe native de l'assistant Slack n'est pas disponible, surtout dans les DMs.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des shortcodes (par exemple `"hourglass_flowing_sand"`).
- La réaction est effectuée sur la base du meilleur effort et le nettoyage est tenté automatiquement après l'achèvement de la réponse ou du chemin d'échec.

## Liste de contrôle du manifeste et de la portée

<AccordionGroup>
  <Accordion title="Slack app manifest example">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "channels:read", "groups:history", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "users:read", "app_mentions:read", "assistant:write", "reactions:read", "reactions:write", "pins:read", "pins:write", "emoji:read", "commands", "files:read", "files:write"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "message.channels", "message.groups", "message.im", "message.mpim", "reaction_added", "reaction_removed", "member_joined_channel", "member_left_channel", "channel_rename", "pin_added", "pin_removed"]
    }
  }
}
```

  </Accordion>

  <Accordion title="Portées de jeton utilisateur optionnelles (opérations de lecture)">
    Si vous configurez `channels.slack.userToken`, les portées de lecture typiques sont :

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (si vous dépendez des lectures de recherche Slack)

  </Accordion>
</AccordionGroup>

## Approbations Exec dans Slack

Les invites d'approbation Exec peuvent être acheminées nativement via Slack en utilisant des boutons interactifs et des interactions, au lieu de revenir à l'interface Web ou au terminal. L'autorisation de l'approbateur est appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou refuser les demandes via Slack.

Cela utilise la même surface de bouton d'approbation partagée que les autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.

La configuration utilise la configuration partagée `approvals.exec` avec les cibles Slack :

```json5
{
  approvals: {
    exec: {
      enabled: true,
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

Le `/approve` dans le même chat fonctionne également dans les canaux Slack et les DMs qui prennent déjà en charge les commandes. Voir [Approbations Exec](/en/tools/exec-approvals) pour le modèle complet de transfert d'approbation.

## Dépannage

<AccordionGroup>
  <Accordion title="Pas de réponses dans les canaux">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - liste d'autorisation des canaux (`channels.slack.channels`)
    - `requireMention`
    - liste d'autorisation `users` par canal

    Commandes utiles :

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Messages DM ignorés">
    Vérifiez :

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (ou l'ancien `channels.slack.dm.policy`)
    - approbations de jumelage / entrées de liste d'autorisation

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Le mode Socket ne se connecte pas">Validez les jetons bot + application et l'activation du mode Socket dans les paramètres de l'application Slack.</Accordion>

  <Accordion title="Le mode HTTP ne reçoit pas d'événements">
    Validez :

    - signing secret
    - chemin du webhook
    - URLs de requête Slack (Events + Interactivity + Slash Commands)
    - `webhookPath` unique par compte HTTP

  </Accordion>

  <Accordion title="Les commandes natives/slash ne se déclenchent pas">
    Vérifiez ce que vous aviez l'intention de faire :

    - mode de commande native (`channels.slack.commands.native: true`) avec des commandes slash correspondantes enregistrées dans Slack
    - ou mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de canal/utilisateur.

  </Accordion>
</AccordionGroup>

## Diffusion de texte en continu

OpenClaw prend en charge la diffusion de texte en continu native Slack via l'API des Agents et des applications IA.

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver la diffusion de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu fragmentées.
- `progress` : afficher le texte d'état de progression lors de la génération, puis envoyer le texte final.

`channels.slack.nativeStreaming` contrôle l'API de streaming native de Slack (API) (`chat.startStream` / `chat.appendStream` / `chat.stopStream`) lorsque `streaming` est `partial` (par défaut : `true`).

Désactiver le streaming natif Slack (conserver le comportement de prévisualisation de brouillon) :

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

Clés héritées :

- `channels.slack.streamMode` (`replace | status_final | append`) est automatiquement migré vers `channels.slack.streaming`.
- Le booléen `channels.slack.streaming` est automatiquement migré vers `channels.slack.nativeStreaming`.

### Conditions requises

1. Activez **Agents and AI Apps** dans les paramètres de votre application Slack.
2. Assurez-vous que l'application dispose de la portée `assistant:write`.
3. Un fil de discussion de réponse doit être disponible pour ce message. La sélection du fil suit toujours `replyToMode`.

### Comportement

- Le premier bloc de texte démarre un flux (`chat.startStream`).
- Les blocs de texte suivants s'ajoutent au même flux (`chat.appendStream`).
- La fin de la réponse finalise le flux (`chat.stopStream`).
- Les médias et les charges utiles non textuelles reviennent à une livraison normale.
- Si le streaming échoue en cours de réponse, OpenClaw revient à une livraison normale pour les charges utiles restantes.

## Pointeurs vers la référence de configuration

Référence principale :

- [Référence de configuration - Slack](/en/gateway/configuration-reference#slack)

  Champs Slack à signal fort :
  - mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (hérité : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - commutateur de compatibilité : `dangerouslyAllowNameMatching` (bris de verre ; désactiver sauf en cas de besoin)
  - accès channel : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - threading/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Connexes

- [Appariement](/en/channels/pairing)
- [Groupes](/en/channels/groups)
- [Sécurité](/en/gateway/security)
- [Routage de canal](/en/channels/channel-routing)
- [Dépannage](/en/channels/troubleshooting)
- [Configuration](/en/gateway/configuration)
- [Commandes slash](/en/tools/slash-commands)
