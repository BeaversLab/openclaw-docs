---
summary: "API de control del navegador OpenClaw, referencia de la CLI y acciones de scripting"
read_when:
  - Scripting or debugging the agent browser via the local control API
  - Looking for the `openclaw browser` CLI reference
  - Adding custom browser automation with snapshots and refs
title: "API de control del navegador"
---

Para la configuración, resolución de problemas y solución de problemas, consulte [Browser](/es/tools/browser).
Esta página es la referencia para la API HTTP de control local, la línea de comandos `openclaw browser`
y los patrones de scripting (snapshots, refs, waits, debug flows).

## API de control (opcional)

Solo para integraciones locales, el Gateway expone una pequeña API HTTP de bucle invertido:

- Estado/inicio/detención: `GET /`, `POST /start`, `POST /stop`
- Pestañas: `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Snapshot/captura de pantalla: `GET /snapshot`, `POST /screenshot`
- Acciones: `POST /navigate`, `POST /act`
- Ganchos: `POST /hooks/file-chooser`, `POST /hooks/dialog`
- Descargas: `POST /download`, `POST /wait/download`
- Permisos: `POST /permissions/grant`
- Depuración: `GET /console`, `POST /pdf`
- Depuración: `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- Red: `POST /response/body`
- Estado: `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- Estado: `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- Configuración: `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

Todos los endpoints aceptan `?profile=<name>`. `POST /start?headless=true` solicita
un inicio headless de un solo tiro para perfiles administrados localmente sin cambiar la
configuración del navegador persistente; los perfiles de solo conexión, CDP remoto y sesión existente rechazan
esa anulación porque OpenClaw no inicia esos procesos del navegador.

Si se configura la autenticación de la puerta de enlace con secreto compartido, las rutas HTTP del navegador también requieren autenticación:

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` o autenticación HTTP Basic con esa contraseña

Notas:

- Esta API de navegador de bucle local (loopback) independiente **no** consume encabezados de identidad
  de proxy confiable (trusted-proxy) ni de Tailscale Serve.
- Si `gateway.auth.mode` es `none` o `trusted-proxy`, estas rutas de
  navegador de bucle local no heredan esos modos que portan identidad; manténgalas solo de bucle local.

### Contrato de error de `/act`

`POST /act` utiliza una respuesta de error estructurada para la validación a nivel de ruta y
fallos de política:

```json
{ "error": "<message>", "code": "ACT_*" }
```

Valores actuales de `code`:

- `ACT_KIND_REQUIRED` (HTTP 400): `kind` falta o no se reconoce.
- `ACT_INVALID_REQUEST` (HTTP 400): la carga útil de la acción falló la normalización o validación.
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400): `selector` se usó con un tipo de acción no admitido.
- `ACT_EVALUATE_DISABLED` (HTTP 403): `evaluate` (o `wait --fn`) está deshabilitado por la configuración.
- `ACT_TARGET_ID_MISMATCH` (HTTP 403): `targetId` de nivel superior o por lotes entra en conflicto con el objetivo de la solicitud.
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501): la acción no es compatible con perfiles de sesión existente.

Otros fallos de tiempo de ejecución aún pueden devolver `{ "error": "<message>" }` sin un
campo `code`.

### Requisito de Playwright

Algunas funciones (navegar/actuar/snapshot de IA/snapshot de rol, capturas de pantalla de elementos,
PDF) requieren Playwright. Si Playwright no está instalado, esos endpoints devuelven
un error 501 claro.

Lo que todavía funciona sin Playwright:

- Snapshots de ARIA
- Instantáneas de accesibilidad de estilo de función (`--interactive`, `--compact`,
  `--depth`, `--efficient`) cuando hay un WebSocket CDP por pestaña disponible. Esto es
  una alternativa para la inspección y el descubrimiento de referencias; Playwright sigue siendo el motor de
  acción principal.
- Capturas de pantalla de página para el navegador gestionado `openclaw` cuando hay un WebSocket CDP
  por pestaña disponible
- Capturas de pantalla de página para perfiles `existing-session` / Chrome MCP
- `existing-session` capturas de pantalla basadas en referencias (`--ref`) desde la salida de la instantánea

Lo que todavía necesita Playwright:

- `navigate`
- `act`
- Instantáneas de IA que dependen del formato de instantánea de IA nativo de Playwright
- Capturas de pantalla de elementos con selector CSS (`--element`)
- Exportación de PDF completa del navegador

Las capturas de pantalla de elementos también rechazan `--full-page`; la ruta devuelve `fullPage is
not supported for element screenshots`.

Si ve `Playwright is not available in this gateway build`, al Gateway
empaquetado le falta la dependencia principal del tiempo de ejecución del navegador. Reinstale o actualice
OpenClaw y luego reinicie el gateway. Para Docker, también instale los binarios
del navegador Chromium como se muestra a continuación.

#### Instalación de Playwright en Docker

Si su Gateway se ejecuta en Docker, evite `npx playwright` (conflictos de anulaciones de npm).
Para imágenes personalizadas, incorpore Chromium en la imagen:

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

Para una imagen existente, instálela a través de la CLI incluida en su lugar:

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Para conservar las descargas del navegador, configure `PLAYWRIGHT_BROWSERS_PATH` (por ejemplo,
`/home/node/.cache/ms-playwright`) y asegúrese de que `/home/node` se conserve mediante
`OPENCLAW_HOME_VOLUME` o un montaje de enlace (bind mount). OpenClaw detecta automáticamente el
Chromium conservado en Linux. Consulte [Docker](/es/install/docker).

## Cómo funciona (interno)

Un pequeño servidor de control de bucle de retorno (loopback) acepta solicitudes HTTP y se conecta a navegadores basados en Chromium a través de CDP. Las acciones avanzadas (clic/escribir/snapshot/PDF) pasan por Playwright sobre CDP; cuando falta Playwright, solo están disponibles las operaciones que no son de Playwright. El agente ve una interfaz estable mientras los navegadores y perfiles locales/remotos se intercambian libremente en segundo plano.

## Referencia rápida de la CLI

Todos los comandos aceptan `--browser-profile <name>` para apuntar a un perfil específico y `--json` para una salida legible por máquina.

<AccordionGroup>

<Accordion title="Lo básico: estado, pestañas, abrir/enfocar/cerrar">

```bash
openclaw browser status
openclaw browser start
openclaw browser start --headless # one-shot local managed headless launch
openclaw browser stop            # also clears emulation on attach-only/remote CDP
openclaw browser tabs
openclaw browser tab             # shortcut for current tab
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion title="Inspección: captura de pantalla, instantánea, consola, errores, solicitudes">

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref 12        # or --ref e12
openclaw browser screenshot --labels
openclaw browser snapshot
openclaw browser snapshot --format aria --limit 200
openclaw browser snapshot --interactive --compact --depth 6
openclaw browser snapshot --efficient
openclaw browser snapshot --labels
openclaw browser snapshot --urls
openclaw browser snapshot --selector "#main" --interactive
openclaw browser snapshot --frame "iframe#main" --interactive
openclaw browser console --level error
openclaw browser errors --clear
openclaw browser requests --filter api --clear
openclaw browser pdf
openclaw browser responsebody "**/api" --max-chars 5000
```

</Accordion>

<Accordion title="Acciones: navegar, hacer clic, escribir, arrastrar, esperar, evaluar">

```bash
openclaw browser navigate https://example.com
openclaw browser resize 1280 720
openclaw browser click 12 --double           # or e12 for role refs
openclaw browser click-coords 120 340        # viewport coordinates
openclaw browser type 23 "hello" --submit
openclaw browser press Enter
openclaw browser hover 44
openclaw browser scrollintoview e12
openclaw browser drag 10 11
openclaw browser select 9 OptionA OptionB
openclaw browser download e12 report.pdf
openclaw browser waitfordownload report.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="Estado: cookies, almacenamiento, sin conexión, encabezados, geolocalización, dispositivo">

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url "https://example.com"
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set theme dark
openclaw browser storage session clear
openclaw browser set offline on
openclaw browser set headers --headers-json '{"X-Debug":"1"}'
openclaw browser set credentials user pass            # --clear to remove
openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"
openclaw browser set media dark
openclaw browser set timezone America/New_York
openclaw browser set locale en-US
openclaw browser set device "iPhone 14"
```

</Accordion>

</AccordionGroup>

Notas:

- `upload` y `dialog` son llamadas de **preparación**; ejecútelas antes del clic/presión que activa el selector/cuadro de diálogo. Si una acción abre un modal, la respuesta de la acción incluye `blockedByDialog` y `browserState.dialogs.pending`; pase ese `dialogId` para responder directamente. Los cuadros de diálogo manejados fuera de OpenClaw aparecen bajo `browserState.dialogs.recent`.
- `click`/`type`/etc. requieren un `ref` de `snapshot` (`12` numérico, referencia de rol `e12`, o referencia de ARIA accionable `ax12`). Los selectores CSS no son compatibles intencionalmente para las acciones. Use `click-coords` cuando la posición visible de la ventana gráfica sea el único objetivo confiable.
- Las rutas de descarga, seguimiento y carga están restringidas a las raíces temporales de OpenClaw: `/tmp/openclaw{,/downloads,/uploads}` (alternativa: `${os.tmpdir()}/openclaw/...`).
- `upload` también puede establecer entradas de archivos directamente a través de `--input-ref` o `--element`.

Los ids y etiquetas de pestañas estables sobreviven al reemplazo de destino sin procesar (raw-target) de Chromium cuando OpenClaw puede probar la pestaña de reemplazo, como la misma URL o una sola pestaña antigua que se convierte en una sola pestaña nueva después del envío del formulario. Los ids de destino sin procesar siguen siendo volátiles; prefiera `suggestedTargetId` de `tabs` en los scripts.

Marcas de instantánea a un vistazo:

- `--format ai` (predeterminado con Playwright): instantánea de IA con referencias numéricas (`aria-ref="<n>"`).
- `--format aria`: árbol de accesibilidad con referencias `axN`. Cuando Playwright está disponible, OpenClaw vincula las referencias con los IDs del DOM del backend a la página en vivo para que las acciones de seguimiento puedan usarlas; de lo contrario, trate la salida solo como inspección.
- `--efficient` (o `--mode efficient`): preajuste de snapshot de rol compacto. Establezca `browser.snapshotDefaults.mode: "efficient"` para convertir esto en el predeterminado (consulte [Gateway configuration](/es/gateway/configuration-reference#browser)).
- `--interactive`, `--compact`, `--depth`, `--selector` fuerzan una instantánea de rol con referencias `ref=e12`. `--frame "<iframe>"` limita las instantáneas de rol a un iframe.
- `--labels` añade una captura de pantalla solo del viewport con etiquetas de referencia superpuestas (imprime `MEDIA:<path>`).
- `--urls` añade los destinos de enlace descubiertos a las instantáneas de IA.

## Instantáneas y referencias

OpenClaw admite dos estilos de "instantánea":

- **Instantánea de IA (referencias numéricas)**: `openclaw browser snapshot` (predeterminado; `--format ai`)
  - Salida: una instantánea de texto que incluye referencias numéricas.
  - Acciones: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internamente, la referencia se resuelve mediante el `aria-ref` de Playwright.

- **Instantánea de rol (referencias de rol como `e12`)**: `openclaw browser snapshot --interactive` (o `--compact`, `--depth`, `--selector`, `--frame`)
  - Salida: una lista/árbol basado en roles con `[ref=e12]` (y `[nth=1]` opcional).
  - Acciones: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internamente, la referencia se resuelve mediante `getByRole(...)` (más `nth()` para duplicados).
  - Añada `--labels` para incluir una captura de pantalla del viewport con etiquetas `e12` superpuestas.
  - Añada `--urls` cuando el texto del enlace sea ambiguo y el agente necesite objetivos de navegación concretos.

- **Instantánea ARIA (referencias ARIA como `ax12`)**: `openclaw browser snapshot --format aria`
  - Salida: el árbol de accesibilidad como nodos estructurados.
  - Acciones: `openclaw browser click ax12` funciona cuando la ruta de la instantánea puede vincular
    la referencia a través de los IDs del DOM de Playwright y del backend de Chrome.
- Si Playwright no está disponible, las instantáneas ARIA aún pueden ser útiles para
  la inspección, pero las referencias pueden no ser accionables. Vuelva a tomar una instantánea con `--format ai`
  o `--interactive` cuando necesite referencias de acción.
- Prueba de Docker para la ruta de reserva de raw-CDP: `pnpm test:docker:browser-cdp-snapshot`
  inicia Chromium con CDP, ejecuta `browser doctor --deep` y verifica que las instantáneas
  de roles incluyan URLs de enlaces, elementos en los que se puede hacer clic promovidos por el cursor y metadatos de iframe.

Comportamiento de las referencias:

- Las referencias **no son estables entre navegaciones**; si algo falla, vuelva a ejecutar `snapshot` y use una referencia nueva.
- `/act` devuelve el `targetId` actual sin procesar después del reemplazo
  activado por la acción cuando puede probar la pestaña de reemplazo. Siga usando IDs/etiquetas de pestaña estables para
  comandos de seguimiento.
- Si la instantánea de roles se tomó con `--frame`, las referencias de roles están limitadas a ese iframe hasta la siguiente instantánea de roles.
- Las referencias `axN` desconocidas o obsoletas fallan rápidamente en lugar de recurrir al
  selector `aria-ref` de Playwright. Ejecute una instantánea nueva en la misma pestaña cuando
  eso ocurra.

## Mejoras de espera

Puedes esperar más que solo tiempo/texto:

- Esperar a la URL (los globos son compatibles con Playwright):
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

Cuando falla una acción (p. ej., "no visible", "violación del modo estricto", "cubierto"):

1. `openclaw browser snapshot --interactive`
2. Use `click <ref>` / `type <ref>` (se prefieren referencias de rol en modo interactivo)
3. Si aún falla: `openclaw browser highlight <ref>` para ver qué está apuntando Playwright
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

Las instantáneas de roles en JSON incluyen `refs` más un pequeño bloque `stats` (líneas/caracteres/referencias/interactivo) para que las herramientas puedan razonar sobre el tamaño y la densidad de la carga útil.

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
- Dispositivo / puerto de visualización:
  - `set device "iPhone 14"` (ajustes predefinidos de dispositivos de Playwright)
  - `set viewport 1280 720`

## Seguridad y privacidad

- El perfil de navegador de openclaw puede contener sesiones iniciadas; trátelo como confidencial.
- `browser act kind=evaluate` / `openclaw browser evaluate` y `wait --fn`
  ejecutan JavaScript arbitrario en el contexto de la página. La inyección de indicaciones puede dirigir
  esto. Desactívelo con `browser.evaluateEnabled=false` si no lo necesita.
- Use `openclaw browser evaluate --timeout-ms <ms>` cuando la función del lado de la página
  pueda necesitar más tiempo que el tiempo de espera de evaluación predeterminado.
- Para notas sobre inicios de sesión y anti-bot (X/Twitter, etc.), consulte [Browser login + X/Twitter posting](/es/tools/browser-login).
- Mantenga el host Gateway/node privado (solo loopback o tailnet).
- Los puntos de conexión CDP remotos son potentes; utilice túneles y protéjalos.

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

## Relacionado

- [Browser](/es/tools/browser) - descripción general, configuración, perfiles, seguridad
- [Browser login](/es/tools/browser-login) - iniciar sesión en sitios
- [Browser Linux troubleshooting](/es/tools/browser-linux-troubleshooting)
- [Browser WSL2 troubleshooting](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
