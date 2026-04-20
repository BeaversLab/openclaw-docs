---
title: "Groq"
summary: "Configuración de Groq (autenticación + selección de modelo)"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Groq

[Groq](https://groq.com) ofrece una inferencia ultra rápida en modelos de código abierto
(Llama, Gemma, Mistral y más) utilizando hardware LPU personalizado. OpenClaw se conecta
a Groq a través de su API compatible con OpenAI.

| Propiedad     | Valor                 |
| ------------- | --------------------- |
| Proveedor     | `groq`                |
| Autenticación | `GROQ_API_KEY`        |
| API           | Compatible con OpenAI |

## Primeros pasos

<Steps>
  <Step title="Obtener una clave de API">
    Cree una clave de API en [console.groq.com/keys](https://console.groq.com/keys).
  </Step>
  <Step title="Establecer la clave de API">
    ```bash
    export GROQ_API_KEY="gsk_..."
    ```
  </Step>
  <Step title="Establecer un modelo por defecto">
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

## Modelos disponibles

El catálogo de modelos de Groq cambia con frecuencia. Ejecute `openclaw models list | grep groq`
para ver los modelos actualmente disponibles, o consulte
[console.groq.com/docs/models](https://console.groq.com/docs/models).

| Modelo                     | Notas                                 |
| -------------------------- | ------------------------------------- |
| **Llama 3.3 70B Versátil** | Uso general, contexto grande          |
| **Llama 3.1 8B Instant**   | Rápido, ligero                        |
| **Gemma 2 9B**             | Compacto, eficiente                   |
| **Mixtral 8x7B**           | Arquitectura MoE, razonamiento fuerte |

<Tip>Use `openclaw models list --provider groq` para la lista más actualizada de modelos disponibles en su cuenta.</Tip>

## Transcripción de audio

Groq también ofrece una transcripción de audio rápida basada en Whisper. Cuando se configura como un
proveedor de comprensión de medios, OpenClaw utiliza el modelo `whisper-large-v3-turbo`
de Groq para transcribir mensajes de voz a través de la superficie compartida `tools.media.audio`.

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

  <Accordion title="Nota sobre el entorno">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GROQ_API_KEY` esté
    disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
    `env.shellEnv`).

    <Warning>
    Las claves establecidas solo en su shell interactivo no son visibles para los procesos de
    gateway administrados por demonios. Use la configuración de `~/.openclaw/.env` o `env.shellEnv` para
    disponibilidad persistente.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo, incluyendo la configuración de proveedor y de audio.
  </Card>
  <Card title="Consola de Groq" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Panel de Groq, documentación de la API y precios.
  </Card>
  <Card title="Lista de modelos de Groq" href="https://console.groq.com/docs/models" icon="list">
    Catálogo oficial de modelos de Groq.
  </Card>
</CardGroup>
