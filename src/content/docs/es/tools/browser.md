---
summary: "Servicio de control del navegador integrado + comandos de acción"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "Navegador (gestionado por OpenClaw)"
---

OpenClaw puede ejecutar un **perfil dedicado de Chrome/Brave/Edge/Chromium** que controla el agente.
Está aislado de su navegador personal y se administra a través de un pequeño servicio de
control local dentro de Gateway (solo loopback).

Vista de principiante:

- Piénselo como un **navegador separado, solo para el agente**.
- El perfil `openclaw` **no** toca su perfil personal del navegador.
- El agente puede **abrir pestañas, leer páginas, hacer clic y escribir** en un carril seguro.
- El perfil integrado `user` se adjunta a su sesión real de Chrome iniciada mediante Chrome MCP.

## Lo que obtienes

- Un perfil de navegador separado llamado **openclaw** (acentos naranjas por defecto).
- Control determinista de pestañas (listar/abrir/enfocar/cerrar).
- Acciones del agente (clic/escribir/arrastrar/seleccionar), instantáneas, capturas de pantalla, PDFs.
- Una habilidad `browser-automation` incluida que enseña a los agentes el ciclo de recuperación de instantánea, pestaña estable, referencia obsoleta y bloqueador manual cuando el complemento del navegador está habilitado.
- Soporte opcional de múltiples perfiles (`openclaw`, `work`, `remote`, ...).

Este navegador **no** es su navegador principal. Es una superficie segura y aislada para
la automatización y verificación del agente.

## Inicio rápido

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Si obtienes "Browser disabled" (navegador deshabilitado), habilítalo en la configuración (ver abajo) y reinicia el Gateway.

Si `openclaw browser` falta por completo, o el agente dice que la herramienta del navegador no está disponible, vaya a [Falta el comando o herramienta del navegador](/es/tools/browser#missing-browser-command-or-tool).

## Control de complementos

La herramienta predeterminada `browser` es un complemento incluido. Desactívela para reemplazarla con otro complemento que registre el mismo nombre de herramienta `browser`:

```json5
{
  plugins: {
    entries: {
      browser: {
        enabled: false,
      },
    },
  },
}
```

Los valores predeterminados necesitan tanto `plugins.entries.browser.enabled` **como** `browser.enabled=true`. Desactivar solo el complemento elimina la CLI `openclaw browser`, el método de gateway `browser.request`, la herramienta del agente y el servicio de control como una unidad; su configuración `browser.*` permanece intacta para un reemplazo.

Los cambios en la configuración del navegador requieren un reinicio de Gateway para que el complemento pueda volver a registrar su servicio.

## Guía del agente

Nota sobre el perfil de herramientas: `tools.profile: "coding"` incluye `web_search` y `web_fetch`, pero no incluye la herramienta completa `browser`. Si el agente o un subagente generado debe usar la automatización del navegador, agregue el navegador en la etapa del perfil:

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Para un solo agente, use `agents.list[].tools.alsoAllow: ["browser"]`.
`tools.subagents.tools.allow: ["browser"]` solo no es suficiente porque la política de subagente se aplica después del filtrado del perfil.

El complemento del navegador incluye dos niveles de guía para el agente:

- La descripción de la herramienta `browser` lleva el contrato compacto siempre activo: elija el perfil correcto, mantenga las referencias en la misma pestaña, use `tabId`/etiquetas para la orientación de pestañas y cargue la habilidad del navegador para trabajos de varios pasos.
- La habilidad `browser-automation` incluida lleva el bucle de operación más largo:
  verificar primero el estado/pestañas, etiquetar las pestañas de tareas, tomar una instantánea antes de actuar, volver a tomarla
  después de cambios en la interfaz de usuario, recuperar referencias obsoletas una vez, e informar el inicio de sesión/2FA/captcha o
  bloqueadores de cámara/micrófono como acción manual en lugar de adivinar.

Las habilidades incluidas en el complemento se enumeran en las habilidades disponibles del agente cuando el
complemento está habilitado. Las instrucciones completas de la habilidad se cargan bajo demanda, por lo que las
rotinas de rutina no pagan el costo completo de tokens.

## Falta el comando o herramienta del navegador

Si `openclaw browser` es desconocido después de una actualización, falta `browser.request`, o el agente informa que la herramienta del navegador no está disponible, la causa habitual es una lista `plugins.allow` que omite `browser` y no existe ningún bloque de configuración raíz `browser`. Agréguelo:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

Un bloque raíz explícito `browser`, por ejemplo `browser.enabled=true` o `browser.profiles.<name>`, activa el complemento del navegador incluido incluso bajo una `plugins.allow` restrictiva, coincidiendo con el comportamiento de configuración del canal. `plugins.entries.browser.enabled=true` y `tools.alsoAllow: ["browser"]` no sustituyen por sí mismos la pertenencia a la lista de permitidos. Eliminar `plugins.allow` por completo también restaura el valor predeterminado.

## Perfiles: `openclaw` vs `user`

- `openclaw`: navegador administrado y aislado (no se requiere extensión).
- `user`: perfil de conexión MCP de Chrome integrado para su **sesión real de Chrome con inicio de sesión**.

Para las llamadas a la herramienta del navegador del agente:

- Predeterminado: use el navegador aislado `openclaw`.
- Prefiera `profile="user"` cuando importan las sesiones iniciadas existentes y el usuario
  está en la computadora para hacer clic/aprobar cualquier mensaje de conexión.
- `profile` es la anulación explícita cuando desea un modo de navegador específico.

Establezca `browser.defaultProfile: "openclaw"` si desea el modo administrado de forma predeterminada.

## Configuración

La configuración del navegador se encuentra en `~/.openclaw/openclaw.json`.

```json5
{
  browser: {
    enabled: true, // default: true
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    remoteCdpTimeoutMs: 1500, // remote CDP HTTP timeout (ms)
    remoteCdpHandshakeTimeoutMs: 3000, // remote CDP WebSocket handshake timeout (ms)
    localLaunchTimeoutMs: 15000, // local managed Chrome discovery timeout (ms)
    localCdpReadyTimeoutMs: 8000, // local managed post-launch CDP readiness timeout (ms)
    actionTimeoutMs: 60000, // default browser act timeout (ms)
    tabCleanup: {
      enabled: true, // default: true
      idleMinutes: 120, // set 0 to disable idle cleanup
      maxTabsPerSession: 8, // set 0 to disable the per-session cap
      sweepMinutes: 5,
    },
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: {
        driver: "existing-session",
        attachOnly: true,
        color: "#00AA00",
      },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

### Visión de captura de pantalla (compatibilidad con modelo de solo texto)

Cuando el modelo principal es de solo texto (sin soporte de visión/multimodal), las capturas de pantalla del navegador
devuelven bloques de imagen que el modelo no puede leer. Las capturas de pantalla del navegador
reutilizan la configuración existente de comprensión de imágenes, por lo que un modelo de imagen
configurado para la comprensión de medios puede describir las capturas de pantalla como texto sin ninguna
configuración de modelo específica del navegador.

```json5
{
  tools: {
    media: {
      image: {
        models: [
          { provider: "bytedance", model: "doubao-seed-2.0-pro" },
          // Add fallback candidates; first success wins
          { provider: "openai", model: "gpt-4o" },
        ],
      },
      // Shared media models also work when tagged for image support.
      // models: [{ provider: "openai", model: "gpt-4o", capabilities: ["image"] }],
    },
  },
  agents: {
    defaults: {
      // Existing image-model defaults are also honored.
      // imageModel: { primary: "openai/gpt-4o" },
    },
  },
}
```

**Cómo funciona:**

1. El agente llama a `browser screenshot` → imagen capturada en el disco como de costumbre.
2. La herramienta del navegador pregunta al tiempo de ejecución de comprensión de imágenes existente si puede describir la captura de pantalla utilizando modelos de imágenes multimedia configurados, modelos multimedia compartidos, valores predeterminados de modelos de imágenes o un proveedor de imágenes respaldado por autenticación.
3. El modelo de visión devuelve una descripción de texto, la cual se envuelve con `wrapExternalContent` (guarda contra la inyección de instrucciones) y se devuelve al agente como un bloque de texto en lugar de un bloque de imagen.
4. Si la comprensión de imágenes no está disponible, se omite o falla, el navegador recurre a devolver el bloque de imagen original.

Use los campos existentes `tools.media.image` / `tools.media.models` para modelos de respaldo, tiempos de espera, límites de bytes, perfiles y configuraciones de solicitudes del proveedor.

Si el modelo principal activo ya admite la visión y no se ha configurado ningún modelo explícito de comprensión de imágenes, OpenClaw mantiene el resultado de imagen normal para que el modelo principal pueda leer la captura de pantalla directamente.

<AccordionGroup>

<Accordion title="Puertos y accesibilidad">

- El servicio de control se vincula al loopback en un puerto derivado de `gateway.port` (predeterminado `18791` = gateway + 2). Anular `gateway.port` o `OPENCLAW_GATEWAY_PORT` desplaza los puertos derivados en la misma familia.
- Los perfiles `openclaw` locales asignan automáticamente `cdpPort`/`cdpUrl`; establezca esos solo para CDP remoto. `cdpUrl` de forma predeterminada es el puerto CDP local administrado cuando no está establecido.
- `remoteCdpTimeoutMs` se aplica a las comprobaciones de accesibilidad HTTP CDP y solicitudes HTTP de apertura de pestañas para CDP remoto y `attachOnly`; `remoteCdpHandshakeTimeoutMs` se aplica a sus apretones de mano WebSocket CDP.
- `localLaunchTimeoutMs` es el presupuesto para que un proceso administrado de Chrome lanzado localmente exponga su punto final HTTP CDP. `localCdpReadyTimeoutMs` es el presupuesto de seguimiento para la preparación del websocket CDP después de que se descubre el proceso. Aumente estos en Raspberry Pi, VPS de gama baja o hardware antiguo donde Chromium se inicia lentamente. Los valores deben ser enteros positivos hasta `120000` ms; los valores de configuración no válidos se rechazan.
- Los fallos repetidos de lanzamiento/preparación de Chrome administrado se interrumpen por circuito por perfil. Después de varios fallos consecutivos, OpenClaw pausa brevemente los nuevos intentos de lanzamiento en lugar de generar Chromium en cada llamada de herramienta del navegador. Corrija el problema de inicio, deshabilite el navegador si no es necesario o reinicie el Gateway después de la reparación.
- `actionTimeoutMs` es el presupuesto predeterminado para solicitudes `act` del navegador cuando la persona que llama no pasa `timeoutMs`. El transporte del cliente agrega una pequeña ventana de holgura para que las esperas largas puedan finalizar en lugar de agotar el tiempo de espera en el límite HTTP.
- `tabCleanup` es una limpieza de mejor esfuerzo para las pestañas abiertas por las sesiones del navegador del agente principal. La limpieza del ciclo de vida de subagente, cron y ACP aún cierra sus pestañas rastreadas explícitas al final de la sesión; las sesiones principales mantienen las pestañas activas reutilizables y luego cierran las pestañas rastreadas inactivas o excesivas en segundo plano.

</Accordion>

<Accordion title="Política SSRF">

- La navegación del navegador y la apertura de pestañas están protegidas contra SSRF antes de la navegación y se verifican con el mejor esfuerzo posteriormente en la URL final `http(s)`.
- En modo estricto SSRF, el descubrimiento de puntos de conexión CDP remotos y los sondeos `/json/version` (`cdpUrl`) también se verifican.
- Las variables de entorno del proveedor/pasarela `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` y `NO_PROXY` no representan automáticamente el navegador administrado por OpenClaw. Chrome administrado se inicia de forma directa por defecto, por lo que la configuración del proxy del proveedor no debilita las comprobaciones SSRF del navegador.
- Los sondeos de preparación CDP locales administrados por OpenClaw y las conexiones WebSocket de DevTools omiten el proxy de red administrado para el punto de conexión de bucle local exacto iniciado, por lo que `openclaw browser start` sigue funcionando cuando un proxy de operador bloquea la salida de bucle local.
- Para representar el propio navegador administrado, pase indicadores de proxy de Chrome explícitos a través de `browser.extraArgs`, como `--proxy-server=...` o `--proxy-pac-url=...`. El modo estricto SSRF bloquea el enrutamiento del proxy del navegador explícito a menos que se habilite intencionalmente el acceso al navegador de red privada.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` está desactivado por defecto; habilite solo cuando el acceso al navegador de red privada sea de confianza intencional.
- `browser.ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como alias heredado.

</Accordion>

<Accordion title="Comportamiento del perfil">

- `attachOnly: true` significa nunca iniciar un navegador local; solo conectarse si ya hay uno ejecutándose.
- `headless` se puede establecer globalmente o por perfil administrado local. Los valores por perfil anulan `browser.headless`, por lo que un perfil iniciado localmente puede permanecer sin cabeza mientras otro permanece visible.
- `POST /start?headless=true` y `openclaw browser start --headless` solicitan un
  inicio sin cabeza de un solo disparo para perfiles administrados locales sin reescribir
  `browser.headless` o la configuración del perfil. Los perfiles de sesión existente, solo conexión y
  CDP remoto rechazan la anulación porque OpenClaw no inicia esos
  procesos del navegador.
- En hosts Linux sin `DISPLAY` o `WAYLAND_DISPLAY`, los perfiles administrados locales
  pasan automáticamente a modo sin cabeza cuando ni el entorno ni la configuración
  del perfil/global eligen explícitamente el modo con cabeza. `openclaw browser status --json`
  informa `headlessSource` como `env`, `profile`, `config`,
  `request`, `linux-display-fallback`, o `default`.
- `OPENCLAW_BROWSER_HEADLESS=1` fuerza los inicios administrados locales al modo sin cabeza para el
  proceso actual. `OPENCLAW_BROWSER_HEADLESS=0` fuerza el modo con cabeza para los
  inicios ordinarios y devuelve un error accionable en hosts Linux sin un servidor de visualización;
  una solicitud explícita `start --headless` todavía tiene prioridad para ese inicio.
- `executablePath` se puede establecer globalmente o por perfil administrado local. Los valores por perfil anulan `browser.executablePath`, por lo que diferentes perfiles administrados pueden iniciar diferentes navegadores basados en Chromium. Ambas formas aceptan `~` para su directorio de inicio del sistema operativo.
- `color` (nivel superior y por perfil) tiñe la interfaz de usuario del navegador para que pueda ver qué perfil está activo.
- El perfil predeterminado es `openclaw` (independiente administrado). Use `defaultProfile: "user"` para optar por el navegador del usuario que ha iniciado sesión.
- Orden de autodetección: navegador predeterminado del sistema si está basado en Chromium; de lo contrario Chrome → Brave → Edge → Chromium → Chrome Canary.
- `driver: "existing-session"` usa Chrome DevTools MCP en lugar de CDP sin procesar. No establezca `cdpUrl` para ese controlador.
- Establezca `browser.profiles.<name>.userDataDir` cuando un perfil de sesión existente debe conectarse a un perfil de usuario de Chromium no predeterminado (Brave, Edge, etc.). Esta ruta también acepta `~` para su directorio de inicio del sistema operativo.

</Accordion>

</AccordionGroup>

## Usar Brave u otro navegador basado en Chromium

Si su navegador **predeterminado del sistema** está basado en Chromium (Chrome/Brave/Edge/etc.),
OpenClaw lo usa automáticamente. Establezca `browser.executablePath` para anular
la detección automática. Los valores `executablePath` de nivel superior y por perfil aceptan `~`
para su directorio de inicio del sistema operativo:

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

O configúrelo por plataforma:

<Tabs>
  <Tab title="macOS">
```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```
  </Tab>
  <Tab title="Windows">
```json5
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  },
}
```
  </Tab>
  <Tab title="Linux">
```json5
{
  browser: {
    executablePath: "/usr/bin/brave-browser",
  },
}
```
  </Tab>
</Tabs>

El `executablePath` por perfil solo afecta a los perfiles locales administrados que OpenClaw
inicia. Los perfiles `existing-session` se adjuntan a un navegador que ya se está ejecutando,
y los perfiles CDP remotos usan el navegador detrás de `cdpUrl`.

## Control local vs. remoto

- **Control local (predeterminado):** el Gateway inicia el servicio de control de bucle local y puede iniciar un navegador local.
- **Control remoto (host de nodo):** ejecute un host de nodo en la máquina que tiene el navegador; el Gateway actúa como proxy de las acciones del navegador hacia él.
- **CDP remoto:** configure `browser.profiles.<name>.cdpUrl` (o `browser.cdpUrl`) para
  adjuntar a un navegador remoto basado en Chromium. En este caso, OpenClaw no iniciará un navegador local.
- Para servicios CDP administrados externamente en bucle local (por ejemplo, Browserless en
  Docker publicado en `127.0.0.1`), también configure `attachOnly: true`. El CDP de bucle local
  sin `attachOnly` se trata como un perfil de navegador administrado local por OpenClaw.
- `headless` solo afecta a los perfiles locales administrados que OpenClaw inicia. No reinicia ni cambia los navegadores de sesión existentes o CDP remotos.
- `executablePath` sigue la misma regla de perfil local administrado. Cambiarlo en un
  perfil local administrado en ejecución marca ese perfil para reinicio/reconciliación, por lo que
  el siguiente inicio usa el nuevo binario.

El comportamiento de detención difiere según el modo de perfil:

- perfiles locales administrados: `openclaw browser stop` detiene el proceso del navegador que
  OpenClaw inició
- perfiles solo de conexión y CDP remoto: `openclaw browser stop` cierra la sesión
  de control activa y libera las anulaciones de emulación de Playwright/CDP (viewport,
  esquema de color, configuración regional, zona horaria, modo sin conexión y estados similares), aunque
  ningún proceso del navegador fue iniciado por OpenClaw

Las URLs de CDP remotas pueden incluir autenticación:

- Tokens de consulta (p. ej., `https://provider.example?token=<token>`)
- Autenticación básica HTTP (p. ej., `https://user:pass@provider.example`)

OpenClaw conserva la autenticación al llamar a los endpoints `/json/*` y al conectarse
al WebSocket de CDP. Se prefieren las variables de entorno o los gestores de secretos para
los tokens en lugar de confirmarlos en los archivos de configuración.

## Proxy del navegador de nodo (predeterminado sin configuración)

Si ejecuta un **host de nodo** en la máquina que tiene su navegador, OpenClaw puede
enrutar automáticamente las llamadas a las herramientas del navegador a ese nodo sin ninguna configuración adicional del navegador.
Esta es la ruta predeterminada para las pasarelas remotas.

Notas:

- El host de nodo expone su servidor de control del navegador local a través de un **comando de proxy**.
- Los perfiles provienen de la propia configuración `browser.profiles` del nodo (igual que la local).
- `nodeHost.browserProxy.allowProfiles` es opcional. Déjelo vacío para el comportamiento heredado/predeterminado: todos los perfiles configurados permanecen accesibles a través del proxy, incluidas las rutas de creación/eliminación de perfiles.
- Si establece `nodeHost.browserProxy.allowProfiles`, OpenClaw lo trata como un límite de privilegio mínimo: solo se pueden dirigir los perfiles en la lista de permitidos y las rutas de creación/eliminación de perfiles persistentes se bloquean en la superficie del proxy.
- Deshabilite si no lo desea:
  - En el nodo: `nodeHost.browserProxy.enabled=false`
  - En la pasarela: `gateway.nodes.browser.mode="off"`

## Browserless (CDP remoto alojado)

[Browserless](https://browserless.io) es un servicio de Chromium alojado que expone
URL de conexión CDP a través de HTTPS y WebSocket. OpenClaw puede usar cualquiera de las dos formas, pero
para un perfil de navegador remoto, la opción más simple es la URL directa de WebSocket
desde la documentación de conexión de Browserless.

Ejemplo:

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

Notas:

- Reemplace `<BROWSERLESS_API_KEY>` con su token real de Browserless.
- Elija el endpoint de la región que coincida con su cuenta de Browserless (consulte su documentación).
- Si Browserless le proporciona una URL base HTTPS, puede convertirla a
  `wss://` para una conexión CDP directa o mantener la URL HTTPS y dejar que OpenClaw
  descubra `/json/version`.

### Browserless Docker en el mismo host

Cuando Browserless es autohospedado en Docker y OpenClaw se ejecuta en el host, trate
Browserless como un servicio CDP administrado externamente:

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "ws://127.0.0.1:3000",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

La dirección en `browser.profiles.browserless.cdpUrl` debe ser accesible desde el
proceso de OpenClaw. Browserless también debe anunciar un endpoint accesible coincidente;
establezca `EXTERNAL` de Browserless a esa misma base WebSocket pública para OpenClaw, tal
como `ws://127.0.0.1:3000`, `ws://browserless:3000`, o una dirección de red
Docker privada estable. Si `/json/version` devuelve `webSocketDebuggerUrl` apuntando a
una dirección a la que OpenClaw no puede llegar, el HTTP de CDP puede parecer saludable mientras que la
conexión WebSocket aún falla.

No deje `attachOnly` sin establecer para un perfil Browserless de loopback. Sin
`attachOnly`, OpenClaw trata el puerto de loopback como un perfil de navegador
local administrado y puede informar que el puerto está en uso pero no es propiedad de OpenClaw.

## Proveedores de CDP WebSocket directo

Algunos servicios de navegador alojados exponen un endpoint **WebSocket directo** en lugar de
el descubrimiento CDP estándar basado en HTTP (`/json/version`). OpenClaw acepta tres
formas de URL de CDP y elige la estrategia de conexión correcta automáticamente:

- **Descubrimiento HTTP(S)** - `http://host[:port]` o `https://host[:port]`.
  OpenClaw llama a `/json/version` para descubrir la URL del depurador WebSocket, luego
  se conecta. Sin retorno a WebSocket.
- **Endpoints WebSocket directos** - `ws://host[:port]/devtools/<kind>/<id>` o
  `wss://...` con una ruta `/devtools/browser|page|worker|shared_worker|service_worker/<id>`
  . OpenClaw se conecta directamente a través de un handshake WebSocket y omite
  `/json/version` por completo.
- **Raíces WebSocket simples** - `ws://host[:port]` o `wss://host[:port]` sin
  ruta `/devtools/...` (p. ej. [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com)). OpenClaw intenta primero el
  descubrimiento HTTP `/json/version` (normalizando el esquema a `http`/`https`);
  si el descubrimiento devuelve un `webSocketDebuggerUrl`, se utiliza; de lo contrario, OpenClaw
  recurre a un protocolo de enlace WebSocket directo en la raíz simple. Si el punto de conexión
  WebSocket anunciado rechaza el protocolo de enlace CDP pero la raíz simple configurada
  lo acepta, OpenClaw también recurre a esa raíz. Esto permite que un `ws://` simple
  apuntado a un Chrome local todavía se conecte, ya que Chrome solo acepta actualizaciones
  WebSocket en la ruta específica por objetivo de `/json/version`, mientras que los
  proveedores alojados aún pueden usar su punto de conexión WebSocket raíz cuando su punto de conexión
  de descubrimiento anuncia una URL de corta duración que no es adecuada para Playwright CDP.

`openclaw browser doctor` utiliza la misma lógica de descubrimiento primero y respaldo WebSocket
que el adjunto en tiempo de ejecución, por lo que una URL de raíz simple que se conecta con éxito no
se reporta como inalcanzable por los diagnósticos.

### Browserbase

[Browserbase](https://www.browserbase.com) es una plataforma en la nube para ejecutar
navegadores sin cabeza con resolución de CAPTCHA integrada, modo sigiloso y proxies
residenciales.

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
        color: "#F97316",
      },
    },
  },
}
```

Notas:

- [Regístrate](https://www.browserbase.com/sign-up) y copia tu **API Key**
  desde el [panel de Overview](https://www.browserbase.com/overview).
- Reemplaza `<BROWSERBASE_API_KEY>` con tu API Key real de Browserbase.
- Browserbase crea automáticamente una sesión de navegador al conectarse mediante WebSocket, por lo que no
  se necesita ningún paso de creación de sesión manual.
- El nivel gratuito permite una sesión simultánea y una hora de navegador por mes.
  Consulta [precios](https://www.browserbase.com/pricing) para conocer los límites de los planes de pago.
- Consulta la [documentación de Browserbase](https://docs.browserbase.com) para obtener la referencia completa de la API,
  guías del SDK y ejemplos de integración.

### Notte

[Notte](https://www.notte.cc) es una plataforma en la nube para ejecutar navegadores
sin cabeza con sigilo integrado, proxies residenciales y una puerta de enlace
WebSocket nativa de CDP.

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "notte",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      notte: {
        cdpUrl: "wss://us-prod.notte.cc/sessions/connect?token=<NOTTE_API_KEY>",
        color: "#7C3AED",
      },
    },
  },
}
```

Notas:

- [Regístrate](https://console.notte.cc) y copia tu **API Key** desde la
  página de configuración de la consola.
- Reemplaza `<NOTTE_API_KEY>` con tu clave API real de Notte.
- Notte crea automáticamente una sesión de navegador al conectar por WebSocket, por lo que no se necesita
  ningún paso de creación manual de sesión. La sesión se destruye cuando se
  desconecta el WebSocket.
- El nivel gratuito permite cinco sesiones simultáneas y 100 horas de navegador
  de por vida. Consulta [precios](https://www.notte.cc/#pricing) para conocer los límites de los planes de pago.
- Consulte la [documentación de Notte](https://docs.notte.cc) para obtener la referencia completa de la API, guías
  del SDK y ejemplos de integración.

## Seguridad

Ideas clave:

- El control del navegador es solo de bucle local (loopback); el acceso fluye a través de la autenticación del Gateway o el emparejamiento de nodos.
- La API HTTP del navegador de bucle local independiente utiliza **solo autenticación de secreto compartido**:
  autenticación de portador de token de gateway, `x-openclaw-password`, o autenticación básica HTTP con la
  contraseña de gateway configurada.
- Los encabezados de identidad de Tailscale Serve y `gateway.auth.mode: "trusted-proxy"` **no**
  autentican esta API de navegador de bucle local independiente.
- Si el control del navegador está habilitado y no se configura ninguna autenticación de secreto compartido, OpenClaw
  genera un token de gateway solo para el tiempo de ejecución para ese inicio. Configure
  `gateway.auth.token`, `gateway.auth.password`, `OPENCLAW_GATEWAY_TOKEN` o
  `OPENCLAW_GATEWAY_PASSWORD` explícitamente si los clientes necesitan un secreto estable a través de
  reinicios.
- OpenClaw **no** genera automáticamente ese token cuando `gateway.auth.mode` ya
  es `password`, `none` o `trusted-proxy`.
- Mantenga el Gateway y cualquier host de nodos en una red privada (Tailscale); evite la exposición pública.
- Trate las URL/tokens de CDP remotos como secretos; prefiera variables de entorno o un administrador de secretos.

Consejos de CDP remoto:

- Prefiera puntos finales cifrados (HTTPS o WSS) y tokens de corta duración cuando sea posible.
- Evite incrustar tokens de larga duración directamente en los archivos de configuración.

## Perfiles (multinavegador)

OpenClaw admite múltiples perfiles con nombre (configuraciones de enrutamiento). Los perfiles pueden ser:

- **openclaw-managed**: una instancia de navegador dedicada basada en Chromium con su propio directorio de datos de usuario + puerto CDP
- **remote**: una URL CDP explícita (navegador basado en Chromium ejecutándose en otro lugar)
- **sesión existente**: tu perfil de Chrome existente a través de la autoconexión de Chrome DevTools MCP

Valores predeterminados:

- El perfil `openclaw` se crea automáticamente si falta.
- El perfil `user` está integrado para la conexión de sesión existente de Chrome MCP.
- Los perfiles de sesión existente son opcionales más allá de `user`; créalos con `--driver existing-session`.
- Los puertos locales CDP se asignan desde **18800-18899** de forma predeterminada.
- Eliminar un perfil mueve su directorio de datos local a la Papelera.

Todos los puntos de control aceptan `?profile=<name>`; la CLI usa `--browser-profile`.

## Sesión existente a través de Chrome DevTools MCP

OpenClaw también puede adjuntarse a un perfil de navegador basado en Chromium en ejecución a través del servidor oficial de Chrome DevTools MCP. Esto reutiliza las pestañas y el estado de sesión ya abiertos en ese perfil de navegador.

Referencias oficiales de antecedentes y configuración:

- [Chrome para desarrolladores: Usar Chrome DevTools MCP con tu sesión de navegador](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [README de Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Perfil integrado:

- `user`

Opcional: crea tu propio perfil personalizado de sesión existente si deseas un nombre, color o directorio de datos del navegador diferente.

Comportamiento predeterminado:

- El perfil integrado `user` usa la autoconexión de Chrome MCP, que apunta al perfil local predeterminado de Google Chrome.

Usa `userDataDir` para Brave, Edge, Chromium o un perfil de Chrome no predeterminado.
`~` se expande a tu directorio de inicio del sistema operativo:

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
    },
  },
}
```

Luego, en el navegador correspondiente:

1. Abre la página de inspección de ese navegador para la depuración remota.
2. Habilita la depuración remota.
3. Mantén el navegador en ejecución y aprueba el mensaje de conexión cuando OpenClaw se adjunte.

Páginas de inspección comunes:

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

Prueba de humeo de conexión en vivo:

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

Aspecto del éxito:

- `status` muestra `driver: existing-session`
- `status` muestra `transport: chrome-mcp`
- `status` muestra `running: true`
- `tabs` lista sus pestañas del navegador ya abiertas
- `snapshot` devuelve referencias de la pestaña en vivo seleccionada

Qué comprobar si la conexión no funciona:

- el navegador de destino basado en Chromium es la versión `144+`
- la depuración remota está habilitada en la página de inspección de ese navegador
- el navegador mostró y aceptó el mensaje de consentimiento de conexión
- `openclaw doctor` migra la antigua configuración del navegador basada en extensiones y comprueba que
  Chrome esté instalado localmente para los perfiles de autoconexión predeterminados, pero no puede
  habilitar la depuración remota del lado del navegador por usted

Uso del agente:

- Use `profile="user"` cuando necesite el estado del navegador conectado del usuario.
- Si usa un perfil de sesión existente personalizado, pase ese nombre de perfil explícito.
- Elija este modo solo cuando el usuario esté en la computadora para aprobar el mensaje de
  conexión.
- el Gateway o el host del nodo puede iniciar `npx chrome-devtools-mcp@latest --autoConnect`

Notas:

- Esta ruta es de mayor riesgo que el perfil aislado `openclaw` porque puede
  actuar dentro de su sesión de navegador conectada.
- OpenClaw no inicia el navegador para este controlador; solo se conecta.
- OpenClaw usa el flujo oficial de MCP de Chrome DevTools `--autoConnect` aquí. Si
  `userDataDir` está configurado, se pasa para apuntar a ese directorio de datos de usuario.
- Sesión existente puede conectarse en el host seleccionado o a través de un
  nodo de navegador conectado. Si Chrome está en otro lugar y no hay ningún nodo de navegador conectado, use
  CDP remoto o un host de nodo en su lugar.

### Lanzamiento personalizado de Chrome MCP

Anule el servidor MCP de Chrome DevTools iniciado por perfil cuando el flujo
`npx chrome-devtools-mcp@latest` predeterminado no sea lo que desea (hosts fuera de línea,
versiones fijas, binarios propios):

| Campo        | Lo que hace                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mcpCommand` | Ejecutable para iniciar en lugar de `npx`. Se resuelve tal cual; se respetan las rutas absolutas.                                                    |
| `mcpArgs`    | Matriz de argumentos pasada palabra por palabra a `mcpCommand`. Reemplaza los argumentos `chrome-devtools-mcp@latest --autoConnect` predeterminados. |

Cuando `cdpUrl` está configurado en un perfil de sesión existente, OpenClaw omite
`--autoConnect` y reenvía el endpoint a Chrome MCP automáticamente:

- `http(s)://...` → `--browserUrl <url>` (punto de conexión HTTP de detección de DevTools).
- `ws(s)://...` → `--wsEndpoint <url>` (WebSocket CDP directo).

Las marcas de punto de conexión y `userDataDir` no se pueden combinar: cuando `cdpUrl` está establecido,
`userDataDir` se ignora para el inicio de Chrome MCP, ya que Chrome MCP se conecta al
navegador en ejecución detrás del punto de conexión en lugar de abrir un directorio de
perfil.

<Accordion title="Limitaciones de la función de sesión existente">

Comparado con el perfil gestionado `openclaw`, los controladores de sesión existente son más limitados:

- **Capturas de pantalla** - las capturas de página y las capturas de elementos `--ref` funcionan; los selectores CSS `--element` no. `--full-page` no puede combinarse con `--ref` o `--element`. No se requiere Playwright para capturas de pantalla de página o de elementos basados en referencias.
- **Acciones** - `click`, `type`, `hover`, `scrollIntoView`, `drag` y `select` requieren referencias de instantánea (sin selectores CSS). `click-coords` hace clic en las coordenadas visibles del viewport y no requiere una referencia de instantánea. `click` es solo del botón izquierdo. `type` no admite `slowly=true`; use `fill` o `press`. `press` no admite `delayMs`. `type`, `hover`, `scrollIntoView`, `drag`, `select`, `fill` y `evaluate` no admiten tiempos de espera por llamada. `select` acepta un solo valor.
- **Esperar / subir / diálogo** - `wait --url` admite patrones exactos, de subcadena y glob; `wait --load networkidle` no es compatible. Los enlaces de carga requieren `ref` o `inputRef`, un archivo a la vez, sin CSS `element`. Los enlaces de diálogo no admiten anulaciones de tiempo de espera ni `dialogId`.
- **Visibilidad del diálogo** - Las respuestas de acción del navegador gestionado incluyen `blockedByDialog` y `browserState.dialogs.pending` cuando una acción abre un diálogo modal; las instantáneas también incluyen el estado del diálogo pendiente. Responda con `browser dialog --accept/--dismiss --dialog-id <id>` mientras haya un diálogo pendiente. Los diálogos manejados fuera de OpenClaw aparecen en `browserState.dialogs.recent`.
- **Funciones exclusivas del modo gestionado** - las acciones por lotes, la exportación de PDF, la interceptación de descargas y `responsebody` aún requieren la ruta del navegador gestionado.

</Accordion>

## Garantías de aislamiento

- **Directorio de datos de usuario dedicado**: nunca toca tu perfil de navegador personal.
- **Puertos dedicados**: evita `9222` para prevenir colisiones con flujos de trabajo de desarrollo.
- **Control determinista de pestañas**: `tabs` devuelve primero `suggestedTargetId`, luego
  identificadores `tabId` estables como `t1`, etiquetas opcionales y el `targetId` sin procesar.
  Los agentes deben reutilizar `suggestedTargetId`; los identificadores sin procesar siguen disponibles para
  depuración y compatibilidad.

## Selección del navegador

Al iniciar localmente, OpenClaw selecciona el primero disponible:

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Puedes anular esto con `browser.executablePath`.

Plataformas:

- macOS: comprueba `/Applications` y `~/Applications`.
- Linux: comprueba ubicaciones comunes de Chrome/Brave/Edge/Chromium bajo `/usr/bin`,
  `/snap/bin`, `/opt/google`, `/opt/brave.com`, `/usr/lib/chromium` y
  `/usr/lib/chromium-browser`, además de Chromium gestionado por Playwright bajo
  `PLAYWRIGHT_BROWSERS_PATH` o `~/.cache/ms-playwright`.
- Windows: comprueba ubicaciones de instalación comunes.

## API de control (opcional)

Para el uso de scripts y depuración, Gateway expone una pequeña **API de control
HTTP solo de bucle local** junto con una CLI `openclaw browser` correspondiente (instantáneas, referencias, mejoras
de espera, salida JSON, flujos de trabajo de depuración). Consulta
[Browser control API](/es/tools/browser-control) para obtener la referencia completa.

## Solución de problemas

Para problemas específicos de Linux (especialmente Chromium snap), consulta
[Browser troubleshooting](/es/tools/browser-linux-troubleshooting).

Para configuraciones de Gateway WSL2 + Chrome Windows con host dividido, consulta
[WSL2 + Windows + remote Chrome CDP troubleshooting](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

### Fallo de inicio de CDP frente a bloqueo de navegación SSRF

Estas son diferentes clases de fallo y apuntan a diferentes rutas de código.

- **Fallo de inicio o preparación de CDP** significa que OpenClaw no puede confirmar que el plano de control del navegador está sano.
- **Bloqueo de navegación por SSRF** significa que el plano de control del navegador está saludable, pero un destino de navegación de página es rechazado por la política.

Ejemplos comunes:

- Fallo de inicio o preparación de CDP:
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - `Port <port> is in use for profile "<name>" but not by openclaw` cuando un
    servicio CDP externo de loopback está configurado sin `attachOnly: true`
- Bloqueo de navegación por SSRF:
  - `open`, `navigate`, instantánea, o flujos de apertura de pestañas fallan con un error de política de navegador/red mientras que `start` y `tabs` todavía funcionan

Use esta secuencia mínima para separar los dos:

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

Cómo leer los resultados:

- Si `start` falla con `not reachable after start`, solucione primero la preparación de CDP.
- Si `start` tiene éxito pero `tabs` falla, el plano de control todavía no está saludable. Trate esto como un problema de alcance de CDP, no como un problema de navegación de página.
- Si `start` y `tabs` tienen éxito pero `open` o `navigate` fallan, el plano de control del navegador está activo y el fallo está en la política de navegación o en la página de destino.
- Si `start`, `tabs`, y `open` todos tienen éxito, la ruta de control básica del navegador administrado está saludable.

Detalles importantes del comportamiento:

- La configuración del navegador por defecto es un objeto de política SSRF de "fail-closed" (cerrar en fallo) incluso cuando no configura `browser.ssrfPolicy`.
- Para el perfil administrado `openclaw` de loopback local, las verificaciones de salud de CDP omiten intencionalmente la aplicación de alcance de SSRF del navegador para el plano de control local propio de OpenClaw.
- La protección de navegación es separada. Un resultado exitoso de `start` o `tabs` no significa que un destino posterior de `open` o `navigate` esté permitido.

Guía de seguridad:

- **No** relaje la política SSRF del navegador por defecto.
- Prefiera excepciones de host estrechas como `hostnameAllowlist` o `allowedHostnames` sobre el acceso amplio a la red privada.
- Use `dangerouslyAllowPrivateNetwork: true` solo en entornos confiables intencionales donde se requiera y revise el acceso al navegador de red privada.

## Herramientas del agente + cómo funciona el control

El agente obtiene **una herramienta** para la automatización del navegador:

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Cómo se mapea:

- `browser snapshot` devuelve un árbol de interfaz de usuario estable (AI o ARIA).
- `browser act` usa las IDs de la instantánea `ref` para hacer clic/escribir/arrastrar/seleccionar.
- `browser screenshot` captura píxeles (página completa, elemento o referencias etiquetadas).
- `browser doctor` comprueba la preparación de Gateway, complemento, perfil, navegador y pestaña.
- `browser` acepta:
  - `profile` para elegir un perfil de navegador con nombre (openclaw, chrome o CDP remoto).
  - `target` (`sandbox` | `host` | `node`) para seleccionar dónde reside el navegador.
  - En sesiones aisladas, `target: "host"` requiere `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si se omite `target`: las sesiones aisladas usan `sandbox` de forma predeterminada, las sesiones sin aislamiento usan `host` de forma predeterminada.
  - Si hay conectado un nodo con capacidad de navegador, la herramienta puede enrutar automáticamente a él a menos que ancle `target="host"` o `target="node"`.

Esto mantiene al agente determinista y evita selectores frágiles.

## Relacionado

- [Resumen de herramientas](/es/tools) - todas las herramientas de agente disponibles
- [Aislamiento (Sandboxing)](/es/gateway/sandboxing) - control del navegador en entornos aislados
- [Seguridad](/es/gateway/security) - riesgos y endurecimiento del control del navegador
