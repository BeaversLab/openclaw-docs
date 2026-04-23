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
- La validación de tiempo de ejecución de instalación y actualización entre sistemas operativos se despacha desde el
  flujo de trabajo de llamador privado
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`,
  que invoca el flujo de trabajo público reutilizable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- Esta división es intencional: mantenga la ruta real de lanzamiento de npm corta,
  determinista y enfocada en artefactos, mientras que las verificaciones en vivo más lentas permanecen en su
  propio carril para no retrasar ni bloquear la publicación
- Las verificaciones de lanzamiento deben despacharse desde la referencia de flujo de trabajo `main` o desde una
  referencia de flujo de trabajo `release/YYYY.M.D` para que la lógica y los secretos del flujo de trabajo se mantengan
  controlados
- Ese flujo de trabajo acepta una etiqueta de lanzamiento existente o el SHA de confirmación completo
  actual de 40 caracteres de la rama de flujo de trabajo
- En modo SHA de confirmación, solo acepta el HEAD actual de la rama de flujo de trabajo; use una
  etiqueta de lanzamiento para confirmaciones de lanzamiento anteriores
- `OpenClaw NPM Release` validation-only preflight también acepta el
  SHA completo de 40 caracteres del commit de la rama de flujo de trabajo actual sin requerir una etiqueta enviada
- Esa ruta SHA es solo de validación y no se puede promover a una publicación real
- En modo SHA, el flujo de trabajo sintetiza `v<package.json version>` solo para la
  verificación de metadatos del paquete; la publicación real aún requiere una etiqueta de versión real
- Ambos flujos de trabajo mantienen la ruta real de publicación y promoción en runners
  alojados en GitHub, mientras que la ruta de validación no mutante puede usar los runners
  Linux más grandes de Blacksmith
- Ese flujo de trabajo ejecuta
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  usando ambos secretos de flujo de trabajo `OPENAI_API_KEY` y `ANTHROPIC_API_KEY`
- el prelanzamiento de la versión de npm ya no espera en el carril separado de comprobaciones de versión
- Ejecutar `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (o la etiqueta beta/corrección coincidente) antes de la aprobación
- Después de la publicación de npm, ejecute
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (o la versión beta/corrección coincidente) para verificar la ruta de instalación
  del registro publicado en un prefijo temporal nuevo
- La automatización de versiones del mantenedor ahora usa prelanzamiento-entonces-promoción:
  - la publicación real de npm debe pasar un `preflight_run_id` de npm exitoso
  - la publicación real de npm debe enviarse desde la misma rama `main` o
    `release/YYYY.M.D` que la ejecución de prelanzamiento exitosa
  - las versiones estables de npm por defecto usan `beta`
  - la publicación estable de npm puede apuntar a `latest` explícitamente mediante la entrada del flujo de trabajo
  - la mutación de dist-tag de npm basada en tokens ahora reside en
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    por seguridad, porque `npm dist-tag add` todavía necesita `NPM_TOKEN` mientras que
    el repositorio público mantiene solo publicación OIDC
  - `macOS Release` público es solo de validación
  - la publicación real privada de mac debe pasar el `preflight_run_id` y el
    `validate_run_id` privados de mac exitosos
  - las rutas de publicación reales promocionan los artefactos preparados en lugar de reconstruirlos
    nuevamente
- Para correcciones de versiones estables como `YYYY.M.D-N`, el verificador posterior a la publicación
  también comprueba la misma ruta de actualización de prefijo temporal de `YYYY.M.D` a `YYYY.M.D-N`
  para que las correcciones de la versión no dejen silenciosamente instalaciones globales antiguas en
  la carga útil estable base
- La verificación previa al lanzamiento de npm falla de forma cerrada a menos que el paquete incluya tanto
  `dist/control-ui/index.html` como una carga útil `dist/control-ui/assets/` no vacía
  para no enviar un tablero de navegador vacío de nuevo
- `pnpm test:install:smoke` también hace cumplir el presupuesto `unpackedSize` de npm pack en
  el paquete de actualización candidato, por lo que el instalador e2e detecta cualquier hinchazón accidental del paquete
  antes de la ruta de publicación de la versión
- Si el trabajo de la versión tocó la planificación de CI, manifiestos de temporización de extensiones o
  matrices de prueba de extensiones, regenere y revise las salidas de matriz de flujo de trabajo
  `checks-node-extensions` propiedad del planificador desde `.github/workflows/ci.yml`
  antes de la aprobación para que las notas de la versión no describan un diseño de CI obsoleto
- La preparación para la versión estable de macOS también incluye las superficies del actualizador:
  - el lanzamiento de GitHub debe terminar con el `.zip` empaquetado, `.dmg` y `.dSYM.zip`
  - `appcast.xml` en `main` debe apuntar al nuevo zip estable después de la publicación
  - la aplicación empaquetada debe mantener un id de paquete no de depuración, una URL de feed de Sparkle
    no vacía, y un `CFBundleVersion` en o por encima del límite de compilación canónico de Sparkle
    para esa versión

## Entradas del flujo de trabajo de NPM

`OpenClaw NPM Release` acepta estas entradas controladas por el operador:

- `tag`: etiqueta de versión requerida como `v2026.4.2`, `v2026.4.2-1` o
  `v2026.4.2-beta.1`; cuando `preflight_only=true`, también puede ser el
  SHA de confirmación de 40 caracteres completo de la rama de flujo de trabajo actual para la verificación previa de solo validación
- `preflight_only`: `true` solo para validación/construcción/empaquetado, `false` para la
  ruta de publicación real
- `preflight_run_id`: requerido en la ruta de publicación real para que el flujo de trabajo reutilice
  el paquete preparado de la ejecución de verificación previa exitosa
- `npm_dist_tag`: etiqueta de destino de npm para la ruta de publicación; el valor predeterminado es `beta`

`OpenClaw Release Checks` acepta estas entradas controladas por el operador:

- `ref`: etiqueta de versión existente o el SHA de confirmación `main` completo de 40 caracteres
  para validar cuando se despacha desde `main`; desde una rama de versión, use una
  etiqueta de versión existente o el SHA de confirmación de la rama de versión actual de 40 caracteres

Reglas:

- Las etiquetas estables y de corrección pueden publicarse tanto en `beta` como en `latest`
- Las etiquetas de prelanzamiento beta solo pueden publicarse en `beta`
- Para `OpenClaw NPM Release`, la entrada del SHA de confirmación completo solo se permite cuando
  `preflight_only=true`
- `OpenClaw Release Checks` es siempre solo de validación y también acepta el
  SHA de confirmación de la rama de flujo de trabajo actual
- El modo de SHA de confirmación de las comprobaciones de versión también requiere la HEAD actual de la rama de flujo de trabajo
- La ruta de publicación real debe usar el mismo `npm_dist_tag` usado durante la preverificación;
  el flujo de trabajo verifica que los metadatos antes de la publicación continúen

## Secuencia de versión estable de npm

Al crear una versión estable de npm:

1. Ejecute `OpenClaw NPM Release` con `preflight_only=true`
   - Antes de que exista una etiqueta, puede usar el SHA de confirmación completo de la rama de flujo de trabajo actual
     para una ejecución en seco solo de validación del flujo de trabajo de preverificación
2. Elija `npm_dist_tag=beta` para el flujo normal primero beta, o `latest` solo
   cuando intencionalmente desee una publicación estable directa
3. Ejecute `OpenClaw Release Checks` por separado con la misma etiqueta o el
   SHA de confirmación completo de la rama de flujo de trabajo actual cuando desee cobertura
   de caché de solicitudes en vivo
   - Esto está separado a propósito para que la cobertura en vivo permanezca disponible sin
     volver a acoplar comprobaciones de larga duración o erráticas al flujo de trabajo de publicación
4. Guarde la `preflight_run_id` exitosa
5. Ejecute `OpenClaw NPM Release` nuevamente con `preflight_only=false`, el mismo
   `tag`, el mismo `npm_dist_tag`, y la `preflight_run_id` guardada
6. Si la versión se publicó en `beta`, use el flujo de trabajo privado
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   para promocionar esa versión estable desde `beta` hasta `latest`
7. Si la versión se publicó intencionalmente directamente en `latest` y `beta`
   debe seguir inmediatamente la misma compilación estable, use ese mismo flujo de trabajo
   privado para apuntar ambas dist-tags a la versión estable, o deje que su sincronización
   programada de autoreparación mueva `beta` más tarde

La mutación de dist-tags vive en el repositorio privado por motivos de seguridad porque aún
requiere `NPM_TOKEN`, mientras que el repositorio público mantiene solo publicación OIDC.

Eso mantiene tanto la ruta de publicación directa como la ruta de promoción beta-primer
documentadas y visibles para el operador.

## Referencias públicas

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Los mantenedores usan la documentación de lanzamiento privada en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos real.
