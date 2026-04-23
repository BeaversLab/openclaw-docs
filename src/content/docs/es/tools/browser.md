---
summary: "Servicio de control del navegador integrado + comandos de acción"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "Navegador (administrado por OpenClaw)"
---

# Navegador (administrado por openclaw)

OpenClaw puede ejecutar un **perfil dedicado de Chrome/Brave/Edge/Chromium** que controla el agente.
Está aislado de su navegador personal y se administra a través de un pequeño servicio de
control local dentro de la Gateway (solo bucle invertido).

Vista de principiante:

- Piénselo como un **navegador separado y exclusivo para el agente**.
- El perfil `openclaw` **no** toca su perfil personal del navegador.
- El agente puede **abrir pestañas, leer páginas, hacer clic y escribir** en un entorno seguro.
- El perfil `user` incorporado se adjunta a su sesión real de Chrome iniciada a través de Chrome MCP.

## Lo que obtienes

- Un perfil de navegador separado llamado **openclaw** (acentrado en naranja de forma predeterminada).
- Control determinista de pestañas (listar/abrir/enfocar/cerrar).
- Acciones del agente (hacer clic/escribir/arrastrar/seleccionar), instantáneas, capturas de pantalla, PDF.
- Soporte opcional de múltiples perfiles (`openclaw`, `work`, `remote`, ...).

Este navegador **no** es su navegador principal. Es una superficie segura y aislada para
la automatización y verificación del agente.

## Inicio rápido

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Si obtiene "Navegador desactivado", actívelo en la configuración (ver abajo) y reinicie la
Gateway.

Si falta `openclaw browser` por completo, o el agente dice que la herramienta del navegador
no está disponible, vaya a [Falta el comando o la herramienta del navegador](/es/tools/browser#missing-browser-command-or-tool).

## Control de complementos

La herramienta `browser` predeterminada ahora es un complemento (plugin) integrado que se envía habilitado de
forma predeterminada. Eso significa que puede deshabilitarla o reemplazarla sin eliminar el resto del
sistema de complementos de OpenClaw:

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

Deshabilite el complemento integrado antes de instalar otro complemento que proporcione el
mismo nombre de herramienta `browser`. La experiencia del navegador predeterminada necesita ambos:

- `plugins.entries.browser.enabled` no deshabilitado
- `browser.enabled=true`

Si solo apaga el complemento, la CLI del navegador integrada (`openclaw browser`),
el método de puerta de enlace (`browser.request`), la herramienta del agente y el servicio de control del
navegador predeterminado desaparecen todos juntos. Su configuración `browser.*` permanece intacta para que
un complemento de reemplazo la reutilice.

El complemento del navegador incluido también posee ahora la implementación del tiempo de ejecución del navegador.
Core mantiene solo los asistentes compartidos del SDK de complementos más las reexportaciones de compatibilidad para
rutas de importación internas anteriores. En la práctica, eliminar o reemplazar el paquete del
complemento del navegador elimina el conjunto de características del navegador en lugar de dejar atrás un segundo
tiempo de ejecución propiedad de Core.

Los cambios en la configuración del navegador aún requieren un reinicio de la Gateway para que el complemento incluido
pueda volver a registrar su servicio de navegador con la nueva configuración.

## Falta el comando o la herramienta del navegador

Si `openclaw browser` se convierte repentinamente en un comando desconocido después de una actualización, o
el agente informa que falta la herramienta del navegador, la causa más común es una
lista `plugins.allow` restrictiva que no incluye `browser`.

Ejemplo de configuración rota:

```json5
{
  plugins: {
    allow: ["telegram"],
  },
}
```

Arréglelo añadiendo `browser` a la lista de permitidos (allowlist) del complemento:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

Notas importantes:

- `browser.enabled=true` no es suficiente por sí solo cuando se establece `plugins.allow`.
- `plugins.entries.browser.enabled=true` tampoco es suficiente por sí solo cuando se establece `plugins.allow`.
- `tools.alsoAllow: ["browser"]` **no** carga el complemento del navegador integrado. Solo ajusta la política de herramientas después de que el complemento ya se ha cargado.
- Si no necesitas una lista de permitidos restrictiva para complementos, eliminar `plugins.allow` también restaura el comportamiento del navegador incluido por defecto.

Síntomas típicos:

- `openclaw browser` es un comando desconocido.
- Falta `browser.request`.
- El agente informa que la herramienta del navegador no está disponible o que falta.

## Perfiles: `openclaw` vs `user`

- `openclaw`: navegador administrado y aislado (no se requiere extensión).
- `user`: perfil de conexión MCP de Chrome integrado para tu sesión **real de Chrome con inicio de sesión**.

Para las llamadas a la herramienta del navegador del agente:

- Predeterminado: usar el navegador aislado `openclaw`.
- Prefiere `profile="user"` cuando importan las sesiones iniciadas existentes y el usuario está en el ordenador para hacer clic/aprobar cualquier mensaje de conexión.
- `profile` es la anulación explícita cuando deseas un modo de navegador específico.

Establece `browser.defaultProfile: "openclaw"` si deseas el modo administrado de forma predeterminada.

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
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
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

Notas:

- El servicio de control del navegador se enlaza al loopback en un puerto derivado de `gateway.port` (predeterminado: `18791`, que es gateway + 2).
- Si anulas el puerto de Gateway (`gateway.port` o `OPENCLAW_GATEWAY_PORT`), los puertos del navegador derivados cambian para mantenerse en la misma "familia".
- `cdpUrl` por defecto es el puerto local CDP administrado cuando no está configurado.
- `remoteCdpTimeoutMs` se aplica a las comprobaciones de accesibilidad CDP remotas (no loopback).
- `remoteCdpHandshakeTimeoutMs` se aplica a las comprobaciones de accesibilidad de WebSocket CDP remotas.
- La navegación/apertura de pestañas del navegador está protegida contra SSRF antes de la navegación y se vuelve a verificar con el mejor esfuerzo en la URL final `http(s)` después de la navegación.
- En modo estricto SSRF, el descubrimiento/sondas de puntos de conexión CDP remotos (`cdpUrl`, incluidas las búsquedas de `/json/version`) también se verifican.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` está deshabilitado de forma predeterminada. Establécelo en `true` solo cuando confíes intencionalmente en el acceso al navegador de red privada.
- `browser.ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como un alias heredado por compatibilidad.
- `attachOnly: true` significa "nunca iniciar un navegador local; solo conectar si ya se está ejecutando".
- `color` + por perfil `color` colorean la interfaz del navegador para que pueda ver qué perfil está activo.
- El perfil predeterminado es `openclaw` (navegador independiente gestionado por OpenClaw). Use `defaultProfile: "user"` para optar por el navegador del usuario que ha iniciado sesión.
- Orden de autodetección: navegador predeterminado del sistema si está basado en Chromium; de lo contrario, Chrome → Brave → Edge → Chromium → Chrome Canary.
- Los perfiles locales `openclaw` asignan automáticamente `cdpPort`/`cdpUrl` — establezca esos solo para CDP remoto.
- `driver: "existing-session"` usa Chrome DevTools MCP en lugar de CDP sin formato. No
  establezca `cdpUrl` para ese controlador.
- Establezca `browser.profiles.<name>.userDataDir` cuando un perfil de sesión existente
  deba adjuntarse a un perfil de usuario de Chromium que no sea el predeterminado, como Brave o Edge.

## Usar Brave (u otro navegador basado en Chromium)

Si su navegador **predeterminado del sistema** está basado en Chromium (Chrome/Brave/Edge/etc.),
OpenClaw lo usa automáticamente. Establezca `browser.executablePath` para anular
la detección automática:

Ejemplo de CLI:

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
```

```json5
// macOS
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}

// Windows
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## Control local vs. remoto

- **Control local (predeterminado):** el Gateway inicia el servicio de control de loopback y puede iniciar un navegador local.
- **Control remoto (host de nodo):** ejecute un host de nodo en la máquina que tiene el navegador; el Gateway actúa como proxy de las acciones del navegador hacia él.
- **CDP remoto:** establezca `browser.profiles.<name>.cdpUrl` (o `browser.cdpUrl`) para
  adjuntarse a un navegador remoto basado en Chromium. En este caso, OpenClaw no iniciará un navegador local.

El comportamiento de detención difiere según el modo de perfil:

- perfiles gestionados locales: `openclaw browser stop` detiene el proceso del navegador que
  OpenClaw inició
- perfiles de solo adjuntar y CDP remoto: `openclaw browser stop` cierra la sesión de
  control activa y libera las anulaciones de emulación de Playwright/CDP (ventana,
  esquema de color, configuración regional, zona horaria, modo sin conexión y estados similares), aunque
  ningún proceso de navegador fue iniciado por OpenClaw

Las URL de CDP remotas pueden incluir autenticación:

- Tokens de consulta (ej., `https://provider.example?token=<token>`)
- Autenticación básica HTTP (ej., `https://user:pass@provider.example`)

OpenClaw conserva la autenticación al llamar a los puntos finales `/json/*` y al conectar
al WebSocket de CDP. Prefiera variables de entorno o gestores de secretos para
los tokens en lugar de confirmarlos en los archivos de configuración.

## Proxy del navegador del nodo (predeterminado sin configuración)

Si ejecuta un **host de nodo** en la máquina que tiene su navegador, OpenClaw puede
enrutar automáticamente las llamadas a la herramienta del navegador a ese nodo sin ninguna configuración adicional del navegador.
Esta es la ruta predeterminada para gateways remotos.

Notas:

- El host del nodo expone su servidor de control de navegador local a través de un **comando proxy**.
- Los perfiles provienen de la propia configuración `browser.profiles` del nodo (igual que la local).
- `nodeHost.browserProxy.allowProfiles` es opcional. Déjelo vacío para el comportamiento heredado/predeterminado: todos los perfiles configurados permanecen accesibles a través del proxy, incluyendo las rutas de creación/eliminación de perfiles.
- Si establece `nodeHost.browserProxy.allowProfiles`, OpenClaw lo trata como un límite de mínimo privilegio: solo se pueden dirigir los perfiles en la lista de permitidos y las rutas de creación/eliminación de perfiles persistentes están bloqueadas en la superficie del proxy.
- Deshabilite si no lo desea:
  - En el nodo: `nodeHost.browserProxy.enabled=false`
  - En la puerta de enlace: `gateway.nodes.browser.mode="off"`

## Browserless (CDP remoto alojado)

[Browserless](https://browserless.io) es un servicio alojado de Chromium que expone
URL de conexión CDP a través de HTTPS y WebSocket. OpenClaw puede usar cualquiera de las dos formas, pero
para un perfil de navegador remoto, la opción más sencilla es la URL directa de WebSocket
de la documentación de conexión de Browserless.

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

## Proveedores de CDP WebSocket directo

Algunos servicios de navegador alojados exponen un endpoint **directo de WebSocket** en lugar del
descubrimiento de CDP basado en HTTP estándar (`/json/version`). OpenClaw acepta tres
formas de URL de CDP y elige la estrategia de conexión correcta automáticamente:

- **Descubrimiento HTTP(S)** — `http://host[:port]` o `https://host[:port]`.
  OpenClaw llama a `/json/version` para descubrir la URL del depurador WebSocket y luego
  se conecta. No hay alternativa WebSocket.
- **Endpoints directos de WebSocket** — `ws://host[:port]/devtools/<kind>/<id>` o
  `wss://...` con una ruta `/devtools/browser|page|worker|shared_worker|service_worker/<id>`.
  OpenClaw se conecta directamente a través de un protocolo de enlace WebSocket y omite
  `/json/version` por completo.
- **Raíces desnudas de WebSocket** — `ws://host[:port]` o `wss://host[:port]` sin una
  ruta `/devtools/...` (p. ej., [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com)). OpenClaw intenta primero el
  descubrimiento `/json/version` por HTTP (normalizando el esquema a `http`/`https`);
  si el descubrimiento devuelve un `webSocketDebuggerUrl` se usa, de lo contrario OpenClaw
  recurre a un protocolo de enlace directo de WebSocket en la raíz desnuda. Esto cubre
  tanto los puertos de depuración remota estilo Chrome como los proveedores solo de WebSocket.

Un `ws://host:port` / `wss://host:port` simple sin una ruta `/devtools/...`
que apunte a una instancia local de Chrome es compatible con la alternativa
de descubrimiento primero: Chrome solo acepta actualizaciones de WebSocket en la ruta específica por navegador
o por objetivo devuelta por `/json/version`, por lo que un protocolo de enlace solo de raíz desnuda
fallaría.

### Browserbase

[Browserbase](https://www.browserbase.com) es una plataforma en la nube para ejecutar
navegadores headless con resolución integrada de CAPTCHA, modo sigiloso y proxies
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
- Reemplaza `<BROWSERBASE_API_KEY>` con tu API key real de Browserbase.
- Browserbase crea automáticamente una sesión del navegador al conectarse mediante WebSocket, por lo que no
  es necesario ningún paso de creación manual de sesión.
- El nivel gratuito permite una sesión simultánea y una hora de navegador al mes.
  Consulta [precios](https://www.browserbase.com/pricing) para ver los límites de los planes de pago.
- Consulta la [documentación de Browserbase](https://docs.browserbase.com) para obtener la referencia completa de la API,
  guías del SDK y ejemplos de integración.

## Seguridad

Ideas clave:

- El control del navegador es solo de bucle local (loopback); el acceso fluye a través de la autenticación del Gateway o el emparejamiento de nodos.
- La API HTTP del navegador de bucle local independiente usa **solo autenticación de secreto compartido**:
  autenticación de portador del token de puerta de enlace (gateway token bearer auth), `x-openclaw-password`, o autenticación HTTP Basic con la
  contraseña de puerta de enlace configurada.
- Los encabezados de identidad de Tailscale Serve y `gateway.auth.mode: "trusted-proxy"` **no**
  autentican esta API de navegador de bucle local independiente.
- Si el control del navegador está habilitado y no se configura ninguna autenticación de secreto compartido, OpenClaw
  genera automáticamente `gateway.auth.token` al iniciarse y lo persiste en la configuración.
- OpenClaw **no** genera automáticamente ese token cuando `gateway.auth.mode`
  ya es `password`, `none` o `trusted-proxy`.
- Mantén el Gateway y cualquier host de nodos en una red privada (Tailscale); evita la exposición pública.
- Trata las URL/tokens de CDP remotos como secretos; prefiere variables de entorno o un administrador de secretos.

Consejos de CDP remoto:

- Prefiere puntos finales cifrados (HTTPS o WSS) y tokens de corta duración cuando sea posible.
- Evita incrustar tokens de larga duración directamente en los archivos de configuración.

## Perfiles (multinavegador)

OpenClaw admite múltiples perfiles con nombre (configuraciones de enrutamiento). Los perfiles pueden ser:

- **openclaw-managed**: una instancia de navegador basada en Chromium dedicada con su propio directorio de datos de usuario + puerto CDP
- **remote**: una URL CDP explícita (navegador basado en Chromium que se ejecuta en otro lugar)
- **sesión existente**: tu perfil de Chrome existente mediante autoconexión de Chrome DevTools MCP

Valores predeterminados:

- El perfil `openclaw` se crea automáticamente si falta.
- El perfil `user` está integrado para la conexión de sesión existente de Chrome MCP.
- Los perfiles de sesión existente son opcionales más allá de `user`; créalos con `--driver existing-session`.
- Los puertos CDP locales se asignan desde **18800–18899** de forma predeterminada.
- Eliminar un perfil mueve su directorio de datos local a la Papelera.

Todos los endpoints de control aceptan `?profile=<name>`; la CLI usa `--browser-profile`.

## Sesión existente mediante Chrome DevTools MCP

OpenClaw también puede adjuntarse a un perfil de navegador basado en Chromium que se esté ejecutando a través del
servidor oficial de Chrome DevTools MCP. Esto reutiliza las pestañas y el estado de sesión
ya abiertos en ese perfil de navegador.

Referencias oficiales de antecedentes y configuración:

- [Chrome para desarrolladores: Usar Chrome DevTools MCP con tu sesión del navegador](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [LÉEME de Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Perfil integrado:

- `user`

Opcional: crea tu propio perfil personalizado de sesión existente si deseas un
nombre, color o directorio de datos del navegador diferente.

Comportamiento predeterminado:

- El perfil integrado `user` usa la autoconexión de Chrome MCP, que tiene como objetivo el
  perfil local predeterminado de Google Chrome.

Usa `userDataDir` para Brave, Edge, Chromium o un perfil de Chrome no predeterminado:

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
3. Mantén el navegador ejecutándose y aprueba el mensaje de conexión cuando OpenClaw se adjunte.

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
- `tabs` enumera tus pestañas del navegador ya abiertas
- `snapshot` devuelve referencias de la pestaña en vivo seleccionada

Qué comprobar si la adjuntación no funciona:

- el navegador de Chromium de destino es la versión `144+`
- la depuración remota está habilitada en la página de inspección de ese navegador
- el navegador mostró y aceptó el mensaje de consentimiento de adjuntación
- `openclaw doctor` migra la configuración antigua del navegador basada en extensiones y comprueba que
  Chrome está instalado localmente para los perfiles de autoconexión predeterminados, pero no puede
  habilitar la depuración remota del lado del navegador por usted

Uso del agente:

- Use `profile="user"` cuando necesite el estado del navegador conectado del usuario.
- Si usa un perfil de sesión existente personalizado, pase ese nombre de perfil explícito.
- Elija este modo solo cuando el usuario esté en el ordenador para aprobar el mensaje
  de adjuntación.
- el Gateway o el host del nodo pueden generar `npx chrome-devtools-mcp@latest --autoConnect`

Notas:

- Esta ruta es de mayor riesgo que el perfil aislado `openclaw` porque puede
  actuar dentro de su sesión de navegador conectada.
- OpenClaw no inicia el navegador para este controlador; solo se adjunta a una
  sesión existente.
- OpenClaw utiliza el flujo oficial de Chrome DevTools MCP `--autoConnect` aquí. Si
  `userDataDir` está configurado, OpenClaw lo pasa para dirigirse a ese directorio
  explícito de datos de usuario de Chromium.
- Las capturas de pantalla de sesión existente admiten capturas de página y capturas de elementos `--ref`
  desde instantáneas, pero no selectores CSS `--element`.
- Las capturas de pantalla de página de sesión existente funcionan sin Playwright a través de Chrome MCP.
  Las capturas de pantalla de elementos basadas en referencias (`--ref`) también funcionan allí, pero `--full-page`
  no se puede combinar con `--ref` o `--element`.
- Las acciones de sesión existente siguen siendo más limitadas que la ruta del navegador
  administrado:
  - `click`, `type`, `hover`, `scrollIntoView`, `drag` y `select` requieren
    referencias de instantáneas en lugar de selectores CSS
  - `click` es solo del botón izquierdo (sin anulaciones de botón ni modificadores)
  - `type` no admite `slowly=true`; use `fill` o `press`
  - `press` no admite `delayMs`
  - `hover`, `scrollIntoView`, `drag`, `select`, `fill`, y `evaluate` no admiten
    anulaciones de tiempo de espera por llamada
  - `select` actualmente admite un único valor solamente
- La `wait --url` de sesión existente admite patrones exactos, de subcadena y globales
  como otros controladores de navegador. `wait --load networkidle` aún no es compatible.
- Los enlaces de carga de sesión existente requieren `ref` o `inputRef`, admiten un archivo
  a la vez y no admiten la orientación `element` de CSS.
- Los enlaces de diálogo de sesión existente no admiten anulaciones de tiempo de espera.
- Algunas características aún requieren la ruta del navegador gestionado, incluidas las acciones
  por lotes, la exportación de PDF, la interceptación de descargas y `responsebody`.
- La sesión existente puede adjuntarse en el host seleccionado o a través de un nodo de
  navegador conectado. Si Chrome está en otro lugar y no hay ningún nodo de navegador conectado, utilice
  CDP remoto o un host de nodo en su lugar.

## Garantías de aislamiento

- **Directorio de datos de usuario dedicado**: nunca toca su perfil de navegador personal.
- **Puertos dedicados**: evita `9222` para prevenir colisiones con flujos de trabajo de desarrollo.
- **Control determinista de pestañas**: apunte a las pestañas por `targetId`, no por "última pestaña".

## Selección del navegador

Al iniciarse localmente, OpenClaw elige el primero disponible:

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Puede anular con `browser.executablePath`.

Plataformas:

- macOS: comprueba `/Applications` y `~/Applications`.
- Linux: busca `google-chrome`, `brave`, `microsoft-edge`, `chromium`, etc.
- Windows: comprueba las ubicaciones de instalación comunes.

## API de control (opcional)

Solo para integraciones locales, el Gateway expone una pequeña API HTTP de bucle local:

- Estado/inicio/parada: `GET /`, `POST /start`, `POST /stop`
- Pestañas: `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Instantánea/captura de pantalla: `GET /snapshot`, `POST /screenshot`
- Acciones: `POST /navigate`, `POST /act`
- Ganchos (Hooks): `POST /hooks/file-chooser`, `POST /hooks/dialog`
- Descargas: `POST /download`, `POST /wait/download`
- Depuración: `GET /console`, `POST /pdf`
- Depuración: `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- Red: `POST /response/body`
- Estado: `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- Estado: `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- Configuración: `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

Todos los endpoints aceptan `?profile=<name>`.

Si la autenticación de la puerta de enlace con secreto compartido está configurada, las rutas HTTP del navegador también requieren autenticación:

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` o autenticación HTTP Basic con esa contraseña

Notas:

- Esta API de navegador de bucle local independiente **no** consume encabezados de identidad de Tailscale Serve ni de proxy confiable.
- Si `gateway.auth.mode` es `none` o `trusted-proxy`, estas rutas de navegador de bucle local no heredan esos modos que portan identidad; manténgalas solo de bucle local.

### Contrato de error `/act`

`POST /act` utiliza una respuesta de error estructurada para fallas de validación y políticas a nivel de ruta:

```json
{ "error": "<message>", "code": "ACT_*" }
```

Valores actuales de `code`:

- `ACT_KIND_REQUIRED` (HTTP 400): `kind` falta o no se reconoce.
- `ACT_INVALID_REQUEST` (HTTP 400): la carga útil de la acción falló la normalización o validación.
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400): `selector` se usó con un tipo de acción no compatible.
- `ACT_EVALUATE_DISABLED` (HTTP 403): `evaluate` (o `wait --fn`) está desactivado por la configuración.
- `ACT_TARGET_ID_MISMATCH` (HTTP 403): `targetId` de nivel superior o por lotes entra en conflicto con el objetivo de la solicitud.
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501): la acción no es compatible con perfiles de sesión existente.

Otros fallos de ejecución aún pueden devolver `{ "error": "<message>" }` sin un
campo `code`.

### Requisito de Playwright

Algunas funciones (navegar/actuar/instantánea de IA/instantánea de rol, capturas de pantalla de elementos,
PDF) requieren Playwright. Si Playwright no está instalado, esos puntos finales devuelven
un error 501 claro.

Lo que aún funciona sin Playwright:

- Instantáneas ARIA
- Capturas de pantalla de página para el navegador gestionado `openclaw` cuando hay un CDP por pestaña
  WebSocket disponible
- Capturas de pantalla de página para perfiles `existing-session` / Chrome MCP
- Capturas de pantalla basadas en referencias `existing-session` (`--ref`) desde la salida de la instantánea

Lo que aún necesita Playwright:

- `navigate`
- `act`
- Instantáneas de IA / instantáneas de rol
- Capturas de pantalla de elementos con selector CSS (`--element`)
- exportación de PDF completa del navegador

Las capturas de pantalla de elementos también rechazan `--full-page`; la ruta devuelve `fullPage is
not supported for element screenshots`.

Si ves `Playwright is not available in this gateway build`, instala el paquete completo
de Playwright (no `playwright-core`) y reinicia la puerta de enlace, o reinstala
OpenClaw con soporte de navegador.

#### Instalación de Docker Playwright

Si su puerta de enlace se ejecuta en Docker, evite `npx playwright` (conflictos de anulación de npm).
Use la CLI incluida en su lugar:

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Para conservar las descargas del navegador, configure `PLAYWRIGHT_BROWSERS_PATH` (por ejemplo,
`/home/node/.cache/ms-playwright`) y asegúrese de que `/home/node` se conserve mediante
`OPENCLAW_HOME_VOLUME` o un montaje de enlace (bind mount). Consulte [Docker](/es/install/docker).

## Cómo funciona (interno)

Flujo de alto nivel:

- Un pequeño **servidor de control** acepta solicitudes HTTP.
- Se conecta a navegadores basados en Chromium (Chrome/Brave/Edge/Chromium) a través de **CDP**.
- Para acciones avanzadas (clic/escribir/captura de pantalla/PDF), utiliza **Playwright** sobre
  CDP.
- Cuando falta Playwright, solo están disponibles las operaciones que no son de Playwright.

Este diseño mantiene al agente en una interfaz estable y determinista, al tiempo que le
permite intercambiar navegadores y perfiles locales/remotos.

## Referencia rápida de CLI

Todos los comandos aceptan `--browser-profile <name>` para apuntar a un perfil específico.
Todos los comandos también aceptan `--json` para una salida legible por máquina (cargas útiles estables).

Lo básico:

- `openclaw browser status`
- `openclaw browser start`
- `openclaw browser stop`
- `openclaw browser tabs`
- `openclaw browser tab`
- `openclaw browser tab new`
- `openclaw browser tab select 2`
- `openclaw browser tab close 2`
- `openclaw browser open https://example.com`
- `openclaw browser focus abcd1234`
- `openclaw browser close abcd1234`

Inspección:

- `openclaw browser screenshot`
- `openclaw browser screenshot --full-page`
- `openclaw browser screenshot --ref 12`
- `openclaw browser screenshot --ref e12`
- `openclaw browser snapshot`
- `openclaw browser snapshot --format aria --limit 200`
- `openclaw browser snapshot --interactive --compact --depth 6`
- `openclaw browser snapshot --efficient`
- `openclaw browser snapshot --labels`
- `openclaw browser snapshot --selector "#main" --interactive`
- `openclaw browser snapshot --frame "iframe#main" --interactive`
- `openclaw browser console --level error`

Nota sobre el ciclo de vida:

- Para perfiles CDP remotos y de solo conexión (attach-only), `openclaw browser stop` sigue siendo el
  comando de limpieza correcto después de las pruebas. Cierra la sesión de control activa y
  borra las anulaciones de emulación temporales en lugar de cerrar el navegador
  subyacente.
- `openclaw browser errors --clear`
- `openclaw browser requests --filter api --clear`
- `openclaw browser pdf`
- `openclaw browser responsebody "**/api" --max-chars 5000`

Acciones:

- `openclaw browser navigate https://example.com`
- `openclaw browser resize 1280 720`
- `openclaw browser click 12 --double`
- `openclaw browser click e12 --double`
- `openclaw browser type 23 "hello" --submit`
- `openclaw browser press Enter`
- `openclaw browser hover 44`
- `openclaw browser scrollintoview e12`
- `openclaw browser drag 10 11`
- `openclaw browser select 9 OptionA OptionB`
- `openclaw browser download e12 report.pdf`
- `openclaw browser waitfordownload report.pdf`
- `openclaw browser upload /tmp/openclaw/uploads/file.pdf`
- `openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `openclaw browser dialog --accept`
- `openclaw browser wait --text "Done"`
- `openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `openclaw browser evaluate --fn '(el) => el.textContent' --ref 7`
- `openclaw browser highlight e12`
- `openclaw browser trace start`
- `openclaw browser trace stop`

Estado:

- `openclaw browser cookies`
- `openclaw browser cookies set session abc123 --url "https://example.com"`
- `openclaw browser cookies clear`
- `openclaw browser storage local get`
- `openclaw browser storage local set theme dark`
- `openclaw browser storage session clear`
- `openclaw browser set offline on`
- `openclaw browser set headers --headers-json '{"X-Debug":"1"}'`
- `openclaw browser set credentials user pass`
- `openclaw browser set credentials --clear`
- `openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `openclaw browser set geo --clear`
- `openclaw browser set media dark`
- `openclaw browser set timezone America/New_York`
- `openclaw browser set locale en-US`
- `openclaw browser set device "iPhone 14"`

Notas:

- `upload` y `dialog` son llamadas de **preparación**; ejecútelas antes del clic/presión
  que activa el selector/cuadro de diálogo.
- Las rutas de salida de descarga y seguimiento están restringidas a las raíces temporales de OpenClaw:
  - rastros: `/tmp/openclaw` (alternativo: `${os.tmpdir()}/openclaw`)
  - descargas: `/tmp/openclaw/downloads` (alternativo: `${os.tmpdir()}/openclaw/downloads`)
- Las rutas de carga están restringidas a una raíz de carga temporal de OpenClaw:
  - cargas: `/tmp/openclaw/uploads` (alternativo: `${os.tmpdir()}/openclaw/uploads`)
- `upload` también puede establecer entradas de archivo directamente a través de `--input-ref` o `--element`.
- `snapshot`:
  - `--format ai` (predeterminado cuando Playwright está instalado): devuelve una instantánea de IA con referencias numéricas (`aria-ref="<n>"`).
  - `--format aria`: devuelve el árbol de accesibilidad (sin referencias; solo inspección).
  - `--efficient` (o `--mode efficient`): configuración preestablecida de instantánea compacta de roles (interactiva + compacta + profundidad + maxChars inferior).
  - Configuración predeterminada (solo herramienta/CLI): establezca `browser.snapshotDefaults.mode: "efficient"` para usar instantáneas eficientes cuando el llamador no pase un modo (consulte [Gateway configuration](/es/gateway/configuration-reference#browser)).
  - Las opciones de instantánea de roles (`--interactive`, `--compact`, `--depth`, `--selector`) fuerzan una instantánea basada en roles con referencias como `ref=e12`.
  - `--frame "<iframe selector>"` limita las instantáneas de roles a un iframe (se combina con referencias de roles como `e12`).
  - `--interactive` genera una lista plana y fácil de seleccionar de elementos interactivos (lo mejor para impulsar acciones).
  - `--labels` añade una captura de pantalla solo de la ventanilla con etiquetas de referencia superpuestas (imprime `MEDIA:<path>`).
- `click`/`type`/etc. requieren un `ref` de `snapshot` (ya sea un `12` numérico o una referencia de rol `e12`).
  Los selectores CSS no se admiten intencionalmente para las acciones.

## Instantáneas y referencias

OpenClaw admite dos estilos de "instantánea":

- **Instantánea de IA (referencias numéricas)**: `openclaw browser snapshot` (predeterminado; `--format ai`)
  - Salida: una instantánea de texto que incluye referencias numéricas.
  - Acciones: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internamente, la referencia se resuelve a través de `aria-ref` de Playwright.

- **Instantánea de roles (referencias de roles como `e12`)**: `openclaw browser snapshot --interactive` (o `--compact`, `--depth`, `--selector`, `--frame`)
  - Salida: una lista/árbol basado en roles con `[ref=e12]` (y `[nth=1]` opcional).
  - Acciones: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internamente, la referencia se resuelve mediante `getByRole(...)` (más `nth()` para duplicados).
  - Añada `--labels` para incluir una captura de pantalla del viewport con etiquetas `e12` superpuestas.

Comportamiento de la referencia:

- Las referencias **no son estables entre navegaciones**; si algo falla, vuelva a ejecutar `snapshot` y use una referencia nueva.
- Si la instantánea del rol se tomó con `--frame`, las referencias del rol están limitadas a ese iframe hasta la siguiente instantánea del rol.

## Mejoras de espera

Puede esperar algo más que solo tiempo/texto:

- Espere a la URL (los patrones glob son compatibles con Playwright):
  - `openclaw browser wait --url "**/dash"`
- Espere el estado de carga:
  - `openclaw browser wait --load networkidle`
- Espere un predicado JS:
  - `openclaw browser wait --fn "window.ready===true"`
- Espere a que un selector sea visible:
  - `openclaw browser wait "#main"`

Estos se pueden combinar:

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## Flujos de trabajo de depuración

Cuando falla una acción (p. ej., "no visible", "violación del modo estricto", "cubierto"):

1. `openclaw browser snapshot --interactive`
2. Use `click <ref>` / `type <ref>` (se prefieren las referencias de rol en el modo interactivo)
3. Si aún falla: `openclaw browser highlight <ref>` para ver qué está objetivo Playwright
4. Si la página se comporta de forma extraña:
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Para una depuración profunda: grabe un seguimiento:
   - `openclaw browser trace start`
   - reproducir el problema
   - `openclaw browser trace stop` (imprime `TRACE:<path>`)

## Salida JSON

`--json` es para scripts y herramientas estructuradas.

Ejemplos:

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Las instantáneas de rol en JSON incluyen `refs` más un pequeño bloque `stats` (líneas/caracteres/referencias/interactivo) para que las herramientas puedan razonar sobre el tamaño y la densidad de la carga útil.

## Perillas de estado y entorno

Estos son útiles para flujos de trabajo de "hacer que el sitio se comporte como X":

- Cookies: `cookies`, `cookies set`, `cookies clear`
- Almacenamiento: `storage local|session get|set|clear`
- Sin conexión: `set offline on|off`
- Encabezados: `set headers --headers-json '{"X-Debug":"1"}'` (el `set headers --json '{"X-Debug":"1"}'` heredado sigue siendo compatible)
- Autenticación básica HTTP: `set credentials user pass` (o `--clear`)
- Geolocalización: `set geo <lat> <lon> --origin "https://example.com"` (o `--clear`)
- Medios: `set media dark|light|no-preference|none`
- Zona horaria / configuración regional: `set timezone ...`, `set locale ...`
- Dispositivo / ventana gráfica:
  - `set device "iPhone 14"` (presets de dispositivos de Playwright)
  - `set viewport 1280 720`

## Seguridad y privacidad

- El perfil de navegador de openclaw puede contener sesiones iniciadas; trátelo como sensible.
- `browser act kind=evaluate` / `openclaw browser evaluate` y `wait --fn`
  ejecutan JavaScript arbitrario en el contexto de la página. La inyección de prompts puede dirigir esto.
  Desactívelo con `browser.evaluateEnabled=false` si no lo necesita.
- Para notas sobre inicios de sesión y anti-bots (X/Twitter, etc.), consulte [Inicio de sesión del navegador + publicación en X/Twitter](/es/tools/browser-login).
- Mantenga el host del Gateway/nodo privado (solo loopback o tailnet).
- Los puntos finales de CDP remotos son potentes; protéjalos mediante túneles.

Ejemplo en modo estricto (bloquear destinos privados/internos de forma predeterminada):

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // optional exact allow
    },
  },
}
```

## Solución de problemas

Para problemas específicos de Linux (especialmente snap Chromium), consulte
[Solución de problemas del navegador](/es/tools/browser-linux-troubleshooting).

Para configuraciones con Gateway en WSL2 + Chrome en Windows con host dividido, consulte
[WSL2 + Windows + solución de problemas de CDP remoto de Chrome](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

### Fallo de inicio de CDP frente a bloqueo de SSRF de navegación

Estos son diferentes clases de fallo y apuntan a diferentes rutas de código.

- **Fallo de inicio o preparación de CDP** significa que OpenClaw no puede confirmar que el plano de control del navegador esté sano.
- **Bloqueo de SSRF de navegación** significa que el plano de control del navegador está sano, pero un objetivo de navegación de página es rechazado por la política.

Ejemplos comunes:

- Fallo de inicio o preparación de CDP:
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
- Bloqueo de SSRF de navegación:
  - `open`, `navigate`, flujo de instantáneas o apertura de pestañas fallan con un error de política de navegador/red mientras `start` y `tabs` todavía funcionan

Use esta secuencia mínima para separar los dos:

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

Cómo leer los resultados:

- Si `start` falla con `not reachable after start`, solucione primero la preparación de CDP.
- Si `start` tiene éxito pero `tabs` falla, el plano de control todavía no está sano. Trate esto como un problema de alcance de CDP, no un problema de navegación de página.
- Si `start` y `tabs` tienen éxito pero `open` o `navigate` fallan, el plano de control del navegador está activo y el fallo está en la política de navegación o en la página de destino.
- Si `start`, `tabs` y `open` tienen éxito, la ruta de control básica del navegador administrado está sana.

Detalles importantes del comportamiento:

- La configuración del navegador tiene como valor predeterminado un objeto de política SSRF de cierre seguro (fail-closed) incluso cuando no configura `browser.ssrfPolicy`.
- Para el perfil administrado `openclaw` de loopback local, las verificaciones de salud de CDP omiten intencionalmente la aplicación de alcance de SSRF del navegador para el plano de control local propio de OpenClaw.
- La protección de navegación es independiente. Un resultado exitoso de `start` o `tabs` no significa que un destino `open` o `navigate` posterior esté permitido.

Orientación de seguridad:

- **No** relaje la política SSRF del navegador de forma predeterminada.
- Prefiera excepciones de host estrechas como `hostnameAllowlist` o `allowedHostnames` en lugar de acceso amplio a la red privada.
- Use `dangerouslyAllowPrivateNetwork: true` solo en entornos intencionalmente de confianza donde se requiera y revise el acceso del navegador a la red privada.

Ejemplo: navegación bloqueada, plano de control sano

- `start` tiene éxito
- `tabs` tiene éxito
- `open http://internal.example` falla

Eso generalmente significa que el inicio del navegador está bien y el destino de navegación necesita revisión de la política.

Ejemplo: inicio bloqueado antes de que importe la navegación

- `start` falla con `not reachable after start`
- `tabs` también falla o no puede ejecutarse

Eso apunta al lanzamiento del navegador o al alcance de CDP, no a un problema de lista de permitidos (allowlist) de URL de página.

## Herramientas del agente + cómo funciona el control

El agente obtiene **una herramienta** para la automatización del navegador:

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Cómo se asigna:

- `browser snapshot` devuelve un árbol de interfaz de usuario estable (AI o ARIA).
- `browser act` utiliza los IDs de la instantánea `ref` para hacer clic/escribir/arrastrar/seleccionar.
- `browser screenshot` captura píxeles (página completa o elemento).
- `browser` acepta:
  - `profile` para elegir un perfil de navegador con nombre (openclaw, chrome o CDP remoto).
  - `target` (`sandbox` | `host` | `node`) para seleccionar dónde reside el navegador.
  - En sesiones en sandbox, `target: "host"` requiere `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si se omite `target`: las sesiones en sandbox son `sandbox` por defecto, las sesiones que no son en sandbox son `host` por defecto.
  - Si hay un nodo con capacidad de navegador conectado, la herramienta puede enrutar automáticamente a él a menos que fijes `target="host"` o `target="node"`.

Esto mantiene al agente determinista y evita selectores frágiles.

## Relacionado

- [Resumen de herramientas](/es/tools) — todas las herramientas del agente disponibles
- [Sandboxing](/es/gateway/sandboxing) — control del navegador en entornos de sandbox
- [Seguridad](/es/gateway/security) — riesgos y endurecimiento del control del navegador
