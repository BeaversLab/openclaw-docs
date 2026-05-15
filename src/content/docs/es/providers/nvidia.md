---
summary: "Usa la API compatible con OpenAI de NVIDIA en OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

NVIDIA proporciona una API compatible con OpenAI en `https://integrate.api.nvidia.com/v1` para
modelos abiertos de forma gratuita. Autentícate con una clave de API
de [build.nvidia.com](https://build.nvidia.com/settings/api-keys).

## Comenzando

<Steps>
  <Step title="Obtén tu clave de API">Crea una clave de API en [build.nvidia.com](https://build.nvidia.com/settings/api-keys).</Step>
  <Step title="Exporta la clave y ejecuta la incorporación">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice nvidia-api-key ```</Step>
  <Step title="Configura un modelo de NVIDIA">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>Si pasas `--nvidia-api-key` en lugar de la variable de entorno, el valor se guarda en el historial de la shell y en la salida de `ps`. Se prefiere la variable de entorno `NVIDIA_API_KEY` cuando sea posible.</Warning>

Para una configuración no interactiva, también puedes pasar la clave directamente:

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

## Ejemplo de configuración

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## Catálogo integrado

| Ref. de modelo                             | Nombre                       | Contexto | Salida máxima |
| ------------------------------------------ | ---------------------------- | -------- | ------------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192         |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192         |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608  | 8,192         |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202.752  | 8.192         |

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Comportamiento de autohabilitación">
    El proveedor se habilita automáticamente cuando se establece la variable de entorno `NVIDIA_API_KEY`.
    No se requiere una configuración explícita del proveedor más allá de la clave.
  </Accordion>

<Accordion title="Catálogo y precios">El catálogo incluido es estático. Los costos predeterminados son `0` en el origen ya que NVIDIA actualmente ofrece acceso gratuito a la API para los modelos listados.</Accordion>

<Accordion title="Endpoint compatible con OpenAI">NVIDIA utiliza el endpoint estándar de completions `/v1`. Cualquier herramienta compatible con OpenAI debería funcionar directamente con la URL base de NVIDIA.</Accordion>

  <Accordion title="Slow custom provider responses">
    Algunos modelos personalizados alojados por NVIDIA pueden tardar más que el
    perro guardián de inactividad del modelo predeterminado antes de emitir su
    primer fragmento de respuesta. Para las entradas personalizadas del
    proveedor de NVIDIA, aumente el tiempo de espera del proveedor en lugar de
    aumentar el tiempo de espera de ejecución de todo el agente:

    ```json5
    {
      models: {
        providers: {
          "custom-integrate-api-nvidia-com": {
            baseUrl: "https://integrate.api.nvidia.com/v1",
            api: "openai-completions",
            apiKey: "NVIDIA_API_KEY",
            timeoutSeconds: 300,
          },
        },
      },
      agents: {
        defaults: {
          models: {
            "custom-integrate-api-nvidia-com/meta/llama-3.1-70b-instruct": {
              params: { thinking: "off" },
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

<Tip>Los modelos de NVIDIA actualmente son gratuitos. Consulte [build.nvidia.com](https://build.nvidia.com/) para conocer la disponibilidad más reciente y los detalles de los límites de velocidad.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuration reference" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
