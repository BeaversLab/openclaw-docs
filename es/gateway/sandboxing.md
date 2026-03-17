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
- Cualquier herramienta explícitamente permitida para ejecutarse en el host (p. ej. `tools.elevated`).
  - **La ejecución elevada se ejecuta en el host y omite el aislamiento.**
  - Si el sandboxing está desactivado, `tools.elevated` no cambia la ejecución (ya está en el host). Vea [Modo Elevado](/es/tools/elevated).

## Modos

`agents.defaults.sandbox.mode` controla **cuándo** se utiliza el sandboxing:

- `"off"`: sin sandboxing.
- `"non-main"`: sandbox solo para sesiones **no principales** (predeterminado si desea chats normales en el host).
- `"all"`: cada sesión se ejecuta en un sandbox.
  Nota: `"non-main"` se basa en `session.mainKey` (por defecto `"main"`), no en el id del agente.
  Las sesiones de grupo/canal usan sus propias claves, por lo que cuentan como no principales y se ejecutarán en un sandbox.

## Alcance

`agents.defaults.sandbox.scope` controla **cuántos contenedores** se crean:

- `"session"` (por defecto): un contenedor por sesión.
- `"agent"`: un contenedor por agente.
- `"shared"`: un contenedor compartido por todas las sesiones en sandbox.

## Backend

`agents.defaults.sandbox.backend` controla **qué tiempo de ejecución** proporciona el sandbox:

- `"docker"` (por defecto): tiempo de ejecución de sandbox local respaldado por Docker.
- `"ssh"`: tiempo de ejecución de sandbox remoto genérico respaldado por SSH.
- `"openshell"`: tiempo de ejecución de sandbox respaldado por OpenShell.

La configuración específica de SSH se encuentra en `agents.defaults.sandbox.ssh`.
La configuración específica de OpenShell se encuentra en `plugins.entries.openshell.config`.

### Backend SSH

Use `backend: "ssh"` cuando desee que OpenClaw ejecute en sandbox `exec`, herramientas de archivo y lecturas de medios en
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
- En el primer uso después de crear o recrear, OpenClaw siembra ese espacio de trabajo remoto desde el espacio de trabajo local una vez.
- Después de eso, `exec`, `read`, `write`, `edit`, `apply_patch`, las lecturas de medios de los prompts y el almacenamiento provisional de medios entrantes se ejecutan directamente contra el espacio de trabajo remoto a través de SSH.
- OpenClaw no sincroniza los cambios remotos de vuelta al espacio de trabajo local automáticamente.

Material de autenticación:

- `identityFile`, `certificateFile`, `knownHostsFile`: use archivos locales existentes y páselos a través de la configuración de OpenSSH.
- `identityData`, `certificateData`, `knownHostsData`: usa cadenas en línea o SecretRefs. OpenClaw las resuelve a través de la instantánea de tiempo de ejecución de secretos normal, las escribe en archivos temporales con `0600` y las elimina cuando termina la sesión SSH.
- Si tanto `*File` como `*Data` están configurados para el mismo elemento, `*Data` tiene prioridad para esa sesión SSH.

Este es un modelo **remoto-canónico**. El espacio de trabajo SSH remoto se convierte en el estado real del sandbox después de la semilla inicial.

Consecuencias importantes:

- Las ediciones locales realizadas fuera de OpenClaw después del paso de semilla no son visibles de forma remota hasta que vuelvas a crear el sandbox.
- `openclaw sandbox recreate` elimina la raíz remota por ámbito y vuelve a sembrar desde lo local en el próximo uso.
- El sandboxing del navegador no es compatible con el backend SSH.
- La configuración de `sandbox.docker.*` no se aplica al backend SSH.

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

- `mirror` (predeterminado): el espacio de trabajo local sigue siendo canónico. OpenClaw sincroniza los archivos locales en OpenShell antes de la ejecución y sincroniza el espacio de trabajo remoto después de la ejecución.
- `remote`: el espacio de trabajo OpenShell es canónico después de crear el sandbox. OpenClaw siembra el espacio de trabajo remoto una vez desde el espacio de trabajo local y luego las herramientas de archivos y la ejecución se ejecutan directamente contra el sandbox remoto sin sincronizar los cambios de vuelta.

OpenShell reutiliza el mismo transporte SSH central y puente de sistema de archivos remoto que el backend SSH genérico.
El complemento añade un ciclo de vida específico de OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) y el modo opcional `mirror`.

Detalles del transporte remoto:

- OpenClaw solicita a OpenShell la configuración SSH específica del sandbox a través de `openshell sandbox ssh-config <name>`.
- El núcleo escribe esa configuración SSH en un archivo temporal, abre la sesión SSH y reutiliza el mismo puente de sistema de archivos remoto utilizado por `backend: "ssh"`.
- En el modo `mirror` solo difiere el ciclo de vida: sincronizar de local a remoto antes de la ejecución y luego sincronizar de vuelta después de la ejecución.

Limitaciones actuales de OpenShell:

- el navegador sandbox aún no es compatible
- `sandbox.docker.binds` no es compatible con el backend de OpenShell
- Los controles de tiempo de ejecución específicos de Docker bajo `sandbox.docker.*` todavía se aplican solo al backend de Docker

## Modos de espacio de trabajo de OpenShell

OpenShell tiene dos modelos de espacio de trabajo. Esta es la parte que más importa en la práctica.

### `mirror`

Use `plugins.entries.openshell.config.mode: "mirror"` cuando quiera que el **espacio de trabajo local se mantenga canónico**.

Comportamiento:

- Antes de `exec`, OpenClaw sincroniza el espacio de trabajo local en el sandbox de OpenShell.
- Después de `exec`, OpenClaw sincroniza el espacio de trabajo remoto de vuelta al espacio de trabajo local.
- Las herramientas de archivos todavía operan a través del puente del sandbox, pero el espacio de trabajo local sigue siendo la fuente de verdad entre turnos.

Use esto cuando:

- edite archivos localmente fuera de OpenClaw y quiera que esos cambios aparezcan en el sandbox automáticamente
- quiera que el sandbox de OpenShell se comporte tanto como sea posible como el backend de Docker
- quiera que el espacio de trabajo del host refleje las escrituras del sandbox después de cada turno de ejecución

Compromiso:

- costo de sincronización adicional antes y después de la ejecución

### `remote`

Use `plugins.entries.openshell.config.mode: "remote"` cuando quiera que el **espacio de trabajo de OpenShell se convierta en canónico**.

Comportamiento:

- Cuando se crea el sandbox por primera vez, OpenClaw inicializa el espacio de trabajo remoto desde el espacio de trabajo local una vez.
- Después de eso, `exec`, `read`, `write`, `edit` y `apply_patch` operan directamente contra el espacio de trabajo remoto de OpenShell.
- OpenClaw **no** sincroniza los cambios remotos de vuelta al espacio de trabajo local después de la ejecución.
- Las lecturas de medios en el momento del prompt todavía funcionan porque las herramientas de archivos y medios leen a través del puente del sandbox en lugar de asumir una ruta de host local.
- El transporte es SSH hacia el sandbox de OpenShell devuelto por `openshell sandbox ssh-config`.

Consecuencias importantes:

- Si edita archivos en el host fuera de OpenClaw después del paso de inicialización, el sandbox remoto **no** verá esos cambios automáticamente.
- Si se vuelve a crear el sandbox, el espacio de trabajo remoto se inicializa desde el espacio de trabajo local nuevamente.
- Con `scope: "agent"` o `scope: "shared"`, ese espacio de trabajo remoto se comparte en ese mismo ámbito.

Use esto cuando:

- el sandbox debe vivir principalmente en el lado remoto de OpenShell
- deseas una sobrecarga de sincronización por turno menor
- no deseas que las ediciones locales en el host sobrescriban silenciosamente el estado del sandbox remoto

Elige `mirror` si consideras el sandbox como un entorno de ejecución temporal.
Elige `remote` si consideras el sandbox como el espacio de trabajo real.

## Ciclo de vida de OpenShell

Los sandboxes de OpenShell aún se gestionan a través del ciclo de vida normal del sandbox:

- `openclaw sandbox list` muestra los tiempos de ejecución de OpenShell así como los de Docker
- `openclaw sandbox recreate` elimina el tiempo de ejecución actual y permite que OpenClaw lo vuelva a crear en el siguiente uso
- la lógica de poda también es consciente del backend

Para el modo `remote`, recrear es especialmente importante:

- recrear elimina el espacio de trabajo remoto canónico para ese ámbito
- el siguiente uso inicializa un espacio de trabajo remoto nuevo desde el espacio de trabajo local

Para el modo `mirror`, recrear restablece principalmente el entorno de ejecución remoto
porque el espacio de trabajo local sigue siendo canónico de todos modos.

## Acceso al espacio de trabajo

`agents.defaults.sandbox.workspaceAccess` controla **lo que el sandbox puede ver**:

- `"none"` (predeterminado): las herramientas ven un espacio de trabajo del sandbox bajo `~/.openclaw/sandboxes`.
- `"ro"`: monta el espacio de trabajo del agente como solo lectura en `/agent` (desactiva `write`/`edit`/`apply_patch`).
- `"rw"`: monta el espacio de trabajo del agente como lectura/escritura en `/workspace`.

Con el backend de OpenShell:

- el modo `mirror` sigue utilizando el espacio de trabajo local como fuente canónica entre turnos de ejecución
- el modo `remote` utiliza el espacio de trabajo de OpenShell remoto como fuente canónica después de la inicialización
- `workspaceAccess: "ro"` y `"none"` aún restringen el comportamiento de escritura de la misma manera

Los medios entrantes se copian en el espacio de trabajo de sandbox activo (`media/inbound/*`).
Nota de habilidades: la herramienta `read` está enraizada en el sandbox. Con `workspaceAccess: "none"`,
OpenClaw refleja las habilidades elegibles en el espacio de trabajo del sandbox (`.../skills`) para
que puedan ser leídas. Con `"rw"`, las habilidades del espacio de trabajo son legibles desde
`/workspace/skills`.

## Montajes de enlace personalizados

`agents.defaults.sandbox.docker.binds` monta directorios adicionales del host en el contenedor.
Formato: `host:container:mode` (por ejemplo, `"/home/user/source:/source:rw"`).

Los enlaces globales y por agente se **fusionan** (no se reemplazan). En `scope: "shared"`, los enlaces por agente se ignoran.

`agents.defaults.sandbox.browser.binds` monta directorios adicionales del host solo en el contenedor del **navegador de sandbox**.

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

Notas de seguridad:

- Los enlaces omiten el sistema de archivos del sandbox: exponen rutas del host con el modo que configure (`:ro` o `:rw`).
- OpenClaw bloquea fuentes de enlace peligrosas (por ejemplo: `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`, y montajes principales que los expondrían).
- Los montajes sensibles (secretos, claves SSH, credenciales de servicio) deben ser `:ro` a menos que sea absolutamente necesario.
- Combine con `workspaceAccess: "ro"` si solo necesita acceso de lectura al espacio de trabajo; los modos de enlace permanecen independientes.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para ver cómo los enlaces interactúan con la política de herramientas y la ejecución elevada.

## Imágenes + configuración

Imagen de Docker predeterminada: `openclaw-sandbox:bookworm-slim`

Constrúyala una vez:

```bash
scripts/sandbox-setup.sh
```

Nota: la imagen predeterminada **no** incluye Node. Si una habilidad necesita Node (u otros entornos de ejecución),prepare una imagen personalizada o instálela mediante
`sandbox.docker.setupCommand` (requiere salida de red + raíz escribible +
usuario root).

Si desea una imagen de sandbox más funcional con herramientas comunes (por ejemplo
`curl`, `jq`, `nodejs`, `python3`, `git`), compile:

```bash
scripts/sandbox-common-setup.sh
```

Luego establezca `agents.defaults.sandbox.docker.image` en
`openclaw-sandbox-common:bookworm-slim`.

Imagen del navegador en sandbox:

```bash
scripts/sandbox-browser-setup.sh
```

De manera predeterminada, los contenedores de sandbox de Docker se ejecutan con **sin red**.
Anule esto con `agents.defaults.sandbox.docker.network`.

La imagen del navegador sandbox incluida también aplica valores predeterminados de inicio de Chromium conservadores
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
- Las tres banderas de endurecimiento de gráficos (`--disable-3d-apis`,
  `--disable-software-rasterizer`, `--disable-gpu`) son opcionales y son útiles
  cuando los contenedores carecen de compatibilidad con GPU. Establezca `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`
  si su carga de trabajo requiere WebGL u otras características 3D/navegador.
- `--disable-extensions` está habilitado de manera predeterminada y se puede desactivar con
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` para flujos que dependen de extensiones.
- `--renderer-process-limit=2` está controlado por
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, donde `0` mantiene el valor predeterminado de Chromium.

Si necesita un perfil de tiempo de ejecución diferente, use una imagen de navegador personalizada y proporcione
su propio punto de entrada. Para perfiles locales de Chromium (no en contenedor), use
`browser.extraArgs` para agregar indicadores de inicio adicionales.

Valores predeterminados de seguridad:

- `network: "host"` está bloqueado.
- `network: "container:<id>"` está bloqueado de forma predeterminada (riesgo de omisión de unión de espacios de nombres).
- Anulación de emergencia (break-glass): `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.

Las instalaciones de Docker y la puerta de enlace contenedorizada se encuentran aquí:
[Docker](/es/install/docker)

Para las implementaciones de puerta de enlace Docker, `docker-setup.sh` puede inicializar la configuración del sandbox.
Establezca `OPENCLAW_SANDBOX=1` (o `true`/`yes`/`on`) para habilitar esa ruta. Puede
anular la ubicación del socket con `OPENCLAW_DOCKER_SOCKET`. Referencia completa de configuración y entorno: [Docker](/es/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in).

## setupCommand (configuración única del contenedor)

`setupCommand` se ejecuta **una vez** después de que se crea el contenedor sandbox (no en cada ejecución).
Se ejecuta dentro del contenedor mediante `sh -lc`.

Rutas:

- Global: `agents.defaults.sandbox.docker.setupCommand`
- Por agente: `agents.list[].sandbox.docker.setupCommand`

Errores comunes:

- El `docker.network` predeterminado es `"none"` (sin salida), por lo que la instalación de paquetes fallará.
- `docker.network: "container:<id>"` requiere `dangerouslyAllowContainerNamespaceJoin: true` y es solo para casos de emergencia (break-glass).
- `readOnlyRoot: true` impide escrituras; configure `readOnlyRoot: false` o prepare una imagen personalizada.
- `user` debe ser root para instalar paquetes (omita `user` o configure `user: "0:0"`).
- La ejecución en el sandbox **no** hereda el `process.env` del host. Use
  `agents.defaults.sandbox.docker.env` (o una imagen personalizada) para las claves API de habilidades.

## Política de herramientas + mecanismos de escape

Las políticas de permiso/denegación de herramientas todavía se aplican antes que las reglas del sandbox. Si una herramienta está denegada
globalmente o por agente, el sandbox no la recupera.

`tools.elevated` es una salida de escape explícita que ejecuta `exec` en el host.
Las directivas `/exec` solo se aplican para remitentes autorizados y persisten por sesión; para deshabilitar estrictamente
`exec`, use la denegación de política de herramientas (consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated)).

Depuración:

- Use `openclaw sandbox explain` para inspeccionar el modo de sandbox efectivo, la política de herramientas y las claves de configuración de reparación.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para conocer el modelo mental de "¿por qué está esto bloqueado?".
  Manténgalo bloqueado.

## Invalidaciones de multiagente

Cada agente puede anular el sandbox y las herramientas:
`agents.list[].sandbox` y `agents.list[].tools` (además de `agents.list[].tools.sandbox.tools` para la política de herramientas de sandbox).
Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para conocer la precedencia.

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

## Documentos relacionados

- [Sandbox Configuration](/es/gateway/configuration#agentsdefaults-sandbox)
- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools)
- [Security](/es/gateway/security)

import es from "/components/footer/es.mdx";

<es />
