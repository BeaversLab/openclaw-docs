---
summary: "Referencia de CLI para `openclaw browser` (ciclo de vida, perfiles, pestañas, acciones, estado y depuración)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `openclaw browser`

Administra la superficie de control del navegador de OpenClaw y ejecuta acciones del navegador (ciclo de vida, perfiles, pestañas, instantáneas, capturas de pantalla, navegación, entrada, emulación de estado y depuración).

Relacionado:

- Herramienta de navegador + API: [Herramienta de navegador](/en/tools/browser)

## Opciones comunes

- `--url <gatewayWsUrl>`: URL de WebSocket de puerta de enlace (predeterminado desde la configuración).
- `--token <token>`: token de puerta de enlace (si es necesario).
- `--timeout <ms>`: tiempo de espera de solicitud (ms).
- `--expect-final`: espera una respuesta final de la puerta de enlace.
- `--browser-profile <name>`: elige un perfil de navegador (predeterminado desde la configuración).
- `--json`: salida legible por máquina (donde sea compatible).

## Inicio rápido (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## Ciclo de vida

```bash
openclaw browser status
openclaw browser start
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

Notas:

- Para `attachOnly` y perfiles CDP remotos, `openclaw browser stop` cierra la
  sesión de control activa y borra las anulaciones de emulación temporal incluso cuando
  OpenClaw no inició el proceso del navegador por sí mismo.
- Para perfiles administrados locales, `openclaw browser stop` detiene el proceso del navegador
  generado.

## Si falta el comando

Si `openclaw browser` es un comando desconocido, verifique `plugins.allow` en
`~/.openclaw/openclaw.json`.

Cuando `plugins.allow` está presente, el plugin del navegador incluido debe aparecer
explícitamente:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

`browser.enabled=true` no restaura el subcomando de CLI cuando la lista blanca de
plugins excluye `browser`.

Relacionado: [Herramienta de navegador](/en/tools/browser#missing-browser-command-or-tool)

## Perfiles

Los perfiles son configuraciones de enrutamiento del navegador con nombre. En la práctica:

- `openclaw`: inicia o se conecta a una instancia dedicada de Chrome administrada por OpenClaw (directorio de datos de usuario aislado).
- `user`: controla tu sesión de Chrome con sesión iniciada existente a través de Chrome DevTools MCP.
- perfiles CDP personalizados: apuntan a un endpoint CDP local o remoto.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

Usar un perfil específico:

```bash
openclaw browser --browser-profile work tabs
```

## Pestañas

```bash
openclaw browser tabs
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## Instantánea / captura de pantalla / acciones

Instantánea:

```bash
openclaw browser snapshot
```

Captura de pantalla:

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
```

Notas:

- `--full-page` es solo para capturas de página; no se puede combinar con `--ref`
  o `--element`.
- Los perfiles `existing-session` / `user` admiten capturas de pantalla de la página y capturas de pantalla `--ref`
  desde la salida de la instantánea, pero no capturas de pantalla CSS `--element`.

Navegar/hacer clic/escribir (automatización de IU basada en referencias):

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
```

Archivos + asistentes de diálogo:

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
```

## Estado y almacenamiento

Ventana de visualización + emulación:

```bash
openclaw browser resize 1280 720
openclaw browser set viewport 1280 720
openclaw browser set offline on
openclaw browser set media dark
openclaw browser set timezone Europe/London
openclaw browser set locale en-GB
openclaw browser set geo 51.5074 -0.1278 --accuracy 25
openclaw browser set device "iPhone 14"
openclaw browser set headers '{"x-test":"1"}'
openclaw browser set credentials myuser mypass
```

Cookies + almacenamiento:

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

## Depuración

```bash
openclaw browser console --level error
openclaw browser pdf
openclaw browser responsebody "**/api"
openclaw browser highlight <ref>
openclaw browser errors --clear
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

## Chrome existente a través de MCP

Utilice el perfil `user` integrado o cree su propio perfil `existing-session`:

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Esta ruta es solo para el host. Para Docker, servidores headless, Browserless u otras configuraciones remotas, utilice un perfil CDP en su lugar.

Límites actuales de sesiones existentes:

- las acciones basadas en instantáneas utilizan referencias, no selectores CSS
- `click` es solo clic izquierdo
- `type` no admite `slowly=true`
- `press` no admite `delayMs`
- `hover`, `scrollintoview`, `drag`, `select`, `fill` y `evaluate` rechazan
  las anulaciones de tiempo de espera por llamada
- `select` admite un solo valor
- `wait --load networkidle` no es compatible
- las cargas de archivos requieren `--ref` / `--input-ref`, no admiten CSS
  `--element` y actualmente admiten un archivo a la vez
- los enlaces de diálogo no admiten `--timeout`
- las capturas de pantalla admiten capturas de página y `--ref`, pero no CSS `--element`
- `responsebody`, la intercepción de descargas, la exportación de PDF y las acciones por lotes aún
  requieren un navegador administrado o un perfil CDP sin procesar

## Control remoto del navegador (proxy de host de nodo)

Si el Gateway se ejecuta en una máquina diferente a la del navegador, ejecute un **node host** en la máquina que tenga Chrome/Brave/Edge/Chromium. El Gateway will proxy browser actions to that node (no se requiere un servidor de control de navegador separado).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Security + remote setup: [Browser tool](/en/tools/browser), [Remote access](/en/gateway/remote), [Tailscale](/en/gateway/tailscale), [Security](/en/gateway/security)
