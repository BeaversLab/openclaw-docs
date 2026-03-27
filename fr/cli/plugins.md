---
summary: "Référence de la CLI pour `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Gérer les plugins/extensions du Gateway, les packs de hooks et les bundles compatibles.

Connexe :

- Système de plugins : [Plugins](/fr/tools/plugin)
- Compatibilité des bundles : [Plugin bundles](/fr/plugins/bundles)
- Manifeste de plugin + schéma : [Plugin manifest](/fr/plugins/manifest)
- Renforcement de la sécurité : [Security](/fr/gateway/security)

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
en ligne (`configSchema`, même s'il est vide). Les bundles compatibles utilisent à la place leurs propres
manifestes de bundle.

`plugins list` affiche `Format: openclaw` ou `Format: bundle`. La sortie de liste/info
verbose affiche également le sous-type de bundle (`codex`, `claude` ou `cursor`) ainsi que les
capacités de bundle détectées.

### Installer

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

Les noms de packages simples sont d'abord vérifiés sur ClawHub, puis sur npm. Note de sécurité :
traitez les installations de plugins comme l'exécution de code. Privilégiez les versions épinglées.

`plugins install` est également la surface d'installation pour les packs de hooks qui exposent
`openclaw.hooks` dans `package.json`. Utilisez `openclaw hooks` pour une visibilité filtrée des hooks
et l'activation par hook, et non pour l'installation de packages.

Les specs npm sont **uniquement pour le registre** (nom du package + **version exacte** facultative ou
**dist-tag**). Les specs Git/URL/fichier et les plages semver sont rejetées. Les installations
de dépendances s'exécutent avec `--ignore-scripts` pour la sécurité.

Les specs nues et `@latest` restent sur la voie stable. Si npm résout l'un de
ces éléments vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une
balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte telle que
`@1.2.3-beta.4`.

Si une spécification d'installation nue correspond à un identifiant de plugin groupé (par exemple `diffs`), OpenClaw
installe directement le plugin groupé. Pour installer un package npm portant le même
nom, utilisez une spécification délimitée explicite (par exemple `@scope/diffs`).

Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Les installations depuis le marketplace Claude sont également prises en charge.

Les installations ClawHub utilisent un localisateur `clawhub:<package>` explicite :

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw privilégie désormais ClawHub pour les spécifications de plugin nues compatibles npm. Il ne revient à npm que si ClawHub ne dispose pas de ce package ou de cette version :

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw télécharge l'archive du package depuis ClawHub, vérifie la compatibilité annoncée de l'API du plugin / de la passerelle minimale, puis l'installe via le chemin d'archive normal. Les installations enregistrées conservent leurs métadonnées source ClawHub pour les mises à jour ultérieures.

Utilisez la forme abrégée `plugin@marketplace` lorsque le nom de la place de marché existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

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
- un chemin racine de place de marché local ou `marketplace.json`
- une forme abrégée de dépôt GitHub telle que `owner/repo`
- une URL git

Pour les places de marché distantes chargées depuis GitHub ou git, les entrées de plugins doivent rester
à l'intérieur du dépôt de la place de marché cloné. OpenClaw accepte les sources de chemin relatif depuis
ce dépôt et rejette les sources de plugins git externe, GitHub, URL/archive et chemin absolu
provenant de manifests distants.

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- plugins natifs OpenClaw (`openclaw.plugin.json`)
- bundles compatibles Codex (`.codex-plugin/plugin.json`)
- bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition de composant Claude par défaut)
- bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

Les bundles compatibles s'installent dans la racine des extensions normale et participent au même flux liste/info/activer/désactiver. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut de `settings.json`, les compétences de commande Cursor et les répertoires de hook Codex compatibles sont pris en charge ; d'autres capacités de bundle détectées sont affichées dans diagnostics/info mais ne sont pas encore connectées à l'exécution du runtime.

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

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, `plugins.installs`,
la liste d'autorisation des plugins, et les entrées `plugins.load.paths` liées, le cas échéant.
Pour les plugins en mémoire active, l'emplacement mémoire est réinitialisé à `memory-core`.

Par défaut, la désinstallation supprime également le répertoire d'installation du plugin sous le répertoire racine
des extensions du répertoire d'état actif (`$OPENCLAW_STATE_DIR/extensions/<id>`). Utilisez
`--keep-files` pour conserver les fichiers sur le disque.

`--keep-config` est pris en charge en tant qu'alias obsolète pour `--keep-files`.

### Mise à jour

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

Les mises à jour s'appliquent aux installations suivies dans `plugins.installs` et aux installations de packs de hooks
suivies dans `hooks.internal.installs`.

Lorsque vous transmettez un identifiant de plugin, OpenClaw réutilise la spécification d'installation enregistrée pour ce
plugin. Cela signifie que les dist-tags précédemment stockés comme `@beta` et les versions exactes épinglées
continuent d'être utilisées lors des exécutions ultérieures de `update <id>`.

Pour les installations npm, vous pouvez également transmettre une spécification de package npm explicite avec un dist-tag
ou une version exacte. OpenClaw résout ce nom de package pour le retrouver dans l'enregistrement du plugin suivi,
met à jour ce plugin installé et enregistre la nouvelle spécification npm pour les futures
mises à jour basées sur l'identifiant.

Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change,
OpenClaw affiche un avertissement et demande une confirmation avant de continuer. Utilisez
le `--yes` global pour contourner les invites lors des exécutions en CI/non-interactives.

### Inspecter

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspection approfondie pour un seul plugin. Affiche l'identité, l'état de chargement, la source,
les capacités enregistrées, les hooks, les outils, les commandes, les services, les méthodes de la passerelle,
les routes HTTP, les indicateurs de stratégie, les diagnostics et les métadonnées d'installation.

Chaque plugin est classé selon ce qu'il enregistre réellement à l'exécution :

- **plain-capability** — un seul type de capacité (ex. un plugin fournisseur uniquement)
- **hybrid-capability** — plusieurs types de capacités (ex. texte + parole + images)
- **hook-only** — uniquement des hooks, aucune capacité ou surface
- **non-capability** — outils/commandes/services mais aucune capacité

Voir [Plugin shapes](/fr/plugins/architecture#plugin-shapes) pour plus d'informations sur le modèle de capacité.

Le drapeau `--json` génère un rapport lisible par machine adapté au scriptage et à l'audit.

`info` est un alias pour `inspect`.

import fr from "/components/footer/fr.mdx";

<fr />
