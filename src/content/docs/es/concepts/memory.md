---
summary: "Cómo OpenClaw recuerda cosas entre sesiones"
title: "Resumen de memoria"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw recuerda cosas escribiendo **archivos Markdown sin formato** en el espacio de trabajo de su agente. El modelo solo "recuerda" lo que se guarda en el disco; no hay ningún estado oculto.

## Cómo funciona

Su agente tiene tres archivos relacionados con la memoria:

- **`MEMORY.md`** — memoria a largo plazo. Hechos duraderos, preferencias y
  decisiones. Se carga al comienzo de cada sesión de DM.
- **`memory/YYYY-MM-DD.md`** (o **`memory/YYYY-MM-DD-<slug>.md`**) — notas diarias.
  Contexto en ejecución y observaciones. Las notas de hoy y de ayer se cargan
  automáticamente, y las variantes con slug como las escritas por el enlace de
  memoria de sesión incluido en `/new` o `/reset` ahora se recogen junto con el
  archivo de solo fecha.
- **`DREAMS.md`** (opcional) — Diario de Sueños y resúmenes de barrido
  de sueños para revisión humana, incluyendo entradas de relleno histórico fundamentadas.

Estos archivos viven en el espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).

## Qué va dónde

`MEMORY.md` es la capa compacta y curada. Úselo para hechos duraderos,
preferencias, decisiones permanentes y resúmenes cortos que deben estar disponibles al
inicio de una sesión privada principal. No está destinado a ser una transcripción cruda,
un registro diario o un archivo exhaustivo.

Los archivos `memory/YYYY-MM-DD.md` son la capa de trabajo. Úselos para notas diarias detalladas,
observaciones, resúmenes de sesión y contexto crudo que aún puede ser útil
más adelante. Estos archivos están indexados para `memory_search` y `memory_get`, pero no
se inyectan en el mensaje de arranque normal en cada turno.

Con el tiempo, se espera que el agente destile material útil de las notas diarias
en `MEMORY.md` y elimine entradas a largo plazo obsoletas. Las instrucciones del espacio de trabajo generadas y el flujo de latido pueden hacerlo periódicamente; no necesita
editar manualmente `MEMORY.md` para cada detalle recordado.

Si `MEMORY.md` crece más allá del presupuesto del archivo de arranque, OpenClaw mantiene el archivo en el disco intacto pero trunca la copia inyectada en el contexto del modelo. Trátelo como una señal para mover el material detallado de vuelta a `memory/*.md`, mantener solo el resumen duradero en `MEMORY.md`, o aumentar los límites de arranque si explícitamente desea gastar más presupuesto de prompt. Use `/context list`, `/context detail` o `openclaw doctor` para ver los tamaños brutos frente a los inyectados y el estado de truncamiento.

<Tip>Si deseas que tu agente recuerde algo, simplemente pídeselo: "Recuerda que prefiero TypeScript". Lo escribirá en el archivo apropiado.</Tip>

## Memorias sensibles a acciones

La mayoría de las memorias se pueden escribir como notas ordinarias en Markdown. Pero algunas memorias afectan lo que el agente debe hacer más tarde. Para esas, capture cuándo es seguro actuar sobre la nota, no solo el hecho en sí.

Capture ese límite de acción cuando una nota involucre:

- requisitos de aprobación o permiso,
- restricciones temporales,
- transferencias a otra sesión, hilo o persona,
- condiciones de caducidad,
- momento seguro para actuar,
- autoría del origen o propietario,
- instrucciones para evitar una acción tentadora.

Una memoria sensible a acciones útil deja claro:

- qué cambia el comportamiento futuro,
- cuándo o bajo qué condición se aplica,
- cuándo caduca o qué desbloquea la acción,
- qué debe evitar hacer el agente,
- quién es el origen o el propietario, si eso afecta la confianza o la autoridad.

La memoria puede preservar el contexto de aprobación, pero no hace cumplir la política. Use la configuración de aprobación de OpenClaw, el sandboxing y las tareas programadas para controles operativos estrictos.

Ejemplo:

```md
The API migration is being designed in another session. Future turns should not edit the API implementation from this thread; use findings here only as design input until the migration plan lands.
```

Otro ejemplo:

```md
A report from an untrusted source needs review before promotion. Future turns should treat it as evidence only; do not store it as durable memory until a trusted reviewer confirms the contents.
```

Use [commitments](/es/concepts/commitments) para seguimientos inferidos de corta duración. Use [scheduled tasks](/es/automation/cron-jobs) para recordatorios exactos, verificaciones temporizadas y trabajos recurrentes. La memoria aún puede resumir el contexto duradero alrededor de cualquier ruta.

Este no es un esquema obligatorio para cada memoria. Los hechos simples pueden mantenerse concisos. Use límites sensibles a acciones cuando perder el contexto de tiempo, autoridad, caducidad o seguridad para actuar podría hacer que el agente haga lo incorrecto más adelante.

## Compromisos inferidos

Algunos seguimientos futuros no son hechos duraderos. Si menciona una entrevista mañana, la memoria útil puede ser "hacer un seguimiento después de la entrevista", no "guardar esto para siempre en `MEMORY.md`".

[Los compromisos](/es/concepts/commitments) son memorias de seguimiento opcionales y de corta duración
para ese caso. OpenClaw los infiere en un proceso en segundo plano oculto, los limita al
mismo agente y canal, y entrega los seguimientos vencidos a través del latido.
Los recordatorios explícitos aún usan [tareas programadas](/es/automation/cron-jobs).

## Herramientas de memoria

El agente tiene dos herramientas para trabajar con la memoria:

- **`memory_search`** — encuentra notas relevantes utilizando búsqueda semántica, incluso cuando
  la redacción difiere de la original.
- **`memory_get`** — lee un archivo de memoria específico o un rango de líneas.

Ambas herramientas son proporcionadas por el complemento de memoria activo (predeterminado: `memory-core`).

## Complemento compañero de Memory Wiki

Si desea que la memoria duradera se comporte más como una base de conocimiento mantenida que
como solo notas sin formato, use el complemento `memory-wiki` incluido.

`memory-wiki` compila el conocimiento duradero en una bóveda wiki con:

- estructura determinista de página
- reclamaciones y evidencias estructuradas
- seguimiento de contradicciones y vigencia
- tableros generados
- resúmenes compilados para consumidores de agentes/tiempo de ejecución
- herramientas nativas de wiki como `wiki_search`, `wiki_get`, `wiki_apply` y `wiki_lint`

No reemplaza al complemento de memoria activo. El complemento de memoria activo aún
posee la recuperación, la promoción y el soñar. `memory-wiki` añade una capa de conocimiento
rica en procedencia junto a él.

Véase [Memory Wiki](/es/plugins/memory-wiki).

## Búsqueda de memoria

Cuando se configura un proveedor de incrustaciones, `memory_search` utiliza **búsqueda
híbrida** — combinando la similitud vectorial (significado semántico) con la coincidencia de palabras clave
(términos exactos como ID y símbolos de código). Esto funciona de inmediato una vez que tiene
una clave API para cualquier proveedor compatible.

<Info>OpenClaw detecta automáticamente su proveedor de incrustaciones a partir de las claves API disponibles. Si tiene una clave de OpenAI, Gemini, Voyage o Mistral configurada, la búsqueda de memoria se habilita automáticamente.</Info>

Para obtener detalles sobre cómo funciona la búsqueda, opciones de ajuste y configuración del proveedor, consulte
[Memory Search](/es/concepts/memory-search).

## Backends de memoria

<CardGroup cols={3}>
  <Card title="Integrado (predeterminado)" icon="base de datos" href="/es/concepts/memory-builtin">
    Basado en SQLite. Funciona de inmediato con búsqueda por palabras clave, similitud vectorial y búsqueda híbrida. Sin dependencias adicionales.
  </Card>
  <Card title="QMD" icon="búsqueda" href="/es/concepts/memory-qmd">
    Sidecar con prioridad local con reranking, expansión de consultas y la capacidad de indexar directorios fuera del espacio de trabajo.
  </Card>
  <Card title="Honcho" icon="cerebro" href="/es/concepts/memory-honcho">
    Memoria multi-sesión nativa de IA con modelado de usuario, búsqueda semántica y conciencia multi-agente. Requiere instalación del complemento.
  </Card>
  <Card title="LanceDB" icon="capas" href="/es/plugins/memory-lancedb">
    Memoria con LanceDB integrada con incrustaciones compatibles con OpenAI, recuerdo automático, captura automática y soporte para incrustaciones locales de Ollama.
  </Card>
</CardGroup>

## Capa de wiki de conocimiento

<CardGroup cols={1}>
  <Card title="Wiki de memoria" icon="libro" href="/es/plugins/memory-wiki">
    Compila la memoria duradera en una bóveda wiki rica en procedencia con afirmaciones, cuadros de mandos, modo puente y flujos de trabajo compatibles con Obsidian.
  </Card>
</CardGroup>

## Vaciado automático de memoria

Antes de que la [compactación](/es/concepts/compaction) resuma su conversación, OpenClaw
ejecuta un turno silencioso que recuerda al agente guardar el contexto importante en los archivos de
memoria. Esto está activado de forma predeterminada; no necesita configurar nada.

Para mantener ese turno de mantenimiento en un modelo local, configure una invalidación de modelo de vaciado de memoria exacta:

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

La invalidación se aplica solo al turno de vaciado de memoria y no hereda la
cadena de reserva de la sesión activa.

<Tip>El vaciado de memoria evita la pérdida de contexto durante la compactación. Si su agente tiene datos importantes en la conversación que aún no se han escrito en un archivo, se guardarán automáticamente antes de que se produzca el resumen.</Tip>

## Soñar

Soñar es un proceso de consolidación en segundo plano opcional para la memoria. Recopila
señales a corto plazo, puntúa candidatos y promueve solo los elementos calificados a la
memoria a largo plazo (`MEMORY.md`).

Está diseñado para mantener la memoria a largo plazo con alta señal:

- **Opt-in**: deshabilitado por defecto.
- **Programado**: cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron recurrente
  para un barrido completo de soñando (dreaming).
- **Con umbral**: las promociones deben pasar las puertas de puntuación, frecuencia de recuerdo y diversidad
  de consulta.
- **Revisable**: los resúmenes de fase y las entradas del diario se escriben en `DREAMS.md`
  para su revisión humana.

Para el comportamiento de la fase, las señales de puntuación y los detalles del Diario de Sueños, consulte
[Dreaming](/es/concepts/dreaming).

## Rellenado con respaldo (Grounded backfill) y promoción en vivo

El sistema de soñando ahora tiene dos carriles de revisión estrechamente relacionados:

- **Soñar en vivo (Live dreaming)** funciona desde el almacén de soñando a corto plazo en
  `memory/.dreams/` y es lo que la fase profunda normal usa al decidir qué
  puede graduarse en `MEMORY.md`.
- **Rellenado con respaldo (Grounded backfill)** lee notas históricas de `memory/YYYY-MM-DD.md` como
  archivos de día independientes y escribe salida de revisión estructurada en `DREAMS.md`.

El rellenado con respaldo es útil cuando desea reproducir notas antiguas e inspeccionar qué
piensa el sistema que es duradero sin editar manualmente `MEMORY.md`.

Cuando usa:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

los candidatos duraderos con respaldo no se promocionan directamente. Se ubican en
el mismo almacén de soñando a corto plazo que la fase profunda normal ya usa. Eso
significa:

- `DREAMS.md` sigue siendo la superficie de revisión humana.
- el almacén a corto plazo sigue siendo la superficie de clasificación orientada a la máquina.
- `MEMORY.md` todavía solo se escribe mediante promoción profunda.

Si decide que la reproducción no fue útil, puede eliminar los artefactos preparados
sin tocar las entradas del diario ordinario ni el estado de recuerdo normal:

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

- [Motor de memoria integrado (Builtin memory engine)](/es/concepts/memory-builtin): backend SQLite predeterminado.
- [Motor de memoria QMD](/es/concepts/memory-qmd): sidecar avanzado local-first.
- [Memoria Honcho](/es/concepts/memory-honcho): memoria nativa de IA entre sesiones.
- [Memory LanceDB](/es/plugins/memory-lancedb): complemento con soporte de LanceDB e incrustaciones compatibles con OpenAI.
- [Memory Wiki](/es/plugins/memory-wiki): bóveda de conocimientos compilada y herramientas nativas de wiki.
- [Memory search](/es/concepts/memory-search): canalización de búsqueda, proveedores y ajuste.
- [Dreaming](/es/concepts/dreaming): promoción en segundo plano del recuerdo a corto plazo a la memoria a largo plazo.
- [Memory configuration reference](/es/reference/memory-config): todos los controles de configuración.
- [Compaction](/es/concepts/compaction): cómo interactúa la compactación con la memoria.

## Relacionado

- [Active memory](/es/concepts/active-memory)
- [Memory search](/es/concepts/memory-search)
- [Builtin memory engine](/es/concepts/memory-builtin)
- [Honcho memory](/es/concepts/memory-honcho)
- [Memory LanceDB](/es/plugins/memory-lancedb)
- [Commitments](/es/concepts/commitments)
