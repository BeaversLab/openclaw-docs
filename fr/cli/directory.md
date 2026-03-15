---
summary: "Référence de la CLI pour `openclaw directory` (self, peers, groups)"
read_when:
  - You want to look up contacts/groups/self ids for a channel
  - You are developing a channel directory adapter
title: "directory"
---

# `openclaw directory`

Recherches dans l'annuaire pour les channels qui le prennent en charge (contacts/pairs, groupes et « moi »).

## Indicateurs communs

- `--channel <name>` : id/alias de channel (requis lorsque plusieurs channels sont configurés ; automatique si un seul est configuré)
- `--account <id>` : id de compte (par défaut : défaut du channel)
- `--json` : sortie JSON

## Notes

- `directory` est conçu pour vous aider à trouver les ID que vous pouvez coller dans d'autres commandes (surtout `openclaw message send --target ...`).
- Pour de nombreux channels, les résultats sont basés sur la configuration (listes d'autorisation / groupes configurés) plutôt que sur un annuaire provider en direct.
- La sortie par défaut est `id` (et parfois `name`) séparés par une tabulation ; utilisez `--json` pour les scripts.

## Utilisation des résultats avec `message send`

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## Formats d'ID (par channel)

- WhatsApp : `+15551234567` (DM), `1234567890-1234567890@g.us` (groupe)
- Telegram : `@username` ou id de conversation numérique ; les groupes sont des ID numériques
- Slack : `user:U…` et `channel:C…`
- Discord : `user:<id>` et `channel:<id>`
- Matrix (plugin) : `user:@user:server`, `room:!roomId:server` ou `#alias:server`
- Microsoft Teams (plugin) : `user:<id>` et `conversation:<id>`
- Zalo (plugin) : id utilisateur (Bot API)
- Zalo Personnel / `zalouser` (plugin) : id de fil (DM/groupe) à partir de `zca` (`me`, `friend list`, `group list`)

## Soi (« moi »)

```bash
openclaw directory self --channel zalouser
```

## Pairs (contacts/utilisateurs)

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## Groupes

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

import fr from '/components/footer/fr.mdx';

<fr />
