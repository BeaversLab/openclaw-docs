---
summary: "Guide de format de bundle unifié pour les bundles Codex, Claude et Cursor dans OpenClaw"
read_when:
  - You want to install or debug a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are documenting bundle compatibility or current support limits
title: "Plugins de bundle"
---

# Plugins de bundle

OpenClaw prend en charge une classe partagée de packages de plugins externes : les **plugins de bundle**.

Aujourd'hui, cela signifie trois écosystèmes étroitement liés :

- Bundles Codex
- Bundles Claude
- Bundles Cursor

OpenClaw affiche tous ces éléments sous la forme `Format: bundle` dans `openclaw plugins list`.
La sortie détaillée et `openclaw plugins inspect <id>` indiquent également le sous-type
(`codex`, `claude` ou `cursor`).

Connexe :

- Vue d'ensemble du système de plugins : [Plugins](/fr/tools/plugin)
- Flux d'installation/liste CLI : [plugins](/fr/cli/plugins)
- Schéma de manifeste natif : [Plugin manifest](/fr/plugins/manifest)

## Qu'est-ce qu'un bundle

Un bundle est un **pack de contenu/métadonnées**, et non un plugin natif OpenClaw en processus.

Aujourd'hui, OpenClaw n'exécute **pas** le code d'exécution du bundle en processus. Au lieu de cela,
il détecte les fichiers de bundle connus, lit les métadonnées et mappe le contenu de bundle
pris en charge vers les surfaces natives OpenClaw telles que les compétences, les packs de hooks, la configuration MCP
et les paramètres Pi intégrés.

C'est la principale limite de confiance :

- plugin natif OpenClaw : le module d'exécution s'exécute en processus
- bundle : pack de métadonnées/contenu, avec un mappage sélectif des fonctionnalités

## Modèle de bundle partagé

Les bundles Codex, Claude et Cursor sont suffisamment similaires pour qu'OpenClaw les traite
comme un modèle normalisé unique.

Idée commune :

- un petit fichier manifeste, ou une structure de répertoire par défaut
- une ou plusieurs racines de contenu telles que `skills/` ou `commands/`
- métadonnées optionnelles d'outil/d'exécution telles que MCP, hooks, agents ou LSP
- installer en tant que répertoire ou archive, puis activer dans la liste normale des plugins

Comportement commun OpenClaw :

- détecter le sous-type de bundle
- le normaliser en un enregistrement de bundle interne unique
- mapper les parties prises en charge vers les fonctionnalités natives OpenClaw
- signaler les parties non prises en charge comme des capacités détectées mais non connectées

En pratique, la plupart des utilisateurs n'ont pas besoin de penser d'abord au format
spécifique au fournisseur. La question la plus utile est : quelles surfaces de bundle OpenClaw mappe-t-il
aujourd'hui ?

## Ordre de détection

OpenClaw préfère les dispositions de plugiciels/colis natifs OpenClaw avant le traitement des bundles.

Effet pratique :

- `openclaw.plugin.json` l'emporte sur la détection de bundle
- les installations de colis avec un `package.json` valide + `openclaw.extensions` utilisent le
  chemin d'installation natif
- si un répertoire contient à la fois des métadonnées natives et de bundle, OpenClaw le traite
  d'abord comme natif

Cela évite d'installer partiellement un colis double format en tant que bundle puis
de le charger plus tard en tant que plugiciel natif.

## Ce qui fonctionne aujourd'hui

OpenClaw normalise les métadonnées de bundle en un enregistrement de bundle interne, puis mappe
les surfaces prises en charge vers le comportement natif existant.

### Pris en charge actuellement

#### Contenu des compétences (Skill content)

- les racines de compétences de bundle se chargent comme des racines de compétences normales OpenClaw
- les racines `commands` Claude sont traitées comme des racines de compétences supplémentaires
- les racines `.cursor/commands` Cursor sont traitées comme des racines de compétences supplémentaires

Cela signifie que les fichiers de commandes markdown de Claude fonctionnent via le chargeur de compétences normal OpenClaw.
Le markdown de commandes Cursor fonctionne via le même chemin.

#### Packs de crochets (Hook packs)

- les racines de crochets de bundle ne fonctionnent **que** lorsqu'elles utilisent la disposition normale de pack de crochets OpenClaw.
  Actuellement, c'est principalement le cas compatible Codex :
  - `HOOK.md`
  - `handler.ts` ou `handler.js`

#### MCP pour Pi

- les bundles activés peuvent contribuer à la configuration du serveur MCP
- OpenClaw fusionne la configuration MCP du bundle dans les paramètres Pi intégrés effectifs en tant que
  `mcpServers`
- OpenClaw expose également les outils MCP de bundle pris en charge pendant les tours de l'agent Pi intégré
  en lançant les serveurs MCP stdio pris en charge en tant que sous-processus
- les paramètres Pi locaux au projet s'appliquent toujours après les valeurs par défaut du bundle, donc les paramètres
  de l'espace de travail peuvent remplacer les entrées MCP du bundle si nécessaire

#### Paramètres Pi intégrés

- Le `settings.json` de Claude est importé en tant que paramètres Pi intégrés par défaut lorsque le
  bundle est activé
- OpenClaw nettoie les clés de substitution de shell avant de les appliquer

Clés nettoyées :

- `shellPath`
- `shellCommandPrefix`

### Détecté mais non exécuté

Ces surfaces sont détectées, affichées dans les capacités du bundle et peuvent apparaître dans
la sortie de diagnostic/d'informations, mais OpenClaw ne les exécute pas encore :

- `agents` de Claude
- Automatisation `hooks.json` de Claude
- `lspServers` de Claude
- `outputStyles` de Claude
- `.cursor/agents` de Cursor
- `.cursor/hooks.json` de Cursor
- `.cursor/rules` de Cursor
- Métadonnées en ligne/application Codex au-delà du rapport de capacités

## Rapport de capacités

`openclaw plugins inspect <id>` affiche les capacités du bundle à partir de l'enregistrement
normalisé du bundle.

Les capacités prises en charge sont chargées silencieusement. Les capacités non prises en charge produisent un avertissement tel que :

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

Exceptions actuelles :

- Le `commands` de Claude est considéré comme pris en charge car il correspond à des compétences
- Le `settings` de Claude est considéré comme pris en charge car il correspond aux paramètres Pi intégrés
- Le `commands` de Cursor est considéré comme pris en charge car il correspond à des compétences
- le MCP du bundle est considéré comme pris en charge car il correspond aux paramètres Pi intégrés
  et expose les outils stdio pris en charge à Pi
- Le `hooks` de Codex est considéré comme pris en charge uniquement pour les configurations de hook-pack OpenClaw

## Différences de format

Les formats sont proches, mais pas identiques octet pour octet. Voici les différences pratiques qui comptent dans OpenClaw.

### Codex

Marqueurs typiques :

- `.codex-plugin/plugin.json`
- optionnel `skills/`
- optionnel `hooks/`
- optionnel `.mcp.json`
- optionnel `.app.json`

Les bundles Codex conviennent le mieux à OpenClaw lorsqu'ils utilisent des racines de compétences (skills) et des répertoires de hook-pack de style OpenClaw.

### Claude

OpenClaw prend en charge les deux :

- bundles Claude basés sur un manifeste : `.claude-plugin/plugin.json`
- bundles Claude sans manifeste qui utilisent la disposition Claude par défaut

Marqueurs de disposition Claude par défaut reconnus par OpenClaw :

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Notes spécifiques à Claude :

- `commands/` est traité comme un contenu de compétence
- `settings.json` est importé dans les paramètres Pi intégrés
- `.mcp.json` et le manifeste `mcpServers` peuvent exposer des outils stdio pris en charge à
  Pi intégré
- `hooks/hooks.json` est détecté, mais n'est pas exécuté en tant qu'automatisation Claude

### Cursor

Marqueurs typiques :

- `.cursor-plugin/plugin.json`
- `skills/` en option
- `.cursor/commands/` en option
- `.cursor/agents/` en option
- `.cursor/rules/` en option
- `.cursor/hooks.json` en option
- `.mcp.json` en option

Notes spécifiques à Cursor :

- `.cursor/commands/` est traité comme un contenu de compétence
- `.cursor/rules/`, `.cursor/agents/` et `.cursor/hooks.json` sont
  uniquement détectés pour le moment

## Chemins personnalisés Claude

Les manifestes de bundles Claude peuvent déclarer des chemins de composants personnalisés. OpenClaw traite
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
  OpenClaw scanne les deux
- `skills/` par défaut plus le manifeste `skills: ["team-skills"]` =>
  OpenClaw scanne les deux

## Modèle de sécurité

La prise en charge des bundles est intentionnellement plus limitée que celle des plugins natifs.

Comportement actuel :

- la découverte de bundles lit les fichiers dans la racine du plugin avec des vérifications de limites
- les chemins des compétences et des packs de hooks doivent rester dans la racine du plugin
- les fichiers de paramètres de bundle sont lus avec les mêmes vérifications de limites
- les serveurs MCP de bundle stdio pris en charge peuvent être lancés en tant que sous-processus pour
  les appels d'outil Pi intégrés
- OpenClaw ne charge pas de modules d'exécution de bundle arbitraires en processus

Cela rend la prise en charge des bundles plus sûre par défaut que les modules de plugins natifs, mais vous
devriez toujours traiter les bundles tiers comme un contenu de confiance pour les fonctionnalités qu'ils
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

Pour les noms du marketplace Claude, OpenClaw lit le registre local known-marketplace
de Claude à `~/.claude/plugins/known_marketplaces.json`. Les entrées du marketplace
peuvent être résolues en répertoires/archives compatibles avec les bundles ou en sources de plugins
natifs ; après résolution, les règles d'installation normales s'appliquent toujours.

## Dépannage

### Le bundle est détecté mais les capacités ne s'exécutent pas

Vérifiez `openclaw plugins inspect <id>`.

Si la capacité est répertoriée mais que OpenClaw indique qu'elle n'est pas encore connectée, c'est une
limite réelle du produit, et non une installation défectueuse.

### Les fichiers de commande Claude n'apparaissent pas

Assurez-vous que le bundle est activé et que les fichiers markdown se trouvent dans une racine
`commands` détectée ou une racine `skills` détectée.

### Les paramètres Claude ne s'appliquent pas

La prise en charge actuelle est limitée aux paramètres Pi intégrés de `settings.json`.
OpenClaw ne traite pas les paramètres de bundle comme des correctifs de configuration OpenClaw bruts.

### Les hooks Claude ne s'exécutent pas

`hooks/hooks.json` n'est détecté qu'aujourd'hui.

Si vous avez besoin de hooks de bundle exécutables aujourd'hui, utilisez la disposition normale de pack de hooks OpenClaw
via une racine de hook Codex prise en charge ou livrez un plugin natif OpenClaw.

import fr from "/components/footer/fr.mdx";

<fr />
