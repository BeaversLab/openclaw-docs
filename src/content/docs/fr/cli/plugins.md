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

- Système de plugins : [Plugins](/en/tools/plugin)
- Compatibilité des bundles : [Plugin bundles](/en/plugins/bundles)
- Manifeste de plugin + schéma : [Plugin manifest](/en/plugins/manifest)
- Renforcement de la sécurité : [Security](/en/gateway/security)

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
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

Les noms de packages simples sont d'abord vérifiés sur ClawHub, puis sur npm. Note de sécurité :
traitez les installations de plugins comme l'exécution de code. Privilégiez les versions épinglées.

`--dangerously-force-unsafe-install` est une option de rupture pour les faux positifs
dans le scanneur de code dangereux intégré. Elle permet à l'installation de continuer même
lorsque le scanneur intégré signale des résultats `critical`, mais elle ne contourne **pas**
les blocages de stratégie de hook de plugin `before_install` et ne contourne **pas** les échecs de
scan.

Ce drapeau CLI s'applique à `openclaw plugins install`. Les installations de dépendances de compétences
prises en charge par Gateway utilisent la substitution de requête `dangerouslyForceUnsafeInstall` correspondante,
tandis que `openclaw skills install` reste un flux de téléchargement/installation de compétences
ClawHub distinct.

`plugins install` est également la surface d'installation pour les packs de hooks qui exposent
`openclaw.hooks` dans `package.json`. Utilisez `openclaw hooks` pour une visibilité filtrée des hooks
et l'activation par hook, et non pour l'installation de packages.

Les specs npm sont **uniquement pour le registre** (nom du package + **version exacte** facultative ou
**dist-tag**). Les specs Git/URL/fichier et les plages semver sont rejetées. Les installations
de dépendances s'exécutent avec `--ignore-scripts` pour la sécurité.

Les specs nues et `@latest` restent sur la voie stable. Si npm résolve l'un ou l'autre
de ceux-ci vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une
balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte telle que
`@1.2.3-beta.4`.

Si une spec d'installation nue correspond à un ID de plugin groupé (par exemple `diffs`), OpenClaw
installe directement le plugin groupé. Pour installer un package npm avec le même
nom, utilisez une spec Scoped explicite (par exemple `@scope/diffs`).

Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Les installations depuis la place de marché Claude sont également prises en charge.

Les installations ClawHub utilisent un localisateur explicite `clawhub:<package>` :

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw préfère désormais également ClawHub pour les spécifications de plugin nues compatibles avec npm. Il ne revient à npm que si ClawHub ne dispose pas de ce package ou de cette version :

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw télécharge l'archive du package depuis ClawHub, vérifie la API du plugin annoncée / la compatibilité minimale de la passerelle, puis l'installe via le chemin d'archive normal. Les installations enregistrées conservent leurs métadonnées source ClawHub pour les mises à jour ultérieures.

Utilisez le raccourci `plugin@marketplace` lorsque le nom de la place de marché existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Utilisez `--marketplace` lorsque vous souhaitez transmettre explicitement la source de la place de marché :

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Les sources de la place de marché peuvent être :

- un nom de place de marché connue de Claude issu de `~/.claude/plugins/known_marketplaces.json`
- un chemin racine ou un chemin `marketplace.json` vers une place de marché locale
- un raccourci de dépôt GitHub tel que `owner/repo`
- une URL git

Pour les places de marché distantes chargées depuis GitHub ou git, les entrées de plugins doivent rester à l'intérieur du dépôt cloné de la place de marché. OpenClaw accepte les sources de chemin relatif depuis ce dépôt et rejette les sources de plugins externes git, GitHub, URL/archive et chemin absolu provenant de manifestes distants.

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- les plugins natifs OpenClaw (`openclaw.plugin.json`)
- les bundles compatibles Codex (`.codex-plugin/plugin.json`)
- les bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition par défaut des composants Claude)
- les bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

Les bundles compatibles sont installés dans la racine des extensions normale et participent au même flux liste/info/activer/désactiver. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut des `settings.json` Claude, les compétences de commande Cursor et les répertoires de hooks Codex compatibles sont pris en charge ; d'autres capacités de bundle détectées sont affichées dans les diagnostics/info mais ne sont pas encore connectées à l'exécution runtime.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

Utilisez `--pin` lors des installations npm pour enregistrer la spécification exacte résolue (`name@version`) dans `plugins.installs` tout en gardant le comportement par défaut non épinglé.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, `plugins.installs`,
la liste d'autorisation des plugins, et les entrées `plugins.load.paths` liées, le cas échéant.
Pour les plugins de mémoire actifs, l'emplacement mémoire est réinitialisé à `memory-core`.

Par défaut, la désinstallation supprime également le répertoire d'installation du plugin sous la racine des plugins du state-dir actif.
Utilisez `--keep-files` pour conserver les fichiers sur le disque.

`--keep-config` est pris en charge en tant qu'alias déconseillé pour `--keep-files`.

### Mettre à jour

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

Les mises à jour s'appliquent aux installations suivies dans `plugins.installs` et aux installations de hook-packs
suivies dans `hooks.internal.installs`.

Lorsque vous passez un identifiant de plugin, OpenClaw réutilise la spécification d'installation enregistrée pour ce
plugin. Cela signifie que les dist-tags précédemment stockés, tels que `@beta`, et les versions épinglées exactes
continuent d'être utilisés lors des exécutions ultérieures de `update <id>`.

Pour les installations npm, vous pouvez également passer une spécification de package npm explicite avec un dist-tag
ou une version exacte. OpenClaw résout ce nom de package vers l'enregistrement de plugin suivi,
met à jour ce plugin installé, et enregistre la nouvelle spécification npm pour les futures
mises à jour basées sur l'identifiant.

Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change,
OpenClaw affiche un avertissement et demande une confirmation avant de procéder. Utilisez
l'option globale `--yes` pour contourner les invites dans les exécutions CI/non interactives.

### Inspecter

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspection approfondie pour un seul plugin. Affiche l'identité, l'état de chargement, la source,
les capacités enregistrées, les hooks, les outils, les commandes, les services, les méthodes de passerelle,
les routes HTTP, les indicateurs de stratégie, les diagnostics et les métadonnées d'installation.

Chaque plugin est classé selon ce qu'il enregistre réellement lors de l'exécution :

- **plain-capability** — un type de capacité (ex. un plugin provider uniquement)
- **hybrid-capability** — plusieurs types de capacités (ex. texte + parole + images)
- **hook-only** — uniquement des hooks, aucune capacité ni surface
- **non-capability** — outils/commandes/services mais aucune capacité

Voir [Plugin shapes](/en/plugins/architecture#plugin-shapes) pour plus d'informations sur le modèle de capacité.

L'option `--json` génère un rapport lisible par machine adapté au scriptage et à l'audit.

`info` est un alias pour `inspect`.
