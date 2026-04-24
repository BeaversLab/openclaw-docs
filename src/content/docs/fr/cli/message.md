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
  - Obligatoire : `--target`, plus `--message`, `--media` ou `--presentation`
  - Optionnel : `--media`, `--presentation`, `--delivery`, `--pin`, `--reply-to`, `--thread-id`, `--gif-playback`, `--force-document`, `--silent`
  - Charges utiles de présentation partagées : `--presentation` envoie des blocs sémantiques (`text`, `context`, `divider`, `buttons`, `select`) que le cœur génère via les capacités déclarées du channel sélectionné. Voir [Message Presentation](/fr/plugins/message-presentation).
  - Préférences de livraison génériques : `--delivery` accepte des indices de livraison tels que `{ "pin": true }` ; `--pin` est une abréviation pour la livraison épinglée lorsque le channel le prend en charge.
  - Telegram uniquement : `--force-document` (envoyer les images et les GIF sous forme de documents pour éviter la compression Telegram)
  - Telegram uniquement : `--thread-id` (id du sujet du forum)
  - Slack uniquement : `--thread-id` (horodatage du fil ; `--reply-to` utilise le même champ)
  - Telegram + Discord : `--silent`
  - WhatsApp uniquement : `--gif-playback`

- `poll`
  - Channels : WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - Obligatoire : `--target`, `--poll-question`, `--poll-option` (répéter)
  - Optionnel : `--poll-multi`
  - Discord uniquement : `--poll-duration-hours`, `--silent`, `--message`
  - Telegram uniquement : `--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - Channels : Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Remarque : `--remove` requiert `--emoji` (omettez `--emoji` pour effacer vos propres réactions lorsque pris en charge ; voir /tools/reactions)
  - WhatsApp uniquement : `--participant`, `--from-me`
  - Réactions de groupe Signal : `--target-author` ou `--target-author-uuid` requis

- `reactions`
  - Canaux : Discord/Google Chat/Slack/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--limit`

- `read`
  - Canaux : Discord/Slack/Matrix
  - Obligatoire : `--target`
  - Optionnel : `--limit`, `--before`, `--after`
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
  - Optionnel : `--channel-id`, `--channel-ids` (répéter), `--author-id`, `--author-ids` (répéter), `--limit`

### Fil de discussion

- `thread create`
  - Canaux : Discord
  - Obligatoire : `--thread-name`, `--target` (id de channel)
  - Optionnel : `--message-id`, `--message`, `--auto-archive-min`

- `thread list`
  - Canaux : Discord
  - Obligatoire : `--guild-id`
  - Optionnel : `--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - Canaux : Discord
  - Obligatoire : `--target` (id de fil), `--message`
  - Optionnel : `--media`, `--reply-to`

### Emojis

- `emoji list`
  - Discord : `--guild-id`
  - Slack : aucun indicateur supplémentaire

- `emoji upload`
  - Canaux : Discord
  - Obligatoire : `--guild-id`, `--emoji-name`, `--media`
  - Optionnel : `--role-ids` (répéter)

### Autocollants

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

- `timeout` : `--guild-id`, `--user-id` (optionnel `--duration-min` ou `--until` ; omettez les deux pour annuler le temps d'attente)
- `kick` : `--guild-id`, `--user-id` (+ `--reason`)
- `ban` : `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` prend également en charge `--reason`

### Diffusion

- `broadcast`
  - Chaînes : n'importe quelle chaîne configurée ; utilisez `--channel all` pour cibler tous les fournisseurs
  - Obligatoire : `--targets <target...>`
  - Optionnel : `--message`, `--media`, `--dry-run`

## Exemples

Envoyer une réponse Discord :

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

Envoyer un message avec des boutons sémantiques :

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

Le cœur du système rend la même charge utile `presentation` en composants Discord, blocs Slack, boutons en ligne Telegram, props Mattermost ou cartes Teams/Feishu selon les capacités de la chaîne. Voir [Message Presentation](/fr/plugins/message-presentation) pour le contrat complet et les règles de repli.

Envoyer une charge utile de présentation plus riche :

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Choose a path"},{"type":"buttons","buttons":[{"label":"Approve","value":"approve"},{"label":"Decline","value":"decline"}]}]}'
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

Envoyer des boutons en ligne Telegram via une présentation générique :

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"cmd:yes"},{"label":"No","value":"cmd:no"}]}]}'
```

Envoyer une carte Teams via une présentation générique :

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --presentation '{"title":"Status update","blocks":[{"type":"text","text":"Build completed"}]}'
```

Envoyer une image Telegram comme document pour éviter la compression :

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
