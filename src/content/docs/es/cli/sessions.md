---
summary: "Referencia de CLI para `openclaw sessions` (listar sesiones almacenadas + uso)"
read_when:
  - You want to list stored sessions and see recent activity
title: "sessions"
---

# `openclaw sessions`

Lista las sesiones de conversación almacenadas.

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --verbose
openclaw sessions --json
```

Selección de ámbito:

- predeterminado: almacén de agentes predeterminado configurado
- `--verbose`: registro detallado
- `--agent <id>`: un almacén de agente configurado
- `--all-agents`: agregar todos los almacenes de agentes configurados
- `--store <path>`: ruta explícita del almacén (no se puede combinar con `--agent` o `--all-agents`)

`openclaw sessions --all-agents` lee los almacenes de agentes configurados. El descubrimiento de sesiones de Gateway y ACP es más amplio: también incluye almacenes solo en disco encontrados bajo
la raíz predeterminada `agents/` o una raíz `session.store` con plantilla. Esos
almacenes descubiertos deben resolver a archivos `sessions.json` regulares dentro de la
raíz del agente; los enlaces simbólicos y las rutas fuera de la raíz se omiten.

Ejemplos JSON:

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
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-6" }
  ]
}
```

## Limpieza y mantenimiento

Ejecutar el mantenimiento ahora (en lugar de esperar el próximo ciclo de escritura):

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` usa configuraciones `session.maintenance` de la configuración:

- Nota sobre el alcance: `openclaw sessions cleanup` mantiene solo los almacenes/transcripciones de sesiones. No poda los registros de ejecución de cron (`cron/runs/<jobId>.jsonl`), los cuales son gestionados por `cron.runLog.maxBytes` y `cron.runLog.keepLines` en [Configuración de Cron](/es/automation/cron-jobs#configuration) y explicados en [Mantenimiento de Cron](/es/automation/cron-jobs#maintenance).

- `--dry-run`: previsualizar cuántas entradas se podarían/limitar sin escribir.
  - En modo texto, la ejecución en seco imprime una tabla de acciones por sesión (`Action`, `Key`, `Age`, `Model`, `Flags`) para que puedas ver qué se mantendría frente a lo que se eliminaría.
- `--enforce`: aplicar el mantenimiento incluso cuando `session.maintenance.mode` es `warn`.
- `--fix-missing`: eliminar entradas cuyos archivos de transcripción faltan, incluso si normalmente no han alcanzado la antigüedad/recuento límite aún.
- `--active-key <key>`: proteger una clave activa específica de la expulsión por presupuesto de disco.
- `--agent <id>`: ejecutar la limpieza para un almacén de agente configurado.
- `--all-agents`: ejecutar la limpieza para todos los almacenes de agentes configurados.
- `--store <path>`: ejecutar contra un archivo `sessions.json` específico.
- `--json`: imprimir un resumen JSON. Con `--all-agents`, la salida incluye un resumen por cada almacén.

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
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

Relacionado:

- Configuración de sesión: [Referencia de configuración](/es/gateway/configuration-reference#session)
