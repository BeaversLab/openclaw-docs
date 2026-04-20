---
summary: "Cómo funciona el sandboxing de OpenClaw: modos, ámbitos, acceso al espacio de trabajo e imágenes"
title: Sandboxing
read_when: "Desea una explicación dedicada del sandboxing o necesita ajustar agents.defaults.sandbox."
status: active
---

# Sandboxing

OpenClaw puede ejecutar **herramientas dentro de backends de sandbox** para reducir el radio de explosión.
Esto es **opcional** y se controla mediante configuración (`agents.defaults.sandbox` o
`agents.list[].sandbox`). Si el sandboxing está desactivado, las herramientas se ejecutan en el host.
La Gateway se mantiene en el host; la ejecución de herramientas se ejecuta en un sandbox aislado
cuando está habilitado.

Esta no es un límite de seguridad perfecto, pero limita materialmente el acceso al sistema de archivos
y a los procesos cuando el modelo hace algo estúpido.

## Qué se pone en sandbox

- Ejecución de herramientas (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navegador en sandbox opcional (`agents.defaults.sandbox.browser`).
  - De forma predeterminada, el navegador en sandbox se inicia automáticamente (asegura que CDP sea accesible) cuando la herramienta del navegador lo necesita.
    Configure mediante `agents.defaults.sandbox.browser.autoStart` y `agents.defaults.sandbox.browser.autoStartTimeoutMs`.
  - De forma predeterminada, los contenedores del navegador en sandbox utilizan una red dedicada de Docker (`openclaw-sandbox-browser`) en lugar de la red global `bridge`.
    Configure con `agents.defaults.sandbox.browser.network`.
  - Opcional `agents.defaults.sandbox.browser.cdpSourceRange` restringe el ingreso CDP del borde del contenedor con una lista de permitidos CIDR (por ejemplo `172.21.0.1/32`).
  - El acceso del observador noVNC está protegido con contraseña de forma predeterminada; OpenClaw emite una URL de token de corta duración que sirve una página de arranque local y abre noVNC con la contraseña en el fragmento de la URL (no en registros de consulta/encabezados).
  - `agents.defaults.sandbox.browser.allowHostControl` permite que las sesiones en sandbox apunten explícitamente al navegador del host.
  - Listas de permitidos opcionales controlan `target: "custom"`: `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

No está en sandbox:

- El proceso del Gateway en sí.
- Cualquier herramienta explícitamente permitida para ejecutarse fuera del sandbox (p. ej., `tools.elevated`).
  - **La ejecución elevada omite el sandbox y utiliza la ruta de escape configurada (`gateway` de forma predeterminada, o `node` cuando el objetivo de ejecución es `node`).**
  - Si el sandboxing está desactivado, `tools.elevated` no cambia la ejecución (ya está en el host). Consulte [Modo Elevado](/es/tools/elevated).

## Modos

`agents.defaults.sandbox.mode` controla **cuándo** se utiliza el sandbox:

- `"off"`: sin sandbox.
- `"non-main"`: solo sesiones **no principales** en el sandbox (predeterminado si desea chats normales en el host).
- `"all"`: cada sesión se ejecuta en un sandbox.
  Nota: `"non-main"` se basa en `session.mainKey` (predeterminado `"main"`), no en el id. del agente.
  Las sesiones de grupo/canal usan sus propias claves, por lo que cuentan como no principales y se sandboxearán.

## Alcance

`agents.defaults.sandbox.scope` controla **cuántos contenedores** se crean:

- `"agent"` (predeterminado): un contenedor por agente.
- `"session"`: un contenedor por sesión.
- `"shared"`: un contenedor compartido por todas las sesiones con sandbox.

## Backend

`agents.defaults.sandbox.backend` controla **qué tiempo de ejecución** proporciona el sandbox:

- `"docker"` (predeterminado): tiempo de ejecución de sandbox local respaldado por Docker.
- `"ssh"`: tiempo de ejecución de sandbox remoto genérico respaldado por SSH.
- `"openshell"`: tiempo de ejecución de sandbox respaldado por OpenShell.

La configuración específica de SSH reside en `agents.defaults.sandbox.ssh`.
La configuración específica de OpenShell reside en `plugins.entries.openshell.config`.

### Elegir un backend

|                                      | Docker                                     | SSH                               | OpenShell                                                              |
| ------------------------------------ | ------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------- |
| **Dónde se ejecuta**                 | Contenedor local                           | Cualquier host accesible por SSH  | Sandbox administrado por OpenShell                                     |
| **Configuración**                    | `scripts/sandbox-setup.sh`                 | Clave SSH + host de destino       | Complemento OpenShell habilitado                                       |
| **Modelo de espacio de trabajo**     | Bind-mount o copia                         | Remoto canónico (sembrar una vez) | `mirror` o `remote`                                                    |
| **Control de red**                   | `docker.network` (predeterminado: ninguno) | Depende del host remoto           | Depende de OpenShell                                                   |
| **Sandbox del navegador**            | Compatible                                 | No compatible                     | Aún no compatible                                                      |
| **Montajes de enlace (bind mounts)** | `docker.binds`                             | N/A                               | N/A                                                                    |
| **Mejor para**                       | Desarrollo local, aislamiento total        | Descarga a una máquina remota     | Sandbox remotos administrados con sincronización bidirecional opcional |

### Backend de Docker

El backend de Docker es el tiempo de ejecución predeterminado, ejecutando herramientas y navegadores sandbox localmente a través del socket del demonio de Docker (`/var/run/docker.sock`). El aislamiento del contenedor sandbox está determinado por los espacios de nombres (namespaces) de Docker.

**Restricciones de Docker-out-of-Docker (DooD)**:
Si implementa el Gateway de OpenClaw en sí mismo como un contenedor de Docker, orquesta contenedores sandbox hermanos utilizando el socket de Docker del host (DooD). Esto introduce una restricción específica de mapeo de rutas:

- **La configuración requiere rutas del host**: La configuración `openclaw.json` `workspace` DEBE contener la **ruta absoluta del host** (por ejemplo, `/home/user/.openclaw/workspaces`), no la ruta interna del contenedor del Gateway. Cuando OpenClaw solicita al demonio de Docker que genere un sandbox, el demonio evalúa las rutas en relación con el espacio de nombres del sistema operativo del host, no el del Gateway.
- **Paridad del puente FS (Mapa de volumen idéntico)**: El proceso nativo del Gateway de OpenClaw también escribe archivos de puente y de latido (heartbeat) en el directorio `workspace`. Dado que el Gateway evalúa exactamente la misma cadena (la ruta del host) desde dentro de su propio entorno contenido, la implementación del Gateway DEBE incluir un mapa de volumen idéntico que vincule el espacio de nombres del host de forma nativa (`-v /home/user/.openclaw:/home/user/.openclaw`).

Si asigna rutas internamente sin paridad absoluta con el host, OpenClaw genera de forma nativa un error de permisos `EACCES` al intentar escribir su latido dentro del entorno del contenedor porque la cadena de ruta completa calificada no existe de forma nativa.

### Backend SSH

Use `backend: "ssh"` cuando desee que OpenClaw aplique sandboxing a `exec`, herramientas de archivo y lecturas de medios en
una máquina accesible por SSH arbitraria.

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

Cómo funciona:

- OpenClaw crea una raíz remota por ámbito bajo `sandbox.ssh.workspaceRoot`.
- En el primer uso después de crear o recrear, OpenClaw propaga ese espacio de trabajo remoto desde el espacio de trabajo local una vez.
- Después de eso, `exec`, `read`, `write`, `edit`, `apply_patch`, las lecturas de medios de prompt y la preparación de medios entrantes se ejecutan directamente contra el espacio de trabajo remoto a través de SSH.
- OpenClaw no sincroniza los cambios remotos de vuelta al espacio de trabajo local automáticamente.

Material de autenticación:

- `identityFile`, `certificateFile`, `knownHostsFile`: use archivos locales existentes y páselos a través de la configuración de OpenSSH.
- `identityData`, `certificateData`, `knownHostsData`: use cadenas en línea o SecretRefs. OpenClaw las resuelve a través de la instantánea de tiempo de ejecución de secretos normal, las escribe en archivos temporales con `0600` y las elimina cuando finaliza la sesión SSH.
- Si se establecen tanto `*File` como `*Data` para el mismo elemento, `*Data` tiene prioridad para esa sesión SSH.

Este es un modelo **remoto-canónico**. El espacio de trabajo SSH remoto se convierte en el estado real del sandbox después de la semilla inicial.

Consecuencias importantes:

- Las ediciones locales en el host realizadas fuera de OpenClaw después del paso de semilla no son visibles de forma remota hasta que vuelva a crear el sandbox.
- `openclaw sandbox recreate` elimina la raíz remota por alcance y vuelve a sembrar desde lo local en el próximo uso.
- El sandboxing del navegador no es compatible con el backend SSH.
- La configuración de `sandbox.docker.*` no se aplica al backend SSH.

### Backend OpenShell

Use `backend: "openshell"` cuando quiera que OpenClaw aísle las herramientas en un
entorno remoto administrado por OpenShell. Para la guía de configuración completa,
la referencia de configuración y la comparación de modos de espacio de trabajo,
consulte la [página dedicada a OpenShell](/es/gateway/openshell).

OpenShell reutiliza el mismo transporte SSH central y puente de sistema de archivos
remoto que el backend SSH genérico, y agrega un ciclo de vida específico de
OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) más el modo de
espacio de trabajo opcional `mirror`.

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

Modos OpenShell:

- `mirror` (predeterminado): el espacio de trabajo local permanece canónico. OpenClaw sincroniza los archivos locales en OpenShell antes de la ejecución y sincroniza el espacio de trabajo remoto de nuevo después de la ejecución.
- `remote`: el espacio de trabajo de OpenShell es canónico después de crear el entorno limitado. OpenClaw inicializa el espacio de trabajo remoto una vez desde el espacio de trabajo local, y luego las herramientas de archivos y la ejecución se realizan directamente contra el entorno limitado remoto sin sincronizar los cambios de vuelta.

Detalles del transporte remoto:

- OpenClaw solicita a OpenShell la configuración de SSH específica del entorno limitado a través de `openshell sandbox ssh-config <name>`.
- Core escribe esa configuración de SSH en un archivo temporal, abre la sesión SSH y reutiliza el mismo puente de sistema de archivos remoto usado por `backend: "ssh"`.
- En el modo `mirror` solo difiere el ciclo de vida: sincronizar de local a remoto antes de la ejecución y luego sincronizar de vuelta después de la ejecución.

Limitaciones actuales de OpenShell:

- el navegador de entorno limitado aún no es compatible
- `sandbox.docker.binds` no es compatible con el backend de OpenShell
- los controles de tiempo de ejecución específicos de Docker bajo `sandbox.docker.*` todavía se aplican solo al backend de Docker

#### Modos de espacio de trabajo

OpenShell tiene dos modelos de espacio de trabajo. Esta es la parte que más importa en la práctica.

##### `mirror`

Use `plugins.entries.openshell.config.mode: "mirror"` cuando desee que el **espacio de trabajo local permanezca canónico**.

Comportamiento:

- Antes de `exec`, OpenClaw sincroniza el espacio de trabajo local en el entorno limitado de OpenShell.
- Después de `exec`, OpenClaw sincroniza el espacio de trabajo remoto de vuelta al espacio de trabajo local.
- Las herramientas de archivos todavía operan a través del puente del entorno limitado, pero el espacio de trabajo local sigue siendo la fuente de verdad entre turnos.

Use esto cuando:

- edite archivos localmente fuera de OpenClaw y desea que esos cambios aparezcan automáticamente en el entorno limitado
- desea que el entorno limitado de OpenShell se comporte tanto como sea posible como el backend de Docker
- desea que el espacio de trabajo del host refleje las escrituras del entorno limitado después de cada turno de ejecución

Compromiso:

- costo de sincronización adicional antes y después de la ejecución

##### `remote`

Use `plugins.entries.openshell.config.mode: "remote"` cuando desee que el **espacio de trabajo de OpenShell se convierta en canónico**.

Comportamiento:

- Cuando se crea el entorno limitado por primera vez, OpenClaw inicializa el espacio de trabajo remoto desde el espacio de trabajo local una sola vez.
- Después de eso, `exec`, `read`, `write`, `edit` y `apply_patch` operan directamente contra el espacio de trabajo remoto de OpenShell.
- OpenClaw **no** sincroniza los cambios remotos de vuelta al espacio de trabajo local después de la ejecución.
- Las lecturas de medios en el momento del prompt todavía funcionan porque las herramientas de archivos y medios leen a través del puente del espacio aislado (sandbox) en lugar de asumir una ruta de host local.
- El transporte es SSH hacia el sandbox de OpenShell devuelto por `openshell sandbox ssh-config`.

Consecuencias importantes:

- Si editas archivos en el host fuera de OpenClaw después del paso de siembra (seed), el sandbox remoto **no** verá esos cambios automáticamente.
- Si se vuelve a crear el sandbox, el espacio de trabajo remoto se vuelve a sembrar desde el espacio de trabajo local.
- Con `scope: "agent"` o `scope: "shared"`, ese espacio de trabajo remoto se comparte en ese mismo ámbito.

Usa esto cuando:

- el sandbox debe vivir principalmente en el lado remoto de OpenShell
- quieres una sobrecarga de sincronización menor por turno
- no quieres que las ediciones locales en el host sobrescriban silenciosamente el estado del sandbox remoto

Elige `mirror` si piensas en el sandbox como un entorno de ejecución temporal.
Elige `remote` si piensas en el sandbox como el espacio de trabajo real.

#### Ciclo de vida de OpenShell

Los sandboxes de OpenShell aún se gestionan a través del ciclo de vida normal del sandbox:

- `openclaw sandbox list` muestra los tiempos de ejecución de OpenShell así como los tiempos de ejecución de Docker
- `openclaw sandbox recreate` elimina el tiempo de ejecución actual y permite que OpenClaw lo vuelva a crear en el siguiente uso
- la lógica de poda (prune) también es consciente del backend

Para el modo `remote`, volver a crear es especialmente importante:

- volver a crear elimina el espacio de trabajo remoto canónico para ese ámbito
- el siguiente uso siembra un espacio de trabajo remoto nuevo desde el espacio de trabajo local

Para el modo `mirror`, volver a crear restablece principalmente el entorno de ejecución remoto
porque el espacio de trabajo local sigue siendo canónico de todos modos.

## Acceso al espacio de trabajo

`agents.defaults.sandbox.workspaceAccess` controla **lo que el sandbox puede ver**:

- `"none"` (predeterminado): las herramientas ven un espacio de trabajo de sandbox bajo `~/.openclaw/sandboxes`.
- `"ro"`: monta el espacio de trabajo del agente como solo lectura en `/agent` (deshabilita `write`/`edit`/`apply_patch`).
- `"rw"`: monta el espacio de trabajo del agente como lectura/escritura en `/workspace`.

Con el backend OpenShell:

- El modo `mirror` todavía usa el espacio de trabajo local como la fuente canónica entre turnos de ejecución
- El modo `remote` usa el espacio de trabajo de OpenShell remoto como la fuente canónica después de la semilla inicial
- `workspaceAccess: "ro"` y `"none"` todavía restringen el comportamiento de escritura de la misma manera

Los medios entrantes se copian en el espacio de trabajo del sandbox activo (`media/inbound/*`).
Nota de habilidades: la herramienta `read` está enraizada en el sandbox. Con `workspaceAccess: "none"`,
OpenClaw refleja las habilidades elegibles en el espacio de trabajo del sandbox (`.../skills`) para
que puedan ser leídas. Con `"rw"`, las habilidades del espacio de trabajo se pueden leer desde
`/workspace/skills`.

## Montajes de enlace personalizados

`agents.defaults.sandbox.docker.binds` monta directorios adicionales del host en el contenedor.
Formato: `host:container:mode` (por ejemplo, `"/home/user/source:/source:rw"`).

Los enlaces globales y por agente se **fusionan** (no se reemplazan). Bajo `scope: "shared"`, los enlaces por agente se ignoran.

`agents.defaults.sandbox.browser.binds` monta directorios adicionales del host solo en el contenedor del **navegador sandbox**.

- Cuando se establece (incluyendo `[]`), reemplaza `agents.defaults.sandbox.docker.binds` para el contenedor del navegador.
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

Notas de seguridad:

- Los enlaces omiten el sistema de archivos del sandbox: exponen las rutas del host con cualquier modo que establezcas (`:ro` o `:rw`).
- OpenClaw bloquea orígenes de bind peligrosos (por ejemplo: `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev` y montajes principales que los expondrían).
- OpenClaw también bloquea raíces comunes de credenciales del directorio de inicio, tales como `~/.aws`, `~/.cargo`, `~/.config`, `~/.docker`, `~/.gnupg`, `~/.netrc`, `~/.npm` y `~/.ssh`.
- La validación de bind no es solo coincidencia de cadenas. OpenClaw normaliza la ruta de origen, luego la resuelve nuevamente a través del ancestro existente más profundo antes de volver a verificar las rutas bloqueadas y las raíces permitidas.
- Eso significa que los escapes de enlace simbólico principal (symlink-parent) todavía fallan cerrados incluso cuando la hoja final aún no existe. Ejemplo: `/workspace/run-link/new-file` todavía se resuelve como `/var/run/...` si `run-link` apunta allí.
- Las raíces de origen permitidas se canonicizan de la misma manera, por lo que una ruta que solo se ve dentro de la lista de permitidos antes de la resolución del enlace simbólico todavía se rechaza como `outside allowed roots`.
- Los montajes sensibles (secretos, claves SSH, credenciales de servicio) deben ser `:ro` a menos que sean absolutamente necesarios.
- Combínelo con `workspaceAccess: "ro"` si solo necesita acceso de lectura al espacio de trabajo; los modos de bind se mantienen independientes.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para ver cómo los binds interactúan con la política de herramientas y la ejecución elevada.

## Imágenes + configuración

Imagen de Docker predeterminada: `openclaw-sandbox:bookworm-slim`

Constrúyala una vez:

```bash
scripts/sandbox-setup.sh
```

Nota: la imagen predeterminada **no** incluye Node. Si una habilidad necesita Node (u otros tiempos de ejecución), ya sea prepare una imagen personalizada o instálela a través de
`sandbox.docker.setupCommand` (requiere salida de red + raíz escribible +
usuario root).

Si desea una imagen de sandbox más funcional con herramientas comunes (por ejemplo
`curl`, `jq`, `nodejs`, `python3`, `git`), construya:

```bash
scripts/sandbox-common-setup.sh
```

Luego, establezca `agents.defaults.sandbox.docker.image` en
`openclaw-sandbox-common:bookworm-slim`.

Imagen del navegador en sandbox:

```bash
scripts/sandbox-browser-setup.sh
```

De forma predeterminada, los contenedores sandbox de Docker se ejecutan sin **red**.
Omita esto con `agents.defaults.sandbox.docker.network`.

La imagen del navegador en sandbox incluida también aplica valores predeterminados de inicio de Chromium conservadores
para cargas de trabajo en contenedores. Los valores predeterminados actuales del contenedor incluyen:

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
- `--no-sandbox` y `--disable-setuid-sandbox` cuando `noSandbox` está habilitado.
- Las tres opciones de endurecimiento de gráficos (`--disable-3d-apis`,
  `--disable-software-rasterizer`, `--disable-gpu`) son opcionales y son útiles
  cuando los contenedores carecen de soporte para GPU. Establezca `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`
  si su carga de trabajo requiere WebGL u otras características 3D/navegador.
- `--disable-extensions` está habilitado de forma predeterminada y se puede deshabilitar con
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` para flujos que dependen de extensiones.
- `--renderer-process-limit=2` está controlado por
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, donde `0` mantiene el valor predeterminado de Chromium.

Si necesita un perfil de tiempo de ejecución diferente, use una imagen de navegador personalizada y proporcione
su propio punto de entrada. Para perfiles locales de Chromium (sin contenedor), use
`browser.extraArgs` para agregar indicadores de inicio adicionales.

Valores predeterminados de seguridad:

- `network: "host"` está bloqueado.
- `network: "container:<id>"` está bloqueado de forma predeterminada (riesgo de omisión de unión al espacio de nombres).
- Anulación de emergencia (break-glass): `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.

Las instalaciones de Docker y la puerta de enlace contenida se encuentran aquí:
[Docker](/es/install/docker)

Para los despliegues del gateway Docker, `scripts/docker/setup.sh` puede arrancar la configuración del sandbox.
Establezca `OPENCLAW_SANDBOX=1` (o `true`/`yes`/`on`) para habilitar esa ruta. Puede
anular la ubicación del socket con `OPENCLAW_DOCKER_SOCKET`. Configuración completa y referencia de
variables de entorno: [Docker](/es/install/docker#agent-sandbox).

## setupCommand (configuración única del contenedor)

`setupCommand` se ejecuta **una vez** después de que se crea el contenedor del sandbox (no en cada ejecución).
Se ejecuta dentro del contenedor a través de `sh -lc`.

Rutas:

- Global: `agents.defaults.sandbox.docker.setupCommand`
- Por agente: `agents.list[].sandbox.docker.setupCommand`

Problemas comunes:

- El valor predeterminado de `docker.network` es `"none"` (sin salida), por lo que la instalación de paquetes fallará.
- `docker.network: "container:<id>"` requiere `dangerouslyAllowContainerNamespaceJoin: true` y es solo para casos de emergencia (break-glass).
- `readOnlyRoot: true` evita escrituras; establezca `readOnlyRoot: false` u hornee una imagen personalizada.
- `user` debe ser root para la instalación de paquetes (omite `user` o establece `user: "0:0"`).
- La ejecución en el sandbox **no** hereda el `process.env` del host. Use
  `agents.defaults.sandbox.docker.env` (o una imagen personalizada) para las claves API de habilidades.

## Política de herramientas + válvulas de escape

Las políticas de permiso/denegación de herramientas aún se aplican antes que las reglas del sandbox. Si una herramienta está denegada
globalmente o por agente, el sandbox no la restaura.

`tools.elevated` es una válvula de escape explícita que ejecuta `exec` fuera del sandbox (`gateway` de forma predeterminada, o `node` cuando el objetivo de ejecución es `node`).
Las directivas `/exec` solo se aplican para remitentes autorizados y persisten por sesión; para deshabilitar totalmente
`exec`, use la denegación de política de herramientas (consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated)).

Depuración:

- Use `openclaw sandbox explain` para inspeccionar el modo efectivo del sandbox, la política de herramientas y las claves de configuración de reparación.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para el modelo mental "¿por qué está bloqueado esto?".
  Manténgalo bloqueado.

## Invalidaciones de multiagente

Cada agente puede invalidar el sandbox + herramientas:
`agents.list[].sandbox` y `agents.list[].tools` (además de `agents.list[].tools.sandbox.tools` para la política de herramientas del sandbox).
Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para ver la precedencia.

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

## Documentación relacionada

- [OpenShell](/es/gateway/openshell) -- configuración del backend de sandbox administrado, modos de espacio de trabajo y referencia de configuración
- [Sandbox Configuration](/es/gateway/configuration-reference#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) -- depuración de "¿por qué está bloqueado esto?"
- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) -- invalidaciones y precedencia por agente
- [Security](/es/gateway/security)
