---
summary: "Référence CLI pour `openclaw message` (send + actions de channel)"
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

- `--channel` requis si plus d'un channel est configuré.
- Si exactement un channel est configuré, il devient celui par défaut.
- Valeurs : `discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp` (Mattermost nécessite un plugin)

Formats cibles (`--target`) :

- WhatsApp : E.164 ou JID de groupe
- Telegram : chat id ou `@username`
- Discord : `channel:<id>` ou `user:<id>` (ou mention `<@id>` ; les id numériques bruts sont traités comme des channels)
- Google Chat : `spaces/<spaceId>` ou `users/<userId>`
- Slack : `channel:<id>` ou `user:<id>` (l'id de channel brut est accepté)
- Mattermost (plugin) : `channel:<id>`, `user:<id>`, ou `@username` (les id seuls sont traités comme des channels)
- Signal : `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>`, ou `username:<name>`/`u:<name>`
- iMessage : identifiant, `chat_id:<id>`, `chat_guid:<guid>`, ou `chat_identifier:<id>`
- Matrix : `@user:server`, `!room:server`, ou `#alias:server`
- Microsoft Teams : id de conversation (`19:...@thread.tacv2`) ou `conversation:<id>` ou `user:<aad-object-id>`

Recherche par nom :

- Pour les fournisseurs pris en charge (Discord/Slack/etc), les noms de channel comme `Help` ou `#help` sont résolus via le cache de répertoire.
- En cas d'échec du cache, OpenClaw tentera une recherche de répertoire en direct lorsque le provider le prend en charge.

## Indicateurs communs

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (channel cible ou utilisateur pour send/poll/read/etc)
- `--targets <name>` (répéter ; diffusion uniquement)
- `--json`
- `--dry-run`
- `--verbose`

## Comportement de SecretRef

- `openclaw message` résout les SecretRefs de channel pris en charge avant d'exécuter l'action sélectionnée.
- La résolution est limitée à la cible de l'action active lorsque cela est possible :
  - délimité au channel lorsque `--channel` est défini (ou déduit des cibles préfixées comme `discord:...`)
  - délimité au compte lorsque `--account` est défini (globaux du channel + surfaces du compte sélectionné)
  - lorsque `--account` est omis, OpenClaw ne force pas une portée SecretRef de compte `default`
- Les SecretRef non résolus sur des canaux non liés ne bloquent pas une action de message ciblée.
- Si le SecretRef du canal/compte sélectionné n'est pas résolu, la commande échoue de manière fermée pour cette action.

## Actions

### Core

- `send`
  - Canaux : WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix/Microsoft Teams
  - Obligatoire : `--target`, plus `--message` ou `--media`
  - Facultatif : `--media`, `--interactive`, `--buttons`, `--components`, `--card`, `--reply-to`, `--thread-id`, `--gif-playback`, `--force-document`, `--silent`
  - Payloads interactifs partagés : `--interactive` envoie un payload JSON interactif natif au channel lorsque pris en charge
  - Telegram uniquement : `--buttons` (nécessite `channels.telegram.capabilities.inlineButtons` pour l'autoriser)
  - Telegram uniquement : `--force-document` (envoyer les images et les GIFs comme documents pour éviter la compression Telegram)
  - Telegram uniquement : `--thread-id` (id du sujet de forum)
  - Slack uniquement : `--thread-id` (horodatage du fil ; `--reply-to` utilise le même champ)
  - Discord uniquement : payload JSON `--components`
  - Channels avec cartes adaptatives : payload JSON `--card` lorsque pris en charge
  - Telegram + Discord : `--silent`
  - WhatsApp uniquement : `--gif-playback`

- `poll`
  - Channels : WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - Obligatoire : `--target`, `--poll-question`, `--poll-option` (à répéter)
  - Facultatif : `--poll-multi`
  - Discord uniquement : `--poll-duration-hours`, `--silent`, `--message`
  - Telegram uniquement : `--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - Chaînes : Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Remarque : `--remove` nécessite `--emoji` (omettez `--emoji` pour effacer vos propres réactions lorsque cette fonction est prise en charge ; voir /tools/reactions)
  - WhatsApp uniquement : `--participant`, `--from-me`
  - Réactions de groupe Signal : `--target-author` ou `--target-author-uuid` obligatoire(s)

- `reactions`
  - Chaînes : Discord/Google Chat/Slack/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--limit`

- `read`
  - Chaînes : Discord/Slack/Matrix
  - Obligatoire : `--target`
  - Optionnel : `--limit`, `--before`, `--after`
  - Discord uniquement : `--around`

- `edit`
  - Chaînes : Discord/Slack/Matrix
  - Obligatoire : `--message-id`, `--message`, `--target`

- `delete`
  - Chaînes : Discord/Slack/Telegram/Matrix
  - Obligatoire : `--message-id`, `--target`

- `pin` / `unpin`
  - Chaînes : Discord/Slack/Matrix
  - Obligatoire : `--message-id`, `--target`

- `pins` (liste)
  - Chaînes : Discord/Slack/Matrix
  - Obligatoire : `--target`

- `permissions`
  - Chaînes : Discord/Matrix
  - Obligatoire : `--target`
  - Matrix uniquement : disponible lorsque le chiffrement Matrix est activé et que les actions de vérification sont autorisées

- `search`
  - Chaînes : Discord
  - Obligatoire : `--guild-id`, `--query`
  - Optionnel : `--channel-id`, `--channel-ids` (à répéter), `--author-id`, `--author-ids` (à répéter), `--limit`

### Fils de discussion

- `thread create`
  - Canaux : Discord
  - Obligatoire : `--thread-name`, `--target` (id de chaîne)
  - Optionnel : `--message-id`, `--message`, `--auto-archive-min`

- `thread list`
  - Canaux : Discord
  - Obligatoire : `--guild-id`
  - Optionnel : `--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - Chaînes : Discord
  - Obligatoire : `--target` (id de fil), `--message`
  - Optionnel : `--media`, `--reply-to`

### Émojis

- `emoji list`
  - Discord : `--guild-id`
  - Slack : aucun indicateur supplémentaire

- `emoji upload`
  - Chaînes : Discord
  - Obligatoire : `--guild-id`, `--emoji-name`, `--media`
  - Optionnel : `--role-ids` (à répéter)

### Autocollants

- `sticker send`
  - Canaux : Discord
  - Obligatoire : `--target`, `--sticker-id` (à répéter)
  - Optionnel : `--message`

- `sticker upload`
  - Chaînes : Discord
  - Obligatoire : `--guild-id`, `--sticker-name`, `--sticker-desc`, `--sticker-tags`, `--media`

### Rôles / Chaînes / Membres / Voix

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

- `timeout` : `--guild-id`, `--user-id` (facultatif `--duration-min` ou `--until` ; omettre les deux pour annuler le délai d'expiration)
- `kick` : `--guild-id`, `--user-id` (+ `--reason`)
- `ban` : `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` prend également en charge `--reason`

### Diffusion

- `broadcast`
  - Canaux : n'importe quel canal configuré ; utilisez `--channel all` pour cibler tous les fournisseurs
  - Obligatoire : `--targets <target...>`
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

Voir [Composants Discord](/en/channels/discord#interactive-components) pour le schéma complet.

Envoyer une charge utile interactive partagée :

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --interactive '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve"},{"label":"Decline"}]}]}'
```

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

Envoyer une carte adaptative Teams :

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Status update"}]}'
```

Envoyer une image Telegram en tant que document pour éviter la compression :

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
