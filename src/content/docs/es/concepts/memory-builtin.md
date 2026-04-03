---
title: "Motor de memoria integrado"
summary: "El backend de memoria predeterminado basado en SQLite con búsqueda de palabras clave, vectorial e híbrida"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

# Motor de memoria integrado

El motor integrado es el backend de memoria predeterminado. Almacena su índice de memoria en
una base de datos SQLite por agente y no necesita dependencias adicionales para comenzar.

## Lo que proporciona

- **Búsqueda de palabras clave** mediante indización de texto completo FTS5 (puntuación BM25).
- **Búsqueda vectorial** mediante incrustaciones de cualquier proveedor compatible.
- **Búsqueda híbrida** que combina ambas para obtener los mejores resultados.
- **Soporte CJK** mediante tokenización de trigramas para chino, japonés y coreano.
- **Aceleración sqlite-vec** para consultas vectoriales dentro de la base de datos (opcional).

## Para empezar

Si tiene una clave API para OpenAI, Gemini, Voyage o Mistral, el motor
integrado la detecta automáticamente y habilita la búsqueda vectorial. No se necesita configuración.

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

## Proveedores de incrustaciones compatibles

| Proveedor | ID        | Detectado automáticamente | Notas                                    |
| --------- | --------- | ------------------------- | ---------------------------------------- |
| OpenAI    | `openai`  | Sí                        | Predeterminado: `text-embedding-3-small` |
| Gemini    | `gemini`  | Sí                        | Admite multimodal (imagen + audio)       |
| Voyage    | `voyage`  | Sí                        |                                          |
| Mistral   | `mistral` | Sí                        |                                          |
| Ollama    | `ollama`  | No                        | Local, establecer explícitamente         |
| Local     | `local`   | Sí (primero)              | Modelo GGUF, descarga de ~0.6 GB         |

La detección automática elige el primer proveedor cuya clave API se puede resolver, en el
orden mostrado. Establezca `memorySearch.provider` para anular.

## Cómo funciona la indización

OpenClaw indexa `MEMORY.md` y `memory/*.md` en fragmentos (~400 tokens con
solapamiento de 80 tokens) y los almacena en una base de datos SQLite por agente.

- **Ubicación del índice:** `~/.openclaw/memory/<agentId>.sqlite`
- **Monitoreo de archivos:** los cambios en los archivos de memoria activan un reindexado con rebote (1.5 s).
- **Reindexado automático:** cuando cambia el proveedor de incrustaciones, el modelo o la configuración de fragmentación,
  se reconstruye automáticamente todo el índice.
- **Reindexar bajo demanda:** `openclaw memory index --force`

<Info>También puedes indexar archivos Markdown fuera del espacio de trabajo con `memorySearch.extraPaths`. Consulta la [referencia de configuración](/en/reference/memory-config#additional-memory-paths).</Info>

## Cuándo usar

El motor integrado es la elección correcta para la mayoría de los usuarios:

- Funciona de inmediato sin dependencias adicionales.
- Maneja bien la búsqueda de palabras clave y vectorial.
- Admite a todos los proveedores de incrustaciones (embeddings).
- La búsqueda híbrida combina lo mejor de ambos enfoques de recuperación.

Considere cambiar a [QMD](/en/concepts/memory-qmd) si necesita reranking, expansión de consultas o desea indexar directorios fuera del espacio de trabajo.

Considere [Honcho](/en/concepts/memory-honcho) si desea memoria entre sesiones con
modelado de usuario automático.

## Solución de problemas

**¿Búsqueda de memoria deshabilitada?** Verifique `openclaw memory status`. Si no se detecta ningún proveedor, configure uno explícitamente o agregue una clave de API.

**¿Resultados obsoletos?** Ejecute `openclaw memory index --force` para reconstruir. El observador
puede perder cambios en casos excepcionales.

**¿No se carga sqlite-vec?** OpenClaw vuelve automáticamente a la similitud coseno en proceso. Comprueba los registros para ver el error de carga específico.

## Configuración

Para la configuración del proveedor de incrustaciones, la ajuste de la búsqueda híbrida (ponderaciones, MMR, decaimiento
temporal), indexación por lotes, memoria multimodal, sqlite-vec, rutas adicionales y todos
los demás ajustes de configuración, consulte la
[referencia de configuración de memoria](/en/reference/memory-config).
