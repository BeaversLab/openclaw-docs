---
summary: "Référence CLI pour `openclaw hooks` (hooks d'agent)"
read_when:
  - You want to manage agent hooks
  - You want to inspect hook availability or enable workspace hooks
title: "hooks"
---

# `openclaw hooks`

Gérer les hooks d'agent (automatisations basées sur les événements pour les commandes telles que `/new`, `/reset` et le démarrage de la passerelle).

L'exécution de `openclaw hooks` sans sous-commande est équivalente à `openclaw hooks list`.

Voir aussi :

- Hooks : [Hooks](/fr/automation/hooks)
- Hooks de plugin : [Plugin hooks](/fr/plugins/architecture#provider-runtime-hooks)

## Lister tous les hooks

```bash
openclaw hooks list
```

Répertorie tous les hooks découverts depuis les répertoires de l'espace de travail, gérés, supplémentaires et groupés.

**Options :**

- `--eligible` : Afficher uniquement les hooks éligibles (conditions remplies)
- `--json` : Sortie au format JSON
- `-v, --verbose` : Afficher des informations détaillées, y compris les conditions manquantes

**Exemple de sortie :**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new or /reset command is issued
```

**Exemple (verbose) :**

```bash
openclaw hooks list --verbose
```

Affiche les conditions manquantes pour les hooks non éligibles.

**Exemple (JSON) :**

```bash
openclaw hooks list --json
```

Renvoie du JSON structuré pour un usage programmatique.

## Obtenir des informations sur un hook

```bash
openclaw hooks info <name>
```

Afficher des informations détaillées sur un hook spécifique.

**Arguments :**

- `<name>` : Nom du hook ou clé du hook (ex. : `session-memory`)

**Options :**

- `--json` : Sortie au format JSON

**Exemple :**

```bash
openclaw hooks info session-memory
```

**Sortie :**

```
💾 session-memory ✓ Ready

Save session context to memory when /new or /reset command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new, command:reset

Requirements:
  Config: ✓ workspace.dir
```

## Vérifier l'éligibilité des hooks

```bash
openclaw hooks check
```

Afficher un résumé de l'état d'éligibilité des hooks (combien sont prêts ou non).

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

Activer un hook spécifique en l'ajoutant à votre configuration (`~/.openclaw/openclaw.json` par défaut).

**Remarque :** Les hooks de l'espace de travail sont désactivés par défaut jusqu'à ce qu'ils soient activés ici ou dans la configuration. Les hooks gérés par des plugins affichent `plugin:<id>` dans `openclaw hooks list` et ne peuvent pas être activés/désactivés ici. Activez/désactivez plutôt le plugin.

**Arguments :**

- `<name>` : Nom du hook (ex. : `session-memory`)

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

Si le hook provient de `<workspace>/hooks/`, cette étape d'acceptation est requise avant que le Gateway ne le charge.

**Après activation :**

- Redémarrez la passerelle pour que les hooks se rechargent (redémarrage de l'application de la barre de menu sur macOS ou redémarrez votre processus de passerelle en développement).

## Désactiver un hook

```bash
openclaw hooks disable <name>
```

Désactiver un hook spécifique en mettant à jour votre configuration.

**Arguments :**

- `<name>` : Nom du hook (ex. : `command-logger`)

**Exemple :**

```bash
openclaw hooks disable command-logger
```

**Sortie :**

```
⏸ Disabled hook: 📝 command-logger
```

**Après désactivation :**

- Redémarrez la passerelle pour que les hooks soient rechargés

## Remarques

- `openclaw hooks list --json`, `info --json` et `check --json` écrivent du JSON structuré directement vers stdout.
- Les hooks gérés par des plugins ne peuvent pas être activés ou désactivés ici ; activez ou désactivez plutôt le plugin propriétaire.

## Installer les packs de hooks

```bash
openclaw plugins install <package>        # ClawHub first, then npm
openclaw plugins install <package> --pin  # pin version
openclaw plugins install <path>           # local path
```

Installez les packs de hooks via l'installateur unifié de plugins.

`openclaw hooks install` fonctionne toujours comme un alias de compatibilité, mais il affiche un
avertissement d'obsolescence et redirige vers `openclaw plugins install`.

Les specs npm sont **uniquement de registre** (nom du package + **version exacte** optionnelle ou
**dist-tag**). Les specs Git/URL/fichier et les plages semver sont rejetées. Les installations
de dépendances s'exécutent avec `--ignore-scripts` pour la sécurité.

Les specs nues et `@latest` restent sur la voie stable. Si npm résout l'un de
ces éléments vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une
balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte.

**Ce qu'il fait :**

- Copie le pack de hooks dans `~/.openclaw/hooks/<id>`
- Active les hooks installés dans `hooks.internal.entries.*`
- Enregistre l'installation sous `hooks.internal.installs`

**Options :**

- `-l, --link` : Lier un répertoire local au lieu de le copier (l'ajoute à `hooks.internal.load.extraDirs`)
- `--pin` : Enregistrer les installations npm comme `name@version` résolus exacts dans `hooks.internal.installs`

**Archives prises en charge :** `.zip`, `.tgz`, `.tar.gz`, `.tar`

**Exemples :**

```bash
# Local directory
openclaw plugins install ./my-hook-pack

# Local archive
openclaw plugins install ./my-hook-pack.zip

# NPM package
openclaw plugins install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw plugins install -l ./my-hook-pack
```

Les packs de hooks liés sont traités comme des hooks gérés provenant d'un répertoire
configuré par l'opérateur, et non comme des hooks d'espace de travail.

## Mettre à jour les packs de hooks

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

Mettez à jour les packs de hooks basés sur npm suivis via le programme de mise à jour unifié des plugins.

`openclaw hooks update` fonctionne toujours comme un alias de compatibilité, mais il affiche un
avertissement d'obsolescence et redirige vers `openclaw plugins update`.

**Options :**

- `--all` : Mettre à jour tous les packs de hooks suivis
- `--dry-run` : Afficher ce qui changerait sans écrire

Lorsqu'un hash d'intégrité stocké existe et que le hash de l'artefact récupéré change, OpenClaw affiche un avertissement et demande une confirmation avant de continuer. Utilisez le `--yes` global pour contourner les invites lors des exécutions CI/non-interactives.

## Hooks intégrés

### session-memory

Sauvegarde le contexte de la session en mémoire lorsque vous émettez `/new` ou `/reset`.

**Activer :**

```bash
openclaw hooks enable session-memory
```

**Sortie :** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**Voir :** [documentation session-memory](/fr/automation/hooks#session-memory)

### bootstrap-extra-files

Injecte des fichiers d'amorçage supplémentaires (par exemple `AGENTS.md` / `TOOLS.md` locaux au monorepo) lors de `agent:bootstrap`.

**Activer :**

```bash
openclaw hooks enable bootstrap-extra-files
```

**Voir :** [documentation bootstrap-extra-files](/fr/automation/hooks#bootstrap-extra-files)

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

**Voir :** [documentation command-logger](/fr/automation/hooks#command-logger)

### boot-md

Exécute `BOOT.md` lorsque la passerelle démarre (après le démarrage des canaux).

**Événements** : `gateway:startup`

**Activer** :

```bash
openclaw hooks enable boot-md
```

**Voir :** [documentation boot-md](/fr/automation/hooks#boot-md)
