---
summary: "Canales estable, beta y dev: semántica, cambio y etiquetado"
read_when:
  - You want to switch between stable/beta/dev
  - You are tagging or publishing prereleases
title: "Canales de desarrollo"
---

# Canales de desarrollo

Última actualización: 2026-01-21

OpenClaw ofrece tres canales de actualización:

- **estable**: npm dist-tag `latest`.
- **beta**: npm dist-tag `beta` (versiones en pruebas).
- **dev**: cabecera móvil de `main` (git). npm dist-tag: `dev` (cuando se publique).

Enviamos versiones a **beta**, las probamos y luego **promovemos una versión verificada a `latest`**
sin cambiar el número de versión — los dist-tags son la fuente de verdad para las instalaciones de npm.

## Cambiar de canal

Git checkout:

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` checkout de la última etiqueta coincidente (a menudo la misma etiqueta).
- `dev` cambia a `main` y hace rebase en el repositorio ascendente.

Instalación global con npm/pnpm:

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

Esto se actualiza a través del npm dist-tag correspondiente (`latest`, `beta`, `dev`).

Cuando cambias **explícitamente** de canal con `--channel`, OpenClaw también alinea
el método de instalación:

- `dev` asegura un git checkout (por defecto `~/openclaw`, anular con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable`/`beta` se instala desde npm usando el dist-tag coincidente.

Consejo: si quieres tener estable + dev en paralelo, mantén dos clones y apunta tu gateway al estable.

## Complementos y canales

Cuando cambias de canal con `openclaw update`, OpenClaw también sincroniza las fuentes de los complementos:

- `dev` prefiere los complementos incluidos en el git checkout.
- `stable` y `beta` restauran los paquetes de complementos instalados por npm.

## Mejores prácticas de etiquetado

- Etiqueta las versiones que quieres que los git checkouts alcancen (`vYYYY.M.D` para estable, `vYYYY.M.D-beta.N` para beta).
- `vYYYY.M.D.beta.N` también se reconoce por compatibilidad, pero se prefiere `-beta.N`.
- Las etiquetas `vYYYY.M.D-<patch>` heredadas todavía se reconocen como estables (no beta).
- Mantén las etiquetas inmutables: nunca muevas o reutilices una etiqueta.
- Las dist-tags de npm siguen siendo la fuente de verdad para las instalaciones de npm:
  - `latest` → estable
  - `beta` → compilación candidata
  - `dev` → instantánea principal (opcional)

## Disponibilidad de la aplicación macOS

Las compilaciones beta y de desarrollo pueden **no** incluir un lanzamiento de la aplicación macOS. Eso está bien:

- La etiqueta git y la dist-tag de npm aún se pueden publicar.
- Destaca “no hay compilación de macOS para esta beta” en las notas de la versión o el registro de cambios.

import es from "/components/footer/es.mdx";

<es />
