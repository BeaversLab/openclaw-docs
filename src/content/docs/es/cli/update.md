---
summary: "Referencia de CLI para `openclaw update` (actualización de fuente más o menos segura + reinicio automático de la puerta de enlace)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "Actualizar"
---

# `openclaw update`

Actualice OpenClaw de forma segura y cambie entre los canales estable/beta/desarrollo.

Si lo instalaste a través de **npm/pnpm/bun** (instalación global, sin metadatos de git),
las actualizaciones ocurren a través del flujo del administrador de paquetes en [Actualizando](/es/install/updating).

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

- `--no-restart`: omitir el reinicio del servicio Gateway después de una actualización exitosa. Las actualizaciones del administrador de paquetes que sí reinician el Gateway verifican que el servicio reiniciado reporte la versión actualizada esperada antes de que el comando tenga éxito.
- `--channel <stable|beta|dev>`: establecer el canal de actualización (git + npm; persiste en la configuración).
- `--tag <dist-tag|version|spec>`: anular el objetivo del paquete solo para esta actualización. Para instalaciones de paquetes, `main` se asigna a `github:openclaw/openclaw#main`.
- `--dry-run`: previsualizar las acciones de actualización planificadas (canal/etiqueta/objetivo/flujo de reinicio) sin escribir configuración, instalar, sincronizar complementos o reiniciar.
- `--json`: imprimir JSON `UpdateRunResult` legible por máquina, incluyendo
  `postUpdate.plugins.integrityDrifts` cuando se detecta una deriva del artefacto del complemento npm
  durante la sincronización de complementos posterior a la actualización.
- `--timeout <seconds>`: tiempo de espera por paso (por defecto es 1800s).
- `--yes`: omitir los mensajes de confirmación (por ejemplo, confirmación de downgrade).

<Warning>Los downgrades requieren confirmación porque las versiones anteriores pueden romper la configuración.</Warning>

## `update status`

Muestra el canal de actualización activo + etiqueta/rama/SHA de git (para checkouts de fuente), además de la disponibilidad de actualización.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Opciones:

- `--json`: imprimir JSON de estado legible por máquina.
- `--timeout <seconds>`: tiempo de espera para las comprobaciones (por defecto es 3s).

## `update wizard`

Flujo interactivo para elegir un canal de actualización y confirmar si se debe reiniciar la Gateway
después de actualizar (por defecto es reiniciar). Si seleccionas `dev` sin una checkout de git, te
ofrece crear uno.

Opciones:

- `--timeout <seconds>`: tiempo de espera para cada paso de actualización (por defecto `1800`)

## Lo que hace

Cuando cambias de canal explícitamente (`--channel ...`), OpenClaw también mantiene el
método de instalación alineado:

- `dev` → asegura un checkout de git (por defecto: `~/openclaw`, sobrescribir con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable` → instala desde npm usando `latest`.
- `beta` → prefiere la dist-tag de npm `beta`, pero recurre a `latest` cuando beta está
  ausente o es más antiguo que la versión estable actual.

El actualizador automático del núcleo del Gateway (cuando está habilitado por configuración) reutiliza esta misma ruta de actualización.

Para las instalaciones mediante gestor de paquetes, `openclaw update` resuelve la versión del paquete
objetivo antes de invocar al gestor de paquetes. Las instalaciones globales de npm utilizan una instalación
por etapas: OpenClaw instala el nuevo paquete en un prefijo temporal de npm, verifica
el inventario empaquetado `dist` allí y luego intercambia ese árbol de paquetes limpio en el
prefijo global real. Si la verificación falla, el doctor posterior a la actualización, la sincronización de complementos y el
trabajo de reinicio no se ejecutan desde el árbol sospechoso. Incluso cuando la versión instalada
ya coincide con el objetivo, el comando actualiza la instalación del paquete global,
luego ejecuta la sincronización de complementos, una actualización de finalización de comandos principales y el trabajo de reinicio. Esto
mantiene los sidecars empaquetados y los registros de complementos propiedad del canal alineados con la
construcción instalada de OpenClaw, dejando las reconstrucciones completas de finalización de comandos de complementos para
ejecuciones explícitas de `openclaw completion --write-state`.

## Flujo de checkout de Git

### Selección de canal

- `stable`: hacer checkout de la etiqueta no beta más reciente, luego compilar y ejecutar doctor.
- `beta`: preferir la etiqueta `-beta` más reciente, pero recurrir a la etiqueta estable más reciente cuando beta falta o es más antigua.
- `dev`: hacer checkout de `main`, luego fetch y rebase.

### Pasos de actualización

<Steps>
  <Step title="Verificar árbol de trabajo limpio">No requiere cambios sin confirmar.</Step>
  <Step title="Cambiar canal">Cambia al canal seleccionado (etiqueta o rama).</Step>
  <Step title="Obtener upstream">Solo para Dev.</Step>
  <Step title="Compilación previa al vuelo (solo desarrollo)">Ejecuta lint y la compilación de TypeScript en un árbol de trabajo temporal. Si la punta falla, retrocede hasta 10 confirmaciones para encontrar la compilación limpia más reciente.</Step>
  <Step title="Rebase">Hace rebase sobre la confirmación seleccionada (solo desarrollo).</Step>
  <Step title="Instalar dependencias">Utiliza el gestor de paquetes del repositorio. Para las copias de trabajo de pnpm, el actualizador inicializa `pnpm` bajo demanda (primero a través de `corepack` y luego una alternativa temporal `npm install pnpm@10`) en lugar de ejecutar `npm run build` dentro de un espacio de trabajo pnpm.</Step>
  <Step title="Compilar UI de Control">Compila la puerta de enlace y la UI de Control.</Step>
  <Step title="Ejecutar doctor">`openclaw doctor` se ejecuta como la verificación final de actualización segura.</Step>
  <Step title="Sincronizar complementos">Sincroniza los complementos con el canal activo. Desarrollo usa complementos incluidos; estable y beta usan npm. Actualiza los complementos instalados por npm.</Step>
</Steps>

<Warning>Si una actualización de un complemento npm fijado exactamente se resuelve en un artefacto cuya integridad difiere del registro de instalación almacenado, `openclaw update` aborta esa actualización de artefacto del complemento en lugar de instalarlo. Reinstale o actualice el complemento explícitamente solo después de verificar que confía en el nuevo artefacto.</Warning>

<Note>
Los fallos de sincronización de complementos posteriores a la actualización hacen que el resultado de la actualización falle y detienen el trabajo de seguimiento de reinicio. Corrija el error de instalación o actualización del complemento y luego vuelva a ejecutar `openclaw update`.

Cuando se inicia la puerta de enlace actualizada, las dependencias de tiempo de ejecución de los complementos incluidos habilitados se preparan antes de la activación del complemento. Los reinicios desencadenados por actualizaciones drenan cualquier preparación activa de dependencias de tiempo de ejecución antes de cerrar la puerta de enlace, por lo que los reinicios del gestor de servicios no interrumpen una instalación de npm en curso.

Si la inicialización de pnpm aún falla, el actualizador se detiene pronto con un error específico del gestor de paquetes en lugar de intentar `npm run build` dentro de la copia de trabajo.

</Note>

## Abreviatura de `--update`

`openclaw --update` se reescribe como `openclaw update` (útil para shells y scripts de inicio).

## Relacionado

- `openclaw doctor` (ofrece ejecutar la actualización primero en checkouts de git)
- [Canales de desarrollo](/es/install/development-channels)
- [Actualización](/es/install/updating)
- [Referencia de la CLI](/es/cli)
