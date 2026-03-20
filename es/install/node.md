---
title: "Node.js"
summary: "Instala y configura Node.js para OpenClaw: requisitos de versión, opciones de instalación y solución de problemas de PATH"
read_when:
  - "Necesitas instalar Node.js antes de instalar OpenClaw"
  - "Instalaste OpenClaw pero `openclaw`: orden no encontrada"
  - "npm install -g falla con problemas de permisos o de PATH"
---

# Node.js

OpenClaw requiere **Node 22.16 o más reciente**. **Node 24 es el tiempo de ejecución predeterminado y recomendado** para instalaciones, CI y flujos de trabajo de lanzamiento. Node 22 sigue siendo compatible a través de la línea LTS activa. El [script de instalación](/es/install#install-methods) detectará e instalará Node automáticamente; esta página es para cuando deseas configurar Node tú mismo y asegurarte de que todo esté conectado correctamente (versiones, PATH, instalaciones globales).

## Comprobar tu versión

```bash
node -v
```

Si esto imprime `v24.x.x` o superior, estás en el valor predeterminado recomendado. Si imprime `v22.16.x` o superior, estás en la ruta compatible de Node 22 LTS, pero aún recomendamos actualizar a Node 24 cuando sea conveniente. Si Node no está instalado o la versión es demasiado antigua, elige un método de instalación a continuación.

## Instalar Node

<Tabs>
  <Tab title="macOS">
    **Homebrew** (recomendado):

    ```bash
    brew install node
    ```

    O descarga el instalador de macOS desde [nodejs.org](https://nodejs.org/).

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

    O utiliza un gestor de versiones (ver abajo).

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

    O descarga el instalador de Windows desde [nodejs.org](https://nodejs.org/).

  </Tab>
</Tabs>

<Accordion title="Uso de un gestor de versiones (nvm, fnm, mise, asdf)">
  Los gestores de versiones le permiten cambiar fácilmente entre versiones de Node. Opciones populares:

- [**fnm**](https://github.com/Schniz/fnm) — rápido, multiplataforma
- [**nvm**](https://github.com/nvm-sh/nvm) — muy utilizado en macOS/Linux
- [**mise**](https://mise.jdx.dev/) — multipropósito (Node, Python, Ruby, etc.)

Ejemplo con fnm:

```bash
fnm install 24
fnm use 24
```

  <Warning>
  Asegúrese de que su gestor de versiones esté inicializado en su archivo de inicio de shell (`~/.zshrc` o `~/.bashrc`). Si no lo está, es posible que `openclaw` no se encuentre en nuevas sesiones de terminal porque el PATH no incluirá el directorio bin de Node.
  </Warning>
</Accordion>

## Solución de problemas

### `openclaw: command not found`

Esto casi siempre significa que el directorio bin global de npm no está en su PATH.

<Steps>
  <Step title="Find your global npm prefix">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="Compruebe si está en su PATH">
    ```bash
    echo "$PATH"
    ```

    Busque `<npm-prefix>/bin` (macOS/Linux) o `<npm-prefix>` (Windows) en la salida.

  </Step>
  <Step title="Agréguelo a su archivo de inicio de shell">
    <Tabs>
      <Tab title="macOS / Linux">
        Agregue a `~/.zshrc` o `~/.bashrc`:

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        Luego abra una nueva terminal (o ejecute `rehash` en zsh / `hash -r` en bash).
      </Tab>
      <Tab title="Windows">
        Agregue la salida de `npm prefix -g` a su PATH del sistema mediante Configuración → Sistema → Variables de entorno.
      </Tab>
    </Tabs>

  </Step>
</Steps>

### Errores de permisos en `npm install -g` (Linux)

Si ve errores `EACCES`, cambie el prefijo global de npm a un directorio escribible por el usuario:

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

Agregue la línea `export PATH=...` a su `~/.bashrc` o `~/.zshrc` para hacerlo permanente.

import es from "/components/footer/es.mdx";

<es />
