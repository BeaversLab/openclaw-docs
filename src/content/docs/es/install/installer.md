---
summary: "Cómo funcionan los scripts de instalación (install.sh, install-cli.sh, install.ps1), opciones y automatización"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "Aspectos internos del instalador"
---

OpenClaw incluye tres scripts de instalación, disponibles desde `openclaw.ai`.

| Script                             | Plataforma           | Lo que hace                                                                                                                    |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Instala Node si es necesario, instala OpenClaw a través de npm (por defecto) o git, y puede ejecutar la incorporación.         |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Instala Node + OpenClaw en un prefijo local (`~/.openclaw`) con modos npm o git checkout. No se requieren privilegios de root. |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Instala Node si es necesario, instala OpenClaw a través de npm (por defecto) o git, y puede ejecutar la incorporación.         |

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

<Note>Si la instalación tiene éxito pero no se encuentra `openclaw` en una nueva terminal, consulte [Solución de problemas de Node.js](/es/install/node#troubleshooting).</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>Recomendado para la mayoría de las instalaciones interactivas en macOS/Linux/WSL.</Tip>

### Flujo (install.sh)

<Steps>
  <Step title="Detectar sistema operativo">Soporta macOS y Linux (incluyendo WSL). Si se detecta macOS, instala Homebrew si falta.</Step>
  <Step title="Asegurar Node.js 24 por defecto">Verifica la versión de Node e instala Node 24 si es necesario (Homebrew en macOS, scripts de configuración de NodeSource en Linux apt/dnf/yum). OpenClaw todavía soporta Node 22 LTS, actualmente `22.14+`, por compatibilidad.</Step>
  <Step title="Asegurar Git">Instala Git si falta.</Step>
  <Step title="Instalar OpenClaw">- método `npm` (por defecto): instalación global npm - método `git`: clonar/actualizar repositorio, instalar dependencias con pnpm, compilar, y luego instalar el contenedor en `~/.local/bin/openclaw`</Step>
  <Step title="Tareas posteriores a la instalación">
    - Actualiza un servicio de puerta de enlace cargado con el mejor esfuerzo posible (`openclaw gateway install --force`, luego reiniciar) - Ejecuta `openclaw doctor --non-interactive` en actualizaciones e instalaciones de git (mejor esfuerzo) - Intenta la incorporación cuando sea apropiado (TTY disponible, incorporación no deshabilitada, y las verificaciones de arranque/configuración pasan) -
    Establece `SHARP_IGNORE_GLOBAL_LIBVIPS=1` por defecto
  </Step>
</Steps>

### Detección de checkout de código fuente

Si se ejecuta dentro de un checkout de OpenClaw (`package.json` + `pnpm-workspace.yaml`), el script ofrece:

- usar checkout (`git`), o
- usar instalación global (`npm`)

Si no hay TTY disponible y no se ha establecido ningún método de instalación, el valor predeterminado es `npm` y advierte.

El script termina con el código `2` por una selección de método no válida o valores de `--install-method` no válidos.

### Ejemplos (install.sh)

<Tabs>
  <Tab title="Predeterminado">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Omitir onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Instalación Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="GitHub main vía npm">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="Ejecución en seco">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de banderas">

| Bandera                               | Descripción                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `--install-method npm\|git`           | Elegir método de instalación (predeterminado: `npm`). Alias: `--method`                         |
| `--npm`                               | Acceso directo para el método npm                                                               |
| `--git`                               | Acceso directo para el método git. Alias: `--github`                                            |
| `--version <version\|dist-tag\|spec>` | versión de npm, etiqueta de distribución o especificación de paquete (predeterminado: `latest`) |
| `--beta`                              | Usar la etiqueta de distribución beta si está disponible, de lo contrario recurrir a `latest`   |
| `--git-dir <path>`                    | Directorio de checkout (predeterminado: `~/openclaw`). Alias: `--dir`                           |
| `--no-git-update`                     | Omitir `git pull` para el checkout existente                                                    |
| `--no-prompt`                         | Desactivar indicaciones                                                                         |
| `--no-onboard`                        | Omitir incorporación                                                                            |
| `--onboard`                           | Activar incorporación                                                                           |
| `--dry-run`                           | Imprimir acciones sin aplicar cambios                                                           |
| `--verbose`                           | Activar salida de depuración (`set -x`, registros de nivel de aviso de npm)                     |
| `--help`                              | Mostrar uso (`-h`)                                                                              |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                                                | Descripción                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | Método de instalación                                              |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | versión de npm, dist-tag o especificación de paquete               |
| `OPENCLAW_BETA=0\|1`                                    | Usar beta si está disponible                                       |
| `OPENCLAW_GIT_DIR=<path>`                               | Directorio de checkout                                             |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | Alternar actualizaciones de git                                    |
| `OPENCLAW_NO_PROMPT=1`                                  | Desactivar promps                                                  |
| `OPENCLAW_NO_ONBOARD=1`                                 | Saltar onboarding                                                  |
| `OPENCLAW_DRY_RUN=1`                                    | Modo de ejecución en seco                                          |
| `OPENCLAW_VERBOSE=1`                                    | Modo de depuración                                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | nivel de registro de npm                                           |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | Controlar el comportamiento de sharp/libvips (predeterminado: `1`) |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>Diseñado para entornos donde quieres todo bajo un prefijo local (por defecto `~/.openclaw`) y sin dependencia del sistema Node. Soporta instalaciones npm por defecto, además de instalaciones git-checkout bajo el mismo flujo de prefijo.</Info>

### Flujo (install-cli.sh)

<Steps>
  <Step title="Instalar tiempo de ejecución local de Node">
    Descarga un tarball fijado de una versión LTS de Node compatible (la versión está incrustada en el script y se actualiza de forma independiente) hacia `<prefix>/tools/node-v<version>` y verifica SHA-256.
  </Step>
  <Step title="Asegurar Git">
    Si falta Git, intenta la instalación mediante apt/dnf/yum en Linux o Homebrew en macOS.
  </Step>
  <Step title="Instalar OpenClaw bajo prefijo">
    - método `npm` (predeterminado): instala bajo el prefijo con npm, luego escribe un envoltorio en `<prefix>/bin/openclaw`
    - método `git`: clona/actualiza un checkout (por defecto `~/openclaw`) y aún escribe el envoltorio en `<prefix>/bin/openclaw`
  </Step>
  <Step title="Actualizar servicio de gateway cargado">
    Si ya se ha cargado un servicio de gateway desde el mismo prefijo, el script ejecuta
    `openclaw gateway install --force`, luego `openclaw gateway restart`, y
    verifica el estado de salud del gateway con el mayor esfuerzo posible.
  </Step>
</Steps>

### Ejemplos (install-cli.sh)

<Tabs>
  <Tab title="Predeterminado">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Prefijo personalizado + versión">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Instalación desde Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="Salida JSON de automatización">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Ejecutar onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de banderas">

| Bandera                     | Descripción                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `--prefix <path>`           | Prefijo de instalación (predeterminado: `~/.openclaw`)                                                   |
| `--install-method npm\|git` | Elegir método de instalación (predeterminado: `npm`). Alias: `--method`                                  |
| `--npm`                     | Atajo para el método npm                                                                                 |
| `--git`, `--github`         | Atajo para el método git                                                                                 |
| `--git-dir <path>`          | Directorio de checkout de Git (predeterminado: `~/openclaw`). Alias: `--dir`                             |
| `--version <ver>`           | Versión o etiqueta de distribución de OpenClaw (predeterminado: `latest`)                                |
| `--node-version <ver>`      | Versión de Node (predeterminado: `22.22.0`)                                                              |
| `--json`                    | Emitir eventos NDJSON                                                                                    |
| `--onboard`                 | Ejecutar `openclaw onboard` después de la instalación                                                    |
| `--no-onboard`              | Saltar onboarding (predeterminado)                                                                       |
| `--set-npm-prefix`          | En Linux, forzar el prefijo de npm a `~/.npm-global` si el prefijo actual no tiene permisos de escritura |
| `--help`                    | Mostrar uso (`-h`)                                                                                       |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                                    | Descripción                                                        |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_PREFIX=<path>`                    | Prefijo de instalación                                             |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | Método de instalación                                              |
| `OPENCLAW_VERSION=<ver>`                    | Versión de OpenClaw o etiqueta de distribución                     |
| `OPENCLAW_NODE_VERSION=<ver>`               | Versión de Node                                                    |
| `OPENCLAW_GIT_DIR=<path>`                   | Directorio de checkout de Git para instalaciones de git            |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | Alternar actualizaciones de git para checkouts existentes          |
| `OPENCLAW_NO_ONBOARD=1`                     | Saltar onboarding                                                  |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | Nivel de registro de npm                                           |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Controlar el comportamiento de sharp/libvips (predeterminado: `1`) |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flujo (install.ps1)

<Steps>
  <Step title="Asegurar entorno de PowerShell + Windows">Requiere PowerShell 5+.</Step>
  <Step title="Asegurar Node.js 24 por defecto">Si falta, intenta la instalación vía winget, luego Chocolatey y luego Scoop. Node 22 LTS, actualmente `22.14+`, permanece soportado por compatibilidad.</Step>
  <Step title="Instalar OpenClaw">- método `npm` (predeterminado): instalación global de npm usando el `-Tag` seleccionado - método `git`: clonar/actualizar repositorio, instalar/compilar con pnpm, e instalar wrapper en `%USERPROFILE%\.local\bin\openclaw.cmd`</Step>
  <Step title="Tareas posteriores a la instalación">- Añade el directorio bin necesario al PATH del usuario cuando es posible - Actualiza un servicio de puerta de enlace cargado (gateway) con el mejor esfuerzo (`openclaw gateway install --force`, luego reiniciar) - Ejecuta `openclaw doctor --non-interactive` en actualizaciones e instalaciones de git (mejor esfuerzo)</Step>
  <Step title="Manejo de errores">`iwr ... | iex` y las instalaciones de scriptblock reportan un error de terminación sin cerrar la sesión actual de PowerShell. Las instalaciones directas de `powershell -File` / `pwsh -File` aún salen con un valor distinto de cero para la automatización.</Step>
</Steps>

### Ejemplos (install.ps1)

<Tabs>
  <Tab title="Predeterminado">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Instalación Git">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="GitHub main vía npm">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="Directorio git personalizado">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="Ejecución en seco (Dry run)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="Rastro de depuración">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de marcas">

| Marca                       | Descripción                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `-InstallMethod npm\|git`   | Método de instalación (predeterminado: `npm`)                                |
| `-Tag <tag\|version\|spec>` | npm dist-tag, versión o especificación de paquete (predeterminado: `latest`) |
| `-GitDir <path>`            | Directorio de checkout (predeterminado: `%USERPROFILE%\openclaw`)            |
| `-NoOnboard`                | Saltar onboarding                                                            |
| `-NoGitUpdate`              | Saltar `git pull`                                                            |
| `-DryRun`                   | Imprimir solo acciones                                                       |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                           | Descripción            |
| ---------------------------------- | ---------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Método de instalación  |
| `OPENCLAW_GIT_DIR=<path>`          | Directorio de checkout |
| `OPENCLAW_NO_ONBOARD=1`            | Saltar onboarding      |
| `OPENCLAW_GIT_UPDATE=0`            | Deshabilitar git pull  |
| `OPENCLAW_DRY_RUN=1`               | Modo de prueba         |

  </Accordion>
</AccordionGroup>

<Note>Si se usa `-InstallMethod git` y falta Git, el script se cierra e imprime el enlace de Git para Windows.</Note>

---

## CI y automatización

Use opciones/variables de entorno no interactivas para ejecuciones predecibles.

<Tabs>
  <Tab title="install.sh (npm no interactivo)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard ```</Tab>
  <Tab title="install.sh (git no interactivo)">```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="install-cli.sh (JSON)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="install.ps1 (omitir onboarding)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

---

## Solución de problemas

<AccordionGroup>
  <Accordion title="¿Por qué se requiere Git?">
    Git es necesario para el método de instalación `git`. Para las instalaciones `npm`, Git aún se verifica/instala para evitar fallos de `spawn git ENOENT` cuando las dependencias usan URLs de git.
  </Accordion>

<Accordion title="¿Por qué npm encuentra EACCES en Linux?">Algunas configuraciones de Linux apuntan el prefijo global de npm a rutas propiedad de root. `install.sh` puede cambiar el prefijo a `~/.npm-global` y añadir exportaciones de PATH a los archivos rc del shell (cuando esos archivos existen).</Accordion>

  <Accordion title="problemas de sharp/libvips">
    Los scripts establecen por defecto `SHARP_IGNORE_GLOBAL_LIBVIPS=1` para evitar que sharp se compile contra libvips del sistema. Para anularlo:

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows: "npm error spawn git / ENOENT"'>Instala Git para Windows, vuelve a abrir PowerShell, vuelve a ejecutar el instalador.</Accordion>

<Accordion title='Windows: "openclaw is not recognized"'>Ejecuta `npm config get prefix` y añade ese directorio a tu PATH de usuario (no se necesita el sufijo `\bin` en Windows), luego vuelve a abrir PowerShell.</Accordion>

  <Accordion title="Windows: how to get verbose installer output">
    `install.ps1` actualmente no expone un interruptor `-Verbose`.
    Usa el seguimiento de PowerShell para diagnósticos a nivel de script:

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw not found after install">
    Generalmente es un problema del PATH. Consulta [Solución de problemas de Node.js](/es/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>

## Relacionado

- [Resumen de instalación](/es/install)
- [Actualización](/es/install/updating)
- [Desinstalación](/es/install/uninstall)
