---
summary: "Référence de la CLI pour `openclaw directory` (self, peers, groups)"
read_when:
  - You want to look up contacts/groups/self ids for a channel
  - You are developing a channel directory adapter
title: "Annuaire"
---

# `openclaw directory`

Recherches dans l'annuaire pour les channels qui le prennent en charge (contacts/pairs, groupes et "moi").

## Indicateurs communs

- `--channel <name>` : id/alias de channel (requis lorsque plusieurs channels sont configurés ; automatique si un seul est configuré)
- `--account <id>` : id de compte (par défaut : défaut du channel)
- `--json` : sortie JSON

## Notes

- `directory` est conçu pour vous aider à trouver les ID que vous pouvez coller dans d'autres commandes (surtout `openclaw message send --target ...`).
- Pour de nombreux channels, les résultats sont basés sur la configuration (listes d'autorisation / groupes configurés) plutôt que sur un annuaire provider en direct.
- Les plugins de channel installés peuvent toujours ne pas prendre en charge l'annuaire ; dans ce cas, la commande signale l'opération d'annuaire non prise en charge au lieu de réinstaller le plugin.
- La sortie par défaut est `id` (et parfois `name`) séparés par une tabulation ; utilisez `--json` pour les scripts.

## Utilisation des résultats avec `message send`

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## Formats d'ID (par channel)

- WhatsApp : WhatsApp`+15551234567` (DM), `1234567890-1234567890@g.us` (groupe), `120363123456789@newsletter` (cible sortante de channel/lettre d'information)
- Telegram : Telegram`@username` ou identifiant de conversation numérique ; les groupes ont des identifiants numériques
- Slack : Slack`user:U…` et `channel:C…`
- Discord : Discord`user:<id>` et `channel:<id>`
- Matrix (plugin) : Matrix`user:@user:server`, `room:!roomId:server` ou `#alias:server`
- Microsoft Teams (plugin) : Microsoft Teams`user:<id>` et `conversation:<id>`
- Zalo (plugin) : identifiant utilisateur (Bot API)
- Zalo Personnel / Zalo`zalouser` (plugin) : identifiant de fil (DM/groupe) à partir de `zca` (`me`, `friend list`, `group list`)

## Soi-même ("me")

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

## Connexes

- [Référence CLI](CLI/en/cli)
