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
6. Ejecute `OpenClaw NPM Release` con `preflight_only=true`. Antes de que exista una etiqueta,
   se permite un SHA de rama de lanzamiento de 40 caracteres completo para la
   verificación previa de solo validación. La verificación previa genera evidencia
   de lanzamiento de dependencias para el gráfico de dependencias desprotegido exacto
   y la almacena en el artefacto de verificación previa de npm. Guarde la `preflight_run_id` exitosa.
7. Iniciar todas las pruebas previas al lanzamiento con `Full Release Validation` para la
   rama de lanzamiento, la etiqueta o el SHA de confirmación completo. Este es el único punto de entrada manual
   para los cuatro grandes conjuntos de pruebas de lanzamiento: Vitest, Docker, QA Lab y Package.
8. Si la validación falla, solucionar en la rama de lanzamiento y volver a ejecutar el archivo fallido más pequeño,
   carril, trabajo de flujo de trabajo, perfil de paquete, proveedor, o lista blanca de modelo que
   demuestre la solución. Volver a ejecutar el paraguas completo solo cuando la superficie modificada haga
   que la evidencia previa quede obsoleta.
9. Para beta, etiquete `vYYYY.M.D-beta.N`, luego ejecute `pnpm release:candidate -- --tag
vYYYY.M.D-beta.N` from the matching `release/YYYY.M.D` rama. El asistente ejecuta
   las comprobaciones de lanzamiento generadas localmente, despacha o verifica la validación completa del lanzamiento y la evidencia del preflight de npm, ejecuta la prueba de paquete Parallels y Telegram, registra los planes de plugin npm y ClawHub, e imprime el comando exacto
   `OpenClaw Release Publish` solo después de que el paquete de evidencia esté en verde.
   `OpenClaw Release Publish` despacha los paquetes de plugins seleccionados o publicables a npm y el mismo conjunto a ClawHub en paralelo, y luego promueve el artefacto de preflight de OpenClaw npm preparado con la etiqueta de distribución coincidente tan pronto como la publicación del plugin npm tenga éxito.
   Después de que el hijo de publicación de OpenClaw npm tenga éxito, crea o actualiza la página de lanzamiento/prerelease correspondiente de GitHub desde la sección
   `CHANGELOG.md` coincidente completa. Los lanzamientos estables publicados en npm `latest` se convierten en el último lanzamiento de GitHub; los lanzamientos de mantenimiento estables mantenidos en npm `beta` se crean con GitHub `latest=false`. El flujo de trabajo también carga la evidencia de dependencia de preflight al lanzamiento de GitHub como
   `openclaw-<version>-dependency-evidence.zip` para la respuesta a incidentes posteriores al lanzamiento. El flujo de trabajo de publicación imprime los IDs de ejecución secundarios inmediatamente, autoaprueba las puertas de entorno de lanzamiento que el token del flujo de trabajo tiene permiso para aprobar, resume los trabajos secundarios fallidos con colas de registro, cierra el lanzamiento de GitHub y la evidencia de dependencia tan pronto como la publicación de OpenClaw npm tiene éxito, espera ClawHub siempre que se esté publicando OpenClaw npm, luego ejecuta `pnpm release:verify-beta` y carga evidencia posterior a la publicación para el lanzamiento de GitHub, el paquete npm, los paquetes de plugin npm seleccionados, los paquetes ClawHub seleccionados, los IDs de ejecución del flujo de trabajo secundario y el ID de ejecución opcional de NPM Telegram. La ruta ClawHub reintentará los fallos de instalación de dependencias CLI transitorios, publicará los plugins que pasan la vista previa incluso si una celda de vista previa falla, y termina con la verificación del registro para cada versión de plugin esperada para que las publicaciones parciales permanezcan visibles y reintentables. Luego ejecute la aceptación del paquete posterior a la publicación contra el paquete publicado
   `openclaw@YYYY.M.D-beta.N` o
   `openclaw@beta`. Si un prerelease enviado o publicado necesita una corrección,
   corte el siguiente número de prerelease coincidente; no elimine ni reescriba el prerelease anterior.
10. Para la versión estable, continúe solo después de que la beta verificada o la versión candidata tenga
    la evidencia de validación requerida. La publicación estable en npm también pasa por
    `OpenClaw Release Publish`, reutilizando el artefacto de preflight exitoso a través de
    `preflight_run_id`; la preparación para el lanzamiento estable de macOS también requiere
    el `.zip` empaquetado, `.dmg`, `.dSYM.zip`, y `appcast.xml` actualizado en `main`.
    El flujo de trabajo privado de publicación de macOS publica el appcast firmado en el público
    `main` automáticamente después de que se verifiquen los activos de lanzamiento; si la protección de ramas bloquea
    el envío directo, abre o actualiza un PR de appcast.
11. Después de la publicación, ejecute el verificador post-publicación de npm, el Telegram E2E independiente publicado-npm opcional
    cuando necesite pruebas del canal post-publicación,
    promoción de dist-tag cuando sea necesario, verifique la página de lanzamiento generada en GitHub,
    y ejecute los pasos del anuncio del lanzamiento.

## Prelanzamiento de la versión

- Ejecute `pnpm check:test-types` antes del preflight de lanzamiento para que el TypeScript de prueba permanezca
  cubierto fuera de la puerta `pnpm check` local más rápida
- Ejecute `pnpm check:architecture` antes del preflight de lanzamiento para que el ciclo de importación
  más amplio y las comprobaciones de límites de arquitectura estén verdes fuera de la puerta local más rápida
- Ejecute `pnpm build && pnpm ui:build` antes de `pnpm release:check` para que los artefactos de lanzamiento
  `dist/*` esperados y el paquete de UI de Control existan para el paso de
  validación del paquete
- Ejecute `pnpm release:prep` después del incremento de la versión raíz y antes del etiquetado. Ejecuta
  cada generador de lanzamiento determinista que comúnmente se desvía después de un
  cambio de versión/configuración/API: versiones de complementos, inventario de complementos, esquema de configuración base,
  metadatos de configuración de canal incluido, línea base de documentación de configuración, exportaciones de SDK de
  complementos y línea base de API de SDK de complementos. `pnpm release:check` vuelve a ejecutar esos
  guardianes en modo de verificación e informa cada falla de desviación generada que encuentra en una
  sola pasada antes de ejecutar las comprobaciones de lanzamiento del paquete.
- Ejecute el flujo de trabajo manual `Full Release Validation` antes de la aprobación de la versión para
  iniciar todos los cuadros de prueba previa al lanzamiento desde un único punto de entrada. Acepta una rama,
  etiqueta o SHA de confirmación completo, despacha manualmente `CI` y despacha
  `OpenClaw Release Checks` para pruebas de humo de instalación, aceptación de paquetes, verificaciones
  de paquetes multi-OS, paridad de QA Lab, Matrix y carriles de Telegram. Las ejecuciones estables/predeterminadas
  mantienen pruebas exhaustivas en vivo/E2E y pruebas de inmersión de ruta de lanzamiento de Docker detrás de
  `run_release_soak=true`; `release_profile=full` fuerza la activación de la inmersión. Con
  `release_profile=full` y `rerun_group=all`, también ejecuta el paquete Telegram
  E2E contra el artefacto `release-package-under-test` de las verificaciones de lanzamiento.
  Proporcione `release_package_spec` después de publicar una beta para reutilizar el
  paquete npm enviado en las verificaciones de lanzamiento, Aceptación de Paquetes y E2E del paquete
  Telegram sin reconstruir el archivo tar de lanzamiento. Proporcione
  `npm_telegram_package_spec` solo cuando Telegram deba usar un paquete
  publicado diferente del resto de la validación de lanzamiento. Proporcione
  `package_acceptance_package_spec` cuando la Aceptación de Paquetes deba usar un
  paquete publicado diferente de la especificación del paquete de lanzamiento. Proporcione
  `evidence_package_spec` cuando el informe de evidencia privada deba demostrar que la
  validación coincide con un paquete npm publicado sin forzar el Telegram E2E.
  Ejemplo:
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Ejecute el flujo de trabajo manual `Package Acceptance` cuando desee una prueba por canal lateral
  para un candidato a paquete mientras continúa el trabajo de lanzamiento. Use `source=npm` para
  `openclaw@beta`, `openclaw@latest`, o una versión de lanzamiento exacta; `source=ref`
  para empaquetar una rama/etiqueta/SHA `package_ref` de confianza con el arnés
  `workflow_ref` actual; `source=url` para un archivo tar HTTPS con un
  SHA-256 requerido; o `source=artifact` para un archivo tar cargado por otra ejecución de
  GitHub Actions. El flujo de trabajo resuelve el candidato a
  `package-under-test`, reutiliza el programador de lanzamiento Docker E2E contra ese
  archivo tar, y puede ejecutar QA de Telegram contra el mismo archivo tar con
  `telegram_mode=mock-openai` o `telegram_mode=live-frontier`. Cuando los carriles
  de Docker seleccionados incluyen `published-upgrade-survivor`, el artefacto
  del paquete es el candidato y `published_upgrade_survivor_baseline` selecciona
  la línea base publicada. `update-restart-auth` usa el paquete candidato como
  la CLI instalada y el paquete en pruebas, por lo que ejerce la ruta de
  reinicio administrado del comando de actualización del candidato.
  Ejemplo: `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Perfiles comunes:
  - `smoke`: carriles de install/channel/agent, red de puerta de enlace y recarga de configuración
  - `package`: carriles package/update/restart/plugin nativos de artefactos sin OpenWebUI o ClawHub en vivo
  - `product`: perfil de paquete más canales MCP, limpieza de cron/subagente,
    búsqueda web de OpenAI y OpenWebUI
  - `full`: fragmentos de ruta de lanzamiento de Docker con OpenWebUI
  - `custom`: selección exacta de `docker_lanes` para una reejecución centrada
- Ejecute el flujo de trabajo `CI` manual directamente cuando solo necesite cobertura completa de CI normal para el candidato de lanzamiento. Los envíos de CI manual omiten el alcance de cambios y fuerzan los shards de Linux Node, los shards de bundled-plugin, los shards de contrato de complemento y canal, la compatibilidad con Node 22, `check-*`, `check-additional-*`, comprobaciones de humo de artefactos construidos, comprobaciones de documentos, habilidades de Python, Windows, macOS, Android y carriles i18n de Control UI.
  Ejemplo: `gh workflow run ci.yml --ref release/YYYY.M.D`
- Ejecute `pnpm qa:otel:smoke` al validar la telemetría de lanzamiento. Ejercita el QA-lab a través de un receptor local OTLP/HTTP y verifica los nombres de span de traza exportados, atributos limitados y redacción de contenido/identificador sin requerir Opik, Langfuse u otro recolector externo.
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- El preflight `OpenClaw NPM Release` genera evidencia de lanzamiento de dependencias antes de empaquetar el tarball de npm. La puerta de vulnerabilidades de asesoría de npm es bloqueante para el lanzamiento. El riesgo de manifiesto transitivo, la superficie de propiedad/instalación de dependencias y los informes de cambios de dependencias son solo evidencia de lanzamiento. El informe de cambios de dependencias compara el candidato de lanzamiento con la etiqueta de lanzamiento alcanzable anterior.
- El preflight carga la evidencia de dependencias como `openclaw-release-dependency-evidence-<tag>` y también la incrusta bajo `dependency-evidence/` dentro del artefacto preflight de npm preparado. La ruta de publicación real reutiliza ese artefacto preflight y luego adjunta la misma evidencia al lanzamiento de GitHub como `openclaw-<version>-dependency-evidence.zip`.
- Ejecute `OpenClaw Release Publish` para la secuencia de publicación mutable después de que exista la etiqueta. Despáchelo desde `release/YYYY.M.D` (o `main` al publicar una etiqueta accesible desde main), pase la etiqueta de lanzamiento y la `preflight_run_id` exitosa de OpenClaw npm, y mantenga el alcance de publicación de plugin predeterminado `all-publishable` a menos que esté ejecutando deliberadamente una reparación enfocada. El flujo de trabajo serializa la publicación npm del plugin, la publicación ClawHub del plugin y la publicación npm de OpenClaw para que el paquete principal no se publique antes que sus plugins externalizados.
- Las comprobaciones de lanzamiento ahora se ejecutan en un flujo de trabajo manual separado:
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` también ejecuta el carril de paridad simulada del QA Lab, además del perfil de Matrix en vivo rápido y el carril de QA de Telegram antes de la aprobación de la versión. Los carriles en vivo utilizan el entorno `qa-live-shared`; Telegram también utiliza arrendamientos de credenciales de CI de Convex. Ejecute el flujo de trabajo manual `QA-Lab - All Lanes` con `matrix_profile=all` y `matrix_shards=true` cuando desee un inventario completo de transporte, medios y E2EE de Matrix en paralelo.
- La validación de tiempo de ejecución de instalación y actualización multi-SO es parte de los `OpenClaw Release Checks` y `Full Release Validation` públicos, que llaman al flujo de trabajo reutilizable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directamente
- Esta división es intencional: mantener la ruta de publicación real de npm corta, determinista y centrada en artefactos, mientras que las comprobaciones en vivo más lentas permanecen en su propio carril para que no detengan o bloqueen la publicación
- Las comprobaciones de versión que portan secretos deben enviarse a través de la referencia del flujo de trabajo `Full Release Validation` or from the `main`/release para que la lógica y los secretos del flujo de trabajo se mantengan controlados
- `OpenClaw Release Checks` acepta una rama, etiqueta o SHA de confirmación completo siempre que la confirmación resuelta sea accesible desde una rama o etiqueta de versión de OpenClaw
- El previo solo de validación `OpenClaw NPM Release` también acepta el SHA de confirmación completo de 40 caracteres de la rama del flujo de trabajo actual sin requerir una etiqueta enviada
- Esa ruta SHA es solo para validación y no se puede promover a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la verificación de metadatos del paquete; la publicación real todavía requiere una etiqueta de versión real
- Ambos flujos de trabajo mantienen la ruta real de publicación y promoción en runners alojados en GitHub, mientras que la ruta de validación no mutante puede usar los runners Linux de Blacksmith más grandes
- Ese flujo de trabajo ejecuta
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  utilizando ambos secretos de flujo de trabajo `OPENAI_API_KEY` y `ANTHROPIC_API_KEY`
- El previo de versión de npm ya no espera en el carril de comprobaciones de versión separado
- Antes de etiquetar un candidato a lanzamiento localmente, ejecute
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. El asistente
  ejecuta los guardarraíles de lanzamiento rápido, las comprobaciones de lanzamiento de complementos npm/ClawHub, la compilación,
  la compilación de la IU y `release:openclaw:npm:check` en el orden que detecta errores comunes
  que bloquean la aprobación antes de que inicie el flujo de trabajo de publicación de GitHub.
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección correspondiente) antes de la aprobación
- Después de npm publish, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección correspondiente) para verificar la ruta de instalación
  del registro publicado en un prefijo temporal nuevo
- Después de una publicación beta, ejecute `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  para verificar la incorporación del paquete instalado, la configuración de Telegram y las pruebas E2E
  reales de Telegram contra el paquete npm publicado utilizando el grupo compartido
  de credenciales de Telegram arrendadas. Los casos individuales de los mantenedores locales pueden omitir las variables de Convex y pasar las tres
  credenciales de entorno `OPENCLAW_QA_TELEGRAM_*` directamente.
- Para ejecutar la prueba de humo completa posterior a la publicación beta desde una máquina de mantenedor, use `pnpm release:beta-smoke -- --beta betaN`. El asistente ejecuta la validación de actualización de npm de Parallels/objetivo nuevo, envía `NPM Telegram Beta E2E`, sondea la ejecución exacta del flujo de trabajo, descarga el artefacto e imprime el informe de Telegram.
- Los mantenedores pueden ejecutar la misma comprobación posterior a la publicación desde GitHub Actions a través del
  flujo de trabajo manual `NPM Telegram Beta E2E`. Es intencionalmente solo manual y
  no se ejecuta en cada fusión.
- La automatización de lanzamiento de los mantenedores ahora utiliza previo al vuelo y luego promoción:
  - el npm publish real debe pasar un npm `preflight_run_id` exitoso
  - el npm publish real debe enviarse desde la misma rama `main` o
    `release/YYYY.M.D` que la ejecución de previo al vuelo exitosa
  - los lanzamientos estables de npm por defecto son `beta`
  - el npm publish estable puede apuntar a `latest` explícitamente a través de la entrada del flujo de trabajo
  - la mutación de etiquetas de distribución npm basada en token ahora vive en
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    por seguridad, porque `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras el
    repositorio público mantiene publicación solo OIDC
  - public `macOS Release` es solo para validación; cuando una etiqueta vive solo en una
    rama de lanzamiento pero el flujo de trabajo se despacha desde `main`, establezca
    `public_release_branch=release/YYYY.M.D`
  - la publicación privada real de mac debe pasar una verificación privada de mac exitosa
    `preflight_run_id` y `validate_run_id`
  - las rutas de publicación reales promueven los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para lanzamientos de corrección estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de lanzamiento no puedan dejar silenciosamente instalaciones globales más antiguas en
  la carga útil estable base
- la verificación previa al lanzamiento de npm falla cerrado a menos que el paquete incluya ambos
  `dist/control-ui/index.html` y una carga útil `dist/control-ui/assets/` no vacía
  para no enviar un tablero de navegador vacío nuevamente
- La verificación posterior a la publicación también verifica que los puntos de entrada de los complementos publicados y
  los metadatos del paquete estén presentes en el diseño del registro instalado. Un lanzamiento que
  envía cargas útiles de tiempo de ejecución de complementos faltantes falla el verificador postpublish y
  no se puede promover a `latest`.
- `pnpm test:install:smoke` también impone el presupuesto de empaquetado npm `unpackedSize` sobre
  el paquete de actualización candidato, por lo que el instalador e2e detecta hinchazón accidental del paquete
  antes de la ruta de publicación del lanzamiento
- Si el trabajo de lanzamiento tocó la planificación de CI, manifiestos de tiempo de extensión o
  matrices de prueba de extensión, regenere y revise las salidas de la matriz `plugin-prerelease-extension-shard` propiedad del planificador de
  `.github/workflows/plugin-prerelease.yml` antes de la aprobación para que las notas de lanzamiento no
  describan un diseño de CI obsoleto
- La preparación para el lanzamiento estable de macOS también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con el `.zip` empaquetado, `.dmg`, y `.dSYM.zip`
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación; el
    flujo de trabajo de publicación privada de macOS lo confirma automáticamente, o abre un PR de appcast
    cuando el envío directo está bloqueado
  - la aplicación empaquetada debe mantener un id de bundle que no sea de depuración, una URL de feed de Sparkle no vacía y un `CFBundleVersion` en o por encima del piso de compilación canónico de Sparkle para esa versión de lanzamiento

## Cajas de prueba de lanzamiento

`Full Release Validation` es como los operadores inician todas las pruebas de previo lanzamiento desde un único punto de entrada. Para una prueba de confirmación fijada en una rama de rápido movimiento, use el asistente para que cada flujo de trabajo hijo se ejecute desde una rama temporal fijada en el SHA de destino:

```bash
pnpm ci:full-release --sha <full-sha>
```

El asistente envía `release-ci/<sha>-...`, despacha `Full Release Validation` desde esa rama con `ref=<sha>`, verifica que cada `headSha` del flujo de trabajo hijo coincida con el objetivo y luego elimina la rama temporal. Esto evita probar por accidente una ejecución hijo más reciente de `main`.

Para la validación de rama o etiqueta de lanzamiento, ejecútelo desde la referencia de flujo de trabajo `main` de confianza y pase la rama o etiqueta de lanzamiento como `ref`:

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

El flujo de trabajo resuelve la referencia de destino, envía manual `CI` con
`target_ref=<release-ref>`, envía `OpenClaw Release Checks`, prepara un
artefacto `release-package-under-test` principal para comprobaciones orientadas al paquete y
envía Telegram E2E de paquete independiente cuando `release_profile=full` con
`rerun_group=all` o cuando se establece `release_package_spec` o
`npm_telegram_package_spec`. `OpenClaw Release
Checks` luego distribuye pruebas de humo de instalación, comprobaciones de lanzamiento multi-OS, cobertura de ruta de lanzamiento Docker en vivo/E2E cuando soak está habilitado, Aceptación de Paquete con Telegram
QA de paquete, paridad de QA Lab, Matrix en vivo y Telegram en vivo. Una ejecución completa solo es aceptable cuando el
resumen de `Full Release Validation`
muestra `normal_ci` y `release_checks` como exitosos. En modo completo/all,
el hijo `npm_telegram` también debe ser exitoso; fuera de completo/all se omite
a menos que se haya proporcionado un `release_package_spec` o `npm_telegram_package_spec` publicado.
El resumen final del verificador incluye tablas de trabajos más lentos para cada ejecución secundaria, para que el encargado de lanzamiento\pueda ver la ruta crítica actual sin descargar registros.
Consulte [Validación completa de lanzamiento](/es/reference/full-release-validation) para la
matriz de etapas completa, nombres exactos de trabajos del flujo de trabajo, diferencias entre el perfil estable y completo, artefactos y manejadores de reejecución enfocados.
Los flujos de trabajo secundarios se envían desde la referencia de confianza que ejecuta `Full Release
Validation`, normally `--ref main`, even when the target `ref` apunta a una
rama o etiqueta de lanzamiento anterior. No hay una entrada de workflow-ref separada para la Validación Completa de Lanzamiento;
elija el arnés de confianza eligiendo la referencia de ejecución del flujo de trabajo.
No use `--ref main -f ref=<sha>` para prueba exacta de commit en `main` en movimiento;
los SHAs de commit en bruto no pueden ser referencias de envío de flujo de trabajo, así que use
`pnpm ci:full-release --sha <sha>` para crear la rama temporal fijada.

Use `release_profile` para seleccionar la amplitud en vivo/proveedor:

- `minimum`: ruta Docker y en vivo OpenAI/core crítica para el lanzamiento más rápida
- `stable`: mínimo más cobertura de proveedor/backend estable para la aprobación de la versión
- `full`: estable más amplia cobertura de proveedor/medios de comunicación asesora

Use `run_release_soak=true` con `stable` cuando los carriles que bloquean la versión estén
ejecutándose correctamente (en verde) y desee el barrido completo de vivo/E2E, ruta de versión de Docker y
sobrevivientes de actualización publicados limitados antes de la promoción. Ese barrido cubre
los últimos cuatro paquetes estables más las líneas base fijas `2026.4.23` y `2026.5.2`
más la cobertura `2026.4.15` anterior, con las líneas base duplicadas eliminadas y
cada línea base dividida en su propio trabajo de ejecutor Docker. `full` implica
`run_release_soak=true`.

`OpenClaw Release Checks` usa la referencia de flujo de trabajo confiable para resolver la referencia
destino una vez como `release-package-under-test` y reutiliza ese artefacto en las comprobaciones de Docker multi-SO,
Aceptación de Paquetes y ruta de versión cuando se ejecutan pruebas de estabilización (soak). Esto mantiene
todos los cuadros orientados a paquetes en los mismos bytes y evita compilaciones de paquetes repetidas.
Después de que una versión beta ya esté en npm, establezca `release_package_spec=openclaw@YYYY.M.D-beta.N`
para que las comprobaciones de versión descarguen el paquete enviado una vez, extraigan su SHA de fuente de compilación
de `dist/build-info.json` y reutilicen ese artefacto para los carriles multi-SO,
Aceptación de Paquetes, Docker de ruta de versión y Telegram del paquete.
La prueba de humo de instalación de OpenAI multi-SO usa `OPENCLAW_CROSS_OS_OPENAI_MODEL` cuando la
variable repo/org está establecida, de lo contrario `openai/gpt-5.4`, porque este carril está
comprobando la instalación del paquete, incorporación, inicio de pasarela y un turno de agente en vivo
en lugar de evaluar el modelo predeterminado más lento. La matriz más amplia de proveedores en vivo
sigue siendo el lugar para la cobertura específica del modelo.

Use estas variantes dependiendo de la etapa de la versión:

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

No utilice el paraguas completo como la primera repetición después de una solución específica. Si una casilla falla, utilice el flujo de trabajo secundario, el trabajo, el carril de Docker, el perfil del paquete, el proveedor del modelo o el carril de QA que falló para la siguiente prueba. Vuelva a ejecutar el paraguas completo solo cuando la solución haya cambiado la orquestación compartida de la versión o haya dejado obsoleta la evidencia anterior de todas las casillas. El verificador final del paraguas vuelve a verificar los IDs de ejecución del flujo de trabajo secundario registrados, por lo que después de que un flujo de trabajo secundario se vuelve a ejecutar con éxito, vuelva a ejecutar solo el trabajo principal `Verify full validation` que falló.

Para una recuperación limitada, pase `rerun_group` al paraguas. `all` es la ejecución real de candidato de lanzamiento, `ci` ejecuta solo el hijo de CI normal, `plugin-prerelease` ejecuta solo el hijo del complemento exclusivo de lanzamiento, `release-checks` ejecuta todas las casillas de lanzamiento y los grupos de lanzamiento más estrechos son `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` y `npm-telegram`. Las reejecuciones enfocadas de `npm-telegram` requieren `release_package_spec` o `npm_telegram_package_spec`; las ejecuciones completas/totales con `release_profile=full` utilizan el artefacto del paquete release-checks. Las reejecuciones enfocadas entre sistemas operativos pueden agregar `cross_os_suite_filter=windows/packaged-upgrade` u otro filtro de sistema operativo/suite. Los fallos de comprobación de lanzamiento de QA son consultivos, excepto la puerta de cobertura de herramientas de tiempo de ejecución estándar, que bloquea la validación del lanzamiento cuando las herramientas dinámicas requeridas de OpenClaw se desvían o desaparecen del nivel estándar summary.

### Vitest

La casilla Vitest es el flujo de trabajo hijo `CI` manual. El CI manual omite intencionalmente el alcance de cambios y fuerza el gráfico de prueba normal para el candidato de lanzamiento: shards de Linux Node, shards de bundled-plugin, shards de contrato de complemento y canal, compatibilidad con Node 22, `check-*`, `check-additional-*`, comprobaciones de humo de artefactos construidos, comprobaciones de documentos, habilidades de Python, Windows, macOS, Android y Control UI i18n.

Use esta casilla para responder "¿pasó el árbol fuente el conjunto de pruebas normal completo?" No es lo mismo que la validación del producto de la ruta de versión. Evidencia que se debe conservar:

- Resumen `Full Release Validation` que muestra la URL de ejecución `CI` despachada
- `CI` se ejecuta correctamente en el SHA objetivo exacto
- nombres de fragmentos fallidos o lentos de los trabajos de CI al investigar regresiones
- Artefactos de tiempo de Vitest como `.artifacts/vitest-shard-timings.json` cuando
  una ejecución necesita análisis de rendimiento

Ejecute CI manual directamente solo cuando la versión necesita un CI normal determinista pero
no los cuadros Docker, QA Lab, live, cross-OS o package:

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

El cuadro Docker reside en `OpenClaw Release Checks` a través de
`openclaw-live-and-e2e-checks-reusable.yml`, además del flujo de trabajo en modo de
`install-smoke`. Valida el candidato de lanzamiento a través de entornos
Docker empaquetados en lugar de solo pruebas a nivel de origen.

La cobertura de Docker de lanzamiento incluye:

- prueba de humo de instalación completa con la prueba de humo de instalación global lenta de Bun habilitada
- preparación/reutilización de la imagen de prueba de humo del Dockerfile raíz por SHA objetivo, con trabajos de prueba de humo de QR,
  root/gateway e installer/Bun ejecutándose como fragmentos de install-smoke
  separados
- carriles E2E del repositorio
- fragmentos Docker de ruta de lanzamiento: `core`, `package-update-openai`,
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
- suites de proveedores live/E2E y cobertura de modelos en vivo de Docker cuando las verificaciones de lanzamiento
  incluyen suites en vivo

Use Docker artifacts before rerunning. The release-path scheduler uploads
`.artifacts/docker-tests/` with lane logs, `summary.json`, `failures.json`,
phase timings, scheduler plan JSON, and rerun commands. For focused recovery,
use `docker_lanes=<lane[,lane]>` on the reusable live/E2E workflow instead of
rerunning all release chunks. Generated rerun commands include prior
`package_artifact_run_id` and prepared Docker image inputs when available, so a
failed lane can reuse the same tarball and GHCR images.

### Laboratorio de QA

El box de QA Lab también es parte de `OpenClaw Release Checks`. Es el comportamiento
agentic y el release gate a nivel de canal, separado de la mecética de
empaquetado de Vitest y Docker.

La cobertura del QA Lab de release incluye:

- carril de paridad simulada (mock) comparando el carril candidato de OpenAI con la línea base
  Opus 4.6 usando el paquete de paridad agentic
- perfil QA rápido de Matrix en vivo usando el entorno `qa-live-shared`
- carril QA de Telegram en vivo usando arrendamientos de credenciales de Convex CI
- `pnpm qa:otel:smoke` cuando la telemetría del release necesita una prueba local explícita

Use este box para responder "¿se comporta el release correctamente en escenarios de QA y
flujos de canales en vivo?" Conserve las URL de los artefactos para los carriles de paridad, Matrix y Telegram
al aprobar el release. La cobertura completa de Matrix sigue disponible como una
ejecución manual fragmentada de QA-Lab en lugar del carril crítico para el release por defecto.

### Paquete

El box Package es el gate del producto instalable. Está respaldado por
`Package Acceptance` y el resolvedor
`scripts/resolve-openclaw-package-candidate.mjs`. El resolvedor normaliza un
candidato en el archivo tar `package-under-test` consumido por Docker E2E, valida
el inventario del paquete, registra la versión del paquete y SHA-256, y mantiene la
referencia del arnés de flujo de trabajo (workflow harness) separada de la referencia del código fuente del paquete.

Fuentes de candidatos compatibles:

- `source=npm`: `openclaw@beta`, `openclaw@latest`, o una versión de release exacta
  de OpenClaw
- `source=ref`: empaquetar una rama, etiqueta o SHA de commit completo de confianza
  de `package_ref` con el arnés `workflow_ref` seleccionado
- `source=url`: descargue un HTTPS `.tgz` con `package_sha256` requeridos
- `source=artifact`: reutilizar un `.tgz` cargado por otra ejecución de GitHub Actions

`OpenClaw Release Checks` ejecuta la Aceptación de Paquetes con `source=artifact`, el
artefacto del paquete de lanzamiento preparado, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. La Aceptación de Paquetes mantiene la migración, actualización,
reinicio de actualización de autenticación configurada, instalación en vivo de la habilidad ClawHub, limpieza de dependencias de plugins obsoletos, fixtures de plugins sin conexión,
actualización de plugins y QA de paquetes de Telegram contra el mismo tarball
resuelto. Las comprobaciones de lanzamiento de bloqueo utilizan la línea base del último paquete publicado
predeterminado; `run_release_soak=true` o
`release_profile=full` se expande a cada línea base estable publicada en npm desde
`2026.4.23` hasta `latest` más fixtures de problemas reportados. Use
la Aceptación de Paquetes con `source=npm` para un candidato ya enviado, o
`source=ref`/`source=artifact` para un tarball local npm respaldado por SHA antes de
publicar. Es el reemplazo nativo de GitHub
para la mayor parte de la cobertura de paquetes/actualizaciones que anteriormente requería
Parallels. Las comprobaciones de lanzamiento multi-SO siguen siendo importantes para el incorporation específico del SO,
el instalador y el comportamiento de la plataforma, pero la validación del producto de paquetes/actualizaciones debería
preferir la Aceptación de Paquetes.

La lista de verificación canónica para la validación de actualizaciones y plugins es
[Testing updates and plugins](/es/help/testing-updates-plugins). Úsela al
decidir qué canal local, Docker, Aceptación de Paquetes o de comprobación de lanzamiento demuestra un
cambio de instalación/actualización de plugin, limpieza de doctor o migración de paquete publicado. La
migración de actualización publicada exhaustiva desde cada paquete `2026.4.23+` estable es
un flujo de trabajo manual `Update Migration` separado, no parte del CI de Lanzamiento Completo.

La indulgencia de aceptación de paquetes heredados está intencionalmente limitada en el tiempo. Los paquetes a través de
`2026.4.25` pueden usar la ruta de compatibilidad para lagunas de metadatos ya publicados
en npm: entradas de inventario privado de QA que faltan en el archivo, faltan
`gateway install --wrapper`, archivos de parche faltantes en el accesorio git derivado del archivo,
falta de `update.channel` persistido, ubicaciones de registros de instalación de complementos heredados,
falta de persistencia de registros de instalación del mercado y migración de metadatos de configuración
durante `plugins update`. El paquete publicado `2026.4.26` puede advertir
sobre los archivos de sello de metadatos de compilación local que ya se han enviado. Los paquetes posteriores
deben satisfacer los contratos de paquetes modernos; esas mismas lagunas fallan la validación
de lanzamiento.

Use perfiles de Aceptación de Paquetes más amplios cuando la pregunta de lanzamiento se trate de un
paquete instalable real:

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

- `smoke`: instalación rápida de paquete/canal/agente, red de puerta de enlace y carriles de
  recarga de configuración
- `package`: contratos de paquetes de instalación/actualización/reinicio/complemento más prueba de instalación de habilidad
  ClawHub en vivo; este es el valor predeterminado de release-check
- `product`: `package` más canales MCP, limpieza de cron/subagente, búsqueda web de
  OpenAI y OpenWebUI
- `full`: fragmentos de ruta de lanzamiento de Docker con OpenWebUI
- `custom`: lista exacta de `docker_lanes` para reejecuciones enfocadas

Para la prueba de Telegram de candidato a paquete, habilite `telegram_mode=mock-openai` o
`telegram_mode=live-frontier` en la Aceptación de Paquetes. El flujo de trabajo pasa el
archivo `package-under-test` resuelto al carril de Telegram; el flujo de trabajo
independiente de Telegram todavía acepta una especificación npm publicada para verificaciones posteriores a la publicación.

## Automatización de publicación de lanzamientos

`OpenClaw Release Publish` es el punto de entrada de publicación mutable normal. Orquesta
los flujos de trabajo de editor de confianza en el orden que el lanzamiento necesita:

1. Extraiga la etiqueta de lanzamiento y resuelva su SHA de confirmación.
2. Verifique que la etiqueta sea alcanzable desde `main` o `release/*`.
3. Ejecute `pnpm plugins:sync:check`.
4. Despacha `Plugin NPM Release` con `publish_scope=all-publishable` y
   `ref=<release-sha>`.
5. Despacha `Plugin ClawHub Release` con el mismo alcance y SHA.
6. Despacha `OpenClaw NPM Release` con la etiqueta de lanzamiento, etiqueta de distribución npm y
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

Usa los flujos de trabajo de nivel inferior `Plugin NPM Release` y `Plugin ClawHub Release`
solo para trabajos de reparación o republicación enfocados. Para una reparación de complemento seleccionada, pasa
`plugin_publish_scope=selected` y `plugins=@openclaw/name` a
`OpenClaw Release Publish`, o despacha el flujo de trabajo secundario directamente cuando el
paquete OpenClaw no deba publicarse.

## Entradas del flujo de trabajo de NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida como `v2026.4.2`, `v2026.4.2-1`, o
  `v2026.4.2-beta.1`; cuando `preflight_only=true`, también puede ser el SHA de confirmación
  completo de 40 caracteres de la rama del flujo de trabajo actual para preflight solo de validación
- `preflight_only`: `true` solo para validación/construcción/empaquetado, `false` para la
  ruta real de publicación
- `preflight_run_id`: requerido en la ruta real de publicación para que el flujo de trabajo reutilice
  el archivo tar preparado de la ejecución preflight exitosa
- `npm_dist_tag`: etiqueta de destino npm para la ruta de publicación; predeterminado a `beta`

`OpenClaw Release Publish` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida; ya debe existir
- `preflight_run_id`: id de ejecución preflight exitosa de `OpenClaw NPM Release`;
  requerido cuando `publish_openclaw_npm=true`
- `npm_dist_tag`: etiqueta de destino npm para el paquete OpenClaw
- `plugin_publish_scope`: predeterminado a `all-publishable`; usa `selected` solo
  para trabajos de reparación enfocados
- `plugins`: nombres de paquetes `@openclaw/*` separados por comas cuando
  `plugin_publish_scope=selected`
- `publish_openclaw_npm`: por defecto es `true`; establezca `false` solo cuando use el
  flujo de trabajo como orquestador de reparación solo para complementos
- `wait_for_clawhub`: por defecto es `false` para que la disponibilidad de npm no se bloquee por
  el sidecar de ClawHub; establezca `true` solo cuando la finalización del flujo de trabajo deba incluir
  la finalización de ClawHub

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: rama, etiqueta o SHA de confirmación completo para validar. Las comprobaciones que portan secretos
  requieren que la confirmación resuelta sea accesible desde una rama de OpenClaw o
  una etiqueta de lanzamiento.
- `run_release_soak`: optar por pruebas en vivo/E2E exhaustivas, ruta de lanzamiento de Docker y
  pruebas de absorción de supervivientes de actualización desde el principio en las comprobaciones de lanzamiento estables/predeterminadas. Está forzado
  en por `release_profile=full`.

Reglas:

- Las etiquetas estables y de corrección pueden publicarse en `beta` o en `latest`
- Las etiquetas de prelanzamiento beta solo pueden publicarse en `beta`
- Para `OpenClaw NPM Release`, la entrada del SHA de confirmación completo solo se permite cuando
  `preflight_only=true`
- `OpenClaw Release Checks` y `Full Release Validation` son siempre
  solo de validación
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante el previo al vuelo;
  el flujo de trabajo verifica que los metadatos antes de la publicación continúen

## Secuencia de lanzamiento estable de npm

Al crear un lanzamiento estable de npm:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de confirmación completo actual de la rama del flujo de trabajo
     para una ejecución de prueba de validación única del flujo de trabajo previo al vuelo
2. Elija `npm_dist_tag=beta` para el flujo normal de primero beta, o `latest` solo
   cuando intencionalmente desee una publicación estable directa
3. Ejecute `Full Release Validation` en la rama de lanzamiento, la etiqueta de lanzamiento o el SHA completo de confirmación cuando desee una CI normal además de la cobertura de caché de indicaciones en vivo, Docker, QA Lab, Matrix y Telegram desde un flujo de trabajo manual
4. Si intencionalmente solo necesita el gráfico de prueba normal determinista, ejecute el flujo de trabajo manual `CI` en la referencia de lanzamiento en su lugar
5. Guarde el `preflight_run_id` exitoso
6. Ejecute `OpenClaw Release Publish` con el mismo `tag`, el mismo `npm_dist_tag` y el `preflight_run_id` guardado; publica los complementos externalizados en npm y ClawHub antes de promover el paquete npm de OpenClaw
7. Si el lanzamiento se publicó en `beta`, use el flujo de trabajo privado `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` para promover esa versión estable de `beta` a `latest`
8. Si el lanzamiento se publicó intencionalmente directamente en `latest` y `beta` debería seguir la misma compilación estable inmediatamente, use ese mismo flujo de trabajo privado para apuntar ambas dist-tags a la versión estable, o deje que su sincronización de auto-curación programada mueva `beta` más tarde

La mutación de dist-tag reside en el repositorio privado por seguridad porque todavía requiere `NPM_TOKEN`, mientras que el repositorio público mantiene la publicación solo con OIDC.

Eso mantiene tanto la ruta de publicación directa como la ruta de promoción beta primero documentadas y visibles para el operador.

Si un mantenedor debe volver a la autenticación npm local, ejecute cualquier comando de la CLI de 1Password (`op`) solo dentro de una sesión tmux dedicada. No llame a `op` directamente desde el shell del agente principal; mantenerlo dentro de tmux hace que los indicadores, alertas y el manejo de OTP sean observables y evita alertas de host repetidas.

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
