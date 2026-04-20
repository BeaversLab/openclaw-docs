---
title: "Together AI"
summary: "Configuración de Together AI (autenticación + selección de modelo)"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) proporciona acceso a modelos de código abierto líderes como Llama, DeepSeek, Kimi y más a través de una API unificada.

| Propiedad     | Valor                         |
| ------------- | ----------------------------- |
| Proveedor     | `together`                    |
| Autenticación | `TOGETHER_API_KEY`            |
| API           | Compatible con OpenAI         |
| URL base      | `https://api.together.xyz/v1` |

## Para comenzar

<Steps>
  <Step title="Obtener una clave de API">
    Cree una clave de API en
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys).
  </Step>
  <Step title="Ejecutar incorporación">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="Establecer un modelo predeterminado">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "together/moonshotai/Kimi-K2.5" },
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

<Note>El ajuste preestablecido de onboarding establece `together/moonshotai/Kimi-K2.5` como el modelo predeterminado.</Note>

## Catálogo integrado

OpenClaw incluye este catálogo Together:

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

## Generación de video

El complemento `together` incluido también registra la generación de videos a través de la
herramienta compartida `video_generate`.

| Propiedad                      | Valor                                     |
| ------------------------------ | ----------------------------------------- |
| Modelo de video predeterminado | `together/Wan-AI/Wan2.2-T2V-A14B`         |
| Modos                          | texto a video, referencia de imagen única |
| Parámetros compatibles         | `aspectRatio`, `resolution`               |

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

<Tip>Consulte [Generación de video](/es/tools/video-generation) para ver los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.</Tip>

<AccordionGroup>
  <Accordion title="Nota de entorno">
    Si el Gateway se ejecuta como demonio (launchd/systemd), asegúrese de que
    `TOGETHER_API_KEY` esté disponible para ese proceso (por ejemplo, en
    `~/.openclaw/.env` o mediante `env.shellEnv`).

    <Warning>
    Las claves establecidas solo en su shell interactivo no son visibles para los procesos
    de gateway gestionados por el demonio. Use `~/.openclaw/.env` o config `env.shellEnv` para
    disponibilidad persistente.
    </Warning>

  </Accordion>

  <Accordion title="Solución de problemas">
    - Verifique que su clave funcione: `openclaw models list --provider together`
    - Si los modelos no aparecen, confirme que la clave de API está establecida en el entorno
      correcto para su proceso de Gateway.
    - Las referencias de modelos usan el formato `together/<model-id>`.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Reglas del proveedor, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de generación de video y selección del proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo que incluye la configuración del proveedor.
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Panel de Together AI, documentación de la API y precios.
  </Card>
</CardGroup>
