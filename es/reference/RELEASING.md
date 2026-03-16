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

Los mantenedores usan los documentos de lanzamiento privados en
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
para el manual de procedimientos real.

- [ ] Si cambiaron las entradas de A2UI, ejecute `pnpm canvas:a2ui:bundle` y confirme cualquier archivo [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js) actualizado.
- [ ] `pnpm run build` (regenera `dist/`).
- [ ] Verifique que el paquete npm `files` incluya todas las carpetas `dist/*` requeridas (notablemente `dist/node-host/**` y `dist/acp/**` para el nodo sin cabeza + ACP CLI).
- [ ] Confirme que `dist/build-info.json` existe e incluye el hash `commit` esperado (el banner de la CLI usa esto para instalaciones de npm).
- [ ] Opcional: `npm pack --pack-destination /tmp` después de la compilación; inspeccione el contenido del tarball y téngalo a mano para el lanzamiento de GitHub (no lo confirme).

3. **Registro de cambios y documentos**

- [ ] Actualice `CHANGELOG.md` con los aspectos destacados para el usuario (cree el archivo si falta); mantenga las entradas estrictamente descendentes por versión.
- [ ] Asegúrese de que los ejemplos/indicadores del README coincidan con el comportamiento actual de la CLI (notablemente nuevos comandos u opciones).

4. **Validación**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test` (o `pnpm test:coverage` si necesita el resultado de la cobertura)
- [ ] `pnpm release:check` (verifica el contenido del paquete npm)
- [ ] Si `pnpm config:docs:check` falla como parte de la validación de la versión y el cambio en la configuración es intencional, ejecute `pnpm config:docs:gen`, revise `docs/.generated/config-baseline.json` y `docs/.generated/config-baseline.jsonl`, confirme las líneas base actualizadas y luego vuelva a ejecutar `pnpm release:check`.
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke` (prueba de humo de instalación de Docker, ruta rápida; requerido antes del lanzamiento)
  - Si la versión npm inmediatamente anterior se sabe que está rota, establezca `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` o `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1` para el paso de preinstalación.
- [ ] (Opcional) Prueba de humo completa del instalador (agrega cobertura no root + CLI): `pnpm test:install:smoke`
- [ ] (Opcional) Instalador E2E (Docker, ejecuta `curl -fsSL https://openclaw.ai/install.sh | bash`, realiza el onboarding y luego ejecuta llamadas reales a herramientas):
  - `pnpm test:install:e2e:openai` (requiere `OPENAI_API_KEY`)
  - `pnpm test:install:e2e:anthropic` (requiere `ANTHROPIC_API_KEY`)
  - `pnpm test:install:e2e` (requiere ambas claves; ejecuta ambos proveedores)
- [ ] (Opcional) Verificación puntual de la puerta de enlace web si sus cambios afectan las rutas de envío/recepción.

5. **Aplicación macOS (Sparkle)**

- [ ] Compile y firme la aplicación macOS, luego comprímala para su distribución.
- [ ] Genere el canal de la aplicación Sparkle (notas HTML a través de [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)) y actualice `appcast.xml`.
- [ ] Mantenga el archivo zip de la aplicación (y el zip dSYM opcional) listo para adjuntar a la versión de GitHub.
- [ ] Siga [macOS release](/es/platforms/mac/release) para los comandos exactos y las variables de entorno requeridas.
  - `APP_BUILD` debe ser numérico y monótono (sin `-beta`) para que Sparkle compare las versiones correctamente.
  - Si se está notarizando, use el perfil de llavero `openclaw-notary` creado desde las variables de entorno de la API de App Store Connect (ver [macOS release](/es/platforms/mac/release)).

6. **Publicar (npm)**

- [ ] Confirme que el estado de git esté limpio; confirme y envíe (commit and push) según sea necesario.
- [ ] Confirme que la publicación confiable de npm esté configurada para el paquete `openclaw`.
- [ ] No dependa de un secreto `NPM_TOKEN` para este flujo de trabajo; el trabajo de publicación usa la publicación confiable de GitHub OIDC.
- [ ] Envíe la etiqueta git coincidente para activar la ejecución de vista previa en `.github/workflows/openclaw-npm-release.yml`.
- [ ] Ejecute `OpenClaw NPM Release` manualmente con la misma etiqueta para publicar después de la aprobación del entorno `npm-release`.
  - Las etiquetas estables se publican en npm `latest`.
  - Las etiquetas beta se publican en npm `beta`.
  - Las etiquetas de corrección de reserva como `v2026.3.13-1` se asignan a la versión npm `2026.3.13`.
  - Tanto la ejecución de vista previa como la ejecución de publicación manual rechazan las etiquetas que no se asignan de nuevo a `package.json`, que no están en `main`, o cuya fecha CalVer está a más de 2 días calendario UTC de la fecha de lanzamiento.
  - Si `openclaw@YYYY.M.D` ya está publicado, una etiqueta de corrección de reserva todavía es útil para la recuperación de GitHub release y Docker, pero npm publish no volverá a publicar esa versión.
- [ ] Verifique el registro: `npm view openclaw version`, `npm view openclaw dist-tags` y `npx -y openclaw@X.Y.Z --version` (o `--help`).

### Solución de problemas (notas de la versión 2.0.0-beta2)

- **npm pack/publish se bloquea o produce un tarball enorme**: el paquete de la aplicación macOS en `dist/OpenClaw.app` (y los archivos zip de lanzamiento) se incluyen en el paquete. Solución mediante la lista blanca de contenidos de publicación a través de `package.json` `files` (incluya subdirectorios dist, documentos, habilidades; excluya paquetes de aplicaciones). Confirme con `npm pack --dry-run` que `dist/OpenClaw.app` no esté listado.
- **bucle web de autenticación npm para dist-tags**: use la autenticación heredada para obtener un mensaje OTP:
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **la verificación `npx` falla con `ECOMPROMISED: Lock compromised`**: reintente con un caché nuevo:
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **La etiqueta necesita recuperación después de una corrección tardía**: si la etiqueta estable original está vinculada a una publicación de GitHub inmutable, cree una etiqueta de corrección de respaldo como `vX.Y.Z-1` en lugar de intentar forzar la actualización de `vX.Y.Z`.
  - Mantenga la versión del paquete npm en `X.Y.Z`; el sufijo de corrección es solo para la etiqueta git y la publicación de GitHub.
  - Use esto solo como último recurso. Para la iteración normal, prefiera las etiquetas beta y luego haga un corte de una publicación estable limpia.

7. **Publicación de GitHub + appcast**

- [ ] Etiquetar y enviar: `git tag vX.Y.Z && git push origin vX.Y.Z` (o `git push --tags`).
  - Enviar la etiqueta también activa el flujo de trabajo de publicación de npm.
- [ ] Crear/actualizar la publicación de GitHub para `vX.Y.Z` con **título `openclaw X.Y.Z`** (no solo la etiqueta); el cuerpo debe incluir la sección **completa** del registro de cambios para esa versión (Aspectos destacados + Cambios + Correcciones), en línea (sin enlaces desnudos), y **no debe repetir el título dentro del cuerpo**.
- [ ] Adjuntar artefactos: archivo `npm pack` (opcional), `OpenClaw-X.Y.Z.zip` y `OpenClaw-X.Y.Z.dSYM.zip` (si se generan).
- [ ] Confirmar el `appcast.xml` actualizado y envíelo (Sparkle se alimenta de main).
- [ ] Desde un directorio temporal limpio (sin `package.json`), ejecute `npx -y openclaw@X.Y.Z send --help` para confirmar que los puntos de entrada de instalación/CLI funcionan.
- [ ] Anunciar/compartir las notas de la versión.

## Ámbito de publicación de complementos (npm)

Solo publicamos **complementos npm existentes** bajo el ámbito `@openclaw/*`. Los complementos incluidos que no están en npm permanecen **solo en el árbol de disco** (aún se envían en
`extensions/**`).

Proceso para derivar la lista:

1. `npm search @openclaw --json` y capture los nombres de los paquetes.
2. Compare con los nombres de `extensions/*/package.json`.
3. Publicar solo la **intersección** (ya en npm).

Lista actual de complementos de npm (actualizar según sea necesario):

- @openclaw/bluebubbles
- @openclaw/diagnostics-otel
- @openclaw/discord
- @openclaw/feishu
- @openclaw/lobster
- @openclaw/matrix
- @openclaw/msteams
- @openclaw/nextcloud-talk
- @openclaw/nostr
- @openclaw/voice-call
- @openclaw/zalo
- @openclaw/zalouser

Las notas de la versión también deben mencionar los **nuevos complementos incluidos opcionales** que **no están activados por defecto** (ejemplo: `tlon`).

import es from "/components/footer/es.mdx";

<es />
