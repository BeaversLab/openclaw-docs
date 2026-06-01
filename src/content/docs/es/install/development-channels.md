---
summary: "Canales estable, beta y dev: semántica, cambio, fijación y etiquetado"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "Canales de lanzamiento"
sidebarTitle: "Canales de lanzamiento"
---

OpenClaw ofrece tres canales de actualización:

- **estable**: npm dist-tag `latest`. Recomendado para la mayoría de los usuarios.
- **beta**: npm dist-tag `beta` cuando está actualizado; si beta falta o es anterior a
  la última versión estable, el flujo de actualización recurre a `latest`.
- **dev**: cabecera móvil de `main` (git). npm dist-tag: `dev` (cuando se publica).
  La rama `main` es para experimentación y desarrollo activo. Puede contener
  funciones incompletas o cambios importantes. No la utilice para gateways de producción.

Generalmente enviamos compilaciones estables a **beta** primero, las probamos allí y luego ejecutamos un
paso de promoción explícito que mueve la compilación verificada a `latest` sin
cambiar el número de versión. Los mantenedores también pueden publicar una versión estable
directamente en `latest` cuando sea necesario. Las dist-tags son la fuente de verdad para las
instalaciones de npm.

## Cambiar de canal

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` persiste su elección en la configuración (`update.channel`) y alinea el
método de instalación:

- **`stable`** (instalaciones de paquetes): actualizaciones a través de npm dist-tag `latest`.
- **`beta`** (instalaciones de paquetes): prefiere npm dist-tag `beta`, pero recurre a
  `latest` cuando `beta` falta o es anterior a la etiqueta estable actual.
- **`stable`** (instalaciones de git): obtiene la etiqueta git estable más reciente, excluyendo
  las etiquetas de versión previa de semver como `-alpha.N`, `-beta.N`, `-rc.N`, `-dev.N`,
  `-next.N`, `-preview.N`, `-canary.N`, `-nightly.N` y otros
  sufijos de versión previa.
- **`beta`** (instalaciones de git): prefiere la etiqueta git beta más reciente, pero recurre a
  la etiqueta git estable más reciente cuando beta falta o es más antigua.
- **`dev`**: asegura una descarga de git (por defecto `~/openclaw`, o
  `$OPENCLAW_HOME/openclaw` cuando `OPENCLAW_HOME` está configurado; sobrescribir con
  `OPENCLAW_GIT_DIR`), cambia a `main`, hace rebase en upstream, compila e
  instala la CLI global desde esa descarga.

<Tip>Si desea tener estable y dev en paralelo, mantenga dos clones y apunte su gateway al estable.</Tip>

## Targeting de versión o etiqueta única

Use `--tag` para apuntar a una dist-tag específica, versión o especificación de paquete para una única
actualización **sin** cambiar su canal persistente:

```bash
# Install a specific version
openclaw update --tag 2026.4.1-beta.1

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Switch to the moving GitHub main checkout
openclaw update --channel dev

# Install a specific npm package spec
openclaw update --tag openclaw@2026.4.1-beta.1

# Install from GitHub main once without persisting the channel
openclaw update --tag main
```

Notas:

- `--tag` se aplica **solo a instalaciones de paquete (npm)**. Las instalaciones de git lo ignoran.
- La etiqueta no se persiste. Su próximo `openclaw update` usa su
  canal configurado como de costumbre.
- Para instalaciones de paquetes, OpenClaw preempaqueta especificaciones de origen GitHub/git en un
  archivo tar temporal antes de la instalación npm por etapas. Use `--channel dev` o
  `--install-method git --version main` cuando quiera la descarga móvil `main`
  como su instalación persistente.
- Protección contra degradación: si la versión de destino es más antigua que su versión actual,
  OpenClaw solicita confirmación (omita con `--yes`).
- `--channel beta` es diferente de `--tag beta`: el flujo del canal puede volver a
  stable/latest cuando beta falta o es más antigua, mientras que `--tag beta` apunta a la
  dist-tag `beta` sin procesar para esa única ejecución.

## Ejecución en seco

Vista previa de lo que haría `openclaw update` sin realizar cambios:

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

La ejecución en seco muestra el canal efectivo, la versión objetivo, las acciones planificadas y
si se requeriría una confirmación de downgrade.

## Complementos y canales

Cuando cambia de canal con `openclaw update`, OpenClaw también sincroniza las
fuentes de los complementos:

- `dev` prefiere los complementos incluidos desde la comprobación de git.
- `stable` y `beta` restauran los paquetes de complementos instalados por npm.
- Los complementos instalados por npm se actualizan después de que se completa la actualización del núcleo.

## Verificar el estado actual

```bash
openclaw update status
```

Muestra el canal activo, el tipo de instalación (git o paquete), la versión actual y
la fuente (config, git tag, git branch o predeterminado).

## Buenas prácticas de etiquetado

- Etiquete las versiones en las que desea que aterricen las comprobaciones de git (`vYYYY.M.D` para estable,
  `vYYYY.M.D-beta.N` para beta; los sufijos de versión previa de semver nombrados, tales como
  `-alpha.N`, `-rc.N` y `-next.N`, no son objetivos estables).
- Las etiquetas estables numéricas heredadas, como `vYYYY.M.D-1` y `v1.0.1-1`, todavía se
  reconocen como etiquetas estables de git por compatibilidad.
- `vYYYY.M.D.beta.N` también se reconoce por compatibilidad, pero se prefiere `-beta.N`.
- Mantenga las etiquetas inmutables: nunca mueva ni reutilice una etiqueta.
- Las dist-tags de npm siguen siendo la fuente de verdad para las instalaciones de npm:
  - `latest` -> estable
  - `beta` -> versión candidata o versión estable con prioridad beta
  - `dev` -> instantánea de main (opcional)

## Disponibilidad de la aplicación macOS

Las compilaciones beta y dev pueden **no** incluir una versión de la aplicación macOS. Esto está bien:

- La etiqueta de git y la dist-tag de npm aún se pueden publicar.
- Indique "no macOS build for this beta" en las notas de la versión o el registro de cambios.

## Relacionado

- [Actualización](/es/install/updating)
- [Aspectos internos del instalador](/es/install/installer)
