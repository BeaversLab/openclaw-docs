---
summary: "Referencia de CLI para `openclaw update` (actualización de fuente más o menos segura + reinicio automático de la puerta de enlace)"
read_when:
  - Deseas actualizar una fuente de checkout de forma segura
  - Necesitas entender el comportamiento de la abreviatura `--update`
title: "update"
---

# `openclaw update`

Actualiza OpenClaw de forma segura y cambia entre los canales estable/beta/desarrollo.

Si lo instalaste mediante **npm/pnpm** (instalación global, sin metadatos de git), las actualizaciones se realizan a través del flujo del administrador de paquetes en [Actualización](/es/install/updating).

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

- `--no-restart`: omite el reinicio del servicio Gateway después de una actualización exitosa.
- `--channel <stable|beta|dev>`: establece el canal de actualización (git + npm; se guarda en la configuración).
- `--tag <dist-tag|version|spec>`: anula el destino del paquete solo para esta actualización. Para instalaciones de paquetes, `main` se asigna a `github:openclaw/openclaw#main`.
- `--dry-run`: previsualiza las acciones de actualización planificadas (canal/etiqueta/destino/flujo de reinicio) sin escribir configuración, instalar, sincronizar complementos ni reiniciar.
- `--json`: imprime JSON `UpdateRunResult` legible por máquina.
- `--timeout <seconds>`: tiempo de espera por paso (el valor predeterminado es 1200s).

Nota: las degradaciones requieren confirmación porque las versiones anteriores pueden romper la configuración.

## `update status`

Muestra el canal de actualización activo + etiqueta/rama/SHA de git (para fuentes de checkout), además de la disponibilidad de actualización.

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

Opciones:

- `--json`: imprime JSON de estado legible por máquina.
- `--timeout <seconds>`: tiempo de espera para las comprobaciones (el valor predeterminado es 3s).

## `update wizard`

Flujo interactivo para seleccionar un canal de actualización y confirmar si se debe reiniciar el Gateway
después de actualizar (el valor predeterminado es reiniciar). Si seleccionas `dev` sin un checkout de git,
se ofrece crear uno.

## Lo que hace

Cuando cambias de canal explícitamente (`--channel ...`), OpenClaw también mantiene alineado
el método de instalación:

- `dev` → asegura un checkout de git (predeterminado: `~/openclaw`, anular con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable`/`beta` → instala desde npm usando la dist-tag correspondiente.

El actualizador automático del núcleo de Gateway (cuando está habilitado mediante configuración) reutiliza esta misma ruta de actualización.

## Flujo de checkout de Git

Canales:

- `stable`: hace checkout de la etiqueta no beta más reciente, luego build + doctor.
- `beta`: hace checkout de la etiqueta `-beta` más reciente, luego build + doctor.
- `dev`: hace checkout de `main`, luego fetch + rebase.

Nivel alto:

1. Requiere un árbol de trabajo limpio (sin cambios sin confirmar).
2. Cambia al canal seleccionado (etiqueta o rama).
3. Obtiene las actualizaciones de upstream (solo dev).
4. Solo dev: lint de pre-vuelo + compilación de TypeScript en un árbol de trabajo temporal; si la punta falla, retrocede hasta 10 commits para encontrar la compilación limpia más reciente.
5. Hace rebase sobre el commit seleccionado (solo dev).
6. Instala dependencias (se prefiere pnpm; alternativa npm).
7. Compila + compila la Interfaz de Control.
8. Ejecuta `openclaw doctor` como la verificación final de "actualización segura".
9. Sincroniza los complementos con el canal activo (dev usa extensiones empaquetadas; stable/beta usa npm) y actualiza los complementos instalados por npm.

## Abreviatura de `--update`

`openclaw --update` se reescribe como `openclaw update` (útil para shells y scripts de lanzador).

## Véase también

- `openclaw doctor` (ofrece ejecutar la actualización primero en los checkouts de git)
- [Canales de desarrollo](/es/install/development-channels)
- [Actualización](/es/install/updating)
- [Referencia de CLI](/es/cli)

import es from "/components/footer/es.mdx";

<es />
