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
| `checks-fast-extensions` | Agréger les voies des shards d'extension une fois `checks-fast-extensions-shard` terminé                                               | Modifications pertinentes pour Node                   |
| `extension-fast`         | Tests ciblés uniquement pour les plugins groupés modifiés                                                                              | Lorsque des modifications d'extension sont détectées  |
| `check`                  | Portail local principal dans CI : `pnpm check` plus `pnpm build:strict-smoke`                                                          | Modifications pertinentes pour Node                   |
| `check-additional`       | Gardes d'architecture et de limites plus le harnais de régression de surveillance de la passerelle                                     | Modifications pertinentes pour Node                   |
| `build-smoke`            | Tests de fumée de CLI intégrée et test de fumée de la mémoire de démarrage                                                             | Modifications pertinentes pour Node                   |
| `checks`                 | Voies Node Linux plus lourdes : tests complets, tests de channel et compatibilité Node 22 uniquement sur push                          | Modifications pertinentes pour Node                   |
| `check-docs`             | Vérifications de formatage, de lint et de liens brisés de la documentation                                                             | Documentation modifiée                                |
| `skills-python`          | Ruff + pytest pour les compétences basées sur Python                                                                                   | Modifications pertinentes pour les compétences Python |
| `checks-windows`         | Voies de test spécifiques à Windows                                                                                                    | Modifications pertinentes pour Windows                |
| `macos-node`             | Voie de test TypeScript macOS utilisant les artefacts construits partagés                                                              | Modifications pertinentes pour macOS                  |
| `macos-swift`            | Lint, build et tests Swift pour l'application macOS                                                                                    | Modifications pertinentes pour macOS                  |
| `android`                | Matrice de build et de test Android                                                                                                    | Modifications pertinentes pour Android                |

## Ordre d'échec rapide

Les tâches sont ordonnées de sorte que les vérifications bon marché échouent avant que celles qui sont coûteuses ne s'exécutent :

1. `preflight` détermine quelles voies existent du tout. La logique `docs-scope` et `changed-scope` sont des étapes à l'intérieur de ce travail, pas des travaux autonomes.
2. `security-fast`, `check`, `check-additional`, `check-docs` et `skills-python` échouent rapidement sans attendre les travaux plus lourds d'artefacts et de matrice de plateformes.
3. `build-artifacts` chevauche les voies rapides Linux afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Les voies plus lourdes de plateforme et d'exécution se déploient ensuite : `checks-fast-core`, `checks-fast-extensions`, `extension-fast`, `checks`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`.
Le workflow séparé `install-smoke` réutilise le même script de portée via son propre travail `preflight`. Il calcule `run_install_smoke` à partir du signal changed-smoke plus étroit, de sorte que la fumée Docker/install ne s'exécute que pour les modifications liées à l'installation, à l'empaquetage et aux conteneurs.

Sur les poussées (pushes), la matrice `checks` ajoute la voie `compat-node22` push-only. Sur les demandes de tirage (pull requests), cette voie est ignorée et la matrice reste concentrée sur les voies de test/channel normales.

## Runners

| Runner                           | Travaux                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-fast`, `build-artifacts`, vérifications Linux, vérifications docs, compétences Python, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                                        |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                                             |

## Équivalents locaux

```bash
pnpm check          # types + lint + format
pnpm build:strict-smoke
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
