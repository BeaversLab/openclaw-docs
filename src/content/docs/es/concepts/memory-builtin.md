---
summary: "El backend de memoria predeterminado basado en SQLite con búsqueda de palabras clave, vectorial e híbrida"
title: "Motor de memoria incorporado"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

El motor incorporado es el backend de memoria predeterminado. Almacena su índice de memoria en
una base de datos SQLite por agente y no necesita dependencias adicionales para comenzar.

## Lo que ofrece

- **Búsqueda de palabras clave** a través de indexación de texto completo FTS5 (puntuación BM25).
- **Búsqueda vectorial** a través de incrustaciones de cualquier proveedor compatible.
- **Búsqueda híbrida** que combina ambas para obtener los mejores resultados.
- **Soporte CJK** a través de tokenización de trigramas para chino, japonés y coreano.
- **Aceleración sqlite-vec** para consultas vectoriales dentro de la base de datos (opcional).

## Para empezar

Si tienes una clave de API para OpenAI, Gemini, Voyage, Mistral o DeepInfra, el motor integrado la detecta automáticamente y habilita la búsqueda vectorial. No se necesita configuración.

Para establecer un proveedor explícitamente:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
      },
    },
  },
}
```

Sin un proveedor de incrustaciones, solo está disponible la búsqueda de palabras clave.

Para forzar el proveedor de incrustaciones local incorporado, instale el paquete
de tiempo de ejecución opcional `node-llama-cpp` junto a OpenClaw, luego señale `local.modelPath`
a un archivo GGUF:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local",
        fallback: "none",
        local: {
          modelPath: "~/.node-llama-cpp/models/embeddinggemma-300m-qat-Q8_0.gguf",
        },
      },
    },
  },
}
```

## Proveedores de incrustaciones compatibles

| Proveedor | ID          | Detectado automáticamente | Notas                                         |
| --------- | ----------- | ------------------------- | --------------------------------------------- |
| OpenAI    | `openai`    | Sí                        | Predeterminado: `text-embedding-3-small`      |
| Gemini    | `gemini`    | Sí                        | Admite multimodal (imagen + audio)            |
| Voyage    | `voyage`    | Sí                        |                                               |
| Mistral   | `mistral`   | Sí                        |                                               |
| DeepInfra | `deepinfra` | Sí                        | Predeterminado: `BAAI/bge-m3`                 |
| Ollama    | `ollama`    | No                        | Local, establecer explícitamente              |
| Local     | `local`     | Sí (primero)              | Tiempo de ejecución `node-llama-cpp` opcional |

La detección automática elige el primer proveedor cuya clave de API se pueda resolver, en el orden que se muestra. Establezca `memorySearch.provider` para anularlo.

## Cómo funciona la indexación

OpenClaw indexa `MEMORY.md` y `memory/*.md` en fragmentos (~400 tokens con una superposición de 80 tokens) y los almacena en una base de datos SQLite por agente.

- **Ubicación del índice:** `~/.openclaw/memory/<agentId>.sqlite`
- **Mantenimiento del almacenamiento:** los archivos auxiliares WAL de SQLite están limitados con puntos de control periódicos y de cierre.
- **Vigilancia de archivos:** los cambios en los archivos de memoria activan un reindexado con rebote (1,5s).
- **Reindexado automático:** cuando cambia el proveedor de incrustaciones, el modelo o la configuración de fragmentación, todo el índice se reconstruye automáticamente.
- **Reindexado bajo demanda:** `openclaw memory index --force`

<Info>También puedes indexar archivos Markdown fuera del espacio de trabajo con `memorySearch.extraPaths`. Consulta la [referencia de configuración](/es/reference/memory-config#additional-memory-paths).</Info>

## Cuándo usar

El motor integrado es la elección correcta para la mayoría de los usuarios:

- Funciona de inmediato sin dependencias adicionales.
- Maneja bien la búsqueda de palabras clave y vectorial.
- Admite todos los proveedores de incrustaciones.
- La búsqueda híbrida combina lo mejor de ambos enfoques de recuperación.

Considere cambiar a [QMD](/es/concepts/memory-qmd) si necesita reranking, expansión de consultas o desea indexar directorios fuera del espacio de trabajo.

Considere [Honcho](/es/concepts/memory-honcho) si desea memoria entre sesiones con modelado de usuario automático.

## Solución de problemas

**¿Búsqueda de memoria deshabilitada?** Verifique `openclaw memory status`. Si no se detecta ningún proveedor, configure uno explícitamente o agregue una clave de API.

**¿No se detectó el proveedor local?** Confirme que la ruta local exista y ejecute:

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

Tanto los comandos CLI independientes como el Gateway usan el mismo id de proveedor `local`.
Si el proveedor está configurado en `auto`, las incrustaciones locales se consideran primero solo cuando `memorySearch.local.modelPath` apunta a un archivo local existente.

**¿Resultados obsoletos?** Ejecute `openclaw memory index --force` para reconstruir. El observador puede perder cambios en casos extremos poco frecuentes.

**¿sqlite-vec no se carga?** OpenClaw vuelve automáticamente a la similitud de coseno en proceso. `openclaw memory status --deep` informa el almacén de vectores local por separado del proveedor de incrustaciones, por lo que `Vector store: unavailable` apunta a la carga de sqlite-vec mientras que `Embeddings: unavailable` apunta al proveedor/autenticación o la preparación del modelo. Consulte los registros para ver el error de carga específico.

## Configuración

Para la configuración del proveedor de incrustaciones, el ajuste de búsqueda híbrida (ponderaciones, MMR, decaimiento temporal), indexación por lotes, memoria multimodal, sqlite-vec, rutas adicionales y todos los demás controles de configuración, consulte la [referencia de configuración de memoria](/es/reference/memory-config).

## Relacionado

- [Resumen de memoria](/es/concepts/memory)
- [Búsqueda de memoria](/es/concepts/memory-search)
- [Memoria activa](/es/concepts/active-memory)
