---
title: "LiteLLM"
summary: "Ejecute OpenClaw a través del proxy LiteLLM para un acceso unificado a modelos y seguimiento de costos"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) es una puerta de enlace de LLM de código abierto que proporciona una API unificada para más de 100 proveedores de modelos. Enruta OpenClaw a través de LiteLLM para obtener un seguimiento centralizado de costos, registro y la flexibilidad de cambiar de backend sin modificar la configuración de OpenClaw.

<Tip>
**¿Por qué usar LiteLLM con OpenClaw?**

- **Seguimiento de costos** — Vea exactamente qué gasta OpenClaw en todos los modelos
- **Enrutamiento de modelos** — Cambie entre Claude, GPT-4, Gemini, Bedrock sin cambios en la configuración
- **Claves virtuales** — Cree claves con límites de gasto para OpenClaw
- **Registro** — Registros completos de solicitudes/respuestas para depuración
- **Respaldo (Fallbacks)** — Conmutación por error automática si su proveedor principal está caído
  </Tip>

## Inicio rápido

<Tabs>
  <Tab title="Incorporación (recomendado)">
    **Lo mejor para:** el camino más rápido hacia una configuración funcional de LiteLLM.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Configuración manual">
    **Lo mejor para:** control total sobre la instalación y la configuración.

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

        Eso es todo. OpenClau ahora se enruta a través de LiteLLM.
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

## Temas avanzados

<AccordionGroup>
  <Accordion title="Claves virtuales">
    Cree una clave dedicada para OpenClaw con límites de gasto:

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

    Use la clave generada como `LITELLM_API_KEY`.

  </Accordion>

  <Accordion title="Enrutamiento de modelos">
    LiteLLM puede enrutar solicitudes de modelos a diferentes backends. Configure en su archivo `config.yaml` de LiteLLM:

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
    - OpenClaw se conecta a través del punto final compatible con OpenAI estilo proxy de `/v1`
      de LiteLLM
    - La configuración de solicitudes nativa solo para OpenAI no se aplica a través de LiteLLM:
      sin `service_tier`, sin Respuestas `store`, sin sugerencias de caché de prompts y sin
      configuración de carga útil de compatibilidad de razonamiento de OpenAI
    - Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
      no se inyectan en URL base personalizadas de LiteLLM
  </Accordion>
</AccordionGroup>

<Note>Para obtener información general sobre la configuración del proveedor y el comportamiento de conmutación por error, consulte [Proveedores de modelos](/es/concepts/model-providers).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Documentación de LiteLLM" href="https://docs.litellm.ai" icon="book">
    Documentación oficial y referencia de la API de LiteLLM.
  </Card>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/models" icon="brain">
    Cómo elegir y configurar modelos.
  </Card>
</CardGroup>
