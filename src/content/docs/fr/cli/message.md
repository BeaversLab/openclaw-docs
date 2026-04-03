---
summary: "Référence CLI pour `openclaw message` (envoi + actions de canal)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "message"
---

# `openclaw message`

Commande sortante unique pour l'envoi de messages et les actions de canal
(Discord/Google Chat/iMessage/Matrix/Mattermost (plugin)/Microsoft Teams/Signal/Slack/Telegram/WhatsApp).

## Utilisation

```
openclaw message <subcommand> [flags]
```

Sélection du channel :

- `--channel` requis si plus d'un canal est configuré.
- Si exactement un channel est configuré, il devient celui par défaut.
- Valeurs : `discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp` (Mattermost nécessite le plugin)

Formats cibles (`--target`) :

- WhatsApp : E.164 ou JID de groupe
- Telegram : identifiant de discussion ou `@username`
- Discord : `channel:<id>` ou `user:<id>` (ou mention `<@id>` ; les identifiants numériques bruts sont traités comme des canaux)
- Google Chat : `spaces/<spaceId>` ou `users/<userId>`
- Slack : `channel:<id>` ou `user:<id>` (l'identifiant de canal brut est accepté)
- Mattermost (plugin) : `channel:<id>`, `user:<id>`, ou `@username` (les identifiants nus sont traités comme des canaux)
- Signal : `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>`, ou `username:<name>`/`u:<name>`
- iMessage : identifiant, `chat_id:<id>`, `chat_guid:<guid>`, ou `chat_identifier:<id>`
- Matrix : `@user:server`, `!room:server`, ou `#alias:server`
- Microsoft Teams : id de conversation (`19:...@thread.tacv2`) ou `conversation:<id>` ou `user:<aad-object-id>`

Recherche par nom :

- Pour les providers pris en charge (Discord/Slack/etc), les noms de canal comme `Help` ou `#help` sont résolus via le cache de répertoire.
- En cas d'échec du cache, OpenClaw tentera une recherche de répertoire en direct lorsque le provider le prend en charge.

## Indicateurs communs

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (canal ou utilisateur cible pour send/poll/read/etc)
- `--targets <name>` (répéter ; diffusion uniquement)
- `--json`
- `--dry-run`
- `--verbose`

## Comportement de SecretRef

- `openclaw message` résout les SecretRefs de canal pris en charge avant d'exécuter l'action sélectionnée.
- La résolution est limitée à la cible de l'action active lorsque cela est possible :
  - limitée au canal lorsque `--channel` est défini (ou déduit des cibles préfixées comme `discord:...`)
  - limitée au compte lorsque `--account` est défini (globaux du canal + surfaces du compte sélectionné)
  - lorsque `--account` est omis, OpenClaw ne force pas une portée SecretRef de compte `default`
- Les SecretRef non résolus sur des canaux non liés ne bloquent pas une action de message ciblée.
- Si le SecretRef du canal/compte sélectionné n'est pas résolu, la commande échoue de manière fermée pour cette action.

## Actions

### Core

- `send`
  - Canaux : WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix/Microsoft Teams
  - Obligatoire : `--target`, plus `--message` ou `--media`
  - Optionnel : `--media`, `--reply-to`, `--thread-id`, `--gif-playback`
  - Telegram uniquement : `--buttons` (nécessite `channels.telegram.capabilities.inlineButtons` pour l'autoriser)
  - Telegram uniquement : `--force-document` (envoyer les images et les GIF sous forme de documents pour éviter la compression Telegram)
  - Telegram uniquement : `--thread-id` (id du sujet du forum)
  - Slack uniquement : `--thread-id` (horodatage du fil de discussion ; `--reply-to` utilise le même champ)
  - WhatsApp uniquement : `--gif-playback`

- `poll`
  - Canaux : WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - Obligatoire : `--target`, `--poll-question`, `--poll-option` (à répéter)
  - Optionnel : `--poll-multi`
  - Discord uniquement : `--poll-duration-hours`, `--silent`, `--message`
  - Telegram uniquement : `--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - Canaux : Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Remarque : `--remove` nécessite `--emoji` (omettez `--emoji` pour effacer vos propres réactions lorsque cela est pris en charge ; voir /tools/reactions)
  - WhatsApp uniquement : `--participant`, `--from-me`
  - Réactions de groupe Signal : `--target-author` ou `--target-author-uuid` requis

- `reactions`
  - Canaux : Discord/Google Chat/Slack/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--limit`

- `read`
  - Canaux : Discord/Slack/Matrix
  - Obligatoire : `--target`
  - Facultatif : `--limit`, `--before`, `--after`
  - Discord uniquement : `--around`

- `edit`
  - Canaux : Discord/Slack/Matrix
  - Obligatoire : `--message-id`, `--message`, `--target`

- `delete`
  - Canaux : Discord/Slack/Telegram/Matrix
  - Obligatoire : `--message-id`, `--target`

- `pin` / `unpin`
  - Canaux : Discord/Slack/Matrix
  - Obligatoire : `--message-id`, `--target`

- `pins` (liste)
  - Canaux : Discord/Slack/Matrix
  - Obligatoire : `--target`

- `permissions`
  - Canaux : Discord/Matrix
  - Obligatoire : `--target`
  - Matrix uniquement : disponible lorsque le chiffrement Matrix est activé et que les actions de vérification sont autorisées

- `search`
  - Canaux : Discord
  - Obligatoire : `--guild-id`, `--query`
  - Facultatif : `--channel-id`, `--channel-ids` (répéter), `--author-id`, `--author-ids` (répéter), `--limit`

### Fils de discussion

- `thread create`
  - Canaux : Discord
  - Obligatoire : `--thread-name`, `--target` (id de canal)
  - Facultatif : `--message-id`, `--message`, `--auto-archive-min`

- `thread list`
  - Canaux : Discord
  - Obligatoire : `--guild-id`
  - Facultatif : `--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - Canaux : Discord
  - Obligatoire : `--target` (id de fil), `--message`
  - Facultatif : `--media`, `--reply-to`

### Émojis

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

- `timeout` : `--guild-id`, `--user-id` (optionnel `--duration-min` ou `--until` ; omettre les deux pour annuler le temps d'attente)
- `kick` : `--guild-id`, `--user-id` (+ `--reason`)
- `ban` : `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` prend également en charge `--reason`

### Diffusion

- `broadcast`
  - Channels : n'importe quel channel configuré ; utilisez `--channel all` pour cibler tous les fournisseurs
  - Obligatoire : `--targets` (répéter)
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

Voir [composants Discord](/en/channels/discord#interactive-components) pour le schéma complet.

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

Envoyer une image Telegram comme document pour éviter la compression :

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
