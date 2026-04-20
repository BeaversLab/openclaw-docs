---
summary: "Configuración de Hugging Face Inference (autenticación + selección de modelo)"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inference)"
---

# Hugging Face (Inference)

[Los proveedores de inferencia de Hugging Face](https://huggingface.co/docs/inference-providers) ofrecen completaciones de chat compatibles con OpenAI a través de una sola API de enrutamiento. Obtienes acceso a muchos modelos (DeepSeek, Llama y más) con un solo token. OpenClaw utiliza el **endpoint compatible con OpenAI** (solo completaciones de chat); para texto a imagen, incrustaciones (embeddings) o voz, utiliza los [clientes de inferencia de HF](https://huggingface.co/docs/api-inference/quicktour) directamente.

- Proveedor: `huggingface`
- Autenticación: `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN` (token de grano fino con **Make calls to Inference Providers**)
- API: Compatible con OpenAI (`https://router.huggingface.co/v1`)
- Facturación: Un solo token de HF; [precios](https://huggingface.co/docs/inference-providers/pricing) sigue las tarifas del proveedor con un nivel gratuito.

## Para empezar

<Steps>
  <Step title="Crea un token de grano fino">
    Ve a [Tokens de configuración de Hugging Face](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) y crea un nuevo token de grano fino.

    <Warning>
    El token debe tener el permiso **Make calls to Inference Providers** habilitado o las solicitudes a la API serán rechazadas.
    </Warning>

  </Step>
  <Step title="Ejecuta la incorporación">
    Elige **Hugging Face** en el menú desplegable de proveedores, luego introduce tu clave de API cuando se te solicite:

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step title="Selecciona un modelo predeterminado">
    En el menú desplegable **Modelo Hugging Face predeterminado**, selecciona el modelo que desees. La lista se carga desde la API de Inferencia cuando tienes un token válido; de lo contrario, se muestra una lista integrada. Tu elección se guarda como el modelo predeterminado.

    También puedes establecer o cambiar el modelo predeterminado más tarde en la configuración:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
        },
      },
    }
    ```

  </Step>
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider huggingface
    ```
  </Step>
</Steps>

### Configuración no interactiva

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

Esto establecerá `huggingface/deepseek-ai/DeepSeek-R1` como el modelo predeterminado.

## ID de modelos

Las referencias de los modelos utilizan el formato `huggingface/<org>/<model>` (ID estilo Hub). La lista de abajo proviene de **GET** `https://router.huggingface.co/v1/models`; tu catálogo puede incluir más.

| Modelo                 | Ref (prefijo con `huggingface/`)    |
| ---------------------- | ----------------------------------- |
| DeepSeek R1            | `deepseek-ai/DeepSeek-R1`           |
| DeepSeek V3.2          | `deepseek-ai/DeepSeek-V3.2`         |
| Qwen3 8B               | `Qwen/Qwen3-8B`                     |
| Qwen2.5 7B Instruct    | `Qwen/Qwen2.5-7B-Instruct`          |
| Qwen3 32B              | `Qwen/Qwen3-32B`                    |
| Llama 3.3 70B Instruct | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct  | `meta-llama/Llama-3.1-8B-Instruct`  |
| GPT-OSS 120B           | `openai/gpt-oss-120b`               |
| GLM 4.7                | `zai-org/GLM-4.7`                   |
| Kimi K2.5              | `moonshotai/Kimi-K2.5`              |

<Tip>Puedes añadir `:fastest` o `:cheapest` a cualquier ID de modelo. Establece tu orden predeterminado en [Configuración del proveedor de inferencia](https://hf.co/settings/inference-providers); consulta [Proveedores de inferencia](https://huggingface.co/docs/inference-providers) y **GET** `https://router.huggingface.co/v1/models` para ver la lista completa.</Tip>

## Detalles avanzados

<AccordionGroup>
  <Accordion title="Model discovery and onboarding dropdown">
    OpenClaw descubre los modelos llamando directamente al **endpoint de inferencia**:

    ```bash
    GET https://router.huggingface.co/v1/models
    ```

    (Opcional: envía `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` o `$HF_TOKEN` para obtener la lista completa; algunos endpoints devuelven un subconjunto sin autenticación). La respuesta es estilo OpenAI `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`.

    Cuando configuras una clave de API de Hugging Face (a través de la incorporación, `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`), OpenClaw utiliza este GET para descubrir los modelos de completado de chat disponibles. Durante la **configuración interactiva**, después de ingresar tu token, verás un menú desplegable de **Modelo predeterminado de Hugging Face** poblado a partir de esa lista (o del catálogo integrado si falla la solicitud). En tiempo de ejecución (por ejemplo, al iniciar Gateway), cuando hay una clave presente, OpenClaw vuelve a llamar a **GET** `https://router.huggingface.co/v1/models` para actualizar el catálogo. La lista se fusiona con un catálogo integrado (para metadatos como la ventana de contexto y el costo). Si la solicitud falla o no se establece ninguna clave, solo se utiliza el catálogo integrado.

  </Accordion>

  <Accordion title="Nombres de modelos, alias y sufijos de política">
    - **Nombre de la API:** El nombre para mostrar del modelo se **obtiene de GET /v1/models** cuando la API devuelve `name`, `title` o `display_name`; de lo contrario, se deriva del id del modelo (por ejemplo, `deepseek-ai/DeepSeek-R1` se convierte en "DeepSeek R1").
    - **Sobrescribir el nombre para mostrar:** Puede establecer una etiqueta personalizada por modelo en la configuración para que aparezca como desee en la CLI y la IU:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1 (fast)" },
            "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheap)" },
          },
        },
      },
    }
    ```

    - **Sufijos de política:** La documentación y las herramientas de Hugging Face incluidas en OpenClaw actualmente tratan estos dos sufijos como las variantes de política integradas:
      - **`:fastest`** — máximo rendimiento.
      - **`:cheapest`** — menor costo por token de salida.

      Puede agregarlos como entradas separadas en `models.providers.huggingface.models` o establecer `model.primary` con el sufijo. También puede establecer su orden de proveedor predeterminado en [Configuración del proveedor de inferencia](https://hf.co/settings/inference-providers) (sin sufijo = usar ese orden).

    - **Fusión de configuración:** Las entradas existentes en `models.providers.huggingface.models` (por ejemplo, en `models.json`) se mantienen cuando se fusiona la configuración. Por lo tanto, cualquier `name`, `alias` u opciones de modelo que establezca allí se conservan.

  </Accordion>

  <Accordion title="Configuración del entorno y del demonio">
    Si la puerta de enlace (Gateway) se ejecuta como un demonio (launchd/systemd), asegúrese de que `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN` esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o mediante `env.shellEnv`).

    <Note>
    OpenClaw acepta tanto `HUGGINGFACE_HUB_TOKEN` como `HF_TOKEN` como alias de variables de entorno. Cualquiera de los dos funciona; si ambos están configurados, `HUGGINGFACE_HUB_TOKEN` tiene prioridad.
    </Note>

  </Accordion>

  <Accordion title="Configuración: DeepSeek R1 con respaldo Qwen">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-R1",
            fallbacks: ["huggingface/Qwen/Qwen3-8B"],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Config: Qwen con las variantes más baratas y rápidas">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen3-8B" },
          models: {
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
            "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B (cheapest)" },
            "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B (fastest)" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Config: DeepSeek + Llama + GPT-OSS con alias">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
            fallbacks: [
              "huggingface/meta-llama/Llama-3.3-70B-Instruct",
              "huggingface/openai/gpt-oss-120b",
            ],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-V3.2": { alias: "DeepSeek V3.2" },
            "huggingface/meta-llama/Llama-3.3-70B-Instruct": { alias: "Llama 3.3 70B" },
            "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Config: Múltiples Qwen y DeepSeek con sufijos de política">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
          models: {
            "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
            "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B (cheap)" },
            "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fast)" },
            "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/models" icon="brain">
    Cómo elegir y configurar modelos.
  </Card>
  <Card title="Documentación de proveedores de inferencia" href="https://huggingface.co/docs/inference-providers" icon="book">
    Documentación oficial de Hugging Face Inference Providers.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
</CardGroup>
