---
summary: "Use la API unificada de DeepInfra para acceder a los modelos de código abierto y de vanguardia más populares en OpenClaw"
read_when:
  - You want a single API key for the top open source LLMs
  - You want to run models via DeepInfra's API in OpenClaw
title: "DeepInfra"
---

DeepInfra proporciona una **API unificada** que enruta las solicitudes a los modelos de código abierto y de vanguardia más populares detrás de un único punto de conexión y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan cambiando la URL base.

## Obtención de una clave de API

1. Vaya a [https://deepinfra.com/](https://deepinfra.com/)
2. Inicie sesión o cree una cuenta
3. Navegue a Panel de control / Claves y genere una nueva clave de API o utilice la creada automáticamente

## Configuración de la CLI

```bash
openclaw onboard --deepinfra-api-key <key>
```

O establezca la variable de entorno:

```bash
export DEEPINFRA_API_KEY="<your-deepinfra-api-key>" # pragma: allowlist secret
```

## Fragmento de configuración

```json5
{
  env: { DEEPINFRA_API_KEY: "<your-deepinfra-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V3.2" },
    },
  },
}
```

## Superficies compatibles con OpenClaw

El complemento incluido registra todas las superficies de DeepInfra que coinciden con los contratos de proveedor de OpenClaw actuales:

| Superficie                     | Modelo predeterminado                | Configuración/herramienta de OpenClaw                    |
| ------------------------------ | ------------------------------------ | -------------------------------------------------------- |
| Proveedor de chat/modelo       | `deepseek-ai/DeepSeek-V3.2`          | `agents.defaults.model`                                  |
| Generación/edición de imágenes | `black-forest-labs/FLUX-1-schnell`   | `image_generate`, `agents.defaults.imageGenerationModel` |
| Comprensión de medios          | `moonshotai/Kimi-K2.5` para imágenes | comprensión de imágenes entrantes                        |
| Conversión de voz a texto      | `openai/whisper-large-v3-turbo`      | transcripción de audio entrante                          |
| Conversión de texto a voz      | `hexgrad/Kokoro-82M`                 | `messages.tts.provider: "deepinfra"`                     |
| Generación de video            | `Pixverse/Pixverse-T2V`              | `video_generate`, `agents.defaults.videoGenerationModel` |
| Incrustaciones de memoria      | `BAAI/bge-m3`                        | `agents.defaults.memorySearch.provider: "deepinfra"`     |

DeepInfra también expone reranking, clasificación, detección de objetos y otros tipos de modelos nativos. OpenClaw actualmente no tiene contratos de proveedor de primera clase para esas categorías, por lo que este complemento aún no las registra.

## Modelos disponibles

OpenClaw descubre dinámicamente los modelos de DeepInfra disponibles al inicio. Use
`/models deepinfra` para ver la lista completa de modelos disponibles.

Se puede usar cualquier modelo disponible en [DeepInfra.com](https://deepinfra.com/) con el prefijo `deepinfra/`:

```
deepinfra/MiniMaxAI/MiniMax-M2.5
deepinfra/deepseek-ai/DeepSeek-V3.2
deepinfra/moonshotai/Kimi-K2.5
deepinfra/zai-org/GLM-5.1
...and many more
```

## Notas

- Las referencias de modelo son `deepinfra/<provider>/<model>` (p. ej., `deepinfra/Qwen/Qwen3-Max`).
- Modelo predeterminado: `deepinfra/deepseek-ai/DeepSeek-V3.2`
- URL base: `https://api.deepinfra.com/v1/openai`
- La generación nativa de video usa `https://api.deepinfra.com/v1/inference/<model>`.

## Relacionado

- [Proveedores de modelos](/es/concepts/model-providers)
- [Todos los proveedores](/es/providers/index)
