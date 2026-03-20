---
summary: "Canales stable, beta y dev: semántica, cambio y etiquetado"
read_when:
  - Quieres cambiar entre stable/beta/dev
  - Estás etiquetando o publicando prereleases
title: "Canales de desarrollo"
---

# Canales de desarrollo

Última actualización: 2026-01-21

OpenClaw distribuye tres canales de actualización:

- **stable**: npm dist-tag `latest`.
- **beta**: npm dist-tag `beta` (compilaciones en pruebas).
- **dev**: cabecera móvil de `main` (git). npm dist-tag: `dev` (cuando se publique).

Enviamos compilaciones a **beta**, las probamos y luego **promovemos una compilación verificada a `latest`**
sin cambiar el número de versión: las dist-tags son la fuente de verdad para las instalaciones de npm.

## Cambiar de canal

Git checkout:

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` hace checkout de la etiqueta coincidente más reciente (a menudo la misma etiqueta).
- `dev` cambia a `main` y hace rebase en el upstream.

Instalación global npm/pnpm:

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

Esto se actualiza mediante el npm dist-tag correspondiente (`latest`, `beta`, `dev`).

Cuando cambias de canal **explícitamente** con `--channel`, OpenClaw también alinea
el método de instalación:

- `dev` asegura un git checkout (por defecto `~/openclaw`, anular con `OPENCLAW_GIT_DIR`),
  lo actualiza e instala la CLI global desde ese checkout.
- `stable`/`beta` instala desde npm usando el dist-tag coincidente.

Consejo: si quieres stable + dev en paralelo, mantén dos clones y apunta tu gateway al estable.

## Complementos y canales

Cuando cambias de canal con `openclaw update`, OpenClaw también sincroniza las fuentes de los complementos:

- `dev` prefiere complementos incluidos desde el git checkout.
- `stable` y `beta` restauran los paquetes de complementos instalados por npm.

## Mejores prácticas de etiquetado

- Etiqueta las versiones que quieres que los git checkouts alcancen (`vYYYY.M.D` para stable, `vYYYY.M.D-beta.N` para beta).
- `vYYYY.M.D.beta.N` también se reconoce por compatibilidad, pero se prefiere `-beta.N`.
- Las etiquetas `vYYYY.M.D-<patch>` heredadas todavía se reconocen como estables (no beta).
- Mantenga las etiquetas inmutables: nunca mueva o reutilice una etiqueta.
- npm dist-tags sigue siendo la fuente de verdad para las instalaciones de npm:
  - `latest` → estable
  - `beta` → versión candidata
  - `dev` → instantánea principal (opcional)

## Disponibilidad de la aplicación macOS

Las versiones beta y dev **puede que no** incluyan una versión de la aplicación macOS. Esto está bien:

- La etiqueta de git y la etiqueta de distribución de npm todavía se pueden publicar.
- Indique “no hay compilación de macOS para esta beta” en las notas de la versión o el registro de cambios.

import en from "/components/footer/en.mdx";

<en />
