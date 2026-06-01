---
summary: "Referencia de CLI para `openclaw sessions` (listar sesiones almacenadas + uso)"
read_when:
  - You want to list stored sessions and see recent activity
title: "Sesiones"
---

# `openclaw sessions`

Lista las sesiones de conversación almacenadas.

Las listas de sesiones no son comprobaciones de actividad del canal/proveedor. Muestran filas de conversación persistentes de los almacenes de sesiones. Un canal silencioso de Discord, Slack, Telegram u otro puede reconectarse exitosamente sin crear una nueva fila de sesión hasta que se procese un mensaje. Use `openclaw channels status --probe`, `openclaw status --deep` o `openclaw health --verbose` cuando necesite conectividad en vivo del canal.

Las respuestas de `openclaw sessions` y del Gateway `sessions.list` están limitadas por defecto para que los almacenes grandes y de larga duración no puedan monopolizar el proceso de la CLI o el bucle de eventos del Gateway. La CLI devuelve las 100 sesiones más recientes por defecto; pase `--limit <n>` para una ventana más pequeña/mayor o `--limit all` cuando intencionalmente necesite el almacén completo. Las respuestas JSON incluyen `totalCount`, `limitApplied` y `hasMore` cuando los llamadores necesitan mostrar que existen más filas.

Los clientes RPC pueden pasar `configuredAgentsOnly: true` para mantener la fuente de descubrimiento combinada amplia pero devolver solo filas para los agentes presentes actualmente en la configuración. La Interfaz de Control usa ese modo por defecto para que los almacenes de agentes eliminados o solo en disco no reaparezcan en la vista de Sesiones.

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
- `--limit <n|all>`: máximo de filas a salida (predeterminado `100`; `all` restaura la salida completa)

Exportar un paquete de trayectoria para una sesión almacenada:

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

Esta es la ruta de comando utilizada por el comando de barra `/export-trajectory` después
de que el propietario apruebe la solicitud de ejecución. El directorio de salida siempre se resuelve
dentro de `.openclaw/trajectory-exports/` bajo el espacio de trabajo seleccionado.

`openclaw sessions --all-agents` lee los almacenes de agentes configurados. El descubrimiento de sesiones de Gateway y ACP
es más amplio: también incluyen almacenes solo en disco encontrados bajo
la raíz `agents/` predeterminada o una raíz `session.store` con plantilla. Esos
almacenes descubiertos deben resolverse a archivos `sessions.json` regulares dentro de la
raíz del agente; se omiten los enlaces simbólicos y las rutas fuera de la raíz.

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

Ejecuta el mantenimiento ahora (en lugar de esperar el próximo ciclo de escritura):

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` usa la configuración de `session.maintenance` de la configuración:

- Nota de alcance: `openclaw sessions cleanup` mantiene los almacenes de sesiones, las transcripciones y los sidecars de trayectoria. No poda los registros de ejecución de cron (`cron/runs/<jobId>.jsonl`), que son gestionados por `cron.runLog.maxBytes` y `cron.runLog.keepLines` en [Configuración de Cron](/es/automation/cron-jobs#configuration) y explicados en [Mantenimiento de Cron](/es/automation/cron-jobs#maintenance).
- La limpieza también poda las transcripciones primarias no referenciadas, los puntos de control de compactación y los sidecars de trayectoria más antiguos que `session.maintenance.pruneAfter`; los archivos todavía referenciados por `sessions.json` se conservan.

- `--dry-run`: previsualiza cuántas entradas se podarían/limitarían sin escribir.
  - En modo texto, dry-run imprime una tabla de acciones por sesión (`Action`, `Key`, `Age`, `Model`, `Flags`) para que puedas ver qué se mantendría frente a lo que se eliminaría.
- `--enforce`: aplica el mantenimiento incluso cuando `session.maintenance.mode` es `warn`.
- `--fix-missing`: elimina las entradas cuyos archivos de transcripción faltan o son solo encabezado/vacíos, incluso si normalmente todavía no habrían caducado o alcanzado el límite de conteo.
- `--fix-dm-scope`: cuando `session.dmScope` es `main`, retira las filas obsoletas de MD directo con clave de par dejadas por el enrutamiento anterior `per-peer`, `per-channel-peer` o `per-account-channel-peer`. Use `--dry-run` primero; al aplicar la limpieza se eliminan esas filas de `sessions.json` y se conservan sus transcripciones como archivos eliminados.
- `--active-key <key>`: protege una clave activa específica de la expulsión del presupuesto de disco. Los punteros externos de conversación duraderos, como las sesiones grupales y las sesiones de chat con ámbito de hilo, también se mantienen por el mantenimiento de edad/recuento/presupuesto de disco.
- `--agent <id>`: ejecuta la limpieza para una tienda de agente configurada.
- `--all-agents`: ejecuta la limpieza para todas las tiendas de agente configuradas.
- `--store <path>`: se ejecuta en un archivo `sessions.json` específico.
- `--json`: imprime un resumen JSON. Con `--all-agents`, la salida incluye un resumen por tienda.

Cuando se puede alcanzar una puerta de enlace (Gateway), la limpieza que no sea de ejecución en seco para las tiendas de agentes configuradas se envía a través de la puerta de enlace para que comparta el mismo escritor de tienda de sesiones que el tráfico del tiempo de ejecución. Use `--store <path>` para la reparación fuera de línea explícita de un archivo de tienda.

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
