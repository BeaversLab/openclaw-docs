---
summary: "Referencia de CLI para `openclaw update` (actualización de fuente más o menos segura + reinicio automático de la puerta de enlace)"
read_when:
  - You want to update a source checkout safely
  - You are debugging `openclaw update` output or options
  - You need to understand `--update` shorthand behavior
title: "Actualizar"
---

# `openclaw update`

Actualice OpenClaw de forma segura y cambie entre los canales estable/beta/desarrollo.

Si instalaste mediante **npm/pnpm/bun** (instalación global, sin metadatos de git),
las actualizaciones ocurren a través del flujo del gestor de paquetes en [Actualización](/es/install/updating).

## Uso

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## Opciones

- `--no-restart`: omite reiniciar el servicio Gateway después de una actualización exitosa. Las actualizaciones del gestor de paquetes que sí reinician el Gateway verifican que el servicio reiniciado reporte la versión actualizada esperada antes de que el comando tenga éxito.
- `--channel <stable|beta|dev>`: establece el canal de actualización (git + npm; persistido en la configuración).
- `--tag <dist-tag|version|spec>`: anula el objetivo del paquete solo para esta actualización. Para instalaciones de paquetes, `main` se mapea a `github:openclaw/openclaw#main`.
- `--dry-run`: previsualiza las acciones de actualización planificadas (canal/etiqueta/objetivo/flujo de reinicio) sin escribir configuración, instalar, sincronizar complementos o reiniciar.
- `--json`: imprime JSON `UpdateRunResult` legible por máquina, incluyendo
  `postUpdate.plugins.warnings` cuando los complementos administrados corruptos o no cargables necesitan
  reparación después de que la actualización del núcleo tenga éxito, detalles de reserva del complemento del canal beta
  cuando un complemento no tiene versión beta, y `postUpdate.plugins.integrityDrifts`
  cuando se detecta una desviación de artefactos del complemento npm durante la sincronización de complementos posterior a la actualización.
- `--timeout <seconds>`: tiempo de espera por paso (por defecto es 1800s).
- `--yes`: omite los mensajes de confirmación (por ejemplo confirmación de desactualización).

`openclaw update` no tiene una opción `--verbose`. Usa `--dry-run` para previsualizar
las acciones planificadas de canal/etiqueta/instalación/reinicio, `--json` para resultados
legibles por máquina y `openclaw update status --json` cuando solo necesitas detalles del canal y
disponibilidad. Si estás depurando registros de Gateway alrededor de una actualización,
el nivel de detalle de la consola y el nivel de registro de archivo son independientes: `--verbose` de Gateway afecta
la salida de terminal/WebSocket, mientras que los registros de archivo requieren `logging.level: "debug"` o
`"trace"` en la configuración. Consulta [Registro de Gateway](/es/gateway/logging).

<Note>
  En modo Nix (`OPENCLAW_NIX_MODE=1`), las ejecuciones de mutación de `openclaw update` están deshabilitadas. Actualiza la fuente de Nix o la entrada de flake para esta instalación en su lugar; para nix-openclaw, usa la [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) primero con el agente. `openclaw update status` y `openclaw update --dry-run` permanecen de solo lectura.
</Note>

<Warning>Las downgrades requieren confirmación porque las versiones anteriores pueden romper la configuración.</Warning>

## `update status`

Muestra el canal de actualización activo + la etiqueta/rama/SHA de git (para checkouts de fuente), además de la disponibilidad de actualización.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Opciones:

- `--json`: imprime el estado JSON legible por máquina.
- `--timeout <seconds>`: tiempo de espera para las comprobaciones (por defecto es 3s).

## `update wizard`

Flujo interactivo para elegir un canal de actualización y confirmar si se debe reiniciar el Gateway
después de actualizar (por defecto se reinicia). Si selecciona `dev` sin un checkout de git, se
ofrece crear uno.

Opciones:

- `--timeout <seconds>`: tiempo de espera para cada paso de actualización (por defecto `1800`)

## Lo que hace

Cuando cambia de canal explícitamente (`--channel ...`), OpenClaw también mantiene el
método de instalación alineado:

- `dev` → asegura un checkout de git (por defecto: `~/openclaw`, anular con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable` → instala desde npm usando `latest`.
- `beta` → prefiere la etiqueta de distribución de npm `beta`, pero recurre a `latest` cuando beta
  falta o es más antigua que la versión estable actual.

El actualizador automático del núcleo de Gateway (cuando está habilitado a través de la configuración) inicia la ruta de actualización de la CLI
fuera del controlador de solicitudes en vivo de Gateway. Las actualizaciones del gestor de paquetes `update.run` del plano de control
también utilizan una transferencia de servicio administrado en lugar de reemplazar el árbol de paquetes
dentro del proceso en vivo de Gateway. Gateway inicia un ayudador separado, se cierra,
y el ayudador ejecuta la ruta normal de la CLI `openclaw update --yes --json` desde
fuera del árbol de procesos de Gateway. Si esa transferencia no está disponible, `update.run`
devuelve una respuesta estructurada con el comando de shell seguro para ejecutar manualmente.

Para las instalaciones mediante gestor de paquetes, `openclaw update` resuelve la versión del paquete objetivo antes de invocar al gestor de paquetes. Las instalaciones globales de npm utilizan una instalación por etapas: OpenClaw instala el nuevo paquete en un prefijo temporal de npm, verifica el inventario del `dist` empaquetado allí, y luego intercambia ese árbol de paquetes limpio en el prefijo global real. Si la verificación falla, el médico posterior a la actualización, la sincronización de complementos y el trabajo de reinicio no se ejecutan desde el árbol sospechoso. Incluso cuando la versión instalada ya coincide con el objetivo, el comando actualiza la instalación global del paquete, luego ejecuta la sincronización de complementos, una actualización de finalización de comandos principales y el trabajo de reinicio. Esto mantiene los sidecars empaquetados y los registros de complementos propiedad del canal alineados con la compilación instalada de OpenClaw, dejando las reconstrucciones completas de finalización de comandos de complementos para ejecuciones explícitas de `openclaw completion --write-state`.

Cuando hay un servicio Gateway administrado local instalado y el reinicio está habilitado, las actualizaciones del gestor de paquetes detienen el servicio en ejecución antes de reemplazar el árbol del paquete, luego actualizan los metadatos del servicio desde la instalación actualizada, reinician el servicio y verifican que el Gateway reiniciado informe la versión esperada antes de reportar `Gateway: restarted and verified.`. En macOS, la verificación posterior a la actualización también verifica que el LaunchAgent esté cargado/en ejecución para el perfil activo y que el puerto de loopback configurado esté saludable. Si el plist está instalado pero launchd no lo está supervisando, OpenClaw re-inicializa el LaunchAgent automáticamente, luego vuelve a ejecutar las comprobaciones de preparación de salud/versión/canal. Una inicialización fresca carga el trabajo RunAtLoad directamente, por lo que la recuperación de la actualización no `kickstart -k` inmediatamente el Gateway recién generado. Si el Gateway aún no se vuelve saludable, el comando sale con un código distinto de cero e imprime la ruta del registro de reinicio más instrucciones explícitas para reiniciar, reinstalar y revertir el paquete. Si el reinicio no se puede ejecutar, el comando imprime `Gateway: restart skipped (...)` o `Gateway: restart failed: ...` con una pista de `openclaw gateway restart` manual. Con `--no-restart`, el reemplazo del paquete aún se ejecuta pero el servicio administrado no se detiene ni se reinicia, por lo que el Gateway en ejecución puede conservar código antiguo hasta que lo reinicie manualmente.

### Forma de la respuesta del plano de control

Cuando se invoca `update.run` a través del plano de control del Gateway en una
instalación mediante administrador de paquetes, el controlador informa el inicio de la transferencia por separado
del la actualización de la CLI que continúa después de que el Gateway sale:

- `ok: true`, `result.status: "skipped"`,
  `result.reason: "managed-service-handoff-started"` y
  `handoff.status: "started"` significan que el Gateway creó la transferencia del servicio administrado
  y programó su propio reinicio para que el asistente separado pueda ejecutar
  `openclaw update --yes --json` fuera del proceso del servicio en vivo.
- `ok: false`, `result.reason: "managed-service-handoff-unavailable"` y
  `handoff.status: "unavailable"` significan que OpenClaw no pudo encontrar un límite de
  servicio supervisor para una transferencia segura. La respuesta incluye
  `handoff.command`, el comando de shell para ejecutar desde fuera del Gateway.
- `ok: false`, `result.reason: "managed-service-handoff-failed"` significa que el
  Gateway intentó crear la transferencia pero no pudo generar el asistente separado.

El payload `sentinel` aún se escribe antes de que el Gateway salga, y la transferencia de la CLI
actualiza el mismo centinela de reinicio después de que se completan las comprobaciones de estado del
reinicio del servicio administrado. Durante la transferencia, el centinela puede llevar
`stats.reason: "restart-health-pending"` sin continuación de éxito; el
Gateway reiniciado sigue sondeándolo y solo dispara la continuación después de que la CLI
ha verificado el estado del servicio y reescrito el centinela con el resultado final `ok`.
`openclaw status` y `openclaw status --all` muestran una fila `Update restart`
mientras ese centinela está pendiente o fallido, y `update.status` devuelve el
último centinela en caché.

## Flujo de checkout de Git

### Selección de canal

- `stable`: haz checkout de la última etiqueta no beta, luego compila y ejecuta doctor.
- `beta`: prefiere la última etiqueta `-beta`, pero recurre a la última etiqueta estable cuando beta falta o es antigua.
- `dev`: haz checkout de `main`, luego busca y haz rebase.

### Pasos de actualización

<Steps>
  <Step title="Verificar árbol de trabajo limpio">Requiere que no haya cambios sin confirmar.</Step>
  <Step title="Cambiar de canal">Cambia al canal seleccionado (etiqueta o rama).</Step>
  <Step title="Obtener upstream">Solo para desarrolladores.</Step>
  <Step title="Compilación previa al vuelo (solo para desarrolladores)">
    Ejecuta la compilación de TypeScript en un árbol de trabajo temporal. Si la punta falla, retrocede hasta 10 confirmaciones para encontrar la confirmación más reciente que se pueda compilar. Establezca `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` para también ejecutar lint durante esta verificación previa; lint se ejecuta en modo serie restringido porque los hosts de actualización del usuario suelen ser
    más pequeños que los ejecutores de CI.
  </Step>
  <Step title="Hacer rebase">Hace rebase sobre la confirmación seleccionada (solo para desarrolladores).</Step>
  <Step title="Instalar dependencias">Utiliza el gestor de paquetes del repositorio. Para checkouts de pnpm, el actualizador inicializa `pnpm` bajo demanda (primero a través de `corepack` y luego un respaldo temporal `npm install pnpm@11`) en lugar de ejecutar `npm run build` dentro de un espacio de trabajo pnpm.</Step>
  <Step title="Compilar interfaz de usuario de Control">Compila la puerta de enlace y la interfaz de usuario de Control.</Step>
  <Step title="Ejecutar doctor">`openclaw doctor` se ejecuta como la verificación final de actualización segura.</Step>
  <Step title="Sincronizar complementos">Sincroniza los complementos con el canal activo. El modo de desarrollo utiliza complementos empaquetados; stable y beta utilizan npm. Actualiza las instalaciones de complementos rastreadas.</Step>
</Steps>

En el canal de actualización beta, las instalaciones de complementos de npm y ClawHub rastreadas que siguen
la línea predeterminada/más reciente intentan primero una versión `@beta` del complemento. Si el complemento no tiene
una versión beta, OpenClaw recurre a la especificación predeterminada/más reciente registrada e informa
ello como una advertencia. Para complementos de npm, OpenClaw también recurre cuando el paquete
beta existe pero falla la validación de instalación. Estas advertencias de reserva del complemento no
hacen que la actualización principal falle. Las versiones exactas y las etiquetas explícitas no son
reescritas.

<Warning>Si una actualización exacta de un plugin de npm fijada se resuelve en un artefacto cuya integridad difiere del registro de instalación almacenado, `openclaw update` aborta esa actualización del artefacto del plugin en lugar de instalarlo. Reinstale o actualice el plugin explícitamente solo después de verificar que confía en el nuevo artefacto.</Warning>

<Note>
Los fallos de sincronización de complementos posteriores a la actualización que están limitados a un complemento administrado y que la ruta de sincronización puede evitar (por ejemplo, un registro de npm inalcanzable para un complemento no esencial) se reportan como advertencias después de que la actualización del núcleo tiene éxito. El resultado JSON mantiene el estado `status: "ok"` de actualización de nivel superior y reporta `postUpdate.plugins.status: "warning"` con orientación `openclaw doctor --fix` y `openclaw plugins inspect <id> --runtime --json`. Las excepciones inesperadas del actualizador o de la sincronización aún hacen que el resultado de la actualización falle. Corrija el error de instalación o actualización del complemento y luego vuelva a ejecutar `openclaw doctor --fix` o `openclaw update`.

Después del paso de sincronización por complemento, `openclaw update` ejecuta un paso obligatorio de **convergencia posterior al núcleo** antes de que se reinicie la puerta de enlace: repara las cargas útiles de complementos configurados que faltan, valida cada registro de instalación _activa_ rastreada en el disco y verifica estáticamente que su `package.json` sea analizable (y que cualquier `main` declarado explícitamente exista). Los fallos de este paso, y una instantánea de configuración de OpenClaw no válida, devuelven `postUpdate.plugins.status: "error"` y cambian el estado `status` de actualización de nivel superior a `"error"`, por lo que `openclaw update` sale con un valor distinto de cero y la puerta de enlace _no_ se reinicia con un conjunto de complementos no verificado. El error incluye líneas `postUpdate.plugins.warnings[].guidance` estructuradas que apuntan a `openclaw doctor --fix` y `openclaw plugins inspect <id> --runtime --json` para el seguimiento. Las entradas de complementos deshabilitados y los registros que no son objetivos de sincronización oficial vinculados a fuentes de confianza se omiten aquí, reflejando la política `skipDisabledPlugins` utilizada por la verificación de carga útil faltante, por lo que un registro de complemento deshabilitado obsoleto no puede bloquear una actualización que, por lo demás, es válida.

Cuando se inicia la puerta de enlace actualizada, la carga de complementos es solo de verificación: el inicio no ejecuta gestores de paquetes ni muta los árboles de dependencias. Los reinicios `update.run` del gestor de paquetes se entregan a la ruta de servicio administrado de la CLI, por lo que el intercambio de paquetes ocurre fuera del proceso antiguo de la puerta de enlace y las verificaciones de estado del servicio deciden si la actualización se puede reportar como completa.

Si pnpm bootstrap aún falla, el actualizador se detiene temprano con un error específico del gestor de paquetes en lugar de intentar `npm run build` dentro de la copia de trabajo.

</Note>

## forma abreviada de `--update`

`openclaw --update` se reescribe como `openclaw update` (útil para shells y scripts de inicio).

## Relacionado

- `openclaw doctor` (ofrece ejecutar la actualización primero en las comprobaciones de git)
- [Canales de desarrollo](/es/install/development-channels)
- [Actualización](/es/install/updating)
- [Referencia de la CLI](/es/cli)
