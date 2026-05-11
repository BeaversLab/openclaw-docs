---
summary: "Gráfico de trabajos de CI, puertas de alcance y equivalentes de comandos locales"
title: Canalización de CI
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

La CI se ejecuta en cada envío (push) a `main` y en cada solicitud de extracción (pull request). Utiliza un alcance inteligente para omitir trabajos costosos cuando solo cambiaron áreas no relacionadas. Las ejecuciones manuales de `workflow_dispatch` omiten intencionalmente el alcance inteligente y despliegan el grafo de CI normal completo para candidatos de lanzamiento o validaciones amplias.

`Full Release Validation` es el flujo de trabajo manual paraguas para "ejecutar todo
antes del lanzamiento". Acepta una rama, etiqueta o SHA de confirmación completo, despacha el
flujo de trabajo manual `CI` con ese objetivo y despacha `OpenClaw Release Checks`
para pruebas de humo de instalación, aceptación de paquetes, suites de ruta de lanzamiento de Docker, live/E2E,
paridad de QA Lab, Matrix y carriles de Telegram. También puede ejecutar el
flujo de trabajo `NPM Telegram Beta E2E` posterior a la publicación cuando se proporciona una especificación de paquete publicada.
El paraguas registra los ids de las ejecuciones hijas despachadas, y el trabajo final
`Verify full validation` vuelve a verificar las conclusiones de las ejecuciones hijas actuales. Si un
flujo de trabajo secundario se vuelve a ejecutar y se pone verde, vuelva a ejecutar solo el trabajo verificador principal para
actualizar el resultado del paraguas.

El hijo de lanzamiento live/E2E mantiene una cobertura `pnpm test:live` nativa amplia, pero
la ejecuta como fragmentos con nombre (`native-live-src-agents`, `native-live-src-gateway`,
`native-live-test`, `native-live-extensions-a-k` y
`native-live-extensions-l-z`) a través de `scripts/test-live-shard.mjs` en lugar de
un trabajo serial. Eso mantiene la misma cobertura de archivos mientras hace que los fallos
de proveedores lentos sean más fáciles de volver a ejecutar y diagnosticar.

`Package Acceptance` es el flujo de trabajo de ejecución en paralelo para validar un artefacto de paquete
sin bloquear el flujo de trabajo de lanzamiento. Resuelve un candidato a partir de una
especificación npm publicada, un `package_ref` de confianza construido con el arnés
`workflow_ref` seleccionado, una URL de tarball HTTPS con SHA-256, o un artefacto de tarball
de otra ejecución de GitHub Actions, lo carga como `package-under-test`, y luego reutiliza
el programador de lanzamiento/E2E de Docker con ese tarball en lugar de reempaquetar
el checkout del flujo de trabajo. Los perfiles cubren selecciones de carriles Docker de prueba de humo, paquete, producto, completo y personalizado.
El perfil `package` utiliza cobertura de complementos sin conexión para que
la validación del paquete publicado no esté condicionada a la disponibilidad de ClawHub en vivo. El carril opcional de Telegram reutiliza el
artefacto `package-under-test` en el flujo de trabajo `NPM Telegram Beta E2E`, con la
ruta de especificación npm publicada conservada para despachos independientes.

## Aceptación de paquetes

Use `Package Acceptance` cuando la pregunta sea "¿funciona este paquete instalable de OpenClaw
como un producto?" Es diferente de la CI normal: la CI normal valida
el árbol de fuentes, mientras que la aceptación de paquetes valida un solo tarball a través del
mismo arnés Docker E2E que los usuarios ejecutan después de la instalación o actualización.

El flujo de trabajo tiene cuatro trabajos:

1. `resolve_package` hace el checkout de `workflow_ref`, resuelve un candidato de paquete,
   escribe `.artifacts/docker-e2e-package/openclaw-current.tgz`, escribe
   `.artifacts/docker-e2e-package/package-candidate.json`, carga ambos como el
   artefacto `package-under-test`, e imprime la fuente, referencia del flujo de trabajo, referencia
   del paquete, versión, SHA-256 y perfil en el resumen del paso de GitHub.
2. `docker_acceptance` llama a
   `openclaw-live-and-e2e-checks-reusable.yml` con `ref=workflow_ref` y
   `package_artifact_name=package-under-test`. El flujo de trabajo reutilizable descarga
   ese artefacto, valida el inventario del tarball, prepara las imágenes Docker de resumen de paquete
   cuando es necesario, y ejecuta los carriles Docker seleccionados contra ese
   paquete en lugar de empaquetar el checkout del flujo de trabajo.
3. `package_telegram` opcionalmente llama a `NPM Telegram Beta E2E`. Se ejecuta cuando
   `telegram_mode` no es `none` e instala el mismo artefacto `package-under-test`
   cuando la Aceptación de Paquetes resolvió uno; el despacho independiente de Telegram
   todavía puede instalar una especificación npm publicada.
4. `summary` falla el flujo de trabajo si la resolución del paquete, la aceptación de Docker o
   el carril opcional de Telegram fallaron.

Fuentes candidatas:

- `source=npm`: acepta solo `openclaw@beta`, `openclaw@latest`, o una versión
  exacta de lanzamiento de OpenClaw como `openclaw@2026.4.27-beta.2`. Use esto para
  la aceptación de versiones beta/estables publicadas.
- `source=ref`: empaqueta una rama `package_ref` de confianza, etiqueta, o SHA de confirmación completo.
  El resolutor obtiene ramas/etiquetas de OpenClaw, verifica que la confirmación seleccionada sea
  alcanzable desde el historial de ramas del repositorio o una etiqueta de lanzamiento, instala dependencias en un
  árbol de trabajo separado, y lo empaqueta con `scripts/package-openclaw-for-docker.mjs`.
- `source=url`: descarga un `.tgz` HTTPS; `package_sha256` es obligatorio.
- `source=artifact`: descarga un `.tgz` desde `artifact_run_id` y
  `artifact_name`; `package_sha256` es opcional pero debería proporcionarse para
  artefactos compartidos externamente.

Mantenga `workflow_ref` y `package_ref` separados. `workflow_ref` es el código de flujo de trabajo/arnés de confianza que ejecuta la prueba. `package_ref` es la confirmación de origen
que se empaqueta cuando `source=ref`. Esto permite que el arnés de prueba actual valide
confirmaciones de origen de confianza antiguas sin ejecutar lógica de flujo de trabajo antigua.

Los perfiles se asignan a la cobertura de Docker:

- `smoke`: `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package`: `npm-onboard-channel-agent`, `doctor-switch`,
  `update-channel-switch`, `bundled-channel-deps-compat`, `plugins-offline`,
  `plugin-update`
- `product`: `package` más `mcp-channels`, `cron-mcp-cleanup`,
  `openai-web-search-minimal`, `openwebui`
- `full`: fragmentos completos de la ruta de lanzamiento de Docker con OpenWebUI
- `custom`: `docker_lanes` exacto; obligatorio cuando `suite_profile=custom`

Las comprobaciones de lanzamiento llaman a Package Acceptance con `source=ref`,
`package_ref=<release-ref>`, `workflow_ref=<release workflow ref>`,
`suite_profile=custom`,
`docker_lanes='bundled-channel-deps-compat plugins-offline'` y
`telegram_mode=mock-openai`. Los fragmentos Docker de la ruta de
lanzamiento cubren los carriles solapados de paquete/actualización/complemento, mientras que
Package Acceptance mantiene la compatibilidad del canal agrupado nativo del artefacto, el
complemento sin conexión y la prueba de Telegram contra el mismo archivo tar del paquete
resuelto. Las comprobaciones de lanzamiento multi-SO aún cubren el incorporación específica
del SO, el instalador y el comportamiento de la plataforma; la validación del producto de
paquete/actualización debe comenzar con Package Acceptance. Los carriles nuevos de paquete
e instalador de Windows también verifican que un paquete instalado pueda importar una
anulación de control del navegador desde una ruta absoluta sin formato de Windows.

Package Acceptance tiene una ventana de compatibilidad heredada delimitada para paquetes ya publicados a través de `2026.4.25`, incluyendo `2026.4.25-beta.*`. Esas concesiones están documentadas aquí para que no se conviertan en omisiones silenciosas permanentes: las entradas privadas de QA conocidas en `dist/postinstall-inventory.json` pueden advertir cuando el archivo tar omitió esos archivos; `doctor-switch` puede omitir el subcaso de persistencia `gateway install --wrapper` cuando el paquete no expone esa marca; `update-channel-switch` puede eliminar `pnpm.patchedDependencies` faltantes del accesorio git falso derivado del archivo tar y puede registrar `update.channel` persistidos faltantes; las pruebas de humo de los complementos pueden leer ubicaciones heredadas de registros de instalación o aceptar la falta de persistencia de registros de instalación del mercado; y `plugin-update` puede permitir la migración de metadatos de configuración mientras sigue requiriendo que el registro de instalación y el comportamiento de no reinstalación permanezcan sin cambios. Los paquetes posteriores a `2026.4.25` deben satisfacer los contratos modernos; las mismas condiciones fallan en lugar de advertir u omitir.

Ejemplos:

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

Al depurar una ejecución fallida de aceptación de paquetes, comience con el resumen `resolve_package` para confirmar la fuente, la versión y el SHA-256 del paquete. Luego inspeccione la ejecución secundaria `docker_acceptance` y sus artefactos Docker: `.artifacts/docker-tests/**/summary.json`, `failures.json`, registros de carril, tiempos de fase y comandos de reejecución. Se prefiere volver a ejecutar el perfil del paquete fallido o los carriles Docker exactos en lugar de volver a ejecutar la validación completa de lanzamiento.

QA Lab tiene carriles de CI dedicados fuera del flujo de trabajo principal con alcance inteligente. El flujo de trabajo `Parity gate` se ejecuta en los cambios de PR coincidentes y en el despacho manual; compila el tiempo de ejecución privado de QA y compara los paquetes de agentes simulados de GPT-5.5 y Opus 4.6. El flujo de trabajo `QA-Lab - All Lanes` se ejecuta cada noche en `main` y en el despacho manual; despliega el puerta de paridad simulada, el carril en vivo de Matrix y los carriles en vivo de Telegram y Discord como trabajos paralelos. Los trabajos en vivo utilizan el entorno `qa-live-shared`, y Telegram/Discord utilizan arrendamientos de Convex. Matrix utiliza `--profile fast` para las puertas programadas y de lanzamiento, agregando `--fail-fast` solo cuando el CLI extraído lo soporta. El valor predeterminado del CLI y la entrada del flujo de trabajo manual permanecen en `all`; el despacho manual de `matrix_profile=all` siempre fragmenta la cobertura completa de Matrix en trabajos `transport`, `media`, `e2ee-smoke`, `e2ee-deep` y `e2ee-cli`. `OpenClaw Release Checks` también ejecuta los carriles críticos para el lanzamiento del QA Lab antes de la aprobación del lanzamiento.

El flujo de trabajo `Duplicate PRs After Merge` es un flujo de trabajo manual para mantenedores para la limpieza de duplicados posterior a la integración. De manera predeterminada, ejecuta una prueba en seco y solo cierra los PR enumerados explícitamente cuando `apply=true`. Antes de mutar en GitHub, verifica que el PR integrado se haya fusionado y que cada duplicado tenga un problema de referencia compartido o fragmentos de cambios superpuestos.

El flujo de trabajo `Docs Agent` es un carril de mantenimiento de Codex impulsado por eventos para mantener los documentos existentes alineados con los cambios integrados recientemente. No tiene un horario puro: una ejecución de CI de push exitosa que no sea de bot en `main` puede activarlo, y el despacho manual puede ejecutarlo directamente. Las invocaciones de ejecución de flujo de trabajo se omiten cuando `main` ha avanzado o cuando se creó otra ejecución del Docs Agent no omitida en la última hora. Cuando se ejecuta, revisa el rango de confirmaciones desde el SHA de origen del Docs Agent no omitido anterior hasta el `main` actual, por lo que una ejecución por hora puede cubrir todos los cambios principales acumulados desde el último pase de documentos.

El flujo de trabajo `Test Performance Agent` es un carril de mantenimiento de Codex impulsado por eventos
para pruebas lentas. No tiene un horario puro: una ejecución de CI de push exitosa que no sea de bot en
`main` puede activarlo, pero se omite si otra invocación de ejecución de flujo de trabajo ya
se ejecutó o se está ejecutando ese día UTC. El despacho manual omite esa barrera de actividad
diaria. El carril construye un informe de rendimiento de Vitest agrupado de suite completa, permite que Codex
realice solo pequeñas correcciones de rendimiento de pruebas que preserven la cobertura en lugar de refactorizaciones
amplias, luego vuelve a ejecutar el informe de suite completa y rechaza los cambios que reducen la
cantidad de pruebas de referencia aprobadas. Si la referencia tiene pruebas fallidas, Codex puede corregir
solo fallas obvias y el informe de suite completa posterior al agente debe aprobarse antes de
que se confirme algo. Cuando `main` avanza antes de que aterrice el push del bot, el carril
hace rebase del parche validado, vuelve a ejecutar `pnpm check:changed` y reintenta el push;
los parches obsoletos en conflicto se omiten. Usa Ubuntu alojado en GitHub para que la acción
de Codex pueda mantener la misma postura de seguridad de drop-sudo que el agente de documentos.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Resumen de trabajos

| Trabajo                          | Propósito                                                                                                               | Cuándo se ejecuta                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `preflight`                      | Detectar cambios solo de documentos, alcances cambiados, extensiones cambiadas y construir el manifiesto de CI          | Siempre en pushes y PRs que no sean borradores |
| `security-scm-fast`              | Detección de claves privadas y auditoría de flujo de trabajo a través de `zizmor`                                       | Siempre en pushes y PRs que no sean borradores |
| `security-dependency-audit`      | Auditoría de lockfile de producción sin dependencias contra avisos de npm                                               | Siempre en pushes y PRs que no sean borradores |
| `security-fast`                  | Agregado requerido para los trabajos de seguridad rápidos                                                               | Siempre en pushes y PRs que no sean borradores |
| `build-artifacts`                | Construir `dist/`, UI de Control, verificaciones de artefactos construidos y artefactos reutilizables descendentes      | Cambios relevantes para Node                   |
| `checks-fast-core`               | Carriles de corrección de Linux rápidos como verificaciones de bundled/plugin-contract/protocol                         | Cambios relevantes para Node                   |
| `checks-fast-contracts-channels` | Verificaciones de contrato de canal fragmentadas con un resultado de verificación agregado estable                      | Cambios relevantes para Node                   |
| `checks-node-extensions`         | Fragmentos de pruebas de bundled-plugin completas en la suite de extensiones                                            | Cambios relevantes para Node                   |
| `checks-node-core-test`          | Shards de pruebas de Node Core, excluyendo los carriles de canal, empaquetado, contrato y extensión                     | Cambios relevantes para Node                   |
| `check`                          | Equivalente fragmentado del local gate principal: tipos de prod, lint, guards, tipos de prueba y smoke estricto         | Cambios relevantes para Node                   |
| `check-additional`               | Shards de guards de arquitectura, límites, superficie de extensión, límites de paquete y gateway-watch                  | Cambios relevantes para Node                   |
| `build-smoke`                    | Pruebas smoke de CLI compilada y smoke de memoria de inicio                                                             | Cambios relevantes para Node                   |
| `checks`                         | Verificador para pruebas de canal de artefactos compilados                                                              | Cambios relevantes para Node                   |
| `checks-node-compat-node22`      | Carril de compilación y pruebas de compatibilidad con Node 22                                                           | Despacho manual de CI para lanzamientos        |
| `check-docs`                     | Verificaciones de formato, lint y enlaces rotos en la documentación                                                     | Documentación cambiada                         |
| `skills-python`                  | Ruff + pytest para skills respaldadas por Python                                                                        | Cambios relevantes para skills de Python       |
| `checks-windows`                 | Pruebas de proceso/ruta específicas de Windows más regresiones de especificadores de importación del runtime compartido | Cambios relevantes para Windows                |
| `macos-node`                     | Carril de pruebas de TypeScript en macOS utilizando los artefactos compilados compartidos                               | Cambios relevantes para macOS                  |
| `macos-swift`                    | Lint, compilación y pruebas de Swift para la aplicación de macOS                                                        | Cambios relevantes para macOS                  |
| `android`                        | Pruebas unitarias de Android para ambos sabores más una compilación de APK de depuración                                | Cambios relevantes para Android                |
| `test-performance-agent`         | Optimización diaria de pruebas lentas de Codex después de actividad de confianza                                        | Éxito de CI principal o despacho manual        |

Los despachos manuales de CI ejecutan el mismo grafo de trabajos que la CI normal pero fuerzan la activación de cada carril con ámbito: shards de Node en Linux, shards de bundled-plugin, contratos de canal, compatibilidad con Node 22, `check`, `check-additional`, smoke de compilación, verificaciones de documentación, skills de Python, Windows, macOS, Android e i18n de Control UI. Las ejecuciones manuales utilizan un grupo de concurrencia único para que la suite completa de un candidato de lanzamiento no sea cancelada por otro push o ejecución de PR en la misma referencia. La entrada opcional `target_ref` permite a un llamador de confianza ejecutar ese grafo contra una rama, etiqueta o SHA de confirmación completo mientras utiliza el archivo de flujo de trabajo desde la referencia de despacho seleccionada.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha>
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Orden de fail-fast

Los trabajos están ordenados para que las comprobaciones baratas fallen antes de que se ejecuten las costosas:

1. `preflight` decide qué carriles existen en absoluto. La lógica de `docs-scope` y `changed-scope` son pasos dentro de este trabajo, no trabajos independientes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` y `skills-python` fallan rápidamente sin esperar a los trabajos más pesados de artefactos y matrices de plataformas.
3. `build-artifacts` se superpone con los carriles rápidos de Linux para que los consumidores descendentes puedan comenzar tan pronto como la compilación compartida esté lista.
4. Después de eso, se despliegan los carriles más pesados de plataformas y tiempos de ejecución: `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-extensions`, `checks-node-core-test`, `checks`, `checks-windows`, `macos-node`, `macos-swift` y `android`.

La lógica del alcance reside en `scripts/ci-changed-scope.mjs` y está cubierta por pruebas unitarias en `src/scripts/ci-changed-scope.test.ts`.
El envío manual omite la detección de cambios de alcance y hace que el manifiesto de preflight actúe como si hubiera cambiado cada área con alcance.
Las ediciones del flujo de trabajo de CI validan el gráfico de CI de Node más el linting del flujo de trabajo, pero no fuerzan por sí mismas las compilaciones nativas de Windows, Android o macOS; esos carriles de plataforma se mantienen limitados a los cambios de origen de la plataforma.
Las ediciones solo de enrutamiento de CI, las ediciones seleccionadas de accesorios de pruebas centrales baratas y las ediciones de ayuda/prueba de enrutamiento de contratos de complementos estrechos utilizan una ruta de manifiesto rápida solo para Node: preflight, seguridad y una sola tarea `checks-fast-core`. Esa ruta evita los artefactos de compilación, la compatibilidad con Node 22, los contratos de canal, los fragmentos centrales completos, los fragmentos de complementos empaquetados y las matrices de guardia adicionales cuando los archivos modificados se limitan a las superficies de enrutamiento o ayuda que la tarea rápida ejerce directamente.
Las comprobaciones de Node de Windows están limitadas a los envoltorios de proceso/ruta específicos de Windows, los asistentes de ejecutor npm/pnpm/UI, la configuración del administrador de paquetes y las superficies del flujo de trabajo de CI que ejecutan ese carril; los cambios de origen no relacionados, de complemento, de instalación-smoke y solo de pruebas permanecen en los carriles de Node de Linux para que no reserven un trabajador de Windows de 16 vCPU para una cobertura que ya es ejercida por los fragmentos de prueba normales.
El flujo de trabajo separado `install-smoke` reutiliza el mismo script de alcance a través de su propio trabajo `preflight`. Divide la cobertura de smoke en `run_fast_install_smoke` y `run_full_install_smoke`. Las solicitudes de extracción ejecutan la ruta rápida para las superficies de Docker/paquete, los cambios de paquete/manifiesto de complementos empaquetados y las superficies de complemento central/canal/pasarela/SDK de complemento que ejercen los trabajos de smoke de Docker. Los cambios de complementos empaquetados solo de origen, las ediciones solo de pruebas y las ediciones solo de documentos no reservan trabajadores de Docker. La ruta rápida compila la imagen del Dockerfile raíz una vez, verifica la CLI, ejecuta el smoke de la CLI de eliminación de espacio de trabajo compartido de los agentes, ejecuta la e2e de red de pasarela de contenedores, verifica un argumento de compilación de extensión empaquetada y ejecuta el perfil de Docker de complemento empaquetado limitado bajo un tiempo de espera de comando agregado de 240 segundos con la ejecución de Docker de cada escenario limitada por separado. La ruta completa mantiene la cobertura de instalación de paquetes QR y de actualización/instalador de Docker para ejecuciones programadas nocturnas, envíos manuales, comprobaciones de lanzamiento de llamadas de flujo de trabajo y solicitudes de extracción que realmente tocan las superficies de instalador/paquete/Docker. Los envíos a `main`, incluidas las confirmaciones de fusión, no fuerzan la ruta completa; cuando la lógica de alcance de cambios solicitaría una cobertura completa en un envío, el flujo de trabajo mantiene el smoke rápido de Docker y deja el smoke de instalación completo para la validación nocturna o de lanzamiento. El smoke lento del proveedor de imagen de instalación global de Bun está controlado por separado por `run_bun_global_install_smoke`; se ejecuta en el horario nocturno y desde el flujo de trabajo de comprobaciones de lanzamiento, y los envíos manuales de `install-smoke` pueden optar por participar, pero las solicitudes de extracción y los envíos a `main` no lo ejecutan. Las pruebas de Docker de instalador y QR mantienen sus propios Dockerfiles centrados en la instalación. El `test:docker:all` local precompila una imagen de prueba en vivo compartida, empaqueta OpenClaw una vez como un archivo tar npm y compila dos imágenes `scripts/e2e/Dockerfile` compartidas: un ejecutor Node/Git básico para los carriles de instalador/actualización/dependencia de complemento y una imagen funcional que instala el mismo archivo tar en `/app` para los carriles de funcionalidad normales. Las definiciones de carril de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`, la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs` y el ejecutor solo ejecuta el plan seleccionado. El planificador selecciona la imagen por carril con `OPENCLAW_DOCKER_E2E_BARE_IMAGE` y `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, y luego ejecuta los carriles con `OPENCLAW_SKIP_DOCKER_BUILD=1`; ajuste el recuento de ranuras del grupo principal predeterminado de 10 con `OPENCLAW_DOCKER_ALL_PARALLELISM` y el recuento de ranuras del grupo final sensibles al proveedor de 10 con `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM`. Los límites de carril pesado predeterminan a `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` para que los carriles de instalación de npm y de múltiples servicios no sobrecomprometan Docker mientras que los carriles más ligeros todavía llenan las ranuras disponibles. Un solo carril más pesado que los límites efectivos aún puede iniciarse desde un grupo vacío, y luego se ejecuta solo hasta que libera capacidad. Los inicios de carril se escalonan por 2 segundos de manera predeterminada para evitar tormentas de creación del demonio local de Docker; anule con `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` u otro valor en milisegundos. El agregado local de preflichts Docker, elimina los contenedores E2E de OpenClaw obsoletos, emite el estado de carril activo, persiste los tiempos de los carriles para un ordenamiento de primero el más largo y admite `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para la inspección del planificador. Deja de programar nuevos carriles agrupados después del primer fallo de manera predeterminada, y cada carril tiene un tiempo de espera de reserva de 120 minutos anulable con `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`; los carriles en vivo/finales seleccionados usan límites más estrictos por carril. `OPENCLAW_DOCKER_ALL_LANES=<lane[,lane]>` ejecuta carriles exactos del planificador, incluidos los carriles solo de lanzamiento como `install-e2e` y los carriles de actualización empaquetada dividida como `bundled-channel-update-acpx`, mientras omite el smoke de limpieza para que los agentes puedan reproducir un solo carril fallido. El flujo de trabajo reutilizable en vivo/E2E pregunta a `scripts/test-docker-all.mjs --plan-json` qué paquete, tipo de imagen, imagen en vivo, carril y cobertura de credenciales se requieren, luego `scripts/docker-e2e.mjs` convierte ese plan en salidas y resúmenes de GitHub. Ya sea empaqueta OpenClaw a través de `scripts/package-openclaw-for-docker.mjs`, descarga un artefacto de paquete de ejecución actual o descarga un artefacto de paquete de `package_artifact_run_id`; valida el inventario del tarball; compila y envía imágenes E2E de Docker de GHCR funcionales/básicas etiquetadas con resumen de paquete a través de la caché de capas de Docker de Blacksmith cuando el plan necesita carriles con paquete instalado; y reutiliza las entradas `docker_e2e_bare_image`/`docker_e2e_functional_image` proporcionadas o las imágenes de resumen de paquete existentes en lugar de recompilar. El flujo de trabajo `Package Acceptance` es la puerta de paquete de alto nivel: resuelve un candidato desde npm, un `package_ref` de confianza, un tarball HTTPS más SHA-256 o un artefacto de flujo de trabajo anterior, y luego pasa ese único artefacto `package-under-test` al flujo de trabajo reutilizable de Docker E2E. Mantiene `workflow_ref` separado de `package_ref` para que la lógica de aceptación actual pueda validar confirmaciones confiables antiguas sin extraer código de flujo de trabajo antiguo. Las comprobaciones de lanzamiento ejecutan un delta de Aceptación de Paquete personalizado para la referencia de destino: compatibilidad de canal empaquetado, accesorios de complementos sin conexión y QA de paquete de Telegram contra el tarball resuelto. La suite de Docker de ruta de lanzamiento ejecuta cuatro trabajos fragmentados con `OPENCLAW_SKIP_DOCKER_BUILD=1` para que cada fragmento extraiga solo el tipo de imagen que necesita y ejecute múltiples carriles a través del mismo planificador ponderado (`OPENCLAW_DOCKER_ALL_PROFILE=release-path`, `OPENCLAW_DOCKER_ALL_CHUNK=core|package-update|plugins-runtime|bundled-channels`). OpenWebUI se pliega en `plugins-runtime` cuando la cobertura completa de la ruta de lanzamiento lo solicita, y mantiene un fragmento independiente `openwebui` solo para envíos solo de OpenWebUI. El fragmento `package-update` divide el E2E del instalador en `install-e2e-openai` y `install-e2e-anthropic`; `install-e2e` sigue siendo el alias de reejecución manual agregado. El fragmento `bundled-channels` ejecuta carriles `bundled-channel-*` y `bundled-channel-update-*` divididos en lugar del carril todo en uno en serie `bundled-channel-deps`; `plugins-integrations` sigue siendo un alias agregado heredado para reejecuciones manuales. Cada fragmento carga `.artifacts/docker-tests/` con registros de carril, tiempos, `summary.json`, `failures.json`, tiempos de fase, el plan JSON del planificador, tablas de carril lento y comandos de reejecución por carril. La entrada del flujo de trabajo `docker_lanes` ejecuta los carriles seleccionados contra las imágenes preparadas en lugar de los trabajos fragmentados, lo que mantiene la depuración de carriles fallidos limitada a un trabajo de Docker específico y prepara, descarga o reutiliza el artefacto de paquete para esa ejecución; si un carril seleccionado es un carril de Docker en vivo, el trabajo específico compila la imagen de prueba en vivo localmente para esa reejecución. Los comandos de reejecución de GitHub generados por carril incluyen `package_artifact_run_id`, `package_artifact_name` y entradas de imagen preparadas cuando esos valores existen, para que un carril fallido pueda reutilizar el paquete exacto y las imágenes de la ejecución fallida. Use `pnpm test:docker:rerun <run-id>` para descargar artefactos de Docker de una ejecución de GitHub e imprimir comandos de reejecución específicos combinados/por carril; use `pnpm test:docker:timings <summary.json>` para resúmenes de ruta crítica de fase y de carril lento. El flujo de trabajo programado en vivo/E2E ejecuta la suite completa de Docker de ruta de lanzamiento diariamente. La matriz de actualización empaquetada se divide por objetivo de actualización para que los pases repetidos de actualización de npm y reparación de doctor puedan fragmentarse con otras comprobaciones empaquetadas.

La lógica local de carriles cambiados reside en `scripts/changed-lanes.mjs` y es ejecutada por `scripts/check-changed.mjs`. Esa puerta de comprobación local es más estricta sobre los límites de la arquitectura que el alcance amplio de la plataforma CI: los cambios de producción del core ejecutan el core prod y el typecheck de las pruebas del core más el core lint/guards, los cambios de solo pruebas del core ejecutan solo el typecheck de las pruebas del core más el core lint, los cambios de producción de extensiones ejecutan la extensión prod y el typecheck de las pruebas de extensión más el lint de extensión, y los cambios de solo pruebas de extensión ejecutan el typecheck de las pruebas de extensión más el lint de extensión. Los cambios del Public Plugin SDK o del plugin-contract se expanden al typecheck de extensión porque las extensiones dependen de esos contratos del core, pero los barridos de Vitest de extensión son trabajo de pruebas explícito. Los incrementos de versión solo de metadatos de lanzamiento ejecutan comprobaciones específicas de versión/config/root-dependency. Los cambios desconocidos en root/config fallan de forma segura hacia todos los carriles de comprobación.

Los envíos manuales de CI ejecutan `checks-node-compat-node22` como cobertura de compatibilidad de candidatos de lanzamiento. Las solicitudes de extracción normales y los envíos a `main` omiten ese carril y mantienen la matriz centrada en los carriles de pruebas/canales de Node 24.

Las familias de pruebas de Node más lentas se dividen o equilibran para que cada trabajo se mantenga pequeño sin sobre-reservar runners: los contratos de canal se ejecutan como tres shards ponderados, las pruebas de plugins empaquetados se equilibran entre seis trabajadores de extensión, los carriles unitarios pequeños del núcleo se emparejan, la auto-respuesta se ejecuta como cuatro trabajadores equilibrados con el subárbol de respuesta dividido en shards de agent-runner, dispatch y commands/state-routing, y las configuraciones de agentic gateway/plugin se distribuyen en los trabajos de Node agentic existentes de solo código fuente en lugar de esperar a los artefactos construidos. Las pruebas amplias de navegador, QA, multimedia y varios plugins utilizan sus configuraciones dedicadas de Vitest en lugar del plugin compartido genérico. Los trabajos de shard de extensión ejecutan hasta dos grupos de configuración de plugin a la vez con un trabajador Vitest por grupo y un montículo de Node más grande para que los lotes de plugins con muchas importaciones no creen trabajos adicionales de CI. El carril amplio de agentes utiliza el programador paralelo de archivos Vitest compartido porque está dominado por importaciones/programación en lugar de ser propiedad de un solo archivo de prueba lento. `runtime-config` se ejecuta con el shard core-runtime de infra para evitar que el shard runtime compartido sea responsable de la cola. Los shards de patrones de inclusión registran entradas de tiempo utilizando el nombre del shard de CI, por lo que `.artifacts/vitest-shard-timings.json` puede distinguir una configuración completa de un shard filtrado. `check-additional` mantiene el trabajo de compilación/canary de límite de paquete junto y separa la arquitectura de topología de tiempo de ejecución de la cobertura de watch de gateway; el shard boundary guard ejecuta sus pequeños guardias independientes simultáneamente dentro de un solo trabajo. Gateway watch, las pruebas de canal y el shard de límite de soporte central se ejecutan simultáneamente dentro de `build-artifacts` después de que `dist/` y `dist-runtime/` ya están construidos, manteniendo sus antiguos nombres de verificación como trabajos de verificación ligeros mientras se evitan dos trabajadores adicionales de Blacksmith y una segunda cola de consumidor de artefactos.
El CI de Android ejecuta tanto `testPlayDebugUnitTest` como `testThirdPartyDebugUnitTest`, y luego construye el APK de depuración de Play. El sabor de terceros no tiene un conjunto de fuentes o manifiesto separado; su carril de pruebas unitarias aún compila ese sabor con los indicadores BuildConfig de SMS/registro de llamadas, evitando al mismo tiempo un trabajo duplicado de empaquetado de APK de depuración en cada inserción relevante para Android.
GitHub puede marcar los trabajos reemplazados como `cancelled` cuando llega una inserción más reciente al mismo PR o a la referencia `main`. Trátelo como ruido de CI a menos que la ejecución más reciente para la misma referencia también esté fallando. Las comprobaciones agregadas de shards utilizan `!cancelled() && always()` para que aún informen fallos normales de shards pero no se pongan en cola después de que todo el flujo de trabajo ya ha sido reemplazado.
La clave de concurrencia automática de CI está versionada (`CI-v7-*`) para que un zombi del lado de GitHub en un grupo de cola antiguo no pueda bloquear indefinidamente las ejecuciones más recientes de main. Las ejecuciones manuales de suite completa utilizan `CI-manual-v1-*` y no cancelan las ejecuciones en curso.

## Ejecutores

| Ejecutor                         | Trabajos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                   | `preflight`, trabajos de seguridad rápidos y agregados (`security-scm-fast`, `security-dependency-audit`, `security-fast`), comprobaciones rápidas de protocolo/contrato/empaquetado, comprobaciones de contratos de canal fragmentadas, fragmentos de `check` excepto lint, fragmentos y agregados de `check-additional`, verificadores de agregados de pruebas de Node, comprobaciones de documentación, habilidades de Python, workflow-sanity, labeler, auto-response; el preflight de install-smoke también usa Ubuntu hospedado en GitHub para que la matriz de Blacksmith pueda ponerse en cola antes |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`, build-smoke, fragmentos de pruebas de Node en Linux, fragmentos de pruebas de complementos empaquetados, `android`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`, que sigue siendo lo suficientemente sensible a la CPU como para que 8 vCPU cuesten más de lo que ahorraban; las compilaciones de Docker de install-smoke, donde el tiempo de cola de 32 vCPU costaba más de lo que ahorraba                                                                                                                                                                                                                                                                                                                                                                    |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` en `openclaw/openclaw`; los forks recurren a `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` en `openclaw/openclaw`; los forks recurren a `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Equivalentes locales

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:changed   # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
```

## Relacionado

- [Resumen de instalación](/es/install)
- [Canales de lanzamiento](/es/install/development-channels)
