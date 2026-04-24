---
summary: "Herramientas de depuración: modo vigilancia, flujos de modelo sin procesar y rastreo de fugas de razonamiento"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "Depuración"
---

# Depuración

Esta página cubre asistentes de depuración para la salida en streaming, especialmente cuando un
proveedor mezcla el razonamiento con el texto normal.

## Invalidaciones de depuración en tiempo de ejecución

Use `/debug` en el chat para establecer anulaciones de configuración **solo en tiempo de ejecución** (memoria, no disco).
`/debug` está deshabilitado de forma predeterminada; habilítelo con `commands.debug: true`.
Esto es útil cuando necesita alternar configuraciones oscuras sin editar `openclaw.json`.

Ejemplos:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` borra todas las anulaciones y regresa a la configuración en disco.

## Salida de traza de sesión

Use `/trace` cuando desee ver líneas de rastreo/depuración propiedad del complemento en una sesión
sin activar el modo detallado completo.

Ejemplos:

```text
/trace
/trace on
/trace off
```

Use `/trace` para diagnósticos de complementos, como resúmenes de depuración de Memoria Activa.
Siga usando `/verbose` para la salida de estado/herramientas detallada normal, y siga usando
`/debug` para anulaciones de configuración solo en tiempo de ejecución.

## Temporización de depuración temporal de la CLI

OpenClaw mantiene `src/cli/debug-timing.ts` como un pequeño asistente para la
investigación local. Intencionadamente no está conectado al inicio de la CLI, al enrutamiento de comandos,
ni a ningún comando de forma predeterminada. Úselo solo mientras depura un comando lento y luego
elimine la importación y los intervalos antes de aterrizar el cambio de comportamiento.

Use esto cuando un comando es lento y necesita un desglose rápido de fases antes
de decidir si usar un generador de perfiles de CPU o corregir un subsistema específico.

### Añadir intervalos temporales

Añada el asistente cerca del código que está investigando. Por ejemplo, mientras depura
`openclaw models list`, un parche temporal en
`src/commands/models/list.list-command.ts` podría verse así:

```ts
// Temporary debugging only. Remove before landing.
import { createCliDebugTiming } from "../../cli/debug-timing.js";

const timing = createCliDebugTiming({ command: "models list" });

const authStore = timing.time("debug:models:list:auth_store", () => ensureAuthProfileStore());

const loaded = await timing.timeAsync(
  "debug:models:list:registry",
  () => loadListModelRegistry(cfg, { sourceConfig }),
  (result) => ({
    models: result.models.length,
    discoveredKeys: result.discoveredKeys.size,
  }),
);
```

Pautas:

- Prefije los nombres de fases temporales con `debug:`.
- Añada solo unos pocos intervalos alrededor de las secciones sospechosas de ser lentas.
- Prefiera fases amplias como `registry`, `auth_store` o `rows` sobre los nombres
  de los asistentes.
- Use `time()` para el trabajo síncrono y `timeAsync()` para las promesas.
- Mantenga limpio el stdout. El asistente escribe en stderr, por lo que la salida JSON del comando se mantiene
  analizable.
- Elimine las importaciones e intervalos temporales antes de abrir el PR de la solución final.
- Incluya la salida de sincronización o un breve resumen en el issue o PR que explique
  la optimización.

### Ejecutar con salida legible

El modo legible es el mejor para la depuración en vivo:

```bash
OPENCLAW_DEBUG_TIMING=1 pnpm openclaw models list --all --provider moonshot
```

Salida de ejemplo de una investigación `models list` temporal:

```text
OpenClaw CLI debug timing: models list
     0ms     +0ms start all=true json=false local=false plain=false provider="moonshot"
     2ms     +2ms debug:models:list:import_runtime duration=2ms
    17ms    +14ms debug:models:list:load_config duration=14ms sourceConfig=true
  20.3s  +20.3s debug:models:list:auth_store duration=20.3s
  20.3s     +0ms debug:models:list:resolve_agent_dir duration=0ms agentDir=true
  20.3s     +0ms debug:models:list:resolve_provider_filter duration=0ms
  25.3s   +5.0s debug:models:list:ensure_models_json duration=5.0s
  31.2s   +5.9s debug:models:list:load_model_registry duration=5.9s models=869 availableKeys=38 discoveredKeys=868 availabilityError=false
  31.2s     +0ms debug:models:list:resolve_configured_entries duration=0ms entries=1
  31.2s     +0ms debug:models:list:build_configured_lookup duration=0ms entries=1
  33.6s   +2.4s debug:models:list:read_registry_models duration=2.4s models=871
  35.2s   +1.5s debug:models:list:append_discovered_rows duration=1.5s seenKeys=0 rows=0
  36.9s   +1.7s debug:models:list:append_catalog_supplement_rows duration=1.7s seenKeys=5 rows=5

Model                                      Input       Ctx   Local Auth  Tags
moonshot/kimi-k2-thinking                  text        256k  no    no
moonshot/kimi-k2-thinking-turbo            text        256k  no    no
moonshot/kimi-k2-turbo                     text        250k  no    no
moonshot/kimi-k2.5                         text+image  256k  no    no
moonshot/kimi-k2.6                         text+image  256k  no    no

  36.9s     +0ms debug:models:list:print_model_table duration=0ms rows=5
  36.9s     +0ms complete rows=5
```

Hallazgos de esta salida:

| Fase                                     |        Tiempo | Lo que significa                                                                                                                 |
| ---------------------------------------- | ------------: | -------------------------------------------------------------------------------------------------------------------------------- |
| `debug:models:list:auth_store`           |         20.3s | La carga de la tienda auth-profile es el mayor costo y debe investigarse primero.                                                |
| `debug:models:list:ensure_models_json`   |          5.0s | Sincronizar `models.json` es lo suficientemente costoso como para inspeccionar condiciones de almacenamiento en caché o omisión. |
| `debug:models:list:load_model_registry`  |          5.9s | La construcción del registro y el trabajo de disponibilidad del proveedor también son costos significativos.                     |
| `debug:models:list:read_registry_models` |          2.4s | Leer todos los modelos del registro no es gratuito y puede ser importante para `--all`.                                          |
| fases de adición de filas                | 3.2s en total | Construir cinco filas mostradas aún tarda varios segundos, por lo que la ruta de filtrado merece un examen más detenido.         |
| `debug:models:list:print_model_table`    |           0ms | El renderizado no es el cuello de botella.                                                                                       |

Esos hallazgos son suficientes para guiar el siguiente parche sin mantener el código de sincronización en
rutas de producción.

### Ejecutar con salida JSON

Use el modo JSON cuando desee guardar o comparar datos de sincronización:

```bash
OPENCLAW_DEBUG_TIMING=json pnpm openclaw models list --all --provider moonshot \
  2> .artifacts/models-list-timing.jsonl
```

Cada línea stderr es un objeto JSON:

```json
{
  "command": "models list",
  "phase": "debug:models:list:registry",
  "elapsedMs": 31200,
  "deltaMs": 5900,
  "durationMs": 5900,
  "models": 869,
  "discoveredKeys": 868
}
```

### Limpiar antes de confirmar

Antes de abrir el PR final:

```bash
rg 'createCliDebugTiming|debug:[a-z0-9_-]+:' src/commands src/cli \
  --glob '!src/cli/debug-timing.*' \
  --glob '!*.test.ts'
```

El comando no debería devolver sitios de llamada de instrumentación temporales a menos que el PR
esté agregando explícitamente una superficie de diagnóstico permanente. Para correcciones de rendimiento
normales, mantenga solo el cambio de comportamiento, las pruebas y una nota breve con la evidencia de
cronometraje.

Para puntos calientes de CPU más profundos, use el perfilado de Node (`--cpu-prof`) o un perfilador
externo en lugar de agregar más envoltorios de cronometraje.

## Modo de observación de Gateway

Para una iteración rápida, ejecute el gateway bajo el observador de archivos:

```bash
pnpm gateway:watch
```

Esto se asigna a:

```bash
node scripts/watch-node.mjs gateway --force
```

El observador se reinicia en archivos relevantes para la compilación bajo `src/`, archivos fuente de extensión,
metadatos de extensión `package.json` y `openclaw.plugin.json`, `tsconfig.json`,
`package.json`, y `tsdown.config.ts`. Los cambios en los metadatos de la extensión reinician el
gateway sin forzar una reconstrucción `tsdown`; los cambios de origen y configuración aún
reconstruyen `dist` primero.

Añade cualquier flag de CLI de gateway después de `gateway:watch` y se pasarán en cada reinicio. Volver a ejecutar el mismo comando de vigilancia para el mismo repositorio/conjunto de flags ahora reemplaza al vigilante anterior en lugar de dejar padres de vigilantes duplicados.

## Perfil de desarrollo + gateway de desarrollo (--dev)

Usa el perfil de desarrollo para aislar el estado e iniciar una configuración segura y desechable para la depuración. Hay **dos** flags `--dev`:

- **Global `--dev` (perfil):** aísla el estado bajo `~/.openclaw-dev` y establece el puerto del gateway por defecto en `19001` (los puertos derivados cambian con él).
- **`gateway --dev`:** indica al Gateway que cree automáticamente una configuración predeterminada + espacio de trabajo\*\* cuando falte (y omita BOOTSTRAP.md).

Flujo recomendado (perfil de desarrollo + arranque de desarrollo):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

Si aún no tienes una instalación global, ejecuta la CLI a través de `pnpm openclaw ...`.

Lo que esto hace:

1. **Aislamiento de perfil** (`--dev` global)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (el navegador/canvas cambian en consecuencia)

2. **Arranque de desarrollo** (`gateway --dev`)
   - Escribe una configuración mínima si falta (`gateway.mode=local`, enlaza loopback).
   - Establece `agent.workspace` en el espacio de trabajo de desarrollo.
   - Establece `agent.skipBootstrap=true` (sin BOOTSTRAP.md).
   - Si faltan, inicializa los archivos del espacio de trabajo:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identidad predeterminada: **C3‑PO** (droide de protocolo).
   - Omite los proveedores de canales en modo de desarrollo (`OPENCLAW_SKIP_CHANNELS=1`).

Restablecer flujo (nuevo inicio):

```bash
pnpm gateway:dev:reset
```

Nota: `--dev` es un flag de perfil **global** y es consumido por algunos ejecutores. Si necesitas especificarlo, usa la forma de variable de entorno:

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` borra la configuración, las credenciales, las sesiones y el espacio de trabajo de desarrollo (usando `trash`, no `rm`), y luego recrea la configuración de desarrollo predeterminada.

Sugerencia: si un gateway que no es de desarrollo ya se está ejecutando (launchd/systemd), deténlo primero:

```bash
openclaw gateway stop
```

## Registro de flujo sin procesar (OpenClaw)

OpenClaw puede registrar el **flujo del asistente sin procesar** antes de cualquier filtrado o formato.
Esta es la mejor manera de ver si el razonamiento llega como deltas de texto plano
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

> Nota: esto solo lo emiten los procesos que usan el proveedor
> `openai-completions` de pi-mono.

## Notas de seguridad

- Los registros de flujo sin procesar pueden incluir mensajes completos, salida de herramientas y datos del usuario.
- Mantenga los registros localmente y elimínelos después de la depuración.
- Si comparte registros, elimine primero los secretos y la información personal (PII).
