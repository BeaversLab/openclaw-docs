---
summary: "Servicio de control integrado del navegador + comandos de acción"
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
- El perfil `openclaw` **no** toca tu perfil personal del navegador.
- El agente puede **abrir pestañas, leer páginas, hacer clic y escribir** en un entorno seguro.
- El perfil incorporado `user` se adjunta a tu sesión real de Chrome con sesión iniciada a través de Chrome MCP.

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

## Control de complementos

La herramienta `browser` predeterminada ahora es un complemento incluido que se envía habilitado de forma predeterminada. Esto significa que puedes desactivarlo o reemplazarlo sin eliminar el resto del sistema de complementos de OpenClaw:

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

Desactiva el complemento incluido antes de instalar otro complemento que proporcione el mismo nombre de herramienta `browser`. La experiencia del navegador predeterminada necesita ambos:

- `plugins.entries.browser.enabled` no desactivado
- `browser.enabled=true`

Si solo desactivas el complemento, la CLI del navegador incluida (`openclaw browser`), el método de puerta de enlace (`browser.request`), la herramienta del agente y el servicio de control del navegador predeterminado desaparecen todos juntos. Tu configuración `browser.*` permanece intacta para que un complemento de reemplazo la reutilice.

El complemento del navegador incluido también posee ahora la implementación del tiempo de ejecución del navegador.
Core mantiene solo los asistentes compartidos del Plugin SDK y las reexportaciones de compatibilidad para
las rutas de importación internas más antiguas. En la práctica, eliminar o reemplazar
`extensions/browser` elimina el conjunto de funciones del navegador en lugar de dejar atrás
un segundo tiempo de ejecución propiedad de Core.

Los cambios en la configuración del navegador aún requieren un reinicio del Gateway para que el complemento incluido
pueda volver a registrar su servicio de navegador con la nueva configuración.

## Perfiles: `openclaw` vs `user`

- `openclaw`: navegador administrado y aislado (no se requiere extensión).
- `user`: perfil de conexión MCP de Chrome integrado para su sesión **real de Chrome con inicio de sesión**.

Para las llamadas a herramientas del navegador del agente:

- Predeterminado: usar el navegador aislado `openclaw`.
- Prefiera `profile="user"` cuando las sesiones con inicio de sesión existentes importen y el usuario
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
      dangerouslyAllowPrivateNetwork: true, // default trusted-network mode
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

- El servicio de control del navegador se vincula al bucle local (loopback) en un puerto derivado de `gateway.port`
  (predeterminado: `18791`, que es gateway + 2).
- Si anula el puerto del Gateway (`gateway.port` o `OPENCLAW_GATEWAY_PORT`),
  los puertos del navegador derivados cambian para mantenerse en la misma "familia".
- `cdpUrl` tiene como valor predeterminado el puerto local de CDP administrado si no está establecido.
- `remoteCdpTimeoutMs` se aplica a las comprobaciones de accesibilidad de CDP remotas (que no son de bucle local).
- `remoteCdpHandshakeTimeoutMs` se aplica a las comprobaciones de accesibilidad de WebSocket de CDP remotas.
- La navegación/apertura de pestañas del navegador está protegida contra SSRF antes de la navegación y se vuelve a verificar con el mejor esfuerzo posible en la URL `http(s)` final después de la navegación.
- En modo SSRF estricto, también se comprueba el descubrimiento y sondas de extremos CDP remotos (`cdpUrl`, incluidas las búsquedas `/json/version`).
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` tiene como valor predeterminado `true` (modelo de red confiable). Establézcalo en `false` para una navegación estricta solo pública.
- `browser.ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como alias heredado por compatibilidad.
- `attachOnly: true` significa "nunca iniciar un navegador local; solo conectarse si ya se está ejecutando".
- `color` + `color` por perfil tiñen la interfaz de usuario del navegador para que pueda ver qué perfil está activo.
- El perfil predeterminado es `openclaw` (navegador independiente administrado por OpenClaw). Use `defaultProfile: "user"` para optar por el navegador del usuario que ha iniciado sesión.
- Orden de autodetección: navegador predeterminado del sistema si está basado en Chromium; de lo contrario, Chrome → Brave → Edge → Chromium → Chrome Canary.
- Los perfiles `openclaw` locales asignan automáticamente `cdpPort`/`cdpUrl` — establezca esos solo para CDP remoto.
- `driver: "existing-session"` utiliza Chrome DevTools MCP en lugar de CDP sin formato. No
  establezca `cdpUrl` para ese controlador.
- Establezca `browser.profiles.<name>.userDataDir` cuando un perfil de sesión existente
  deba adjuntarse a un perfil de usuario de Chromium que no sea el predeterminado, como Brave o Edge.

## Usar Brave (u otro navegador basado en Chromium)

Si su navegador **predeterminado del sistema** está basado en Chromium (Chrome/Brave/Edge/etc.),
OpenClaw lo utiliza automáticamente. Establezca `browser.executablePath` para anular
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

- **Control local (predeterminado):** el Gateway inicia el servicio de control de bucle invertido y puede lanzar un navegador local.
- **Control remoto (host de nodo):** ejecute un host de nodo en la máquina que tiene el navegador; el Gateway actúa como proxy de las acciones del navegador hacia él.
- **CDP remoto:** establezca `browser.profiles.<name>.cdpUrl` (o `browser.cdpUrl`) para
  adjuntarse a un navegador remoto basado en Chromium. En este caso, OpenClaw no iniciará un navegador local.

Las URL de CDP remotas pueden incluir autenticación:

- Tokens de consulta (p. ej., `https://provider.example?token=<token>`)
- Autenticación básica HTTP (p. ej., `https://user:pass@provider.example`)

OpenClaw conserva la autenticación al llamar a los endpoints `/json/*` y al conectar
al WebSocket de CDP. Se prefieren las variables de entorno o gestores de secretos para
los tokens en lugar de confirmarlos en los archivos de configuración.

## Proxy de navegador de nodo (predeterminado sin configuración)

Si ejecuta un **host de nodo** en la máquina que tiene su navegador, OpenClaw puede
enrutar automáticamente las llamadas de herramientas del navegador a ese nodo sin ninguna configuración adicional del navegador.
Esta es la ruta predeterminada para gateways remotos.

Notas:

- El host del nodo expone su servidor de control del navegador local a través de un **comando de proxy**.
- Los perfiles provienen de la configuración `browser.profiles` del propio nodo (igual que en local).
- `nodeHost.browserProxy.allowProfiles` es opcional. Déjelo vacío para el comportamiento heredado/predeterminado: todos los perfiles configurados siguen siendo accesibles a través del proxy, incluidas las rutas de creación/eliminación de perfiles.
- Si establece `nodeHost.browserProxy.allowProfiles`, OpenClaw lo trata como un límite de privilegio mínimo: solo se pueden dirigir los perfiles en la lista de permitidos, y las rutas de creación/eliminación de perfiles persistentes se bloquean en la superficie del proxy.
- Deshabilítelo si no lo desea:
  - En el nodo: `nodeHost.browserProxy.enabled=false`
  - En la puerta de enlace: `gateway.nodes.browser.mode="off"`

## Browserless (CDP remoto alojado)

[Browserless](https://browserless.io) es un servicio de Chromium alojado que expone
URL de conexión CDP a través de HTTPS y WebSocket. OpenClaw puede usar cualquiera de las dos formas, pero
para un perfil de navegador remoto, la opción más sencilla es la URL de WebSocket directa
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

## Proveedores de CDP WebSocket directos

Algunos servicios de navegador alojados exponen un extremo **WebSocket directo** en lugar de
el descubrimiento CDP basado en HTTP estándar (`/json/version`). OpenClaw admite ambos:

- **Extremos HTTP(S)** — OpenClaw llama a `/json/version` para descubrir la
  URL del depurador WebSocket y luego se conecta.
- **Extremos WebSocket** (`ws://` / `wss://`) — OpenClaw se conecta directamente,
  omitiendo `/json/version`. Use esto para servicios como
  [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com), o cualquier proveedor que le proporcione una
  URL WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) es una plataforma en la nube para ejecutar
navegadores headless con resolución integrada de CAPTCHA, modo sigiloso y servidores proxy
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

- [Regístrese](https://www.browserbase.com/sign-up) y copie su **API Key**
  desde el [panel de resumen](https://www.browserbase.com/overview).
- Reemplace `<BROWSERBASE_API_KEY>` con su clave de API real de Browserbase.
- Browserbase crea automáticamente una sesión de navegador al conectar por WebSocket, por lo que no
  se necesita ningún paso de creación de sesión manual.
- El nivel gratuito permite una sesión simultánea y una hora de navegador por mes.
  Consulte [precios](https://www.browserbase.com/pricing) para conocer los límites de los planes de pago.
- Consulte la [documentación de Browserbase](https://docs.browserbase.com) para obtener una referencia completa de la API,
  guías del SDK y ejemplos de integración.

## Seguridad

Ideas clave:

- El control del navegador es solo de bucle local (loopback); el acceso fluye a través de la autenticación del Gateway o el emparejamiento de nodos.
- Si el control del navegador está habilitado y no se ha configurado autenticación, OpenClaw genera automáticamente `gateway.auth.token` al iniciarse y lo guarda en la configuración.
- Mantenga el Gateway y cualquier host de nodos en una red privada (Tailscale); evite la exposición pública.
- Trate las URLs/tokens de CDP remotos como secretos; prefiera variables de entorno o un administrador de secretos.

Consejos para CDP remoto:

- Prefiera puntos finales cifrados (HTTPS o WSS) y tokens de corta duración cuando sea posible.
- Evite incrustar tokens de larga duración directamente en los archivos de configuración.

## Perfiles (multinavegador)

OpenClaw admite varios perfiles con nombre (configuraciones de enrutamiento). Los perfiles pueden ser:

- **openclaw-managed**: una instancia de navegador dedicada basada en Chromium con su propio directorio de datos de usuario + puerto CDP
- **remoto**: una URL de CDP explícita (navegador basado en Chromium que se ejecuta en otro lugar)
- **sesión existente**: su perfil de Chrome existente a través de la conexión automática de Chrome DevTools MCP

Valores predeterminados:

- El perfil `openclaw` se crea automáticamente si falta.
- El perfil `user` está integrado para la conexión a sesiones existentes de Chrome MCP.
- Los perfiles de sesión existente son opt-in más allá de `user`; créelos con `--driver existing-session`.
- Los puertos locales de CDP se asignan desde **18800–18899** de forma predeterminada.
- Eliminar un perfil mueve su directorio de datos locales a la Papelera.

Todos los endpoints de control aceptan `?profile=<name>`; la CLI usa `--browser-profile`.

## Sesión existente a través de Chrome DevTools MCP

OpenClaw también puede adjuntarse a un perfil de navegador basado en Chromium que se esté ejecutando a través del
servidor oficial de MCP de Chrome DevTools. Esto reutiliza las pestañas y el estado de inicio de sesión
ya abiertos en ese perfil de navegador.

Referencias oficiales de antecedentes y configuración:

- [Chrome para desarrolladores: Use Chrome DevTools MCP con su sesión de navegador](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [README de Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Perfil integrado:

- `user`

Opcional: cree su propio perfil personalizado de sesión existente si desea un
nombre, color o directorio de datos del navegador diferente.

Comportamiento predeterminado:

- El perfil integrado `user` utiliza la autoconexión de Chrome MCP, que tiene como objetivo el
  perfil local predeterminado de Google Chrome.

Use `userDataDir` para Brave, Edge, Chromium o un perfil de Chrome no predeterminado:

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

1. Abra la página de inspección de ese navegador para la depuración remota.
2. Habilite la depuración remota.
3. Mantenga el navegador en ejecución y apruebe el mensaje de conexión cuando OpenClaw se adjunte.

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
- `tabs` lista las pestañas del navegador ya abiertas
- `snapshot` devuelve referencias de la pestaña en vivo seleccionada

Qué comprobar si la conexión no funciona:

- el navegador de destino basado en Chromium es la versión `144+`
- la depuración remota está habilitada en la página de inspección de ese navegador
- el navegador mostró y aceptó el mensaje de consentimiento de conexión
- `openclaw doctor` migra la configuración del navegador antigua basada en extensiones y comprueba que
  Chrome esté instalado localmente para los perfiles de autoconexión predeterminados, pero no puede
  habilitar la depuración remota del lado del navegador por usted

Uso del agente:

- Use `profile="user"` cuando necesite el estado del navegador con la sesión iniciada del usuario.
- Si utiliza un perfil de sesión existente personalizado, pase ese nombre de perfil explícito.
- Solo elija este modo cuando el usuario esté en el ordenador para aprobar el mensaje
  de adjuntar.
- el Gateway o el host del nodo puede iniciar `npx chrome-devtools-mcp@latest --autoConnect`

Notas:

- Esta ruta es de mayor riesgo que el perfil aislado `openclaw` porque puede
  actuar dentro de su sesión de navegador iniciada.
- OpenClaw no inicia el navegador para este controlador; se adjunta a una
  sesión existente únicamente.
- OpenClaw utiliza el flujo oficial de MCP de Chrome DevTools `--autoConnect` aquí. Si
  `userDataDir` está configurado, OpenClaw lo pasa para dirigirse a ese directorio
  de datos de usuario de Chromium explícito.
- Las capturas de pantalla de sesión existente admiten capturas de página y capturas
  de elementos `--ref` desde instantáneas, pero no selectores `--element` de CSS.
- El `wait --url` de sesión existente admite patrones exactos, de subcadena y glob,
  al igual que otros controladores de navegador. `wait --load networkidle` aún no es compatible.
- Algunas características todavía requieren la ruta del navegador administrado, como la exportación de PDF y
  la intercepción de descargas.
- La sesión existente es local del host. Si Chrome está en una máquina diferente o en un
  espacio de nombres de red diferente, utilice CDP remoto o un host de nodo en su lugar.

## Garantías de aislamiento

- **Directorio de datos de usuario dedicado**: nunca toca tu perfil de navegador personal.
- **Puertos dedicados**: evita `9222` para prevenir colisiones con los flujos de trabajo de desarrollo.
- **Control determinista de pestañas**: apunta a las pestañas por `targetId`, no por “última pestaña”.

## Selección del navegador

Al iniciarse localmente, OpenClaw elige el primero disponible:

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Puedes anular esto con `browser.executablePath`.

Plataformas:

- macOS: comprueba `/Applications` y `~/Applications`.
- Linux: busca `google-chrome`, `brave`, `microsoft-edge`, `chromium`, etc.
- Windows: comprueba las ubicaciones de instalación comunes.

## API de control (opcional)

Solo para integraciones locales, el Gateway expone una pequeña API HTTP de loopback:

- Estado/iniciar/parar: `GET /`, `POST /start`, `POST /stop`
- Pestañas: `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Instantánea/captura de pantalla: `GET /snapshot`, `POST /screenshot`
- Acciones: `POST /navigate`, `POST /act`
- Ganchos: `POST /hooks/file-chooser`, `POST /hooks/dialog`
- Descargas: `POST /download`, `POST /wait/download`
- Depuración: `GET /console`, `POST /pdf`
- Depuración: `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- Red: `POST /response/body`
- Estado: `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- Estado: `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- Configuración: `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

Todos los endpoints aceptan `?profile=<name>`.

Si la autenticación de la puerta de enlace está configurada, las rutas HTTP del navegador también requieren autenticación:

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` o autenticación HTTP Basic con esa contraseña

### Requisito de Playwright

Algunas funciones (navegar/actuar/snapshot de IA/snapshot de rol, capturas de pantalla de elementos, PDF) requieren
Playwright. Si Playwright no está instalado, esos endpoints devuelven un error 501
claro. Las instantáneas ARIA y las capturas de pantalla básicas siguen funcionando para Chrome administrado por OpenClaw.

Si ve `Playwright is not available in this gateway build`, instale el paquete completo
de Playwright (no `playwright-core`) y reinicie el gateway, o reinstale
OpenClaw con soporte para navegador.

#### Instalación de Playwright en Docker

Si su Gateway se ejecuta en Docker, evite `npx playwright` (conflictos de invalidación de npm).
Use la CLI incluida en su lugar:

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Para conservar las descargas del navegador, establezca `PLAYWRIGHT_BROWSERS_PATH` (por ejemplo,
`/home/node/.cache/ms-playwright`) y asegúrese de que `/home/node` se conserve mediante
`OPENCLAW_HOME_VOLUME` o un montaje de enlace. Consulte [Docker](/en/install/docker).

## Cómo funciona (interno)

Flujo de alto nivel:

- Un pequeño **servidor de control** acepta solicitudes HTTP.
- Se conecta a navegadores basados en Chromium (Chrome/Brave/Edge/Chromium) a través de **CDP**.
- Para acciones avanzadas (clic/escribir/instantánea/PDF), usa **Playwright** encima
  de CDP.
- Cuando falta Playwright, solo están disponibles las operaciones que no son de Playwright.

Este diseño mantiene al agente en una interfaz estable y determinista, al tiempo que le permite
intercambiar navegadores y perfiles locales/remotos.

## Referencia rápida de la CLI

Todos los comandos aceptan `--browser-profile <name>` para apuntar a un perfil específico.
Todos los comandos también aceptan `--json` para una salida legible por máquina (cargas estables).

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
- Las rutas de salida de descargas y seguimientos están restringidas a las raíces temporales de OpenClaw:
  - rastros: `/tmp/openclaw` (alternativo: `${os.tmpdir()}/openclaw`)
  - descargas: `/tmp/openclaw/downloads` (alternativo: `${os.tmpdir()}/openclaw/downloads`)
- Las rutas de carga están restringidas a una raíz temporal de cargas de OpenClaw:
  - cargas: `/tmp/openclaw/uploads` (alternativo: `${os.tmpdir()}/openclaw/uploads`)
- `upload` también puede establecer entradas de archivos directamente mediante `--input-ref` o `--element`.
- `snapshot`:
  - `--format ai` (predeterminado cuando Playwright está instalado): devuelve una instantánea de IA con referencias numéricas (`aria-ref="<n>"`).
  - `--format aria`: devuelve el árbol de accesibilidad (sin referencias; solo inspección).
  - `--efficient` (o `--mode efficient`): configuración predefinida de instantánea de rol compacta (interactivo + compacto + profundidad + maxChars inferior).
  - Predeterminado de configuración (solo herramienta/CLI): configure `browser.snapshotDefaults.mode: "efficient"` para usar instantáneas eficientes cuando el llamador no pasa un modo (consulte [Gateway configuration](/en/gateway/configuration-reference#browser)).
  - Las opciones de instantánea de rol (`--interactive`, `--compact`, `--depth`, `--selector`) fuerzan una instantánea basada en roles con referencias como `ref=e12`.
  - `--frame "<iframe selector>"` limita las instantáneas de rol a un iframe (se empareja con referencias de rol como `e12`).
  - `--interactive` muestra una lista plana y fácil de seleccionar de elementos interactivos (lo mejor para impulsar acciones).
  - `--labels` añade una captura de pantalla solo del viewport con etiquetas de referencia superpuestas (imprime `MEDIA:<path>`).
- `click`/`type`/etc requieren un `ref` de `snapshot` (ya sea `12` numérico o referencia de rol `e12`).
  Los selectores CSS no se admiten intencionalmente para las acciones.

## Instantáneas y referencias

OpenClaw admite dos estilos de “instantánea”:

- **Instantánea de IA (referencias numéricas)**: `openclaw browser snapshot` (predeterminado; `--format ai`)
  - Salida: una instantánea de texto que incluye referencias numéricas.
  - Acciones: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internamente, la referencia se resuelve mediante el `aria-ref` de Playwright.

- **Instantánea de rol (referencias de rol como `e12`)**: `openclaw browser snapshot --interactive` (o `--compact`, `--depth`, `--selector`, `--frame`)
  - Salida: una lista/árbol basado en roles con `[ref=e12]` (y `[nth=1]` opcional).
  - Acciones: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internamente, la ref se resuelve mediante `getByRole(...)` (más `nth()` para duplicados).
  - Añada `--labels` para incluir una captura de pantalla de la ventana gráfica con etiquetas `e12` superpuestas.

Comportamiento de la ref:

- Las referencias **no son estables entre navegaciones**; si algo falla, vuelve a ejecutar `snapshot` y usa una referencia nueva.
- Si la instantánea del rol se tomó con `--frame`, las referencias del rol están limitadas a ese iframe hasta la siguiente instantánea del rol.

## Mejoras de espera

Puedes esperar algo más que solo tiempo/texto:

- Esperar a la URL (los globos son compatibles con Playwright):
  - `openclaw browser wait --url "**/dash"`
- Esperar el estado de carga:
  - `openclaw browser wait --load networkidle`
- Esperar un predicado de JS:
  - `openclaw browser wait --fn "window.ready===true"`
- Esperar a que un selector sea visible:
  - `openclaw browser wait "#main"`

Estos se pueden combinar:

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## Depurar flujos de trabajo

Cuando falla una acción (p. ej., "no visible", "violación del modo estricto", "cubierto"):

1. `openclaw browser snapshot --interactive`
2. Usa `click <ref>` / `type <ref>` (se prefieren las referencias de rol en el modo interactivo)
3. Si aún falla: `openclaw browser highlight <ref>` para ver qué está enfocando Playwright
4. Si la página se comporta de forma extraña:
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Para una depuración profunda: graba un rastro:
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

Las instantáneas de roles en JSON incluyen `refs` más un pequeño bloque `stats` (líneas/caracteres/refs/interactivo) para que las herramientas puedan razonar sobre el tamaño y la densidad de la carga útil.

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
  - `set device "iPhone 14"` (preajustes de dispositivos de Playwright)
  - `set viewport 1280 720`

## Seguridad y privacidad

- El perfil de navegador de OpenClaw puede contener sesiones iniciadas; trátelo como confidencial.
- `browser act kind=evaluate` / `openclaw browser evaluate` y `wait --fn`
  ejecutan JavaScript arbitrario en el contexto de la página. La inyección de avisos puede dirigir
  esto. Desactívelo con `browser.evaluateEnabled=false` si no lo necesita.
- Para notas sobre inicios de sesión y antibots (X/Twitter, etc.), consulte [Inicio de sesión en el navegador + publicación en X/Twitter](/en/tools/browser-login).
- Mantenga el host Gateway/nodo privado (solo bucle local o red de cola).
- Los puntos finales CDP remotos son potentes; protéjalos mediante túneles.

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

Para problemas específicos de Linux (especialmente Chromium snap), consulte
[Solución de problemas del navegador](/en/tools/browser-linux-troubleshooting).

Para configuraciones de host dividido con WSL2 Gateway + Windows Chrome, consulte
[Solución de problemas de WSL2 + Windows + CDP remoto de Chrome](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Herramientas del agente + funcionamiento del control

El agente obtiene **una herramienta** para la automatización del navegador:

- `browser` — estado/iniciar/detener/pestañas/abrir/enfocar/cerrar/instantánea/captura de pantalla/navegar/actuar

Cómo se mapea:

- `browser snapshot` devuelve un árbol de interfaz de usuario estable (AI o ARIA).
- `browser act` utiliza los IDs de la instantánea `ref` para hacer clic/escribir/arrastrar/seleccionar.
- `browser screenshot` captura píxeles (página completa o elemento).
- `browser` acepta:
  - `profile` para elegir un perfil de navegador con nombre (openclaw, chrome o CDP remoto).
  - `target` (`sandbox` | `host` | `node`) para seleccionar dónde reside el navegador.
  - En sesiones en sandbox, `target: "host"` requiere `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si se omite `target`: las sesiones en sandbox usan por defecto `sandbox`, las sesiones sin sandbox usan por defecto `host`.
  - Si hay un nodo con capacidad de navegador conectado, la herramienta puede enrutar automáticamente a él a menos que ancles `target="host"` o `target="node"`.

Esto mantiene al agente determinista y evita selectores frágiles.
