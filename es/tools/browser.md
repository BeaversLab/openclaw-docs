---
summary: "Servicio de control de navegador integrado + comandos de acción"
read_when:
  - Agregar automatización del navegador controlada por el agente
  - Depurar por qué openclaw está interfiriendo con su propio Chrome
  - Implementar configuración del navegador + ciclo de vida en la aplicación de macOS
title: "Navegador (administrado por OpenClaw)"
---

# Navegador (administrado por openclaw)

OpenClaw puede ejecutar un **perfil dedicado de Chrome/Brave/Edge/Chromium** que controla el agente.
Está aislado de su navegador personal y se gestiona a través de un pequeño servicio
de control local dentro de la Gateway (solo bucle local).

Vista de principiante:

- Piense en ello como un **navegador separado, solo para el agente**.
- El perfil `openclaw` **no** toca su perfil de navegador personal.
- El agente puede **abrir pestañas, leer páginas, hacer clic y escribir** en un carril seguro.
- El perfil integrado `user` se adjunta a su sesión real de Chrome iniciada a través de Chrome MCP.

## Lo que obtienes

- Un perfil de navegador separado llamado **openclaw** (acentos en naranja por defecto).
- Control determinista de pestañas (listar/abrir/enfocar/cerrar).
- Acciones del agente (clic/escribir/arrastrar/seleccionar), instantáneas, capturas de pantalla, PDF.
- Soporte opcional de múltiples perfiles (`openclaw`, `work`, `remote`, ...).

Este navegador **no** es su navegador principal. Es una superficie segura y aislada para
la automatización y verificación de agentes.

## Inicio rápido

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Si aparece "Browser disabled" (Navegador desactivado), actívelo en la configuración (ver abajo) y reinicie la
Gateway.

## Perfiles: `openclaw` vs `user`

- `openclaw`: navegador administrado y aislado (no se requiere extensión).
- `user`: perfil de conexión Chrome MCP integrado para su sesión de **Chrome real iniciada**.

Para las llamadas a herramientas del navegador del agente:

- Predeterminado: usar el navegador aislado `openclaw`.
- Prefiera `profile="user"` cuando importan las sesiones iniciadas existentes y el usuario
  está en la computadora para hacer clic/aprobar cualquier mensaje de conexión.
- `profile` es la anulación explícita cuando desea un modo de navegador específico.

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

- El servicio de control del navegador se enlaza al bucle local en un puerto derivado de `gateway.port`
  (predeterminado: `18791`, que es gateway + 2).
- Si anulas el puerto Gateway (`gateway.port` o `OPENCLAW_GATEWAY_PORT`),
  los puertos del navegador derivados cambian para mantenerse en la misma “familia”.
- `cdpUrl` toma como valor predeterminado el puerto CDP local administrado si no se establece.
- `remoteCdpTimeoutMs` se aplica a las comprobaciones de accesibilidad de CDP remotas (no de bucle local).
- `remoteCdpHandshakeTimeoutMs` se aplica a las comprobaciones de accesibilidad de WebSocket CDP remotas.
- La navegación/apertura de pestaña del navegador está protegida contra SSRF antes de la navegación y se verifica con el mejor esfuerzo posible en la URL `http(s)` final después de la navegación.
- En modo SSRF estricto, el descubrimiento y sondas de puntos de conexión CDP remotos (`cdpUrl`, incluidas las búsquedas de `/json/version`) también se verifican.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` toma como valor predeterminado `true` (modelo de red confiable). Establézcalo en `false` para una navegación pública estricta únicamente.
- `browser.ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como un alias heredado por compatibilidad.
- `attachOnly: true` significa “nunca iniciar un navegador local; solo conectar si ya se está ejecutando”.
- `color` + `color` por perfil tiñen la interfaz de usuario del navegador para que pueda ver qué perfil está activo.
- El perfil predeterminado es `openclaw` (navegador independiente administrado por OpenClaw). Use `defaultProfile: "user"` para optar por el navegador del usuario que ha iniciado sesión.
- Orden de detección automática: navegador predeterminado del sistema si está basado en Chromium; de lo contrario, Chrome → Brave → Edge → Chromium → Chrome Canary.
- Los perfiles locales `openclaw` asignan automáticamente `cdpPort`/`cdpUrl` — establezca esos solo para CDP remoto.
- `driver: "existing-session"` usa Chrome DevTools MCP en lugar de CDP sin procesar. No
  establezca `cdpUrl` para ese controlador.
- Establezca `browser.profiles.<name>.userDataDir` cuando un perfil de sesión existente
  deba conectarse a un perfil de usuario de Chromium no predeterminado, como Brave o Edge.

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

- **Control local (predeterminado):** el Gateway inicia el servicio de control de bucle invertido y puede lanzar un navegador local.
- **Control remoto (host del nodo):** ejecute un host del nodo en la máquina que tiene el navegador; el Gateway actúa como proxy de las acciones del navegador hacia él.
- **CDP remoto:** configure `browser.profiles.<name>.cdpUrl` (o `browser.cdpUrl`) para
  conectarse a un navegador remoto basado en Chromium. En este caso, OpenClaw no lanzará un navegador local.

Las URLs de CDP remotas pueden incluir autenticación:

- Tokens de consulta (por ejemplo, `https://provider.example?token=<token>`)
- Autenticación básica HTTP (por ejemplo, `https://user:pass@provider.example`)

OpenClaw conserva la autenticación al llamar a los endpoints de `/json/*` y al conectarse
al WebSocket de CDP. Se prefieren las variables de entorno o gestores de secretos para
los tokens en lugar de confirmarlos en los archivos de configuración.

## Proxy del navegador del nodo (predeterminado de configuración cero)

Si ejecuta un **host del nodo** en la máquina que tiene su navegador, OpenClaw puede
enrutar automáticamente las llamadas de herramientas del navegador a ese nodo sin ninguna configuración adicional del navegador.
Esta es la ruta predeterminada para los gateways remotos.

Notas:

- El host del nodo expone su servidor de control de navegador local a través de un **comando de proxy**.
- Los perfiles provienen de la propia configuración de `browser.profiles` del nodo (igual que local).
- Deshabilite si no lo desea:
  - En el nodo: `nodeHost.browserProxy.enabled=false`
  - En el gateway: `gateway.nodes.browser.mode="off"`

## Browserless (CDP remoto alojado)

[Browserless](https://browserless.io) es un servicio alojado de Chromium que expone
endpoints de CDP a través de HTTPS. Puede apuntar un perfil de navegador de OpenClaw a un
endpoint regional de Browserless y autenticarse con su clave API.

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
- Elija el endpoint regional que coincida con su cuenta de Browserless (consulte su documentación).

## Proveedores de CDP WebSocket directos

Algunos servicios de navegador alojados exponen un endpoint de **WebSocket directo** en lugar de
el descubrimiento de CDP basado en HTTP estándar (`/json/version`). OpenClaw es compatible con ambos:

- **Endpoints HTTP(S)** (por ejemplo, Browserless) — OpenClaw llama a `/json/version` para
  descubrir la URL del depurador WebSocket y luego se conecta.
- **Puntos de conexión WebSocket** (`ws://` / `wss://`) — OpenClaw se conecta directamente,
  saltándose `/json/version`. Úselo para servicios como
  [Browserbase](https://www.browserbase.com) o cualquier proveedor que le proporcione una
  URL de WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) es una plataforma en la nube para ejecutar
navegadores headless con resolución de CAPTCHA integrada, modo sigiloso y servidores
proxy residenciales.

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
- El nivel gratuito permite una sesión simultánea y una hora de navegador al mes.
  Consulte [precios](https://www.browserbase.com/pricing) para conocer los límites de los planes de pago.
- Consulte la [documentación de Browserbase](https://docs.browserbase.com) para obtener la referencia completa de la API,
  guías de SDK y ejemplos de integración.

## Seguridad

Ideas clave:

- El control del navegador es solo de bucle local; el acceso fluye a través de la autenticación de Gateway o el emparejamiento de nodos.
- Si el control del navegador está habilitado y no se configura ninguna autenticación, OpenClaw genera automáticamente `gateway.auth.token` al iniciarlo y lo persiste en la configuración.
- Mantenga el Gateway y cualquier host de nodos en una red privada (Tailscale); evite la exposición pública.
- Trate las URLs/tokens de CDP remotos como secretos; prefiera variables de entorno o un administrador de secretos.

Consejos de CDP remoto:

- Prefiera puntos de conexión cifrados (HTTPS o WSS) y tokens de corta duración cuando sea posible.
- Evite incrustar tokens de larga duración directamente en los archivos de configuración.

## Perfiles (multinavegador)

OpenClaw admite múltiples perfiles con nombre (configuraciones de enrutamiento). Los perfiles pueden ser:

- **openclaw-managed**: una instancia de navegador dedicada basada en Chromium con su propio directorio de datos de usuario + puerto CDP
- **remote**: una URL CDP explícita (navegador basado en Chromium que se ejecuta en otro lugar)
- **existing session**: su perfil de Chrome existente a través de la conexión automática de Chrome DevTools MCP

Valores predeterminados:

- El perfil `openclaw` se crea automáticamente si falta.
- El perfil `user` está integrado para adjuntar sesión existente de Chrome MCP.
- Los perfiles de sesión existente son opcionales además de `user`; cree ellos con `--driver existing-session`.
- Los puertos CDP locales se asignan desde **18800–18899** de forma predeterminada.
- Eliminar un perfil mueve su directorio de datos local a la Papelera.

Todos los puntos finales de control aceptan `?profile=<name>`; la CLI usa `--browser-profile`.

## Sesión existente vía Chrome DevTools MCP

OpenClaw también puede conectarse a un perfil de navegador basado en Chromium que se esté ejecutando a través del
servidor oficial de Chrome DevTools MCP. Esto reutiliza las pestañas y el estado de inicio de sesión
ya abiertos en ese perfil del navegador.

Referencias oficiales de antecedentes y configuración:

- [Chrome para desarrolladores: Usar Chrome DevTools MCP con tu sesión de navegador](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [README de Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Perfil integrado:

- `user`

Opcional: crea tu propio perfil personalizado de sesión existente si quieres un
nombre, color o directorio de datos del navegador diferente.

Comportamiento predeterminado:

- El perfil integrado `user` usa la autoconexión de Chrome MCP, que tiene como objetivo
  el perfil local predeterminado de Google Chrome.

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
2. Activa la depuración remota.
3. Mantén el navegador en ejecución y aprueba el mensaje de conexión cuando OpenClaw se conecte.

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

Qué comprobar si la conexión no funciona:

- el navegador de destino basado en Chromium es la versión `144+`
- la depuración remota está activada en la página de inspección de ese navegador
- el navegador mostró y aceptaste el mensaje de consentimiento de conexión
- `openclaw doctor` migra la configuración antigua del navegador basada en extensiones y comprueba que
  Chrome está instalado localmente para los perfiles de autoconexión predeterminados, pero no puede
  activar la depuración remota del lado del navegador por ti

Uso del agente:

- Use `profile="user"` cuando necesites el estado del navegador conectado del usuario.
- Si usas un perfil de sesión existente personalizado, pasa ese nombre de perfil explícito.
- Elige este modo solo cuando el usuario esté en el ordenador para aprobar el
  indicador de adjuntar.
- el Gateway o el host del nodo pueden iniciar `npx chrome-devtools-mcp@latest --autoConnect`

Notas:

- Esta ruta es de mayor riesgo que el perfil aislado `openclaw` porque puede
  actuar dentro de tu sesión de navegador iniciada.
- OpenClaw no inicia el navegador para este controlador; solo se adjunta a una
  sesión existente.
- OpenClaw utiliza aquí el flujo oficial de MCP de Chrome DevTools `--autoConnect`. Si
  `userDataDir` está establecido, OpenClaw lo pasa para apuntar a ese directorio
  de datos de usuario de Chromium explícito.
- Las capturas de pantalla de sesión existente admiten capturas de página y capturas
  de elementos `--ref` desde instantáneas, pero no selectores CSS `--element`.
- La `wait --url` de sesión existente admite patrones exactos, de subcadena y globales
  como otros controladores de navegador. `wait --load networkidle` aún no es compatible.
- Algunas funciones todavía requieren la ruta del navegador administrado, como la exportación de PDF y
  la intercepción de descargas.
- La sesión existente es local al host. Si Chrome está en una máquina diferente o en
  un espacio de nombres de red diferente, usa CDP remoto o un host de nodo en su lugar.

## Garantías de aislamiento

- **Directorio de datos de usuario dedicado**: nunca toca tu perfil de navegador personal.
- **Puertos dedicados**: evita `9222` para evitar colisiones con los flujos de trabajo de desarrollo.
- **Control de pestañas determinista**: apunta a las pestañas mediante `targetId`, no a la "última pestaña".

## Selección del navegador

Al iniciarse localmente, OpenClaw selecciona el primero disponible:

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

Solo para integraciones locales, el Gateway expone una pequeña API HTTP de bucle local:

- Estado/inicio/parada: `GET /`, `POST /start`, `POST /stop`
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
- `x-openclaw-password: <gateway password>` o autenticación básica HTTP con esa contraseña

### Requisito de Playwright

Algunas funciones (navegar/actuar/instantánea de IA/instantánea de rol, capturas de pantalla de elementos, PDF) requieren Playwright. Si Playwright no está instalado, esos endpoints devuelven un error claro 501. Las instantáneas ARIA y las capturas de pantalla básicas siguen funcionando para Chrome gestionado por openclaw.

Si ve `Playwright is not available in this gateway build`, instale el paquete completo de Playwright (no `playwright-core`) y reinicie la puerta de enlace, o reinstale OpenClaw con soporte de navegador.

#### Instalación de Playwright en Docker

Si su Gateway se ejecuta en Docker, evite `npx playwright` (conflictos de sobrescritura de npm).
Use la CLI incluida en su lugar:

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Para conservar las descargas del navegador, establezca `PLAYWRIGHT_BROWSERS_PATH` (por ejemplo,
`/home/node/.cache/ms-playwright`) y asegúrese de que `/home/node` se conserve mediante
`OPENCLAW_HOME_VOLUME` o un montaje de enlace (bind mount). Vea [Docker](/es/install/docker).

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

- `upload` y `dialog` son llamadas de **preparación** (**arming**); ejecútelas antes del clic/presión
  que activa el selector/cuadro de diálogo.
- Las rutas de salida de descargas y trazas están restringidas a los directorios temporales de OpenClaw:
  - trazas: `/tmp/openclaw` (alternativo: `${os.tmpdir()}/openclaw`)
  - descargas: `/tmp/openclaw/downloads` (alternativo: `${os.tmpdir()}/openclaw/downloads`)
- Las rutas de carga están restringidas a un directorio raíz de carga temporal de OpenClaw:
  - cargas: `/tmp/openclaw/uploads` (alternativo: `${os.tmpdir()}/openclaw/uploads`)
- `upload` también puede configurar las entradas de archivos directamente mediante `--input-ref` o `--element`.
- `snapshot`:
  - `--format ai` (predeterminado cuando Playwright está instalado): devuelve una instantánea de IA con referencias numéricas (`aria-ref="<n>"`).
  - `--format aria`: devuelve el árbol de accesibilidad (sin referencias; solo inspección).
  - `--efficient` (o `--mode efficient`): preajuste de instantánea de rol compacto (interactivo + compacto + profundidad + maxChars inferior).
  - Predeterminado de configuración (solo herramienta/CLI): configure `browser.snapshotDefaults.mode: "efficient"` para usar instantáneas eficientes cuando el llamante no pase un modo (consulte [Configuración de puerta de enlace](/es/gateway/configuration#browser-openclaw-managed-browser)).
  - Las opciones de instantánea de rol (`--interactive`, `--compact`, `--depth`, `--selector`) fuerzan una instantánea basada en roles con referencias como `ref=e12`.
  - `--frame "<iframe selector>"` limita las instantáneas de rol a un iframe (se combina con referencias de rol como `e12`).
  - `--interactive` genera una lista plana y fácil de seleccionar de elementos interactivos (ideal para ejecutar acciones).
  - `--labels` añade una captura de pantalla solo de la ventana gráfica con etiquetas de referencia superpuestas (imprime `MEDIA:<path>`).
- `click`/`type`/etc. requieren un `ref` de `snapshot` (ya sea un `12` numérico o una referencia de rol `e12`).
  Los selectores CSS no son compatibles intencionalmente con las acciones.

## Instantáneas y referencias

OpenClaw admite dos estilos de “instantánea”:

- **Instantánea de IA (referencias numéricas)**: `openclaw browser snapshot` (predeterminado; `--format ai`)
  - Salida: una instantánea de texto que incluye referencias numéricas.
  - Acciones: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internamente, la referencia se resuelve mediante `aria-ref` de Playwright.

- **Instantánea de rol (referencias de rol como `e12`)**: `openclaw browser snapshot --interactive` (o `--compact`, `--depth`, `--selector`, `--frame`)
  - Salida: una lista/árbol basada en roles con `[ref=e12]` (y `[nth=1]` opcional).
  - Acciones: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internamente, la referencia se resuelve a través de `getByRole(...)` (más `nth()` para duplicados).
  - Añada `--labels` para incluir una captura de pantalla de la ventana gráfica con etiquetas `e12` superpuestas.

Comportamiento de las referencias:

- Las referencias **no son estables entre navegaciones**; si algo falla, vuelva a ejecutar `snapshot` y use una referencia nueva.
- Si la instantánea del rol se tomó con `--frame`, las referencias de rol están limitadas a ese iframe hasta la siguiente instantánea del rol.

## Potenciadores de espera

Puede esperar algo más que solo tiempo/texto:

- Esperar a la URL (comodines compatibles con Playwright):
  - `openclaw browser wait --url "**/dash"`
- Esperar el estado de carga:
  - `openclaw browser wait --load networkidle`
- Esperar un predicado JS:
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

## Flujos de trabajo de depuración

Cuando falla una acción (por ejemplo, "no visible", "violación del modo estricto", "cubierto"):

1. `openclaw browser snapshot --interactive`
2. Use `click <ref>` / `type <ref>` (se prefieren las referencias de rol en modo interactivo)
3. Si aún falla: `openclaw browser highlight <ref>` para ver qué está apuntando Playwright
4. Si la página se comporta de forma extraña:
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Para una depuración profunda: grabe un rastro:
   - `openclaw browser trace start`
   - reproducir el problema
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
  - `set device "iPhone 14"` (preajustes de dispositivo de Playwright)
  - `set viewport 1280 720`

## Seguridad y privacidad

- El perfil de navegador de openclaw puede contener sesiones con inicio de sesión; trátelo como confidencial.
- `browser act kind=evaluate` / `openclaw browser evaluate` y `wait --fn`
  ejecutan JavaScript arbitrario en el contexto de la página. La inyección de prompts puede dirigir
  esto. Desactívelo con `browser.evaluateEnabled=false` si no lo necesita.
- Para notas sobre inicios de sesión y anti-bot (X/Twitter, etc.), consulte [Inicio de sesión en el navegador + publicación en X/Twitter](/es/tools/browser-login).
- Mantenga el host de Gateway/nodo privado (solo bucle local o tailnet).
- Los puntos de conexión CDP remotos son potentes; protéjalos mediante túneles.

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

Para configuraciones de host dividido con WSL2 Gateway + Windows Chrome, consulte
[Solución de problemas de WSL2 + Windows + CDP remoto de Chrome](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Herramientas del agente + funcionamiento del control

El agente obtiene **una herramienta** para la automatización del navegador:

- `browser` — estado/inicio/parada/pestañas/apertura/enfoque/cierre/instantánea/captura de pantalla/navegación/acción

Cómo se asigna:

- `browser snapshot` devuelve un árbol de interfaz de usuario estable (IA o ARIA).
- `browser act` usa los IDs de instantánea `ref` para hacer clic/escribir/arrastrar/seleccionar.
- `browser screenshot` captura píxeles (página completa o elemento).
- `browser` acepta:
  - `profile` para elegir un perfil de navegador con nombre (openclaw, chrome o CDP remoto).
  - `target` (`sandbox` | `host` | `node`) para seleccionar dónde reside el navegador.
  - En sesiones aisladas, `target: "host"` requiere `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si se omite `target`: las sesiones aisladas tienen `sandbox` de forma predeterminada, las sesiones sin aislamiento tienen `host` de forma predeterminada.
  - Si hay un nodo con capacidad de navegador conectado, la herramienta puede enrutar automáticamente hacia él a menos que fije `target="host"` o `target="node"`.

Esto mantiene al agente determinista y evita selectores frágiles.

import es from "/components/footer/es.mdx";

<es />
