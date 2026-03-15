---
summary: "Référence de la CLI pour `openclaw message` (envoi + actions de channel)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

Commande sortante unique pour l'envoi de messages et les actions de channel
(Discord/Google Chat/Slack/Mattermost (plugin)/Telegram/WhatsApp/Signal/iMessage/MS Teams).

## Utilisation

```
openclaw message <subcommand> [flags]
```

Sélection du channel :

- `--channel` requis si plus d'un channel est configuré.
- Si exactement un channel est configuré, il devient celui par défaut.
- Valeurs : `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams` (Mattermost nécessite un plugin)

Formats cibles (`--target`) :

- WhatsApp : E.164 ou JID de groupe
- Telegram : id de chat ou `@username`
- Discord : `channel:<id>` ou `user:<id>` (ou mention `<@id>` ; les identifiants numériques bruts sont traités comme des channels)
- Google Chat : `spaces/<spaceId>` ou `users/<userId>`
- Slack : `channel:<id>` ou `user:<id>` (l'id de channel brut est accepté)
- Mattermost (plugin) : `channel:<id>`, `user:<id>`, ou `@username` (les ids simples sont traités comme des channels)
- Signal : `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>`, ou `username:<name>`/`u:<name>`
- iMessage : identifiant, `chat_id:<id>`, `chat_guid:<guid>`, ou `chat_identifier:<id>`
- MS Teams : id de conversation (`19:...@thread.tacv2`) ou `conversation:<id>` ou `user:<aad-object-id>`

Recherche par nom :

- Pour les providers pris en charge (Discord/Slack/etc.), les noms de channel comme `Help` ou `#help` sont résolus via le cache de répertoire.
- En cas d'échec du cache, OpenClaw tentera une recherche de répertoire en direct si le provider le prend en charge.

## Drapeaux communs

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (channel ou utilisateur cible pour send/poll/read/etc)
- `--targets <name>` (répéter ; diffusion uniquement)
- `--json`
- `--dry-run`
- `--verbose`

## Actions

### Core

- `send`
  - Channels : WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/MS Teams
  - Obligatoire : `--target`, plus `--message` ou `--media`
  - Optionnel : `--media`, `--reply-to`, `--thread-id`, `--gif-playback`
  - Telegram uniquement : `--buttons` (nécessite `channels.telegram.capabilities.inlineButtons` pour l'autoriser)
  - Telegram uniquement : `--thread-id` (id du sujet de forum)
  - Slack uniquement : `--thread-id` (horodatage du fil de discussion ; `--reply-to` utilise le même champ)
  - WhatsApp uniquement : `--gif-playback`

- `poll`
  - Channels : WhatsApp/Telegram/Discord/Matrix/MS Teams
  - Obligatoire : `--target`, `--poll-question`, `--poll-option` (répéter)
  - Optionnel : `--poll-multi`
  - Discord uniquement : `--poll-duration-hours`, `--silent`, `--message`
  - Telegram uniquement : `--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - Channels : Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Note : `--remove` nécessite `--emoji` (omettez `--emoji` pour effacer vos propres réactions lorsque cette fonctionnalité est prise en charge ; voir /tools/reactions)
  - WhatsApp uniquement : `--participant`, `--from-me`
  - Réactions de groupe Signal : `--target-author` ou `--target-author-uuid` requis

- `reactions`
  - Channels : Discord/Google Chat/Slack
  - Requis : `--message-id`, `--target`
  - Facultatif : `--limit`

- `read`
  - Channels : Discord/Slack
  - Requis : `--target`
  - Facultatif : `--limit`, `--before`, `--after`
  - Discord uniquement : `--around`

- `edit`
  - Channels : Discord/Slack
  - Requis : `--message-id`, `--message`, `--target`

- `delete`
  - Channels : Discord/Slack/Telegram
  - Requis : `--message-id`, `--target`

- `pin` / `unpin`
  - Channels : Discord/Slack
  - Requis : `--message-id`, `--target`

- `pins` (liste)
  - Channels : Discord/Slack
  - Requis : `--target`

- `permissions`
  - Channels : Discord
  - Requis : `--target`

- `search`
  - Channels : Discord
  - Requis : `--guild-id`, `--query`
  - Facultatif : `--channel-id`, `--channel-ids` (répéter), `--author-id`, `--author-ids` (répéter), `--limit`

### Threads

- `thread create`
  - Channels : Discord
  - Requis : `--thread-name`, `--target` (identifiant de channel)
  - Optionnel : `--message-id`, `--message`, `--auto-archive-min`

- `thread list`
  - Canaux : Discord
  - Obligatoire : `--guild-id`
  - Optionnel : `--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - Canaux : Discord
  - Obligatoire : `--target` (identifiant de fil), `--message`
  - Optionnel : `--media`, `--reply-to`

### Emojis

- `emoji list`
  - Discord : `--guild-id`
  - Slack : aucun indicateur supplémentaire

- `emoji upload`
  - Canaux : Discord
  - Obligatoire : `--guild-id`, `--emoji-name`, `--media`
  - Optionnel : `--role-ids` (répéter)

### Stickers

- `sticker send`
  - Canaux : Discord
  - Obligatoire : `--target`, `--sticker-id` (répéter)
  - Optionnel : `--message`

- `sticker upload`
  - Canaux : Discord
  - Obligatoire : `--guild-id`, `--sticker-name`, `--sticker-desc`, `--sticker-tags`, `--media`

### Rôles / Canaux / Membres / Voix

- `role info` (Discord) : `--guild-id`
- `role add` / `role remove` (Discord) : `--guild-id`, `--user-id`, `--role-id`
- `channel info` (Discord) : `--target`
- `channel list` (Discord) : `--guild-id`
- `member info` (Discord/Slack) : `--user-id` (+ `--guild-id` pour Discord)
- `voice status` (Discord) : `--guild-id`, `--user-id`

### Événements

- `event list` (Discord) : `--guild-id`
- `event create` (Discord) : `--guild-id`, `--event-name`, `--start-time`
  - Optionnel : `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### Modération (Discord)

- `timeout` : `--guild-id`, `--user-id` (optionnel `--duration-min` ou `--until` ; omettez les deux pour effacer le temps d'attente)
- `kick` : `--guild-id`, `--user-id` (+ `--reason`)
- `ban` : `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` prend également en charge `--reason`

### Diffusion

- `broadcast`
  - Chaînes : n'importe quelle chaîne configurée ; utilisez `--channel all` pour cibler tous les fournisseurs
  - Obligatoire : `--targets` (à répéter)
  - Optionnel : `--message`, `--media`, `--dry-run`

## Exemples

Envoyer une réponse Discord :

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

Envoyer un message Discord avec des composants :

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

Voir [Composants Discord](/fr/channels/discord#interactive-components) pour le schéma complet.

Créer un sondage Discord :

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

Créer un sondage Telegram (fermeture automatique dans 2 minutes) :

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

Envoyer un message proactif Teams :

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

Créer un sondage Teams :

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

Réagir dans Slack :

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

Réagir dans un groupe Signal :

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

Envoyer des boutons en ligne Telegram :

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

import fr from '/components/footer/fr.mdx';

<fr />
