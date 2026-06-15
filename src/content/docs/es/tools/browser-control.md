---
summary: "API de control del navegador OpenClaw, referencia de la CLI y acciones de scripting"
read_when:
  - Scripting or debugging the agent browser via the local control API
  - Looking for the `openclaw browser` CLI reference
  - Adding custom browser automation with snapshots and refs
title: "API de control del navegador"
---

Para la configuración, solución de problemas y puesta en marcha, consulte [Navegador](/es/tools/browser).
Esta página es la referencia de la API HTTP de control local, la `openclaw browser`
CLI y los patrones de secuencias de comandos (snapshots, refs, waits, debug flows).

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

Para los endpoints de pestañas, `targetId` es el nombre del campo de compatibilidad. Se prefiere pasar
`suggestedTargetId` de `GET /tabs` o `POST /tabs/open`; las etiquetas y los identificadores `tabId`
tales como `t1` también se aceptan. Los ids de destino CDP sin procesar y los prefijos únicos de
id de destino sin procesar todavía funcionan, pero son identificadores de diagnóstico volátiles.

Si se configura la autenticación de puerta de enlace de secreto compartido, las rutas HTTP del navegador también requieren autenticación:

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` o autenticación básica HTTP con esa contraseña

Notas:

- Esta API de navegador de bucle invertido independiente **no** consume encabezados de identidad de proxy confiable o
  Tailscale Serve.
- Si `gateway.auth.mode` es `none` o `trusted-proxy`, estas rutas de navegador
  de bucle invertido no heredan esos modos portadores de identidad; manténgalos solo de bucle invertido.

### Contrato de error `/act`

`POST /act` utiliza una respuesta de error estructurada para la validación a nivel de ruta y
fallas de política:

```json
{ "error": "<message>", "code": "ACT_*" }
```

Valores actuales de `code`:

- `ACT_KIND_REQUIRED` (HTTP 400): `kind` falta o no se reconoce.
- `ACT_INVALID_REQUEST` (HTTP 400): la carga útil de la acción falló la normalización o validación.
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400): `selector` se usó con un tipo de acción no admitido.
- `ACT_EVALUATE_DISABLED` (HTTP 403): `evaluate` (o `wait --fn`) está deshabilitado por la configuración.
- `ACT_TARGET_ID_MISMATCH` (HTTP 403): `targetId` de nivel superior o por lotes entra en conflicto con el destino de la solicitud.
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501): la acción no es compatible con los perfiles de sesión existente.

Otras fallas de tiempo de ejecución aún pueden devolver `{ "error": "<message>" }` sin un
campo `code`.

### Requisito de Playwright

Algunas funciones (navegar/actuar/snapshot de IA/snapshot de rol, capturas de pantalla de elementos,
PDF) requieren Playwright. Si Playwright no está instalado, esos endpoints devuelven
un error 501 claro.

Lo que aún funciona sin Playwright:

- Snapshots ARIA
- Snapshots de accesibilidad de estilo Role (`--interactive`, `--compact`,
  `--depth`, `--efficient`) cuando hay un WebSocket CDP por pestaña disponible. Esto es
  una alternativa para la inspección y el descubrimiento de referencias; Playwright sigue siendo el motor
  de acción principal.
- Capturas de pantalla de página para el navegador gestionado `openclaw` cuando hay un WebSocket CDP
  por pestaña disponible
- Capturas de pantalla de página para `existing-session` / perfiles Chrome MCP
- Capturas de pantalla basadas en referencias `existing-session` (`--ref`) desde la salida del snapshot

Lo que todavía necesita Playwright:

- `navigate`
- `act`
- Snapshots de IA que dependen del formato nativo de snapshot de IA de Playwright
- Capturas de pantalla de elementos con selector CSS (`--element`)
- exportación completa de PDF del navegador

Las capturas de pantalla de elementos también rechazan `--full-page`; la ruta devuelve `fullPage is
not supported for element screenshots`.

Si ve `Playwright is not available in this gateway build`, al Gateway empaquetado
le falta la dependencia principal del tiempo de ejecución del navegador. Reinstale o actualice
OpenClaw y luego reinicie el gateway. Para Docker, también instale los binarios
del navegador Chromium como se muestra a continuación.

#### Instalación de Playwright en Docker

Si su Gateway se ejecuta en Docker, evite `npx playwright` (conflictos de anulación de npm).
Para imágenes personalizadas, incorpore Chromium a la imagen:

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

Para una imagen existente, instálelo a través de la CLI incluida:

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Para persistir las descargas del navegador, establezca `PLAYWRIGHT_BROWSERS_PATH` (por ejemplo,
`/home/node/.cache/ms-playwright`) y asegúrese de que `/home/node` se persista a través de
`OPENCLAW_HOME_VOLUME` o un montaje de enlace (bind mount). OpenClaw detecta automáticamente el
Chromium persistido en Linux. Consulte [Docker](/es/install/docker).

## Cómo funciona (interno)

Un pequeño servidor de control de bucle de retorno acepta solicitudes HTTP y se conecta a navegadores basados en Chromium a través de CDP. Las acciones avanzadas (clic/escribir/instantánea/PDF) se realizan a través de Playwright sobre CDP; cuando falta Playwright, solo están disponibles las operaciones que no son de Playwright. El agente ve una interfaz estable mientras los navegadores y perfiles locales/remotos se intercambian libremente debajo.

## Referencia rápida de CLI

Todos los comandos aceptan `--browser-profile <name>` para apuntar a un perfil específico y `--json` para una salida legible por máquina.

<AccordionGroup>

<Accordion title="Conceptos básicos: estado, pestañas, abrir/enfocar/cerrar">

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
openclaw browser upload media://inbound/file.pdf
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

- `upload` y `dialog` son llamadas de **preparación**; ejecútelas antes del clic/presión que activa el selector/cuadro de diálogo. Si una acción abre un modal, la respuesta de la acción incluye `blockedByDialog` y `browserState.dialogs.pending`; pase ese `dialogId` para responder directamente. Los cuadros de diálogo manejados fuera de OpenClaw aparecen en `browserState.dialogs.recent`.
- `click`/`type`/etc requieren un `ref` de `snapshot` (numérico `12`, referencia de rol `e12` o referencia ARIA accionable `ax12`). Los selectores CSS no son compatibles intencionalmente con las acciones. Use `click-coords` cuando la posición visible del puerto de visualización sea el único objetivo confiable.
- Las rutas de descarga y rastreo están restringidas a las raíces temporales de OpenClaw: `/tmp/openclaw{,/downloads}` (alternativa: `${os.tmpdir()}/openclaw/...`).
- `upload` acepta archivos del directorio raíz de carga temporal de OpenClaw y
  medios de entrada administrados por OpenClaw. Los medios de entrada administrados se pueden referenciar como
  `media://inbound/<id>`, relativo al sandbox `media/inbound/<id>` o una ruta resuelta
  dentro del directorio de medios de entrada administrados. Las referencias de medios anidadas,
  el recorrido, los enlaces simbólicos, los enlaces físicos y las rutas locales arbitrarias todavía se rechazan.
- `upload` también puede establecer entradas de archivo directamente a través de `--input-ref` o `--element`.

Los ids y etiquetas de pestaña estables sobreviven al reemplazo de destino sin procesar de Chromium cuando OpenClaw
puede probar la pestaña de reemplazo, como la misma URL o una sola pestaña antigua que se convierte en una
sola pestaña nueva después del envío del formulario. Los ids de destino sin procesar todavía son volátiles; prefiera
`suggestedTargetId` de `tabs` en los scripts.

Marcas de instantánea a un vistazo:

- `--format ai` (predeterminado con Playwright): instantánea de IA con referencias numéricas (`aria-ref="<n>"`).
- `--format aria`: árbol de accesibilidad con referencias `axN`. Cuando Playwright está disponible, OpenClaw vincula referencias con ids de DOM del backend a la página en vivo para que las acciones de seguimiento puedan usarlas; de lo contrario, trate la salida solo para inspección.
- `--efficient` (o `--mode efficient`): configuración preestablecida de instantánea de rol compacta. Establezca `browser.snapshotDefaults.mode: "efficient"` para hacer esto el predeterminado (consulte [Configuración de Gateway](/es/gateway/configuration-reference#browser)).
- `--interactive`, `--compact`, `--depth`, `--selector` fuerzan una instantánea de rol con referencias `ref=e12`. `--frame "<iframe>"` limita las instantáneas de rol a un iframe.
- `--labels` agrega una captura de pantalla solo del viewport con etiquetas de referencia superpuestas e imprime la ruta guardada.
- `--urls` añade los destinos de enlace descubiertos a las instantáneas de IA.

## Instantáneas y referencias

OpenClaw admite dos estilos de "instantánea":

- **Instantánea de IA (referencias numéricas)**: `openclaw browser snapshot` (predeterminado; `--format ai`)
  - Salida: una instantánea de texto que incluye referencias numéricas.
  - Acciones: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internamente, la referencia se resuelve mediante `aria-ref` de Playwright.

- **Role snapshot (referencias de rol como `e12`)**: `openclaw browser snapshot --interactive` (o `--compact`, `--depth`, `--selector`, `--frame`)
  - Resultado: una lista/árbol basado en roles con `[ref=e12]` (y `[nth=1]` opcional).
  - Acciones: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internamente, la referencia se resuelve mediante `getByRole(...)` (más `nth()` para duplicados).
  - Añada `--labels` para incluir una captura de pantalla del viewport con etiquetas `e12` superpuestas.
  - Añada `--urls` cuando el texto del enlace sea ambiguo y el agente necesite objetivos de navegación concretos.

- **ARIA snapshot (referencias ARIA como `ax12`)**: `openclaw browser snapshot --format aria`
  - Resultado: el árbol de accesibilidad como nodos estructurados.
  - Acciones: `openclaw browser click ax12` funciona cuando la ruta de la instantánea puede vincular la referencia a través de los IDs del DOM de Playwright y el backend de Chrome.
- Si Playwright no está disponible, las instantáneas ARIA todavía pueden ser útiles para la inspección, pero las referencias pueden no ser accionables. Vuelva a tomar una instantánea con `--format ai` o `--interactive` cuando necesite referencias de acción.
- Prueba Docker para la ruta de respaldo raw-CDP: `pnpm test:docker:browser-cdp-snapshot` inicia Chromium con CDP, ejecuta `browser doctor --deep` y verifica que las instantáneas de rol incluyan URL de enlaces, elementos en los que se puede hacer clic promovidos por el cursor y metadatos de iframes.

Comportamiento de las referencias:

- Las referencias **no son estables entre navegaciones**; si algo falla, vuelva a ejecutar `snapshot` y use una referencia nueva.
- `/act` devuelve el `targetId` crudo actual después del reemplazo provocado por la acción cuando puede probar la pestaña de reemplazo. Siga usando ids/etiquetas de pestaña estables para comandos de seguimiento.
- Si la instantánea de rol se tomó con `--frame`, las referencias de rol están limitadas a ese iframe hasta la siguiente instantánea de rol.
- Las referencias `axN` desconocidas o obsoletas fallan rápidamente en lugar de recurrir al selector `aria-ref` de Playwright. Ejecute una instantánea nueva en la misma pestaña cuando eso suceda.

## Mejoras de espera

Puede esperar algo más que solo tiempo/texto:

- Esperar a la URL (se admiten globos admitidos por Playwright):
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

## Flujos de trabajo de depuración

Cuando falla una acción (p. ej., "no visible", "violación del modo estricto", "cubierto"):

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

`--json` es para herramientas estructuradas y de secuencias de comandos.

Ejemplos:

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Las instantáneas de rol en JSON incluyen `refs` más un pequeño bloque `stats` (líneas/caracteres/refs/interactivo) para que las herramientas puedan razonar sobre el tamaño y la densidad de la carga útil.

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

- El perfil de navegador openclaw puede contener sesiones iniciadas; trátelo como información sensible.
- `browser act kind=evaluate` / `openclaw browser evaluate` y `wait --fn`
  ejecutan JavaScript arbitrario en el contexto de la página. La inyección de indicaciones puede controlar
  esto. Desactívelo con `browser.evaluateEnabled=false` si no lo necesita.
- Use `openclaw browser evaluate --timeout-ms <ms>` cuando la función del lado de la página
  pueda necesitar más tiempo que el tiempo de espera de evaluación predeterminado.
- Para notas sobre inicios de sesión y antibots (X/Twitter, etc.), consulte [Inicio de sesión del navegador + publicaciones en X/Twitter](/es/tools/browser-login).
- Mantenga el host del Gateway/nodo privado (solo loopback o tailnet).
- Los puntos finales CDP remotos son potentes; protéjalos y use túneles para ellos.

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

- [Navegador](/es/tools/browser) - descripción general, configuración, perfiles, seguridad
- [Inicio de sesión del navegador](/es/tools/browser-login) - iniciar sesión en sitios
- [Solución de problemas del navegador en Linux](/es/tools/browser-linux-troubleshooting)
- [Solución de problemas del navegador en WSL2](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
