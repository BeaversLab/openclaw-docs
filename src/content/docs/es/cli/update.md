---
summary: "Referencia de CLI para `openclaw update` (actualización de código fuente más o menos segura + reinicio automático de la puerta de enlace)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "actualizar"
---

# `openclaw update`

Actualice OpenClaw de forma segura y cambie entre los canales estable/beta/desarrollo.

Si lo instalaste mediante **npm/pnpm/bun** (instalación global, sin metadatos de git),
las actualizaciones se realizan a través del flujo del gestor de paquetes en [Actualización](/es/install/updating).

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

- `--no-restart`: omitir el reinicio del servicio Gateway después de una actualización exitosa.
- `--channel <stable|beta|dev>`: establece el canal de actualización (git + npm; se conserva en la configuración).
- `--tag <dist-tag|version|spec>`: anula el objetivo del paquete solo para esta actualización. Para instalaciones de paquetes, `main` corresponde a `github:openclaw/openclaw#main`.
- `--dry-run`: previsualiza las acciones de actualización planificadas (canal/etiqueta/objetivo/flujo de reinicio) sin escribir configuración, instalar, sincronizar complementos ni reiniciar.
- `--json`: imprime `UpdateRunResult` JSON legible por máquina, incluyendo
  `postUpdate.plugins.integrityDrifts` cuando se detecta una desviación de artefactos del plugin npm
  durante la sincronización de plugins posterior a la actualización.
- `--timeout <seconds>`: tiempo de espera por paso (el valor predeterminado es 1200s).
- `--yes`: omite los mensajes de confirmación (por ejemplo, confirmación de downgrade)

Nota: los downgrades requieren confirmación porque las versiones anteriores pueden romper la configuración.

## `update status`

Muestra el canal de actualización activo + etiqueta/rama/SHA de git (para checkouts de fuente), además de la disponibilidad de actualización.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Opciones:

- `--json`: imprime el estado en formato JSON legible por máquina.
- `--timeout <seconds>`: tiempo de espera para las comprobaciones (el valor predeterminado es 3s).

## `update wizard`

Flujo interactivo para seleccionar un canal de actualización y confirmar si se debe reiniciar el Gateway
después de actualizar (el valor predeterminado es reiniciar). Si seleccionas `dev` sin un checkout de git,
se ofrece crear uno.

Opciones:

- `--timeout <seconds>`: tiempo de espera para cada paso de actualización (valor predeterminado `1200`)

## Lo que hace

Cuando cambias de canal explícitamente (`--channel ...`), OpenClaw también mantiene el
método de instalación alineado:

- `dev` → asegura un checkout de git (valor predeterminado: `~/openclaw`, anular con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable` → instala desde npm usando `latest`.
- `beta` → prefiere la dist-tag npm `beta`, pero vuelve a `latest` cuando beta no
  está disponible o es más antiguo que la versión estable actual.

El actualizador automático del núcleo del Gateway (cuando está habilitado por configuración) reutiliza esta misma ruta de actualización.

Para las instalaciones mediante gestor de paquetes, `openclaw update` resuelve la versión del paquete
objetivo antes de invocar al gestor de paquetes. Si la versión instalada coincide exactamente
con el objetivo y no es necesario persistir ningún cambio de canal de actualización, el
comando finaliza como omitido antes de la instalación del paquete, la sincronización de plugins, la actualización del completado
o el trabajo de reinicio del gateway.

## Flujo de checkout de Git

Canales:

- `stable`: hace checkout de la última etiqueta no beta, luego build + doctor.
- `beta`: prefiere la etiqueta `-beta` más reciente, pero recurre a la última etiqueta estable cuando beta falta o es antigua.
- `dev`: hace checkout a `main`, luego fetch + rebase.

De alto nivel:

1. Requiere un árbol de trabajo limpio (sin cambios sin confirmar).
2. Cambia al canal seleccionado (etiqueta o rama).
3. Obtiene cambios del upstream (solo dev).
4. Solo dev: lint preliminar + compilación de TypeScript en un árbol de trabajo temporal; si la punta falla, retrocede hasta 10 confirmaciones para encontrar la compilación limpia más reciente.
5. Hace rebase sobre la confirmación seleccionada (solo dev).
6. Instala dependencias con el gestor de paquetes del repositorio. Para checkouts de pnpm, el actualizador inicializa `pnpm` bajo demanda (primero vía `corepack` y luego un respaldo temporal `npm install pnpm@10`) en lugar de ejecutar `npm run build` dentro de un espacio de trabajo pnpm.
7. Compila y construye la interfaz de usuario de Control.
8. Ejecuta `openclaw doctor` como la verificación final de "actualización segura".
9. Sincroniza los complementos con el canal activo (dev usa complementos integrados; stable/beta usa npm) y actualiza los complementos instalados por npm.

Si una actualización de un complemento de npm anclado exactamente se resuelve en un artefacto cuya integridad difiere del registro de instalación almacenado, `openclaw update` aborta esa actualización del artefacto del complemento en lugar de instalarlo. Reinstale o actualice el complemento explícitamente solo después de verificar que confía en el nuevo artefacto.

Si el arranque de pnpm aún falla, el actualizador ahora se detiene temprano con un error específico del gestor de paquetes en lugar de intentar `npm run build` dentro del checkout.

## Abreviatura `--update`

`openclaw --update` se reescribe como `openclaw update` (útil para shells y scripts de lanzamiento).

## Ver también

- `openclaw doctor` (ofrece ejecutar la actualización primero en los checkouts de git)
- [Canales de desarrollo](/es/install/development-channels)
- [Actualización](/es/install/updating)
- [Referencia de CLI](/es/cli)
