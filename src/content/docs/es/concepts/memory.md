---
title: "Resumen de la memoria"
summary: "Cómo OpenClaw recuerda cosas a través de las sesiones"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

# Resumen de la memoria

OpenClaw recuerda las cosas escribiendo **archivos Markdown planos** en el espacio de trabajo
de su agente. El modelo solo "recuerda" lo que se guarda en el disco -- no hay
estado oculto.

## Cómo funciona

Su agente tiene tres archivos relacionados con la memoria:

- **`MEMORY.md`** -- memoria a largo plazo. Hechos duraderos, preferencias y
  decisiones. Se cargan al inicio de cada sesión de DM.
- **`memory/YYYY-MM-DD.md`** -- notas diarias. Contexto actual y observaciones.
  Las notas de hoy y de ayer se cargan automáticamente.
- **`DREAMS.md`** (experimental, opcional) -- Diario de sueños y resúmenes de barrido de sueños para su revisión humana.

Estos archivos residen en el espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).

<Tip>Si desea que su agente recuerde algo, simplemente pídaselo: "Recuerda que prefiero TypeScript". Lo escribirá en el archivo apropiado.</Tip>

## Herramientas de memoria

El agente tiene dos herramientas para trabajar con la memoria:

- **`memory_search`** -- encuentra notas relevantes usando búsqueda semántica, incluso cuando la redacción difiere de la original.
- **`memory_get`** -- lee un archivo de memoria específico o un rango de líneas.

Ambas herramientas son proporcionadas por el complemento de memoria activo (por defecto: `memory-core`).

## Búsqueda de memoria

Cuando se configura un proveedor de incrustaciones (embeddings), `memory_search` usa **búsqueda híbrida** -- combinando la similitud vectorial (significado semántico) con la coincidencia de palabras clave (términos exactos como IDs y símbolos de código). Esto funciona de inmediato una vez que tienes una clave API para cualquier proveedor compatible.

<Info>OpenClaw detecta automáticamente su proveedor de incrustaciones a partir de las claves API disponibles. Si tiene configurada una clave de OpenAI, Gemini, Voyage o Mistral, la búsqueda de memoria se habilita automáticamente.</Info>

Para obtener detalles sobre cómo funciona la búsqueda, las opciones de ajuste y la configuración del proveedor, consulte
[Memory Search](/en/concepts/memory-search).

## Backends de memoria

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/en/concepts/memory-builtin">
    Basado en SQLite. Funciona de inmediato con búsqueda de palabras clave, similitud vectorial y búsqueda híbrida. Sin dependencias adicionales.
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    Sidecar con prioridad local con reranking, expansión de consultas y la capacidad de indexar directorios fuera del espacio de trabajo.
  </Card>
  <Card title="Honcho" icon="cerebro" href="/en/concepts/memory-honcho">
    Memoria multi-sesión nativa de IA con modelado de usuario, búsqueda semántica y conciencia multi-agente. Instalación del complemento.
  </Card>
</CardGroup>

## Flush automático de memoria

Antes de que la [compactación](/en/concepts/compaction) resuma tu conversación, OpenClaw
ejecuta un turno silencioso que recuerda al agente guardar el contexto importante en archivos
de memoria. Esto está activado por defecto -- no necesitas configurar nada.

<Tip>El flush de memoria evita la pérdida de contexto durante la compactación. Si tu agente tiene datos importantes en la conversación que aún no se han escrito en un archivo, se guardarán automáticamente antes de que se produzca el resumen.</Tip>

## Soñar (experimental)

Soñar es un pase de consolidación en segundo plano opcional para la memoria. Recopila
señales a corto plazo, puntúa los candidatos y promueve solo los elementos calificados a la
memoria a largo plazo (`MEMORY.md`).

Está diseñado para mantener la memoria a largo plazo con alta señal:

- **Opt-in**: desactivado por defecto.
- **Programado**: cuando está activado, `memory-core` gestiona automáticamente un trabajo cron recurrente
  para un barrido completo de soñar.
- **Con umbral**: las promociones deben pasar puertas de puntuación, frecuencia de recuperación y
  diversidad de consultas.
- **Revisable**: los resúmenes de fase y las entradas del diario se escriben en `DREAMS.md`
  para su revisión humana.

Para conocer el comportamiento de las fases, las señales de puntuación y los detalles del Dream Diary, consulta
[Soñar (experimental)](/en/concepts/dreaming).

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Lectura adicional

- [Motor de memoria integrado](/en/concepts/memory-builtin) -- backend SQLite predeterminado
- [Motor de memoria QMD](/en/concepts/memory-qmd) -- sidecar local avanzado
- [Memoria Honcho](/en/concepts/memory-honcho) -- memoria multi-sesión nativa de IA
- [Búsqueda de memoria](/en/concepts/memory-search) -- canalización de búsqueda, proveedores y
  ajuste
- [Soñar (experimental)](/en/concepts/dreaming) -- promoción en segundo plano
  desde la recuperación a corto plazo hasta la memoria a largo plazo
- [Referencia de configuración de memoria](/en/reference/memory-config) -- todos los controles de configuración
- [Compactación](/en/concepts/compaction) -- cómo interactúa la compactación con la memoria
