---
summary: "Usa la API compatible con OpenAI de NVIDIA en OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA proporciona una API compatible con OpenAI en `https://integrate.api.nvidia.com/v1` para
modelos abiertos de forma gratuita. Autentícate con una clave de API de
[build.nvidia.com](https://build.nvidia.com/settings/api-keys).

## Comenzando

<Steps>
  <Step title="Obtén tu clave de API">Crea una clave de API en [build.nvidia.com](https://build.nvidia.com/settings/api-keys).</Step>
  <Step title="Exporta la clave y ejecuta la incorporación">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice skip ```</Step>
  <Step title="Establece un modelo de NVIDIA">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>Si pasas `--token` en lugar de la variable de entorno, el valor queda en el historial de la shell y en la salida de `ps`. Es preferible usar la variable de entorno `NVIDIA_API_KEY` cuando sea posible.</Warning>

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

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Comportamiento de habilitación automática">
    El proveedor se habilita automáticamente cuando se establece la variable de entorno `NVIDIA_API_KEY`.
    No se requiere una configuración explícita del proveedor además de la clave.
  </Accordion>

<Accordion title="Catálogo y precios">El catálogo incluido es estático. Los costos por defecto son `0` en la fuente ya que NVIDIA actualmente ofrece acceso gratuito a la API para los modelos listados.</Accordion>

  <Accordion title="Endpoint compatible con OpenAI">
    NVIDIA utiliza el endpoint de finalizaciones estándar `/v1`. Cualquier herramienta compatible
    con OpenAI debería funcionar directamente con la URL base de NVIDIA.
  </Accordion>
</AccordionGroup>

<Tip>Los modelos de NVIDIA actualmente son gratuitos. Consulte [build.nvidia.com](https://build.nvidia.com/) para obtener la última disponibilidad y detalles sobre límites de velocidad.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/en/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
