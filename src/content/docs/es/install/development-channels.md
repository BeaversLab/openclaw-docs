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
- **`stable`** (instalaciones de git): verifica la última etiqueta git estable.
- **`beta`** (instalaciones de git): prefiere la última etiqueta git beta, pero recurre a
  la última etiqueta git estable cuando beta falta o es anterior.
- **`dev`**: asegura una clonación de git (por defecto `~/openclaw`, o
  `$OPENCLAW_HOME/openclaw` cuando se establece `OPENCLAW_HOME`; anular con
  `OPENCLAW_GIT_DIR`), cambia a `main`, hace rebase sobre upstream, compila e
  instala la CLI global desde esa clonación.

<Tip>Si desea tener estable y dev en paralelo, mantenga dos clones y apunte su gateway al estable.</Tip>

## Targeting de versión o etiqueta única

Use `--tag` para apuntar a un dist-tag, versión o especificación de paquete específico para una única
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

- `--tag` se aplica **solo a instalaciones de paquetes (npm)**. Las instalaciones de git lo ignoran.
- La etiqueta no se persiste. Su próximo `openclaw update` usa su
  canal configurado como de costumbre.
- Para instalaciones de paquetes, OpenClaw preempaqueta las especificaciones de fuente de GitHub/git en un
  archivo tar temporal antes de la instalación por etapas de npm. Use `--channel dev` o
  `--install-method git --version main` cuando quiera la clonación `main`
  en movimiento como su instalación persistente.
- Protección de downgrade: si la versión objetivo es anterior a su versión actual,
  OpenClaw solicita confirmación (omita con `--yes`).
- `--channel beta` es diferente de `--tag beta`: el flujo del canal puede retroceder
  a stable/latest cuando beta falta o es antiguo, mientras que `--tag beta` apunta al
  dist-tag `beta` original para esa ejecución única.

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

Cuando cambia de canal con `openclaw update`, OpenClaw también sincroniza las fuentes de los
complementos:

- `dev` prefiere los complementos empaquetados de la clonación de git.
- `stable` y `beta` restauran los paquetes de complementos instalados por npm.
- Los complementos instalados por npm se actualizan después de que se completa la actualización del núcleo.

## Verificar el estado actual

```bash
openclaw update status
```

Muestra el canal activo, el tipo de instalación (git o paquete), la versión actual y
la fuente (config, git tag, git branch o predeterminado).

## Buenas prácticas de etiquetado

- Etiquete las versiones (releases) en las que desea que las extracciones de git se asienten (`vYYYY.M.D` para stable, `vYYYY.M.D-beta.N` para beta).
- `vYYYY.M.D.beta.N` también se reconoce por compatibilidad, pero se prefiere `-beta.N`.
- Las etiquetas `vYYYY.M.D-<patch>` heredadas aún se reconocen como estables (no beta).
- Mantenga las etiquetas inmutables: nunca mueva ni reutilice una etiqueta.
- Las dist-tags de npm siguen siendo la fuente de verdad para las instalaciones de npm:
  - `latest` -> estable
  - `beta` -> compilación candidata o compilación estable beta-first
  - `dev` -> instantánea de main (opcional)

## Disponibilidad de la aplicación macOS

Las compilaciones beta y dev pueden **no** incluir una versión de la aplicación macOS. Esto está bien:

- La etiqueta de git y la dist-tag de npm aún se pueden publicar.
- Indique "no macOS build for this beta" en las notas de la versión o el registro de cambios.

## Relacionado

- [Actualización](/es/install/updating)
- [Interno del instalador](/es/install/installer)
