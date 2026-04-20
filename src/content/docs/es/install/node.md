---
title: "Node.js"
summary: "Instala y configura Node.js para OpenClaw — requisitos de versión, opciones de instalación y solución de problemas de PATH"
read_when:
  - "You need to install Node.js before installing OpenClaw"
  - "You installed OpenClaw but `openclaw` is command not found"
  - "npm install -g fails with permissions or PATH issues"
---

# Node.js

OpenClaw requiere **Node 22.14 o más reciente**. **Node 24 es el entorno de ejecución predeterminado y recomendado** para instalaciones, CI y flujos de trabajo de lanzamiento. Node 22 sigue siendo compatible a través de la línea LTS activa. El [script de instalación](/es/install#alternative-install-methods) detectará e instalará Node automáticamente; esta página es para cuando desees configurar Node tú mismo y asegurarte de que todo esté conectado correctamente (versiones, PATH, instalaciones globales).

## Verifica tu versión

```bash
node -v
```

Si esto imprime `v24.x.x` o superior, estás en la versión predeterminada recomendada. Si imprime `v22.14.x` o superior, estás en la ruta compatible de Node 22 LTS, pero aún recomendamos actualizar a Node 24 cuando sea conveniente. Si Node no está instalado o la versión es demasiado antigua, elige un método de instalación a continuación.

## Instalar Node

<Tabs>
  <Tab title="macOS">
    **Homebrew** (recomendado):

    ```bash
    brew install node
    ```

    O descargue el instalador de macOS desde [nodejs.org](https://nodejs.org/).

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian:**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL:**

    ```bash
    sudo dnf install nodejs
    ```

    O usa un gestor de versiones (ver abajo).

  </Tab>
  <Tab title="Windows">
    **winget** (recomendado):

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey:**

    ```powershell
    choco install nodejs-lts
    ```

    O descargue el instalador de Windows desde [nodejs.org](https://nodejs.org/).

  </Tab>
</Tabs>

<Accordion title="Using a version manager (nvm, fnm, mise, asdf)">
  Los gestores de versiones le permiten cambiar fácilmente entre versiones de Node. Opciones populares:

- [**fnm**](https://github.com/Schniz/fnm) — rápido, multiplataforma
- [**nvm**](https://github.com/nvm-sh/nvm) — muy utilizado en macOS/Linux
- [**mise**](https://mise.jdx.dev/) — multiparadigma (Node, Python, Ruby, etc.)

Ejemplo con fnm:

```bash
fnm install 24
fnm use 24
```

  <Warning>
  Asegúrese de que su gestor de versiones se inicialice en el archivo de inicio de su shell (`~/.zshrc` o `~/.bashrc`). Si no es así, es posible que `openclaw` no se encuentre en nuevas sesiones de terminal porque el PATH no incluirá el directorio bin de Node.
  </Warning>
</Accordion>

## Solución de problemas

### `openclaw: command not found`

Esto casi siempre significa que el directorio bin global de npm no está en tu PATH.

<Steps>
  <Step title="Find your global npm prefix">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="Comprueba si está en tu PATH">
    ```bash
    echo "$PATH"
    ```

    Busca `<npm-prefix>/bin` (macOS/Linux) o `<npm-prefix>` (Windows) en la salida.

  </Step>
  <Step title="Agrégalo a tu archivo de inicio de shell">
    <Tabs>
      <Tab title="macOS / Linux">
        Agrega a `~/.zshrc` o `~/.bashrc`:

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        Luego abre una nueva terminal (o ejecuta `rehash` en zsh / `hash -r` en bash).
      </Tab>
      <Tab title="Windows">
        Agrega la salida de `npm prefix -g` a tu PATH del sistema mediante Configuración → Sistema → Variables de entorno.
      </Tab>
    </Tabs>

  </Step>
</Steps>

### Errores de permiso en `npm install -g` (Linux)

Si ves errores de `EACCES`, cambia el prefijo global de npm a un directorio escribible por el usuario:

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

Agrega la línea `export PATH=...` a tu `~/.bashrc` o `~/.zshrc` para hacerlo permanente.

## Relacionado

- [Resumen de instalación](/es/install) — todos los métodos de instalación
- [Actualización](/es/install/updating) — mantener OpenClaw actualizado
- [Primeros pasos](/es/start/getting-started) — primeros pasos después de la instalación
