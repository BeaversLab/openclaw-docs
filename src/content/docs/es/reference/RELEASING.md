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
  para un candidato de paquete mientras continúa el trabajo de lanzamiento. Use `source=npm` para
  `openclaw@beta`, `openclaw@latest`, o una versión de lanzamiento exacta; `source=ref`
  para empaquetar una rama/etiqueta/SHA `package_ref` de confianza con el arnés
  `workflow_ref` actual; `source=url` para un archivo tar HTTPS público con una
  política de SHA-256 requerida y estricta de URL pública; `source=trusted-url` para una
  política de fuente de confianza nombrada usando `trusted_source_id` requerida y SHA-256; o
  `source=artifact` para un archivo tar cargado por otra ejecución de GitHub Actions. El
  flujo de trabajo resuelve el candidato a
  `package-under-test`, reutiliza el programador de lanzamiento Docker E2E contra ese
  archivo tar, y puede ejecutar Telegram QA contra el mismo archivo tar con
  `telegram_mode=mock-openai` o `telegram_mode=live-frontier`. Cuando las
  líneas de Docker seleccionadas incluyen `published-upgrade-survivor`, el artefacto
  del paquete es el candidato y `published_upgrade_survivor_baseline` selecciona
  la base publicada. `update-restart-auth` usa el paquete candidato como
  tanto la CLI instalada como el paquete bajo prueba, por lo que ejercita la
  ruta de reinicio administrado del comando de actualización del candidato.
  Ejemplo: `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Perfiles comunes:
  - `smoke`: líneas de install/channel/agent, red de puerta de enlace y recarga de configuración
  - `package`: líneas de paquete/actualización/reinicio/complemento nativas de artefactos sin OpenWebUI o ClawHub en vivo
  - `product`: perfil de paquete más canales MCP, limpieza de cron/subagente,
    búsqueda web de OpenAI y OpenWebUI
  - `full`: fragmentos de ruta de lanzamiento de Docker con OpenWebUI
  - `custom`: selección exacta de `docker_lanes` para una reejecución centrada
- Ejecute el flujo de trabajo manual `CI` directamente cuando solo necesite cobertura completa de CI normal para el candidato de lanzamiento. Los despachos manuales de CI omiten el alcance de cambios y fuerzan los fragmentos de Linux Node, fragmentos de bundled-plugin, fragmentos de plugin y contrato de canal, compatibilidad con Node 22, `check-*`, `check-additional-*`, comprobaciones de humo de artefactos construidos, comprobaciones de documentos, habilidades de Python, Windows, macOS, Android y carriles i18n de Control UI. Ejemplo: `gh workflow run ci.yml --ref release/YYYY.M.D`
- Ejecute `pnpm qa:otel:smoke` al validar la telemetría de lanzamiento. Ejercita el QA-lab a través de un receptor local OTLP/HTTP y verifica la exportación de trazas, métricas y registros, además de los atributos de traza delimitados y la redacción de contenido/identificador sin requerir Opik, Langfuse u otro colector externo.
- Ejecute `pnpm qa:prometheus:smoke` al validar el raspado protegido de Prometheus. Ejercita el QA-lab, rechaza los raspados no autenticados y verifica que las familias de métricas críticas para el lanzamiento se mantengan libres de contenido de aviso, identificadores sin procesar, tokens de autenticación y rutas locales.
- Ejecute `pnpm qa:observability:smoke` cuando desee los carriles de prueba de humo de OpenTelemetry y Prometheus de fuente-checkout uno tras otro.
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- El prefacio `OpenClaw NPM Release` genera evidencia de lanzamiento de dependencias antes de empaquetar el tarball de npm. El bloqueo de vulnerabilidades de asesoramiento de npm es bloqueante para el lanzamiento. El riesgo de manifiesto transitivo, la superficie de propiedad/instalación de dependencias y los informes de cambios de dependencias son solo evidencia de lanzamiento. El informe de cambios de dependencias compara el candidato de lanzamiento con la etiqueta de lanzamiento alcanzable anterior.
- El prefacio carga la evidencia de dependencias como `openclaw-release-dependency-evidence-<tag>` y también la incrusta bajo `dependency-evidence/` dentro del artefacto de prefacio npm preparado. La ruta de publicación real reutiliza ese artefacto de prefacio y luego adjunta la misma evidencia al lanzamiento de GitHub como `openclaw-<version>-dependency-evidence.zip`.
- Ejecute `OpenClaw Release Publish` para la secuencia de publicación de mutaciones después de que
  exista la etiqueta. Despáchelo desde `release/YYYY.M.D` (o `main` al publicar una
  etiqueta accesible desde main), pase la etiqueta de lanzamiento y la publicación exitosa de OpenClaw npm
  `preflight_run_id`, y mantenga el alcance de publicación del complemento predeterminado
  `all-publishable` a menos que esté ejecutando deliberadamente una reparación enfocada. El flujo de trabajo
  serializa la publicación npm de complementos, la publicación de complementos en ClawHub y la publicación npm de OpenClaw
  para que el paquete principal no se publique antes que sus complementos externalizados.
- Las comprobaciones de lanzamiento ahora se ejecutan en un flujo de trabajo manual separado:
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` también ejecuta el carril de paridad simulada de QA Lab además del perfil
  Matrix rápido en vivo y el carril QA de Telegram antes de la aprobación del lanzamiento. Los carriles
  en vivo usan el entorno `qa-live-shared`; Telegram también usa arrendamientos de credenciales
  de Convex CI. Ejecute el flujo de trabajo manual `QA-Lab - All Lanes` con
  `matrix_profile=all` y `matrix_shards=true` cuando desee un inventario completo de transporte,
  medios y E2EE de Matrix en paralelo.
- La validación de tiempo de ejecución de instalación y actualización entre sistemas operativos es parte de la
  `OpenClaw Release Checks` pública y `Full Release Validation`, que llaman al
  flujo de trabajo reutilizable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directamente
- Esta división es intencional: mantenga la ruta de lanzamiento real de npm corta,
  determinista y centrada en artefactos, mientras que las comprobaciones en vivo más lentas permanecen en su
  propio carril para no frenar ni bloquear la publicación
- Las comprobaciones de lanzamiento con secretos deben despacharse a través de la referencia del flujo de trabajo `Full Release
Validation` or from the `main`/release para que la lógica del flujo de trabajo
  y los secretos permanezcan controlados
- `OpenClaw Release Checks` acepta una rama, etiqueta o SHA de confirmación completo siempre
  que la confirmación resuelta sea accesible desde una rama o etiqueta de lanzamiento de OpenClaw
- El preflighto solo de validación `OpenClaw NPM Release` también acepta el
  SHA de confirmación completo de 40 caracteres de la rama del flujo de trabajo actual sin requerir una etiqueta enviada
- Esa ruta SHA es solo de validación y no se puede promocionar a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la
  verificación de metadatos del paquete; la publicación real aún requiere una etiqueta de lanzamiento real
- Ambos flujos de trabajo mantienen la ruta de publicación y promoción real en ejecutores
  alojados en GitHub, mientras que la ruta de validación no mutante puede usar los ejecutores
  Linux de Blacksmith más grandes
- Ese flujo de trabajo ejecuta
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  usando tanto `OPENAI_API_KEY` como `ANTHROPIC_API_KEY` secretos del flujo de trabajo
- el prelanzamiento de npm ya no espera en el carril separado de verificaciones de lanzamiento
- Antes de etiquetar un candidato de lanzamiento localmente, ejecute
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. El asistente
  ejecuta los guardarraíles de lanzamiento rápido, las verificaciones de lanzamiento de npm/ClawHub del complemento, la compilación,
  la compilación de UI y `release:openclaw:npm:check` en el orden que detecta errores comunes
  que bloquean la aprobación antes de que comience el flujo de trabajo de publicación de GitHub.
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección coincidente) antes de la aprobación
- Después de la publicación de npm, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección coincidente) para verificar la ruta de instalación
  del registro publicado en un prefijo temporal nuevo
- Después de una publicación beta, ejecute `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  para verificar la incorporación del paquete instalado, la configuración de Telegram y el E2E real de Telegram
  contra el paquete npm publicado usando el pool compartido de credenciales arrendadas de Telegram.
  Las excepciones únicas del mantenedor local pueden omitir las variables de Convex y pasar las tres
  credenciales de entorno `OPENCLAW_QA_TELEGRAM_*` directamente.
- Para ejecutar la prueba de humo completa posterior a la publicación beta desde una máquina de mantenedor, use `pnpm release:beta-smoke -- --beta betaN`. El asistente ejecuta la validación de actualización/destino nuevo de Parallels npm, despacha `NPM Telegram Beta E2E`, sondea la ejecución exacta del flujo de trabajo, descarga el artefacto e imprime el informe de Telegram.
- Los mantenedores pueden ejecutar la misma verificación posterior a la publicación desde GitHub Actions a través del
  flujo de trabajo manual `NPM Telegram Beta E2E`. Es intencionalmente solo manual y
  no se ejecuta en cada fusión.
- La automatización de lanzamiento del mantenedor ahora usa prelanzamiento-entonces-promoción:
  - la publicación real de npm debe pasar una verificación exitosa de npm `preflight_run_id`
  - la publicación real de npm debe ser despachada desde la misma rama `main` o
    `release/YYYY.M.D` que la ejecución de prelanzamiento exitosa
  - las versiones estables de npm por defecto son `beta`
  - la publicación estable en npm puede tener como objetivo `latest` explícitamente mediante la entrada del flujo de trabajo
  - la mutación de dist-tags de npm basada en tokens ahora reside en
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    por seguridad, porque `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras que
    el repositorio público mantiene publicación solo mediante OIDC
  - `macOS Release` público es solo de validación; cuando una etiqueta vive solo en una
    rama de lanzamiento pero el flujo de trabajo se despacha desde `main`, configure
    `public_release_branch=release/YYYY.M.D`
  - la publicación real privada de mac debe pasar exitosamente la revisión privada mac
    `preflight_run_id` y `validate_run_id`
  - las rutas de publicación reales promueven los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para lanzamientos de corrección estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de lanzamiento no dejen silenciosamente instalaciones globales antiguas en el
  carga útil estable base
- la verificación previa al lanzamiento de npm falla de forma segura a menos que el archivo incluya ambos
  `dist/control-ui/index.html` y una carga útil `dist/control-ui/assets/` no vacía
  para no volver a enviar un panel de navegador vacío
- La verificación posterior a la publicación también verifica que los puntos de entrada de complementos publicados y
  los metadatos del paquete estén presentes en el diseño del registro instalado. Un lanzamiento que
  envía cargas útiles de tiempo de ejecución de complementos faltantes falla el verificador postpublish y
  no se puede promover a `latest`.
- `pnpm test:install:smoke` también hace cumplir el presupuesto `unpackedSize` de npm pack en
  el archivo tar de actualización candidato, por lo que el instalador e2e detecta hinchazón accidental del paquete
  antes de la ruta de publicación del lanzamiento
- Si el trabajo de lanzamiento tocó la planificación de CI, manifiestos de sincronización de extensiones o
  matrices de prueba de extensiones, regenere y revise las `plugin-prerelease-extension-shard` de matriz propiedad del planificador
  de `.github/workflows/plugin-prerelease.yml` antes de la aprobación para que las notas de lanzamiento no
  describan un diseño de CI obsoleto
- La preparación para el lanzamiento estable de macOS también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con el `.zip`, el `.dmg` y el `.dSYM.zip` empaquetados
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación; el
    flujo de trabajo de publicación privada de macOS lo confirma automáticamente, o abre una PR de appcast
    cuando el envío directo está bloqueado
  - la aplicación empaquetada debe mantener un id de paquete que no sea de depuración, una URL de feed de Sparkle no vacía
    y un `CFBundleVersion` en o por encima del límite de compilación canónico de Sparkle
    para esa versión de lanzamiento

## Cajas de prueba de lanzamiento

`Full Release Validation` es la forma en que los operadores inician todas las pruebas previas al lanzamiento desde
un único punto de entrada. Para una prueba de confirmación anclada en una rama de rápido movimiento, use el
asistente para que cada flujo de trabajo secundario se ejecute desde una rama temporal fijada en el SHA
objetivo:

```bash
pnpm ci:full-release --sha <full-sha>
```

El asistente envía `release-ci/<sha>-...`, despacha `Full Release Validation`
desde esa rama con `ref=<sha>`, verifica que cada flujo de trabajo secundario `headSha`
coincida con el objetivo y luego elimina la rama temporal. Esto evita validar por accidente una
ejecución secundaria más reciente de `main`.

Para la validación de rama o etiqueta de lanzamiento, ejecútelo desde la referencia de flujo de trabajo `main` de confianza
y pase la rama o etiqueta de lanzamiento como `ref`:

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
envía pruebas E2E de Telegram de paquete independiente cuando `release_profile=full` con
`rerun_group=all` o cuando se establece `release_package_spec` o
`npm_telegram_package_spec`. `OpenClaw Release
Checks` luego distribuye pruebas de humo de instalación, comprobaciones de lanzamiento multi-OS, cobertura de ruta de lanzamiento Docker en vivo/E2E cuando soak está habilitado, Aceptación de Paquete con QA de paquete de Telegram, paridad de QA Lab, Matrix en vivo y Telegram en vivo. Una ejecución completa solo es aceptable cuando el
resumen `Full Release Validation`
muestra `normal_ci` y `release_checks` como exitosos. En modo completo/all,
el hijo `npm_telegram` también debe ser exitoso; fuera de completo/all se omite
a menos que se haya proporcionado un `release_package_spec` o `npm_telegram_package_spec` publicado.
El resumen final del verificador incluye tablas de las tareas más lentas para cada ejecución secundaria, de modo que el encargado de lanzamiento pueda ver la ruta crítica actual sin descargar registros.
Consulte [Full release validation](/es/reference/full-release-validation) para obtener la
matriz completa de etapas, los nombres exactos de las tareas del flujo de trabajo, las diferencias entre el perfil estable y completo, los artefactos y los identificadores de reejecución centrados.
Los flujos de trabajo secundarios se envían desde la referencia de confianza que ejecuta `Full Release
Validation`, normally `--ref main`, even when the target `ref` apunta a una
rama o etiqueta de lanzamiento anterior. No hay una entrada de referencia de flujo de trabajo de Validación de Lanzamiento Completo separada; elija el arnés de confianza eligiendo la referencia de ejecución del flujo de trabajo.
No use `--ref main -f ref=<sha>` para la prueba exacta de commit en el movimiento `main`;
los SHA de commit sin procesar no pueden ser referencias de envío de flujo de trabajo, así que use
`pnpm ci:full-release --sha <sha>` para crear la rama temporal anclada.

Use `release_profile` para seleccionar la amplitud en vivo/proveedor:

- `minimum`: ruta más rápida de OpenAI/core en vivo y Docker crítica para el lanzamiento
- `stable`: cobertura mínima más proveedor/backend estable para la aprobación de la versión
- `full`: estable más amplia cobertura de proveedor/medios de consultoría

Use `run_release_soak=true` con `stable` cuando los carriles que bloquean la versión estén
en verde y desee el barrido exhaustivo de vivo/E2E, ruta de lanzamiento de Docker y
superviviente de actualización publicado limitado antes de la promoción. Ese barrido cubre
los últimos cuatro paquetes estables más las líneas base fijas `2026.4.23` y `2026.5.2`
más la cobertura de `2026.4.15` antiguos, con líneas base duplicadas eliminadas y
cada línea base fragmentada en su propio trabajo de ejecución de Docker. `full` implica
`run_release_soak=true`.

`OpenClaw Release Checks` usa la referencia de flujo de trabajo de confianza para resolver la referencia
destino una vez como `release-package-under-test` y reutiliza ese artefacto en comprobaciones entre sistemas operativos,
Aceptación de paquetes y Docker de ruta de lanzamiento cuando se ejecutan pruebas de estabilización. Esto mantiene
todas las cajas orientadas a paquetes en los mismos bytes y evita compilaciones de paquetes repetidas.
Después de que una beta ya esté en npm, establezca `release_package_spec=openclaw@YYYY.M.D-beta.N`
para que las comprobaciones de lanzamiento descarguen el paquete enviado una vez, extraigan su SHA de fuente de compilación
de `dist/build-info.json` y reutilicen ese artefacto para carriles entre sistemas operativos,
Aceptación de paquetes, Docker de ruta de lanzamiento y Telegram de paquete.
La prueba de humo de instalación de OpenAI entre sistemas operativos usa `OPENCLAW_CROSS_OS_OPENAI_MODEL` cuando la
variable repo/org está configurada, de lo contrario `openai/gpt-5.4`, porque este carril está
probando la instalación del paquete, incorporación, inicio de la puerta de enlace y un turno de agente en vivo
en lugar de comparar el modelo predeterminado más lento. La matriz más amplia de proveedores en vivo
sigue siendo el lugar para la cobertura específica del modelo.

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

No use el paraguas completo como la primera repetición después de una corrección enfocada. Si falla un cuadro, use el flujo de trabajo secundario fallido, trabajo, carril de Docker, perfil de paquete, proveedor de modelo o carril de QA para la siguiente prueba. Ejecute el paraguas completo nuevamente solo cuando la corrección haya cambiado la orquestación de lanzamiento compartida o haya obsoleto las evidencias anteriores de todos los cuadros. El verificador final del paraguas vuelve a verificar los ids de ejecución del flujo de trabajo secundario registrados, por lo que después de que un flujo de trabajo secundario se ejecuta correctamente, vuelva a ejecutar solo el trabajo principal fallido `Verify full validation`.

Para una recuperación limitada, pase `rerun_group` al paraguas. `all` es la ejecución real de candidato a lanzamiento, `ci` ejecuta solo el secundario de CI normal, `plugin-prerelease` ejecuta solo el secundario de complemento solo de lanzamiento, `release-checks` ejecuta cada cuadro de lanzamiento, y los grupos de lanzamiento más estrechos son `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` y `npm-telegram`. Las repeticiones enfocadas de `npm-telegram` requieren `release_package_spec` o `npm_telegram_package_spec`; las ejecuciones completas/todas con `release_profile=full` usan el artefacto del paquete release-checks. Las repeticiones enfocadas entre sistemas operativos pueden agregar `cross_os_suite_filter=windows/packaged-upgrade` u otro filtro de sistema operativo/suite. Los fallos de verificación de lanzamiento de QA son consultivos, excepto la puerta de cobertura de herramientas de tiempo de ejecución estándar, que bloquea la validación del lanzamiento cuando las herramientas dinámicas requeridas de OpenClaw cambian o desaparecen del resumen de nivel estándar.

### Vitest

El cuadro Vitest es el flujo de trabajo secundario manual `CI`. El CI manual omite intencionalmente el alcance de cambios y fuerza el gráfico de pruebas normal para el candidato a lanzamiento: fragmentos de Linux Node, fragmentos de complementos empaquetados, fragmentos de contratos de complementos y canales, compatibilidad con Node 22, `check-*`, `check-additional-*`, verificaciones de humo de artefactos construidos, verificaciones de documentos, habilidades de Python, Windows, macOS, Android y Control UI i18n.

Use este cuadro para responder "¿pasó el árbol de origen el conjunto de pruebas normal completo?"
No es lo mismo que la validación del producto de la ruta de lanzamiento. Evidencia a conservar:

- resumen de `Full Release Validation` que muestra la URL de ejecución enviada de `CI`
- ejecución de `CI` en verde en el SHA objetivo exacto
- nombres de fragmentos fallidos o lentos de los trabajos de CI al investigar regresiones
- artefactos de sincronización de Vitest, como `.artifacts/vitest-shard-timings.json`, cuando
  una ejecución necesita análisis de rendimiento

Ejecute el CI manualmente directamente solo cuando el lanzamiento necesite un CI normal determinista, pero
no los cuadros de Docker, QA Lab, live, cross-OS o package:

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

El cuadro de Docker reside en `OpenClaw Release Checks` a través de
`openclaw-live-and-e2e-checks-reusable.yml`, además del flujo de trabajo
`install-smoke` en modo de lanzamiento. Valida el candidato de lanzamiento a través de
entornos Docker empaquetados en lugar de solo pruebas a nivel de origen.

La cobertura de Docker de lanzamiento incluye:

- prueba de humo de instalación completa con la prueba de humo de instalación global lenta de Bun habilitada
- preparación/reutilización de la imagen de prueba de humo del Dockerfile raíz por SHA objetivo, con QR,
  root/gateway y trabajos de prueba de humo de installer/Bun ejecutándose como fragmentos
  de prueba de instalación separados
- carriles E2E del repositorio
- fragmentos de Docker de la ruta de lanzamiento: `core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g` y `plugins-runtime-install-h`
- cobertura de OpenWebUI dentro del fragmento `plugins-runtime-services` cuando se solicite
- carriles divididos de instalación/desinstalación de complementos agrupados
  `bundled-plugin-install-uninstall-0` a través de
  `bundled-plugin-install-uninstall-23`
- conjuntos de proveedores live/E2E y cobertura de modelos vivos de Docker cuando las comprobaciones de lanzamiento
  incluyen conjuntos vivos

Use artefactos de Docker antes de volver a ejecutar. El programador de rutas de liberación (release-path scheduler) sube `.artifacts/docker-tests/` con registros de carriles (lane logs), `summary.json`, `failures.json`, tiempos de fase, plan JSON del programador y comandos de reejecución. Para una recuperación enfocada, use `docker_lanes=<lane[,lane]>` en el flujo de trabajo reutilizable live/E2E en lugar de volver a ejecutar todos los fragmentos de liberación. Los comandos de reejecución generados incluyen `package_artifact_run_id` anteriores y entradas de imágenes Docker preparadas cuando están disponibles, por lo que un carril fallido puede reutilizar el mismo tarball e imágenes GHCR.

### Laboratorio de QA

La caja del Laboratorio de QA también es parte de `OpenClaw Release Checks`. Es el comportamiento agéntico y la puerta de liberación a nivel de canal, separada de la mecánica de empaquetado de Vitest y Docker.

La cobertura del Laboratorio de QA de liberación incluye:

- carril de paridad (parity lane) simulado comparando el carril candidato de OpenAI contra la línea base Opus 4.6 usando el paquete de paridad agéntica
- perfil rápido de QA de Matrix en vivo usando el entorno `qa-live-shared`
- carril de QA de Telegram en vivo usando arrendamientos de credenciales de Convex CI
- `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke` o
  `pnpm qa:observability:smoke` cuando la telemetría de liberación necesita pruebas locales explícitas

Use esta caja para responder "¿se comporta la liberación correctamente en escenarios de QA y flujos de canales en vivo?" Conserve las URL de los artefactos para los carriles de paridad, Matrix y Telegram al aprobar la liberación. La cobertura completa de Matrix permanece disponible como una ejecución fragmentada manual de QA-Lab en lugar del carril crítico para la liberación predeterminado.

### Paquete

La caja Paquete es la puerta del producto instalable. Está respaldada por
`Package Acceptance` y el resolutor
`scripts/resolve-openclaw-package-candidate.mjs`. El resolutor normaliza un
candidato en el tarball `package-under-test` consumido por Docker E2E, valida
el inventario del paquete, registra la versión del paquete y SHA-256, y mantiene
la referencia del arnés de flujo de trabajo separada de la referencia de origen del paquete.

Fuentes candidatas compatibles:

- `source=npm`: `openclaw@beta`, `openclaw@latest` o una versión exacta de liberación
  de OpenClaw
- `source=ref`: empaquetar una rama `package_ref` de confianza, etiqueta o SHA de confirmación completo
  con el arnés `workflow_ref` seleccionado
- `source=url`: descarga un HTTPS público `.tgz` con `package_sha256` requerido;
  las credenciales de URL, los puertos HTTPS no predeterminados, los nombres de host
  privados/internos/de uso especial o las direcciones resueltas, y las redirecciones no seguras son rechazadas
- `source=trusted-url`: descarga un HTTPS `.tgz` con `package_sha256` requerido
  y `trusted_source_id` desde una política con nombre en
  `.github/package-trusted-sources.json`; use esto para espejos empresariales propiedad de los mantenedores
  o repositorios de paquetes privados en lugar de agregar una
  omisión de red privada a nivel de entrada a `source=url`
- `source=artifact`: reutiliza un `.tgz` cargado por otra ejecución de GitHub Actions

`OpenClaw Release Checks` ejecuta la Aceptación de Paquetes con `source=artifact`, el
artefacto del paquete de lanzamiento preparado, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. La Aceptación de Paquetes mantiene la migración, actualización,
reinicio de actualización de autenticación configurada, instalación en vivo de la habilidad ClawHub,
limpieza de dependencias de complementos obsoletos, dispositivos de complementos sin conexión,
actualización de complementos y control de calidad de paquetes de Telegram contra el mismo archivo tar
resuelto. Las comprobaciones de lanzamiento de bloqueo utilizan la línea base del último paquete publicado
predeterminado; `run_release_soak=true` o
`release_profile=full` se expande a cada línea base estable publicada en npm desde
`2026.4.23` hasta `latest` más los dispositivos de problemas reportados. Use
la Aceptación de Paquetes con `source=npm` para un candidato ya enviado,
`source=ref` para un archivo tar local npm respaldado por SHA antes de la publicación,
`source=trusted-url` para un espejo empresarial/privado propiedad de los mantenedores, o
`source=artifact` para un archivo tar preparado cargado por otra ejecución de GitHub Actions.
Es el reemplazo nativo de GitHub para la mayor parte de la cobertura de paquetes/actualizaciones que anteriormente requería
Parallels. Las comprobaciones de lanzamiento multi-SO siguen siendo importantes para el incorporación,
el instalador y el comportamiento de la plataforma específicos del SO, pero la validación del producto de paquetes/actualizaciones debe
preferir la Aceptación de Paquetes.

La lista de verificación canónica para la validación de actualizaciones y complementos es
[Testing updates and plugins](/es/help/testing-updates-plugins). Úsela al
decidir qué canal local, Docker, Aceptación de Paquetes o release-check demuestra un
cambio de instalación/actualización de complemento, limpieza de doctor o migración de paquete publicado.
La migración de actualización publicada exhaustiva desde cada paquete `2026.4.23+` estable es
un flujo de trabajo `Update Migration` manual separado, no parte de Full Release CI.

La tolerancia de aceptación de paquetes heredada está intencionalmente limitada en tiempo. Los paquetes hasta
`2026.4.25` pueden usar la ruta de compatibilidad para lagunas de metadatos ya publicadas
en npm: entradas de inventario de QA privadas que faltan en el archivo tar, `gateway install --wrapper` faltantes,
archivos de parche faltantes en el accesorio git derivado del archivo tar,
`update.channel` persistidos faltantes, ubicaciones de registros de instalación de complementos heredados,
persistencia de registros de instalación del mercado faltante y migración de metadatos de configuración
durante `plugins update`. El paquete `2026.4.26` publicado puede advertir
sobre archivos de sello de metadatos de compilación local que ya se enviaron. Los paquetes posteriores
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

- `smoke`: canales rápidos de instalación/canal/agente de paquete, red de puerta de enlace y recarga
  de configuración
- `package`: contratos de paquetes de instalación/actualización/reinicio/complemento más prueba de instalación de habilidad
  ClawHub en vivo; este es el predeterminado de release-check
- `product`: `package` además de canales MCP, limpieza de cron/subagente, búsqueda web
  de OpenAI y OpenWebUI
- `full`: fragmentos de ruta de lanzamiento de Docker con OpenWebUI
- `custom`: lista `docker_lanes` exacta para reejecuciones enfocadas

Para la prueba de Telegram de candidato a paquete, habilite `telegram_mode=mock-openai` o
`telegram_mode=live-frontier` en la Aceptación de Paquetes. El flujo de trabajo pasa el
tarball `package-under-test` resuelto al carril de Telegram; el flujo de trabajo
independiente de Telegram todavía acepta una especificación npm publicada para verificaciones posteriores a la publicación.

## Automatización de publicación de versiones

`OpenClaw Release Publish` es el punto de entrada de publicación mutable normal. Orquesta
los flujos de trabajo de editor de confianza en el orden que la versión necesita:

1. Extraiga la etiqueta de la versión y resuelva su SHA de confirmación.
2. Verifique que la etiqueta sea accesible desde `main` o `release/*`.
3. Ejecute `pnpm plugins:sync:check`.
4. Despache `Plugin NPM Release` con `publish_scope=all-publishable` y
   `ref=<release-sha>`.
5. Despache `Plugin ClawHub Release` con el mismo alcance y SHA.
6. Despache `OpenClaw NPM Release` con la etiqueta de la versión, la etiqueta de distribución npm y
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

Use los flujos de trabajo de nivel inferior `Plugin NPM Release` y `Plugin ClawHub Release`
solo para trabajo de reparación o republicación enfocada. Para una reparación de complemento seleccionada, pase
`plugin_publish_scope=selected` y `plugins=@openclaw/name` a
`OpenClaw Release Publish`, o despache el flujo de trabajo secundario directamente cuando el
paquete OpenClaw no deba publicarse.

## Entradas del flujo de trabajo NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de versión requerida como `v2026.4.2`, `v2026.4.2-1`, o
  `v2026.4.2-beta.1`; cuando `preflight_only=true`, también puede ser el
  SHA de confirmación de rama de flujo de trabajo actual completo de 40 caracteres para verificación previa de solo validación
- `preflight_only`: `true` para validación/construcción/paquete solo, `false` para la
  ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo reutilice
  el archivo tar preparado de la ejecución de preflight exitosa
- `npm_dist_tag`: etiqueta de destino de npm para la ruta de publicación; por defecto es `beta`

`OpenClaw Release Publish` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida; ya debe existir
- `preflight_run_id`: id de ejecución de preflight `OpenClaw NPM Release` exitosa;
  requerido cuando `publish_openclaw_npm=true`
- `npm_dist_tag`: etiqueta de destino de npm para el paquete OpenClaw
- `plugin_publish_scope`: por defecto es `all-publishable`; use `selected` solo
  para trabajo de reparación enfocado
- `plugins`: nombres de paquetes `@openclaw/*` separados por comas cuando
  `plugin_publish_scope=selected`
- `publish_openclaw_npm`: por defecto es `true`; establezca `false` solo cuando use el
  flujo de trabajo como orquestador de reparación solo para complementos
- `wait_for_clawhub`: por defecto es `false` para que la disponibilidad de npm no esté bloqueada por
  el sidecar ClawHub; establezca `true` solo cuando la finalización del flujo de trabajo deba incluir
  la finalización de ClawHub

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: rama, etiqueta o SHA de confirmación completo para validar. Las comprobaciones que portan secretos
  requieren que la confirmación resuelta sea alcanzable desde una rama o etiqueta de lanzamiento de OpenClaw.
- `run_release_soak`: optar por pruebas exhaustivas live/E2E, ruta de lanzamiento de Docker y
  pruebas de supervivencia de actualización all-since en comprobaciones de lanzamiento estables/predeterminadas. Se fuerza
  activado por `release_profile=full`.

Reglas:

- Las etiquetas estables y de corrección pueden publicarse en `beta` o `latest`
- Las etiquetas de prerelease beta pueden publicarse solo en `beta`
- Para `OpenClaw NPM Release`, se permite la entrada de SHA de confirmación completo solo cuando
  `preflight_only=true`
- `OpenClaw Release Checks` y `Full Release Validation` son siempre
  solo de validación
- La ruta real de publicación debe usar el mismo `npm_dist_tag` usado durante el preflight;
  el flujo de trabajo verifica que los metadatos antes de la publicación continúen

## Secuencia de lanzamiento estable de npm

Al crear un lanzamiento estable de npm:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de confirmación de la rama del flujo de trabajo completo actual
     para una ejecución en seco de solo validación del flujo de trabajo de preflight
2. Elija `npm_dist_tag=beta` para el flujo normal beta-primero, o `latest` solo
   cuando intencionalmente desee una publicación estable directa
3. Ejecute `Full Release Validation` en la rama de lanzamiento, etiqueta de lanzamiento o SHA de
   confirmación completo cuando desee CI normal además de cobertura de caché de solicitudes en vivo, Docker, QA Lab,
   Matrix y Telegram desde un flujo de trabajo manual
4. Si intencionalmente solo necesita el gráfico de pruebas normal determinista, ejecute el
   flujo de trabajo manual `CI` en la referencia de lanzamiento en su lugar
5. Guarde el `preflight_run_id` exitoso
6. Ejecute `OpenClaw Release Publish` con el mismo `tag`, el mismo `npm_dist_tag`,
   y el `preflight_run_id` guardado; publica plugins externalizados en npm
   y ClawHub antes de promover el paquete npm de OpenClaw
7. Si el lanzamiento aterrizó en `beta`, use el flujo de trabajo
   privado `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   para promover esa versión estable de `beta` a `latest`
8. Si el lanzamiento se publicó intencionalmente directamente en `latest` y `beta`
   debe seguir la misma compilación estable inmediatamente, use ese mismo flujo de trabajo
   privado para apuntar ambas dist-tags a la versión estable, o deje que su
   sincronización de autocuración programada mueva `beta` más tarde

La mutación de dist-tag vive en el repositorio privado por seguridad porque aún
requiere `NPM_TOKEN`, mientras que el repositorio público mantiene la publicación solo con OIDC.

Eso mantiene la ruta de publicación directa y la ruta de promoción beta-primero ambas
documentadas y visibles para el operador.

Si un mantenedor debe volver a la autenticación local de npm, ejecute cualquier comando de la CLI de 1Password (`op`) solo dentro de una sesión dedicada de tmux. No llame a `op` directamente desde el shell del agente principal; mantenerlo dentro de tmux hace que las solicitudes, las alertas y el manejo de OTP sean observables y evita alertas repetidas del host.

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
para el manual de procedimientos real.

## Relacionado

- [Canales de lanzamiento](/es/install/development-channels)
