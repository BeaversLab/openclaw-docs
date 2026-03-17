---
summary: "Instalar OpenClaw — script de instalación, npm/pnpm, desde el código fuente, Docker y más"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "Instalar"
---

# Instalar

¿Ya seguiste [Introducción](/es/start/getting-started)? Todo listo — esta página es para métodos de instalación alternativos, instrucciones específicas de la plataforma y mantenimiento.

## Requisitos del sistema

- **[Node 24 (recomendado)](/es/install/node)** (Node 22 LTS, actualmente `22.16+`, todavía es compatible por compatibilidad; el [script de instalación](#install-methods) instalará Node 24 si no está presente)
- macOS, Linux o Windows
- `pnpm` solo si compilas desde el código fuente

<Note>
  En Windows, recomendamos encarecidamente ejecutar OpenClaw bajo
  [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install).
</Note>

## Métodos de instalación

<Tip>
  El **script de instalación** es la forma recomendada de instalar OpenClaw. Maneja la detección de
  Node, la instalación y el inicio en un solo paso.
</Tip>

<Warning>
  Para hosts VPS/en la nube, evite las imágenes de mercado de "un clic" de terceros cuando sea
  posible. Prefiera una imagen base de sistema operativo limpia (por ejemplo Ubuntu LTS) y luego
  instale OpenClaw usted mismo con el script de instalación.
</Warning>

<AccordionGroup>
  <Accordion title="Script de instalación" icon="rocket" defaultOpen>
    Descarga la CLI, la instala globalmente a través de npm e inicia el onboarding.

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    Eso es todo: el script maneja la detección de Node, la instalación y el onboarding.

    Para omitir el onboarding y solo instalar el binario:

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
        ```
      </Tab>
    </Tabs>

    Para todas las opciones de flags, variables de entorno y CI/automatización, consulta [Aspectos internos del instalador](/es/install/installer).

  </Accordion>

  <Accordion title="npm / pnpm" icon="package">
    Si ya gestionas Node por tu cuenta, recomendamos Node 24. OpenClaw todavía es compatible con Node 22 LTS, actualmente `22.16+`, por compatibilidad:

    <Tabs>
      <Tab title="npm">
        ```bash
        npm install -g openclaw@latest
        openclaw onboard --install-daemon
        ```

        <Accordion title="¿Errores de compilación sharp?">
          Si tienes libvips instalado globalmente (común en macOS a través de Homebrew) y `sharp` falla, fuerza los binarios precompilados:

          ```bash
          SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
          ```

          Si ves `sharp: Please add node-gyp to your dependencies`, instala herramientas de compilación (macOS: Xcode CLT + `npm install -g node-gyp`) o usa la variable de entorno mencionada arriba.
        </Accordion>
      </Tab>
      <Tab title="pnpm">
        ```bash
        pnpm add -g openclaw@latest
        pnpm approve-builds -g        # approve openclaw, node-llama-cpp, sharp, etc.
        openclaw onboard --install-daemon
        ```

        <Note>
        pnpm requiere aprobación explícita para paquetes con scripts de compilación. Después de que la primera instalación muestre la advertencia "Ignored build scripts", ejecuta `pnpm approve-builds -g` y selecciona los paquetes listados.
        </Note>
      </Tab>
    </Tabs>

    ¿Quieres la versión `main` head actual de GitHub con una instalación mediante un gestor de paquetes?

    ```bash
    npm install -g github:openclaw/openclaw#main
    ```

    ```bash
    pnpm add -g github:openclaw/openclaw#main
    ```

  </Accordion>

  <Accordion title="Desde el código fuente" icon="github">
    Para colaboradores o cualquiera que quiera ejecutar desde una copia local.

    <Steps>
      <Step title="Clonar y compilar">
        Clona el [repositorio de OpenClaw](https://github.com/openclaw/openclaw) y compila:

        ```bash
        git clone https://github.com/openclaw/openclaw.git
        cd openclaw
        pnpm install
        pnpm ui:build
        pnpm build
        ```
      </Step>
      <Step title="Enlazar la CLI">
        Haz que el comando `openclaw` esté disponible globalmente:

        ```bash
        pnpm link --global
        ```

        Alternativamente, omite el enlace y ejecuta comandos a través de `pnpm openclaw ...` desde dentro del repositorio.
      </Step>
      <Step title="Ejecutar el onboarding">
        ```bash
        openclaw onboard --install-daemon
        ```
      </Step>
    </Steps>

    Para flujos de trabajo de desarrollo más profundos, consulta [Configuración](/es/start/setup).

  </Accordion>
</AccordionGroup>

## Otros métodos de instalación

<CardGroup cols={2}>
  <Card title="Docker" href="/es/install/docker" icon="container">
    Implementaciones en contenedores o sin interfaz gráfica.
  </Card>
  <Card title="Podman" href="/es/install/podman" icon="container">
    Contenedor sin root: ejecute `setup-podman.sh` una vez y luego el script de lanzamiento.
  </Card>
  <Card title="Nix" href="/es/install/nix" icon="snowflake">
    Instalación declarativa mediante Nix.
  </Card>
  <Card title="Ansible" href="/es/install/ansible" icon="server">
    Aprovisionamiento automatizado de flotas.
  </Card>
  <Card title="Bun" href="/es/install/bun" icon="zap">
    Uso solo de CLI a través del tiempo de ejecución Bun.
  </Card>
</CardGroup>

## Después de la instalación

Verifique que todo funciona:

```bash
openclaw doctor         # check for config issues
openclaw status         # gateway status
openclaw dashboard      # open the browser UI
```

Si necesita rutas de tiempo de ejecución personalizadas, use:

- `OPENCLAW_HOME` para rutas internas basadas en el directorio de inicio
- `OPENCLAW_STATE_DIR` para la ubicación del estado mutable
- `OPENCLAW_CONFIG_PATH` para la ubicación del archivo de configuración

Consulte [Variables de entorno](/es/help/environment) para conocer la precedencia y los detalles completos.

## Solución de problemas: `openclaw` no encontrado

<Accordion title="Diagnóstico y solución de PATH">
  Diagnóstico rápido:

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

Si `$(npm prefix -g)/bin` (macOS/Linux) o `$(npm prefix -g)` (Windows) **no** está en su `$PATH`, su shell no puede encontrar los binarios globales de npm (incluyendo `openclaw`).

Solución: agréguelo a su archivo de inicio de shell (`~/.zshrc` o `~/.bashrc`):

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

En Windows, agregue la salida de `npm prefix -g` a su PATH.

Luego abra una nueva terminal (o ejecute `rehash` en zsh / `hash -r` en bash).

</Accordion>

## Actualizar / desinstalar

<CardGroup cols={3}>
  <Card title="Actualizando" href="/es/install/updating" icon="refresh-cw">
    Mantenga OpenClaw actualizado.
  </Card>
  <Card title="Migrating" href="/es/install/migrating" icon="arrow-right">
    Moverse a una nueva máquina.
  </Card>
  <Card title="Uninstall" href="/es/install/uninstall" icon="trash-2">
    Eliminar OpenClaw por completo.
  </Card>
</CardGroup>

import es from "/components/footer/es.mdx";

<es />
