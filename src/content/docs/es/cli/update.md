---
summary: "Referencia de CLI para `openclaw update` (actualización de código fuente más o menos segura + reinicio automático de la puerta de enlace)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "actualizar"
---

# `openclaw update`

Actualice OpenClaw de forma segura y cambie entre los canales estable/beta/desarrollo.

Si instalaste a través de **npm/pnpm** (instalación global, sin metadatos de git), las actualizaciones se realizan mediante el flujo del gestor de paquetes en [Actualización](/en/install/updating).

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

Nota: las desactualizaciones requieren confirmación porque las versiones anteriores pueden romper la configuración.

## `update status`

Muestra el canal de actualización activo + la etiqueta/rama/SHA de git (para checkouts de origen), además de la disponibilidad de actualización.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Opciones:

- `--json`: imprime JSON de estado legible por máquina.
- `--timeout <seconds>`: tiempo de espera para las comprobaciones (el predeterminado es 3s).

## `update wizard`

Flujo interactivo para elegir un canal de actualización y confirmar si se debe reiniciar el Gateway
después de actualizar (el valor predeterminado es reiniciar). Si seleccionas `dev` sin un checkout de git, se
ofrece crear uno.

## Lo que hace

Cuando cambias de canal explícitamente (`--channel ...`), OpenClaw también mantiene alineado el
método de instalación:

- `dev` → asegura un checkout de git (predeterminado: `~/openclaw`, anular con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable`/`beta` → instala desde npm usando la dist-tag correspondiente.

El actualizador automático del núcleo de Gateway (cuando está habilitado mediante configuración) reutiliza esta misma ruta de actualización.

## Flujo de checkout de Git

Canales:

- `stable`: hace checkout de la última etiqueta no beta, luego compila + doctor.
- `beta`: hace checkout de la última etiqueta `-beta`, luego compila + doctor.
- `dev`: hace checkout de `main`, luego fetch + rebase.

Nivel alto:

1. Requiere un árbol de trabajo limpio (sin cambios sin confirmar).
2. Cambia al canal seleccionado (etiqueta o rama).
3. Obtiene cambios del upstream (solo dev).
4. Solo dev: lint prevuelo + compilación de TypeScript en un árbol de trabajo temporal; si la punta falla, retrocede hasta 10 confirmaciones para encontrar la compilación limpia más reciente.
5. Hace rebase sobre la confirmación seleccionada (solo dev).
6. Instala dependencias (se prefiere pnpm; fallback a npm).
7. Compila + compila la Interfaz de Control.
8. Ejecuta `openclaw doctor` como la comprobación final de "actualización segura".
9. Sincroniza los complementos con el canal activo (dev usa extensiones empaquetadas; stable/beta usa npm) y actualiza los complementos instalados por npm.

## Abreviatura de `--update`

`openclaw --update` se reescribe como `openclaw update` (útil para shells y scripts de lanzamiento).

## Ver también

- `openclaw doctor` (ofrece ejecutar la actualización primero en los checkouts de git)
- [Canales de desarrollo](/en/install/development-channels)
- [Actualización](/en/install/updating)
- [Referencia de la CLI](/en/cli)
