---
summary: "Búsqueda web SearXNG: proveedor de metabusqueda autoalojado y sin clave"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "Búsqueda SearXNG"
---

# Búsqueda SearXNG

OpenClaw soporta [SearXNG](https://docs.searxng.org/) como proveedor `web_search` **autoalojado,
sin clave**. SearXNG es un metabuscador de código abierto
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

    O utilice cualquier implementación de SearXNG existente a la que tenga acceso. Consulte la
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

Reglas de transporte:

- `https://` funciona para hosts SearXNG públicos o privados
- `http://` solo se acepta para hosts de red privada de confianza o localhost
- los hosts públicos de SearXNG deben usar `https://`

## Variable de entorno

Establezca `SEARXNG_BASE_URL` como alternativa a la configuración:

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

Cuando `SEARXNG_BASE_URL` está establecido y no hay ningún proveedor explícito configurado, la detección automática
elige SearXNG automáticamente (con la prioridad más baja: primero gana cualquier proveedor con API
y clave configurada).

## Referencia de configuración del complemento

| Campo        | Descripción                                                       |
| ------------ | ----------------------------------------------------------------- |
| `baseUrl`    | URL base de su instancia SearXNG (obligatorio)                    |
| `categories` | Categorías separadas por comas como `general`, `news` o `science` |
| `language`   | Código de idioma para los resultados como `en`, `de` o `fr`       |

## Notas

- **API JSON** -- utiliza el punto final `format=json` nativo de SearXNG, no scraping HTML
- **Sin clave API** -- funciona con cualquier instancia SearXNG de inmediato
- **Validación de URL base** -- `baseUrl` debe ser una `http://` o `https://`
  válida; los hosts públicos deben usar `https://`
- **Orden de detección automática** -- SearXNG se verifica al final (orden 200) en
  la detección automática. Los proveedores con API y claves configuradas se ejecutan primero, luego
  DuckDuckGo (orden 100), luego Ollama Web Search (orden 110)
- **Autoalojado** -- usted controla la instancia, las consultas y los motores de búsqueda ascendentes
- **Categorías** por defecto son `general` cuando no se configuran

<Tip>Para que la API JSON de SearXNG funcione, asegúrese de que su instancia de SearXNG tenga el formato `json` habilitado en su `settings.yml` bajo `search.formats`.</Tip>

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Búsqueda DuckDuckGo](/es/tools/duckduckgo-search) -- otra alternativa sin clave
- [Búsqueda Brave](/es/tools/brave-search) -- resultados estructurados con nivel gratuito
