---
summary: "Configuración de Hugging Face Inference (autenticación + selección de modelo)"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inference)"
---

# Hugging Face (Inference)

[Los proveedores de Hugging Face Inference](https://huggingface.co/docs/inference-providers) ofrecen finalizaciones de chat compatibles con OpenAI a través de una única API de enrutador. Obtiene acceso a muchos modelos (DeepSeek, Llama y más) con un solo token. OpenClaw utiliza el **extremo compatible con OpenAI** (solo finalizaciones de chat); para texto a imagen, incrustaciones o voz, use los [clientes de inferencia de HF](https://huggingface.co/docs/api-inference/quicktour) directamente.

- Proveedor: `huggingface`
- Autenticación: `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN` (token de grano fino con **Make calls to Inference Providers**)
- API: Compatible con OpenAI (`https://router.huggingface.co/v1`)
- Facturación: token único de HF; los [precios](https://huggingface.co/docs/inference-providers/pricing) siguen las tarifas del proveedor con un nivel gratuito.

## Inicio rápido

1. Cree un token de grano fino en [Hugging Face → Configuración → Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) con el permiso **Make calls to Inference Providers**.
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

Si Gateway se ejecuta como demonio (launchd/systemd), asegúrese de que `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`
estén disponibles para ese proceso (por ejemplo, en `~/.openclaw/.env` o vía
`env.shellEnv`).

## Menú desplegable de descubrimiento e incorporación de modelos

OpenClaw descubre los modelos llamando al **extremo de inferencia directamente**:

```bash
GET https://router.huggingface.co/v1/models
```

(Opcional: envíe `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` o `$HF_TOKEN` para la lista completa; algunos extremos devuelven un subconjunto sin autenticación). La respuesta es de estilo OpenAI `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`.

Cuando configuras una clave de API de Hugging Face (a través del onboarding, `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`), OpenClaw usa este GET para descubrir los modelos de completado de chat disponibles. Durante la **configuración interactiva**, después de ingresar tu token, verás un menú desplegable de **Modelo Hugging Face predeterminado** rellenado con esa lista (o el catálogo integrado si la solicitud falla). En tiempo de ejecución (por ejemplo, al iniciar Gateway), cuando hay una clave presente, OpenClaw vuelve a llamar a **GET** `https://router.huggingface.co/v1/models` para actualizar el catálogo. La lista se fusiona con un catálogo integrado (para metadatos como la ventana de contexto y el costo). Si la solicitud falla o no se establece ninguna clave, solo se usa el catálogo integrado.

## Nombres de modelo y opciones editables

- **Nombre de la API:** El nombre para mostrar del modelo se **obtiene de GET /v1/models** cuando la API devuelve `name`, `title` o `display_name`; de lo contrario, se deriva del id del modelo (p. ej., `deepseek-ai/DeepSeek-R1` → "DeepSeek R1").
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

- **Selección de proveedor/política:** Agrega un sufijo al **id del modelo** para elegir cómo el enrutador selecciona el backend:
  - **`:fastest`** — el mayor rendimiento (el enrutador elige; la elección del proveedor está **bloqueada**; no hay selector interactivo de backend).
  - **`:cheapest`** — el menor costo por token de salida (el enrutador elige; la elección del proveedor está **bloqueada**).
  - **`:provider`** — fuerza un backend específico (p. ej., `:sambanova`, `:together`).

  Cuando seleccionas **:cheapest** o **:fastest** (p. ej., en el menú desplegable de modelo de incorporación), el proveedor está bloqueado: el enrutador decide por costo o velocidad y no se muestra el paso opcional "preferir backend específico". Puedes agregar estos como entradas separadas en `models.providers.huggingface.models` o establecer `model.primary` con el sufijo. También puedes establecer tu orden predeterminado en [Configuración del proveedor de inferencia](https://hf.co/settings/inference-providers) (sin sufijo = usar ese orden).

- **Fusión de configuración:** Las entradas existentes en `models.providers.huggingface.models` (por ejemplo, en `models.json`) se mantienen cuando se fusiona la configuración. Por lo tanto, cualquier `name`, `alias` u opciones de modelo que establezcas allí se conservan.

## ID de modelo y ejemplos de configuración

Las referencias de modelo utilizan el formato `huggingface/<org>/<model>` (ID estilo Hub). La lista de abajo proviene de **GET** `https://router.huggingface.co/v1/models`; tu catálogo puede incluir más.

**ID de ejemplo (desde el punto final de inferencia):**

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

Puedes añadir `:fastest`, `:cheapest` o `:provider` (por ejemplo, `:together`, `:sambanova`) al ID del modelo. Establece tu orden predeterminado en [Configuración del proveedor de inferencia](https://hf.co/settings/inference-providers); consulta [Proveedores de inferencia](https://huggingface.co/docs/inference-providers) y **GET** `https://router.huggingface.co/v1/models` para ver la lista completa.

### Ejemplos de configuración completa

**DeepSeek R1 principal con respaldo Qwen:**

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

**Forzar un backend específico con :provider:**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1:together" },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1:together": { alias: "DeepSeek R1 (Together)" },
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

import es from "/components/footer/es.mdx";

<es />
