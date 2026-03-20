---
title: "Política de versiones"
summary: "Canales de versiones públicas, nomenclatura de versiones y cadencia"
read_when:
  - Busca definiciones de canales de versión públicos
  - Busca nomenclatura de versiones y cadencia
---

# Política de versiones

OpenClaw tiene tres canales de versión pública:

- stable: versiones etiquetadas que se publican en npm `latest`
- beta: etiquetas de versión preliminar que se publican en npm `beta`
- dev: la cabecera móvil de `main`

## Nomenclatura de versiones

- Versión de lanzamiento estable: `YYYY.M.D`
  - Etiqueta de Git: `vYYYY.M.D`
- Versión de lanzamiento beta preliminar: `YYYY.M.D-beta.N`
  - Etiqueta de Git: `vYYYY.M.D-beta.N`
- No rellenes con ceros el mes o el día
- `latest` significa la versión estable actual de npm
- `beta` significa la versión preliminar actual de npm
- Las versiones beta pueden lanzarse antes de que la aplicación macOS se ponga al día

## Cadencia de lanzamientos

- Los lanzamientos se mueven primero a beta
- Estable solo sigue después de validar la última versión beta
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  solo para mantenedores

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

Los mantenedores utilizan la documentación de lanzamiento privada en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos real.

import es from "/components/footer/es.mdx";

<es />
