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

| Trabajo                          | Propósito                                                                                                                  | Cuándo se ejecuta                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `preflight`                      | Detectar cambios solo en docs, alcances cambiados, extensiones cambiadas y construir el manifiesto de CI                   | Siempre en pushes y PRs que no sean borradores |
| `security-scm-fast`              | Detección de claves privadas y auditoría de flujo de trabajo a través de `zizmor`                                          | Siempre en pushes y PRs que no sean borradores |
| `security-dependency-audit`      | Auditoría de lockfile de producción sin dependencias contra avisos de npm                                                  | Siempre en pushes y PRs que no sean borradores |
| `security-fast`                  | Agregado requerido para los trabajos de seguridad rápidos                                                                  | Siempre en pushes y PRs que no sean borradores |
| `build-artifacts`                | Construir `dist/` y el Control UI una vez, subir artefactos reutilizables para los trabajos posteriores                    | Cambios relevantes de Node                     |
| `checks-fast-core`               | Carriles de corrección rápida de Linux como comprobaciones bundled/plugin-contract/protocol                                | Cambios relevantes para Node                   |
| `checks-fast-contracts-channels` | Comprobaciones de contrato de canal fragmentadas con un resultado de comprobación agregado estable                         | Cambios relevantes para Node                   |
| `checks-node-extensions`         | Fragmentos de prueba completa de bundled-plugin en toda la suite de extensiones                                            | Cambios relevantes para Node                   |
| `checks-node-core-test`          | Fragmentos de prueba del Node Core, excluyendo carriles de canal, bundled, contract y extension                            | Cambios relevantes para Node                   |
| `extension-fast`                 | Pruebas enfocadas solo para los plugins bundled cambiados                                                                  | Cuando se detectan cambios de extensión        |
| `check`                          | Equivalente de puerta de enlace local principal fragmentada: tipos de prod, lint, guards, tipos de prueba y smoke estricto | Cambios relevantes para Node                   |
| `check-additional`               | Arquitectura, límites, guards de superficie de extensión, límites de paquete y fragmentos de gateway-watch                 | Cambios relevantes para Node                   |
| `build-smoke`                    | Pruebas smoke de CLI construida y smoke de memoria de inicio                                                               | Cambios relevantes para Node                   |
| `checks`                         | Carriles restantes de Node en Linux: pruebas de canal y compatibilidad con Node 22 solo para pushes                        | Cambios relevantes para Node                   |
| `check-docs`                     | Formato, lint y comprobaciones de enlaces rotos en la documentación                                                        | Documentación cambiada                         |
| `skills-python`                  | Ruff + pytest para habilidades con soporte de Python                                                                       | Cambios relevantes para habilidades de Python  |
| `checks-windows`                 | Carriles de prueba específicos de Windows                                                                                  | Cambios relevantes para Windows                |
| `macos-node`                     | Carril de prueba de TypeScript en macOS utilizando los artefactos construidos compartidos                                  | Cambios relevantes para macOS                  |
| `macos-swift`                    | Lint, compilación y pruebas de Swift para la aplicación de macOS                                                           | Cambios relevantes para macOS                  |
| `android`                        | Matriz de compilación y pruebas de Android                                                                                 | Cambios relevantes para Android                |

## Orden de fallo rápido

Los trabajos están ordenados para que las verificaciones económicas fallen antes de que se ejecuten las costosas:

1. `preflight` decide qué carriles existen en absoluto. La lógica de `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de matriz de artefactos y plataformas.
3. `build-artifacts` se superpone con los carriles rápidos de Linux para que los consumidores descendentes puedan comenzar tan pronto como la compilación compartida esté lista.
4. Después de eso, se expanden los carriles más pesados de plataforma y tiempo de ejecución: `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-extensions`, `checks-node-core-test`, `extension-fast`, `checks`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

La lógica de ámbito reside en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`.
El flujo de trabajo separado `install-smoke` reutiliza el mismo script de ámbito a través de su propio trabajo `preflight`. Calcula `run_install_smoke` a partir de la señal changed-smoke más estrecha, por lo que las pruebas de humo de Docker/instalación solo se ejecutan para cambios relevantes de instalación, empaquetado y contenedores.

La lógica local de changed-lane reside en `scripts/changed-lanes.mjs` y es ejecutada por `scripts/check-changed.mjs`. Esa puerta local es más estricta sobre los límites de la arquitectura que el ámbito amplio de la plataforma CI: los cambios de producción principales ejecutan typecheck de producción principal más pruebas principales, los cambios solo de prueba principales ejecutan solo typecheck/pruebas de prueba principal, los cambios de producción de extensiones ejecutan typecheck de producción de extensiones más pruebas de extensiones, y los cambios solo de prueba de extensiones ejecutan solo typecheck/pruebas de prueba de extensiones. Los cambios en el SDK de complementos públicos o en el contrato de complementos se expanden a la validación de extensiones porque las extensiones dependen de esos contratos principales. Los cambios desconocidos en root/config fallan de forma segura a todos los carriles.

En los envíos, la matriz `checks` añade el carril solo para envíos `compat-node22`. En las pull requests, ese carril se omite y la matriz se centra en los carriles normales de prueba/canal.

Las familias de pruebas de Node más lentas se dividen en fragmentos de archivos incluidos para que cada trabajo se mantenga pequeño: los contratos de canal dividen la cobertura del registro y el núcleo en ocho fragmentos ponderados cada uno, las pruebas de comando de respuesta automática se dividen en cuatro fragmentos de patrones de inclusión y los otros grandes grupos de prefijos de respuesta automática se dividen en dos fragmentos cada uno. `check-additional` también separa el trabajo de compilación/sandbox de límites de paquete del trabajo de topología en tiempo de ejecución de puerta de enlace/arquitectura.

GitHub puede marcar los trabajos sustituidos como `cancelled` cuando llega un envío más reciente al mismo PR o a la referencia `main`. Trátelo como ruido de CI a menos que la ejecución más reciente para la misma referencia también esté fallando. Las comprobaciones agregadas de fragmentos indican explícitamente este caso de cancelación para que sea más fácil distinguirlo de un fallo de prueba.

## Ejecutores

| Ejecutor                         | Trabajos                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-scm-fast`, `security-dependency-audit`, `security-fast`, `build-artifacts`, comprobaciones de Linux, comprobaciones de documentos, habilidades de Python, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                                                                                                           |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                                                                                                                |

## Equivalentes locales

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
