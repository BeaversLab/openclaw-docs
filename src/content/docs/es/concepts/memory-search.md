---
summary: "Cómo la búsqueda en memoria encuentra notas relevantes utilizando incrustaciones e recuperación híbrida"
title: "Búsqueda en memoria"
read_when:
  - You want to understand how memory_search works
  - You want to choose an embedding provider
  - You want to tune search quality
---

`memory_search` encuentra notas relevantes en tus archivos de memoria, incluso cuando la redacción difiere del texto original. Funciona indexando la memoria en pequeños fragmentos y buscándolos mediante incrustaciones, palabras clave o ambos.

## Inicio rápido

Si tienes una suscripción a GitHub Copilot, o una clave API de OpenAI, Gemini, Voyage o Mistral configurada, la búsqueda en memoria funciona automáticamente. Para establecer un proveedor explícitamente:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai", // or "gemini", "local", "ollama", etc.
      },
    },
  },
}
```

Para configuraciones de múltiples puntos finales, `provider` también puede ser una entrada `models.providers.<id>` personalizada, como `ollama-5080`, cuando ese proveedor establece `api: "ollama"` u otro propietario de adaptador de incrustación.

Para incrustaciones locales sin clave API, establezca `provider: "local"`. Las comprobaciones de fuente aún pueden requerir aprobación de compilación nativa: `pnpm approve-builds` luego `pnpm rebuild node-llama-cpp`.

Algunos puntos finales de incrustación compatibles con OpenAI requieren etiquetas asimétricas como `input_type: "query"` para búsquedas y `input_type: "document"` o `"passage"` para fragmentos indexados. Configure esos con `memorySearch.queryInputType` y `memorySearch.documentInputType`; consulte la [referencia de configuración de memoria](/es/reference/memory-config#provider-specific-config).

## Proveedores compatibles

| Proveedor      | ID               | Requiere clave API | Notas                                                                         |
| -------------- | ---------------- | ------------------ | ----------------------------------------------------------------------------- |
| Bedrock        | `bedrock`        | No                 | Detectado automáticamente cuando se resuelve la cadena de credenciales de AWS |
| Gemini         | `gemini`         | Sí                 | Admite la indexación de imágenes/audio                                        |
| GitHub Copilot | `github-copilot` | No                 | Detectado automáticamente, usa la suscripción Copilot                         |
| Local          | `local`          | No                 | Modelo GGUF, descarga de ~0.6 GB                                              |
| Mistral        | `mistral`        | Sí                 | Detectado automáticamente                                                     |
| Ollama         | `ollama`         | No                 | Local, debe establecerse explícitamente                                       |
| OpenAI         | `openai`         | Sí                 | Detectado automáticamente, rápido                                             |
| Voyage         | `voyage`         | Sí                 | Detectado automáticamente                                                     |

## Cómo funciona la búsqueda

OpenClaw ejecuta dos rutas de recuperación en paralelo y fusiona los resultados:

```mermaid
flowchart LR
    Q["Query"] --> E["Embedding"]
    Q --> T["Tokenize"]
    E --> VS["Vector Search"]
    T --> BM["BM25 Search"]
    VS --> M["Weighted Merge"]
    BM --> M
    M --> R["Top Results"]
```

- **Búsqueda vectorial** encuentra notas con un significado similar ("host de puerta de enlace" coincide con "la máquina que ejecuta OpenClaw").
- **Búsqueda de palabras clave BM25** encuentra coincidencias exactas (ID, cadenas de error, claves de configuración).

Si solo hay una ruta disponible (sin incrustaciones o sin FTS), la otra se ejecuta sola.

Cuando las incrustaciones no están disponibles, OpenClaw aún utiliza la clasificación léxica sobre los resultados de FTS en lugar de recurrir solo al ordenamiento de coincidencia exacta sin procesar. Ese modo degradado impulsa los fragmentos con una mayor cobertura de términos de consulta y rutas de archivo relevantes, lo que mantiene la recuperación útil incluso sin `sqlite-vec` o un proveedor de incrustación.

## Mejorar la calidad de búsqueda

Dos funciones opcionales ayudan cuando tienes un historial de notas grande:

### Decaimiento temporal

Las notas antiguas pierden gradualmente peso en la clasificación para que la información reciente aparezca primero.
Con la vida media predeterminada de 30 días, una nota del mes pasado puntúa al 50% de
su peso original. Los archivos perennes como `MEMORY.md` nunca decaen.

<Tip>Activa el decaimiento temporal si tu agente tiene meses de notas diarias y la información obsoleta sigue superando en clasificación al contexto reciente.</Tip>

### MMR (diversidad)

Reduce los resultados redundantes. Si cinco notas mencionan la misma configuración de enrutador, MMR
asegura que los principales resultados cubran diferentes temas en lugar de repetirse.

<Tip>Activa MMR si `memory_search` sigue devolviendo fragmentos casi duplicados de diferentes notas diarias.</Tip>

### Activar ambos

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            mmr: { enabled: true },
            temporalDecay: { enabled: true },
          },
        },
      },
    },
  },
}
```

## Memoria multimodal

Con Gemini Embedding 2, puedes indexar imágenes y archivos de audio junto con
Markdown. Las consultas de búsqueda siguen siendo texto, pero coinciden con contenido visual y de audio.
Consulta la [referencia de configuración de memoria](/es/reference/memory-config) para
la configuración.

## Búsqueda de memoria de sesión

Opcionalmente, puedes indexar transcripciones de sesión para que `memory_search` pueda recordar
conversaciones anteriores. Esto es opcional a través de
`memorySearch.experimental.sessionMemory`. Consulta la
[referencia de configuración](/es/reference/memory-config) para más detalles.

## Solución de problemas

**¿Sin resultados?** Ejecuta `openclaw memory status` para verificar el índice. Si está vacío, ejecuta
`openclaw memory index --force`.

**¿Solo coincidencias de palabras clave?** Es posible que tu proveedor de incrustaciones no esté configurado. Verifica
`openclaw memory status --deep`.

**¿Las incrustaciones locales agotan el tiempo?** `ollama`, `lmstudio` y `local` usan un tiempo de espera
de lote en línea más largo de forma predeterminada. Si el host simplemente es lento, establece
`agents.defaults.memorySearch.sync.embeddingBatchTimeoutSeconds` y vuelve a ejecutar
`openclaw memory index --force`.

**¿No se encuentra texto CJK?** Reconstruye el índice FTS con
`openclaw memory index --force`.

## Lectura adicional

- [Active Memory](/es/concepts/active-memory) -- memoria de subagente para sesiones de chat interactivas
- [Memory](/es/concepts/memory) -- diseño de archivos, backends, herramientas
- [Referencia de configuración de memoria](/es/reference/memory-config) -- todos los controles de configuración

## Relacionado

- [Resumen de memoria](/es/concepts/memory)
- [Memoria activa](/es/concepts/active-memory)
- [Motor de memoria integrado](/es/concepts/memory-builtin)
