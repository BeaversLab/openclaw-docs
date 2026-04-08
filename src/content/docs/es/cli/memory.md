---
summary: "Referencia de la CLI para `openclaw memory` (estado/índice/búsqueda/promoción)"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "memoria"
---

# `openclaw memory`

Gestiona la indexación y búsqueda de memoria semántica.
Proporcionado por el complemento de memoria activo (predeterminado: `memory-core`; configure `plugins.slots.memory = "none"` para desactivar).

Relacionado:

- Concepto de memoria: [Memoria](/en/concepts/memory)
- Complementos: [Complementos](/en/tools/plugin)

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
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## Opciones

`memory status` y `memory index`:

- `--agent <id>`: limitar a un solo agente. Sin esto, estos comandos se ejecutan para cada agente configurado; si no se configura una lista de agentes, se usan el agente predeterminado.
- `--verbose`: emitir registros detallados durante sondas e indexación.

`memory status`:

- `--deep`: sondear disponibilidad de vectores e incrustaciones.
- `--index`: ejecutar una reindexación si el almacén está sucio (implica `--deep`).
- `--fix`: reparar bloqueos de recuerdo obsoletos y normalizar metadatos de promoción.
- `--json`: imprimir salida JSON.

`memory index`:

- `--force`: forzar una reindexación completa.

`memory search`:

- Entrada de consulta: pase `[query]` o `--query <text>` posicional.
- Si se proporcionan ambos, gana `--query`.
- Si no se proporciona ninguno, el comando termina con un error.
- `--agent <id>`: limitar a un solo agente (predeterminado: el agente predeterminado).
- `--max-results <n>`: limitar la cantidad de resultados devueltos.
- `--min-score <n>`: filtrar coincidencias de baja puntuación.
- `--json`: imprimir resultados JSON.

`memory promote`:

Vista previa y aplicación de promociones de memoria a corto plazo.

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- escribir promociones en `MEMORY.md` (predeterminado: solo vista previa).
- `--limit <n>` -- limitar la cantidad de candidatos mostrados.
- `--include-promoted` -- incluir entradas ya promovidas en ciclos anteriores.

Opciones completas:

- Clasifica los candidatos a corto plazo de `memory/YYYY-MM-DD.md` utilizando señales de promoción ponderadas (`frequency`, `relevance`, `query diversity`, `recency`, `consolidation`, `conceptual richness`).
- Utiliza señales a corto plazo de tanto las recuperaciones de memoria como los pasos de ingestión diaria, más señales de refuerzo de fase ligera/REM.
- Cuando el dreaming (soñar) está habilitado, `memory-core` gestiona automáticamente un trabajo cron que ejecuta un barrido completo (`light -> REM -> deep`) en segundo plano (no se requiere `openclaw cron add` manual).
- `--agent <id>`: limitar a un solo agente (predeterminado: el agente predeterminado).
- `--limit <n>`: máximo de candidatos a devolver/aplicar.
- `--min-score <n>`: puntuación mínima de promoción ponderada.
- `--min-recall-count <n>`: recuento mínimo de recuperaciones requerido para un candidato.
- `--min-unique-queries <n>`: recuento mínimo de consultas distintas requerido para un candidato.
- `--apply`: añadir los candidatos seleccionados a `MEMORY.md` y marcarlos como promocionados.
- `--include-promoted`: incluir candidatos ya promocionados en la salida.
- `--json`: imprimir salida JSON.

## Soñar (experimental)

Soñar es el sistema de consolidación de memoria en segundo plano con tres fases cooperativas: **ligera** (clasificar/preparar material a corto plazo), **profunda** (promocionar hechos duraderos a `MEMORY.md`) y **REM** (reflexionar y sacar a la luz temas).

- Activar con `plugins.entries.memory-core.config.dreaming.enabled: true`.
- Alternar desde el chat con `/dreaming on|off` (o inspeccionar con `/dreaming status`).
- Soñar se ejecuta en un programa de barrido gestionado (`dreaming.frequency`) y ejecuta las fases en orden: ligera, REM, profunda.
- Solo la fase profunda escribe memoria duradera en `MEMORY.md`.
- Las entradas de salida de fase legibles por humanos y del diario se escriben en `DREAMS.md` (o `dreams.md` existente), con informes opcionales por fase en `memory/dreaming/<phase>/YYYY-MM-DD.md`.
- La clasificación utiliza señales ponderadas: frecuencia de recuerdo, relevancia de recuperación, diversidad de consultas, recencia temporal, consolidación entre días y riqueza de conceptos derivados.
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
- Si los campos de clave de API remota de memoria activa efectiva se configuran como SecretRefs, el comando resuelve esos valores desde la instantánea de la puerta de enlace activa. Si la puerta de enlace no está disponible, el comando falla rápidamente.
- Nota de sesgo de versión de la puerta de enlace: esta ruta de comando requiere una puerta de enlace que admita `secrets.resolve`; las puertas de enlace antiguas devuelven un error de método desconocido.
- Ajusta la cadencia de barrido programada con `dreaming.frequency`. La política de promoción profunda es, por lo demás, interna; usa las marcas de CLI en `memory promote` cuando necesites anulaciones manuales únicas.
- Consulta [Dreaming](/en/concepts/dreaming) para obtener descripciones completas de las fases y referencia de configuración.
