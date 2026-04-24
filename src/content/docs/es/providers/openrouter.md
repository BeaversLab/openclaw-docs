---
summary: "Usa la API unificada de OpenRouter para acceder a muchos modelos en OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único
endpoint y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan simplemente cambiando la URL base.

## Para empezar

<Steps>
  <Step title="Consigue tu clave de API">
    Crea una clave de API en [openrouter.ai/keys](https://openrouter.ai/keys).
  </Step>
  <Step title="Ejecuta la incorporación">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Opcional) Cambia a un modelo específico">
    La incorporación usa por defecto `openrouter/auto`. Elige un modelo concreto más tarde:

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## Ejemplo de configuración

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## Referencias de modelos

<Note>
Las referencias de modelos siguen el patrón `openrouter/<provider>/<model>`. Para ver la lista completa de
proveedores y modelos disponibles, consulta [/concepts/model-providers](/es/concepts/model-providers).
</Note>

Ejemplos de reserva agrupados:

| Referencia del modelo                | Notas                                 |
| ------------------------------------ | ------------------------------------- |
| `openrouter/auto`                    | Enrutamiento automático de OpenRouter |
| `openrouter/moonshotai/kimi-k2.6`    | Kimi K2.6 a través de MoonshotAI      |
| `openrouter/openrouter/healer-alpha` | Ruta OpenRouter Healer Alpha          |
| `openrouter/openrouter/hunter-alpha` | Ruta OpenRouter Hunter Alpha          |

## Autenticación y encabezados

OpenRouter utiliza un token Bearer con tu clave de API en segundo plano.

En las solicitudes reales a OpenRouter (`https://openrouter.ai/api/v1`), OpenClaw también añade
los encabezados de atribución de la aplicación documentados por OpenRouter:

| Encabezado                | Valor                 |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>Si rediriges el proveedor OpenRouter a otro proxy o URL base, OpenClaw **no** inyecta esos encabezados específicos de OpenRouter ni los marcadores de caché de Anthropic.</Warning>

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Marcadores de caché de Anthropic">
    En las rutas verificadas de OpenRouter, las referencias de modelos de Anthropic conservan los
    marcadores específicos de Anthropic `cache_control` de OpenRouter que OpenClaw utiliza para
    una mejor reutilización del caché de prompts en los bloques de prompts del sistema/desarrollador.
  </Accordion>

<Accordion title="Inyección de pensamiento / razonamiento">En las rutas compatibles que no son de `auto`, OpenClaw asigna el nivel de pensamiento seleccionado a las cargas útiles de razonamiento del proxy de OpenRouter. Las sugerencias de modelo no compatibles y `openrouter/auto` omiten esa inyección de razonamiento.</Accordion>

<Accordion title="OpenAI-only request shaping">OpenRouter aún se ejecuta a través de la ruta compatible con OpenAI de estilo proxy, por lo que el modelado de solicitudes nativas solo de OpenAI, como `serviceTier`, Responses `store`, las cargas útiles compatibles con el razonamiento de OpenAI y las sugerencias de caché de avisos no se reenvían.</Accordion>

<Accordion title="Gemini-backed routes">Las referencias de OpenRouter respaldadas por Gemini se mantienen en la ruta proxy-Gemini: OpenClaw mantiene la limpieza de firmas de pensamiento de Gemini allí, pero no habilita la validación de repetición nativa de Gemini ni las reescrituras de arranque.</Accordion>

  <Accordion title="Provider routing metadata">
    Si pasa el enrutamiento del proveedor de OpenRouter bajo los parámetros del modelo, OpenClaw lo reenvía
    como metadatos de enrutamiento de OpenRouter antes de que se ejecuten los contenedores de flujo compartidos.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuration reference" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
