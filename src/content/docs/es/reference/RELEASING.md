---
summary: "Canales de lanzamiento, lista de verificación del operador, casillas de validación, nomenclatura de versiones y cadencia"
title: "Política de lanzamiento"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw tiene tres canales públicos de lanzamiento:

- stable: lanzamientos etiquetados que se publican en npm `beta` de manera predeterminada, o en npm `latest` cuando se solicita explícitamente
- beta: etiquetas de prelanzamiento que se publican en npm `beta`
- dev: la cabecera móvil de `main`

## Nomenclatura de versiones

- Versión de lanzamiento estable: `YYYY.M.D`
  - Etiqueta de Git: `vYYYY.M.D`
- Versión de lanzamiento de corrección estable: `YYYY.M.D-N`
  - Etiqueta de Git: `vYYYY.M.D-N`
- Versión de prelanzamiento beta: `YYYY.M.D-beta.N`
  - Etiqueta de Git: `vYYYY.M.D-beta.N`
- No rellene con ceros el mes o el día
- `latest` significa el lanzamiento estable de npm promovido actual
- `beta` significa el objetivo de instalación beta actual
- Los lanzamientos estables y de corrección estable se publican en npm `beta` de manera predeterminada; los operadores de lanzamiento pueden apuntar a `latest` explícitamente, o promover una compilación beta verificada más tarde
- Cada lanzamiento estable de OpenClaw envía el paquete npm y la aplicación de macOS juntos;
  los lanzamientos beta normalmente validan y publican la ruta del paquete/npm primero,
  reservando la compilación/firma/notarización de la aplicación mac para la versión estable a menos que se solicite explícitamente

## Cadencia de lanzamientos

- Los lanzamientos se mueven primero a beta
- La versión estable sigue solo después de que se valida la última beta
- Los mantenedores normalmente generan lanzamientos desde una rama `release/YYYY.M.D` creada
  a partir del `main` actual, de modo que la validación del lanzamiento y las correcciones no bloqueen el nuevo
  desarrollo en `main`
- Si se ha enviado o publicado una etiqueta beta y necesita una corrección, los mantenedores generan
  la siguiente etiqueta `-beta.N` en lugar de eliminar o recrear la etiqueta beta anterior
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  exclusivos para los mantenedores

## Lista de verificación del operador de lanzamiento

Esta lista de verificación es la forma pública del flujo de lanzamiento. Las credenciales privadas,
la firma, la notarización, la recuperación de dist-tags y los detalles de reversión de emergencia se mantienen en
el manual de ejecución de lanzamiento solo para mantenedores.

1. Comenzar desde el `main` actual: extraer lo último, confirmar que el commit de destino se ha enviado,
   y confirmar que el CI actual de `main` está lo suficientemente verde como para crear una rama a partir de él.
2. Reescribir la sección superior `CHANGELOG.md` a partir del historial de commits reales con
   `/changelog`, mantener las entradas orientadas al usuario, confirmarlo, enviarlo y hacer rebase/pull
   una vez más antes de crear la rama.
3. Revisar los registros de compatibilidad de lanzamientos en
   `src/plugins/compat/registry.ts` y
   `src/commands/doctor/shared/deprecation-compat.ts`. Eliminar la compatibilidad
   caducada solo cuando la ruta de actualización siga cubierta, o registrar por qué se
   mantiene intencionalmente.
4. Crear `release/YYYY.M.D` desde el `main` actual; no realizar el trabajo de lanzamiento normal
   directamente en `main`.
5. Incrementar cada ubicación de versión requerida para la etiqueta deseada y luego ejecutar
   `pnpm release:prep`. Actualiza las versiones de los complementos, el inventario de complementos, el esquema
   de configuración, los metadatos de configuración de canal incluidos, la línea base de la documentación de configuración, las exportaciones
   del SDK de complementos y la línea base de la API del SDK de complementos en el orden correcto. Confirmar cualquier desviación
   generada antes de etiquetar. Luego ejecutar la verificación previa determinista local:
   `pnpm check:test-types`, `pnpm check:architecture`,
   `pnpm build && pnpm ui:build` y `pnpm release:check`.
6. Ejecutar `OpenClaw NPM Release` con `preflight_only=true`. Antes de que exista una etiqueta,
   se permite un SHA de rama de lanzamiento completo de 40 caracteres para la verificación previa
   solo de validación. Guardar el `preflight_run_id` exitoso.
7. Iniciar todas las pruebas previas al lanzamiento con `Full Release Validation` para la
   rama de lanzamiento, la etiqueta o el SHA de confirmación completo. Este es el único punto de entrada manual
   para los cuatro grandes conjuntos de pruebas de lanzamiento: Vitest, Docker, QA Lab y Package.
8. Si la validación falla, solucionar en la rama de lanzamiento y volver a ejecutar el archivo fallido más pequeño,
   carril, trabajo de flujo de trabajo, perfil de paquete, proveedor, o lista blanca de modelo que
   demuestre la solución. Volver a ejecutar el paraguas completo solo cuando la superficie modificada haga
   que la evidencia previa quede obsoleta.
9. Para beta, etiqueta `vYYYY.M.D-beta.N`, luego ejecuta `OpenClaw Release Publish` desde
   la rama `release/YYYY.M.D` coincidente. Verifica `pnpm plugins:sync:check`,
   envía todos los paquetes de complementos publicables a npm y el mismo conjunto a
   ClawHub en paralelo, y luego promociona el artefacto de preflight de OpenClaw npm
   preparado con la etiqueta de distribución coincidente tan pronto como la publicación del complemento en npm tenga éxito.
   Después de que el proceso secundario de publicación de OpenClaw npm tenga éxito, crea o actualiza la
   página de lanzamiento/prerelease coincidente de GitHub desde la sección `CHANGELOG.md`
   completa coincidente. Los lanzamientos estables publicados en npm `latest` se convierten en el
   último lanzamiento de GitHub; los lanzamientos de mantenimiento estables mantenidos en npm `beta` se
   crean con GitHub `latest=false`.
   La publicación en ClawHub aún puede estar ejecutándose mientras se publican en OpenClaw npm, pero el
   flujo de trabajo de publicación de lanzamiento imprime los IDs de ejecución secundarios inmediatamente. De forma predeterminada,
   no espera a ClawHub después de enviarlo, por lo que la disponibilidad de OpenClaw npm
   no está bloqueada por aprobaciones o trabajo de registro más lentos de ClawHub; establece
   `wait_for_clawhub=true` cuando ClawHub debe bloquear la finalización del flujo de trabajo. La ruta
   de ClawHub reintentar fallas transitorias de instalación de dependencias de CLI, publica
   complementos que pasan la vista previa incluso cuando una celda de vista previa falla, y termina con
   verificación de registro para cada versión de complemento esperada para que las publicaciones parciales
   permanezcan visibles y reintentables. Después de publicar, ejecuta
   `pnpm release:verify-beta -- YYYY.M.D-beta.N --openclaw-npm-run <run-id> --plugin-npm-run <run-id> --plugin-clawhub-run <run-id>`
   para verificar la prerelease de GitHub, las etiquetas de distribución npm `beta`,
   la integridad de npm, la ruta de instalación publicada, las versiones exactas de ClawHub, los artefactos de ClawHub y las conclusiones
   del flujo de trabajo secundario desde un solo comando. Agrega `--rerun-failed-clawhub` cuando el
   sidecar de ClawHub falló solo en trabajos reintentables y debe volver a ejecutarse en su lugar.
   Luego ejecuta la aceptación del paquete posterior a la publicación contra el paquete
   `openclaw@YYYY.M.D-beta.N` o
   `openclaw@beta` publicado. Si una prerelease enviada o publicada necesita una corrección,
   corta el siguiente número de prerelease coincidente; no elimines ni reescribas la antigua
   prerelease.
10. Para la versión estable, continúe solo después de que la beta verificada o la candidata a lanzamiento tenga la evidencia de validación requerida. La publicación estable en npm también pasa por `OpenClaw Release Publish`, reutilizando el artefacto de preflight exitoso a través de `preflight_run_id`; la preparación del lanzamiento estable de macOS también requiere el `.zip`, `.dmg`, `.dSYM.zip` empaquetados y `appcast.xml` actualizados en `main`. El flujo de trabajo de publicación privada de macOS publica la appcast firmada en `main` público automáticamente después de que se verifiquen los activos del lanzamiento; si la protección de la rama bloquea el envío directo, abre o actualiza un PR de appcast.
11. Después de la publicación, ejecute el verificador post-publicación de npm, el Telegram E2E independiente publicado-npm opcional
    cuando necesite pruebas del canal post-publicación,
    promoción de dist-tag cuando sea necesario, verifique la página de lanzamiento generada en GitHub,
    y ejecute los pasos del anuncio del lanzamiento.

## Prelanzamiento de la versión

- Ejecute `pnpm check:test-types` antes del preflight del lanzamiento para que TypeScript de prueba permanezca cubierto fuera del portillo `pnpm check` local más rápido
- Ejecute `pnpm check:architecture` antes del preflight del lanzamiento para que los controles más amplios del ciclo de importación y los límites de la arquitectura estén en verde fuera del portillo local
- Ejecute `pnpm build && pnpm ui:build` antes de `pnpm release:check` para que existan los artefactos de lanzamiento `dist/*` esperados y el paquete de Control UI para el paso de validación del paquete
- Ejecute `pnpm release:prep` después del incremento de la versión raíz y antes del etiquetado. Ejecuta cada generador de lanzamiento determinista que comúnmente se desvía después de un cambio de versión/configuración/API: versiones de complementos, inventario de complementos, esquema de configuración base, metadatos de configuración de canal incluido, línea base de documentos de configuración, exportaciones del SDK de complementos y línea base de la API del SDK de complementos. `pnpm release:check` vuelve a ejecutar esos guardias en modo de verificación e informa cada falla de desviación generada que encuentra en una sola pasada antes de ejecutar las comprobaciones de lanzamiento del paquete.
- Ejecute el flujo de trabajo manual `Full Release Validation` antes de la aprobación de la versión para iniciar todos los cuadros de prueba previos al lanzamiento desde un único punto de entrada. Acepta una rama, etiqueta o SHA de confirmación completo, despacha manualmente `CI` y despacha `OpenClaw Release Checks` para pruebas de humo de instalación, aceptación de paquetes, verificaciones de paquetes multi-SO, paridad de QA Lab, Matrix y carriles de Telegram. Las ejecuciones estables/predeterminadas mantienen pruebas exhaustivas en vivo/E2E y de inmersión de ruta de lanzamiento de Docker detrás de `run_release_soak=true`; `release_profile=full` fuerza la activación de la inmersión. Con `release_profile=full` y `rerun_group=all`, también ejecuta Telegram E2E del paquete contra el artefacto `release-package-under-test` de las verificaciones de lanzamiento. Proporcione `release_package_spec` después de publicar una beta para reutilizar el paquete npm enviado en las verificaciones de lanzamiento, Aceptación de Paquetes y Telegram E2E del paquete sin reconstruir el archivo de lanzamiento. Proporcione `npm_telegram_package_spec` solo cuando Telegram deba usar un paquete publicado diferente del resto de la validación de lanzamiento. Proporcione `package_acceptance_package_spec` cuando la Aceptación de Paquetes deba usar un paquete publicado diferente de la especificación del paquete de lanzamiento. Proporcione `evidence_package_spec` cuando el informe de evidencia privada deba probar que la validación coincide con un paquete npm publicado sin forzar Telegram E2E. Ejemplo: `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Ejecute el flujo de trabajo manual `Package Acceptance` cuando desee una prueba por canal lateral
  para un candidato a paquete mientras continúa el trabajo de lanzamiento. Use `source=npm` para
  `openclaw@beta`, `openclaw@latest` o una versión de lanzamiento exacta; `source=ref`
  para empaquetar una rama/etiqueta/SHA `package_ref` de confianza con el arnés
  `workflow_ref` actual; `source=url` para un tarball HTTPS con un
  SHA-256 requerido; o `source=artifact` para un tarball cargado por otra ejecución de
  GitHub Actions. El flujo de trabajo resuelve el candidato a
  `package-under-test`, reutiliza el programador de lanzamiento Docker E2E contra ese
  tarball y puede ejecutar Telegram QA contra el mismo tarball con
  `telegram_mode=mock-openai` o `telegram_mode=live-frontier`. Cuando los
  carriles de Docker seleccionados incluyen `published-upgrade-survivor`, el artefacto
  del paquete es el candidato y `published_upgrade_survivor_baseline` selecciona
  la línea base publicada. `update-restart-auth` usa el paquete candidato como
  la CLI instalada y el paquete en prueba, por lo que ejerce la ruta de
  reinicio administrado del comando de actualización del candidato.
  Ejemplo: `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Perfiles comunes:
  - `smoke`: carriles de install/channel/agent, red de puerta de enlace y recarga de configuración
  - `package`: carriles nativos de artefacto para package/update/restart/plugin sin OpenWebUI o ClawHub en vivo
  - `product`: perfil de paquete más canales MCP, limpieza de cron/subagente,
    búsqueda web de OpenAI y OpenWebUI
  - `full`: fragmentos de ruta de lanzamiento de Docker con OpenWebUI
  - `custom`: selección exacta de `docker_lanes` para una nueva ejecución enfocada
- Ejecute el flujo de trabajo manual `CI` directamente cuando solo necesite una cobertura CI normal y completa para el candidato de lanzamiento. Los despachos manuales de CI omiten el alcance de cambios y fuerzan los fragmentos de Linux Node, fragmentos de bundled-plugin, contratos de canal, compatibilidad con Node 22, `check`, `check-additional`, pruebas de humo de compilación, comprobaciones de documentos, habilidades de Python, Windows, macOS, Android y carriles i18n de Control UI.
  Ejemplo: `gh workflow run ci.yml --ref release/YYYY.M.D`
- Ejecute `pnpm qa:otel:smoke` al validar la telemetría de lanzamiento. Ejercita el QA-lab a través de un receptor OTLP/HTTP local y verifica los nombres de los intervalos de rastreo exportados, los atributos delimitados y la redacción de contenido/identificador sin requerir Opik, Langfuse u otro recopilador externo.
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- Ejecute `OpenClaw Release Publish` para la secuencia de publicación mutable después de que exista la etiqueta. Despáchelo desde `release/YYYY.M.D` (o `main` al publicar una etiqueta accesible desde main), pase la etiqueta de lanzamiento y una ejecución exitosa de OpenClaw npm `preflight_run_id`, y mantenga el alcance de publicación del complemento predeterminado `all-publishable` a menos que esté ejecutando deliberadamente una reparación enfocada. El flujo de trabajo serializa la publicación npm del complemento, la publicación de ClawHub del complemento y la publicación npm de OpenClaw para que el paquete principal no se publique antes que sus complementos externalizados.
- Las comprobaciones de lanzamiento ahora se ejecutan en un flujo de trabajo manual separado:
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` también ejecuta el carril de paridad simulada del QA Lab además del perfil Matrix en vivo rápido y el carril QA de Telegram antes de la aprobación del lanzamiento. Los carriles en vivo utilizan el entorno `qa-live-shared`; Telegram también utiliza arrendamientos de credenciales CI de Convex. Ejecute el flujo de trabajo manual `QA-Lab - All Lanes` con `matrix_profile=all` y `matrix_shards=true` cuando desee el inventario completo de transporte, medios y E2EE de Matrix en paralelo.
- La validación de tiempo de ejecución de instalación y actualización entre sistemas operativos es parte de `OpenClaw Release Checks` y `Full Release Validation` públicos, que llaman al flujo de trabajo reutilizable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directamente
- Esta división es intencional: mantener la ruta de lanzamiento real de npm corta,
  determinista y centrada en artefactos, mientras que las verificaciones en vivo más lentas permanecen en su
  propio carril para no retrasar ni bloquear la publicación
- Las comprobaciones de versión que portan secretos deben ser enviadas a través de la referencia del flujo de trabajo `Full Release
Validation` or from the `main`/release para que la lógica del flujo de trabajo y
  los secretos se mantengan controlados
- `OpenClaw Release Checks` acepta una rama, etiqueta o SHA de confirmación completo siempre
  y cuando la confirmación resuelta sea alcanzable desde una rama de OpenClaw o una etiqueta de versión
- El preflight de solo validación `OpenClaw NPM Release` también acepta el
  SHA de confirmación de rama de flujo de trabajo actual completo de 40 caracteres sin requerir una etiqueta enviada
- Esa ruta SHA es solo de validación y no se puede promocionar a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la
  verificación de metadatos del paquete; la publicación real aún requiere una etiqueta de versión real
- Ambos flujos de trabajo mantienen la ruta de publicación y promoción real en ejecutores
  alojados en GitHub, mientras que la ruta de validación no mutante puede usar los ejecutores
  Blacksmith Linux más grandes
- Ese flujo de trabajo ejecuta
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  utilizando ambos secretos de flujo de trabajo `OPENAI_API_KEY` y `ANTHROPIC_API_KEY`
- El preflight de lanzamiento de npm ya no espera en el carril separado de verificaciones de lanzamiento
- Antes de etiquetar localmente un candidato de versión, ejecute
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. El asistente
  ejecuta los guardias rápidos de versión, las comprobaciones de versión de complementos npm/ClawHub, la compilación,
  la compilación de UI y `release:openclaw:npm:check` en el orden que detecta errores comunes
  que bloquean la aprobación antes de que inicie el flujo de trabajo de publicación en GitHub.
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección coincidente) antes de la aprobación
- Después de la publicación en npm, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección coincidente) para verificar la ruta de instalación
  del registro publicado en un prefijo temporal nuevo
- Después de una publicación beta, ejecute `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  para verificar el inicio rápido del paquete instalado, la configuración de Telegram y el E2E real de Telegram
  contra el paquete npm publicado utilizando el grupo compartido de credenciales de Telegram arrendadas.
  Las pruebas puntuales de los mantenedores locales pueden omitir las variables de Convex y pasar las tres
  credenciales de entorno `OPENCLAW_QA_TELEGRAM_*` directamente.
- Para ejecutar la prueba completa posterior a la publicación de beta desde una máquina de mantenedor, use `pnpm release:beta-smoke -- --beta betaN`. El asistente ejecuta la validación de actualización de npm/destino nuevo de Parallels, envía `NPM Telegram Beta E2E`, sondea la ejecución exacta del flujo de trabajo, descarga el artefacto e imprime el informe de Telegram.
- Los mantenedores pueden ejecutar la misma comprobación posterior a la publicación desde GitHub Actions mediante el
  flujo de trabajo manual `NPM Telegram Beta E2E`. Es intencionalmente solo manual y
  no se ejecuta en cada fusión.
- La automatización de versiones del mantenedor ahora utiliza preflight-then-promote:
  - la publicación real en npm debe pasar un npm `preflight_run_id` exitoso
  - la publicación real en npm debe ser despachada desde la misma rama `main` o
    `release/YYYY.M.D` que la ejecución preflight exitosa
  - las versiones estables de npm por defecto son `beta`
  - la publicación estable en npm puede apuntar explícitamente a `latest` mediante la entrada del flujo de trabajo
  - la mutación de dist-tags de npm basada en tokens ahora reside en
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    por seguridad, porque `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras el
    repositorio público mantiene publicación solo OIDC
  - `macOS Release` público es solo de validación; cuando una etiqueta vive solo en una
    rama de lanzamiento pero el flujo de trabajo se despacha desde `main`, establezca
    `public_release_branch=release/YYYY.M.D`
  - la publicación real privada para mac debe pasar una comprobación privada exitosa para mac
    `preflight_run_id` y `validate_run_id`
  - las rutas de publicación reales promocionan los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para versiones de corrección estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de la versión no dejen silenciosamente instalaciones globales antiguas en el
  contenido estable base
- el preflight de lanzamiento de npm falla de forma segura a menos que el paquete incluya ambos
  `dist/control-ui/index.html` y un contenido `dist/control-ui/assets/` no vacío
  para no volver a enviar un panel de navegador vacío
- La verificación posterior a la publicación también comprueba que los puntos de entrada de los complementos publicados y
  los metadatos del paquete están presentes en el diseño del registro instalado. Una versión que
  envía contenidos de tiempo de ejecución de complementos faltantes falla el verificador postpublish y
  no puede ser promovida a `latest`.
- `pnpm test:install:smoke` también aplica el presupuesto `unpackedSize` de npm pack en
  el paquete de actualización candidata, por lo que el instalador e2e detecta el hinchamiento accidental del paquete
  antes de la ruta de publicación de la versión
- Si el trabajo de la versión afectó la planificación de CI, los manifiestos de sincronización de extensiones o las matrices de prueba de extensiones, regenere y revise las salidas de la matriz `plugin-prerelease-extension-shard` propiedad del planificador desde `.github/workflows/plugin-prerelease.yml` antes de la aprobación para que las notas de la versión no describan un diseño de CI obsoleto
- La preparación para la versión estable de macOS también incluye las superficies del actualizador:
  - la versión en GitHub debe terminar con los `.zip`, `.dmg` y `.dSYM.zip` empaquetados
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación; el flujo de trabajo privado de publicación de macOS lo confirma automáticamente o abre un PR de appcast cuando el envío directo está bloqueado
  - la aplicación empaquetada debe mantener un id de bundle que no sea de depuración, una URL de feed Sparkle no vacía y un `CFBundleVersion` en o por encima del límite de compilación canónico de Sparkle para esa versión

## Casos de prueba de lanzamiento

`Full Release Validation` es como los operadores inician todas las pruebas de previo lanzamiento desde un solo punto de entrada. Para una prueba de confirmación fijada en una rama de rápido movimiento, use el asistente para que cada flujo de trabajo secundario se ejecute desde una rama temporal fijada en el SHA de destino:

```bash
pnpm ci:full-release --sha <full-sha>
```

El asistente envía `release-ci/<sha>-...`, despacha `Full Release Validation` desde esa rama con `ref=<sha>`, verifica que cada `headSha` del flujo de trabajo secundario coincida con el objetivo y luego elimina la rama temporal. Esto evita validar por accidente una ejecución secundaria `main` más reciente.

Para la validación de rama o etiqueta de lanzamiento, ejecútelo desde la referencia de flujo de trabajo confiable `main` y pase la rama o etiqueta de lanzamiento como `ref`:

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

El flujo de trabajo resuelve la referencia de destino, despacha manual `CI` con
`target_ref=<release-ref>`, despacha `OpenClaw Release Checks`, prepara un
artefacto `release-package-under-test` principal para verificaciones orientadas al paquete y
despacha el E2E de Telegram de paquete independiente cuando `release_profile=full` con
`rerun_group=all` o cuando `release_package_spec` o
`npm_telegram_package_spec` está configurado. `OpenClaw Release
Checks` luego distribuye pruebas de humo de instalación, verificaciones de lanzamiento multi-OS, cobertura de ruta de lanzamiento Docker en vivo/E2E cuando soak está habilitado, Aceptación de Paquete con QA de paquete Telegram, paridad de QA Lab, Matrix en vivo y Telegram en vivo. Una ejecución completa solo es aceptable cuando el
resumen `Full Release Validation`
muestra `normal_ci` y `release_checks` como exitosos. En modo completo/all,
el hijo `npm_telegram` también debe ser exitoso; fuera de completo/all se omite
a menos que se haya proporcionado un `release_package_spec` o `npm_telegram_package_spec` publicado
. El resumen final
del verificador incluye tablas de trabajos más lentos para cada ejecución secundaria, para que el gerente
de lanzamiento pueda ver la ruta crítica actual sin descargar registros.
Vea [Validación completa de lanzamiento](/es/reference/full-release-validation) para la
matriz de etapas completa, nombres exactos de trabajos de flujo de trabajo, diferencias de perfil estable versus completo,
artefactos y manejadores de reejecución enfocados.
Los flujos de trabajo secundarios se despachan desde la referencia de confianza que ejecuta `Full Release
Validation`, normally `--ref main`, even when the target `ref` apunta a una
rama o etiqueta de lanzamiento anterior. No hay una entrada de referencia de flujo de trabajo (workflow-ref) separada para Validación Completa de Lanzamiento;
elija el arnés de confianza eligiendo la referencia de ejecución del flujo de trabajo.
No use `--ref main -f ref=<sha>` para prueba de confirmación exacta en `main` en movimiento;
los SHA de confirmación sin procesar no pueden ser referencias de despacho de flujo de trabajo, así que use
`pnpm ci:full-release --sha <sha>` para crear la rama temporal fijada.

Use `release_profile` para seleccionar la amplitud en vivo/proveedor:

- `minimum`: ruta más rápida de OpenAI/core en vivo y Docker crítica para el lanzamiento
- `stable`: mínimo más cobertura de proveedor/backend estable para la aprobación de la versión
- `full`: estable más amplia cobertura de proveedor/medios consultivos

Use `run_release_soak=true` con `stable` cuando los carriles que bloquean la versión estén en verde y desee el barrido exhaustivo en vivo/E2E, la ruta de lanzamiento de Docker y el barrido acotado de supervivencia de actualización publicada antes de la promoción. Ese barrido cubre los cuatro últimos paquetes estables más las líneas base fijas `2026.4.23` y `2026.5.2` más la cobertura `2026.4.15` más antigua, con las líneas base duplicadas eliminadas y cada línea base fragmentada en su propio trabajo de ejecución de Docker. `full` implica `run_release_soak=true`.

`OpenClaw Release Checks` usa la referencia de flujo de trabajo de confianza para resolver la referencia de destino una vez como `release-package-under-test` y reutiliza ese artefacto en verificaciones multi-OS, Aceptación de Paquetes y ruta de lanzamiento de Docker durante las ejecuciones de soak. Esto mantiene todas las cajas orientadas a paquetes en los mismos bytes y evita compilaciones de paquetes repetidas. Después de que una beta ya esté en npm, configure `release_package_spec=openclaw@YYYY.M.D-beta.N` para que las verificaciones de lanzamiento descarguen el paquete enviado una vez, extraigan su SHA de fuente de compilación de `dist/build-info.json` y reutilicen ese artefacto para carriles multi-OS, Aceptación de Paquetes, ruta de lanzamiento de Docker y Telegram del paquete. La prueba de instalación de OpenAI multi-OS usa `OPENCLAW_CROSS_OS_OPENAI_MODEL` cuando la variable repo/org está configurada, de lo contrario `openai/gpt-5.4`, porque este carril está probando la instalación del paquete, el onboarding, el inicio de la puerta de enlace y un turno de agente en vivo en lugar de evaluar el rendimiento del modelo predeterminado más lento. La matriz más amplia de proveedores en vivo sigue siendo el lugar para la cobertura específica del modelo.

Use estas variantes dependiendo de la etapa de lanzamiento:

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable

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
  -f release_profile=full \
  -f release_package_spec=openclaw@YYYY.M.D-beta.N \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

No uses el paraguas completo como la primera reejecución después de una corrección enfocada. Si un cuadro falla, usa el flujo de trabajo secundario, trabajo, carril Docker, perfil de paquete, proveedor de modelos o carril de QA fallado para la siguiente prueba. Vuelve a ejecutar el paraguas completo solo cuando la corrección cambió la orquestación de lanzamiento compartida o hizo que las evidencias anteriores de todos los cuadros quedaran obsoletas. El verificador final del paraguas vuelve a verificar los ids de ejecución del flujo de trabajo secundario registrados, por lo que después de que un flujo de trabajo secundario se vuelve a ejecutar con éxito, vuelve a ejecutar solo el trabajo `Verify full validation` padre fallido.

Para una recuperación acotada, pasa `rerun_group` al paraguas. `all` es la ejecución real de candidato a lanzamiento, `ci` ejecuta solo el hijo de CI normal, `plugin-prerelease` ejecuta solo el hijo del complemento solo de lanzamiento, `release-checks` ejecuta cada cuadro de lanzamiento, y los grupos de lanzamiento más estrechos son `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, y `npm-telegram`. Las reejecuciones enfocadas de `npm-telegram` requieren `release_package_spec` o `npm_telegram_package_spec`; las ejecuciones completas/de todo con `release_profile=full` usan el artefacto del paquete release-checks. Las reejecuciones enfocadas entre sistemas operativos pueden agregar `cross_os_suite_filter=windows/packaged-upgrade` u otro filtro de sistema operativo/conjunto. Los fallos de release-check de QA son consultivos; un fallo solo de QA no bloquea la validación del lanzamiento.

### Vitest

El cuadro Vitest es el flujo de trabajo secundario `CI` manual. El CI manual omite intencionalmente el alcance de cambios y fuerza el gráfico de pruebas normal para el candidato a lanzamiento: fragmentos de Node en Linux, fragmentos de complementos empaquetados, contratos de canal, compatibilidad con Node 22, `check`, `check-additional`, pruebas de humo de compilación, comprobaciones de documentos, habilidades de Python, Windows, macOS, Android e i18n de la interfaz de usuario de Control.

Usa este cuadro para responder "¿el árbol de fuentes pasó la suite de pruebas normal completa?"
No es lo mismo que la validación del producto de la ruta de lanzamiento. Evidencia a conservar:

- Resumen de `Full Release Validation` que muestra la URL de ejecución `CI` despachada
- `CI` se ejecutan correctamente (en verde) en el SHA objetivo exacto
- nombres de fragmentos (shards) fallidos o lentos de los trabajos de CI al investigar regresiones
- Artefactos de sincronización de Vitest, como `.artifacts/vitest-shard-timings.json`, cuando
  una ejecución necesita análisis de rendimiento

Ejecute el CI manual directamente solo cuando la versión necesita un CI normal determinista pero
no los entornos de Docker, QA Lab, en vivo, multi-OS o de paquetes:

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

El entorno de Docker reside en `OpenClaw Release Checks` a través de
`openclaw-live-and-e2e-checks-reusable.yml`, además del flujo de trabajo de
`install-smoke` en modo de lanzamiento. Valida el candidato de lanzamiento a través de entornos
Docker empaquetados en lugar de solo pruebas a nivel de código fuente.

La cobertura de Docker de lanzamiento incluye:

- prueba de humo de instalación completa con la prueba de humo de instalación global lenta de Bun habilitada
- preparación/reutilización de la imagen de prueba de humo del Dockerfile raíz por SHA objetivo, con trabajos de prueba de humo de QR,
  root/gateway e installer/Bun ejecutándose como fragmentos de prueba de instalación
  separados
- carriles E2E del repositorio
- fragmentos de Docker de ruta de lanzamiento: `core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g` y `plugins-runtime-install-h`
- cobertura de OpenWebUI dentro del fragmento `plugins-runtime-services` cuando se solicita
- carriles divididos de instalación/desinstalación de complementos empaquetados
  `bundled-plugin-install-uninstall-0` a través de
  `bundled-plugin-install-uninstall-23`
- suites de proveedores en vivo/E2E y cobertura de modelos en vivo de Docker cuando las comprobaciones de lanzamiento
  incluyen suites en vivo

Use los artefactos de Docker antes de volver a ejecutar. El programador de rutas de lanzamiento carga
`.artifacts/docker-tests/` con registros de carril, `summary.json`, `failures.json`,
tiempos de fase, plan del programador JSON y comandos de reejecución. Para una recuperación enfocada,
use `docker_lanes=<lane[,lane]>` en el flujo de trabajo live/E2E reutilizable en lugar de
volver a ejecutar todos los fragmentos de lanzamiento. Los comandos de reejecución generados incluyen entradas `package_artifact_run_id` previas e imágenes de Docker preparadas cuando están disponibles, por lo que un
carril fallido puede reutilizar el mismo tarball e imágenes GHCR.

### Laboratorio de QA

La caja del Laboratorio de QA también es parte de `OpenClaw Release Checks`. Es la puerta de lanzamiento
de comportamiento agéntico y a nivel de canal, separada de la mecánica de empaquetado
de Vitest y Docker.

La cobertura del Laboratorio de QA de lanzamiento incluye:

- carril de paridad simulada (mock parity lane) que compara el carril candidato de OpenAI con la línea base
  de Opus 4.6 usando el paquete de paridad agéntica
- perfil rápido de QA de Matrix en vivo usando el entorno `qa-live-shared`
- carril de QA de Telegram en vivo usando arrendamientos de credenciales de Convex CI
- `pnpm qa:otel:smoke` cuando la telemetría de lanzamiento necesita una prueba local explícita

Use esta caja para responder "¿el lanzamiento se comporta correctamente en escenarios de QA y
flujos de canales en vivo?" Conserve las URL de los artefactos para los carriles de paridad, Matrix y Telegram
al aprobar el lanzamiento. La cobertura completa de Matrix sigue disponible como una
ejecución manual y fragmentada del QA-Lab en lugar del carril crítico para el lanzamiento predeterminado.

### Paquete

La caja Paquete es la puerta del producto instalable. Está respaldada por
`Package Acceptance` y el resolvedor
`scripts/resolve-openclaw-package-candidate.mjs`. El resolvedor normaliza un
candidato en el tarball `package-under-test` consumido por Docker E2E, valida
el inventario del paquete, registra la versión del paquete y SHA-256, y mantiene la
referencia del arnés de flujo de trabajo separada de la referencia de origen del paquete.

Fuentes de candidatos admitidas:

- `source=npm`: `openclaw@beta`, `openclaw@latest`, o una versión de lanzamiento
  exacta de OpenClaw
- `source=ref`: empaquetar una rama `package_ref` de confianza, etiqueta o SHA de confirmación
  completa con el arnés `workflow_ref` seleccionado
- `source=url`: descargue un `.tgz` HTTPS con los `package_sha256` requeridos
- `source=artifact`: reutilizar un `.tgz` cargado por otra ejecución de GitHub Actions

`OpenClaw Release Checks` ejecuta Package Acceptance con `source=artifact`, el
artefacto del paquete de lanzamiento preparado, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. Package Acceptance mantiene migración, actualización,
reinicio de actualización de autenticación configurada, instalación de habilidades en vivo de ClawHub, limpieza de dependencias de complementos obsoletos, accesorios de complementos sin conexión,
actualización de complementos y control de calidad de paquetes de Telegram contra el mismo tarball
resuelto. Las comprobaciones de lanzamiento de bloqueo utilizan la línea base del paquete publicado más reciente predeterminada;
`run_release_soak=true` o
`release_profile=full` se expande a cada línea base estable publicada en npm desde
`2026.4.23` hasta `latest` más accesorios de problemas reportados. Use
Package Acceptance con `source=npm` para un candidato ya enviado, o
`source=ref`/`source=artifact` para un tarball npm local respaldado por SHA antes de
publicar. Es el reemplazo nativo de GitHub
para la mayor parte de la cobertura de paquete/actualización que anteriormente requería
Parallels. Las comprobaciones de lanzamiento multi-OS siguen siendo importantes para la incorporación específica del OS,
el instalador y el comportamiento de la plataforma, pero la validación del producto de paquete/actualización debe
preferir Package Acceptance.

La lista de verificación canónica para la validación de actualizaciones y complementos es
[Testing updates and plugins](/es/help/testing-updates-plugins). Úsela al
decidir qué carril local, Docker, Package Acceptance o de comprobación de lanzamiento demuestra un
cambio de instalación/actualización de complemento, limpieza de doctor o migración de paquete publicado.
La migración de actualización publicada exhaustiva desde cada paquete `2026.4.23+` estable es
un flujo de trabajo manual `Update Migration` separado, no parte de Full Release CI.

La indulgencia heredada en la aceptación de paquetes está limitada intencionalmente en tiempo. Los paquetes hasta `2026.4.25` pueden usar la ruta de compatibilidad para lagunas de metadatos ya publicadas en npm: entradas de inventario de QA privadas que faltan en el archivo tar, `gateway install --wrapper` faltantes, archivos de parche faltantes en el accesorio git derivado del archivo tar, `update.channel` persistidos faltantes, ubicaciones heredadas de registros de instalación de complementos, persistencia faltante de registros de instalación del mercado y migración de metadatos de configuración durante `plugins update`. El paquete publicado `2026.4.26` puede advertir sobre los archivos de sello de metadatos de compilación local que ya se han enviado. Los paquetes posteriores deben cumplir con los contratos de paquetes modernos; esas mismas lagunas hacen que falle la validación de la versión.

Use perfiles de Aceptación de Paquetes más amplios cuando la pregunta sobre la versión se trate de un paquete instalable real:

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

Perfiles de paquetes comunes:

- `smoke`: carriles rápidos de instalación/canal/agente de paquetes, red de puerta de enlace y recarga de configuración
- `package`: contratos de paquetes de instalación/actualización/reinicio/complemento más prueba de instalación de habilidades en vivo de ClawHub; este es el valor predeterminado de verificación de versiones
- `product`: `package` además de canales MCP, limpieza de cron/subagente, búsqueda web de OpenAI y OpenWebUI
- `full`: fragmentos de la ruta de publicación de Docker con OpenWebUI
- `custom`: lista exacta de `docker_lanes` para reejecuciones enfocadas

Para la prueba de Telegram de candidatos a paquete, habilite `telegram_mode=mock-openai` o `telegram_mode=live-frontier` en la Aceptación de Paquetes. El flujo de trabajo pasa el archivo tar `package-under-test` resuelto al carril de Telegram; el flujo de trabajo independiente de Telegram todavía acepta una especificación npm publicada para verificaciones posteriores a la publicación.

## Automatización de publicación de versiones

`OpenClaw Release Publish` es el punto de entrada de publicación mutable normal. Orquesta los flujos de trabajo de editor de confianza en el orden que la versión necesita:

1. Extraiga la etiqueta de la versión y resuelva su SHA de confirmación.
2. Verifique que la etiqueta sea accesible desde `main` o `release/*`.
3. Ejecute `pnpm plugins:sync:check`.
4. Despachar `Plugin NPM Release` con `publish_scope=all-publishable` y
   `ref=<release-sha>`.
5. Despachar `Plugin ClawHub Release` con el mismo ámbito y SHA.
6. Despachar `OpenClaw NPM Release` con la etiqueta de lanzamiento, etiqueta de distribución npm y
   `preflight_run_id` guardada.

Ejemplo de publicación beta:

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Publicación estable en la etiqueta de distribución beta predeterminada:

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

La promoción estable directamente a `latest` es explícita:

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

Use los flujos de trabajo de menor nivel `Plugin NPM Release` y `Plugin ClawHub Release`
solo para trabajo de reparación o república enfocado. Para una reparación de complemento seleccionada, pase
`plugin_publish_scope=selected` y `plugins=@openclaw/name` a
`OpenClaw Release Publish`, o despache el flujo de trabajo secundario directamente cuando el
paquete OpenClaw no deba ser publicado.

## Entradas del flujo de trabajo NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida como `v2026.4.2`, `v2026.4.2-1`, o
  `v2026.4.2-beta.1`; cuando `preflight_only=true`, también puede ser el
  SHA de confirmación de 40 caracteres completo de la rama de flujo de trabajo actual para verificación previa de solo validación
- `preflight_only`: `true` para validación/construcción/empaquetado solamente, `false` para la
  ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo reutilice
  el archivo tar preparado de la ejecución de verificación previa exitosa
- `npm_dist_tag`: etiqueta de destino npm para la ruta de publicación; por defecto es `beta`

`OpenClaw Release Publish` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida; ya debe existir
- `preflight_run_id`: id de ejecución de verificación previa `OpenClaw NPM Release` exitosa;
  requerido cuando `publish_openclaw_npm=true`
- `npm_dist_tag`: etiqueta de destino npm para el paquete OpenClaw
- `plugin_publish_scope`: por defecto es `all-publishable`; use `selected` solo
  para trabajo de reparación enfocado
- `plugins`: nombres de paquetes `@openclaw/*` separados por comas cuando
  `plugin_publish_scope=selected`
- `publish_openclaw_npm`: por defecto es `true`; establezca `false` solo cuando use el
  flujo de trabajo como orquestador de reparación solo para complementos
- `wait_for_clawhub`: por defecto es `false` para que la disponibilidad de npm no se bloquee por
  el sidecar ClawHub; establezca `true` solo cuando la finalización del flujo de trabajo deba incluir
  la finalización de ClawHub

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: rama, etiqueta o SHA de confirmación completo para validar. Las comprobaciones que portan secretos
  requieren que la confirmación resuelta sea alcanzable desde una rama OpenClaw o
  una etiqueta de lanzamiento.
- `run_release_soak`: optar por pruebas en vivo/E2E exhaustivas, ruta de lanzamiento de Docker y
  pruebas de resistencia de actualización de todos los supervivientes desde siempre en comprobaciones de lanzamiento estables/predeterminadas. Se fuerza
  activado por `release_profile=full`.

Reglas:

- Las etiquetas estables y de corrección pueden publicarse en `beta` o `latest`
- Las etiquetas de versión preliminar beta solo pueden publicarse en `beta`
- Para `OpenClaw NPM Release`, se permite la entrada de SHA de confirmación completo solo cuando
  `preflight_only=true`
- `OpenClaw Release Checks` y `Full Release Validation` son siempre
  solo de validación
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante el preflight;
  el flujo de trabajo verifica que los metadatos antes de la publicación continúen

## Secuencia de lanzamiento npm estable

Al crear un lanzamiento npm estable:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de confirmación completo de la rama del flujo de trabajo actual
     para una ejecución en seco solo de validación del flujo de trabajo de preflight
2. Elija `npm_dist_tag=beta` para el flujo normal de primero beta, o `latest` solo
   cuando intencionalmente desee una publicación estable directa
3. Ejecute `Full Release Validation` en la rama de lanzamiento, etiqueta de lanzamiento o SHA
   de confirmación completo cuando desee CI normal además de caché de avisos en vivo, Docker, QA Lab,
   Matrix y cobertura de Telegram desde un flujo de trabajo manual
4. Si intencionalmente solo necesita el gráfico de pruebas normal determinista, ejecute el
   flujo de trabajo manual `CI` en la referencia de lanzamiento en su lugar
5. Guarde el `preflight_run_id` exitoso
6. Ejecute `OpenClaw Release Publish` con el mismo `tag`, el mismo `npm_dist_tag`,
   y el `preflight_run_id` guardado; publica los plugins externalizados en npm
   y ClawHub antes de promover el paquete npm de OpenClaw
7. Si el lanzamiento aterrizó en `beta`, use el flujo de trabajo
   privado `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   para promover esa versión estable desde `beta` hasta `latest`
8. Si el lanzamiento se publicó intencionalmente directamente en `latest` y `beta`
   debería seguir la misma compilación estable inmediatamente, use ese mismo flujo de trabajo
   privado para apuntar ambas dist-tags a la versión estable, o deje que su sincronización
   programada de auto-sanación mueva `beta` más tarde

La mutación de dist-tag se encuentra en el repositorio privado por seguridad porque todavía
requiere `NPM_TOKEN`, mientras que el repositorio público mantiene la publicación solo con OIDC.

Eso mantiene tanto la ruta de publicación directa como la ruta de promoción beta-first documentadas
y visibles para el operador.

Si un mantenedor debe recurrir a la autenticación npm local, ejecute cualquier comando
de la CLI de 1Password (`op`) solo dentro de una sesión dedicada de tmux. No llame a `op`
directamente desde el shell principal del agente; mantenerlo dentro de tmux hace que los avisos,
alertas y el manejo de OTP sean observables y evita alertas repetidas del host.

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

Los encargados del mantenimiento utilizan la documentación privada de lanzamiento en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos real.

## Relacionado

- [Canales de lanzamiento](/es/install/development-channels)
