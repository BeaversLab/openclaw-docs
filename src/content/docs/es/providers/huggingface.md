---
summary: "Configuración de Hugging Face Inference (autenticación y selección de modelo)"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inferencia)"
---

# Hugging Face (Inference)

[Los proveedores de inferencia de Hugging Face](https://huggingface.co/docs/inference-providers) ofrecen finalizaciones de chat compatibles con OpenAI a través de una única API de enrutamiento. Obtienes acceso a muchos modelos (DeepSeek, Llama y más) con un solo token. OpenClaw utiliza el **endpoint compatible con OpenAI** (solo finalizaciones de chat); para texto a imagen, incrustaciones o voz, usa los [clientes de inferencia de HF](https://huggingface.co/docs/api-inference/quicktour) directamente.

- Proveedor: `huggingface`
- Autenticación: `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN` (token de granularidad fina con **Make calls to Inference Providers**)
- API: Compatible con OpenAI (`https://router.huggingface.co/v1`)
- Facturación: Token único de HF; los [precios](https://huggingface.co/docs/inference-providers/pricing) siguen las tarifas del proveedor con un nivel gratuito.

## Inicio rápido

1. Crea un token de granularidad fina en [Hugging Face → Configuración → Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) con el permiso **Make calls to Inference Providers**.
2. Ejecute la incorporación y elija **Hugging Face** en el menú desplegable de proveedores, luego ingrese su clave de API cuando se le solicite:

```bash
openclaw onboard --auth-choice huggingface-api-key
```

3. En el menú desplegable **Modelo Hugging Face predeterminado**, elija el modelo que desee (la lista se carga desde la API de inferencia cuando tiene un token válido; de lo contrario, se muestra una lista integrada). Su elección se guarda como el modelo predeterminado.
4. También puede establecer o cambiar el modelo predeterminado más adelante en la configuración:

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

Esto establecerá `huggingface/deepseek-ai/DeepSeek-R1` como el modelo predeterminado.

## Nota sobre el entorno

Si la Gateway se ejecuta como un demonio (launchd/systemd), asegúrate de que `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`
esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).

## Menú desplegable de descubrimiento e incorporación de modelos

OpenClaw descubre los modelos llamando al **extremo de inferencia directamente**:

```bash
GET https://router.huggingface.co/v1/models
```

(Opcional: envía `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` o `$HF_TOKEN` para obtener la lista completa; algunos endpoints devuelven un subconjunto sin autenticación.) La respuesta es `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }` estilo OpenAI.

Cuando configuras una clave de API de Hugging Face (vía incorporación, `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`), OpenClaw usa este GET para descubrir los modelos de completado de chat disponibles. Durante la **configuración interactiva**, después de ingresar tu token, verás un menú desplegable de **Modelo Hugging Face predeterminado** rellenado desde esa lista (o el catálogo integrado si falla la solicitud). En tiempo de ejecución (por ejemplo, al iniciar Gateway), cuando hay una clave presente, OpenClaw vuelve a llamar a **GET** `https://router.huggingface.co/v1/models` para actualizar el catálogo. La lista se fusiona con un catálogo integrado (para metadatos como la ventana de contexto y el costo). Si falla la solicitud o no se establece ninguna clave, solo se usa el catálogo integrado.

## Nombres de modelo y opciones editables

- **Nombre desde la API:** El nombre para mostrar del modelo se **obtiene de GET /v1/models** cuando la API devuelve `name`, `title` o `display_name`; de lo contrario, se deriva del id del modelo (por ejemplo, `deepseek-ai/DeepSeek-R1` → "DeepSeek R1").
- **Anular el nombre para mostrar:** Puedes establecer una etiqueta personalizada por modelo en la configuración para que aparezca como desees en la CLI y la interfaz de usuario:

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

- **Sufijos de política:** La documentación y las herramientas de Hugging Face incluidas en OpenClaw tratan actualmente estos dos sufijos como las variantes de política integradas:
  - **`:fastest`** — mayor rendimiento.
  - **`:cheapest`** — menor costo por token de salida.

  Puedes agregarlos como entradas separadas en `models.providers.huggingface.models` o establecer `model.primary` con el sufijo. También puedes establecer el orden predeterminado de tu proveedor en [Configuración del proveedor de inferencia](https://hf.co/settings/inference-providers) (sin sufijo = usar ese orden).

- **Fusión de configuración:** Las entradas existentes en `models.providers.huggingface.models` (por ejemplo, en `models.json`) se mantienen cuando se fusiona la configuración. Por lo tanto, cualquier `name`, `alias` u opciones de modelo personalizadas que establezcas allí se conservan.

## IDs de modelo y ejemplos de configuración

Las referencias de modelos usan el formato `huggingface/<org>/<model>` (IDs estilo Hub). La lista de abajo proviene de **GET** `https://router.huggingface.co/v1/models`; tu catálogo puede incluir más.

**IDs de ejemplo (desde el punto final de inferencia):**

| Modelo                 | Ref (prefijar con `huggingface/`)   |
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

Puedes agregar `:fastest` o `:cheapest` al ID del modelo. Establece tu orden predeterminado en la configuración del [Proveedor de Inferencia](https://hf.co/settings/inference-providers); consulta [Proveedores de Inferencia](https://huggingface.co/docs/inference-providers) y **GET** `https://router.huggingface.co/v1/models` para ver la lista completa.

### Ejemplos de configuración completa

**DeepSeek R1 principal con Qwen de respaldo:**

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

**Qwen como predeterminado, con variantes :cheapest y :fastest:**

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

**DeepSeek + Llama + GPT-OSS con alias:**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
        fallbacks: ["huggingface/meta-llama/Llama-3.3-70B-Instruct", "huggingface/openai/gpt-oss-120b"],
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

**Múltiples modelos Qwen y DeepSeek con sufijos de política:**

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
