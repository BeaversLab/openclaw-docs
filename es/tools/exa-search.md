---
summary: "Búsqueda de Exa AI -- búsqueda neuronal y de palabras clave con extracción de contenido"
read_when:
  - You want to use Exa for web_search
  - You need an EXA_API_KEY
  - You want neural search or content extraction
title: "Búsqueda de Exa"
---

# Búsqueda de Exa

OpenClaw admite [Exa AI](https://exa.ai/) como proveedor `web_search`. Exa
ofrece modos de búsqueda neuronal, de palabras clave e híbrida con extracción de contenido
integrada (resaltados, texto, resúmenes).

## Obtener una clave de API

<Steps>
  <Step title="Crear una cuenta">
    Regístrese en [exa.ai](https://exa.ai/) y genere una clave de API desde su
    panel de control.
  </Step>
  <Step title="Guardar la clave">
    Establezca `EXA_API_KEY` en el entorno de Gateway, o configure a través de:

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## Configuración

```json5
{
  plugins: {
    entries: {
      exa: {
        config: {
          webSearch: {
            apiKey: "exa-...", // optional if EXA_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "exa",
      },
    },
  },
}
```

**Alternativa de entorno:** establezca `EXA_API_KEY` en el entorno de Gateway.
Para una instalación de gateway, póngalo en `~/.openclaw/.env`.

## Parámetros de la herramienta

| Parámetro     | Descripción                                                                      |
| ------------- | -------------------------------------------------------------------------------- |
| `query`       | Consulta de búsqueda (requerido)                                                 |
| `count`       | Resultados a devolver (1-100)                                                    |
| `type`        | Modo de búsqueda: `auto`, `neural`, `fast`, `deep`, `deep-reasoning` o `instant` |
| `freshness`   | Filtro de tiempo: `day`, `week`, `month` o `year`                                |
| `date_after`  | Resultados después de esta fecha (AAAA-MM-DD)                                    |
| `date_before` | Resultados antes de esta fecha (AAAA-MM-DD)                                      |
| `contents`    | Opciones de extracción de contenido (ver abajo)                                  |

### Extracción de contenido

Exa puede devolver contenido extraído junto con los resultados de búsqueda. Pase un objeto `contents`
para habilitar:

```javascript
await web_search({
  query: "transformer architecture explained",
  type: "neural",
  contents: {
    text: true, // full page text
    highlights: { numSentences: 3 }, // key sentences
    summary: true, // AI summary
  },
});
```

| Opción de contenidos | Tipo                                                                  | Descripción                            |
| -------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| `text`               | `boolean \| { maxCharacters }`                                        | Extraer el texto completo de la página |
| `highlights`         | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | Extraer frases clave                   |
| `summary`            | `boolean \| { query }`                                                | Resumen generado por IA                |

### Modos de búsqueda

| Modo             | Descripción                              |
| ---------------- | ---------------------------------------- |
| `auto`           | Exa elige el mejor modo (predeterminado) |
| `neural`         | Búsqueda semántica/basada en significado |
| `fast`           | Búsqueda rápida de palabras clave        |
| `deep`           | Búsqueda profunda exhaustiva             |
| `deep-reasoning` | Búsqueda profunda con razonamiento       |
| `instant`        | Resultados más rápidos                   |

## Notas

- Si no se proporciona ninguna opción `contents`, Exa usa por defecto `{ highlights: true }`
  para que los resultados incluyan extractos de frases clave
- Los resultados conservan los campos `highlightScores` y `summary` de la respuesta de la API de Exa
  cuando están disponibles
- Las descripciones de los resultados se resuelven primero a partir de los resaltados, luego del resumen y luego
  del texto completo — lo que esté disponible
- `freshness` y `date_after`/`date_before` no se pueden combinar: use un
  modo de filtro de tiempo
- Se pueden devolver hasta 100 resultados por consulta (sujeto a los límites del
  tipo de búsqueda de Exa)
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable mediante
  `cacheTtlMinutes`)
- Exa es una integración oficial de la API con respuestas JSON estructuradas

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Brave Search](/es/tools/brave-search) -- resultados estructurados con filtros de país/idioma
- [Perplexity Search](/es/tools/perplexity-search) -- resultados estructurados con filtrado de dominio

import es from "/components/footer/es.mdx";

<es />
