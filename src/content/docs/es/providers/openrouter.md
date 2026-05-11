---
summary: "Usa la API unificada de OpenRouter para acceder a muchos modelos en OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
title: "OpenRouter"
---

OpenRouter proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único punto de conexión y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan simplemente cambiando la URL base.

## Introducción

<Steps>
  <Step title="Obtén tu clave de API">
    Crea una clave de API en [openrouter.ai/keys](https://openrouter.ai/keys).
  </Step>
  <Step title="Ejecutar la incorporación">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Opcional) Cambiar a un modelo específico">
    La incorporación usa por defecto `openrouter/auto`. Elige un modelo concreto más adelante:

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
Las referencias de modelos siguen el patrón `openrouter/<provider>/<model>`. Para ver la lista completa de proveedores y modelos disponibles, consulta [/concepts/model-providers](/es/concepts/model-providers).
</Note>

Ejemplos de reserva agrupados:

| Referencia de modelo              | Notas                                 |
| --------------------------------- | ------------------------------------- |
| `openrouter/auto`                 | Enrutamiento automático de OpenRouter |
| `openrouter/moonshotai/kimi-k2.6` | Kimi K2.6 vía MoonshotAI              |

## Generación de imágenes

OpenRouter también puede respaldar la herramienta `image_generate`. Usa un modelo de imagen de OpenRouter en `agents.defaults.imageGenerationModel`:

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

OpenClaw envía solicitudes de imagen a la API de imágenes de completado de chat de OpenRouter con `modalities: ["image", "text"]`. Los modelos de imagen de Gemini reciben pistas compatibles de `aspectRatio` y `resolution` a través de `image_config` de OpenRouter. Usa `agents.defaults.imageGenerationModel.timeoutMs` para modelos de imagen de OpenRouter más lentos; el parámetro `timeoutMs` por llamada de la herramienta `image_generate` todavía tiene prioridad.

## Conversión de texto a voz

OpenRouter también se puede usar como proveedor de TTS a través de su punto de conexión `/audio/speech` compatible con OpenAI.

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

Si se omite `messages.tts.providers.openrouter.apiKey`, TTS reutiliza
`models.providers.openrouter.apiKey` y luego `OPENROUTER_API_KEY`.

## Autenticación y encabezados

OpenRouter utiliza un token Bearer con tu clave de API bajo el capó.

En las solicitudes reales a OpenRouter (`https://openrouter.ai/api/v1`), OpenClaw también añade
los encabezados de atribución de la aplicación documentados por OpenRouter:

| Encabezado                | Valor                 |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>Si rediriges el proveedor de OpenRouter a otro proxy o URL base, OpenClaw **no** inyecta esos encabezados específicos de OpenRouter ni los marcadores de caché de Anthropic.</Warning>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Marcadores de caché de Anthropic">
    En las rutas verificadas de OpenRouter, las referencias de modelos de Anthropic mantienen los
    marcadores `cache_control` específicos de OpenRouter para Anthropic que OpenClaw utiliza para
    una mejor reutilización del caché de avisos en bloques de avisos del sistema/desarrollador.
  </Accordion>

<Accordion title="Inyección de pensamiento / razonamiento">
  En las rutas compatibles que no son de `auto`, OpenClaw asigna el nivel de pensamiento seleccionado a las cargas útiles de razonamiento del proxy de OpenRouter. Las sugerencias de modelos no compatibles y `openrouter/auto` omiten esa inyección de razonamiento. Hunter Alpha también omite el razonamiento del proxy para las referencias de modelos configuradas obsoletas porque OpenRouter podría
  devolver texto de respuesta final en los campos de razonamiento para esa ruta retirada.
</Accordion>

<Accordion title="Conformación de solicitudes solo de OpenAI">OpenRouter aún se ejecuta a través de la ruta compatible con OpenAI estilo proxy, por lo que la conformación de solicitudes nativa solo de OpenAI, como `serviceTier`, Responses `store`, las cargas útiles de compatibilidad de razonamiento de OpenAI y las sugerencias de caché de avisos no se reenvían.</Accordion>

<Accordion title="Rutas con respaldo de Gemini">Las referencias de OpenRouter con respaldo de Gemini se mantienen en la ruta proxy-Gemini: OpenClaw mantiene la saneamiento de firmas de pensamiento de Gemini allí, pero no habilita la validación de repetición nativa de Gemini ni las reescrituras de arranque.</Accordion>

  <Accordion title="Metadatos de enrutamiento del proveedor">
    Si pasas el enrutamiento del proveedor de OpenRouter bajo los parámetros del modelo, OpenClaw lo reenvía
    como metadatos de enrutamiento de OpenRouter antes de que se ejecuten los contenedores de flujo compartidos.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
