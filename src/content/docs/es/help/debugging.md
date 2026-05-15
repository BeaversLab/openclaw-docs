---
summary: "Herramientas de depuración: modo de observación, flujos de modelo sin procesar y seguimiento de fugas de razonamiento"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "Depuración"
---

Asistentes de depuración para la salida en streaming, especialmente cuando un proveedor mezcla el razonamiento con el texto normal.

## Runtime debug overrides

Use `/debug` en el chat para establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco).
`/debug` está deshabilitado de forma predeterminada; actívelo con `commands.debug: true`.
Esto es útil cuando necesita alternar configuraciones oscuras sin editar `openclaw.json`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` borra todas las anulaciones y regresa a la configuración en disco.

## Session trace output

Use `/trace` cuando desee ver líneas de seguimiento/depuración propiedad del complemento en una sesión
sin activar el modo detallado completo.

Ejemplos:

```text
/trace
/trace on
/trace off
```

Use `/trace` para diagnósticos de complementos, como resúmenes de depuración de Active Memory.
Siga usando `/verbose` para el resultado de estado/herramienta normal en modo detallado y siga usando
`/debug` para anulaciones de configuración solo en tiempo de ejecución.

## Seguimiento del ciclo de vida del complemento

Use `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` cuando los comandos del ciclo de vida del complemento parezcan lentos
y necesite un desglose de fases integrado para los metadatos del complemento, descubrimiento, registro,
espejo de tiempo de ejecución, mutación de configuración y trabajo de actualización. El seguimiento es opcional y escribe
en stderr, por lo que la salida del comando JSON permanece analizable.

Ejemplo:

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

Salida de ejemplo:

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

Use esto para la investigación del ciclo de vida del complemento antes de recurrir a un generador de perfiles de CPU.
Si el comando se está ejecutando desde una verificación de fuente, prefiera medir el tiempo de ejecución
construido con `node dist/entry.js ...` después de `pnpm build`; `pnpm openclaw ...`
también mide la sobrecarga del ejecutor de origen.

## Inicio de la CLI y perfilado de comandos

Use la referencia de inicio verificada cuando un comando parezca lento:

```bash
pnpm test:startup:bench:smoke
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --runs 3
pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu
```

Para el perfilado único a través del ejecutor de origen normal, establezca
`OPENCLAW_RUN_NODE_CPU_PROF_DIR`:

```bash
OPENCLAW_RUN_NODE_CPU_PROF_DIR=.artifacts/cli-cpu pnpm openclaw status
```

El ejecutor de origen agrega indicadores de perfil de CPU de Node y escribe un `.cpuprofile` para el
comando. Use esto antes de agregar instrumentación temporal al código del comando.

Para los bloqueos de inicio que parecen trabajo síncrono del sistema de archivos o del cargador de módulos,
agregue el indicador de seguimiento de E/S síncrono de Node a través del ejecutor de origen:

```bash
OPENCLAW_TRACE_SYNC_IO=1 pnpm openclaw gateway --force
```

`pnpm gateway:watch` deja este indicador deshabilitado por defecto para el hijo
Gateway vigilado. Establezca `OPENCLAW_TRACE_SYNC_IO=1` cuando explícitamente desee la salida
de traza de E/S síncrona de Node en modo vigilado.

## Modo de vigilancia de Gateway

Para una iteración rápida, ejecute el gateway bajo el vigilante de archivos:

```bash
pnpm gateway:watch
```

Por defecto, esto inicia o reinicia una sesión de tmux llamada
`openclaw-gateway-watch-main` (o una variante específica del perfil/puerto tal como
`openclaw-gateway-watch-dev-19001`) y se auto-adjunta desde terminales interactivos.
Las shells no interactivas, CI y las llamadas de ejecución de agente permanecen desvinculadas e imprimen
instrucciones de conexión en su lugar. Conéctese manualmente cuando sea necesario:

```bash
tmux attach -t openclaw-gateway-watch-main
```

El panel de tmux ejecuta el vigilante sin procesar:

```bash
node scripts/watch-node.mjs gateway --force
```

Use el modo en primer plano cuando no se desee tmux:

```bash
pnpm gateway:watch:raw
# or
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

Deshabilite la auto-conexión manteniendo la gestión de tmux:

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

Perfile el tiempo de CPU del Gateway vigilado al depurar cuellos de botella de inicio/tiempo de ejecución:

```bash
pnpm gateway:watch --benchmark
```

El envoltorio de vigilancia consume `--benchmark` antes de invocar el Gateway y escribe
un archivo V8 `.cpuprofile` por cada salida de hijo del Gateway en
`.artifacts/gateway-watch-profiles/`. Detenga o reinicie el gateway vigilado para
volcar el perfil actual y luego ábralo con Chrome DevTools o Speedscope:

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

Use `--benchmark-dir <path>` cuando quiera los perfiles en otro lugar.
Use `--benchmark-no-force` cuando quiera que el hijo evaluado omita la
limpieza del puerto por defecto `--force` y falle rápido si el puerto del Gateway ya está
en uso.
El modo de referencia suprime el spam de trazas de E/S síncrona por defecto. Establezca
`OPENCLAW_TRACE_SYNC_IO=1` con `--benchmark` cuando explícitamente desee ambos perfiles
de CPU y trazas de pila de E/S síncrona de Node. En modo de referencia esos bloques de traza
se escriben en `gateway-watch-output.log` bajo el directorio de referencia y
se filtran del panel de terminal; los registros normales del Gateway permanecen visibles.

El envoltorio de tmux lleva selectores comunes de tiempo de ejecución no secretos como
`OPENCLAW_PROFILE`, `OPENCLAW_CONFIG_PATH`, `OPENCLAW_STATE_DIR`,
`OPENCLAW_GATEWAY_PORT` y `OPENCLAW_SKIP_CHANNELS` al panel. Ponga
las credenciales del proveedor en su perfil/configuración normal, o use el modo primo sin procesar
para secretos efímeros de una sola vez.
Si el Gateway observado sale durante el inicio, el observador ejecuta
`openclaw doctor --fix --non-interactive` una vez y reinicia el proceso hijo del Gateway.
Use `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` cuando desee el fallo de inicio original
sin el paso de reparación solo para desarrolladores.
El panel administrado de tmux también utiliza de forma predeterminada registros del Gateway en color para legibilidad;
establezca `FORCE_COLOR=0` al iniciar `pnpm gateway:watch` para desactivar la salida ANSI.

El observador se reinicia en los archivos relevantes para la compilación bajo `src/`, archivos fuente de extensiones,
metadatos de `package.json` y `openclaw.plugin.json` de extensiones, `tsconfig.json`,
`package.json` y `tsdown.config.ts`. Los cambios en los metadatos de la extensión reinician el
puerta de enlace sin forzar una reconstrucción de `tsdown`; los cambios en la fuente y la configuración todavía
reconstruyen `dist` primero.

Agregue cualquier indicador CLI de puerta de enlace después de `gateway:watch` y se pasarán en
cada reinicio. Volver a ejecutar el mismo comando de observación regenera el panel de tmux con nombre, y
el observador sin procesar aún mantiene su bloqueo de observador único, por lo que los padres observadores duplicados
se reemplazan en lugar de acumularse.

## Perfil de desarrollo + puerta de enlace de desarrollo (--dev)

Use el perfil de desarrollo para aislar el estado e iniciar una configuración segura y desechable para
depuración. Hay **dos** indicadores `--dev`:

- **`--dev` global (perfil):** aisla el estado bajo `~/.openclaw-dev` y
  establece el puerto de puerta de enlace predeterminado en `19001` (los puertos derivados se desplazan con él).
- **`gateway --dev`: indica a la puerta de enlace que cree automáticamente una configuración predeterminada +
  espacio de trabajo** cuando falte (y omita BOOTSTRAP.md).

Flujo recomendado (perfil de desarrollo + arranque de desarrollo):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si aún no tiene una instalación global, ejecute la CLI a través de `pnpm openclaw ...`.

Lo que hace esto:

1. **Aislamiento de perfil** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (el navegador/canvas cambia en consecuencia)

2. **Arranque de desarrollo** (`gateway --dev`)
   - Escribe una configuración mínima si falta (`gateway.mode=local`, bind loopback).
   - Establece `agent.workspace` al espacio de trabajo de desarrollo.
   - Establece `agent.skipBootstrap=true` (sin BOOTSTRAP.md).
   - Inicializa los archivos del espacio de trabajo si faltan:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identidad predeterminada: **C3-PO** (droide de protocolo).
   - Omite los proveedores de canal en modo desarrollo (`OPENCLAW_SKIP_CHANNELS=1`).

Flujo de restablecimiento (inicio limpio):

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` es una marca de perfil **global** y es consumida por algunos ejecutores. Si necesita deletrearlo, use la forma de variable de entorno:

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` borra la configuración, credenciales, sesiones y el espacio de trabajo de desarrollo (usando
`trash`, no `rm`), y luego recrea la configuración de desarrollo predeterminada.

<Tip>
Si ya se está ejecutando una puerta de enlace que no es de desarrollo (launchd o systemd), deténgala primero:

```bash
openclaw gateway stop
```

</Tip>

## Registro de flujo sin procesar (OpenClaw)

OpenClaw puede registrar el **flujo del asistente sin procesar** antes de cualquier filtrado o formato.
Esta es la mejor manera de ver si el razonamiento está llegando como deltas de texto plano
(o como bloques de pensamiento separados).

Actívelo a través de la CLI:

```bash
pnpm gateway:watch --raw-stream
```

Anulación de ruta opcional:

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

Variables de entorno equivalentes:

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

Archivo predeterminado:

`~/.openclaw/logs/raw-stream.jsonl`

## Registro de fragmentos sin procesar (pi-mono)

Para capturar **fragmentos compatibles con OpenAI sin procesar** antes de que se analicen en bloques,
pi-mono expone un registrador separado:

```bash
PI_RAW_STREAM=1
```

Ruta opcional:

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

Archivo predeterminado:

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> Nota: esto solo es emitido por procesos que usan el
> proveedor `openai-completions` de pi-mono.

## Notas de seguridad

- Los registros de flujo sin procesar pueden incluir mensajes completos, salida de herramientas y datos de usuario.
- Mantenga los registros localmente y elimínelos después de depurar.
- Si comparte registros, elimine primero los secretos y la información personal.

## Depuración en VSCode

Se requieren mapas de origen para habilitar la depuración en IDE basados en VSCode, ya que muchos de los archivos generados terminan con nombres con hash como parte del proceso de compilación. Las configuraciones `launch.json` incluidas tienen como objetivo el servicio Gateway, pero se pueden adaptar rápidamente para otros propósitos:

1. **Rebuild and Debug Gateway** (Recompilar y depurar Gateway) - Depura el servicio Gateway después de crear una nueva compilación
2. **Debug Gateway** (Depurar Gateway) - Depura el servicio Gateway de una compilación preexistente

### Configuración

La configuración predeterminada **Rebuild and Debug Gateway** incluye todo lo necesario; automáticamente eliminará la carpeta `/dist` y recompilará el proyecto con la depuración habilitada:

1. Abra el panel **Run and Debug** (Ejecutar y depurar) desde la Barra de actividad o presione `Ctrl`+`Shift`+`D`
2. En el IDE, asegúrese de que **Rebuild and Debug Gateway** esté seleccionado en el menú desplegable de configuración y luego presione el botón **Start Debugging** (Iniciar depuración)

Alternativamente, si prefiere administrar los procesos de compilación y depuración manualmente:

1. Abra una terminal y habilite los mapas de origen:
   - **Linux/macOS**: `export OUTPUT_SOURCE_MAPS=1`
   - **Windows (PowerShell)**: `$env:OUTPUT_SOURCE_MAPS="1"`
   - **Windows (CMD)**: `set OUTPUT_SOURCE_MAPS=1`
2. En la misma terminal, recompile el proyecto: `pnpm clean:dist && pnpm build`
3. En el IDE, seleccione la opción **Debug Gateway** en el menú desplegable de configuración **Run and Debug** y luego presione el botón **Start Debugging**

Ahora puede establecer puntos de interrupción en sus archivos fuente de TypeScript (directorio `src/`) y el depurador asignará correctamente los puntos de interrupción al JavaScript compilado a través de los mapas de origen. Podrá inspeccionar variables, avanzar paso a paso por el código y examinar las pilas de llamadas como se espera.

### Notas

- Si usa la opción **"Rebuild and Debug Gateway"** - cada vez que se inicie el depurador, eliminará completamente la carpeta `/dist` y ejecutará una `pnpm build` completa con los mapas de origen habilitados antes de iniciar Gateway
- Si usa la opción **"Debug Gateway"** - las sesiones de depuración se pueden iniciar y detener en cualquier momento sin afectar la carpeta `/dist`, pero debe usar un proceso de terminal separado para habilitar la depuración y administrar el ciclo de compilación
- Modifica la configuración de `launch.json` para `args` para depurar otras secciones del proyecto
- Si necesitas usar la CLI de OpenClaw compilada para otras tareas (es decir, `dashboard --no-open` si tu sesión de depuración genera un nuevo token de autenticación), puedes ejecutarla en otra terminal como `node ./openclaw.mjs` o crear un alias de shell como `alias openclaw-build="node $(pwd)/openclaw.mjs"`

## Relacionado

- [Solución de problemas](/es/help/troubleshooting)
- [Preguntas frecuentes](/es/help/faq)
