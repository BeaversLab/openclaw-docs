---
title: "Perplexity"
summary: "Configuración del proveedor de búsqueda web Perplexity (clave API, modos de búsqueda, filtrado)"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity (Proveedor de búsqueda web)

El complemento Perplexity proporciona capacidades de búsqueda web a través de la API de
búsqueda Perplexity o Perplexity Sonar a través de OpenRouter.

<Note>Esta página cubre la configuración del **proveedor** Perplexity. Para la **herramienta** Perplexity (cómo la usa el agente), consulte [Herramienta Perplexity](/en/tools/perplexity-search).</Note>

| Propiedad             | Valor                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| Tipo                  | Proveedor de búsqueda web (no un proveedor de modelos)                 |
| Autenticación         | `PERPLEXITY_API_KEY` (directo) o `OPENROUTER_API_KEY` (vía OpenRouter) |
| Ruta de configuración | `plugins.entries.perplexity.config.webSearch.apiKey`                   |

## Primeros pasos

<Steps>
  <Step title="Establezca la clave de API">
    Ejecute el flujo de configuración interactivo de búsqueda web:

    ```bash
    openclaw configure --section web
    ```

    O establezca la clave directamente:

    ```bash
    openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
    ```

  </Step>
  <Step title="Comience a buscar">
    El agente usará automáticamente Perplexity para búsquedas web una vez que la clave esté
    configurada. No se requieren pasos adicionales.
  </Step>
</Steps>

## Modos de búsqueda

El complemento selecciona automáticamente el transporte según el prefijo de la clave de API:

<Tabs>
  <Tab title="API nativa de Perplexity (pplx-)">Cuando su clave comienza con `pplx-`, OpenClaw utiliza la API de búsqueda nativa de Perplexity. Este transporte devuelve resultados estructurados y admite filtros de dominio, idioma y fecha (ver opciones de filtrado a continuación).</Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">Cuando su clave comienza con `sk-or-`, OpenClaw se enruta a través de OpenRouter usando el modelo Perplexity Sonar. Este transporte devuelve respuestas sintetizadas por IA con citas.</Tab>
</Tabs>

| Prefijo de clave | Transporte                           | Características                                           |
| ---------------- | ------------------------------------ | --------------------------------------------------------- |
| `pplx-`          | API de búsqueda nativa de Perplexity | Resultados estructurados, filtros de dominio/idioma/fecha |
| `sk-or-`         | OpenRouter (Sonar)                   | Respuestas sintetizadas por IA con citas                  |

## Filtrado de API nativa

<Note>Las opciones de filtrado solo están disponibles cuando se utiliza la API nativa de Perplexity (clave `pplx-`). Las búsquedas de OpenRouter/Sonar no admiten estos parámetros.</Note>

Al usar la API nativa de Perplexity, las búsquedas admiten los siguientes filtros:

| Filtro                   | Descripción                                                    | Ejemplo                             |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------- |
| País                     | Código de país de 2 letras                                     | `us`, `de`, `jp`                    |
| Idioma                   | Código de idioma ISO 639-1                                     | `en`, `fr`, `zh`                    |
| Rango de fechas          | Ventana de actualidad                                          | `day`, `week`, `month`, `year`      |
| Filtros de dominio       | Lista de permitidos o lista de bloqueados (máximo 20 dominios) | `example.com`                       |
| Presupuesto de contenido | Límites de tokens por respuesta / por página                   | `max_tokens`, `max_tokens_per_page` |

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Variable de entorno para procesos daemon">
    Si el OpenClaw Gateway se ejecuta como un daemon (launchd/systemd), asegúrese
    de que `PERPLEXITY_API_KEY` esté disponible para ese proceso.

    <Warning>
    Una clave establecida solo en `~/.profile` no será visible para un daemon
    launchd/systemd a menos que ese entorno se importe explícitamente. Establezca la clave en
    `~/.openclaw/.env` o a través de `env.shellEnv` para garantizar que el proceso de la puerta de enlace pueda
    leerla.
    </Warning>

  </Accordion>

  <Accordion title="Configuración del proxy OpenRouter">
    Si prefiere enrutar las búsquedas de Perplexity a través de OpenRouter, establezca una
    `OPENROUTER_API_KEY` (prefijo `sk-or-`) en lugar de una clave nativa de Perplexity.
    OpenClaw detectará el prefijo y cambiará al transporte Sonar
    automáticamente.

    <Tip>
    El transporte OpenRouter es útil si ya tiene una cuenta de OpenRouter
    y desea una facturación consolidada para varios proveedores.
    </Tip>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Herramienta de búsqueda Perplexity" href="/en/tools/perplexity-search" icon="magnifying-glass">
    Cómo el agente invoca las búsquedas de Perplexity e interpreta los resultados.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference" icon="gear">
    Referencia de configuración completa, incluidas las entradas del complemento.
  </Card>
</CardGroup>
