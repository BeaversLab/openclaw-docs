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
openclaw plugins marketplace list <marketplace>
```

Les plugins groupés sont fournis avec OpenClaw mais sont désactivés par défaut. Utilisez `plugins enable` pour
les activer.

Les plugins natifs OpenClaw doivent inclure `openclaw.plugin.json` avec un schéma JSON
en ligne (`configSchema`, même s'il est vide). Les bundles compatibles utilisent leurs propres
manifestes de bundle à la place.

`plugins list` affiche `Format: openclaw` ou `Format: bundle`. La sortie de liste/info détaillée
affiche également le sous-type de bundle (`codex`, `claude` ou `cursor`) ainsi que les capacités de bundle
détectées.

### Installer

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

Note de sécurité : traitez les installations de plugins comme l'exécution de code. Privilégiez les versions épinglées.

Les spécifications Npm sont **uniquement de registre** (nom du package + **version exacte** facultative ou
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

Les installations depuis le marketplace Claude sont également prises en charge.

Utilisez le raccourci `plugin@marketplace` lorsque le nom de la place de marché existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Utilisez `--marketplace` lorsque vous souhaitez spécifier explicitement la source de la place de marché :

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Les sources de la place de marché peuvent être :

- un nom de place de marché connue de Claude depuis `~/.claude/plugins/known_marketplaces.json`
- une racine de place de marché locale ou un chemin `marketplace.json`
- un raccourci de dépôt GitHub tel que `owner/repo`
- une URL git

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- les plugins natifs OpenClaw (`openclaw.plugin.json`)
- les bundles compatibles Codex (`.codex-plugin/plugin.json`)
- les bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition par défaut des composants Claude)
- les bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

Les bundles compatibles s'installent dans la racine des extensions normale et participent au même flux de liste/info/activation/désactivation. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut Claude `settings.json`, les compétences de commande Cursor et les répertoires de hook Codex compatibles sont pris en charge ; d'autres capacités de bundle détectées sont affichées dans les diagnostics/info mais ne sont pas encore intégrées à l'exécution runtime.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

Utilisez `--pin` sur les installations npm pour enregistrer la spécification exacte résolue (`name@version`) dans `plugins.installs` tout en gardant le comportement par défaut non épinglé.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugin de `plugins.entries`, `plugins.installs`, la liste d'autorisation des plugins et les entrées `plugins.load.paths` liées le cas échéant. Pour les plugins de mémoire actifs, l'emplacement mémoire est réinitialisé à `memory-core`.

Par défaut, la désinstallation supprime également le répertoire d'installation du plugin sous la racine des extensions du répertoire d'état actif (`$OPENCLAW_STATE_DIR/extensions/<id>`). Utilisez `--keep-files` pour conserver les fichiers sur le disque.

`--keep-config` est pris en charge comme un alias obsolète pour `--keep-files`.

### Mettre à jour

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

Les mises à jour s'appliquent aux installations suivies dans `plugins.installs`, actuellement les installations npm et du marketplace.

Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change, OpenClaw affiche un avertissement et demande une confirmation avant de continuer. Utilisez le `--yes` global pour contourner les invites lors des exécutions CI/non interactives.

import fr from "/components/footer/fr.mdx";

<fr />
