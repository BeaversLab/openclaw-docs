---
summary: "Instalar OpenClaw — script de instalador, npm/pnpm/bun, desde el código fuente, Docker y más"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "Instalar"
---

# Instalar

## Recomendado: script de instalador

La forma más rápida de instalar. Detecta tu sistema operativo, instala Node si es necesario, instala OpenClaw e inicia el proceso de incorporación.

<Tabs>
  <Tab title="macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Windows (PowerShell)">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
</Tabs>

Para instalar sin ejecutar el proceso de incorporación:

<Tabs>
  <Tab title="macOS / Linux / WSL2">```bash curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Windows (PowerShell)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

Para conocer todas las opciones de marcas y CI/automatización, consulte [Funcionamiento interno del instalador](/es/install/installer).

## Requisitos del sistema

- **Node 24** (recomendado) o Node 22.14+ — el script de instalador gestiona esto automáticamente
- **macOS, Linux o Windows** — se admiten tanto Windows nativo como WSL2; WSL2 es más estable. Consulte [Windows](/es/platforms/windows).
- `pnpm` solo es necesario si compilas desde el código fuente

## Métodos de instalación alternativos

### Instalador de prefijo local (`install-cli.sh`)

Úselo cuando desee mantener OpenClaw y Node bajo un prefijo local como
`~/.openclaw`, sin depender de una instalación de Node en todo el sistema:

```bash
curl -fsSL https://openclaw.ai/install-cli.sh | bash
```

Admite instalaciones de npm de forma predeterminada, además de instalaciones de git-checkout bajo el mismo flujo de prefijo. Referencia completa: [Funcionamiento interno del instalador](/es/install/installer#install-clish).

### npm, pnpm o bun

Si ya gestionas Node por tu cuenta:

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm requiere aprobación explícita para paquetes con scripts de compilación. Ejecute `pnpm approve-builds -g` después de la primera instalación.
    </Note>

  </Tab>
  <Tab title="bun">
    ```bash
    bun add -g openclaw@latest
    openclaw onboard --install-daemon
    ```

    <Note>
    Bun es compatible con la ruta de instalación global de la CLI. Para el tiempo de ejecución de Gateway, Node sigue siendo el tiempo de ejecución de demonio recomendado.
    </Note>

  </Tab>
</Tabs>

<Accordion title="Solución de problemas: errores de compilación de sharp (npm)">
  Si `sharp` falla debido a una libvips instalada globalmente:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

</Accordion>

### Desde el código fuente

Para colaboradores o cualquiera que desee ejecutar desde una copia local:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm build && pnpm ui:build
pnpm link --global
openclaw onboard --install-daemon
```

O omita el enlace y use `pnpm openclaw ...` desde dentro del repositorio. Consulte [Configuración](/es/start/setup) para ver los flujos de trabajo completos de desarrollo.

### Instalar desde GitHub main

```bash
npm install -g github:openclaw/openclaw#main
```

### Contenedores y gestores de paquetes

<CardGroup cols={2}>
  <Card title="Docker" href="/es/install/docker" icon="container">
    Implementaciones en contenedores o sin cabeza.
  </Card>
  <Card title="Podman" href="/es/install/podman" icon="container">
    Alternativa de contenedor sin privilegios de root a Docker.
  </Card>
  <Card title="Nix" href="/es/install/nix" icon="snowflake">
    Instalación declarativa mediante Nix flake.
  </Card>
  <Card title="Ansible" href="/es/install/ansible" icon="server">
    Aprovisionamiento automatizado de flotas.
  </Card>
  <Card title="Bun" href="/es/install/bun" icon="zap">
    Uso solo de CLI mediante el tiempo de ejecución Bun.
  </Card>
</CardGroup>

## Verificar la instalación

```bash
openclaw --version      # confirm the CLI is available
openclaw doctor         # check for config issues
openclaw gateway status # verify the Gateway is running
```

Si desea un inicio administrado después de la instalación:

- macOS: LaunchAgent a través de `openclaw onboard --install-daemon` o `openclaw gateway install`
- Linux/WSL2: servicio de usuario systemd a través de los mismos comandos
- Windows nativo: Tarea programada primero, con un elemento de inicio de sesión en la carpeta de Inicio por usuario como alternativa si se deniega la creación de la tarea

## Alojamiento e implementación

Implemente OpenClaw en un servidor en la nube o VPS:

<CardGroup cols={3}>
  <Card title="VPS" href="/es/vps">
    Cualquier VPS de Linux
  </Card>
  <Card title="Docker VM" href="/es/install/docker-vm-runtime">
    Pasos compartidos de Docker
  </Card>
  <Card title="Kubernetes" href="/es/install/kubernetes">
    K8s
  </Card>
  <Card title="Fly.io" href="/es/install/fly">
    Fly.io
  </Card>
  <Card title="Hetzner" href="/es/install/hetzner">
    Hetzner
  </Card>
  <Card title="GCP" href="/es/install/gcp">
    Google Cloud
  </Card>
  <Card title="Azure" href="/es/install/azure">
    Azure
  </Card>
  <Card title="Railway" href="/es/install/railway">
    Railway
  </Card>
  <Card title="Render" href="/es/install/render">
    Render
  </Card>
  <Card title="Northflank" href="/es/install/northflank">
    Northflank
  </Card>
</CardGroup>

## Actualizar, migrar o desinstalar

<CardGroup cols={3}>
  <Card title="Updating" href="/es/install/updating" icon="refresh-cw">
    Mantener OpenClaw actualizado.
  </Card>
  <Card title="Migrating" href="/es/install/migrating" icon="arrow-right">
    Moverse a una nueva máquina.
  </Card>
  <Card title="Uninstall" href="/es/install/uninstall" icon="trash-2">
    Eliminar OpenClaw completamente.
  </Card>
</CardGroup>

## Solución de problemas: `openclaw` no encontrado

Si la instalación se realizó correctamente pero `openclaw` no se encuentra en su terminal:

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```

Si `$(npm prefix -g)/bin` no está en tu `$PATH`, agrégalo a tu archivo de inicio de shell (`~/.zshrc` o `~/.bashrc`):

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

Luego abre una nueva terminal. Consulta [Configuración de Node](/es/install/node) para más detalles.
