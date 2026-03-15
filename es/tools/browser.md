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
- El perfil `openclaw` **no** toca su perfil de navegador personal.
- El agente puede **abrir pestañas, leer páginas, hacer clic y escribir** en un entorno seguro.
- El perfil `user` integrado se adjunta a su sesión real de Chrome iniciada;
  `chrome-relay` es el perfil explícito de relé de extensiones.

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

## Perfiles: `openclaw` vs `user` vs `chrome-relay`

- `openclaw`: navegador administrado y aislado (no se requiere extensión).
- `user`: perfil de conexión MCP de Chrome integrado para su sesión **real de Chrome iniciada**.
- `chrome-relay`: relé de extensiones a su **navegador del sistema** (requiere que
  la extensión OpenClaw esté adjunta a una pestaña).

Para las llamadas a herramientas del navegador del agente:

- Predeterminado: use el navegador aislado `openclaw`.
- Prefiera `profile="user"` cuando importan las sesiones iniciadas existentes y el usuario
  esté en la computadora para hacer clic/aprobar cualquier mensaje de conexión.
- Use `profile="chrome-relay"` solo cuando el usuario quiera explícitamente el flujo de conexión
  de la extensión de Chrome / botón de la barra de herramientas.
- `profile` es la anulación explícita cuando quieres un modo de navegador específico.

Establezca `browser.defaultProfile: "openclaw"` si desea el modo administrado por defecto.

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
      "chrome-relay": {
        driver: "extension",
        cdpUrl: "http://127.0.0.1:18792",
        color: "#00AA00",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

Notas:

- El servicio de control del navegador se enlaza al bucle local (loopback) en un puerto derivado de `gateway.port`
  (predeterminado: `18791`, que es gateway + 2). El relé utiliza el siguiente puerto (`18792`).
- Si anula el puerto de Gateway (`gateway.port` o `OPENCLAW_GATEWAY_PORT`),
  los puertos del navegador derivados cambian para mantenerse en la misma "familia".
- `cdpUrl` toma como valor predeterminado el puerto del relé cuando no se establece.
- `remoteCdpTimeoutMs` se aplica a las comprobaciones de accesibilidad de CDP remotas (no loopback).
- `remoteCdpHandshakeTimeoutMs` se aplica a las comprobaciones de accesibilidad de WebSocket CDP remotas.
- La navegación/apertura de pestañas del navegador está protegida contra SSRF antes de la navegación y se vuelve a verificar con el mejor esfuerzo en la URL `http(s)` final después de la navegación.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` tiene como valor predeterminado `true` (modelo de red confiable). Establézcalo en `false` para una navegación estrictamente pública.
- `browser.ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como alias heredado por compatibilidad.
- `attachOnly: true` significa "nunca iniciar un navegador local; solo conectar si ya se está ejecutando".
- `color` + `color` por perfil colorean la interfaz de usuario del navegador para que pueda ver qué perfil está activo.
- El perfil predeterminado es `openclaw` (navegador independiente administrado por OpenClaw). Use `defaultProfile: "user"` para optar por el navegador del usuario que ha iniciado sesión, o `defaultProfile: "chrome-relay"` para el relé de extensiones.
- Orden de detección automática: navegador predeterminado del sistema si está basado en Chromium; de lo contrario, Chrome → Brave → Edge → Chromium → Chrome Canary.
- Los perfiles `openclaw` locales asignan automáticamente `cdpPort`/`cdpUrl` — establezca esos solo para CDP remoto.
- `driver: "existing-session"` utiliza Chrome DevTools MCP en lugar de CDP sin procesar. No
  establezca `cdpUrl` para ese controlador.

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

## Control local vs remoto

- **Control local (predeterminado):** el Gateway inicia el servicio de control de loopback y puede iniciar un navegador local.
- **Control remoto (host de nodo):** ejecute un host de nodo en la máquina que tiene el navegador; el Gateway actúa como proxy de las acciones del navegador hacia él.
- **CDP remoto:** establezca `browser.profiles.<name>.cdpUrl` (o `browser.cdpUrl`) para
  conectarse a un navegador remoto basado en Chromium. En este caso, OpenClaw no iniciará un navegador local.

Las URLs de CDP remotas pueden incluir autenticación:

- Tokens de consulta (por ejemplo, `https://provider.example?token=<token>`)
- Autenticación Básica HTTP (por ejemplo, `https://user:pass@provider.example`)

OpenClaw conserva la autenticación al llamar a los endpoints `/json/*` y al conectarse
al WebSocket CDP. Se prefieren las variables de entorno o gestores de secretos para
los tokens en lugar de confirmarlos en los archivos de configuración.

## Proxy del navegador de nodo (predeterminado de configuración cero)

Si ejecuta un **host de nodo** en la máquina que tiene su navegador, OpenClaw puede
enrutar automáticamente las llamadas de herramientas del navegador a ese nodo sin ninguna configuración adicional del navegador.
Esta es la ruta predeterminada para gateways remotos.

Notas:

- El host de nodo expone su servidor de control de navegador local a través de un **comando de proxy**.
- Los perfiles provienen de la propia configuración `browser.profiles` del nodo (igual que local).
- Desactívelo si no lo desea:
  - En el nodo: `nodeHost.browserProxy.enabled=false`
  - En el gateway: `gateway.nodes.browser.mode="off"`

## Browserless (CDP remoto alojado)

[Browserless](https://browserless.io) es un servicio de Chromium alojado que expone
endpoints CDP a través de HTTPS. Puede apuntar un perfil de navegador OpenClaw a un
endpoint de región de Browserless y autenticarse con su clave de API.

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
        cdpUrl: "https://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

Notas:

- Reemplace `<BROWSERLESS_API_KEY>` con su token real de Browserless.
- Elija el endpoint de región que coincida con su cuenta de Browserless (consulte su documentación).

## Proveedores de CDP WebSocket directo

Algunos servicios de navegador alojados exponen un endpoint **WebSocket directo** en lugar de
el descubrimiento estándar de CDP basado en HTTP (`/json/version`). OpenClaw admite ambos:

- **Puntos finales HTTP(S)** (ej. Browserless) — OpenClaw llama a `/json/version` para
  descubrir la URL del depurador WebSocket y luego se conecta.
- **Puntos finales WebSocket** (`ws://` / `wss://`) — OpenClaw se conecta directamente,
  omitiendo `/json/version`. Use esto para servicios como
  [Browserbase](https://www.browserbase.com) o cualquier proveedor que le proporcione una
  URL de WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) es una plataforma en la nube para ejecutar
navegadores headless con resolución integrada de CAPTCHA, modo sigiloso y
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
  desde el [panel de resumen](https://www.browserbase.com/overview).
- Reemplace `<BROWSERBASE_API_KEY>` con su clave de API real de Browserbase.
- Browserbase crea automáticamente una sesión del navegador al conectar el WebSocket, por lo que no
  se necesita ningún paso manual de creación de sesión.
- El nivel gratuito permite una sesión simultánea y una hora de navegador por mes.
  Consulte [precios](https://www.browserbase.com/pricing) para conocer los límites de los planes de pago.
- Consulte la [documentación de Browserbase](https://docs.browserbase.com) para obtener la referencia completa de la API,
  guías del SDK y ejemplos de integración.

## Seguridad

Ideas clave:

- El control del navegador es solo de loopback; el acceso fluye a través de la autenticación del Gateway o el emparejamiento de nodos.
- Si el control del navegador está habilitado y no se ha configurado autenticación, OpenClaw genera automáticamente `gateway.auth.token` al iniciarlo y lo guarda en la configuración.
- Mantenga el Gateway y cualquier host de nodo en una red privada (Tailscale); evite la exposición pública.
- Trate las URL/tokens de CDP remotos como secretos; prefiera variables de entorno o un administrador de secretos.

Consejos de CDP remoto:

- Prefiera puntos finales cifrados (HTTPS o WSS) y tokens de corta duración cuando sea posible.
- Evite incrustar tokens de larga duración directamente en los archivos de configuración.

## Perfiles (multinavegador)

OpenClaw admite varios perfiles con nombre (configuraciones de enrutamiento). Los perfiles pueden ser:

- **openclaw-managed**: una instancia de navegador dedicada basada en Chromium con su propio directorio de datos de usuario + puerto CDP
- **remote**: una URL CDP explícita (navegador basado en Chromium que se ejecuta en otro lugar)
- **extension relay**: sus pestañas existentes de Chrome a través del relay local + extensión de Chrome
- **existing session**: su perfil de Chrome existente a través de la autoconexión de Chrome DevTools MCP

Valores predeterminados:

- El perfil `openclaw` se crea automáticamente si falta.
- El perfil `chrome-relay` está integrado para el relé de la extensión de Chrome (apunta a `http://127.0.0.1:18792` de forma predeterminada).
- Los perfiles de sesión existentes son optativos; créelos con `--driver existing-session`.
- Los puertos CDP locales se asignan desde **18800–18899** de forma predeterminada.
- Al eliminar un perfil, se mueve su directorio de datos local a la Papelera.

Todos los endpoints de control aceptan `?profile=<name>`; la CLI usa `--browser-profile`.

## Relé de extensión de Chrome (use su Chrome existente)

OpenClaw también puede controlar **sus pestañas de Chrome existentes** (sin una instancia separada de Chrome de "openclaw") a través de un relé CDP local + una extensión de Chrome.

Guía completa: [Chrome extension](/es/tools/chrome-extension)

Flujo:

- El Gateway se ejecuta localmente (la misma máquina) o un host de nodo se ejecuta en la máquina del navegador.
- Un **servidor de relé** local escucha en un bucle local `cdpUrl` (predeterminado: `http://127.0.0.1:18792`).
- Haga clic en el icono de la extensión **OpenClaw Browser Relay** en una pestaña para adjuntarla (no se adjunta automáticamente).
- El agente controla esa pestaña a través de la herramienta normal `browser`, seleccionando el perfil correcto.

Si el Gateway se ejecuta en otro lugar, ejecute un host de nodo en la máquina del navegador para que el Gateway pueda proxy las acciones del navegador.

### Sesiones en sandbox

Si la sesión del agente está en sandbox, la herramienta `browser` puede tener como valor predeterminado `target="sandbox"` (navegador sandbox).
La toma de control del relé de la extensión de Chrome requiere el control del navegador host, por lo que:

- ejecute la sesión sin sandbox, o
- configure `agents.defaults.sandbox.browser.allowHostControl: true` y use `target="host"` al llamar a la herramienta.

### Configuración

1. Cargue la extensión (desarrollo/descomprimida):

```bash
openclaw browser extension install
```

- Chrome → `chrome://extensions` → activar “Modo de desarrollador”
- "Cargar descomprimida" → seleccione el directorio impreso por `openclaw browser extension path`
- Fije la extensión, luego haga clic en ella en la pestaña que desea controlar (la insignia muestra `ON`).

2. Úsela:

- CLI: `openclaw browser --browser-profile chrome-relay tabs`
- Herramienta de agente: `browser` con `profile="chrome-relay"`

Opcional: si desea un nombre o puerto de relé diferente, cree su propio perfil:

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

Notas:

- Este modo se basa en Playwright-on-CDP para la mayoría de las operaciones (capturas de pantalla/instantáneas/acciones).
- Desconéctese haciendo clic nuevamente en el icono de la extensión.
- Uso del agente: prefiera `profile="user"` para sitios con sesión iniciada. Use `profile="chrome-relay"`
  solo cuando específicamente desee el flujo de la extensión. El usuario debe estar presente
  para hacer clic en la extensión y adjuntar la pestaña.

## Sesión existente de Chrome mediante MCP

OpenClaw también puede adjuntarse a un perfil de Chrome en ejecución a través del servidor
oficial de Chrome DevTools MCP. Esto reutiliza las pestañas y el estado de inicio de sesión ya abiertos en
ese perfil de Chrome.

Referencias oficiales de antecedentes y configuración:

- [Chrome para desarrolladores: Usar Chrome DevTools MCP con su sesión de navegador](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [README de Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Perfil integrado:

- `user`

Opcional: cree su propio perfil de sesión existente personalizado si desea un
nombre o color diferente.

Luego en Chrome:

1. Abrir `chrome://inspect/#remote-debugging`
2. Habilitar depuración remota
3. Mantenga Chrome ejecutándose y apruebe el mensaje de conexión cuando OpenClaw se adjunte

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
- `tabs` enumera sus pestañas de Chrome ya abiertas
- `snapshot` devuelve referencias de la pestaña en vivo seleccionada

Qué verificar si la conexión no funciona:

- Chrome está en la versión `144+`
- la depuración remota está habilitada en `chrome://inspect/#remote-debugging`
- Chrome mostró y aceptó el mensaje de consentimiento de conexión

Uso del agente:

- Use `profile="user"` cuando necesite el estado del navegador con sesión iniciada del usuario.
- Si usa un perfil de sesión existente personalizado, pase ese nombre de perfil explícito.
- Prefiera `profile="user"` sobre `profile="chrome-relay"` a menos que el usuario
  explícitamente desee el flujo de la extensión / adjuntar pestaña.
- Elija este modo solo cuando el usuario esté en la computadora para aprobar el mensaje
  de conexión.
- el Gateway o el host del nodo pueden iniciar `npx chrome-devtools-mcp@latest --autoConnect`

Notas:

- Esta ruta es de mayor riesgo que el perfil aislado `openclaw` porque puede
  actuar dentro de su sesión del navegador iniciada.
- OpenClaw no inicia Chrome para este controlador; se conecta solo a una
  sesión existente.
- OpenClaw utiliza el flujo oficial de Chrome DevTools MCP `--autoConnect` aquí, no
  el flujo de trabajo del puerto de depuración remota del perfil predeterminado heredado.
- Las capturas de pantalla de sesión existente admiten capturas de página y `--ref` capturas de
  elementos desde instantáneas, pero no selectores CSS `--element`.
- La `wait --url` de sesión existente admite patrones exactos, de subcadena y glob,
  al igual que otros controladores de navegador. `wait --load networkidle` aún no es compatible.
- Algunas funciones aún requieren el relé de extensión o la ruta del navegador administrado, como
  la exportación de PDF y la intercepción de descargas.
- Deje el relé solo de bucle local (loopback) de forma predeterminada. Si el relé debe ser accesible desde un espacio de nombres de red diferente (por ejemplo, Gateway en WSL2, Chrome en Windows), configure `browser.relayBindHost` en una dirección de enlace explícita como `0.0.0.0` manteniendo la red circundante privada y autenticada.

Ejemplo WSL2 / entre espacios de nombres:

```json5
{
  browser: {
    enabled: true,
    relayBindHost: "0.0.0.0",
    defaultProfile: "chrome-relay",
  },
}
```

## Garantías de aislamiento

- **Directorio de datos de usuario dedicado**: nunca toca su perfil de navegador personal.
- **Puertos dedicados**: evita `9222` para prevenir colisiones con los flujos de trabajo de desarrollo.
- **Control determinista de pestañas**: apunta a las pestañas por `targetId`, no por "última pestaña".

## Selección del navegador

Al iniciarse localmente, OpenClaw elige el primero disponible:

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Puede anularlo con `browser.executablePath`.

Plataformas:

- macOS: comprueba `/Applications` y `~/Applications`.
- Linux: busca `google-chrome`, `brave`, `microsoft-edge`, `chromium`, etc.
- Windows: comprueba las ubicaciones de instalación comunes.

## API de control (opcional)

Solo para integraciones locales, el Gateway expone una pequeña API HTTP de bucle local:

- Estado/iniciar/detener: `GET /`, `POST /start`, `POST /stop`
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

Si la autenticación de la puerta de enlace está configurada, las rutas HTTP del navegador también requieren autenticación:

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` o autenticación básica HTTP con esa contraseña

### Requisito de Playwright

Algunas características (navegar/actuar/instantánea de IA/instantánea de rol, capturas de pantalla de elementos, PDF) requieren
Playwright. Si Playwright no está instalado, esos endpoints devuelven un error 501
claro. Las instantáneas ARIA y las capturas de pantalla básicas siguen funcionando para Chrome administrado por OpenClaw.
Para el controlador de retransmisión (relay) de la extensión de Chrome, las instantáneas ARIA y las capturas de pantalla requieren Playwright.

Si ve `Playwright is not available in this gateway build`, instale el paquete completo
de Playwright (no `playwright-core`) y reinicie la puerta de enlace, o reinstale
OpenClaw con soporte de navegador.

#### Instalación de Playwright en Docker

Si su Gateway se ejecuta en Docker, evite `npx playwright` (conflictos de anulación de npm).
Use la CLI incluida en su lugar:

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Para conservar las descargas del navegador, establezca `PLAYWRIGHT_BROWSERS_PATH` (por ejemplo,
`/home/node/.cache/ms-playwright`) y asegúrese de que `/home/node` se conserve mediante
`OPENCLAW_HOME_VOLUME` o un montaje de enlace (bind mount). Consulte [Docker](/es/install/docker).

## Cómo funciona (interno)

Flujo de alto nivel:

- Un pequeño **servidor de control** acepta solicitudes HTTP.
- Se conecta a navegadores basados en Chromium (Chrome/Brave/Edge/Chromium) a través de **CDP**.
- Para acciones avanzadas (clic/escribir/captura de pantalla/PDF), utiliza **Playwright** sobre
  CDP.
- Cuando falta Playwright, solo están disponibles las operaciones que no son de Playwright.

Este diseño mantiene al agente en una interfaz estable y determinista, al tiempo que le permite
intercambiar navegadores y perfiles locales/remotos.

## Referencia rápida de la CLI

Todos los comandos aceptan `--browser-profile <name>` para apuntar a un perfil específico.
Todos los comandos también aceptan `--json` para una salida legible por máquina (cargas estables).

Conceptos básicos:

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
- Las rutas de salida de descarga y rastreo están limitadas a las raíces temporales de OpenClaw:
  - rastros: `/tmp/openclaw` (alternativo: `${os.tmpdir()}/openclaw`)
  - descargas: `/tmp/openclaw/downloads` (alternativo: `${os.tmpdir()}/openclaw/downloads`)
- Las rutas de carga están limitadas a una raíz de cargas temporales de OpenClaw:
  - cargas: `/tmp/openclaw/uploads` (alternativo: `${os.tmpdir()}/openclaw/uploads`)
- `upload` también puede configurar entradas de archivos directamente a través de `--input-ref` o `--element`.
- `snapshot`:
  - `--format ai` (predeterminado cuando Playwright está instalado): devuelve una instantánea de IA con referencias numéricas (`aria-ref="<n>"`).
  - `--format aria`: devuelve el árbol de accesibilidad (sin referencias; solo inspección).
  - `--efficient` (o `--mode efficient`): preajuste compacto de instantánea de rol (interactivo + compacto + profundidad + maxChars inferior).
  - Configuración por defecto (solo herramienta/CLI): establezca `browser.snapshotDefaults.mode: "efficient"` para usar instantáneas eficientes cuando el llamador no pase un modo (vea [Gateway configuration](/es/gateway/configuration#browser-openclaw-managed-browser)).
  - Las opciones de instantánea de rol (`--interactive`, `--compact`, `--depth`, `--selector`) fuerzan una instantánea basada en roles con referencias como `ref=e12`.
  - `--frame "<iframe selector>"` limita las instantáneas de rol a un iframe (se combina con referencias de rol como `e12`).
  - `--interactive` muestra una lista plana y fácil de seleccionar de elementos interactivos (lo mejor para ejecutar acciones).
  - `--labels` añade una captura de pantalla solo de la ventana con etiquetas de referencia superpuestas (imprime `MEDIA:<path>`).
- `click`/`type`/etc requieren una `ref` de `snapshot` (ya sea `12` numérico o referencia de rol `e12`).
  Los selectores CSS no son compatibles intencionalmente para las acciones.

## Instantáneas y referencias

OpenClaw admite dos estilos de “instantánea”:

- **Instantánea de IA (referencias numéricas)**: `openclaw browser snapshot` (por defecto; `--format ai`)
  - Salida: una instantánea de texto que incluye referencias numéricas.
  - Acciones: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internamente, la referencia se resuelve mediante `aria-ref` de Playwright.

- **Instantánea de rol (referencias de rol como `e12`)**: `openclaw browser snapshot --interactive` (o `--compact`, `--depth`, `--selector`, `--frame`)
  - Salida: una lista/árbol basado en roles con `[ref=e12]` (y `[nth=1]` opcional).
  - Acciones: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internamente, la referencia se resuelve mediante `getByRole(...)` (más `nth()` para duplicados).
  - Añada `--labels` para incluir una captura de pantalla del viewport con etiquetas `e12` superpuestas.

Comportamiento de la referencia:

- Las referencias **no son estables entre navegaciones**; si algo falla, vuelva a ejecutar `snapshot` y use una referencia nueva.
- Si la instantánea del rol se tomó con `--frame`, las referencias del rol están limitadas a ese iframe hasta la siguiente instantánea del rol.

## Potenciadores de espera

Puede esperar algo más que solo tiempo/texto:

- Espere a la URL (los globos son compatibles con Playwright):
  - `openclaw browser wait --url "**/dash"`
- Espere el estado de carga:
  - `openclaw browser wait --load networkidle`
- Espere un predicado JS:
  - `openclaw browser wait --fn "window.ready===true"`
- Espere a que un selector se haga visible:
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

Cuando falla una acción (p. ej., “no visible”, “violación del modo estricto”, “cubierto”):

1. `openclaw browser snapshot --interactive`
2. Use `click <ref>` / `type <ref>` (se prefieren referencias de rol en el modo interactivo)
3. Si aún falla: `openclaw browser highlight <ref>` para ver qué está apuntando Playwright
4. Si la página se comporta de forma extraña:
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Para una depuración profunda: grabe un rastro:
   - `openclaw browser trace start`
   - reproduzca el problema
   - `openclaw browser trace stop` (imprime `TRACE:<path>`)

## Salida JSON

`--json` es para secuencias de comandos y herramientas estructuradas.

Ejemplos:

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Las instantáneas de rol en JSON incluyen `refs` más un pequeño bloque `stats` (líneas/caracteres/referencias/interactivo) para que las herramientas puedan razonar sobre el tamaño y la densidad del payload.

## Perillas de estado y entorno

Estas son útiles para flujos de trabajo de “hacer que el sitio se comporte como X”:

- Cookies: `cookies`, `cookies set`, `cookies clear`
- Almacenamiento: `storage local|session get|set|clear`
- Sin conexión: `set offline on|off`
- Encabezados: `set headers --headers-json '{"X-Debug":"1"}'` (el `set headers --json '{"X-Debug":"1"}'` heredado sigue siendo compatible)
- Autenticación básica HTTP: `set credentials user pass` (o `--clear`)
- Geolocalización: `set geo <lat> <lon> --origin "https://example.com"` (o `--clear`)
- Medios: `set media dark|light|no-preference|none`
- Zona horaria / configuración regional: `set timezone ...`, `set locale ...`
- Dispositivo / ventana gráfica (viewport):
  - `set device "iPhone 14"` (ajustes predefinidos de dispositivos de Playwright)
  - `set viewport 1280 720`

## Seguridad y privacidad

- El perfil de navegador de openclaw puede contener sesiones iniciadas; trátelo como confidencial.
- `browser act kind=evaluate` / `openclaw browser evaluate` y `wait --fn`
  ejecutan JavaScript arbitrario en el contexto de la página. La inyección de prompts puede dirigir
  esto. Desactívelo con `browser.evaluateEnabled=false` si no lo necesita.
- Para notas sobre inicios de sesión y anti-bots (X/Twitter, etc.), consulte [Inicio de sesión en el navegador + publicaciones en X/Twitter](/es/tools/browser-login).
- Mantenga el host Gateway/node privado (solo loopback o tailnet).
- Los puntos de conexión CDP remotos son potentes; túnelelos y protéjalos.

Ejemplo en modo estricto (bloquear destinos privados/internos de manera predeterminada):

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

Para configuraciones de host dividido WSL2 Gateway + Windows Chrome, consulte
[WSL2 + Windows + solución de problemas de CDP remoto de Chrome](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Herramientas del agente + funcionamiento del control

El agente obtiene **una herramienta** para la automatización del navegador:

- `browser` — estado/iniciar/detener/pestañas/abrir/enfoque/cerrar/instantánea/captura de pantalla/navegar/actuar

Cómo se asigna:

- `browser snapshot` devuelve un árbol de interfaz de usuario estable (IA o ARIA).
- `browser act` utiliza los IDs de la instantánea `ref` para hacer clic/escribir/arrastrar/seleccionar.
- `browser screenshot` captura píxeles (página completa o elemento).
- `browser` acepta:
  - `profile` para elegir un perfil de navegador con nombre (openclaw, chrome o CDP remoto).
  - `target` (`sandbox` | `host` | `node`) para seleccionar dónde reside el navegador.
  - En sesiones en sandbox, `target: "host"` requiere `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si se omite `target`: las sesiones en sandbox usan por defecto `sandbox`, las sesiones sin sandbox usan por defecto `host`.
  - Si hay un nodo con capacidad de navegador conectado, la herramienta puede enrutar automáticamente a él a menos que fijes `target="host"` o `target="node"`.

Esto mantiene al agente determinista y evita selectores frágiles.

import es from "/components/footer/es.mdx";

<es />
