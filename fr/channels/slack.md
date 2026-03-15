---
summary: "Configuration et comportement d'exécution de Slack (Mode Socket + API d'événements HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

État : prêt pour la production pour les MDs + les canaux via les intégrations d'applications Slack. Le mode par défaut est le Mode Socket ; le mode API d'événements HTTP est également pris en charge.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    Les MDs Slack sont par défaut en mode d'appariement.
  </Card>
  <Card title="Commandes slash" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue des commandes.
  </Card>
  <Card title="Dépannage de canal" icon="wrench" href="/fr/channels/troubleshooting">
    Manuels de diagnostic et de réparation inter-canaux.
  </Card>
</CardGroup>

## Configuration rapide

<Tabs>
  <Tab title="Mode Socket (par défaut)">
    <Steps>
      <Step title="Créer l'application Slack et les jetons">
        Dans les paramètres de l'application Slack :

        - activer le **Mode Socket**
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

        Fallback de l'environnement (compte par défaut uniquement) :

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

        Activer également l'onglet **Messages** de la page d'accueil de l'application pour les DMs.
      </Step>

      <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="Mode API Événements HTTP">
    <Steps>
      <Step title="Configurer l'application API pour HTTP">

        - définir le mode sur HTTP (`channels.slack.mode="http"`)
        - copier la **Signing Secret** Slack
        - définir les URL de requête des abonnements aux événements + de l'interactivité + des commandes slash sur le même chemin webhook (par défaut `/slack/events`)

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

        Donnez à chaque compte un `webhookPath` distinct pour éviter les conflits d'enregistrement.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Modèle de jeton

- `botToken` + `appToken` sont requis pour le mode Socket.
- Le mode HTTP nécessite `botToken` + `signingSecret`.
- Les jetons de configuration prévalent sur le repli d'environnement.
- Le repli d'environnement `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` ne s'applique qu'au compte par défaut.
- `userToken` (`xoxp-...`) est uniquement configurable (pas de repli d'environnement) et par défaut, il se comporte en lecture seule (`userTokenReadOnly: true`).
- Optionnel : ajoutez `chat:write.customize` si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (`username` et icône personnalisés). `icon_emoji` utilise la syntaxe `:emoji_name:`.

<Tip>
  Pour les lectures d'actions/répertoires, le jeton utilisateur peut être privilégié lorsqu'il est
  configuré. Pour les écritures, le jeton bot reste privilégié ; les écritures avec jeton
  utilisateur ne sont autorisées que lorsque `userTokenReadOnly: false` et que le jeton bot est
  indisponible.
</Tip>

## Contrôle d'accès et routage

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` contrôle l'accès aux DMs (ancien : `channels.slack.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite `channels.slack.allowFrom` pour inclure `"*"` ; ancien : `channels.slack.dm.allowFrom`)
    - `disabled`

    Indicateurs DM :

    - `dm.enabled` (true par défaut)
    - `channels.slack.allowFrom` (préféré)
    - `dm.allowFrom` (ancien)
    - `dm.groupEnabled` (false par défaut pour les DM de groupe)
    - `dm.groupChannels` (liste d'autorisation MPIM facultative)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas défini.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    L'appairage dans les DMs utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Stratégie de canal">
    `channels.slack.groupPolicy` contrôle la gestion des canaux :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des canaux se trouve sous `channels.slack.channels` et doit utiliser des identifiants de canal stables.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration via variables d'environnement uniquement), l'exécution revient à `groupPolicy="allowlist"` et consigne un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution de nom/ID :

    - les entrées de la liste d'autorisation des canaux et les entrées de la liste d'autorisation des DM sont résolues au démarrage lorsque l'accès par jeton le permet
    - les entrées de nom de canal non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des canaux privilégient l'ID par défaut ; la correspondance directe de nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions and channel users">
    Les messages de channel sont soumis à une mention gate par défaut.

    Sources de mention :

    - mention explicite de l'application (`<@botId>`)
    - motifs regex de mention (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement de fil de discussion implicite de réponse au bot

    Contrôles par channel (`channels.slack.channels.<id>`; noms uniquement via la résolution au démarrage ou `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (liste d'autorisation)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - format de clé `toolsBySender` : `id:`, `e164:`, `username:`, `name:`, ou caractère générique `"*"`
      (les clés sans préfixe héritées mappent toujours uniquement vers `id:`)

  </Tab>
</Tabs>

## Commandes et comportement slash

- Le mode automatique des commandes natives est **désactivé** pour Slack (`commands.native: "auto"` n'active pas les commandes natives Slack).
- Activez les gestionnaires de commandes natives Slack avec `channels.slack.commands.native: true` (ou global `commands.native: true`).
- Lorsque les commandes natives sont activées, enregistrez les commandes slash correspondantes dans Slack (noms `/<command>`), avec une exception :
  - enregistrez `/agentstatus` pour la commande status (Slack réserve `/status`)
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

et acheminent toujours l'exécution de la commande vers la session de conversation cible (`CommandTargetSessionKey`).

## Fils de discussion, sessions et balises de réponse

- Les DMs sont acheminés en tant que `direct` ; les canaux en tant que `channel` ; les MPIM en tant que `group`.
- Avec le `session.dmScope=main` par défaut, les DMs Slack sont réduits à la session principale de l'agent.
- Sessions de canal : `agent:<agentId>:slack:channel:<channelId>`.
- Les réponses dans les fils peuvent créer des suffixes de session de fil (`:thread:<threadTs>`) le cas échéant.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; la valeur par défaut de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle combien de messages de fil existants sont récupérés lorsqu'une nouvelle session de fil démarre (défaut `20`; définir `0` pour désactiver).

Contrôles des fils de réponse :

- `channels.slack.replyToMode` : `off|first|all` (défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les chats directs : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Remarque : `replyToMode="off"` désactive **tous** les fils de réponse dans Slack, y compris les balises explicites `[[reply_to_*]]`. Cela diffère de Telegram, où les balises explicites sont toujours honorées en mode `"off"`. La différence reflète les modèles de fil de discussion des plateformes : les fils Slack masquent les messages du channel, tandis que les réponses Telegram restent visibles dans le flux de discussion principal.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes">
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de requêtes authentifiées par jeton) et écrites dans le magasin de médias lorsque la récupération réussit et que les limites de taille le permettent.

    La limite de taille entrante à l'exécution est par défaut de `20MB` sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texte et fichiers sortants">
  - les fragments de texte utilisent `channels.slack.textChunkLimit` (défaut 4000) -
  `channels.slack.chunkMode="newline"` active le découpage prioritaire aux paragraphes - les envois
  de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil
  (`thread_ts`) - la limite de médias sortants suit `channels.slack.mediaMaxMb` lorsque configuré;
  sinon les envois du channel utilisent les défauts de type MIME du pipeline de médias
</Accordion>

  <Accordion title="Delivery targets">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les channels

    Les DMs Slack sont ouverts via les API de conversation Slack lors de l'envoi à des cibles utilisateur.

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

## Événements et comportement opérationnel

- Les modifications/suppressions de messages et les diffusions de fils sont mappées en événements système.
- Les événements d'ajout/suppression de réaction sont mappés en événements système.
- Les événements d'arrivée/départ de membre, de création/nommage de channel et d'ajout/suppression d'épingle sont mappés en événements système.
- Les mises à jour de statut du fil de l'assistant (pour les indicateurs "est en train d'écrire..." dans les fils) utilisent `assistant.threads.setStatus` et nécessitent la portée bot `assistant:write`.
- `channel_id_changed` peut migrer les clés de configuration de channel lorsque `configWrites` est activé.
- Les métadonnées de sujet/d'objectif du channel sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- Les actions de bloc et les interactions modales émettent des événements système `Slack interaction: ...` structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, étiquettes, valeurs du sélecteur et métadonnées `workflow_*`
  - événements `view_submission` et `view_closed` modaux avec des métadonnées de channel routées et des entrées de formulaire

## Réactions d'accusé de réception

`ackReaction` envoie un emoji d'accusé de réception pendant qu'OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- secours emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des codes courts (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Solution de repli pour la réaction de frappe

`typingReaction` ajoute une réaction temporaire au message entrant Slack pendant que OpenClaw traite une réponse, puis la supprime une fois l'exécution terminée. Il s'agit d'un repli utile lorsque la frappe native de l'assistant Slack n'est pas disponible, especially in DMs.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes courts (par exemple `"hourglass_flowing_sand"`).
- La réaction est de type « best-effort » et une tentative de nettoyage est effectuée automatiquement après la réponse ou l'achèvement du chemin d'échec.

## Liste de contrôle du manifeste et des portées

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
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "assistant:write",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

  </Accordion>

  <Accordion title="Portées de jeton utilisateur facultatives (opérations de lecture)">
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

  <Accordion title="DM messages ignored">
    Vérifier :

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (ou l'ancien `channels.slack.dm.policy`)
    - les approbations de couplage / entrées de liste d'autorisation

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket mode not connecting">
  Validez les jetons bot + application et l'activation du Mode Socket dans les paramètres de
  l'application Slack.
</Accordion>

  <Accordion title="HTTP mode not receiving events">
    Validez :

    - le signing secret
    - le chemin du webhook
    - les URLs de requête Slack (Events + Interactivity + Slash Commands)
    - `webhookPath` unique par compte HTTP

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Vérifiez si vous aviez l'intention d'utiliser :

    - le mode de commande natif (`channels.slack.commands.native: true`) avec les commandes slash correspondantes enregistrées dans Slack
    - ou le mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de canal/utilisateur.

  </Accordion>
</AccordionGroup>

## Flux de texte

OpenClaw prend en charge le flux de texte natif Slack via l'API des Agents et des Applications IA API.

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactive le flux de l'aperçu en direct.
- `partial` (par défaut) : remplace le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajoute les mises à jour d'aperçu découpées.
- `progress` : affiche le texte d'état de progression pendant la génération, puis envoie le texte final.

`channels.slack.nativeStreaming` contrôle l'API de flux natif de Slack (`chat.startStream` / `chat.appendStream` / `chat.stopStream`) lorsque `streaming` est `partial` (par défaut : `true`).

Désactiver le flux natif Slack (conserver le comportement d'aperçu de brouillon) :

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

Clés héritées :

- `channels.slack.streamMode` (`replace | status_final | append`) est automatiquement migré vers `channels.slack.streaming`.
- booléen `channels.slack.streaming` est automatiquement migré vers `channels.slack.nativeStreaming`.

### Conditions préalables

1. Activez **Agents and AI Apps** dans les paramètres de votre application Slack.
2. Assurez-vous que l'application dispose de la portée `assistant:write`.
3. Un fil de discussion de réponse doit être disponible pour ce message. La sélection du fil suit toujours `replyToMode`.

### Comportement

- Le premier bloc de texte démarre un flux (`chat.startStream`).
- Les blocs de texte ultérieurs s'ajoutent au même flux (`chat.appendStream`).
- La fin de la réponse finalise le flux (`chat.stopStream`).
- Les médias et les charges utiles non textuelles reviennent à une livraison normale.
- Si le flux échoue en cours de réponse, OpenClaw revient à une livraison normale pour les charges utiles restantes.

## Pointeurs vers la référence de configuration

Référence principale :

- [Référence de configuration - Slack](/fr/gateway/configuration-reference#slack)

  Champs à signal fort Slack :
  - mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (hérité : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - commutateur de compatibilité : `dangerouslyAllowNameMatching` (bris de verre ; laisser désactivé sauf en cas de besoin)
  - accès au channel : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - fil/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - delivery : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Connexes

- [Appairage](/fr/channels/pairing)
- [Routage de canal](/fr/channels/channel-routing)
- [Dépannage](/fr/channels/troubleshooting)
- [Configuration](/fr/gateway/configuration)
- [Commandes slash](/fr/tools/slash-commands)

import fr from '/components/footer/fr.mdx';

<fr />
