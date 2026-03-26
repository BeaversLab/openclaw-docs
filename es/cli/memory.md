---
summary: "Referencia de la CLI para `openclaw memory` (estado/índice/búsqueda)"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
title: "memoria"
---

# `openclaw memory`

Gestiona la indexación y la búsqueda de memoria semántica.
Proporcionado por el complemento de memoria activo (predeterminado: `memory-core`; establezca `plugins.slots.memory = "none"` para desactivar).

Relacionado:

- Concepto de memoria: [Memoria](/es/concepts/memory)
- Complementos: [Complementos](/es/tools/plugin)

## Ejemplos

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## Opciones

`memory status` y `memory index`:

- `--agent <id>`: limitar el alcance a un solo agente. Sin esto, estos comandos se ejecutan para cada agente configurado; si no hay una lista de agentes configurada, vuelven al agente predeterminado.
- `--verbose`: emitir registros detallados durante las sondas y la indexación.

`memory status`:

- `--deep`: sondear la disponibilidad de vectores e incrustaciones.
- `--index`: ejecutar una reindexación si el almacén está sucio (implica `--deep`).
- `--json`: imprimir salida JSON.

`memory index`:

- `--force`: forzar una reindexación completa.

`memory search`:

- Entrada de consulta: pasar `[query]` o `--query <text>` posicional.
- Si se proporcionan ambos, `--query` tiene prioridad.
- Si no se proporciona ninguno, el comando finaliza con un error.
- `--agent <id>`: limitar el alcance a un solo agente (predeterminado: el agente predeterminado).
- `--max-results <n>`: limitar el número de resultados devueltos.
- `--min-score <n>`: filtrar las coincidencias con puntuación baja.
- `--json`: imprimir resultados JSON.

Notas:

- `memory index --verbose` imprime detalles por fase (proveedor, modelo, fuentes, actividad por lotes).
- `memory status` incluye cualquier ruta adicional configurada a través de `memorySearch.extraPaths`.
- Si los campos de clave de API remota de memoria activa efectiva están configurados como SecretRefs, el comando resuelve esos valores desde la instantánea de puerta de enlace activa. Si la puerta de enlace no está disponible, el comando falla rápidamente.
- Nota de discrepancia de versión de la puerta de enlace: esta ruta de comando requiere una puerta de enlace que admita `secrets.resolve`; las puertas de enlace más antiguas devuelven un error de método desconocido.

import es from "/components/footer/es.mdx";

<es />
