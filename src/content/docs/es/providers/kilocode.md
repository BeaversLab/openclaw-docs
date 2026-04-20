---
title: "Kilocode"
summary: "Usa la API unificada de Kilo Gateway para acceder a muchos modelos en OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway proporciona una **API unificada** que dirige las solicitudes a muchos modelos detrás de un solo punto de conexión y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan cambiando la URL base.

| Propiedad     | Valor                              |
| ------------- | ---------------------------------- |
| Proveedor     | `kilocode`                         |
| Autenticación | `KILOCODE_API_KEY`                 |
| API           | Compatible con OpenAI              |
| URL base      | `https://api.kilo.ai/api/gateway/` |

## Primeros pasos

<Steps>
  <Step title="Crear una cuenta">
    Vaya a [app.kilo.ai](https://app.kilo.ai), inicie sesión o cree una cuenta, luego vaya a API Keys y genere una nueva clave.
  </Step>
  <Step title="Ejecutar onboarding">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    O establezca la variable de entorno directamente:

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

## Modelo predeterminado

El modelo predeterminado es `kilocode/kilo/auto`, un modelo de enrutamiento inteligente
propiedad del proveedor y gestionado por Kilo Gateway.

<Note>OpenClaw trata `kilocode/kilo/auto` como la referencia predeterminada estable, pero no publica una asignación de tarea a modelo ascendente respaldada por el código fuente para esa ruta. El enrutamiento ascendente exacto detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway, no está codificado en OpenClaw.</Note>

## Modelos disponibles

OpenClaw descubre dinámicamente los modelos disponibles en Kilo Gateway al inicio. Use
`/models kilocode` para ver la lista completa de modelos disponibles con su cuenta.

Cualquier modelo disponible en la puerta de enlace se puede usar con el prefijo `kilocode/`:

| Ref. de modelo                         | Notas                                     |
| -------------------------------------- | ----------------------------------------- |
| `kilocode/kilo/auto`                   | Predeterminado — enrutamiento inteligente |
| `kilocode/anthropic/claude-sonnet-4`   | Anthropic a través de Kilo                |
| `kilocode/openai/gpt-5.4`              | OpenAI a través de Kilo                   |
| `kilocode/google/gemini-3-pro-preview` | Google a través de Kilo                   |
| ...y muchos más                        | Use `/models kilocode` para listar todos  |

<Tip>Al inicio, OpenClaw consulta `GET https://api.kilo.ai/api/gateway/models` y fusiona los modelos descubiertos antes del catálogo alternativo estático. La alternativa incluida siempre incluye `kilocode/kilo/auto` (`Kilo Auto`) con `input: ["text", "image"]`, `reasoning: true`, `contextWindow: 1000000` y `maxTokens: 128000`.</Tip>

## Ejemplo de configuración

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
  <Accordion title="Transporte y compatibilidad">
    Kilo Gateway está documentado en el código fuente como compatible con OpenRouter, por lo que se mantiene en
    la ruta de compatibilidad con OpenAI estilo proxy en lugar de la configuración nativa de solicitudes de OpenAI.

    - Las referencias de Kilo respaldadas por Gemini se mantienen en la ruta proxy-Gemini, por lo que OpenClaw mantiene
      allí la saneamiento de la firma de pensamiento de Gemini sin habilitar la validación de repetición nativa de Gemini
      o reescrituras de arranque.
    - Kilo Gateway utiliza un token Bearer con su clave de API bajo el capó.

  </Accordion>

  <Accordion title="Envoltorio de flujo y razonamiento">
    El envoltorio de flujo compartido de Kilo añade el encabezado de la aplicación del proveedor y normaliza
    las cargas útiles de razonamiento del proxy para referencias de modelos concretas compatibles.

    <Warning>
    `kilocode/kilo/auto` y otras sugerencias no compatibles con el razonamiento del proxy omiten la inyección de
    razonamiento. Si necesita soporte de razonamiento, use una referencia de modelo concreta como
    `kilocode/anthropic/claude-sonnet-4`.
    </Warning>

  </Accordion>

  <Accordion title="Solución de problemas">
    - Si el descubrimiento de modelos falla al iniciar, OpenClaw recurre al catálogo estático incluido que contiene `kilocode/kilo/auto`.
    - Confirme que su clave de API es válida y que su cuenta de Kilo tiene los modelos deseados habilitados.
    - Cuando el Gateway se ejecuta como un demonio, asegúrese de que `KILOCODE_API_KEY` esté disponible para ese proceso (por ejemplo en `~/.openclaw/.env` o vía `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/en/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration" icon="gear">
    Referencia completa de configuración de OpenClaw.
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Panel de Kilo Gateway, claves de API y gestión de cuentas.
  </Card>
</CardGroup>
