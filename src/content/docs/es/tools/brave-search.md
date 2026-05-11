---
summary: "Configuración de la API de Brave Search para web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Búsqueda Brave"
---

# API de Brave Search

OpenClaw admite la API de Brave Search como proveedor de `web_search`.

## Obtener una clave de API

1. Cree una cuenta de API de Brave Search en [https://brave.com/search/api/](https://brave.com/search/api/)
2. En el panel, elija el plan **Search** y genere una clave de API.
3. Guarde la clave en la configuración o establezca `BRAVE_API_KEY` en el entorno de Gateway.

## Ejemplo de configuración

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
            mode: "web", // or "llm-context"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "brave",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

Los ajustes específicos del proveedor para Brave Search ahora se encuentran bajo `plugins.entries.brave.config.webSearch.*`.
La configuración heredada `tools.web.search.apiKey` todavía se carga a través de la capa de compatibilidad, pero ya no es la ruta de configuración canónica.

`webSearch.mode` controla el transporte de Brave:

- `web` (predeterminado): búsqueda web normal de Brave con títulos, URL y fragmentos
- `llm-context`: API de contexto de LLM de Brave con fragmentos de texto pre-extraídos y fuentes para referencia

## Parámetros de la herramienta

<ParamField path="query" type="string" required>
  Consulta de búsqueda.
</ParamField>

<ParamField path="count" type="number" default="5">
  Número de resultados a devolver (1–10).
</ParamField>

<ParamField path="country" type="string">
  Código de país ISO de 2 letras (p. ej., `US`, `DE`).
</ParamField>

<ParamField path="language" type="string">
  Código de idioma ISO 639-1 para los resultados de búsqueda (p. ej., `en`, `de`, `fr`).
</ParamField>

<ParamField path="search_lang" type="string">
  Código de idioma de búsqueda de Brave (p. ej., `en`, `en-gb`, `zh-hans`).
</ParamField>

<ParamField path="ui_lang" type="string">
  Código de idioma ISO para elementos de la interfaz de usuario.
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  Filtro de tiempo — `day` son 24 horas.
</ParamField>

<ParamField path="date_after" type="string">
  Solo resultados publicados después de esta fecha (`YYYY-MM-DD`).
</ParamField>

<ParamField path="date_before" type="string">
  Solo resultados publicados antes de esta fecha (`YYYY-MM-DD`).
</ParamField>

**Ejemplos:**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});
```

## Notas

- OpenClaw utiliza el plan Brave **Search**. Si tienes una suscripción heredada (por ejemplo, el plan Free original con 2.000 consultas/mes), sigue siendo válida pero no incluye características más recientes como LLM Context o límites de tasa más altos.
- Cada plan Brave incluye **\$5/mes en crédito gratuito** (renovable). El plan Search cuesta \$5 por cada 1.000 solicitudes, por lo que el crédito cubre 1.000 consultas/mes. Establece tu límite de uso en el panel de Brave para evitar cargos inesperados. Consulta el [portal de la API de Brave](https://brave.com/search/api/) para conocer los planes actuales.
- El plan Search incluye el punto de conexión LLM Context y derechos de inferencia de IA. Almacenar resultados para entrenar o ajustar modelos requiere un plan con derechos de almacenamiento explícitos. Consulta los [Términos de servicio](https://api-dashboard.search.brave.com/terms-of-service) de Brave.
- El modo `llm-context` devuelve entradas de fuente fundamentadas en lugar de la forma normal del fragmento de búsqueda web.
- El modo `llm-context` no admite `ui_lang`, `freshness`, `date_after` o `date_before`.
- `ui_lang` debe incluir una subetiqueta de región como `en-US`.
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable a través de `cacheTtlMinutes`).

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Búsqueda Perplexity](/es/tools/perplexity-search) -- resultados estructurados con filtrado de dominio
- [Búsqueda Exa](/es/tools/exa-search) -- búsqueda neuronal con extracción de contenido
