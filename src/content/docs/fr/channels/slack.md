---
summary: "Configuration et comportement d'exécution de Slack (Mode Socket + API d'événements HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

État : prêt pour la production pour les MDs + les canaux via les intégrations d'applications Slack. Le mode par défaut est le Mode Socket ; le mode API d'événements HTTP est également pris en charge.

<CardGroup cols={3}>
  <Card title="Appairage" icon="link" href="/en/channels/pairing">
    Les MD Slack sont par défaut en mode d'appairage.
  </Card>
  <Card title="Commandes slash" icon="terminal" href="/en/tools/slash-commands">
    Comportement natif des commandes et catalogue des commandes.
  </Card>
  <Card title="Dépannage de chaîne" icon="wrench" href="/en/channels/troubleshooting">
    Playbooks de diagnostic et de réparation inter-canaux.
  </Card>
</CardGroup>

## Configuration rapide

<Tabs>
  <Tab title="Mode Socket (par défaut)">
    <Steps>
      <Step title="Créer l'application Slack et les jetons">
        Dans les paramètres de l'application Slack :

        - activer **Socket Mode**
        - créer un **Jeton d'application** (`xapp-...`) avec `connections:write`
        - installer l'application et copier le **Jeton Bot** (`xoxb-...`)
      </Step>

      <Step title="Configurer OpenClaw">

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

        Secours d'env (compte par défaut uniquement) :

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="S'abonner aux événements de l'application">
        S'abonner aux événements bot pour :

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        Activer également l'onglet **Messages** de l'Accueil de l'application pour les MD.
      </Step>

      <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="Mode API des événements HTTP">
    <Steps>
      <Step title="Configurer l'application API pour HTTP">

        - définir le mode sur HTTP (`channels.slack.mode="http"`)
        - copier la **clé de signature** (Signing Secret) Slack
        - définir l'URL de requête pour les abonnements aux événements + l'interactivité + les commandes slash sur le même chemin webhook (par défaut `/slack/events`)

      </Step>

      <Step title="Configurer le mode HTTP Slack">

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

        Attribuez à chaque compte un `webhookPath` distinct afin que les enregistrements n'entrent pas en collision.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Liste de contrôle pour le manifeste et les étendues (scopes)

<AccordionGroup>
  <Accordion title="Slack app manifest example" defaultOpen>

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

  </Accordion>

  <Accordion title="Étendues (scopes) de jeton utilisateur optionnelles (opérations de lecture)">
    Si vous configurez `channels.slack.userToken`, les étendues de lecture typiques sont :

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (si vous dépendez des lectures de recherche Slack)

  </Accordion>
</AccordionGroup>

## Modèle de jeton (Token model)

- `botToken` + `appToken` sont requis pour le mode Socket.
- Le mode HTTP nécessite `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent des
  chaînes en texte brut ou des objets SecretRef.
- Les jetons de configuration (Config tokens) priment sur le repli d'environnement (env fallback).
- Le repli d'environnement `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` ne s'applique qu'au compte par défaut.
- `userToken` (`xoxp-...`) est réservé à la configuration (pas de repli vers les variables d'environnement) et le comportement par défaut est en lecture seule (`userTokenReadOnly: true`).
- Optionnel : ajoutez `chat:write.customize` si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (`username` et icône personnalisés). `icon_emoji` utilise la syntaxe `:emoji_name:`.

Comportement de l'instantané d'état (Status snapshot) :

- L'inspection du compte Slack suit les champs `*Source` et `*Status` par identifiant (`botToken`, `appToken`, `signingSecret`, `userToken`).
- L'état est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef ou une autre source de secrets non intégrée, mais que le chemin de commande/runtime actuel n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être privilégié lorsqu'il est configuré. Pour les écritures, le jeton bot reste privilégié ; les écritures via jeton utilisateur sont autorisées uniquement lorsque `userTokenReadOnly: false` et que le jeton bot est indisponible.</Tip>

## Actions et portes (Actions and gates)

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans l'outil actuel Slack :

| Groupe     | Par défaut |
| ---------- | ---------- |
| messages   | activé     |
| réactions  | activé     |
| épingles   | activé     |
| memberInfo | activé     |
| emojiList  | activé     |

Les actions de message Slack actuelles incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` contrôle l'accès aux DMs (legacy : `channels.slack.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite `channels.slack.allowFrom` pour inclure `"*"` ; legacy : `channels.slack.dm.allowFrom`)
    - `disabled`

    Indicateurs DM :

    - `dm.enabled` (vrai par défaut)
    - `channels.slack.allowFrom` (préféré)
    - `dm.allowFrom` (legacy)
    - `dm.groupEnabled` (les DMs de groupe sont faux par défaut)
    - `dm.groupChannels` (liste d'autorisation MPIM facultative)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas définie.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    L'appairage dans les DMs utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des channels se trouve sous `channels.slack.channels` et doit utiliser des IDs de channel stables.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration uniquement via env), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution Nom/ID :

    - les entrées de la liste d'autorisation des channels et des DMs sont résolues au démarrage lorsque l'accès par jeton le permet
    - les entrées de nom de channel non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels sont basés sur l'ID par défaut ; la correspondance directe du nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions and channel users">
    Channel messages are mention-gated by default.

    Mention sources:

    - explicit app mention (`<@botId>`)
    - mention regex patterns (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - implicit reply-to-bot thread behavior

    Per-channel controls (`channels.slack.channels.<id>`; names only via startup resolution or `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (allowlist)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` key format: `id:`, `e164:`, `username:`, `name:`, ou `"*"` wildcard
      (legacy unprefixed keys still map to `id:` only)

  </Tab>
</Tabs>

## Threading, sessions, and reply tags

- DMs route as `direct`; channels as `channel`; MPIMs as `group`.
- With default `session.dmScope=main`, Slack DMs collapse to agent main session.
- Channel sessions: `agent:<agentId>:slack:channel:<channelId>`.
- Thread replies can create thread session suffixes (`:thread:<threadTs>`) when applicable.
- `channels.slack.thread.historyScope` default is `thread`; `thread.inheritParent` default is `false`.
- `channels.slack.thread.initialHistoryLimit` controls how many existing thread messages are fetched when a new thread session starts (default `20`; set `0` to disable).

Reply threading controls:

- `channels.slack.replyToMode`: `off|first|all|batched` (default `off`)
- `channels.slack.replyToModeByChatType`: per `direct|group|channel`
- legacy fallback for direct chats: `channels.slack.dm.replyToMode`

Manual reply tags are supported:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Remarque : `replyToMode="off"` désactive **tous** les fils de discussion de réponse dans Slack, y compris les balises `[[reply_to_*]]` explicites. Cela diffère de Telegram, où les balises explicites sont toujours respectées en mode `"off"`. La différence reflète les modèles de fils de discussion de la plateforme : les fils de Slack masquent les messages du channel, tandis que les réponses Telegram restent visibles dans le flux de discussion principal.

## Réactions d'accusé de réception

`ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de repli d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des shortcodes (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Diffusion de texte en continu

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver la diffusion de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu fragmentées.
- `progress` : afficher le texte d'état de progression pendant la génération, puis envoyer le texte final.

`channels.slack.nativeStreaming` contrôle la diffusion de texte native de Slack lorsque `streaming` est `partial` (par défaut : `true`).

- Un fil de discussion de réponse doit être disponible pour que la diffusion de texte native apparaisse. La sélection du fil suit toujours `replyToMode`. Sans cela, l'aperçu de brouillon normal est utilisé.
- Les médias et les charges utiles non textuelles reviennent à la livraison normale.
- Si la diffusion échoue en cours de réponse, OpenClaw revient à la livraison normale pour les charges utiles restantes.

Utiliser l'aperçu de brouillon au lieu de la diffusion de texte native de Slack :

```json5
{
  channels: {
    slack: {
      streaming: "partial",
      nativeStreaming: false,
    },
  },
}
```

Clés héritées :

- `channels.slack.streamMode` (`replace | status_final | append`) est automatiquement migré vers `channels.slack.streaming`.
- le booléen `channels.slack.streaming` est automatiquement migré vers `channels.slack.nativeStreaming`.

## Repli de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message Slack entrant pendant qu'OpenClaw traite une réponse, puis la supprime une fois l'exécution terminée. C'est particulièrement utile en dehors des réponses de fil de discussion, qui utilisent par défaut un indicateur d'état « est en train d'écrire... ».

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes abrégés (par exemple `"hourglass_flowing_sand"`).
- La réaction est de type « best-effort » et un nettoyage est tenté automatiquement après l'achèvement de la réponse ou du chemin d'échec.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes">
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de demande authentifié par jeton) et écrites dans le média store lorsque la récupération réussit et que les limites de taille le permettent.

    La limite de taille entrante à l'exécution est de `20MB` par défaut, sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texte et fichiers sortants">
  - les segments de texte utilisent `channels.slack.textChunkLimit` (4000 par défaut) - `channels.slack.chunkMode="newline"` active le découpage paragraphe en premier - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil de discussion (`thread_ts`) - la limite de média sortant suit `channels.slack.mediaMaxMb` lorsqu'elle est configurée ; sinon
  les envois de canal utilisent les valeurs par défaut de type MIME du pipeline média
</Accordion>

  <Accordion title="Cibles de livraison">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les canaux

    Les DMs Slack sont ouverts via les API de conversation Slack lors de l'envoi aux cibles utilisateur.

  </Accordion>
</AccordionGroup>

## Commandes et comportement slash

- Le mode automatique de commande native est **désactivé** pour Slack (`commands.native: "auto"` n'active pas les commandes natives Slack).
- Activez les gestionnaires de commandes natives Slack avec `channels.slack.commands.native: true` (ou `commands.native: true` global).
- Lorsque les commandes natives sont activées, enregistrez les commandes slash correspondantes dans Slack (noms `/<command>`), avec une exception :
  - enregistrez `/agentstatus` pour la commande de statut (Slack réserve `/status`)
- Si les commandes natives ne sont pas activées, vous pouvez exécuter une seule commande slash configurée via `channels.slack.slashCommand`.
- Les menus d'arguments natifs adaptent désormais leur stratégie de rendu :
  - jusqu'à 5 options : blocs de boutons
  - 6-100 options : menu de sélection statique
  - plus de 100 options : sélection externe avec filtrage d'options asynchrone lorsque les gestionnaires d'options d'interactivité sont disponibles
  - si les valeurs d'option encodées dépassent les limites de Slack, le flux revient aux boutons
- Pour les payloads d'option longs, les menus d'arguments de commande slash utilisent une boîte de dialogue de confirmation avant d'envoyer une valeur sélectionnée.

Paramètres par défaut de la commande slash :

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Les sessions slash utilisent des clés isolées :

- `agent:<agentId>:slack:slash:<userId>`

et acheminent toujours l'exécution de la commande vers la session de conversation cible (`CommandTargetSessionKey`).

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

Notes :

- Il s'agit d'une UI spécifique à Slack. Les autres canaux ne traduisent pas les directives Slack Block Kit dans leurs propres systèmes de boutons.
- Les valeurs de rappel interactives sont des jetons opaques générés par OpenClaw, et non des valeurs brutes créées par l'agent.
- Si les blocs interactifs générés dépassent les limites de Slack Block Kit, OpenClaw revient à la réponse textuelle d'origine au lieu d'envoyer une payload de blocs non valide.

## Approbations Exec dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons et des interactions interactifs, au lieu de revenir à l'interface Web ou au terminal.

- Les approbations Exec utilisent `channels.slack.execApprovals.*` pour le routage natif DM/channel.
- Les approbations de plugins peuvent toujours être résolues via la même surface de bouton native Slack lorsque la demande atterrit déjà dans Slack et que le type d'id d'approbation est `plugin:`.
- L'autorisation de l'approbateur est toujours appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou rejeter des demandes via Slack.

Ceci utilise la même surface de bouton d'approbation partagée que les autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique que les
approbations par chat sont indisponibles ou que l'approbation manuelle est le seul chemin.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (optionnel ; revient à `commands.ownerAllowFrom` lorsque possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou `"auto"` et qu'au moins un
approbateur résout. Définissez `enabled: false` pour désactiver explicitement Slack en tant que client d'approbation natif.
Définissez `enabled: true` pour forcer l'activation des approbations natives lorsque les approbateurs résolvent.

Comportement par défaut sans configuration explicite d'approbation d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native explicite Slack n'est nécessaire que lorsque vous souhaitez remplacer les approbateurs, ajouter des filtres ou
opter pour la livraison vers le chat d'origine :

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

Le transfert partagé `approvals.exec` est distinct. Utilisez-le uniquement lorsque les invites d'approbation d'exécution doivent également
être acheminées vers d'autres chats ou cibles hors bande explicites. Le transfert partagé `approvals.plugin` est également
séparé ; les boutons natifs Slack peuvent toujours résoudre les approbations de plugins lorsque ces demandes atterrissent déjà
dans Slack.

La commande `/approve` dans le même chat fonctionne également dans les canaux et les DMs Slack qui prennent déjà en charge les commandes. Voir [Exec approvals](/en/tools/exec-approvals) pour le modèle complet de transfert d'approbation.

## Événements et comportement opérationnel

- Les modifications de messages, suppressions et diffusions de fils sont mappées en événements système.
- Les événements d'ajout et de suppression de réactions sont mappés en événements système.
- Les événements d'arrivée/départ de membres, de création/nomination de canal, et d'ajout/suppression d'épingles sont mappés en événements système.
- `channel_id_changed` peut migrer les clés de configuration de canal lorsque `configWrites` est activé.
- Les métadonnées du sujet/de l'objet du canal sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- Le lanceur de fil et l'amorçage du contexte de l'historique initial du fil sont filtrés par les listes autorisées d'expéditeurs configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des événements système `Slack interaction: ...` structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, étiquettes, valeurs du sélecteur et métadonnées `workflow_*`
  - événements modaux `view_submission` et `view_closed` avec des métadonnées de canal routées et des entrées de formulaire

## Pointeurs de référence de configuration

Référence principale :

- [Référence de configuration - Slack](/en/gateway/configuration-reference#slack)

  Champs à fort signal Slack :
  - mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (obsolète : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - interrupteur de compatibilité : `dangerouslyAllowNameMatching` (bris de glace ; désactivé sauf en cas de besoin)
  - accès canal : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - fils/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - delivery : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Dépannage

<AccordionGroup>
  <Accordion title="Pas de réponse dans les channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`)
    - `requireMention`
    - per-channel `users` allowlist

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
    - approbations de couplage / entrées de la liste d'autorisation

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Le mode Socket ne se connecte pas">
    Validez les jetons bot + app et l'activation du mode Socket dans les paramètres de l'application Slack.

    Si `openclaw channels status --probe --json` affiche `botTokenStatus` ou
    `appTokenStatus: "configured_unavailable"`, le compte Slack est
    configuré mais l'exécution actuelle n'a pas pu résoudre la valeur
    basée sur SecretRef.

  </Accordion>

  <Accordion title="Le mode HTTP ne reçoit pas d'événements">
    Validez :

    - signing secret
    - chemin du webhook
    - URLs de requête Slack (Events + Interactivity + Slash Commands)
    - `webhookPath` unique par compte HTTP

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les instantanés
    de compte, le compte HTTP est configuré mais l'exécution actuelle n'a pas pu
    résoudre le signing secret basé sur SecretRef.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Vérifiez si vous aviez l'intention d'utiliser :

    - le mode de commande natif (`channels.slack.commands.native: true`) avec des commandes slash correspondantes enregistrées dans Slack
    - ou le mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de canaux/utilisateurs.

  </Accordion>
</AccordionGroup>

## Connexes

- [Appairage](/en/channels/pairing)
- [Groupes](/en/channels/groups)
- [Sécurité](/en/gateway/security)
- [Routage des canaux](/en/channels/channel-routing)
- [Dépannage](/en/channels/troubleshooting)
- [Configuration](/en/gateway/configuration)
- [Commandes slash](/en/tools/slash-commands)
