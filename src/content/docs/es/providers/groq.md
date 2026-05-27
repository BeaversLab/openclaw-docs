---
summary: "Configuración de Groq (autenticación + selección de modelo + transcripción Whisper)"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
  - You are configuring Whisper audio transcription on Groq
---

[Groq](https://groq.com) proporciona inferencia ultrarrápida en modelos de pesos abiertos (Llama, Gemma, Kimi, Qwen, GPT OSS y más) utilizando hardware LPU personalizado. OpenClaw incluye un complemento Groq integrado que registra tanto un proveedor de chat compatible con OpenAI como un proveedor de comprensión de medios de audio.

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
  <Step title="Obtener una clave de API">
    Cree una clave de API en [console.groq.com/keys](https://console.groq.com/keys).
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

OpenClaw incluye un catálogo Groq respaldado por manifiesto con entradas de razonamiento y sin razonamiento. Ejecute `openclaw models list --provider groq` para ver las filas incluidas en su versión instalada, o consulte [console.groq.com/docs/models](https://console.groq.com/docs/models) para obtener la lista autorizada de Groq.

| Ref. del modelo                                  | Nombre                 | Razonamiento | Entrada        | Contexto |
| ------------------------------------------------ | ---------------------- | ------------ | -------------- | -------- |
| `groq/llama-3.3-70b-versatile`                   | Llama 3.3 70B Versátil | no           | texto          | 131,072  |
| `groq/llama-3.1-8b-instant`                      | Llama 3.1 8B Instant   | no           | texto          | 131,072  |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Llama 4 Scout 17B      | no           | texto + imagen | 131,072  |
| `groq/openai/gpt-oss-120b`                       | GPT OSS 120B           | sí           | texto          | 131,072  |
| `groq/openai/gpt-oss-20b`                        | GPT OSS 20B            | sí           | texto          | 131,072  |
| `groq/openai/gpt-oss-safeguard-20b`              | Safety GPT OSS 20B     | sí           | texto          | 131,072  |
| `groq/qwen/qwen3-32b`                            | Qwen3 32B              | sí           | texto          | 131,072  |
| `groq/groq/compound`                             | Compound               | sí           | texto          | 131,072  |
| `groq/groq/compound-mini`                        | Compound Mini          | sí           | texto          | 131,072  |

<Tip>El catálogo evoluciona con cada lanzamiento de OpenClaw. `openclaw models list --provider groq` muestra las filas conocidas por su versión instalada; verifíquelo con [console.groq.com/docs/models](https://console.groq.com/docs/models) para modelos recién agregados o desaprobados.</Tip>

## Modelos de razonamiento

OpenClaw asigna sus niveles compartidos de `/think` a los valores específicos del modelo `reasoning_effort` de Groq:

- Para `qwen/qwen3-32b`, el pensamiento deshabilitado envía `none` y el pensamiento habilitado envía `default`.
- Para los modelos de razonamiento Groq GPT OSS (`openai/gpt-oss-*`), OpenClaw envía `low`, `medium` o `high` según el nivel de `/think`. El pensamiento deshabilitado omite `reasoning_effort` porque esos modelos no admiten un valor deshabilitado.
- DeepSeek R1 Distill, Qwen QwQ y Compound utilizan la superficie de razonamiento nativa de Groq; `/think` controla la visibilidad, pero el modelo siempre razona.

Consulte [Thinking modes](/es/tools/thinking) para ver los niveles `/think` compartidos y cómo OpenClaw los traduce para cada proveedor.

## Transcripción de audio

El complemento incluido de Groq también registra un **proveedor de comprensión de medios de audio** para que los mensajes de voz puedan transcribirse a través de la superficie `tools.media.audio` compartida.

| Propiedad                        | Valor                                         |
| -------------------------------- | --------------------------------------------- |
| Ruta de configuración compartida | `tools.media.audio`                           |
| URL base predeterminada          | `https://api.groq.com/openai/v1`              |
| Modelo predeterminado            | `whisper-large-v3-turbo`                      |
| Prioridad automática             | 20                                            |
| Endpoint de la API               | `/audio/transcriptions` compatible con OpenAI |

Para hacer de Groq el backend de audio predeterminado:

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
    Si el Gateway se ejecuta como servicio gestionado (launchd, systemd, Docker), `GROQ_API_KEY` debe ser visible para ese proceso, no solo para su shell interactivo.

    <Warning>
      Una clave exportada solo en un shell interactivo no ayudará a un demonio launchd o systemd a menos que ese entorno también se importe allí. Establezca la clave en `~/.openclaw/.env` o a través de `env.shellEnv` para que sea legible desde el proceso de la puerta de enlace.
    </Warning>

  </Accordion>

  <Accordion title="IDs de modelos personalizados de Groq">
    OpenClaw acepta cualquier ID de modelo de Groq en tiempo de ejecución. Use el ID exacto que muestra Groq y prefíjelo con `groq/`. El catálogo incluido cubre los casos comunes; los IDs no catalogados pasan a la plantilla predeterminada compatible con OpenAI.

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
    Elegir proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Thinking modes" href="/es/tools/thinking" icon="brain">
    Niveles de esfuerzo de razonamiento e interacción con la política del proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo, incluidos los ajustes del proveedor y de audio.
  </Card>
  <Card title="Consola de Groq" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Panel de Groq, documentación de la API y precios.
  </Card>
</CardGroup>
