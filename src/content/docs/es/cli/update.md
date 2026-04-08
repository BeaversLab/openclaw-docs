---
summary: "Referencia de CLI para `openclaw update` (actualización de código fuente más o menos segura + reinicio automático de la puerta de enlace)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "actualizar"
---

# `openclaw update`

Actualice OpenClaw de forma segura y cambie entre los canales estable/beta/desarrollo.

Si instalaste vía **npm/pnpm/bun** (instalación global, sin metadatos de git),
las actualizaciones ocurren a través del flujo del administrador de paquetes en [Actualizando](/en/install/updating).

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
- `--json`: imprime JSON `UpdateRunResult` legible por máquina.
- `--timeout <seconds>`: tiempo de espera por paso (el predeterminado es 1200s).
- `--yes`: omite los mensajes de confirmación (por ejemplo, confirmación de downgrade).

Nota: los downgrades requieren confirmación porque las versiones anteriores pueden romper la configuración.

## `update status`

Muestra el canal de actualización activo + etiqueta/rama/SHA de git (para checkouts de fuente), además de la disponibilidad de actualización.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Opciones:

- `--json`: imprime el estado en JSON legible por máquina.
- `--timeout <seconds>`: tiempo de espera para las comprobaciones (por defecto es 3s).

## `update wizard`

Flujo interactivo para elegir un canal de actualización y confirmar si se debe reiniciar el Gateway
después de actualizar (por defecto se reinicia). Si seleccionas `dev` sin un checkout de git,
se ofrece crear uno.

Opciones:

- `--timeout <seconds>`: tiempo de espera para cada paso de actualización (por defecto `1200`)

## Lo que hace

Cuando cambias de canal explícitamente (`--channel ...`), OpenClaw también mantiene el
método de instalación alineado:

- `dev` → asegura un checkout de git (por defecto: `~/openclaw`, anular con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable` → instala desde npm usando `latest`.
- `beta` → prefiere la dist-tag de npm `beta`, pero vuelve a `latest` cuando beta
  falta o es más antigua que la versión estable actual.

El actualizador automático del núcleo del Gateway (cuando está habilitado por configuración) reutiliza esta misma ruta de actualización.

## Flujo de checkout de Git

Canales:

- `stable`: hacer checkout de la última etiqueta no beta, luego construir + doctor.
- `beta`: preferir la última etiqueta `-beta`, pero volver a la última etiqueta estable
  cuando beta falta o es más antigua.
- `dev`: hacer checkout de `main`, luego fetch + rebase.

Alto nivel:

1. Requiere un árbol de trabajo limpio (sin cambios sin confirmar).
2. Cambia al canal seleccionado (etiqueta o rama).
3. Obtiene cambios de upstream (solo dev).
4. Solo dev: lint de preflight + compilación de TypeScript en un árbol de trabajo temporal; si la punta falla, retrocede hasta 10 commits para encontrar la compilación limpia más reciente.
5. Hace rebase sobre el commit seleccionado (solo dev).
6. Instala dependencias con el gestor de paquetes del repositorio. Para checkouts de pnpm, el actualizador arranca `pnpm` bajo demanda (vía `corepack` primero, luego un `npm install pnpm@10` temporal de respaldo) en lugar de ejecutar `npm run build` dentro de un espacio de trabajo pnpm.
7. Compila + compila la interfaz de usuario de Control.
8. Ejecuta `openclaw doctor` como la comprobación final de "actualización segura".
9. Sincroniza los complementos con el canal activo (dev usa extensiones incluidas; stable/beta usa npm) y actualiza los complementos instalados por npm.

Si el arranque de pnpm aún falla, el actualizador ahora se detiene antes con un error específico del gestor de paquetes en lugar de intentar `npm run build` dentro del checkout.

## Abreviatura de `--update`

`openclaw --update` se reescribe como `openclaw update` (útil para shells y scripts de inicio).

## Ver también

- `openclaw doctor` (ofrece ejecutar la actualización primero en los checkouts de git)
- [Canales de desarrollo](/en/install/development-channels)
- [Actualización](/en/install/updating)
- [Referencia de CLI](/en/cli)
