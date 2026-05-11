---
summary: "Cómo funciona el sandboxing de OpenClaw: modos, ámbitos, acceso al espacio de trabajo e imágenes"
title: "Aislamiento (Sandboxing)"
sidebarTitle: "Aislamiento (Sandboxing)"
read_when: "Deseas una explicación dedicada sobre el aislamiento (sandboxing) o necesitas ajustar agents.defaults.sandbox."
status: activo
---

OpenClaw puede ejecutar **herramientas dentro de backends de aislamiento** para reducir el radio de explosión. Esto es **opcional** y se controla mediante configuración (`agents.defaults.sandbox` o `agents.list[].sandbox`). Si el aislamiento está desactivado, las herramientas se ejecutan en el host. La Gateway se mantiene en el host; la ejecución de herramientas se ejecuta en un aislamiento aislado cuando está habilitada.

<Note>Esto no es un límite de seguridad perfecto, pero limita materialmente el acceso al sistema de archivos y a los procesos cuando el modelo hace algo tonto.</Note>

## Qué se pone en sandbox

- Ejecución de herramientas (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navegador aislado opcional (`agents.defaults.sandbox.browser`).

<AccordionGroup>
  <Accordion title="Detalles del navegador aislado">
    - De manera predeterminada, el navegador aislado se inicia automáticamente (asegura que CDP sea accesible) cuando la herramienta del navegador lo necesita. Configúrelo mediante `agents.defaults.sandbox.browser.autoStart` y `agents.defaults.sandbox.browser.autoStartTimeoutMs`. - De manera predeterminada, los contenedores del navegador aislado utilizan una red dedicada de Docker
    (`openclaw-sandbox-browser`) en lugar de la red global `bridge`. Configúrelo con `agents.defaults.sandbox.browser.network`. - El `agents.defaults.sandbox.browser.cdpSourceRange` opcional restringe el ingreso de CDP en el borde del contenedor con una lista de permitidos CIDR (por ejemplo `172.21.0.1/32`). - El acceso de observador noVNC está protegido con contraseña de manera predeterminada;
    OpenClaw emite una URL de token de corta duración que sirve una página de arranque local y abre noVNC con la contraseña en el fragmento de la URL (no en registros de consulta/encabezado). - `agents.defaults.sandbox.browser.allowHostControl` permite que las sesiones aisladas apunten explícitamente al navegador del host. - Las listas de permitidos opcionales controlan `target: "custom"`:
    `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.
  </Accordion>
</AccordionGroup>

No aislado:

- El propio proceso de la Gateway.
- Cualquier herramienta explícitamente permitida para ejecutarse fuera del sandbox (p. ej. `tools.elevated`).
  - **La ejecución elevada omite el sandboxing y utiliza la ruta de escape configurada (`gateway` de forma predeterminada, o `node` cuando el objetivo de ejecución es `node`).**
  - Si el sandboxing está desactivado, `tools.elevated` no cambia la ejecución (ya está en el host). Consulte [Modo elevado](/es/tools/elevated).

## Modos

`agents.defaults.sandbox.mode` controla **cuándo** se utiliza el sandboxing:

<Tabs>
  <Tab title="off">
    Sin sandboxing.
  </Tab>
  <Tab title="non-main">
    Sandbox solo para sesiones **no principales** (predeterminado si desea chats normales en el host).

    `"non-main"` se basa en `session.mainKey` (predeterminado `"main"`), no en el id del agente. Las sesiones de grupo/canal usan sus propias claves, por lo que cuentan como no principales y se ejecutarán en el sandbox.

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

- `"docker"` (predeterminado cuando el sandboxing está habilitado): tiempo de ejecución de sandbox local respaldado por Docker.
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

El sandboxing está desactivado por defecto. Si habilita el sandboxing y no elige un backend, OpenClaw utiliza el backend de Docker. Ejecuta herramientas y navegadores sandbox localmente a través del socket del demonio de Docker (`/var/run/docker.sock`). El aislamiento del contenedor sandbox está determinado por los espacios de nombres (namespaces) de Docker.

<Warning>
**Restricciones de Docker-out-of-Docker (DooD)**

Si implementa el Gateway de OpenClaw en sí mismo como un contenedor de Docker, orquesta contenedores sandbox hermanos utilizando el socket de Docker del host (DooD). Esto introduce una restricción específica de mapeo de rutas:

- **La configuración requiere rutas del host**: La configuración `openclaw.json` `workspace` DEBE contener la **ruta absoluta del host** (p. ej., `/home/user/.openclaw/workspaces`), no la ruta interna del contenedor del Gateway. Cuando OpenClaw solicita al demonio de Docker que inicie un sandbox, el demonio evalúa las rutas en relación con el espacio de nombres del sistema operativo del host, no con el espacio de nombres del Gateway.
- **Paridad del puente FS (mapa de volumen idéntico)**: El proceso nativo del Gateway de OpenClaw también escribe archivos de latido y puente en el directorio `workspace`. Dado que el Gateway evalúa exactamente la misma cadena (la ruta del host) desde su propio entorno contenedorizado, la implementación del Gateway DEBE incluir un mapa de volumen idéntico que vincule el espacio de nombres del host de forma nativa (`-v /home/user/.openclaw:/home/user/.openclaw`).

Si asigna rutas internamente sin paridad absoluta con el host, OpenClaw lanza de forma nativa un error de permisos `EACCES` al intentar escribir su latido dentro del entorno del contenedor porque la cadena de ruta completa calificada no existe de forma nativa.

</Warning>

### Backend SSH

Use `backend: "ssh"` cuando quiera que OpenClaw ponga en sandbox `exec`, herramientas de archivos y lecturas de medios en una máquina accesible por SSH arbitraria.

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
    - En el primer uso después de crear o recrear, OpenClaw siembra ese espacio de trabajo remoto desde el espacio de trabajo local una sola vez.
    - Después de eso, `exec`, `read`, `write`, `edit`, `apply_patch`, las lecturas de medios de prompt y la preparación de medios entrantes se ejecutan directamente contra el espacio de trabajo remoto a través de SSH.
    - OpenClaw no sincroniza los cambios remotos de vuelta al espacio de trabajo local automáticamente.
  </Accordion>
  <Accordion title="Material de autenticación">
    - `identityFile`, `certificateFile`, `knownHostsFile`: usa archivos locales existentes y los pasa a través de la configuración de OpenSSH.
    - `identityData`, `certificateData`, `knownHostsData`: usa cadenas en línea o SecretRefs. OpenClaw las resuelve a través de la instantánea de ejecución normal de secretos, las escribe en archivos temporales con `0600` y los elimina cuando finaliza la sesión SSH.
    - Si tanto `*File` como `*Data` están establecidos para el mismo elemento, `*Data` tiene prioridad para esa sesión SSH.
  </Accordion>
  <Accordion title="Consecuencias canónicas remotas">
    Este es un modelo **canónico remoto**. El espacio de trabajo SSH remoto se convierte en el estado real del sandbox después de la siembra inicial.

    - Las ediciones locales en el host realizadas fuera de OpenClaw después del paso de siembra no son visibles de forma remota hasta que se vuelva a crear el sandbox.
    - `openclaw sandbox recreate` elimina la raíz remota por ámbito y siembra nuevamente desde lo local en el próximo uso.
    - El sandboxing del navegador no es compatible con el backend SSH.
    - La configuración de `sandbox.docker.*` no se aplica al backend SSH.

  </Accordion>
</AccordionGroup>

### Backend OpenShell

Usa `backend: "openshell"` cuando quieras que OpenClaw ejecute herramientas en un entorno remoto administrado por OpenShell. Para ver la guía completa de configuración, la referencia de configuración y la comparación de modos de espacio de trabajo, consulta la [página de OpenShell](/es/gateway/openshell) dedicada.

OpenShell reutiliza el mismo transporte SSH central y el puente de sistema de archivos remoto que el backend SSH genérico, y añade el ciclo de vida específico de OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) además del modo de espacio de trabajo opcional `mirror`.

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

- `mirror` (predeterminado): el espacio de trabajo local se mantiene como canónico. OpenClaw sincroniza los archivos locales en OpenShell antes de la ejecución y sincroniza el espacio de trabajo remoto de nuevo después de la ejecución.
- `remote`: el espacio de trabajo de OpenShell es canónico después de que se crea el sandbox. OpenClaw siembra el espacio de trabajo remoto una vez desde el espacio de trabajo local, luego las herramientas de archivos y la ejecución se ejecutan directamente contra el sandbox remoto sin sincronizar los cambios de vuelta.

<AccordionGroup>
  <Accordion title="Detalles del transporte remoto">
    - OpenClaw solicita a OpenShell la configuración SSH específica del sandbox a través de `openshell sandbox ssh-config <name>`.
    - Core escribe esa configuración SSH en un archivo temporal, abre la sesión SSH y reutiliza el mismo puente de sistema de archivos remoto utilizado por `backend: "ssh"`.
    - En el modo `mirror`, solo el ciclo de vida difiere: sincronizar de local a remoto antes de la ejecución y luego sincronizar de vuelta después de la ejecución.
  </Accordion>
  <Accordion title="Limitaciones actuales de OpenShell">
    - el navegador de sandbox aún no es compatible
    - `sandbox.docker.binds` no es compatible en el backend de OpenShell
    - los controles de tiempo de ejecución específicos de Docker bajo `sandbox.docker.*` todavía se aplican solo al backend de Docker
  </Accordion>
</AccordionGroup>

#### Modos de espacio de trabajo

OpenShell tiene dos modelos de espacio de trabajo. Esta es la parte más importante en la práctica.

<Tabs>
  <Tab title="espejo (local canónico)">
    Use `plugins.entries.openshell.config.mode: "mirror"` cuando desee que el **espacio de trabajo local siga siendo canónico**.

    Comportamiento:

    - Antes de `exec`, OpenClaw sincroniza el espacio de trabajo local en el sandbox de OpenShell.
    - Después de `exec`, OpenClaw sincroniza el espacio de trabajo remoto de vuelta al espacio de trabajo local.
    - Las herramientas de archivos siguen operando a través del puente del sandbox, pero el espacio de trabajo local sigue siendo la fuente de verdad entre turnos.

    Use esto cuando:

    - edite archivos localmente fuera de OpenClaw y desea que esos cambios aparezcan en el sandbox automáticamente
    - desea que el sandbox de OpenShell se comporte tanto como sea posible como el backend de Docker
    - desea que el espacio de trabajo del host refleje las escrituras del sandbox después de cada turno de ejecución

    Compromiso: costo de sincronización adicional antes y después de la ejecución.

  </Tab>
  <Tab title="remoto (OpenShell canónico)">
    Use `plugins.entries.openshell.config.mode: "remote"` cuando desee que el **espacio de trabajo de OpenShell se convierta en canónico**.

    Comportamiento:

    - Cuando se crea el sandbox por primera vez, OpenClaw siembra el espacio de trabajo remoto desde el espacio de trabajo local una sola vez.
    - Después de eso, `exec`, `read`, `write`, `edit` y `apply_patch` operan directamente contra el espacio de trabajo remoto de OpenShell.
    - OpenClaw **no** sincroniza los cambios remotos de vuelta al espacio de trabajo local después de la ejecución.
    - Las lecturas de medios en el momento del prompt todavía funcionan porque las herramientas de archivos y medios leen a través del puente del sandbox en lugar de asumir una ruta de host local.
    - El transporte es SSH hacia el sandbox de OpenShell devuelto por `openshell sandbox ssh-config`.

    Consecuencias importantes:

    - Si edita archivos en el host fuera de OpenClaw después del paso de inicialización, el sandbox remoto **no** verá esos cambios automáticamente.
    - Si se vuelve a crear el sandbox, el espacio de trabajo remoto se vuelve a sembrar desde el espacio de trabajo local.
    - Con `scope: "agent"` o `scope: "shared"`, ese espacio de trabajo remoto se comparte en ese mismo ámbito.

    Use esto cuando:

    - el sandbox debe vivir principalmente en el lado remoto de OpenShell
    - desea una sobrecarga de sincronización menor por turno
    - no desea que las ediciones locales del host sobrescriban silenciosamente el estado del sandbox remoto

  </Tab>
</Tabs>

Elija `mirror` si considera el sandbox como un entorno de ejecución temporal. Elija `remote` si considera el sandbox como el espacio de trabajo real.

#### Ciclo de vida de OpenShell

Los sandboxes de OpenShell aún se gestionan a través del ciclo de vida normal del sandbox:

- `openclaw sandbox list` muestra los tiempos de ejecución de OpenShell así como los tiempos de ejecución de Docker
- `openclaw sandbox recreate` elimina el tiempo de ejecución actual y permite que OpenClaw lo vuelva a crear en el próximo uso
- la lógica de poda también es consciente del backend

Para el modo `remote`, volver a crear es especialmente importante:

- volver a crear elimina el espacio de trabajo remoto canónico para ese alcance
- el próximo uso inicia un nuevo espacio de trabajo remoto desde el espacio de trabajo local

Para el modo `mirror`, volver a crear restablece principalmente el entorno de ejecución remoto porque el espacio de trabajo local sigue siendo canónico de todos modos.

## Acceso al espacio de trabajo

`agents.defaults.sandbox.workspaceAccess` controla **lo que el sandbox puede ver**:

<Tabs>
  <Tab title="none (predeterminado)">Las herramientas ven un espacio de trabajo de sandbox en `~/.openclaw/sandboxes`.</Tab>
  <Tab title="ro">Monta el espacio de trabajo del agente como solo lectura en `/agent` (deshabilita `write`/`edit`/`apply_patch`).</Tab>
  <Tab title="rw">Monta el espacio de trabajo del agente como lectura/escritura en `/workspace`.</Tab>
</Tabs>

Con el backend de OpenShell:

- el modo `mirror` todavía usa el espacio de trabajo local como la fuente canónica entre turnos de ejecución
- el modo `remote` usa el espacio de trabajo remoto de OpenShell como la fuente canónica después de la inicialización
- `workspaceAccess: "ro"` y `"none"` todavía restringen el comportamiento de escritura de la misma manera

Los elementos entrantes se copian en el espacio de trabajo del sandbox activo (`media/inbound/*`).

<Note>**Nota de habilidades:** la herramienta `read` está arraigada en el sandbox (sandbox-rooted). Con `workspaceAccess: "none"`, OpenClaw refleja las habilidades elegibles en el espacio de trabajo del sandbox (`.../skills`) para que puedan ser leídas. Con `"rw"`, las habilidades del espacio de trabajo son legibles desde `/workspace/skills`.</Note>

## Montajes de enlace personalizados

`agents.defaults.sandbox.docker.binds` monta directorios adicionales del host en el contenedor. Formato: `host:container:mode` (por ejemplo, `"/home/user/source:/source:rw"`).

Los enlaces globales y por agente se **combinan** (no se reemplazan). Bajo `scope: "shared"`, se ignoran los enlaces por agente.

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
**Seguridad de los enlaces (binds)**

- Los enlaces omiten el sistema de archivos del sandbox: exponen rutas del host con el modo que se establezca (`:ro` o `:rw`).
- OpenClaw bloquea fuentes de enlace peligrosas (por ejemplo: `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev` y montajes principales que los expondrían).
- OpenClaw también bloquea raíces comunes de credenciales del directorio de inicio como `~/.aws`, `~/.cargo`, `~/.config`, `~/.docker`, `~/.gnupg`, `~/.netrc`, `~/.npm` y `~/.ssh`.
- La validación de enlaces no es solo coincidencia de cadenas. OpenClaw normaliza la ruta de origen y luego la resuelve de nuevo a través del ancestro existente más profundo antes de volver a verificar las rutas bloqueadas y las raíces permitidas.
- Eso significa que las escapes por enlace simbólico del padre fallarán (cerrándose) incluso cuando la hoja final aún no existe. Ejemplo: `/workspace/run-link/new-file` todavía se resuelve como `/var/run/...` si `run-link` apunta allí.
- Las raíces de origen permitidas se canonicalizan de la misma manera, por lo que una ruta que solo se ve dentro de la lista de permitidos antes de la resolución del enlace simbólico aún se rechaza como `outside allowed roots`.
- Los montajes sensibles (secretos, claves SSH, credenciales de servicio) deben ser `:ro` a menos que sea absolutamente necesario.
- Combínelo con `workspaceAccess: "ro"` si solo necesita acceso de lectura al espacio de trabajo; los modos de enlace se mantienen independientes.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para ver cómo los enlaces interactúan con la política de herramientas y la ejecución elevada.
  </Warning>

## Imágenes y configuración

Imagen de Docker predeterminada: `openclaw-sandbox:bookworm-slim`

<Steps>
  <Step title="Compile la imagen predeterminada">
    ```bash
    scripts/sandbox-setup.sh
    ```

    La imagen predeterminada **no** incluye Node. Si una habilidad necesita Node (u otros tiempos de ejecución), prepare una imagen personalizada o instálela a través de `sandbox.docker.setupCommand` (requiere salida de red + raíz escribible + usuario root).

  </Step>
  <Step title="Opcional: compilar la imagen común">
    Para una imagen de sandbox más funcional con herramientas comunes (por ejemplo `curl`, `jq`, `nodejs`, `python3`, `git`):

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    Luego, establece `agents.defaults.sandbox.docker.image` en `openclaw-sandbox-common:bookworm-slim`.

  </Step>
  <Step title="Opcional: compilar la imagen del navegador sandbox">
    ```bash
    scripts/sandbox-browser-setup.sh
    ```
  </Step>
</Steps>

De forma predeterminada, los contenedores de sandbox de Docker se ejecutan **sin red**. Anula esto con `agents.defaults.sandbox.docker.network`.

<AccordionGroup>
  <Accordion title="Valores predeterminados de Chromium en el navegador sandbox">
    La imagen del navegador sandbox incluida también aplica valores predeterminados de inicio de Chromium conservadores para las cargas de trabajo en contenedores. Los valores predeterminados actuales del contenedor incluyen:

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
    - Los tres indicadores de endurecimiento de gráficos (`--disable-3d-apis`, `--disable-software-rasterizer`, `--disable-gpu`) son opcionales y son útiles cuando los contenedores carecen de compatibilidad con GPU. Establezca `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si su carga de trabajo requiere WebGL u otras funciones 3D/del navegador.
    - `--disable-extensions` está habilitado de forma predeterminada y se puede deshabilitar con `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` para flujos que dependen de extensiones.
    - `--renderer-process-limit=2` está controlado por `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, donde `0` mantiene el valor predeterminado de Chromium.

    Si necesita un perfil de tiempo de ejecución diferente, utilice una imagen de navegador personalizada y proporcione su propio punto de entrada. Para los perfiles de Chromium locales (no en contenedor), use `browser.extraArgs` para agregar indicadores de inicio adicionales.

  </Accordion>
  <Accordion title="Valores predeterminados de seguridad de red">
    - `network: "host"` está bloqueado.
    - `network: "container:<id>"` está bloqueado de forma predeterminada (riesgo de omisión de unión de espacios de nombres).
    - Anulación de emergencia: `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.
  </Accordion>
</AccordionGroup>

Las instalaciones de Docker y la puerta de enlace en contenedor residen aquí: [Docker](/es/install/docker)

Para las implementaciones de la puerta de enlace Docker, `scripts/docker/setup.sh` puede iniciar la configuración del sandbox. Establezca `OPENCLAW_SANDBOX=1` (o `true`/`yes`/`on`) para habilitar esa ruta. Puede anular la ubicación del socket con `OPENCLAW_DOCKER_SOCKET`. Configuración completa y referencia de variables de entorno: [Docker](/es/install/docker#agent-sandbox).

## setupCommand (configuración única del contenedor)

`setupCommand` se ejecuta **una vez** después de que se crea el contenedor del sandbox (no en cada ejecución). Se ejecuta dentro del contenedor a través de `sh -lc`.

Rutas:

- Global: `agents.defaults.sandbox.docker.setupCommand`
- Por agente: `agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="Errores comunes">
    - El `docker.network` predeterminado es `"none"` (sin salida), por lo que la instalación de paquetes fallará.
    - `docker.network: "container:<id>"` requiere `dangerouslyAllowContainerNamespaceJoin: true` y es solo para emergencias.
    - `readOnlyRoot: true` previene las escrituras; establezca `readOnlyRoot: false` o cree una imagen personalizada.
    - `user` debe ser root para la instalación de paquetes (omite `user` o establece `user: "0:0"`).
    - La ejecución del sandbox **no** hereda el `process.env` del host. Usa `agents.defaults.sandbox.docker.env` (o una imagen personalizada) para las claves API de habilidades.
  </Accordion>
</AccordionGroup>

## Política de herramientas y mecanismos de escape

Las políticas de permitir/denegar herramientas aún se aplican antes que las reglas del sandbox. Si una herramienta está denegada globalmente o por agente, el sandbox no la restaura.

`tools.elevated` es un mecanismo de escape explícito que ejecuta `exec` fuera del sandbox (`gateway` de forma predeterminada, o `node` cuando el objetivo de ejecución es `node`). Las directivas `/exec` solo se aplican para remitentes autorizados y persisten por sesión; para deshabilitar totalmente `exec`, utilice la denegación de política de herramientas (consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated)).

Depuración:

- Use `openclaw sandbox explain` para inspeccionar el modo de sandbox efectivo, la política de herramientas y las claves de configuración de reparación.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para el modelo mental de "¿por qué está bloqueado esto?".

Manténgalo bloqueado.

## Anulaciones multiagente

Cada agente puede anular el sandbox y las herramientas: `agents.list[].sandbox` y `agents.list[].tools` (más `agents.list[].tools.sandbox.tools` para la política de herramientas del sandbox). Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para conocer la precedencia.

## Ejemplo de activación mínima

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

- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) — anulaciones por agente y precedencia
- [OpenShell](/es/gateway/openshell) — configuración del backend de sandbox administrado, modos de espacio de trabajo y referencia de configuración
- [Sandbox configuration](/es/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) — depuración de "¿por qué está bloqueado esto?"
- [Security](/es/gateway/security)
