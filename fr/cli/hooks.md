---
summary: "Référence CLI pour `openclaw hooks` (hooks d'agent)"
read_when:
  - Vous souhaitez gérer les hooks d'agent
  - Vous souhaitez installer ou mettre à jour des hooks
title: "hooks"
---

# `openclaw hooks`

Gérer les hooks d'agent (automatisations basées sur les événements pour les commandes comme `/new`, `/reset` et le démarrage de la passerelle).

Connexe :

- Hooks : [Hooks](/fr/automation/hooks)
- Hooks de plugin : [Plugins](/fr/tools/plugin#plugin-hooks)

## Lister tous les hooks

```bash
openclaw hooks list
```

Lister tous les hooks découverts dans les répertoires de l'espace de travail, gérés et groupés.

**Options :**

- `--eligible` : Afficher uniquement les hooks éligibles (conditions requises remplies)
- `--json` : Sortie au format JSON
- `-v, --verbose` : Afficher des informations détaillées, y compris les conditions requises manquantes

**Exemple de sortie :**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new command is issued
```

**Exemple (verbose) :**

```bash
openclaw hooks list --verbose
```

Affiche les conditions requises manquantes pour les hooks non éligibles.

**Exemple (JSON) :**

```bash
openclaw hooks list --json
```

Renvoie du JSON structuré pour un usage programmatique.

## Obtenir les informations sur un hook

```bash
openclaw hooks info <name>
```

Afficher des informations détaillées sur un hook spécifique.

**Arguments :**

- `<name>` : Nom du hook (ex. `session-memory`)

**Options :**

- `--json` : Sortie au format JSON

**Exemple :**

```bash
openclaw hooks info session-memory
```

**Sortie :**

```
💾 session-memory ✓ Ready

Save session context to memory when /new command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir
```

## Vérifier l'éligibilité des hooks

```bash
openclaw hooks check
```

Afficher un résumé de l'état d'éligibilité des hooks (combien sont prêts vs non prêts).

**Options :**

- `--json` : Sortie au format JSON

**Exemple de sortie :**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## Activer un hook

```bash
openclaw hooks enable <name>
```

Activer un hook spécifique en l'ajoutant à votre configuration (`~/.openclaw/config.json`).

**Remarque :** Les hooks gérés par des plugins affichent `plugin:<id>` dans `openclaw hooks list` et
ne peuvent pas être activés/désactivés ici. Activez/désactivez plutôt le plugin.

**Arguments :**

- `<name>` : Nom du hook (ex. `session-memory`)

**Exemple :**

```bash
openclaw hooks enable session-memory
```

**Sortie :**

```
✓ Enabled hook: 💾 session-memory
```

**Ce qu'il fait :**

- Vérifie si le hook existe et est éligible
- Met à jour `hooks.internal.entries.<name>.enabled = true` dans votre configuration
- Enregistre la configuration sur le disque

**Après activation :**

- Redémarrez la passerelle pour que les hooks se rechargent (redémarrage de l'application de la barre de menus sur macOS ou redémarrez votre processus de passerelle en dev).

## Désactiver un hook

```bash
openclaw hooks disable <name>
```

Désactiver un hook spécifique en mettant à jour votre configuration.

**Arguments :**

- `<name>` : Nom du hook (p. ex. `command-logger`)

**Exemple :**

```bash
openclaw hooks disable command-logger
```

**Sortie :**

```
⏸ Disabled hook: 📝 command-logger
```

**Après désactivation :**

- Redémarrez la passerelle pour que les hooks se rechargent

## Installer les hooks

```bash
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

Installez un pack de hooks depuis un dossier/dossier local ou npm.

Les spécifications npm sont **uniquement pour le registre** (nom du package + **version exacte** optionnelle ou
**dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées. Les installations
de dépendances s'exécutent avec `--ignore-scripts` pour plus de sécurité.

Les spécifications nues et `@latest` restent sur la version stable. Si npm résout l'une de
celles-ci vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une
tiquette de préversion telle que `@beta`/`@rc` ou une version de préversion exacte.

**Ce qu'il fait :**

- Copie le pack de hooks dans `~/.openclaw/hooks/<id>`
- Active les hooks installés dans `hooks.internal.entries.*`
- Enregistre l'installation sous `hooks.internal.installs`

**Options :**

- `-l, --link` : Lier un répertoire local au lieu de copier (l'ajoute à `hooks.internal.load.extraDirs`)
- `--pin` : Enregistrer les installations npm comme `name@version` résolus exacts dans `hooks.internal.installs`

**Archives prises en charge :** `.zip`, `.tgz`, `.tar.gz`, `.tar`

**Exemples :**

```bash
# Local directory
openclaw hooks install ./my-hook-pack

# Local archive
openclaw hooks install ./my-hook-pack.zip

# NPM package
openclaw hooks install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw hooks install -l ./my-hook-pack
```

## Mettre à jour les hooks

```bash
openclaw hooks update <id>
openclaw hooks update --all
```

Mettre à jour les packs de hooks installés (installations npm uniquement).

**Options :**

- `--all` : Mettre à jour tous les packs de hooks suivis
- `--dry-run` : Afficher ce qui changerait sans écrire

Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change,
OpenClaw affiche un avertissement et demande une confirmation avant de continuer. Utilisez
l'option globale `--yes` pour contourner les invites dans les exécutions CI/non interactives.

## Hooks groupés

### session-memory

Enregistre le contexte de la session en mémoire lorsque vous émettez `/new`.

**Activer :**

```bash
openclaw hooks enable session-memory
```

**Sortie :** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**Voir :** [documentation session-memory](/fr/automation/hooks#session-memory)

### bootstrap-extra-files

Injecte des fichiers d'amorçage supplémentaires (par exemple monorepo-local `AGENTS.md` / `TOOLS.md`) pendant `agent:bootstrap`.

**Activer :**

```bash
openclaw hooks enable bootstrap-extra-files
```

**Voir :** [Documentation bootstrap-extra-files](/fr/automation/hooks#bootstrap-extra-files)

### command-logger

Enregistre tous les événements de commande dans un fichier d'audit centralisé.

**Activer :**

```bash
openclaw hooks enable command-logger
```

**Sortie :** `~/.openclaw/logs/commands.log`

**Voir les journaux :**

```bash
# Recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**Voir :** [Documentation command-logger](/fr/automation/hooks#command-logger)

### boot-md

Exécute `BOOT.md` lors du démarrage de la passerelle (après le démarrage des canaux).

**Événements** : `gateway:startup`

**Activer** :

```bash
openclaw hooks enable boot-md
```

**Voir :** [Documentation boot-md](/fr/automation/hooks#boot-md)

import fr from "/components/footer/fr.mdx";

<fr />
