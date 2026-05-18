---
summary: "Gráfico de trabajos de CI, puertas de alcance, paraguas de lanzamiento y equivalentes de comandos locales"
title: "Canalización de CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI de OpenClaw se ejecuta en cada push a `main` y en cada solicitud de extracción. El trabajo `preflight` clasifica las diferencias y desactiva los carriles costosos cuando solo cambiaron áreas no relacionadas. Las ejecuciones manuales de `workflow_dispatch` omiten intencionalmente el alcance inteligente y despliegan el gráfico completo para candidatos de lanzamiento y validaciones amplias. Los carriles de Android permanecen opt-in a través de `include_android`. La cobertura de complementos solo para lanzamiento reside en el flujo de trabajo separado [`Plugin Prerelease`](#plugin-prerelease) y solo se ejecuta desde [`Full Release Validation`](#full-release-validation) o un envío manual explícito.

## Descripción general de la canalización

| Trabajo                          | Propósito                                                                                                                              | Cuándo se ejecuta                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `preflight`                      | Detectar cambios solo en documentos, alcances cambiados, extensiones cambiadas y construir el manifiesto de CI                         | Siempre en inserciones y PR que no sean borradores |
| `security-scm-fast`              | Detección de claves privadas y auditoría de flujos de trabajo a través de `zizmor`                                                     | Siempre en inserciones y PR que no sean borradores |
| `security-dependency-audit`      | Auditoría de lockfile de producción sin dependencias contra avisos de npm                                                              | Siempre en inserciones y PR que no sean borradores |
| `security-fast`                  | Agregado requerido para los trabajos de seguridad rápidos                                                                              | Siempre en inserciones y PR que no sean borradores |
| `check-dependencies`             | Pase solo de dependencias de producción Knip más el guardia de lista de permitidos de archivos no utilizados                           | Cambios relevantes para Node                       |
| `build-artifacts`                | Compilación de `dist/`, interfaz de usuario de control, comprobaciones de artefactos compilados y artefactos posteriores reutilizables | Cambios relevantes para Node                       |
| `checks-fast-core`               | Carriles de corrección rápida de Linux como comprobaciones bundled/plugin-contract/protocol                                            | Cambios relevantes para Node                       |
| `checks-fast-contracts-channels` | Comprobaciones de contrato de canal fragmentadas con un resultado de comprobación agregada estable                                     | Cambios relevantes para Node                       |
| `checks-node-core-test`          | Fragmentos de prueba del Core Node, excluyendo los carriles de canal, bundled, contrato y extensión                                    | Cambios relevantes para Node                       |
| `check`                          | Equivalente local de puerta principal fragmentada: tipos de producción, lint, guards, tipos de prueba y smoke estricto                 | Cambios relevantes para Node                       |
| `check-additional`               | Arquitectura, desviación de límite/prompt fragmentado, guards de extensión, límite de paquete y vigilancia de puerta de enlace         | Cambios relevantes para Node                       |
| `build-smoke`                    | Pruebas smoke de CLI integradas y smoke de memoria de inicio                                                                           | Cambios relevantes para Node                       |
| `checks`                         | Verificador para pruebas de canal de artefactos integrados                                                                             | Cambios relevantes para Node                       |
| `checks-node-compat-node22`      | Carril de compilación y pruebas de compatibilidad con Node 22                                                                          | Despacho manual de CI para versiones               |
| `check-docs`                     | Formato, lint y comprobaciones de enlaces rotos de la documentación                                                                    | Documentación modificada                           |
| `skills-python`                  | Ruff + pytest para habilidades respaldadas por Python                                                                                  | Cambios relevantes para habilidades de Python      |
| `checks-windows`                 | Pruebas de proceso/ruta específicas de Windows más regresiones de especificadores de importación del runtime compartido                | Cambios relevantes para Windows                    |
| `macos-node`                     | Carril de pruebas TypeScript de macOS utilizando los artefactos integrados compartidos                                                 | Cambios relevantes para macOS                      |
| `macos-swift`                    | Lint, compilación y pruebas de Swift para la aplicación macOS                                                                          | Cambios relevantes para macOS                      |
| `android`                        | Pruebas unitarias de Android para ambos variantes más una compilación APK de depuración                                                | Cambios relevantes para Android                    |
| `test-performance-agent`         | Optimización diaria de pruebas lentas de Codex después de la actividad de confianza                                                    | Éxito de CI principal o despacho manual            |
| `openclaw-performance`           | Informes de rendimiento de runtime de Kova diarios/bajo demanda con proveedor simulado, perfil profundo y carriles en vivo de GPT 5.4  | Despacho programado y manual                       |

## Orden de fail-fast

1. `preflight` decide qué carriles existen en absoluto. La lógica de `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de artefactos y la matriz de plataformas.
3. `build-artifacts` se superpone con los carriles rápidos de Linux para que los consumidores descendentes puedan comenzar tan pronto como la compilación compartida esté lista.
4. Después de eso, se despliegan los carriles más pesados de plataforma y tiempo de ejecución: `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-core-test`, `checks`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

GitHub puede marcar los trabajos reemplazados como `cancelled` cuando llega un nuevo push al mismo PR o a la referencia `main`. Trátelo como ruido de CI a menos que la ejecución más reciente para la misma referencia también esté fallando. Las comprobaciones de fragmentos agregados usan `!cancelled() && always()` para que aún informen fallos de fragmentos normales pero no se pongan en cola después de que todo el flujo de trabajo ya haya sido reemplazado. La clave de concurrencia automática de CI tiene versión (`CI-v7-*`), por lo que un zombi del lado de GitHub en un grupo de cola antiguo no puede bloquear indefinidamente las ejecuciones más recientes de main. Las ejecuciones manuales de suite completa usan `CI-manual-v1-*` y no cancelan las ejecuciones en curso.

El trabajo `ci-timings-summary` carga un artefacto `ci-timings-summary` compacto para cada ejecución de CI que no sea borrador. Registra el tiempo transcurrido, el tiempo de cola, los trabajos más lentos y los trabajos fallidos para la ejecución actual, por lo que las comprobaciones de salud de CI no necesitan raspar el payload completo de Actions repetidamente.

## Alcance y enrutamiento

La lógica de ámbito vive en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`. El envío manual omite la detección de ámbito modificado y hace que el manifiesto de preflight actúe como si cada área con ámbito hubiera cambiado.

- **Las ediciones del flujo de trabajo de CI** validan el gráfico de CI de Node más el linting del flujo de trabajo, pero no fuerzan por sí mismas las compilaciones nativas de Windows, Android o macOS; esos carriles de plataforma permanecen limitados a los cambios de origen de la plataforma.
- **Ediciones solo de enrutamiento de CI, ediciones seleccionadas de accesorios de pruebas core baratas y ediciones de enrutamiento de pruebas/auxiliares de contratos de complementos estrechos** utilizan una ruta de manifiesto rápida solo de Node: `preflight`, seguridad y una sola tarea `checks-fast-core`. Esa ruta omite los artefactos de compilación, la compatibilidad con Node 22, los contratos de canal, los fragmentos completos del núcleo, los fragmentos de complementos empaquetados y las matrices de guardia adicionales cuando el cambio se limita a las superficies de enrutamiento o auxiliares que la tarea rápida ejerce directamente.
- **Las comprobaciones de Node en Windows** se limitan a los contenedores de procesos/rutas específicos de Windows, los auxiliares de ejecución npm/pnpm/UI, la configuración del administrador de paquetes y las superficies del flujo de trabajo de CI que ejecutan ese carril; los cambios de código fuente, complementos, pruebas de instalación y solo de pruebas no relacionadas permanecen en los carriles de Node en Linux.

Las familias de pruebas de Node más lentas se dividen o equilibran para que cada trabajo se mantenga pequeño sin reservar en exceso los ejecutores: los contratos de canal se ejecutan como tres fragmentos respaldados por Blacksmith con ponderación, con el respaldo del ejecutor estándar de GitHub, los carriles rápidos/de soporte de unidad central se ejecutan por separado, la infraestructura de tiempo de ejecución central se divide entre los fragmentos de estado, proceso/configuración, cron y compartidos, auto-respuesta se ejecuta como trabajadores equilibrados (con el subárbol de respuesta dividido en fragmentos de agente-ejecutor, despacho y comandos/enrutamiento de estado) y las configuraciones de servidor/pasarela agentic se dividen entre los carriles de chat/autenticación/modelo/complemento http/tiempo de ejecución/inicio en lugar de esperar a los artefactos compilados. Las pruebas amplias de navegador, control de calidad, medios y complementos varios utilizan sus propias configuraciones de Vitest en lugar de la configuración general compartida para complementos. Los fragmentos de patrones de inclusión registran entradas de tiempo usando el nombre del fragmento de CI, de modo que `.artifacts/vitest-shard-timings.json` pueda distinguir una configuración completa de un fragmento filtrado. `check-additional` mantiene el trabajo de compilación/_canary_ de límite de paquete junto y separa la arquitectura de topología de tiempo de ejecución de la cobertura de observación de la pasarela; la lista de guardias de límite se distribuye en cuatro fragmentos de matriz, cada uno ejecutando guardias independientes seleccionados simultáneamente e imprimiendo tiempos por verificación. La costosa comprobación de deriva de _snapshot_ de indicador de ruta feliz de Codex se ejecuta como su propio trabajo adicional para CI manual y solo para cambios que afectan los indicadores, de modo que los cambios normales de Node no relacionados no esperen detrás de la generación de _snapshot_ de indicador en frío y los fragmentos de límite se mantengan equilibrados mientras la deriva del indicador aún está fijada al PR que la causó; el mismo indicador omite la generación de Vitest de _snapshot_ de indicador dentro del fragmento de límite de soporte central de artefactos compilados. La observación de la pasarela, las pruebas de canal y el fragmento de límite de soporte central se ejecutan simultáneamente dentro de `build-artifacts` después de que `dist/` y `dist-runtime/` ya estén compilados.

La CI de Android ejecuta tanto `testPlayDebugUnitTest` como `testThirdPartyDebugUnitTest` y luego compila el APK de depuración de Play. La variante de terceros no tiene un conjunto de fuentes o manifiesto separados; su carril de pruebas unitarias todavía compila la variante con las marcas BuildConfig de registro de SMS/llamadas, al mismo tiempo que evita un trabajo duplicado de empaquetado de APK de depuración en cada _push_ relevante para Android.

El fragmento `check-dependencies` ejecuta `pnpm deadcode:dependencies` (un paso de producción de solo dependencias de Knip fijado a la última versión de Knip, con la antigüedad mínima de lanzamiento de pnpm deshabilitada para la instalación `dlx`) y `pnpm deadcode:unused-files`, que compara los hallazgos de archivos no utilizados en producción de Knip contra `scripts/deadcode-unused-files.allowlist.mjs`. El guardián de archivos no utilizados falla cuando un PR añade un nuevo archivo no utilizado sin revisar o deja una entrada obsoleta en la lista de permitidos, al tiempo que preserva las superficies intencionales de complementos dinámicos, generados, de compilación, de pruebas en vivo y de puentes de paquetes que Knip no puede resolver estáticamente.

## Reenvío de actividad de ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` es el puente del lado objetivo desde la actividad del repositorio OpenClaw hacia ClawSweeper. No descarga ni ejecuta código de solicitudes de extracción (pull requests) que no es de confianza. El flujo de trabajo crea un token de GitHub App a partir de `CLAWSWEEPER_APP_PRIVATE_KEY` y luego envía cargas útiles compactas `repository_dispatch` a `openclaw/clawsweeper`.

El flujo de trabajo tiene cuatro carriles:

- `clawsweeper_item` para solicitudes exactas de revisión de problemas y solicitudes de extracción;
- `clawsweeper_comment` para comandos explícitos de ClawSweeper en comentarios de problemas;
- `clawsweeper_commit_review` para solicitudes de revisión a nivel de confirmación en envíos `main`;
- `github_activity` para la actividad general de GitHub que el agente ClawSweeper puede inspeccionar.

El carril `github_activity` reenvía solo metadatos normalizados: tipo de evento, acción, actor, repositorio, número de elemento, URL, título, estado y breves extractos para comentarios o revisiones cuando están presentes. Intencionalmente evita reenviar el cuerpo completo del webhook. El flujo de trabajo receptor en `openclaw/clawsweeper` es `.github/workflows/github-activity.yml`, que publica el evento normalizado en el enlace OpenClaw Gateway para el agente ClawSweeper.

La actividad general es observación, no entrega por defecto. El agente ClawSweeper recibe el objetivo de Discord en su mensaje y debe publicar en `#clawsweeper` solo cuando el evento es sorprendente, accionable, riesgoso o operacionalmente útil. Las aperturas rutinarias, ediciones, actividad excesiva de bots, ruido duplicado de webhooks y el tráfico normal de revisiones deberían resultar en `NO_REPLY`.

Trata los títulos de GitHub, comentarios, cuerpos, texto de revisión, nombres de ramas y mensajes de confirmación como datos no confiables a lo largo de esta ruta. Son entradas para la resumen y la clasificación, no instrucciones para el flujo de trabajo o el tiempo de ejecución del agente.

## Despachos manuales

Los despachos manuales de CI ejecutan el mismo grafo de trabajos que la CI normal, pero fuerzan la activación de cada canal con alcance que no sea de Android: fragmentos de Linux Node, fragmentos de complementos empaquetados, contratos de canal, compatibilidad con Node 22, `check`, `check-additional`, pruebas de humo de compilación, comprobaciones de documentos, habilidades de Python, Windows, macOS e i18n de Control UI. Los despachos manuales independientes de CI ejecutan solo Android con `include_android=true`; el paraguas de versión completa habilita Android pasando `include_android=true`. Las comprobaciones estáticas de prerrelease de complementos, el fragmento `agentic-plugins` solo de versión, el barrido por lotes completo de extensiones y los canales Docker de prerrelease de complementos están excluidos de la CI. El conjunto de prerrelease de Docker se ejecuta solo cuando `Full Release Validation` despacha el flujo de trabajo `Plugin Prerelease` separado con la puerta de validación de versión habilitada.

Las ejecuciones manuales utilizan un grupo de concurrencia único para que un conjunto completo de candidato a versión no se cancele por otro envío o ejecución de PR en la misma referencia. La entrada opcional `target_ref` permite a un llamador de confianza ejecutar ese grafo contra una rama, etiqueta o SHA de confirmación completo mientras utiliza el archivo de flujo de trabajo de la referencia de despacho seleccionada.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Ejecutores

| Ejecutor                         | Trabajos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`, trabajos de seguridad rápidos y agregados (`security-scm-fast`, `security-dependency-audit`, `security-fast`), comprobaciones rápidas de protocolo/contrato/empaquetado, comprobaciones de contratos de canal fragmentados, fragmentos `check` excepto lint, agregados `check-additional`, verificadores de agregados de pruebas de Node, comprobaciones de documentos, habilidades de Python, workflow-sanity, labeler, auto-response; install-smoke preflight también usa Ubuntu hospedado en GitHub para que la matriz de Blacksmith pueda ponerse en cola antes |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, fragmentos de extensiones de menor peso, `checks-fast-core`, `checks-node-compat-node22`, `check-prod-types` y `check-test-types`                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `blacksmith-8vcpu-ubuntu-2404`   | build-smoke, fragmentos de pruebas de Linux Node, fragmentos de pruebas de complementos empaquetados, fragmentos `check-additional`, `android`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (lo suficientemente sensible a la CPU que 8 vCPU costaban más de lo que ahorraban); compilaciones Docker de install-smoke (el tiempo de espera en la cola de 32 vCPU costaba más de lo que ahorraba)                                                                                                                                                                                                                                                                                                                                             |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` en `openclaw/openclaw`; los bifurcados (forks) recurren a `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` en `openclaw/openclaw`; los bifurcados (forks) recurren a `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

La CI del repositorio canónico mantiene a Blacksmith como la ruta de ejecutor predeterminada. Durante `preflight`, `scripts/ci-runner-labels.mjs` verifica las ejecuciones de Actions en cola y en curso recientes para trabajos de Blacksmith en cola. Si una etiqueta de Blacksmith específica ya tiene trabajos en cola, los trabajos descendentes que usarían esa etiqueta exacta recurren al ejecutor alojado en GitHub correspondiente (`ubuntu-24.04`, `windows-2025` o `macos-latest`) solo para esa ejecución. Otros tamaños de Blacksmith en la misma familia de sistema operativo se mantienen en sus etiquetas principales. Si falla la sonda de la API, no se aplica ningún respaldo.

## Equivalentes locales

```bash
pnpm changed:lanes                            # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed                            # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check                                    # fast local gate: prod tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed                              # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/build-smoke lanes matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## Rendimiento de OpenClaw

`OpenClaw Performance` es el flujo de trabajo de rendimiento del producto/ejecución. Se ejecuta diariamente en `main` y se puede despachar manualmente:

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

El despacho manual normalmente evalúa el rendimiento de la referencia del flujo de trabajo. Establezca `target_ref` para evaluar el rendimiento de una etiqueta de lanzamiento u otra rama con la implementación actual del flujo de trabajo. Las rutas de los informes publicados y los punteros más recientes se keyan por la referencia probada, y cada `index.md` registra la referencia/SHA probada, referencia/SHA del flujo de trabajo, referencia de Kova, perfil, modo de autenticación de carril, modelo, recuento de repeticiones y filtros de escenario.

El flujo de trabajo instala OCM desde un lanzamiento fijado y Kova desde `openclaw/Kova` en la entrada fijada `kova_ref`, y luego ejecuta tres carriles:

- `mock-provider`: escenarios de diagnóstico de Kova contra un tiempo de ejecución de compilación local con autenticación falsa compatible con OpenAI determinista.
- `mock-deep-profile`: perfilado de CPU/pila/trazas para puntos críticos de inicio, puerta de enlace y turno del agente.
- `live-gpt54`: un turno real del agente `openai/gpt-5.4` de OpenAI, omitido cuando `OPENAI_API_KEY` no está disponible.

El carril mock-provider también ejecuta sondas de origen nativas de OpenClaw después del pase Kova: tiempo de arranque y memoria de la puerta de enlace en casos de inicio predeterminados, de hook y de 50 complementos; bucles de hello repetidos de mock-OpenAI `channel-chat-baseline`; y comandos de inicio de CLI contra la puerta de enlace iniciada. El resumen de Markdown de la sonda de origen se encuentra en `source/index.md` en el paquete del informe, con JSON sin procesar junto a él.

Todos los carriles suben artefactos a GitHub. Cuando se configura `CLAWGRIT_REPORTS_TOKEN`, el flujo de trabajo también confirma `report.json`, `report.md`, paquetes, `index.md` y artefactos de sonda de origen en `openclaw/clawgrit-reports` bajo `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. El puntero tested-ref actual se escribe como `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validación completa de la versión

`Full Release Validation` es el flujo de trabajo manual paraguas para "ejecutar todo antes del lanzamiento". Acepta una rama, etiqueta o SHA de confirmación completo, despacha el flujo de trabajo manual `CI` con ese objetivo, despacha `Plugin Prerelease` para la prueba de complementos/paquetes/estáticos/Docker solo de lanzamiento y despacha `OpenClaw Release Checks` para pruebas de humo de instalación, aceptación de paquetes, verificaciones de paquetes multi-OS, paridad de QA Lab, Matrix y carriles de Telegram. Las ejecuciones estables/predeterminadas mantienen la cobertura exhaustiva de lanzamiento en vivo/E2E y Docker detrás de `run_release_soak=true`; `release_profile=full` fuerza esa cobertura de absorción para que la validación asesora amplia siga siendo amplia. Con `rerun_group=all` y `release_profile=full`, también ejecuta `NPM Telegram Beta E2E` contra el artefacto `release-package-under-test` de las comprobaciones de lanzamiento. Después de publicar, pase `release_package_spec` para reutilizar el paquete npm enviado en las comprobaciones de lanzamiento, Aceptación de Paquetes, Docker, multi-OS y Telegram sin reconstruir. Use `npm_telegram_package_spec` solo cuando Telegram deba probar un paquete diferente.

Consulte [Validación completa de la versión](/es/reference/full-release-validation) para obtener la
matriz de etapas, los nombres exactos de los trabajos del flujo de trabajo, las diferencias de perfil, los artefactos y
los identificadores de nueva ejecución enfocados.

`OpenClaw Release Publish` es el flujo de trabajo de versión de mutación manual. Despliéguelo
desde `release/YYYY.M.D` o `main` después de que exista la etiqueta de la versión y después de que la
verificación previa de OpenClaw npm haya tenido éxito. Verifica `pnpm plugins:sync:check`,
despliega `Plugin NPM Release` para todos los paquetes de complementos publicables, despliega
`Plugin ClawHub Release` para el mismo SHA de la versión y solo entonces despliega
`OpenClaw NPM Release` con el `preflight_run_id` guardado.

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Para una prueba de confirmación anclada en una rama de rápido movimiento, use el asistente en lugar de
`gh workflow run ... --ref main -f ref=<sha>`:

```bash
pnpm ci:full-release --sha <full-sha>
```

Las referencias de despacho de flujo de trabajo de GitHub deben ser ramas o etiquetas, no SHA de confirmación sin procesar. El
asistente envía una rama temporal `release-ci/<sha>-...` en el SHA de destino,
despliega `Full Release Validation` desde esa referencia anclada, verifica que cada flujo de trabajo secundario
`headSha` coincida con el destino y elimina la rama temporal cuando la
ejecución se completa. El verificador paraguas también falla si algún flujo de trabajo secundario se ejecutó en un
SHA diferente.

`release_profile` controla la amplitud del proveedor/en vivo que se pasa a las comprobaciones de la versión. Los
flujos de trabajo de versión manual tienen `stable` como valor predeterminado; use `full` solo cuando
intencionalmente desee la matriz amplia de proveedor/medios de avisos. `run_release_soak`
controla si las comprobaciones de versión estables/predeterminadas ejecutan la soaking en vivo/E2E exhaustiva y
la ruta de versión de Docker; `full` fuerza el soaking.

- `minimum` mantiene los carriles más rápidos críticos para la versión de OpenAI/núcleo.
- `stable` añade el conjunto estable de proveedores/backend.
- `full` ejecuta la matriz amplia de proveedor/medios de avisos.

El paraguas registra los ids de las ejecuciones hijas despachadas, y el trabajo final `Verify full validation` vuelve a verificar las conclusiones de las ejecuciones hijas actuales y añade tablas de trabajos más lentos para cada ejecución hija. Si se vuelve a ejecutar un flujo de trabajo hijo y se vuelve verde, vuelva a ejecutar solo el trabajo verificador principal para actualizar el resultado del paraguas y el resumen de tiempos.

Para la recuperación, tanto `Full Release Validation` como `OpenClaw Release Checks` aceptan `rerun_group`. Use `all` para un candidato de lanzamiento, `ci` solo para el hijo CI completo normal, `plugin-prerelease` solo para el hijo de prelanzamiento de complementos, `release-checks` para cada hijo de lanzamiento, o un grupo más estrecho: `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, o `npm-telegram` en el paraguas. Esto mantiene acotada la nueva ejecución de un cuadro de lanzamiento fallido después de una corrección enfocada. Para un carril multi-SO fallido, combine `rerun_group=cross-os` con `cross_os_suite_filter`, por ejemplo `windows/packaged-upgrade`; los comandos multi-SO largos emiten líneas de latido y los resúmenes de actualización de paquetes incluyen tiempos por fase. Los carriles de verificación de lanzamiento de QA son consultivos, por lo que los fallos solo de QA avisan pero no bloquean el verificador de verificación de lanzamiento.

`OpenClaw Release Checks` usa la referencia del flujo de trabajo confiable para resolver la referencia seleccionada una vez en un archivo tar `release-package-under-test`, luego pasa ese artefacto a las verificaciones multi-SO y Aceptación de Paquetes, además del flujo de trabajo Docker de ruta de lanzamiento en vivo/E2E cuando se ejecuta la cobertura de soaking. Esto mantiene los bytes del paquete consistentes en los cuadros de lanzamiento y evita reempaquetar el mismo candidato en múltiples trabajos hijos.

Las ejecuciones duplicadas de `Full Release Validation` para `ref=main` y `rerun_group=all`
suplantan al paraguas antiguo. El monitor principal cancela cualquier flujo de trabajo secundario que
ya haya despachado cuando el principal se cancela, por lo que la validación más reciente de la rama principal
no queda bloqueada por una ejecución de comprobación de lanzamiento obsoleta de dos horas. La validación de ramas/etiquetas de lanzamiento
y los grupos de reejecución enfocados mantienen `cancel-in-progress: false`.

## Fragmentos Live y E2E

El elemento secundario de lanzamiento live/E2E mantiene una cobertura nativa `pnpm test:live` amplia, pero la ejecuta como fragmentos con nombre a través de `scripts/test-live-shard.mjs` en lugar de un trabajo serie:

- `native-live-src-agents`
- `native-live-src-gateway-core`
- trabajos `native-live-src-gateway-profiles` filtrados por proveedor
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- divide los fragmentos de audio/video de medios y los fragmentos de música filtrados por proveedor

Eso mantiene la misma cobertura de archivos al facilitar el reejecución y diagnóstico de fallos lentos de proveedores live. Los nombres de fragmentos agregados `native-live-extensions-o-z`, `native-live-extensions-media` y `native-live-extensions-media-music` siguen siendo válidos para reejecuciones manuales únicas.

Los fragmentos de medios live nativos se ejecutan en `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construidos por el flujo de trabajo `Live Media Runner Image`. Esa imagen preinstala `ffmpeg` y `ffprobe`; los trabajos de medios solo verifican los binarios antes de la configuración. Mantenga las suites live respaldadas por Docker en los ejecutores normales de Blacksmith; los trabajos de contenedores no son el lugar adecuado para lanzar pruebas de Docker anidadas.

Los shards de modelo/backend en vivo respaldados por Docker utilizan una imagen `ghcr.io/openclaw/openclaw-live-test:<sha>` compartida separada por cada commit seleccionado. El flujo de trabajo de lanzamiento en vivo construye y envía esa imagen una sola vez, luego los shards del modelo en vivo de Docker, la puerta de enlace con sharding de proveedor, el backend de CLI, el enlace ACP y los fragments del arnés de Codex se ejecutan con `OPENCLAW_SKIP_DOCKER_BUILD=1`. Los shards Docker de la puerta de enlace llevan límites `timeout` explícitos a nivel de script por debajo del tiempo de espera del trabajo del flujo de trabajo, de modo que un contenedor atascado o una ruta de limpieza falle rápidamente en lugar de consumir todo el presupuesto de verificación de lanzamiento. Si esos shards reconstruyen de forma independiente el objetivo Docker de origen completo, la ejecución del lanzamiento está mal configurada y desperdiciará tiempo de reloj en compilaciones de imágenes duplicadas.

## Aceptación de paquetes

Use `Package Acceptance` cuando la pregunta sea "¿funciona este paquete instalable de OpenClaw como un producto?" Es diferente de la CI normal: la CI normal valida el árbol de fuentes, mientras que la aceptación del paquete valida un único archivo tar a través del mismo arnés Docker E2E que los usuarios ejecutan después de la instalación o actualización.

### Trabajos

1. `resolve_package` extrae `workflow_ref`, resuelve un candidato de paquete, escribe `.artifacts/docker-e2e-package/openclaw-current.tgz`, escribe `.artifacts/docker-e2e-package/package-candidate.json`, carga ambos como el artefacto `package-under-test` e imprime la fuente, la referencia del flujo de trabajo, la referencia del paquete, la versión, SHA-256 y el perfil en el resumen del paso de GitHub.
2. `docker_acceptance` llama a `openclaw-live-and-e2e-checks-reusable.yml` con `ref=workflow_ref` y `package_artifact_name=package-under-test`. El flujo de trabajo reutilizable descarga ese artefacto, valida el inventario del tarball, prepara las imágenes Docker de resumen del paquete cuando es necesario y ejecuta los carriles Docker seleccionados contra ese paquete en lugar de empaquetar la extracción del flujo de trabajo. Cuando un perfil selecciona múltiples `docker_lanes` dirigidos, el flujo de trabajo reutilizable prepara el paquete y las imágenes compartidas una vez, y luego distribuye esos carriles como trabajos Docker dirigidos paralelos con artefactos únicos.
3. `package_telegram` opcionalmente llama a `NPM Telegram Beta E2E`. Se ejecuta cuando `telegram_mode` no es `none` e instala el mismo artefacto `package-under-test` cuando Package Acceptance resolvió uno; el envío independiente de Telegram aún puede instalar una especificación npm publicada.
4. `summary` falla el flujo de trabajo si falló la resolución del paquete, la aceptación de Docker o el carril opcional de Telegram.

### Fuentes de candidatos

- `source=npm` acepta solo `openclaw@beta`, `openclaw@latest` o una versión exacta de lanzamiento de OpenClaw como `openclaw@2026.4.27-beta.2`. Úselo para la aceptación publicada de prerelease/estable.
- `source=ref` empaqueta una rama de `package_ref` de confianza, etiqueta o SHA de confirmación completo. El solucionador busca ramas/etiquetas de OpenClaw, verifica que la confirmación seleccionada sea accesible desde el historial de ramas del repositorio o una etiqueta de lanzamiento, instala dependencias en un árbol de trabajo separado y lo empaqueta con `scripts/package-openclaw-for-docker.mjs`.
- `source=url` descarga un `.tgz` HTTPS; se requiere `package_sha256`.
- `source=artifact` descarga un `.tgz` de `artifact_run_id` y `artifact_name`; `package_sha256` es opcional pero debe proporcionarse para artefactos compartidos externamente.

Mantenga `workflow_ref` y `package_ref` separados. `workflow_ref` es el código de flujo de trabajo/harness de confianza que ejecuta la prueba. `package_ref` es la confirmación de origen que se empaqueta cuando `source=ref`. Esto permite que el harness de prueba actual valide confirmaciones de origen de confianza antiguas sin ejecutar lógica de flujo de trabajo antigua.

### Perfiles de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` más `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — fragmentos completos de la ruta de lanzamiento de Docker con OpenWebUI
- `custom` — `docker_lanes` exacto; obligatorio cuando `suite_profile=custom`

El perfil `package` utiliza la cobertura de complementos sin conexión, por lo que la validación de paquetes publicados no está limitada por la disponibilidad de ClawHub en vivo. El carril opcional de Telegram reutiliza el artefacto `package-under-test` en `NPM Telegram Beta E2E`, manteniendo la ruta de especificación npm publicada para envíos independientes.

Para conocer la política dedicada de actualización y pruebas de complementos, incluidos los comandos locales,
carriles de Docker, entradas de Aceptación de Paquetes, valores predeterminados de lanzamiento y triaje de fallas,
consulte [Prueba de actualizaciones y complementos](/es/help/testing-updates-plugins).

Las comprobaciones de lanzamiento llaman a Aceptación de Paquetes con `source=artifact`, el artefacto del paquete de lanzamiento preparado, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` y `telegram_mode=mock-openai`. Esto mantiene la migración de paquetes, la actualización, la instalación de la habilidad ClawHub en vivo, la limpieza de dependencias de complementos obsoletos, la reparación de la instalación de complementos configurados, el complemento sin conexión, la actualización de complementos y la prueba de Telegram en el mismo archivo tar del paquete resuelto. Establezca `release_package_spec` en Validación de Lanzamiento Completo o Comprobaciones de Lanzamiento de OpenClaw después de publicar una versión beta para ejecutar la misma matriz contra el paquete npm enviado sin reconstruir; establezca `package_acceptance_package_spec` solo cuando Aceptación de Paquetes necesite un paquete diferente del resto de la validación de lanzamiento. Las comprobaciones de lanzamiento multi-SO aún cubren el incorporación específica del SO, el instalador y el comportamiento de la plataforma; la validación del producto de paquete/actualización debe comenzar con Aceptación de Paquetes. El carril Docker `published-upgrade-survivor` valida una línea base de paquete publicado por ejecución en la ruta de lanzamiento de bloqueo. En Aceptación de Paquetes, el archivo tar `package-under-test` resuelto es siempre el candidato y `published_upgrade_survivor_baseline` selecciona la línea base publicada de respaldo, predeterminada a `openclaw@latest`; los comandos de reejecución de carril fallido preservan esa línea base. La Validación de Lanzamiento Completo con `run_release_soak=true` o `release_profile=full` establece `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` y `published_upgrade_survivor_scenarios=reported-issues` para expandirse a través de las cuatro últimas versiones estables de npm más las versiones de límite de compatibilidad de complementos fijados y dispositivos con forma de problema para la configuración de Feishu, archivos de arranque/persona conservados, instalaciones de complementos de OpenClaw configurados, rutas de registro de tilde y raíces de dependencia de complementos heredados obsoletos. Las selecciones de supervivientes de actualización publicada de línea base múltiple se dividen por línea base en trabajos separados de ejecutor Docker dirigidos. El flujo de trabajo separado `Update Migration` usa el carril Docker `update-migration` con `all-since-2026.4.23` y `plugin-deps-cleanup` cuando la pregunta es la limpieza exhaustiva de actualizaciones publicadas, no la amplitud normal del CI de Lanzamiento Completo. Las ejecuciones agregadas locales pueden pasar especificaciones exactas de paquetes con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, mantener un solo carril con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` como `openclaw@2026.4.15`, o establecer `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` para la matriz de escenarios. El carril publicado configura la línea base con una receta de comando `openclaw config set` incorporada, registra los pasos de la receta en `summary.json` y sondea `/healthz`, `/readyz`, además del estado RPC después del inicio de Gateway. Los carriles frescos de paquete Windows e instalador también verifican que un paquete instalado pueda importar una anulación de control de navegador desde una ruta absoluta de Windows sin procesar. La prueba de humo de turnos de agente multi-SO de OpenAI tiene como valor predeterminado `OPENCLAW_CROSS_OS_OPENAI_MODEL` si se establece, de lo contrario `openai/gpt-5.4`, por lo que la prueba de instalación y puerta de enlace se mantiene en un modelo de prueba GPT-5 mientras evita los valores predeterminados de GPT-4.x.

### Ventanas de compatibilidad heredadas

Package Acceptance tiene ventanas de compatibilidad heredadas limitadas para paquetes ya publicados. Los paquetes hasta `2026.4.25`, incluyendo `2026.4.25-beta.*`, pueden usar la ruta de compatibilidad:

- las entradas privadas de QA conocidas en `dist/postinstall-inventory.json` pueden apuntar a archivos omitidos en el tarball;
- `doctor-switch` puede omitir el subcaso de persistencia `gateway install --wrapper` cuando el paquete no expone esa marca;
- `update-channel-switch` puede eliminar los pnpm `patchedDependencies` faltantes del accesorio falso de git derivado del tarball y puede registrar los `update.channel` persistidos faltantes;
- las pruebas de humo (smokes) de complementos pueden leer ubicaciones de registros de instalación heredadas o aceptar la falta de persistencia del registro de instalación del marketplace;
- `plugin-update` puede permitir la migración de metadatos de configuración mientras sigue requiriendo que el registro de instalación y el comportamiento de no reinstalación permanezcan sin cambios.

El paquete publicado `2026.4.26` también puede advertir sobre los archivos de marca de metadatos de compilación local que ya se enviaron. Los paquetes posteriores deben cumplir con los contratos modernos; las mismas condiciones fallan en lugar de advertir u omitir.

### Ejemplos

```bash
# Validate the current beta package with product-level coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# Pack and validate a release branch with the current harness.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Validate a tarball URL. SHA-256 is mandatory for source=url.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Reuse a tarball uploaded by another Actions run.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

Al depurar una ejecución fallida de aceptación de paquetes, comience con el resumen `resolve_package` para confirmar la fuente, la versión y el SHA-256 del paquete. Luego inspeccione la ejecución secundaria `docker_acceptance` y sus artefactos de Docker: `.artifacts/docker-tests/**/summary.json`, `failures.json`, registros de carriles, tiempos de fase y comandos de reejecución. Se prefiere reejecutar el perfil de paquete fallido o los carriles exactos de Docker en lugar de reejecutar la validación completa de lanzamiento.

## Prueba de humo de instalación

El flujo de trabajo separado `Install Smoke` reutiliza el mismo script de alcance a través de su propio trabajo `preflight`. Divide la cobertura de prueba en `run_fast_install_smoke` y `run_full_install_smoke`.

- Las ejecuciones de **Fast path** (ruta rápida) son para pull requests que tocan superficies de Docker/paquetes, cambios en el paquete/manifesto del complemento empaquetado, o superficies principales del complemento/canal/pasarela/Plugin SDK que ejercen los trabajos de humo de Docker. Los cambios de complementos empaquetados solo de fuente, ediciones solo de pruebas y ediciones solo de documentos no reservan trabajadores de Docker. La ruta rápida crea la imagen raíz del Dockerfile una vez, verifica la CLI, ejecuta el humo de la CLI de eliminación del espacio de trabajo compartido de los agentes, ejecuta la e2e de la red de pasarela de contenedores, verifica un argumento de compilación de extensión empaquetada y ejecuta el perfil Docker de complemento empaquetado limitado bajo un tiempo de espera de comando agregado de 240 segundos (la ejecución de Docker de cada escenario está limitada por separado).
- El **Full path** (ruta completa) mantiene la cobertura de instalación del paquete QR y del instalador de Docker/actualización para ejecuciones programadas nocturnas, envíos manuales, verificaciones de lanzamiento de llamadas de flujo de trabajo y pull requests que realmente toquen superficies del instalador/paquete/Docker. En modo completo, install-smoke prepara o reutiliza una imagen de humo del Dockerfile raíz GHCR del SHA de destino, luego ejecuta la instalación del paquete QR, humos del Dockerfile raíz/pasarela, humos del instalador/actualización y la e2e rápida del complemento empaquetado Docker como trabajos separados para que el trabajo del instalador no espere detrás de los humos de la imagen raíz.

Las confirmaciones (pushes) a `main` (incluyendo confirmaciones de fusión) no fuerzan la ruta completa; cuando la lógica del alcance cambiado solicitaría una cobertura completa en un push, el flujo de trabajo mantiene la prueba rápida de Docker y deja la prueba completa de instalación para la validación nocturna o de lanzamiento.

La prueba de humo lenta del proveedor de imágenes de instalación global de Bun está controlada por separado por `run_bun_global_install_smoke`. Se ejecuta según el programa nocturno y desde el flujo de trabajo de comprobaciones de versiones, y los despachos manuales de `Install Smoke` pueden optar por ella, pero las solicitudes de extracción y los envíos a `main` no lo hacen. Las pruebas de Docker de QR e instalador mantienen sus propios Dockerfiles centrados en la instalación.

## E2E de Docker local

`pnpm test:docker:all` precompila una imagen de prueba en vivo compartida, empaqueta OpenClaw una vez como un tarball de npm y construye dos imágenes compartidas de `scripts/e2e/Dockerfile`:

- un ejecutor de Node/Get simple para carriles de instalador/actualización/dependencia de complementos;
- una imagen funcional que instala el mismo tarball en `/app` para los carriles de funcionalidad normal.

Las definiciones de carriles de Docker residen en `scripts/lib/docker-e2e-scenarios.mjs`, la lógica del planificador reside en `scripts/lib/docker-e2e-plan.mjs` y el ejecutor solo ejecuta el plan seleccionado. El planificador selecciona la imagen por carril con `OPENCLAW_DOCKER_E2E_BARE_IMAGE` y `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, y luego ejecuta los carriles con `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Parámetros ajustables

| Variable                               | Predeterminado | Propósito                                                                                                                              |
| -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10             | Recuento de espacios del grupo principal para carriles normales.                                                                       |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10             | Recuento de espacios del grupo de cola sensible al proveedor.                                                                          |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9              | Límite concurrente de carriles en vivo para que los proveedores no limiten.                                                            |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10             | Límite concurrente de carriles de instalación de npm.                                                                                  |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7              | Límite concurrente de carriles multiservicio.                                                                                          |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000           | Escalonar entre los inicios de los carriles para evitar tormentas de creación del demonio de Docker; establezca `0` para no escalonar. |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000        | Tiempo de espera de reserva por carril (120 minutos); los carriles en vivo/de cola seleccionados usan límites más estrictos.           |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | sin establecer | `1` imprime el plan del planificador sin ejecutar los carriles.                                                                        |
| `OPENCLAW_DOCKER_ALL_LANES`            | sin establecer | Lista exacta de carriles separados por comas; omite la limpieza previa para que los agentes puedan reproducir un carril fallido.       |

Un carril más pesado que su límite efectivo aún puede iniciarse desde un grupo vacío y luego ejecutarse solo hasta que libere capacidad. El agregado local realiza la verificación previa de Docker, elimina los contenedores obsoletos de OpenClaw E2E, emite el estado del carril activo, conserva los tiempos de los carriles para el ordenamiento más largo primero y deja de programar nuevos carriles agrupados después del primer error de forma predeterminada.

### Flujo de trabajo reutilizable en vivo/E2E

El flujo de trabajo reutilizable live/E2E pregunta a `scripts/test-docker-all.mjs --plan-json` qué paquete, tipo de imagen, imagen en vivo, carril y cobertura de credenciales son necesarios. `scripts/docker-e2e.mjs` luego convierte ese plan en resultados y resúmenes de GitHub. Ya sea empaqueta OpenClaw a través de `scripts/package-openclaw-for-docker.mjs`, descarga un artefacto de paquete de la ejecución actual, o descarga un artefacto de paquete de `package_artifact_run_id`; valida el inventario de archivos tar; construye e impulsa imágenes Docker E2E básicas/funcionales etiquetadas con el resumen del paquete a través de la caché de capas Docker de Blacksmith cuando el plan necesita carriles con paquete instalado; y reutiliza las entradas `docker_e2e_bare_image`/`docker_e2e_functional_image` proporcionadas o las imágenes existentes de resumen de paquete en lugar de reconstruir. Las extracciones de imágenes Docker se reintentan con un tiempo de espera limitado de 180 segundos por intento, para que un flujo atascado de registro/caché se reintente rápidamente en lugar de consumir la mayor parte de la ruta crítica de CI.

### Fragmentos de la ruta de lanzamiento

La cobertura Docker de Release ejecuta trabajos fragmentados más pequeños con `OPENCLAW_SKIP_DOCKER_BUILD=1` para que cada fragmento extraiga solo el tipo de imagen que necesita y ejecute múltiples carriles a través del mismo programador ponderado:

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Los fragmentos Docker de la versión actual son `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` y `plugins-runtime-install-a` hasta `plugins-runtime-install-h`. `plugins-runtime-core`, `plugins-runtime` y `plugins-integrations` siguen siendo alias agregados de complementos/runtime. El alias de carril `install-e2e` sigue siendo el alias de reejecución manual agregado para ambos carriles de instalador de proveedor.

OpenWebUI se integra en `plugins-runtime-services` cuando la cobertura completa de la ruta de lanzamiento lo solicita, y mantiene un fragmento independiente `openwebui` solo para despachos exclusivos de OpenWebUI. Los carriles de actualización de canal empaquetado se reintentan una vez para fallas transitorias de la red npm.

Cada fragmento carga `.artifacts/docker-tests/` con registros de carriles, tiempos, `summary.json`, `failures.json`, tiempos de fase, plan del programador JSON, tablas de carriles lentos y comandos de reejecución por carril. La entrada `docker_lanes` del flujo de trabajo ejecuta los carriles seleccionados contra las imágenes preparadas en lugar de los trabajos del fragmento, lo que mantiene la depuración de carriles fallidos limitada a un trabajo de Docker dirigido y prepara, descarga o reutiliza el artefacto del paquete para esa ejecución; si un carril seleccionado es un carril Docker en vivo, el trabajo dirigido construye la imagen de prueba en vivo localmente para esa reejecución. Los comandos de reejecución de GitHub generados por carril incluyen `package_artifact_run_id`, `package_artifact_name` y entradas de imágenes preparadas cuando esos valores existen, para que un carril fallido pueda reutilizar el paquete exacto y las imágenes de la ejecución fallida.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

El flujo de trabajo programado de live/E2E ejecuta diariamente la suite completa de Docker de la ruta de lanzamiento.

## Plugin Prerelease

`Plugin Prerelease` es una cobertura de producto/paquete más costosa, por lo que es un flujo de trabajo separado despachado por `Full Release Validation` o por un operador explícito. Las solicitudes de extracción normales, los envíos a `main` y los despachos manuales independientes de CI mantienen esa suite desactivada. Equilibra las pruebas de complementos empaquetados en ocho trabajadores de extensión; esos trabajos de fragmento de extensión ejecutan hasta dos grupos de configuración de complementos a la vez con un trabajador Vitest por grupo y un montón de Node más grande para que los lotes de complementos con importaciones pesadas no creen trabajos de CI adicionales. La ruta de versión preliminar de Docker exclusiva para lanzamientos agrupa los carriles Docker dirigidos en grupos pequeños para evitar reservar docenas de ejecutores para trabajos de uno a tres minutos. El flujo de trabajo también carga un artefacto informativo `plugin-inspector-advisory` desde `@openclaw/plugin-inspector`; los hallazgos del inspector son entrada de triaje y no cambian el bloqueo de la puerta de versión preliminar de complementos (Plugin Prerelease).

## QA Lab

QA Lab tiene carriles de CI dedicados fuera del flujo de trabajo principal de alcance inteligente. La paridad de agentes está anidada bajo los arneses amplios de QA y lanzamiento, no un flujo de trabajo de solicitud de extracción independiente. Use `Full Release Validation` con `rerun_group=qa-parity` cuando la paridad debe ejecutarse con una ejecución de validación amplia.

- El flujo de trabajo `QA-Lab - All Lanes` se ejecuta todas las noches en `main` y mediante despacho manual; divide el carril de paridad simulada, el carril de Matrix en vivo y los carriles de Telegram y Discord en vivo como trabajos paralelos. Los trabajos en vivo utilizan el entorno `qa-live-shared`, y Telegram/Discord utilizan arrendamientos de Convex.

Las comprobaciones de lanzamiento ejecutan los carriles de transporte en vivo de Matrix y Telegram con el proveedor simulado determinista y modelos simulados calificados (`mock-openai/gpt-5.5` y `mock-openai/gpt-5.5-alt`) para que el contrato del canal quede aislado de la latencia del modelo en vivo y del inicio normal del proveedor del complemento. La puerta de enlace de transporte en vivo deshabilita la búsqueda de memoria porque la paridad de QA cubre el comportamiento de la memoria por separado; la conectividad del proveedor está cubierta por las suites separadas de modelo en vivo, proveedor nativo y proveedor Docker.

Matrix utiliza `--profile fast` para las puertas programadas y de lanzamiento, añadiendo `--fail-fast` solo cuando el CLI extraído lo admite. El valor predeterminado del CLI y la entrada del flujo de trabajo manual siguen siendo `all`; el despacho manual `matrix_profile=all` siempre divide la cobertura completa de Matrix en los trabajos `transport`, `media`, `e2ee-smoke`, `e2ee-deep` y `e2ee-cli`.

`OpenClaw Release Checks` también ejecuta los carriles del QA Lab críticos para el lanzamiento antes de la aprobación del mismo; su puerta de paridad de QA ejecuta los paquetes candidato y de referencia como trabajos de carril paralelos, y luego descarga ambos artefactos en un pequeño trabajo de informe para la comparación final de paridad.

Para los PRs normales, siga la evidencia de CI/comprobación con alcance en lugar de tratar la paridad como un estado requerido.

## CodeQL

El flujo de trabajo `CodeQL` es intencionalmente un escáner de seguridad de primer paso estrecho, no un barrido completo del repositorio. Las ejecuciones diarias, manuales y de guardia de solicitudes de extracción que no sean borradores escanean el código del flujo de trabajo de Actions más las superficies de JavaScript/TypeScript de mayor riesgo con consultas de seguridad de alta confianza filtradas para `security-severity` alta/crítica.

El guardia de solicitud de extracción se mantiene ligero: solo se inicia para cambios bajo `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` o `src`, y ejecuta la misma matriz de seguridad de alta confianza que el flujo de trabajo programado. CodeQL para Android y macOS se mantiene fuera de los valores predeterminados de PR.

### Categorías de seguridad

| Categoría                                         | Superficie                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Línea base de autenticación, secretos, sandbox, cron y puerta de enlace                                                                                                                     |
| `/codeql-security-high/channel-runtime-boundary`  | Contratos de implementación del canal central más el tiempo de ejecución del complemento del canal, puerta de enlace, Plugin SDK, secretos, puntos de contacto de auditoría                 |
| `/codeql-security-high/network-ssrf-boundary`     | Superficies de política SSRF central, análisis de IP, guardián de red, recuperación web y SSRF del Plugin SDK                                                                               |
| `/codeql-security-high/mcp-process-tool-boundary` | Servidores MCP, asistentes de ejecución de procesos, entrega saliente y puertas de ejecución de herramientas de agente                                                                      |
| `/codeql-security-high/plugin-trust-boundary`     | Instalación de complementos, cargador, manifiesto, registro, instalación del administrador de paquetes, carga de fuentes y superficies de confianza del contrato de paquetes del Plugin SDK |

### Fragmentos de seguridad específicos de la plataforma

- `CodeQL Android Critical Security` — fragmento de seguridad de Android programado. Compila la aplicación de Android manualmente para CodeQL en el ejecutor de Linux Blacksmith más pequeño aceptado por la cordura del flujo de trabajo. Carga bajo `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — fragmento de seguridad de macOS semanal/manual. Compila la aplicación de macOS manualmente para CodeQL en Blacksmith macOS, filtra los resultados de compilación de dependencias del SARIF cargado y carga bajo `/codeql-critical-security/macos`. Se mantiene fuera de los valores predeterminados diarios porque la compilación de macOS domina el tiempo de ejecución incluso cuando está limpia.

### Categorías de calidad crítica

`CodeQL Critical Quality` es el fragmento no relacionado con la seguridad correspondiente. Ejecuta consultas de calidad de JavaScript/TypeScript de solo gravedad de error y no relacionadas con la seguridad sobre superficies de alto valor estrechas en el runner de Linux Blacksmith más pequeño. Su protector de Pull Request es intencionalmente más pequeño que el perfil programado: las PRs que no son borradores solo ejecutan los fragmentos `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` y `plugin-sdk-reply-runtime` coincidentes para cambios en el código de ejecución y envío de respuesta de comando/modelo/herramienta del agente, código de esquema/migración/E/S de configuración, código de autenticación/secrets/sandbox/seguridad, tiempo de ejecución del plugin del canal principal y del canal incluido, protocolo de pasarela/método de servidor, pegamento de tiempo de ejecución/SDK de memoria, entrega MCP/proceso/saliente, catálogo de modelo/tiempo de ejecución del proveedor, diagnósticos de sesión/colas de entrega, cargador de complementos, contrato de paquete/SDK de complemento o cambios en el tiempo de ejecución de respuesta del SDK de complemento. Los cambios en la configuración de CodeQL y en el flujo de trabajo de calidad ejecutan los doce fragmentos de calidad de PR.

El envío manual acepta:

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Los perfiles estrechos son ganchos de enseñanza/iteración para ejecutar un fragmento de calidad de forma aislada.

| Categoría                                               | Superficie                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Código de límite de seguridad de puerta de enlace, cron, sandbox, secretos y autenticación                                                                                                                                                |
| `/codeql-critical-quality/config-boundary`              | Esquema de configuración, migración, normalización y contratos de E/S                                                                                                                                                                     |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Esquemas de protocolo de puerta de enlace y contratos de método de servidor                                                                                                                                                               |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contratos de implementación del complemento del canal central y del canal incluido                                                                                                                                                        |
| `/codeql-critical-quality/agent-runtime-boundary`       | Ejecución de comandos, despacho de modelo/proveedor, despacho y colas de respuesta automática y contratos de tiempo de ejecución del plano de control de ACP                                                                              |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Servidores MCP y puentes de herramientas, auxiliares de supervisión de procesos y contratos de entrega saliente                                                                                                                           |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK de host de memoria, fachadas de tiempo de ejecución de memoria, alias del Plugin SDK de memoria, pegamento de activación de tiempo de ejecución de memoria y comandos de doctor de memoria                                            |
| `/codeql-critical-quality/session-diagnostics-boundary` | Aspectos internos de la cola de respuesta, colas de entrega de sesión, asistentes de vinculación/entrega de sesión saliente, superficies de paquetes de eventos/registros de diagnóstico y contratos de CLI del médico de sesiones        |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Despacho de respuestas entrantes del SDK de complementos, asistentes de carga útil/fragmentación/ejecución de respuestas, opciones de respuestas de canal, colas de entrega y asistentes de vinculación de sesión/hilo                    |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalización del catálogo de modelos, autenticación y descubrimiento de proveedores, registro de tiempo de ejecución de proveedores, valores predeterminados/catálogos de proveedores y registros de web/búsqueda/obtención/incrustación |
| `/codeql-critical-quality/ui-control-plane`             | Arranque de la interfaz de usuario de control, persistencia local, flujos de control de puerta de enlace y contratos de tiempo de ejecución del plano de control de tareas                                                                |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Búsqueda/obtención web principal, E/S de medios, comprensión de medios, generación de imágenes y contratos de tiempo de ejecución de generación de medios                                                                                 |
| `/codeql-critical-quality/plugin-boundary`              | Contratos de cargador, registro, superficie pública y punto de entrada del SDK de complementos                                                                                                                                            |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Fuente del SDK de complementos del lado del paquete publicado y asistentes de contratos de paquetes de complementos                                                                                                                       |

La calidad se mantiene separada de la seguridad para que los hallazgos de calidad se puedan programar, medir, deshabilitar o expandir sin oscurecer la señal de seguridad. La expansión de CodeQL para Swift, Python y complementos integrados debe volver a agregarse como trabajo de seguimiento con alcance o particionado solo después de que los perfiles estrechos tengan un tiempo de ejecución y una señal estables.

## Flujos de trabajo de mantenimiento

### Docs Agent

El flujo de trabajo `Docs Agent` es un carril de mantenimiento de Codex controlado por eventos para mantener la documentación existente alineada con los cambios recientes. No tiene un horario estricto: una ejecución de CI de push exitosa que no sea de un bot en `main` puede activarlo, y un envío manual puede ejecutarlo directamente. Las invocaciones de ejecución del flujo de trabajo se omiten cuando `main` ha avanzado o cuando se creó otra ejecución del Docs Agent no omitida en la última hora. Cuando se ejecuta, revisa el rango de confirmaciones desde el SHA de origen del Docs Agent no omitido anterior hasta el `main` actual, por lo que una ejecución por hora puede cubrir todos los cambios principales acumulados desde el último paso de documentación.

### Test Performance Agent

El flujo de trabajo `Test Performance Agent` es un carril de mantenimiento de Codex controlado por eventos para pruebas lentas. No tiene un horario estricto: una ejecución de CI de push exitosa que no sea de un bot en `main` puede activarlo, pero se omite si otra invocación de ejecución del flujo de trabajo ya se ejecutó o se está ejecutando ese día UTC. El envío manual omite esa puerta de actividad diaria. El carril genera un informe de rendimiento de Vitest agrupado de suite completa, permite que Codex realice solo pequeñas correcciones de rendimiento de pruebas que preserven la cobertura en lugar de refactorizaciones amplias, luego vuelve a ejecutar el informe de suite completa y rechaza los cambios que reducen el recuento de pruebas de referencia aprobadas. Si la referencia tiene pruebas fallidas, Codex puede corregir solo los fallos obvios y el informe de suite completa posterior al agente debe pasar antes de que se confirme algo. Cuando `main` avanza antes de que aterrice el push del bot, el carril hace rebase sobre el parche validado, vuelve a ejecutar `pnpm check:changed` y reintenta el push; los parches obsoletos en conflicto se omiten. Usa Ubuntu alojado en GitHub para que la acción de Codex pueda mantener la misma postura de seguridad de drop-sudo que el agente de documentos.

### PR duplicadas después de la fusión

El flujo de trabajo `Duplicate PRs After Merge` es un flujo de trabajo manual para los mantenedores para la limpieza de duplicados posteriores a la integración. De forma predeterminada, se ejecuta en modo de prueba (dry-run) y solo cierra los PR listados explícitamente cuando `apply=true`. Antes de modificar GitHub, verifica que el PR integrado se haya fusionado y que cada duplicado tenga un problema de referencia compartido o fragmentos de cambios superpuestos.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Puertas de verificación locales y enrutamiento de cambios

La lógica local de carriles cambiados reside en `scripts/changed-lanes.mjs` y es ejecutada por `scripts/check-changed.mjs`. Esa puerta de comprobación local es más estricta con los límites de la arquitectura que el alcance amplio de la plataforma CI:

- los cambios de producción de core ejecutan core prod y core test typecheck más core lint/guards;
- los cambios solo de pruebas de core ejecutan solo core test typecheck más core lint;
- los cambios de producción de extension ejecutan extension prod y extension test typecheck más extension lint;
- los cambios solo de pruebas de extension ejecutan extension test typecheck más extension lint;
- los cambios en el SDK público de complementos o en el contrato de complementos se expanden a la verificación de tipos de extension porque las extensiones dependen de esos contratos principales (los barridos de extensiones de Vitest siguen siendo trabajo de pruebas explícito);
- los incrementos de versión solo de metadatos de lanzamiento ejecutan comprobaciones de versión/configuración/dependencias-raíz específicas;
- los cambios desconocidos en root/config fallan de forma segura en todos los carriles de comprobación.

El enrutamiento local de pruebas cambiadas reside en `scripts/test-projects.test-support.mjs` y es intencionalmente más económico que `check:changed`: las ediciones directas de pruebas se ejecutan a sí mismas, las ediciones de fuente prefieren mapeos explícitos, luego pruebas hermanas y dependientes del grafo de importación. La configuración de entrega de salas de grupo compartido es uno de los mapeos explícitos: los cambios en la configuración de respuesta visible del grupo, el modo de entrega de respuesta de origen o el sistema de la herramienta de mensajes se dirigen a través de las pruebas de respuesta central más regresiones de entrega de Discord y Slack para que un cambio predeterminado compartido falle antes del primer push de PR. Use `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el cambio sea lo suficientemente amplio en el harness como para que el conjunto mapeado económico no sea un proxy confiable.

## Validación de Testbox

Crabbox es el contenedor de caja remota propiedad del repositorio para la prueba de Linux de mantenedor. Úselo desde la raíz del repositorio cuando una comprobación sea demasiado amplia para un bucle de edición local, cuando importa la paridad de CI, o cuando la prueba necesita secretos, Docker, carriles de paquetes, cajas reutilizables o registros remotos. El backend normal de OpenClaw es `blacksmith-testbox`; la capacidad propia de AWS/Hetzner es un respaldo para cortes de Blacksmith, problemas de cuota o pruebas explícitas de capacidad propia.

Las ejecuciones de Blacksmith respaldadas por Crabbox calientan, reclaman, sincronizan, ejecutan, reportan y limpian Testboxes desechables. La comprobación de integridad de sincronización integrada falla rápido cuando los archivos raíz requeridos como `pnpm-lock.yaml` desaparecen o cuando `git status --short` muestra al menos 200 eliminaciones rastreadas. Para PRs con eliminaciones grandes intencionales, establezca `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` para el comando remoto.

Crabbox también termina una invocación local del CLI de Blacksmith que permanece en la fase de sincronización durante más de cinco minutos sin salida posterior a la sincronización. Establezca `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` para deshabilitar ese guardia, o use un valor mayor en milisegundos para diffs locales inusualmente grandes.

Antes de una primera ejecución, verifique el contenedor desde la raíz del repositorio:

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

El contenedor del repositorio rechaza un binario Crabbox obsoleto que no anuncia `blacksmith-testbox`. Pase el proveedor explícitamente aunque `.crabbox.yaml` tenga valores predeterminados para nubes propiedad propia. En los árboles de trabajo de Codex o en los checkouts vinculados/parciales, evite el script `pnpm crabbox:run` local porque pnpm puede conciliar las dependencias antes de que Crabbox se inicie; en su lugar, invoque el contenedor de nodo directamente:

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

Cambio de puerta:

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
```

Nueva ejecución de prueba enfocada:

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test <path-or-filter>"
```

Suite completa:

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test"
```

Lea el resumen JSON final. Los campos útiles son `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` y `totalMs`. Las ejecuciones de Crabbox respaldadas por Blacksmith de un solo disparo deben detener el Testbox automáticamente; si una ejecución se interrumpe o la limpieza no está clara, inspeccione los cuadros en vivo y detenga solo los cuadros que creó:

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

Use la reutilización (reuse) solo cuando intencionalmente necesite múltiples comandos en la misma caja hidratada:

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

Si Crabbox es la capa rota pero Blacksmith funciona, use Blacksmith
directo solo para diagnósticos como `list`, `status` y limpieza. Corrija la
ruta de Crabbox antes de tratar una ejecución directa de Blacksmith como una prueba de mantenimiento.

Si `blacksmith testbox list --all` y `blacksmith testbox status` funcionan pero los nuevos
calentamientos se quedan `queued` sin IP ni URL de ejecución de Actions después de un par de minutos,
trátelo como presión del proveedor, la cola, la facturación o el límite de la organización de Blacksmith. Detenga los
identificadores en cola que creó, evite iniciar más Testboxes y mueva la prueba a la
ruta de capacidad de Crabbox propiedad propia a continuación mientras alguien verifica el panel de Blacksmith,
la facturación y los límites de la organización.

Escale a la capacidad Crabbox propia solo cuando Blacksmith está caído, limitado por cuota, sin el entorno necesario, o la capacidad propia es explícitamente el objetivo:

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Bajo presión de AWS, evita `class=beast` a menos que la tarea realmente necesite CPU de clase 48xlarge. Una solicitud `beast` comienza en 192 vCPUs y es la forma más fácil de exceder la cuota regional de EC2 Spot o estándar bajo demanda. El `.crabbox.yaml` propio del repositorio tiene como valores predeterminados `standard`, múltiples regiones de capacidad y `capacity.hints: true` para que los arrendamientos intermediados de AWS impriman la región/mercado seleccionado, la presión de la cuota, la reserva de Spot y las advertencias de clase de alta presión. Usa `fast` para comprobaciones amplias más pesadas, `large` solo después de que estándar/rápido no sean suficientes, y `beast` solo para carriles excepcionales limitados por CPU, como matrices de Docker de suite completa o todos los complementos, validación explícita de versiones/bloqueos, o perfilado de rendimiento de múltiples núcleos. No uses `beast` para `pnpm check:changed`, pruebas enfocadas, trabajo solo de documentación, lint/typecheck ordinarios, reproducciones E2E pequeñas o triaje de interrupciones de Blacksmith. Usa `--market on-demand` para el diagnóstico de capacidad para que la rotación del mercado Spot no se mezcle con la señal.

`.crabbox.yaml` posee los valores predeterminados de proveedor, sincronización e hidratación de GitHub Actions para los carriles de nube propiedad de la organización. Excluye `.git` local para que el checkout hidratado de Actions mantenga sus propios metadatos remotos de Git en lugar de sincronizar los remotos locales del mantenedor y los almacenes de objetos, y excluye los artefactos de tiempo de ejecución/construcción locales que nunca deben transferirse. `.github/workflows/crabbox-hydrate.yml` posee el checkout, la configuración de Node/pnpm, la recuperación `origin/main` y el traspaso de entorno no secreto para los comandos `crabbox run --id <cbx_id>` de nube propiedad de la organización.

## Relacionado

- [Descripción general de la instalación](/es/install)
- [Canales de desarrollo](/es/install/development-channels)
