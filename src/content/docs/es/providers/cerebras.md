---
summary: "Configuración de Cerebras (autenticación + selección de modelo)"
title: "Cerebras"
read_when:
  - You want to use Cerebras with OpenClaw
  - You need the Cerebras API key env var or CLI auth choice
---

[Cerebras](https://www.cerebras.ai) proporciona inferencia de alta velocidad compatible con OpenAI.

| Propiedad     | Valor                        |
| ------------- | ---------------------------- |
| Proveedor     | `cerebras`                   |
| Autenticación | `CEREBRAS_API_KEY`           |
| API           | Compatible con OpenAI        |
| URL base      | `https://api.cerebras.ai/v1` |

## Primeros pasos

<Steps>
  <Step title="Obtener una clave de API">Cree una clave de API en la [Consola en la nube de Cerebras](https://cloud.cerebras.ai).</Step>
  <Step title="Ejecutar el proceso de incorporación">```bash openclaw onboard --auth-choice cerebras-api-key ```</Step>
  <Step title="Verificar que los modelos estén disponibles">```bash openclaw models list --provider cerebras ```</Step>
</Steps>

### Configuración no interactiva

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## Catálogo integrado

OpenClaw incluye un catálogo estático de Cerebras para el punto final público compatible con OpenAI:

| Ref. de modelo                            | Nombre               | Notas                                                               |
| ----------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | Modelo predeterminado; modelo de razonamiento en versión preliminar |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | Modelo de razonamiento de producción                                |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | Modelo sin razonamiento en versión preliminar                       |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | Modelo de producción centrado en la velocidad                       |

<Warning>Cerebras marca `zai-glm-4.7` y `qwen-3-235b-a22b-instruct-2507` como modelos en versión preliminar, y `llama3.1-8b` / `qwen-3-235b-a22b-instruct-2507` están documentados para ser abandonados el 27 de mayo de 2026. Consulte la página de modelos compatibles de Cerebras antes de confiar en ellos para producción.</Warning>

## Configuración manual

El complemento incluido generalmente significa que solo necesita la clave de API. Utilice una configuración
`models.providers.cerebras` explícita cuando desee anular los metadatos del modelo:

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/zai-glm-4.7" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "Z.ai GLM 4.7" },
          { id: "gpt-oss-120b", name: "GPT OSS 120B" },
        ],
      },
    },
  },
}
```

<Note>Si el Gateway se ejecuta como demonio (launchd/systemd), asegúrese de que `CEREBRAS_API_KEY` esté disponible para ese proceso, por ejemplo en `~/.openclaw/.env` o a través de `env.shellEnv`.</Note>
