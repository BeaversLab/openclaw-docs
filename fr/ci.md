---
title: Pipeline CI
description: Fonctionnement du pipeline CI OpenClaw
summary: "Graphe des tâches CI, portes de périmètre et équivalents de commandes locales"
read_when:
  - Vous devez comprendre pourquoi une tâche CI a ou n'a pas été exécutée
  - Vous déboguez des échecs de vérifications GitHub Actions
---

# Pipeline CI

La CI s'exécute à chaque push vers `main` et à chaque pull request. Elle utilise un périmètre intelligent pour sauter les tâches coûteuses lorsque seules des zones non liées ont changé.

## Vue d'ensemble des tâches

| Tâche               | Objectif                                                 | Quand elle s'exécute                       |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| `docs-scope`      | Détecter les modifications docs-only                                | Toujours                             |
| `changed-scope`   | Détecter quelles zones ont changé (node/macos/android/windows) | Modifications non-docs                    |
| `check`           | Types TypeScript, lint, format                          | Non-docs, modifications node             |
| `check-docs`      | Lint Markdown + vérification des liens brisés                       | Docs modifiés                       |
| `secrets`         | Détecter les secrets fuités                                   | Toujours                             |
| `build-artifacts` | Construire dist une fois, partager avec `release-check`             | Pushs vers `main`, modifications node     |
| `release-check`   | Valider le contenu du pack npm                              | Pushs vers `main` après construction       |
| `checks`          | Tests Node + vérification de protocole sur les PRs ; compat Bun sur push  | Non-docs, modifications node             |
| `compat-node22`   | Compatibilité minimale prise en charge du runtime Node            | Pushs vers `main`, modifications node     |
| `checks-windows`  | Tests spécifiques à Windows                                  | Non-docs, modifications pertinentes pour windows |
| `macos`           | Lint/build/test Swift + tests TS                        | PRs avec modifications macos             |
| `android`         | Build Gradle + tests                                    | Non-docs, modifications android          |

## Ordre Fail-Fast

Les tâches sont ordonnées pour que les vérifications bon marché échouent avant que celles coûteuses ne s'exécutent :

1. `docs-scope` + `changed-scope` + `check` + `secrets` (parallèle, portes peu coûteuses d'abord)
2. PRs : `checks` (test Node Linux divisé en 2 shards), `checks-windows`, `macos`, `android`
3. Pushs vers `main` : `build-artifacts` + `release-check` + compatibilité Bun + `compat-node22`

La logique de périmètre se trouve dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`.

## Runners

| Runner                           | Jobs                                       |
| -------------------------------- | ------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | La plupart des jobs Linux, y compris la détection de portée |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                           |
| `macos-latest`                   | `macos`, `ios`                             |

## Équivalents locaux

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import en from "/components/footer/en.mdx";

<en />
