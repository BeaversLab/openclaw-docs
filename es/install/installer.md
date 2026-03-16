---
summary: "Cómo funcionan los scripts de instalación (install.sh, install-cli.sh, install.ps1), las opciones y la automatización"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "Aspectos internos del instalador"
---

# Internos del instalador

OpenClaw incluye tres scripts de instalación, servidos desde `openclaw.ai`.

| Script                             | Plataforma           | Lo que hace                                                                                                               |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Instala Node si es necesario, instala OpenClaw a través de npm (predeterminado) o git, y puede ejecutar la incorporación. |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Instala Node + OpenClaw en un prefijo local (`~/.openclaw`). No se requieren permisos de root.                            |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Instala Node si es necesario, instala OpenClaw a través de npm (predeterminado) o git, y puede ejecutar la incorporación. |

## Comandos rápidos

<Tabs>
  <Tab title="install.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install-cli.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install.ps1">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```

    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag beta -NoOnboard -DryRun
    ```

  </Tab>
</Tabs>

<Note>
  Si la instalación se realiza correctamente pero `openclaw` no se encuentra en una nueva terminal,
  consulte [solución de problemas de Node.js ](/es/install/node#troubleshooting).
</Note>

---

## install.sh

<Tip>Recomendado para la mayoría de las instalaciones interactivas en macOS/Linux/WSL.</Tip>

### Flujo (install.sh)

<Steps>
  <Step title="Detectar SO">
    Soporta macOS y Linux (incluyendo WSL). Si se detecta macOS, instala Homebrew si no está
    presente.
  </Step>
  <Step title="Asegurar Node.js 24 por defecto">
    Verifica la versión de Node e instala Node 24 si es necesario (Homebrew en macOS, scripts de
    configuración de NodeSource en Linux apt/dnf/yum). OpenClaw todavía soporta Node 22 LTS,
    actualmente `22.16+`, para compatibilidad.
  </Step>
  <Step title="Asegurar Git">Instala Git si no está presente.</Step>
  <Step title="Instalar OpenClaw">
    - `npm` método (por defecto): instalación global npm - `git` método: clonar/actualizar
    repositorio, instalar dependencias con pnpm, compilar, y luego instalar el contenedor en
    `~/.local/bin/openclaw`
  </Step>
  <Step title="Tareas posteriores a la instalación">
    - Ejecuta `openclaw doctor --non-interactive` en actualizaciones e instalaciones git (mejor
    esfuerzo) - Intenta la incorporación (onboarding) cuando es apropiado (TTY disponible,
    incorporación no deshabilitada, y las verificaciones de arranque/configuración pasan) -
    Establece por defecto `SHARP_IGNORE_GLOBAL_LIBVIPS=1`
  </Step>
</Steps>

### Detección de repositorio de origen

Si se ejecuta dentro de un repositorio OpenClaw (`package.json` + `pnpm-workspace.yaml`), el script ofrece:

- usar checkout (`git`), o
- usar instalación global (`npm`)

Si no hay TTY disponible y no se establece ningún método de instalación, el valor predeterminado es `npm` y avisa.

El script sale con el código `2` para una selección de método no válida o valores `--install-method` no válidos.

### Ejemplos (install.sh)

<Tabs>
  <Tab title="Default">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```
  </Tab>
  <Tab title="Skip onboarding">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --no-onboard ```
  </Tab>
  <Tab title="Git install">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --install-method git ```
  </Tab>
  <Tab title="GitHub main via npm">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --version main ```
  </Tab>
  <Tab title="Dry run">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --dry-run ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de marcas">

| Marca                                 | Descripción                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `--install-method npm\|git`           | Elegir método de instalación (predeterminado: `npm`). Alias: `--method`      |
| `--npm`                               | Acceso directo para método npm                                               |
| `--git`                               | Acceso directo para método git. Alias: `--github`                            |
| `--version <version\|dist-tag\|spec>` | versión npm, dist-tag o especificación de paquete (predeterminado: `latest`) |
| `--beta`                              | Usar dist-tag beta si está disponible, de lo contrario recurrir a `latest`   |
| `--git-dir <path>`                    | Directorio de checkout (predeterminado: `~/openclaw`). Alias: `--dir`        |
| `--no-git-update`                     | Saltar `git pull` para el checkout existente                                 |
| `--no-prompt`                         | Desactivar avisos                                                            |
| `--no-onboard`                        | Saltar incorporación                                                         |
| `--onboard`                           | Activar incorporación                                                        |
| `--dry-run`                           | Imprimir acciones sin aplicar cambios                                        |
| `--verbose`                           | Activar salida de depuración (`set -x`, registros de nivel de aviso de npm)  |
| `--help`                              | Mostrar uso (`-h`)                                                           |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                                                | Descripción                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | Método de instalación                                              |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | versión de npm, dist-tag o especificación de paquete               |
| `OPENCLAW_BETA=0\|1`                                    | Usar beta si está disponible                                       |
| `OPENCLAW_GIT_DIR=<path>`                               | Directorio de checkout                                             |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | Alternar actualizaciones de git                                    |
| `OPENCLAW_NO_PROMPT=1`                                  | Desactivar indicadores                                             |
| `OPENCLAW_NO_ONBOARD=1`                                 | Omitir onboarding                                                  |
| `OPENCLAW_DRY_RUN=1`                                    | Modo de simulación                                                 |
| `OPENCLAW_VERBOSE=1`                                    | Modo de depuración                                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | Nivel de registro de npm                                           |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | Controlar el comportamiento de sharp/libvips (predeterminado: `1`) |

  </Accordion>
</AccordionGroup>

---

## install-cli.sh

<Info>
  Diseñado para entornos donde desea todo bajo un prefijo local (predeterminado `~/.openclaw`) y sin
  dependencia del Node del sistema.
</Info>

### Flujo (install-cli.sh)

<Steps>
  <Step title="Instalar el tiempo de ejecución de Node local">
    Descarga un archivo tar de Node compatible fijado (actualmente predeterminado `22.22.0`) en `<prefix>/tools/node-v<version>` y verifica el SHA-256.
  </Step>
  <Step title="Asegurar Git">
    Si falta Git, intenta la instalación a través de apt/dnf/yum en Linux o Homebrew en macOS.
  </Step>
  <Step title="Instalar OpenClaw bajo el prefijo">
    Instala con npm usando `--prefix <prefix>`, luego escribe el contenedor en `<prefix>/bin/openclaw`.
  </Step>
</Steps>

### Ejemplos (install-cli.sh)

<Tabs>
  <Tab title="Default">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```
  </Tab>
  <Tab title="Custom prefix + version">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --prefix /opt/openclaw --version latest ```
  </Tab>
  <Tab title="Automation JSON output">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --json --prefix /opt/openclaw ```
  </Tab>
  <Tab title="Run onboarding">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --onboard ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de marcas">

| Marca                  | Descripción                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `--prefix <path>`      | Prefijo de instalación (predeterminado: `~/.openclaw`)                                     |
| `--version <ver>`      | Versión de OpenClaw o etiqueta de distribución (predeterminado: `latest`)                  |
| `--node-version <ver>` | Versión de Node (predeterminado: `22.22.0`)                                                |
| `--json`               | Emitir eventos NDJSON                                                                      |
| `--onboard`            | Ejecutar `openclaw onboard` después de la instalación                                      |
| `--no-onboard`         | Omitir integración (predeterminado)                                                        |
| `--set-npm-prefix`     | En Linux, forzar el prefijo de npm a `~/.npm-global` si el prefijo actual no es escribible |
| `--help`               | Mostrar uso (`-h`)                                                                         |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                                    | Descripción                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | Prefijo de instalación                                                                                      |
| `OPENCLAW_VERSION=<ver>`                    | Versión de OpenClaw o etiqueta de distribución                                                              |
| `OPENCLAW_NODE_VERSION=<ver>`               | Versión de Node                                                                                             |
| `OPENCLAW_NO_ONBOARD=1`                     | Omitir integración                                                                                          |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | Nivel de registro de npm                                                                                    |
| `OPENCLAW_GIT_DIR=<path>`                   | Ruta de búsqueda de limpieza heredada (utilizado al eliminar la clonación del submódulo `Peekaboo` antigua) |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Controlar el comportamiento de sharp/libvips (predeterminado: `1`)                                          |

  </Accordion>
</AccordionGroup>

---

## install.ps1

### Flujo (install.ps1)

<Steps>
  <Step title="Asegurar el entorno de PowerShell + Windows">Requiere PowerShell 5+.</Step>
  <Step title="Asegurar Node.js 24 por defecto">
    Si falta, intenta la instalación a través de winget, luego Chocolatey y luego Scoop. Node 22
    LTS, actualmente `22.16+`, sigue siendo compatible por compatibilidad.
  </Step>
  <Step title="Instalar OpenClaw">
    - método `npm` (predeterminado): instalación global de npm usando el `-Tag` seleccionado -
    método `git`: clonar/actualizar repositorio, instalar/construir con pnpm e instalar el
    contenedor en `%USERPROFILE%\.local\bin\openclaw.cmd`
  </Step>
  <Step title="Tareas posteriores a la instalación">
    Añade el directorio bin necesario al PATH del usuario cuando sea posible, luego ejecuta
    `openclaw doctor --non-interactive` en actualizaciones e instalaciones de git (mejor esfuerzo).
  </Step>
</Steps>

### Ejemplos (install.ps1)

<Tabs>
  <Tab title="Default">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git install">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1)))
    -InstallMethod git ```
  </Tab>
  <Tab title="GitHub main via npm">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main
    ```
  </Tab>
  <Tab title="Custom git directory">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1)))
    -InstallMethod git -GitDir "C:\openclaw" ```
  </Tab>
  <Tab title="Dry run">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```
  </Tab>
  <Tab title="Debug trace">
    ```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 &
    ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug
    -Trace 0 ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de flags">

| Flag                        | Descripción                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `-InstallMethod npm\|git`   | Método de instalación (predeterminado: `npm`)                                   |
| `-Tag <tag\|version\|spec>` | dist-tag de npm, versión o especificación de paquete (predeterminado: `latest`) |
| `-GitDir <path>`            | Directorio de checkout (predeterminado: `%USERPROFILE%\openclaw`)               |
| `-NoOnboard`                | Saltar onboarding                                                               |
| `-NoGitUpdate`              | Saltar `git pull`                                                               |
| `-DryRun`                   | Imprimir solo las acciones                                                      |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                           | Descripción            |
| ---------------------------------- | ---------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Método de instalación  |
| `OPENCLAW_GIT_DIR=<path>`          | Directorio de checkout |
| `OPENCLAW_NO_ONBOARD=1`            | Saltar onboarding      |
| `OPENCLAW_GIT_UPDATE=0`            | Desactivar git pull    |
| `OPENCLAW_DRY_RUN=1`               | Modo de prueba         |

  </Accordion>
</AccordionGroup>

<Note>
  Si se usa `-InstallMethod git` y falta Git, el script sale e imprime el enlace de Git para
  Windows.
</Note>

---

## CI y automatización

Use flags/variables de entorno no interactivas para ejecuciones predecibles.

<Tabs>
  <Tab title="install.sh (non-interactive npm)">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s --
    --no-prompt --no-onboard ```
  </Tab>
  <Tab title="install.sh (non-interactive git)">
    ```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2
    https://openclaw.ai/install.sh | bash ```
  </Tab>
  <Tab title="install-cli.sh (JSON)">
    ```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s --
    --json --prefix /opt/openclaw ```
  </Tab>
  <Tab title="install.ps1 (skip onboarding)">
    ```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

---

## Solución de problemas

<AccordionGroup>
  <Accordion title="¿Por qué se requiere Git?">
    Git es necesario para el método de instalación `git`. Para instalaciones `npm`, Git aún se verifica/instala para evitar fallos `spawn git ENOENT` cuando las dependencias usan URLs de git.
  </Accordion>

<Accordion title="¿Por qué npm encuentra EACCES en Linux?">
  Algunas configuraciones de Linux apuntan el prefijo global de npm a rutas propiedad de root.
  `install.sh` puede cambiar el prefijo a `~/.npm-global` y añadir exportaciones de PATH a los
  archivos rc del shell (cuando esos archivos existen).
</Accordion>

  <Accordion title="problemas con sharp/libvips">
    Los scripts establecen `SHARP_IGNORE_GLOBAL_LIBVIPS=1` por defecto para evitar que sharp compile contra la libvips del sistema. Para anular esto:

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows: "npm error spawn git / ENOENT"'>
  Instale Git para Windows, vuelva a abrir PowerShell, ejecute el instalador nuevamente.
</Accordion>

<Accordion title='Windows: "openclaw no se reconoce"'>
  Ejecute `npm config get prefix` y añada ese directorio a su PATH de usuario (no se necesita el
  sufijo `\bin` en Windows), luego vuelva a abrir PowerShell.
</Accordion>

  <Accordion title="Windows: cómo obtener una salida detallada del instalador">
    `install.ps1` actualmente no expone un interruptor `-Verbose`.
    Use el seguimiento de PowerShell para diagnósticos a nivel de script:

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw no encontrado después de la instalación">
    Generalmente es un problema de PATH. Consulte [solución de problemas de Node.js](/es/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>

import es from "/components/footer/es.mdx";

<es />
