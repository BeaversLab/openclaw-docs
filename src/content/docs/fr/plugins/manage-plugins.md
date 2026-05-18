---
summary: "OpenClawExemples rapides pour lister, installer, mettre à jour, inspecter et désinstaller les plugins OpenClaw"
read_when:
  - You want quick plugin list, install, update, inspect, or uninstall examples
  - You want to choose a plugin install source
  - You want the right reference for publishing plugin packages
title: "Gérer les plugins"
sidebarTitle: "Gérer les plugins"
doc-schema-version: 1
---

Utilisez cette page pour les commandes courantes de gestion de plugins. Pour le contrat complet des commandes,
les indicateurs, les règles de sélection de source et les cas particuliers, consultez
[`openclaw plugins`](/fr/cli/plugins).

La plupart des flux d'installation consistent à :

1. trouver un package
2. l'installer depuis ClawHub, npm, git ou un chemin local
3. laisser la Gateway gérée redémarrer automatiquement, ou la redémarrer manuellement si elle n'est pas gérée
4. vérifier les enregistrements d'exécution du plugin

## Lister et rechercher des plugins

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search "calendar"
```

Utilisez `--json` pour les scripts :

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list`OpenClawGateway est une vérification à froid de l'inventaire. Il montre ce qu'OpenClaw peut découvrir
à partir de la configuration, des manifestes et du registre de plugins ; cela ne prouve pas qu'une
Gateway déjà en cours d'exécution a importé le runtime du plugin. La sortie JSON inclut
les diagnostics du registre et le `dependencyStatus` statique de chaque plugin lorsque le
package de plugin déclare `dependencies` ou `optionalDependencies`.

`plugins search`ClawHub interroge ClawHub pour les packages de plugins installables et affiche
des conseils d'installation tels que `openclaw plugins install clawhub:<package>`.

## Installer des plugins

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Install from ClawHub.
openclaw plugins install clawhub:<package>
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta

# Install from npm.
openclaw plugins install npm:<package>
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from a local npm pack artifact.
openclaw plugins install npm-pack:<path.tgz>

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

Les spécifications de packages nues s'installent depuis npm lors du basculement de lancement. Utilisez npm`clawhub:`,
`npm:`, `git:` ou `npm-pack:`OpenClaw lorsque vous avez besoin d'une sélection déterministe de la source.
Si le nom nu correspond à un identifiant de plugin officiel, OpenClaw peut installer l'entrée
de catalogue directement.

Utilisez `--force`npmClawHub uniquement lorsque vous souhaitez intentionnellement écraser une cible d'installation existante.
Pour les mises à niveau courantes des installations suivies depuis npm, ClawHub ou hook-pack, utilisez
`openclaw plugins update`.

## Redémarrer et inspecter

Après l'installation, la mise à jour ou la désinstallation du code du plugin, un Gateway géré en cours d'exécution avec le rechargement de la configuration activé redémarre automatiquement. Si le Gateway n'est pas géré ou si le rechargement est désactivé, redémarrez-le vous-même avant de vérifier les surfaces d'exécution en direct :

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

Utilisez `inspect --runtime` lorsque vous avez besoin d'une preuve que le plugin a enregistré des surfaces d'exécution telles que des outils, des crochets (hooks), des services, des méthodes de Gateway, des routes HTTP ou des commandes CLI propres au plugin. `inspect` et `list` simples sont des vérifications à froid du manifeste, de la configuration et du registre.

## Mettre à jour les plugins

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
openclaw plugins update <plugin-id> --dry-run
```

Lorsque vous transmettez un identifiant de plugin, OpenClaw réutilise la spécification d'installation suivie. Les balises de distribution (dist-tags) stockées telles que `@beta` et les versions épinglées exactes continuent d'être utilisées lors des exécutions ultérieures de `update <plugin-id>`.

Pour les installations npm, vous pouvez transmettre une spécification de package explicite pour modifier l'enregistrement suivi :

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

La deuxième commande ramène un plugin à la ligne de publication par défaut du registre lorsqu'il était précédemment épinglé à une version ou une balise exacte.

Lorsque `openclaw update` s'exécute sur le canal bêta, les enregistrements de plugins peuvent préférer les versions `@beta` correspondantes. Pour les règles exactes de repli et d'épinglage, consultez [`openclaw plugins`](/fr/cli/plugins#update).

## Désinstaller les plugins

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
```

La désinstallation supprime l'entrée de configuration du plugin, l'enregistrement de l'index du plugin persisté, les entrées des listes d'autorisation/refus et les chemins de chargement liés, le cas échéant. Les répertoires d'installation gérés sont supprimés sauf si vous transmettez `--keep-files`. Un Gateway géré en cours d'exécution redémarre automatiquement lorsque la désinstallation modifie la source du plugin.

En mode Nix (`OPENCLAW_NIX_MODE=1`), les commandes d'installation, de mise à jour, de désinstallation, d'activation et de désactivation de plugins sont désactivées. Gérez plutôt ces choix dans la source Nix pour l'installation.

## Choisir une source

| Source          | Utiliser quand                                                                                        | Exemple                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub         | Vous souhaitez une découverte native OpenClaw, des résumés d'analyse, des versions et des indices     | `openclaw plugins install clawhub:<package>`                   |
| npmjs.com       | Vous livrez déjà des packages JavaScript ou avez besoin de balises de distribution/registre privé npm | `openclaw plugins install npm:@acme/openclaw-plugin`           |
| git             | Vous souhaitez une branche, une étiquette ou un commit provenant d'un dépôt                           | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| chemin local    | Vous développez ou testez un plugin sur la même machine                                               | `openclaw plugins install --link ./my-plugin`                  |
| npm pack        | Vous fournissez un artifact de package local via la sémantique d'installation npm                     | `openclaw plugins install npm-pack:<path.tgz>`                 |
| place de marché | Vous installez un plugin de place de marché compatible avec Claude                                    | `openclaw plugins install <plugin> --marketplace <source>`     |

## Publier des plugins

ClawHub est la principale surface de découverte publique pour les plugins OpenClaw. Publiez
y lorsque vous souhaitez que les utilisateurs trouvent les métadonnées du plugin, l'historique des versions, les résultats de l'analyse du registre
et les conseils d'installation avant d'installer.

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

Les plugins natifs npm doivent inclure un manifeste de plugin et les métadonnées du package avant
la publication :

```json package.json
{
  "name": "@acme/openclaw-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

```bash
npm publish --access public
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

Utilisez ces pages pour le contrat de publication complet au lieu de traiter cette page
comme la référence de publication :

- [Publication sur ClawHub](/fr/clawhub/publishing) explique les propriétaires, les portées, les versions,
  la révision, la validation des packages et le transfert de packages.
- [Création de plugins](/fr/plugins/building-plugins) montre la structure du package de plugin
  et le premier flux de publication.
- [Manifeste de plugin](/fr/plugins/manifest) définit les champs du manifeste de plugin natif.

Si le même package est disponible à la fois sur ClawHub et npm, utilisez le préfixe explicite
`clawhub:` ou `npm:` lorsque vous devez forcer une source.

## Connexes

- [Plugins](/fr/tools/plugin) - installer, configurer, redémarrer et résoudre des problèmes
- [`openclaw plugins`](/fr/cli/plugins) - référence complète de la CLI
- [Plugins communautaires](/fr/plugins/community) - découverte publique et publication ClawHub
- [ClawHub](/fr/clawhub/cli) - opérations CLI de registre
- [Création de plugins](/fr/plugins/building-plugins) - créer un package de plugin
- [Plugin manifest](/fr/plugins/manifest) - manifeste et métadonnées du package
