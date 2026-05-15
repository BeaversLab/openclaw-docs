---
summary: "Cómo funciona el sandboxing de OpenClaw: modos, alcances, acceso al espacio de trabajo e imágenes"
title: "Sandboxing"
sidebarTitle: "Sandboxing"
read_when: "Deseas una explicación dedicada del sandboxing o necesitas ajustar agents.defaults.sandbox."
status: activo
---

OpenClaw puede ejecutar **herramientas dentro de backends de sandbox** para reducir el radio de explosión. Esto es **opcional** y está controlado por la configuración (`agents.defaults.sandbox` o `agents.list[].sandbox`). Si el sandboxing está desactivado, las herramientas se ejecutan en el host. La Gateway se mantiene en el host; la ejecución de herramientas se ejecuta en un sandbox aislado cuando está habilitada.

<Note>Esto no es un límite de seguridad perfecto, pero limita materialmente el acceso al sistema de archivos y a los procesos cuando el modelo hace algo tonto.</Note>

## Qué se pone en sandbox

- Ejecución de herramientas (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navegador con sandbox opcional (`agents.defaults.sandbox.browser`).

<AccordionGroup>
  <Accordion title="Detalles del navegador con sandbox">
    - De forma predeterminada, el navegador sandbox se inicia automáticamente (asegura que CDP sea accesible) cuando la herramienta del navegador lo necesita. Configurarlo mediante `agents.defaults.sandbox.browser.autoStart` y `agents.defaults.sandbox.browser.autoStartTimeoutMs`.
    - De forma predeterminada, los contenedores del navegador sandbox usan una red Docker dedicada (`openclaw-sandbox-browser`) en lugar de la red global `bridge`. Configúrelo con `agents.defaults.sandbox.browser.network`.
    - Opcional `agents.defaults.sandbox.browser.cdpSourceRange` restringe el ingreso de CDP en el borde del contenedor con una lista de permitidos CIDR (por ejemplo `172.21.0.1/32`).
    - El acceso de observador noVNC está protegido por contraseña de forma predeterminada; OpenClaw emite una URL de token de corta duración que sirve una página de arranque local y abre noVNC con la contraseña en el fragmento de la URL (no en registros de consulta/cabecera).
    - `agents.defaults.sandbox.browser.allowHostControl` permite que las sesiones con sandbox apunten explícitamente al navegador del host.
    - Las listas de permitidos opcionales controlan `target: "custom"`: `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

  </Accordion>
</AccordionGroup>

No aislado:

- El propio proceso de la Gateway.
- Cualquier herramienta explícitamente permitida para ejecutarse fuera del sandbox (por ejemplo, `tools.elevated`).
  - **La ejecución elevada omite el sandboxing y utiliza la ruta de escape configurada (`gateway` por defecto, o `node` cuando el objetivo de ejecución es `node`).**
  - Si el sandboxing está desactivado, `tools.elevated` no cambia la ejecución (ya está en el host). Consulte [Elevated Mode](/es/tools/elevated).

## Modos

`agents.defaults.sandbox.mode` controla **cuándo** se utiliza el sandboxing:

<Tabs>
  <Tab title="off">
    Sin sandboxing.
  </Tab>
  <Tab title="non-main">
    Sandbox solo para sesiones **no principales** (predeterminado si desea chats normales en el host).

    `"non-main"` se basa en `session.mainKey` (predeterminado `"main"`), no en el id del agente. Las sesiones de grupo/canal utilizan sus propias claves, por lo que cuentan como no principales y se ejecutarán en sandbox.

  </Tab>
  <Tab title="all">
    Cada sesión se ejecuta en un sandbox.
  </Tab>
</Tabs>

## Ámbito

`agents.defaults.sandbox.scope` controla **cuántos contenedores** se crean:

- `"agent"` (predeterminado): un contenedor por agente.
- `"session"`: un contenedor por sesión.
- `"shared"`: un contenedor compartido por todas las sesiones en sandbox.

## Backend

`agents.defaults.sandbox.backend` controla **qué tiempo de ejecución** proporciona el sandbox:

- `"docker"` (predeterminado cuando el sandboxing está activado): tiempo de ejecución de sandbox local respaldado por Docker.
- `"ssh"`: tiempo de ejecución de sandbox remoto genérico respaldado por SSH.
- `"openshell"`: tiempo de ejecución de sandbox respaldado por OpenShell.

La configuración específica de SSH se encuentra bajo `agents.defaults.sandbox.ssh`. La configuración específica de OpenShell se encuentra bajo `plugins.entries.openshell.config`.

### Elegir un backend

|                                      | Docker                                     | SSH                               | OpenShell                                                               |
| ------------------------------------ | ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| **Dónde se ejecuta**                 | Contenedor local                           | Cualquier host accesible por SSH  | Sandbox administrado por OpenShell                                      |
| **Configuración**                    | `scripts/sandbox-setup.sh`                 | Clave SSH + host de destino       | Complemento OpenShell habilitado                                        |
| **Modelo de espacio de trabajo**     | Bind-mount o copia                         | Remoto canónico (sembrar una vez) | `mirror` o `remote`                                                     |
| **Control de red**                   | `docker.network` (predeterminado: ninguno) | Depende del host remoto           | Depende de OpenShell                                                    |
| **Sandbox de navegador**             | Compatible                                 | No compatible                     | Aún no compatible                                                       |
| **Montajes de enlace (bind mounts)** | `docker.binds`                             | N/A                               | N/A                                                                     |
| **Lo mejor para**                    | Desarrollo local, aislamiento completo     | Descarga en una máquina remota    | Sandboxes remotos gestionados con sincronización bidireccional opcional |

### Backend de Docker

El aislamiento (sandboxing) está desactivado por defecto. Si habilita el aislamiento y no elige un backend, OpenClaw utiliza el backend de Docker. Ejecuta herramientas y navegadores de aislamiento localmente a través del socket del demonio Docker (`/var/run/docker.sock`). El aislamiento del contenedor de aislamiento está determinado por los espacios de nombres (namespaces) de Docker.

Para exponer las GPUs del anfitrión a los entornos aislados de Docker, establezca `agents.defaults.sandbox.docker.gpus` o la anulación `agents.list[].sandbox.docker.gpus` por agente. El valor se pasa al indicador `--gpus` de Docker como un argumento separado, por ejemplo `"all"` o `"device=GPU-uuid"`, y requiere un tiempo de ejecución del anfitrión compatible, como NVIDIA Container Toolkit.

<Warning>
**Restricciones de Docker-out-of-Docker (DooD)**

Si implementa el OpenClaw Gateway en sí como un contenedor Docker, orquesta contenedores de aislamiento hermanos usando el socket Docker del anfitrión (DooD). Esto introduce una restricción específica de mapeo de rutas:

- **La configuración requiere rutas del anfitrión**: La configuración `openclaw.json` `workspace` DEBE contener la **ruta absoluta del anfitrión** (ej. `/home/user/.openclaw/workspaces`), no la ruta interna del contenedor Gateway. Cuando OpenClaw le pide al demonio Docker que genere un entorno aislado, el demonio evalúa las rutas relativas al espacio de nombres del SO del anfitrión, no al espacio de nombres del Gateway.
- **Paridad del puente FS (mapa de volumen idéntico)**: El proceso nativo del OpenClaw Gateway también escribe archivos de puente y latido en el directorio `workspace`. Debido a que el Gateway evalúa exactamente la misma cadena (la ruta del anfitrión) desde dentro de su propio entorno contenedorizado, la implementación del Gateway DEBE incluir un mapa de volumen idéntico vinculando el espacio de nombres del anfitrión de forma nativa (`-v /home/user/.openclaw:/home/user/.openclaw`).

Si asigna rutas internamente sin paridad absoluta del anfitrión, OpenClaw lanza nativamente un error de permiso `EACCES` al intentar escribir su latido dentro del entorno del contenedor porque la cadena de ruta completa calificada no existe de forma nativa.

</Warning>

### Backend SSH

Use `backend: "ssh"` cuando desee que OpenClaw aísle `exec`, herramientas de archivo y lecturas de medios en una máquina arbitraria accesible por SSH.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // Or use SecretRefs / inline contents instead of local files:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Cómo funciona">
    - OpenClaw crea una raíz remota por ámbito bajo `sandbox.ssh.workspaceRoot`.
    - En el primer uso después de crear o recrear, OpenClaw siembra ese espacio de trabajo remoto desde el espacio de trabajo local una vez.
    - Después de eso, `exec`, `read`, `write`, `edit`, `apply_patch`, las lecturas de medios del prompt y la preparación de medios entrantes se ejecutan directamente contra el espacio de trabajo remoto a través de SSH.
    - OpenClaw no sincroniza los cambios remotos de vuelta al espacio de trabajo local automáticamente.

  </Accordion>
  <Accordion title="Material de autenticación">
    - `identityFile`, `certificateFile`, `knownHostsFile`: use archivos locales existentes y páselos a través de la configuración de OpenSSH.
    - `identityData`, `certificateData`, `knownHostsData`: use cadenas en línea o SecretRefs. OpenClaw los resuelve a través de la instantánea de tiempo de ejecución de secretos normal, los escribe en archivos temporales con `0600` y los elimina cuando termina la sesión SSH.
    - Si se configuran tanto `*File` como `*Data` para el mismo elemento, `*Data` tiene prioridad para esa sesión SSH.

  </Accordion>
  <Accordion title="Consecuencias de remoto canónico">
    Este es un modelo **remoto canónico**. El espacio de trabajo SSH remoto se convierte en el estado real del espacio aislado después de la siembra inicial.

    - Las ediciones locales en el host realizadas fuera de OpenClaw después del paso de siembra no son visibles remotamente hasta que vuelva a crear el espacio aislado.
    - `openclaw sandbox recreate` elimina la raíz remota por ámbito y vuelve a sembrar desde lo local en el próximo uso.
    - El aislamiento del navegador no es compatible con el backend SSH.
    - La configuración de `sandbox.docker.*` no se aplica al backend SSH.

  </Accordion>
</AccordionGroup>

### Backend OpenShell

Use `backend: "openshell"` cuando quieras que OpenClaw ejecute herramientas en un entorno remoto gestionado por OpenShell. Para ver la guía completa de configuración, la referencia de configuración y la comparación de modos de espacio de trabajo, consulta la [página dedicada a OpenShell](/es/gateway/openshell).

OpenShell reutiliza el mismo transporte SSH central y el puente de sistema de archivos remoto que el backend SSH genérico, y añade un ciclo de vida específico de OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) además del modo de espacio de trabajo opcional `mirror`.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote", // mirror | remote
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
        },
      },
    },
  },
}
```

Modos de OpenShell:

- `mirror` (predeterminado): el espacio de trabajo local se mantiene canónico. OpenClaw sincroniza los archivos locales en OpenShell antes de la ejecución y sincroniza el espacio de trabajo remoto de vuelta después de la ejecución.
- `remote`: el espacio de trabajo de OpenShell es canónico después de que se crea el sandbox. OpenClaw siembra el espacio de trabajo remoto una vez desde el espacio de trabajo local, luego las herramientas de archivos y la ejecución se ejecutan directamente contra el sandbox remoto sin sincronizar los cambios de vuelta.

<AccordionGroup>
  <Accordion title="Detalles del transporte remoto">
    - OpenClaw solicita a OpenShell una configuración SSH específica del sandbox mediante `openshell sandbox ssh-config <name>`.
    - Core escribe esa configuración SSH en un archivo temporal, abre la sesión SSH y reutiliza el mismo puente de sistema de archivos remoto utilizado por `backend: "ssh"`.
    - En el modo `mirror`, solo el ciclo de vida es diferente: sincronizar de local a remoto antes de la ejecución y luego sincronizar de vuelta después de la ejecución.

  </Accordion>
  <Accordion title="Limitaciones actuales de OpenShell">
    - el navegador sandbox aún no es compatible
    - `sandbox.docker.binds` no es compatible en el backend de OpenShell
    - los controles de tiempo de ejecución específicos de Docker bajo `sandbox.docker.*` aún se aplican solo al backend de Docker

  </Accordion>
</AccordionGroup>

#### Modos de espacio de trabajo

OpenShell tiene dos modelos de espacio de trabajo. Esta es la parte más importante en la práctica.

<Tabs>
  <Tab title="mirror (local canonical)">
    Use `plugins.entries.openshell.config.mode: "mirror"` when you want the **espacio de trabajo local se mantenga canónico**.

    Comportamiento:

    - Antes de `exec`, OpenClaw sincroniza el espacio de trabajo local en el sandbox OpenShell.
    - Después de `exec`, OpenClaw sincroniza el espacio de trabajo remoto de vuelta al espacio de trabajo local.
    - Las herramientas de archivo aún operan a través del puente del sandbox, pero el espacio de trabajo local sigue siendo la fuente de verdad entre turnos.

    Use esto cuando:

    - edite archivos localmente fuera de OpenClaw y desea que esos cambios aparezcan en el sandbox automáticamente
    - desee que el sandbox OpenShell se comporte tanto como sea posible como el backend Docker
    - desee que el espacio de trabajo del host refleje las escrituras del sandbox después de cada turno de ejecución

    Compromiso: costo de sincronización adicional antes y después de la ejecución.

  </Tab>
  <Tab title="remote (OpenShell canonical)">
    Use `plugins.entries.openshell.config.mode: "remote"` cuando desee que el **espacio de trabajo OpenShell se convierta en canónico**.

    Comportamiento:

    - Cuando se crea el sandbox por primera vez, OpenClaw siembra el espacio de trabajo remoto desde el espacio de trabajo local una vez.
    - Después de eso, `exec`, `read`, `write`, `edit` y `apply_patch` operan directamente sobre el espacio de trabajo remoto de OpenShell.
    - OpenClaw **no** sincroniza los cambios remotos de vuelta al espacio de trabajo local después de la ejecución.
    - Las lecturas de medios en el momento del prompt aún funcionan porque las herramientas de archivo y medios leen a través del puente del sandbox en lugar de asumir una ruta de host local.
    - El transporte es SSH hacia el sandbox OpenShell devuelto por `openshell sandbox ssh-config`.

    Consecuencias importantes:

    - Si edita archivos en el host fuera de OpenClaw después del paso de siembra, el sandbox remoto **no** verá esos cambios automáticamente.
    - Si se recrea el sandbox, el espacio de trabajo remoto se siembra nuevamente desde el espacio de trabajo local.
    - Con `scope: "agent"` o `scope: "shared"`, ese espacio de trabajo remoto se comparte en ese mismo ámbito.

    Use esto cuando:

    - el sandbox debe vivir principalmente en el lado remoto de OpenShell
    - desee una sobrecarga de sincronización menor por turno
    - no desea que las ediciones locales del host sobrescriban silenciosamente el estado del sandbox remoto

  </Tab>
</Tabs>

Elija `mirror` si considera que el sandbox es un entorno de ejecución temporal. Elija `remote` si considera que el sandbox es el espacio de trabajo real.

#### Ciclo de vida de OpenShell

Los sandbox de OpenShell aún se gestionan a través del ciclo de vida normal del sandbox:

- `openclaw sandbox list` muestra los entornos de ejecución de OpenShell así como los de Docker
- `openclaw sandbox recreate` elimina el entorno de ejecución actual y permite que OpenClaw lo vuelva a crear en el próximo uso
- la lógica de poda también es consciente del backend

Para el modo `remote`, recrear es especialmente importante:

- recrear elimina el espacio de trabajo remoto canónico para ese ámbito
- el próximo uso inicializa un nuevo espacio de trabajo remoto desde el espacio de trabajo local

Para el modo `mirror`, recrear principalmente restablece el entorno de ejecución remoto porque el espacio de trabajo local sigue siendo canónico de todos modos.

## Acceso al espacio de trabajo

`agents.defaults.sandbox.workspaceAccess` controla **lo que el sandbox puede ver**:

<Tabs>
  <Tab title="ninguno (predeterminado)">Las herramientas ven un espacio de trabajo de sandbox en `~/.openclaw/sandboxes`.</Tab>
  <Tab title="ro">Monta el espacio de trabajo del agente como de solo lectura en `/agent` (desactiva `write`/`edit`/`apply_patch`).</Tab>
  <Tab title="rw">Monta el espacio de trabajo del agente como lectura/escritura en `/workspace`.</Tab>
</Tabs>

Con el backend OpenShell:

- el modo `mirror` todavía usa el espacio de trabajo local como la fuente canónica entre turnos de ejecución
- el modo `remote` usa el espacio de trabajo remoto de OpenShell como la fuente canónica después de la inicialización inicial
- `workspaceAccess: "ro"` y `"none"` todavía restringen el comportamiento de escritura de la misma manera

Los medios entrantes se copian en el espacio de trabajo del sandbox activo (`media/inbound/*`).

<Note>**Nota de habilidades:** la herramienta `read` está enraizada en el sandbox. Con `workspaceAccess: "none"`, OpenClaw refleja las habilidades elegibles en el espacio de trabajo del sandbox (`.../skills`) para que puedan ser leídas. Con `"rw"`, las habilidades del espacio de trabajo son legibles desde `/workspace/skills`.</Note>

## Montajes de enlace personalizados

`agents.defaults.sandbox.docker.binds` monta directorios adicionales del host en el contenedor. Formato: `host:container:mode` (por ejemplo, `"/home/user/source:/source:rw"`).

Los enlaces globales y por agente se **combinan** (no se reemplazan). En `scope: "shared"`, se ignoran los enlaces por agente.

`agents.defaults.sandbox.browser.binds` monta directorios adicionales del host solo en el contenedor del **navegador sandbox**.

- Cuando se establece (incluyendo `[]`), reemplaza a `agents.defaults.sandbox.docker.binds` para el contenedor del navegador.
- Cuando se omite, el contenedor del navegador vuelve a `agents.defaults.sandbox.docker.binds` (compatible con versiones anteriores).

Ejemplo (fuente de solo lectura + un directorio de datos adicional):

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    ],
  },
}
```

<Warning>
**Seguridad de Bind (Montajes)**

- Los binds omiten el sistema de archivos del sandbox: exponen rutas del host con el modo que configure (`:ro` o `:rw`).
- OpenClaw bloquea fuentes de bind peligrosas (por ejemplo: `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`, y montajes principales que los expondrían).
- OpenClaw también bloquea raíces de credenciales comunes del directorio de inicio tales como `~/.aws`, `~/.cargo`, `~/.config`, `~/.docker`, `~/.gnupg`, `~/.netrc`, `~/.npm`, y `~/.ssh`.
- La validación de bind no es solo coincidencia de cadenas. OpenClaw normaliza la ruta de origen, luego la resuelve nuevamente a través del ancestro existente más profundo antes de volver a verificar las rutas bloqueadas y las raíces permitidas.
- Eso significa que los escapes de enlace simbólico principal (symlink-parent) seguirán fallando de forma segura (closed) incluso cuando la hoja final aún no existe. Ejemplo: `/workspace/run-link/new-file` aún se resuelve como `/var/run/...` si `run-link` apunta allí.
- Las raíces de origen permitidas se canónican de la misma manera, por lo que una ruta que solo parece estar dentro de la lista blanca antes de la resolución del enlace simbólico sigue siendo rechazada como `outside allowed roots`.
- Los montajes sensibles (secretos, claves SSH, credenciales de servicio) deben ser `:ro` a menos que sean absolutamente necesarios.
- Combínelo con `workspaceAccess: "ro"` si solo necesita acceso de lectura al espacio de trabajo; los modos de bind siguen siendo independientes.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para ver cómo los binds interactúan con la política de herramientas y la ejecución elevada.

</Warning>

## Imágenes y configuración

Imagen de Docker predeterminada: `openclaw-sandbox:bookworm-slim`

<Note>
**Source checkout vs npm install**

Los scripts auxiliares `scripts/sandbox-setup.sh`, `scripts/sandbox-common-setup.sh` y `scripts/sandbox-browser-setup.sh` solo están disponibles al ejecutar desde un [source checkout](https://github.com/openclaw/openclaw). No se incluyen en el paquete npm.

Si instalaste OpenClaw mediante `npm install -g openclaw`, utiliza los comandos `docker build` en línea que se muestran a continuación.

</Note>

<Steps>
  <Step title="Compilar la imagen predeterminada">
    Desde un source checkout:

    ```bash
    scripts/sandbox-setup.sh
    ```

    Desde una instalación npm (no se necesita source checkout):

    ```bash
    docker build -t openclaw-sandbox:bookworm-slim - <<'DOCKERFILE'
    FROM debian:bookworm-slim
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
      && rm -rf /var/lib/apt/lists/*
    RUN useradd --create-home --shell /bin/bash sandbox
    USER sandbox
    WORKDIR /home/sandbox
    CMD ["sleep", "infinity"]
    DOCKERFILE
    ```

    La imagen predeterminada **no** incluye Node. Si una habilidad necesita Node (u otros tiempos de ejecución), prepara una imagen personalizada o instala mediante `sandbox.docker.setupCommand` (requiere salida de red + raíz escribible + usuario root).

    OpenClaw no sustituye silenciosamente `debian:bookworm-slim` simple cuando falta `openclaw-sandbox:bookworm-slim`. Las ejecuciones en sandbox que apuntan a la imagen predeterminada fallan rápidamente con una instrucción de compilación hasta que la compilas, porque la imagen empaquetada lleva `python3` para los auxiliares de escritura/edición del sandbox.

  </Step>
  <Step title="Opcional: compilar la imagen común">
    Para una imagen de sandbox más funcional con herramientas comunes (por ejemplo `curl`, `jq`, `nodejs`, `python3`, `git`):

    Desde un source checkout:

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    Desde una instalación npm, compila primero la imagen predeterminada (ver arriba), luego compila la imagen común encima utilizando el [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) del repositorio.

    Luego establece `agents.defaults.sandbox.docker.image` en `openclaw-sandbox-common:bookworm-slim`.

  </Step>
  <Step title="Opcional: compilar la imagen del navegador sandbox">
    Desde un source checkout:

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    Desde una instalación npm, compila utilizando el [`scripts/docker/sandbox/Dockerfile.browser`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.browser) del repositorio.

  </Step>
</Steps>

De forma predeterminada, los contenedores de sandbox de Docker se ejecutan **sin red**. Anule esto con `agents.defaults.sandbox.docker.network`.

<AccordionGroup>
  <Accordion title="Valores predeterminados de Chromium para el navegador sandbox">
    La imagen del navegador sandbox incluida también aplica valores predeterminados de inicio de Chromium conservadores para cargas de trabajo en contenedores. Los valores predeterminados actuales del contenedor incluyen:

    - `--remote-debugging-address=127.0.0.1`
    - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
    - `--user-data-dir=${HOME}/.chrome`
    - `--no-first-run`
    - `--no-default-browser-check`
    - `--disable-3d-apis`
    - `--disable-gpu`
    - `--disable-dev-shm-usage`
    - `--disable-background-networking`
    - `--disable-extensions`
    - `--disable-features=TranslateUI`
    - `--disable-breakpad`
    - `--disable-crash-reporter`
    - `--disable-software-rasterizer`
    - `--no-zygote`
    - `--metrics-recording-only`
    - `--renderer-process-limit=2`
    - `--no-sandbox` cuando `noSandbox` está habilitado.
    - Los tres indicadores de endurecimiento de gráficos (`--disable-3d-apis`, `--disable-software-rasterizer`, `--disable-gpu`) son opcionales y son útiles cuando los contenedores carecen de soporte de GPU. Establezca `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si su carga de trabajo requiere WebGL u otras funciones 3D/navegador.
    - `--disable-extensions` está habilitado de forma predeterminada y se puede deshabilitar con `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` para flujos que dependen de extensiones.
    - `--renderer-process-limit=2` está controlado por `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, donde `0` mantiene el valor predeterminado de Chromium.

    Si necesita un perfil de tiempo de ejecución diferente, use una imagen de navegador personalizada y proporcione su propio punto de entrada. Para los perfiles de Chromium locales (no en contenedor), use `browser.extraArgs` para agregar indicadores de inicio adicionales.

  </Accordion>
  <Accordion title="Valores predeterminados de seguridad de red">
    - `network: "host"` está bloqueado.
    - `network: "container:<id>"` está bloqueado de forma predeterminada (riesgo de omisión de unión al espacio de nombres).
    - Anulación de emergencia: `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.

  </Accordion>
</AccordionGroup>

Las instalaciones de Docker y el gateway en contenedor se encuentran aquí: [Docker](/es/install/docker)

Para los despliegues del gateway Docker, `scripts/docker/setup.sh` puede iniciar la configuración del sandbox. Establezca `OPENCLAW_SANDBOX=1` (o `true`/`yes`/`on`) para habilitar esa ruta. Puede anular la ubicación del socket con `OPENCLAW_DOCKER_SOCKET`. Configuración completa y referencia de variables de entorno: [Docker](/es/install/docker#agent-sandbox).

## setupCommand (configuración única del contenedor)

`setupCommand` se ejecuta **una vez** después de que se crea el contenedor del sandbox (no en cada ejecución). Se ejecuta dentro del contenedor mediante `sh -lc`.

Rutas:

- Global: `agents.defaults.sandbox.docker.setupCommand`
- Por agente: `agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="Errores comunes">
    - El valor predeterminado de `docker.network` es `"none"` (sin salida), por lo que la instalación de paquetes fallará.
    - `docker.network: "container:<id>"` requiere `dangerouslyAllowContainerNamespaceJoin: true` y es solo para situaciones de emergencia.
    - `readOnlyRoot: true` impide las escrituras; establezca `readOnlyRoot: false` o prepare una imagen personalizada.
    - `user` debe ser root para la instalación de paquetes (omite `user` o establece `user: "0:0"`).
    - La ejecución del sandbox **no** hereda el `process.env` del host. Utilice `agents.defaults.sandbox.docker.env` (o una imagen personalizada) para las claves API de habilidades.

  </Accordion>
</AccordionGroup>

## Política de herramientas y salidas de emergencia

Las políticas de permiso/denegación de herramientas todavía se aplican antes que las reglas del sandbox. Si una herramienta se deniega globalmente o por agente, el sandbox no la restaura.

`tools.elevated` es un escape explícito que ejecuta `exec` fuera del entorno aislado (`gateway` de forma predeterminada, o `node` cuando el destino de ejecución es `node`). Las directivas `/exec` solo se aplican a remitentes autorizados y persisten por sesión; para deshabilitar permanentemente `exec`, utilice la denegación de política de herramientas (consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated)).

Depuración:

- Use `openclaw sandbox explain` para inspeccionar el modo de sandbox efectivo, la política de herramientas y las claves de configuración de corrección.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para obtener el modelo mental de "¿por qué está bloqueado esto?".

Manténgalo protegido.

## Invalidaciones de multiagente

Cada agente puede anular el sandbox + herramientas: `agents.list[].sandbox` y `agents.list[].tools` (además de `agents.list[].tools.sandbox.tools` para la política de herramientas del sandbox). Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para conocer la precedencia.

## Ejemplo de habilitación mínima

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## Relacionado

- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) — invalidaciones por agente y precedencia
- [OpenShell](/es/gateway/openshell) — configuración administrada del backend del sandbox, modos de espacio de trabajo y referencia de configuración
- [Configuración del sandbox](/es/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) — depuración de "¿por qué está bloqueado esto?"
- [Seguridad](/es/gateway/security)
