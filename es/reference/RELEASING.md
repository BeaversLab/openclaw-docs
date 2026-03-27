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
- Versión de lanzamiento de corrección estable: `YYYY.M.D-N`
  - Etiqueta de Git: `vYYYY.M.D-N`
- Versión de prelanzamiento beta: `YYYY.M.D-beta.N`
  - Etiqueta de Git: `vYYYY.M.D-beta.N`
- No rellene con ceros el mes o el día
- `latest` significa el lanzamiento estable actual de npm
- `beta` significa el lanzamiento de prelanzamiento actual de npm
- Los lanzamientos de corrección estables también se publican en npm `latest`
- Cada lanzamiento de OpenClaw distribuye el paquete npm y la aplicación de macOS juntos

## Cadencia de lanzamientos

- Los lanzamientos se mueven primero a beta
- La versión estable solo se realiza después de validar la última beta
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  solo para los mantenedores

## Previo al lanzamiento

- Ejecute `pnpm build` antes de `pnpm release:check` para que existan los artefactos de lanzamiento `dist/*` esperados
  para el paso de validación del paquete
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección correspondiente) antes de la aprobación
- Después de npm publish, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección correspondiente) para verificar la ruta de instalación del registro publicado
  en un prefijo temporal nuevo
- Para los lanzamientos de corrección estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal desde `YYYY.M.D` hasta `YYYY.M.D-N`
  para que las correcciones de lanzamiento no puedan silenciosamente dejar instalaciones globales más antiguas en
  la carga útil estable base
- El previo al lanzamiento de npm falla cerrado a menos que el archivo tar incluya ambos
  `dist/control-ui/index.html` y una carga útil `dist/control-ui/assets/` no vacía
  para que no volvamos a distribuir un tablero de navegador vacío
- La preparación del lanzamiento de macOS estable también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con el `.zip` empaquetado, `.dmg` y `.dSYM.zip`
  - `appcast.xml` en `main` debe apuntar al zip estable nuevo después de la publicación
  - la aplicación empaquetada debe mantener un identificador de bundle que no sea de depuración, una URL de fuente de Sparkle no vacía y un `CFBundleVersion` en o por encima del límite de compilación canónico de Sparkle para esa versión de lanzamiento

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Los mantenedores utilizan la documentación de lanzamiento privada en [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) para el manual de operaciones real.

import es from "/components/footer/es.mdx";

<es />
