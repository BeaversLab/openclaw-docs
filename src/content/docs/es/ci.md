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

| Trabajo                  | Propósito                                                                                                                      | Cuándo se ejecuta                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `preflight`              | Detectar cambios solo en docs, alcances cambiados, extensiones cambiadas y construir el manifiesto de CI                       | Siempre en pushes y PRs que no sean borradores |
| `security-fast`          | Detección de claves privadas, auditoría de flujos de trabajo mediante `zizmor`, auditoría de dependencias de producción        | Siempre en pushes y PRs que no sean borradores |
| `build-artifacts`        | Construir `dist/` y la UI de Control una vez, cargar artefactos reutilizables para trabajos posteriores                        | Cambios relevantes de Node                     |
| `checks-fast-core`       | Carriles rápidos de corrección de Linux como verificaciones de bundled/plugin-contract/protocol                                | Cambios relevantes de Node                     |
| `checks-node-extensions` | Fracciones completas de pruebas de bundled-plugin en todo el conjunto de extensiones                                           | Cambios relevantes de Node                     |
| `checks-node-core-test`  | Fracciones de pruebas de Core Node, excluyendo los carriles de channel, bundled, contract y extension                          | Cambios relevantes para Node                   |
| `extension-fast`         | Pruebas centradas solo en los bundled plugins modificados                                                                      | Cuando se detectan cambios en las extensiones  |
| `check`                  | Puerta de enlace local principal en CI: `pnpm check` más `pnpm build:strict-smoke`                                             | Cambios relevantes para Node                   |
| `check-additional`       | Guardias de arquitectura, límites y ciclos de importación, además del arnés de regresión de observación de la puerta de enlace | Cambios relevantes para Node                   |
| `build-smoke`            | Pruebas de humo de CLI compilada y humo de memoria de inicio                                                                   | Cambios relevantes para Node                   |
| `checks`                 | Carriles restantes de Node en Linux: pruebas de canal y compatibilidad solo con push de Node 22                                | Cambios relevantes para Node                   |
| `check-docs`             | Formato, lint y comprobaciones de enlaces rotos de los documentos                                                              | Documentos modificados                         |
| `skills-python`          | Ruff + pytest para habilidades con soporte de Python                                                                           | Cambios relevantes para habilidades de Python  |
| `checks-windows`         | Carriles de pruebas específicos de Windows                                                                                     | Cambios relevantes para Windows                |
| `macos-node`             | Carril de pruebas de TypeScript en macOS utilizando los artefactos compilados compartidos                                      | Cambios relevantes para macOS                  |
| `macos-swift`            | Lint, compilación y pruebas de Swift para la aplicación macOS                                                                  | Cambios relevantes para macOS                  |
| `android`                | Matriz de compilación y pruebas de Android                                                                                     | Cambios relevantes para Android                |

## Orden de fallo rápido

Los trabajos se ordenan para que las comprobaciones económicas fallen antes de que se ejecuten las costosas:

1. `preflight` decide qué carriles existen en absoluto. La lógica de `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-fast`, `check`, `check-additional`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de artefactos y matrices de plataformas.
3. `build-artifacts` se superpone con los carriles rápidos de Linux para que los consumidores descendentes puedan comenzar tan pronto como la compilación compartida esté lista.
4. Después, se ramifican las canalizaciones más pesadas de plataforma y tiempo de ejecución: `checks-fast-core`, `checks-node-extensions`, `checks-node-core-test`, `extension-fast`, `checks`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

La lógica de ámbito reside en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`.
El flujo de trabajo separado `install-smoke` reutiliza el mismo script de ámbito a través de su propio trabajo `preflight`. Calcula `run_install_smoke` a partir de la señal más estrecha de changed-smoke, por lo que las pruebas de humo de Docker/instalación solo se ejecutan para cambios relevantes de instalación, empaquetado y contenedores.

En los envíos (pushes), la matriz `checks` añade la canalización `compat-node22` solo para envíos. En las solicitudes de extracción (pull requests), esa canalización se omite y la matriz se mantiene centrada en las canalizaciones normales de prueba/canal.

## Ejecutores

| Ejecutor                         | Trabajos                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-fast`, `build-artifacts`, comprobaciones de Linux, comprobaciones de documentación, habilidades de Python, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                                                            |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                                                                 |

## Equivalentes locales

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
