---
title: CI Pipeline
summary: "Gráfico de trabajos de CI, puertas de alcance y equivalentes de comandos locales"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# Canalización de CI

La CI se ejecuta en cada push a `main` y en cada pull request. Utiliza un alcance inteligente para omitir trabajos costosos cuando solo cambiaron áreas no relacionadas.

## Resumen de trabajos

| Trabajo           | Propósito                                                                                                                          | Cuándo se ejecuta                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `preflight`       | Ámbito de documentos, ámbito de cambios, escaneo de claves, auditoría de flujo de trabajo, auditoría de dependencias de producción | Siempre; auditoría basada en node solo en cambios que no son de documentación |
| `docs-scope`      | Detectar cambios solo en la documentación                                                                                          | Siempre                                                                       |
| `changed-scope`   | Detectar qué áreas cambiaron (node/macos/android/windows)                                                                          | Cambios que no son de documentación                                           |
| `check`           | Tipos de TypeScript, lint, formato                                                                                                 | Sin documentación, cambios de node                                            |
| `check-docs`      | Lint de Markdown + verificación de enlaces rotos                                                                                   | Documentación cambiada                                                        |
| `secrets`         | Detectar secretos filtrados                                                                                                        | Siempre                                                                       |
| `build-artifacts` | Construir dist una vez, compartir con `release-check`                                                                              | Envíos a `main`, cambios de node                                              |
| `release-check`   | Validar el contenido del paquete npm                                                                                               | Envíos a `main` después de la compilación                                     |
| `checks`          | Pruebas de Node + verificación de protocolo en PRs; compatibilidad con Bun en envíos                                               | Sin documentación, cambios de node                                            |
| `compat-node22`   | Compatibilidad mínima con el tiempo de ejecución de Node admitido                                                                  | Envíos a `main`, cambios de node                                              |
| `checks-windows`  | Pruebas específicas de Windows                                                                                                     | Sin documentación, cambios relevantes para Windows                            |
| `macos`           | Lint/construcción/pruebas de Swift + pruebas de TS                                                                                 | PRs con cambios de macos                                                      |
| `android`         | Compilación de Gradle + pruebas                                                                                                    | Sin documentación, cambios de android                                         |

## Orden de falla rápida

Los trabajos están ordenados para que las verificaciones económicas fallen antes de que se ejecuten las costosas:

1. `docs-scope` + `changed-scope` + `check` + `secrets` (paralelo, puertas económicas primero)
2. PRs: `checks` (prueba de Linux Node dividida en 2 fragmentos), `checks-windows`, `macos`, `android`
3. Envíos a `main`: `build-artifacts` + `release-check` + compatibilidad con Bun + `compat-node22`

La lógica del ámbito vive en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`.
El mismo módulo de ámbito compartido también impulsa el flujo de trabajo separado `install-smoke` a través de un filtro `changed-smoke` más estricto, por lo que las pruebas de humeo de Docker/instalación solo se ejecutan para cambios relevantes de instalación, empaquetado y contenedores.

## Runners

| Runner                           | Trabajos                                                              |
| -------------------------------- | --------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | La mayoría de los trabajos de Linux, incluida la detección del ámbito |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                      |
| `macos-latest`                   | `macos`, `ios`                                                        |

## Equivalentes locales

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import es from "/components/footer/es.mdx";

<es />
