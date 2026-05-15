---
summary: "Ejecuta OpenClaw a través del Proxy LiteLLM para un acceso unificado al modelo y seguimiento de costos"
title: "LiteLLM"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

[LiteLLM](https://litellm.ai) es una puerta de enlace LLM de código abierto que proporciona una API unificada para más de 100 proveedores de modelos. Enruta OpenClaw a través de LiteLLM para obtener un seguimiento centralizado de costos, registro y la flexibilidad de cambiar de backend sin modificar la configuración de OpenClaw.

<Tip>
**¿Por qué usar LiteLLM con OpenClaw?**

- **Seguimiento de costos** — Ve exactamente cuánto gasta OpenClam en todos los modelos
- **Enrutamiento de modelos** — Cambia entre Claude, GPT-4, Gemini, Bedrock sin cambios en la configuración
- **Claves virtuales** — Crea claves con límites de gasto para OpenClaw
- **Registro (Logging)** — Registros completos de solicitud/respuesta para depuración
- **Respaldo (Fallbacks)** — Conmutación por error automática si tu proveedor principal está caído

</Tip>

## Inicio rápido

<Tabs>
  <Tab title="Incorporación (recomendado)">
    **Mejor para:** la ruta más rápida hacia una configuración funcional de LiteLLM.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```

        Para una configuración no interactiva contra un proxy remoto, pasa la URL del proxy explícitamente:

        ```bash
        openclaw onboard --non-interactive --auth-choice litellm-api-key --litellm-api-key "$LITELLM_API_KEY" --custom-base-url "https://litellm.example/v1"
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Configuración manual">
    **Mejor para:** control total sobre la instalación y la configuración.

    <Steps>
      <Step title="Iniciar Proxy LiteLLM">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="Apuntar OpenClaw a LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```

        Eso es todo. OpenClaw ahora se enruta a través de LiteLLM.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Configuración

### Variables de entorno

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### Archivo de configuración

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## Configuración avanzada

### Generación de imágenes

LiteLLM también puede respaldar la herramienta `image_generate` a través de rutas
`/images/generations` y `/images/edits` compatibles con OpenAI. Configura un modelo de imagen LiteLLM
bajo `agents.defaults.imageGenerationModel`:

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "litellm/gpt-image-2",
        timeoutMs: 180_000,
      },
    },
  },
}
```

Las URL de bucle de retorno de LiteLLM como `http://localhost:4000` funcionan sin una
anulación global de red privada. Para un proxy alojado en LAN, establece
`models.providers.litellm.request.allowPrivateNetwork: true` porque la clave de API
se enviará al host del proxy configurado.

<AccordionGroup>
  <Accordion title="Claves virtuales">
    Crea una clave dedicada para OpenClaw con límites de gasto:

    ```bash
    curl -X POST "http://localhost:4000/key/generate" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key_alias": "openclaw",
        "max_budget": 50.00,
        "budget_duration": "monthly"
      }'
    ```

    Usa la clave generada como `LITELLM_API_KEY`.

  </Accordion>

  <Accordion title="Enrutamiento de modelos">
    LiteLLM puede enrutar las solicitudes de modelos a diferentes backends. Configúrelo en su `config.yaml` de LiteLLM:

    ```yaml
    model_list:
      - model_name: claude-opus-4-6
        litellm_params:
          model: claude-opus-4-6
          api_key: os.environ/ANTHROPIC_API_KEY

      - model_name: gpt-4o
        litellm_params:
          model: gpt-4o
          api_key: os.environ/OPENAI_API_KEY
    ```

    OpenClaw sigue solicitando `claude-opus-4-6` — LiteLLM maneja el enrutamiento.

  </Accordion>

  <Accordion title="Ver uso">
    Consulte el panel de control o la API de LiteLLM:

    ```bash
    # Key info
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # Spend logs
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="Notas sobre el comportamiento del proxy">
    - LiteLLM se ejecuta en `http://localhost:4000` de manera predeterminada
    - OpenClaw se conecta a través del punto final compatible con OpenAI de estilo proxy de `/v1`
      de LiteLLM
    - El modelado de solicitudes nativo solo de OpenAI no se aplica a través de LiteLLM:
      sin `service_tier`, sin Responses `store`, sin sugerencias de caché de prompts y sin
      modelado de carga compatible con el razonamiento de OpenAI
    - Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
      no se inyectan en URLs base personalizadas de LiteLLM
  </Accordion>
</AccordionGroup>

<Note>Para ver la configuración general del proveedor y el comportamiento de conmutación por error, consulte [Model Providers](/es/concepts/model-providers).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Documentación de LiteLLM" href="https://docs.litellm.ai" icon="book">
    Documentación oficial y referencia de la API de LiteLLM.
  </Card>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
  <Card title="Selección de modelos" href="/es/concepts/models" icon="brain">
    Cómo elegir y configurar modelos.
  </Card>
</CardGroup>
