---
summary: "Guide du format de bundle unifié pour les bundles Codex, Claude et Cursor dans OpenClaw"
read_when:
  - Vous souhaitez installer ou déboguer un bundle compatible avec Codex, Claude ou Cursor
  - Vous devez comprendre comment OpenClaw mappe le contenu du bundle vers les fonctionnalités natives
  - Vous documentez la compatibilité des bundles ou les limites actuelles de la prise en charge
title: "Bundles de plugins"
---

# Bundles de plugins

OpenClaw prend en charge une classe partagée de packages de plugins externes : les **bundle
plugins**.

Aujourd'hui, cela signifie trois écosystèmes étroitement liés :

- Bundles Codex
- Bundles Claude
- Bundles Cursor

OpenClaw les affiche tous sous la forme `Format: bundle` dans `openclaw plugins list`.
La sortie détaillée et `openclaw plugins inspect <id>` affichent également le sous-type
(`codex`, `claude` ou `cursor`).

Connexe :

- Aperçu du système de plugins : [Plugins](/fr/tools/plugin)
- Flux d'installation/liste de la CLI : [plugins](/fr/cli/plugins)
- Schéma de manifeste natif : [Plugin manifest](/fr/plugins/manifest)

## Qu'est-ce qu'un bundle

Un bundle est un **pack de contenu/métadonnées**, et non un plugin natif en processus dans OpenClaw.

Aujourd'hui, OpenClaw n'exécute **pas** le code d'exécution du bundle en processus. À la place,
il détecte les fichiers de bundle connus, lit les métadonnées et mappe le contenu du bundle
pris en charge vers les surfaces natives OpenClaw telles que les compétences, les packs de hooks, la configuration MCP,
et les paramètres Pi intégrés.

C'est la principale limite de confiance :

- plugin natif OpenClaw : le module d'exécution s'exécute en processus
- bundle : pack de métadonnées/contenu, avec un mappage sélectif des fonctionnalités

## Modèle de bundle partagé

Les bundles Codex, Claude et Cursor sont suffisamment similaires pour qu'OpenClaw les traite
comme un modèle normalisé.

Idée partagée :

- un petit fichier manifeste, ou une structure de répertoire par défaut
- une ou plusieurs racines de contenu telles que `skills/` ou `commands/`
- métadonnées optionnelles d'outil/d'exécution telles que MCP, hooks, agents ou LSP
- installer en tant que répertoire ou archive, puis activer dans la liste normale des plugins

Comportement commun d'OpenClaw :

- détecter le sous-type de bundle
- le normaliser en un enregistrement de bundle interne unique
- mapper les parties prises en charge vers les fonctionnalités natives OpenClaw
- signaler les parties non prises en charge comme des capacités détectées mais non connectées

En pratique, la plupart des utilisateurs n'ont pas besoin de penser d'abord au
format spécifique au fournisseur. La question la plus utile est : quelles surfaces
de bundle OpenClaw mappe-t-il aujourd'hui ?

## Ordre de détection

OpenClaw préfère les mises en page natives de plugins/packages OpenClaw avant
la gestion des bundles.

Effet pratique :

- `openclaw.plugin.json` l'emporte sur la détection de bundle
- les installations de packages avec `package.json` valide +
  `openclaw.extensions` utilisent le chemin d'installation natif
- si un répertoire contient à la fois des métadonnées natives et de bundle,
  OpenClaw le traite d'abord comme natif

Cela évite d'installer partiellement un package au format double en tant que
bundle et de le charger plus tard en tant que plugin natif.

## Ce qui fonctionne aujourd'hui

OpenClaw normalise les métadonnées du bundle en un enregistrement de bundle
interne unique, puis mappe les surfaces prises en charge vers le comportement natif
existant.

### Pris en charge maintenant

#### Contenu des compétences (Skill content)

- les racines de compétence de bundle se chargent comme des racines de compétence
OpenClaw normales
- les racines `commands` de Claude sont traitées comme des racines
de compétence supplémentaires
- les racines `.cursor/commands` de Cursor sont traitées comme des racines
de compétence supplémentaires

Cela signifie que les fichiers de commandes markdown de Claude fonctionnent
via le chargeur de compétence normal d'OpenClaw. Le markdown de commande Cursor
fonctionne via le même chemin.

#### Packs de crochets (Hook packs)

- les racines de crochet de bundle ne fonctionnent **que** lorsqu'elles utilisent
  la mise en page normale de pack de crochets OpenClaw. Aujourd'hui, c'est
  principalement le cas compatible avec Codex :
  - `HOOK.md`
  - `handler.ts` ou `handler.js`

#### MCP pour Pi

- les bundles activés peuvent contribuer à la configuration du serveur MCP
- OpenClaw fusionne la configuration MCP du bundle dans les paramètres Pi embarqués
  effectifs en tant que `mcpServers`
- OpenClaw expose également les outils MCP de bundle pris en charge pendant les
  tours de l'agent Pi embarqué en lançant les serveurs MCP stdio pris en
  charge en tant que sous-processus
- les paramètres Pi locaux au projet s'appliquent toujours après les valeurs par
  défaut du bundle, donc les paramètres de l'espace de travail peuvent remplacer
  les entrées MCP du bundle si nécessaire

#### Paramètres Pi embarqués

- Le `settings.json` de Claude est importé en tant que paramètres Pi
embarqués par défaut lorsque le bundle est activé
- OpenClaw nettoie les clés de remplacement du shell avant de les appliquer

Clés nettoyées :

- `shellPath`
- `shellCommandPrefix`

### Détecté mais non exécuté

Ces surfaces sont détectées, affichées dans les capacités du bundle et peuvent apparaître dans la sortie de diagnostic/info, mais OpenClaw ne les exécute pas encore :

- Claude `agents`
- Automatisation `hooks.json` de Claude
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- Métadonnées inline/app de Codex au-delà du rapport de capacités

## Rapport de capacités

`openclaw plugins inspect <id>` affiche les capacités du bundle à partir de l'enregistrement normalisé du bundle.

Les capacités prises en charge sont chargées silencieusement. Les capacités non prises en charge génèrent un avertissement tel que :

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

Exceptions actuelles :

- Claude `commands` est considéré comme pris en charge car il correspond aux compétences (skills)
- Claude `settings` est considéré comme pris en charge car il correspond aux paramètres Pi intégrés
- Cursor `commands` est considéré comme pris en charge car il correspond aux compétences (skills)
- Le MCP de bundle est considéré comme pris en charge car il correspond aux paramètres Pi intégrés et expose les outils stdio pris en charge au Pi intégré
- Codex `hooks` est considéré comme pris en charge uniquement pour les mises en page de hook-pack OpenClaw

## Différences de format

Les formats sont proches, mais pas identiques octet pour octet. Voici les différences pratiques qui importent dans OpenClaw.

### Codex

Marqueurs typiques :

- `.codex-plugin/plugin.json`
- optionnel `skills/`
- optionnel `hooks/`
- optionnel `.mcp.json`
- optionnel `.app.json`

Les bundles Codex correspondent le mieux à OpenClaw lorsqu'ils utilisent des racines de compétences (skill roots) et des répertoires de hook-pack de style OpenClaw.

### Claude

OpenClaw prend en charge les deux :

- bundles Claude basés sur un manifeste : `.claude-plugin/plugin.json`
- bundles Claude sans manifeste qui utilisent la disposition Claude par défaut

Marqueurs de disposition Claude par défaut que OpenClaw reconnaît :

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Notes spécifiques à Claude :

- `commands/` est traité comme du contenu de compétence
- `settings.json` est importé dans les paramètres Pi intégrés
- `.mcp.json` et le manifeste `mcpServers` peuvent exposer des outils stdio pris en charge à
  Pi intégré
- `hooks/hooks.json` est détecté, mais n'est pas exécuté comme une automation Claude

### Cursor

Marqueurs typiques :

- `.cursor-plugin/plugin.json`
- facultatif `skills/`
- facultatif `.cursor/commands/`
- facultatif `.cursor/agents/`
- facultatif `.cursor/rules/`
- facultatif `.cursor/hooks.json`
- facultatif `.mcp.json`

Remarques spécifiques à Cursor :

- `.cursor/commands/` est traité comme du contenu de compétence
- `.cursor/rules/`, `.cursor/agents/` et `.cursor/hooks.json` sont
  détection uniquement pour le moment

## Chemins personnalisés Claude

Les manifestes de bundle Claude peuvent déclarer des chemins de composants personnalisés. OpenClaw traite
ces chemins comme **additifs**, sans remplacer les valeurs par défaut.

Clés de chemin personnalisé actuellement reconnues :

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

Exemples :

- `commands/` par défaut plus le manifeste `commands: "extra-commands"` =>
  OpenClaw analyse les deux
- `skills/` par défaut plus le manifeste `skills: ["team-skills"]` =>
  OpenClaw analyse les deux

## Modèle de sécurité

La prise en charge des bundles est intentionnellement plus limitée que la prise en charge des plugins natifs.

Comportement actuel :

- la découverte de bundles lit les fichiers à l'intérieur de la racine du plugin avec des vérifications de limites
- les chemins des compétences et des hook-packs doivent rester à l'intérieur de la racine du plugin
- les fichiers de paramètres de bundle sont lus avec les mêmes vérifications de limites
- les serveurs MCP de bundle stdio pris en charge peuvent être lancés en tant que sous-processus pour
  les appels d'outils Pi intégrés
- OpenClaw ne charge pas de modules d'exécution de bundle arbitraires en cours de processus

Cela rend la prise en charge des bundles plus sûre par défaut que les modules de plugin natifs, mais vous
devriez toujours traiter les bundles tiers comme du contenu de confiance pour les fonctionnalités qu'ils
exposent.

## Exemples d'installation

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins inspect my-bundle
```

Si le répertoire est un plugin/colis natif OpenClaw, le chemin d'installation natif
l'emporte toujours.

Pour les noms du marketplace Claude, OpenClaw lit le registre local des known-marketplaces
Claude à `~/.claude/plugins/known_marketplaces.json`. Les entrées du marketplace
peuvent correspondre à des répertoires/archives compatibles avec les bundles ou à des sources de plugins natifs ;
après résolution, les règles d'installation normales s'appliquent toujours.

## Dépannage

### Le bundle est détecté mais les capacités ne s'exécutent pas

Vérifiez `openclaw plugins inspect <id>`.

Si la capacité est listée mais que OpenClaw indique qu'elle n'est pas encore câblée, il s'agit d'une
réelle limite du produit, et non d'une installation défectueuse.

### Les fichiers de commandes Claude n'apparaissent pas

Assurez-vous que le bundle est activé et que les fichiers markdown se trouvent dans une racine
`commands` détectée ou une racine `skills` détectée.

### Les paramètres Claude ne s'appliquent pas

La prise en charge actuelle est limitée aux paramètres Pi intégrés provenant de `settings.json`.
OpenClaw ne traite pas les paramètres de bundle comme des correctifs de configuration bruts OpenClaw.

### Les hooks Claude ne s'exécutent pas

`hooks/hooks.json` n'est détecté aujourd'hui.

Si vous avez besoin de hooks de bundle exécutables aujourd'hui, utilisez la disposition normale des hook-packs
OpenClaw via une racine de hook Codex prise en charge ou livrez un plugin natif OpenClaw.

import en from "/components/footer/en.mdx";

<en />
