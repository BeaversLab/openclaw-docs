---
summary: "Gráfico de trabajos de CI, puertas de alcance, paraguas de lanzamiento y equivalentes de comandos locales"
title: "Canalización de CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI de OpenClaw se ejecuta en cada push a `main` y en cada pull request. El trabajo `preflight` clasifica el diff y desactiva los carriles costosos cuando solo cambiaron áreas no relacionadas. Las ejecuciones manuales de `workflow_dispatch` omiten intencionalmente el alcance inteligente y despliegan el gráfico completo para candidatos de lanzamiento y validaciones amplias. Los carriles de Android permanecen opt-in a través de `include_android`. La cobertura de plugins solo para lanzamientos reside en el flujo de trabajo separado [`Plugin Prerelease`](#plugin-prerelease) y solo se ejecuta desde [`Full Release Validation`](#full-release-validation) o un despacho manual explícito.

## Descripción general de la canalización

| Trabajo                          | Propósito                                                                                                                                         | Cuándo se ejecuta                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `preflight`                      | Detectar cambios solo en documentos, alcances modificados, extensiones modificadas y construir el manifiesto de CI                                | Siempre en pushes y PRs que no sean borradores |
| `security-scm-fast`              | Detección de claves privadas y auditoría de flujo de trabajo a través de `zizmor`                                                                 | Siempre en pushes y PRs que no sean borradores |
| `security-dependency-audit`      | Auditoría de lockfile de producción sin dependencias contra avisos de npm                                                                         | Siempre en pushes y PRs que no sean borradores |
| `security-fast`                  | Agregado requerido para los trabajos de seguridad rápidos                                                                                         | Siempre en pushes y PRs que no sean borradores |
| `check-dependencies`             | Pase de producción Knip solo de dependencias más el guardián de lista de permitidos de archivos no utilizados                                     | Cambios relevantes de Node                     |
| `build-artifacts`                | Construir `dist/`, Interfaz de usuario de Control, comprobaciones de artefactos construidos y artefactos descendentes reutilizables               | Cambios relevantes de Node                     |
| `checks-fast-core`               | Carriles de corrección rápida de Linux como comprobaciones bundled/plugin-contract/protocol                                                       | Cambios relevantes de Node                     |
| `checks-fast-contracts-channels` | Comprobaciones de contrato de canal fragmentadas con un resultado de comprobación agregada estable                                                | Cambios relevantes de Node                     |
| `checks-node-core-test`          | Fragmentos de prueba de Core Node, excluyendo carriles de canal, bundled, contract y extensiones                                                  | Cambios relevantes de Node                     |
| `check`                          | Equivalente de puerta de enlace local principal fragmentada: tipos de prod, lint, guards, tipos de pruebas y smoke estricto                       | Cambios relevantes para Node                   |
| `check-additional`               | Arquitectura, desviación de límite/prompt fragmentado, guards de extensión, límite de paquete y gateway watch                                     | Cambios relevantes para Node                   |
| `build-smoke`                    | Pruebas smoke de CLI integrada y smoke de memoria de inicio                                                                                       | Cambios relevantes para Node                   |
| `checks`                         | Verificador para pruebas de canal de artefactos integrados                                                                                        | Cambios relevantes para Node                   |
| `checks-node-compat-node22`      | Carril de compilación y pruebas de compatibilidad con Node 22                                                                                     | Despacho manual de CI para releases            |
| `check-docs`                     | Formato de documentos, lint y comprobaciones de enlaces rotos                                                                                     | Documentos cambiados                           |
| `skills-python`                  | Ruff + pytest para habilidades respaldadas por Python                                                                                             | Cambios relevantes para habilidades de Python  |
| `checks-windows`                 | Pruebas de proceso/ruta específicas de Windows más regresiones de especificador de importación de tiempo de ejecución compartido                  | Cambios relevantes para Windows                |
| `macos-node`                     | Carril de pruebas de TypeScript en macOS utilizando los artefactos integrados compartidos                                                         | Cambios relevantes para macOS                  |
| `macos-swift`                    | Lint, compilación y pruebas de Swift para la aplicación macOS                                                                                     | Cambios relevantes para macOS                  |
| `android`                        | Pruebas unitarias de Android para ambos sabores más una compilación de APK de depuración                                                          | Cambios relevantes para Android                |
| `test-performance-agent`         | Optimización de pruebas lentas diarias de Codex después de la actividad de confianza                                                              | Éxito de CI principal o despacho manual        |
| `openclaw-performance`           | Informes de rendimiento de tiempo de ejecución de Kova diarios/bajo demanda con proveedor simulado, perfil profundo y carriles en vivo de GPT 5.4 | Despacho programado y manual                   |

## Orden de fail-fast

1. `preflight` decide qué carriles existen en absoluto. La lógica de `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de artefactos y matrices de plataformas.
3. `build-artifacts` se superpone a los carriles rápidos de Linux para que los consumidores descend puedan comenzar tan pronto como la compilación compartida esté lista.
4. Después de eso, se ramifican los carriles más pesados de plataforma y tiempo de ejecución: `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-core-test`, `checks`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

GitHub puede marcar los trabajos obsoletos como `cancelled` cuando llega un nuevo envío al mismo PR o a la referencia `main`. Trátelo como ruido de CI a menos que la ejecución más reciente para la misma referencia también esté fallando. Las comprobaciones de fragmentos agregados usan `!cancelled() && always()` para que sigan informando fallos normales de fragmentos, pero no se ponen en cola después de que todo el flujo de trabajo ya haya sido reemplazado. La clave de concurrencia de CI automática está versionada (`CI-v7-*`) para que un zombie en el lado de GitHub en un grupo de cola antiguo no pueda bloquear indefinidamente las nuevas ejecuciones de main. Las ejecuciones manuales de suite completa usan `CI-manual-v1-*` y no cancelan las ejecuciones en curso.

El trabajo `ci-timings-summary` carga un artefacto compacto `ci-timings-summary` para cada ejecución de CI que no sea borrador. Registra el tiempo de reloj, el tiempo de cola, los trabajos más lentos y los trabajos fallidos para la ejecución actual, por lo que las comprobaciones de estado de CI no necesitan raspar el payload completo de Actions repetidamente.

## Ámbito y enrutamiento

La lógica del ámbito reside en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`. El envío manual omite la detección del ámbito modificado y hace que el manifiesto de preflight actúe como si hubiera cambiado cada área con ámbito.

- **Ediciones del flujo de trabajo de CI** validan el grafo de CI de Node más el linting del flujo de trabajo, pero no fuerzan por sí solas las compilaciones nativas de Windows, Android o macOS; esos carriles de plataforma permanecen limitados a los cambios en el código fuente de la plataforma.
- **Las ediciones solo de enrutamiento de CI, ediciones seleccionadas de accesorios de pruebas básicas económicas y ediciones de enrutamiento de pruebas/asistentes de contratos de complementos estrechos** utilizan una ruta de manifiesto rápida solo de Node: `preflight`, seguridad y una única tarea `checks-fast-core`. Esa ruta omite los artefactos de compilación, la compatibilidad con Node 22, los contratos de canal, los fragmentos principales completos, los fragmentos de complementos empaquetados y las matrices de guardia adicionales cuando el cambio se limita a las superficies de enrutamiento o auxiliares que la tarea rápida ejerce directamente.
- **Las comprobaciones de Windows Node** están limitadas a los contenedores de proceso/ruta específicos de Windows, los asistentes de ejecutor npm/pnpm/UI, la configuración del administrador de paquetes y las superficies del flujo de trabajo de CI que ejecutan ese carril; los cambios no relacionados de fuente, complemento, install-smoke y solo de prueba permanecen en los carriles de Linux Node.

Las familias de pruebas de Node más lentas se dividen o equilibran para que cada trabajo se mantenga pequeño sin sobre-reservar runners: los contratos de canal se ejecutan como tres shards respaldados por Blacksmith y ponderados con el respaldo estándar del runner de GitHub, los carriles unitarios rápidos/de soporte principales se ejecutan por separado, la infraestructura de tiempo de ejecución principal se divide entre shards de estado, proceso/configuración, cron y compartidos, auto-respuesta se ejecuta como trabajadores equilibrados (con el subárbol de respuesta dividido en shards de agent-runner, despacho y comandos/enrutamiento de estado), y las configuraciones de puerta de enlace/servidor agénticas se dividen entre los carriles de chat/auth/model/http-plugin/runtime/startup en lugar de esperar a que se construyan los artefactos. Las pruebas amplias de navegador, QA, multimedia y complementos varios usan sus configuraciones dedicadas de Vitest en lugar del complemento general compartido. Los shards de patrón de inclusión registran entradas de tiempo utilizando el nombre del shard de CI, por lo que `.artifacts/vitest-shard-timings.json` puede distinguir una configuración completa de un shard filtrado. `check-additional` mantiene juntos el trabajo de compilación/prueba canary de límite de paquete y separa la arquitectura de topología de tiempo de ejecución de la cobertura de vigilancia de la puerta de enlace; la lista de guardias del límite se distribuye en cuatro shards de matriz, cada uno ejecutando guardias independientes seleccionados simultáneamente e imprimiendo tiempos por verificación. La costosa verificación de deriva de instantáneas de mensaje de ruta feliz de Codex se ejecuta como su propio trabajo adicional para CI manual y solo para cambios que afectan el mensaje, por lo que los cambios normales de Node no relacionados no esperan detrás de la generación en frío de instantáneas de mensaje y los shards de límite permanecen equilibrados mientras la deriva del mensaje aún está vinculada a la PR que la causó; el mismo indicador omite la generación de Vitest de instantáneas de mensaje dentro del shard de límite de soporte central de artefactos construidos. Gateway watch, las pruebas de canal y el shard de límite de soporte central se ejecutan simultáneamente dentro de `build-artifacts` después de que `dist/` y `dist-runtime/` ya se han construido.

La CI de Android ejecuta tanto `testPlayDebugUnitTest` como `testThirdPartyDebugUnitTest` y luego construye el APK de depuración de Play. La variante de terceros no tiene un conjunto de fuentes o manifiesto separado; su carril de pruebas unitarias todavía compila la variante con las banderas BuildConfig de registro de SMS/llamadas, evitando al mismo tiempo un trabajo de empaquetado duplicado del APK de depuración en cada envío relevante para Android.

El fragmento `check-dependencies` ejecuta `pnpm deadcode:dependencies` (un pase de producción de solo dependencias de Knip fijado a la última versión de Knip, con la edad mínima de lanzamiento de pnpm deshabilitada para la instalación `dlx`) y `pnpm deadcode:unused-files`, que compara los hallazgos de archivos no utilizados de producción de Knip contra `scripts/deadcode-unused-files.allowlist.mjs`. El guardia de archivos no utilizados falla cuando un PR agrega un nuevo archivo no utilizado sin revisar o deja una entrada obsoleta en la lista de permitidos, mientras preserva las superficies intencionales de complementos dinámicos, generados, de compilación, de pruebas en vivo y de puentes de paquetes que Knip no puede resolver estáticamente.

## Reenvío de actividad de ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` es el puente del lado objetivo desde la actividad del repositorio OpenClaw hacia ClawSweeper. No verifica ni ejecuta código de pull request no confiable. El flujo de trabajo crea un token de GitHub App desde `CLAWSWEEPER_APP_PRIVATE_KEY` y luego envía cargas útiles compactas `repository_dispatch` a `openclaw/clawsweeper`.

El flujo de trabajo tiene cuatro carriles:

- `clawsweeper_item` para solicitudes exactas de revisión de incidencias y pull requests;
- `clawsweeper_comment` para comandos explícitos de ClawSweeper en comentarios de incidencias;
- `clawsweeper_commit_review` para solicitudes de revisión a nivel de confirmación en los envíos a `main`;
- `github_activity` para actividad general de GitHub que el agente ClawSweeper puede inspeccionar.

El carril `github_activity` reenvía solo metadatos normalizados: tipo de evento, acción, actor, repositorio, número de elemento, URL, título, estado y breves extractos para comentarios o revisiones cuando están presentes. Evita intencionalmente reenviar el cuerpo completo del webhook. El flujo de trabajo receptor en `openclaw/clawsweeper` es `.github/workflows/github-activity.yml`, que publica el evento normalizado en el enlace OpenClaw Gateway para el agente ClawSweeper.

La actividad general es observación, no entrega por defecto. El agente ClawSweeper recibe el objetivo de Discord en su solicitud y debe publicar en `#clawsweeper` solo cuando el evento es sorprendente, accionable, arriesgado o útil operacionalmente. Las aperturas rutinarias, ediciones, rotación de bots, ruido de webhooks duplicados y el tráfico normal de revisión deberían dar como resultado `NO_REPLY`.

Trate los títulos, comentarios, cuerpos, texto de revisión, nombres de ramas y mensajes de confirmación de GitHub como datos que no son de confianza en esta ruta. Son entradas para el resumen y la clasificación, no instrucciones para el flujo de trabajo o el tiempo de ejecución del agente.

## Despachos manuales

Los despachos manuales de CI ejecutan el mismo grafo de trabajos que la CI normal, pero fuerzan la activación de cada carril con ámbito que no sea de Android: fragmentos de Linux Node, fragmentos de complementos empaquetados, contratos de canal, compatibilidad con Node 22, `check`, `check-additional`, pruebas de humo de compilación, verificaciones de documentos, habilidades de Python, Windows, macOS e i18n de Control UI. Los despachos manuales independientes de CI ejecutan solo Android con `include_android=true`; el paraguas de versión completa habilita Android pasando `include_android=true`. Las verificaciones estáticas de versión preliminar de complementos, el fragmento `agentic-plugins` solo de versión, el barrido por lotes de extensiones completo y los carriles de Docker de versión preliminar de complementos se excluyen de la CI. La suite de versión preliminar de Docker se ejecuta solo cuando `Full Release Validation` despacha el flujo de trabajo separado `Plugin Prerelease` con la puerta de validación de versión habilitada.

Las ejecuciones manuales utilizan un grupo de concurrencia único para que la suite completa de candidatos a versión no se cancele por otro envío o ejecución de PR en la misma referencia. La entrada opcional `target_ref` permite a un llamador de confianza ejecutar ese grafo contra una rama, etiqueta o SHA de confirmación completo mientras usa el archivo de flujo de trabajo de la referencia de despacho seleccionada.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Trabajos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                   | `preflight`, trabajos de seguridad rápidos y agregados (`security-scm-fast`, `security-dependency-audit`, `security-fast`), verificaciones rápidas de protocolo/contrato/empaquetado, verificaciones fragmentadas de contratos de canal, fragmentos `check` excepto lint, agregados `check-additional`, verificadores de agregados de pruebas de Node, verificaciones de documentos, habilidades de Python, workflow-sanity, labeler, auto-response; install-smoke preflight también usa Ubuntu alojado en GitHub para que la matriz de Blacksmith pueda ponerse en cola antes |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, fragmentos de extensión de menor peso, `checks-fast-core`, `checks-node-compat-node22`, `check-prod-types` y `check-test-types`                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`, build-smoke, fragmentos de prueba de Linux Node, fragmentos de prueba de complementos incluidos, fragmentos `check-additional`, `android`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint` (lo suficientemente sensible a la CPU que 8 vCPU costaban más de lo que ahorraban); compilaciones Docker de install-smoke (el tiempo de espera en la cola de 32 vCPU costaba más de lo que ahorraba)                                                                                                                                                                                                                                                                                                                                                              |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` en `openclaw/openclaw`; los forks recurren a `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` en `openclaw/openclaw`; los forks recurren a `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

La CI del repositorio canónico mantiene a Blacksmith como la ruta de ejecutor predeterminada. Durante `preflight`, `scripts/ci-runner-labels.mjs` comprueba las ejecuciones de Actions en cola y en progreso recientes para buscar trabajos de Blacksmith en cola. Si una etiqueta específica de Blacksmith ya tiene trabajos en cola, los trabajos posteriores que usarían esa etiqueta exacta recurren al ejecutor alojado en GitHub correspondiente (`ubuntu-24.04`, `windows-2025` o `macos-latest`) solo para esa ejecución. Otros tamaños de Blacksmith en la misma familia de sistemas operativos se mantienen en sus etiquetas primarias. Si falla la sondeo de la API, no se aplica ningún respaldo.

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

El despacho manual normalmente evalúa el flujo de trabajo de referencia. Establezca `target_ref` para evaluar una etiqueta de lanzamiento u otra rama con la implementación actual del flujo de trabajo. Las rutas de los informes publicados y los punteros más recientes se codifican por la referencia probada, y cada `index.md` registra la referencia/SHA probada, la referencia/SHA del flujo de trabajo, la referencia de Kova, el perfil, el modo de autenticación de carril, el modelo, el recuento de repeticiones y los filtros de escenario.

El flujo de trabajo instala OCM desde una versión fijada y Kova desde `openclaw/Kova` en la entrada fijada `kova_ref`, y luego ejecuta tres carriles:

- `mock-provider`: escenarios de diagnóstico de Kova contra un tiempo de ejecución de compilación local con autenticación falsa determinista compatible con OpenAI.
- `mock-deep-profile`: perfilado de CPU/montón/traza para el inicio, la puerta de enlace y los puntos calientes del turno del agente.
- `live-gpt54`: un turno de agente `openai/gpt-5.4` de OpenAI real, omitido cuando `OPENAI_API_KEY` no está disponible.

El carril del proveedor simulado también ejecuta sondas de origen nativas de OpenClaw después del pase de Kova: tiempo de arranque y memoria de la puerta de enlace en los casos de inicio predeterminado, de enlace y de 50 complementos; bucles repetidos de saludo `channel-chat-baseline` de OpenAI simulado; y comandos de inicio de CLI contra la puerta de enlace iniciada. El resumen de Markdown de la sonda de origen se encuentra en `source/index.md` en el paquete del informe, con JSON sin procesar junto a él.

Cada carril carga artefactos de GitHub. Cuando se configura `CLAWGRIT_REPORTS_TOKEN`, el flujo de trabajo también confirma `report.json`, `report.md`, paquetes, `index.md` y artefactos de sonda de origen en `openclaw/clawgrit-reports` bajo `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. El puntero de referencia probada actual se escribe como `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validación completa de lanzamiento

`Full Release Validation` es el flujo de trabajo manual general para "ejecutar todo antes del lanzamiento". Acepta una rama, etiqueta o SHA de confirmación completo, despacha el flujo de trabajo manual `CI` con ese objetivo, despacha `Plugin Prerelease` para la verificación de complementos/paquetes/estáticos/Docker solo de lanzamiento, y despacha `OpenClaw Release Checks` para pruebas de instalación de humo, aceptación de paquetes, verificaciones de paquetes multi-OS, paridad de QA Lab, Matrix y carriles de Telegram. Las ejecuciones Estables/predeterminadas mantienen una cobertura exhaustiva de vivo/E2E y ruta de lanzamiento de Docker detrás de `run_release_soak=true`; `release_profile=full` fuerza esa cobertura de inmersión para que la validación consultiva amplia siga siendo amplia. Con `rerun_group=all` y `release_profile=full`, también ejecuta `NPM Telegram Beta E2E` contra el artefacto `release-package-under-test` de las verificaciones de lanzamiento. Después de publicar, pase `npm_telegram_package_spec` para volver a ejecutar el mismo carril de paquete de Telegram contra el paquete npm publicado.

Consulte [Validación completa de lanzamiento](/es/reference/full-release-validation) para obtener la
matriz de etapas, nombres exactos de trabajos de flujo de trabajo, diferencias de perfil, artefactos y
identificadores de reejecución centrados.

`OpenClaw Release Publish` es el flujo de trabajo de lanzamiento de mutación manual. Despáchelo
desde `release/YYYY.M.D` o `main` después de que exista la etiqueta de lanzamiento y después de que
el preflight de npm de OpenClaw haya tenido éxito. Verifica `pnpm plugins:sync:check`,
despacha `Plugin NPM Release` para todos los paquetes de complementos publicables, despacha
`Plugin ClawHub Release` para el mismo SHA de lanzamiento, y solo entonces despacha
`OpenClaw NPM Release` con el `preflight_run_id` guardado.

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Para una verificación de confirmación fijada en una rama de rápido movimiento, use el asistente en lugar de
`gh workflow run ... --ref main -f ref=<sha>`:

```bash
pnpm ci:full-release --sha <full-sha>
```

Las referencias de despacho de flujo de trabajo de GitHub deben ser ramas o etiquetas, no SHA de confirmaciones sin procesar. El
ayudante envía una rama temporal `release-ci/<sha>-...` en el SHA objetivo,
despacha `Full Release Validation` desde esa referencia fijada, verifica que cada flujo de trabajo
secundario `headSha` coincida con el objetivo y elimina la rama temporal cuando la
ejecución se completa. El verificador paraguas también falla si algún flujo de trabajo secundario se ejecutó en un
SHA diferente.

`release_profile` controla la amplitud de proveedor/en vivo que se pasa a las comprobaciones de lanzamiento. Los
flujos de trabajo de lanzamiento manual predeterminados son `stable`; use `full` solo cuando
intencionalmente desee la matriz amplia de proveedor/medios consultivos. `run_release_soak`
controla si las comprobaciones de lanzamiento estables/predeterminadas ejecutan la prueba exhaustiva de en vivo/E2E y
de ruta de lanzamiento de Docker; `full` fuerza la prueba activada.

- `minimum` mantiene los carriles más rápidos críticos para el lanzamiento de OpenAI/core.
- `stable` añade el conjunto estable de proveedores/backend.
- `full` ejecuta la matriz amplia de proveedor/medios consultivos.

El paraguas registra los ids de ejecuciones secundarias despachadas, y el trabajo final `Verify full validation` vuelve a verificar las conclusiones actuales de las ejecuciones secundarias y añade tablas de trabajos más lentos para cada ejecución secundaria. Si se vuelve a ejecutar un flujo de trabajo secundario y se vuelve verde, vuelva a ejecutar solo el trabajo de verificador principal para actualizar el resultado del paraguas y el resumen de tiempo.

Para la recuperación, tanto `Full Release Validation` como `OpenClaw Release Checks` aceptan `rerun_group`. Use `all` para un candidato de lanzamiento, `ci` solo para el hijo normal de CI completa, `plugin-prerelease` solo para el hijo de prelanzamiento del complemento, `release-checks` para cada hijo de lanzamiento, o un grupo más específico: `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` o `npm-telegram` en el paraguas. Esto mantiene acotada la nueva ejecución de un cuadro de lanzamiento fallido después de una corrección específica. Para un carril multi-OS fallido, combine `rerun_group=cross-os` con `cross_os_suite_filter`, por ejemplo `windows/packaged-upgrade`; los comandos multi-OS largos emiten líneas de latido y los resúmenes de actualización de paquetes incluyen cronometrajes por fase. Los carriles de verificación de lanzamiento de QA son consultivos, por lo que los fallos solo de QA avisan pero no bloquean el verificador de verificación de lanzamiento.

`OpenClaw Release Checks` usa la referencia de flujo de trabajo confiable para resolver la referencia seleccionada una vez en un archivo tar `release-package-under-test`, y luego pasa ese artefacto a las verificaciones multi-OS y Aceptación de Paquetes, además del flujo de trabajo Docker de ruta de lanzamiento en vivo/E2E cuando se ejecuta la cobertura de soaking. Eso mantiene los bytes del paquete consistentes en los cuadros de lanzamiento y evita reempaquetar el mismo candidato en múltiples trabajos hijos.

Las ejecuciones duplicadas de `Full Release Validation` para `ref=main` y `rerun_group=all`
sustituyen al paraguas anterior. El monitor principal cancela cualquier flujo de trabajo hijo que
ya haya despachado cuando se cancela el padre, por lo que la validación principal más nueva
no se queda detrás de una ejecución de verificación de lanzamiento de dos horas obsoleta. La validación de rama/etiqueta de lanzamiento
y los grupos de reejecución específicos mantienen `cancel-in-progress: false`.

## Fragmentos en vivo y E2E

El hijo en vivo/E2E de lanzamiento mantiene una cobertura nativa `pnpm test:live` amplia, pero la ejecuta como fragmentos con nombre a través de `scripts/test-live-shard.mjs` en lugar de un trabajo serial:

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
- dividir los fragmentos de audio y video de medios y los fragmentos de música filtrados por proveedor

Esto mantiene la misma cobertura de archivos al facilitar la reejecución y el diagnóstico de fallos lentos de proveedores en vivo. Los nombres de fragmentos agregados `native-live-extensions-o-z`, `native-live-extensions-media` y `native-live-extensions-media-music` siguen siendo válidos para reejecuciones manuales únicas.

Los fragmentos de medios en vivo nativos se ejecutan en `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construidos por el flujo de trabajo `Live Media Runner Image`. Esa imagen preinstala `ffmpeg` y `ffprobe`; los trabajos de medios solo verifican los binarios antes de la configuración. Mantenga las suites en vivo con respaldo de Docker en los ejecutores normales de Blacksmith: los trabajos de contenedores no son el lugar adecuado para lanzar pruebas Docker anidadas.

Los fragmentos de modelo/backend en vivo con respaldo de Docker usan una imagen `ghcr.io/openclaw/openclaw-live-test:<sha>` compartida separada por confirmación seleccionada. El flujo de trabajo de lanzamiento en vivo construye y envía esa imagen una vez, luego los fragmentos de modelo en vivo Docker, puerta de enlace fragmentada por proveedor, backend CLI, enlace ACP y arnés Codex se ejecutan con `OPENCLAW_SKIP_DOCKER_BUILD=1`. Los fragmentos Docker de Gateway llevan límites `timeout` explícitos a nivel de script por debajo del tiempo de espera del trabajo del flujo de trabajo, de modo que un contenedor atascado o una ruta de limpieza falle rápidamente en lugar de consumir todo el presupuesto de verificación de lanzamiento. Si esos fragmentos reconstruyen independently el objetivo Docker de fuente completa, la ejecución de lanzamiento está mal configurada y desperdiciará tiempo de reloj en compilaciones de imágenes duplicadas.

## Aceptación de Paquetes

Use `Package Acceptance` cuando la pregunta sea "¿funciona este paquete instalable de OpenClaw como producto?" Es diferente de la CI normal: la CI normal valida el árbol de fuentes, mientras que la aceptación de paquetes valida un único tarball a través del mismo arnés E2E Docker que los usuarios ejecutan después de la instalación o actualización.

### Trabajos

1. `resolve_package` verifica `workflow_ref`, resuelve un candidato de paquete, escribe `.artifacts/docker-e2e-package/openclaw-current.tgz`, escribe `.artifacts/docker-e2e-package/package-candidate.json`, carga ambos como el artefacto `package-under-test` e imprime el origen, la referencia del flujo de trabajo, la referencia del paquete, la versión, SHA-256 y el perfil en el resumen del paso de GitHub.
2. `docker_acceptance` llama a `openclaw-live-and-e2e-checks-reusable.yml` con `ref=workflow_ref` y `package_artifact_name=package-under-test`. El flujo de trabajo reutilizable descarga ese artefacto, valida el inventario de archivos tar, prepara las imágenes Docker de resumen de paquete cuando es necesario y ejecuta los carriles Docker seleccionados contra ese paquete en lugar de empaquetar la verificación del flujo de trabajo. Cuando un perfil selecciona múltiples `docker_lanes` dirigidos, el flujo de trabajo reutilizable prepara el paquete y las imágenes compartidas una vez, y luego distribuye esos carriles como trabajos Docker dirigidos en paralelo con artefactos únicos.
3. `package_telegram` opcionalmente llama a `NPM Telegram Beta E2E`. Se ejecuta cuando `telegram_mode` no es `none` e instala el mismo artefacto `package-under-test` cuando la Aceptación de Paquetes resolvió uno; el despacho independiente de Telegram aún puede instalar una especificación npm publicada.
4. `summary` hace fallar el flujo de trabajo si la resolución del paquete, la aceptación de Docker o el carril opcional de Telegram fallaron.

### Fuentes de candidatos

- `source=npm` acepta solo `openclaw@beta`, `openclaw@latest` o una versión de lanzamiento exacta de OpenClaw como `openclaw@2026.4.27-beta.2`. Úselo para la aceptación de versiones preliminares/estables publicadas.
- `source=ref` empaqueta una rama `package_ref` de confianza, etiqueta o SHA de confirmación completo. El resolvedor obtiene ramas/etiquetas de OpenClaw, verifica que la confirmación seleccionada sea alcanzable desde el historial de ramas del repositorio o una etiqueta de lanzamiento, instala dependencias en un árbol de trabajo separado y lo empaqueta con `scripts/package-openclaw-for-docker.mjs`.
- `source=url` descarga un HTTPS `.tgz`; se requiere `package_sha256`.
- `source=artifact` descarga un `.tgz` de `artifact_run_id` y `artifact_name`; `package_sha256` es opcional pero debe proporcionarse para los artefactos compartidos externamente.

Mantenga `workflow_ref` y `package_ref` separados. `workflow_ref` es el código de flujo de trabajo/harness de confianza que ejecuta la prueba. `package_ref` es la confirmación de origen que se empaqueta cuando `source=ref`. Esto permite que el arnés de prueba actual valide confirmaciones de origen de confianza más antiguas sin ejecutar lógica de flujo de trabajo antigua.

### Perfiles de suites

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` más `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — fragmentos completos de la ruta de lanzamiento de Docker con OpenWebUI
- `custom` — `docker_lanes` exacto; obligatorio cuando `suite_profile=custom`

El perfil `package` utiliza cobertura de complementos sin conexión para que la validación de paquetes publicados no esté condicionada a la disponibilidad en vivo de ClawHub. El carril opcional de Telegram reutiliza el artefacto `package-under-test` en `NPM Telegram Beta E2E`, manteniendo la ruta de especificación npm publicada para envíos independientes.

Para conocer la política dedicada de pruebas de actualizaciones y complementos, incluidos los comandos locales,
carriles de Docker, entradas de aceptación de paquetes, valores predeterminados de lanzamiento y clasificación de fallas,
consulte [Probar actualizaciones y complementos](/es/help/testing-updates-plugins).

Las comprobaciones de lanzamiento llaman a Package Acceptance con `source=artifact`, el artefacto del paquete de lanzamiento preparado, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` y `telegram_mode=mock-openai`. Esto mantiene la migración del paquete, la actualización, la instalación de la habilidad live ClawHub, la limpieza de dependencias de complementos obsoletos, la reparación de la instalación de complementos configurados, el complemento sin conexión, la actualización del complemento y la prueba de Telegram en el mismo archivo tar del paquete resuelto. Establezca `package_acceptance_package_spec` en Full Release Validation u OpenClaw Release Checks para ejecutar esa misma matriz contra un paquete npm enviado en lugar del artefacto construido por SHA. Las comprobaciones de lanzamiento multi-SO aún cubren el incorporado específico del SO, el instalador y el comportamiento de la plataforma; la validación del producto paquete/actualización debería comenzar con Package Acceptance. El carril Docker `published-upgrade-survivor` valida una línea base de paquete publicado por ejecución en la ruta de lanzamiento bloqueante. En Package Acceptance, el archivo tar `package-under-test` resuelto es siempre el candidato y `published_upgrade_survivor_baseline` selecciona la línea base publicada de reserva, por defecto `openclaw@latest`; los comandos de reejecución de carril fallido preservan esa línea base. Full Release Validation con `run_release_soak=true` o `release_profile=full` establece `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` y `published_upgrade_survivor_scenarios=reported-issues` para expandirse a través de las cuatro últimas versiones estables de npm más las versiones de límite de compatibilidad de complementos anclados y accesorios con forma de problema para la configuración de Feishu, archivos de arranque/persona conservados, instalaciones de complementos OpenClaw configuradas, rutas de registro de tilde y raíces de dependencias de complementos heredados obsoletos. Las selecciones de supervivientes de actualización publicada de línea base múltiple se fragmentan por línea base en trabajos separados de ejecutor Docker específicos. El flujo de trabajo separado `Update Migration` utiliza el carril Docker `update-migration` con `all-since-2026.4.23` y `plugin-deps-cleanup` cuando la pregunta es la limpieza exhaustiva de actualización publicada, no la amplitud normal de Full Release CI. Las ejecuciones agregadas locales pueden pasar especificaciones exactas de paquete con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, mantener un solo carril con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` como `openclaw@2026.4.15`, o establecer `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` para la matriz de escenarios. El carril publicado configura la línea base con una receta de comando `openclaw config set` integrada, registra los pasos de la receta en `summary.json` y sondea `/healthz`, `/readyz`, más el estado de RPC después del inicio de Gateway. Los carriles frescos empaquetados e instalador de Windows también verifican que un paquete instalado pueda importar una anulación de control de navegador desde una ruta absoluta de Windows sin formato. La prueba de humo de turno de agente multi-SO de OpenAI tiene por defecto `OPENCLAW_CROSS_OS_OPENAI_MODEL` si se establece, de lo contrario `openai/gpt-5.4`, por lo que la prueba de instalación y puerta de enlace se mantiene en un modelo de prueba GPT-5 evitando los valores predeterminados de GPT-4.x.

### Ventanas de compatibilidad heredada

Package Acceptance tiene ventanas de compatibilidad heredadas delimitadas para paquetes ya publicados. Los paquetes hasta `2026.4.25`, incluyendo `2026.4.25-beta.*`, pueden usar la ruta de compatibilidad:

- las entradas de QA privadas conocidas en `dist/postinstall-inventory.json` pueden apuntar a archivos omitidos del tarball;
- `doctor-switch` puede omitir el subcaso de persistencia `gateway install --wrapper` cuando el paquete no expone esa marca;
- `update-channel-switch` puede eliminar los `pnpm.patchedDependencies` faltantes del accesorio falso de git derivado del tarball y puede registrar los `update.channel` persistentes faltantes;
- las pruebas de humo de plugins pueden leer ubicaciones de registros de instalación heredadas o aceptar la falta de persistencia del registro de instalación del marketplace;
- `plugin-update` puede permitir la migración de metadatos de configuración y aún así requerir que el registro de instalación y el comportamiento de no reinstalación permanezcan sin cambios.

El paquete publicado `2026.4.26` también puede advertir sobre los archivos de marca de metadatos de compilación local que ya se han enviado. Los paquetes posteriores deben satisfacer los contratos modernos; las mismas condiciones fallan en lugar de advertir u omitir.

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

Al depurar una ejecución fallida de aceptación de paquetes, comience con el resumen de `resolve_package` para confirmar la fuente, la versión y el SHA-256 del paquete. Luego inspeccione la ejecución secundaria `docker_acceptance` y sus artefactos de Docker: `.artifacts/docker-tests/**/summary.json`, `failures.json`, registros de carril, tiempos de fase y comandos de reejecución. Se prefiere volver a ejecutar el perfil del paquete fallido o los carriles exactos de Docker en lugar de volver a ejecutar la validación completa de la versión.

## Prueba de humo de instalación

El flujo de trabajo separado `Install Smoke` reutiliza el mismo script de alcance a través de su propio trabajo `preflight`. Divide la cobertura de prueba de humo en `run_fast_install_smoke` y `run_full_install_smoke`.

- Las ejecuciones de **Fast path** (ruta rápida) son para pull requests que tocan superficies de Docker/paquetes, cambios en el paquete/manifesto del complemento empaquetado, o superficies del complemento central/canal/pasarela/Plugin SDK que ejercen los trabajos de pruebas de humo (smoke jobs) de Docker. Los cambios de complementos empaquetados solo de código fuente, ediciones solo de pruebas y ediciones solo de documentación no reservan trabajadores de Docker. La ruta rápida crea la imagen del Dockerfile raíz una vez, verifica la CLI, ejecuta los agentes delete shared-workspace CLI smoke, ejecuta la e2e de red de pasarela de contenedores, verifica un argumento de compilación de extensión empaquetada y ejecuta el perfil de Docker del complemento empaquetado delimitado bajo un tiempo de espera de comando agregado de 240 segundos (la ejecución de Docker de cada escenario está limitada por separado).
- El **Full path** (ruta completa) mantiene la cobertura de instalación de paquetes QR y de actualización del instalador Docker para ejecuciones programadas nocturnas, despachos manuales, comprobaciones de lanzamiento de llamadas de flujo de trabajo y pull requests que realmente tocan superficies del instalador/paquete/Docker. En modo completo, install-smoke prepara o reutiliza una imagen de prueba de humo del Dockerfile raíz GHCR del SHA de destino, y luego ejecuta la instalación del paquete QR, las pruebas de humo del Dockerfile raíz/pasarela, las pruebas de humo del instalador/actualización y la e2e rápida del complemento empaquetado Docker como trabajos separados para que el trabajo del instalador no espere detrás de las pruebas de humo de la imagen raíz.

Los pushes de `main` (incluyendo confirmaciones de fusión) no fuerzan la ruta completa; cuando la lógica de alcance cambiado solicitaría cobertura completa en un push, el flujo de trabajo mantiene la prueba de humo rápida de Docker y deja la prueba de humo de instalación completa para la validación nocturna o de lanzamiento.

La prueba de humo lenta del proveedor de imágenes de instalación global de Bun está controlada por separado por `run_bun_global_install_smoke`. Se ejecuta en el horario nocturno y desde el flujo de trabajo de comprobaciones de lanzamiento, y los despachos manuales de `Install Smoke` pueden optar por ella, pero los pull requests y los pushes de `main` no. Las pruebas de Docker de QR e instalador mantienen sus propios Dockerfiles enfocados en la instalación.

## E2E de Docker local

`pnpm test:docker:all` precompila una imagen compartida de prueba en vivo, empaqueta OpenClaw una vez como un tarball npm y construye dos imágenes compartidas de `scripts/e2e/Dockerfile`:

- un ejecutor de Node/Git básico para carriles de instalador/actualización/dependencia de complemento;
- una imagen funcional que instala el mismo tarball en `/app` para carriles de funcionalidad normal.

Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`, la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`, y el ejecutor solo ejecuta el plan seleccionado. El planificador selecciona la imagen por carril con `OPENCLAW_DOCKER_E2E_BARE_IMAGE` y `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, y luego ejecuta los carriles con `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Ajustables

| Variable                               | Predeterminado | Propósito                                                                                                                                    |
| -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10             | Cantidad de ranuras del grupo principal para carriles normales.                                                                              |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10             | Cantidad de ranuras del grupo final sensibles al proveedor.                                                                                  |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9              | Límite concurrente de carriles en vivo para que los proveedores no limiten la velocidad.                                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10             | Límite concurrente de carriles de instalación de npm.                                                                                        |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7              | Límite concurrente de carriles multiservicio.                                                                                                |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000           | Escalonamiento entre inicios de carriles para evitar tormentas de creación del demonio de Docker; establezca `0` para ningún escalonamiento. |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000        | Tiempo de espera de reserva por carril (120 minutos); los carriles en vivo/finales seleccionados usan límites más estrictos.                 |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | sin establecer | `1` imprime el plan del planificador sin ejecutar carriles.                                                                                  |
| `OPENCLAW_DOCKER_ALL_LANES`            | sin establecer | Lista exacta de carriles separada por comas; omite la limpieza de humo para que los agentes puedan reproducir un carril fallido.             |

Un carril más pesado que su límite efectivo aún puede iniciarse desde un grupo vacío y luego ejecutarse solo hasta que libere capacidad. El agregado local realiza verificaciones previas de Docker, elimina contenedores obsoletos de OpenClaw E2E, emite el estado del carril activo, persiste los tiempos de los carriles para el ordenamiento más largo primero y deja de programar nuevos carriles agrupados después del primer fallo de manera predeterminada.

### Flujo de trabajo en vivo/E2E reutilizable

El flujo de trabajo reutilizable de live/E2E pregunta a `scripts/test-docker-all.mjs --plan-json` qué paquete, tipo de imagen, imagen live, carril y cobertura de credenciales son necesarios. `scripts/docker-e2e.mjs` luego convierte ese plan en salidas y resúmenes de GitHub. Ya sea empaqueta OpenClaw a través de `scripts/package-openclaw-for-docker.mjs`, descarga un artefacto de paquete de la ejecución actual, o descarga un artefacto de paquete de `package_artifact_run_id`; valida el inventario del tarball; construye y envía imágenes E2E de Docker de GHCR desnosas/funcionales etiquetadas con el resumen del paquete a través de la caché de capas de Docker de Blacksmith cuando el plan necesita carriles instalados por paquete; y reutiliza las entradas `docker_e2e_bare_image`/`docker_e2e_functional_image` proporcionadas o las imágenes existentes de resumen de paquete en lugar de reconstruir. Las extracciones de imágenes de Docker se reintentan con un tiempo de espera limitado de 180 segundos por intento, de modo que un flujo de registro/caché atascado se reintente rápidamente en lugar de consumir la mayor parte de la ruta crítica de CI.

### Fragmentos de la ruta de lanzamiento

La cobertura de Docker de lanzamiento ejecuta trabajos fragmentados más pequeños con `OPENCLAW_SKIP_DOCKER_BUILD=1` para que cada fragmento extraiga solo el tipo de imagen que necesita y ejecuta múltiples carriles a través del mismo planificador ponderado:

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Los fragmentos actuales de Docker de lanzamiento son `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` y `plugins-runtime-install-a` a través de `plugins-runtime-install-h`. `plugins-runtime-core`, `plugins-runtime` y `plugins-integrations` siguen siendo alias agregados de complemento/tiempo de ejecución. El alias de carril `install-e2e` sigue siendo el alias de reejecución manual agregado para ambos carriles del instalador del proveedor.

OpenWebUI se incorpora en `plugins-runtime-services` cuando la cobertura completa de la ruta de lanzamiento lo solicita, y mantiene un fragmento independiente `openwebui` solo para los envíos exclusivos de OpenWebUI. Los carriles de actualización de canal agrupado se reintentan una vez ante fallas transitorias de la red npm.

Cada fragmento carga `.artifacts/docker-tests/` con registros de carril, tiempos, `summary.json`, `failures.json`, tiempos de fase, plan del programador JSON, tablas de carril lento y comandos de nueva ejecución por carril. La entrada `docker_lanes` del flujo de trabajo ejecuta los carriles seleccionados contra las imágenes preparadas en lugar de los trabajos del fragmento, lo que mantiene la depuración de carriles fallidos limitada a un trabajo Docker específico y prepara, descarga o reutiliza el artefacto del paquete para esa ejecución; si un carril seleccionado es un carril Docker en vivo, el trabajo específico construye la imagen de prueba en vivo localmente para esa nueva ejecución. Los comandos de nueva ejecución de GitHub generados por carril incluyen `package_artifact_run_id`, `package_artifact_name` y entradas de imagen preparadas cuando esos valores existen, para que un carril fallido pueda reutilizar el paquete exacto y las imágenes de la ejecución fallida.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

El flujo de trabajo programado en vivo/E2E ejecuta la suite Docker de ruta de lanzamiento completa diariamente.

## Plugin Prerelease

`Plugin Prerelease` es una cobertura de producto/paquete más costosa, por lo que es un flujo de trabajo separado despachado por `Full Release Validation` o por un operador explícito. Las solicitudes de extracción normales, los envíos a `main` y los envíos manuales de CI independientes mantienen esa suite desactivada. Equilibra las pruebas de complementos agrupados en ocho trabajadores de extensión; esos trabajos de fragmentos de extensión ejecutan hasta dos grupos de configuración de complementos a la vez con un trabajador Vitest por grupo y un montón de Node más grande para que los lotes de complementos con muchas importaciones no creen trabajos de CI adicionales. La ruta de prelanzamiento de Docker solo para lanzamiento agrupa los carriles Docker específicos en grupos pequeños para evitar reservar docenas de ejecutores para trabajos de uno a tres minutos.

## QA Lab

QA Lab tiene carriles de CI dedicados fuera del flujo de trabajo principal de alcance inteligente. La paridad agéntica está anidada bajo los arneses de QA y lanzamiento amplios, no un flujo de trabajo de PR independiente. Use `Full Release Validation` con `rerun_group=qa-parity` cuando la paridad deba incluirse en una ejecución de validación amplia.

- El flujo de trabajo `QA-Lab - All Lanes` se ejecuta nightly en `main` y en despacho manual; distribuye el carril de paridad simulada, el carril Matrix en vivo y los carriles Telegram y Discord en vivo como trabajos paralelos. Los trabajos en vivo usan el entorno `qa-live-shared`, y Telegram/Discord usan arrendamientos de Convex.

Las comprobaciones de lanzamiento ejecutan carriles de transporte en vivo de Matrix y Telegram con el proveedor de simulación determinista y modelos calificados como simulación (`mock-openai/gpt-5.5` y `mock-openai/gpt-5.5-alt`), de modo que el contrato del canal queda aislado de la latencia del modelo en vivo y del inicio normal del proveedor del complemento. La puerta de enlace de transporte en vivo deshabilita la búsqueda de memoria porque la paridad de QA cubre el comportamiento de la memoria por separado; la conectividad del proveedor está cubierta por las suites separadas del modelo en vivo, el proveedor nativo y el proveedor Docker.

Matrix usa `--profile fast` para las puertas programadas y de lanzamiento, agregando `--fail-fast` solo cuando el CLI extraído lo admite. El valor predeterminado del CLI y la entrada del flujo de trabajo manual siguen siendo `all`; el despacho manual de `matrix_profile=all` siempre divide la cobertura completa de Matrix en trabajos `transport`, `media`, `e2ee-smoke`, `e2ee-deep` y `e2ee-cli`.

`OpenClaw Release Checks` también ejecuta los carriles del QA Lab críticos para el lanzamiento antes de la aprobación del lanzamiento; su puerta de paridad de QA ejecuta los paquetes candidatos y de referencia como trabajos de carril paralelos, y luego descarga ambos artefactos en un pequeño trabajo de informe para la comparación final de paridad.

Para las PRs normales, siga las pruebas de CI/check con alcance en lugar de tratar la paridad como un estado obligatorio.

## CodeQL

El flujo de trabajo `CodeQL` es intencionalmente un escáner de seguridad de primer paso limitado, no un barrido completo del repositorio. Las ejecuciones diarias, manuales y de guardia de pull request que no sean borradores escanean el código del flujo de trabajo de Actions más las superficies de JavaScript/TypeScript de mayor riesgo con consultas de seguridad de alta confianza filtradas a `security-severity` alta/crítica.

La guardia de pull request se mantiene ligera: solo se inicia para cambios bajo `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` o `src`, y ejecuta la misma matriz de seguridad de alta confianza que el flujo de trabajo programado. Android y macOS CodeQL se mantienen fuera de los valores predeterminados de PR.

### Categorías de seguridad

| Categoría                                         | Superficie                                                                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Línea base de Auth, secretos, sandbox, cron y puerta de enlace                                                                                                                                      |
| `/codeql-security-high/channel-runtime-boundary`  | Contratos principales de implementación de canales más el tiempo de ejecución del complemento de canal, puerta de enlace, SDK de complementos, secretos, puntos de contacto de auditoría            |
| `/codeql-security-high/network-ssrf-boundary`     | Superficies de política SSRF principales, análisis de IP, guardia de red, recuperación web y política SSRF del SDK de complementos                                                                  |
| `/codeql-security-high/mcp-process-tool-boundary` | Servidores MCP, asistentes de ejecución de procesos, entrega saliente y puertas de ejecución de herramientas de agente                                                                              |
| `/codeql-security-high/plugin-trust-boundary`     | Instalación de complementos, cargador, manifiesto, registro, instalación del administrador de paquetes, carga de fuentes y superficies de confianza de contrato de paquetes del SDK de complementos |

### Fragmentos de seguridad específicos de la plataforma

- `CodeQL Android Critical Security` — fragmento de seguridad de Android programado. Compila la aplicación de Android manualmente para CodeQL en el ejecutor Linux de Blacksmith más pequeño aceptado por la cordura del flujo de trabajo. Carga bajo `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — fragmento de seguridad de macOS semanal/manual. Compila la aplicación de macOS manualmente para CodeQL en Blacksmith macOS, filtra los resultados de compilación de dependencias del SARIF cargado y carga bajo `/codeql-critical-security/macos`. Se mantiene fuera de los valores predeterminados diarios porque la compilación de macOS domina el tiempo de ejecución incluso cuando está limpia.

### Categorías de calidad crítica

`CodeQL Critical Quality` es el fragmento no correspondiente de seguridad coincidente. Ejecuta solo consultas de calidad de JavaScript/TypeScript de gravedad de error y no de seguridad sobre superficies de alto valor estrechas en el ejecutor Linux Blacksmith más pequeño. Su guardia de pull request es intencionalmente más pequeña que el perfil programado: los PRs que no son borradores solo ejecutan los fragmentos coincidentes `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` y `plugin-sdk-reply-runtime` para cambios en el código de ejecución/despacho de respuesta y comando/modelo/herramienta del agente, código de esquema/migración/ES de configuración, código de autenticación secretos/sandbox seguridad, tiempo de ejecución del complemento del canal principal y del canal empaquetado, protocolo de puerta de enlace/método del servidor, pegamento de tiempo de ejecución/SDK de memoria, MCP/proceso/entrega saliente, catálogo de modelo/tiempo de ejecución del proveedor, diagnósticos de sesión/colas de entrega, cargador de complementos, contrato de paquete/Plugin SDK o cambios en el tiempo de ejecución de respuesta del Plugin SDK. Los cambios en la configuración de CodeQL y en el flujo de trabajo de calidad ejecutan los doce fragmentos de calidad de PR.

El envío manual acepta:

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Los perfiles estrechos son ganchos de enseñanza/iteración para ejecutar un fragmento de calidad de forma aislada.

| Categoría                                               | Superficie                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Código de límite de seguridad de puerta de enlace, sandbox, secretos y autenticación                                                                                                                                                        |
| `/codeql-critical-quality/config-boundary`              | Esquema de configuración, migración, normalización y contratos de ES                                                                                                                                                                        |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Esquemas de protocolo de puerta de enlace y contratos de método del servidor                                                                                                                                                                |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contratos de implementación del complemento del canal principal y del canal empaquetado                                                                                                                                                     |
| `/codeql-critical-quality/agent-runtime-boundary`       | Ejecución de comandos, despacho de modelo/proveedor, despacho de respuesta automática y colas, y contratos de tiempo de ejecución del plano de control de ACP                                                                               |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Servidores MCP y puentes de herramientas, asistentes de supervisión de procesos y contratos de entrega saliente                                                                                                                             |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK de host de memoria, fachadas de tiempo de ejecución de memoria, alias del Plugin SDK de memoria, pegamento de activación de tiempo de ejecución de memoria y comandos del doctor de memoria                                             |
| `/codeql-critical-quality/session-diagnostics-boundary` | Aspectos internos de la cola de respuesta, colas de entrega de sesiones, asistentes de enlace/entrega de sesiones salientes, superficies de paquetes de eventos/registros de diagnóstico y contratos de CLI del médico de sesiones          |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Despacho de respuestas entrantes del SDK de complementos, asistentes de carga útil/segmentación/ejecución de respuestas, opciones de respuestas del canal, colas de entrega y asistentes de enlace de sesión/subproceso                     |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalización del catálogo de modelos, autenticación y descubrimiento de proveedores, registro en tiempo de ejecución de proveedores, valores predeterminados/catálogos de proveedores y registros de web/bsqueda/recuperación/incrustación |
| `/codeql-critical-quality/ui-control-plane`             | Inicio de la interfaz de usuario de control, persistencia local, flujos de control de puerta de enlace y contratos en tiempo de ejecución del plano de control de tareas                                                                    |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Recuperación/bsqueda web principal, E/S de medios, comprensin de medios, generacin de imgenes y contratos en tiempo de ejecucin de generacin de medios                                                                                      |
| `/codeql-critical-quality/plugin-boundary`              | Contratos de punto de entrada del cargador, registro, superficie pblica y SDK de complementos                                                                                                                                               |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Fuente del SDK de complementos del lado del paquete publicado y asistentes de contratos de paquetes de complementos                                                                                                                         |

La calidad se mantiene separada de la seguridad para que los hallazgos de calidad se puedan programar, medir, deshabilitar o ampliar sin ofuscar la seal de seguridad. La expansin de CodeQL para Swift, Python y complementos incluidos debe volver a agregarse como trabajo de seguimiento limitado o fragmentado solo despus de que los perfiles estrechos tengan un tiempo de ejecucin y una seal estables.

## Flujos de trabajo de mantenimiento

### Docs Agent

El flujo de trabajo `Docs Agent` es un carril de mantenimiento de Codex impulsado por eventos para mantener la documentacin existente alineada con los cambios recientes. No tiene un horario puro: una ejecucin de CI de insercin que no sea de bot exitosa en `main` puede activarlo, y el envo manual puede ejecutarlo directamente. Las invocaciones de ejecucin de flujo de trabajo se omiten cuando `main` ha avanzado o cuando se cre otra ejecucin de Docs Agent no omitida en la ltima hora. Cuando se ejecuta, revisa el rango de confirmaciones desde el SHA de origen de Docs Agent anterior no omitido hasta el `main` actual, por lo que una ejecucin por hora puede cubrir todos los cambios principales acumulados desde el ltimo paso de documentos.

### Test Performance Agent

El flujo de trabajo `Test Performance Agent` es un carril de mantenimiento de Codex impulsado por eventos para pruebas lentas. No tiene un horario puro: una ejecución de CI de push exitosa que no sea de bot en `main` puede activarlo, pero se omite si otra invocación de ejecución del flujo de trabajo ya se ejecutó o se está ejecutando ese día UTC. El envío manual elude esa puerta de actividad diaria. El carril genera un informe de rendimiento de Vitest agrupado de suite completa, permite que Codex realice solo pequeñas correcciones de rendimiento de pruebas que preserven la cobertura en lugar de refactorizaciones amplias, luego vuelve a ejecutar el informe de suite completa y rechaza los cambios que reducen el recuento de pruebas de referencia aprobadas. Si la referencia tiene pruebas fallidas, Codex puede corregir solo los fallos obvios y el informe de suite completa posterior al agente debe aprobarse antes de confirmar cualquier cambio. Cuando `main` avanza antes de que se aplique el push del bot, el carril hace rebase del parche validado, vuelve a ejecutar `pnpm check:changed` y reintentar el push; los parches obsoletos en conflicto se omiten. Utiliza Ubuntu alojado en GitHub para que la acción de Codex pueda mantener la misma postura de seguridad de drop-sudo que el agente de documentos.

### PR duplicadas después de la fusión

El flujo de trabajo `Duplicate PRs After Merge` es un flujo de trabajo manual de mantenedor para la limpieza de duplicados posteriores al aterrizaje. De forma predeterminada, se ejecuta en modo de prueba y solo cierra las PR listadas explícitamente cuando `apply=true`. Antes de mutar GitHub, verifica que la PR aterrizada esté fusionada y que cada duplicado tenga un problema referenciado compartido o fragmentos de cambio superpuestos.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Puertas de verificación local y enrutamiento de cambios

La lógica del carril de cambios local vive en `scripts/changed-lanes.mjs` y es ejecutada por `scripts/check-changed.mjs`. Esa puerta de verificación local es más estricta con respecto a los límites de la arquitectura que el alcance de la plataforma CI amplia:

- los cambios de producción de core ejecutan comprobaciones de tipo de core prod y core test, además de core lint/guards;
- los cambios solo de prueba de core ejecutan solo la comprobación de tipo de core test, además de core lint;
- los cambios de producción de extension ejecutan comprobaciones de tipo de extension prod y extension test, además de extension lint;
- los cambios solo de prueba de extension ejecutan la comprobación de tipo de extension test, además de extension lint;
- los cambios públicos del Plugin SDK o del contrato de plugin se expanden a la comprobación de tipo de extension porque las extensiones dependen de esos contratos principales (los barridos de extensiones de Vitest siguen siendo trabajo de prueba explícito);
- los incrementos de versión solo de metadatos de lanzamiento ejecutan comprobaciones específicas de versión/configuración/dependencias-raíz;
- los cambios desconocidos en la raíz/configuración fallan de forma segura en todos los carriles de comprobación.

El enrutamiento de pruebas modificadas locales reside en `scripts/test-projects.test-support.mjs` y es intencionalmente más económico que `check:changed`: las ediciones directas de pruebas se ejecutan a sí mismas, las ediciones de fuente prefieren asignaciones explícitas, luego pruebas hermanas y dependientes del gráfico de importación. La configuración de entrega de sala de grupo compartida es una de las asignaciones explícitas: los cambios en la configuración de respuesta visible del grupo, el modo de entrega de respuesta de origen o el prompt del sistema de herramientas de mensajes se enrutan a través de las pruebas de respuesta principales más regresiones de entrega de Discord y Slack, de modo que un cambio predeterminado compartido falle antes del primer push de PR. Use `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el cambio sea lo suficientemente amplio en el harness como para que el conjunto mapeado económico no sea un proxy confiable.

## Validación de Testbox

Ejecute Testbox desde la raíz del repositorio y prefiera una caja preparada nueva para una comprobación amplia. Antes de gastar una puerta lenta en una caja que fue reutilizada, expiró o simplemente reportó una sincronización inesperadamente grande, ejecute `pnpm testbox:sanity` dentro de la caja primero.

La comprobación de integridad falla rápido cuando archivos raíz requeridos como `pnpm-lock.yaml` desaparecen o cuando `git status --short` muestra al menos 200 eliminaciones rastreadas. Eso generalmente significa que el estado de sincronización remota no es una copia confiable del PR; detenga esa caja y prepare una nueva en lugar de depurar el fallo de la prueba del producto. Para PRs con eliminaciones grandes intencionales, establezca `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` para esa ejecución de integridad.

`pnpm testbox:run` también termina una invocación local de CLI de Blacksmith que permanece en la fase de sincronización durante más de cinco minutos sin salida posterior a la sincronización. Establezca `OPENCLAW_TESTBOX_SYNC_TIMEOUT_MS=0` para deshabilitar ese guardia, o use un valor de milisegundos mayor para diffs locales inusualmente grandes.

Crabbox es el contenedor de caja remota propiedad del repositorio para la comprobación de Linux de los mantenedores. Úselo cuando una comprobación es demasiado amplia para un bucle de edición local, cuando la paridad de CI importa, o cuando la comprobación necesita secretos, Docker, carriles de paquetes, cajas reutilizables o registros remotos. El backend normal de OpenClaw es `blacksmith-testbox`; la capacidad propiedad de AWS/Hetzner es un respaldo para interrupciones de Blacksmith, problemas de cuota o pruebas explícitas de capacidad propia.

Antes de una primera ejecución, verifique el contenedor desde la raíz del repositorio:

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

El wrapper del repositorio rechaza un binario de Crabbox obsoleto que no anuncia `blacksmith-testbox`. Pase el proveedor explícitamente aunque `.crabbox.yaml` tenga valores predeterminados de nube propia.

Puerta de cambios (Changed gate):

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

Nueva ejecución de pruebas enfocada:

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

Lea el resumen JSON final. Los campos útiles son `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` y `totalMs`. Las ejecuciones de Crabbox con un solo respaldo de Blacksmith deberían detener el Testbox automáticamente; si una ejecución se interrumpe o la limpieza no está clara, inspeccione las cajas en vivo y detenga solo las cajas que creó:

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

Si Crabbox es la capa rota pero Blacksmith funciona por sí solo, use Blacksmith directo como alternativa estrecha:

```bash
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
blacksmith testbox stop --id <tbx_id>
```

Si `blacksmith testbox list --all` y `blacksmith testbox status` funcionan pero los nuevos
calentamientos (warmups) permanecen `queued` sin IP ni URL de ejecución de Actions después de un par de minutos,
trátelo como presión del proveedor, la cola, la facturación o el límite de la organización de Blacksmith. Detenga los
id en cola que creó, evite iniciar más Testboxes y mueva la prueba a la
capacidad propia de Crabbox a continuación mientras alguien verifica el panel de Blacksmith,
la facturación y los límites de la organización.

Escale a la capacidad propia de Crabbox solo cuando Blacksmith está caído, limitado por cuota, sin el entorno necesario, o cuando la capacidad propia es explícitamente el objetivo:

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Bajo presión de AWS, evita `class=beast` a menos que la tarea realmente necesite CPU de clase 48xlarge. Una solicitud `beast` comienza en 192 vCPUs y es la forma más fácil de exceder la cuota regional EC2 Spot o Estándar bajo demanda. El `.crabbox.yaml` propiedad del repositorio tiene como valores predeterminados `standard`, múltiples regiones de capacidad y `capacity.hints: true` para que los arrendamientos de AWS intermediarios impriman la región/mercado seleccionado, presión de cuota, alternativa de Spot y advertencias de clase de alta presión. Usa `fast` para comprobaciones amplias más pesadas, `large` solo después de que estándar/rápido no sean suficientes, y `beast` solo para carriles excepcionales limitados por CPU, como matrices de Docker de suite completa o todos los complementos, validación explícita de lanzamiento/bloqueador, o perfilado de rendimiento de alto núcleo. No uses `beast` para `pnpm check:changed`, pruebas enfocadas, trabajo solo de documentos, lint/typecheck ordinarios, repros E2E pequeños o triaje de interrupciones de Blacksmith. Usa `--market on-demand` para el diagnóstico de capacidad para que la rotación del mercado Spot no se mezcle en la señal.

`.crabbox.yaml` posee los proveedores, sincronización y valores predeterminados de hidratación de GitHub Actions para carriles de nube propiedad de. Excluye `.git` local para que el checkout de Actions hidratado mantenga sus propios metadatos remotos de Git en lugar de sincronizar los remotos y almacenes de objetos locales del mantenedor, y excluye los artefactos de tiempo de ejecución/construcción locales que nunca deben transferirse. `.github/workflows/crabbox-hydrate.yml` posee el checkout, la configuración de Node/pnpm, la obtención de `origin/main` y el traspaso de entorno no secreto para los comandos `crabbox run --id <cbx_id>` de nube propiedad de.

## Relacionado

- [Resumen de instalación](/es/install)
- [Canales de desarrollo](/es/install/development-channels)
