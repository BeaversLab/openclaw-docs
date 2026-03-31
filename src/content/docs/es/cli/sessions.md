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
openclaw sessions --json
```

Selección de ámbito:

- predeterminado: almacén de agentes predeterminado configurado
- `--agent <id>`: un almacén de agentes configurado
- `--all-agents`: agregar todos los almacenes de agentes configurados
- `--store <path>`: ruta de almacén explícita (no se puede combinar con `--agent` o `--all-agents`)

`openclaw sessions --all-agents` lee los almacenes de agentes configurados. El descubrimiento de sesiones de Gateway y ACP
es más amplio: también incluyen almacenes que solo se encuentran en disco bajo
la raíz `agents/` predeterminada o una raíz `session.store` con plantillas. Esos
almacenes descubiertos deben resolverse en archivos `sessions.json` normales dentro de la
raíz del agente; se omiten los enlaces simbólicos y las rutas fuera de la raíz.

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

## Mantenimiento de limpieza

Ejecute el mantenimiento ahora (en lugar de esperar el próximo ciclo de escritura):

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` usa la configuración de `session.maintenance` de la configuración:

- Nota sobre el ámbito: `openclaw sessions cleanup` solo mantiene los almacenes/transcripciones de sesiones. No poda los registros de ejecución de cron (`cron/runs/<jobId>.jsonl`), los cuales son gestionados por `cron.runLog.maxBytes` y `cron.runLog.keepLines` en [Cron configuration](/en/automation/cron-jobs#configuration) y explicados en [Cron maintenance](/en/automation/cron-jobs#maintenance).

- `--dry-run`: vista previa de cuántas entradas se podarían/capsularían sin escribir.
  - En modo de texto, la ejecución de prueba imprime una tabla de acciones por sesión (`Action`, `Key`, `Age`, `Model`, `Flags`) para que pueda ver qué se mantendría frente a lo que se eliminaría.
- `--enforce`: aplicar mantenimiento incluso cuando `session.maintenance.mode` es `warn`.
- `--active-key <key>`: proteger una clave activa específica de la expulsión del presupuesto de disco.
- `--agent <id>`: ejecute la limpieza para un almacén de agente configurado.
- `--all-agents`: ejecute la limpieza para todos los almacenes de agentes configurados.
- `--store <path>`: ejecute contra un archivo `sessions.json` específico.
- `--json`: imprima un resumen JSON. Con `--all-agents`, la salida incluye un resumen por almacén.

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

- Configuración de sesión: [Referencia de configuración](/en/gateway/configuration-reference#session)
