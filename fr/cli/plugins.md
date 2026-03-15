---
summary: "Référence de la CLI pour `openclaw plugins` (list, install, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage in-process Gateway plugins
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Gérer les plugins/extensions du Gateway (chargés en processus).

Connexe :

- Système de plugins : [Plugins](/fr/tools/plugin)
- Manifeste de plugin + schéma : [Plugin manifest](/fr/plugins/manifest)
- Renforcement de la sécurité : [Security](/fr/gateway/security)

## Commandes

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
```

Les plugins groupés sont fournis avec OpenClaw mais sont désactivés par défaut. Utilisez `plugins enable` pour
les activer.

Tous les plugins doivent inclure un fichier `openclaw.plugin.json` avec un Schéma JSON en ligne
(`configSchema`, même s'il est vide). Des manifestes ou des schémas manquants ou invalides empêchent
le chargement du plugin et entraînent l'échec de la validation de la configuration.

### Installer

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
```

Note de sécurité : traitez les installations de plugins comme l'exécution de code. Préférez les versions épinglées.

Les spécifications Npm sont **uniquement pour le registre** (nom du package + **version exacte** facultative ou
**dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées. Les installations
de dépendances s'exécutent avec `--ignore-scripts` pour plus de sécurité.

Les spécifications nues et `@latest` restent sur la version stable. Si npm résout l'un de
ceux-ci vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une
balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte telle que
`@1.2.3-beta.4`.

Si une spécification d'installation nue correspond à un ID de plugin groupé (par exemple `diffs`), OpenClaw
installe directement le plugin groupé. Pour installer un package npm avec le même
nom, utilisez une spécification délimitée explicite (par exemple `@scope/diffs`).

Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

Utilisez `--pin` sur les installations npm pour enregistrer la spécification exacte résolue (`name@version`) dans
`plugins.installs` tout en conservant le comportement par défaut non épinglé.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, `plugins.installs`,
la liste d'autorisation des plugins et les entrées `plugins.load.paths` liées, le cas échéant.
Pour les plugins en mémoire actifs, l'emplacement mémoire est réinitialisé à `memory-core`.

Par défaut, la désinstallation supprime également le répertoire d'installation du plugin sous la racine des extensions
du répertoire d'état actif (`$OPENCLAW_STATE_DIR/extensions/<id>`). Utilisez
`--keep-files` pour conserver les fichiers sur le disque.

`--keep-config` est pris en charge comme un alias obsolète pour `--keep-files`.

### Mise à jour

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

Les mises à jour ne s'appliquent qu'aux plugins installés depuis npm (suivis dans `plugins.installs`).

Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change,
OpenClaw affiche un avertissement et demande une confirmation avant de continuer. Utilisez
l'option globale `--yes` pour contourner les invites dans les exécutions CI/non interactives.

import fr from '/components/footer/fr.mdx';

<fr />
