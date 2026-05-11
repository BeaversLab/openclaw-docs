---
summary: "Configuración del proveedor de búsqueda web Perplexity (clave API, modos de búsqueda, filtrado)"
title: "Perplexity"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

El complemento Perplexity proporciona capacidades de búsqueda web a través de la API de
búsqueda de Perplexity o Perplexity Sonar a través de OpenRouter.

<Note>Esta página es la configuración del **proveedor** de Perplexity. Para la **herramienta** de Perplexity (cómo la usa el agente), consulte [Herramienta Perplexity](/es/tools/perplexity-search).</Note>

| Propiedad             | Valor                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| Tipo                  | Proveedor de búsqueda web (no un proveedor de modelos)                 |
| Autenticación         | `PERPLEXITY_API_KEY` (directo) o `OPENROUTER_API_KEY` (vía OpenRouter) |
| Ruta de configuración | `plugins.entries.perplexity.config.webSearch.apiKey`                   |

## Para empezar

<Steps>
  <Step title="Establecer la clave API">
    Ejecute el flujo de configuración interactivo de búsqueda web:

    ```bash
    openclaw configure --section web
    ```

    O establezca la clave directamente:

    ```bash
    openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
    ```

  </Step>
  <Step title="Comenzar a buscar">
    Una vez configurada la clave, el agente utilizará automáticamente Perplexity para
    búsquedas web. No se requieren pasos adicionales.
  </Step>
</Steps>

## Modos de búsqueda

El complemento selecciona automáticamente el transporte según el prefijo de la clave API:

<Tabs>
  <Tab title="API nativa de Perplexity (pplx-)">Cuando su clave comienza con `pplx-`, OpenClaw utiliza la API de búsqueda nativa de Perplexity. Este transporte devuelve resultados estructurados y admite filtros de dominio, idioma y fecha (consulte las opciones de filtrado a continuación).</Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">Cuando su clave comienza con `sk-or-`, OpenClaw enruta a través de OpenRouter usando el modelo Perplexity Sonar. Este transporte devuelve respuestas sintetizadas por IA con citas.</Tab>
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
| País                     | Código de país de dos letras                                   | `us`, `de`, `jp`                    |
| Idioma                   | Código de idioma ISO 639-1                                     | `en`, `fr`, `zh`                    |
| Rango de fechas          | Ventana de recencia                                            | `day`, `week`, `month`, `year`      |
| Filtros de dominio       | Lista de permitidos o lista de bloqueados (máximo 20 dominios) | `example.com`                       |
| Presupuesto de contenido | Límites de tokens por respuesta / por página                   | `max_tokens`, `max_tokens_per_page` |

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Variable de entorno para procesos daemon">
    Si OpenClaw Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que
    `PERPLEXITY_API_KEY` esté disponible para ese proceso.

    <Warning>
    Una clave establecida solo en `~/.profile` no será visible para un demonio
    launchd/systemd a menos que ese entorno se importe explícitamente. Establezca la clave en
    `~/.openclaw/.env` o mediante `env.shellEnv` para garantizar que el proceso de la puerta de enlace pueda
    leerla.
    </Warning>

  </Accordion>

  <Accordion title="Configuración del proxy OpenRouter">
    Si prefiere enrutar las búsquedas de Perplexidad a través de OpenRouter, establezca una
    `OPENROUTER_API_KEY` (prefijo `sk-or-`) en lugar de una clave nativa de Perplexity.
    OpenClaw detectará el prefijo y cambiará al transporte Sonar
    automáticamente.

    <Tip>
    El transporte OpenRouter es útil si ya tiene una cuenta de OpenRouter
    y desea una facturación consolidada entre varios proveedores.
    </Tip>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Herramienta de búsqueda de Perplexity" href="/es/tools/perplexity-search" icon="magnifying-glass">
    Cómo invoca el agente las búsquedas de Perplexity e interpreta los resultados.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Referencia de configuración completa, incluidas las entradas del complemento.
  </Card>
</CardGroup>
