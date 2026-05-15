---
summary: "Référence CLI pour `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "Agents"
---

# `openclaw agents`

Gérez des agents isolés (espaces de travail + auth + routage).

Connexes :

- [Routage multi-agent](/fr/concepts/multi-agent)
- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Configuration des compétences](/fr/tools/skills-config) : configuration de la visibilité des compétences.

## Exemples

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## Liaisons de routage

Utilisez les liaisons de routage pour épingler le trafic entrant du channel à un agent spécifique.

Si vous souhaitez également des compétences visibles différentes pour chaque agent, configurez `agents.defaults.skills` et `agents.list[].skills` dans `openclaw.json`. Voir [Configuration des compétences](/fr/tools/skills-config) et [Référence de configuration](/fr/gateway/config-agents#agents-defaults-skills).

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

Si vous omettez `accountId` (`--bind <channel>`), OpenClaw le résout à partir des valeurs par défaut du channel et des crochets de configuration du plugin lorsque disponibles.

Si vous omettez `--agent` pour `bind` ou `unbind`, OpenClaw cible l'agent par défaut actuel.

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

Après la mise à niveau, le routage pour cette liaison est délimité à `telegram:ops`. Si vous souhaitez également un routage par défaut pour le compte, ajoutez-le explicitement (par exemple `--bind telegram:default`).

Supprimer les liaisons :

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` accepte soit `--all` soit une ou plusieurs valeurs `--bind`, mais pas les deux.

## Surface de commande

### `agents`

L'exécution de `openclaw agents` sans sous-commande est équivalente à `openclaw agents list`.

### `agents list`

Options :

- `--json`
- `--bindings` : inclure les règles de routage complètes, pas seulement les comptes/résumés par agent

### `agents add [name]`

Options :

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (répétable)
- `--non-interactive`
- `--json`

Notes :

- Le passage de n'importe quel indicateur d'ajout explicite bascule la commande vers le mode non interactif.
- Le mode non interactif nécessite à la fois un nom d'agent et `--workspace`.
- `main` est réservé et ne peut pas être utilisé comme nouvel identifiant d'agent.
- En mode interactif, l'amorçage de l'authentification copie uniquement les profils statiques portables
  (`api_key` et `token`OAuth statiques par défaut). Les profils de jetons d'actualisation OAuth restent
  disponibles uniquement par héritage en lecture-through à partir du vrai magasin d'agents `main`.
  Si l'agent par défaut configuré n'est pas `main`OAuth, connectez-vous séparément pour les profils
  OAuth sur le nouvel agent.

### `agents bindings`

Options :

- `--agent <id>`
- `--json`

### `agents bind`

Options :

- `--agent <id>` (par défaut, correspond à l'agent par défaut actuel)
- `--bind <channel[:accountId]>` (répétable)
- `--json`

### `agents unbind`

Options :

- `--agent <id>` (par défaut, correspond à l'agent par défaut actuel)
- `--bind <channel[:accountId]>` (répétable)
- `--all`
- `--json`

### `agents delete <id>`

Options :

- `--force`
- `--json`

Notes :

- `main` ne peut pas être supprimé.
- Sans `--force`, une confirmation interactive est requise.
- Les répertoires de l'espace de travail, de l'état de l'agent et des transcriptions de session sont déplacés vers la Corbeille, et non supprimés définitivement.
- Lorsque la passerelle est accessible, la suppression est envoyée via la passerelle afin que le nettoyage de la configuration et du magasin de sessions partage le même rédacteur que le trafic d'exécution. Si la passerelle ne peut pas être atteinte, la CLI revient au chemin local hors ligne.
- Si l'espace de travail d'un autre agent est le même chemin, se trouve à l'intérieur de cet espace de travail, ou contient cet espace de travail,
  l'espace de travail est conservé et `--json` signale `workspaceRetained`,
  `workspaceRetainedReason` et `workspaceSharedWith`.

## Fichiers d'identité

Chaque espace de travail d'agent peut inclure un `IDENTITY.md` à la racine de l'espace de travail :

- Exemple de chemin : `~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` lit à partir de la racine de l'espace de travail (ou d'un `--identity-file` explicite)

Les chemins des avatars sont résolus relativement à la racine de l'espace de travail.

## Définir l'identité

`set-identity` écrit des champs dans `agents.list[].identity` :

- `name`
- `theme`
- `emoji`
- `avatar` (chemin relatif à l'espace de travail, URL http(s) ou URI de données)

Options :

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

Notes :

- `--agent` ou `--workspace` peuvent être utilisés pour sélectionner l'agent cible.
- Si vous vous fiez à `--workspace` et que plusieurs agents partagent cet espace de travail, la commande échoue et vous demande de passer `--agent`.
- Lorsqu'aucun champ d'identité explicite n'est fourni, la commande lit les données d'identité à partir de `IDENTITY.md`.

Charger depuis `IDENTITY.md` :

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

Remplacer les champs explicitement :

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

## Connexes

- [Référence CLI](/fr/cli)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
