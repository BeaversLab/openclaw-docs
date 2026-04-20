---
title: "Resumen de Memoria"
summary: "Cómo OpenClaw recuerda cosas a través de sesiones"
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
  Las notas de hoy y ayer se cargan automáticamente.
- **`DREAMS.md`** (opcional) -- Resúmenes del Diario de Sueños y barridos de soñado para revisión humana, incluyendo entradas de relleno histórico fundamentado.

Estos archivos residen en el espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).

<Tip>Si desea que su agente recuerde algo, simplemente pídaselo: "Recuerda que prefiero TypeScript". Lo escribirá en el archivo apropiado.</Tip>

## Herramientas de memoria

El agente tiene dos herramientas para trabajar con la memoria:

- **`memory_search`** -- encuentra notas relevantes usando búsqueda semántica, incluso cuando
  la redacción difiere de la original.
- **`memory_get`** -- lee un archivo de memoria específico o un rango de líneas.

Ambas herramientas son proporcionadas por el complemento de memoria activo (por defecto: `memory-core`).

## Complemento acompañante de Memory Wiki

Si deseas que la memoria duradera se comporte más como una base de conocimiento mantenida que
solo notas crudas, usa el complemento incluido `memory-wiki`.

`memory-wiki` compila el conocimiento duradero en una bóveda wiki con:

- estructura de página determinista
- afirmaciones y evidencias estructuradas
- seguimiento de contradicciones y vigencia
- paneles generados
- resúmenes compilados para consumidores de agentes/tiempo de ejecución
- herramientas nativas de wiki como `wiki_search`, `wiki_get`, `wiki_apply` y `wiki_lint`

No reemplaza al complemento de memoria activo. El complemento de memoria activo aún
posee el recuerdo, la promoción y el sueño. `memory-wiki` añade una capa de
conocimiento rico en procedencia junto a él.

Ver [Memory Wiki](/en/plugins/memory-wiki).

## Búsqueda de memoria

Cuando se configura un proveedor de incrustaciones, `memory_search` usa **búsqueda
híbrida** -- combinando similitud vectorial (significado semántico) con coincidencia de
palabras clave (términos exactos como IDs y símbolos de código). Esto funciona de inmediato una vez que tienes
una clave API para cualquier proveedor compatible.

<Info>OpenClaw detecta automáticamente tu proveedor de incrustaciones a partir de las claves API disponibles. Si tienes una clave de OpenAI, Gemini, Voyage o Mistral configurada, la búsqueda de memoria se habilita automáticamente.</Info>

Para detalles sobre cómo funciona la búsqueda, opciones de ajuste y configuración del proveedor, ver
[Memory Search](/en/concepts/memory-search).

## Backends de memoria

<CardGroup cols={3}>
  <Card title="Integrado (predeterminado)" icon="base de datos" href="/en/concepts/memory-builtin">
    Basado en SQLite. Funciona de inmediato con búsqueda por palabras clave, similitud vectorial y búsqueda híbrida. Sin dependencias adicionales.
  </Card>
  <Card title="QMD" icon="búsqueda" href="/en/concepts/memory-qmd">
    Sidecar local-primero con reranking, expansión de consultas y la capacidad de indexar directorios fuera del espacio de trabajo.
  </Card>
  <Card title="Honcho" icon="cerebro" href="/en/concepts/memory-honcho">
    Memoria multi-sesión nativa de IA con modelado de usuario, búsqueda semántica y conciencia multi-agente. Instalación de complemento.
  </Card>
</CardGroup>

## Capa de wiki de conocimientos

<CardGroup cols={1}>
  <Card title="Wiki de Memoria" icon="libro" href="/en/plugins/memory-wiki">
    Compila la memoria duradera en una bóveda de wiki rica en procedencia con reclamos, dashboards, modo puente y flujos de trabajo compatibles con Obsidian.
  </Card>
</CardGroup>

## Vaciado automático de memoria

Antes de que la [compactación](/en/concepts/compaction) resuma su conversación, OpenClaw
ejecuta un turno silencioso que recuerda al agente guardar el contexto importante en archivos de
memoria. Esto está activado por defecto; no necesitas configurar nada.

<Tip>El vaciado de memoria evita la pérdida de contexto durante la compactación. Si tu agente tiene hechos importantes en la conversación que aún no se han escrito en un archivo, se guardarán automáticamente antes de que se produzca el resumen.</Tip>

## Soñado

Soñar es un pase de consolidación en segundo plano opcional para la memoria. Recopila
señales a corto plazo, puntúa candidatos y promueve solo los elementos calificados a la
memoria a largo plazo (`MEMORY.md`).

Está diseñado para mantener la memoria a largo plazo con alta señal:

- **Opt-in**: deshabilitado de forma predeterminada.
- **Programado**: cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron recurrente
  para un barrido completo de soñar.
- **Con umbral**: las promociones deben superar los umbrales de puntuación, frecuencia de recuperación y diversidad
  de consultas.
- **Revisable**: los resúmenes de fase y las entradas de diario se escriben en `DREAMS.md`
  para su revisión humana.

Para el comportamiento de las fases, las señales de puntuación y los detalles del Diario de Sueños, consulte
[Dreaming](/en/concepts/dreaming).

## Relleno fundamentado y promoción en vivo

El sistema de soñar ahora tiene dos carriles de revisión estrechamente relacionados:

- **Live dreaming** funciona desde el almacenamiento de soñamiento a corto plazo bajo
  `memory/.dreams/` y es lo que la fase profunda normal utiliza al decidir qué
  puede graduarse en `MEMORY.md`.
- **Grounded backfill** lee notas `memory/YYYY-MM-DD.md` históricas como
  archivos de día independientes y escribe resultados de revisión estructurados en `DREAMS.md`.

El grounded backfill es útil cuando desea reproducir notas antiguas e inspeccionar qué
considera el sistema que es duradero sin editar manualmente `MEMORY.md`.

Cuando usa:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

los candidatos duraderos grounded no se promocionan directamente. Se colocan en
el mismo almacenamiento de soñamiento a corto plazo que la fase profunda normal ya usa. Eso
significa:

- `DREAMS.md` se mantiene como la superficie de revisión humana.
- el almacenamiento a corto plazo se mantiene como la superficie de clasificación orientada a la máquina.
- `MEMORY.md` solo se escribe mediante promoción profunda.

Si decide que la reproducción no fue útil, puede eliminar los artefactos preparados
sin tocar las entradas de diario ordinarias ni el estado de recuerdo normal:

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

## Lectura adicional

- [Builtin Memory Engine](/en/concepts/memory-builtin) -- backend SQLite predeterminado
- [QMD Memory Engine](/en/concepts/memory-qmd) -- sidecar local-first avanzado
- [Honcho Memory](/en/concepts/memory-honcho) -- memoria nativa de IA entre sesiones
- [Memory Wiki](/en/plugins/memory-wiki) -- bóveda de conocimiento compilada y herramientas nativas de wiki
- [Memory Search](/en/concepts/memory-search) -- canalización de búsqueda, proveedores y
  ajuste
- [Dreaming](/en/concepts/dreaming) -- promoción en segundo plano
  desde el recuerdo a corto plazo hasta la memoria a largo plazo
- [Referencia de configuración de memoria](/en/reference/memory-config) -- todos los controles de configuración
- [Compaction](/en/concepts/compaction) -- cómo la compactación interactúa con la memoria
