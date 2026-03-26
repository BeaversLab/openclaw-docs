---
summary: "Référence CLI pour `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Gérer les plugins/extensions de Gateway et les bundles compatibles.

Connexe :

- Système de plugins : [Plugins](/fr/tools/plugin)
- Compatibilité des bundles : [Plugin bundles](/fr/plugins/bundles)
- Manifeste de plugin + schéma : [Plugin manifest](/fr/plugins/manifest)
- Renforcement de la sécurité : [Sécurité](/fr/gateway/security)

## Commandes

```bash
openclaw plugins list
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
```

Les plugins groupés sont fournis avec OpenClaw mais sont désactivés par défaut. Utilisez `plugins enable` pour
les activer.

Les plugins natifs OpenClaw doivent inclure `openclaw.plugin.json` avec un Schéma JSON
en ligne (`configSchema`, même s'il est vide). Les bundles compatibles utilisent leurs propres
manifestes de bundle à la place.

`plugins list` affiche `Format: openclaw` ou `Format: bundle`. La sortie de liste/info
verbose affiche également le sous-type de bundle (`codex`, `claude` ou `cursor`) ainsi que les capacités
détectées du bundle.

### Installer

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

Note de sécurité : traitez les installations de plugins comme l'exécution de code. Privilégiez les versions épinglées.

Les spécifications npm sont **uniquement pour le registre** (nom du package + **version exacte** facultative ou
**dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées. Les installations
de dépendances s'exécutent avec `--ignore-scripts` pour la sécurité.

Les spécifications nues et `@latest` restent sur la voie stable. Si npm résout l'un de
ceux-ci vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une
balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte telle que
`@1.2.3-beta.4`.

Si une spécification d'installation nue correspond à un id de plugin groupé (par exemple `diffs`), OpenClaw
installe directement le plugin groupé. Pour installer un package npm avec le même
nom, utilisez une spécification délimitée explicite (par exemple `@scope/diffs`).

Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Les installations depuis le marketplace Claude sont également prises en charge.

Utilisez le raccourci `plugin@marketplace` lorsque le nom du marketplace existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Utilisez `--marketplace` lorsque vous souhaitez explicitement spécifier la source du marketplace :

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Les sources de la place de marché peuvent être :

- un nom de marketplace connu de Claude depuis `~/.claude/plugins/known_marketplaces.json`
- un chemin racine du marketplace local ou `marketplace.json`
- un raccourci de dépôt GitHub tel que `owner/repo`
- une URL git

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- plugins natifs OpenClaw (`openclaw.plugin.json`)
- bundles compatibles Codex (`.codex-plugin/plugin.json`)
- bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition des composants Claude par défaut)
- bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

Les bundles compatibles sont installés dans le répertoire racine des extensions normal et participent au même flux de liste/info/activation/désactivation. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut `settings.json` de Claude, les compétences de commande Cursor et les répertoires de hook Codex compatibles sont pris en charge ; d'autres capacités de bundle détectées sont affichées dans les diagnostics/info mais ne sont pas encore connectées à l'exécution runtime.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

Utilisez `--pin` pour les installations npm pour enregistrer la spécification exacte résolue (`name@version`) dans `plugins.installs` tout en gardant le comportement par défaut non épinglé.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, `plugins.installs`, la liste autorisée de plugins, et les entrées `plugins.load.paths` liées le cas échéant. Pour les plugins de mémoire actifs, l'emplacement de mémoire est réinitialisé à `memory-core`.

Par défaut, la désinstallation supprime également le répertoire d'installation du plugin sous le répertoire racine des extensions du répertoire d'état actif (`$OPENCLAW_STATE_DIR/extensions/<id>`). Utilisez `--keep-files` pour conserver les fichiers sur le disque.

`--keep-config` est pris en charge comme un alias obsolète pour `--keep-files`.

### Mettre à jour

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

Les mises à jour s'appliquent aux installations suivies dans `plugins.installs`, actuellement les installations npm et marketplace.

Lorsque vous transmettez un identifiant de plugin, OpenClaw réutilise la spécification d'installation enregistrée pour ce
plugin. Cela signifie que les dist-tags précédemment stockés, tels que `@beta`, et les versions exactes épinglées
continuent d'être utilisés lors des exécutions ultérieures de `update <id>`.

Pour les installations npm, vous pouvez également transmettre une spécification de package npm explicite avec un dist-tag
ou une version exacte. OpenClaw résout ce nom de package vers l'enregistrement du plugin suivi,
met à jour ce plugin installé et enregistre la nouvelle spécification npm pour les futures
mises à jour basées sur l'identifiant.

Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change,
OpenClaw affiche un avertissement et demande une confirmation avant de continuer. Utilisez
le `--yes` global pour contourner les invites lors des exécutions CI/non interactives.

### Inspecter

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspection approfondie pour un seul plugin. Affiche l'identité, l'état de chargement, la source,
les capacités enregistrées, les hooks, les outils, les commandes, les services, les méthodes de passerelle,
les routes HTTP, les indicateurs de stratégie, les diagnostics et les métadonnées d'installation.

Chaque plugin est classé selon ce qu'il enregistre réellement au moment de l'exécution :

- **plain-capability** — un type de capacité (ex. un plugin fournisseur uniquement)
- **hybrid-capability** — plusieurs types de capacités (ex. texte + parole + images)
- **hook-only** — uniquement des hooks, aucune capacité ni surface
- **non-capability** — outils/commandes/services mais aucune capacité

Voir [Plugin shapes](/fr/plugins/architecture#plugin-shapes) pour plus d'informations sur le modèle de capacité.

Le drapeau `--json` génère un rapport lisible par une machine, adapté au scripting et
à l'audit.

`info` est un alias pour `inspect`.

import fr from "/components/footer/fr.mdx";

<fr />
