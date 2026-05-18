---
summary: "Cómo OpenClaw valida las rutas de actualización, las migraciones de paquetes y el comportamiento de instalación/actualización de complementos"
read_when:
  - Changing OpenClaw update, doctor, package acceptance, or plugin install behavior
  - Preparing or approving a release candidate
  - Debugging package update, plugin dependency cleanup, or plugin install regressions
title: "Pruebas: actualizaciones y complementos"
sidebarTitle: "Pruebas de actualización y complementos"
---

Esta es la lista de verificación dedicada para la validación de actualizaciones y complementos. El objetivo es
simple: demostrar que el paquete instalable puede actualizar el estado real del usuario, reparar el estado
heredado obsoleto a través de `doctor`, y aún así instalar, cargar, actualizar y desinstalar
complementos desde las fuentes compatibles.

Para el mapa más amplio del ejecutor de pruebas, consulte [Pruebas](/es/help/testing). Para las claves de
proveedor en vivo y las suites que tocan la red, consulte [Pruebas en vivo](/es/help/testing-live).

## Lo que protegemos

Las pruebas de actualización y complementos protegen estos contratos:

- Un archivo tarball del paquete está completo, tiene un `dist/postinstall-inventory.json` válido
  y no depende de archivos del repositorio desempaquetados.
- Un usuario puede pasar de un paquete publicado antiguo al paquete candidato
  sin perder la configuración, los agentes, las sesiones, los espacios de trabajo, las listas de permisos de complementos o
  la configuración del canal.
- `openclaw doctor --fix --non-interactive` posee las rutas de limpieza y reparación
  heredadas. El inicio no debe aumentar las migraciones de compatibilidad ocultas para el estado
  obsoleto de los complementos.
- Las instalaciones de complementos funcionan desde directorios locales, repositorios git, paquetes npm y la
  ruta del registro ClawHub.
- Las dependencias npm de los complementos se instalan en la raíz npm administrada, se escanean antes
  de la confianza y se eliminan a través de npm durante la desinstalación para que las dependencias promovidas no
  permanezcan.
- La actualización del complemento es estable cuando no hubo cambios: los registros de instalación, la fuente
  resuelta, el diseño de dependencias instaladas y el estado habilitado permanecen intactos.

## Prueba local durante el desarrollo

Comience de forma limitada:

```bash
pnpm changed:lanes --json
pnpm check:changed
pnpm test:changed
```

Para cambios en la instalación, desinstalación, dependencia o inventario de paquetes de complementos, también
ejecute las pruebas enfocadas que cubran la costura editada:

```bash
pnpm test src/plugins/uninstall.test.ts src/infra/package-dist-inventory.test.ts test/scripts/package-acceptance-workflow.test.ts
```

Antes de que cualquier carril Docker de paquete consuma un tarball, demuestre el artefacto del paquete:

```bash
pnpm release:check
```

`release:check` ejecuta verificaciones de deriva de configuración/documentos/API, escribe el inventario
dist del paquete, ejecuta `npm pack --dry-run`, rechaza archivos empaquetados prohibidos, instala
el tarball en un prefijo temporal, ejecuta postinstall y prueba los puntos de entrada
del canal incluido.

## Carriles Docker

Los carriles de Docker son la prueba a nivel de producto. Instalan o actualizan un paquete real dentro de contenedores de Linux y verifican el comportamiento a través de comandos CLI, inicio de Gateway, sondas HTTP, estado RPC y estado del sistema de archivos.

Utiliza carriles enfocados mientras iteras:

```bash
pnpm test:docker:plugins
pnpm test:docker:plugin-lifecycle-matrix
pnpm test:docker:plugin-update
pnpm test:docker:upgrade-survivor
pnpm test:docker:published-upgrade-survivor
pnpm test:docker:update-restart-auth
pnpm test:docker:update-migration
```

Carriles importantes:

- `test:docker:plugins` valida el smoke test de instalación de complementos, instalaciones de carpetas locales,
  comportamiento de omisión de actualización de carpetas locales, carpetas locales con dependencias
  preinstaladas, instalaciones de paquetes `file:`, instalaciones de git con ejecución de CLI, actualizaciones
  de referencia móvil en git, instalaciones del registro npm con dependencias transitivas izadas, no-ops de
  actualización npm, rechazo de metadatos de paquete npm mal formados, instalaciones de fixtures locales
  de ClawHub y no-ops de actualización, comportamiento de actualización del marketplace,
  y habilitación/inspección de Claude-bundle. Configure `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` para
  mantener el bloque ClawHub hermético/fuera de línea.
- `test:docker:plugin-lifecycle-matrix` instala el paquete candidato en un contenedor vacío, ejecuta un complemento npm a través de instalación, inspección, desactivación, activación, actualización explícita, downgrade explícito y desinstalación después de eliminar el código del complemento. Registra métricas de RSS y CPU para cada fase.
- `test:docker:plugin-update` valida que un complemento instalado sin cambios no se reinstale ni pierda los metadatos de instalación durante `openclaw plugins update`.
- `test:docker:upgrade-survivor` instala el archivo tar del candidato sobre un accesorio de usuario antiguo sucio, ejecuta la actualización del paquete más el doctor no interactivo, luego inicia un Gateway de bucle de retorno y verifica la preservación del estado.
- `test:docker:published-upgrade-survivor` primero instala una línea base publicada, la configura a través de una receta `openclaw config set` horneada, la actualiza al archivo tar del candidato, ejecuta el doctor, verifica la limpieza del legado, inicia el Gateway y sondea `/healthz`, `/readyz` y el estado RPC.
- `test:docker:update-restart-auth` instala el paquete candidato, inicia un Gateway administrado con autenticación de token, desactiva el entorno de autenticación de la pasarela llamante para `openclaw update --yes --json` y requiere que el comando de actualización del candidato reinicie el Gateway antes de las sondas normales.
- `test:docker:update-migration` es el carril de actualización publicada con énfasis en la limpieza. Comienza desde un estado de usuario configurado al estilo Discord/Telegram, ejecuta el médico de línea base para que las dependencias de complementos configuradas tengan la oportunidad de materializarse, siembra restos de dependencias de complementos heredadas para un complemento empaquetado configurado, actualiza al archivo tar del candidato y requiere un médico posterior a la actualización para eliminar las raíces de las dependencias heredadas.

Variantes de supervivientes de actualización publicada útiles:

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

Los escenarios disponibles son `base`, `feishu-channel`, `bootstrap-persona`,
`plugin-deps-cleanup`, `configured-plugin-installs`,
`stale-source-plugin-shadow`, `tilde-log-path` y `versioned-runtime-deps`. En ejecuciones agregadas,
`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` se expande a todos los
escenarios con forma de problema reportados, incluyendo la migración de instalación del complemento configurado.

La migración de actualización completa está separada intencionalmente del CI de lanzamiento completo. Utilice el flujo de trabajo manual `Update Migration` cuando la pregunta de lanzamiento sea "¿puede cada versión estable publicada a partir del 23.04.2026 actualizarse a este candidato y limpiar los restos de las dependencias de los complementos?":

```bash
gh workflow run update-migration.yml \
  --ref main \
  -f workflow_ref=main \
  -f package_ref=main \
  -f baselines=all-since-2026.4.23 \
  -f scenarios=plugin-deps-cleanup
```

## Aceptación de Paquetes

La Aceptación de Paquetes es la puerta de enlace de paquetes nativa de GitHub. Resuelve un paquete candidato en un archivo tar `package-under-test`, registra la versión y SHA-256, y luego ejecuta carriles E2E de Docker reutilizables contra ese archivo tar exacto. La referencia del arnés del flujo de trabajo es independiente de la referencia de origen del paquete, por lo que la lógica de prueba actual puede validar versiones confiables anteriores.

Fuentes de candidatos:

- `source=npm`: validar `openclaw@beta`, `openclaw@latest` o una versión
  publicada exacta.
- `source=ref`: empaquetar una rama, etiqueta o confirmación de confianza con el arnés actual seleccionado.
- `source=url`: validar un archivo tar HTTPS con `package_sha256` requerida.
- `source=artifact`: reutilizar un archivo tar cargado por otra ejecución de Actions.

La Validación de Lanzamiento Completo utiliza `source=artifact` por defecto, construido desde el SHA de lanzamiento resuelto. Para la prueba posterior a la publicación, pase
`package_acceptance_package_spec=openclaw@YYYY.M.D` para que la misma matriz de actualización
apunte al paquete npm enviado en su lugar.

Las comprobaciones de lanzamiento llaman a Aceptación de Paquetes con el conjunto paquete/actualización/reinicio/complemento:

```text
doctor-switch update-channel-switch update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update
```

Cuando el periodo de prueba de lanzamiento está habilitado, también pasan:

```text
published_upgrade_survivor_baselines=last-stable-4 2026.4.23 2026.5.2 2026.4.15
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

Esto mantiene la migración de paquetes, el cambio de canal de actualización, la tolerancia a complementos administrados corruptos, la limpieza de dependencias de complementos obsoletas, la cobertura de complementos sin conexión, el comportamiento de actualización de complementos y el control de calidad de paquetes de Telegram en el mismo artefacto resuelto sin hacer que la puerta predeterminada del paquete de lanzamiento recorra cada lanzamiento publicado.

`last-stable-4` se resuelve en los cuatro últimos lanzamientos estables de OpenClaw publicados en npm. La aceptación de paquetes de lanzamiento fija `2026.4.23` como el primer límite de compatibilidad de actualización de complementos, `2026.5.2` como un límite de cambios en la arquitectura de complementos y `2026.4.15` como una línea base de actualización publicada anterior de 2026.4.1x; el solucionador deduplica las fijaciones que ya están en los últimos cuatro. Para una cobertura exhaustiva de la migración de actualizaciones publicadas, use `all-since-2026.4.23` en el flujo de trabajo de Migración de Actualizaciones por separado en lugar de en CI de Lanzamiento Completo. `release-history` permanece disponible para un muestreo manual más amplio cuando también desea el ancla de fecha anterior heredada.

Cuando se seleccionan múltiples líneas base de supervivientes de actualizaciones publicadas, el flujo de trabajo de Docker reutilizable fragmenta cada línea base en su propio trabajo de ejecutor específico. Cada fragmento de línea base aún ejecuta el conjunto de escenarios seleccionado, pero los registros y los artefactos permanecen por línea base y el tiempo de ejecución está limitado por el fragmento más lento en lugar de un trabajo serie grande.

Ejecute un perfil de paquete manualmente al validar un candidato antes del lanzamiento:

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_baselines="last-stable-4 2026.4.23 2026.5.2 2026.4.15" \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

Use `suite_profile=product` cuando la pregunta de lanzamiento incluya canales MCP, limpieza de cron/subagente, búsqueda web de OpenAI u OpenWebUI. Use `suite_profile=full` solo cuando necesite cobertura completa de la ruta de lanzamiento de Docker.

## Lanzamiento predeterminado

Para los candidatos de lanzamiento, la pila de prueba predeterminada es:

1. `pnpm check:changed` y `pnpm test:changed` para regresiones a nivel de origen.
2. `pnpm release:check` para la integridad del artefacto del paquete.
3. Perfil de Aceptación de Paquetes `package` o los carriles personalizados de paquetes de comprobación de lanzamiento para contratos de instalación/actualización/reinicio/complemento.
4. Comprobaciones de lanzamiento multiSO para el instalador específico del SO, incorporación y comportamiento de la plataforma.
5. Las suites en vivo solo cuando la superficie modificada toque el comportamiento del proveedor o del servicio hospedado.

En las máquinas de los mantenedores, las puertas amplias y la prueba del producto Docker/paquete deben ejecutarse en Testbox a menos que se esté haciendo explícitamente una prueba local.

## Compatibilidad heredada

La tolerancia de compatibilidad es estrecha y limitada en el tiempo:

- Los paquetes a través de `2026.4.25`, incluyendo `2026.4.25-beta.*`, pueden tolerar lagunas de metadatos de paquetes ya enviados en la Aceptación de Paquetes.
- El paquete publicado `2026.4.26` puede advertir sobre archivos de sello de metadatos de compilación local ya enviados.
- Los paquetes posteriores deben cumplir con los contratos modernos. Las mismas lagunas fallan en lugar de advertir o saltarse.

No agregue nuevas migraciones de inicio para estas formas antiguas. Agregue o extienda una reparación de doctor, luego pruébela con `upgrade-survivor`, `published-upgrade-survivor` o `update-restart-auth` cuando el comando de actualización sea el propietario del reinicio.

## Agregar cobertura

Al cambiar el comportamiento de actualización o complemento, agregue cobertura en la capa más baja que pueda fallar por la razón correcta:

- Lógica de ruta pura o metadatos: prueba unitaria junto al código fuente.
- Comportamiento de inventario de paquetes o archivos empaquetados: prueba `package-dist-inventory` o verificador de archivos tar.
- Comportamiento de instalación/actualización de CLI: aserción o accesorio de carril Docker.
- Comportamiento de migración de versión publicada: escenario `published-upgrade-survivor`.
- Comportamiento de reinicio propiedad de la actualización: `update-restart-auth`.
- Comportamiento de origen de registro/paquete: accesorio `test:docker:plugins` o servidor de accesorios ClawHub.
- Diseño o limpieza de dependencias: afirmar tanto la ejecución en tiempo de ejecución como el límite del sistema de archivos. Las dependencias de npm pueden ser elevadas bajo la raíz npm administrada, por lo que las pruebas deben demostrar que la raíz se escanea/limpia en lugar de asumir un árbol `node_modules` local al paquete.

Mantenga los nuevos accesorios Docker herméticos de forma predeterminada. Use registros de accesorios locales y paquetes falsos a menos que el punto de la prueba sea el comportamiento del registro en vivo.

## Triaje de fallos

Comience con la identidad del artefacto:

- Resumen de Aceptación de Paquetes `resolve_package`: origen, versión, SHA-256 y nombre del artefacto.
- Artefactos de Docker: `.artifacts/docker-tests/**/summary.json`,
  `failures.json`, registros de carril y comandos de reejecución.
- Resumen del sobreviviente de actualización: `.artifacts/upgrade-survivor/summary.json`,
  incluyendo la versión de línea base, versión candidata, escenario,
  tiempos de fase y pasos de la receta.

Se prefiere volver a ejecutar el carril fallido exacto con el mismo artefacto de paquete
antes que volver a ejecutar todo el paraguas de lanzamiento.
