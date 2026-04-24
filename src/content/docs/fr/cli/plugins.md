---
summary: "Référence CLI pour `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Gérer les plugins Gateway, les packs de hooks et les bundles compatibles.

Connexe :

- Système de plugins : [Plugins](/fr/tools/plugin)
- Compatibilité des bundles : [Plugin bundles](/fr/plugins/bundles)
- Manifeste + schéma du plugin : [Plugin manifest](/fr/plugins/manifest)
- Renforcement de la sécurité : [Security](/fr/gateway/security)

## Commandes

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

Les plugins groupés sont fournis avec OpenClaw. Certains sont activés par défaut (par exemple
les fournisseurs de modèles groupés, les fournisseurs de reconnaissance vocale groupés et le plugin de navigation
groupé) ; d'autres nécessitent `plugins enable`.

Les plugins natifs OpenClaw doivent inclure `openclaw.plugin.json` avec un schéma JSON
en ligne (`configSchema`, même s'il est vide). Les bundles compatibles utilisent à la place leurs propres
manifestes de bundle.

`plugins list` affiche `Format: openclaw` ou `Format: bundle`. La sortie de liste/info
verbose affiche également le sous-type de bundle (`codex`, `claude`, ou `cursor`) ainsi que les capacités de bundle
détectées.

### Installer

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

Les noms de packages simples sont d'abord vérifiés sur ClawHub, puis sur npm. Note de sécurité :
traitez les installations de plugins comme l'exécution de code. Privilégiez les versions épinglées.

Si votre section `plugins` est sauvegardée par un `$include` en fichier unique, `plugins install`,
`plugins update`, `plugins enable`, `plugins disable` et `plugins uninstall`
écrivent dans ce fichier inclus et laissent `openclaw.json` intact. Les inclusions
racines, les tableaux d'inclusions et les inclusions avec des remplacements de fratries
échouent de manière fermée au lieu d'être aplaties. Consultez [Config includes](/fr/gateway/configuration)
pour les formes prises en charge.

Si la configuration n'est pas valide, `plugins install` échoue normalement de manière fermée et vous demande
de d'abord exécuter `openclaw doctor --fix`. La seule exception documentée est un chemin
de récupération étroit pour les plugins groupés qui optent explicitement pour
`openclaw.install.allowInvalidConfigRecovery`.

`--force` réutilise la cible d'installation existante et écrase sur place un plugin
ou un pack de hooks déjà installé. Utilisez-le lorsque vous réinstallez intentionnellement
le même identifiant depuis un nouveau chemin local, une archive, un package ClawHub ou un artefact npm.
Pour les mises à niveau de routine d'un plugin npm déjà suivi, privilégiez
`openclaw plugins update <id-or-npm-spec>`.

Si vous exécutez `plugins install` pour un identifiant de plugin déjà installé, OpenClaw
s'arrête et vous dirige vers `plugins update <id-or-npm-spec>` pour une mise à niveau normale,
ou vers `plugins install <package> --force` lorsque vous souhaitez vraiment écraser
l'installation actuelle à partir d'une source différente.

`--pin` s'applique uniquement aux installations npm. Il n'est pas pris en charge avec `--marketplace`,
car les installations depuis la marketplace persistent les métadonnées de source de la marketplace au lieu d'une
spécification npm.

`--dangerously-force-unsafe-install` est une option de secours pour les faux positifs
dans l'analyseur de code dangereux intégré. Elle permet à l'installation de continuer même
lorsque l'analyseur intégré signale des résultats `critical`, mais elle ne contourne **pas**
les blocages de stratégie de hook de plugin `before_install` et ne contourne **pas** les échecs
d'analyse.

Ce drapeau CLI s'applique aux flux d'installation/mise à jour de plugins. Les installations de dépendances de compétences soutenues par Gateway utilisent la substitution de requête `dangerouslyForceUnsafeInstall` correspondante,
tandis que `openclaw skills install` reste un flux de téléchargement/installation de compétence ClawHub distinct.

`plugins install` est également la surface d'installation pour les packs de hooks qui exposent
`openclaw.hooks` dans `package.json`. Utilisez `openclaw hooks` pour une visibilité filtrée des hooks
et l'activation par hook, et non pour l'installation de packages.

Les spécifications npm sont **uniquement de registre** (nom du package + **version exacte** facultative ou
**dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées. Les installations
de dépendances s'exécutent avec `--ignore-scripts` pour plus de sécurité.

Les spécifications nues et `@latest` restent sur la voie stable. Si npm résout l'un de
ceux-ci vers une préversion, OpenClaw s'arrête et vous demande de vous inscrire explicitement avec une
balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte telle que
`@1.2.3-beta.4`.

Si une spécification d'installation nue correspond à un ID de plugin groupé (par exemple `diffs`), OpenClaw
installe directement le plugin groupé. Pour installer un package npm avec le même
nom, utilisez une spécification délimitée explicite (par exemple `@scope/diffs`).

Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Les installations du marketplace Claude sont également prises en charge.

Les installations ClawHub utilisent un localisateur `clawhub:<package>` explicite :

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw préfère désormais également ClawHub pour les spécifications de plugins npm-safes nues. Il ne revient à npm que si ClawHub ne possède pas ce package ou cette version :

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw télécharge l'archive du package depuis ClawHub, vérifie la compatibilité annoncée de l'API du plugin / de la passerelle minimale, puis l'installe via le chemin d'archive normal. Les installations enregistrées conservent leurs métadonnées de source ClawHub pour les mises à jour ultérieures.

Utilisez la forme abrégée `plugin@marketplace` lorsque le nom de la place de marché existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Utilisez `--marketplace` lorsque vous souhaitez spécifier explicitement la source de la place de marché :

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Les sources de la place de marché peuvent être :

- un nom de place de marché connue de Claude provenant de `~/.claude/plugins/known_marketplaces.json`
- un chemin racine de la place de marché local ou `marketplace.json`
- une forme abrégée de dépôt GitHub telle que `owner/repo`
- une URL de dépôt GitHub telle que `https://github.com/owner/repo`
- une URL git

Pour les places de marché distantes chargées depuis GitHub ou git, les entrées de plugins doivent rester à l'intérieur du dépôt cloné de la place de marché. OpenClaw accepte les sources de chemin relatif provenant de ce dépôt et rejette les sources de plugins HTTP(S), chemin absolu, git, GitHub et autres sources non cheminées provenant de manifestes distants.

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- les plugins natifs OpenClaw (`openclaw.plugin.json`)
- les bundles compatibles Codex (`.codex-plugin/plugin.json`)
- les bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition de composant Claude par défaut)
- les bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

Les bundles compatibles s'installent dans la racine du plugin normale et participent au même flux liste/info/activer/désactiver. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut Claude `settings.json`, les valeurs par défaut Claude `.lsp.json` / déclarées dans le manifeste `lspServers`, les compétences de commande Cursor et les répertoires de hooks Codex compatibles sont pris en charge ; d'autres capacités de bundle détectées sont affichées dans les diagnostics/info mais ne sont pas encore intégrées à l'exécution runtime.

### Liste

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

Utilisez `--enabled` pour afficher uniquement les plugins chargés. Utilisez `--verbose` pour passer de la vue table aux lignes de détail par plugin avec les métadonnées source/origine/version/activation. Utilisez `--json` pour un inventaire lisible par machine plus les diagnostics de registre.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

`--force` n'est pas pris en charge avec `--link` car les installations liées réutilisent le chemin source au lieu de copier vers une cible d'installation gérée.

Utilisez `--pin` sur les installations npm pour enregistrer la spec exacte résolue (`name@version`) dans `plugins.installs` tout en gardant le comportement par défaut non épinglé.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, `plugins.installs`, la liste d'autorisation des plugins, et les entrées `plugins.load.paths` liées le cas échéant. Pour les plugins en mémoire actifs, l'emplacement mémoire est réinitialisé à `memory-core`.

Par défaut, la désinstallation supprime également le répertoire d'installation du plugin sous la racine des plugins state-dir actifs. Utilisez `--keep-files` pour conserver les fichiers sur le disque.

`--keep-config` est pris en charge comme un alias obsolète pour `--keep-files`.

### Mettre à jour

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Les mises à jour s'appliquent aux installations suivies dans `plugins.installs` et aux installations de hook-packs suivies dans `hooks.internal.installs`.

Lorsque vous passez un identifiant de plugin, OpenClaw réutilise la spec d'installation enregistrée pour ce plugin. Cela signifie que les dist-tags précédemment stockés comme `@beta` et les versions épinglées exactes continuent d'être utilisées lors des exécutions ultérieures de `update <id>`.

Pour les installations npm, vous pouvez également passer une spec de package npm explicite avec un dist-tag ou une version exacte. OpenClaw résout ce nom de package vers l'enregistrement de plugin suivi, met à jour ce plugin installé, et enregistre la nouvelle spec npm pour les futures mises à jour basées sur l'ID.

Passer le nom du package npm sans version ni tag résout également vers l'enregistrement de plugin suivi. Utilisez ceci lorsqu'un plugin a été épinglé à une version exacte et que vous souhaitez le ramener à la ligne de publication par défaut du registre.

Avant une mise à jour npm en direct, OpenClaw vérifie la version du package installée par rapport aux métadonnées du registre npm. Si la version installée et l'identité de l'artefact enregistré correspondent déjà à la cible résolue, la mise à jour est ignorée sans téléchargement, réinstallation ou réécriture de `openclaw.json`.

Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change, OpenClaw considère cela comme une dérive d'artefact npm. La commande interactive `openclaw plugins update` affiche les hachages attendus et réels et demande une confirmation avant de continuer. Les assistants de mise à jour non interactifs échouent fermement, sauf si l'appelant fournit une stratégie de continuation explicite.

`--dangerously-force-unsafe-install` est également disponible sur `plugins update` en tant que substitution de secours pour les faux positifs de l'analyse de code dangereux intégrée lors des mises à jour de plugins. Il ne contourne toujours pas les blocages de stratégie de plugin `before_install` ou le blocage en cas d'échec de l'analyse, et ne s'applique qu'aux mises à jour de plugins, pas aux mises à jour de packs de hooks.

### Inspecter

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspection approfondie pour un seul plugin. Affiche l'identité, l'état de chargement, la source, les capacités enregistrées, les hooks, les outils, les commandes, les services, les méthodes de passerelle, les routes HTTP, les indicateurs de stratégie, les diagnostics, les métadonnées d'installation, les capacités de bundle, et tout support de serveur MCP ou LSP détecté.

Chaque plugin est classé selon ce qu'il enregistre réellement lors de l'exécution :

- **plain-capability** — un type de capacité (ex: un plugin de type provider uniquement)
- **hybrid-capability** — plusieurs types de capacités (ex: texte + parole + images)
- **hook-only** — uniquement des hooks, aucune capacité ni surface
- **non-capability** — outils/commandes/services mais aucune capacité

Voir [Plugin shapes](/fr/plugins/architecture#plugin-shapes) pour plus d'informations sur le modèle de capacité.

L'indicateur `--json` génère un rapport lisible par machine adapté au scriptage et à l'audit.

`inspect --all` affiche un tableau à l'échelle de la flotte avec des colonnes pour la forme, les types de capacités, les avis de compatibilité, les capacités de bundle et un résumé des hooks.

`info` est un alias pour `inspect`.

### Docteur

```bash
openclaw plugins doctor
```

`doctor` signale les erreurs de chargement de plugins, les diagnostics de manifeste/découverte et les avis de compatibilité. Lorsque tout est propre, il affiche `Aucun problème de plugin détecté.`

Pour les échecs de forme de module tels que les exportations `register`/`activate` manquantes, réexécutez avec `OPENCLAW_PLUGIN_LOAD_DEBUG=1` pour inclure un résumé compact de la forme d'exportation dans la sortie de diagnostic.

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La liste de la Marketplace accepte un chemin local vers la Marketplace, un chemin `marketplace.json`, un raccourci GitHub comme `owner/repo`, une URL de dépôt GitHub, ou une URL git. `--json` affiche l'étiquette de source résolue ainsi que le manifeste de la Marketplace analysé et les entrées de plugins.
