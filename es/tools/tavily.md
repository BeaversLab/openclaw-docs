---
summary: "Herramientas de búsqueda y extracción de Tavily"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

# Tavily

OpenClaw puede utilizar **Tavily** de dos maneras:

- como proveedor `web_search`
- como herramientas de complemento explícitas: `tavily_search` y `tavily_extract`

Tavily es una API de búsqueda diseñada para aplicaciones de IA, que devuelve resultados estructurados
optimizados para el consumo de LLM. Admite una profundidad de búsqueda configurable, filtrado de
temas, filtros de dominio, resúmenes de respuestas generados por IA y extracción de contenido
de URL (incluidas las páginas renderizadas con JavaScript).

## Obtener una clave de API

1. Cree una cuenta de Tavily en [tavily.com](https://tavily.com/).
2. Genere una clave de API en el panel de control.
3. Almacénela en la configuración o establezca `TAVILY_API_KEY` en el entorno de la pasarela.

## Configurar la búsqueda de Tavily

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

Notas:

- Elegir Tavily en la incorporación o en `openclaw configure --section web` habilita
  automáticamente el complemento Tavily incluido.
- Almacene la configuración de Tavily en `plugins.entries.tavily.config.webSearch.*`.
- `web_search` con Tavily admite `query` y `count` (hasta 20 resultados).
- Para controles específicos de Tavily como `search_depth`, `topic`, `include_answer`,
  o filtros de dominio, use `tavily_search`.

## Herramientas del complemento Tavily

### `tavily_search`

Use esto cuando quiera controles de búsqueda específicos de Tavily en lugar de
`web_search` genéricos.

| Parámetro         | Descripción                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| `query`           | Cadena de consulta de búsqueda (mantenerse por debajo de 400 caracteres)         |
| `search_depth`    | `basic` (predeterminado, equilibrado) o `advanced` (mayor relevancia, más lento) |
| `topic`           | `general` (predeterminado), `news` (actualizaciones en tiempo real) o `finance`  |
| `max_results`     | Número de resultados, 1-20 (predeterminado: 5)                                   |
| `include_answer`  | Incluir un resumen de respuesta generado por IA (predeterminado: false)          |
| `time_range`      | Filtrar por recencia: `day`, `week`, `month` o `year`                            |
| `include_domains` | Matriz de dominios para restringir los resultados                                |
| `exclude_domains` | Matriz de dominios para excluir de los resultados                                |

**Profundidad de búsqueda:**

| Profundidad | Velocidad  | Relevancia  | Mejor para                                      |
| ----------- | ---------- | ----------- | ----------------------------------------------- |
| `basic`     | Más rápido | Alto        | Consultas de propósito general (predeterminado) |
| `advanced`  | Más lento  | El más alto | Precisión, hechos específicos, investigación    |

### `tavily_extract`

Úsalo para extraer contenido limpio de una o más URL. Maneja
páginas renderizadas con JavaScript y admite la división enfocada en consultas para una
extracción dirigida.

| Parámetro           | Descripción                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `urls`              | Matriz de URL para extraer (1-20 por solicitud)                             |
| `query`             | Volver a ordenar los fragmentos extraídos por relevancia para esta consulta |
| `extract_depth`     | `basic` (predeterminado, rápido) o `advanced` (para páginas con mucho JS)   |
| `chunks_per_source` | Fragmentos por URL, 1-5 (requiere `query`)                                  |
| `include_images`    | Incluir URL de imagen en los resultados (predeterminado: falso)             |

**Profundidad de extracción:**

| Profundidad | Cuándo usar                                          |
| ----------- | ---------------------------------------------------- |
| `basic`     | Páginas simples: prueba esto primero                 |
| `advanced`  | SPAs renderizadas con JS, contenido dinámico, tablas |

Consejos:

- Máximo de 20 URL por solicitud. Agrupa listas más grandes en múltiples llamadas.
- Usa `query` + `chunks_per_source` para obtener solo el contenido relevante en lugar de páginas completas.
- Intenta primero con `basic`; usa `advanced` si falta contenido o está incompleto.

## Elegir la herramienta adecuada

| Necesidad                                        | Herramienta      |
| ------------------------------------------------ | ---------------- |
| Búsqueda web rápida, sin opciones especiales     | `web_search`     |
| Búsqueda con profundidad, tema, respuestas de IA | `tavily_search`  |
| Extraer contenido de URL específicas             | `tavily_extract` |

Consulta [Herramientas web](/es/tools/web) para la configuración completa de herramientas web y la comparación de proveedores.

import es from "/components/footer/es.mdx";

<es />
