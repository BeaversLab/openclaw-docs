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
- El perfil `user` integrado se adjunta a tu sesión real de Chrome iniciada a través de Chrome MCP.

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
no está disponible, salta a [Falta el comando o herramienta del navegador](/en/tools/browser#missing-browser-command-or-tool).

## Control de complementos

La herramienta `browser` predeterminada es ahora un complemento incluido que se envía habilitado de
forma predeterminada. Eso significa que puedes deshabilitarla o reemplazarla sin eliminar el resto del
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

Deshabilite el complemento incluido antes de instalar otro complemento que proporcione el
mismo nombre de herramienta `browser`. La experiencia predeterminada del navegador necesita ambos:

- `plugins.entries.browser.enabled` no deshabilitado
- `browser.enabled=true`

Si apagas solo el complemento, la CLI del navegador incluida (`openclaw browser`),
el método de puerta de enlace (`browser.request`), la herramienta del agente y el servicio de control predeterminado
del navegador desaparecen todos juntos. Tu configuración `browser.*` permanece intacta para que
un complemento de reemplazo la reutilice.

El complemento del navegador incluido también posee ahora la implementación del tiempo de ejecución del navegador.
Core mantiene solo los asistentes compartidos del SDK de complementos más las reexportaciones de compatibilidad para
rutas de importación internas anteriores. En la práctica, eliminar o reemplazar el paquete del
complemento del navegador elimina el conjunto de características del navegador en lugar de dejar atrás un segundo
tiempo de ejecución propiedad de Core.

Los cambios en la configuración del navegador aún requieren un reinicio de la Gateway para que el complemento incluido
pueda volver a registrar su servicio de navegador con la nueva configuración.

## Falta el comando o la herramienta del navegador

Si `openclaw browser` de repente se convierte en un comando desconocido después de una actualización, o
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

Arréglalo añadiendo `browser` a la lista de permitidos del complemento:

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
- `tools.alsoAllow: ["browser"]` **no** carga el complemento del navegador incluido. Solo ajusta la política de herramientas después de que el complemento ya se ha cargado.
- Si no necesitas una lista blanca de complementos restrictiva, eliminar `plugins.allow` también restaura el comportamiento del navegador incluido por defecto.

Síntomas típicos:

- `openclaw browser` es un comando desconocido.
- Falta `browser.request`.
- El agente informa que la herramienta del navegador no está disponible o que falta.

## Perfiles: `openclaw` vs `user`

- `openclaw`: navegador administrado y aislado (no se requiere extensión).
- `user`: perfil de conexión MCP de Chrome integrado para tu **real Chrome con sesión iniciada**.

Para las llamadas a la herramienta del navegador del agente:

- Predeterminado: usa el navegador aislado `openclaw`.
- Preferir `profile="user"` cuando importan las sesiones iniciadas existentes y el usuario está en el ordenador para hacer clic/aprobar cualquier mensaje de conexión.
- `profile` es la anulación explícita cuando deseas un modo de navegador específico.

Establezca `browser.defaultProfile: "openclaw"` si desea el modo administrado por defecto.

## Configuración

La configuración del navegador vive en `~/.openclaw/openclaw.json`.

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

- El servicio de control del navegador se enlaza al loopback en un puerto derivado de `gateway.port` (predeterminado: `18791`, que es puerta de enlace + 2).
- Si anulas el puerto de la puerta de enlace (`gateway.port` o `OPENCLAW_GATEWAY_PORT`), los puertos del navegador derivados se desplazan para mantenerse en la misma "familia".
- `cdpUrl` usa por defecto el puerto CDP local administrado cuando no está establecido.
- `remoteCdpTimeoutMs` se aplica a las comprobaciones de accesibilidad CDP remotas (no loopback).
- `remoteCdpHandshakeTimeoutMs` se aplica a las comprobaciones de accesibilidad de WebSocket CDP remotas.
- La navegación/apertura de pestañas del navegador está protegida contra SSRF antes de la navegación y se vuelve a verificar con el mejor esfuerzo en la URL final `http(s)` después de la navegación.
- En modo SSRF estricto, también se comprueba el descubrimiento de puntos finales CDP remotos y sondas (`cdpUrl`, incluyendo búsquedas `/json/version`).
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` está deshabilitado por defecto. Establézcalo en `true` solo cuando confíe intencionalmente en el acceso al navegador de red privada.
- `browser.ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como alias heredado.
- `attachOnly: true` significa "nunca iniciar un navegador local; solo conectarse si ya se está ejecutando".
- `color` + `color` por perfil colorean la interfaz de usuario del navegador para que pueda ver qué perfil está activo.
- El perfil predeterminado es `openclaw` (navegador independiente administrado por OpenClaw). Use `defaultProfile: "user"` para optar por el navegador del usuario que ha iniciado sesión.
- Orden de autodetección: navegador predeterminado del sistema si está basado en Chromium; de lo contrario, Chrome → Brave → Edge → Chromium → Chrome Canary.
- Los perfiles `openclaw` locales asignan automáticamente `cdpPort`/`cdpUrl` — establezca esos solo para CDP remoto.
- `driver: "existing-session"` usa Chrome DevTools MCP en lugar de CDP sin formato. No
  establezca `cdpUrl` para ese controlador.
- Establezca `browser.profiles.<name>.userDataDir` cuando un perfil de sesión existente
  deba conectarse a un perfil de usuario de Chromium no predeterminado como Brave o Edge.

## Usar Brave (u otro navegador basado en Chromium)

Si su navegador **predeterminado del sistema** está basado en Chromium (Chrome/Brave/Edge/etc.),
OpenClaw lo usa automáticamente. Establezca `browser.executablePath` para anular
la autodetección:

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
- **CDP remoto:** configure `browser.profiles.<name>.cdpUrl` (o `browser.cdpUrl`) para
  conectarse a un navegador remoto basado en Chromium. En este caso, OpenClaw no iniciará un navegador local.

El comportamiento de detención difiere según el modo de perfil:

- perfiles gestionados localmente: `openclaw browser stop` detiene el proceso del navegador que
  OpenClaw inició
- perfiles solo de conexión y CDP remotos: `openclaw browser stop` cierra la sesión de
  control activa y libera las anulaciones de emulación de Playwright/CDP (ventana gráfica,
  esquema de color, configuración regional, zona horaria, modo sin conexión y estados similares),
  aunque ningún proceso del navegador fue iniciado por OpenClaw

Las URL de CDP remotas pueden incluir autenticación:

- Tokens de consulta (por ejemplo, `https://provider.example?token=<token>`)
- Autenticación básica HTTP (por ejemplo, `https://user:pass@provider.example`)

OpenClaw preserva la autenticación al llamar a los endpoints de `/json/*` y al conectarse
al WebSocket de CDP. Se prefieren las variables de entorno o los administradores de secretos para
los tokens en lugar de confirmarlos en los archivos de configuración.

## Proxy del navegador del nodo (predeterminado sin configuración)

Si ejecuta un **host de nodo** en la máquina que tiene su navegador, OpenClaw puede
enrutar automáticamente las llamadas a la herramienta del navegador a ese nodo sin ninguna configuración adicional del navegador.
Esta es la ruta predeterminada para gateways remotos.

Notas:

- El host del nodo expone su servidor de control de navegador local a través de un **comando proxy**.
- Los perfiles provienen de la propia configuración `browser.profiles` del nodo (igual que la local).
- `nodeHost.browserProxy.allowProfiles` es opcional. Déjelo vacío para el comportamiento heredado/predeterminado: todos los perfiles configurados permanecen accesibles a través del proxy, incluidas las rutas de creación/eliminación de perfiles.
- Si establece `nodeHost.browserProxy.allowProfiles`, OpenClaw lo trata como un límite de mínimo privilegio: solo se pueden dirigir los perfiles en la lista de permitidos, y las rutas de creación/eliminación de perfiles persistentes se bloquean en la superficie del proxy.
- Deshabilite si no lo desea:
  - En el nodo: `nodeHost.browserProxy.enabled=false`
  - En el gateway: `gateway.nodes.browser.mode="off"`

## Browserless (CDP remoto alojado)

[Browserless](https://browserless.io) es un servicio Chromium alojado que expone
URLs de conexión CDP a través de HTTPS y WebSocket. OpenClaw puede utilizar cualquiera de las dos formas, pero
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

Algunos servicios de navegador alojados exponen un punto final **WebSocket directo** en lugar de
el descubrimiento CDP estándar basado en HTTP (`/json/version`). OpenClaw admite ambos:

- **Puntos finales HTTP(S)** — OpenClaw llama a `/json/version` para descubrir la
  URL del depurador WebSocket y luego se conecta.
- **Endpoints WebSocket** (`ws://` / `wss://`) — OpenClaw se conecta directamente,
  omitiendo `/json/version`. Utilice esto para servicios como
  [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com), o cualquier proveedor que le proporcione una
  URL de WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) es una plataforma en la nube para ejecutar
navegadores headless con resolución de CAPTCHA integrada, modo sigiloso y proxies
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
  desde el [panel de descripción general (Overview)](https://www.browserbase.com/overview).
- Reemplace `<BROWSERBASE_API_KEY>` con su clave de API real de Browserbase.
- Browserbase crea automáticamente una sesión de navegador al conectarse a WebSocket, por lo que no
  es necesario ningún paso de creación manual de sesión.
- La capa gratuita permite una sesión simultánea y una hora de navegador por mes.
  Consulte [precios (pricing)](https://www.browserbase.com/pricing) para conocer los límites de los planes de pago.
- Consulte la [documentación de Browserbase](https://docs.browserbase.com) para obtener la referencia completa de la API,
  guías del SDK y ejemplos de integración.

## Seguridad

Ideas clave:

- El control del navegador es solo de loopback; el acceso fluye a través de la autenticación de Gateway o el emparejamiento de nodos.
- La API HTTP del navegador loopback independiente utiliza **solo autenticación de secreto compartido**:
  autenticación de portador de token de gateway, `x-openclaw-password`, o autenticación HTTP Basic con la
  contraseña de gateway configurada.
- Los encabezados de identidad de Tailscale Serve y `gateway.auth.mode: "trusted-proxy"` **no**
  autentican esta API de navegador loopback independiente.
- Si el control del navegador está habilitado y no se ha configurado la autenticación de secreto compartido, OpenClaw genera automáticamente `gateway.auth.token` al iniciar y lo guarda en la configuración.
- OpenClaw **no** genera automáticamente ese token cuando `gateway.auth.mode` ya es `password`, `none` o `trusted-proxy`.
- Mantén el Gateway y cualquier host de nodos en una red privada (Tailscale); evita la exposición pública.
- Trata las URLs/tokens de CDP remotos como secretos; prefiere variables de entorno o un administrador de secretos.

Consejos de CDP remoto:

- Prefiere endpoints cifrados (HTTPS o WSS) y tokens de corta duración cuando sea posible.
- Evita incrustar tokens de larga duración directamente en los archivos de configuración.

## Perfiles (multinavegador)

OpenClaw admite múltiples perfiles con nombre (configuraciones de enrutamiento). Los perfiles pueden ser:

- **openclaw-managed**: una instancia de navegador dedicada basada en Chromium con su propio directorio de datos de usuario + puerto CDP
- **remoto**: una URL CDP explícita (navegador basado en Chromium ejecutándose en otro lugar)
- **sesión existente**: tu perfil de Chrome existente mediante autoconexión de Chrome DevTools MCP

Valores predeterminados:

- El perfil `openclaw` se crea automáticamente si falta.
- El perfil `user` está integrado para la conexión de sesión existente de Chrome MCP.
- Los perfiles de sesión existente son opcionales más allá de `user`; créalos con `--driver existing-session`.
- Los puertos CDP locales se asignan desde **18800–18899** de forma predeterminada.
- Eliminar un perfil mueve su directorio de datos local a la Papelera.

Todos los endpoints de control aceptan `?profile=<name>`; la CLI usa `--browser-profile`.

## Sesión existente a través de Chrome DevTools MCP

OpenClaw también puede adjuntarse a un perfil de navegador basado en Chromium en ejecución a través del servidor oficial de Chrome DevTools MCP. Esto reutiliza las pestañas y el estado de inicio de sesión ya abiertos en ese perfil de navegador.

Referencias oficiales de antecedentes y configuración:

- [Chrome para desarrolladores: Use Chrome DevTools MCP con su sesión de navegador](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [LÉEME de Chrome DevTools MCP (README)](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Perfil integrado:

- `user`

Opcional: crea tu propio perfil de sesión existente personalizado si deseas un nombre, color o directorio de datos del navegador diferente.

Comportamiento por defecto:

- El perfil integrado `user` usa la autoconexión de Chrome MCP, que tiene como objetivo el
  perfil local de Google Chrome por defecto.

Use `userDataDir` para Brave, Edge, Chromium, o un perfil de Chrome no predeterminado:

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
3. Mantenga el navegador en ejecución y apruebe el indicador de conexión cuando OpenClaw se adjunte.

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
- `tabs` lista sus pestañas del navegador ya abiertas
- `snapshot` devuelve referencias de la pestaña en vivo seleccionada

Qué comprobar si la conexión no funciona:

- el navegador objetivo basado en Chromium es la versión `144+`
- la depuración remota está habilitada en la página de inspección de ese navegador
- el navegador mostró y aceptó el indicador de consentimiento de conexión
- `openclaw doctor` migra la configuración antigua del navegador basada en extensiones y comprueba que
  Chrome está instalado localmente para los perfiles de autoconexión predeterminados, pero no puede
  habilitar la depuración remota del lado del navegador por usted

Uso del agente:

- Use `profile="user"` cuando necesite el estado del navegador conectado del usuario.
- Si usa un perfil de sesión existente personalizado, pase ese nombre de perfil explícito.
- Elija este modo solo cuando el usuario esté frente al ordenador para aprobar el indicador
  de conexión.
- el Gateway o el host del nodo pueden iniciar `npx chrome-devtools-mcp@latest --autoConnect`

Notas:

- Esta ruta es de mayor riesgo que el perfil aislado `openclaw` porque puede
  actuar dentro de su sesión de navegador conectada.
- OpenClaw no inicia el navegador para este controlador; se adjunta solo a una
  sesión existente.
- OpenClaw usa el flujo oficial `--autoConnect` de Chrome DevTools MCP aquí. Si
  `userDataDir` está configurado, OpenClaw lo pasa para tener como objetivo ese
  directorio de datos de usuario de Chromium explícito.
- Las capturas de pantalla de sesiones existentes admiten capturas de página y `--ref` capturas de elementos a partir de instantáneas, pero no selectores `--element` de CSS.
- Las capturas de pantalla de página de sesiones existentes funcionan sin Playwright a través de Chrome MCP. Las capturas de pantalla de elementos basadas en referencias (`--ref`) también funcionan allí, pero `--full-page` no se puede combinar con `--ref` o `--element`.
- Las acciones de sesiones existentes siguen siendo más limitadas que la ruta del navegador administrado:
  - `click`, `type`, `hover`, `scrollIntoView`, `drag` y `select` requieren referencias de instantáneas en lugar de selectores CSS
  - `click` es solo del botón izquierdo (sin anulaciones o modificadores de botón)
  - `type` no admite `slowly=true`; use `fill` o `press`
  - `press` no admite `delayMs`
  - `hover`, `scrollIntoView`, `drag`, `select`, `fill` y `evaluate` no admiten anulaciones de tiempo de espera por llamada
  - `select` actualmente admite un solo valor
- El `wait --url` de sesión existente admite patrones exactos, de subcadena y globales, como otros controladores de navegador. `wait --load networkidle` aún no es compatible.
- Los ganchos de carga de sesión existentes requieren `ref` o `inputRef`, admiten un archivo a la vez y no admiten el direccionamiento `element` de CSS.
- Los ganchos de diálogo de sesión existentes no admiten anulaciones de tiempo de espera.
- Algunas funciones aún requieren la ruta del navegador administrado, incluidas las acciones por lotes, la exportación de PDF, la intercepción de descargas y `responsebody`.
- La sesión existente es local del host. Si Chrome se encuentra en una máquina diferente o en un espacio de nombres de red diferente, use CDP remoto o un host de nodo en su lugar.

## Garantías de aislamiento

- **Directorio de datos de usuario dedicado**: nunca toca tu perfil de navegador personal.
- **Puertos dedicados**: evita `9222` para prevenir colisiones con los flujos de trabajo de desarrollo.
- **Control de pestañas determinista**: apunta a las pestañas por `targetId`, no por “última pestaña”.

## Selección de navegador

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

Solo para integraciones locales, el Gateway expone una pequeña API HTTP de bucle local (loopback):

- Estado/iniciar/detener: `GET /`, `POST /start`, `POST /stop`
- Pestañas: `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Instantánea/captura de pantalla: `GET /snapshot`, `POST /screenshot`
- Acciones: `POST /navigate`, `POST /act`
- Ganchos (hooks): `POST /hooks/file-chooser`, `POST /hooks/dialog`
- Descargas: `POST /download`, `POST /wait/download`
- Depuración: `GET /console`, `POST /pdf`
- Depuración: `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- Red: `POST /response/body`
- Estado: `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- Estado: `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- Configuración: `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

Todos los endpoints aceptan `?profile=<name>`.

Si la autenticación de gateway de secreto compartido está configurada, las rutas HTTP del navegador también requieren autenticación:

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` o autenticación HTTP Basic con esa contraseña

Notas:

- Esta API de navegador de bucle local independiente **no** consume encabezados de identidad de Tailscale Serve o trusted-proxy.
- Si `gateway.auth.mode` es `none` o `trusted-proxy`, estas rutas de navegador
  de bucle local no heredan esos modos que portan identidad; manténgalas solo de bucle local.

### contrato de error de `/act`

`POST /act` utiliza una respuesta de error estructurada para la validación a nivel de ruta y
fallos de política:

```json
{ "error": "<message>", "code": "ACT_*" }
```

Valores actuales de `code`:

- `ACT_KIND_REQUIRED` (HTTP 400): `kind` falta o no se reconoce.
- `ACT_INVALID_REQUEST` (HTTP 400): la carga útil (payload) de la acción falló la normalización o validación.
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400): `selector` se utilizó con un tipo de acción no compatible.
- `ACT_EVALUATE_DISABLED` (HTTP 403): `evaluate` (o `wait --fn`) está desactivado por la configuración.
- `ACT_TARGET_ID_MISMATCH` (HTTP 403): `targetId` de nivel superior o por lotes entra en conflicto con el objetivo de la solicitud.
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501): la acción no es compatible con los perfiles de sesión existente.

Otros fallos en tiempo de ejecución aún pueden devolver `{ "error": "<message>" }` sin un
campo `code`.

### Requisito de Playwright

Algunas funciones (navegar/actuar/instantánea de AI/instantánea de rol, capturas de pantalla de elementos,
PDF) requieren Playwright. Si Playwright no está instalado, esos puntos de conexión devuelven
un error 501 claro.

Lo que aún funciona sin Playwright:

- Instantáneas ARIA
- Capturas de pantalla de página para el navegador gestionado `openclaw` cuando hay un WebSocket
  de CDP por pestaña disponible
- Capturas de pantalla de página para perfiles `existing-session` / Chrome MCP
- Capturas de pantalla basadas en la referencia `existing-session` (`--ref`) desde la salida de la instantánea

Lo que aún necesita Playwright:

- `navigate`
- `act`
- Instantáneas de AI / instantáneas de rol
- Capturas de pantalla de elementos con selector CSS (`--element`)
- Exportación completa de PDF del navegador

Las capturas de pantalla de elementos también rechazan `--full-page`; la ruta devuelve `fullPage is
not supported for element screenshots`.

Si ve `Playwright is not available in this gateway build`, instale el paquete completo
de Playwright (no `playwright-core`) y reinicie la puerta de enlace, o reinstale
OpenClaw con soporte de navegador.

#### Instalación de Playwright en Docker

Si su puerta de enlace se ejecuta en Docker, evite `npx playwright` (conflictos de anulación de npm).
Use la CLI incluida en su lugar:

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Para conservar las descargas del navegador, configure `PLAYWRIGHT_BROWSERS_PATH` (por ejemplo,
`/home/node/.cache/ms-playwright`) y asegúrese de que `/home/node` se conserve mediante
`OPENCLAW_HOME_VOLUME` o un montaje de enlace (bind mount). Consulte [Docker](/en/install/docker).

## Cómo funciona (interno)

Flujo de alto nivel:

- Un pequeño **servidor de control** acepta solicitudes HTTP.
- Se conecta a navegadores basados en Chromium (Chrome/Brave/Edge/Chromium) a través de **CDP**.
- Para acciones avanzadas (clic/escribir/instantánea/PDF), utiliza **Playwright** sobre
  CDP.
- Cuando falta Playwright, solo están disponibles las operaciones que no lo requieren.

Este diseño mantiene al agente en una interfaz estable y determinista, al tiempo que le
permite intercambiar navegadores y perfiles locales/remotos.

## Referencia rápida de CLI

Todos los comandos aceptan `--browser-profile <name>` para apuntar a un perfil específico.
Todos los comandos también aceptan `--json` para una salida legible por máquina (payloads estables).

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

Nota sobre el ciclo de vida:

- Para perfiles de solo conexión y CDP remoto, `openclaw browser stop` sigue siendo el
  comando de limpieza correcto después de las pruebas. Cierra la sesión de control activa y
  borra las anulaciones de emulación temporales en lugar de finalizar el
  navegador subyacente.
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
  que activa el selector/diálogo.
- Las rutas de salida de descargas y trazas están limitadas a las raíces temporales de OpenClaw:
  - trazas: `/tmp/openclaw` (alternativa: `${os.tmpdir()}/openclaw`)
  - descargas: `/tmp/openclaw/downloads` (alternativa: `${os.tmpdir()}/openclaw/downloads`)
- Las rutas de carga están limitadas a una raíz temporal de cargas de OpenClaw:
  - cargas: `/tmp/openclaw/uploads` (alternativa: `${os.tmpdir()}/openclaw/uploads`)
- `upload` también puede establecer entradas de archivo directamente a través de `--input-ref` o `--element`.
- `snapshot`:
  - `--format ai` (predeterminado cuando Playwright está instalado): devuelve una instantánea de IA con referencias numéricas (`aria-ref="<n>"`).
  - `--format aria`: devuelve el árbol de accesibilidad (sin referencias; solo inspección).
  - `--efficient` (o `--mode efficient`): configuración preestablecida de instantánea de rol compacta (interactivo + compacto + profundidad + maxChars inferior).
  - Predeterminado de configuración (solo herramienta/CLI): establezca `browser.snapshotDefaults.mode: "efficient"` para usar instantáneas eficientes cuando el llamador no pasa un modo (consulte [configuración de Gateway](/en/gateway/configuration-reference#browser)).
  - Las opciones de instantánea de rol (`--interactive`, `--compact`, `--depth`, `--selector`) fuerzan una instantánea basada en roles con referencias como `ref=e12`.
  - `--frame "<iframe selector>"` limita las instantáneas de rol a un iframe (se empareja con refs de rol como `e12`).
  - `--interactive` genera una lista plana y fácil de elegir de elementos interactivos (lo mejor para realizar acciones).
  - `--labels` añade una captura de pantalla solo de la ventana gráfica con etiquetas ref superpuestas (imprime `MEDIA:<path>`).
- `click`/`type`/etc. requieren un `ref` de `snapshot` (ya sea numérico `12` o ref de rol `e12`).
  Los selectores CSS intencionalmente no son compatibles con las acciones.

## Instantáneas y refs

OpenClaw admite dos estilos de "instantánea":

- **Instantánea IA (refs numéricos)**: `openclaw browser snapshot` (predeterminado; `--format ai`)
  - Salida: una instantánea de texto que incluye refs numéricos.
  - Acciones: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internamente, el ref se resuelve mediante el `aria-ref` de Playwright.

- **Instantánea de rol (refs de rol como `e12`)**: `openclaw browser snapshot --interactive` (o `--compact`, `--depth`, `--selector`, `--frame`)
  - Salida: una lista/árbol basada en roles con `[ref=e12]` (y `[nth=1]` opcional).
  - Acciones: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internamente, el ref se resuelve mediante `getByRole(...)` (más `nth()` para duplicados).
  - Añada `--labels` para incluir una captura de pantalla de la ventana gráfica con etiquetas `e12` superpuestas.

Comportamiento de ref:

- Los refs **no son estables entre navegaciones**; si algo falla, vuelva a ejecutar `snapshot` y use un ref nuevo.
- Si la instantánea de rol se tomó con `--frame`, los refs de rol se limitan a ese iframe hasta la siguiente instantánea de rol.

## Potenciadores de espera

Puede esperar algo más que solo tiempo/texto:

- Esperar a la URL (los patrones glob son compatibles con Playwright):
  - `openclaw browser wait --url "**/dash"`
- Esperar el estado de carga:
  - `openclaw browser wait --load networkidle`
- Esperar a un predicado JS:
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

Cuando falla una acción (por ejemplo, "no visible", "violación del modo estricto", "cubierto"):

1. `openclaw browser snapshot --interactive`
2. Usar `click <ref>` / `type <ref>` (se prefieren referencias de roles en modo interactivo)
3. Si aún falla: `openclaw browser highlight <ref>` para ver qué está apuntando Playwright
4. Si la página se comporta de forma extraña:
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Para una depuración profunda: grabar un rastro:
   - `openclaw browser trace start`
   - reproducir el problema
   - `openclaw browser trace stop` (imprime `TRACE:<path>`)

## Salida JSON

`--json` es para scripting y herramientas estructuradas.

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
  - `set device "iPhone 14"` (preajustes de dispositivo de Playwright)
  - `set viewport 1280 720`

## Seguridad y privacidad

- El perfil del navegador de openclaw puede contener sesiones con inicio de sesión; trátelo como sensible.
- `browser act kind=evaluate` / `openclaw browser evaluate` y `wait --fn`
  ejecutan JavaScript arbitrario en el contexto de la página. La inyección de prompts puede dirigir
  esto. Desactívelo con `browser.evaluateEnabled=false` si no lo necesita.
- Para notas sobre inicios de sesión y anti-bot (X/Twitter, etc.), consulte [Browser login + X/Twitter posting](/en/tools/browser-login).
- Mantenga el host del Gateway/nodo privado (solo loopback o tailnet).
- Los puntos finales CDP remotos son potentes; protéjalos mediante túneles.

Ejemplo de modo estricto (bloquear destinos privados/internos de forma predeterminada):

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
[Browser troubleshooting](/en/tools/browser-linux-troubleshooting).

Para configuraciones de host dividido WSL2 Gateway + Windows Chrome, consulte
[WSL2 + Windows + remote Chrome CDP troubleshooting](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Herramientas del agente + funcionamiento del control

El agente obtiene **una herramienta** para la automatización del navegador:

- `browser` — estado/inicio/parada/pestañas/abrir/enfoque/cerrar/instantánea/captura de pantalla/navegar/actuar

Cómo se asigna:

- `browser snapshot` devuelve un árbol de interfaz de usuario estable (IA o ARIA).
- `browser act` usa los IDs de la instantánea `ref` para hacer clic/escribir/arrastrar/seleccionar.
- `browser screenshot` captura píxeles (página completa o elemento).
- `browser` acepta:
  - `profile` para elegir un perfil de navegador con nombre (openclaw, chrome o CDP remoto).
  - `target` (`sandbox` | `host` | `node`) para seleccionar dónde reside el navegador.
  - En sesiones en espacio aislado, `target: "host"` requiere `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si se omite `target`: las sesiones en espacio aislado usan `sandbox` de forma predeterminada, las sesiones sin espacio aislado usan `host` de forma predeterminada.
  - Si un nodo con capacidad de navegador está conectado, la herramienta puede enrutar automáticamente a él a menos que fije `target="host"` o `target="node"`.

Esto mantiene al agente determinista y evita selectores frágiles.

## Relacionado

- [Información general de herramientas](/en/tools) — todas las herramientas del agente disponibles
- [Sandboxing](/en/gateway/sandboxing) — control del navegador en entornos con sandbox
- [Seguridad](/en/gateway/security) — riesgos y endurecimiento del control del navegador
