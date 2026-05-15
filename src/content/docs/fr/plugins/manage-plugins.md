---
summary: "Exemples rapides pour l'installation, le listing, la désinstallation, la mise à jour et la publication des plugins OpenClaw"
read_when:
  - You want quick plugin install, list, update, or uninstall examples
  - You want to choose between ClawHub and npm plugin distribution
  - You are publishing a plugin package
title: "Gérer les plugins"
sidebarTitle: "Gérer les plugins"
---

La plupart des flux de travail des plugins consistent en quelques commandes : rechercher, installer, redémarrer le Gateway, vérifier et désinstaller lorsque vous n'avez plus besoin du plugin.

## Lister les plugins

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

Utilisez `--json` pour les scripts. Il inclut les diagnostics du registre et l'`dependencyStatus` statique de chaque plugin lorsque le paquet du plugin déclare `dependencies` ou `optionalDependencies`.

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` est une vérification à froid de l'inventaire. Il montre ce que OpenClaw peut découvrir à partir de la configuration, des manifestes et du registre des plugins ; cela ne prouve pas qu'un processus Gateway déjà en cours d'exécution a importé le runtime du plugin.

## Installer les plugins

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Bare package specs try ClawHub first, then npm fallback.
openclaw plugins install <package>

# Force one source.
openclaw plugins install clawhub:<package>
openclaw plugins install npm:<package>

# Install a specific version or dist-tag.
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

Après avoir installé le code du plugin, redémarrez le Gateway qui dessert vos canaux :

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

Utilisez `inspect --runtime` lorsque vous avez besoin d'une preuve que le plugin a enregistré des surfaces d'exécution telles que des outils, des crochets (hooks), des services, des méthodes du Gateway ou des commandes CLI propres au plugin.

## Mettre à jour les plugins

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
```

Si un plugin a été installé à partir d'une balise de distribution npm telle que `@beta`, les appels ultérieurs à `update <plugin-id>` réutilisent cette balise enregistrée. Le passage d'une spécification npm explicite bascule l'installation suivie vers cette spécification pour les futures mises à jour.

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

La deuxième commande ramène un plugin à la ligne de publication par défaut du registre lorsqu'il était précédemment épinglé à une version exacte ou à une balise.

Lorsque `openclaw update`npmClawHub s'exécute sur le canal bêta, les enregistrements de plugins npm et ClawHub par défaut essaient d'abord la version correspondante du plugin `@beta`OpenClawnpmOpenClaw. Si cette version bêta n'existe pas, OpenClaw revient à la spécification par défaut/la plus récente enregistrée. Pour les plugins npm, OpenClaw revient également lorsque le package bêta existe mais échoue à la validation de l'installation. Les versions exactes et les balises explicites telles que `@rc` ou `@beta` sont préservées.

## Désinstaller les plugins

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
openclaw gateway restart
```

La désinstallation supprime l'entrée de configuration du plugin, l'enregistrement de l'index du plugin, les entrées de la liste d'autorisation/de refus et les chemins de chargement liés le cas échéant. Les répertoires d'installation gérés sont supprimés sauf si vous passez `--keep-files`.

En mode Nix (Nix`OPENCLAW_NIX_MODE=1`Nix), les commandes d'installation, de mise à jour, de désinstallation, d'activation et de désactivation de plugins sont désactivées. Gérez plutôt ces choix dans la source Nix pour l'installation ; pour nix-openclaw, utilisez le guide de [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) axé sur l'agent.

## Publier des plugins

Vous pouvez publier des plugins externes sur [ClawHub](ClawHubhttps://clawhub.ai), npmjs.com, ou les deux.

### Publier sur ClawHub

ClawHub est la surface principale de découverte publique pour les plugins OpenClaw. Il fournit aux utilisateurs des métadonnées recherchables, l'historique des versions et les résultats de l'analyse du registre avant l'installation.

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

Les utilisateurs installent depuis ClawHub avec :

```bash
openclaw plugins install clawhub:<package>
openclaw plugins install <package>
```

La forme basique vérifie toujours ClawHub en premier.

### Publier sur npmjs.com

Les plugins npm natifs doivent inclure un manifeste de plugin et les métadonnées du point d'entrée OpenClaw npm`package.json`OpenClaw.

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
```

Les utilisateurs installent uniquement via npm avec :

```bash
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

Si le même package est également disponible sur ClawHub, ClawHub`npm:`ClawHubnpm ignore la recherche sur ClawHub et force la résolution npm.

## Choix de la source

- **ClawHub** : à utiliser lorsque vous souhaitez une découverte native OpenClaw, des résumés d'analyse,
  des versions et des conseils d'installation.
- **npmjs.com** : à utiliser lorsque vous publiez déjà des packages JavaScript ou si vous avez besoin des workflows de balises de distribution npm
  ou de registre privé.
- **Git** : à utiliser lorsque vous souhaitez installer directement à partir d'une branche, d'une balise ou d'un commit.
- **Chemin local** : à utiliser lorsque vous développez ou testez un plugin sur la même
  machine.

## Connexes

- [Plugins](/fr/tools/plugin) - vue d'ensemble et résolution des problèmes
- [`openclaw plugins`](/fr/cli/plugins) - référence complète de la CLI
- [ClawHub](/fr/clawhub/cli) - publication et opérations de registre
- [Création de plugins](/fr/plugins/building-plugins) - créer un package de plugin
- [Manifeste de plugin](/fr/plugins/manifest) - manifeste et métadonnées du package
