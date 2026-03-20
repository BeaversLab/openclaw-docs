---
summary: "Référence CLI pour `openclaw directory` (self, peers, groups)"
read_when:
  - Vous souhaitez rechercher les identifiants de contacts/groupes/self pour un channel
  - Vous développez un adaptateur de répertoire de channel
title: "directory"
---

# `openclaw directory`

Recherches dans l'annuaire pour les channels qui les prennent en charge (contacts/pairs, groupes et "moi").

## Indicateurs communs

- `--channel <name>` : id/alias de channel (requis lorsque plusieurs channels sont configurés ; auto lorsqu'un seul est configuré)
- `--account <id>` : id de compte (par défaut : par défaut du channel)
- `--json` : sortie JSON

## Notes

- `directory` est conçu pour vous aider à trouver les ID que vous pouvez coller dans d'autres commandes (notamment `openclaw message send --target ...`).
- Pour de nombreux channels, les résultats sont basés sur la configuration (listes d'autorisation / groupes configurés) plutôt que sur un annuaire de provider en temps réel.
- La sortie par défaut est `id` (et parfois `name`) séparés par une tabulation ; utilisez `--json` pour les scripts.

## Utilisation des résultats avec `message send`

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## Formats d'ID (par channel)

- WhatsApp : `+15551234567` (DM), `1234567890-1234567890@g.us` (groupe)
- Telegram : `@username` ou id de chat numérique ; les groupes sont des id numériques
- Slack : `user:U…` et `channel:C…`
- Discord : `user:<id>` et `channel:<id>`
- Matrix (plugin) : `user:@user:server`, `room:!roomId:server` ou `#alias:server`
- Microsoft Teams (plugin) : `user:<id>` et `conversation:<id>`
- Zalo (plugin) : id utilisateur (Bot API)
- Zalo Personal / `zalouser` (plugin) : id de fil de discussion (DM/groupe) à partir de `zca` (`me`, `friend list`, `group list`)

## Self ("me")

```bash
openclaw directory self --channel zalouser
```

## Peers (contacts/users)

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## Groups

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

import fr from "/components/footer/fr.mdx";

<fr />
