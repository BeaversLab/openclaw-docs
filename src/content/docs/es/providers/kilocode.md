---
summary: "Usa la API unificada de Kilo Gateway para acceder a muchos modelos en OpenClaw"
title: "Kilo Gateway"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

Kilo Gateway proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único punto de conexión y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan simplemente cambiando la URL base.

| Propiedad     | Valor                              |
| ------------- | ---------------------------------- |
| Proveedor     | `kilocode`                         |
| Autenticación | `KILOCODE_API_KEY`                 |
| API           | Compatible con OpenAI              |
| URL base      | `https://api.kilo.ai/api/gateway/` |

## Para empezar

<Steps>
  <Step title="Crear una cuenta">
    Vaya a [app.kilo.ai](https://app.kilo.ai), inicie sesión o cree una cuenta, luego vaya a API Keys y genere una nueva clave.
  </Step>
  <Step title="Ejecutar la incorporación">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    O establezca la variable de entorno directamente:

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step title="Verificar que el modelo está disponible">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

## Modelo predeterminado

El modelo predeterminado es `kilocode/kilo/auto`, un modelo de enrutamiento inteligente propiedad del proveedor
y administrado por Kilo Gateway.

<Note>OpenClaw trata `kilocode/kilo/auto` como la referencia predeterminada estable, pero no publica una asignación de tarea a modelo upstream respaldada por el código fuente para esa ruta. El enrutamiento exacto detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway, no codificado en OpenClaw.</Note>

## Catálogo integrado

OpenClaw descubre dinámicamente los modelos disponibles en Kilo Gateway al iniciar. Use
`/models kilocode` para ver la lista completa de modelos disponibles con su cuenta.

Cualquier modelo disponible en la puerta de enlace se puede usar con el prefijo `kilocode/`:

| Referencia del modelo                    | Notas                                       |
| ---------------------------------------- | ------------------------------------------- |
| `kilocode/kilo/auto`                     | Predeterminado — enrutamiento inteligente   |
| `kilocode/anthropic/claude-sonnet-4`     | Anthropic a través de Kilo                  |
| `kilocode/openai/gpt-5.5`                | OpenAI a través de Kilo                     |
| `kilocode/google/gemini-3.1-pro-preview` | Google a través de Kilo                     |
| ...y muchos más                          | Use `/models kilocode` para listarlos todos |

<Tip>Al iniciar, OpenClaw consulta `GET https://api.kilo.ai/api/gateway/models` y combina los modelos descubiertos antes del catálogo alternativo estático. Las alternativas incluidas siempre incluyen `kilocode/kilo/auto` (`Kilo Auto`) con `input: ["text", "image"]`, `reasoning: true`, `contextWindow: 1000000` y `maxTokens: 128000`.</Tip>

## Config example

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Transport and compatibility">
    Kilo Gateway está documentado en el código fuente como compatible con OpenRouter, por lo que se mantiene en
    la ruta compatible con OpenAI de estilo proxy en lugar de la configuración nativa de solicitudes de OpenAI.

    - Las referencias de Kilo respaldadas por Gemini se mantienen en la ruta proxy-Gemini, por lo que OpenClaw mantiene
      el saneado de la firma de pensamiento de Gemini allí sin habilitar la validación nativa de
      repetición de Gemini o reescrituras de arranque.
    - Kilo Gateway utiliza un token Bearer con su clave API bajo el capó.

  </Accordion>

  <Accordion title="Stream wrapper and reasoning">
    El contenedor de flujo compartido de Kilo agrega el encabezado de la aplicación del proveedor y normaliza
    las cargas útiles de razonamiento del proxy para las referencias de modelos concretos compatibles.

    <Warning>
    `kilocode/kilo/auto` y otras sugerencias no compatibles con el razonamiento de proxy omiten la inyección de
    razonamiento. Si necesita soporte de razonamiento, use una referencia de modelo concreta como
    `kilocode/anthropic/claude-sonnet-4`.
    </Warning>

  </Accordion>

  <Accordion title="Troubleshooting">
    - Si el descubrimiento de modelos falla al inicio, OpenClaw recurre al catálogo estático incluido que contiene `kilocode/kilo/auto`.
    - Confirme que su clave API es válida y que su cuenta de Kilo tiene los modelos deseados habilitados.
    - Cuando el Gateway se ejecuta como un demonio, asegúrese de que `KILOCODE_API_KEY` esté disponible para ese proceso (por ejemplo en `~/.openclaw/.env` o a través de `env.shellEnv`).

  </Accordion>
</AccordionGroup>

## Related

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración de OpenClaw.
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Panel de control de Kilo Gateway, claves API y gestión de cuentas.
  </Card>
</CardGroup>
