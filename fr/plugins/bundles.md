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

OpenClaw les affiche tous comme `Format: bundle` dans `openclaw plugins list`.
La sortie détaillée et `openclaw plugins info <id>` affichent également le sous-type
(`codex`, `claude` ou `cursor`).

Connexe :

- Aperçu du système de plugins : [Plugins](/fr/tools/plugin)
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

#### MCP pour les backends CLI

- les bundles activés peuvent contribuer à la configuration du serveur MCP
- le câblage d'exécution actuel est utilisé par le backend `claude-cli`
- OpenClaw fusionne la configuration MCP du bundle dans le fichier `--mcp-config` du backend

#### Paramètres Pi intégrés

- Le `settings.json` de Claude est importé comme paramètres Pi intégrés par défaut lorsque le
  bundle est activé
- OpenClaw nettoie les clés de remplacement du shell avant de les appliquer

Clés nettoyées :

- `shellPath`
- `shellCommandPrefix`

### Détecté mais non exécuté

Ces surfaces sont détectées, affichées dans les capacités du bundle, et peuvent apparaître dans
la sortie de diagnostic/info, mais OpenClaw ne les exécute pas encore :

- Claude `agents`
- Automatisation Claude `hooks.json`
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- Cursor `mcpServers` en dehors des chemins d'exécution mappés actuels
- Métadonnées en ligne/application Codex au-delà du rapport de capacités

## Rapport de capacités

`openclaw plugins info <id>` affiche les capacités du bundle à partir de l'enregistrement de bundle normalisé.

Les capacités prises en charge sont chargées silencieusement. Les capacités non prises en charge produisent un avertissement tel que :

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

Exceptions actuelles :

- Claude `commands` est considéré comme pris en charge car il correspond à des compétences (skills)
- Claude `settings` est considéré comme pris en charge car il correspond aux paramètres Pi intégrés
- Cursor `commands` est considéré comme pris en charge car il correspond à des compétences (skills)
- le bundle MCP est considéré comme pris en charge là où OpenClaw l'importe réellement
- Codex `hooks` est considéré comme pris en charge uniquement pour les mises en page de hook-pack OpenClaw

## Différences de format

Les formats sont proches, mais pas identiques octet pour octet. Voici les différences pratiques qui comptent dans OpenClaw.

### Codex

Marqueurs typiques :

- `.codex-plugin/plugin.json`
- facultatif `skills/`
- facultatif `hooks/`
- facultatif `.mcp.json`
- facultatif `.app.json`

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

- `commands/` est traité comme du contenu de compétence (skill)
- `settings.json` est importé dans les paramètres Pi intégrés
- `hooks/hooks.json` est détecté, mais non exécuté en tant qu'automatisation Claude

### Cursor

Marqueurs typiques :

- `.cursor-plugin/plugin.json`
- facultatif `skills/`
- facultatif `.cursor/commands/`
- facultatif `.cursor/agents/`
- optionnel `.cursor/rules/`
- optionnel `.cursor/hooks.json`
- optionnel `.mcp.json`

Notes spécifiques à Cursor :

- `.cursor/commands/` est traité comme du contenu de compétence
- `.cursor/rules/`, `.cursor/agents/` et `.cursor/hooks.json` ne sont
  détectés que pour l'instant

## Chemins personnalisés Claude

Les manifestes de bundle Claude peuvent déclarer des chemins de composants personnalisés. OpenClaw considère
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

- `commands/` par défaut plus manifeste `commands: "extra-commands"` =>
  OpenClaw scanne les deux
- `skills/` par défaut plus manifeste `skills: ["team-skills"]` =>
  OpenClaw scanne les deux

## Modèle de sécurité

La prise en charge des bundles est intentionnellement plus restreinte que celle des plugins natifs.

Comportement actuel :

- la découverte de bundles lit les fichiers à l'intérieur de la racine du plugin avec des vérifications de limites
- les chemins des compétences et des packs de hooks doivent rester à l'intérieur de la racine du plugin
- les fichiers de paramètres de bundle sont lus avec les mêmes vérifications de limites
- OpenClaw n'exécute pas de code d'exécution de bundle arbitraire dans le processus

Cela rend la prise en charge des bundles plus sûre par défaut que les modules de plugin natifs, mais vous
devriez toujours traiter les bundles tiers comme du contenu de confiance pour les fonctionnalités qu'ils
exposent.

## Exemples d'installation

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins info my-bundle
```

Si le répertoire est un plugin/colis OpenClaw natif, le chemin d'installation natif
l'emporte toujours.

## Dépannage

### Le bundle est détecté mais les capacités ne s'exécutent pas

Vérifiez `openclaw plugins info <id>`.

Si la capacité est répertoriée mais que OpenClaw indique qu'elle n'est pas encore connectée, c'est une
limite réelle du produit, et non une installation défectueuse.

### Les fichiers de commande Claude n'apparaissent pas

Assurez-vous que le bundle est activé et que les fichiers markdown se trouvent dans une racine
`commands` détectée ou une racine `skills` détectée.

### Les paramètres Claude ne s'appliquent pas

La prise en charge actuelle est limitée aux paramètres Pi intégrés provenant de `settings.json`.
OpenClaw ne traite pas les paramètres de bundle comme des correctifs de configuration OpenClaw bruts.

### Les hooks Claude ne s'exécutent pas

`hooks/hooks.json` n'est détélécté qu'aujourd'hui.

Si vous avez besoin de hooks de bundle exécutables aujourd'hui, utilisez la disposition normale des hook-packs OpenClaw via une racine de hook Codex prise en charge ou livrez un plugin natif OpenClaw.

import fr from "/components/footer/fr.mdx";

<fr />
