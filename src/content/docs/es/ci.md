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

| Trabajo                  | Propósito                                                                                                                | Cuándo se ejecuta                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `preflight`              | Detectar cambios solo en docs, alcances cambiados, extensiones cambiadas y construir el manifiesto de CI                 | Siempre en pushes y PRs que no sean borradores |
| `security-fast`          | Detección de claves privadas, auditoría de flujos de trabajo mediante `zizmor`, auditoría de dependencias de producción  | Siempre en pushes y PRs que no sean borradores |
| `build-artifacts`        | Construir `dist/` y la UI de Control una vez, cargar artefactos reutilizables para trabajos posteriores                  | Cambios relevantes de Node                     |
| `checks-fast-core`       | Carriles rápidos de corrección de Linux como verificaciones de bundled/plugin-contract/protocol                          | Cambios relevantes de Node                     |
| `checks-fast-extensions` | Agrupar los carriles de fragmentos de extensiones después de que `checks-fast-extensions-shard` se complete              | Cambios relevantes de Node                     |
| `extension-fast`         | Pruebas enfocadas solo para los plugins empaquetados cambiados                                                           | Cuando se detectan cambios en las extensiones  |
| `check`                  | Puerta de enlace local principal en CI: `pnpm check` más `pnpm build:strict-smoke`                                       | Cambios relevantes para Node                   |
| `check-additional`       | Arquitectura y protectores de límites más el arnés de regresión de observación de la puerta de enlace                    | Cambios relevantes para Node                   |
| `build-smoke`            | Pruebas de humo de CLI integrada y humo de memoria de inicio                                                             | Cambios relevantes para Node                   |
| `checks`                 | Carriles de Node de Linux más pesados: pruebas completas, pruebas de canal y compatibilidad con Node 22 solo para envíos | Cambios relevantes para Node                   |
| `check-docs`             | Formato de documentos, lint y comprobaciones de enlaces rotos                                                            | Documentos modificados                         |
| `skills-python`          | Ruff + pytest para habilidades con soporte de Python                                                                     | Cambios relevantes para habilidades de Python  |
| `checks-windows`         | Carriles de prueba específicos de Windows                                                                                | Cambios relevantes para Windows                |
| `macos-node`             | Carril de pruebas de TypeScript en macOS utilizando los artefactos compilados compartidos                                | Cambios relevantes para macOS                  |
| `macos-swift`            | Lint, compilación y pruebas de Swift para la aplicación macOS                                                            | Cambios relevantes para macOS                  |
| `android`                | Matriz de compilación y pruebas de Android                                                                               | Cambios relevantes para Android                |

## Orden de interrupción rápida

Los trabajos están ordenados para que las comprobaciones económicas fallen antes de que se ejecuten las costosas:

1. `preflight` decide qué carriles existen en absoluto. La lógica de `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-fast`, `check`, `check-additional`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de artefactos y matrices de plataformas.
3. `build-artifacts` se superpone con los carriles rápidos de Linux para que los consumidores descendentes puedan iniciarse tan pronto como la compilación compartida esté lista.
4. Los carriles más pesados de plataforma y tiempo de ejecución se ramifican después de eso: `checks-fast-core`, `checks-fast-extensions`, `extension-fast`, `checks`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

La lógica del ámbito reside en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`.
El flujo de trabajo separado `install-smoke` reutiliza el mismo script de ámbito a través de su propio trabajo `preflight`. Calcula `run_install_smoke` a partir de la señal changed-smoke más estrecha, por lo que el smoke de Docker/instalación solo se ejecuta para cambios relevantes de instalación, empaquetado y contenedores.

En los envíos, la matriz `checks` añade el carril `compat-node22` solo para envíos. En las solicitudes de extracción, se omite ese carril y la matriz se mantiene centrada en los carriles normales de prueba/canal.

## Ejecutores

| Ejecutor                         | Trabajos                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-fast`, `build-artifacts`, comprobaciones de Linux, comprobaciones de documentos, habilidades de Python, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                                                         |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                                                              |

## Equivalentes locales

```bash
pnpm check          # types + lint + format
pnpm build:strict-smoke
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
