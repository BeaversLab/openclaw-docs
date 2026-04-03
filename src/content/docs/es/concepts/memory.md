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

Su agente tiene dos lugares para almacenar recuerdos:

- **`MEMORY.md`** -- memoria a largo plazo. Hechos duraderos, preferencias y
  decisiones. Se cargan al inicio de cada sesión de DM.
- **`memory/YYYY-MM-DD.md`** -- notas diarias. Contexto actual y observaciones.
  Las notas de hoy y de ayer se cargan automáticamente.

Estos archivos viven en el espacio de trabajo del agente (por defecto `~/.openclaw/workspace`).

<Tip>Si quiere que su agente recuerde algo, simplemente pídaselo: "Recuerda que prefiero TypeScript". Lo escribirá en el archivo apropiado.</Tip>

## Herramientas de memoria

El agente tiene dos herramientas para trabajar con la memoria:

- **`memory_search`** -- encuentra notas relevantes mediante búsqueda semántica, incluso cuando
  la redacción difiere de la original.
- **`memory_get`** -- lee un archivo de memoria o un rango de líneas específico.

Ambas herramientas son proporcionadas por el plugin de memoria activo (por defecto: `memory-core`).

## Búsqueda de memoria

Cuando se configura un proveedor de incrustaciones, `memory_search` utiliza **búsqueda
híbrida** -- combinando la similitud de vectores (significado semántico) con la coincidencia de
palabras clave (términos exactos como IDs y símbolos de código). Esto funciona de manera inmediata una vez que tiene
una clave API para cualquier proveedor compatible.

<Info>OpenClaw detecta automáticamente su proveedor de incrustaciones a partir de las claves API disponibles. Si tiene una clave de OpenAI, Gemini, Voyage o Mistral configurada, la búsqueda de memoria se habilita automáticamente.</Info>

Para obtener detalles sobre cómo funciona la búsqueda, las opciones de ajuste y la configuración del proveedor, consulte
[Búsqueda de memoria](/en/concepts/memory-search).

## Backends de memoria

<CardGroup cols={3}>
  <Card title="Integrado (por defecto)" icon="database" href="/en/concepts/memory-builtin">
    Basado en SQLite. Funciona de inmediato con búsqueda de palabras clave, similitud de vectores y búsqueda híbrida. Sin dependencias adicionales.
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    Sidecar local-first con reordenamiento, expansión de consultas y la capacidad de indexar directorios fuera del espacio de trabajo.
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    Memoria multiproceso nativa de IA con modelado de usuario, búsqueda semántica y conciencia multiagente. Instalación de complemento.
  </Card>
</CardGroup>

## Vaciado automático de memoria

Antes de que la [compactación](/en/concepts/compaction) resuma su conversación, OpenClaw
ejecuta un turno silencioso que recuerda al agente guardar el contexto importante en los archivos
de memoria. Esto está activado de manera predeterminada; no necesita configurar nada.

<Tip>El vaciado de memoria evita la pérdida de contexto durante la compactación. Si su agente tiene datos importantes en la conversación que aún no se han escrito en un archivo, se guardarán automáticamente antes de que se produzca el resumen.</Tip>

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Lecturas adicionales

- [Motor de memoria integrado](/en/concepts/memory-builtin) -- backend SQLite predeterminado
- [Motor de memoria QMD](/en/concepts/memory-qmd) -- sidecar local-first avanzado
- [Memoria Honcho](/en/concepts/memory-honcho) -- memoria multiproceso nativa de IA
- [Búsqueda de memoria](/en/concepts/memory-search) -- canalización de búsqueda, proveedores y
  ajuste
- [Referencia de configuración de memoria](/en/reference/memory-config) -- todos los controles de configuración
- [Compactación](/en/concepts/compaction) -- cómo interactúa la compactación con la memoria
