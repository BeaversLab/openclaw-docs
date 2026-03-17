---
title: "Release Policy"
summary: "Public release channels, version naming, and cadence"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# Política de lanzamiento

OpenClaw tiene tres carriles de lanzamiento públicos:

- stable: versiones etiquetadas que se publican en npm `latest`
- beta: etiquetas de prelanzamiento que se publican en npm `beta`
- dev: la cabeza móvil de `main`

## Nomenclatura de versiones

- Versión de lanzamiento estable: `YYYY.M.D`
  - Etiqueta de Git: `vYYYY.M.D`
- Versión de prelanzamiento beta: `YYYY.M.D-beta.N`
  - Etiqueta de Git: `vYYYY.M.D-beta.N`
- No rellene con ceros el mes o el día
- `latest` significa el lanzamiento estable actual de npm
- `beta` significa el lanzamiento de prelanzamiento actual de npm
- Las versiones beta pueden lanzarse antes de que la aplicación macOS se ponga al día

## Cadencia de lanzamiento

- Los lanzamientos se mueven primero a beta
- El estable sigue solo después de que se valide la última beta
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  solo para mantenedores

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

Los encargados del mantenimiento utilizan la documentación de lanzamiento privada en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos real.

import es from "/components/footer/es.mdx";

<es />
