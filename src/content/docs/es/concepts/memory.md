---
summary: "Cómo OpenClaw recuerda cosas entre sesiones"
title: "Resumen de la memoria"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw recuerda cosas escribiendo **archivos Markdown sin formato** en el espacio de trabajo de su agente. El modelo solo "recuerda" lo que se guarda en el disco; no hay ningún estado oculto.

## Cómo funciona

Su agente tiene tres archivos relacionados con la memoria:

- **`MEMORY.md`** — memoria a largo plazo. Hechos duraderos, preferencias y
  decisiones. Se carga al inicio de cada sesión de DM.
- **`memory/YYYY-MM-DD.md`** — notas diarias. Contexto en ejecución y observaciones.
  Las notas de hoy y de ayer se cargan automáticamente.
- **`DREAMS.md`** (opcional) — Diario de Sueños y resúmenes de barridos de
  soñando para revisión humana, incluyendo entradas de relleno histórico fundamentadas.

Estos archivos residen en el espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).

## Qué va dónde

`MEMORY.md` es la capa compacta y curada. Úselo para hechos duraderos,
preferencias, decisiones permanentes y resúmenes cortos que deben estar disponibles al
inicio de una sesión principal privada. No está destinado a ser una transcripción cruda,
un registro diario o un archivo exhaustivo.

Los archivos `memory/YYYY-MM-DD.md` son la capa de trabajo. Úselos para notas diarias detalladas,
observaciones, resúmenes de sesión y contexto crudo que aún puede ser útil
más adelante. Estos archivos están indexados para `memory_search` y `memory_get`, pero no se
inyectan en el mensaje de arranque normal en cada turno.

Con el tiempo, se espera que el agente destile material útil de las notas diarias
en `MEMORY.md` y elimine entradas a largo plazo obsoletas. Las instrucciones del espacio de trabajo generadas y el flujo de latido pueden hacer esto periódicamente; no necesita
editar manualmente `MEMORY.md` por cada detalle recordado.

Si `MEMORY.md` crece más allá del presupuesto del archivo de arranque, OpenClaw mantiene el archivo en
disco intacto pero trunca la copia inyectada en el contexto del modelo. Trate eso como
una señal para mover el material detallado de vuelta a `memory/*.md`, mantener solo el
resumen duradero en `MEMORY.md`, o aumentar los límites de arranque si explícitamente
desea gastar más presupuesto de mensaje. Use `/context list`, `/context detail` o
`openclaw doctor` para ver tamaños crudos vs inyectados y el estado de truncamiento.

<Tip>Si deseas que tu agente recuerde algo, simplemente pídeselo: "Recuerda que prefiero TypeScript". Lo escribirá en el archivo apropiado.</Tip>

## Compromisos inferidos

Algunos seguimientos futuros no son hechos duraderos. Si mencionas una entrevista
mañana, el recuerdo útil puede ser "hacer un seguimiento después de la entrevista", no "guardar
esto para siempre en `MEMORY.md`".

[Compromisos](/es/concepts/commitments) son memorias de seguimiento opcionales y de corta duración
para ese caso. OpenClaw las infiere en un proceso en segundo plano oculto, las limita al
mismo agente y canal, y entrega los seguimientos vencidos a través del latido.
Los recordatorios explícitos aún usan [tareas programadas](/es/automation/cron-jobs).

## Herramientas de memoria

El agente tiene dos herramientas para trabajar con la memoria:

- **`memory_search`** — encuentra notas relevantes mediante búsqueda semántica, incluso cuando
  la redacción difiere de la original.
- **`memory_get`** — lee un archivo de memoria específico o un rango de líneas.

Ambas herramientas son proporcionadas por el plugin de memoria activo (predeterminado: `memory-core`).

## Plugin complementario Memory Wiki

Si deseas que la memoria duradera se comporte más como una base de conocimientos mantenida que
simplemente notas sin procesar, usa el plugin incluido `memory-wiki`.

`memory-wiki` compila el conocimiento duradero en una bóveda wiki con:

- estructura de página determinista
- reclamaciones y evidencias estructuradas
- seguimiento de contradicciones y vigencia
- paneles generados
- resúmenes compilados para consumidores de agentes/tiempo de ejecución
- herramientas nativas de wiki como `wiki_search`, `wiki_get`, `wiki_apply` y `wiki_lint`

No reemplaza al plugin de memoria activo. El plugin de memoria activo todavía
es dueño del recuerdo, la promoción y el soñar. `memory-wiki` añade una capa de conocimiento
rica en procedencia junto a él.

Consulta [Memory Wiki](/es/plugins/memory-wiki).

## Búsqueda de memoria

Cuando se configura un proveedor de incrustaciones (embeddings), `memory_search` utiliza **búsqueda
híbrida** — combinando la similitud vectorial (significado semántico) con la coincidencia de palabras clave
(términos exactos como IDs y símbolos de código). Esto funciona de inmediato una vez que tienes
una clave API para cualquier proveedor compatible.

<Info>OpenClaw detecta automáticamente su proveedor de incrustaciones a partir de las claves de API disponibles. Si tiene una clave de OpenAI, Gemini, Voyage o Mistral configurada, la búsqueda de memoria se habilita automáticamente.</Info>

Para obtener detalles sobre cómo funciona la búsqueda, las opciones de ajuste y la configuración del proveedor, consulte
[Búsqueda de memoria](/es/concepts/memory-search).

## Backends de memoria

<CardGroup cols={3}>
  <Card title="Integrado (predeterminado)" icon="base de datos" href="/es/concepts/memory-builtin">
    Basado en SQLite. Funciona de inmediato con búsqueda de palabras clave, similitud vectorial y búsqueda híbrida. Sin dependencias adicionales.
  </Card>
  <Card title="QMD" icon="búsqueda" href="/es/concepts/memory-qmd">
    Sidecar con prioridad local con reranking, expansión de consultas y la capacidad de indexar directorios fuera del espacio de trabajo.
  </Card>
  <Card title="Honcho" icon="cerebro" href="/es/concepts/memory-honcho">
    Memoria nativa de IA multi-sesión con modelado de usuario, búsqueda semántica y conciencia multi-agente. Instalación de complemento.
  </Card>
  <Card title="LanceDB" icon="capas" href="/es/plugins/memory-lancedb">
    Memoria con respaldo de LanceDB incluida con incrustaciones compatibles con OpenAI, recuerdo automático, captura automática y soporte de incrustación local de Ollama.
  </Card>
</CardGroup>

## Capa de wiki de conocimiento

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="libro" href="/es/plugins/memory-wiki">
    Compila la memoria duradera en una bóveda wiki rica en procedencia con reclamos, paneles, modo puente y flujos de trabajo compatibles con Obsidian.
  </Card>
</CardGroup>

## Vaciamiento automático de memoria

Antes de que la [compacción](/es/concepts/compaction) resuma su conversación, OpenClaw
ejecuta un turno silencioso que recuerda al agente que guarde el contexto importante en los archivos de
memoria. Esto está activado de forma predeterminada; no necesita configurar nada.

Para mantener ese turno de mantenimiento en un modelo local, establezca una anulación exacta del modelo de vaciado de memoria:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

La anulación solo se aplica al turno de vaciado de memoria y no hereda la
cadena de reserva de la sesión activa.

<Tip>El vaciado de memoria evita la pérdida de contexto durante la compactación. Si su agente tiene datos importantes en la conversación que aún no se han escrito en un archivo, se guardarán automáticamente antes de que ocurra el resumen.</Tip>

## Soñando (Dreaming)

Soñar (Dreaming) es un pase de consolidación opcional en segundo plano para la memoria. Recopila
señales a corto plazo, puntúa los candidatos y promueve solo los elementos calificados
en la memoria a largo plazo (`MEMORY.md`).

Está diseñado para mantener la memoria a largo plazo con alta señal:

- **Optativo**: deshabilitado por defecto.
- **Programado**: cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron recurrente
  para un barrido completo de soñado (dreaming).
- **Con umbral**: las promociones deben superar las puertas de puntuación, frecuencia de recuperación
  y diversidad de consultas.
- **Revisable**: los resúmenes de fase y las entradas del diario se escriben en `DREAMS.md`
  para su revisión humana.

Para conocer el comportamiento de las fases, las señales de puntuación y los detalles del Diario de Sueños, consulte
[Dreaming](/es/concepts/dreaming).

## Relleno fundamentado y promoción en vivo

El sistema de soñado (dreaming) ahora tiene dos carriles de revisión estrechamente relacionados:

- **Soñado en vivo (Live dreaming)** funciona desde el almacenamiento de soñado a corto plazo bajo
  `memory/.dreams/` y es lo que la fase profunda normal utiliza al decidir qué
  puede graduarse en `MEMORY.md`.
- **Relleno fundamentado (Grounded backfill)** lee las notas históricas `memory/YYYY-MM-DD.md` como
  archivos de día independientes y escribe resultados de revisión estructurados en `DREAMS.md`.

El relleno fundamentado es útil cuando desea reproducir notas antiguas e inspeccionar lo que
el sistema considera duradero sin editar manualmente `MEMORY.md`.

Cuando usa:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

los candidatos duraderos fundamentados no se promocionan directamente. Se clasifican en
el mismo almacén de soñado a corto plazo que la fase profunda normal ya usa. Eso
significa:

- `DREAMS.md` sigue siendo la superficie de revisión humana.
- el almacén a corto plazo sigue siendo la superficie de clasificación orientada a la máquina.
- `MEMORY.md` solo lo escribe la promoción profunda.

Si decide que la reproducción no fue útil, puede eliminar los artefactos preparados
sin tocar las entradas ordinarias del diario o el estado de recuperación normal:

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

- [Builtin memory engine](/es/concepts/memory-builtin): backend SQLite predeterminado.
- [QMD memory engine](/es/concepts/memory-qmd): sidecar avanzado con prioridad local.
- [Honcho memory](/es/concepts/memory-honcho): memoria multi-sesión nativa de IA.
- [Memory LanceDB](/es/plugins/memory-lancedb): complemento con soporte de LanceDB e incrustaciones compatibles con OpenAI.
- [Memory Wiki](/es/plugins/memory-wiki): bóveda de conocimiento compilada y herramientas nativas de wiki.
- [Memory search](/es/concepts/memory-search): canalización de búsqueda, proveedores y ajustes.
- [Dreaming](/es/concepts/dreaming): promoción en segundo plano de la memoria a corto plazo a la memoria a largo plazo.
- [Memory configuration reference](/es/reference/memory-config): todos los controles de configuración.
- [Compaction](/es/concepts/compaction): cómo interactúa la compactación con la memoria.

## Relacionado

- [Active memory](/es/concepts/active-memory)
- [Memory search](/es/concepts/memory-search)
- [Builtin memory engine](/es/concepts/memory-builtin)
- [Honcho memory](/es/concepts/memory-honcho)
- [Memory LanceDB](/es/plugins/memory-lancedb)
- [Commitments](/es/concepts/commitments)
