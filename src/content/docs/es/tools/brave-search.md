---
summary: "Configuración de la API de Brave Search para web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Búsqueda Brave"
---

OpenClaw es compatible con la API de Brave Search como un proveedor `web_search`.

## Obtener una clave de API

1. Cree una cuenta de la API de Brave Search en [https://brave.com/search/api/](https://brave.com/search/api/)
2. En el panel de control, elija el plan **Search** y genere una clave de API.
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
            baseUrl: "https://api.search.brave.com", // optional proxy/base URL override
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

La configuración específica de Brave del proveedor ahora se encuentra en `plugins.entries.brave.config.webSearch.*`.
El formato heredado `tools.web.search.apiKey` aún se carga a través de la capa de compatibilidad, pero ya no es la ruta de configuración canónica.

`webSearch.mode` controla el transporte de Brave:

- `web` (predeterminado): búsqueda web normal de Brave con títulos, URL y fragmentos
- `llm-context`: API de contexto de LLM de Brave con fragmentos de texto pre-extraídos y fuentes para la fundamentación

`webSearch.baseUrl` puede dirigir las solicitudes de Brave a un proxy o puerta de enlace compatible de confianza.
OpenClaw añade `/res/v1/web/search` o `/res/v1/llm/context` a
la URL base configurada y mantiene la URL base en la clave de caché. Los
puntos finales públicos deben usar `https://`; `http://` se acepta solo para hosts de
proxy de bucle invertido de confianza o de red privada.

## Parámetros de la herramienta

<ParamField path="query" type="string" required>
  Consulta de búsqueda.
</ParamField>

<ParamField path="count" type="number" default="5">
  Número de resultados a devolver (1–10).
</ParamField>

<ParamField path="country" type="string">
  Código de país ISO de 2 letras (por ejemplo, `US`, `DE`).
</ParamField>

<ParamField path="language" type="string">
  Código de idioma ISO 639-1 para los resultados de búsqueda (por ejemplo, `en`, `de`, `fr`).
</ParamField>

<ParamField path="search_lang" type="string">
  Código de idioma de búsqueda de Brave (por ejemplo, `en`, `en-gb`, `zh-hans`).
</ParamField>

<ParamField path="ui_lang" type="string">
  Código de idioma ISO para elementos de la interfaz de usuario.
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  Filtro de tiempo: `day` es de 24 horas.
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
- Cada plan de Brave incluye **$5/mes en crédito gratuito** (renovable). El plan de Search cuesta $5 por 1,000 solicitudes, por lo que el crédito cubre 1,000 consultas/mes. Establezca su límite de uso en el panel de Brave para evitar cargos inesperados. Consulte el [portal de la API de Brave](https://brave.com/search/api/) para conocer los planes actuales.
- El plan de Search incluye el endpoint de LLM Context y derechos de inferencia de IA. Almacenar resultados para entrenar o ajustar modelos requiere un plan con derechos de almacenamiento explícitos. Consulte los [Términos de servicio de Brave](https://api-dashboard.search.brave.com/terms-of-service).
- El modo `llm-context` devuelve entradas de fuentes fundamentadas en lugar de la forma normal del fragmento de búsqueda web.
- El modo `llm-context` admite `freshness` y rangos limitados de `date_after` + `date_before`. No admite `ui_lang`; `date_before` sin `date_after` se rechaza porque Brave requiere que los rangos de frescura personalizados incluyan las fechas de inicio y finalización.
- `ui_lang` debe incluir una subetiqueta de región como `en-US`.
- Los resultados se almacenan en caché durante 15 minutos de forma predeterminada (configurable mediante `cacheTtlMinutes`).
- Los valores `webSearch.baseUrl` personalizados se incluyen en la identidad de caché de Brave, por lo que las respuestas específicas del proxy no colisionan.
- Active la marca de diagnóstico `brave.http` para registrar las URL/parámetros de consulta de solicitud de Brave, el estado/cronometraje de respuesta y los eventos de aciertos/fallos/escritura de caché de búsqueda durante la solución de problemas. La marca nunca registra la clave de API ni los cuerpos de respuesta, pero las consultas de búsqueda pueden ser confidenciales.

## Relacionado

- [Descripción general de la búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Búsqueda de Perplexity](/es/tools/perplexity-search) -- resultados estructurados con filtrado de dominio
- [Búsqueda de Exa](/es/tools/exa-search) -- búsqueda neuronal con extracción de contenido
