---
title: "Release Policy"
summary: "Public release channels, version naming, and cadence"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# Política de lanzamiento

OpenClaw tiene tres carriles de lanzamiento públicos:

- stable: versiones etiquetadas que se publican en npm `latest` y reflejan la misma versión en `beta` a menos que `beta` ya apunte a una versión preliminar más reciente
- beta: etiquetas de versión preliminar que se publican en npm `beta`
- dev: la cabecera móvil de `main`

## Nomenclatura de versiones

- Versión de lanzamiento estable: `YYYY.M.D`
  - Etiqueta Git: `vYYYY.M.D`
- Versión de lanzamiento de corrección estable: `YYYY.M.D-N`
  - Etiqueta Git: `vYYYY.M.D-N`
- Versión preliminar beta: `YYYY.M.D-beta.N`
  - Etiqueta Git: `vYYYY.M.D-beta.N`
- No rellene con ceros el mes o el día
- `latest` significa el lanzamiento estable actual de npm
- `beta` significa el objetivo de instalación beta actual, que puede apuntar a la versión preliminar activa o a la compilación estable promovida más reciente
- Los lanzamientos estables y de corrección estable se publican en npm `latest` y también vuelven a etiquetar npm `beta` a esa misma versión no beta después de la promoción, a menos que `beta` ya apunte a una versión preliminar más reciente
- Cada lanzamiento de OpenClaw distribuye el paquete npm y la aplicación de macOS juntos

## Cadencia de lanzamientos

- Los lanzamientos se mueven primero a beta
- La versión estable solo se realiza después de validar la última beta
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  solo para los mantenedores

## Previo al lanzamiento

- Ejecute `pnpm build && pnpm ui:build` antes de `pnpm release:check` para que existan los artefactos de lanzamiento `dist/*` esperados y el paquete de Control UI para el paso de validación del paquete
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección correspondiente) antes de la aprobación
- Después de npm publish, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección correspondiente) para verificar la ruta de instalación del registro publicado en un prefijo temporal nuevo
- Los flujos de trabajo de los mantenedores pueden reutilizar una ejecución de preflight exitosa para la publicación real, de modo que el paso de publicación promueva los artefactos de lanzamiento preparados en lugar de reconstruirlos
- Para los lanzamientos de corrección estables como `YYYY.M.D-N`, el verificador posterior a la publicación también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N` para que las correcciones de lanzamiento no puedan dejar silenciosamente instalaciones globales antiguas en la carga útil estable base
- La comprobación previa del lanzamiento de npm falla a menos que el archivo tar incluya tanto
  `dist/control-ui/index.html` como una carga útil `dist/control-ui/assets/` no vacía
  para que no enviemos de nuevo un panel de navegador vacío
- Si el trabajo de lanzamiento afectó a la planificación de CI, manifiestos de tiempo de extensión o matrices de pruebas rápidas, regenere y revise el plan de fragmentos `checks-fast-extensions` propiedad del planificador a través de `node scripts/ci-write-manifest-outputs.mjs --workflow ci`
  antes de la aprobación para que las notas de la versión no describan un diseño de CI obsoleto
- La preparación para el lanzamiento estable de macOS también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con los paquetes `.zip`, `.dmg` y `.dSYM.zip`
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación
  - la aplicación empaquetada debe conservar un id de paquete que no sea de depuración, una URL de feed Sparkle no vacía
    y un `CFBundleVersion` en o por encima del límite de compilación canónico de Sparkle
    para esa versión de lanzamiento

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Los encargados del mantenimiento utilizan la documentación privada de lanzamientos en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de operaciones actual.
