---
summary: "Herramientas de búsqueda y extracción de Tavily"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

[Tavily](https://tavily.com) es una API de búsqueda diseñada para aplicaciones de IA. OpenClaw la expone de dos maneras:

- como el proveedor `web_search` para la herramienta de búsqueda genérica
- como herramientas de complemento explícitas: `tavily_search` y `tavily_extract`

Tavily devuelve resultados estructurados optimizados para el consumo de LLM con profundidad de búsqueda configurable, filtrado de temas, filtros de dominio, resúmenes de respuestas generados por IA y extracción de contenido de URL (incluidas las páginas renderizadas con JavaScript).

| Propiedad              | Valor                                     |
| ---------------------- | ----------------------------------------- |
| ID del complemento     | `tavily`                                  |
| Autenticación          | `TAVILY_API_KEY` o configuración `apiKey` |
| URL base               | `https://api.tavily.com` (predeterminado) |
| Herramientas incluidas | `tavily_search`, `tavily_extract`         |

## Para comenzar

<Steps>
  <Step title="Obtén una clave de API">
    Crea una cuenta de Tavily en [tavily.com](https://tavily.com), luego genera una clave de API en el panel de control.
  </Step>
  <Step title="Configura el complemento y el proveedor">
    ```json5
    {
      plugins: {
        entries: {
          tavily: {
            enabled: true,
            config: {
              webSearch: {
                apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
                baseUrl: "https://api.tavily.com",
              },
            },
          },
        },
      },
      tools: {
        web: {
          search: {
            provider: "tavily",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Verifica las ejecuciones de búsqueda">
    Activa un `web_search` desde cualquier agente, o llama a `tavily_search` directamente.
  </Step>
</Steps>

<Tip>Elegir Tavily en la incorporación o en `openclaw configure --section web` habilita automáticamente el complemento Tavily incluido.</Tip>

## Referencia de herramientas

### `tavily_search`

Úsalo cuando quieras controles de búsqueda específicos de Tavily en lugar de `web_search` genérico.

| Parámetro         | Tipo              | Restricciones / predeterminado                | Descripción                                                              |
| ----------------- | ----------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `query`           | cadena            | requerido                                     | Cadena de consulta de búsqueda. Manténgala por debajo de 400 caracteres. |
| `search_depth`    | enumeración       | `basic` (predeterminado), `advanced`          | `advanced` es más lento pero con mayor relevancia.                       |
| `topic`           | enumeración       | `general` (predeterminado), `news`, `finance` | Filtrar por familia de temas.                                            |
| `max_results`     | entero            | 1-20                                          | Número de resultados.                                                    |
| `include_answer`  | booleano          | por defecto `false`                           | Incluir un resumen de respuesta generado por IA de Tavily.               |
| `time_range`      | enum              | `day`, `week`, `month`, `year`                | Filtrar resultados por actualidad.                                       |
| `include_domains` | matriz de cadenas | (ninguno)                                     | Incluir solo resultados de estos dominios.                               |
| `exclude_domains` | matriz de cadenas | (ninguno)                                     | Excluir resultados de estos dominios.                                    |

Compensación de profundidad de búsqueda:

| Profundidad | Velocidad  | Relevancia  | Mejor para                                          |
| ----------- | ---------- | ----------- | --------------------------------------------------- |
| `basic`     | Más rápido | Alta        | Consultas de propósito general (por defecto).       |
| `advanced`  | Más lento  | La más alta | Investigación de precisión y verificación de datos. |

### `tavily_extract`

Úselo para extraer contenido limpio de una o más URL. Maneja páginas renderizadas con JavaScript y admite la fragmentación centrada en consultas para una extracción específica.

| Parámetro           | Tipo              | Restricciones / por defecto       | Descripción                                                                  |
| ------------------- | ----------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| `urls`              | matriz de cadenas | requerido, 1-20                   | URL de las que extraer contenido.                                            |
| `query`             | cadena            | (opcional)                        | Volver a ordenar los fragmentos extraídos por relevancia para esta consulta. |
| `extract_depth`     | enum              | `basic` (por defecto), `advanced` | Use `advanced` para páginas con mucho JS, SPA o tablas dinámicas.            |
| `chunks_per_source` | entero            | 1-5; **requiere `query`**         | Fragmentos devueltos por URL. Da error si se establece sin `query`.          |
| `include_images`    | booleano          | por defecto `false`               | Incluir URL de imágenes en los resultados.                                   |

Compensación de profundidad de extracción:

| Profundidad | Cuándo usar                                          |
| ----------- | ---------------------------------------------------- |
| `basic`     | Páginas simples. Pruebe esto primero.                |
| `advanced`  | SPA renderizadas con JS, contenido dinámico, tablas. |

<Tip>Agrupe listas de URL más grandes en múltiples llamadas `tavily_extract` (máximo 20 por solicitud). Use `query` más `chunks_per_source` para obtener solo contenido relevante en lugar de páginas completas.</Tip>

## Elegir la herramienta correcta

| Necesidad                                      | Herramienta      |
| ---------------------------------------------- | ---------------- |
| Búsqueda web rápida, sin opciones especiales   | `web_search`     |
| Buscar con profundidad, tema, respuestas de IA | `tavily_search`  |
| Extraer contenido de URL específicas           | `tavily_extract` |

<Note>La herramienta genérica `web_search` con Tavily como proveedor admite `query` y `count` (hasta 20 resultados). Para controles específicos de Tavily (`search_depth`, `topic`, `include_answer`, filtros de dominio, rango de tiempo), utilice `tavily_search` en su lugar.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Orden de resolución de la clave de API">
    El cliente Tavily busca su clave de API en este orden:

    1. `plugins.entries.tavily.config.webSearch.apiKey` (resuelto a través de SecretRefs).
    2. `TAVILY_API_KEY` del entorno de la puerta de enlace.

    `tavily_extract` genera un error de configuración si ninguno está presente.

  </Accordion>

<Accordion title="URL base personalizada">Anule `plugins.entries.tavily.config.webSearch.baseUrl` si gestiona Tavily a través de un proxy. El valor predeterminado es `https://api.tavily.com`.</Accordion>

  <Accordion title="`chunks_per_source` requiere `query`">
    `tavily_extract` rechaza las llamadas que pasan `chunks_per_source` sin un `query`. Tavily clasifica los fragmentos por relevancia de la consulta, por lo que el parámetro no tiene sentido sin uno.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Resumen de búsqueda web" href="/es/tools/web" icon="magnifying-glass">
    Todos los proveedores y reglas de detección automática.
  </Card>
  <Card title="Firecrawl" href="/es/tools/firecrawl" icon="fire">
    Búsqueda más extracción con extracción de contenido.
  </Card>
  <Card title="Búsqueda Exa" href="/es/tools/exa-search" icon="binoculars">
    Búsqueda neuronal con extracción de contenido.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Esquema de configuración completo para entradas de complemento y enrutamiento de herramientas.
  </Card>
</CardGroup>
