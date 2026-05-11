---
summary: "Canales de lanzamiento, lista de verificación del operador, casillas de validación, nomenclatura de versiones y cadencia"
title: "Política de lanzamiento"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw tiene tres canales públicos de lanzamiento:

- estable: lanzamientos etiquetados que se publican en npm `beta` de forma predeterminada, o en npm `latest` cuando se solicita explícitamente
- beta: etiquetas de prelanzamiento que se publican en npm `beta`
- dev: la cabeza móvil de `main`

## Nomenclatura de versiones

- Versión de lanzamiento estable: `YYYY.M.D`
  - Etiqueta Git: `vYYYY.M.D`
- Versión de lanzamiento de corrección estable: `YYYY.M.D-N`
  - Etiqueta Git: `vYYYY.M.D-N`
- Versión de prelanzamiento beta: `YYYY.M.D-beta.N`
  - Etiqueta Git: `vYYYY.M.D-beta.N`
- No rellene con ceros el mes o el día
- `latest` significa el lanzamiento estable de npm promocionado actual
- `beta` significa el objetivo de instalación beta actual
- Los lanzamientos estables y de corrección estable se publican en npm `beta` de forma predeterminada; los operadores de lanzamiento pueden apuntar a `latest` explícitamente, o promocionar una compilación beta verificada más tarde
- Cada lanzamiento estable de OpenClaw envía el paquete npm y la aplicación de macOS juntos;
  los lanzamientos beta normalmente validan y publican la ruta del paquete/npm primero,
  reservando la compilación/firma/notarización de la aplicación mac para la versión estable a menos que se solicite explícitamente

## Cadencia de lanzamientos

- Los lanzamientos se mueven primero a beta
- La versión estable sigue solo después de que se valida la última beta
- Los mantenedores generalmente crean lanzamientos desde una rama `release/YYYY.M.D` creada
  a partir del `main` actual, por lo que la validación del lanzamiento y las correcciones no bloquean el nuevo
  desarrollo en `main`
- Si se ha enviado o publicado una etiqueta beta y necesita una corrección, los mantenedores crean
  la siguiente etiqueta `-beta.N` en lugar de eliminar o recrear la etiqueta beta antigua
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  exclusivos para los mantenedores

## Lista de verificación del operador de lanzamiento

Esta lista de verificación es la forma pública del flujo de lanzamiento. Las credenciales privadas,
la firma, la notarización, la recuperación de dist-tags y los detalles de reversión de emergencia se mantienen en
el manual de ejecución de lanzamiento solo para mantenedores.

1. Comenzar desde el `main` actual: obtener lo último, confirmar que el commit de destino se ha enviado,
   y confirmar que la CI actual del `main` es lo suficientemente verde como para crear una rama desde él.
2. Reescribir la sección superior `CHANGELOG.md` desde el historial de commits reales con
   `/changelog`, mantener las entradas orientadas al usuario, confirmarlo, enviarlo, y hacer rebase/pull
   una vez más antes de crear la rama.
3. Revisar los registros de compatibilidad de lanzamiento en
   `src/plugins/compat/registry.ts` y
   `src/commands/doctor/shared/deprecation-compat.ts`. Eliminar la compatibilidad
   caducada solo cuando la ruta de actualización permanece cubierta, o registrar por qué se
   mantiene intencionalmente.
4. Crear `release/YYYY.M.D` desde el `main` actual; no realizar el trabajo de lanzamiento normal
   directamente en `main`.
5. Aumentar cada ubicación de versión requerida para la etiqueta deseada, luego ejecutar el
   preflight determinista local:
   `pnpm check:test-types`, `pnpm check:architecture`,
   `pnpm build && pnpm ui:build`, y `pnpm release:check`.
6. Ejecutar `OpenClaw NPM Release` con `preflight_only=true`. Antes de que exista una etiqueta,
   se permite un SHA de rama de lanzamiento completo de 40 caracteres para el preflight
   solo de validación. Guardar el `preflight_run_id` exitoso.
7. Iniciar todas las pruebas previas al lanzamiento con `Full Release Validation` para la
   rama de lanzamiento, etiqueta, o SHA de commit completo. Este es el único punto de entrada manual
   para las cuatro grandes cajas de prueba de lanzamiento: Vitest, Docker, QA Lab y Package.
8. Si la validación falla, solucionar en la rama de lanzamiento y volver a ejecutar el archivo fallido más pequeño,
   carril, trabajo de flujo de trabajo, perfil de paquete, proveedor, o lista blanca de modelo que
   demuestre la solución. Volver a ejecutar el paraguas completo solo cuando la superficie modificada haga
   que la evidencia previa quede obsoleta.
9. Para beta, etiqueta `vYYYY.M.D-beta.N`, publica con npm dist-tag `beta`, luego ejecuta
   la aceptación del paquete posterior a la publicación contra el paquete publicado `openclaw@YYYY.M.D-beta.N`
   o `openclaw@beta`. Si un beta enviado o publicado necesita una corrección, crea
   el siguiente `-beta.N`; no elimines ni reescribas el beta anterior.
10. Para estable, continúa solo después de que el beta verificado o el candidato de lanzamiento tenga la
    evidencia de validación requerida. La publicación estable en npm reutiliza el artefacto de
    prelanzamiento exitoso a través de `preflight_run_id`; la preparación para el lanzamiento estable en macOS
    también requiere el `.zip`, `.dmg`, `.dSYM.zip` empaquetados y el `appcast.xml` actualizado
    en `main`.
11. Después de publicar, ejecuta el verificador posterior a la publicación de npm, el Telegram E2E
    publicado-npm independiente opcional cuando necesites pruebas del canal posterior a la publicación,
    la promoción de dist-tag cuando sea necesario, las notas de lanzamiento/prerelease de GitHub desde la
    sección `CHANGELOG.md` completa coincidente, y los pasos del anuncio de lanzamiento.

## Prelanzamiento de la versión

- Ejecuta `pnpm check:test-types` antes del prelanzamiento de la versión para que el TypeScript de prueba permanezca
  cubierto fuera del controlador `pnpm check` local más rápido
- Ejecuta `pnpm check:architecture` antes del prelanzamiento de la versión para que las comprobaciones del ciclo de
  importación más amplio y los límites de la arquitectura estén en verde fuera del controlador local más rápido
- Ejecuta `pnpm build && pnpm ui:build` antes de `pnpm release:check` para que los artefactos de lanzamiento
  `dist/*` esperados y el paquete de Control UI existan para el paso de
  validación del paquete
- Ejecuta el flujo de trabajo manual `Full Release Validation` antes de la aprobación del lanzamiento para
  iniciar todos los cuadros de prueba de prelanzamiento desde un solo punto de entrada. Acepta una rama,
  etiqueta o SHA de confirmación completo, envía `CI` manuales y envía
  `OpenClaw Release Checks` para pruebas de humo de instalación, aceptación de paquetes, suites de rutas de lanzamiento de Docker,
  en vivo/E2E, OpenWebUI, paridad de QA Lab, Matrix y carriles de Telegram. Proporciona `npm_telegram_package_spec` solo después de que
  se haya publicado un paquete y también se debe ejecutar el Telegram E2E posterior a la publicación. Ejemplo:
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Ejecute el flujo de trabajo manual `Package Acceptance` cuando desee una prueba por canal lateral
  para un candidato de paquete mientras continúa el trabajo de lanzamiento. Use `source=npm` para
  `openclaw@beta`, `openclaw@latest`, o una versión de lanzamiento exacta; `source=ref`
  para empaquetar una rama/etiqueta/SHA de `package_ref` de confianza con el arnés
  `workflow_ref` actual; `source=url` para un archivo tar HTTPS con un
  SHA-256 requerido; o `source=artifact` para un archivo tar cargado por otra ejecución de
  GitHub Actions. El flujo de trabajo resuelve el candidato a
  `package-under-test`, reutiliza el programador de lanzamiento Docker E2E contra ese
  archivo tar, y puede ejecutar QA de Telegram contra el mismo archivo tar con
  `telegram_mode=mock-openai` o `telegram_mode=live-frontier`.
  Ejemplo: `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f telegram_mode=mock-openai`
  Perfiles comunes:
  - `smoke`: carriles de install/channel/agent, red de pasarela y recarga de configuración
  - `package`: carriles de paquete/actualización/complemento nativos de artefactos sin OpenWebUI o ClawHub en vivo
  - `product`: perfil de paquete más canales MCP, limpieza de cron/subagente,
    búsqueda web de OpenAI y OpenWebUI
  - `full`: fragmentos de ruta de lanzamiento de Docker con OpenWebUI
  - `custom`: selección exacta de `docker_lanes` para una reejecución enfocada
- Ejecute el flujo de trabajo manual `CI` directamente cuando solo necesite cobertura completa de CI normal
  para el candidato de lanzamiento. Los envíos manuales de CI omiten el ámbito de cambios
  y fuerzan los fragmentos de Node Linux, fragmentos de complementos incluidos, contratos de canal,
  compatibilidad con Node 22, `check`, `check-additional`, prueba de compilación,
  comprobaciones de documentos, habilidades de Python, Windows, macOS, Android y carriles i18n
  de Control UI.
  Ejemplo: `gh workflow run ci.yml --ref release/YYYY.M.D`
- Ejecute `pnpm qa:otel:smoke` al validar la telemetría de lanzamiento. Ejercita
  el laboratorio de QA a través de un receptor OTLP/HTTP local y verifica los nombres de intervalo de rastreo exportados,
  atributos delimitados y redacción de contenido/identificador sin
  requerir Opik, Langfuse u otro colector externo.
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- Las comprobaciones de lanzamiento ahora se ejecutan en un flujo de trabajo manual separado:
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` también ejecuta el gateway de paridad simulada de QA Lab, además del perfil de Matrix en vivo rápido y el carril de QA de Telegram antes de la aprobación del lanzamiento. Los carriles en vivo utilizan el entorno `qa-live-shared`; Telegram también utiliza arrendamientos de credenciales de Convex CI. Ejecute el flujo de trabajo manual `QA-Lab - All Lanes` con
  `matrix_profile=all` y `matrix_shards=true` cuando desee un inventario completo de transporte, medios y E2EE de Matrix en paralelo.
- La validación de tiempo de ejecución de instalación y actualización multi-SO es parte de `OpenClaw Release Checks` y `Full Release Validation` públicos, que llaman al flujo de trabajo reutilizable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directamente
- Esta separación es intencional: mantener la ruta de lanzamiento real de npm corta, determinista y centrada en artefactos, mientras que las comprobaciones en vivo más lentas permanecen en su propio carril para no retrasar ni bloquear la publicación
- Las comprobaciones de lanzamiento que portan secretos deben ser despachadas a través de la referencia del flujo de trabajo `Full Release
Validation` or from the `main`/release para que la lógica del flujo de trabajo y los secretos se mantengan controlados
- `OpenClaw Release Checks` acepta una rama, etiqueta o SHA de confirmación completo siempre y cuando la confirmación resuelta sea accesible desde una rama o etiqueta de lanzamiento de OpenClaw
- El prevuelo de solo validación `OpenClaw NPM Release` también acepta el SHA de confirmación completo de 40 caracteres de la rama del flujo de trabajo actual sin requerir una etiqueta enviada
- Esa ruta SHA es solo de validación y no se puede promocionar a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la verificación de metadatos del paquete; la publicación real aún requiere una etiqueta de lanzamiento real
- Ambos flujos de trabajo mantienen la ruta real de publicación y promoción en ejecutores alojados en GitHub, mientras que la ruta de validación no mutante puede utilizar los ejecutores Linux más grandes de Blacksmith
- Ese flujo de trabajo ejecuta
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  utilizando tanto los secretos del flujo de trabajo `OPENAI_API_KEY` como `ANTHROPIC_API_KEY`
- El prevuelo de lanzamiento de npm ya no espera al carril separado de comprobaciones de lanzamiento
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección coincidente) antes de la aprobación
- Después de npm publish, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección coincidente) para verificar la ruta de instalación
  del registro publicado en un prefijo temporal nuevo
- Después de una publicación beta, ejecute `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  para verificar la incorporación del paquete instalado, la configuración de Telegram y las pruebas E2E
  reales de Telegram contra el paquete npm publicado utilizando el grupo compartido
  de credenciales arrendadas de Telegram. Las pruebas individuales de los mantenedores locales pueden omitir las variables de Convex y pasar las tres
  credenciales de entorno `OPENCLAW_QA_TELEGRAM_*` directamente.
- Los mantenedores pueden ejecutar la misma verificación posterior a la publicación desde GitHub Actions mediante el
  flujo de trabajo manual `NPM Telegram Beta E2E`. Es intencionalmente solo manual y
  no se ejecuta en cada fusión.
- La automatización de lanzamiento de los mantenedores ahora utiliza preflight-then-promote:
  - la publicación real en npm debe pasar un npm `preflight_run_id` exitoso
  - la publicación real en npm debe ser enviada desde la misma rama `main` o
    `release/YYYY.M.D` que la ejecución de preflight exitosa
  - los lanzamientos estables en npm usan `beta` por defecto
  - la publicación estable en npm puede apuntar a `latest` explícitamente mediante la entrada del flujo de trabajo
  - la mutación de dist-tags de npm basada en tokens ahora reside en
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    por seguridad, porque `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras que el
    repositorio público mantiene la publicación solo con OIDC
  - `macOS Release` público es solo de validación
  - la publicación real privada en mac debe pasar una verificación privada en mac
    `preflight_run_id` y `validate_run_id` exitosa
  - las rutas de publicación reales promueven los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para lanzamientos de correcciones estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de lanzamiento no puedan dejar silenciosamente instalaciones globales antiguas en la
  carga útil estable base
- el preflight de lanzamiento de npm falla de forma cerrada a menos que el archivo incluya tanto
  `dist/control-ui/index.html` como una carga útil `dist/control-ui/assets/` no vacía
  para no volver a enviar un panel de navegador vacío
- La verificación posterior a la publicación también comprueba que la instalación del registro publicado
  contiene dependencias de runtime del complemento empaquetado no vacías bajo el diseño `dist/*`
  raíz. Una versión que se envía con cargas de dependencia del complemento empaquetado
  faltantes o vacías falla el verificador de postpublicación y no se puede promocionar
  a `latest`.
- `pnpm test:install:smoke` también impone el presupuesto `unpackedSize` de npm pack en
  el archivo tar de actualización candidato, por lo que el instalador e2e detecta el hinchamiento accidental del paquete
  antes de la ruta de publicación de la versión
- Si el trabajo de la versión tocó la planificación de CI, los manifiestos de sincronización de extensiones o
  las matrices de prueba de extensiones, regenere y revise las `checks-node-extensions` de matriz de flujo de trabajo
  propiedad del planificador desde `.github/workflows/ci.yml`
  antes de la aprobación para que las notas de la versión no describan un diseño de CI obsoleto
- La preparación para la versión estable de macOS también incluye las superficies del actualizador:
  - la versión de GitHub debe terminar con el `.zip`, `.dmg` y `.dSYM.zip` empaquetados
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación
  - la aplicación empaquetada debe mantener un id de paquete que no sea de depuración, una URL de fuente de Sparkle
    no vacía y una `CFBundleVersion` en o por encima del límite de compilación canónico de Sparkle
    para esa versión

## Casos de prueba de versión

`Full Release Validation` es la forma en que los operadores inician todas las pruebas previas al lanzamiento desde
un único punto de entrada. Ejecútelo desde la referencia de flujo de trabajo `main` de confianza y pase la
rama de versión, etiqueta o SHA de confirmación completo como `ref`:

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both
```

El flujo de trabajo resuelve la referencia de destino, despacha manual `CI` con
`target_ref=<release-ref>`, despacha `OpenClaw Release Checks` y
opcionalmente despacha Telegram E2E independiente posterior a la publicación cuando
`npm_telegram_package_spec` está configurado. `OpenClaw Release Checks` luego distribuye
pruebas de humo de instalación, comprobaciones de lanzamiento multi-SO, cobertura de ruta de lanzamiento Docker en vivo/E2E,
Aceptación de Paquetes con QA de paquetes Telegram, paridad de QA Lab, Matrix en vivo
y Telegram en vivo. Una ejecución completa solo es aceptable cuando el resumen de `Full Release Validation`
muestra `normal_ci` y `release_checks` como exitosos, y cualquier hijo opcional
de `npm_telegram` es exitoso o se omite intencionalmente.
Los flujos de trabajo secundarios se despachan desde la referencia de confianza que ejecuta `Validación de lanzamiento completo`, normally `--ref main`, even when the target `ref` apunta a una
rama o etiqueta de lanzamiento anterior. No hay una entrada de referencia de flujo de trabajo separada para la Validación de lanzamiento completo; elija el arnés de confianza eligiendo la referencia de ejecución del flujo de trabajo.

Use estas variantes dependiendo de la etapa de lanzamiento:

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both

# Validate an exact pushed commit.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=<40-char-sha> \
  -f provider=openai \
  -f mode=both

# After publishing a beta, add published-package Telegram E2E.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

No use el paraguas completo como la primera reejecución después de una corrección enfocada. Si una casilla
falla, use el flujo de trabajo secundario, trabajo, carril Docker, perfil de paquete, proveedor
de modelo o carril de QA fallido para la siguiente prueba. Ejecute el paraguas completo nuevamente solo cuando
la corrección cambió la orquestación de lanzamiento compartida o hizo que la evidencia de todas las casillas anterior
quedara obsoleta. El verificador final del paraguas vuelve a verificar los ids de ejecución del flujo de trabajo secundario registrados,
por lo que después de que un flujo de trabajo secundario se reejecuta exitosamente, reejecute solo el trabajo padre `Verify full validation` fallido.

### Vitest

La casilla Vitest es el flujo de trabajo secundario manual `CI`. El CI manual omite
intencionalmente el alcance de cambios y fuerza el gráfico de pruebas normal para el candidato
de lanzamiento: fragmentos de Linux Node, fragmentos de complementos incluidos, contratos de canal, compatibilidad
con Node 22, `check`, `check-additional`, pruebas de humo de compilación, comprobaciones de documentación, habilidades
de Python, Windows, macOS, Android e i18n de Control UI.

Use esta casilla para responder "¿pasó el árbol de origen el conjunto de pruebas normal completo?"
No es lo mismo que la validación del producto de ruta de lanzamiento. Evidencia a conservar:

- `Full Release Validation` resumen que muestra la URL de ejecución enviada `CI`
- ejecución `CI` en verde en el SHA objetivo exacto
- nombres de fragmentos (shards) fallidos o lentos de los trabajos de CI al investigar regresiones
- artefactos de tiempo de Vitest, como `.artifacts/vitest-shard-timings.json`, cuando
  una ejecución necesita análisis de rendimiento

Ejecute la CI manual directamente solo cuando la versión necesite una CI normal determinista pero
no los cuadros de Docker, QA Lab, live, multi-OS o de paquete:

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

El cuadro de Docker vive en `OpenClaw Release Checks` a través de
`openclaw-live-and-e2e-checks-reusable.yml`, además del flujo de trabajo
`install-smoke` en modo de lanzamiento. Valida el candidato de lanzamiento a través de
entornos Docker empaquetados en lugar de solo pruebas a nivel de código fuente.

La cobertura de Docker de lanzamiento incluye:

- prueba de humo (smoke) de instalación completa con la prueba de humo de instalación global lenta de Bun habilitada
- carriles E2E del repositorio
- fragmentos Docker de ruta de lanzamiento: `core`, `package-update`, `plugins-runtime` y
  `bundled-channels`
- cobertura de OpenWebUI dentro del fragmento `plugins-runtime` cuando se solicita
- carriles de dependencia de canal empaquetado (bundled-channel) separados en su propio fragmento `bundled-channels`
  en lugar del carril serial todo en uno empaquetado (bundled-channel)
- carriles de instalación/desinstalación de complementos empaquetados (bundled) separados
  `bundled-plugin-install-uninstall-0` a través de
  `bundled-plugin-install-uninstall-7`
- conjuntos de proveedores live/E2E y cobertura de modelo en vivo de Docker cuando las comprobaciones de lanzamiento
  incluyen conjuntos en vivo

Use los artefactos de Docker antes de volver a ejecutar. El programador de ruta de lanzamiento (release-path) sube
`.artifacts/docker-tests/` con registros de carril, `summary.json`, `failures.json`,
tiempos de fase, plan del programador en JSON y comandos de reejecución. Para una recuperación enfocada,
use `docker_lanes=<lane[,lane]>` en el flujo de trabajo reutilizable live/E2E en lugar de
volver a ejecutar todos los fragmentos de lanzamiento. Los comandos de reejecución generados incluyen entradas previas
`package_artifact_run_id` y entradas de imagen Docker preparadas cuando están disponibles, de modo que un
carril fallido puede reutilizar el mismo archivo tar y las imágenes GHCR.

### QA Lab

El cuadro de QA Lab también es parte de `OpenClaw Release Checks`. Es la puerta de lanzamiento
de comportamiento agentic y a nivel de canal, separada de la mecánica de paquetes Vitest y Docker.

La cobertura del Laboratorio de QA de versiones incluye:

- puerta de paridad simulada que compara el canal candidato de OpenAI contra la línea base de Opus 4.6
  utilizando el paquete de paridad agéntica
- perfil QA rápido de Matrix en vivo utilizando el entorno `qa-live-shared`
- canal QA de Telegram en vivo utilizando arrendamientos de credenciales de Convex CI
- `pnpm qa:otel:smoke` cuando la telemetría de la versión necesita una prueba local explícita

Use este cuadro para responder "¿se comporta la versión correctamente en escenarios de QA y
flujos de canales en vivo?" Conserve las URL de los artefactos para los canales de paridad, Matrix y Telegram
al aprobar la versión. La cobertura completa de Matrix sigue disponible como una
ejecución manual y fragmentada del Laboratorio de QA en lugar del canal crítico de versión predeterminado.

### Paquete

El cuadro Paquete es la puerta del producto instalable. Está respaldado por
`Package Acceptance` y el resolvedor
`scripts/resolve-openclaw-package-candidate.mjs`. El resolvedor normaliza un
candidato en el archivo tar `package-under-test` consumido por Docker E2E, valida
el inventario del paquete, registra la versión del paquete y SHA-256, y mantiene la
referencia del arnés de flujo de trabajo separada de la referencia de origen del paquete.

Fuentes de candidatas compatibles:

- `source=npm`: `openclaw@beta`, `openclaw@latest`, o una versión de lanzamiento exacta de OpenClaw
- `source=ref`: empaquetar una rama `package_ref` de confianza, etiqueta o SHA de confirmación completo
  con el arnés `workflow_ref` seleccionado
- `source=url`: descargar un `.tgz` HTTPS con el `package_sha256` requerido
- `source=artifact`: reutilizar un `.tgz` cargado por otra ejecución de GitHub Actions

`OpenClaw Release Checks` ejecuta la Aceptación de Paquetes (Package Acceptance) con `source=ref`,
`package_ref=<release-ref>`, `suite_profile=custom`,
`docker_lanes=bundled-channel-deps-compat plugins-offline` y
`telegram_mode=mock-openai`. Los fragmentos de Docker de la ruta de lanzamiento (release-path) cubren los
carriles solapados de instalación, actualización y actualización de complementos; la Aceptación de Paquetes mantiene
la compatibilidad del canal empaquetado nativo de artefactos, los dispositivos de complementos sin conexión y el control de calidad
del paquete Telegram contra el mismo tarball resuelto. Es el reemplazo nativo de GitHub
para la mayor parte de la cobertura de paquete/actualización que anteriormente requería
Parallels. Las comprobaciones de lanzamiento entre sistemas operativos siguen siendo importantes para la incorporación (onboarding)
específica del sistema operativo, el instalador y el comportamiento de la plataforma, pero la validación
producto paquete/actualización debería preferir la Aceptación de Paquetes.

La tolerancia de aceptación de paquetes heredada está limitada intencionalmente en el tiempo. Los paquetes a través de
`2026.4.25` pueden usar la ruta de compatibilidad para las lagunas de metadatos ya publicadas
en npm: entradas de inventario de QA privadas que faltan en el tarball, `gateway install --wrapper` faltante,
archivos de parche faltantes en el dispositivo git derivado del tarball,
`update.channel` persistido faltante, ubicaciones de registros de instalación de complementos heredadas,
persistencia faltante de registros de instalación del mercado y migración de metadatos de configuración
durante `plugins update`. Los paquetes posteriores a `2026.4.25` deben satisfacer los
contratos de paquetes modernos; esas mismas lagunas provocan un fallo en la validación de lanzamiento.

Use perfiles más amplios de Aceptación de Paquetes cuando la pregunta de lanzamiento se trate de un
paquete instalable real:

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product
```

Perfiles de paquetes comunes:

- `smoke`: carriles rápidos de instalación/canal/agente de paquete, red de puerta de enlace (gateway) y
  recarga de configuración
- `package`: contratos de paquetes de instalación/actualización/complemento sin ClawHub en vivo; este es el valor predeterminado
  de release-check
- `product`: `package` más canales MCP, limpieza de cron/subagente, búsqueda web de
  OpenAI y OpenWebUI
- `full`: fragmentos de la ruta de lanzamiento de Docker con OpenWebUI
- `custom`: lista exacta de `docker_lanes` para reejecuciones enfocadas

Para la prueba de Telegram de candidato a paquete, active `telegram_mode=mock-openai` o
`telegram_mode=live-frontier` en la Aceptación del Paquete. El flujo de trabajo pasa el
tarball `package-under-test` resuelto al carril de Telegram; el flujo de trabajo
independiente de Telegram todavía acepta una especificación npm publicada para
verificaciones posteriores a la publicación.

## Entradas del flujo de trabajo de NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida como `v2026.4.2`, `v2026.4.2-1`, o
  `v2026.4.2-beta.1`; cuando `preflight_only=true`, también puede ser el SHA
  de confirmación de 40 caracteres completo de la rama del flujo de trabajo actual
  para un preflight de solo validación
- `preflight_only`: `true` solo para validación/construcción/empaquetado, `false` para
  la ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo
  reutilice el tarball preparado de la ejecución preflight exitosa
- `npm_dist_tag`: etiqueta de destino de npm para la ruta de publicación; por defecto es `beta`

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: rama, etiqueta o SHA de confirmación completo para validar. Las verificaciones
  que portan secretos requieren que la confirmación resuelta sea accesible desde una rama
  de OpenClaw o una etiqueta de lanzamiento.

Reglas:

- Las etiquetas estables y de corrección pueden publicarse tanto en `beta` como en `latest`
- Las etiquetas de prelanzamiento beta solo pueden publicarse en `beta`
- Para `OpenClaw NPM Release`, la entrada de SHA de confirmación completo solo se permite cuando
  `preflight_only=true`
- `OpenClaw Release Checks` y `Full Release Validation` son siempre
  de solo validación
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante el preflight;
  el flujo de trabajo verifica esos metadatos antes de que continúe la publicación

## Secuencia de lanzamiento estable de npm

Al crear un lanzamiento estable de npm:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de confirmación completo de la rama de flujo de trabajo actual para una ejecución de prueba solo de validación del flujo de trabajo de preflight
2. Elija `npm_dist_tag=beta` para el flujo normal de beta primero, o `latest` solo cuando intencionalmente desee una publicación estable directa
3. Ejecute `Full Release Validation` en la rama de lanzamiento, la etiqueta de lanzamiento o el SHA de confirmación completo cuando desee CI normal más caché de avisos en vivo, Docker, QA Lab, Matrix y cobertura de Telegram desde un flujo de trabajo manual
4. Si intencionalmente solo necesita el gráfico de pruebas normal determinista, ejecute el flujo de trabajo manual `CI` en la referencia de lanzamiento en su lugar
5. Guarde el `preflight_run_id` exitoso
6. Ejecute `OpenClaw NPM Release` nuevamente con `preflight_only=false`, el mismo `tag`, el mismo `npm_dist_tag` y el `preflight_run_id` guardado
7. Si el lanzamiento aterrizó en `beta`, use el flujo de trabajo privado `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` para promocionar esa versión estable de `beta` a `latest`
8. Si el lanzamiento se publicó intencionalmente directamente en `latest` y `beta` debe seguir la misma compilación estable inmediatamente, use ese mismo flujo de trabajo privado para apuntar ambas dist-tags a la versión estable, o deje que su sincronización de auto-sanitación programada mueva `beta` más tarde

La mutación de dist-tag vive en el repositorio privado por seguridad porque todavía requiere `NPM_TOKEN`, mientras que el repositorio público mantiene la publicación solo OIDC.

Eso mantiene tanto la ruta de publicación directa como la ruta de promoción beta primero documentadas y visibles para el operador.

Si un mantenedor debe volver a la autenticación npm local, ejecute cualquier comando de la CLI de 1Password (`op`) solo dentro de una sesión tmux dedicada. No llame a `op` directamente desde el shell del agente principal; mantenerlo dentro de tmux hace que las solicitudes, alertas y el manejo de OTP sean observables y evita alertas de host repetidas.

## Referencias públicas

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Los mantenedores utilizan la documentación privada de lanzamientos en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de ejecución real.

## Relacionado

- [Canales de lanzamiento](/es/install/development-channels)
