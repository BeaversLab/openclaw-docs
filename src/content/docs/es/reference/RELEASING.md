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
2. Genere la sección superior `CHANGELOG.md` a partir de los PR combinados y todos los commits directos desde la última etiqueta de lanzamiento alcanzable. Mantenga las entradas orientadas al usuario, elimine las entradas duplicadas de PR/commits directos, confirme la reescritura, envíela y realice un rebase/pull una vez más antes de crear la rama.
3. Revise los registros de compatibilidad de lanzamientos en
   `src/plugins/compat/registry.ts` y
   `src/commands/doctor/shared/deprecation-compat.ts`. Elimine la compatibilidad caducada
   solo cuando la ruta de actualización permanezca cubierta, o registre por qué se
   mantiene intencionalmente.
4. Cree `release/YYYY.M.D` desde el `main` actual; no realice el trabajo normal de lanzamiento
   directamente en `main`.
5. Actualice cada ubicación de versión requerida para la etiqueta prevista y luego ejecute
   `pnpm release:prep`. Actualiza las versiones de los complementos, el inventario de complementos, el esquema
   de configuración, los metadatos de configuración del canal incluido, la línea base de la documentación de configuración, las exportaciones
   del SDK de complementos y la línea base de la API del SDK de complementos en el orden correcto. Confirme cualquier derivación
   generada antes de etiquetar. Luego ejecute el previo determinista local:
   `pnpm check:test-types`, `pnpm check:architecture`,
   `pnpm build && pnpm ui:build` y `pnpm release:check`.
6. Ejecute `OpenClaw NPM Release` con `preflight_only=true`. Antes de que exista una etiqueta,
   se permite un SHA de rama de lanzamiento de 40 caracteres completo para el previo
   de solo validación. El previo genera evidencia de lanzamiento de dependencias para el
   gráfico de dependencias exacto desprotegido y lo almacena en el artefacto
   de previo de npm. Guarde el `preflight_run_id` exitoso.
7. Inicie todas las pruebas de previo lanzamiento con `Full Release Validation` para la
   rama de lanzamiento, la etiqueta o el SHA de confirmación completo. Este es el único punto de entrada manual
   para las cuatro grandes cajas de prueba de lanzamiento: Vitest, Docker, QA Lab y Paquete.
8. Si la validación falla, solucionar en la rama de lanzamiento y volver a ejecutar el archivo fallido más pequeño,
   carril, trabajo de flujo de trabajo, perfil de paquete, proveedor, o lista blanca de modelo que
   demuestre la solución. Volver a ejecutar el paraguas completo solo cuando la superficie modificada haga
   que la evidencia previa quede obsoleta.
9. Para beta, etiqueta `vYYYY.M.D-beta.N`, luego ejecuta `pnpm release:candidate -- --tag
vYYYY.M.D-beta.N` from the matching `release/YYYY.M.D` rama. El asistente ejecuta
   las comprobaciones de generated-release locales, despacha o verifica la validación completa
   de lanzamiento y la evidencia de preflight de npm, ejecuta la prueba de paquetes Parallels y Telegram,
   registra los planes de plugin npm y ClawHub, e imprime el comando exacto
   `OpenClaw Release Publish` solo después de que el paquete de evidencia esté verde.
   `OpenClaw Release Publish` despacha los paquetes de plugin seleccionados o publicables
   a npm y el mismo conjunto a ClawHub en paralelo, y luego promueve el
   artefacto de preflight de npm de OpenClaw preparado con la etiqueta de distribución coincidente tan pronto como
   la publicación del plugin en npm tenga éxito.
   Después de que el hijo de publicación de npm de OpenClaw tenga éxito, crea o actualiza la
   página de lanzamiento/prerelease coincidente de GitHub desde la sección
   `CHANGELOG.md` coincidente completa. Los lanzamientos estables publicados en npm `latest` se convierten en el
   último lanzamiento de GitHub; los lanzamientos de mantenimiento estables mantenidos en npm `beta` se
   crean con GitHub `latest=false`. El flujo de trabajo también carga la evidencia de
   dependencias de preflight al lanzamiento de GitHub como
   `openclaw-<version>-dependency-evidence.zip` para la respuesta a incidentes
   posteriores al lanzamiento. El flujo de trabajo de publicación imprime los IDs de ejecución secundarios inmediatamente, aprueba automáticamente
   las puertas de entorno de lanzamiento que el token del flujo de trabajo tiene permiso para aprobar, resume
   los trabajos secundarios fallidos con colas de registro, cierra el lanzamiento de GitHub y la evidencia de
   dependencias tan pronto como la publicación de npm de OpenClaw tiene éxito, espera a ClawHub siempre que
   OpenClaw npm se esté publicando, luego ejecuta `pnpm release:verify-beta` y
   carga la evidencia de postpublicación para el lanzamiento de GitHub, el paquete npm, los paquetes de
   plugin npm seleccionados, los paquetes ClawHub seleccionados, los IDs de ejecución del flujo de trabajo secundario y el
   ID de ejecución opcional de NPM Telegram. La ruta de ClawHub reintentará los fallos transitorios de
   instalación de dependencias de CLI, publicará los plugins que pasen la vista previa incluso cuando una
   celda de vista previa falle, y terminará con la verificación del registro para cada
   versión de plugin esperada, de modo que las publicaciones parciales permanezcan visibles y reintentables. Luego ejecuta la aceptación del paquete posterior a la publicación contra el paquete publicado
   `openclaw@YYYY.M.D-beta.N` o
   `openclaw@beta`. Si una prerelease empujada o publicada necesita una solución,
   genera el siguiente número de prerelease coincidente; no elimines ni reescribas la antigua
   prerelease.
10. Para las versiones estables, continúe solo después de que la beta o el candidato de lanzamiento verificado tenga la evidencia de validación requerida. La publicación npm estable también pasa por `OpenClaw Release Publish`, reutilizando el artefacto de prelanzamiento exitoso a través de `preflight_run_id`; la preparación para el lanzamiento estable de macOS también requiere el `.zip` empaquetado, `.dmg`, `.dSYM.zip` y `appcast.xml` actualizado en `main`. El flujo de trabajo de publicación de macOS publica el appcast firmado en `main` público automáticamente después de que se verifiquen los activos del lanzamiento; si la protección de la rama bloquea el envío directo, abre o actualiza un PR de appcast.
11. Después de la publicación, ejecute el verificador post-publicación de npm, el Telegram E2E independiente publicado-npm opcional
    cuando necesite pruebas del canal post-publicación,
    promoción de dist-tag cuando sea necesario, verifique la página de lanzamiento generada en GitHub,
    y ejecute los pasos del anuncio del lanzamiento.

## Prelanzamiento de la versión

- Ejecute `pnpm check:test-types` antes del prelanzamiento para que el TypeScript de prueba permanezca cubierto fuera del gate local más rápido `pnpm check`
- Ejecute `pnpm check:architecture` antes del prelanzamiento para que las comprobaciones del ciclo de importación más amplio y los límites de la arquitectura estén en verde fuera del gate local más rápido
- Ejecute `pnpm build && pnpm ui:build` antes de `pnpm release:check` para que existan los artefactos de lanzamiento `dist/*` esperados y el paquete Control UI para el paso de validación del paquete
- Ejecute `pnpm release:prep` después de la actualización de la versión raíz y antes de etiquetar. Ejecuta cada generador de lanzamiento determinista que comúnmente se desvía después de un cambio de versión/configuración/API: versiones de complementos, inventario de complementos, esquema de configuración base, metadatos de configuración de canal empaquetado, línea base de documentos de configuración, exportaciones del SDK de complementos y línea base de la API del SDK de complementos. `pnpm release:check` vuelve a ejecutar esos guardias en modo de verificación e informa cada falla de desviación generada que encuentra en un solo paso antes de ejecutar las comprobaciones de lanzamiento del paquete.
- La sincronización de versiones de complementos actualiza las versiones de los paquetes de complementos oficiales y los límites `openclaw.compat.pluginApi` existentes a la versión de lanzamiento de OpenClaw de manera predeterminada. Trate ese campo como el límite de la API del SDK/runtime del complemento, no solo como una copia de la versión del paquete: para lanzamientos solo de complementos que intencionalmente permanecen compatibles con hosts OpenClaw más antiguos, mantenga el límite en la API de host más antigua compatible y documente esa elección en la prueba de lanzamiento del complemento.
- Ejecute el flujo de trabajo manual `Full Release Validation` antes de la aprobación de la versión para
  iniciar todos los cuadros de prueba previos al lanzamiento desde un único punto de entrada. Acepta una rama,
  etiqueta o SHA de confirmación completo, despacha manual `CI` y despacha
  `OpenClaw Release Checks` para pruebas de humo de instalación, aceptación de paquetes, comprobaciones
  de paquetes multi-OS, paridad del QA Lab, rutas Matrix y Telegram. Las ejecuciones
  estables/predeterminadas mantienen las pruebas exhaustivas en vivo/E2E y de inmersión de la ruta de lanzamiento
  de Docker detrás de `run_release_soak=true`; `release_profile=full` fuerza la activación de la inmersión. Con
  `release_profile=full` y `rerun_group=all`, también ejecuta el paquete Telegram
  E2E contra el artefacto `release-package-under-test` de las comprobaciones de lanzamiento.
  Proporcione `release_package_spec` después de publicar una beta para reutilizar el
  paquete npm enviado en todas las comprobaciones de lanzamiento, Aceptación de Paquetes y paquete Telegram
  E2E sin reconstruir el archivo tar de lanzamiento. Proporcione
  `npm_telegram_package_spec` solo cuando Telegram deba usar un
  paquete publicado diferente del resto de la validación de lanzamiento. Proporcione
  `package_acceptance_package_spec` cuando la Aceptación de Paquetes deba usar un
  paquete publicado diferente de la especificación del paquete de lanzamiento. Proporcione
  `evidence_package_spec` cuando el informe de evidencia de lanzamiento deba probar que la
  validación coincide con un paquete npm publicado sin forzar el Telegram E2E.
  Ejemplo:
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Ejecute el flujo de trabajo manual `Package Acceptance` cuando desee una prueba por canal lateral
  para un candidato de paquete mientras continúa el trabajo de lanzamiento. Use `source=npm` para
  `openclaw@beta`, `openclaw@latest`, o una versión de lanzamiento exacta; `source=ref`
  para empaquetar una rama/etiqueta/SHA de `package_ref` confiable con el arnés
  `workflow_ref` actual; `source=url` para un archivo tar HTTPS público con una
  política de URL pública estricta y SHA-256 requerido; `source=trusted-url` para una
  política de fuente confiable nombrada usando `trusted_source_id` requerido y SHA-256; o
  `source=artifact` para un archivo tar cargado por otra ejecución de GitHub Actions. El
  flujo de trabajo resuelve el candidato a
  `package-under-test`, reutiliza el programador de lanzamiento Docker E2E contra ese
  archivo tar, y puede ejecutar Telegram QA contra el mismo archivo tar con
  `telegram_mode=mock-openai` o `telegram_mode=live-frontier`. Cuando los
  carriles Docker seleccionados incluyen `published-upgrade-survivor`, el artefacto
  del paquete es el candidato y `published_upgrade_survivor_baseline` selecciona
  la base publicada. `update-restart-auth` usa el paquete candidato como
  la CLI instalada y el paquete bajo prueba, por lo que ejerce la
  ruta de reinicio administrada del comando de actualización del candidato.
  Ejemplo: `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Perfiles comunes:
  - `smoke`: carriles de install/channel/agent, red de puerta de enlace y recarga de configuración
  - `package`: carriles de paquete/actualización/reinicio/complemento nativos del artefacto sin OpenWebUI ni ClawHub en vivo
  - `product`: perfil de paquete más canales MCP, limpieza de cron/subagente,
    búsqueda web de OpenAI y OpenWebUI
  - `full`: fragmentos de ruta de lanzamiento de Docker con OpenWebUI
  - `custom`: selección exacta de `docker_lanes` para una reejecución enfocada
- Ejecute el flujo de trabajo manual `CI` directamente cuando solo necesite una cobertura completa de CI
  normal para el candidato de lanzamiento. Los envíos manuales de CI omiten el alcance de cambios
  y fuerzan los fragmentos de Linux Node, fragmentos de bundled-plugin, fragmentos de contrato de complemento y canal,
  compatibilidad con Node 22, `check-*`, `check-additional-*`,
  comprobaciones de humo de artefactos construidos, comprobaciones de documentos, habilidades de Python, Windows, macOS,
  Android y carriles i18n de Control UI.
  Ejemplo: `gh workflow run ci.yml --ref release/YYYY.M.D`
- Ejecute `pnpm qa:otel:smoke` al validar la telemetría de lanzamiento. Ejercita
  QA-lab a través de un receptor OTLP/HTTP local y verifica la exportación de trazas, métricas y registros,
  además de los atributos de traza delimitados y la redacción de contenido/identificadores sin
  requerir Opik, Langfuse u otro recopilador externo.
- Ejecute `pnpm qa:otel:collector-smoke` al validar la compatibilidad del recopilador.
  Enruta la misma exportación OTLP de QA-lab a través de un contenedor Docker real de OpenTelemetry Collector
  antes que las aserciones del receptor local.
- Ejecute `pnpm qa:prometheus:smoke` al validar el raspado protegido de Prometheus.
  Ejercita QA-lab, rechaza raspados no autenticados y verifica
  que las familias de métricas críticas para el lanzamiento se mantengan libres de contenido de avisos, identificadores sin procesar,
  tokens de autenticación y rutas locales.
- Ejecute `pnpm qa:observability:smoke` cuando desee los carriles de pruebas de humo de
  OpenTelemetry y Prometheus de source-checkout uno tras otro.
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- El preflight `OpenClaw NPM Release` genera evidencia de lanzamiento de dependencias antes de
  empaquetar el archivo tar de npm. El puerta de vulnerabilidad de asesoramiento de npm es
  bloqueante para el lanzamiento. El riesgo de manifiesto transitivo, superficie de propiedad/instalación
  de dependencias y los informes de cambios de dependencias son solo evidencia de lanzamiento. El
  informe de cambios de dependencias compara el candidato de lanzamiento con la etiqueta
  de lanzamiento alcanzable anterior.
- El preflight carga la evidencia de dependencias como
  `openclaw-release-dependency-evidence-<tag>` y también la incrusta en
  `dependency-evidence/` dentro del artefacto de preflight de npm preparado. La ruta real
  de publicación reutiliza ese artefacto de preflight y luego adjunta la misma evidencia
  al lanzamiento de GitHub como `openclaw-<version>-dependency-evidence.zip`.
- Ejecute `OpenClaw Release Publish` para la secuencia de publicación mutable después de que
  exista la etiqueta. Despáchelo desde `release/YYYY.M.D` (o `main` cuando publique una
  etiqueta alcanzable desde main), pase la etiqueta de lanzamiento y la publicación exitosa de OpenClaw npm
  `preflight_run_id`, y mantenga el alcance de publicación del complemento predeterminado
  `all-publishable` a menos que esté ejecutando deliberadamente una reparación enfocada. El flujo de trabajo serializa la publicación npm del complemento, la publicación del complemento en ClawHub y la publicación npm de OpenClaw para que el paquete principal no se publique antes que sus complementos externalizados.
- Las comprobaciones de lanzamiento ahora se ejecutan en un flujo de trabajo manual separado:
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` también ejecuta el carril de paridad simulada de QA Lab, además del perfil rápido de Matrix en vivo y el carril de QA de Telegram antes de la aprobación del lanzamiento. Los carriles en vivo utilizan el entorno `qa-live-shared`; Telegram también utiliza arrendamientos de credenciales de Convex CI. Ejecute el flujo de trabajo manual `QA-Lab - All Lanes` con
  `matrix_profile=all` y `matrix_shards=true` cuando desee un inventario completo de transporte, medios y E2EE de Matrix en paralelo.
- La validación de tiempo de ejecución de instalación y actualización multi-SO es parte de `OpenClaw Release Checks` y `Full Release Validation` públicos, que llaman al flujo de trabajo reutilizable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directamente
- Esta división es intencional: mantenga la ruta de lanzamiento real de npm corta,
  determinista y centrada en artefactos, mientras que las comprobaciones en vivo más lentas se mantienen en su
  propio carril para que no detengan o bloqueen la publicación
- Las comprobaciones de lanzamiento con secretos deben ser despachadas a través de `Full Release
Validation` or from the `main`/referencia del flujo de trabajo de lanzamiento para que la lógica del flujo de trabajo y
  los secretos permanezcan controlados
- `OpenClaw Release Checks` acepta una rama, etiqueta o SHA de confirmación completo siempre
  que la confirmación resuelta sea alcanzable desde una rama de OpenClaw o una etiqueta de lanzamiento
- El preflichto de solo validación `OpenClaw NPM Release` también acepta el
  SHA de confirmación completo de 40 caracteres de la rama del flujo de trabajo actual sin requerir una etiqueta enviada
- Esa ruta SHA es solo de validación y no puede promocionarse a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la
  verificación de metadatos del paquete; la publicación real aún requiere una etiqueta de lanzamiento real
- Ambos flujos de trabajo mantienen la ruta de publicación y promoción real en ejecutores
  alojados en GitHub, mientras que la ruta de validación no mutante puede usar los ejecutores
  Linux de Blacksmith más grandes
- Ese flujo de trabajo ejecuta
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  utilizando tanto los secretos de flujo de trabajo `OPENAI_API_KEY` como `ANTHROPIC_API_KEY`
- El prelanzamiento de npm ya no espera al carril separado de verificaciones de lanzamiento
- Antes de etiquetar un candidato de lanzamiento localmente, ejecute
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. El asistente
  ejecuta los guardarraíles rápidos de lanzamiento, las verificaciones de lanzamiento de plugin npm/ClawHub, la compilación,
  la compilación de la UI y `release:openclaw:npm:check` en el orden que detecta errores comunes
  que bloquean la aprobación antes de que comience el flujo de trabajo de publicación en GitHub.
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/correction coincidente) antes de la aprobación
- Después de npm publish, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/correction coincidente) para verificar la ruta de instalación
  del registro publicado en un prefijo temporal nuevo
- Después de una publicación beta, ejecute `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  para verificar la incorporación del paquete instalado, la configuración de Telegram y el E2E real de Telegram
  contra el paquete npm publicado usando el grupo compartido de credenciales de Telegram arrendadas.
  Las ejecuciones individuales del mantenedor local pueden omitir las variables de Convex y pasar las tres
  credenciales de entorno `OPENCLAW_QA_TELEGRAM_*` directamente.
- Para ejecutar la prueba de humo completa post-publicación beta desde una máquina de mantenedor, use `pnpm release:beta-smoke -- --beta betaN`. El asistente ejecuta la validación de actualización/destino nuevo de npm Parallels, despacha `NPM Telegram Beta E2E`, sondea la ejecución exacta del flujo de trabajo, descarga el artefacto e imprime el informe de Telegram.
- Los mantenedores pueden ejecutar la misma verificación post-publicación desde GitHub Actions mediante el
  flujo de trabajo manual `NPM Telegram Beta E2E`. Es intencionalmente solo manual y
  no se ejecuta en cada fusión.
- La automatización de lanzamiento del mantenedor ahora usa preflight-then-promote:
  - la publicación real de npm debe pasar un `preflight_run_id` de npm exitoso
  - la publicación real de npm debe despacharse desde la misma rama `main` o
    `release/YYYY.M.D` que la ejecución de preflight exitosa
  - las versiones estables de npm por defecto son `beta`
  - la publicación estable en npm puede apuntar a `latest` explícitamente mediante entrada de flujo de trabajo
  - la mutación de dist-tag de npm basada en tokens ahora reside en
    `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` porque
    `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras que el repositorio fuente mantiene
    publicación solo OIDC
  - el `macOS Release` público es solo de validación; cuando una etiqueta vive solo en una
    rama de lanzamiento pero el flujo de trabajo se despacha desde `main`, configure
    `public_release_branch=release/YYYY.M.D`
  - la publicación real en macOS debe pasar pruebas exitosas de `preflight_run_id` y
    `validate_run_id` en macOS
  - las rutas de publicación reales promueven los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para lanzamientos de corrección estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de lanzamiento no dejen silenciosamente instalaciones globales antiguas en el
  carga útil estable base
- la verificación previa al lanzamiento de npm falla cerrado a menos que el tarball incluya ambos
  `dist/control-ui/index.html` y una carga útil `dist/control-ui/assets/` no vacía
  para no enviar un tablero de navegador vacío nuevamente
- La verificación posterior a la publicación también verifica que los puntos de entrada de los complementos publicados y
  los metadatos del paquete estén presentes en el diseño del registro instalado. Un lanzamiento que
  envía cargas útiles de tiempo de ejecución de complementos faltantes falla el verificador posterior a la publicación y
  no puede ser promovido a `latest`.
- `pnpm test:install:smoke` también impone el presupuesto `unpackedSize` de npm pack en
  el tarball de actualización candidata, por lo que el instalador e2e detecta hinchazón accidental del paquete
  antes de la ruta de publicación del lanzamiento
- Si el trabajo de lanzamiento tocó la planificación de CI, los manifiestos de sincronización de extensiones o
  las matrices de prueba de extensiones, regenere y revise las `plugin-prerelease-extension-shard` de matriz propiedad del planificador
  desde `.github/workflows/plugin-prerelease.yml` antes de la aprobación para que las notas de la versión no
  describan un diseño de CI obsoleto
- La preparación para el lanzamiento estable de macOS también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con los `.zip`, `.dmg` y `.dSYM.zip` empaquetados
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación; el flujo de trabajo de publicación de macOS lo confirma automáticamente o abre un PR de appcast cuando el push directo está bloqueado
  - la aplicación empaquetada debe mantener un id de bundle que no sea de depuración, una URL de canalización Sparkle no vacía y un `CFBundleVersion` en o por encima del límite de compilación canónica de Sparkle para esa versión de lanzamiento

## Casos de prueba de lanzamiento

`Full Release Validation` es la forma en que los operadores inician todas las pruebas de prelanzamiento desde un solo punto de entrada. Para una prueba de compromiso fijado en una rama de rápido movimiento, use el asistente para que cada flujo de trabajo secundario se ejecute desde una rama temporal fijada en el SHA objetivo:

```bash
pnpm ci:full-release --sha <full-sha>
```

El asistente hace push de `release-ci/<sha>-...`, despacha `Full Release Validation` desde esa rama con `ref=<sha>`, verifica que cada `headSha` de flujo de trabajo secundario coincida con el objetivo y luego elimina la rama temporal. Esto evita probar por accidente una ejecución secundaria más reciente de `main`.

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

El flujo de trabajo resuelve la referencia de destino, envía manual `CI` con
`target_ref=<release-ref>`, envía `OpenClaw Release Checks`, prepara un
artefacto principal `release-package-under-test` para verificaciones orientadas al paquete y
despacha Telegram E2E de paquete independiente cuando `release_profile=full` con
`rerun_group=all` o cuando se establece `release_package_spec` o
`npm_telegram_package_spec`. Las `Verificaciones de lanzamiento de
OpenClaw` luego distribuyen pruebas de humo de instalación, verificaciones de lanzamiento multi-SO, cobertura de ruta de lanzamiento Docker en vivo/E2E cuando soak está habilitado, Aceptación de paquete con QA de paquete Telegram, paridad de QA Lab, Matrix en vivo y Telegram en vivo. Una ejecución completa solo es aceptable cuando el
resumen de `Full Release Validation`
muestra `normal_ci` y `release_checks` como exitosos. En modo completo/all,
el hijo `npm_telegram` también debe ser exitoso; fuera de completo/all se omite
a menos que se haya proporcionado un `release_package_spec` o `npm_telegram_package_spec` publicado.
El resumen final del verificador incluye tablas de trabajos más lentos para cada ejecución secundaria, para que el
gestor de lanzamientos pueda ver la ruta crítica actual sin descargar registros.
Consulte [Validación de lanzamiento completa](/es/reference/full-release-validation) para la
matriz de etapas completa, nombres exactos de trabajos de flujo de trabajo, diferencias entre el perfil estable y completo, artefactos y manejadores de nueva ejecución enfocada.
Los flujos de trabajo secundarios se envían desde la referencia de confianza que ejecuta `Validación de lanzamiento
completa`, normally `--ref main`, even when the target `ref` apunta a una
rama o etiqueta de lanzamiento anterior. No hay una entrada de referencia de flujo de trabajo de Validación de lanzamiento completa separada; elija el arnés de confianza eligiendo la referencia de ejecución del flujo de trabajo.
No use `--ref main -f ref=<sha>` para prueba de confirmación exacta en `main` en movimiento;
los SHA de confirmación sin procesar no pueden ser referencias de envío de flujo de trabajo, así que use
`pnpm ci:full-release --sha <sha>` para crear la rama temporal anclada.

Use `release_profile` para seleccionar la amplitud en vivo/proveedor:

- `minimum`: ruta de lanzamiento crítica más rápida OpenAI/core en vivo y Docker
- `stable`: cobertura mínima más proveedor/backend estable para la aprobación de la versión
- `full`: estable más amplia cobertura de proveedor/medio consultivo

Use `run_release_soak=true` con `stable` cuando los carriles que bloquean la versión estén
despachados y quiera el barrido exhaustivo de vivo/E2E, ruta de lanzamiento de Docker y
sobreviviente de actualización publicado limitado antes de la promoción. Ese barrido cubre
los últimos cuatro paquetes estables más las líneas base fijas `2026.4.23` y `2026.5.2`
más la cobertura de `2026.4.15` anteriores, con líneas base duplicadas eliminadas y
cada línea base dividida en su propio trabajo de ejecución Docker. `full` implica
`run_release_soak=true`.

`OpenClaw Release Checks` usa la referencia de flujo de trabajo de confianza para resolver la referencia
destino una vez como `release-package-under-test` y reutiliza ese artefacto en verificaciones entre sistemas operativos,
Aceptación de Paquetes y ruta de lanzamiento de Docker cuando se ejecutan pruebas de estabilización. Esto mantiene
todas las cajas orientadas a paquetes en los mismos bytes y evita compilaciones de paquetes repetidas.
Después de que una beta ya esté en npm, configure `release_package_spec=openclaw@YYYY.M.D-beta.N`
para que las verificaciones de lanzamiento descarguen el paquete enviado una vez, extraigan su SHA de fuente de compilación
de `dist/build-info.json` y reutilicen ese artefacto para carriles entre sistemas operativos,
Aceptación de Paquetes, ruta de lanzamiento de Docker y Telegram de paquetes.
La prueba de instalación de OpenAI entre sistemas operativos usa `OPENCLAW_CROSS_OS_OPENAI_MODEL` cuando la
variable de repositorio/org está configurada, de lo contrario `openai/gpt-5.4`, porque este carril está
demostrando la instalación del paquete, incorporación, inicio de la puerta de enlace y un turno de agente en vivo
en lugar de evaluar el modelo predeterminado más lento. La matriz más amplia de proveedores en vivo
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

No uses el paraguas completo como la primera nueva ejecución después de una corrección enfocada. Si falla una caja, usa el flujo de trabajo secundario, el trabajo, el carril de Docker, el perfil de paquete, el proveedor de modelos o el carril de QA fallado para la siguiente prueba. Vuelve a ejecutar el paraguas completo solo cuando la corrección cambió la orquestación de lanzamiento compartida o hizo que las evidencias de todas las cajas anteriores quedaran obsoletas. El verificador final del paraguas vuelve a verificar los IDs de ejecución del flujo de trabajo secundario registrados, por lo que después de que un flujo de trabajo secundario se ejecuta nuevamente con éxito, vuelve a ejecutar solo el trabajo principal `Verify full validation` fallido.

Para una recuperación limitada, pasa `rerun_group` al paraguas. `all` es la ejecución real de candidato de lanzamiento, `ci` ejecuta solo el hijo de CI normal, `plugin-prerelease` ejecuta solo el hijo del complemento solo de lanzamiento, `release-checks` ejecuta todas las cajas de lanzamiento, y los grupos de lanzamiento más estrechos son `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` y `npm-telegram`. Las nuevas ejecuciones enfocadas de `npm-telegram` requieren `release_package_spec` o `npm_telegram_package_spec`; las ejecuciones completas/totales con `release_profile=full` usan el artefacto del paquete release-checks. Las nuevas ejecuciones enfocadas entre sistemas operativos pueden agregar `cross_os_suite_filter=windows/packaged-upgrade` u otro filtro de sistema operativo/suite. Los fallos de release-check de QA son consultivos, excepto la puerta de cobertura de herramientas de tiempo de ejecución estándar, la cual bloquea la validación de lanzamiento cuando las herramientas dinámicas requeridas de OpenClaw cambian o desaparecen del resumen de nivel estándar.

### Vitest

La caja Vitest es el flujo de trabajo secundario manual `CI`. El CI manual omite intencionalmente el alcance de cambios y fuerza el gráfico de pruebas normal para el candidato de lanzamiento: fragmentos de Linux Node, fragmentos de complementos empaquetados, fragmentos de contratos de complementos y canales, compatibilidad con Node 22, `check-*`, `check-additional-*`, comprobaciones de humo de artefactos construidos, comprobaciones de documentación, habilidades de Python, Windows, macOS, Android e i18n de la Interfaz de Usuario de Control.

Use este recuadro para responder "¿pasó el árbol de origen el suite de pruebas normal completo?"
No es lo mismo que la validación del producto de la ruta de lanzamiento. Evidencia a conservar:

- `Full Release Validation` resumen que muestra la URL de ejecución `CI` enviada
- ejecución `CI` en verde en el SHA objetivo exacto
- nombres de fragmentos (shards) fallidos o lentos de los trabajos de CI al investigar regresiones
- artefactos de tiempo de Vitest, como `.artifacts/vitest-shard-timings.json`, cuando
  una ejecución necesita análisis de rendimiento

Ejecute el CI manual directamente solo cuando el lanzamiento necesite un CI normal determinista pero
no los cuadros de Docker, QA Lab, live, cross-OS o package:

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

El cuadro Docker vive en `OpenClaw Release Checks` a través de
`openclaw-live-and-e2e-checks-reusable.yml`, además del flujo de trabajo
`install-smoke` en modo de lanzamiento. Valida el candidato de lanzamiento a través de entornos
Docker empaquetados en lugar de solo pruebas a nivel de fuente.

La cobertura de Docker de lanzamiento incluye:

- smoke de instalación completa con el smoke de instalación global lenta de Bun habilitado
- preparación/reutilización de la imagen de smoke del Dockerfile raíz por SHA objetivo, con QR,
  root/gateway, y trabajos de smoke de installer/Bun ejecutándose como fragmentos de install-smoke
  separados
- carriles E2E del repositorio
- fragmentos Docker de la ruta de lanzamiento: `core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g` y `plugins-runtime-install-h`
- cobertura de OpenWebUI dentro del fragmento `plugins-runtime-services` cuando se solicite
- carriles divididos de instalación/desinstalación de complementos empaquetados
  `bundled-plugin-install-uninstall-0` a través de
  `bundled-plugin-install-uninstall-23`
- suites de proveedores live/E2E y cobertura del modelo live de Docker cuando las comprobaciones de lanzamiento
  incluyen suites live

Use Docker artifacts before rerunning. The release-path scheduler uploads
`.artifacts/docker-tests/` with lane logs, `summary.json`, `failures.json`,
phase timings, scheduler plan JSON, and rerun commands. For focused recovery,
use `docker_lanes=<lane[,lane]>` on the reusable live/E2E workflow instead of
rerunning all release chunks. Generated rerun commands include prior
`package_artifact_run_id` and prepared Docker image inputs when available, so a
failed lane can reuse the same tarball and GHCR images.

### Laboratorio de QA

El cuadro del Laboratorio de QA también es parte de `OpenClaw Release Checks`. Es el comportamiento agéntico
y el paso de control de lanzamiento a nivel de canal, separado de Vitest y Docker
mecánica de paquetes.

La cobertura del Laboratorio de QA de lanzamiento incluye:

- carril de paridad simulada comparando el carril candidato de OpenAI con el Opus 4.6
  línea de base utilizando el paquete de paridad agéntica
- perfil de QA rápido de Matrix en vivo usando el entorno `qa-live-shared`
- carril de QA de Telegram en vivo usando arrendamientos de credenciales de Convex CI
- `pnpm qa:otel:smoke`, `pnpm qa:otel:collector-smoke`,
  `pnpm qa:prometheus:smoke`, or
  `pnpm qa:observability:smoke` cuando la telemetría de lanzamiento necesita prueba local explícita

Use este cuadro para responder "¿se comporta el lanzamiento correctamente en escenarios de QA y
flujos de canales en vivo?" Conserve las URL de artefactos para paridad, Matrix y Telegram
carriles al aprobar el lanzamiento. La cobertura completa de Matrix sigue disponible como una
ejecución manual fragmentada de QA-Lab en lugar del carril crítico de lanzamiento predeterminado.

### Paquete

El cuadro Paquete es el paso de control del producto instalable. Está respaldado por
`Package Acceptance` y el solucionador
`scripts/resolve-openclaw-package-candidate.mjs`. El solucionador normaliza un
candidato en el archivo tar `package-under-test` consumido por Docker E2E, valida
el inventario de paquetes, registra la versión del paquete y SHA-256, y mantiene la
referencia del arnés del flujo de trabajo separada de la referencia de origen del paquete.

Fuentes de candidatos admitidas:

- `source=npm`: `openclaw@beta`, `openclaw@latest`, o una versión exacta de lanzamiento de OpenClaw
- `source=ref`: empaqueta una rama `package_ref` de confianza, una etiqueta o un SHA de confirmación completo
  con el arnés `workflow_ref` seleccionado
- `source=url`: descarga un HTTPS `.tgz` público con `package_sha256` requeridos;
  se rechazan las credenciales de URL, puertos HTTPS no predeterminados, nombres de host
  privados/internos/de uso especial o direcciones resueltas, y redirecciones no seguras
- `source=trusted-url`: descarga un HTTPS `.tgz` con `package_sha256` requeridos
  y `trusted_source_id` de una política con nombre en
  `.github/package-trusted-sources.json`; use esto para repositorios empresariales propiedad de los mantenedores
  o repositorios de paquetes privados en lugar de agregar una omisión
  de red privada a nivel de entrada a `source=url`
- `source=artifact`: reutiliza un `.tgz` cargado por otra ejecución de GitHub Actions

`OpenClaw Release Checks` ejecuta Package Acceptance con `source=artifact`, el
artefacto del paquete de lanzamiento preparado, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. Package Acceptance mantiene la migración, actualización,
reinicio de actualización de autenticación configurada, instalación en vivo de la habilidad ClawHub, limpieza de dependencias de complementos obsoletos, accesorios de complementos sin conexión, actualización de complementos y QA de paquetes de Telegram contra el mismo tarball resuelto.
Las comprobaciones de bloqueo de lanzamiento utilizan la línea base del último paquete publicado por defecto; `run_release_soak=true` o
`release_profile=full` se expande a cada línea base estable publicada en npm desde
`2026.4.23` hasta `latest` además de los accesorios de problemas reportados. Use
Package Acceptance con `source=npm` para un candidato ya enviado,
`source=ref` para un tarball npm local respaldado por SHA antes de la publicación,
`source=trusted-url` para un espeque empresarial/privado propiedad del mantenedor, o
`source=artifact` para un tarball preparado cargado por otra ejecución de GitHub Actions.
Es el reemplazo nativo de GitHub para la mayor parte de la cobertura de paquetes/actualizaciones que anteriormente requerían
Parallels. Las comprobaciones de lanzamiento multi-SO siguen siendo importantes para el incorporación específica del SO,
el instalador y el comportamiento de la plataforma, pero la validación del producto de paquetes/actualizaciones debe
preferir Package Acceptance.

La lista de verificación canónica para la validación de actualizaciones y complementos es
[Testing updates and plugins](/es/help/testing-updates-plugins). Úsela al
decidir qué carril local, Docker, Package Acceptance o de comprobación de lanzamiento demuestra un
cambio de instalación/actualización de complementos, limpieza de doctor o migración de paquetes publicados.
La migración exhaustiva de actualizaciones publicadas desde cada paquete estable `2026.4.23+` es
un flujo de trabajo manual `Update Migration` separado, no parte de Full Release CI.

La tolerancia heredada de aceptación de paquetes está limitada intencionalmente en el tiempo. Los paquetes a través de `2026.4.25` pueden usar la ruta de compatibilidad para lagunas de metadatos ya publicadas en npm: entradas de inventario de QA privadas que faltan en el archivo tar, `gateway install --wrapper` faltantes, archivos de parche faltantes en el accesorio git derivado del tar, `update.channel` persistidos faltantes, ubicaciones de registros de instalación de complementos heredadas, persistencia de registros de instalación del mercado faltante, y migración de metadatos de configuración durante `plugins update`. El paquete `2026.4.26` publicado puede advertir sobre archivos de sello de metadatos de compilación local que ya se han enviado. Los paquetes posteriores deben cumplir los contratos de paquetes modernos; esas mismas lagunas provocan fallas en la validación de la versión.

Use perfiles de aceptación de paquetes más amplios cuando la pregunta de la versión se trate de un paquete instalable real:

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
- `package`: contratos de instalación/actualización/reinicio/complemento de paquetes más prueba de instalación de habilidades en vivo de ClawHub; este es el valor predeterminado de release-check
- `product`: `package` más canales MCP, limpieza de cron/subagente, búsqueda web de OpenAI y OpenWebUI
- `full`: fragmentos de ruta de versión de Docker con OpenWebUI
- `custom`: lista exacta de `docker_lanes` para reejecuciones enfocadas

Para la prueba de Telegram de candidatos a paquetes, habilite `telegram_mode=mock-openai` o `telegram_mode=live-frontier` en la aceptación de paquetes. El flujo de trabajo pasa el archivo tar `package-under-test` resuelto al carril de Telegram; el flujo de trabajo independiente de Telegram todavía acepta una especificación npm publicada para verificaciones posteriores a la publicación.

## Automatización de publicación de versiones

`OpenClaw Release Publish` es el punto de entrada de publicación de mutación normal. Orquesta los flujos de trabajo de editor de confianza en el orden que la versión necesita:

1. Consulte la etiqueta de la versión y resuelva su SHA de confirmación.
2. Verifique que la etiqueta sea accesible desde `main` o `release/*`.
3. Ejecute `pnpm plugins:sync:check`.
4. Ejecuta `Plugin NPM Release` con `publish_scope=all-publishable` y
   `ref=<release-sha>`.
5. Ejecuta `Plugin ClawHub Release` con el mismo ámbito y SHA.
6. Ejecuta `OpenClaw NPM Release` con la etiqueta de lanzamiento, etiqueta de distribución npm y
   `preflight_run_id` guardada.

Ejemplo de publicación beta:

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Publicación estable a la etiqueta de distribución beta predeterminada:

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

Usa los flujos de trabajo de menor nivel `Plugin NPM Release` y `Plugin ClawHub Release`
solo para trabajos de reparación o republicación enfocados. `OpenClaw Release Publish` rechaza
`plugin_publish_scope=selected` cuando `publish_openclaw_npm=true`, por lo que el paquete
central no enviarse sin cada complemento oficial publicable, incluyendo
`@openclaw/diffs-language-pack`. Para una reparación de complemento seleccionada, configura
`publish_openclaw_npm=false` con `plugin_publish_scope=selected` y
`plugins=@openclaw/name`, o ejecuta el flujo de trabajo secundario directamente.

## Entradas del flujo de trabajo de NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida como `v2026.4.2`, `v2026.4.2-1` o
  `v2026.4.2-beta.1`; cuando `preflight_only=true`, también puede ser el
  SHA de confirmación de la rama de flujo de trabajo completo de 40 caracteres actual para prevalidación de solo validación
- `preflight_only`: `true` para validación/construcción/empaquetado solamente, `false` para la
  ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo reutilice
  el archivo tar preparado de la ejecución de prevalidación exitosa
- `npm_dist_tag`: etiqueta de destino npm para la ruta de publicación; predeterminado a `beta`

`OpenClaw Release Publish` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida; ya debe existir
- `preflight_run_id`: id de ejecución de prevalidación `OpenClaw NPM Release` exitosa;
  requerido cuando `publish_openclaw_npm=true`
- `npm_dist_tag`: etiqueta de destino npm para el paquete OpenClaw
- `plugin_publish_scope`: por defecto es `all-publishable`; use `selected` solo
  para trabajo de reparación enfocado solo en complementos con `publish_openclaw_npm=false`
- `plugins`: nombres de paquetes `@openclaw/*` separados por comas cuando
  `plugin_publish_scope=selected`
- `publish_openclaw_npm`: por defecto es `true`; establezca `false` solo cuando use el
  flujo de trabajo como orquestador de reparación solo de complementos
- `wait_for_clawhub`: por defecto es `false` para que la disponibilidad de npm no se bloquee por
  el sidecar ClawHub; establezca `true` solo cuando la finalización del flujo de trabajo deba incluir
  la finalización de ClawHub

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: rama, etiqueta o SHA de confirmación completo para validar. Las comprobaciones que portan secretos
  requieren que la confirmación resuelta sea alcanzable desde una rama OpenClaw o
  una etiqueta de lanzamiento.
- `run_release_soak`: optar por pruebas exhaustivas en vivo/E2E, ruta de lanzamiento de Docker y
  pruebas de mejora de superviviente desde todas las versiones en comprobaciones de lanzamiento estables/predeterminadas. Se fuerza
  activo por `release_profile=full`.

Reglas:

- Las etiquetas estables y de corrección pueden publicarse en `beta` o `latest`
- Las etiquetas de previo lanzamiento beta solo pueden publicarse en `beta`
- Para `OpenClaw NPM Release`, la entrada de SHA de confirmación completa solo se permite cuando
  `preflight_only=true`
- `OpenClaw Release Checks` y `Full Release Validation` son siempre
  solo validación
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante el preflight;
  el flujo de trabajo verifica esos metadatos antes de continuar con la publicación

## Secuencia de lanzamiento estable de npm

Al realizar un lanzamiento estable de npm:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de confirmación completo de la rama de flujo de trabajo actual
     para una ejecución en seco de solo validación del flujo de trabajo de preflight
2. Elija `npm_dist_tag=beta` para el flujo normal de beta primero, o `latest` solo
   cuando intencionalmente desee una publicación estable directa
3. Ejecute `Full Release Validation` en la rama de lanzamiento, etiqueta de lanzamiento o SHA
   de confirmación completo cuando desee CI normal más caché de avisos en vivo, Docker, QA Lab,
   Matrix y cobertura de Telegram desde un flujo de trabajo manual
4. Si intencionalmente solo necesita el gráfico de pruebas normal determinista, ejecute el
   flujo de trabajo manual `CI` en la referencia de lanzamiento en su lugar
5. Guarde el `preflight_run_id` exitoso
6. Ejecute `OpenClaw Release Publish` con el mismo `tag`, el mismo `npm_dist_tag`,
   y el `preflight_run_id` guardado; publica plugins externalizados en npm
   y ClawHub antes de promocionar el paquete OpenClaw npm
7. Si el lanzamiento aterrizó en `beta`, use el
   flujo de trabajo `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml`
   para promocionar esa versión estable de `beta` a `latest`
8. Si el lanzamiento se publicó intencionalmente directamente en `latest` y `beta`
   debe seguir la misma compilación estable inmediatamente, use ese mismo flujo de trabajo
   de lanzamiento para apuntar ambas dist-tags a la versión estable, o deje que su sincronización
   programada de autocuración mueva `beta` más tarde

La mutación de dist-tag vive en el repositorio del libro mayor de lanzamientos porque todavía requiere
`NPM_TOKEN`, mientras que el repositorio de origen mantiene publicación solo OIDC.

Eso mantiene la ruta de publicación directa y la ruta de promoción beta primero ambas
documentadas y visibles para el operador.

Si un mantenedor debe volver a la autenticación npm local, ejecute cualquier comando
de CLI de 1Password (`op`) solo dentro de una sesión tmux dedicada. No llame a `op`
directamente desde el shell del agente principal; mantenerlo dentro de tmux hace que los avisos,
alertas y el manejo de OTP sean observables y evita alertas de host repetidas.

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

Los mantenedores utilizan los documentos de lanzamiento privados en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos real.

## Relacionado

- [Canales de lanzamiento](/es/install/development-channels)
