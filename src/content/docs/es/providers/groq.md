---
summary: "Configuración de Groq (autenticación + selección de modelo + transcripción Whisper)"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
  - You are configuring Whisper audio transcription on Groq
---

[Groq](https://groq.com) proporciona una inferencia ultrarrápida en modelos de pesos abiertos (Llama, Gemma, Kimi, Qwen, GPT OSS y más) utilizando hardware LPU personalizado. OpenClaw incluye un complemento Groq integrado que registra tanto un proveedor de chat compatible con OpenAI como un proveedor de comprensión de medios de audio.

| Propiedad                            | Valor                                        |
| ------------------------------------ | -------------------------------------------- |
| ID del proveedor                     | `groq`                                       |
| Complemento                          | incluido, `enabledByDefault: true`           |
| Variable de entorno de autenticación | `GROQ_API_KEY`                               |
| Indicador de incorporación           | `--auth-choice groq-api-key`                 |
| API                                  | Compatible con OpenAI (`openai-completions`) |
| URL base                             | `https://api.groq.com/openai/v1`             |
| Transcripción de audio               | `whisper-large-v3-turbo` (predeterminado)    |
| Predeterminado de chat sugerido      | `groq/llama-3.3-70b-versatile`               |

## Para empezar

<Steps>
  <Step title="Obtén una clave de API">
    Crea una clave de API en [console.groq.com/keys](https://console.groq.com/keys).
  </Step>
  <Step title="Establecer la clave de API">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice groq-api-key
```

```bash Env only
export GROQ_API_KEY=gsk_...
```

    </CodeGroup>

  </Step>
  <Step title="Set a default model">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/llama-3.3-70b-versatile" },
        },
      },
    }
    ```
  </Step>
  <Step title="Verify the catalog is reachable">
    ```bash
    openclaw models list --provider groq
    ```
  </Step>
</Steps>

### Ejemplo de archivo de configuración

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## Catálogo integrado

OpenClaw incluye un catálogo Groq respaldado por manifiesto con entradas de razonamiento y no razonamiento. Ejecute `openclaw models list --provider groq` para ver las filas incluidas en su versión instalada, o consulte [console.groq.com/docs/models](https://console.groq.com/docs/models) para ver la lista autoritativa de Groq.

| Ref. del modelo                                      | Nombre                        | Razonamiento | Entrada        | Contexto |
| ---------------------------------------------------- | ----------------------------- | ------------ | -------------- | -------- |
| `groq/llama-3.3-70b-versatile`                       | Llama 3.3 70B Versátil        | no           | texto          | 131,072  |
| `groq/llama-3.1-8b-instant`                          | Llama 3.1 8B Instant          | no           | texto          | 131,072  |
| `groq/meta-llama/llama-4-maverick-17b-128e-instruct` | Llama 4 Maverick 17B          | no           | texto + imagen | 131,072  |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct`     | Llama 4 Scout 17B             | no           | texto + imagen | 131,072  |
| `groq/llama3-70b-8192`                               | Llama 3 70B                   | no           | texto          | 8,192    |
| `groq/llama3-8b-8192`                                | Llama 3 8B                    | no           | texto          | 8,192    |
| `groq/gemma2-9b-it`                                  | Gemma 2 9B                    | no           | texto          | 8,192    |
| `groq/mistral-saba-24b`                              | Mistral Saba 24B              | no           | texto          | 32,768   |
| `groq/moonshotai/kimi-k2-instruct`                   | Kimi K2 Instruct              | no           | texto          | 131,072  |
| `groq/moonshotai/kimi-k2-instruct-0905`              | Kimi K2 Instruct 0905         | no           | texto          | 262,144  |
| `groq/openai/gpt-oss-120b`                           | GPT OSS 120B                  | sí           | texto          | 131,072  |
| `groq/openai/gpt-oss-20b`                            | GPT OSS 20B                   | sí           | texto          | 131,072  |
| `groq/openai/gpt-oss-safeguard-20b`                  | Safety GPT OSS 20B            | sí           | texto          | 131,072  |
| `groq/qwen-qwq-32b`                                  | Qwen QwQ 32B                  | sí           | texto          | 131,072  |
| `groq/qwen/qwen3-32b`                                | Qwen3 32B                     | sí           | texto          | 131,072  |
| `groq/deepseek-r1-distill-llama-70b`                 | DeepSeek R1 Distill Llama 70B | sí           | texto          | 131,072  |
| `groq/groq/compound`                                 | Compound                      | sí           | texto          | 131,072  |
| `groq/groq/compound-mini`                            | Compound Mini                 | sí           | texto          | 131,072  |

<Tip>El catálogo evoluciona con cada lanzamiento de OpenClaw. `openclaw models list --provider groq` muestra las filas conocidas por su versión instalada; verifique en [console.groq.com/docs/models](https://console.groq.com/docs/models) los modelos recién agregados o obsoletos.</Tip>

## Modelos de razonamiento

OpenClaw asigna sus niveles `/think` compartidos a los valores `reasoning_effort` específicos del modelo de Groq:

- Para `qwen/qwen3-32b`, el pensamiento deshabilitado envía `none` y el pensamiento habilitado envía `default`.
- Para los modelos de razonamiento Groq GPT OSS (`openai/gpt-oss-*`), OpenClaw envía `low`, `medium` o `high` según el nivel `/think`. El pensamiento deshabilitado omite `reasoning_effort` porque esos modelos no admiten un valor deshabilitado.
- DeepSeek R1 Distill, Qwen QwQ y Compound utilizan la superficie de razonamiento nativa de Groq; `/think` controla la visibilidad, pero el modelo siempre razona.

Consulte [Modos de pensamiento](/es/tools/thinking) para conocer los niveles `/think` compartidos y cómo OpenClaw los traduce para cada proveedor.

## Transcripción de audio

El complemento incluido de Groq también registra un **proveedor de comprensión de medios de audio** para que los mensajes de voz se puedan transcribir a través de la superficie `tools.media.audio` compartida.

| Propiedad                        | Valor                                         |
| -------------------------------- | --------------------------------------------- |
| Ruta de configuración compartida | `tools.media.audio`                           |
| URL base predeterminada          | `https://api.groq.com/openai/v1`              |
| Modelo predeterminado            | `whisper-large-v3-turbo`                      |
| Prioridad automática             | 20                                            |
| Punto final de la API            | Compatible con OpenAI `/audio/transcriptions` |

Para convertir a Groq en el backend de audio predeterminado:

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Disponibilidad del entorno para el demonio">
    Si el Gateway se ejecuta como un servicio gestionado (launchd, systemd, Docker), `GROQ_API_KEY` debe ser visible para ese proceso, no solo para su shell interactivo.

    <Warning>
      Una clave exportada solo en un shell interactivo no ayudará a un demonio launchd o systemd a menos que ese entorno también se importe allí. Establezca la clave en `~/.openclaw/.env` o a través de `env.shellEnv` para que sea legible desde el proceso del gateway.
    </Warning>

  </Accordion>

  <Accordion title="Custom Groq model ids">
    OpenClaw acepta cualquier id de modelo de Groq en tiempo de ejecución. Use el id exacto mostrado por Groq y prefíjelo con `groq/`. El catálogo incluido cubre los casos comunes; los ids no catalogados pasan a la plantilla compatible con OpenAI predeterminada.

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/<your-model-id>" },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Modos de pensamiento" href="/es/tools/thinking" icon="brain">
    Niveles de esfuerzo de razonamiento e interacción con la política del proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo, incluidos los ajustes de proveedor y de audio.
  </Card>
  <Card title="Consola de Groq" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Panel de Groq, documentación de la API y precios.
  </Card>
</CardGroup>
