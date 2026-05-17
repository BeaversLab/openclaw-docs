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

Si instalaste a través de **npm/pnpm/bun** (instalación global, sin metadatos de git),
las actualizaciones se realizan mediante el flujo del gestor de paquetes en [Actualización](/es/install/updating).

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
las acciones planeadas de canal/etiqueta/instalación/reinicio, `--json` para resultados
legibles por máquina y `openclaw update status --json` cuando solo necesitas detalles del canal y
disponibilidad. Si estás depurando los registros de Gateway alrededor de una actualización,
el verbosidad de la consola y el nivel de registro de archivo son separados: la opción `--verbose` de Gateway afecta
la salida de terminal/WebSocket, mientras que los registros de archivo requieren `logging.level: "debug"` o
`"trace"` en la configuración. Consulta [Registro de Gateway](/es/gateway/logging).

<Note>
  En modo Nix (`OPENCLAW_NIX_MODE=1`), las ejecuciones mutantes de `openclaw update` están deshabilitadas. Actualiza en su lugar la fuente de Nix o la entrada de flake para esta instalación; para nix-openclaw, usa el [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) con prioridad de agente. `openclaw update status` y `openclaw update --dry-run` permanecen de solo lectura.
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

El actualizador automático del núcleo del Gateway (cuando está habilitado a través de la configuración) inicia la ruta de actualización de la CLI
fuera del controlador de solicitudes en vivo del Gateway. Las actualizaciones del gestor de paquetes del plano de control `update.run`
fuerzan un reinicio de actualización no diferido y sin enfriamiento después del intercambio de paquetes,
porque el proceso antiguo del Gateway todavía puede tener fragmentos en memoria que apuntan a
archivos eliminados por el nuevo paquete.

Para las instalaciones mediante gestor de paquetes, `openclaw update` resuelve la versión del paquete de destino antes de invocar al gestor de paquetes. Las instalaciones globales de npm utilizan una instalación por etapas: OpenClaw instala el nuevo paquete en un prefijo temporal de npm, verifica el inventario de `dist` empaquetado allí y luego intercambia ese árbol de paquetes limpio con el prefijo global real. Si la verificación falla, el médico posterior a la actualización, la sincronización de complementos y el trabajo de reinicio no se ejecutan desde el árbol sospechoso. Incluso cuando la versión instalada ya coincide con el objetivo, el comando actualiza la instalación del paquete global, luego ejecuta la sincronización de complementos, una actualización de completación de comandos principales y el trabajo de reinicio. Esto mantiene los sidecars empaquetados y los registros de complementos propiedad del canal alineados con la compilación instalada de OpenClaw, dejando las reconstrucciones de completación de comandos de complemento completas para ejecuciones explícitas de `openclaw completion --write-state`.

Cuando se instala un servicio Gateway local administrado y el reinicio está habilitado, las actualizaciones del gestor de paquetes detienen el servicio en ejecución antes de reemplazar el árbol de paquetes, luego actualizan los metadatos del servicio desde la instalación actualizada, reinician el servicio y verifican que el Gateway reiniciado informe la versión esperada antes de informar el éxito. En macOS, la verificación posterior a la actualización también verifica que el LaunchAgent esté cargado/en ejecución para el perfil activo y que el puerto de loopback configurado esté saludable. Si el plist está instalado pero launchd no lo está supervisando, OpenClaw rearranca el LaunchAgent automáticamente y luego vuelve a ejecutar las comprobaciones de estado/versión/canal. Un arranque fresco carga el trabajo RunAtLoad directamente, por lo que la recuperación de la actualización no `kickstart -k` inmediatamente el Gateway recién creado. Si el Gateway aún no se vuelve saludable, el comando sale con un estado distinto de cero e imprime la ruta del registro de reinicio más instrucciones explícitas de reinicio, reinstalación y reversión del paquete. Con `--no-restart`, el reemplazo del paquete aún se ejecuta pero el servicio administrado no se detiene ni se reinicia, por lo que el Gateway en ejecución puede conservar código antiguo hasta que lo reinicie manualmente.

## Flujo de checkout de Git

### Selección de canal

- `stable`: hacer checkout de la última etiqueta no beta, luego compilar y ejecutar doctor.
- `beta`: prefiere la etiqueta `-beta` más reciente, pero vuelve a la etiqueta estable más reciente cuando falta beta o es antigua.
- `dev`: haz checkout a `main`, luego haz fetch y rebase.

### Pasos de actualización

<Steps>
  <Step title="Verificar árbol de trabajo limpio">No requiere cambios sin confirmar.</Step>
  <Step title="Cambiar de canal">Cambia al canal seleccionado (etiqueta o rama).</Step>
  <Step title="Obtener upstream">Solo para desarrollo.</Step>
  <Step title="Compilación previa al vuelo (solo desarrollo)">
    Ejecuta la compilación de TypeScript en un árbol de trabajo temporal. Si la punta falla, retrocede hasta 10 confirmaciones para encontrar la confirmación compilable más reciente. Establece `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` para ejecutar también el lint durante este pre-vuelo; el lint se ejecuta en modo serie restringido porque los hosts de actualización del usuario suelen ser más pequeños que
    los ejecutores de CI.
  </Step>
  <Step title="Rebase">Hace rebase sobre la confirmación seleccionada (solo para desarrollo).</Step>
  <Step title="Instalar dependencias">Usa el gestor de paquetes del repositorio. Para checkouts de pnpm, el actualizador inicializa `pnpm` bajo demanda (vía `corepack` primero, luego una reserva temporal `npm install pnpm@11`) en lugar de ejecutar `npm run build` dentro de un espacio de trabajo pnpm.</Step>
  <Step title="Construir UI de Control">Construye la puerta de enlace y la UI de Control.</Step>
  <Step title="Ejecutar doctor">`openclaw doctor` se ejecuta como la verificación final de actualización segura.</Step>
  <Step title="Sincronizar complementos">Sincroniza los complementos con el canal activo. El desarrollo utiliza complementos empaquetados; estable y beta utilizan npm. Actualiza las instalaciones de complementos rastreadas.</Step>
</Steps>

En el canal de actualización beta, las instalaciones de plugins de npm y ClawHub rastreadas que siguen
la línea predeterminada/más reciente intentan primero una versión beta del plugin `@beta`. Si el plugin no tiene
una versión beta, OpenClaw recurre a la especificación predeterminada/más reciente registrada y la reporta
como una advertencia. Para los plugins de npm, OpenClaw también recurre cuando el paquete
beta existe pero falla la validación de la instalación. Estas advertencias de respaldo del plugin no
hacen que falle la actualización principal. Las versiones exactas y las etiquetas explícitas no se
reescriben.

<Warning>Si una actualización de un complemento de npm fijado exactamente se resuelve en un artefacto cuya integridad difiere del registro de instalación almacenado, `openclaw update` aborta esa actualización del artefacto del complemento en lugar de instalarlo. Reinstale o actualice el complemento explícitamente solo después de verificar que confía en el nuevo artefacto.</Warning>

<Note>
Los fallos de sincronización de complementos posteriores a la actualización que están limitados a un complemento administrado y que la ruta de sincronización puede evitar (por ejemplo, un registro npm inalcanzable para un complemento no esencial) se reportan como advertencias después de que la actualización central tiene éxito. El resultado JSON mantiene la actualización `status: "ok"` de nivel superior y reporta `postUpdate.plugins.status: "warning"` con la orientación `openclaw doctor --fix` y `openclaw plugins inspect <id> --runtime --json`. Las excepciones inesperadas del actualizador o de sincronización aún hacen que el resultado de la actualización falle. Solucione el error de instalación o actualización del complemento y luego vuelva a ejecutar `openclaw doctor --fix` o `openclaw update`.

Después del paso de sincronización por complemento, `openclaw update` ejecuta un paso obligatorio de **convergencia post-central** antes de que se reinicie la puerta de enlace: repara las cargas útiles de complementos configuradas que faltan, valida cada registro de instalación rastreado _activo_ en el disco y verifica estáticamente que su `package.json` sea analizable (y que exista cualquier `main` declarado explícitamente). Los fallos de este paso, así como una instantánea no válida de la configuración de OpenClaw, devuelven `postUpdate.plugins.status: "error"` y cambian la actualización `status` de nivel superior a `"error"`, por lo que `openclaw update` sale con un valor distinto de cero y la puerta de enlace _no_ se reinicia con un conjunto de complementos no verificado. El error incluye líneas `postUpdate.plugins.warnings[].guidance` estructuradas que apuntan a `openclaw doctor --fix` y `openclaw plugins inspect <id> --runtime --json` para el seguimiento. Las entradas de complementos deshabilitados y los registros que no son objetivos de sincronización oficial vinculados a fuentes confiables se omiten aquí, reflejando la política `skipDisabledPlugins` utilizada por la verificación de carga útil faltante, por lo que un registro de complemento deshabilitado obsoleto no puede bloquear una actualización que, por lo demás, es válida.

Cuando se inicia la puerta de enlace actualizada, la carga de complementos es solo de verificación: el inicio no ejecuta gestores de paquetes ni muta árboles de dependencias. Los reinicios `update.run` del gestor de paquetes omiten la aplazamiento normal de inactividad y el tiempo de espera de reinicio después de que se ha intercambiado el árbol de paquetes, por lo que el proceso antiguo no puede seguir cargando de forma diferida fragmentos eliminados.

Si la inicialización de pnpm aún falla, el actualizador se detiene prematuramente con un error específico del gestor de paquetes en lugar de intentar `npm run build` dentro de la copia de trabajo.

</Note>

## `--update` abreviada

`openclaw --update` se reescribe como `openclaw update` (útil para shells y scripts de lanzamiento).

## Relacionado

- `openclaw doctor` (ofrece ejecutar primero la actualización en checkouts de git)
- [Canales de desarrollo](/es/install/development-channels)
- [Actualización](/es/install/updating)
- [Referencia de CLI](/es/cli)
