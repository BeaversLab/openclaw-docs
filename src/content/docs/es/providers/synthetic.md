---
summary: "Usa la API compatible con Anthropic de Synthetic en OpenClaw"
read_when:
  - You want to use Synthetic as a model provider
  - You need a Synthetic API key or base URL setup
title: "Synthetic"
---

# Synthetic

[Synthetic](https://synthetic.new) expone endpoints compatibles con Anthropic.
OpenClaw lo registra como el proveedor `synthetic` y usa la API de
Mensajes de Anthropic.

| Propiedad     | Valor                                 |
| ------------- | ------------------------------------- |
| Proveedor     | `synthetic`                           |
| Autenticación | `SYNTHETIC_API_KEY`                   |
| API           | Mensajes de Anthropic                 |
| URL base      | `https://api.synthetic.new/anthropic` |

## Para empezar

<Steps>
  <Step title="Obtener una clave de API">Obtén una `SYNTHETIC_API_KEY` de tu cuenta de Synthetic, o deja que el asistente de configuración te solicite una.</Step>
  <Step title="Ejecutar la configuración">```bash openclaw onboard --auth-choice synthetic-api-key ```</Step>
  <Step title="Verificar el modelo predeterminado">Después de la configuración, el modelo predeterminado se establece en: ``` synthetic/hf:MiniMaxAI/MiniMax-M2.5 ```</Step>
</Steps>

<Warning>El cliente de Anthropic de OpenClaw añade `/v1` a la URL base automáticamente, así que usa `https://api.synthetic.new/anthropic` (no `/anthropic/v1`). Si Synthetic cambia su URL base, anula `models.providers.synthetic.baseUrl`.</Warning>

## Ejemplo de configuración

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## Catálogo de modelos

Todos los modelos de Synthetic usan costo `0` (entrada/salida/caché).

| ID del modelo                                          | Ventana de contexto | Tokens máximos | Razonamiento | Entrada        |
| ------------------------------------------------------ | ------------------- | -------------- | ------------ | -------------- |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192,000             | 65,536         | no           | texto          |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256,000             | 8,192          | sí           | texto          |
| `hf:zai-org/GLM-4.7`                                   | 198,000             | 128,000        | no           | texto          |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128,000             | 8,192          | no           | texto          |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128,000             | 8,192          | no           | texto          |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128,000             | 8,192          | no           | texto          |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128,000             | 8,192          | no           | texto          |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159,000             | 8,192          | no           | texto          |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128,000             | 8,192          | no           | texto          |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524,000             | 8,192          | no           | texto          |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256,000             | 8,192          | no           | texto          |
| `hf:moonshotai/Kimi-K2.5`                              | 256,000             | 8,192          | sí           | texto + imagen |
| `hf:openai/gpt-oss-120b`                               | 128000              | 8192           | no           | texto          |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256000              | 8192           | no           | texto          |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256000              | 8192           | no           | texto          |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250000              | 8192           | no           | texto + imagen |
| `hf:zai-org/GLM-4.5`                                   | 128000              | 128000         | no           | texto          |
| `hf:zai-org/GLM-4.6`                                   | 198000              | 128000         | no           | texto          |
| `hf:zai-org/GLM-5`                                     | 256000              | 128000         | yes          | texto + imagen |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128000              | 8192           | no           | texto          |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256000              | 8192           | yes          | texto          |

<Tip>
Las referencias de modelos usan el formato `synthetic/<modelId>`. Use
`openclaw models list --provider synthetic` para ver todos los modelos disponibles en su
cuenta.
</Tip>

<AccordionGroup>
  <Accordion title="Lista de permitidos de modelos">
    Si habilita una lista de permitidos de modelos (`agents.defaults.models`), añada cada
    modelo Synthetic que planea usar. Los modelos que no estén en la lista de permitidos estarán ocultos
    para el agente.
  </Accordion>

  <Accordion title="Anulación de URL base">
    Si Synthetic cambia su punto final de API, anule la URL base en su configuración:

    ```json5
    {
      models: {
        providers: {
          synthetic: {
            baseUrl: "https://new-api.synthetic.new/anthropic",
          },
        },
      },
    }
    ```

    Recuerde que OpenClaw añade `/v1` automáticamente.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/en/concepts/model-providers" icon="layers">
    Reglas del proveedor, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo que incluye la configuración del proveedor.
  </Card>
  <Card title="Synthetic" href="https://synthetic.new" icon="arrow-up-right-from-square">
    Panel de control de Synthetic y documentación de la API.
  </Card>
</CardGroup>
