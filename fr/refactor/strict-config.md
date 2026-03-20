---
summary: "Validation stricte de la configuration + migrations exclusives au doctor"
read_when:
  - Concevoir ou implémenter le comportement de validation de la configuration
  - Travailler sur les migrations de configuration ou les flux de travail du doctor
  - Gestion des schémas de configuration des plugins ou du blocage du chargement des plugins
title: "Validation stricte de la configuration"
---

# Validation stricte de la configuration (migrations exclusives au doctor)

## Objectifs

- **Rejeter les clés de configuration inconnues partout** (racine + imbriquées), à l'exception des métadonnées `$schema` à la racine.
- **Rejeter la configuration du plugin sans schéma** ; ne pas charger ce plugin.
- **Supprimer l'auto-migration héritée au chargement** ; les migrations s'exécutent uniquement via doctor.
- **Exécuter automatiquement le doctor (dry-run) au démarrage** ; si invalide, bloquer les commandes non diagnostiques.

## Hors objectifs

- Compatibilité ascendante au chargement (les clés héritées ne subissent pas d'auto-migration).
- Suppressions silencieuses des clés non reconnues.

## Règles de validation stricte

- La configuration doit correspondre exactement au schéma à chaque niveau.
- Les clés inconnues sont des erreurs de validation (pas de passage à la racine ou imbriqué), sauf pour `$schema` à la racine lorsqu'il s'agit d'une chaîne.
- `plugins.entries.<id>.config` doit être validé par le schéma du plugin.
  - Si un plugin n'a pas de schéma, **rejeter le chargement du plugin** et afficher une erreur claire.
- Les clés inconnues `channels.<id>` sont des erreurs, sauf si un manifeste de plugin déclare l'identifiant de channel.
- Les manifestes de plugin (`openclaw.plugin.json`) sont requis pour tous les plugins.

## Application du schéma de plugin

- Chaque plugin fournit un schéma JSON strict pour sa configuration (en ligne dans le manifeste).
- Flux de chargement du plugin :
  1. Résoudre le manifeste du plugin + le schéma (`openclaw.plugin.json`).
  2. Valider la configuration par rapport au schéma.
  3. Si le schéma est manquant ou la configuration invalide : bloquer le chargement du plugin, enregistrer l'erreur.
- Le message d'erreur inclut :
  - Identifiant du plugin
  - Raison (schéma manquant / configuration invalide)
  - Chemin(s) ayant échoué à la validation
- Les plugins désactivés conservent leur configuration, mais Doctor + les journaux affichent un avertissement.

## Flux Doctor

- Doctor s'exécute **à chaque fois** que la configuration est chargée (dry-run par défaut).
- Si la configuration est invalide :
  - Afficher un résumé + des erreurs exploitables.
  - Instruction : `openclaw doctor --fix`.
- `openclaw doctor --fix` :
  - Applique les migrations.
  - Supprime les clés inconnues.
  - Écrit la configuration mise à jour.

## Blocage des commandes (lorsque la configuration est invalide)

Autorisées (diagnostic uniquement) :

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

Tout le reste doit échouer de manière définitive avec : « Config invalide. Exécutez `openclaw doctor --fix`. »

## Format de l'UX d'erreur

- En-tête de résumé unique.
- Sections groupées :
  - Clés inconnues (chemins complets)
  - Clés héritées / migrations nécessaires
  - Échecs de chargement de plugin (id plugin + raison + chemin)

## Points d'implémentation

- `src/config/zod-schema.ts` : supprimer le contournement racine ; objets stricts partout.
- `src/config/zod-schema.providers.ts` : assurer des schémas de channel stricts.
- `src/config/validation.ts` : échouer sur les clés inconnues ; ne pas appliquer les migrations héritées.
- `src/config/io.ts` : supprimer les auto-migrations héritées ; toujours exécuter le doctor en mode dry-run.
- `src/config/legacy*.ts` : déplacer l'utilisation vers le doctor uniquement.
- `src/plugins/*` : ajouter un registre de schémas + un contrôle d'accès.
- Contrôle d'accès des commandes CLI dans `src/cli`.

## Tests

- Rejet des clés inconnues (racine + imbriquées).
- Schéma de plugin manquant → chargement du plugin bloqué avec une erreur claire.
- Config invalide → démarrage de la passerelle bloqué sauf pour les commandes de diagnostic.
- Doctor dry-run auto ; `doctor --fix` écrit la config corrigée.

import fr from "/components/footer/fr.mdx";

<fr />
