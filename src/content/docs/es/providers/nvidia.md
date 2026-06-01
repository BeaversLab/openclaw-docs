---
summary: "Usa la API compatible con OpenAI de NVIDIA en OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

NVIDIA proporciona una API compatible con OpenAI en `https://integrate.api.nvidia.com/v1` para
modelos abiertos de forma gratuita. Autentíquese con una clave de API de
[build.nvidia.com](https://build.nvidia.com/settings/api-keys).

## Comenzando

<Steps>
  <Step title="Obtenga su clave de API">Cree una clave de API en [build.nvidia.com](https://build.nvidia.com/settings/api-keys).</Step>
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

## Catálogo destacado

Cuando se configura una clave de API de NVIDIA, las rutas de configuración y selección de modelos
de OpenClaw intentan el catálogo público de modelos destacados de NVIDIA desde
`https://assets.ngc.nvidia.com/products/api-catalog/featured-models.json` y
cachéan el resultado clasificado durante 24 horas. Los nuevos modelos destacados de build.nvidia.com
por lo tanto, aparecen en las superficies de configuración y selección de modelos sin esperar un
lanzamiento de OpenClaw.

La recuperación utiliza una política de host HTTPS fija para `assets.ngc.nvidia.com`. Si no
se ha configurado ninguna clave de API de NVIDIA, o si ese catálogo público no está disponible o
está malformado, OpenClaw recurre al catálogo incluido a continuación.

## Catálogo de respaldo incluido

| Ref. de modelo                             | Nombre                       | Contexto | Salida máxima | Notas                                      |
| ------------------------------------------ | ---------------------------- | -------- | ------------- | ------------------------------------------ |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192         | Respaldo destacado                         |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192         | Respaldo destacado                         |
| `nvidia/minimaxai/minimax-m2.7`            | Minimax M2.7                 | 196,608  | 8,192         | Respaldo destacado                         |
| `nvidia/z-ai/glm-5.1`                      | GLM 5.1                      | 202,752  | 8,192         | Respaldo destacado                         |
| `nvidia/minimaxai/minimax-m2.5`            | MiniMax M2.5                 | 196,608  | 8,192         | En desuso, compatibilidad de actualización |
| `nvidia/z-ai/glm5`                         | GLM-5                        | 202,752  | 8,192         | En desuso, compatibilidad de actualización |

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Comportamiento de habilitación automática">
    El proveedor se habilita automáticamente cuando se establece la variable de entorno `NVIDIA_API_KEY`.
    No se requiere una configuración explícita del proveedor más allá de la clave.
  </Accordion>

<Accordion title="Catálogo y precios">
  OpenClaw prefiere el catálogo público de modelos destacados de NVIDIA cuando la autenticación de NVIDIA está configurada y lo almacena en caché durante 24 horas. El catálogo de respaldo incluido es estático y mantiene referencias enviadas en desuso para la compatibilidad de actualización. Los costos predeterminados son `0` en la fuente, ya que NVIDIA actualmente ofrece acceso gratuito a la API
  para los modelos listados.
</Accordion>

<Accordion title="Endpoint compatible con OpenAI">NVIDIA utiliza el endpoint `/v1` de completions estándar. Cualquier herramienta compatible con OpenAI debería funcionar directamente con la URL base de NVIDIA.</Accordion>

  <Accordion title="Respuestas lentas de proveedores personalizados">
    Algunos modelos personalizados alojados por NVIDIA pueden tardar más que el perro guardián de inactividad del modelo predeterminado
    antes de emitir un primer fragmento de respuesta. Para entradas de proveedores NVIDIA personalizados,
    aumente el tiempo de espera del proveedor en lugar de aumentar el tiempo de espera de ejecución
    del agente completo:

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

<Tip>Los modelos de NVIDIA son actualmente gratuitos. Consulte [build.nvidia.com](https://build.nvidia.com/) para conocer la disponibilidad más reciente y los detalles de los límites de velocidad.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
