---
summary: "Validation stricte de configuration + migrations doctor uniquement"
read_when:
  - Designing or implementing config validation behavior
  - Working on config migrations or doctor workflows
  - Handling plugin config schemas or plugin load gating
title: "Validation stricte de configuration"
---

# Validation stricte de configuration (migrations doctor uniquement)

## Objectifs

- **Rejeter les clés de configuration inconnues partout** (racine + imbriquées), à l'exception de `$schema` à la racine.
- **Rejeter la configuration de plugin sans schéma** ; ne pas charger ce plugin.
- **Supprimer l'auto-migration héritée au chargement** ; les migrations ne s'exécutent que via doctor.
- **Exécuter automatiquement doctor (à blanc) au démarrage** ; si invalide, bloquer les commandes non diagnostiques.

## Non-objectifs

- Rétrocompatibilité au chargement (les clés héritées ne font pas l'objet d'une auto-migration).
- Suppressions silencieuses des clés non reconnues.

## Règles de validation stricte

- La configuration doit correspondre exactement au schéma à chaque niveau.
- Les clés inconnues sont des erreurs de validation (pas de passage à la racine ou imbriqué), sauf `$schema` à la racine lorsqu'il s'agit d'une chaîne.
- `plugins.entries.<id>.config` doit être validé par le schéma du plugin.
  - Si un plugin n'a pas de schéma, **rejeter le chargement du plugin** et afficher une erreur claire.
- Les clés `channels.<id>` inconnues sont des erreurs, sauf si un manifeste de plugin déclare l'identifiant du channel.
- Les manifestes de plugin (`openclaw.plugin.json`) sont requis pour tous les plugins.

## Application du schéma du plugin

- Chaque plugin fournit un schéma JSON strict pour sa configuration (en ligne dans le manifeste).
- Flux de chargement du plugin :
  1. Résoudre le manifeste + le schéma du plugin (`openclaw.plugin.json`).
  2. Valider la configuration par rapport au schéma.
  3. Si schéma manquant ou configuration invalide : bloquer le chargement du plugin, enregistrer l'erreur.
- Le message d'erreur inclut :
  - Identifiant du plugin
  - Raison (schéma manquant / configuration invalide)
  - Chemin(s) qui ont échoué à la validation
- Les plugins désactivés conservent leur configuration, mais Doctor + les journaux affichent un avertissement.

## Flux Doctor

- Doctor s'exécute **chaque fois** que la configuration est chargée (à blanc par défaut).
- Si la configuration est invalide :
  - Imprimer un résumé + des erreurs exploitables.
  - Instruire : `openclaw doctor --fix`.
- `openclaw doctor --fix` :
  - Applique les migrations.
  - Supprime les clés inconnues.
  - Écrit la configuration mise à jour.

## Limitation des commandes (lorsque la configuration n'est pas valide)

Autorisé (diagnostic uniquement) :

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

Tout le reste doit échouer brutalement avec : « Config invalid. Run `openclaw doctor --fix` ».

## Format de l'UX d'erreur

- En-tête de résumé unique.
- Sections groupées :
  - Clés inconnues (chemins complets)
  - Clés héritées / migrations nécessaires
  - Échecs de chargement des plugins (id plugin + raison + chemin)

## Points d'implémentation

- `src/config/zod-schema.ts` : supprimer le passage direct à la racine ; objets stricts partout.
- `src/config/zod-schema.providers.ts` : assurer des schémas de channel stricts.
- `src/config/validation.ts` : échouer sur les clés inconnues ; ne pas appliquer les migrations héritées.
- `src/config/io.ts` : supprimer les auto-migrations héritées ; toujours exécuter le doctor en mode dry-run.
- `src/config/legacy*.ts` : déplacer l'utilisation vers le doctor uniquement.
- `src/plugins/*` : ajouter un registre de schémas + limitation.
- Limitation des commandes CLI dans `src/cli`.

## Tests

- Rejet des clés inconnues (racine + imbriquées).
- Schéma de plugin manquant → chargement du plugin bloqué avec une erreur claire.
- Configuration non valide → démarrage de la passerelle bloqué, à l'exception des commandes de diagnostic.
- Doctor dry-run auto ; `doctor --fix` écrit la configuration corrigée.

import fr from "/components/footer/fr.mdx";

<fr />
