---
summary: "Referencia de CLI para `openclaw memory` (status/index/search)"
read_when:
  - Deseas indexar o buscar memoria semántica
  - Estás depurando la disponibilidad de memoria o la indexación
title: "memory"
---

# `openclaw memory`

Gestiona la indexación y la búsqueda de memoria semántica.
Proporcionado por el complemento de memoria activo (predeterminado: `memory-core`; establece `plugins.slots.memory = "none"` para desactivar).

Relacionado:

- Concepto de memoria: [Memory](/es/concepts/memory)
- Complementos: [Plugins](/es/tools/plugin)

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

- `--agent <id>`: limitar a un solo agente. Sin esto, estos comandos se ejecutan para cada agente configurado; si no hay una lista de agentes configurada, recurren al agente predeterminado.
- `--verbose`: emite registros detallados durante las sondas y la indexación.

`memory status`:

- `--deep`: sondear la disponibilidad de vectores e incrustaciones.
- `--index`: ejecutar una reindexación si el almacén está sucio (implica `--deep`).
- `--json`: imprimir salida JSON.

`memory index`:

- `--force`: forzar una reindexación completa.

`memory search`:

- Entrada de consulta: pasa el `[query]` posicional o `--query <text>`.
- Si se proporcionan ambos, `--query` tiene prioridad.
- Si no se proporciona ninguno, el comando sale con un error.
- `--agent <id>`: limitar a un solo agente (predeterminado: el agente predeterminado).
- `--max-results <n>`: limitar el número de resultados devueltos.
- `--min-score <n>`: filtrar las coincidencias con puntuación baja.
- `--json`: imprimir resultados JSON.

Notas:

- `memory index --verbose` imprime detalles por fase (proveedor, modelo, fuentes, actividad por lotes).
- `memory status` incluye cualquier ruta adicional configurada a través de `memorySearch.extraPaths`.
- Si los campos de clave de API remota de memoria activa efectiva se configuran como SecretRefs, el comando resuelve esos valores desde la instantánea de la puerta de enlace activa. Si la puerta de enlace no está disponible, el comando falla rápidamente.
- Nota de desviación de versión de la puerta de enlace: esta ruta de comando requiere una puerta de enlace que admita `secrets.resolve`; las puertas de enlace más antiguas devuelven un error de método desconocido.

import en from "/components/footer/en.mdx";

<en />
