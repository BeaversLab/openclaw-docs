---
title: Canal CI
description: Cómo funciona el canal CI de OpenClaw
summary: "Gráfico de trabajos CI, puertas de alcance y equivalentes de comandos locales"
read_when:
  - Necesitas entender por qué un trabajo CI se ejecutó o no
  - Estás depurando comprobaciones fallidas de GitHub Actions
---

# CI Pipeline

La CI se ejecuta en cada push a `main` y en cada pull request. Utiliza un alcance inteligente para omitir trabajos costosos cuando solo cambiaron áreas no relacionadas.

## Resumen de trabajos

| Trabajo               | Propósito                                                 | Cuándo se ejecuta                       |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| `docs-scope`      | Detectar cambios solo en documentación                                | Siempre                             |
| `changed-scope`   | Detectar qué áreas cambiaron (nodo/macos/android/windows) | Cambios que no son de documentación                    |
| `check`           | Tipos de TypeScript, lint, formato                          | Cambios que no son de documentación, cambios de nodo             |
| `check-docs`      | Lint de Markdown + verificación de enlaces rotos                       | Cambios en documentación                       |
| `secrets`         | Detectar secretos filtrados                                   | Siempre                             |
| `build-artifacts` | Construir dist una vez, compartir con `release-check`             | Pushes a `main`, cambios de node     |
| `release-check`   | Validar contenidos del npm pack                              | Pushes a `main` después de la construcción       |
| `checks`          | Pruebas de Node + verificación de protocolo en PRs; compatibilidad Bun en push  | Cambios que no son de documentación, cambios de nodo             |
| `compat-node22`   | Compatibilidad mínima con el tiempo de ejecución de Node compatible            | Pushes a `main`, cambios de node     |
| `checks-windows`  | Pruebas específicas de Windows                                  | Cambios que no son de documentación, cambios relevantes para Windows |
| `macos`           | Lint/build/test de Swift + pruebas de TS                        | PRs con cambios de macos             |
| `android`         | Construcción Gradle + pruebas                                    | Cambios que no son de documentación, cambios de android          |

## Orden de fallo rápido

Los trabajos están ordenados para que las comprobaciones baratas fallen antes de que se ejecuten las costosas:

1. `docs-scope` + `changed-scope` + `check` + `secrets` (paralelo, puertas baratas primero)
2. PRs: `checks` (prueba de Linux Node dividida en 2 fragmentos), `checks-windows`, `macos`, `android`
3. Pushes a `main`: `build-artifacts` + `release-check` + compatibilidad con Bun + `compat-node22`

La lógica de alcance vive en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`.

## Runners

| Runner                           | Trabajos                                       |
| -------------------------------- | ------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | La mayoría de los trabajos de Linux, incluida la detección de alcance |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                           |
| `macos-latest`                   | `macos`, `ios`                             |

## Equivalentes locales

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import en from "/components/footer/en.mdx";

<en />
