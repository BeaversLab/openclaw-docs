---
summary: "Configuración de Cerebras (autenticación + selección de modelo)"
title: "Cerebras"
read_when:
  - You want to use Cerebras with OpenClaw
  - You need the Cerebras API key env var or CLI auth choice
---

[Cerebras](https://www.cerebras.ai) proporciona inferencia de alta velocidad compatible con OpenAI en hardware de inferencia personalizado. OpenClaw incluye un complemento de proveedor de Cerebras integrado con un catálogo estático de cuatro modelos.

| Propiedad                            | Valor                                        |
| ------------------------------------ | -------------------------------------------- |
| ID del proveedor                     | `cerebras`                                   |
| Plugin                               | integrado, `enabledByDefault: true`          |
| Variable de entorno de autenticación | `CEREBRAS_API_KEY`                           |
| Parámetro de incorporación           | `--auth-choice cerebras-api-key`             |
| Parámetro directo de CLI             | `--cerebras-api-key <key>`                   |
| API                                  | Compatible con OpenAI (`openai-completions`) |
| URL base                             | `https://api.cerebras.ai/v1`                 |
| Modelo predeterminado                | `cerebras/zai-glm-4.7`                       |

## Introducción

<Steps>
  <Step title="Get an API key">
    Cree una clave API en la [Cerebras Cloud Console](https://cloud.cerebras.ai).
  </Step>
  <Step title="Ejecuta la incorporación">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice cerebras-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

```bash Env only
export CEREBRAS_API_KEY=csk-...
```

    </CodeGroup>

  </Step>
  <Step title="Verifica que los modelos estén disponibles">
    ```bash
    openclaw models list --provider cerebras
    ```

    La lista debe incluir los cuatro modelos integrados. Si `CEREBRAS_API_KEY` no está resuelto, `openclaw models status --json` informa la credencial faltante en `auth.unusableProfiles`.

  </Step>
</Steps>

## Configuración no interactiva

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## Catálogo integrado

OpenClaw incluye un catálogo estático de Cerebras que refleja el punto final público compatible con OpenAI. Los cuatro modelos comparten un contexto de 128k y un máximo de 8192 tokens de salida.

| Referencia del modelo                     | Nombre               | Razonamiento | Notas                                                         |
| ----------------------------------------- | -------------------- | ------------ | ------------------------------------------------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | sí           | Modelo predeterminado; modelo de razonamiento en vista previa |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | sí           | Modelo de razonamiento de producción                          |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | no           | Modelo sin razonamiento en vista previa                       |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | no           | Modelo de producción centrado en la velocidad                 |

<Warning>Cerebras marca `zai-glm-4.7` y `qwen-3-235b-a22b-instruct-2507` como modelos de vista previa, y se documenta que `llama3.1-8b` más `qwen-3-235b-a22b-instruct-2507` quedarán obsoletos el 27 de mayo de 2026. Consulta la página de modelos compatibles de Cerebras antes de confiar en ellos para cargas de trabajo de producción.</Warning>

## Configuración manual

El complemento incluido generalmente significa que solo necesitas la clave API. Usa una configuración explícita de `models.providers.cerebras` cuando quieras anular los metadatos del modelo o ejecutar en `mode: "merge"` contra el catálogo estático:

```json5
{
  env: { CEREBRAS_API_KEY: "csk-..." },
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

<Note>Si el Gateway se ejecuta como un demonio (launchd, systemd, Docker), asegúrese de que `CEREBRAS_API_KEY` esté disponible para ese proceso, por ejemplo en `~/.openclaw/.env` o a través de `env.shellEnv`. Una clave exportada solo en un shell interactivo no ayudará a un servicio administrado a menos que el entorno se importe por separado.</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Modos de pensamiento" href="/es/tools/thinking" icon="brain">
    Niveles de esfuerzo de razonamiento para los dos modelos de Cerebras con capacidad de razonamiento.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults" icon="gear">
    Valores predeterminados del agente y configuración del modelo.
  </Card>
  <Card title="Preguntas frecuentes sobre modelos" href="/es/help/faq-models" icon="circle-question">
    Perfiles de autenticación, cambio de modelos y resolución de errores "no profile".
  </Card>
</CardGroup>
