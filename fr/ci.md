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

| Tâche             | Objectif                                                                        | Quand elle s'exécute                                       |
| ----------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `docs-scope`      | Détecter les modifications uniquement de documentation                          | Toujours                                                   |
| `changed-scope`   | Détecter quelles zones ont changé (node/macos/android/windows)                  | Modifications hors documentation                           |
| `check`           | Types TypeScript, lint, format                                                  | Hors documentation, modifications node                     |
| `check-docs`      | Lint Markdown + vérification des liens brisés                                   | Documentation modifiée                                     |
| `secrets`         | Détecter les secrets fuités                                                     | Toujours                                                   |
| `build-artifacts` | Construire dist une fois, partager avec `release-check`                         | Pushs vers `main`, modifications node                      |
| `release-check`   | Valider le contenu du pack npm                                                  | Pushs vers `main` après build                              |
| `checks`          | Tests Node + vérification de protocole sur les PRs ; compatibilité Bun sur push | Hors documentation, modifications node                     |
| `compat-node22`   | Compatibilité minimale du runtime Node supporté                                 | Pushs vers `main`, modifications node                      |
| `checks-windows`  | Tests spécifiques à Windows                                                     | Hors documentation, modifications pertinentes pour windows |
| `macos`           | Lint/build/test Swift + tests TS                                                | PRs avec modifications macos                               |
| `android`         | Build Gradle + tests                                                            | Hors documentation, modifications android                  |

## Ordre échec-rapide (Fail-Fast)

Les tâches sont ordonnées pour que les vérifications peu coûteuses échouent avant le lancement des coûteuses :

1. `docs-scope` + `changed-scope` + `check` + `secrets` (parallèle, gates peu coûteuses d'abord)
2. PRs : `checks` (test Node Linux divisé en 2 shards), `checks-windows`, `macos`, `android`
3. Pushs vers `main` : `build-artifacts` + `release-check` + compatibilité Bun + `compat-node22`

La logique de portée se trouve dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`.

## Runners

| Runner                           | Tâches                                                        |
| -------------------------------- | ------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | La plupart des tâches Linux, y compris la détection de portée |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                              |
| `macos-latest`                   | `macos`, `ios`                                                |

## Équivalents locaux

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import fr from "/components/footer/fr.mdx";

<fr />
