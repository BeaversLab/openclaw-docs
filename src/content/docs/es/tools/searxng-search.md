---
summary: "Búsqueda web SearXNG: proveedor de metabusqueda autoalojado y sin clave"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "Búsqueda SearXNG"
---

OpenClaw es compatible con [SearXNG](https://docs.searxng.org/) como proveedor `web_search` **autoalojado y sin clave**. SearXNG es un metabuscador de código abierto que agrega resultados de Google, Bing, DuckDuckGo y otras fuentes.

Ventajas:

- **Gratis e ilimitado** -- no se requiere clave de API ni suscripción comercial
- **Privacidad / aire aislado** -- las consultas nunca salen de su red
- **Funciona en cualquier lugar** -- sin restricciones regionales en las API de búsqueda comercial

## Configuración

<Steps>
  <Step title="Ejecutar una instancia de SearXNG">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    O utilice cualquier despliegue de SearXNG existente al que tenga acceso. Consulte la
    [documentación de SearXNG](https://docs.searxng.org/) para la configuración en producción.

  </Step>
  <Step title="Configurar">
    ```bash
    openclaw configure --section web
    # Select "searxng" as the provider
    ```

    O establezca la variable de entorno y deje que la detección automática la encuentre:

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## Configuración

```json5
{
  tools: {
    web: {
      search: {
        provider: "searxng",
      },
    },
  },
}
```

Configuración a nivel de complemento para la instancia de SearXNG:

```json5
{
  plugins: {
    entries: {
      searxng: {
        config: {
          webSearch: {
            baseUrl: "http://localhost:8888",
            categories: "general,news", // optional
            language: "en", // optional
          },
        },
      },
    },
  },
}
```

El campo `baseUrl` también acepta objetos SecretRef.

Reglas de transporte:

- `https://` funciona para hosts SearXNG públicos o privados
- `http://` solo se acepta para hosts de red privada de confianza o localhost
- los hosts públicos de SearXNG deben usar `https://`
- los hosts privados/internos usan el guardián de red autoalojado; los hosts `https://`
  públicos se mantienen en el guardián de búsqueda web estricto y no pueden redirigir a direcciones
  privadas

## Variable de entorno

Establezca `SEARXNG_BASE_URL` como alternativa a la configuración:

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

Cuando `SEARXNG_BASE_URL` está establecido y no se configura ningún proveedor explícito, la detección automática
elige SearXNG automáticamente (con la prioridad más baja: cualquier proveedor con API que tenga una
clave gana primero).

## Referencia de configuración del complemento

| Campo        | Descripción                                                        |
| ------------ | ------------------------------------------------------------------ |
| `baseUrl`    | URL base de su instancia SearXNG (obligatorio)                     |
| `categories` | Categorías separadas por comas, como `general`, `news` o `science` |
| `language`   | Código de idioma para los resultados, como `en`, `de` o `fr`       |

## Notas

- **API JSON** -- usa el punto final `format=json` nativo de SearXNG, no scraping de HTML
- **URL de resultados de imágenes** -- los resultados de la categoría de imágenes incluyen `img_src` cuando SearXNG
  devuelve una URL de imagen directa
- **Sin clave de API** -- funciona con cualquier instancia de SearXNG directamente
- **Validación de URL base** -- `baseUrl` debe ser una `http://` o `https://`
  válida; los hosts públicos deben usar `https://`
- **Guardián de red** -- los puntos finales SearXNG privados/internos aceptan
  el acceso a red privada; los puntos finales SearXNG `https://` públicos mantienen una protección SSRF
  estricta
- **Orden de detección automática** -- SearXNG se comprueba en último lugar (orden 200) en
  la detección automática. Los proveedores con API y claves configuradas se ejecutan primero, luego
  DuckDuckGo (orden 100), luego Ollama Web Search (orden 110)
- **Autohospedado** -- controlas la instancia, las consultas y los motores de búsqueda ascendentes
- **Categorías** por defecto son `general` cuando no están configuradas
- **Respaldo de categoría** -- si una solicitud de categoría que no sea `general` tiene éxito pero
  devuelve cero resultados, OpenClaw reintenta la misma consulta una vez con `general`
  antes de devolver un conjunto de resultados vacío

<Tip>Para que la API JSON de SearXNG funcione, asegúrate de que tu instancia de SearXNG tenga el formato `json` habilitado en su `settings.yml` bajo `search.formats`.</Tip>

## Relacionado

- [Resumen de Web Search](/es/tools/web) -- todos los proveedores y detección automática
- [DuckDuckGo Search](/es/tools/duckduckgo-search) -- otro respaldo sin clave
- [Brave Search](/es/tools/brave-search) -- resultados estructurados con nivel gratuito
