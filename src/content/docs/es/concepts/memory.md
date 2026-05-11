---
summary: "Cómo OpenClaw recuerda cosas a través de sesiones"
title: "Resumen de la memoria"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw recuerda cosas escribiendo **archivos Markdown sin formato** en el espacio de trabajo de su agente. El modelo solo "recuerda" lo que se guarda en el disco; no hay ningún estado oculto.

## Cómo funciona

Su agente tiene tres archivos relacionados con la memoria:

- **`MEMORY.md`** — memoria a largo plazo. Hechos duraderos, preferencias y decisiones. Se carga al inicio de cada sesión de DM.
- **`memory/YYYY-MM-DD.md`** — notas diarias. Contexto continuo y observaciones. Las notas de hoy y de ayer se cargan automáticamente.
- **`DREAMS.md`** (opcional) — Diario de Sueños y resúmenes de barridos de soñar para la revisión humana, incluidas entradas de relleno histórico fundamentadas.

Estos archivos viven en el espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).

<Tip>Si quiere que su agente recuerde algo, simplemente pídaselo: "Recuerda que prefiero TypeScript". Lo escribirá en el archivo apropiado.</Tip>

## Herramientas de memoria

El agente tiene dos herramientas para trabajar con la memoria:

- **`memory_search`** — encuentra notas relevantes utilizando búsqueda semántica, incluso cuando la redacción difiere de la original.
- **`memory_get`** — lee un archivo de memoria o un rango de líneas específico.

Ambas herramientas son proporcionadas por el complemento de memoria activo (por defecto: `memory-core`).

## Complemento acompañante de Memory Wiki

Si desea que la memoria duradera se comporte más como una base de conocimiento mantenida que solo notas sin procesar, use el complemento incluido `memory-wiki`.

`memory-wiki` compila el conocimiento duradero en una bóveda wiki con:

- estructura determinista de página
- afirmaciones y evidencias estructuradas
- seguimiento de contradicciones y actualidad
- paneles generados
- resúmenes compilados para consumidores de agentes/tiempo de ejecución
- herramientas nativas de wiki como `wiki_search`, `wiki_get`, `wiki_apply` y `wiki_lint`

No reemplaza al complemento de memoria activo. El complemento de memoria activo aún posee el recuerdo, la promoción y el soñar. `memory-wiki` añade una capa de conocimiento con riqueza de procedencia junto a él.

Consulte [Memory Wiki](/es/plugins/memory-wiki).

## Búsqueda de memoria

Cuando se configura un proveedor de incrustaciones, `memory_search` utiliza **búsqueda
híbrida** — combinando la similitud vectorial (significado semántico) con la coincidencia de
palabras clave (términos exactos como ID y símbolos de código). Esto funciona de inmediato una vez que tienes
una clave de API para cualquier proveedor compatible.

<Info>OpenClaw detecta automáticamente tu proveedor de incrustaciones a partir de las claves de API disponibles. Si tienes configurada una clave de OpenAI, Gemini, Voyage o Mistral, la búsqueda de memoria se habilita automáticamente.</Info>

Para obtener detalles sobre cómo funciona la búsqueda, las opciones de ajuste y la configuración del proveedor, consulta
[Búsqueda de memoria](/es/concepts/memory-search).

## Backends de memoria

<CardGroup cols={3}>
  <Card title="Integrado (predeterminado)" icon="database" href="/es/concepts/memory-builtin">
    Basado en SQLite. Funciona de inmediato con búsqueda de palabras clave, similitud vectorial y búsqueda híbrida. Sin dependencias adicionales.
  </Card>
  <Card title="QMD" icon="search" href="/es/concepts/memory-qmd">
    Sidecar local primero con reranking, expansión de consultas y la capacidad de indexar directorios fuera del espacio de trabajo.
  </Card>
  <Card title="Honcho" icon="brain" href="/es/concepts/memory-honcho">
    Memoria nativa de IA entre sesiones con modelado de usuario, búsqueda semántica y conciencia multiagente. Requiere instalación del complemento.
  </Card>
</CardGroup>

## Capa de wiki de conocimiento

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/es/plugins/memory-wiki">
    Compila la memoria duradera en una bóveda de wiki rica en procedencia con afirmaciones, dashboards, modo puente y flujos de trabajo compatibles con Obsidian.
  </Card>
</CardGroup>

## Vaciado automático de memoria

Antes de que la [compactación](/es/concepts/compaction) resuma tu conversación, OpenClaw
ejecuta un turno silencioso que recuerda al agente guardar el contexto importante en los archivos
de memoria. Esto está activado de forma predeterminada; no necesitas configurar nada.

<Tip>La limpieza de memoria evita la pérdida de contexto durante la compactación. Si su agente tiene datos importantes en la conversación que aún no se han escrito en un archivo, se guardarán automáticamente antes de que ocurra el resumen.</Tip>

## Soñando

Soñar es un paso de consolidación en segundo plano opcional para la memoria. Recopila
señales a corto plazo, puntúa los candidatos y promueve solo los elementos calificados a la
memoria a largo plazo (`MEMORY.md`).

Está diseñado para mantener la memoria a largo plazo con alta señal:

- **Optativo**: deshabilitado por defecto.
- **Programado**: cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron recurrente
  para un barrido completo de soñando.
- **Con umbral**: las promociones deben superar los umbrales de puntuación, frecuencia de recuerdo y
  diversidad de consultas.
- **Revisable**: los resúmenes de fase y las entradas del diario se escriben en `DREAMS.md`
  para su revisión humana.

Para conocer el comportamiento de la fase, las señales de puntuación y los detalles del Diario de Sueños, consulte
[Soñando](/es/concepts/dreaming).

## Relleno fundamentado y promoción en vivo

El sistema de soñando ahora tiene dos vías de revisión estrechamente relacionadas:

- **Soñando en vivo** funciona desde el almacén de soñando a corto plazo bajo
  `memory/.dreams/` y es lo que la fase profunda normal utiliza al decidir qué
  puede graduarse en `MEMORY.md`.
- **Relleno fundamentado** lee notas históricas de `memory/YYYY-MM-DD.md` como
  archivos de día independientes y escribe resultados de revisión estructurados en `DREAMS.md`.

El relleno fundamentado es útil cuando desea reproducir notas antiguas e inspeccionar qué
considera el sistema que es duradero sin editar manualmente `MEMORY.md`.

Cuando usa:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

los candidatos duraderos fundamentados no se promocionan directamente. Se preparan en
el mismo almacén de soñando a corto plazo que la fase profunda normal ya usa. Eso
significa:

- `DREAMS.md` sigue siendo la superficie de revisión humana.
- el almacén a corto plazo sigue siendo la superficie de clasificación orientada a la máquina.
- `MEMORY.md` solo lo sigue escribiendo la promoción profunda.

Si decide que la reproducción no fue útil, puede eliminar los artefactos preparados
sin tocar las entradas ordinarias del diario ni el estado normal de recuerdo:

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Lecturas adicionales

- [Motor de memoria integrado](/es/concepts/memory-builtin): backend SQLite predeterminado.
- [Motor de memoria QMD](/es/concepts/memory-qmd): sidecar local avanzado.
- [Memoria Honcho](/es/concepts/memory-honcho): memoria nativa de IA entre sesiones.
- [Memory Wiki](/es/plugins/memory-wiki): bóveda de conocimiento compilada y herramientas nativas de wiki.
- [Búsqueda de memoria](/es/concepts/memory-search): canalización de búsqueda, proveedores y ajustes.
- [Soñando (Dreaming)](/es/concepts/dreaming): promoción en segundo plano del recuerdo a corto plazo a la memoria a largo plazo.
- [Referencia de configuración de memoria](/es/reference/memory-config): todos los controles de configuración.
- [Compactación](/es/concepts/compaction): cómo la compactación interactúa con la memoria.

## Relacionado

- [Memoria activa](/es/concepts/active-memory)
- [Búsqueda de memoria](/es/concepts/memory-search)
- [Motor de memoria integrado](/es/concepts/memory-builtin)
- [Memoria Honcho](/es/concepts/memory-honcho)
