---
summary: "Referencia de CLI para `openclaw sessions` (listar sesiones almacenadas + uso)"
read_when:
  - You want to list stored sessions and see recent activity
title: "Sesiones"
---

# `openclaw sessions`

Lista las sesiones de conversación almacenadas.

Las listas de sesiones no son comprobaciones de actividad del canal/proveedor. Muestran filas de conversación persistidas desde los almacenes de sesiones. Un canal de Discord, Slack, Telegram u otro que esté inactivo puede reconectarse correctamente sin crear una nueva fila de sesión hasta que se procese un mensaje. Use `openclaw channels status --probe`,
`openclaw status --deep` o `openclaw health --verbose` cuando necesite conectividad en vivo del canal.

Las respuestas de `openclaw sessions` y Gateway `sessions.list` están limitadas de forma predeterminada para que los almacenes grandes y de larga duración no puedan monopolizar el proceso de la CLI o el bucle de eventos de Gateway. La CLI devuelve las 100 sesiones más recientes de forma predeterminada; pase
`--limit <n>` para una ventana más pequeña/mayor o `--limit all` cuando intencionalmente
necesite el almacén completo. Las respuestas JSON incluyen `totalCount`, `limitApplied` y
`hasMore` cuando las personas que llaman necesitan mostrar que existen más filas.

Los clientes RPC pueden pasar `configuredAgentsOnly: true` para mantener la fuente de descubrimiento combinada amplia pero devolver solo las filas de los agentes actualmente presentes en la configuración. La interfaz de usuario de control usa ese modo de forma predeterminada para que los almacenes de agentes eliminados o solo en disco no
vuelvan a aparecer en la vista de Sesiones.

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --limit 25
openclaw sessions --verbose
openclaw sessions --json
```

Selección de alcance:

- predeterminado: almacén del agente predeterminado configurado
- `--verbose`: registro detallado
- `--agent <id>`: un almacén de agente configurado
- `--all-agents`: agregar todos los almacenes de agentes configurados
- `--store <path>`: ruta explícita del almacén (no se puede combinar con `--agent` o `--all-agents`)
- `--limit <n|all>`: máx. filas a mostrar (predeterminado `100`; `all` restaura la salida completa)

Seguir el progreso de la trayectoria legible por humanos para las sesiones almacenadas:

```bash
openclaw sessions tail
openclaw sessions tail --follow
openclaw sessions tail --session-key "agent:main:telegram:direct:123" --tail 25
openclaw sessions --agent work tail --follow
openclaw sessions --all-agents tail --follow
```

`openclaw sessions tail` representa los eventos JSONL de trayectoria recientes como líneas de progreso compactas. Sin `--session-key`, hace un seguimiento primero de las sesiones en ejecución y luego de la última sesión almacenada. `--tail <count>` controla cuántos eventos existentes se imprimen antes del modo de seguimiento; el valor predeterminado es `80`, y `0` comienza en el final actual. `--follow` sigue observando los archivos de trayectoria seleccionados, incluidos los archivos reubicados a los que hace referencia `<session>.trajectory-path.json`.

La vista de progreso es intencionalmente conservadora: el texto del prompt, los argumentos de las herramientas y los cuerpos de los resultados de las herramientas no se imprimen. Las llamadas a herramientas muestran el nombre de la herramienta con `{...redacted...}`; los resultados de las herramientas muestran un estado como `ok`, `error` o `done`; las líneas de finalización del modelo muestran el proveedor/modelo y el estado terminal.

Exportar un paquete de trayectoria para una sesión almacenada:

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

Esta es la ruta de comando utilizada por el comando de barra `/export-trajectory` después de
que el propietario aprueba la solicitud de ejecución. El directorio de salida siempre se resuelve
dentro de `.openclaw/trajectory-exports/` bajo el espacio de trabajo seleccionado.

`openclaw sessions --all-agents` lee los almacenes de agentes configurados. El descubrimiento de sesiones de Gateway y ACP
es más amplio: también incluyen almacenes que solo se encuentran en disco bajo
la raíz predeterminada `agents/` o una raíz con plantilla `session.store`. Esos
almacenes descubiertos deben resolverse en archivos `sessions.json` regulares dentro de la
raíz del agente; los enlaces simbólicos y las rutas fuera de la raíz se omiten.

Ejemplos de JSON:

`openclaw sessions --all-agents --json`:

```json
{
  "path": null,
  "stores": [
    { "agentId": "main", "path": "/home/user/.openclaw/agents/main/sessions/sessions.json" },
    { "agentId": "work", "path": "/home/user/.openclaw/agents/work/sessions/sessions.json" }
  ],
  "allAgents": true,
  "count": 2,
  "totalCount": 2,
  "limitApplied": 100,
  "hasMore": false,
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-6" }
  ]
}
```

## Mantenimiento de limpieza

Ejecutar el mantenimiento ahora (en lugar de esperar el siguiente ciclo de escritura):

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` usa la configuración `session.maintenance` de la configuración:

- Nota de alcance: `openclaw sessions cleanup` mantiene los almacenes de sesiones, las transcripciones y los sidecars de trayectoria. No poda el historial de ejecuciones de cron, el cual es administrado por `cron.runLog.keepLines` en [Configuración de Cron](/es/automation/cron-jobs#configuration) y explicado en [Mantenimiento de Cron](/es/automation/cron-jobs#maintenance).
- La limpieza también elimina las transcripciones principales no referenciadas, los puntos de control de compactación y los archivos laterales de trayectoria anteriores a `session.maintenance.pruneAfter`; los archivos todavía referenciados por `sessions.json` se conservan.

- `--dry-run`: previsualiza cuántas entradas se eliminarían/cortarían sin escribir.
  - En modo de texto, la ejecución en seco imprime una tabla de acciones por sesión (`Action`, `Key`, `Age`, `Model`, `Flags`) para que puedas ver qué se conservaría frente a lo que se eliminaría.
- `--enforce`: aplica el mantenimiento incluso cuando `session.maintenance.mode` es `warn`.
- `--fix-missing`: elimina las entradas cuyos archivos de transcripción faltan o son solo de encabezado/vacíos, incluso si normalmente aún no habrían caducado o alcanzado el límite de conteo.
- `--fix-dm-scope`: cuando `session.dmScope` es `main`, retira las filas obsoletas de MD directo con clave de par dejadas por el enrutamiento anterior de `per-peer`, `per-channel-peer` o `per-account-channel-peer`. Usa `--dry-run` primero; al aplicar la limpieza se eliminan esas filas de `sessions.json` y se conservan sus transcripciones como archivos eliminados.
- `--active-key <key>`: protege una clave activa específica de la expulsión por presupuesto de disco. Los punteros externos duraderos de conversación, como las sesiones de grupo y las sesiones de chat con alcance de hilo, también se conservan mediante el mantenimiento de antigüedad/contado/presupuesto de disco.
- `--agent <id>`: ejecuta la limpieza para una tienda de agente configurada.
- `--all-agents`: ejecuta la limpieza para todas las tiendas de agente configuradas.
- `--store <path>`: se ejecuta sobre un archivo `sessions.json` específico.
- `--json`: imprime un resumen JSON. Con `--all-agents`, la salida incluye un resumen por tienda.

Cuando un Gateway es accesible, la limpieza que no es en seco para las tiendas de agentes configuradas se envía a través del Gateway para que comparta el mismo escritor de tienda de sesiones que el tráfico de tiempo de ejecución. Usa `--store <path>` para una reparación explícita sin conexión de un archivo de tienda.

`openclaw sessions cleanup --all-agents --dry-run --json`:

```json
{
  "allAgents": true,
  "mode": "warn",
  "dryRun": true,
  "stores": [
    {
      "agentId": "main",
      "storePath": "/home/user/.openclaw/agents/main/sessions/sessions.json",
      "beforeCount": 120,
      "afterCount": 80,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

Relacionado:

- Configuración de sesión: [Referencia de configuración](/es/gateway/config-agents#session)

## Relacionado

- [Referencia de CLI](/es/cli)
- [Gestión de sesiones](/es/concepts/session)
