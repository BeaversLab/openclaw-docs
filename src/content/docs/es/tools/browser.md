---
summary: "Servicio de control integrado del navegador + comandos de acción"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "Navegador (administrado por OpenClaw)"
---

OpenClaw puede ejecutar un **perfil dedicado de Chrome/Brave/Edge/Chromium** que controla el agente.
Está aislado de su navegador personal y se administra a través de un pequeño servicio de
control local dentro de Gateway (solo loopback).

Vista de principiante:

- Piénselo como un **navegador separado, solo para el agente**.
- El perfil `openclaw` **no** toca su perfil de navegador personal.
- El agente puede **abrir pestañas, leer páginas, hacer clic y escribir** en un carril seguro.
- El perfil `user` incorporado se adjunta a su sesión real de Chrome iniciada a través de Chrome MCP.

## Lo que obtienes

- Un perfil de navegador separado llamado **openclaw** (acentos naranjas por defecto).
- Control determinista de pestañas (listar/abrir/enfocar/cerrar).
- Acciones del agente (clic/escribir/arrastrar/seleccionar), instantáneas, capturas de pantalla, PDFs.
- Una habilidad `browser-automation` incluida que enseña a los agentes el bucle de recuperación de instantánea,
  pestaña-estable, referencia-anticuada y bloqueador-manual cuando el complemento
  del navegador está habilitado.
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

Si `openclaw browser` falta por completo, o el agente dice que la herramienta del navegador
no está disponible, vaya a [Missing browser command or tool](/es/tools/browser#missing-browser-command-or-tool).

## Control de complementos

La herramienta `browser` predeterminada es un complemento incluido. Desactívela para reemplazarla con otro complemento que registre el mismo nombre de herramienta `browser`:

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

Nota sobre el perfil de herramientas: `tools.profile: "coding"` incluye `web_search` y
`web_fetch`, pero no incluye la herramienta completa `browser`. Si el agente o un
subagente generado debe usar la automatización del navegador, agregue el navegador en la etapa
de perfil:

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Para un solo agente, use `agents.list[].tools.alsoAllow: ["browser"]`.
`tools.subagents.tools.allow: ["browser"]` solo no es suficiente porque la política del subagente
se aplica después del filtrado de perfiles.

El complemento del navegador incluye dos niveles de guía para el agente:

- La descripción de la herramienta `browser` lleva el contrato compacto siempre activo: elija
  el perfil correcto, mantenga las referencias en la misma pestaña, use `tabId`/etiquetas para la orientación de pestañas
  y cargue la habilidad del navegador para trabajo de varios pasos.
- La habilidad `browser-automation` incluida lleva el bucle de operación más largo:
  verifique el estado/pestañas primero, etiquete las pestañas de tareas, tome una instantánea antes de actuar, vuelva a tomarla
  después de los cambios de la interfaz de usuario, recupere las referencias obsoletas una vez y reporte el inicio de sesión/2FA/captcha o
  bloqueadores de cámara/micrófono como acción manual en lugar de adivinar.

Las habilidades incluidas en el complemento se enumeran en las habilidades disponibles del agente cuando el
complemento está habilitado. Las instrucciones completas de la habilidad se cargan bajo demanda, por lo que las
rotinas de rutina no pagan el costo completo de tokens.

## Falta el comando o herramienta del navegador

Si `openclaw browser` es desconocido después de una actualización, falta `browser.request`, o el agente reporta que la herramienta del navegador no está disponible, la causa habitual es una lista `plugins.allow` que omite `browser` y no existe ningún bloque de configuración raíz `browser`. Agréguelo:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

Un bloque raíz `browser` explícito, por ejemplo `browser.enabled=true` o `browser.profiles.<name>`, activa el complemento del navegador incluido incluso bajo un `plugins.allow` restrictivo, coincidiendo con el comportamiento de configuración del canal. `plugins.entries.browser.enabled=true` y `tools.alsoAllow: ["browser"]` no sustituyen la pertenencia a la lista de permitidos por sí mismos. Eliminar `plugins.allow` por completo también restaura el valor predeterminado.

## Perfiles: `openclaw` vs `user`

- `openclaw`: navegador administrado y aislado (no se requiere extensión).
- `user`: perfil de conexión MCP de Chrome integrado para su sesión **real de Chrome con inicio de sesión**
  .

Para las llamadas a la herramienta del navegador del agente:

- Predeterminado: use el navegador aislado `openclaw`.
- Prefiera `profile="user"` cuando las sesiones iniciadas existentes sean importantes y el usuario
  esté en la computadora para hacer clic/aprobar cualquier mensaje de conexión.
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

<AccordionGroup>

<Accordion title="Puertos y accesibilidad">

- El servicio de control se enlaza al bucle local en un puerto derivado de `gateway.port` (predeterminado `18791` = puerta de enlace + 2). Al anular `gateway.port` o `OPENCLAW_GATEWAY_PORT` se desplazan los puertos derivados en la misma familia.
- Los perfiles `openclaw` locales asignan automáticamente `cdpPort`/`cdpUrl`; configure esos solo para CDP remoto. `cdpUrl` usa por defecto el puerto CDP local administrado cuando no está configurado.
- `remoteCdpTimeoutMs` se aplica a las comprobaciones de accesibilidad HTTP de CDP remoto y `attachOnly`
  y a las solicitudes HTTP de apertura de pestañas; `remoteCdpHandshakeTimeoutMs` se aplica a
  sus protocolos de enlace (handshakes) WebSocket de CDP.
- `localLaunchTimeoutMs` es el presupuesto para que un proceso Chrome administrado iniciado localmente
  exponga su punto final HTTP CDP. `localCdpReadyTimeoutMs` es el
  presupuesto de seguimiento para la preparación del websocket CDP después de que se descubre el proceso.
  Aumente estos valores en Raspberry Pi, VPS de gama baja o hardware antiguo donde Chromium
  se inicia lentamente. Los valores deben ser enteros positivos de hasta `120000` ms; los valores
  de configuración no válidos se rechazan.
- Los fallos repetidos de inicio/ preparación de Chrome administrado se interrumpen por circuito por
  perfil. Después de varios fallos consecutivos, OpenClaw pausa brevemente los nuevos intentos de
  inicio en lugar de generar Chromium en cada llamada a la herramienta del navegador. Solucione
  el problema de inicio, deshabilite el navegador si no es necesario, o reinicie
  la Gateway después de la reparación.
- `actionTimeoutMs` es el presupuesto predeterminado para las solicitudes `act` del navegador cuando el autor de la llamada no pasa `timeoutMs`. El transporte del cliente añade una pequeña ventana de holgura para que las esperas largas puedan terminar en lugar de agotarse en el límite HTTP.
- `tabCleanup` es una limpieza de mejor esfuerzo para las pestañas abiertas por las sesiones del navegador del agente principal. La limpieza del ciclo de vida de subagentes, cron y ACP todavía cierra sus pestañas rastreadas explícitas al final de la sesión; las sesiones principales mantienen las pestañas activas reutilizables y luego cierran las pestañas rastreadas inactivas o excesivas en segundo plano.

</Accordion>

<Accordion title="Política SSRF">

- La navegación del navegador y la apertura de pestañas están protegidas contra SSRF antes de la navegación y se verifican con el mayor esfuerzo posible en la URL `http(s)` final después.
- En el modo SSRF estricto, el descubrimiento de puntos de conexión CDP remotos y los sondeos `/json/version` (`cdpUrl`) también se verifican.
- Las variables de entorno `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` y `NO_PROXY` del proveedor/pasarela no actúan como proxy automático para el navegador gestionado por OpenClaw. Chrome gestionado se inicia directamente de forma predeterminada, por lo que la configuración del proxy del proveedor no debilita las comprobaciones SSRF del navegador.
- Para usar proxy en el propio navegador gestionado, pase indicadores de proxy de Chrome explícitos a través de `browser.extraArgs`, como `--proxy-server=...` o `--proxy-pac-url=...`. El modo SSRF estricto bloquea el enrutamiento de proxy del navegador explícito a menos que se habilite intencionalmente el acceso al navegador desde la red privada.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` está desactivado de forma predeterminada; habilítelo solo cuando el acceso al navegador desde la red privada sea de confianza intencional.
- `browser.ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como alias heredado.

</Accordion>

<Accordion title="Perfil de comportamiento">

- `attachOnly: true` significa nunca iniciar un navegador local; solo adjuntar si ya hay uno ejecutándose.
- `headless` se puede configurar globalmente o por perfil local administrado. Los valores por perfil anulan `browser.headless`, por lo que un perfil iniciado localmente puede permanecer sin cabeza mientras otro permanece visible.
- `POST /start?headless=true` y `openclaw browser start --headless` solicitan un
  inicio sin cabeza de un solo disparo para perfiles locales administrados sin reescribir
  `browser.headless` o la configuración del perfil. Los perfiles de sesión existente, solo adjuntar y
  CDP remoto rechazan la anulación porque OpenClaw no inicia esos
  procesos del navegador.
- En hosts Linux sin `DISPLAY` o `WAYLAND_DISPLAY`, los perfiles locales administrados
  pasan automáticamente a sin cabeza cuando ni el entorno ni la configuración del perfil/global
  eligen explícitamente el modo con cabeza. `openclaw browser status --json`
  informa `headlessSource` como `env`, `profile`, `config`,
  `request`, `linux-display-fallback`, o `default`.
- `OPENCLAW_BROWSER_HEADLESS=1` fuerza los inicios locales administrados sin cabeza para el
  proceso actual. `OPENCLAW_BROWSER_HEADLESS=0` fuerza el modo con cabeza para
  inicios ordinarios y devuelve un error accionable en hosts Linux sin un servidor de pantalla;
  una solicitud explícita `start --headless` todavía tiene prioridad para ese inicio.
- `executablePath` se puede configurar globalmente o por perfil local administrado. Los valores por perfil anulan `browser.executablePath`, por lo que diferentes perfiles administrados pueden iniciar diferentes navegadores basados en Chromium. Ambas formas aceptan `~` para su directorio de inicio del sistema operativo.
- `color` (nivel superior y por perfil) tiñe la interfaz de usuario del navegador para que pueda ver qué perfil está activo.
- El perfil predeterminado es `openclaw` (independiente administrado). Use `defaultProfile: "user"` para optar por el navegador del usuario que ha iniciado sesión.
- Orden de autodetección: navegador predeterminado del sistema si está basado en Chromium; de lo contrario Chrome → Brave → Edge → Chromium → Chrome Canary.
- `driver: "existing-session"` usa Chrome DevTools MCP en lugar de CDP sin procesar. No configure `cdpUrl` para ese controlador.
- Configure `browser.profiles.<name>.userDataDir` cuando un perfil de sesión existente debe adjuntarse a un perfil de usuario de Chromium no predeterminado (Brave, Edge, etc.). Esta ruta también acepta `~` para su directorio de inicio del sistema operativo.

</Accordion>

</AccordionGroup>

## Usar Brave u otro navegador basado en Chromium

Si su navegador **predeterminado del sistema** está basado en Chromium (Chrome/Brave/Edge/etc),
OpenClaw lo usa automáticamente. Establezca `browser.executablePath` para anular la
detección automática. Los valores `executablePath` de nivel superior y por perfil aceptan `~`
para su directorio de inicio del sistema operativo:

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

O establézcalo en la configuración, por plataforma:

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

El `executablePath` por perfil solo afecta a los perfiles administrados locales que OpenClaw
inicia. Los perfiles `existing-session` se adjuntan en su lugar a un navegador
que ya se está ejecutando, y los perfiles CDP remotos usan el navegador detrás de `cdpUrl`.

## Control local vs. remoto

- **Control local (predeterminado):** el Gateway inicia el servicio de control de bucle local (loopback) y puede iniciar un navegador local.
- **Control remoto (host de nodo):** ejecute un host de nodo en la máquina que tiene el navegador; el Gateway actúa como proxy de las acciones del navegador hacia él.
- **CDP remoto:** establezca `browser.profiles.<name>.cdpUrl` (o `browser.cdpUrl`) para
  adjuntarse a un navegador remoto basado en Chromium. En este caso, OpenClaw no iniciará un navegador local.
- Para servicios CDP administrados externamente en bucle local (por ejemplo, Browserless en
  Docker publicado en `127.0.0.1`), también establezca `attachOnly: true`. El CDP de
  bucle local sin `attachOnly` se trata como un perfil de navegador administrado localmente por OpenClaw.
- `headless` solo afecta a los perfiles administrados locales que OpenClaw inicia. No reinicia ni cambia los navegadores de sesión existentes ni los CDP remotos.
- `executablePath` sigue la misma regla de perfil administrado local. Cambiarlo en un
  perfil administrado local en ejecución marca ese perfil para reinicio/reconciliación para que el
  próximo lanzamiento use el nuevo binario.

El comportamiento al detenerse difiere según el modo de perfil:

- perfiles administrados locales: `openclaw browser stop` detiene el proceso del navegador que
  OpenClaw inició
- perfiles de solo adjuntar y CDP remoto: `openclaw browser stop` cierra la sesión de
  control activa y libera las anulaciones de emulación de Playwright/CDP (ventana,
  esquema de color, configuración regional, zona horaria, modo sin conexión y estados similares), aunque
  ningún proceso del navegador haya sido iniciado por OpenClaw

Las URL de CDP remotas pueden incluir autenticación:

- Tokens de consulta (por ejemplo, `https://provider.example?token=<token>`)
- Autenticación básica HTTP (por ejemplo, `https://user:pass@provider.example`)

OpenClaw conserva la autenticación al llamar a los puntos finales `/json/*` y al conectarse
al WebSocket de CDP. Se prefieren las variables de entorno o gestores de secretos para
los tokens en lugar de confirmarlos en los archivos de configuración.

## Proxy del navegador de nodo (predeterminado sin configuración)

Si ejecuta un **host de nodo** en la máquina que tiene su navegador, OpenClaw puede
enrutar automáticamente las llamadas a herramientas del navegador a ese nodo sin ninguna configuración adicional del navegador.
Esta es la ruta predeterminada para gateways remotos.

Notas:

- El host de nodo expone su servidor de control de navegador local a través de un **comando de proxy**.
- Los perfiles provienen de la configuración `browser.profiles` del propio nodo (igual que el local).
- `nodeHost.browserProxy.allowProfiles` es opcional. Déjelo vacío para el comportamiento heredado/predeterminado: todos los perfiles configurados permanecen accesibles a través del proxy, incluidas las rutas de creación/eliminación de perfiles.
- Si establece `nodeHost.browserProxy.allowProfiles`, OpenClaw lo trata como un límite de mínimo privilegio: solo se pueden dirigir los perfiles en la lista de permitidos, y las rutas de creación/eliminación de perfiles persistentes se bloquean en la superficie del proxy.
- Deshabilitar si no lo desea:
  - En el nodo: `nodeHost.browserProxy.enabled=false`
  - En el gateway: `gateway.nodes.browser.mode="off"`

## Browserless (CDP remoto alojado)

[Browserless](https://browserless.io) es un servicio alojado de Chromium que expone
URL de conexión CDP a través de HTTPS y WebSocket. OpenClaw puede usar cualquiera de las dos formas, pero
para un perfil de navegador remoto, la opción más sencilla es la URL directa de WebSocket
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
- Elija el punto final de la región que coincida con su cuenta de Browserless (consulte su documentación).
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
configure Browserless `EXTERNAL` a esa misma base WebSocket pública para OpenClaw, tal
como `ws://127.0.0.1:3000`, `ws://browserless:3000`, o una dirección de red Docker
privada estable. Si `/json/version` devuelve `webSocketDebuggerUrl` apuntando a
una dirección que OpenClaw no puede alcanzar, el CDP HTTP puede parecer saludable mientras que la conexión
WebSocket aún falla.

No deje `attachOnly` sin configurar para un perfil Browserless de bucle de retorno (loopback). Sin
`attachOnly`, OpenClaw trata el puerto de bucle de retorno como un perfil de navegador
local administrado y puede reportar que el puerto está en uso pero no es propiedad de OpenClaw.

## Proveedores de CDP WebSocket directo

Algunos servicios de navegador hospedados exponen un endpoint **WebSocket directo** en lugar de
el descubrimiento CDP estándar basado en HTTP (`/json/version`). OpenClaw acepta tres
formas de URL CDP y elige la estrategia de conexión correcta automáticamente:

- **Descubrimiento HTTP(S)** - `http://host[:port]` o `https://host[:port]`.
  OpenClaw llama a `/json/version` para descubrir la URL del depurador WebSocket, luego
  se conecta. Sin reserva de WebSocket.
- **Endpoints directos de WebSocket** - `ws://host[:port]/devtools/<kind>/<id>` o
  `wss://...` con una ruta `/devtools/browser|page|worker|shared_worker|service_worker/<id>`
  . OpenClaw se conecta directamente a través de un protocolo de enlace WebSocket y omite
  `/json/version` por completo.
- **Raíces WebSocket desnudas** - `ws://host[:port]` o `wss://host[:port]` sin ninguna
  ruta `/devtools/...` (por ejemplo, [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com)). OpenClaw intenta primero el descubrimiento HTTP
  `/json/version` (normalizando el esquema a `http`/`https`);
  si el descubrimiento devuelve un `webSocketDebuggerUrl`, se usa; de lo contrario, OpenClaw
  recurre a un protocolo de enlace WebSocket directo en la raíz desnuda. Si el punto de conexión
  WebSocket anunciado rechaza el protocolo de enlace CDP pero la raíz desnuda configurada
  lo acepta, OpenClaw también recurre a esa raíz. Esto permite que una `ws://` desnuda
  apuntada a un Chrome local aún se conecte, ya que Chrome solo acepta actualizaciones
  WebSocket en la ruta específica por objetivo de `/json/version`, mientras que los proveedores
  alojados aún pueden usar su punto de conexión WebSocket raíz cuando su punto de conexión
  de descubrimiento anuncia una URL de corta duración que no es adecuada para Playwright CDP.

### Browserbase

[Browserbase](https://www.browserbase.com) es una plataforma en la nube para ejecutar
navegadores sin cabeza con resolución de CAPTCHA integrada, modo sigiloso y
proxies residenciales.

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

- [Regístrese](https://www.browserbase.com/sign-up) y copie su **API Key**
  desde el [panel de descripción general](https://www.browserbase.com/overview).
- Reemplace `<BROWSERBASE_API_KEY>` con su API Key real de Browserbase.
- Browserbase crea automáticamente una sesión de navegador al conectar por WebSocket, por lo que no
  se necesita ningún paso de creación manual de sesión.
- El nivel gratuito permite una sesión simultánea y una hora de navegador por mes.
  Consulte [precios](https://www.browserbase.com/pricing) para conocer los límites de los planes de pago.
- Consulte la [documentación de Browserbase](https://docs.browserbase.com) para obtener la referencia completa de la API,
  guías de SDK y ejemplos de integración.

## Seguridad

Ideas clave:

- El control del navegador es solo de bucle local (loopback); el acceso fluye a través de la autenticación del Gateway o el emparejamiento de nodos.
- La API HTTP del navegador de bucle invertido independiente usa **solo autenticación de secreto compartido**:
  autenticación de portador de token de puerta de enlace, `x-openclaw-password`, o autenticación básica HTTP con la
  contraseña de puerta de enlace configurada.
- Los encabezados de identidad de Tailscale Serve y `gateway.auth.mode: "trusted-proxy"` no
  autentican esta API de navegador de bucle local independiente.
- Si el control del navegador está habilitado y no se ha configurado la autenticación de secreto compartido, OpenClaw
  genera un token de Gateway solo para el tiempo de ejecución para ese inicio. Configura
  `gateway.auth.token`, `gateway.auth.password`, `OPENCLAW_GATEWAY_TOKEN` o
  `OPENCLAW_GATEWAY_PASSWORD` explícitamente si los clientes necesitan un secreto estable entre
  reinicios.
- OpenClaw **no** genera automáticamente ese token cuando `gateway.auth.mode` ya es
  `password`, `none` o `trusted-proxy`.
- Mantén el Gateway y cualquier host de nodos en una red privada (Tailscale); evita la exposición pública.
- Trata las URLs/tokens de CDP remotos como secretos; prefiere las variables de entorno o un administrador de secretos.

Consejos de CDP remoto:

- Prefiere puntos finales cifrados (HTTPS o WSS) y tokens de corta duración cuando sea posible.
- Evita incrustar tokens de larga duración directamente en los archivos de configuración.

## Perfiles (multinavegador)

OpenClaw admite varios perfiles con nombre (configuraciones de enrutamiento). Los perfiles pueden ser:

- **openclaw-managed**: una instancia de navegador basada en Chromium dedicada con su propio directorio de datos de usuario + puerto CDP
- **remote**: una URL de CDP explícita (navegador basado en Chromium ejecutándose en otro lugar)
- **existing session**: tu perfil de Chrome existente mediante autoconexión de Chrome DevTools MCP

Valores predeterminados:

- El perfil `openclaw` se crea automáticamente si falta.
- El perfil `user` está integrado para la conexión a sesiones existentes de Chrome MCP.
- Los perfiles de sesiones existentes son opcionales más allá de `user`; créalos con `--driver existing-session`.
- Los puertos locales de CDP se asignan desde **18800-18899** de forma predeterminada.
- Al eliminar un perfil, su directorio de datos locales se mueve a la Papelera.

Todos los endpoints de control aceptan `?profile=<name>`; la CLI usa `--browser-profile`.

## Sesión existente a través de Chrome DevTools MCP

OpenClaw también puede conectarse a un perfil de navegador basado en Chromium en ejecución a través del
servidor oficial MCP de Chrome DevTools. Esto reutiliza las pestañas y el estado de inicio de sesión
ya abiertos en ese perfil de navegador.

Referencias oficiales de antecedentes y configuración:

- [Chrome para desarrolladores: Usar Chrome DevTools MCP con su sesión del navegador](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [LÉAME de Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Perfil integrado:

- `user`

Opcional: crea tu propio perfil de sesión existente personalizado si quieres un
nombre, color o directorio de datos del navegador diferente.

Comportamiento predeterminado:

- El perfil integrado `user` usa la autoconexión de Chrome MCP, que tiene como objetivo
  el perfil local predeterminado de Google Chrome.

Usa `userDataDir` para Brave, Edge, Chromium o un perfil de Chrome no predeterminado.
`~` se expande a tu directorio de inicio del SO:

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
3. Mantén el navegador ejecutándose y aprueba el indicador de conexión cuando OpenClaw se adjunte.

Páginas de inspección comunes:

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

Prueba de humo de conexión en vivo:

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
- `tabs` enumera las pestañas del navegador que ya tienes abiertas
- `snapshot` devuelve referencias de la pestaña en vivo seleccionada

Qué verificar si la conexión no funciona:

- el navegador de destino basado en Chromium es la versión `144+`
- la depuración remota está habilitada en la página de inspección de ese navegador
- el navegador mostró y aceptaste el indicador de consentimiento de conexión
- `openclaw doctor` migra la configuración antigua del navegador basada en extensiones y verifica que
  Chrome esté instalado localmente para los perfiles de autoconexión predeterminados, pero no puede
  habilitar la depuración remota del lado del navegador por usted

Uso del agente:

- Use `profile="user"` cuando necesite el estado del navegador conectado del usuario.
- Si usas un perfil de sesión existente personalizado, pasa ese nombre de perfil explícito.
- Elige este modo solo cuando el usuario esté en la computadora para aprobar el indicador
  de conexión.
- el Gateway o el host del nodo pueden generar `npx chrome-devtools-mcp@latest --autoConnect`

Notas:

- Esta ruta conlleva más riesgo que el perfil aislado `openclaw` porque puede
  actuar dentro de su sesión de navegador conectada.
- OpenClaw no inicia el navegador para este controlador; solo se adjunta.
- OpenClaw utiliza el flujo oficial de Chrome DevTools MCP `--autoConnect` aquí. Si
  `userDataDir` está establecido, se pasa a través para apuntar a ese directorio de datos de usuario.
- La sesión existente puede conectarse en el host seleccionado o a través de un
  nodo de navegador conectado. Si Chrome está en otro lugar y no hay ningún nodo de navegador conectado, utilice
  CDP remoto o un host de nodo en su lugar.

### Lanzamiento personalizado de Chrome MCP

Anule el servidor de Chrome DevTools MCP generado por perfil cuando el flujo predeterminado
`npx chrome-devtools-mcp@latest` no sea lo que desea (hosts sin conexión,
versiones fijas, binarios propios):

| Campo        | Lo que hace                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mcpCommand` | Ejecutable para generar en lugar de `npx`. Se resuelve tal como está; se respetan las rutas absolutas.                                           |
| `mcpArgs`    | Matriz de argumentos pasada textualmente a `mcpCommand`. Reemplaza los argumentos predeterminados de `chrome-devtools-mcp@latest --autoConnect`. |

Cuando `cdpUrl` se establece en un perfil de sesión existente, OpenClaw omite
`--autoConnect` y reenvía el endpoint a Chrome MCP automáticamente:

- `http(s)://...` → `--browserUrl <url>` (endpoint de descubrimiento HTTP de DevTools).
- `ws(s)://...` → `--wsEndpoint <url>` (WebSocket CDP directo).

Los indicadores de endpoint y `userDataDir` no se pueden combinar: cuando `cdpUrl` está establecido,
`userDataDir` se ignora para el lanzamiento de Chrome MCP, ya que Chrome MCP se conecta al
navegador en ejecución detrás del endpoint en lugar de abrir un directorio de
perfil.

<Accordion title="Limitaciones de las funciones de sesión existente">

En comparación con el perfil `openclaw` administrado, los controladores de sesión existente están más limitados:

- **Capturas de pantalla** - las capturas de página y las capturas de elementos `--ref` funcionan; los selectores CSS `--element` no. `--full-page` no puede combinarse con `--ref` o `--element`. No se requiere Playwright para capturas de pantalla de página o de elementos basados en referencias.
- **Acciones** - `click`, `type`, `hover`, `scrollIntoView`, `drag` y `select` requieren referencias de instantánea (sin selectores CSS). `click-coords` hace clic en las coordenadas visibles de la ventanilla y no requiere una referencia de instantánea. `click` es solo del botón izquierdo. `type` no admite `slowly=true`; use `fill` o `press`. `press` no admite `delayMs`. `type`, `hover`, `scrollIntoView`, `drag`, `select`, `fill` y `evaluate` no admiten tiempos de espera por llamada. `select` acepta un solo valor.
- **Espera / carga / diálogo** - `wait --url` admite patrones exactos, de subcadena y glob; `wait --load networkidle` no es compatible. Los enlaces de carga requieren `ref` o `inputRef`, un archivo a la vez, sin CSS `element`. Los enlaces de diálogo no admiten anulaciones de tiempo de espera ni `dialogId`.
- **Visibilidad del diálogo** - Las respuestas de acción del navegador administrado incluyen `blockedByDialog` y `browserState.dialogs.pending` cuando una acción abre un diálogo modal; las instantáneas también incluyen el estado del diálogo pendiente. Responda con `browser dialog --accept/--dismiss --dialog-id <id>` mientras un diálogo esté pendiente. Los diálogos manejados fuera de OpenClaw aparecen bajo `browserState.dialogs.recent`.
- **Funciones solo administradas** - las acciones por lotes, la exportación de PDF, la intercepción de descargas y `responsebody` aún requieren la ruta del navegador administrado.

</Accordion>

## Garantías de aislamiento

- **Directorio de datos de usuario dedicado**: nunca toca su perfil de navegador personal.
- **Puertos dedicados**: evita `9222` para evitar colisiones con los flujos de trabajo de desarrollo.
- **Control determinista de pestañas**: `tabs` devuelve primero `suggestedTargetId`, luego
  identificadores `tabId` estables como `t1`, etiquetas opcionales y el `targetId` sin procesar.
  Los agentes deben reutilizar `suggestedTargetId`; los identificadores sin procesar siguen disponibles para
  depuración y compatibilidad.

## Selección del navegador

Al iniciar localmente, OpenClaw elige el primero disponible:

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Puede anular esto con `browser.executablePath`.

Plataformas:

- macOS: comprueba `/Applications` y `~/Applications`.
- Linux: comprueba las ubicaciones comunes de Chrome/Brave/Edge/Chromium en `/usr/bin`,
  `/snap/bin`, `/opt/google`, `/opt/brave.com`, `/usr/lib/chromium` y
  `/usr/lib/chromium-browser`, además de Chromium gestionado por Playwright en
  `PLAYWRIGHT_BROWSERS_PATH` o `~/.cache/ms-playwright`.
- Windows: comprueba las ubicaciones de instalación comunes.

## API de control (opcional)

Para secuencias de comandos y depuración, el Gateway expone una pequeña **API de control HTTP
solo de bucle local (loopback)** más un CLI `openclaw browser` coincidente (instantáneas, referencias, mejoras de espera,
salida JSON, flujos de trabajo de depuración). Consulte
[Browser control API](/es/tools/browser-control) para obtener la referencia completa.

## Solución de problemas

Para problemas específicos de Linux (especialmente el snap de Chromium), consulte
[Browser troubleshooting](/es/tools/browser-linux-troubleshooting).

Para configuraciones de host dividido con WSL2 Gateway + Windows Chrome, consulte
[WSL2 + Windows + remote Chrome CDP troubleshooting](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

### Fallo al iniciar CDP vs bloqueo SSRF de navegación

Estas son diferentes clases de fallos y apuntan a diferentes rutas de código.

- **Fallo al iniciar o preparar CDP** significa que OpenClaw no puede confirmar que el plano de control del navegador esté saludable.
- **Bloqueo SSRF de navegación** significa que el plano de control del navegador está saludable, pero un objetivo de navegación de página es rechazado por la política.

Ejemplos comunes:

- Fallo al iniciar o preparar CDP:
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - `Port <port> is in use for profile "<name>" but not by openclaw` cuando un
    servicio CDP externo de bucle local está configurado sin `attachOnly: true`
- Bloqueo de navegación SSRF:
  - `open`, `navigate`, instantánea, o flujos de apertura de pestañas fallan con un error de política del navegador/red mientras que `start` y `tabs` todavía funcionan

Use esta secuencia mínima para separar ambos:

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

Cómo leer los resultados:

- Si `start` falla con `not reachable after start`, solucione primero la disponibilidad de CDP.
- Si `start` tiene éxito pero `tabs` falla, el plano de control todavía no está sano. Trate esto como un problema de accesibilidad CDP, no como un problema de navegación de página.
- Si `start` y `tabs` tienen éxito pero `open` o `navigate` fallan, el plano de control del navegador está activo y el fallo está en la política de navegación o en la página de destino.
- Si `start`, `tabs` y `open` tienen todos éxito, la ruta básica de control del navegador gestionado está sana.

Detalles importantes del comportamiento:

- La configuración del navegador por defecto es un objeto de política SSRF de cierre seguro (fail-closed) incluso cuando no configura `browser.ssrfPolicy`.
- Para el perfil gestionado de bucle local `openclaw`, las comprobaciones de salud de CDP omiten intencionalmente la aplicación de accesibilidad SSRF del navegador para el propio plano de control local de OpenClaw.
- La protección de navegación es independiente. Un resultado exitoso de `start` o `tabs` no significa que se permita un objetivo `open` o `navigate` posterior.

Orientación de seguridad:

- **No** relaje la política SSRF del navegador de forma predeterminada.
- Prefiera excepciones de host específicas como `hostnameAllowlist` o `allowedHostnames` en lugar de un acceso amplio a la red privada.
- Use `dangerouslyAllowPrivateNetwork: true` solo en entornos de confianza intencional donde se requiera y haya sido revisado el acceso del navegador a la red privada.

## Herramientas del agente + cómo funciona el control

El agente obtiene **una herramienta** para la automatización del navegador:

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Cómo se mapea:

- `browser snapshot` devuelve un árbol de interfaz de usuario estable (AI o ARIA).
- `browser act` usa los IDs de la instantánea `ref` para hacer clic/escribir/arrastrar/seleccionar.
- `browser screenshot` captura píxeles (página completa, elemento o referencias etiquetadas).
- `browser doctor` comprueba la preparación del Gateway, complemento, perfil, navegador y pestaña.
- `browser` acepta:
  - `profile` para elegir un perfil de navegador con nombre (openclaw, chrome o CDP remoto).
  - `target` (`sandbox` | `host` | `node`) para seleccionar dónde reside el navegador.
  - En sesiones en sandbox, `target: "host"` requiere `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si se omite `target`: las sesiones en sandbox tienen por defecto `sandbox`, las sesiones que no son en sandbox tienen por defecto `host`.
  - Si hay conectado un nodo con capacidad de navegador, la herramienta puede enrutar automáticamente a él a menos que ancles `target="host"` o `target="node"`.

Esto mantiene al agente determinista y evita selectores frágiles.

## Relacionado

- [Resumen de herramientas](/es/tools) - todas las herramientas del agente disponibles
- [Aislamiento (Sandboxing)](/es/gateway/sandboxing) - control del navegador en entornos aislados
- [Seguridad](/es/gateway/security) - riesgos y endurecimiento del control del navegador
