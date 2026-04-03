---
summary: "Búsqueda web SearXNG: proveedor de metabusqueda autoalojado y sin clave"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "Búsqueda SearXNG"
---

# Búsqueda SearXNG

OpenClaw es compatible con [SearXNG](https://docs.searxng.org/) como proveedor **autoalojado,
sin clave** `web_search`. SearXNG es un metabuscador de código abierto
que agrega resultados de Google, Bing, DuckDuckGo y otras fuentes.

Ventajas:

- **Gratis e ilimitado** -- no se requiere clave de API ni suscripción comercial
- **Privacidad / air-gap** -- las consultas nunca salen de su red
- **Funciona en cualquier lugar** -- sin restricciones regionales en las API de búsqueda comercial

## Configuración

<Steps>
  <Step title="Ejecutar una instancia de SearXNG">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    O utilice cualquier despliegue de SearXNG existente al que tenga acceso. Consulte la
    [documentación de SearXNG](https://docs.searxng.org/) para la configuración de producción.

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

## Config

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

## Variable de entorno

Establezca `SEARXNG_BASE_URL` como alternativa a la configuración:

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

Cuando `SEARXNG_BASE_URL` está establecida y no se configura ningún proveedor explícito, la detección automática
elige SearXNG automáticamente (con la prioridad más baja: cualquier proveedor con soporte de API que tenga
una clave tiene prioridad).

## Referencia de configuración del complemento

| Campo        | Descripción                                                        |
| ------------ | ------------------------------------------------------------------ |
| `baseUrl`    | URL base de su instancia de SearXNG (obligatorio)                  |
| `categories` | Categorías separadas por comas, como `general`, `news` o `science` |
| `language`   | Código de idioma para los resultados, como `en`, `de` o `fr`       |

## Notas

- **API JSON** -- utiliza el punto final `format=json` nativo de SearXNG, no scraping de HTML
- **Sin clave de API** -- funciona con cualquier instancia de SearXNG de inmediato
- **Orden de detección automática** -- SearXNG se comprueba en último lugar (orden 200) en la detección automática, por lo que cualquier proveedor con respaldo de API y con clave tiene prioridad sobre SearXNG, y SearXNG se sitúa detrás de DuckDuckGo (orden 100) también
- **Autohospedado** -- controlas la instancia, las consultas y los motores de búsqueda ascendentes
- **Categories** (Categorías) por defecto son `general` cuando no están configuradas

<Tip>Para que la API JSON de SearXNG funcione, asegúrate de que tu instancia de SearXNG tenga el formato `json` habilitado en su `settings.yml` bajo `search.formats`.</Tip>

## Relacionado

- [Descripción general de Web Search](/en/tools/web) -- todos los proveedores y detección automática
- [DuckDuckGo Search](/en/tools/duckduckgo-search) -- otra alternativa sin clave
- [Brave Search](/en/tools/brave-search) -- resultados estructurados con nivel gratuito
