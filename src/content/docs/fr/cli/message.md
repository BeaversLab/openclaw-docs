---
summary: "Référence CLI pour `openclaw message` (send + actions de channel)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "Message"
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
- `openclaw message` résout le channel sélectionné vers son plugin propriétaire lorsque `--channel` ou une cible préfixée par un channel est présente ; sinon, il charge les plugins de channel configurés pour l'inférence du channel par défaut.

Formats de cible (`--target`) :

- WhatsApp : E.164, JID de groupe, ou JID de Channel/Newsletter WhatsApp (`...@newsletter`)
- Telegram : id de chat, `@username`, ou cible de sujet de forum (`-1001234567890:topic:42`, ou `--thread-id 42`)
- Discord : `channel:<id>` ou `user:<id>` (ou mention `<@id>` ; les identifiants numériques bruts sont traités comme des channels)
- Google Chat : `spaces/<spaceId>` ou `users/<userId>`
- Slack : `channel:<id>` ou `user:<id>` (l'identifiant de channel brut est accepté)
- Mattermost (plugin) : `channel:<id>`, `user:<id>`, ou `@username` (les identifiants seuls sont traités comme des channels)
- Signal : `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>`, ou `username:<name>`/`u:<name>`
- iMessage : identifiant, `chat_id:<id>`, `chat_guid:<guid>`, ou `chat_identifier:<id>`
- Matrix : `@user:server`, `!room:server`, ou `#alias:server`
- Microsoft Teams : id de conversation (`19:...@thread.tacv2`) ou `conversation:<id>` ou `user:<aad-object-id>`

Recherche par nom :

- Pour les providers pris en charge (Discord/Slack/etc), les noms de channel tels que `Help` ou `#help` sont résolus via le cache de l'annuaire.
- En cas d'échec du cache, OpenClaw tentera une recherche en direct dans l'annuaire si le provider le prend en charge.

## Indicateurs communs

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (channel ou utilisateur cible pour send/poll/read/etc)
- `--targets <name>` (répéter ; diffusion uniquement)
- `--json`
- `--dry-run`
- `--verbose`

## Comportement de SecretRef

- `openclaw message` résout les SecretRefs de channel pris en charge avant d'exécuter l'action sélectionnée.
- La résolution est limitée à la cible de l'action active lorsque possible :
  - limitée au channel lorsque `--channel` est défini (ou déduit des cibles préfixées comme `discord:...`)
  - limitée au compte lorsque `--account` est défini (globaux du channel + surfaces du compte sélectionné)
  - lorsque `--account` est omis, OpenClaw n'impose pas de portée SecretRef de compte `default`
- Les SecretRef non résolus sur des channels sans rapport ne bloquent pas une action de message ciblée.
- Si le SecretRef du channel/compte sélectionné n'est pas résolu, la commande échoue de manière fermée pour cette action.

## Actions

### Core

- `send`
  - Channels : WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix/Microsoft Teams
  - Obligatoire : `--target`, ainsi que `--message`, `--media`, ou `--presentation`
  - Optionnel : `--media`, `--presentation`, `--delivery`, `--pin`, `--reply-to`, `--thread-id`, `--gif-playback`, `--force-document`, `--silent`
  - Payloads de présentation partagés : `--presentation` envoie des blocs sémantiques (`text`, `context`, `divider`, `buttons`, `select`) que le cœur (core) rend via les capacités déclarées du channel sélectionné. Voir [Message Presentation](/fr/plugins/message-presentation).
  - Préférences de livraison génériques : `--delivery` accepte des indices de livraison tels que `{ "pin": true }` ; `--pin` est un raccourci pour la livraison épinglée lorsque le channel le prend en charge.
  - Telegram uniquement : Telegram`--force-document` (envoyer les images et les GIF sous forme de documents pour éviter la compression Telegram)
  - Telegram uniquement : Telegram`--thread-id` (id du sujet du forum)
  - Slack uniquement : Slack`--thread-id` (horodatage du fil de discussion ; `--reply-to` utilise le même champ)
  - Telegram + Discord : TelegramDiscord`--silent`
  - WhatsApp uniquement : WhatsApp`--gif-playback` ; les Chaînes/Newsletters WhatsApp sont adressées avec leur JID `@newsletter` native.

- `poll`
  - Channels : WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - Obligatoire : `--target`, `--poll-question`, `--poll-option` (à répéter)
  - Optionnel : `--poll-multi`
  - Discord uniquement : Discord`--poll-duration-hours`, `--silent`, `--message`
  - Telegram uniquement : Telegram`--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - Canaux : Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Remarque : `--remove` nécessite `--emoji` (omettez `--emoji` pour effacer vos propres réactions lorsque cela est pris en charge ; voir /tools/reactions)
  - WhatsApp uniquement : WhatsApp`--participant`, `--from-me`
  - Réactions de groupe Signal : Signal`--target-author` ou `--target-author-uuid` requis

- `reactions`
  - Canaux : Discord/Google Chat/Slack/Matrix
  - Obligatoire : `--message-id`, `--target`
  - Optionnel : `--limit`

- `read`
  - Canaux : Discord/Slack/Matrix
  - Obligatoire : `--target`
  - Optionnel : `--limit`, `--message-id`, `--before`, `--after`
  - Slack uniquement : Slack`--message-id`Slack lit un horodatage spécifique de message Slack ; combinez avec `--thread-id` pour lire une réponse exacte à un fil de discussion.
  - Discord uniquement : Discord`--around`

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
  - Optionnel : `--channel-id`, `--channel-ids` (répéter), `--author-id`, `--author-ids` (répéter), `--limit`

### Fils de discussion

- `thread create`
  - Canaux : Discord
  - Obligatoire : `--thread-name`, `--target` (id du channel)
  - Optionnel : `--message-id`, `--message`, `--auto-archive-min`

- `thread list`
  - Canaux : Discord
  - Obligatoire : `--guild-id`
  - Optionnel : `--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - Chaînes : Discord
  - Obligatoire : `--target` (id du fil), `--message`
  - Optionnel : `--media`, `--reply-to`

### Émojis

- `emoji list`
  - Discord : Discord`--guild-id`
  - Slack : aucun indicateur supplémentaire

- `emoji upload`
  - Chaînes : Discord
  - Obligatoire : `--guild-id`, `--emoji-name`, `--media`
  - Optionnel : `--role-ids` (répéter)

### Autocollants

- `sticker send`
  - Canaux : Discord
  - Obligatoire : `--target`, `--sticker-id` (répéter)
  - Optionnel : `--message`

- `sticker upload`
  - Chaînes : Discord
  - Obligatoire : `--guild-id`, `--sticker-name`, `--sticker-desc`, `--sticker-tags`, `--media`

### Rôles / Chaînes / Membres / Voix

- `role info`Discord (Discord) : `--guild-id`
- `role add` / `role remove`Discord (Discord) : `--guild-id`, `--user-id`, `--role-id`
- `channel info`Discord (Discord) : `--target`
- `channel list`Discord (Discord) : `--guild-id`
- `member info`DiscordSlack (Discord/Slack) : `--user-id` (+ `--guild-id`Discord pour Discord)
- `voice status`Discord (Discord) : `--guild-id`, `--user-id`

### Événements

- `event list`Discord (Discord) : `--guild-id`
- `event create`Discord (Discord) : `--guild-id`, `--event-name`, `--start-time`
  - Optionnel : `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### Modération (Discord)

- `timeout` : `--guild-id`, `--user-id` (optionnel `--duration-min` ou `--until` ; omettre les deux pour effacer le délai d'expiration)
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

Envoyer un message avec des boutons sémantiques :

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

Core rend la même charge utile `presentation` dans des composants Discord, des blocs Slack, des boutons en ligne Telegram, des propriétés Mattermost ou des cartes Teams/Feishu en fonction des capacités du channel. Consultez [Présentation des messages](/fr/plugins/message-presentation) pour le contrat complet et les règles de repli.

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

Envoyer une image Telegram en tant que document pour éviter la compression :

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

## Connexes

- [Référence CLI](/fr/cli)
- [Envoi d'agent](/fr/tools/agent-send)
