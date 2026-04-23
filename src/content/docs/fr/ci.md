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

| Tâche                            | Objectif                                                                                                                               | Quand elle s'exécute                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`                      | Détecter les modifications de la documentation uniquement, les étendues modifiées, les extensions modifiées et générer le manifeste CI | Toujours sur les pushs et les PR non brouillons       |
| `security-scm-fast`              | Détection de clé privée et audit de workflow via `zizmor`                                                                              | Toujours sur les pushs et les PR non brouillons       |
| `security-dependency-audit`      | Audit de fichier de verrouillage de production sans dépendance contre les avis de sécurité npm                                         | Toujours sur les pushes et PRs non-brouillons         |
| `security-fast`                  | Agrégat requis pour les tâches de sécurité rapides                                                                                     | Toujours sur les pushes et PRs non-brouillons         |
| `build-artifacts`                | Construire `dist/` et l'interface utilisateur de contrôle une fois, téléverser des artefacts réutilisables pour les tâches en aval     | Modifications pertinentes pour Node                   |
| `checks-fast-core`               | Voies de correction Linux rapides telles que les vérifications bundled/plugin-contract/protocol                                        | Modifications pertinentes pour le Node                |
| `checks-fast-contracts-channels` | Vérifications de contrat channel partitionnées avec un résultat de vérification agrégé stable                                          | Modifications pertinentes pour Node                   |
| `checks-node-extensions`         | Partitions de test bundled-plugin complètes sur la suite d'extensions                                                                  | Modifications pertinentes pour Node                   |
| `checks-node-core-test`          | Partitions de test Core Node, excluant les voies channel, bundled, contract et extension                                               | Modifications pertinentes pour Node                   |
| `extension-fast`                 | Tests ciblés uniquement pour les plugins bundled modifiés                                                                              | Lorsque des modifications d'extension sont détectées  |
| `check`                          | Équivalent de passerelle locale principale partitionné : types prod, lint, gardes, types de test et strict smoke                       | Modifications pertinentes pour le Node                |
| `check-additional`               | Partitions d'architecture, de frontière, de gardes de surface d'extension, de frontière de paquet et de gateway-watch                  | Modifications pertinentes pour Node                   |
| `build-smoke`                    | Tests smoke CLI intégrés et smoke de mémoire au démarrage                                                                              | Modifications pertinentes pour Node                   |
| `checks`                         | Voies Node Linux restantes : tests channel et compatibilité Node 22 push-only                                                          | Modifications pertinentes pour Node                   |
| `check-docs`                     | Vérifications de formatage, lint et liens brisés pour la documentation                                                                 | Documentation modifiée                                |
| `skills-python`                  | Ruff + pytest pour les compétences basées sur Python                                                                                   | Modifications pertinentes pour les compétences Python |
| `checks-windows`                 | Voies de test spécifiques à Windows                                                                                                    | Modifications pertinentes pour Windows                |
| `macos-node`                     | Voie de test TypeScript macOS utilisant les artefacts construits partagés                                                              | Modifications pertinentes pour macOS                  |
| `macos-swift`                    | Lint, build et tests Swift pour l'application macOS                                                                                    | Modifications pertinentes pour macOS                  |
| `android`                        | Matrice de build et de test Android                                                                                                    | Modifications pertinentes pour Android                |

## Ordre d'échec rapide

Les tâches sont ordonnées pour que les vérifications légères échouent avant le lancement des tâches lourdes :

1. `preflight` décide des voies qui existent. La logique `docs-scope` et `changed-scope` sont des étapes à l'intérieur de cette tâche, et non des tâches autonomes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` et `skills-python` échouent rapidement sans attendre les tâches plus lourdes d'artefacts et de matrice de plateforme.
3. `build-artifacts` chevauche les voies rapides Linux afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Les voies plus lourdes de plateforme et d'exécution s'étendent ensuite : `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-extensions`, `checks-node-core-test`, `extension-fast`, `checks`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`.
Le workflow séparé `install-smoke` réutilise le même script de portée via sa propre tâche `preflight`. Il calcule `run_install_smoke` à partir du signal changed-smoke plus étroit, donc la fumée Docker/install ne s'exécute que pour les modifications liées à l'installation, au packaging et aux conteneurs.

La logique locale de changed-lane réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte locale est plus stricte quant aux limites de l'architecture que la portée large de la plateforme CI : les modifications de production de base exécutent la vérification de type de production de base plus les tests de base, les modifications de test uniquement de base n'exécutent que la vérification de type/tests de base, les modifications de production d'extension exécutent la vérification de type de production d'extension plus les tests d'extension, et les modifications de test uniquement d'extension n'exécutent que la vérification de type/tests d'extension. Les modifications du SDK public de plugins ou des plugin-contracts s'étendent à la validation des extensions car les extensions dépendent de ces contrats de base. Les modifications inconnues de racine/config échouent en toute sécurité sur toutes les voies.

Lors des poussées (pushes), la matrice `checks` ajoute la voie push-only `compat-node22`. Sur les pull requests, cette voie est ignorée et la matrice reste concentrée sur les voies normales test/channel.

Les familles de tests Node les plus lentes sont divisées en fragments (shards) de fichiers d'inclusion afin que chaque tâche reste petite : les contrats de canal divisent la couverture du registre et du cœur en huit fragments pondérés chacun, les tests de commande de réponse automatique sont divisés en quatre fragments de motifs d'inclusion, et les autres grands groupes de préfixes de réponse automatique sont divisés en deux fragments chacun. `check-additional` sépare également le travail de compilation/canary aux limites des packages du travail de topologie d'exécution passerelle/architecture.

GitHub peut marquer les tâches remplacées comme `cancelled` lorsqu'une nouvelle poussée atterrit sur la même PR ou la référence `main`. Considérez cela comme un bruit CI à moins que l'exécution la plus récente pour la même référence échoue également. Les vérifications agrégées des fragments signalent explicitement ce cas d'annulation afin qu'il soit plus facile de le distinguer d'un échec de test.

## Runners

| Runner                           | Tâches                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-scm-fast`, `security-dependency-audit`, `security-fast`, `build-artifacts`, vérifications Linux, vérifications de docs, compétences Python, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                                                                                             |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                                                                                                  |

## Équivalents locaux

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local gate: changed typecheck/lint/tests by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
