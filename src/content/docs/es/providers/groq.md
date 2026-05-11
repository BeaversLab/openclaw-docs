---
summary: "Configuración de Groq (autenticación + selección de modelo)"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

[Groq](https://groq.com) ofrece inferencia ultrarrápida en modelos de código abierto
(Llama, Gemma, Mistral y más) utilizando hardware LPU personalizado. OpenClaw se conecta
a Groq a través de su API compatible con OpenAI.

| Propiedad     | Valor                 |
| ------------- | --------------------- |
| Proveedor     | `groq`                |
| Autenticación | `GROQ_API_KEY`        |
| API           | Compatible con OpenAI |

## Para empezar

<Steps>
  <Step title="Obtén una clave de API">
    Crea una clave de API en [console.groq.com/keys](https://console.groq.com/keys).
  </Step>
  <Step title="Establece la clave de API">
    ```bash
    export GROQ_API_KEY="gsk_..."
    ```
  </Step>
  <Step title="Establece un modelo predeterminado">
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

El catálogo de modelos de Groq cambia con frecuencia. Ejecuta `openclaw models list | grep groq`
para ver los modelos disponibles actualmente, o verifica
[console.groq.com/docs/models](https://console.groq.com/docs/models).

| Modelo                     | Notas                                 |
| -------------------------- | ------------------------------------- |
| **Llama 3.3 70B Versátil** | Uso general, contexto amplio          |
| **Llama 3.1 8B Instant**   | Rápido, ligero                        |
| **Gemma 2 9B**             | Compacto, eficiente                   |
| **Mixtral 8x7B**           | Arquitectura MoE, razonamiento sólido |

<Tip>Usa `openclaw models list --provider groq` para obtener la lista más actualizada de modelos disponibles en tu cuenta.</Tip>

## Modelos de razonamiento

OpenClaw asigna sus niveles compartidos de `/think` a los valores específicos
`reasoning_effort` de los modelos de Groq. Para `qwen/qwen3-32b`, el pensamiento desactivado envía
`none` y el pensamiento activado envía `default`. Para los modelos de razonamiento Groq GPT-OSS,
OpenClaw envía `low`, `medium` o `high`; el pensamiento desactivado omite
`reasoning_effort` porque esos modelos no admiten un valor desactivado.

## Transcripción de audio

Groq también ofrece transcripción de audio rápida basada en Whisper. Cuando se configura como un proveedor de comprensión de medios, OpenClaw utiliza el modelo `whisper-large-v3-turbo` de Groq para transcribir mensajes de voz a través de la superficie compartida `tools.media.audio`.

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
  <Accordion title="Detalles de la transcripción de audio">
    | Propiedad | Valor |
    |----------|-------|
    | Ruta de configuración compartida | `tools.media.audio` |
    | URL base predeterminada   | `https://api.groq.com/openai/v1` |
    | Modelo predeterminado      | `whisper-large-v3-turbo` |
    | Endpoint de API       | Compatible con OpenAI `/audio/transcriptions` |
  </Accordion>

  <Accordion title=""Nota sobre el entorno%%PH::JSX_ATTR:18:8a331fdd%%>
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GROQ_API_KEY` esté
    disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
    `env.shellEnv`).

    <Warning>
    Las claves establecidas solo en su shell interactivo no son visibles para los procesos de
    gateway administrados por demonios. Use la configuración `~/.openclaw/.env` o `env.shellEnv` para
    disponibilidad persistente.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo, incluyendo proveedores y configuraciones de audio.
  </Card>
  <Card title="Consola de Groq" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Panel de control de Groq, documentación de la API y precios.
  </Card>
  <Card title="Lista de modelos de Groq" href="https://console.groq.com/docs/models" icon="list">
    Catálogo oficial de modelos de Groq.
  </Card>
</CardGroup>
