---
summary: "Canales estable, beta y dev: semántica, cambio, fijación y etiquetado"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "Canales de lanzamiento"
sidebarTitle: "Canales de lanzamiento"
---

# Canales de desarrollo

OpenClaw ofrece tres canales de actualización:

- **estable**: npm dist-tag `latest`. Recomendado para la mayoría de usuarios.
- **beta**: npm dist-tag `beta` (compilaciones en prueba).
- **dev**: cabeza móvil de `main` (git). npm dist-tag: `dev` (cuando se publica).
  La rama `main` es para experimentación y desarrollo activo. Puede contener
  funciones incompletas o cambios rupturistas. No la utilice para pasarelas de producción.

Enviamos compilaciones a **beta**, las probamos y luego **promovemos una compilación verificada a `latest`**
sin cambiar el número de versión: las dist-tags son la fuente de verdad para las instalaciones de npm.

## Cambiar de canal

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` persiste su elección en la configuración (`update.channel`) y alinea el
método de instalación:

- **`stable`/`beta`** (instalaciones de paquetes): actualizaciones a través del npm dist-tag coincidente.
- **`stable`/`beta`** (instalaciones de git): verifica la etiqueta git coincidente más reciente.
- **`dev`**: asegura una copia de trabajo git (por defecto `~/openclaw`, sobrescribir con
  `OPENCLAW_GIT_DIR`), cambia a `main`, hace rebase sobre upstream, compila e
  instala la CLI global desde esa copia de trabajo.

Consejo: si desea stable + dev en paralelo, mantenga dos clonaciones y apunte su
pasarela a la estable.

## Destino de versión o etiqueta puntual

Use `--tag` para apuntar a un dist-tag, versión o especificación de paquete específico para una sola
actualización **sin** cambiar su canal persistente:

```bash
# Install a specific version
openclaw update --tag 2026.3.22

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Install from GitHub main branch (npm tarball)
openclaw update --tag main

# Install a specific npm package spec
openclaw update --tag openclaw@2026.3.22
```

Notas:

- `--tag` se aplica **solo a instalaciones de paquetes (npm)**. Las instalaciones de git lo ignoran.
- La etiqueta no se persiste. Su próximo `openclaw update` utiliza su
  canal configurado como de costumbre.
- Protección de desactualización: si la versión de destino es anterior a su versión actual,
  OpenClaw solicita confirmación (omítalo con `--yes`).

## Ejecución en seco

Vista previa de lo que haría `openclaw update` sin realizar cambios:

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.3.22 --dry-run
openclaw update --dry-run --json
```

La ejecución en seco muestra el canal efectivo, la versión de destino, las acciones planificadas y
si se requeriría una confirmación de desactualización.

## Complementos y canales

Cuando cambias de canal con `openclaw update`, OpenClaw también sincroniza las
fuentes de los complementos:

- `dev` prefiere los complementos incluidos del git checkout.
- `stable` y `beta` restauran los paquetes de complementos instalados por npm.
- Los complementos instalados por npm se actualizan después de que se completa la actualización del núcleo.

## Verificar el estado actual

```bash
openclaw update status
```

Muestra el canal activo, el tipo de instalación (git o paquete), la versión actual y
la fuente (config, git tag, git branch o default).

## Mejores prácticas de etiquetado

- Etiqueta las versiones que deseas que alcancen los git checkouts (`vYYYY.M.D` para estable,
  `vYYYY.M.D-beta.N` para beta).
- `vYYYY.M.D.beta.N` también se reconoce por compatibilidad, pero se prefiere `-beta.N`.
- Las etiquetas `vYYYY.M.D-<patch>` heredadas todavía se reconocen como estables (no beta).
- Mantén las etiquetas inmutables: nunca muevas o reutilices una etiqueta.
- Las npm dist-tags siguen siendo la fuente de verdad para las instalaciones de npm:
  - `latest` -> estable
  - `beta` -> compilación candidata
  - `dev` -> instantánea principal (opcional)

## Disponibilidad de la aplicación macOS

Las compilaciones beta y de desarrollo **pueden no** incluir una versión de la aplicación macOS. Eso está bien:

- La etiqueta git y la npm dist-tag todavía se pueden publicar.
- Indica "no hay compilación de macOS para esta beta" en las notas de la versión o el registro de cambios.

import es from "/components/footer/es.mdx";

<es />
