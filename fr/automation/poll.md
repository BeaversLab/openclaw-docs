---
summary: "Envoi de sondage via la passerelle + CLI"
read_when:
  - Adding or modifying poll support
  - Debugging poll sends from the CLI or gateway
title: "Sondages"
---

# Sondages

## Canaux pris en charge

- Telegram
- WhatsApp (channel Web)
- Discord
- MS Teams (Cartes adaptatives)

## CLI

```bash
# Telegram
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300

# WhatsApp
openclaw message poll --target +15555550123 \
  --poll-question "Lunch today?" --poll-option "Yes" --poll-option "No" --poll-option "Maybe"
openclaw message poll --target 123456789@g.us \
  --poll-question "Meeting time?" --poll-option "10am" --poll-option "2pm" --poll-option "4pm" --poll-multi

# Discord
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "Snack?" --poll-option "Pizza" --poll-option "Sushi"
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "Plan?" --poll-option "A" --poll-option "B" --poll-duration-hours 48

# MS Teams
openclaw message poll --channel msteams --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" --poll-option "Pizza" --poll-option "Sushi"
```

Options :

- `--channel` : `whatsapp` (par défaut), `telegram`, `discord` ou `msteams`
- `--poll-multi` : autoriser la sélection de plusieurs options
- `--poll-duration-hours` : Discord uniquement (24 par défaut si omis)
- `--poll-duration-seconds` : Telegram uniquement (5-600 secondes)
- `--poll-anonymous` / `--poll-public` : visibilité du sondage Telegram uniquement

## Gateway RPC

Méthode : `poll`

Paramètres :

- `to` (chaîne, obligatoire)
- `question` (chaîne, obligatoire)
- `options` (chaîne[], obligatoire)
- `maxSelections` (nombre, facultatif)
- `durationHours` (nombre, facultatif)
- `durationSeconds` (nombre, facultatif, Telegram uniquement)
- `isAnonymous` (booléen, facultatif, Telegram uniquement)
- `channel` (chaîne, facultatif, par défaut : `whatsapp`)
- `idempotencyKey` (chaîne, obligatoire)

## Différences de canal

- Telegram : 2-10 options. Prend en charge les sujets de forum via `threadId` ou `:topic:` cibles. Utilise `durationSeconds` au lieu de `durationHours`, limité à 5-600 secondes. Prend en charge les sondages anonymes et publics.
- WhatsApp : 2-12 options, `maxSelections` doit être dans le nombre d'options, ignore `durationHours`.
- Discord : 2-10 options, `durationHours` limité à 1-768 heures (24 par défaut). `maxSelections > 1` active la multi-sélection ; Discord ne prend pas en charge un nombre de sélections strict.
- MS Teams : sondages via Adaptive Card (gérés par OpenClaw). Pas d'API de sondage native ; `durationHours` est ignoré.

## Agent tool (Message)

Utilisez l'`message` tool avec l'action `poll` (`to`, `pollQuestion`, `pollOption`, `pollMulti` facultatif, `pollDurationHours`, `channel`).

Pour Telegram, l'outil accepte également `pollDurationSeconds`, `pollAnonymous` et `pollPublic`.

Utilisez `action: "poll"` pour la création de sondages. Les champs de sondage transmis avec `action: "send"` sont rejetés.

Remarque : Discord n'a pas de mode « choisir exactement N » ; `pollMulti` correspond à la sélection multiple.
Les sondages Teams sont rendus sous forme de cartes adaptatives et nécessitent que la passerelle reste en ligne pour enregistrer les votes dans `~/.openclaw/msteams-polls.json`.

import fr from '/components/footer/fr.mdx';

<fr />
