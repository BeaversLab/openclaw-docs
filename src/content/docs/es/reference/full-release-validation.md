---
summary: "Etapas de Validación de Lanzamiento Completo, flujos de trabajo secundarios, perfiles de lanzamiento, identificadores de reejecución y evidencia"
title: "Validación de lanzamiento completa"
read_when:
  - Running or rerunning Full Release Validation
  - Comparing stable and full release validation profiles
  - Debugging release validation stage failures
---

`Full Release Validation` es el paraguas de lanzamiento. Es el único punto de entrada
manual para la prueba previa al lanzamiento, pero la mayor parte del trabajo ocurre en flujos de trabajo secundarios para que
un cuadro fallido se pueda volver a ejecutar sin reiniciar todo el lanzamiento.

Ejecútelo desde una referencia de flujo de trabajo confiable, normalmente `main`, y pase la rama de lanzamiento,
etiqueta o SHA de confirmación completo como `ref`:

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

Los flujos de trabajo secundarios utilizan la referencia de flujo de trabajo confiable para el arnés y la entrada
`ref` para el candidato en prueba. Eso mantiene disponible la nueva lógica de validación
al validar una rama de lanzamiento o etiqueta antigua.

Por defecto, `release_profile=stable` ejecuta los carriles que bloquean el lanzamiento y omite
la prueba en vivo exhaustiva de Docker. Pase `run_release_soak=true` para incluir los
carriles de prueba en una ejecución estable. `release_profile=full` siempre habilita los carriles de prueba para que
el perfil asesor amplio nunca elimine la cobertura silenciosamente.

Package Acceptance normalmente construye el archivo tar del candidato desde el `ref` resuelto, incluyendo ejecuciones de SHA completas despachadas con `pnpm ci:full-release`. Después de una publicación beta, pase `release_package_spec=openclaw@YYYY.M.D-beta.N` para reutilizar el paquete npm enviado en las comprobaciones de lanzamiento, Package Acceptance, multi-OS, Docker de ruta de lanzamiento y Telegram del paquete. Use `package_acceptance_package_spec` solo cuando Package Acceptance debe probar intencionalmente un paquete diferente.

## Etapas de nivel superior

| Etapa                              | Detalles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolución de objetivo             | **Trabajo:** `Resolve target ref`<br />**Flujo de trabajo secundario:** ninguno<br />**Demuestra:** resuelve la rama de lanzamiento, etiqueta o SHA de confirmación completo y registra las entradas seleccionadas.<br />**Rerun:** vuelva a ejecutar el paraguas si esto falla.                                                                                                                                                                                                                                                                                                  |
| Vitest y CI normal                 | **Trabajo:** `Run normal full CI`<br />**Flujo de trabajo secundario:** `CI`<br />**Demuestra:** gráfico de CI completo manual contra la referencia de destino, incluyendo carriles de Linux Node, fragmentos de complementos empaquetados, fragmentos de contratos de complementos y canales, compatibilidad con Node 22, `check-*`, `check-additional-*`, pruebas de humo de artefactos construidos, comprobaciones de documentos, habilidades de Python, Windows, macOS, Control UI i18n y Android a través del paraguas.<br />**Nueva ejecución:** `rerun_group=ci`.          |
| Lanzamiento previo de complementos | **Trabajo:** `Run plugin prerelease validation`<br />**Flujo de trabajo secundario:** `Plugin Prerelease`<br />**Demuestra:** comprobaciones estáticas de complementos solo de lanzamiento, cobertura de complementos agéntica, fragmentos de lotes de extensiones completas, carriles Docker de prerrelease de complementos y un artefacto `plugin-inspector-advisory` no bloqueante para el triaje de compatibilidad.<br />**Rerun:** `rerun_group=plugin-prerelease`.                                                                                                          |
| Comprobaciones de lanzamiento      | **Trabajo:** `Run release/live/Docker/QA validation`<br />**Flujo de trabajo secundario:** `OpenClaw Release Checks`<br />**Demuestra:** pruebas de instalación, comprobaciones de paquetes multi-SO, Aceptación de paquetes, paridad del QA Lab, Matrix en vivo y Telegram en vivo. Con `run_release_soak=true` o `release_profile=full`, también ejecuta conjuntos exhaustivos de pruebas en vivo/E2E y fragmentos de ruta de lanzamiento de Docker.<br />**Ejecución nueva:** `rerun_group=release-checks` o un identificador más específico de comprobaciones de lanzamiento. |
| Artefacto de paquete               | **Trabajo:** `Prepare release package artifact`<br />**Flujo de trabajo secundario:** ninguno<br />**Demuestra:** crea el archivo tar `release-package-under-test` principal lo suficientemente temprano para las comprobaciones orientadas al paquete que no necesitan esperar `OpenClaw Release Checks`.<br />**Rerun:** vuelva a ejecutar el paraguas o proporcione `release_package_spec` para reejecuciones de paquetes publicados.                                                                                                                                          |
| Telegram de paquete                | **Trabajo:** `Run package Telegram E2E`<br />**Flujo de trabajo secundario:** `NPM Telegram Beta E2E`<br />**Demuestra:** prueba del paquete de Telegram respaldada por artefacto principal para `rerun_group=all` con `release_profile=full`, o prueba de Telegram de paquete publicado cuando `release_package_spec` o `npm_telegram_package_spec` están establecidos.<br />**Nueva ejecución:** `rerun_group=npm-telegram` con `release_package_spec` o `npm_telegram_package_spec`.                                                                                           |
| Verificador de paraguas            | **Trabajo:** `Verify full validation`<br />**Flujo de trabajo secundario:** ninguno<br />**Demuestra:** vuelve a verificar las conclusiones de ejecución secundaria registradas y añade las tablas de trabajos más lentas de los flujos de trabajo secundarios.<br />**Nueva ejecución:** vuelva a ejecutar solo este trabajo después de volver a ejecutar un trabajo secundario fallido para marcarlo como exitoso.                                                                                                                                                              |

Para `ref=main` y `rerun_group=all`, un paraguas más nuevo reemplaza a uno más antiguo.
Cuando el padre se cancela, su monitor cancela cualquier flujo de trabajo secundario que ya haya enviado. Las ejecuciones de validación de ramas y etiquetas de lanzamiento no se cancelan entre sí de forma predeterminada.

## Etapas de verificaciones de lanzamiento

`OpenClaw Release Checks` es el flujo de trabajo secundario más grande. Resuelve el objetivo
una vez y prepara un artefacto `release-package-under-test` compartido cuando las etapas
orientadas a paquetes o Docker lo necesitan.

| Etapa                               | Detalles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo de lanzamiento             | **Trabajo:** `Resolve target ref`<br />**Flujo de trabajo de respaldo:** ninguno<br />**Pruebas:** referencia seleccionada, SHA esperado opcional, perfil, grupo de nueva ejecución y filtro de suite en vivo enfocada.<br />**Nueva ejecución:** `rerun_group=release-checks`.                                                                                                                                                                                                                                                                                                                                                                                       |
| Artefacto del paquete               | **Trabajo:** `Prepare release package artifact`<br />**Flujo de trabajo de respaldo:** ninguno<br />**Pruebas:** empaqueta o resuelve un archivo tar candidato y carga `release-package-under-test` para las verificaciones orientadas a paquetes posteriores.<br />**Nueva ejecución:** el paquete afectado, el grupo multi-OS o el grupo en vivo/E2E.                                                                                                                                                                                                                                                                                                               |
| Prueba de instalación (smoke)       | **Trabajo:** `Run install smoke`<br />**Flujo de trabajo de respaldo:** `Install Smoke`<br />**Pruebas:** ruta de instalación completa con reutilización de imagen de prueba de Dockerfile raíz, instalación del paquete QR, pruebas de Docker raíz y de puerta de enlace, pruebas de Docker del instalador, prueba de proveedor de imagen de instalación global de Bun y E2E rápida de instalación/desinstalación de complementos empaquetados.<br />**Nueva ejecución:** `rerun_group=install-smoke`.                                                                                                                                                               |
| Multi-SO (Cross-OS)                 | **Trabajo:** `cross_os_release_checks`<br />**Flujo de trabajo de respaldo:** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**Pruebas:** carriles de instalación nueva y actualización en Linux, Windows y macOS para el proveedor y modo seleccionados, utilizando el archivo tar del candidato más un paquete de línea base.<br />**Nueva ejecución:** `rerun_group=cross-os`.                                                                                                                                                                                                                                                                                 |
| E2E de repositorio y en vivo (live) | **Trabajo:** `Run repo/live E2E validation`<br />**Flujo de trabajo de respaldo:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Pruebas:** E2E del repositorio, caché en vivo, streaming de websocket de OpenAI, fragmentos de proveedor nativo en vivo y complementos, y arneses de modelo/backend/puerta de enlace en vivo respaldados por Docker seleccionados por `release_profile`.<br />**Ejecuciones:** `run_release_soak=true`, `release_profile=full`, o enfocadas `rerun_group=live-e2e`.<br />**Nueva ejecución:** `rerun_group=live-e2e`, opcionalmente con `live_suite_filter`.                                                                      |
| Ruta de lanzamiento de Docker       | **Trabajo:** `Run Docker release-path validation`<br />**Flujo de trabajo de respaldo:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Pruebas:** fragmentos Docker de ruta de lanzamiento contra el artefacto de paquete compartido.<br />**Ejecuciones:** `run_release_soak=true`, `release_profile=full`, o enfocadas `rerun_group=live-e2e`.<br />**Nueva ejecución:** `rerun_group=live-e2e`.                                                                                                                                                                                                                                                                 |
| Aceptación de paquetes              | **Trabajo:** `Run package acceptance`<br />**Flujo de trabajo de respaldo:** `Package Acceptance`<br />**Pruebas:** accesorios de paquetes de complementos sin conexión, actualización de complementos, aceptación de paquetes de Telegram simulando OpenAI y comprobaciones de supervivencia de actualización publicada contra el mismo archivo tar. Las comprobaciones de lanzamiento bloqueantes utilizan la línea base publicada más reciente predeterminada; las comprobaciones de soaking se expanden a cada versión estable de npm en o posterior a `2026.4.23` además de accesorios de problemas reportados.<br />**Nueva ejecución:** `rerun_group=package`. |
| Paridad de QA                       | **Trabajo:** `Run QA Lab parity lane` y `Run QA Lab parity report`<br />**Flujo de trabajo de respaldo:** trabajos directos<br />**Pruebas:** paquetes de paridad de agente del candidato y la línea base, y luego el informe de paridad.<br />**Nueva ejecución:** `rerun_group=qa-parity` o `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                       |
| Matrix en vivo de QA                | **Trabajo:** `Run QA Lab live Matrix lane`<br />**Workflow de respaldo:** trabajo directo<br />**Pruebas:** perfil rápido de QA de Matrix en vivo en el entorno `qa-live-shared`.<br />**Nueva ejecución:** `rerun_group=qa-live` o `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Telegram en vivo de QA              | **Trabajo:** `Run QA Lab live Telegram lane`<br />**Workflow de respaldo:** trabajo directo<br />**Pruebas:** QA de Telegram en vivo con arrendamientos de credenciales de Convex CI.<br />**Nueva ejecución:** `rerun_group=qa-live` o `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                                                                             |
| Verificador de lanzamiento          | **Trabajo:** `Verify release checks`<br />**Workflow de respaldo:** ninguno<br />**Pruebas:** trabajos de comprobación de lanzamiento (release-check) necesarios para el grupo de nueva ejecución seleccionado.<br />**Nueva ejecución:** volver a ejecutar después de que pasen los trabajos secundarios centrados.                                                                                                                                                                                                                                                                                                                                                  |

## Fragmentos de la ruta de lanzamiento de Docker

La etapa de ruta de lanzamiento (release-path) de Docker ejecuta estos fragmentos cuando `live_suite_filter` está
vacío:

| Fragmento                                                     | Cobertura                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core`                                                        | Carriles de pruebas de humeo de la ruta de lanzamiento principal de Docker.                                                                      |
| `package-update-openai`                                       | Comportamiento de instalación/actualización del paquete OpenAI, instalación bajo demanda de Codex y llamadas a herramientas de Chat Completions. |
| `package-update-anthropic`                                    | Comportamiento de instalación y actualización del paquete Anthropic.                                                                             |
| `package-update-core`                                         | Comportamiento de paquete y actualización neutral del proveedor.                                                                                 |
| `plugins-runtime-plugins`                                     | Carriles de tiempo de ejecución de complementos que ejercitan el comportamiento del complemento.                                                 |
| `plugins-runtime-services`                                    | Carriles de tiempo de ejecución de complementos en vivo y respaldados por servicios; incluye OpenWebUI cuando se solicita.                       |
| `plugins-runtime-install-a` hasta `plugins-runtime-install-h` | Lotes de instalación/tiempo de ejecución de complementos divididos para la validación de lanzamiento en paralelo.                                |

Use `docker_lanes=<lane[,lane]>` específico en el workflow reutilizable de E2E/en vivo cuando
solo haya fallado un carril de Docker. Los artefactos de lanzamiento incluyen comandos de nueva ejecución por carril con entradas de reutilización de artefactos de paquete e imágenes cuando estén disponibles.

## Perfiles de lanzamiento

`release_profile` controla principalmente la amplitud en vivo/proveedor dentro de las comprobaciones de lanzamiento.
No elimina el CI completo normal, Plugin Prerelease, install smoke, aceptación de paquetes
o QA Lab. Para `stable`, los fragmentos exhaustivos de E2E de repositorio/en vivo y de ruta de lanzamiento de Docker
son cobertura de soaking y se ejecutan cuando `run_release_soak=true`.
`full` fuerza la activación de la cobertura de soaking y también hace que el paraguas ejecute el paquete Telegram
E2E contra el artefacto del paquete de lanzamiento principal cuando `rerun_group=all`, para que un candidato
completo de publicación previa no omita silenciosamente ese carril del paquete Telegram.

| Perfil    | Uso previsto                                        | Cobertura en vivo/proveedor incluida                                                                                                                                                                                                |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | Prueba de humo crítica de lanzamiento más rápida.   | Ruta en vivo de OpenAI/core, modelos en vivo de Docker para OpenAI, núcleo de puerta de enlace nativa, perfil de puerta de enlace nativa de OpenAI, complemento nativo de OpenAI y puerta de enlace en vivo de Docker OpenAI.       |
| `stable`  | Perfil de aprobación de lanzamiento predeterminado. | `minimum` más pruebas de humo de Anthropic, Google, MiniMax, backend, arnés de pruebas en vivo nativo, backend de CLI en vivo de Docker, enlace ACP de Docker, arnés Codex de Docker, y un shard de pruebas de humo de OpenCode Go. |
| `full`    | Barrido amplio de asesoramiento.                    | `stable` más proveedores de avisos, shards de plugins en vivo y shards de medios en vivo.                                                                                                                                           |

## Adiciones solo completas

Estas suites se omiten en `stable` y se incluyen en `full`:

| Área                                             | Cobertura solo completa                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modelos en vivo de Docker                        | OpenCode Go, OpenRouter, xAI, Z.ai y Fireworks.                                                                                                  |
| Puerta de enlace en vivo de Docker               | Proveedores de asesoramiento divididos en fragmentos DeepSeek/Fireworks, OpenCode Go/OpenRouter y xAI/Z.ai.                                      |
| Perfiles de proveedor de puerta de enlace nativa | Fragmentos completos de Anthropic Opus y Sonnet/Haiku, Fireworks, DeepSeek, fragmentos completos de modelos OpenCode Go, OpenRouter, xAI y Z.ai. |
| Fragmentos en vivo de complementos nativos       | Complementos A-K, L-N, O-Z otros, Moonshot y xAI.                                                                                                |
| Fragmentos en vivo de medios nativos             | Grupos de audio, música de Google, música de MiniMax y video A-D.                                                                                |

`stable` incluye `native-live-src-gateway-profiles-anthropic-smoke` y
`native-live-src-gateway-profiles-opencode-go-smoke`; `full` utiliza en su lugar los
shards de modelos más amplios de Anthropic y OpenCode Go. Las reejecuciones enfocadas aún pueden usar los
identificadores agregados `native-live-src-gateway-profiles-anthropic` o
`native-live-src-gateway-profiles-opencode-go`.

## Reejecuciones centradas

Use `rerun_group` para evitar repetir cuadros de lanzamiento no relacionados:

| Identificador       | Alcance                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `all`               | Todas las etapas de Validación de Lanzamiento Completo.                                              |
| `ci`                | Solo hijo de CI completo manual.                                                                     |
| `plugin-prerelease` | Solo hijo de Prerelease de Complemento.                                                              |
| `release-checks`    | Todas las etapas de Comprobaciones de Lanzamiento de OpenClaw.                                       |
| `install-smoke`     | Prueba de humo de instalación a través de comprobaciones de lanzamiento.                             |
| `cross-os`          | Comprobaciones de lanzamiento multiplataforma.                                                       |
| `live-e2e`          | Validación del Repo/live E2E y de la ruta de lanzamiento de Docker.                                  |
| `package`           | Aceptación de paquetes.                                                                              |
| `qa`                | Paridad de QA más carriles de QA live.                                                               |
| `qa-parity`         | Carriles de paridad de QA y solo reporte.                                                            |
| `qa-live`           | QA live Matrix y solo Telegram.                                                                      |
| `npm-telegram`      | E2E de Telegram de paquete publicado; requiere `release_package_spec` o `npm_telegram_package_spec`. |

Use `live_suite_filter` con `rerun_group=live-e2e` cuando una suite en vivo falló.
Los ids de filtro válidos se definen en el flujo de trabajo reutilizable live/E2E, incluyendo
`docker-live-models`, `live-gateway-docker`,
`live-gateway-anthropic-docker`, `live-gateway-google-docker`,
`live-gateway-minimax-docker`, `live-gateway-advisory-docker`,
`live-cli-backend-docker`, `live-acp-bind-docker`, y
`live-codex-harness-docker`.

El identificador `live-gateway-advisory-docker` es un identificador de reejecución agregado para sus
tres shards de proveedores, por lo que aún se distribuye a todos los trabajos de puerta de enlace de Docker de avisos.

Use `cross_os_suite_filter` con `rerun_group=cross-os` cuando un carril multiplataforma
ha fallado. El filtro acepta un id de SO, un id de suite o un par SO/suite, por
ejemplo `windows/packaged-upgrade`, `windows` o `packaged-fresh`. Los resúmenes
cross-OS incluyen cronometraciones por fase para los carriles de actualización empaquetada,
y los comandos de larga duración imprimen líneas de latido para que una actualización
de Windows atascada sea visible antes de que se agote el tiempo de espera del trabajo.

Los carriles de comprobación de versión de QA son de asesoramiento, excepto la puerta de cobertura de herramientas de tiempo de ejecución estándar. La derivación dinámica de herramientas OpenClaw requerida en el nivel estándar bloquea el verificador de comprobación de versión; otros fallos solo de QA se reportan como advertencias. Vuelva a ejecutar `rerun_group=qa`, `qa-parity` o `qa-live` cuando necesite evidencia de QA nueva.

## Evidencia para conservar

Mantenga el resumen `Full Release Validation` como el índice de nivel de versión. Vincula
los ids de ejecuciones secundarias e incluye tablas de trabajos más lentos. Ante fallos,
inspeccione primero el flujo de trabajo secundario y luego vuelva a ejecutar el manejador
coincidente más pequeño de los anteriores.

Artefactos útiles:

- `release-package-under-test` del padre de Validación de versión completa y `OpenClaw Release Checks`
- Artefactos de ruta de lanzamiento de Docker bajo `.artifacts/docker-tests/`
- Aceptación de paquetes `package-under-test` y artefactos de aceptación de Docker
- Artefactos de comprobación de lanzamiento multi-OS para cada sistema operativo y suite
- Artefactos de paridad de QA, Matrix y Telegram

## Archivos de flujo de trabajo

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
