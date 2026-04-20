---
title: "Búsqueda de memoria"
summary: "Cómo la búsqueda de memoria encuentra notas relevantes utilizando incrustaciones e recuperación híbrida"
read_when:
  - You want to understand how memory_search works
  - You want to choose an embedding provider
  - You want to tune search quality
---

# Búsqueda de memoria

`memory_search` encuentra notas relevantes en tus archivos de memoria, incluso cuando la redacción difiere del texto original. Funciona indexando la memoria en pequeños fragmentos y buscándolos mediante incrustaciones, palabras clave o ambos.

## Inicio rápido

Si tiene una suscripción a GitHub Copilot, una clave de API de OpenAI, Gemini, Voyage o Mistral configurada, la búsqueda de memoria funciona automáticamente. Para establecer un proveedor explícitamente:

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

Para incrustaciones locales sin clave de API, usa `provider: "local"` (requiere node-llama-cpp).

## Proveedores compatibles

| Proveedor      | ID               | Necesita clave de API | Notas                                                                         |
| -------------- | ---------------- | --------------------- | ----------------------------------------------------------------------------- |
| Bedrock        | `bedrock`        | No                    | Detectado automáticamente cuando se resuelve la cadena de credenciales de AWS |
| Gemini         | `gemini`         | Sí                    | Admite la indexación de imágenes/audio                                        |
| GitHub Copilot | `github-copilot` | No                    | Detectado automáticamente, usa la suscripción a Copilot                       |
| Local          | `local`          | No                    | Modelo GGUF, descarga de ~0.6 GB                                              |
| Mistral        | `mistral`        | Sí                    | Detectado automáticamente                                                     |
| Ollama         | `ollama`         | No                    | Local, debe configurarse explícitamente                                       |
| OpenAI         | `openai`         | Sí                    | Detectado automáticamente, rápido                                             |
| Voyage         | `voyage`         | Sí                    | Detectado automáticamente                                                     |

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

- **Búsqueda vectorial** encuentra notas con significado similar ("gateway host" coincide con
  "la máquina que ejecuta OpenClaw").
- **Búsqueda de palabras clave BM25** encuentra coincidencias exactas (ID, cadenas de error, claves
  de configuración).

Si solo hay una ruta disponible (sin incrustaciones o sin FTS), la otra se ejecuta sola.

Cuando las incrustaciones no están disponibles, OpenClaw aún utiliza el ordenamiento léxico sobre los resultados de FTS en lugar de recurrir solo al ordenamiento de coincidencia exacta sin procesar. Ese modo degradado potencia los fragmentos con una mayor cobertura de términos de consulta y rutas de archivo relevantes, lo que mantiene la recuperación útil incluso sin `sqlite-vec` o un proveedor de incrustaciones.

## Mejorar la calidad de la búsqueda

Dos funciones opcionales ayudan cuando tienes un historial de notas grande:

### Decaimiento temporal

Las notas antiguas pierden gradualmente peso en la clasificación para que la información reciente aparezca primero.
Con la vida media predeterminada de 30 días, una nota del mes pasado puntúa al 50% de
su peso original. Los archivos perennes como `MEMORY.md` nunca se decaen.

<Tip>Active el decaimiento temporal si su agente tiene meses de notas diarias y la información obsoleta sigue superando en clasificación al contexto reciente.</Tip>

### MMR (diversidad)

Reduce los resultados redundantes. Si cinco notas mencionan la misma configuración de enrutador, MMR
asegura que los resultados principales cubran diferentes temas en lugar de repetirse.

<Tip>Active MMR si `memory_search` sigue devolviendo fragmentos casi duplicados de diferentes notas diarias.</Tip>

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
Markdown. Las consultas de búsqueda siguen siendo texto, pero coinciden con el contenido visual y de audio. Consulta la [referencia de configuración de memoria](/es/reference/memory-config) para
la configuración.

## Búsqueda en la memoria de la sesión

Opcionalmente, puedes indexar las transcripciones de las sesiones para que `memory_search` pueda recordar
conversaciones anteriores. Esto es opcional a través de
`memorySearch.experimental.sessionMemory`. Consulta la
[referencia de configuración](/es/reference/memory-config) para obtener más detalles.

## Solución de problemas

**¿Sin resultados?** Ejecuta `openclaw memory status` para verificar el índice. Si está vacío, ejecuta
`openclaw memory index --force`.

**¿Solo coincidencias de palabras clave?** Es posible que tu proveedor de incrustaciones no esté configurado. Verifica
`openclaw memory status --deep`.

**¿Texto CJK no encontrado?** Reconstruye el índice FTS con
`openclaw memory index --force`.

## Lecturas adicionales

- [Memoria activa](/es/concepts/active-memory) -- memoria de subagente para sesiones de chat interactivas
- [Memoria](/es/concepts/memory) -- diseño de archivos, backends, herramientas
- [Referencia de configuración de memoria](/es/reference/memory-config) -- todos los controles de configuración
