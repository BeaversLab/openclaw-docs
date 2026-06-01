---
summary: "Configuración de Together AI (autenticación + selección de modelo)"
title: "Together AI"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

[Together AI](https://together.ai) proporciona acceso a modelos de código abierto líderes, incluyendo Llama, DeepSeek, Kimi y más, a través de una API unificada.

| Propiedad     | Valor                         |
| ------------- | ----------------------------- |
| Proveedor     | `together`                    |
| Autenticación | `TOGETHER_API_KEY`            |
| API           | Compatible con OpenAI         |
| URL base      | `https://api.together.xyz/v1` |

## Primeros pasos

<Steps>
  <Step title="Obtener una clave de API">
    Cree una clave de API en
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys).
  </Step>
  <Step title="Ejecutar la incorporación">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="Establecer un modelo predeterminado">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "together/meta-llama/Llama-3.3-70B-Instruct-Turbo",
          },
        },
      },
    }
    ```
  </Step>
</Steps>

### Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>La configuración de incorporación establece `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` como el modelo predeterminado.</Note>

## Catálogo integrado

OpenClaw incluye este catálogo integrado de Together:

| Ref. de modelo                                     | Nombre                       | Entrada       | Contexto | Notas                           |
| -------------------------------------------------- | ---------------------------- | ------------- | -------- | ------------------------------- |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` | Llama 3.3 70B Instruct Turbo | texto         | 131,072  | Modelo predeterminado           |
| `together/moonshotai/Kimi-K2.6`                    | Kimi K2.6 FP4                | texto, imagen | 262,144  | Modelo de razonamiento Kimi     |
| `together/deepseek-ai/DeepSeek-V4-Pro`             | DeepSeek V4 Pro              | texto         | 512,000  | Modelo de texto de razonamiento |
| `together/Qwen/Qwen2.5-7B-Instruct-Turbo`          | Qwen2.5 7B Instruct Turbo    | texto         | 32,768   | Modelo de texto rápido          |
| `together/zai-org/GLM-5.1`                         | GLM 5.1 FP4                  | texto         | 202,752  | Modelo de texto de razonamiento |

## Generación de video

El complemento incluido `together` también registra la generación de video a través de la herramienta compartida `video_generate`.

| Propiedad                      | Valor                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| Modelo de video predeterminado | `together/Wan-AI/Wan2.2-T2V-A14B`                                           |
| Modos                          | texto a video; referencia de imagen única solo con `Wan-AI/Wan2.2-I2V-A14B` |
| Parámetros admitidos           | `aspectRatio`, `resolution`                                                 |

Para usar Together como proveedor de video predeterminado:

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

<Tip>Consulte [Video Generation](/es/tools/video-generation) para conocer los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.</Tip>

<AccordionGroup>
  <Accordion title="Nota sobre el entorno">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de
    que `TOGETHER_API_KEY` esté disponible para ese proceso (por ejemplo, en
    `~/.openclaw/.env` o mediante `env.shellEnv`).

    <Warning>
    Las claves establecidas solo en su shell interactivo no son visibles para los procesos
    de gateway gestionados por demonios. Use `~/.openclaw/.env` o la configuración `env.shellEnv` para
    disponibilidad persistente.
    </Warning>

  </Accordion>

  <Accordion title="Solución de problemas">
    - Verifique que su clave funcione: `openclaw models list --provider together`
    - Si los modelos no aparecen, confirme que la clave API está establecida en el entorno
      correcto para su proceso Gateway.
    - Las referencias de modelos usan el formato `together/<model-id>`.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Reglas del proveedor, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de generación de video y selección de proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo, incluida la configuración del proveedor.
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Panel de Together AI, documentación de la API y precios.
  </Card>
</CardGroup>
