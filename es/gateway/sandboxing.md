---
summary: "Cómo funciona el sandboxing de OpenClaw: modos, alcances, acceso al espacio de trabajo e imágenes"
title: Sandboxing
read_when: "Quieres una explicación dedicada del sandboxing o necesitas ajustar agents.defaults.sandbox."
status: active
---

# Sandboxing

OpenClaw puede ejecutar **herramientas dentro de contenedores Docker** para reducir el radio de explosión.
Esto es **opcional** y se controla mediante configuración (`agents.defaults.sandbox` o
`agents.list[].sandbox`). Si el sandboxing está desactivado, las herramientas se ejecutan en el host.
El Gateway permanece en el host; la ejecución de la herramienta se ejecuta en un sandbox aislado
cuando está habilitado.

Esta no es un límite de seguridad perfecto, pero limita materialmente el acceso al sistema de archivos
y a los procesos cuando el modelo hace algo estúpido.

## Qué se pone en sandbox

- Ejecución de herramientas (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navegador en sandbox opcional (`agents.defaults.sandbox.browser`).
  - De forma predeterminada, el navegador en sandbox se inicia automáticamente (asegura que CDP sea accesible) cuando la herramienta del navegador lo necesita.
    Configurar mediante `agents.defaults.sandbox.browser.autoStart` y `agents.defaults.sandbox.browser.autoStartTimeoutMs`.
  - De forma predeterminada, los contenedores del navegador en sandbox utilizan una red Docker dedicada (`openclaw-sandbox-browser`) en lugar de la red global `bridge`.
    Configurar con `agents.defaults.sandbox.browser.network`.
  - El `agents.defaults.sandbox.browser.cdpSourceRange` opcional restringe el ingreso de CDP en el borde del contenedor con una lista de permitidos CIDR (por ejemplo `172.21.0.1/32`).
  - El acceso del observador noVNC está protegido con contraseña de forma predeterminada; OpenClaw emite una URL de token de corta duración que sirve una página de arranque local y abre noVNC con la contraseña en el fragmento de la URL (no en registros de consulta/encabezados).
  - `agents.defaults.sandbox.browser.allowHostControl` permite que las sesiones en sandbox apunten explícitamente al navegador del host.
  - Las listas de permitidos opcionales controlan `target: "custom"`: `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

No está en sandbox:

- El proceso del Gateway en sí.
- Cualquier herramienta explícitamente permitida para ejecutarse en el host (ej. `tools.elevated`).
  - **La ejecución elevada se ejecuta en el host y omite el aislamiento.**
  - Si el aislamiento está desactivado, `tools.elevated` no cambia la ejecución (ya está en el host). Consulte [Modo elevado](/es/tools/elevated).

## Modos

`agents.defaults.sandbox.mode` controla **cuándo** se utiliza el aislamiento:

- `"off"`: sin aislamiento.
- `"non-main"`: aísla solo las sesiones **no principales** (predeterminado si desea chats normales en el host).
- `"all"`: cada sesión se ejecuta en un espacio aislado.
  Nota: `"non-main"` se basa en `session.mainKey` (predeterminado `"main"`), no en el id del agente.
  Las sesiones de grupo/canal usan sus propias claves, por lo que cuentan como no principales y se aislarán.

## Alcance

`agents.defaults.sandbox.scope` controla **cuántos contenedores** se crean:

- `"session"` (predeterminado): un contenedor por sesión.
- `"agent"`: un contenedor por agente.
- `"shared"`: un contenedor compartido por todas las sesiones aisladas.

## Acceso al espacio de trabajo

`agents.defaults.sandbox.workspaceAccess` controla **lo que el espacio aislado puede ver**:

- `"none"` (predeterminado): las herramientas ven un espacio de trabajo aislado bajo `~/.openclaw/sandboxes`.
- `"ro"`: monta el espacio de trabajo del agente como de solo lectura en `/agent` (desactiva `write`/`edit`/`apply_patch`).
- `"rw"`: monta el espacio de trabajo del agente como lectura/escritura en `/workspace`.

Los medios entrantes se copian en el espacio de trabajo aislado activo (`media/inbound/*`).
Nota de habilidades: la herramienta `read` está arraigada en el espacio aislado. Con `workspaceAccess: "none"`,
OpenClaw refleja las habilidades elegibles en el espacio de trabajo aislado (`.../skills`) para
que puedan ser leídas. Con `"rw"`, las habilidades del espacio de trabajo se pueden leer desde
`/workspace/skills`.

## Montajes de enlace personalizados

`agents.defaults.sandbox.docker.binds` monta directorios adicionales del host en el contenedor.
Formato: `host:container:mode` (p. ej., `"/home/user/source:/source:rw"`).

Los enlaces globales y por agente se **fusionan** (no se reemplazan). Bajo `scope: "shared"`, se ignoran los enlaces por agente.

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

Notas de seguridad:

- Los enlaces omiten el sistema de archivos del sandbox: exponen rutas del host con cualquier modo que configure (`:ro` o `:rw`).
- OpenClaw bloquea fuentes de enlace peligrosas (por ejemplo: `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`, y montajes principales que los expondrían).
- Los montajes sensibles (secretos, claves SSH, credenciales de servicio) deben ser `:ro` a menos que sea absolutamente necesario.
- Combine con `workspaceAccess: "ro"` si solo necesita acceso de lectura al espacio de trabajo; los modos de enlace siguen siendo independientes.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para ver cómo los enlaces interactúan con la política de herramientas y la ejecución elevada.

## Imágenes + configuración

Imagen predeterminada: `openclaw-sandbox:bookworm-slim`

Constrúyala una vez:

```bash
scripts/sandbox-setup.sh
```

Nota: la imagen predeterminada **no** incluye Node. Si una habilidad necesita Node (u otros tiempos de ejecución), prepare una imagen personalizada o instálela a través de
`sandbox.docker.setupCommand` (requiere salida de red + raíz escribible +
usuario root).

Si desea una imagen de sandbox más funcional con herramientas comunes (por ejemplo
`curl`, `jq`, `nodejs`, `python3`, `git`), construya:

```bash
scripts/sandbox-common-setup.sh
```

Luego establezca `agents.defaults.sandbox.docker.image` en
`openclaw-sandbox-common:bookworm-slim`.

Imagen del navegador sandbox:

```bash
scripts/sandbox-browser-setup.sh
```

De forma predeterminada, los contenedores sandbox se ejecutan **sin red**.
Anule esto con `agents.defaults.sandbox.docker.network`.

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
- `--no-sandbox` y `--disable-setuid-sandbox` cuando `noSandbox` está habilitado.
- Las tres marcas de endurecimiento de gráficos (`--disable-3d-apis`,
  `--disable-software-rasterizer`, `--disable-gpu`) son opcionales y son útiles
  cuando los contenedores carecen de soporte de GPU. Establezca `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`
  si su carga de trabajo requiere WebGL u otras características 3D/navegador.
- `--disable-extensions` está habilitado por defecto y se puede desactivar con
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` para flujos que dependen de extensiones.
- `--renderer-process-limit=2` está controlado por
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, donde `0` mantiene el valor predeterminado de Chromium.

Si necesita un perfil de tiempo de ejecución diferente, use una imagen de navegador personalizada y proporcione
su propio punto de entrada. Para perfiles locales de Chromium (no en contenedor), use
`browser.extraArgs` para agregar marcas de inicio adicionales.

Valores predeterminados de seguridad:

- `network: "host"` está bloqueado.
- `network: "container:<id>"` está bloqueado por defecto (riesgo de omisión de unión al espacio de nombres).
- Anulación de emergencia: `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.

Las instalaciones de Docker y la puerta de enlace en contenedor viven aquí:
[Docker](/es/install/docker)

Para los despliegues de gateway de Docker, `docker-setup.sh` puede iniciar la configuración del sandbox.
Establezca `OPENCLAW_SANDBOX=1` (o `true`/`yes`/`on`) para habilitar esa ruta. Puede
anular la ubicación del socket con `OPENCLAW_DOCKER_SOCKET`. Configuración completa y referencia de
entorno: [Docker](/es/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in).

## setupCommand (configuración única del contenedor)

`setupCommand` se ejecuta **una vez** después de que se crea el contenedor del sandbox (no en cada ejecución).
Se ejecuta dentro del contenedor a través de `sh -lc`.

Rutas:

- Global: `agents.defaults.sandbox.docker.setupCommand`
- Por agente: `agents.list[].sandbox.docker.setupCommand`

Problemas comunes:

- El valor predeterminado de `docker.network` es `"none"` (sin salida), por lo que la instalación de paquetes fallará.
- `docker.network: "container:<id>"` requiere `dangerouslyAllowContainerNamespaceJoin: true` y es solo para casos de emergencia.
- `readOnlyRoot: true` impide las escrituras; establezca `readOnlyRoot: false` o prepare una imagen personalizada.
- `user` debe ser root para la instalación de paquetes (omita `user` o establezca `user: "0:0"`).
- La ejecución en el sandbox **no** hereda el `process.env` del host. Use
  `agents.defaults.sandbox.docker.env` (o una imagen personalizada) para las claves API de habilidades.

## Política de herramientas + mecanismos de escape

Las políticas de permiso/denegación de herramientas todavía se aplican antes que las reglas del sandbox. Si una herramienta está denegada
globalmente o por agente, el sandbox no la restaura.

`tools.elevated` es un mecanismo de escape explícito que ejecuta `exec` en el host.
Las directivas `/exec` solo se aplican para remitentes autorizados y persisten por sesión; para deshabilitar totalmente
`exec`, use la política de denegación de herramientas (consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated)).

Depuración:

- Use `openclaw sandbox explain` para inspeccionar el modo efectivo de sandbox, la política de herramientas y las claves de configuración de reparación.
- Consulte [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) para el modelo mental de "¿por qué está bloqueado esto?".
  Manténgalo seguro.

## Anulaciones multiagente

Cada agente puede anular el sandbox + herramientas:
`agents.list[].sandbox` y `agents.list[].tools` (además de `agents.list[].tools.sandbox.tools` para la política de herramientas del sandbox).
Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para conocer la precedencia.

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

## Documentos relacionados

- [Sandbox Configuration](/es/gateway/configuration#agentsdefaults-sandbox)
- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools)
- [Security](/es/gateway/security)

import es from "/components/footer/es.mdx";

<es />
