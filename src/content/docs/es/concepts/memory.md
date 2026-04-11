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
- **`memory/YYYY-MM-DD.md`** -- notas diarias. Contexto continuo y observaciones.
  Las notas de hoy y de ayer se cargan automáticamente.
- **`DREAMS.md`** (experimental, opcional) -- Diario de Sueños y resúmenes
  de barrido de sueños para revisión humana.

Estos archivos residen en el espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).

<Tip>Si desea que su agente recuerde algo, simplemente pídaselo: "Recuerda que prefiero TypeScript". Lo escribirá en el archivo apropiado.</Tip>

## Herramientas de memoria

El agente tiene dos herramientas para trabajar con la memoria:

- **`memory_search`** -- encuentra notas relevantes utilizando búsqueda semántica, incluso cuando
  la redacción difiere de la original.
- **`memory_get`** -- lee un archivo de memoria específico o un rango de líneas.

Ambas herramientas son proporcionadas por el complemento de memoria activo (por defecto: `memory-core`).

## Complemento acompañante de Memory Wiki

Si deseas que la memoria duradera se comporte más como una base de conocimiento mantenida que
solo notas sin procesar, usa el complemento incluido `memory-wiki`.

`memory-wiki` compila el conocimiento duradero en una bóveda wiki con:

- estructura de página determinista
- afirmaciones y evidencias estructuradas
- seguimiento de contradicciones y vigencia
- paneles generados
- resúmenes compilados para consumidores de agentes/tiempo de ejecución
- herramientas nativas de wiki como `wiki_search`, `wiki_get`, `wiki_apply` y `wiki_lint`

No reemplaza al complemento de memoria activo. El complemento de memoria activo todavía
es propietario del recuerdo, la promoción y el soñar. `memory-wiki` añade una capa de conocimiento
rica en procedencia al lado de este.

Consulta [Memory Wiki](/en/plugins/memory-wiki).

## Búsqueda de memoria

Cuando se configura un proveedor de incrustaciones (embeddings), `memory_search` utiliza **búsqueda
híbrida** -- combinando la similitud vectorial (significado semántico) con la coincidencia de palabras clave
(términos exactos como ID y símbolos de código). Esto funciona de fábrica una vez que tienes
una clave API para cualquier proveedor compatible.

<Info>OpenClaw detecta automáticamente tu proveedor de incrustaciones a partir de las claves API disponibles. Si tienes una clave de OpenAI, Gemini, Voyage o Mistral configurada, la búsqueda de memoria se habilita automáticamente.</Info>

Para obtener detalles sobre cómo funciona la búsqueda, las opciones de ajuste y la configuración del proveedor, consulta
[Memory Search](/en/concepts/memory-search).

## Backends de memoria

<CardGroup cols={3}>
  <Card title="Integrado (predeterminado)" icon="database" href="/en/concepts/memory-builtin">
    Basado en SQLite. Funciona de inmediato con búsqueda por palabras clave, similitud de vectores y búsqueda híbrida. Sin dependencias adicionales.
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    Sidecar local primero con reranking, expansión de consultas y la capacidad de indexar directorios fuera del espacio de trabajo.
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    Memoria multi-sesión nativa de IA con modelado de usuario, búsqueda semántica y conciencia multi-agente. Requiere instalación del complemento.
  </Card>
</CardGroup>

## Capa de wiki de conocimientos

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/en/plugins/memory-wiki">
    Compila la memoria duradera en una bóveda wiki rica en procedencia con reclamos, dashboards, modo puente y flujos de trabajo compatibles con Obsidian.
  </Card>
</CardGroup>

## Vaciado automático de memoria

Antes de que la [compacción](/en/concepts/compaction) resuma tu conversación, OpenClaw
ejecuta un turno silencioso que recuerda al agente guardar el contexto importante en los archivos de
memoria. Esto está activado de forma predeterminada; no necesitas configurar nada.

<Tip>El vaciado de memoria evita la pérdida de contexto durante la compactación. Si tu agente tiene hechos importantes en la conversación que aún no se han escrito en un archivo, se guardarán automáticamente antes de que se produzca el resumen.</Tip>

## Soñando (experimental)

Soñar (Dreaming) es un pase de consolidación en segundo plano opcional para la memoria. Recopila
señales a corto plazo, puntúa los candidatos y promueve solo los elementos calificados a la
memoria a largo plazo (`MEMORY.md`).

Está diseñado para mantener la memoria a largo plazo con alta señal:

- **Opt-in**: deshabilitado de forma predeterminada.
- **Programado**: cuando se habilita, `memory-core` gestiona automáticamente un trabajo cron recurrente
  para una barrida completa de soñado.
- **Con umbral**: las promociones deben superar los umbrales de puntuación, frecuencia de recuperación y diversidad
  de consultas.
- **Revisable**: los resúmenes de fases y las entradas del diario se escriben en `DREAMS.md`
  para su revisión humana.

Para el comportamiento de las fases, las señales de puntuación y los detalles del Dream Diary, consulte
[Dreaming (experimental)](/en/concepts/dreaming).

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Lecturas adicionales

- [Builtin Memory Engine](/en/concepts/memory-builtin) -- backend SQLite predeterminado
- [QMD Memory Engine](/en/concepts/memory-qmd) -- sidecar avanzado con prioridad local
- [Honcho Memory](/en/concepts/memory-honcho) -- memoria nativa de IA entre sesiones
- [Memory Wiki](/en/plugins/memory-wiki) -- bóveda de conocimiento compilada y herramientas nativas de wiki
- [Memory Search](/en/concepts/memory-search) -- canalización de búsqueda, proveedores y
  ajuste
- [Dreaming (experimental)](/en/concepts/dreaming) -- promoción en segundo plano
  del recuerdo a corto plazo a la memoria a largo plazo
- [Referencia de configuración de memoria](/en/reference/memory-config) -- todos los controles de configuración
- [Compaction](/en/concepts/compaction) -- cómo interactúa la compactación con la memoria
