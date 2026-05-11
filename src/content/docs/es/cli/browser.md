---
summary: "Referencia de CLI para `openclaw browser` (ciclo de vida, perfiles, pestañas, acciones, estado y depuración)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "Navegador"
---

# `openclaw browser`

Administra la superficie de control del navegador de OpenClaw y ejecuta acciones del navegador (ciclo de vida, perfiles, pestañas, instantáneas, capturas de pantalla, navegación, entrada, emulación de estado y depuración).

Relacionado:

- Herramienta de navegador + API: [Herramienta de navegador](/es/tools/browser)

## Indicadores comunes

- `--url <gatewayWsUrl>`: URL de WebSocket de la puerta de enlace (por defecto, configuración).
- `--token <token>`: token de la puerta de enlace (si es necesario).
- `--timeout <ms>`: tiempo de espera de la solicitud (ms).
- `--expect-final`: espera una respuesta final de la puerta de enlace.
- `--browser-profile <name>`: elige un perfil de navegador (por defecto de la configuración).
- `--json`: salida legible por máquina (cuando se admite).

## Inicio rápido (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Los agentes pueden ejecutar la misma verificación de preparación con `browser({ action: "doctor" })`.

## Solución rápida de problemas

Si `start` falla con `not reachable after start`, solucione primero la preparación de CDP. Si `start` y `tabs` tienen éxito pero `open` o `navigate` fallan, el plano de control del navegador está sano y el fallo suele ser la política SSRF de navegación.

Secuencia mínima:

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

Orientación detallada: [Solución de problemas del navegador](/es/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## Ciclo de vida

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep
openclaw browser start
openclaw browser start --headless
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

Notas:

- `doctor --deep` añade una sonda de instantánea en vivo. Es útil cuando la preparación básica de CDP
  está en verde pero desea una prueba de que la pestaña actual puede ser inspeccionada.
- Para `attachOnly` y perfiles CDP remotos, `openclaw browser stop` cierra la
  sesión de control activa y borra las sustituciones de emulación temporal incluso cuando
  OpenClaw no inició el proceso del navegador en sí.
- Para perfiles administrados locales, `openclaw browser stop` detiene el proceso del navegador
  generado.
- `openclaw browser start --headless` se aplica solo a esa solicitud de inicio y
  solo cuando OpenClaw lanza un navegador administrado local. No reescribe
  `browser.headless` o la configuración del perfil, y es una operación nula para un navegador
  que ya se está ejecutando.
- En hosts Linux sin `DISPLAY` o `WAYLAND_DISPLAY`, los perfiles administrados locales
  se ejecutan en modo headless automáticamente a menos que `OPENCLAW_BROWSER_HEADLESS=0`,
  `browser.headless=false` o `browser.profiles.<name>.headless=false`
  soliciten explícitamente un navegador visible.

## Si falta el comando

Si `openclaw browser` es un comando desconocido, verifique `plugins.allow` en
`~/.openclaw/openclaw.json`.

Cuando `plugins.allow` está presente, enumere el complemento del navegador incluido explícitamente
a menos que la configuración ya tenga un bloque raíz `browser`:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

Un bloque raíz explícito `browser`, por ejemplo `browser.enabled=true` o
`browser.profiles.<name>`, también activa el complemento del navegador incluido bajo una
lista blanca de complementos restrictiva.

Relacionado: [Herramienta de navegador](/es/tools/browser#missing-browser-command-or-tool)

## Perfiles

Los perfiles son configuraciones de enrutamiento del navegador con nombre. En la práctica:

- `openclaw`: inicia o se conecta a una instancia de Chrome dedicada gestionada por OpenClaw (directorio de datos de usuario aislado).
- `user`: controla su sesión de Chrome existente iniciada a través de Chrome DevTools MCP.
- perfiles CDP personalizados: apuntan a un punto final CDP local o remoto.

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
openclaw browser tab new --label docs
openclaw browser tab label t1 docs
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser close t1
```

`tabs` devuelve primero `suggestedTargetId`, luego el `tabId` estable, como `t1`,
la etiqueta opcional y el `targetId` sin procesar. Los agentes deben devolver
`suggestedTargetId` a `focus`, `close`, instantáneas y acciones. Puede
asignar una etiqueta con `open --label`, `tab new --label` o `tab label`; las etiquetas,
los ids de pestaña, los ids de destino sin procesar y los prefijos de id de destino únicos son todos aceptados.
Cuando Chromium reemplaza el destino sin procesar subyacente durante una navegación o envío
de formulario, OpenClaw mantiene el `tabId`/etiqueta estable asociado a la pestaña de reemplazo
cuando puede probar la coincidencia. Los ids de destino sin procesar permanecen volátiles; se prefiere
`suggestedTargetId`.

## Instantánea / captura de pantalla / acciones

Instantánea:

```bash
openclaw browser snapshot
openclaw browser snapshot --urls
```

Captura de pantalla:

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
openclaw browser screenshot --labels
```

Notas:

- `--full-page` es solo para capturas de página; no se puede combinar con `--ref`
  o `--element`.
- Los perfiles `existing-session` / `user` admiten capturas de pantalla de página y capturas de pantalla `--ref`
  desde la salida de instantánea, pero no capturas de pantalla CSS `--element`.
- `--labels` superpone las referencias de instantánea actuales en la captura de pantalla.
- `snapshot --urls` añade los destinos de los enlaces descubiertos a las instantáneas de IA para
  que los agentes puedan elegir objetivos de navegación directa en lugar de adivinarlos solo por el
  texto del enlace.

Navegar/hacer clic/escribir (automatización de interfaz de usuario basada en referencias):

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser click-coords 120 340
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

Las respuestas de las acciones devuelven el `targetId` actual sin procesar después del reemplazo de la página
activado por la acción cuando OpenClaw puede probar la pestaña de reemplazo. Los scripts deben seguir
almacenando y pasando `suggestedTargetId`/etiquetas para flujos de trabajo de larga duración.

Auxiliares de archivo y cuadros de diálogo:

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
```

Los perfiles de Chrome administrados guardan las descargas activadas por clics ordinarios en el directorio de descargas de OpenClaw
(`/tmp/openclaw/downloads` de forma predeterminada, o la raíz temporal configurada).
Use `waitfordownload` o `download` cuando el agente necesite esperar un
archivo específico y devolver su ruta; esos esperadores explícitos se apropian de la siguiente descarga.

## Estado y almacenamiento

Ventanilla + emulación:

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

Use el perfil integrado `user` o cree su propio perfil `existing-session`:

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Esta ruta es solo para el host. Para Docker, servidores sin cabeza, Browserless u otras configuraciones remotas, use un perfil CDP en su lugar.

Límites actuales de sesión existente:

- las acciones impulsadas por instantáneas usan referencias, no selectores CSS
- `browser.actionTimeoutMs` establece de forma predeterminada las solicitudes `act` admitidas a 60000 ms cuando
  los solicitantes omiten `timeoutMs`; `timeoutMs` por llamada sigue teniendo prioridad.
- `click` es solo clic izquierdo
- `type` no admite `slowly=true`
- `press` no admite `delayMs`
- `hover`, `scrollintoview`, `drag`, `select`, `fill` y `evaluate` rechazan
  las anulaciones de tiempo de espera por llamada
- `select` admite solo un valor
- `wait --load networkidle` no es compatible
- las cargas de archivos requieren `--ref` / `--input-ref`, no admiten CSS
  `--element` y actualmente admiten un archivo a la vez
- los hooks de diálogo no admiten `--timeout`
- las capturas de pantalla admiten capturas de página y `--ref`, pero no CSS `--element`
- `responsebody`, la intercepción de descargas, la exportación de PDF y las acciones por lotes aún
  requieren un navegador administrado o un perfil CDP sin procesar

## Control remoto del navegador (proxy de host de nodo)

Si el Gateway se ejecuta en una máquina diferente a la del navegador, ejecute un **node host** en la máquina que tenga Chrome/Brave/Edge/Chromium. El Gateway será un proxy de las acciones del navegador hacia ese nodo (no se requiere un servidor de control de navegador separado).

Use `gateway.nodes.browser.mode` para controlar el enrutamiento automático y `gateway.nodes.browser.node` para fijar un nodo específico si hay varios conectados.

Seguridad + configuración remota: [Herramienta de navegador](/es/tools/browser), [Acceso remoto](/es/gateway/remote), [Tailscale](/es/gateway/tailscale), [Seguridad](/es/gateway/security)

## Relacionado

- [Referencia de CLI](/es/cli)
- [Navegador](/es/tools/browser)
