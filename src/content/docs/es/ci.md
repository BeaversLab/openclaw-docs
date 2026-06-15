---
summary: "Gráfico de trabajos de CI, puertas de ámbito, paraguas de lanzamiento y equivalentes de comandos locales"
title: "Canalización de CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI de OpenClaw se ejecuta en cada inserción en `main` y en cada solicitud de extracción. El trabajo `preflight` clasifica las diferencias y desactiva los carriles costosos cuando solo cambiaron áreas no relacionadas. Las ejecuciones manuales de `workflow_dispatch` omiten intencionalmente el ámbito inteligente y despliegan el gráfico completo para candidatos de lanzamiento y validaciones amplias. Los carriles de Android permanecen opt-in a través de `include_android`. La cobertura de complementos solo para lanzamientos reside en el flujo de trabajo separado [`Plugin Prerelease`](#plugin-prerelease) y solo se ejecuta desde [`Full Release Validation`](#full-release-validation) o un envío manual explícito.

## Descripción general de la canalización

| Trabajo                            | Propósito                                                                                                                                                  | Cuándo se ejecuta                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `preflight`                        | Detectar cambios solo en documentos, alcances cambiados, extensiones cambiadas y construir el manifiesto de CI                                             | Siempre en inserciones y PR que no sean borradores |
| `security-fast`                    | Detección de claves privadas, auditoría de flujos de trabajo cambiados a través de `zizmor` y auditoría de archivos de bloqueo de producción               | Siempre en inserciones y PR que no sean borradores |
| `check-dependencies`               | Pase de solo dependencias de producción Knip más el guardián de lista de permitidos de archivos no utilizados                                              | Cambios relevantes para Node                       |
| `build-artifacts`                  | Compilación `dist/`, interfaz de usuario de control, pruebas de humo de CLI integradas, comprobaciones de artefactos integrados y artefactos reutilizables | Cambios relevantes para Node                       |
| `checks-fast-core`                 | Carriles de corrección rápida de Linux como bundled, protocol y comprobaciones de enrutamiento de CI                                                       | Cambios relevantes para Node                       |
| `checks-fast-contracts-plugins-*`  | Dos comprobaciones de contratos de complementos en fragmentos                                                                                              | Cambios relevantes para Node                       |
| `checks-fast-contracts-channels-*` | Dos comprobaciones de contratos de canal en fragmentos                                                                                                     | Cambios relevantes para Node                       |
| `checks-node-core-*`               | Fragmentos de prueba principales de Node, excluyendo los carriles de canal, bundled, contract y extension                                                  | Cambios relevantes para Node                       |
| `check-*`                          | Equivalente de puerta de enlace local principal en fragmentos: tipos de prod, lint, guardias, tipos de prueba y smoke estricto                             | Cambios relevantes para Node                       |
| `check-additional-*`               | Arquitectura, deriva de límites/prompts fragmentados, guardias de extensiones, límites de paquetes y topología de tiempo de ejecución                      | Cambios relevantes para Node                       |
| `checks-node-compat-node22`        | Carril de compilación y humo de compatibilidad con Node 22                                                                                                 | Despacho manual de CI para lanzamientos            |
| `check-docs`                       | Comprobaciones de formato, lint y enlaces rotos en documentos                                                                                              | Documentos cambiados                               |
| `skills-python`                    | Ruff + pytest para habilidades respaldadas por Python                                                                                                      | Cambios relevantes para habilidades de Python      |
| `checks-windows`                   | Pruebas de proceso/ruta específicas de Windows más regresiones de especificadores de importación de tiempo de ejecución compartidas                        | Cambios relevantes para Windows                    |
| `macos-node`                       | Carril de pruebas de TypeScript en macOS que utiliza los artefactos compilados compartidos                                                                 | Cambios relevantes para macOS                      |
| `macos-swift`                      | Lint, compilación y pruebas de Swift para la aplicación de macOS                                                                                           | Cambios relevantes para macOS                      |
| `android`                          | Pruebas unitarias de Android para ambas variantes más una compilación de APK de depuración                                                                 | Cambios relevantes para Android                    |
| `test-performance-agent`           | Optimización de pruebas lentas de Codex diarias después de una actividad confiable                                                                         | Éxito de CI principal o envío manual               |
| `openclaw-performance`             | Informes de rendimiento de tiempo de ejecución de Kova diarios/bajo demanda con proveedor simulado, perfil profundo y carriles en vivo con GPT 5.5         | Envío programado y manual                          |

## Orden de fail-fast

1. `preflight` decide qué carriles existen en absoluto. La lógica `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-fast`, `check-*`, `check-additional-*`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de artefactos y la matriz de plataformas.
3. `build-artifacts` se superpone con los carriles rápidos de Linux para que los consumidores descendentes puedan comenzar tan pronto como la compilación compartida esté lista.
4. Después de eso, se despliegan los carriles más pesados de plataforma y tiempo de ejecución: `checks-fast-core`, `checks-fast-contracts-plugins-*`, `checks-fast-contracts-channels-*`, `checks-node-core-*`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

GitHub puede marcar los trabajos obsoletos como `cancelled` cuando llega un nuevo push al mismo PR o a la referencia `main`. Trátelo como ruido de CI a menos que la ejecución más reciente para la misma referencia también esté fallando. Los trabajos de matriz usan `fail-fast: false`, y `build-artifacts` informa directamente los fallos de canal integrado, límite de soporte central y observador de puerta de enlace en lugar de poner en cola pequeños trabajos de verificación. La clave de concurrencia automática de CI está versionada (`CI-v7-*`) para que un zombi del lado de GitHub en un grupo de cola antiguo no pueda bloquear indefinidamente las ejecuciones principales más nuevas. Las ejecuciones manuales de suite completa usan `CI-manual-v1-*` y no cancelan las ejecuciones en curso.

Use `pnpm ci:timings`, `pnpm ci:timings:recent` o `node scripts/ci-run-timings.mjs <run-id>` para resumir el tiempo de reloj, el tiempo de cola, los trabajos más lentos, los fallos y la barrera de despliegue `pnpm-store-warmup` de GitHub Actions. CI también carga el mismo resumen de ejecución como un artefacto `ci-timings-summary`. Para verificar el tiempo de compilación, consulte el paso `Build dist` del trabajo `build-artifacts`: `pnpm build:ci-artifacts` imprime `[build-all] phase timings:` e incluye `ui:build`; el trabajo también carga el artefacto `startup-memory`.

Para las ejecuciones de solicitudes de extracción, el trabajo de resumen de tiempos (timing-summary) terminal ejecuta el asistente desde la revisión base confiable antes de pasar `GH_TOKEN` a `gh run view`. Eso mantiene la consulta con token fuera del código controlado por la rama mientras aún resume la ejecución de CI actual de la solicitud de extracción.

## Prueba del comportamiento real

Las solicitudes de extracción de colaboradores externos ejecutan un puerta (gate) `Real behavior proof` desde
`.github/workflows/real-behavior-proof.yml`. El flujo de trabajo verifica el commit
base confiable y evalúa solo el cuerpo de la solicitud de extracción; no ejecuta código de la
rama del colaborador.

El puerta se aplica a los autores de solicitudes de extracción que no son propietarios del repositorio, miembros,
colaboradores o bots. Pasa cuando el cuerpo de la solicitud de extracción contiene una
sección `Real behavior proof` con valores completos para:

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

La evidencia debe mostrar el comportamiento cambiado después del parche en una configuración real de OpenClaw. Las capturas de pantalla, grabaciones, capturas de terminal, salida de consola, salida en vivo copiada, registros de tiempo de ejecución redactados y artefactos vinculados todos cuentan. Las pruebas unitarias, simulaciones (mocks), instantáneas (snapshots), lint, verificaciones de tipo (typechecks) y resultados de CI son verificaciones de apoyo útiles, pero por sí mismos no satisfacen este requisito.

Cuando falla la verificación, actualice el cuerpo de la solicitud de extracción en lugar de enviar otro commit de código.
Los mantenedores pueden aplicar `proof: override` solo cuando el puerta de prueba no debe
aplicarse a esa solicitud de extracción.

## Alcance y enrutamiento

La lógica del ámbito reside en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`. El despacho manual omite la detección de cambios de ámbito y hace que el manifiesto de pre-vuelo actúe como si hubiera cambiado cada área con ámbito.

- **Las ediciones del flujo de trabajo de CI** validan el grafo de CI de Node más el linting del flujo de trabajo, pero no fuerzan por sí mismas las compilaciones nativas de Windows, Android o macOS; esos carriles de plataforma permanecen limitados a los cambios del código fuente de la plataforma.
- **Workflow Sanity** ejecuta `actionlint`, `zizmor` sobre todos los archivos YAML de flujo de trabajo, el guardián de interpolación de acciones compuestas y el guardián de marcadores de conflicto. El trabajo `security-fast` con ámbito de solicitud de extracción también ejecuta `zizmor` sobre los archivos de flujo de trabajo modificados para que los hallazgos de seguridad del flujo de trabajo fallen temprano en el gráfico de CI principal.
- **Docs en `main` pushes** son verificadas por el flujo de trabajo independiente `Docs` con el mismo espejo de documentos ClawHub utilizado por CI, por lo que los envíos mixtos de código y documentos no también ponen en cola el fragmento `check-docs` de CI. Las solicitudes de extracción y la CI manual aún ejecutan `check-docs` desde CI cuando cambian los documentos.
- **TUI PTY** es un flujo de trabajo centrado en los cambios de TUI. Ejecuta `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` en Linux Node 24 para `src/tui/**`, el arnés de vigilancia (watch harness), el script de paquete, el archivo de bloqueo y las ediciones del flujo de trabajo. El carril obligatorio utiliza un dispositivo (fixture) `TuiBackend` determinista; la prueba `tui --local` más lenta es opcional con `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` y solo simula el endpoint del modelo externo.
- **Las ediciones solo de enrutamiento de CI, las ediciones seleccionadas de dispositivos de pruebas centrales baratos y las ediciones de ayuda/enrutamiento de pruebas de contratos de complementos estrechos** utilizan una ruta de manifiesto solo para Node rápida: `preflight`, seguridad y una sola tarea `checks-fast-core`. Esa ruta omite los artefactos de compilación, la compatibilidad con Node 22, los contratos de canal, los fragmentos centrales completos, los fragmentos de complementos empaquetados y matrices de guardia adicionales cuando el cambio se limita a las superficies de enrutamiento o ayuda que la tarea rápida ejerce directamente.
- **Las comprobaciones de Windows Node** se limitan a los contenedores de proceso/ruta específicos de Windows, los ayudantes de ejecución npm/pnpm/UI, la configuración del gestor de paquetes y las superficies del flujo de trabajo de CI que ejecutan ese carril; los cambios no relacionados de fuente, complemento, instalación-smoke y solo pruebas permanecen en los carriles de Linux Node.

Las familias de pruebas de Node más lentas se dividen o equilibran para que cada trabajo se mantenga pequeño sin sobre-reservar runners: los contratos de complementos y los contratos de canales se ejecutan cada uno como dos fragmentos (shards) con respaldo de Blacksmith ponderados, con la alternativa estándar del runner de GitHub, los carriles (lanes) rápidos/de soporte de unidades centrales se ejecutan por separado, la infraestructura de tiempo de ejecución central se divide entre estado, proceso/configuración, compartido y tres fragmentos de dominio cron, la respuesta automática se ejecuta como trabajadores equilibrados (con el subárbol de respuesta dividido en fragmentos de agent-runner, dispatch y commands/state-routing), y las configuraciones de puerta de enlace/servidor de agentes se dividen entre los carriles de chat/auth/model/http-plugin/runtime/startup en lugar de esperar a los artefactos construidos. Las pruebas amplias de navegador, QA, multimedia y otros complementos diversos utilizan sus configuraciones dedicadas de Vitest en lugar de la configuración general compartida de complementos. Los fragmentos de patrones de inclusión registran entradas de tiempo utilizando el nombre del fragmento de CI, por lo que `.artifacts/vitest-shard-timings.json` puede distinguir una configuración completa de un fragmento filtrado. `check-additional-*` mantiene juntos el trabajo de compilación/prueba de límites de paquetes y separa la arquitectura de topología de tiempo de ejecución de la cobertura de vigilancia de la puerta de enlace; la lista de guardias de límites se divide en franjas en un fragmento pesado en prompts y un fragmento combinado para las franjas de guardias restantes, ejecutando cada uno los guardias independientes seleccionados simultáneamente e imprimiendo tiempos por verificación. La costosa verificación de deriva de la instantánea del prompt de ruta feliz de Codex se ejecuta como su propio trabajo adicional para la CI manual y solo para cambios que afectan los prompts, por lo que los cambios normales no relacionados de Node no esperan detrás de la generación de instantáneas de prompts en frío y los fragmentos de límites se mantienen equilibrados mientras que la deriva de prompts aún se vincula al PR que la causó; el mismo indicador omite la generación de instantáneas de Vitest de prompts dentro del fragmento de límites de soporte central de artefactos construidos. Gateway watch, las pruebas de canal y el fragmento de límites de soporte central se ejecutan simultáneamente dentro de `build-artifacts` después de que `dist/` y `dist-runtime/` ya se han construido.

La CI de Android ejecuta tanto `testPlayDebugUnitTest` como `testThirdPartyDebugUnitTest` y luego compila el APK de depuración de Play. La variante de terceros no tiene un conjunto de fuentes ni manifiesto separados; su canal de pruebas unitarias aún compila la variante con las banderas BuildConfig de registro de SMS/llamadas, evitando al mismo tiempo un trabajo duplicado de empaquetado del APK de depuración en cada push relevante para Android.

El shard `check-dependencies` ejecuta `pnpm deadcode:dependencies` (un pase de producción solo de dependencias de Knip fijado a la última versión de Knip, con la antigüedad mínima de lanzamiento de pnpm deshabilitada para la instalación `dlx`) y `pnpm deadcode:unused-files`, que compara los hallazgos de archivos no utilizados en producción de Knip contra `scripts/deadcode-unused-files.allowlist.mjs`. El guardián de archivos no utilizados falla cuando un PR agrega un nuevo archivo no utilizado sin revisar o deja una entrada obsoleta en la lista de permitidos, mientras preserva las superficies intencionales de complementos dinámicos, generados, de compilación, pruebas en vivo y puentes de paquetes que Knip no puede resolver estáticamente.

## Reenvío de actividad de ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` es el puente del lado objetivo desde la actividad del repositorio OpenClaw hacia ClawSweeper. No extrae ni ejecuta código de pull request que no sea de confianza. El flujo de trabajo crea un token de GitHub App desde `CLAWSWEEPER_APP_PRIVATE_KEY` y luego envía cargas compactas `repository_dispatch` a `openclaw/clawsweeper`.

El flujo de trabajo tiene cuatro canales:

- `clawsweeper_item` para solicitudes exactas de revisión de issues y pull requests;
- `clawsweeper_comment` para comandos explícitos de ClawSweeper en comentarios de issues;
- `clawsweeper_commit_review` para solicitudes de revisión a nivel de commit en pushes a `main`;
- `github_activity` para la actividad general de GitHub que el agente ClawSweeper puede inspeccionar.

El canal `github_activity` reenvía solo metadatos normalizados: tipo de evento, acción, actor, repositorio, número de elemento, URL, título, estado y breves extractos para comentarios o revisiones cuando están presentes. Evita intencionalmente reenviar el cuerpo completo del webhook. El flujo de trabajo receptor en `openclaw/clawsweeper` es `.github/workflows/github-activity.yml`, que publica el evento normalizado en el enlace OpenClaw Gateway para el agente ClawSweeper.

La actividad general es de observación, no de entrega por defecto. El agente ClawSweeper recibe el objetivo de Discord en su indicación (prompt) y debe publicar en `#clawsweeper` solo cuando el evento es sorprendente, accionable, arriesgado o útil operacionalmente. Las aperturas rutinarias, ediciones, actividad de bots, ruido de webhooks duplicados y el tráfico normal de revisiones deberían dar como resultado `NO_REPLY`.

Trate los títulos, comentarios, cuerpos, texto de revisión, nombres de rama y mensajes de confirmación de GitHub como datos no confiables a lo largo de esta ruta. Son entradas para el resumen y la clasificación, no instrucciones para el flujo de trabajo o el tiempo de ejecución del agente.

## Envíos manuales

Los envíos manuales de CI ejecutan el mismo grafo de trabajos que la CI normal, pero fuerzan la activación de cada carril con ámbito no Android: fragmentos de Linux Node, fragmentos de bundled-plugin, fragmentos de contratos de complementos y canales, compatibilidad con Node 22, `check-*`, `check-additional-*`, comprobaciones de humo de artefactos construidos, comprobaciones de documentos, habilidades de Python, Windows, macOS e i18n de Control UI. Los envíos manuales independientes de CI ejecutan solo Android con `include_android=true`; la sombrilla completa de lanzamiento habilita Android pasando `include_android=true`. Las comprobaciones estáticas de prelanzamiento de complementos, el fragmento `agentic-plugins` solo para lanzamiento, el barrido completo por lotes de extensiones y los carriles Docker de prelanzamiento de complementos están excluidos de la CI. El conjunto de prelanzamiento de Docker se ejecuta solo cuando `Full Release Validation` despacha el flujo de trabajo separado `Plugin Prerelease` con la puerta de validación de lanzamiento habilitada.

Las ejecuciones manuales utilizan un grupo de concurrencia único para que el conjunto completo de candidato a lanzamiento no sea cancelado por otro envío o ejecución de PR en la misma referencia. La entrada opcional `target_ref` permite a un llamador de confianza ejecutar ese grafo contra una rama, etiqueta o SHA de confirmación completa mientras utiliza el archivo de flujo de trabajo de la referencia de despacho seleccionada.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Ejecutores

| Ejecutor                         | Trabajos                                                                                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | Despacho manual de CI y respaldos de repositorios no canónicos, workflow-sanity, labeler, auto-response, flujos de trabajo de documentos fuera de la CI, y install-smoke preflight para que la matriz de Blacksmith pueda ponerse en cola antes |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `preflight`, `security-fast`, shards de extensiones de menor peso, `checks-fast-core`, shards de contrato de plugin/canal, `checks-node-compat-node22`, `check-guards`, `check-prod-types`, y `check-test-types`     |
| `blacksmith-8vcpu-ubuntu-2404`   | Shards de pruebas de Linux Node, shards de pruebas de plugins empaquetados, shards `check-additional-*`, `check-dependencies`, y `android`                                                                                                      |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (lo suficientemente sensibles a la CPU que 8 vCPU costaban más de lo que ahorraban); compilaciones Docker de install-smoke (el tiempo de espera en la cola de 32 vCPU costaba más de lo que ahorraba)           |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                |
| `blacksmith-6vcpu-macos-15`      | `macos-node` en `openclaw/openclaw`; los forks vuelven a `macos-15`                                                                                                                                                                             |
| `blacksmith-12vcpu-macos-26`     | `macos-swift` en `openclaw/openclaw`; los forks vuelven a `macos-26`                                                                                                                                                                            |

La CI del repositorio canónico mantiene a Blacksmith como la ruta de ejecución predeterminada para ejecuciones normales de push y pull-request. `workflow_dispatch` y las ejecuciones de repositorios no canónicos utilizan ejecutores alojados en GitHub, pero las ejecuciones canónicas normales actualmente no sondean el estado de la cola de Blacksmith ni vuelven automáticamente a las etiquetas alojadas en GitHub cuando Blacksmith no está disponible.

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
node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
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
pnpm test:startup:memory
pnpm test:extensions:memory -- --json .artifacts/openclaw-performance/source/mock-provider/extension-memory.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## Rendimiento de OpenClaw

`OpenClaw Performance` es el flujo de trabajo de rendimiento del producto/ejecución. Se ejecuta diariamente en `main` y se puede despachar manualmente:

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

El despacho manual normalmente compara el rendimiento del flujo de trabajo ref. Establezca `target_ref` para comparar una etiqueta de lanzamiento u otra rama con la implementación actual del flujo de trabajo. Las rutas de informe publicadas y los punteros más recientes se clavean por el ref probado, y cada `index.md` registra el ref/SHA probado, flujo de trabajo ref/SHA, Kova ref, perfil, modo de autenticación de carril, modelo, recuento de repetición y filtros de escenarios.

El flujo de trabajo instala OCM desde una versión fijada y Kova desde `openclaw/Kova` en la entrada fijada `kova_ref`, y luego ejecuta tres carriles:

- `mock-provider`: escenarios de diagnóstico de Kova contra un tiempo de ejecución de compilación local con autenticación falsa determinista compatible con OpenAI.
- `mock-deep-profile`: perfilado de CPU/pila/traza para puntos críticos de arranque, puerta de enlace y turnos de agente.
- `live-openai-candidate`: un turno de agente `openai/gpt-5.5` real de OpenAI, omitido cuando `OPENAI_API_KEY` no está disponible.

El carril de proveedor simulado también ejecuta sondas de origen nativas de OpenClaw después del pase de Kova: tiempo de arranque y memoria de la puerta de enlace en casos de arranque predeterminados, de enlace y de 50 complementos; RSS de importación de complementos empaquetados, bucles de hola `channel-chat-baseline` repetidos de OpenAI simulados y comandos de arranque de CLI contra la puerta de enlace iniciada. Cuando el informe de origen de proveedor simulado publicado anteriormente está disponible para la referencia probada, el resumen de origen compara los valores actuales de RSS y pila con esa línea base y marca grandes aumentos de RSS como `watch`. El resumen de Markdown de la sonda de origen se encuentra en `source/index.md` en el paquete del informe, con JSON sin procesar junto a él.

Cada carril carga artefactos de GitHub. Cuando `CLAWGRIT_REPORTS_TOKEN` está configurado, el flujo de trabajo también confirma `report.json`, `report.md`, paquetes, `index.md` y artefactos de sonda de origen en `openclaw/clawgrit-reports` bajo `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. El puntero de referencia probada actual se escribe como `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validación completa de lanzamiento

`Full Release Validation` es el flujo de trabajo manual paraguas para "ejecutar todo antes del lanzamiento". Acepta una rama, etiqueta o SHA de confirmación completo, despacha el flujo de trabajo manual `CI` con ese objetivo, despacha `Plugin Prerelease` para la prueba de complemento/paquete/estático/Docker solo de lanzamiento, y despacha `OpenClaw Release Checks` para pruebas de humo de instalación, aceptación de paquetes, verificaciones de paquetes multi-OS, paridad del QA Lab, Matrix y carriles de Telegram. Las ejecuciones estables/predeterminadas mantienen la cobertura exhaustiva de vivo/E2E y la ruta de lanzamiento de Docker detrás de `run_release_soak=true`; `release_profile=full` fuerza que esa cobertura de inmersión se active para que la validación asesora amplia siga siendo amplia. Con `rerun_group=all` y `release_profile=full`, también ejecuta `NPM Telegram Beta E2E` contra el artefacto `release-package-under-test` de las verificaciones de lanzamiento. Después de publicar, pase `release_package_spec` para reutilizar el paquete npm enviado en las verificaciones de lanzamiento, Aceptación de Paquetes, Docker, multi-OS y Telegram sin reconstruir. Use `npm_telegram_package_spec` solo cuando Telegram deba probar un paquete diferente. El carril de paquete en vivo del complemento Codex usa el mismo estado seleccionado por defecto: `release_package_spec=openclaw@<tag>` publicado deriva `codex_plugin_spec=npm:@openclaw/codex@<tag>`, mientras que las ejecuciones SHA/artefacto empaquetan `extensions/codex` desde la referencia seleccionada. Establezca `codex_plugin_spec` explícitamente para fuentes de complementos personalizadas como `npm:`, `npm-pack:`, o especificaciones `git:`.

Consulte [Validación de lanzamiento completa](/es/reference/full-release-validation) para obtener la
matriz de etapas, nombres exactos de trabajos de flujo de trabajo, diferencias de perfil, artefactos y
identificadores de nueva ejecución enfocada.

`OpenClaw Release Publish` es el flujo de trabajo de lanzamiento con mutaciones manual. Despáchelo
desde `release/YYYY.M.D` o `main` después de que exista la etiqueta de lanzamiento y después de que
haya tenido éxito el preflight de npm de OpenClaw. Verifica `pnpm plugins:sync:check`,
despacha `Plugin NPM Release` para todos los paquetes de complementos publicables, despacha
`Plugin ClawHub Release` para el mismo SHA de lanzamiento y solo entonces despacha
`OpenClaw NPM Release` con el `preflight_run_id` guardado.

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Para una prueba de confirmación anclada en una rama de movimiento rápido, use el asistente en lugar de
`gh workflow run ... --ref main -f ref=<sha>`:

```bash
pnpm ci:full-release --sha <full-sha>
```

Las referencias de despacho de flujo de trabajo de GitHub deben ser ramas o etiquetas, no SHA de confirmación sin procesar. El
asistente envía una rama temporal `release-ci/<sha>-...` en el SHA objetivo,
despacha `Full Release Validation` desde esa referencia anclada, verifica que cada flujo de trabajo secundario
`headSha` coincida con el objetivo y elimina la rama temporal cuando la
ejecución se completa. El verificador paraguas también falla si algún flujo de trabajo secundario se ejecutó en un
SHA diferente.

`release_profile` controla la amplitud de proveedores/en vivo que se pasa a las comprobaciones de lanzamiento. Los
flujos de trabajo de lanzamiento manuales predeterminados son `stable`; use `full` solo cuando
intencionalmente quiera la matriz amplia de proveedores/medios de avisos. `run_release_soak`
controla si las comprobaciones de lanzamiento estables/predeterminadas ejecutan la prueba exhaustiva de en vivo/E2E y
de ruta de lanzamiento de Docker; `full` fuerza la prueba activada.

- `minimum` mantiene los carriles más rápidos críticos para el lanzamiento de OpenAI/núcleo.
- `stable` añade el conjunto estable de proveedores/backend.
- `full` ejecuta la matriz amplia de proveedores/medios de avisos.

El paraguas registra los ids de ejecución secundarios despachados, y el trabajo final `Verify full validation` vuelve a verificar las conclusiones actuales de ejecución secundaria y añade tablas del trabajo más lento para cada ejecución secundaria. Si se vuelve a ejecutar un flujo de trabajo secundario y se vuelve verde, vuelva a ejecutar solo el trabajo verificador principal para actualizar el resultado del paraguas y el resumen de tiempos.

Para la recuperación, tanto `Full Release Validation` como `OpenClaw Release Checks` aceptan `rerun_group`. Use `all` para un candidato de lanzamiento, `ci` solo para el hijo completo de CI normal, `plugin-prerelease` solo para el hijo de prelanzamiento del complemento, `release-checks` para cada hijo de lanzamiento, o un grupo más estrecho: `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` o `npm-telegram` en el paraguas. Esto mantiene la reejecución de una caja de lanzamiento fallida limitada después de una corrección enfocada. Para un carril multi-OS fallido, combine `rerun_group=cross-os` con `cross_os_suite_filter`, por ejemplo `windows/packaged-upgrade`; los comandos largos multi-OS emiten líneas de latido y los resúmenes de actualización de paquetes incluyen tiempos por fase. Los carriles de comprobación de lanzamiento de QA son consultivos, excepto la puerta de cobertura de herramientas de tiempo de ejecución estándar, que se bloquea cuando las herramientas dinámicas OpenClaw requeridas se desvían o desaparecen del resumen de nivel estándar.

`OpenClaw Release Checks` usa la referencia de flujo de trabajo confiable para resolver la referencia seleccionada una vez en un archivo tar `release-package-under-test`, luego pasa ese artefacto a las comprobaciones multi-OS y Aceptación del Paquete, además del flujo de trabajo Docker de ruta de lanzamiento en vivo/E2E cuando se ejecuta la cobertura de soaking. Esto mantiene los bytes del paquete consistentes en las cajas de lanzamiento y evita reempaquetar el mismo candidato en múltiples trabajos hijos. Para el carril en vivo del complemento npm de Codex, las comprobaciones de lanzamiento pasan una especificación de complemento publicada coincidente derivada de `release_package_spec`, pasan `codex_plugin_spec` suministrada por el operador, o dejan la entrada en blanco para que el script Docker empaquete el complemento Codex de la confirmación seleccionada.

Las ejecuciones duplicadas de `Full Release Validation` para `ref=main` y `rerun_group=all`
suplantan al paraguas anterior. El monitor principal cancela cualquier flujo de trabajo secundario que
ya haya despachado cuando se cancela el principal, por lo que la validación más reciente de la rama principal
no se queda detrás de una ejecución obsoleta de comprobación de lanzamiento de dos horas. La validación de ramas/etiquetas de lanzamiento
y los grupos de nueva ejecución centrados mantienen `cancel-in-progress: false`.

## Fracciones de Live y E2E

El hijo de lanzamiento Live/E2E mantiene una cobertura nativa `pnpm test:live` amplia, pero la ejecuta como fracciones con nombre a través de `scripts/test-live-shard.mjs` en lugar de un trabajo serie:

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
- dividir fracciones de audio/video de medios y fracciones de música filtradas por proveedor

Eso mantiene la misma cobertura de archivos mientras hace que los fallos de los proveedores lentos de Live sean más fáciles de volver a ejecutar y diagnosticar. Los nombres de fracciones agregados `native-live-extensions-o-z`, `native-live-extensions-media` y `native-live-extensions-media-music` siguen siendo válidos para nuevas ejecuciones manuales únicas.

Las fracciones de medios nativos Live se ejecutan en `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construidas por el flujo de trabajo `Live Media Runner Image`. Esa imagen preinstala `ffmpeg` y `ffprobe`; los trabajos de medios solo verifican los binarios antes de la configuración. Mantenga las suites Live con soporte Docker en los ejecutores normales de Blacksmith: los trabajos contenedores no son el lugar adecuado para lanzar pruebas Docker anidadas.

Los shards de modelo en vivo/backend respaldados por Docker utilizan una imagen compartida separada `ghcr.io/openclaw/openclaw-live-test:<sha>` por cada commit seleccionado. El flujo de trabajo de lanzamiento en vivo construye y envía esa imagen una sola vez, luego los shards del modelo Docker en vivo, la puerta de enlace con shard por proveedor, el backend CLI, el enlace ACP y el arnés Codex se ejecutan con `OPENCLAW_SKIP_DOCKER_BUILD=1`. Los shards Docker de la puerta de enlace portan límites explícitos a nivel de script `timeout` por debajo del tiempo de espera del trabajo del flujo de trabajo, de modo que un contenedor atascado o una ruta de limpieza fallen rápidamente en lugar de consumir todo el presupuesto de verificación de lanzamiento. Si esos shards reconstruyen independientemente el objetivo Docker de fuente completo, la ejecución del lanzamiento está mal configurada y desperdiciará tiempo de reloj en compilaciones de imágenes duplicadas.

## Aceptación de paquetes

Use `Package Acceptance` cuando la pregunta sea "¿funciona este paquete instalable de OpenClaw como un producto?" Es diferente de la CI normal: la CI normal valida el árbol de fuentes, mientras que la aceptación de paquetes valida un solo tarball a través del mismo arnés Docker E2E que los usuarios ejecutan después de la instalación o actualización.

### Trabajos

1. `resolve_package` realiza el checkout de `workflow_ref`, resuelve un candidato de paquete, escribe `.artifacts/docker-e2e-package/openclaw-current.tgz`, escribe `.artifacts/docker-e2e-package/package-candidate.json`, carga ambos como el artefacto `package-under-test` e imprime la fuente, la referencia del flujo de trabajo, la referencia del paquete, la versión, SHA-256 y el perfil en el resumen del paso de GitHub.
2. `docker_acceptance` llama a `openclaw-live-and-e2e-checks-reusable.yml` con `ref=workflow_ref` y `package_artifact_name=package-under-test`. El flujo de trabajo reutilizable descarga ese artefacto, valida el inventario del tarball, prepara las imágenes Docker de resumen de paquete cuando es necesario y ejecuta los carriles Docker seleccionados contra ese paquete en lugar de empaquetar el checkout del flujo de trabajo. Cuando un perfil selecciona múltiples `docker_lanes` dirigidos, el flujo de trabajo reutilizable prepara el paquete y las imágenes compartidas una vez, y luego distribuye esos carriles como trabajos Docker dirigidos paralelos con artefactos únicos.
3. `package_telegram` opcionalmente llama a `NPM Telegram Beta E2E`. Se ejecuta cuando `telegram_mode` no es `none` e instala el mismo artefacto `package-under-test` cuando Package Acceptance resolvió uno; el envío independiente de Telegram aún puede instalar una especificación npm publicada.
4. `summary` hace fallar el flujo de trabajo si falló la resolución del paquete, la aceptación de Docker o el carril opcional de Telegram.

### Fuentes candidatas

- `source=npm` acepta solo `openclaw@beta`, `openclaw@latest`, o una versión de lanzamiento exacta de OpenClaw como `openclaw@2026.4.27-beta.2`. Use esto para aceptación de prelanzamiento/estable publicada.
- `source=ref` empaqueta una rama, etiqueta o SHA de confirmación completo de `package_ref` de confianza. El solucionador obtiene ramas/etiquetas de OpenClaw, verifica que la confirmación seleccionada sea alcanzable desde el historial de ramas del repositorio o una etiqueta de lanzamiento, instala dependencias en un árbol de trabajo separado y lo empaqueta con `scripts/package-openclaw-for-docker.mjs`.
- `source=url` descarga un `.tgz` HTTPS público; se requiere `package_sha256`. Esta ruta rechaza credenciales de URL, puertos HTTPS no predeterminados, nombres de host o IPs resueltas privadas/internas/de uso especial y redirecciones fuera de la misma política de seguridad pública.
- `source=trusted-url` descarga un `.tgz` HTTPS desde una política de fuente de confianza con nombre en `.github/package-trusted-sources.json`; se requieren `package_sha256` y `trusted_source_id`. Use esto solo para réplicas empresariales propiedad de los mantenedores o repositorios de paquetes privados que necesitan hosts, puertos, prefijos de ruta, hosts de redirección o resolución de red privada configurados. Si la política declara autenticación de portador, el flujo de trabajo usa el secreto fijo `OPENCLAW_TRUSTED_PACKAGE_TOKEN`; las credenciales incrustadas en la URL todavía se rechazan.
- `source=artifact` descarga un `.tgz` de `artifact_run_id` y `artifact_name`; `package_sha256` es opcional pero debería proporcionarse para artefactos compartidos externamente.

Mantenga `workflow_ref` y `package_ref` separados. `workflow_ref` es el código de flujo de work/harness de confianza que ejecuta la prueba. `package_ref` es la confirmación de origen que se empaqueta cuando `source=ref`. Esto permite que el arnés de prueba actual valide confirmaciones de origen de confianza más antiguas sin ejecutar lógica de flujo de trabajo antigua.

### Perfiles de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` más `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — fragmentos completos de la ruta de lanzamiento de Docker con OpenWebUI
- `custom` — `docker_lanes` exacto; obligatorio cuando `suite_profile=custom`

El perfil `package` utiliza cobertura de complementos sin conexión, por lo que la validación del paquete publicado no depende de la disponibilidad en vivo de ClawHub. El carril opcional de Telegram reutiliza el artefacto `package-under-test` en `NPM Telegram Beta E2E`, manteniendo la ruta de especificación npm publicada para envíos independientes.

Para la política dedicada de pruebas de actualizaciones y complementos, incluidos los comandos locales,
carriles de Docker, entradas de aceptación de paquetes, valores predeterminados de lanzamiento y triaje de fallas,
consulte [Pruebas de actualizaciones y complementos](/es/help/testing-updates-plugins).

Las comprobaciones de lanzamiento llaman a Package Acceptance con `source=artifact`, el artefacto del paquete de lanzamiento preparado, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` y `telegram_mode=mock-openai`. Esto mantiene la migración del paquete, la actualización, la instalación en vivo de la habilidad ClawHub, la limpieza de dependencias de complementos obsoletos, la reparación de la instalación de complementos configurados, el complemento sin conexión, la actualización de complementos y la prueba de Telegram en el mismo archivo tar del paquete resuelto. Establezca `release_package_spec` en Full Release Validation o OpenClaw Release Checks después de publicar una versión beta para ejecutar la misma matriz contra el paquete npm enviado sin reconstruir; establezca `package_acceptance_package_spec` solo cuando Package Acceptance necesita un paquete diferente del resto de la validación de lanzamiento. Las comprobaciones de lanzamiento multi-SO aún cubren el comportamiento específico del sistema operativo, el instalador y la plataforma; la validación del producto de paquete/actualización debería comenzar con Package Acceptance. El carril Docker `published-upgrade-survivor` valida una línea base de paquete publicado por ejecución en la ruta de lanzamiento de bloqueo. En Package Acceptance, el archivo tar `package-under-test` resuelto es siempre el candidato y `published_upgrade_survivor_baseline` selecciona la línea base publicada de reserva, por defecto `openclaw@latest`; los comandos de reejecución de carril fallido preservan esa línea base. Full Release Validation con `run_release_soak=true` o `release_profile=full` establece `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` y `published_upgrade_survivor_scenarios=reported-issues` para expandirse a través de las cuatro últimas versiones estables de npm más las versiones de límite de compatibilidad de complementos ancladas y accesorios con forma de problema para la configuración de Feishu, archivos de arranque/persona conservados, instalaciones de complementos OpenClaw configuradas, rutas de registro de tilde y raíces de dependencia de complementos heredados obsoletos. Las selecciones de supervivientes de actualización publicada de múltiples líneas base se fragmentan por línea base en trabajos separados del ejecutor Docker específicos. El flujo de trabajo separado `Update Migration` utiliza el carril Docker `update-migration` con `all-since-2026.4.23` y `plugin-deps-cleanup` cuando la pregunta es la limpieza exhaustiva de actualizaciones publicadas, no la amplitud normal de CI de lanzamiento completo. Las ejecuciones agregadas locales pueden pasar especificaciones exactas del paquete con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, mantener un solo carril con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` como `openclaw@2026.4.15`, o establecer `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` para la matriz de escenarios. El carril publicado configura la línea base con una receta de comando `openclaw config set` integrada, registra los pasos de la receta en `summary.json` y sondea `/healthz`, `/readyz`, además del estado de RPC después del inicio de Gateway. Los carriles nuevos empaquetados e instalador de Windows también verifican que un paquete instalado pueda importar una invalidación de control del navegador desde una ruta absoluta de Windows sin procesar. La prueba de humo de agente multi-SO de OpenAI por defecto es `OPENCLAW_CROSS_OS_OPENAI_MODEL` cuando se establece, de lo contrario `openai/gpt-5.5`, por lo que la prueba de instalación y puerta de enlace se mantiene en un modelo de prueba GPT-5 mientras se evitan los valores predeterminados de GPT-4.x.

### Ventanas de compatibilidad heredadas

Package Acceptance tiene ventanas de compatibilidad heredadas limitadas para los paquetes ya publicados. Los paquetes hasta `2026.4.25`, incluido `2026.4.25-beta.*`, pueden usar la ruta de compatibilidad:

- las entradas privadas de QA conocidas en `dist/postinstall-inventory.json` pueden apuntar a archivos omitidos en el archivo tar;
- `doctor-switch` puede omitir el subcaso de persistencia `gateway install --wrapper` cuando el paquete no expone esa marca;
- `update-channel-switch` puede eliminar los `patchedDependencies` de pnpm que faltan del accesorio falso de git derivado del tarball y puede registrar `update.channel` persistentes que faltan;
- las pruebas de humo de plugins pueden leer ubicaciones de registros de instalación heredadas o aceptar la falta de persistencia del registro de instalación del mercado;
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

# Validate a tarball from a named trusted private mirror policy.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-current.tgz \
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

El flujo de trabajo independiente `Install Smoke` reutiliza el mismo script de alcance a través de su propio trabajo `preflight`. Divide la cobertura de pruebas de humo en `run_fast_install_smoke` y `run_full_install_smoke`.

- Las ejecuciones de **ruta rápida (Fast path)** son para pull requests que tocan superficies de Docker/paquetes, cambios de paquetes/manifestos de complementos empaquetados, o superficies centrales de complemento/canal/pasarela/Plugin SDK que ejercen los trabajos de humo de Docker. Los cambios de complementos empaquetados solo de código fuente, ediciones solo de prueba y ediciones solo de documentación no reservan trabajadores de Docker. La ruta rápida construye la imagen del Dockerfile raíz una vez, verifica la CLI, ejecuta los agentes del humo de CLI de delete shared-workspace, ejecuta el e2e de gateway-network del contenedor, verifica un argumento de compilación de extensión empaquetada, y ejecuta el perfil de Docker de complemento empaquetado delimitado bajo un tiempo de espera de comando agregado de 240 segundos (la ejecución de Docker de cada escenario está limitada por separado).
- La **ruta completa (Full path)** mantiene la cobertura de instalación de paquetes QR y de actualización/instalador de Docker para ejecuciones programadas nocturnas, despachos manuales, comprobaciones de lanzamiento de llamadas de flujo de trabajo y pull requests que realmente tocan superficies de instalador/paquete/Docker. En modo completo, install-smoke prepara o reutiliza una imagen de humo del Dockerfile raíz GHCR del SHA objetivo, luego ejecuta la instalación del paquete QR, humos del Dockerfile raíz/pasarela, humos de instalador/actualización y el e2E de Docker de complemento empaquetado rápido como trabajos separados para que el trabajo del instalador no espere detrás de los humos de la imagen raíz.

Los pushes de `main` (incluyendo commits de fusión) no fuerzan la ruta completa; cuando la lógica de alcance cambiado solicitaría cobertura completa en un push, el flujo de trabajo mantiene el humo rápido de Docker y deja el humo completo de instalación para la validación nocturna o de lanzamiento.

El humo lento del proveedor de imágenes de instalación global de Bun está separado por `run_bun_global_install_smoke`. Se ejecuta en el programa nocturno y desde el flujo de trabajo de comprobaciones de lanzamiento, y los despachos manuales de `Install Smoke` pueden optar por él, pero los pull requests y los pushes de `main` no. El CI normal de PR todavía ejecuta el carril de regresión del lanzador rápido de Bun para cambios relevantes de Node. Las pruebas de Docker de QR e instalador mantienen sus propios Dockerfiles centrados en la instalación.

## E2E de Docker local

`pnpm test:docker:all` preconstruye una imagen compartida de pruebas en vivo, empaqueta OpenClaw una vez como un tarball npm y construye dos imágenes compartidas de `scripts/e2e/Dockerfile`:

- un ejecutor de Node/Git básico para carriles de instalador/actualización/dependencia de complementos;
- una imagen funcional que instala el mismo tarball en `/app` para los carriles de funcionalidad normal.

Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`, la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`, y el ejecutor solo ejecuta el plan seleccionado. El planificador selecciona la imagen por carril con `OPENCLAW_DOCKER_E2E_BARE_IMAGE` y `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, y luego ejecuta los carriles con `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Ajustables

| Variable                               | Predeterminado | Propósito                                                                                                                                    |
| -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10             | Cantidad de ranuras del grupo principal para carriles normales.                                                                              |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10             | Cantidad de ranuras del grupo de cola sensibles al proveedor.                                                                                |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9              | Límite de carriles simultáneos para que los proveedores no limiten el tráfico.                                                               |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10             | Límite de carriles de instalación simultánea de npm.                                                                                         |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7              | Límite de carriles simultáneos multiservicio.                                                                                                |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000           | Escalonamiento entre inicios de carriles para evitar tormentas de creación del demonio de Docker; establezca `0` para ningún escalonamiento. |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000        | Tiempo de espera de reserva por carril (120 minutos); los carriles live/tail seleccionados usan límites más estrictos.                       |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | sin establecer | `1` imprime el plan del planificador sin ejecutar los carriles.                                                                              |
| `OPENCLAW_DOCKER_ALL_LANES`            | sin establecer | Lista de carriles exactos separados por comas; omite la limpieza de humo para que los agentes puedan reproducir un solo carril fallido.      |

Un carril más pesado que su límite efectivo aún puede iniciarse desde un grupo vacío y luego ejecutarse solo hasta que libere capacidad. El agregado local hace una verificación previa de Docker, elimina contenedores OpenClaw E2E obsoletos, emite el estado de carril activo, conserva los tiempos de los carriles para el ordenamiento primero el más largo y detiene la programación de nuevos carriles agrupados después del primer fallo de forma predeterminada.

### Flujo de trabajo reutilizable live/E2E

El flujo de trabajo reutilizable en vivo/E2E pregunta a `scripts/test-docker-all.mjs --plan-json` qué paquete, tipo de imagen, imagen en vivo, carril y cobertura de credenciales se requieren. `scripts/docker-e2e.mjs` luego convierte ese plan en resultados y resúmenes de GitHub. Ya sea que empaquete OpenClaw a través de `scripts/package-openclaw-for-docker.mjs`, descargue un artefacto de paquete de la ejecución actual, o descargue un artefacto de paquete de `package_artifact_run_id`; valida el inventario de archivos tar; construye e impulsa imágenes Docker E2E básicas/funcionales etiquetadas con el resumen del paquete en GHCR a través de la caché de capas Docker de Blacksmith cuando el plan necesita carriles con paquete instalado; y reutiliza las entradas `docker_e2e_bare_image`/`docker_e2e_functional_image` proporcionadas o las imágenes existentes de resumen de paquete en lugar de reconstruir. Las extracciones de imágenes Docker se reintentan con un tiempo de espera limitado de 180 segundos por intento, para que un flujo de registro/caché atascado se reintente rápidamente en lugar de consumir la mayor parte de la ruta crítica de CI.

### Fragmentos de la ruta de lanzamiento

La cobertura Docker de lanzamiento ejecuta trabajos fragmentados más pequeños con `OPENCLAW_SKIP_DOCKER_BUILD=1` para que cada fragmento extraiga solo el tipo de imagen que necesita y ejecute múltiples carriles a través del mismo programador ponderado:

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Los fragmentos Docker de lanzamiento actuales son `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` y `plugins-runtime-install-a` a través de `plugins-runtime-install-h`. `package-update-openai` incluye el carril del paquete del complemento Codex en vivo, que instala el paquete candidato de OpenClaw, instala el complemento Codex desde `codex_plugin_spec` o un archivo tar de la misma referencia con aprobación explícita de instalación de la CLI de Codex, ejecuta la verificación previa de la CLI de Codex y luego ejecuta múltiples turnos del agente OpenClaw de la misma sesión contra OpenAI. `plugins-runtime-core`, `plugins-runtime` y `plugins-integrations` siguen siendo alias agregados de complemento/ejecución. El alias de carril `install-e2e` sigue siendo el alias de reejecución manual agregado para ambos carriles de instalador de proveedor.

OpenWebUI se integra en `plugins-runtime-services` cuando la cobertura completa de la ruta de lanzamiento lo solicita, y mantiene un fragmento `openwebui` independiente solo para envíos exclusivos de OpenWebUI. Los carriles de actualización del canal agrupado reintentan una vez ante fallos transitorios de la red de npm.

Cada fragmento sube `.artifacts/docker-tests/` con registros de carril, tiempos, `summary.json`, `failures.json`, tiempos de fase, plan del programador JSON, tablas de carriles lentos y comandos de reejecución por carril. La entrada del flujo de trabajo `docker_lanes` ejecuta los carriles seleccionados contra las imágenes preparadas en lugar de los trabajos del fragmento, lo que mantiene la depuración de carriles fallidos limitada a un trabajo Docker específico y prepara, descarga o reutiliza el artefacto del paquete para esa ejecución; si un carril seleccionado es un carril Docker en vivo, el trabajo específico construye la imagen de prueba en vivo localmente para esa reejecución. Los comandos de reejecución de GitHub generados por carril incluyen `package_artifact_run_id`, `package_artifact_name` y entradas de imagen preparadas cuando esos valores existen, para que un carril fallido pueda reutilizar el paquete y las imágenes exactas de la ejecución fallida.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

El flujo de trabajo programado en vivo/E2E ejecuta la suite completa Docker de la ruta de lanzamiento diariamente.

## Plugin Prerelease

`Plugin Prerelease` es una cobertura de producto/paquete más costosa, por lo que es un flujo de trabajo separado despachado por `Full Release Validation` o por un operador explícito. Las solicitudes de extracción normales, los envíos a `main` y los envíos manuales independientes de CI mantienen esa suite desactivada. Equilibra las pruebas de complementos agrupados en ocho trabajadores de extensión; esos trabajos de fragmento de extensión ejecutan hasta dos grupos de configuración de complementos a la vez con un trabajador Vitest por grupo y un montículo de Node más grande para que los lotes de complementos con muchas importaciones no creen trabajos de CI adicionales. La ruta de prelanzamiento Docker exclusiva para lanzamientos agrupa los carriles Docker específicos en pequeños grupos para evitar reservar docenas de ejecutores para trabajos de uno a tres minutos. El flujo de trabajo también sube un artefacto informativo `plugin-inspector-advisory` desde `@openclaw/plugin-inspector`; los hallazgos del inspector son entrada de triaje y no cambian el bloqueo de la puerta Plugin Prerelease.

## Laboratorio de QA

El QA Lab tiene carriles de CI dedicados fuera del flujo de trabajo principal con ámbito inteligente. La paridad agéntica está anidada bajo los arneses amplios de QA y lanzamiento, no un flujo de trabajo de PR independiente. Use `Full Release Validation` con `rerun_group=qa-parity` cuando la paridad debe ejecutarse con una ejecución de validación amplia.

- El flujo de trabajo `QA-Lab - All Lanes` se ejecuta cada noche en `main` y en despacho manual; se expande en el carril de paridad simulada, el carril de Matrix en vivo y los carriles de Telegram y Discord en vivo como trabajos paralelos. Los trabajos en vivo usan el entorno `qa-live-shared`, y Telegram/Discord usan arrendamientos de Convex.

Las verificaciones de lanzamiento ejecutan carriles de transporte en vivo de Matrix y Telegram con el proveedor simulado determinista y modelos calificados como simulados (`mock-openai/gpt-5.5` y `mock-openai/gpt-5.5-alt`) para que el contrato del canal quede aislado de la latencia del modelo en vivo y del inicio normal del proveedor-complemento. La puerta de enlace de transporte en vivo deshabilita la búsqueda de memoria porque la paridad de QA cubre el comportamiento de la memoria por separado; la conectividad del proveedor está cubierta por los conjuntos separados de modelo en vivo, proveedor nativo y proveedor Docker.

Matrix usa `--profile fast` para las puertas programadas y de lanzamiento, agregando `--fail-fast` solo cuando el CLI extraído lo soporta. El valor predeterminado del CLI y la entrada del flujo de trabajo manual siguen siendo `all`; el despacho manual `matrix_profile=all` siempre divide la cobertura completa de Matrix en trabajos `transport`, `media`, `e2ee-smoke`, `e2ee-deep` y `e2ee-cli`.

`OpenClaw Release Checks` también ejecuta los carriles del QA Lab críticos para el lanzamiento antes de la aprobación del mismo; su puerta de paridad de QA ejecuta los paquetes candidatos y de referencia como trabajos de carril paralelos, y luego descarga ambos artefactos en un pequeño trabajo de informe para la comparación final de paridad.

Para PRs normales, siga la evidencia de CI/check con ámbito en lugar de tratar la paridad como un estado requerido.

## CodeQL

El flujo de trabajo `CodeQL` es intencionalmente un escáner de seguridad de primer paso estrecho, no un barrido completo del repositorio. Las ejecuciones diarias, manuales y de protección de solicitudes de extracción que no son borradores escanean el código del flujo de trabajo de Actions más las superficies de JavaScript/TypeScript de mayor riesgo con consultas de seguridad de alta confianza filtradas a severidad alta/crítica `security-severity`.

La protección de solicitudes de extracción permanece ligera: solo se inicia para cambios bajo `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` o `src`, y ejecuta la misma matriz de seguridad de alta confianza que el flujo de trabajo programado. CodeQL para Android y macOS se mantiene fuera de los valores predeterminados de PR.

### Categorías de seguridad

| Categoría                                         | Superficie                                                                                                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Línea base de autenticación, secretos, sandbox, cron y puerta de enlace                                                                                                      |
| `/codeql-security-high/channel-runtime-boundary`  | Contratos de implementación del canal central más el tiempo de ejecución del complemento del canal, puerta de enlace, Plugin SDK, secretos y puntos de contacto de auditoría |
| `/codeql-security-high/network-ssrf-boundary`     | Superficies de políticas SSRF centrales, análisis de IP, protección de red, recuperación web y SSRF del Plugin SDK                                                           |
| `/codeql-security-high/mcp-process-tool-boundary` | Servidores MCP, auxiliares de ejecución de procesos, entrega saliente y puertas de ejecución de herramientas de agente                                                       |
| `/codeql-security-high/plugin-trust-boundary`     | Instalación, cargador, manifiesto, registro, instalación del administrador de paquetes, carga de fuentes y superficies de confianza del contrato de paquetes del Plugin SDK  |

### Fragmentos de seguridad específicos de la plataforma

- `CodeQL Android Critical Security` — fragmento de seguridad de Android programado. Compila la aplicación de Android manualmente para CodeQL en el ejecutor Linux de Blacksmith más pequeño aceptado por la cordura del flujo de trabajo. Carga bajo `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — fragmento de seguridad de macOS semanal/manual. Compila la aplicación de macOS manualmente para CodeQL en Blacksmith macOS, filtra los resultados de compilación de dependencias del SARIF cargado y carga bajo `/codeql-critical-security/macos`. Se mantiene fuera de los valores predeterminados diarios porque la compilación de macOS domina el tiempo de ejecución incluso cuando está limpia.

### Categorías de Calidad Crítica

`CodeQL Critical Quality` es el fragmento (shard) no relacionado con la seguridad correspondiente. Ejecuta únicamente consultas de calidad de JavaScript/TypeScript de gravedad de error y no relacionadas con seguridad sobre superficies de alto valor estrechas en el runner de Linux Blacksmith más pequeño. Su guardia de pull request es intencionalmente más pequeña que el perfil programado: las PRs no borradores solo ejecutan los fragmentos coincidentes `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` y `plugin-sdk-reply-runtime` para el código de ejecución/despacho de respuesta de comandos/modelos/herramientas del agente, código de esquema/migración/ES de configuración, código de autenticación/secretos/sandbox/seguridad, tiempo de ejecución del plugin de canal central y canal empaquetado, protocolo de pasarela/método de servidor, pegamento de tiempo de ejecución/SDK de memoria, MCP/proceso/entrega saliente, catálogo de modelos/tiempo de ejecución del proveedor, diagnósticos de sesión/colas de entrega, cargador de plugins, contrato de paquete/Plugin SDK o cambios en el tiempo de ejecución de respuesta del Plugin SDK. Los cambios en la configuración de CodeQL y el flujo de trabajo de calidad ejecutan los doce fragmentos de calidad de PR.

El envío manual acepta:

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Los perfiles estrechos son ganchos de enseñanza/iteración para ejecutar un fragmento de calidad de forma aislada.

| Categoría                                               | Superficie                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Código de límite de seguridad de autenticación, secretos, sandbox, cron y pasarela                                                                                                                                                        |
| `/codeql-critical-quality/config-boundary`              | Esquema de configuración, migración, normalización y contratos de ES                                                                                                                                                                      |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Esquemas de protocolo de pasarela y contratos de métodos de servidor                                                                                                                                                                      |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contratos de implementación de plugins de canal central y canal empaquetado                                                                                                                                                               |
| `/codeql-critical-quality/agent-runtime-boundary`       | Ejecución de comandos, despacho de modelo/proveedor, despacho y colas de auto-respuesta, y contratos de tiempo de ejecución del plano de control de ACP                                                                                   |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Servidores MCP y puentes de herramientas, auxiliares de supervisión de procesos, y contratos de entrega saliente                                                                                                                          |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK de host de memoria, fachadas de tiempo de ejecución de memoria, alias del Plugin SDK de memoria, pegamento de activación del tiempo de ejecución de memoria y comandos del doctor de memoria                                          |
| `/codeql-critical-quality/session-diagnostics-boundary` | Aspectos internos de la cola de respuesta, colas de entrega de sesiones, asistentes de vinculación/entrega de sesiones salientes, superficies de paquetes de eventos/registros de diagnóstico y contratos de CLI del doctor de sesiones   |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Despacho de respuestas entrantes del SDK de complementos, asistentes de carga útil/fragmentación/ejecución de respuestas, opciones de respuestas de canal, colas de entrega y asistentes de vinculación de sesiones/hilos                 |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalización del catálogo de modelos, autenticación y descubrimiento de proveedores, registro en tiempo de ejecución de proveedores, valores predeterminados/catálogos de proveedores y registros de web/búsqueda/obtención/incrustación |
| `/codeql-critical-quality/ui-control-plane`             | Inicialización de la interfaz de usuario de control, persistencia local, flujos de control de puerta de enlace y contratos de tiempo de ejecución del plano de control de tareas                                                          |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Obtención/búsqueda web principal, E/S de medios, comprensión de medios, generación de imágenes y contratos de tiempo de ejecución de generación de medios                                                                                 |
| `/codeql-critical-quality/plugin-boundary`              | Cargador, registro, superficie pública y contratos de punto de entrada del SDK de complementos                                                                                                                                            |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Fuente del SDK de complementos del lado del paquete publicado y asistentes de contratos de paquetes de complementos                                                                                                                       |

La calidad se mantiene separada de la seguridad para que los hallazgos de calidad se puedan programar, medir, deshabilitar o expandir sin oscurecer la señal de seguridad. La expansión de CodeQL para Swift, Python y complementos incluidos debe agregarse nuevamente como trabajo de seguimiento con alcance o dividido en fragmentos (sharded) solo después de que los perfiles estrechos tengan un tiempo de ejecución y una señal estables.

## Flujos de trabajo de mantenimiento

### Docs Agent

El flujo de trabajo `Docs Agent` es un carril de mantenimiento de Codex controlado por eventos para mantener los documentos existentes alineados con los cambios recientes. No tiene un programa puro: una ejecución de CI de push no bot exitosa en `main` puede activarlo, y el envío manual puede ejecutarlo directamente. Las invocaciones de ejecución del flujo de trabajo se omiten cuando `main` ha avanzado o cuando se creó otra ejecución de Docs Agent no omitida en la última hora. Cuando se ejecuta, revisa el rango de confirmaciones desde el SHA de origen de Docs Agent no omitido anterior hasta `main` actual, por lo que una ejecución por hora puede cubrir todos los cambios principales acumulados desde el último pase de documentos.

### Agente de rendimiento de pruebas

El flujo de trabajo `Test Performance Agent` es un carril de mantenimiento de Codex impulsado por eventos para pruebas lentas. No tiene un programa puro: una ejecución de CI de push no bot exitosa en `main` puede activarlo, pero se omite si otra invocación de ejecución de flujo de trabajo ya se ejecutó o se está ejecutando ese día UTC. El despacho manual omite ese control de actividad diaria. El carril genera un informe de rendimiento de Vitest agrupado de suite completa, permite que Codex haga solo pequeñas correcciones de rendimiento de pruebas que preserven la cobertura en lugar de refactorizaciones amplias, luego vuelve a ejecutar el informe de suite completa y rechaza los cambios que reducen el recuento de pruebas de referencia aprobadas. El informe agrupado registra el tiempo de reloj por configuración y el RSS máximo en Linux y macOS, por lo que la comparación antes/después saca a la luz los deltas de memoria de las pruebas junto con los deltas de duración. Si la línea base tiene pruebas fallidas, Codex puede corregir solo los fallos obvios y el informe de suite completa posterior al agente debe aprobarse antes de confirmar cualquier cosa. Cuando `main` avanza antes de que aterrice el push del bot, el carril hace rebase del parche validado, vuelve a ejecutar `pnpm check:changed` y reintenta el push; los parches obsoletos en conflicto se omiten. Usa Ubuntu alojado en GitHub para que la acción de Codex pueda mantener la misma postura de seguridad drop-sudo que el agente de documentos.

### PRs duplicados después de la fusión

El flujo de trabajo `Duplicate PRs After Merge` es un flujo de trabajo manual de mantenimiento para la limpieza de duplicados posteriores al aterrizaje. De forma predeterminada, se ejecuta en modo de prueba (dry-run) y solo cierra los PR listados explícitamente cuando `apply=true`. Antes de mutar GitHub, verifica que el PR aterrizado esté fusionado y que cada duplicado tenga un problema referenciado compartido o fragmentos cambiados superpuestos.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Control de puertas locales y enrutamiento de cambios

La lógica local de carriles cambiados vive en `scripts/changed-lanes.mjs` y es ejecutada por `scripts/check-changed.mjs`. Ese control de puertas local es más estricto con los límites de la arquitectura que el alcance amplio de la plataforma CI:

- los cambios de producción de core ejecutan core prod y core test typecheck más core lint/guards;
- los cambios solo de prueba de core ejecutan solo core test typecheck más core lint;
- los cambios de producción de extension ejecutan extension prod y extension test typecheck más extension lint;
- los cambios solo de prueba de extension ejecutan extension test typecheck más extension lint;
- los cambios públicos del Plugin SDK o del plugin-contract se expanden a la verificación de tipos de las extensiones porque las extensiones dependen de esos contratos centrales (los barridos de extensiones de Vitest siguen siendo trabajo de pruebas explícito);
- los incrementos de versión solo de metadatos de lanzamiento ejecutan verificaciones específicas de versión/configuración/dependencias-raíz;
- los cambios desconocidos en root/config fallan de forma segura en todos los carriles de verificación.

El enrutamiento de pruebas modificadas locales reside en `scripts/test-projects.test-support.mjs` y es intencionalmente más barato que `check:changed`: las ediciones directas de pruebas se ejecutan a sí mismas, las ediciones de código fuente prefieren asignaciones explícitas, luego las pruebas hermanas y las dependientes del gráfico de importación. La configuración de entrega de salas de grupo compartido es una de las asignaciones explícitas: los cambios en la configuración de respuesta visible del grupo, el modo de entrega de respuesta fuente o el sistema de mensajes de la herramienta pasan por las pruebas de respuesta central más las regresiones de entrega de Discord y Slack, por lo que un cambio en el valor compartido predeterminado falla antes del primer push a la PR. Use `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el cambio sea lo suficientemente amplio en el arnés como para que el conjunto mapeado barato no sea un proxy confiable.

## Validación de Testbox

Crabbox es el wrapper de caja remota propiedad del repositorio para la prueba de Linux del mantenedor. Úselo
desde la raíz del repositorio cuando una verificación sea demasiado amplia para un bucle de edición local, cuando la
paridad de CI sea importante, o cuando la prueba necesite secretos, Docker, carriles de paquetes,
cajas reutilizables o registros remotos. El backend normal de OpenClaw es
`blacksmith-testbox`; la capacidad de AWS/Hetzner propia es un respaldo para cortes de Blacksmith,
problemas de cuota o pruebas explícitas de capacidad propia.

Las ejecuciones de Blacksmith respaldadas por Crabbox realizan calentamiento, reclamación, sincronización, ejecución, informe y limpieza
de Testboxes de un solo uso. La verificación de cordura de sincronización integrada falla rápido cuando los archivos
raíz requeridos como `pnpm-lock.yaml` desaparecen o cuando `git status --short`
muestra al menos 200 eliminaciones rastreadas. Para PRs intencionales de grandes eliminaciones, establezca
`OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` para el comando remoto.

Crabbox también termina una invocación CLI local de Blacksmith que se mantiene en la
fase de sincronización durante más de cinco minutos sin salida posterior a la sincronización. Establezca
`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` para desactivar ese guardia, o use un valor de
milisegundos mayor para diferencias locales inusualmente grandes.

Antes de una primera ejecución, verifique el wrapper desde la raíz del repositorio:

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

El contenedor del repositorio rechaza un binario Crabbox obsoleto que no anuncia `blacksmith-testbox`. Pase el proveedor explícitamente aunque `.crabbox.yaml` tenga valores predeterminados de owned-cloud. En los árboles de trabajo de Codex o en los checkouts vinculados/ dispersos, evite el script local `pnpm crabbox:run` porque pnpm puede conciliar las dependencias antes de que se inicie Crabbox; invoque el contenedor de nodo directamente en su lugar:

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

Las ejecuciones respaldadas por Blacksmith requieren Crabbox 0.22.0 o más reciente para que el contenedor obtenga el comportamiento de sincronización, cola y limpieza actual de Testbox. Al usar el checkout hermano, reconstruya el binario local ignorado antes del trabajo de cronometraje o prueba:

```bash
version="$(git -C ../crabbox describe --tags --always --dirty | sed 's/^v//')" \
  && go build -C ../crabbox -trimpath -ldflags "-s -w -X github.com/openclaw/crabbox/internal/cli.version=${version}" -o bin/crabbox ./cmd/crabbox
```

Changed gate:

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
  "corepack pnpm check:changed"
```

Focused test rerun:

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
  "corepack pnpm test <path-or-filter>"
```

Full suite:

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
  "corepack pnpm test"
```

Lea el resumen final de JSON. Los campos útiles son `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` y `totalMs`. Las ejecuciones de Crabbox de un solo uso respaldadas por Blacksmith deben detener Testbox automáticamente; si se interrumpe una ejecución o si la limpieza no está clara, inspeccione los boxes en vivo y detenga solo los boxes que creó:

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

Use reuse solo cuando necesite intencionalmente múltiples comandos en el mismo box hidratado:

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

Si Crabbox es la capa rota pero Blacksmith funciona, use Blacksmith directo solo para diagnósticos como `list`, `status` y limpieza. Corrija la ruta de Crabbox antes de tratar una ejecución directa de Blacksmith como prueba de mantenimiento.

Si `blacksmith testbox list --all` y `blacksmith testbox status` funcionan pero los nuevos calentamientos se quedan `queued` sin IP ni URL de ejecución de Actions después de un par de minutos, trátelo como presión del proveedor, la cola, la facturación o el límite de la organización de Blacksmith. Detenga los ids en cola que creó, evite iniciar más Testboxes y mueva la prueba a la ruta de capacidad Crabbox propia a continuación mientras alguien verifica el tablero, la facturación y los límites de la organización de Blacksmith.

Escale a la capacidad Crabbox propia solo cuando Blacksmith está caído, tiene cuota limitada, carece del entorno necesario o la capacidad propia es explícitamente el objetivo:

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Bajo presión de AWS, evite `class=beast` a menos que la tarea realmente necesite CPU de clase 48xlarge. Una solicitud `beast` comienza en 192 vCPUs y es la forma más fácil de exceder la cuota regional de EC2 Spot o On-Demand Standard. El `.crabbox.yaml` propiedad del repositorio tiene como valores predeterminados `standard`, múltiples regiones de capacidad y `capacity.hints: true` para que los arrendamientos de AWS intermediarios impriman la región/mercado seleccionada, la presión de cuota, la alternativa de Spot y las advertencias de clase de alta presión. Use `fast` para comprobaciones amplias más pesadas, `large` solo después de que estándar/rápido no sean suficientes, y `beast` solo para carriles excepcionalmente limitados por CPU, como matrices de Docker de suite completa o todos los complementos, validación explícita de lanzamiento/bloqueo, o perfilado de rendimiento de muchos núcleos. No use `beast` para `pnpm check:changed`, pruebas enfocadas, trabajo solo de documentación, lint/typecheck ordinarios, reproducciones E2E pequeñas o triage de interrupciones de Blacksmith. Use `--market on-demand` para el diagnóstico de capacidad para que la rotación del mercado Spot no se mezcle en la señal.

`.crabbox.yaml` posee los proveedores, la sincronización y los valores predeterminados de hidratación de GitHub Actions para los carriles de nube propiedad del repositorio. Excluye `.git` locales para que el checkout de Actions hidratado mantenga sus propios metadatos remotos de Git en lugar de sincronizar los remotos y almacenes de objetos locales del mantenedor, y excluye los artefactos de tiempo de ejecución/compilación locales que nunca deben transferirse. `.github/workflows/crabbox-hydrate.yml` posee el checkout, la configuración de Node/pnpm, la obtención de `origin/main` y el traspaso de entorno no secreto para los comandos `crabbox run --id <cbx_id>` de nube propiedad del repositorio.

## Relacionado

- [Resumen de instalación](/es/install)
- [Canales de desarrollo](/es/install/development-channels)
