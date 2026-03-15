---
title: "Lista de comprobación de lanzamiento"
summary: "Lista de comprobación paso a paso para el lanzamiento de npm + aplicación macOS"
read_when:
  - Cutting a new npm release
  - Cutting a new macOS app release
  - Verifying metadata before publishing
---

# Lista de comprobación de lanzamiento (npm + macOS)

Use `pnpm` desde la raíz del repositorio con Node 24 de forma predeterminada. Node 22 LTS, actualmente `22.16+`, sigue siendo compatible por compatibilidad. Mantenga el árbol de trabajo limpio antes de etiquetar/publicar.

## Activador del operador

Cuando el operador diga "release" (lanzamiento), haga inmediatamente este pre-vuelo (sin preguntas adicionales a menos que esté bloqueado):

- Lea este documento y `docs/platforms/mac/release.md`.
- Cargue las variables de entorno desde `~/.profile` y confirme que `SPARKLE_PRIVATE_KEY_FILE` + las variables de App Store Connect están configuradas (SPARKLE_PRIVATE_KEY_FILE debe estar en `~/.profile`).
- Use las claves de Sparkle de `~/Library/CloudStorage/Dropbox/Backup/Sparkle` si es necesario.

## Versionado

Los lanzamientos actuales de OpenClaw utilizan un versionado basado en fechas.

- Versión de lanzamiento estable: `YYYY.M.D`
  - Etiqueta Git: `vYYYY.M.D`
  - Ejemplos del historial del repositorio: `v2026.2.26`, `v2026.3.8`
- Versión de pre-lanzamiento beta: `YYYY.M.D-beta.N`
  - Etiqueta Git: `vYYYY.M.D-beta.N`
  - Ejemplos del historial del repositorio: `v2026.2.15-beta.1`, `v2026.3.8-beta.1`
- Etiqueta de corrección de respaldo: `vYYYY.M.D-N`
  - Úsela solo como una etiqueta de recuperación de último recurso cuando un lanzamiento inmutable publicado haya consumido la etiqueta estable original y no pueda reutilizarla.
  - La versión del paquete npm se mantiene como `YYYY.M.D`; el sufijo `-N` es solo para la etiqueta git y el lanzamiento de GitHub.
  - Prefiera las betas para la iteración normal de pre-lanzamiento y luego cree una etiqueta estable limpia una vez que esté listo.
- Use la misma cadena de versión en todas partes, excepto el `v` inicial donde no se usan etiquetas Git:
  - `package.json`: `2026.3.8`
  - Etiqueta Git: `v2026.3.8`
  - Título del lanzamiento de GitHub: `openclaw 2026.3.8`
- No rellene con ceros el mes o el día. Use `2026.3.8`, no `2026.03.08`.
- Stable y beta son dist-tags de npm, no líneas de lanzamiento separadas:
  - `latest` = estable
  - `beta` = versión preliminar/pruebas
- Dev es la cabeza móvil de `main`, no una versión etiquetada con git normal.
- La ejecución de vista previa activada por etiquetas acepta etiquetas de corrección estables, beta y alternativas, y rechaza versiones cuya fecha CalVer esté a más de 2 días calendario UTC de la fecha de lanzamiento.

Nota histórica:

- Las etiquetas anteriores como `v2026.1.11-1`, `v2026.2.6-3` y `v2.0.0-beta2` existen en el historial del repositorio.
- Trate las etiquetas de corrección como un mecanismo de escape solo de reserva. Los nuevos lanzamientos aún deben usar `vYYYY.M.D` para estable y `vYYYY.M.D-beta.N` para beta.

1. **Versión y metadatos**

- [ ] Actualice la versión de `package.json` (p. ej., `2026.1.29`).
- [ ] Ejecute `pnpm plugins:sync` para alinear las versiones de los paquetes de extensión + los registros de cambios.
- [ ] Actualice las cadenas de CLI/versión en [`src/version.ts`](https://github.com/openclaw/openclaw/blob/main/src/version.ts) y el agente de usuario de Baileys en [`src/web/session.ts`](https://github.com/openclaw/openclaw/blob/main/src/web/session.ts).
- [ ] Confirme los metadatos del paquete (nombre, descripción, repositorio, palabras clave, licencia) y que el mapa `bin` apunta a [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs) para `openclaw`.
- [ ] Si cambiaron las dependencias, ejecute `pnpm install` para que `pnpm-lock.yaml` esté actualizado.

2. **Compilación y artefactos**

- [ ] Si cambiaron las entradas de A2UI, ejecute `pnpm canvas:a2ui:bundle` y confirme cualquier [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js) actualizado.
- [ ] `pnpm run build` (regenera `dist/`).
- [ ] Verifique que el paquete npm `files` incluya todas las carpetas `dist/*` requeridas (notablemente `dist/node-host/**` y `dist/acp/**` para nodo sin interfaz + CLI de ACP).
- [ ] Confirme que `dist/build-info.json` existe e incluye el hash `commit` esperado (el banner de la CLI usa esto para instalaciones npm).
- [ ] Opcional: `npm pack --pack-destination /tmp` después de la compilación; inspeccione el contenido del archivador y téngalo a mano para el lanzamiento de GitHub (no lo confirme).

3. **Registro de cambios y documentación**

- [ ] Actualice `CHANGELOG.md` con los aspectos más destacados para el usuario (cree el archivo si falta); mantenga las entradas en orden estrictamente descendente por versión.
- [ ] Asegúrese de que los ejemplos/indicadores del README coincidan con el comportamiento actual de la CLI (especialmente los comandos u opciones nuevos).

4. **Validación**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test` (o `pnpm test:coverage` si necesita el resultado de cobertura)
- [ ] `pnpm release:check` (verifica el contenido del paquete npm)
- [ ] Si `pnpm config:docs:check` falla como parte de la validación de la versión y el cambio en la superficie de configuración es intencional, ejecute `pnpm config:docs:gen`, revise `docs/.generated/config-baseline.json` y `docs/.generated/config-baseline.jsonl`, confirme las líneas base actualizadas y luego vuelva a ejecutar `pnpm release:check`.
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke` (prueba rápida de instalación de Docker; requerido antes del lanzamiento)
  - Si la versión npm inmediatamente anterior se sabe que está rota, establezca `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` o `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1` para el paso de preinstalación.
- [ ] (Opcional) Prueba completa del instalador (añade cobertura sin root + CLI): `pnpm test:install:smoke`
- [ ] (Opcional) E2E del instalador (Docker, ejecuta `curl -fsSL https://openclaw.ai/install.sh | bash`, hace el onboarding, luego ejecuta llamadas reales a herramientas):
  - `pnpm test:install:e2e:openai` (requiere `OPENAI_API_KEY`)
  - `pnpm test:install:e2e:anthropic` (requiere `ANTHROPIC_API_KEY`)
  - `pnpm test:install:e2e` (requiere ambas claves; ejecuta ambos proveedores)
- [ ] (Opcional) Verificación puntual de la puerta de enlace web si sus cambios afectan las rutas de envío/recepción.

5. **Aplicación macOS (Sparkle)**

- [ ] Construya y firme la aplicación macOS, luego comprímala para su distribución.
- [ ] Genere el canal de la aplicación Sparkle (notas HTML a través de [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)) y actualice `appcast.xml`.
- [ ] Mantenga el zip de la aplicación (y el zip dSYM opcional) listo para adjuntarlo a la versión de GitHub.
- [ ] Siga la [versión de macOS](/es/platforms/mac/release) para obtener los comandos exactos y las variables de entorno requeridas.
  - `APP_BUILD` debe ser numérico y monótono (sin `-beta`) para que Sparkle compare las versiones correctamente.
  - Si se está notarizando, utilice el perfil de llavero `openclaw-notary` creado a partir de las variables de entorno de la API de App Store Connect (consulte [macOS release](/es/platforms/mac/release)).

6. **Publicar (npm)**

- [ ] Confirme que el estado de git está limpio; confirme y empuje (push) según sea necesario.
- [ ] Confirme que la publicación de confianza de npm esté configurada para el paquete `openclaw`.
- [ ] No dependa de un secreto `NPM_TOKEN` para este flujo de trabajo; el trabajo de publicación utiliza la publicación de confianza de GitHub OIDC.
- [ ] Empuje la etiqueta git coincidente para activar la ejecución de vista previa en `.github/workflows/openclaw-npm-release.yml`.
- [ ] Ejecute `OpenClaw NPM Release` manualmente con la misma etiqueta para publicar después de la aprobación del entorno `npm-release`.
  - Las etiquetas estables se publican en npm `latest`.
  - Las etiquetas beta se publican en npm `beta`.
  - Las etiquetas de corrección de respaldo como `v2026.3.13-1` se asignan a la versión npm `2026.3.13`.
  - Tanto la ejecución de vista previa como la ejecución de publicación manual rechazan las etiquetas que no se asignan de nuevo a `package.json`, que no están en `main`, o cuya fecha CalVer está a más de 2 días calendario UTC de la fecha de lanzamiento.
  - Si `openclaw@YYYY.M.D` ya está publicado, una etiqueta de corrección de respaldo sigue siendo útil para el lanzamiento de GitHub y la recuperación de Docker, pero npm publish no volverá a publicar esa versión.
- [ ] Verifique el registro: `npm view openclaw version`, `npm view openclaw dist-tags` y `npx -y openclaw@X.Y.Z --version` (o `--help`).

### Solución de problemas (notas del lanzamiento 2.0.0-beta2)

- **npm pack/publish se cuelga o produce un tarball enorme**: el paquete de la aplicación macOS en `dist/OpenClaw.app` (y los zips de lanzamiento) se arrastra al paquete. Solución: incluya en la lista blanca los contenidos de publicación mediante `package.json` `files` (incluya subdirectorios dist, docs, skills; excluya paquetes de aplicaciones). Confirme con `npm pack --dry-run` que `dist/OpenClaw.app` no aparece en la lista.
- **bucle web de autenticación npm para dist-tags**: use autenticación heredada para obtener un mensaje OTP:
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **la verificación de `npx` falla con `ECOMPROMISED: Lock compromised`**: vuelva a intentar con un caché nuevo:
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **La etiqueta necesita recuperación después de una corrección tardía**: si la etiqueta estable original está vinculada a una publicación de GitHub inmutable, genere una etiqueta de corrección de respaldo como `vX.Y.Z-1` en lugar de intentar forzar la actualización de `vX.Y.Z`.
  - Mantenga la versión del paquete npm en `X.Y.Z`; el sufijo de corrección es solo para la etiqueta git y la publicación de GitHub.
  - Use esto solo como último recurso. Para la iteración normal, prefiera las etiquetas beta y luego realice un corte limpio de una versión estable.

7. **Publicación de GitHub + appcast**

- [ ] Etiquetar y enviar: `git tag vX.Y.Z && git push origin vX.Y.Z` (o `git push --tags`).
  - Enviar la etiqueta también activa el flujo de trabajo de publicación de npm.
- [ ] Crear/actualizar la publicación de GitHub para `vX.Y.Z` con **título `openclaw X.Y.Z`** (no solo la etiqueta); el cuerpo debe incluir la sección **completa** del registro de cambios para esa versión (Aspectos destacados + Cambios + Correcciones), en línea (sin enlaces simples), y **no debe repetir el título dentro del cuerpo**.
- [ ] Adjuntar artefactos: archivador `npm pack` (opcional), `OpenClaw-X.Y.Z.zip` y `OpenClaw-X.Y.Z.dSYM.zip` (si se generan).
- [ ] Confirme el `appcast.xml` actualizado y envíelo (Sparkle se alimenta de main).
- [ ] Desde un directorio temporal limpio (sin `package.json`), ejecute `npx -y openclaw@X.Y.Z send --help` para confirmar que los puntos de entrada de instalación/CLI funcionan.
- [ ] Anuncie/comparta las notas de la versión.

## Ámbito de publicación de complementos (npm)

Solo publicamos **complementos npm existentes** bajo el ámbito `@openclaw/*`. Los
complementos incluidos que no están en npm permanecen **solo en el disco** (aún se envían en
`extensions/**`).

Proceso para derivar la lista:

1. `npm search @openclaw --json` y capture los nombres de los paquetes.
2. Compare con los nombres de `extensions/*/package.json`.
3. Publique solo la **intersección** (ya en npm).

Lista actual de complementos npm (actualice según sea necesario):

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

Las notas de la versión también deben mencionar los **nuevos complementos agrupados opcionales** que **no están activados de forma predeterminada** (ejemplo: `tlon`).

import es from "/components/footer/es.mdx";

<es />
