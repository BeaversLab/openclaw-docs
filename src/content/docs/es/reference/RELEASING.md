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
- Cada versión estable de OpenClaw envía el paquete npm y la aplicación de macOS juntos;
  las versiones beta normalmente validan y publican primero la ruta npm/paquete, con
  n la compilación/firma/notarización de la aplicación mac reservada para la versión estable a menos que se solicite explícitamente

## Cadencia de lanzamientos

- Los lanzamientos se mueven primero a beta
- La versión estable solo se realiza después de validar la última beta
- Los mantenedores normalmente cortan las versiones desde una rama `release/YYYY.M.D` creada
  desde el `main` actual, por lo que la validación de la versión y las correcciones no bloquean el nuevo
  desarrollo en `main`
- Si se ha enviado o publicado una etiqueta beta y necesita una corrección, los mantenedores cortan
  la siguiente etiqueta `-beta.N` en lugar de eliminar o recrear la etiqueta beta anterior
- El procedimiento detallado de lanzamiento, aprobaciones, credenciales y notas de recuperación son
  solo para mantenedores

## Preflight de lanzamiento

- Ejecute `pnpm check:test-types` antes del preflight de lanzamiento para que el TypeScript de prueba se mantenga
  cubierto fuera del ciclo local `pnpm check` más rápido
- Ejecute `pnpm check:architecture` antes del preflight de lanzamiento para que los más amplios ciclos de
  importación y las verificaciones de límites de arquitectura estén en verde fuera del ciclo local más rápido
- Ejecute `pnpm build && pnpm ui:build` antes de `pnpm release:check` para que los
  artefactos de versión `dist/*` esperados y el paquete de Control UI existan para el paso de
  validación del paquete
- Ejecute `pnpm release:check` antes de cada versión etiquetada
- Las verificaciones de lanzamiento ahora se ejecutan en un flujo de trabajo manual separado:
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` también ejecuta el gate de paridad simulada del QA Lab más los carriles QA en vivo de Matrix y Telegram antes de la aprobación de la versión. Los carriles en vivo utilizan el entorno `qa-live-shared`; Telegram también utiliza los arrendamientos de credenciales de Convex CI.
- La validación de tiempo de ejecución de instalación y actualización multi-OS se despacha desde el flujo de trabajo de llamada privada `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`, que invoca el flujo de trabajo público reutilizable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- Esta división es intencional: mantener la ruta real de publicación en npm corta, determinista y centrada en artefactos, mientras que las verificaciones en vivo más lentas se mantienen en su propio carril para que no detengan o bloqueen la publicación
- Las verificaciones de versión deben ser despachadas desde la referencia del flujo de trabajo `main` o desde una referencia del flujo de trabajo `release/YYYY.M.D` para que la lógica y los secretos del flujo de trabajo permanezcan controlados
- Ese flujo de trabajo acepta una etiqueta de versión existente o el SHA de confirmación actual de 40 caracteres de la rama del flujo de trabajo
- En modo SHA de confirmación, solo acepta el HEAD actual de la rama del flujo de trabajo; use una etiqueta de versión para confirmaciones de versión anteriores
- El preflight de solo validación `OpenClaw NPM Release` también acepta el SHA de confirmación actual de 40 caracteres de la rama del flujo de trabajo sin requerir una etiqueta enviada
- Esa ruta SHA es solo de validación y no puede ser promovida a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la verificación de metadatos del paquete; la publicación real aún requiere una etiqueta de versión real
- Ambos flujos de trabajo mantienen la ruta real de publicación y promoción en ejecutores alojados en GitHub, mientras que la ruta de validación no mutante puede usar los ejecutores Linux más grandes de Blacksmith
- Ese flujo de trabajo ejecuta `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache` utilizando tanto los secretos del flujo de trabajo `OPENAI_API_KEY` como `ANTHROPIC_API_KEY`
- El preflight de publicación de npm ya no espera en el carril separado de verificaciones de versión
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts` (o la etiqueta beta/correspondiente coincidente) antes de la aprobación
- Después de la publicación en npm, ejecute `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D` (o la versión beta/correspondiente coincidente) para verificar la ruta de instalación del registro publicado en un prefijo temporal nuevo
- La automatización de versiones del mantenedor ahora usa preflight-then-promote:
  - la publicación real en npm debe pasar una comprobación `preflight_run_id` de npm exitosa
  - la publicación real en npm debe enviarse desde la misma rama `main` o
    `release/YYYY.M.D` que la ejecución de preflight exitosa
  - las publicaciones estables en npm tienen por defecto `beta`
  - la publicación estable en npm puede apuntar a `latest` explícitamente mediante la entrada del flujo de trabajo
  - la mutación de dist-tags de npm basada en tokens ahora reside en
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    por seguridad, porque `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras que
    el repositorio público mantiene la publicación solo mediante OIDC
  - el `macOS Release` público es solo de validación
  - la publicación privada real en mac debe pasar el mac privado `preflight_run_id` y `validate_run_id` exitosos
  - las rutas de publicación reales promueven los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para correcciones de lanzamiento estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de lanzamiento no dejen silenciosamente instalaciones globales antiguas en el
  payload estable base
- el preflight de lanzamiento de npm falla de forma cerrada a menos que el tarball incluya ambos
  `dist/control-ui/index.html` y un payload `dist/control-ui/assets/` no vacío
  para que no enviemos un tablero de navegador vacío nuevamente
- La verificación posterior a la publicación también verifica que la instalación del registro publicado
  contenga dependencias de ejecución de complementos agrupadas no vacías bajo el diseño raíz `dist/*`.
  Un lanzamiento que se envía con cargas de dependencia de complementos agrupadas faltantes o vacías falla el verificador posterior a la publicación y no se puede promover
  a `latest`.
- `pnpm test:install:smoke` también impone el presupuesto de `unpackedSize` de npm pack en
  el tarball de actualización candidata, por lo que el instalador e2e detecta el aumento accidental del paquete
  antes de la ruta de publicación del lanzamiento
- Si el trabajo de lanzamiento tocó la planificación de CI, los manifiestos de tiempo de extensión o
  las matrices de prueba de extensión, regenere y revise las salidas de la matriz de flujo de trabajo
  `checks-node-extensions` propiedad del planificador desde `.github/workflows/ci.yml`
  antes de la aprobación para que las notas de la versión no describan un diseño de CI obsoleto
- La preparación del lanzamiento estable de macOS también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con el `.zip`, `.dmg` y `.dSYM.zip` empaquetados
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación
  - la aplicación empaquetada debe mantener un id de paquete no de depuración, una URL de canal Sparkle no vacía
    y un `CFBundleVersion` en o por encima del suelo de compilación canónico de Sparkle
    para esa versión de lanzamiento

## Entradas del flujo de trabajo de NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida como `v2026.4.2`, `v2026.4.2-1` o
  `v2026.4.2-beta.1`; cuando `preflight_only=true`, también puede ser el SHA de confirmación
  completo de 40 caracteres de la rama de flujo de trabajo actual para la verificación previa de solo validación
- `preflight_only`: `true` solo para validación/construcción/empaquetado, `false` para la
  ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo reutilice
  el tarball preparado de la ejecución de verificación previa exitosa
- `npm_dist_tag`: etiqueta de destino npm para la ruta de publicación; por defecto es `beta`

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: etiqueta de lanzamiento existente o el SHA de confirmación completo de 40 caracteres actual `main`
  para validar cuando se envía desde `main`; desde una rama de lanzamiento, use una
  etiqueta de lanzamiento existente o el SHA de confirmación completo de 40 caracteres de la rama de lanzamiento actual

Reglas:

- Las etiquetas estables y de corrección pueden publicar en `beta` o `latest`
- Las etiquetas de versión preliminar beta solo pueden publicar en `beta`
- Para `OpenClaw NPM Release`, la entrada de SHA de confirmación completo solo se permite cuando
  `preflight_only=true`
- `OpenClaw Release Checks` es siempre de solo validación y también acepta el
  SHA de confirmación de la rama de flujo de trabajo actual
- El modo SHA de confirmación de las comprobaciones de lanzamiento también requiere el HEAD actual de la rama de flujo de trabajo
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante el preflight; el flujo de trabajo verifica esos metadatos antes de que continúe la publicación

## Secuencia de lanzamiento npm estable

Al preparar un lanzamiento npm estable:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de confirmación completo de la rama del flujo de trabajo actual para una ejecución en seco de solo validación del flujo de trabajo de preflight
2. Elija `npm_dist_tag=beta` para el flujo normal de beta primero, o `latest` solo cuando intencionalmente desee una publicación estable directa
3. Ejecute `OpenClaw Release Checks` por separado con la misma etiqueta o el SHA de confirmación completo de la rama del flujo de trabajo actual cuando desee caché de avisos en vivo, paridad de QA Lab, Matrix y cobertura de Telegram
   - Esto está separado a propósito para que la cobertura en vivo siga disponible sin volver a acoplar verificaciones de larga duración o inestables al flujo de trabajo de publicación
4. Guarde el `preflight_run_id` exitoso
5. Ejecute `OpenClaw NPM Release` nuevamente con `preflight_only=false`, el mismo `tag`, el mismo `npm_dist_tag` y el `preflight_run_id` guardado
6. Si el lanzamiento aterrizó en `beta`, use el flujo de trabajo privado `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` para promover esa versión estable de `beta` a `latest`
7. Si el lanzamiento se publicó intencionalmente directamente en `latest` y `beta` debe seguir la misma compilación estable inmediatamente, use ese mismo flujo de trabajo privado para apuntar ambas dist-tags a la versión estable, o deje que su sincronización programada de autoreparación mueva `beta` más tarde

La mutación de dist-tags vive en el repositorio privado por seguridad porque aún requiere `NPM_TOKEN`, mientras que el repositorio público mantiene la publicación solo OIDC.

Eso mantiene la ruta de publicación directa y la ruta de promoción beta primero documentadas y visibles para el operador.

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Los encargados del mantenimiento utilizan los documentos de lanzamiento privados en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos real.
