---
title: "Together AI"
summary: "Configuración de Together AI (autenticación + selección de modelo)"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

El [Together AI](https://together.ai) proporciona acceso a modelos de código abierto líderes, incluidos Llama, DeepSeek, Kimi y más, a través de una API unificada.

- Proveedor: `together`
- Autenticación: `TOGETHER_API_KEY`
- API: Compatible con OpenAI
- URL base: `https://api.together.xyz/v1`

## Inicio rápido

1. Configure la clave API (recomendado: guárdela para la Gateway):

```bash
openclaw onboard --auth-choice together-api-key
```

2. Establezca un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "together/moonshotai/Kimi-K2.5" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

Esto establecerá `together/moonshotai/Kimi-K2.5` como el modelo predeterminado.

## Nota sobre el entorno

Si la Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `TOGETHER_API_KEY`
esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).

## Catálogo integrado

OpenClaw incluye actualmente este catálogo agrupado de Together:

| Ref. de modelo                                               | Nombre                                 | Entrada       | Contexto   | Notas                                          |
| ------------------------------------------------------------ | -------------------------------------- | ------------- | ---------- | ---------------------------------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | texto, imagen | 262,144    | Modelo predeterminado; razonamiento habilitado |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | texto         | 202,752    | Modelo de texto de propósito general           |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | texto         | 131,072    | Modelo de instrucciones rápido                 |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | texto, imagen | 10,000,000 | Multimodal                                     |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | texto, imagen | 20,000,000 | Multimodal                                     |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | texto         | 131,072    | Modelo de texto general                        |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | texto         | 131,072    | Modelo de razonamiento                         |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | texto         | 262,144    | Modelo de texto Kimi secundario                |

La configuración de incorporación establece `together/moonshotai/Kimi-K2.5` como el modelo predeterminado.

## Generación de video

El complemento `together` incluido también registra la generación de video a través de la
herramienta compartida `video_generate`.

- Modelo de video predeterminado: `together/Wan-AI/Wan2.2-T2V-A14B`
- Modos: flujos de texto a video y de referencia de imagen única
- Admite `aspectRatio` y `resolution`

Para usar Together como el proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

Consulte [Video Generation](/en/tools/video-generation) para obtener los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.
