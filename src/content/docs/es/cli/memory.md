---
summary: "Referencia de la CLI para `openclaw memory` (estado/índice/búsqueda/promoción/explicación-promoción/rem-harness)"
read_when:
  - You want to index or search semantic memory
  - You're debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "Memoria"
---

# `openclaw memory`

Gestiona la indexación y búsqueda de memoria semántica.
Proporcionado por el plugin de memoria activo (predeterminado: `memory-core`; establezca `plugins.slots.memory = "none"` para desactivar).

Relacionado:

- Concepto de memoria: [Memoria](/es/concepts/memory)
- Wiki de memoria: [Wiki de memoria](/es/plugins/memory-wiki)
- CLI de Wiki: [wiki](/es/cli/wiki)
- Complementos: [Complementos](/es/tools/plugin)

## Ejemplos

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory status --fix
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory promote --limit 10 --min-score 0.75
openclaw memory promote --apply
openclaw memory promote --json --min-recall-count 0 --min-unique-queries 0
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
openclaw memory rem-harness
openclaw memory rem-harness --json
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## Opciones

`memory status` y `memory index`:

- `--agent <id>`: limitar a un solo agente. Sin él, estos comandos se ejecutan para cada agente configurado; si no se configura ninguna lista de agentes, vuelven al agente predeterminado.
- `--verbose`: emitir registros detallados durante sondas e indexación.

`memory status`:

- `--deep`: sondear la preparación del almacén de vectores local, la preparación del proveedor de incrustaciones y la preparación de la búsqueda de vectores semánticos. El `memory status` simple permanece rápido y no ejecuta trabajos de incrustación en vivo ni de descubrimiento de proveedores; el estado desconocido del almacén de vectores o del vector semántico significa que no se sondeó en ese comando. El `searchMode: "search"` léxico QMD omite los sondeos de vectores semánticos y el mantenimiento de incrustaciones incluso con `--deep`.
- `--index`: ejecutar una reindexación si el almacén está sucio (implica `--deep`).
- `--fix`: reparar bloqueos de recuperación obsoletos y normalizar los metadatos de promoción.
- `--json`: imprimir salida JSON.

Si `memory status` muestra `Dreaming status: blocked`, el cron de soñado (dreaming) administrado está habilitado pero el latido que lo impulsa no se está ejecutando para el agente predeterminado. Vea [Dreaming never runs](/es/concepts/dreaming#dreaming-never-runs-status-shows-blocked) para conocer las dos causas comunes.

`memory index`:

- `--force`: forzar una reindexación completa.

`memory search`:

- Entrada de consulta: pasar `[query]` posicional o `--query <text>`.
- Si se proporcionan ambos, `--query` tiene prioridad.
- Si no se proporciona ninguno, el comando finaliza con un error.
- `--agent <id>`: limitar a un solo agente (predeterminado: el agente predeterminado).
- `--max-results <n>`: limitar el número de resultados devueltos.
- `--min-score <n>`: filtrar las coincidencias de puntuación baja.
- `--json`: imprimir resultados JSON.

`memory promote`:

Vista previa y aplicación de promociones de memoria a corto plazo.

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- escribir promociones en `MEMORY.md` (predeterminado: solo vista previa).
- `--limit <n>` -- limitar el número de candidatos mostrados.
- `--include-promoted` -- incluir entradas ya promovidas en ciclos anteriores.

Opciones completas:

- Clasifica los candidatos a corto plazo de `memory/YYYY-MM-DD.md` utilizando señales de promoción ponderadas (`frequency`, `relevance`, `query diversity`, `recency`, `consolidation`, `conceptual richness`).
- Utiliza señales a corto plazo tanto de recuperaciones de memoria como de pasadas de ingestión diaria, además de señales de refuerzo de fase ligera/REM.
- Cuando el soñar está activado, `memory-core` gestiona automáticamente un trabajo cron que ejecuta un barrido completo (`light -> REM -> deep`) en segundo plano (no se requiere `openclaw cron add` manual).
- `--agent <id>`: limitar a un solo agente (por defecto: el agente predeterminado).
- `--limit <n>`: máximo de candidatos a devolver/aplicar.
- `--min-score <n>`: puntuación mínima de promoción ponderada.
- `--min-recall-count <n>`: recuento mínimo de recuerdos necesario para un candidato.
- `--min-unique-queries <n>`: recuento mínimo de consultas distintas necesario para un candidato.
- `--apply`: añadir los candidatos seleccionados a `MEMORY.md` y marcarlos como promocionados.
- `--include-promoted`: incluir candidatos ya promocionados en la salida.
- `--json`: imprimir salida JSON.

`memory promote-explain`:

Explicar un candidato de promoción específico y el desglose de su puntuación.

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`: clave de candidato, fragmento de ruta o fragmento de snippet para buscar.
- `--agent <id>`: limitar a un solo agente (por defecto: el agente predeterminado).
- `--include-promoted`: incluir candidatos ya promocionados.
- `--json`: imprimir salida JSON.

`memory rem-harness`:

Vista previa de reflexiones REM, verdades candidatas y salida de promoción profunda sin escribir nada.

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`: limitar a un solo agente (por defecto: el agente predeterminado).
- `--include-promoted`: incluir candidatos profundos ya promocionados.
- `--json`: imprimir salida JSON.

## Soñar

Soñar es el sistema de consolidación de memoria en segundo plano con tres fases cooperativas: **ligera** (clasificar/preparar material a corto plazo), **profunda** (promocionar hechos duraderos a `MEMORY.md`) y **REM** (reflexionar y sacar a la luz temas).

- Activar con `plugins.entries.memory-core.config.dreaming.enabled: true`.
- Alternar desde el chat con `/dreaming on|off` (o inspeccionar con `/dreaming status`).
- Dreaming se ejecuta en un calendario de barrido gestionado (`dreaming.frequency`) y ejecuta las fases en orden: ligero, REM, profundo.
- Solo la fase profundo escribe memoria duradera en `MEMORY.md`.
- La salida de fase legible por humanos y las entradas del diario se escriben en `DREAMS.md` (o `dreams.md` existente), con informes opcionales por fase en `memory/dreaming/<phase>/YYYY-MM-DD.md`.
- La clasificación utiliza señales ponderadas: frecuencia de recuerdo, relevancia de recuperación, diversidad de consultas, novedad temporal, consolidación entre días y riqueza de conceptos derivados.
- La promoción vuelve a leer la nota diaria en vivo antes de escribir en `MEMORY.md`, por lo que los fragmentos a corto plazo editados o eliminados no se promocionan desde instantáneas obsoletas del almacén de recuerdo.
- Las ejecuciones programadas y manuales de `memory promote` comparten los mismos valores predeterminados de la fase profunda a menos que pases anulaciones de umbral de CLI.
- Las ejecuciones automáticas se distribuyen en los espacios de trabajo de memoria configurados.

Programación predeterminada:

- **Cadencia de barrido**: `dreaming.frequency = 0 3 * * *`
- **Umbrales profundos**: `minScore=0.8`, `minRecallCount=3`, `minUniqueQueries=3`, `recencyHalfLifeDays=14`, `maxAgeDays=30`

Ejemplo:

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

Notas:

- `memory index --verbose` imprime detalles por fase (proveedor, modelo, fuentes, actividad por lotes).
- `memory status` incluye cualquier ruta adicional configurada a través de `memorySearch.extraPaths`.
- Si los campos de clave de API remota de memoria activa efectiva están configurados como SecretRefs, el comando resuelve esos valores desde la instantánea de la puerta de enlace activa. Si la puerta de enlace no está disponible, el comando falla rápidamente.
- Nota sobre la diferencia de versión de la puerta de enlace: esta ruta de comando requiere una puerta de enlace que admita `secrets.resolve`; las puertas de enlace antiguas devuelven un error de método desconocido.
- Ajusta la cadencia de barrido programado con `dreaming.frequency`. La política de promoción profunda es, por lo demás, interna; usa las marcas de CLI en `memory promote` cuando necesites anulaciones manuales puntuales.
- `memory rem-harness --path <file-or-dir> --grounded` previsualiza `What Happened`, `Reflections` y `Possible Lasting Updates` fundamentados a partir de notas diarias históricas sin escribir nada.
- `memory rem-backfill --path <file-or-dir>` escribe entradas de diario fundamentadas reversibles en `DREAMS.md` para su revisión en la interfaz de usuario.
- `memory rem-backfill --path <file-or-dir> --stage-short-term` también siembra candidatos duraderos fundamentados en el almacén de promoción a corto plazo en vivo para que la fase profunda normal pueda clasificarlos.
- `memory rem-backfill --rollback` elimina las entradas de diario fundamentadas escritas anteriormente y `memory rem-backfill --rollback-short-term` elimina los candidatos a corto plazo fundamentados preparados anteriormente.
- Consulte [Dreaming](/es/concepts/dreaming) para ver las descripciones completas de las fases y la referencia de configuración.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Descripción general de la memoria](/es/concepts/memory)
