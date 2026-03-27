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

| Tâche             | Objectif                                                                                                                       | Quand elle s'exécute                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `preflight`       | Portée de la documentation, portée des modifications, analyse des clés, audit du workflow, audit des dépendances de production | Toujours ; audit basé sur node uniquement pour les modifications hors documentation |
| `docs-scope`      | Détecter les modifications uniquement dans la documentation                                                                    | Toujours                                                                            |
| `changed-scope`   | Détecter les zones modifiées (node/macos/android/windows)                                                                      | Modifications hors documentation                                                    |
| `check`           | Types TypeScript, lint, formatage                                                                                              | Hors documentation, modifications node                                              |
| `check-docs`      | Lint Markdown + vérification des liens brisés                                                                                  | Documentation modifiée                                                              |
| `secrets`         | Détecter les secrets divulgués                                                                                                 | Toujours                                                                            |
| `build-artifacts` | Construire dist une fois, partager avec `release-check`                                                                        | Pushs vers `main`, modifications node                                               |
| `release-check`   | Valider le contenu du paquet npm                                                                                               | Pushs vers `main` après construction                                                |
| `checks`          | Tests Node + vérification du protocole sur les PRs ; compatibilité Bun sur les pushs                                           | Hors documentation, modifications node                                              |
| `compat-node22`   | Compatibilité minimale avec le runtime Node pris en charge                                                                     | Pushs vers `main`, modifications node                                               |
| `checks-windows`  | Tests spécifiques à Windows                                                                                                    | Hors documentation, modifications pertinentes pour windows                          |
| `macos`           | Lint/build/test Swift + tests TS                                                                                               | PRs avec des modifications macos                                                    |
| `android`         | Build Gradle + tests                                                                                                           | Hors documentation, modifications android                                           |

## Ordre d'échec rapide

Les tâches sont ordonnées pour que les vérifications peu coûteuses échouent avant l'exécution des plus coûteuses :

1. `docs-scope` + `changed-scope` + `check` + `secrets` (parallèle, barrières peu coûteuses d'abord)
2. PRs : `checks` (test Node Linux divisé en 2 partitions), `checks-windows`, `macos`, `android`
3. Pushs vers `main` : `build-artifacts` + `release-check` + compatibilité Bun + `compat-node22`

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`.
Le même module de portée partagé pilote également le workflow séparé `install-smoke` via une porte `changed-smoke` plus étroite, donc les tests de fumée Docker/install ne s'exécutent que pour les modifications liées à l'installation, au packaging et aux conteneurs.

## Runners

| Runner                           | Jobs                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | La plupart des jobs Linux, y compris la détection de portée |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                            |
| `macos-latest`                   | `macos`, `ios`                                              |

## Équivalents locaux

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import fr from "/components/footer/fr.mdx";

<fr />
