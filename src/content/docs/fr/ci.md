---
title: Pipeline CI
summary: "Graphe de tâches CI, portées des gates et équivalents de commandes locales"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# Pipeline CI

La CI s'exécute à chaque push vers `main` et chaque pull request. Elle utilise un ciblage intelligent pour ignorer les tâches coûteuses lorsque seules des zones non liées ont changé.

## Aperçu des tâches

| Tâche                    | Objectif                                                                                                                               | Quand elle s'exécute                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`              | Détecter les modifications de la documentation uniquement, les étendues modifiées, les extensions modifiées et générer le manifeste CI | Toujours sur les pushs et les PR non brouillons       |
| `security-fast`          | Détection de clé privée, audit de workflow via `zizmor`, audit des dépendances de production                                           | Toujours sur les pushs et les PR non brouillons       |
| `build-artifacts`        | Construire `dist/` et l'interface de contrôle une fois, télécharger les artefacts réutilisables pour les travaux en aval               | Modifications pertinentes pour Node                   |
| `checks-fast-core`       | Voies de correction Linux rapides telles que les vérifications bundled/plugin-contract/protocol                                        | Modifications pertinentes pour Node                   |
| `checks-node-extensions` | Shards de test complets des plugins intégrés sur toute la suite d'extensions                                                           | Modifications pertinentes pour Node                   |
| `checks-node-core-test`  | Shards de test du Node Core, à l'exclusion des voies channel, bundled, contract et extension                                           | Modifications pertinentes pour le Node                |
| `extension-fast`         | Tests ciblés uniquement pour les plugins intégrés modifiés                                                                             | Lorsque des modifications d'extension sont détectées  |
| `check`                  | Portail local principal dans la CI : `pnpm check` plus `pnpm build:strict-smoke`                                                       | Modifications pertinentes pour Node                   |
| `check-additional`       | Gardes d'architecture, de limite et de cycle d'importation, plus le harnais de régression de surveillance de la passerelle             | Modifications pertinentes pour Node                   |
| `build-smoke`            | Tests fumigatoires de la CLI compilée et tests fumigatoires de la mémoire au démarrage                                                 | Modifications pertinentes pour Node                   |
| `checks`                 | Voies Node Linux restantes : tests de channel et compatibilité Node 22 en push uniquement                                              | Modifications pertinentes pour le Node                |
| `check-docs`             | Vérifications de formatage, de lint et de liens brisés pour la documentation                                                           | Documentation modifiée                                |
| `skills-python`          | Ruff + pytest pour les compétences basées sur Python                                                                                   | Modifications pertinentes pour les compétences Python |
| `checks-windows`         | Voies de test spécifiques à Windows                                                                                                    | Modifications pertinentes pour Windows                |
| `macos-node`             | Voie de test TypeScript macOS utilisant les artefacts construits partagés                                                              | Modifications pertinentes pour macOS                  |
| `macos-swift`            | Lint, build et tests Swift pour l'application macOS                                                                                    | Modifications pertinentes pour macOS                  |
| `android`                | Matrice de build et de test Android                                                                                                    | Modifications pertinentes pour Android                |

## Ordre d'échec rapide

Les tâches sont ordonnées pour que les vérifications peu coûteuses échouent avant que les plus coûteuses ne s'exécutent :

1. `preflight` détermine quelles voies existent. La logique `docs-scope` et `changed-scope` sont des étapes à l'intérieur de cette tâche, et non des tâches autonomes.
2. `security-fast`, `check`, `check-additional`, `check-docs` et `skills-python` échouent rapidement sans attendre les tâches plus lourdes d'artefacts et de matrice de plateformes.
3. `build-artifacts` chevauche les voies Linux rapides afin que les consommateurs en aval puissent démarrer dès que le build partagé est prêt.
4. Les plateformes plus lourdes et les lanes d'exécution sont réparties après cela : `checks-fast-core`, `checks-node-extensions`, `checks-node-core-test`, `extension-fast`, `checks`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`.
Le workflow séparé `install-smoke` réutilise le même script de portée via son propre job `preflight`. Il calcule `run_install_smoke` à partir du signal changed-smoke plus étroit, donc les tests de fumée Docker/install ne s'exécutent que pour les modifications liées à l'installation, au packaging et aux conteneurs.

Sur les pushes, la matrice `checks` ajoute la lane push-only `compat-node22`. Sur les pull requests, cette lane est ignorée et la matrice reste focalisée sur les lanes de test/channel normaux.

## Runners

| Runner                           | Tâches                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-fast`, `build-artifacts`, checks Linux, checks docs, compétences Python, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                          |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                               |

## Équivalents locaux

```bash
pnpm check          # types + lint + format
pnpm build:strict-smoke
pnpm check:import-cycles
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
