---
summary: "Référence CLI pour `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `openclaw agents`

Gérez des agents isolés (espaces de travail + auth + routage).

Connexes :

- Routage multi-agent : [Routage multi-agent](/fr/concepts/multi-agent)
- Espace de travail de l'agent : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

## Exemples

```bash
openclaw agents list
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## Liaisons de routage

Utilisez les liaisons de routage pour épingler le trafic entrant du channel à un agent spécifique.

Lister les liaisons :

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

Ajouter des liaisons :

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

Si vous omettez `accountId` (`--bind <channel>`), OpenClaw le résout à partir des valeurs par défaut du channel et des hooks de configuration des plugins lorsque disponibles.

### Comportement de la portée de liaison

- Une liaison sans `accountId` correspond uniquement au compte par défaut du channel.
- `accountId: "*"` est le repli à l'échelle du channel (tous les comptes) et est moins spécifique qu'une liaison de compte explicite.
- Si le même agent possède déjà une liaison de channel correspondante sans `accountId`, et que vous liez ultérieurement avec un `accountId` explicite ou résolu, OpenClaw met à niveau cette liaison existante sur place au lieu d'ajouter un doublon.

Exemple :

```bash
# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:ops
```

Après la mise à niveau, le routage pour cette liaison est délimité à `telegram:ops`. Si vous souhaitez également un routage par compte par défaut, ajoutez-le explicitement (par exemple `--bind telegram:default`).

Supprimer les liaisons :

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

## Fichiers d'identité

Chaque espace de travail d'agent peut inclure un `IDENTITY.md` à la racine de l'espace de travail :

- Exemple de chemin : `~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` lit à partir de la racine de l'espace de travail (ou d'un `--identity-file` explicite)

Les chemins des avatars sont résolus par rapport à la racine de l'espace de travail.

## Définir l'identité

`set-identity` écrit les champs dans `agents.list[].identity` :

- `name`
- `theme`
- `emoji`
- `avatar` (chemin relatif à l'espace de travail, URL http(s) ou URI de données)

Charger depuis `IDENTITY.md` :

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

Remplacer explicitement les champs :

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

Exemple de configuration :

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "OpenClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/openclaw.png",
        },
      },
    ],
  },
}
```

import fr from "/components/footer/fr.mdx";

<fr />
