---
summary: "Gráfico de trabajos de CI, puertas de alcance, paraguas de lanzamiento y equivalentes de comandos locales"
title: "Canalización de CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI de OpenClaw se ejecuta en cada envío a `main` y en cada solicitud de extracción. El trabajo `preflight` clasifica las diferencias y desactiva los carriles costosos cuando solo cambiaron áreas no relacionadas. Las ejecuciones manuales de `workflow_dispatch` omiten intencionalmente el alcance inteligente y despliegan el gráfico completo para candidatos de lanzamiento y validaciones amplias. Los carriles de Android permanecen opt-in a través de `include_android`. La cobertura de complementos solo para lanzamientos reside en el flujo de trabajo separado [`Plugin Prerelease`](#plugin-prerelease) y solo se ejecuta desde [`Full Release Validation`](#full-release-validation) o un despacho manual explícito.

## Descripción general de la canalización

| Trabajo                            | Propósito                                                                                                                                                                  | Cuándo se ejecuta                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `preflight`                        | Detectar cambios solo en documentos, alcances cambiados, extensiones cambiadas y construir el manifiesto de CI                                                             | Siempre en inserciones y PR que no sean borradores |
| `security-fast`                    | Detección de claves privadas, auditoría de flujo de trabajo a través de `zizmor` y auditoría de lockfile de producción                                                     | Siempre en inserciones y PR que no sean borradores |
| `check-dependencies`               | Pase de solo dependencias de producción Knip más el guardián de lista de permitidos de archivos no utilizados                                                              | Cambios relevantes para Node                       |
| `build-artifacts`                  | Compilar `dist/`, Interfaz de usuario de control, comprobaciones de humo de CLI integradas, comprobaciones de artefactos integrados incrustados y artefactos reutilizables | Cambios relevantes para Node                       |
| `checks-fast-core`                 | Carriles de corrección rápida de Linux como bundled, protocol y comprobaciones de enrutamiento de CI                                                                       | Cambios relevantes para Node                       |
| `checks-fast-contracts-plugins-*`  | Dos comprobaciones de contratos de complementos en fragmentos                                                                                                              | Cambios relevantes para Node                       |
| `checks-fast-contracts-channels-*` | Dos comprobaciones de contratos de canal en fragmentos                                                                                                                     | Cambios relevantes para Node                       |
| `checks-node-core-*`               | Fragmentos de prueba principales de Node, excluyendo los carriles de canal, bundled, contract y extension                                                                  | Cambios relevantes para Node                       |
| `check-*`                          | Equivalente de puerta de enlace local principal en fragmentos: tipos de prod, lint, guardias, tipos de prueba y smoke estricto                                             | Cambios relevantes para Node                       |
| `check-additional-*`               | Arquitectura, deriva de límites/prompts fragmentados, guardias de extensiones, límites de paquetes y topología de tiempo de ejecución                                      | Cambios relevantes para Node                       |
| `checks-node-compat-node22`        | Carril de compilación y humo de compatibilidad con Node 22                                                                                                                 | Despacho manual de CI para lanzamientos            |
| `check-docs`                       | Comprobaciones de formato, lint y enlaces rotos en documentos                                                                                                              | Documentos cambiados                               |
| `skills-python`                    | Ruff + pytest para habilidades respaldadas por Python                                                                                                                      | Cambios relevantes para habilidades de Python      |
| `checks-windows`                   | Pruebas de proceso/ruta específicas de Windows más regresiones de especificadores de importación de tiempo de ejecución compartidas                                        | Cambios relevantes para Windows                    |
| `macos-node`                       | Carril de pruebas de TypeScript en macOS que utiliza los artefactos compilados compartidos                                                                                 | Cambios relevantes para macOS                      |
| `macos-swift`                      | Lint, compilación y pruebas de Swift para la aplicación de macOS                                                                                                           | Cambios relevantes para macOS                      |
| `android`                          | Pruebas unitarias de Android para ambas variantes más una compilación de APK de depuración                                                                                 | Cambios relevantes para Android                    |
| `test-performance-agent`           | Optimización de pruebas lentas de Codex diarias después de una actividad confiable                                                                                         | Éxito de CI principal o envío manual               |
| `openclaw-performance`             | Informes de rendimiento de tiempo de ejecución de Kova diarios/bajo demanda con proveedor simulado, perfil profundo y carriles en vivo con GPT 5.5                         | Envío programado y manual                          |

## Orden de fail-fast

1. `preflight` decide qué carriles existen en absoluto. La lógica de `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-fast`, `check-*`, `check-additional-*`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de artefactos y matrices de plataformas.
3. `build-artifacts` se superpone con los carriles rápidos de Linux para que los consumidores descendentes puedan comenzar tan pronto como la compilación compartida esté lista.
4. Los carriles más pesados de plataforma y tiempo de ejecución se expanden después de eso: `checks-fast-core`, `checks-fast-contracts-plugins-*`, `checks-fast-contracts-channels-*`, `checks-node-core-*`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

GitHub puede marcar los trabajos reemplazados como `cancelled` cuando llega un push más reciente al mismo PR o a la referencia `main`. Trátelo como ruido de CI a menos que la ejecución más reciente para la misma referencia también esté fallando. Los trabajos de matriz usan `fail-fast: false`, y `build-artifacts` informa los fallos de canal incorporado, límite de soporte central y observador de puerta de enlace (gateway-watch) directamente en lugar de poner en cola pequeños trabajos de verificación. La clave de concurrencia automática de CI tiene versión (`CI-v7-*`), por lo que un zombie del lado de GitHub en un grupo de cola antiguo no puede bloquear indefinidamente las ejecuciones main más nuevas. Las ejecuciones manuales de suite completa usan `CI-manual-v1-*` y no cancelan las ejecuciones en curso.

El trabajo `ci-timings-summary` carga un artefacto compacto `ci-timings-summary` para cada ejecución de CI que no sea borrador. Registra el tiempo de reloj, el tiempo de cola, los trabajos más lentos y los trabajos fallidos para la ejecución actual, por lo que las comprobaciones de estado de CI no necesitan raspar el payload completo de Acciones repetidamente.

## Ámbito y enrutamiento

La lógica del ámbito reside en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`. El envío manual omite la detección de cambios de ámbito y hace que el manifiesto de preflight actúe como si cada área con ámbito hubiera cambiado.

- **Las ediciones del flujo de trabajo de CI** validan el gráfico de CI de Node más el linting del flujo de trabajo, pero no fuerzan por sí mismas las compilaciones nativas de Windows, Android o macOS; esos carriles de plataforma permanecen limitados a los cambios de código fuente de la plataforma.
- **Los documentos en los pushes de `main`** son comprobados por el flujo de trabajo independiente `Docs` con el mismo espejo de documentos ClawHub que usa CI, por lo que los pushes mixtos de código + documentos tampoco ponen en cola el shard `check-docs` de CI. Las solicitudes de extracción y la CI manual aún ejecutan `check-docs` desde CI cuando cambian los documentos.
- **Las ediciones solo de enrutamiento de CI, las ediciones seleccionadas de accesorios de prueba central baratos y las ediciones estrechas de asistente de contrato de complemento/enrutamiento de prueba** usan una ruta de manifiesto rápida solo para Node: `preflight`, seguridad y una única tarea `checks-fast-core`. Esa ruta omite los artefactos de compilación, la compatibilidad con Node 22, los contratos de canal, los shards centrales completos, los shards de complementos empaquetados y las matrices de guardia adicionales cuando el cambio se limita a las superficies de enrutamiento o asistente que la tarea rápida ejerce directamente.
- Las comprobaciones de **Windows Node** están limitadas a los contenedores de procesos/rutas específicos de Windows, los asistentes de ejecución de npm/pnpm/UI, la configuración del gestor de paquetes y las superficies del flujo de trabajo de CI que ejecutan ese carril; los cambios no relacionados de origen, complemento, prueba de instalación (install-smoke) y solo de prueba se mantienen en los carriles de Linux Node.

Las familias de pruebas de Node más lentas se dividen o equilibran para que cada trabajo se mantenga pequeño sin reservar en exceso los ejecutores: los contratos de complementos y los contratos de canales se ejecutan cada uno como dos fragmentos ponderados respaldados por Blacksmith con el ejecutor estándar de GitHub como respaldo, los carriles rápidos/de soporte de la unidad central se ejecutan por separado, la infraestructura de tiempo de ejecución central se divide entre estado, proceso/configuración, compartido y tres fragmentos de dominio cron, la respuesta automática se ejecuta como trabajadores equilibrados (con el subárbol de respuesta dividido en fragmentos de agente-ejecutor, despacho y comandos/enrutamiento de estado) y las configuraciones de pasarela/servidor agentic se dividen entre los carriles de chat/autenticación/modelo/complemento-http/tiempo de ejecución/inicio en lugar de esperar a los artefactos construidos. Las pruebas amplias de navegador, QA, multimedia y varios complementos utilizan sus configuraciones dedicadas de Vitest en lugar de la configuración general de complementos compartida. Los fragmentos de patrones de inclusión registran entradas de tiempo utilizando el nombre del fragmento de CI, por lo que `.artifacts/vitest-shard-timings.json` puede distinguir una configuración completa de un fragmento filtrado. `check-additional-*` mantiene el trabajo de compilación/prueba canary limitado al paquete junto y separa la arquitectura de topología de tiempo de ejecución de la cobertura de observación de pasarela; la lista de guardianes de límites se divide en un fragmento con muchos mensajes y un fragmento combinado para las bandas de guardianes restantes, cada uno ejecutando guardianes independientes seleccionados simultáneamente e imprimiendo tiempos por verificación. La costosa comprobación de deriva de instantáneas de mensajes del camino feliz de Codex se ejecuta como un trabajo adicional propio para la CI manual y solo para cambios que afectan los mensajes, por lo que los cambios normales no relacionados de Node no esperan detrás de la generación en frío de instantáneas de mensajes y los fragmentos de límites se mantienen equilibrados mientras que la deriva de mensajes sigue fijada al PR que la causó; el mismo indicador omite la generación de Vitest de instantáneas de mensajes dentro del fragmento de límites de soporte central de artefactos construidos. Gateway watch, las pruebas de canal y el fragmento de límites de soporte central se ejecutan simultáneamente dentro de `build-artifacts` después de que `dist/` y `dist-runtime/` ya se hayan construido.

La CI de Android ejecuta tanto `testPlayDebugUnitTest` como `testThirdPartyDebugUnitTest` y luego compila el APK de depuración de Play. La variante de terceros no tiene un conjunto de fuentes ni manifiesto separados; su carril de pruebas unitarias aún compila la variante con las marcas BuildConfig de registro de SMS/llamadas, al tiempo que evita un trabajo duplicado de empaquetado del APK de depuración en cada envío relevante para Android.

El fragmento `check-dependencies` ejecuta `pnpm deadcode:dependencies` (un pase de producción de solo dependencias de Knip fijado a la última versión de Knip, con la edad mínima de lanzamiento de pnpm deshabilitada para la instalación de `dlx`) y `pnpm deadcode:unused-files`, que compara los hallazgos de archivos sin uso de producción de Knip contra `scripts/deadcode-unused-files.allowlist.mjs`. El guardián de archivos sin uso falla cuando una PR agrega un nuevo archivo sin uso no revisado o deja una entrada obsoleta en la lista de permitidos, mientras preserva las superficies intencionales de complementos dinámicos, generados, de compilación, pruebas en vivo y puentes de paquetes que Knip no puede resolver estáticamente.

## Reenvío de actividad de ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` es el puente del lado objetivo desde la actividad del repositorio OpenClaw hacia ClawSweeper. No extrae ni ejecuta código de solicitud de extracción que no sea de confianza. El flujo de trabajo crea un token de GitHub App desde `CLAWSWEEPER_APP_PRIVATE_KEY` y luego envía cargas úticas compactas `repository_dispatch` a `openclaw/clawsweeper`.

El flujo de trabajo tiene cuatro carriles:

- `clawsweeper_item` para solicitudes exactas de revisión de incidencias y solicitudes de extracción;
- `clawsweeper_comment` para comandos explícitos de ClawSweeper en comentarios de incidencias;
- `clawsweeper_commit_review` para solicitudes de revisión a nivel de confirmación en envíos a `main`;
- `github_activity` para actividad general de GitHub que el agente ClawSweeper puede inspeccionar.

El carril `github_activity` reenvía solo metadatos normalizados: tipo de evento, acción, actor, repositorio, número de elemento, URL, título, estado y breves extractos para comentarios o revisiones cuando están presentes. Evita intencionalmente reenviar el cuerpo completo del webhook. El flujo de trabajo receptor en `openclaw/clawsweeper` es `.github/workflows/github-activity.yml`, que publica el evento normalizado en el enlace de OpenClaw Gateway para el agente ClawSweeper.

La actividad general es observación, no entrega por defecto. El agente ClawSweeper recibe el objetivo de Discord en su indicación y debe publicar en `#clawsweeper` solo cuando el evento es sorprendente, accionable, arriesgado o útil operacionalmente. Las aperturas rutinarias, ediciones, actividad de bots, ruido de webhooks duplicados y el tráfico normal de revisión deben dar como resultado `NO_REPLY`.

Trate los títulos, comentarios, cuerpos, texto de revisión, nombres de ramas y mensajes de confirmación de GitHub como datos no confiables a lo largo de esta ruta. Son entradas para resumen y triaje, no instrucciones para el flujo de trabajo o el tiempo de ejecución del agente.

## Despachos manuales

Los despachos manuales de CI ejecutan el mismo gráfico de trabajos que la CI normal, pero fuerzan la activación de cada carril con alcance que no sea de Android: fragmentos de Linux Node, fragmentos de bundled-plugin, fragmentos de contratos de complementos y canales, compatibilidad con Node 22, `check-*`, `check-additional-*`, verificaciones de humo de artefactos construidos, verificaciones de documentación, habilidades de Python, Windows, macOS e i18n de Control UI. Los despachos manuales independientes de CI ejecutan Android solo con `include_android=true`; la sombrilla de lanzamiento completa habilita Android pasando `include_android=true`. Las verificaciones estáticas de previo lanzamiento de complementos, el fragmento `agentic-plugins` solo para lanzamiento, el barrido completo del lote de extensiones y los carriles de Docker de previo lanzamiento de complementos están excluidos de la CI. La suite de previo lanzamiento de Docker se ejecuta solo cuando `Full Release Validation` despacha el flujo de trabajo separado `Plugin Prerelease` con el gate de validación de lanzamiento habilitado.

Las ejecuciones manuales utilizan un grupo de concurrencia único para que una suite completa de candidato a lanzamiento no sea cancelada por otro envío o ejecución de PR en la misma referencia. La entrada opcional `target_ref` permite a un llamador de confianza ejecutar ese gráfico contra una rama, etiqueta o SHA de confirmación completa mientras usa el archivo de flujo de trabajo de la referencia de despacho seleccionada.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Trabajos                                                                                                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`, verificaciones de documentos, habilidades de Python, workflow-sanity, labeler, auto-response; install-smoke preflight también usa Ubuntu alojado por GitHub para que la matriz Blacksmith pueda ponerse en cola antes       |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `security-fast`, fragmentos de extensión de menor peso, `checks-fast-core`, fragmentos de contrato de complemento/canal, `checks-node-compat-node22`, `check-guards`, `check-prod-types` y `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Fragmentos de prueba de Linux Node, fragmentos de prueba de complementos agrupados, fragmentos `check-additional-*`, `android`                                                                                                           |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (lo suficientemente sensibles a la CPU que 8 vCPU costaban más de lo que ahorraban); compilaciones Docker de install-smoke (el tiempo de cola de 32 vCPU costaba más de lo que ahorraba)                 |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                         |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` en `openclaw/openclaw`; los bifurcados (forks) vuelven a `macos-latest`                                                                                                                                                     |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` en `openclaw/openclaw`; los bifurcados (forks) vuelven a `macos-latest`                                                                                                                                                    |

La CI del repositorio canónico mantiene a Blacksmith como la ruta predeterminada de ejecución (runner). Durante `preflight`, `scripts/ci-runner-labels.mjs` verifica las ejecuciones de Actions en cola y en curso recientes en busca de trabajos de Blacksmith en cola. Si una etiqueta específica de Blacksmith ya tiene trabajos en cola, los trabajos posteriores que usarían esa etiqueta exacta vuelven al ejecutor alojado por GitHub correspondiente (`ubuntu-24.04`, `windows-2025` o `macos-latest`) solo para esa ejecución. Otros tamaños de Blacksmith en la misma familia de sistemas operativos se mantienen en sus etiquetas principales. Si la sondeo de la API falla, no se aplica ningún retorno.

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
pnpm build                                    # build dist when CI artifact/smoke checks matter
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
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

El envío manual normalmente realiza un benchmark de la referencia del flujo de trabajo. Configure `target_ref` para realizar un benchmark de una etiqueta de lanzamiento u otra rama con la implementación del flujo de trabajo actual. Las rutas de los informes publicados y los punteros más recientes se basan en la referencia probada, y cada `index.md` registra la referencia/SHA probada, la referencia/SHA del flujo de trabajo, la referencia de Kova, el perfil, el modo de autenticación del carril, el modelo, el recuento de repeticiones y los filtros de escenarios.

El flujo de trabajo instala OCM desde una versión fijada y Kova desde `openclaw/Kova` en la entrada `kova_ref` fijada, y luego ejecuta tres carriles:

- `mock-provider`: Escenarios de diagnóstico de Kova contra un tiempo de ejecución de compilación local con autenticación falsa determinista compatible con OpenAI.
- `mock-deep-profile`: Perfilado de CPU/pila/rastreo para puntos críticos de inicio, puerta de enlace y turno de agente.
- `live-openai-candidate`: Un turno de agente `openai/gpt-5.5` real de OpenAI, se omite cuando `OPENAI_API_KEY` no está disponible.

El carril de proveedor simulado también ejecuta sondas de origen nativas de OpenClaw después del pase de Kova: tiempo de arranque y memoria de la puerta de enlace en casos de inicio predeterminado, de enlace y de 50 complementos; bucles `channel-chat-baseline` de saludo hola simulados de OpenAI repetidos; y comandos de inicio de CLI contra la puerta de enlace iniciada. El resumen de Markdown de la sonda de origen se encuentra en `source/index.md` en el paquete del informe, con JSON sin formato junto a él.

Cada carril carga artefactos en GitHub. Cuando `CLAWGRIT_REPORTS_TOKEN` está configurado, el flujo de trabajo también confirma `report.json`, `report.md`, paquetes, `index.md` y artefactos de sonda de origen en `openclaw/clawgrit-reports` bajo `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. El puntero de referencia probada actual se escribe como `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validación completa de lanzamiento

`Full Release Validation` es el flujo de trabajo manual paraguas para "ejecutar todo antes del lanzamiento". Acepta una rama, etiqueta o SHA de confirmación completo, despacha el flujo de trabajo manual `CI` con ese destino, despacha `Plugin Prerelease` para la prueba de complemento/paquete/estático/Docker solo de lanzamiento, y despacha `OpenClaw Release Checks` para pruebas de instalación, aceptación de paquetes, verificaciones de paquetes multiplataforma, paridad de QA Lab, Matrix y carriles de Telegram. Las ejecuciones estables/predeterminadas mantienen la cobertura exhaustiva de lanzamiento en vivo/E2E y Docker detrás de `run_release_soak=true`; `release_profile=full` fuerza esa cobertura de "soak" para que la validación consultiva amplia siga siendo amplia. Con `rerun_group=all` y `release_profile=full`, también ejecuta `NPM Telegram Beta E2E` contra el artefacto `release-package-under-test` de las verificaciones de lanzamiento. Después de publicar, pase `release_package_spec` para reutilizar el paquete npm enviado en las verificaciones de lanzamiento, Aceptación de Paquetes, Docker, multiplataforma y Telegram sin reconstruir. Use `npm_telegram_package_spec` solo cuando Telegram deba probar un paquete diferente.

Consulte [Validación completa de lanzamiento](/es/reference/full-release-validation) para obtener la
matriz de etapas, los nombres exactos de los trabajos del flujo de trabajo, las diferencias de perfil, los artefactos y
los identificadores de reejecución enfocados.

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

Para una prueba de confirmación fijada en una rama de rápido movimiento, use el asistente en lugar de
`gh workflow run ... --ref main -f ref=<sha>`:

```bash
pnpm ci:full-release --sha <full-sha>
```

Las referencias de despacho de flujos de trabajo de GitHub deben ser ramas o etiquetas, no SHA de confirmaciones sin procesar. El asistente envía una rama temporal `release-ci/<sha>-...` en el SHA de destino, despacha `Full Release Validation` desde esa referencia anclada, verifica que cada flujo de trabajo secundario `headSha` coincida con el destino y elimina la rama temporal cuando se completa la ejecución. El verificador paraguas también falla si algún flujo de trabajo secundario se ejecutó en un SHA diferente.

`release_profile` controla la amplitud de proveedores en vivo pasados a las comprobaciones de lanzamiento. Los flujos de trabajo de lanzamiento manual predeterminados son `stable`; use `full` solo cuando desee intencionalmente la matriz amplia de proveedores/medios de asesoría. `run_release_soak` controla si las comprobaciones de lanzamiento estables/predeterminadas ejecutan la prueba exhaustiva de en vivo/E2E y la ruta de lanzamiento de Docker; `full` fuerza la prueba.

- `minimum` mantiene los carriles más rápidos críticos para el lanzamiento de OpenAI/núcleo.
- `stable` añade el conjunto de proveedores/backend estables.
- `full` ejecuta la matriz amplia de proveedores/medios de asesoría.

El paraguas registra los ids de ejecución secundarios despachados, y el trabajo final `Verify full validation` vuelve a verificar las conclusiones actuales de las ejecuciones secundarias y añade tablas del trabajo más lento para cada ejecución secundaria. Si se vuelve a ejecutar un flujo de trabajo secundario y se vuelve verde, vuelva a ejecutar solo el trabajo del verificador principal para actualizar el resultado del paraguas y el resumen de tiempos.

Para la recuperación, tanto `Full Release Validation` como `OpenClaw Release Checks` aceptan `rerun_group`. Use `all` para un candidato de lanzamiento, `ci` solo para el hijo de CI completa normal, `plugin-prerelease` solo para el hijo de prerrelease del complemento, `release-checks` para cada hijo de lanzamiento, o un grupo más estrecho: `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` o `npm-telegram` en el paraguas. Esto mantiene limitada una nueva ejecución de una casilla de lanzamiento fallida después de una corrección enfocada. Para una canalización fallida entre sistemas operativos, combine `rerun_group=cross-os` con `cross_os_suite_filter`, por ejemplo `windows/packaged-upgrade`; los comandos largos entre sistemas operativos emiten líneas de latido y los resúmenes de actualización de paquetes incluyen tiempos por fase. Las canalizaciones de verificación de lanzamiento de QA son asesoradas, excepto la puerta de cobertura de herramientas de tiempo de ejecución estándar, que se bloquea cuando las herramientas dinámicas requeridas de OpenClaw se desvían o desaparecen del resumen de nivel estándar.

`OpenClaw Release Checks` usa la referencia de flujo de trabajo confiable para resolver la referencia seleccionada una vez en un archivo tar `release-package-under-test`, luego pasa ese artefacto a las verificaciones entre sistemas operativos y Aceptación de Paquetes, más el flujo de trabajo Docker de ruta de lanzamiento en vivo/E2E cuando se ejecuta la cobertura de soak. Esto mantiene los bytes del paquete consistentes en todas las casillas de lanzamiento y evita reempaquetar el mismo candidato en múltiples trabajos secundarios.

Las ejecuciones duplicadas de `Full Release Validation` para `ref=main` y `rerun_group=all`
suplantan al paraguas anterior. El monitor principal cancela cualquier flujo de trabajo secundario que
ya haya despachado cuando se cancela el principal, por lo que la validación principal más reciente
no se queda atrás de una ejecución de verificación de lanzamiento de dos horas obsoleta. La validación de
rama/etiqueta de lanzamiento y los grupos de nueva ejecución enfocados mantienen `cancel-in-progress: false`.

## Fragmentos en vivo y E2E

El hijo en vivo/E2E de lanzamiento mantiene una cobertura nativa `pnpm test:live` amplia, pero la ejecuta como fragmentos con nombre a través de `scripts/test-live-shard.mjs` en lugar de un trabajo en serie:

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
- dividir los fragmentos de audio/video de medios y los fragmentos de música filtrados por proveedor

Esto mantiene la misma cobertura de archivos al facilitar la reejecución y el diagnóstico de fallos lentos de proveedores en vivo. Los nombres agregados de los fragmentos `native-live-extensions-o-z`, `native-live-extensions-media` y `native-live-extensions-media-music` siguen siendo válidos para reejecuciones manuales únicas.

Los fragmentos de medios en vivo nativos se ejecutan en `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construidos por el flujo de trabajo `Live Media Runner Image`. Esa imagen preinstala `ffmpeg` y `ffprobe`; los trabajos de medios solo verifican los binarios antes de la configuración. Mantén las suites en vivo con soporte Docker en los runners normales de Blacksmith: los trabajos de contenedor no son el lugar correcto para lanzar pruebas Docker anidadas.

Los fragmentos de modelo/backend en vivo con soporte Docker utilizan una imagen `ghcr.io/openclaw/openclaw-live-test:<sha>` compartida separada por cada commit seleccionado. El flujo de trabajo de lanzamiento en vivo construye e inserta esa imagen una vez, y luego los fragmentos de modelo en vivo Docker, gateway con fragmentación por proveedor, backend CLI, enlace ACP y arnés Codex se ejecutan con `OPENCLAW_SKIP_DOCKER_BUILD=1`. Los fragmentos Docker de Gateway llevan límites `timeout` explícitos a nivel de script por debajo del tiempo de espera del trabajo del flujo de trabajo, de modo que un contenedor atascado o una ruta de limpieza fallan rápidamente en lugar de consumir todo el presupuesto de verificación de lanzamiento. Si esos fragmentos reconstruyen de forma independiente el objetivo Docker de origen completo, la ejecución del lanzamiento está mal configurada y desperdiciará tiempo de reloj en compilaciones de imágenes duplicadas.

## Aceptación de paquetes

Usa `Package Acceptance` cuando la pregunta sea "¿funciona este paquete instalable de OpenClaw como un producto?" Es diferente de la CI normal: la CI normal valida el árbol de fuentes, mientras que la aceptación de paquetes valida un solo archivo tarball a través del mismo arnés E2E Docker que los usuarios ejercen después de la instalación o actualización.

### Trabajos

1. `resolve_package` verifica `workflow_ref`, resuelve un candidato de paquete, escribe `.artifacts/docker-e2e-package/openclaw-current.tgz`, escribe `.artifacts/docker-e2e-package/package-candidate.json`, carga ambos como el artefacto `package-under-test` e imprime la fuente, la referencia del flujo de trabajo, la referencia del paquete, la versión, el SHA-256 y el perfil en el resumen del paso de GitHub.
2. `docker_acceptance` llama a `openclaw-live-and-e2e-checks-reusable.yml` con `ref=workflow_ref` y `package_artifact_name=package-under-test`. El flujo de trabajo reutilizable descarga ese artefacto, valida el inventario de archivos tar, prepara imágenes Docker de resumen de paquete (package-digest) cuando es necesario y ejecuta los carriles Docker seleccionados contra ese paquete en lugar de empaquetar la verificación del flujo de trabajo. Cuando un perfil selecciona múltiples `docker_lanes` específicos, el flujo de trabajo reutilizable prepara el paquete y las imágenes compartidas una vez, y luego distribuye esos carriles como trabajos Docker específicos paralelos con artefactos únicos.
3. `package_telegram` opcionalmente llama a `NPM Telegram Beta E2E`. Se ejecuta cuando `telegram_mode` no es `none` e instala el mismo artefacto `package-under-test` cuando Aceptación de Paquete resolvió uno; el despacho independiente de Telegram aún puede instalar una especificación npm publicada.
4. `summary` hace fallar el flujo de trabajo si falló la resolución del paquete, la aceptación de Docker o el carril opcional de Telegram.

### Fuentes candidatas

- `source=npm` acepta solo `openclaw@beta`, `openclaw@latest`, o una versión exacta de lanzamiento de OpenClaw como `openclaw@2026.4.27-beta.2`. Use esto para la aceptación de pre-lanzamientos/estables publicados.
- `source=ref` empaqueta una rama `package_ref` de confianza, etiqueta o SHA de confirmación completo. El resolvedor obtiene ramas/etiquetas de OpenClaw, verifica que la confirmación seleccionada sea alcanzable desde el historial de ramas del repositorio o una etiqueta de lanzamiento, instala dependencias en un árbol de trabajo separado y lo empaqueta con `scripts/package-openclaw-for-docker.mjs`.
- `source=url` descarga un HTTPS `.tgz`; se requiere `package_sha256`.
- `source=artifact` descarga un `.tgz` de `artifact_run_id` y `artifact_name`; `package_sha256` es opcional pero debe proporcionarse para los artefactos compartidos externamente.

Mantenga `workflow_ref` y `package_ref` separados. `workflow_ref` es el código de flujo de trabajo/arnés de confianza que ejecuta la prueba. `package_ref` es la confirmación de origen que se empaqueta cuando `source=ref`. Esto permite que el arnés de prueba actual valide confirmaciones de origen confiables antiguas sin ejecutar lógica de flujo de trabajo antigua.

### Perfiles de suites

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` más `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — fragmentos completos de la ruta de lanzamiento de Docker con OpenWebUI
- `custom` — `docker_lanes` exacto; obligatorio cuando `suite_profile=custom`

El perfil `package` utiliza cobertura de complementos sin conexión, por lo que la validación de paquetes publicados no depende de la disponibilidad de ClawHub en vivo. El carril opcional de Telegram reutiliza el artefacto `package-under-test` en `NPM Telegram Beta E2E`, manteniendo la ruta de especificación npm publicada para envíos independientes.

Para conocer la política dedicada de pruebas de actualizaciones y complementos, incluidos los comandos locales,
carriles de Docker, entradas de aceptación de paquetes, valores predeterminados de lanzamiento y triaje de fallas,
consulte [Prueba de actualizaciones y complementos](/es/help/testing-updates-plugins).

Las comprobaciones de release llaman a Package Acceptance con `source=artifact`, el artefacto del paquete de release preparado, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` y `telegram_mode=mock-openai`. Esto mantiene la migración del paquete, la actualización, la instalación en vivo de la habilidad ClawHub, la limpieza de dependencias de plugins obsoletos, la reparación de la instalación de plugins configurados, el plugin sin conexión, la actualización de plugins y la prueba de Telegram en el mismo tarball del paquete resuelto. Establezca `release_package_spec` en Full Release Validation o OpenClaw Release Checks después de publicar una beta para ejecutar la misma matriz contra el paquete npm enviado sin reconstruir; establezca `package_acceptance_package_spec` solo cuando Package Acceptance necesita un paquete diferente del resto de la validación de release. Las comprobaciones de release multi-OS aún cubren el incorporation específico del SO, el instalador y el comportamiento de la plataforma; la validación del producto de paquete/actualización debería comenzar con Package Acceptance. El carril Docker `published-upgrade-survivor` valida una línea base de paquete publicado por ejecución en la ruta de release de bloqueo. En Package Acceptance, el tarball `package-under-test` resuelto es siempre el candidato y `published_upgrade_survivor_baseline` selecciona la línea base publicada de reserva, por defecto es `openclaw@latest`; los comandos de reejecución de carril fallido preservan esa línea base. Full Release Validation con `run_release_soak=true` o `release_profile=full` establece `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` y `published_upgrade_survivor_scenarios=reported-issues` para expandirse a través de las cuatro últimas versiones estables de npm más las versiones de límite de compatibilidad de plugins fijadas y accesorios con forma de problema para la configuración de Feishu, archivos bootstrap/persona preservados, instalaciones de plugins de OpenClaw configurados, rutas de registro de tilde y raíces de dependencia de plugins heredados obsoletos. Las selecciones de supervivientes de actualización publicada de línea base múltiple se dividen por línea base en trabajos separados de Docker runner específicos. El flujo de trabajo separado `Update Migration` usa el carril Docker `update-migration` con `all-since-2026.4.23` y `plugin-deps-cleanup` cuando la pregunta es la limpieza exhaustiva de actualizaciones publicadas, no la amplitud normal de CI de Full Release. Las ejecuciones agregadas locales pueden pasar especificaciones exactas de paquetes con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, mantener un solo carril con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` como `openclaw@2026.4.15`, o establecer `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` para la matriz de escenarios. El carril publicado configura la línea base con una receta de comando `openclaw config set` integrada, registra los pasos de la receta en `summary.json` y sondea `/healthz`, `/readyz`, además del estado RPC después del inicio de Gateway. Los carriles fresh de paquete Windows e instalador también verifican que un paquete instalado pueda importar una anulación de control de navegador desde una ruta absoluta de Windows sin procesar. El humo de turno de agente multi-OS de OpenAI por defecto es `OPENCLAW_CROSS_OS_OPENAI_MODEL` si está establecido, de lo contrario `openai/gpt-5.5`, por lo que la prueba de instalación y puerta de enlace se mantiene en un modelo de prueba GPT-5 evitando los valores predeterminados de GPT-4.x.

### Ventanas de compatibilidad heredadas

Package Acceptance tiene ventanas de compatibilidad heredadas limitadas para los paquetes ya publicados. Los paquetes a través de `2026.4.25`, incluyendo `2026.4.25-beta.*`, pueden usar la ruta de compatibilidad:

- las entradas privadas de QA conocidas en `dist/postinstall-inventory.json` pueden apuntar a archivos omitidos en el tarball;
- `doctor-switch` puede omitir el subcaso de persistencia `gateway install --wrapper` cuando el paquete no expone esa marca;
- `update-channel-switch` puede eliminar los pnpm `patchedDependencies` que faltan del accesorio git falso derivado del tarball y puede registrar los `update.channel` persistentes que faltan;
- las pruebas de humo (smokes) de los complementos pueden leer ubicaciones de registros de instalación heredadas o aceptar la falta de persistencia de registros de instalación del marketplace;
- `plugin-update` puede permitir la migración de metadatos de configuración y aun así requerir que el registro de instalación y el comportamiento de no reinstalación permanezcan sin cambios.

El paquete publicado `2026.4.26` también puede advertir sobre los archivos de marca de metadatos de compilación local que ya se han enviado. Los paquetes posteriores deben cumplir los contratos modernos; las mismas condiciones fallan en lugar de advertir u omitir.

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

Al depurar una ejecución fallida de aceptación de paquetes, comience con el resumen `resolve_package` para confirmar la fuente, la versión y el SHA-256 del paquete. Luego inspeccione la ejecución secundaria `docker_acceptance` y sus artefactos Docker: `.artifacts/docker-tests/**/summary.json`, `failures.json`, registros de carriles, tiempos de fase y comandos de reejecución. Se prefiere volver a ejecutar el perfil del paquete fallido o los carriles Docker exactos en lugar de volver a ejecutar la validación completa de la versión.

## Prueba de humo de instalación

El flujo de trabajo separado `Install Smoke` reutiliza el mismo script de alcance a través de su propio trabajo `preflight`. Divide la cobertura de pruebas de humo en `run_fast_install_smoke` y `run_full_install_smoke`.

- Las ejecuciones de **Fast path** (ruta rápida) son para pull requests que tocan superficies de Docker/paquetes, cambios de paquetes/manifiestos de complementos agrupados, o superficies del SDK de complementos/canales/puerta de enlace principales que ejercen los trabajos de humo de Docker. Los cambios de complementos agrupados solo de código fuente, ediciones solo de pruebas y ediciones solo de documentación no reservan trabajadores de Docker. La ruta rápida construye la imagen raíz del Dockerfile una vez, verifica la CLI, ejecuta el humo de la CLI de eliminación del espacio de trabajo compartido de los agentes, ejecuta la prueba de extremo a extremo de la red de puerta de enlace del contenedor, verifica un argumento de compilación de extensión agrupada y ejecuta el perfil de Docker de complementos agrupados delimitado bajo un tiempo de espera de comando agregado de 240 segundos (la ejecución de Docker de cada escenario está limitada por separado).
- El **Full path** (ruta completa) mantiene la cobertura de instalación del paquete QR y del instalador de Docker/actualización para ejecuciones programadas nocturnas, despachos manuales, verificaciones de lanzamiento de llamadas de flujo de trabajo y pull requests que realmente tocan superficies del instalador/paquete/Docker. En modo completo, install-smoke prepara o reutiliza una imagen de humo del Dockerfile raíz GHCR del SHA de destino, luego ejecuta la instalación del paquete QR, humos del Dockerfile raíz/puerta de enlace, humos del instalador/actualización, y la prueba de extremo a extremo de Docker de complementos agrupados rápida como trabajos separados para que el trabajo del instalador no espere detrás de los humos de la imagen raíz.

Los pushes de `main` (incluyendo confirmaciones de fusión) no fuerzan la ruta completa; cuando la lógica de ámbito modificado solicitaría una cobertura completa en un push, el flujo de trabajo mantiene el humo rápido de Docker y deja el humo completo de instalación para la validación nocturna o de lanzamiento.

El humo del proveedor de imágenes de instalación global de Bun lento está controlado por separado por `run_bun_global_install_smoke`. Se ejecuta en el horario nocturno y desde el flujo de trabajo de verificaciones de lanzamiento, y los despachos manuales `Install Smoke` pueden optar por participar, pero los pull requests y los pushes de `main` no. Las pruebas de Docker de QR e instalador mantienen sus propios Dockerfiles enfocados en la instalación.

## Prueba de extremo a extremo local de Docker

`pnpm test:docker:all` preconstruye una imagen compartida de prueba en vivo, empaqueta OpenClaw una vez como un archivo tar de npm y construye dos imágenes compartidas `scripts/e2e/Dockerfile`:

- un ejecutor Node/Git simple para carriles de instalador/actualización/dependencia de complementos;
- una imagen funcional que instala el mismo archivo tar en `/app` para carriles de funcionalidad normal.

Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`, la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`, y el ejecutor solo ejecuta el plan seleccionado. El planificador selecciona la imagen por carril con `OPENCLAW_DOCKER_E2E_BARE_IMAGE` y `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, y luego ejecuta los carriles con `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Parámetros ajustables

| Variable                               | Predeterminado | Propósito                                                                                                                              |
| -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10             | Cantidad de ranuras del grupo principal para carriles normales.                                                                        |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10             | Cantidad de ranuras del grupo final sensibles al proveedor.                                                                            |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9              | Límite concurrente de carriles en vivo para que los proveedores no limiten el servicio.                                                |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10             | Límite concurrente de carriles de instalación de npm.                                                                                  |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7              | Límite concurrente de carriles multiservicio.                                                                                          |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000           | Intervalo entre inicios de carril para evitar tormentas de creación del demonio de Docker; establezca `0` para no tener intervalo.     |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000        | Tiempo de espera de reserva por carril (120 minutos); los carriles en vivo/finales seleccionados utilizan límites más estrictos.       |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | sin establecer | `1` imprime el plan del planificador sin ejecutar los carriles.                                                                        |
| `OPENCLAW_DOCKER_ALL_LANES`            | sin establecer | Lista exacta de carriles separados por comas; omite la limpieza de humo para que los agentes puedan reproducir un solo carril fallido. |

Un carril más pesado que su límite efectivo aún puede iniciarse desde un grupo vacío y luego ejecutarse solo hasta que libere capacidad. El agregado local realiza verificaciones previas de Docker, elimina contenedores obsoletos de OpenClaw E2E, emite el estado del carril activo, persiste los tiempos de los carriles para el ordenamiento más largo-primero y deja de programar nuevos carriles agrupados después del primer error de forma predeterminada.

### Flujo de trabajo reutilizable en vivo/E2E

El flujo de trabajo reutilizable de live/E2E pregunta a `scripts/test-docker-all.mjs --plan-json` qué paquete, tipo de imagen, imagen en vivo, carril y cobertura de credenciales se requieren. `scripts/docker-e2e.mjs` luego convierte ese plan en resultados y resúmenes de GitHub. Ya sea empaqueta OpenClaw a través de `scripts/package-openclaw-for-docker.mjs`, descarga un artefacto de paquete de la ejecución actual o descarga un artefacto de paquete de `package_artifact_run_id`; valida el inventario del tarball; construye y envía imágenes E2E de Docker bare/funcionales en GHCR etiquetadas con el resumen del paquete a través de la caché de capas de Docker de Blacksmith cuando el plan necesita carriles con paquete instalado; y reutiliza las entradas `docker_e2e_bare_image`/`docker_e2e_functional_image` proporcionadas o las imágenes existentes del resumen del paquete en lugar de reconstruir. Las extracciones de imágenes de Docker se reintentan con un tiempo de espera limitado de 180 segundos por intento, para que un flujo de registro/caché atascado se reintente rápidamente en lugar de consumir la mayor parte de la ruta crítica de CI.

### Fragmentos de la ruta de lanzamiento

La cobertura de Docker de lanzamiento ejecuta trabajos fragmentados más pequeños con `OPENCLAW_SKIP_DOCKER_BUILD=1` para que cada fragmento extraiga solo el tipo de imagen que necesita y ejecute múltiples carriles a través del mismo programador ponderado:

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Los fragmentos de Docker de lanzamiento actuales son `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` y `plugins-runtime-install-a` a través de `plugins-runtime-install-h`. `plugins-runtime-core`, `plugins-runtime` y `plugins-integrations` siguen siendo alias agregados de complementos/runtime. El alias de carril `install-e2e` sigue siendo el alias de reejecución manual agregado para ambos carriles de instalador de proveedor.

OpenWebUI se incluye en `plugins-runtime-services` cuando la cobertura completa de la ruta de lanzamiento lo solicita, y mantiene un fragmento independiente `openwebui` solo para envíos exclusivos de OpenWebUI. Los carriles de actualización del canal agrupado se reintentan una vez ante fallas transitorias de la red de npm.

Cada fragmento carga `.artifacts/docker-tests/` con registros de carril, tiempos, `summary.json`, `failures.json`, tiempos de fase, plan del programador JSON, tablas de carriles lentos y comandos de reejecución por carril. La entrada `docker_lanes` del flujo de trabajo ejecuta los carriles seleccionados contra las imágenes preparadas en lugar de los trabajos del fragmento, lo que mantiene la depuración de carriles fallidos limitada a un trabajo Docker específico y prepara, descarga o reutiliza el artefacto del paquete para esa ejecución; si un carril seleccionado es un carril Docker en vivo, el trabajo específico construye la imagen de prueba en vivo localmente para esa reejecución. Los comandos de reejecución de GitHub generados por carril incluyen `package_artifact_run_id`, `package_artifact_name`, y entradas de imagen preparadas cuando esos valores existen, de modo que un carril fallido puede reutilizar el paquete exacto y las imágenes de la ejecución fallida.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

El flujo de trabajo programado live/E2E ejecuta la suite completa Docker de ruta de lanzamiento diariamente.

## Plugin Prerelease

`Plugin Prerelease` es una cobertura de producto/paquete más costosa, por lo que es un flujo de trabajo separado despachado por `Full Release Validation` o por un operador explícito. Las solicitudes de extracción normales, los envíos a `main` y los despachos manuales de CI independientes mantienen esa suite desactivada. Equilibra las pruebas de complementos agrupados en ocho trabajadores de extensión; esos trabajos de fragmentos de extensión ejecutan hasta dos grupos de configuración de complementos a la vez con un trabajador Vitest por grupo y un montículo de Node más grande para que los lotes de complementos con muchas importaciones no creen trabajos de CI adicionales. La ruta de prelanzamiento Docker exclusiva de lanzamiento agrupa los carriles Docker específicos en grupos pequeños para evitar reservar docenas de ejecutores para trabajos de uno a tres minutos. El flujo de trabajo también carga un artefacto informativo `plugin-inspector-advisory` desde `@openclaw/plugin-inspector`; los hallazgos del inspector son entrada de triaje y no cambian el bloqueo de la puerta Plugin Prerelease.

## QA Lab

QA Lab tiene carriles de CI dedicados fuera del flujo de trabajo principal de ámbito inteligente. La paridad agéntica está anidada bajo los arneses amplios de QA y lanzamiento, no un flujo de trabajo de PR independiente. Use `Full Release Validation` con `rerun_group=qa-parity` cuando la paridad deba ir con una ejecución de validación amplia.

- El flujo de trabajo `QA-Lab - All Lanes` se ejecuta todas las noches en `main` y mediante despacho manual; distribuye los carriles de paridad simulada, Matrix en vivo y Telegram y Discord en vivo como trabajos paralelos. Los trabajos en vivo utilizan el entorno `qa-live-shared`, y Telegram/Discord utilizan arrendamientos de Convex.

Las comprobaciones de lanzamiento ejecutan los carriles de transporte en vivo de Matrix y Telegram con el proveedor simulado determinista y modelos calificados simulados (`mock-openai/gpt-5.5` y `mock-openai/gpt-5.5-alt`) para aislar el contrato del canal de la latencia del modelo en vivo y del inicio normal del complemento del proveedor. La puerta de enlace de transporte en vivo deshabilita la búsqueda de memoria porque la paridad de QA cubre el comportamiento de la memoria por separado; la conectividad del proveedor está cubierta por los conjuntos de pruebas separados del modelo en vivo, proveedor nativo y proveedor Docker.

Matrix utiliza `--profile fast` para las puertas programadas y de lanzamiento, añadiendo `--fail-fast` solo cuando el CLI extraído lo admite. El valor predeterminado del CLI y la entrada del flujo de trabajo manual siguen siendo `all`; el despacho manual `matrix_profile=all` siempre divide la cobertura completa de Matrix en trabajos `transport`, `media`, `e2ee-smoke`, `e2ee-deep` y `e2ee-cli`.

`OpenClaw Release Checks` también ejecuta los carriles críticos para el lanzamiento del QA Lab antes de la aprobación del lanzamiento; su puerta de paridad de QA ejecuta los paquetes de candidato y base como trabajos de carril paralelos, y luego descarga ambos artefactos en un pequeño trabajo de informe para la comparación final de paridad.

Para las PRs normales, siga la evidencia de CI/verificación con ámbito en lugar de tratar la paridad como un estado obligatorio.

## CodeQL

El flujo de trabajo `CodeQL` es intencionalmente un escáner de seguridad de primer paso estrecho, no el barrido completo del repositorio. Las ejecuciones diarias, manuales y de guardia de solicitudes de extracción que no son borradores escanean el código del flujo de trabajo de Actions más las superficies de JavaScript/TypeScript de mayor riesgo con consultas de seguridad de alta confianza filtradas a `security-severity` alta/crítica.

El guardián de solicitudes de extracción se mantiene ligero: solo se inicia para cambios bajo `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` o `src`, y ejecuta la misma matriz de seguridad de alta confianza que el flujo de trabajo programado. Android y macOS CodeQL se mantienen fuera de los valores predeterminados de PR.

### Categorías de seguridad

| Categoría                                         | Superficie                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Línea base de Auth, secrets, sandbox, cron y gateway                                                                                                                                        |
| `/codeql-security-high/channel-runtime-boundary`  | Contratos de implementación del canal principal más el tiempo de ejecución del complemento del canal, gateway, Plugin SDK, secrets y puntos de contacto de auditoría                        |
| `/codeql-security-high/network-ssrf-boundary`     | Superficies de política SSRF principal, análisis de IP, guardián de red, web-fetch y SSRF del Plugin SDK                                                                                    |
| `/codeql-security-high/mcp-process-tool-boundary` | Servidores MCP, asistentes de ejecución de procesos, entrega saliente y puertas de ejecución de herramientas de agente                                                                      |
| `/codeql-security-high/plugin-trust-boundary`     | Instalación de complementos, cargador, manifiesto, registro, instalación del administrador de paquetes, carga de fuentes y superficies de confianza del contrato de paquetes del Plugin SDK |

### Fragmentos de seguridad específicos de la plataforma

- `CodeQL Android Critical Security` — fragmento de seguridad de Android programado. Compila la aplicación de Android manualmente para CodeQL en el ejecutor Linux de Blacksmith más pequeño aceptado por la cordura del flujo de trabajo. Carga bajo `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — fragmento de seguridad de macOS semanal/manual. Compila la aplicación de macOS manualmente para CodeQL en Blacksmith macOS, filtra los resultados de compilación de dependencias del SARIF cargado y carga bajo `/codeql-critical-security/macos`. Se mantiene fuera de los valores predeterminados diarios porque la compilación de macOS domina el tiempo de ejecución incluso cuando está limpia.

### Categorías de calidad crítica

`CodeQL Critical Quality` es el fragmento (shard) que no es de seguridad coincidente. Ejecuta solo consultas de calidad de JavaScript/TypeScript de gravedad de error y no de seguridad sobre superficies de alto valor estrechas en el ejecutor (runner) Blacksmith Linux más pequeño. Su protección de solicitud de extracción es intencionalmente más pequeña que el perfil programado: las PRs que no son borradores solo ejecutan los fragmentos coincidentes `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` y `plugin-sdk-reply-runtime` para cambios en el código de ejecución/despacho de respuesta de comando/modelo/herramienta del agente, código de esquema/migración/ES de configuración, código de autenticación/secretos/sandbox/seguridad, tiempo de ejecución del complemento del canal central y del canal incluido, protocolo de pasarela/método de servidor, pegamento del tiempo de ejecución/SDK de memoria, entrega de proceso MCP/saliente, catálogo de modelo/tiempo de ejecución del proveedor, colas de diagnóstico/entrega de sesión, cargador de complementos, contrato de paquete/SDK del complemento, o cambios en el tiempo de ejecución de respuesta del SDK del complemento. Los cambios en la configuración de CodeQL y el flujo de trabajo de calidad ejecutan los doce fragmentos de calidad de PR.

El envío manual acepta:

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Los perfiles estrechos son enlaces de enseñanza/iteración para ejecutar un fragmento de calidad de forma aislada.

| Categoría                                               | Superficie                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Código de límite de seguridad de autenticación, secretos, sandbox, cron y puerta de enlace                                                                                                                                                |
| `/codeql-critical-quality/config-boundary`              | Esquema de configuración, migración, normalización y contratos de E/S                                                                                                                                                                     |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Esquemas de protocolo de puerta de enlace y contratos de método de servidor                                                                                                                                                               |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contratos de implementación del complemento del canal central y del canal incluido                                                                                                                                                        |
| `/codeql-critical-quality/agent-runtime-boundary`       | Ejecución de comandos, despacho de modelo/proveedor, despacho y colas de respuesta automática y contratos de tiempo de ejecución del plano de control de ACP                                                                              |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Servidores MCP y puentes de herramientas, asistentes de supervisión de procesos y contratos de entrega saliente                                                                                                                           |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK de host de memoria, fachadas del tiempo de ejecución de memoria, alias del SDK de complemento de memoria, pegamento de activación del tiempo de ejecución de memoria y comandos de doctor de memoria                                  |
| `/codeql-critical-quality/session-diagnostics-boundary` | Aspectos internos de la cola de respuesta, colas de entrega de sesiones, asistentes de vinculación/entrega de sesiones salientes, superficies de eventos de diagnóstico/registros y contratos de CLI del doctor de sesiones               |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Despacho de respuestas entrantes del SDK de complementos, asistentes de carga útil/fragmentación/ejecución de respuestas, opciones de respuesta del canal, colas de entrega y asistentes de vinculación de sesiones/hilos                 |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalización del catálogo de modelos, autenticación y descubrimiento de proveedores, registro de tiempo de ejecución de proveedores, valores predeterminados/catálogos de proveedores y registros web/búsqueda/recuperación/incrustación |
| `/codeql-critical-quality/ui-control-plane`             | Arranque de la interfaz de usuario de control, persistencia local, flujos de control de puerta de enlace y contratos de tiempo de ejecución del plano de control de tareas                                                                |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Recuperación/búsqueda web principal, E/S de medios, comprensión de medios, generación de imágenes y contratos de tiempo de ejecución de generación de medios                                                                              |
| `/codeql-critical-quality/plugin-boundary`              | Cargador, registro, superficie pública y contratos de punto de entrada del SDK de complementos                                                                                                                                            |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Fuente del SDK de complementos del lado del paquete publicado y asistentes de contratos de paquetes de complementos                                                                                                                       |

La calidad se mantiene separada de la seguridad para que los hallazgos de calidad puedan programarse, medirse, desactivarse o ampliarse sin oscurecer la señal de seguridad. La expansión de CodeQL para Swift, Python y complementos empaquetados debe agregarse nuevamente solo como trabajo de seguimiento con alcance o dividido en fragmentos después de que los perfiles estrechos tengan un tiempo de ejecución y una señal estables.

## Flujos de trabajo de mantenimiento

### Docs Agent

El flujo de trabajo `Docs Agent` es un carril de mantenimiento de Codex impulsado por eventos para mantener los documentos existentes alineados con los cambios recientes. No tiene un programa puro: una ejecución de CI de inserción exitosa que no sea de bot en `main` puede activarlo, y el envío manual puede ejecutarlo directamente. Las invocaciones de ejecución del flujo de trabajo se omiten cuando `main` ha avanzado o cuando se creó otra ejecución de Docs Agent no omitida en la última hora. Cuando se ejecuta, revisa el rango de confirmaciones desde el SHA de origen de Docs Agent anterior no omitido hasta el `main` actual, por lo que una ejecución por hora puede cubrir todos los cambios principales acumulados desde el último pase de documentos.

### Agente de rendimiento de pruebas

El flujo de trabajo `Test Performance Agent` es un carril de mantenimiento de Codex impulsado por eventos para pruebas lentas. No tiene un horario estricto: una ejecución de CI de push exitosa que no sea de bot en `main` puede activarlo, pero se omite si otra invocación de ejecución del flujo de trabajo ya se ejecutó o se está ejecutando ese día UTC. El despacho manual omite esa puerta de actividad diaria. El carril genera un informe de rendimiento de Vitest agrupado de suite completa, permite que Codex haga solo pequeñas correcciones de rendimiento de pruebas que preserven la cobertura en lugar de refactorizaciones amplias, luego vuelve a ejecutar el informe de suite completa y rechaza los cambios que reducen la cantidad de pruebas de referencia aprobadas. Si la referencia tiene pruebas fallidas, Codex puede corregir solo las fallas obvias y el informe de suite completa posterior al agente debe pasar antes de confirmar cualquier cambio. Cuando `main` avanza antes de que se aplique el push del bot, el carril hace rebase del parche validado, vuelve a ejecutar `pnpm check:changed` y reintenta el push; los parches obsoletos en conflicto se omiten. Utiliza Ubuntu alojado en GitHub para que la acción de Codex pueda mantener la misma postura de seguridad de drop-sudo que el agente de documentos.

### PR duplicados después de la fusión

El flujo de trabajo `Duplicate PRs After Merge` es un flujo de trabajo manual de mantenedor para la limpieza de duplicados posterior a la aplicación. Por defecto, es una ejecución en seco (dry-run) y solo cierra los PR listados explícitamente cuando `apply=true`. Antes de mutar GitHub, verifica que el PR aplicado se haya fusionado y que cada duplicado tenga un problema referenciado compartido o fragmentos de cambio superpuestos.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Puertas de verificación local y enrutamiento de cambios

La lógica del carril de cambios locales vive en `scripts/changed-lanes.mjs` y es ejecutada por `scripts/check-changed.mjs`. Esa puerta de verificación local es más estricta sobre los límites de arquitectura que el alcance amplio de la plataforma de CI:

- los cambios de producción de core ejecutan core prod y core test typecheck más core lint/guards;
- los cambios de solo pruebas de core ejecutan solo core test typecheck más core lint;
- los cambios de producción de extension ejecutan extension prod y extension test typecheck más extension lint;
- los cambios de solo pruebas de extension ejecutan extension test typecheck más extension lint;
- los cambios en el SDK público de Plugin o en el contrato de plugin se expanden a extension typecheck porque las extensiones dependen de esos contratos de core (los barridos de extensiones de Vitest siguen siendo trabajo de pruebas explícito);
- los incrementos de versión solo de metadatos de lanzamiento ejecutan comprobaciones de versión/configuración/dependencias-raíz dirigidas;
- los cambios desconocidos en la raíz/configuración fallan de forma segura en todos los carriles de comprobación.

El enrutamiento local de pruebas modificadas reside en `scripts/test-projects.test-support.mjs` y es intencionalmente más económico que `check:changed`: las ediciones directas de pruebas se ejecutan a sí mismas, las ediciones de código fuente prefieren asignaciones explícitas, luego pruebas hermanas y dependientes del gráfico de importación. La configuración de entrega de salas de grupo compartido es una de las asignaciones explícitas: los cambios en la configuración de respuesta visible del grupo, el modo de entrega de respuesta de origen o el mensaje del sistema de la herramienta de mensajes se enrutan a través de las pruebas de respuesta principal más regresiones de entrega en Discord y Slack, de modo que un cambio predeterminado compartido falle antes del primer push de PR. Use `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el cambio sea lo suficientemente amplio en el arnés como para que el conjunto mapeado económico no sea un proxy confiable.

## Validación de Testbox

Crabbox es el contenedor de caja remota propiedad del repositorio para pruebas de Linux de mantenedor. Úselo
desde la raíz del repositorio cuando una comprobación sea demasiado amplia para un bucle de edición local, cuando la
paridad de CI sea importante, o cuando la prueba necesite secretos, Docker, carriles de paquetes,
cajas reutilizables o registros remotos. El backend normal de OpenClaw es
`blacksmith-testbox`; la capacidad propiedad de AWS/Hetzner es un respaldo para cortes de Blacksmith,
problemas de cuota o pruebas explícitas de capacidad propia.

Las ejecuciones de Blacksmith respaldadas por Crabbox realizan calentamiento, reclamación, sincronización, ejecución, informe y limpieza
de Testboxes de un solo uso. La verificación de cordura de sincronización integrada falla rápidamente cuando los archivos
raíz requeridos como `pnpm-lock.yaml` desaparecen o cuando `git status --short`
muestra al menos 200 eliminaciones rastreadas. Para PRs con eliminaciones grandes intencionales, establezca
`OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` para el comando remoto.

Crabbox también termina una invocación local de la CLI de Blacksmith que permanece en la
fase de sincronización durante más de cinco minutos sin salida posterior a la sincronización. Establezca
`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` para deshabilitar ese guardián, o use un valor
de milisegundos mayor para diferencias locales inusualmente grandes.

Antes de una primera ejecución, verifique el contenedor desde la raíz del repositorio:

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

El contenedor del repositorio rechaza un binario Crabbox obsoleto que no anuncia `blacksmith-testbox`. Pase el proveedor explícitamente aunque `.crabbox.yaml` tenga valores predeterminados de nube propia (owned-cloud). En los árboles de trabajo de Codex o en los checkouts vinculados/dispersos (linked/sparse), evite el script `pnpm crabbox:run` local porque pnpm puede conciliar las dependencias antes de que Crabbox se inicie; en su lugar, invoque el contenedor de nodo directamente:

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

Cambio de puerta (gate):

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

Lea el resumen JSON final. Los campos útiles son `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` y `totalMs`. Las ejecuciones de Crabbox respaldadas por Blacksmith de un solo tiro deben detener el Testbox automáticamente; si se interrumpe una ejecución o la limpieza no está clara, inspeccione las cajas en vivo y detenga solo las cajas que creó:

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

Use la reutilización (reuse) solo cuando necesite intencionalmente múltiples comandos en la misma caja hidratada:

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

Si Crabbox es la capa rota pero Blacksmith funciona, use Blacksmith
directo solo para diagnósticos como `list`, `status` y limpieza. Corrija la ruta de Crabbox antes de tratar una ejecución directa de Blacksmith como una prueba de mantenimiento.

Si `blacksmith testbox list --all` y `blacksmith testbox status` funcionan pero los nuevos
calentamientos se quedan `queued` sin IP ni URL de ejecución de Actions después de un par de minutos,
trátelo como presión del proveedor, cola, facturación o límite de organización de Blacksmith. Detenga los
ids en cola que creó, evite iniciar más Testboxes y mueva la prueba a la ruta de capacidad de Crabbox propia a continuación mientras alguien verifica el tablero de Blacksmith,
la facturación y los límites de la organización.

Escale a la capacidad propia de Crabbox solo cuando Blacksmith está caído, limitado por cuota, sin el entorno necesario, o la capacidad propia es explícitamente el objetivo:

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Bajo presión de AWS, evita `class=beast` a menos que la tarea realmente necesite CPU de clase 48xlarge. Una solicitud `beast` comienza en 192 vCPUs y es la forma más fácil de exceder la cuota regional de EC2 Spot o On-Demand Standard. El `.crabbox.yaml` propiedad del repositorio tiene como valores predeterminados `standard`, múltiples regiones de capacidad y `capacity.hints: true` para que los arrendamientos de AWS intermediados impriman la región/mercado seleccionada, la presión de cuota, la reserva de Spot (fallback) y las advertencias de clase de alta presión. Usa `fast` para comprobaciones amplias más pesadas, `large` solo después de que estándar/rápido no sean suficientes, y `beast` solo para carriles excepcionalmente limitados por CPU, como matrices de Docker de suite completa o todos los complementos, validación explícita de versiones/bloqueadores, o perfilado de rendimiento de múltiples núcleos. No uses `beast` para `pnpm check:changed`, pruebas enfocadas, trabajo solo de documentación, lint/typecheck ordinarios, reproducciones E2E pequeñas o triaje de interrupciones de Blacksmith. Usa `--market on-demand` para el diagnóstico de capacidad para que la rotación del mercado Spot no se mezcle en la señal.

`.crabbox.yaml` posee los valores predeterminados de proveedor, sincronización e hidratación de GitHub Actions para los carriles de nube propiedad del (owned-cloud). Excluye `.git` locales para que el checkout de Actions hidratado mantenga sus propios metadatos remotos de Git en lugar de sincronizar los remotos y almacenes de objetos locales del mantenedor, y excluye los artefactos de tiempo de ejecución/construcción locales que nunca deben transferirse. `.github/workflows/crabbox-hydrate.yml` posee el checkout, la configuración de Node/pnpm, la obtención de `origin/main` y el traspaso de entorno no secreto para los comandos `crabbox run --id <cbx_id>` de nube propiedad del (owned-cloud).

## Relacionado

- [Resumen de instalación](/es/install)
- [Canales de desarrollo](/es/install/development-channels)
