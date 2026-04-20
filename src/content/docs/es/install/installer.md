---
summary: "Cómo funcionan los scripts de instalación (install.sh, install-cli.sh, install.ps1), opciones y automatización"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "Internos del instalador"
---

# Internos del instalador

OpenClaw incluye tres scripts de instalación, servidos desde `openclaw.ai`.

| Script                             | Plataforma           | Lo que hace                                                                                                                 |
| ---------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Instala Node si es necesario, instala OpenClaw a través de npm (predeterminado) o git, y puede ejecutar la incorporación.   |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Instala Node + OpenClaw en un prefijo local (`~/.openclaw`) con modos npm o git checkout. No se requieren permisos de root. |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Instala Node si es necesario, instala OpenClaw a través de npm (predeterminado) o git, y puede ejecutar la incorporación.   |

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

<Note>Si la instalación se realiza correctamente pero `openclaw` no se encuentra en una nueva terminal, consulte [Solución de problemas de Node.js](/es/install/node#troubleshooting).</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>Recomendado para la mayoría de las instalaciones interactivas en macOS/Linux/WSL.</Tip>

### Flujo (install.sh)

<Steps>
  <Step title="Detectar sistema operativo">Admite macOS y Linux (incluido WSL). Si se detecta macOS, instala Homebrew si falta.</Step>
  <Step title="Asegurar Node.js 24 por defecto">Comprueba la versión de Node e instala Node 24 si es necesario (Homebrew en macOS, scripts de configuración de NodeSource en Linux apt/dnf/yum). OpenClaw aún admite Node 22 LTS, actualmente `22.14+`, por compatibilidad.</Step>
  <Step title="Asegurar Git">Instala Git si falta.</Step>
  <Step title="Instalar OpenClaw">- Método `npm` (predeterminado): instalación global de npm - Método `git`: clonar/actualizar repositorio, instalar dependencias con pnpm, compilar y luego instalar el envoltorio en `~/.local/bin/openclaw`</Step>
  <Step title="Tareas posteriores a la instalación">
    - Actualiza el servicio de puerta de enlace cargado mejor posible (`openclaw gateway install --force`, luego reiniciar) - Ejecuta `openclaw doctor --non-interactive` en actualizaciones e instalaciones de git (mejor esfuerzo) - Intenta la incorporación cuando sea apropiado (TTY disponible, incorporación no deshabilitada y las comprobaciones de arranque/configuración pasan) - Valores
    predeterminados `SHARP_IGNORE_GLOBAL_LIBVIPS=1`
  </Step>
</Steps>

### Detección de checkout de código fuente

Si se ejecuta dentro de un checkout de OpenClaw (`package.json` + `pnpm-workspace.yaml`), el script ofrece:

- usar el checkout (`git`), o
- usar la instalación global (`npm`)

Si no hay ningún TTY disponible y no se establece ningún método de instalación, se usa de forma predeterminada `npm` y se advierte.

El script termina con el código `2` para una selección de método no válida o valores `--install-method` no válidos.

### Ejemplos (install.sh)

<Tabs>
  <Tab title="Predeterminado">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Omitir incorporación">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Instalación Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="GitHub main vía npm">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="Ejecución en seco">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de opciones">

| Opción                                | Descripción                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `--install-method npm\|git`           | Elegir método de instalación (predeterminado: `npm`). Alias: `--method`         |
| `--npm`                               | Atajo para el método npm                                                        |
| `--git`                               | Atajo para el método git. Alias: `--github`                                     |
| `--version <version\|dist-tag\|spec>` | versión de npm, dist-tag o especificación de paquete (predeterminado: `latest`) |
| `--beta`                              | Usar dist-tag beta si está disponible, de lo contrario volver a `latest`        |
| `--git-dir <path>`                    | Directorio de checkout (predeterminado: `~/openclaw`). Alias: `--dir`           |
| `--no-git-update`                     | Omitir `git pull` para checkout existente                                       |
| `--no-prompt`                         | Desactivar prompts                                                              |
| `--no-onboard`                        | Omitir incorporación                                                            |
| `--onboard`                           | Activar incorporación                                                           |
| `--dry-run`                           | Imprimir acciones sin aplicar cambios                                           |
| `--verbose`                           | Activar salida de depuración (`set -x`, registros de nivel de aviso de npm)     |
| `--help`                              | Mostrar uso (`-h`)                                                              |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                                                | Descripción                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | Método de instalación                                              |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | versión de npm, dist-tag o especificación de paquete               |
| `OPENCLAW_BETA=0\|1`                                    | Usar beta si está disponible                                       |
| `OPENCLAW_GIT_DIR=<path>`                               | Directorio de checkout                                             |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | Alternar actualizaciones de git                                    |
| `OPENCLAW_NO_PROMPT=1`                                  | Desactivar prompts                                                 |
| `OPENCLAW_NO_ONBOARD=1`                                 | Omitir onboarding                                                  |
| `OPENCLAW_DRY_RUN=1`                                    | Modo de ejecución en seco                                          |
| `OPENCLAW_VERBOSE=1`                                    | Modo de depuración                                                 |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | nivel de registro de npm                                           |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | Controlar el comportamiento de sharp/libvips (predeterminado: `1`) |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>Diseñado para entornos donde desea tener todo bajo un prefijo local (predeterminado `~/.openclaw`) y sin dependencia del sistema Node. Soporta instalaciones npm por defecto, además de instalaciones git-checkout bajo el mismo flujo de prefijo.</Info>

### Flujo (install-cli.sh)

<Steps>
  <Step title="Instalar el tiempo de ejecución de Node local">
    Descarga un tarball fijado de una versión LTS soportada de Node (la versión está incrustada en el script y se actualiza de forma independiente) en `<prefix>/tools/node-v<version>` y verifica SHA-256.
  </Step>
  <Step title="Asegurar Git">
    Si falta Git, intenta la instalación mediante apt/dnf/yum en Linux o Homebrew en macOS.
  </Step>
  <Step title="Instalar OpenClaw bajo el prefijo">
    - `npm` método (predeterminado): instala bajo el prefijo con npm, luego escribe un contenedor en `<prefix>/bin/openclaw`
    - `git` método: clona/actualiza un checkout (predeterminado `~/openclaw`) y todavía escribe el contenedor en `<prefix>/bin/openclaw`
  </Step>
  <Step title="Actualizar el servicio de puerta de enlace cargado">
    Si ya se ha cargado un servicio de puerta de enlace desde el mismo prefijo, el script ejecuta
    `openclaw gateway install --force`, luego `openclaw gateway restart` y
    verifica el estado de la puerta de enlace con el mayor esfuerzo posible.
  </Step>
</Steps>

### Ejemplos (install-cli.sh)

<Tabs>
  <Tab title="Predeterminado">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Prefijo personalizado + versión">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Instalación desde Git">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="Salida JSON de automatización">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Ejecutar incorporación">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de banderas">

| Bandera                     | Descripción                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `--prefix <path>`           | Prefijo de instalación (predeterminado: `~/.openclaw`)                                  |
| `--install-method npm\|git` | Elegir método de instalación (predeterminado: `npm`). Alias: `--method`                 |
| `--npm`                     | Atajo para el método npm                                                                |
| `--git`, `--github`         | Atajo para el método git                                                                |
| `--git-dir <path>`          | Directorio de checkout de Git (predeterminado: `~/openclaw`). Alias: `--dir`            |
| `--version <ver>`           | Versión de OpenClaw o etiqueta de distribución (predeterminado: `latest`)               |
| `--node-version <ver>`      | Versión de Node (predeterminado: `22.22.0`)                                             |
| `--json`                    | Emitir eventos NDJSON                                                                   |
| `--onboard`                 | Ejecutar `openclaw onboard` después de la instalación                                   |
| `--no-onboard`              | Saltar onboarding (predeterminado)                                                      |
| `--set-npm-prefix`          | En Linux, forzar el prefijo npm a `~/.npm-global` si el prefijo actual no es escribible |
| `--help`                    | Mostrar uso (`-h`)                                                                      |

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
  <Step title="Asegurar Node.js 24 por defecto">Si falta, intenta la instalación vía winget, luego Chocolatey, luego Scoop. Node 22 LTS, actualmente `22.14+`, permanece soportado por compatibilidad.</Step>
  <Step title="Instalar OpenClaw">- Método `npm` (predeterminado): instalación global de npm usando `-Tag` seleccionado - Método `git`: clonar/actualizar repositorio, instalar/construir con pnpm, e instalar contenedor en `%USERPROFILE%\.local\bin\openclaw.cmd`</Step>
  <Step title="Tareas posteriores a la instalación">- Añade el directorio bin necesario al PATH del usuario cuando es posible - Actualiza un servicio de puerta de enlace cargado con mejor esfuerzo (`openclaw gateway install --force`, luego reiniciar) - Ejecuta `openclaw doctor --non-interactive` en actualizaciones e instalaciones de git (mejor esfuerzo)</Step>
</Steps>

### Ejemplos (install.ps1)

<Tabs>
  <Tab title="Predeterminado">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Instalación Git">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="GitHub main vía npm">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="Directorio git personalizado">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="Ejecución en seco">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="Rastro de depuración">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Referencia de opciones">

| Opción                      | Descripción                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `-InstallMethod npm\|git`   | Método de instalación (predeterminado: `npm`)                                   |
| `-Tag <tag\|version\|spec>` | dist-tag de npm, versión o especificación de paquete (predeterminado: `latest`) |
| `-GitDir <path>`            | Directorio de checkout (predeterminado: `%USERPROFILE%\openclaw`)               |
| `-NoOnboard`                | Omitir onboarding                                                               |
| `-NoGitUpdate`              | Omitir `git pull`                                                               |
| `-DryRun`                   | Imprimir solo acciones                                                          |

  </Accordion>

  <Accordion title="Referencia de variables de entorno">

| Variable                           | Descripción               |
| ---------------------------------- | ------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Método de instalación     |
| `OPENCLAW_GIT_DIR=<path>`          | Directorio de checkout    |
| `OPENCLAW_NO_ONBOARD=1`            | Omitir onboarding         |
| `OPENCLAW_GIT_UPDATE=0`            | Deshabilitar git pull     |
| `OPENCLAW_DRY_RUN=1`               | Modo de ejecución en seco |

  </Accordion>
</AccordionGroup>

<Note>Si se usa `-InstallMethod git` y falta Git, el script sale e imprime el enlace a Git para Windows.</Note>

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
    Git es necesario para el método de instalación `git`. Para instalaciones `npm`, Git se verifica e instala de todos modos para evitar fallos de `spawn git ENOENT` cuando las dependencias usan URLs de git.
  </Accordion>

<Accordion title="¿Por qué npm encuentra EACCES en Linux?">Algunas configuraciones de Linux apuntan el prefijo global de npm a rutas propiedad de root. `install.sh` puede cambiar el prefijo a `~/.npm-global` y añadir exportaciones de PATH a los archivos rc de shell (cuando esos archivos existen).</Accordion>

  <Accordion title="problemas con sharp/libvips">
    Los scripts establecen por defecto `SHARP_IGNORE_GLOBAL_LIBVIPS=1` para evitar que sharp compile contra la libvips del sistema. Para anularlo:

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows: "npm error spawn git / ENOENT"'>Instale Git for Windows, vuelva a abrir PowerShell, ejecute el instalador nuevamente.</Accordion>

<Accordion title='Windows: "openclaw no se reconoce"'>Ejecute `npm config get prefix` y añada ese directorio a su PATH de usuario (no se necesita el sufijo `\bin` en Windows), luego vuelva a abrir PowerShell.</Accordion>

  <Accordion title="Windows: cómo obtener una salida detallada del instalador">
    `install.ps1` actualmente no expone un interruptor `-Verbose`.
    Utilice el seguimiento de PowerShell para diagnósticos a nivel de script:

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw no encontrado después de la instalación">
    Por lo general es un problema de PATH. Consulte [solución de problemas de Node.js](/es/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>
