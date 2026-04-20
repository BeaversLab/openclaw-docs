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
- Las comprobaciones de lanzamiento ahora se ejecutan en un flujo de trabajo manual separado:
  `OpenClaw Release Checks`
- La validación del tiempo de ejecución de instalación y actualización multi-OS se despacha desde el
  flujo de trabajo de llamada privada
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`,
  que invoca el flujo de trabajo público reutilizable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- Esta división es intencional: mantener la ruta de lanzamiento real de npm corta,
  determinista y centrada en artefactos, mientras que las comprobaciones en vivo más lentas permanecen en su
  propio carril para que no detengan o bloqueen la publicación
- Las comprobaciones de lanzamiento deben despacharse desde la referencia del flujo de trabajo `main` para que la
  lógica del flujo de trabajo y los secretos se mantengan canónicos
- Ese flujo de trabajo acepta una etiqueta de lanzamiento existente o el SHA de confirmación
  completo de 40 caracteres actual `main`
- En modo SHA de confirmación, solo acepta el HEAD actual `origin/main`; use una
  etiqueta de lanzamiento para confirmaciones de lanzamiento anteriores
- El preflight de solo validación `OpenClaw NPM Release` también acepta el
  SHA de confirmación completo de 40 caracteres actual `main` sin requerir una etiqueta enviada
- Esa ruta SHA es solo de validación y no se puede promocionar a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la
  verificación de metadatos del paquete; la publicación real todavía requiere una etiqueta de lanzamiento real
- Ambos flujos de trabajo mantienen la ruta real de publicación y promoción en ejecutores
  alojados en GitHub, mientras que la ruta de validación no mutable puede usar los ejecutores
  Linux de Blacksmith más grandes
- Ese flujo de trabajo ejecuta
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  usando tanto los secretos del flujo de trabajo `OPENAI_API_KEY` como `ANTHROPIC_API_KEY`
- El preflight de lanzamiento de npm ya no espera en el carril separado de comprobaciones de lanzamiento
- Ejecute `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección correspondiente) antes de la aprobación
- Después de la publicación en npm, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección correspondiente) para verificar la ruta de instalación
  del registro publicado en un prefijo temporal nuevo
- La automatización de lanzamiento del mantenedor ahora usa preflight-then-promote:
  - la publicación real en npm debe pasar un `preflight_run_id` de npm exitoso
  - los lanzamientos estables de npm por defecto son `beta`
  - la publicación estable en npm puede apuntar a `latest` explícitamente a través de la entrada del flujo de trabajo
  - la mutación de dist-tag de npm basada en token ahora reside en
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    por seguridad, porque `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras que el
    repositorio público mantiene solo publicación OIDC
  - el `macOS Release` público es solo de validación
  - la publicación real privada de mac debe pasar una private mac
    `preflight_run_id` exitosa y `validate_run_id`
  - las rutas de publicación reales promocionan los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para correcciones de versiones estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también verifica la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de versiones no puedan dejar silenciosamente instalaciones globales antiguas en la
  carga útil estable base
- el pre-lanzamiento de npm falla cerrado a menos que el tarball incluya ambos
  `dist/control-ui/index.html` y una carga útil `dist/control-ui/assets/` no vacía
  para no volver a enviar un tablero del navegador vacío
- `pnpm test:install:smoke` también impone el presupuesto `unpackedSize` de npm pack en
  el tarball de actualización candidato, por lo que el instalador e2e detecta hinchazón accidental del pack
  antes de la ruta de publicación de la versión
- Si el trabajo de la versión tocó la planificación de CI, los manifiestos de temporización de extensiones o
  las matrices de prueba de extensiones, regenere y revise las salidas de matriz de flujo de trabajo
  `checks-node-extensions` propiedad del planificador desde `.github/workflows/ci.yml`
  antes de la aprobación para que las notas de la versión no describan un diseño de CI obsoleto
- La preparación para el lanzamiento de macOS estable también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con el `.zip` empaquetado, `.dmg` y `.dSYM.zip`
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación
  - la aplicación empaquetada debe mantener un id de bundle no de depuración, una URL de feed Sparkle no vacía
    y un `CFBundleVersion` en o por encima del piso de compilación canónico de Sparkle
    para esa versión

## Entradas del flujo de trabajo NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de lanzamiento requerida como `v2026.4.2`, `v2026.4.2-1` o
  `v2026.4.2-beta.1`; cuando es `preflight_only=true`, también puede ser el SHA
  de commit `main` completo de 40 caracteres actual para un preflight de solo validación
- `preflight_only`: `true` para validación/construcción/empaquetado solo, `false` para la
  ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo reutilice
  el archivo tar preparado desde la ejecución de preflight exitosa
- `npm_dist_tag`: etiqueta de destino de npm para la ruta de publicación; por defecto es `beta`

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: etiqueta de lanzamiento existente o el SHA de commit `main` completo de 40 caracteres actual
  para validar

Reglas:

- Las etiquetas estables y de corrección pueden publicar en `beta` o `latest`
- Las etiquetas de prelanzamiento beta pueden publicar solo en `beta`
- La entrada de SHA de commit completo solo se permite cuando es `preflight_only=true`
- El modo de SHA de commit de comprobaciones de lanzamiento también requiere el HEAD `origin/main` actual
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante el preflight;
  el flujo de trabajo verifica esos metadatos antes de continuar la publicación

## Secuencia de lanzamiento npm estable

Al preparar un lanzamiento npm estable:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de commit `main` completo actual para una
     ejecución de prueba de validación del flujo de trabajo de preflight
2. Elija `npm_dist_tag=beta` para el flujo normal de beta primero, o `latest` solo
   cuando intencionalmente desee una publicación estable directa
3. Ejecute `OpenClaw Release Checks` por separado con la misma etiqueta o el
   SHA de commit `main` completo actual cuando desee cobertura de caché de avisos en vivo
   - Esto está separado a propósito para que la cobertura en vivo siga disponible sin
     recoplar verificaciones de larga duración o inestables en el flujo de trabajo de publicación
4. Guarda el `preflight_run_id` exitoso
5. Ejecuta `OpenClaw NPM Release` nuevamente con `preflight_only=false`, el mismo
   `tag`, el mismo `npm_dist_tag` y el `preflight_run_id` guardado
6. Si la versión llegó a `beta`, usa el flujo de trabajo privado
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   para promover esa versión estable de `beta` a `latest`
7. Si la versión se publicó intencionalmente directamente en `latest` y `beta`
   debe seguir la misma compilación estable inmediatamente, usa ese mismo flujo de trabajo
   privado para apuntar ambas dist-tags a la versión estable, o deja que su
   sincronización programada de auto-reparación mueva `beta` más tarde

La mutación de la dist-tag vive en el repositorio privado por seguridad porque todavía
requiere `NPM_TOKEN`, mientras que el repositorio público mantiene la publicación solo con OIDC.

Eso mantiene tanto la ruta de publicación directa como la ruta de promoción beta-primeras documentadas
y visibles para los operadores.

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Los mantenedores usan la documentación de lanzamiento privada en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de operaciones real.
