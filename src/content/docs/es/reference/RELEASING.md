---
title: "Release Policy"
summary: "Public release channels, version naming, and cadence"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# Política de lanzamiento

OpenClaw tiene tres carriles de lanzamiento públicos:

- estable: versiones etiquetadas que se publican en npm `beta` de forma predeterminada, o en npm `latest` cuando se solicita explícitamente
- beta: etiquetas de versión previa que se publican en npm `beta`
- dev: la cabeza móvil de `main`

## Nomenclatura de versiones

- Versión de lanzamiento estable: `YYYY.M.D`
  - Etiqueta de Git: `vYYYY.M.D`
- Versión de lanzamiento de corrección estable: `YYYY.M.D-N`
  - Etiqueta de Git: `vYYYY.M.D-N`
- Versión de prelanzamiento beta: `YYYY.M.D-beta.N`
  - Etiqueta de Git: `vYYYY.M.D-beta.N`
- No rellene con ceros el mes o el día
- `latest` significa el lanzamiento npm estable promovido actual
- `beta` significa el objetivo de instalación beta actual
- Los lanzamientos estables y de corrección estable se publican en npm `beta` de forma predeterminada; los operadores de lanzamiento pueden apuntar a `latest` explícitamente, o promover una compilación beta verificada más tarde
- Cada lanzamiento de OpenClaw distribuye el paquete npm y la aplicación de macOS juntos

## Cadencia de lanzamientos

- Los lanzamientos se mueven primero a beta
- La versión estable solo se realiza después de validar la última beta
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  solo para los mantenedores

## Previo al lanzamiento

- Ejecute `pnpm build && pnpm ui:build` antes de `pnpm release:check` para que los artefactos de lanzamiento `dist/*` y el paquete de UI de Control esperados existan para el paso de validación del paquete
- Ejecute `pnpm release:check` antes de cada lanzamiento etiquetado
- La verificación previa de npm en la rama principal también ejecuta `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache` antes de empaquetar el tarball, utilizando tanto los secretos de flujo de trabajo `OPENAI_API_KEY` como `ANTHROPIC_API_KEY`
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts` (o la etiqueta beta/corrección coincidente) antes de la aprobación
- Después de la publicación en npm, ejecute `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D` (o la versión beta/corrección coincidente) para verificar la ruta de instalación del registro publicado en un prefijo temporal nuevo
- La automatización de lanzamientos de los mantenedores ahora utiliza verificación previa y luego promoción:
  - la publicación real en npm debe pasar una `preflight_run_id` de npm exitosa
  - los lanzamientos estables de npm usan `beta` de forma predeterminada
  - la publicación estable de npm puede apuntar a `latest` explícitamente a través de la entrada del flujo de trabajo
  - la promoción estable de npm de `beta` a `latest` todavía está disponible como modo manual explícito en el flujo de trabajo de confianza `OpenClaw NPM Release`
  - ese modo de promoción aún necesita un `NPM_TOKEN` válido en el entorno `npm-release` porque la gestión de `dist-tag` de npm está separada de la publicación de confianza
  - el `macOS Release` público es solo de validación
  - la publicación real de mac privada debe pasar una mac privada exitosa
    `preflight_run_id` y `validate_run_id`
  - las rutas de publicación reales promueven los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para las correcciones de versiones estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de la versión no dejen silenciosamente instalaciones globales antiguas en la
  carga útil base estable
- la verificación previa al lanzamiento de npm falla de forma cerrada a menos que el archivo tar incluya ambos
  `dist/control-ui/index.html` y una carga útil `dist/control-ui/assets/` no vacía
  para no volver a enviar un panel de navegador vacío
- Si el trabajo de la versión afectó la planificación de CI, los manifiestos de temporización de extensiones o las matrices de pruebas de extensiones, regenere y revise las salidas de la matriz del flujo de trabajo `checks-node-extensions` propiedad del planificador desde `.github/workflows/ci.yml` antes de la aprobación para que las notas de la versión no describan un diseño de CI obsoleto
- La preparación para el lanzamiento estable de macOS también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con el `.zip`, `.dmg` y `.dSYM.zip` empaquetados
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación
  - la aplicación empaquetada debe mantener un id de paquete no de depuración, una URL de feed Sparkle
    no vacía y un `CFBundleVersion` en o por encima del piso de compilación canónico de Sparkle
    para esa versión

## Entradas de flujo de trabajo de NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida como `v2026.4.2`, `v2026.4.2-1`, o
  `v2026.4.2-beta.1`
- `preflight_only`: `true` para validación/construcción/empaquetado solamente, `false` para la
  ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo reutilice
  el archivo tar preparado desde la ejecución de preflight exitosa
- `npm_dist_tag`: etiqueta de destino de npm para la ruta de publicación; por defecto es `beta`
- `promote_beta_to_latest`: `true` para omitir la publicación y mover una compilación
  estable `beta` ya publicada a `latest`

Reglas:

- Las etiquetas estables y de corrección pueden publicarse tanto en `beta` como en `latest`
- Las etiquetas de prerelease beta solo pueden publicarse en `beta`
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante el preflight;
  el flujo de trabajo verifica esos metadatos antes de continuar con la publicación
- El modo de promoción debe usar una etiqueta estable o de corrección, `preflight_only=false`,
  un `preflight_run_id` vacío y `npm_dist_tag=beta`
- El modo de promoción también requiere un `NPM_TOKEN` válido en el entorno `npm-release`
  porque `npm dist-tag add` todavía necesita autenticación regular de npm

## Secuencia de lanzamiento npm estable

Al realizar un lanzamiento npm estable:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
2. Elija `npm_dist_tag=beta` para el flujo normal beta-first, o `latest` solo
   cuando intencionalmente desee una publicación estable directa
3. Guarde el `preflight_run_id` exitoso
4. Ejecute `OpenClaw NPM Release` nuevamente con `preflight_only=false`, el mismo
   `tag`, el mismo `npm_dist_tag` y el `preflight_run_id` guardado
5. Si el lanzamiento aterrizó en `beta`, ejecute `OpenClaw NPM Release` más tarde con el
   mismo `tag` estable, `promote_beta_to_latest=true`, `preflight_only=false`,
   `preflight_run_id` vacío y `npm_dist_tag=beta` cuando quiera mover esa
   compilación publicada a `latest`

El modo de promoción todavía requiere la aprobación del entorno `npm-release` y un
`NPM_TOKEN` válido en ese entorno.

Esto mantiene tanto la ruta de publicación directa como la ruta de promoción beta
primero documentadas y visibles para el operador.

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Los mantenedores utilizan la documentación de lanzamiento privada en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos actual.
