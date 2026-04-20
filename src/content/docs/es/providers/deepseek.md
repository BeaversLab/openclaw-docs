---
title: "DeepSeek"
summary: "Configuración de DeepSeek (autenticación + selección de modelo)"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) proporciona modelos de IA potentes con una API compatible con OpenAI.

| Propiedad     | Valor                      |
| ------------- | -------------------------- |
| Proveedor     | `deepseek`                 |
| Autenticación | `DEEPSEEK_API_KEY`         |
| API           | Compatible con OpenAI      |
| URL base      | `https://api.deepseek.com` |

## Cómo empezar

<Steps>
  <Step title="Obtén tu clave de API">
    Crea una clave de API en [platform.deepseek.com](https://platform.deepseek.com/api_keys).
  </Step>
  <Step title="Ejecuta la configuración inicial">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    Esto te solicitará tu clave de API y establecerá `deepseek/deepseek-chat` como el modelo predeterminado.

  </Step>
  <Step title="Verifica que los modelos estén disponibles">
    ```bash
    openclaw models list --provider deepseek
    ```
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Configuración no interactiva">
    Para instalaciones con scripts o sin interfaz gráfica, pasa todas las banderas directamente:

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrate de que `DEEPSEEK_API_KEY` esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de `env.shellEnv`).</Warning>

## Catálogo integrado

| Ref. de modelo               | Nombre            | Entrada | Contexto | Salida máxima | Notas                                                          |
| ---------------------------- | ----------------- | ------- | -------- | ------------- | -------------------------------------------------------------- |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | texto   | 131.072  | 8.192         | Modelo predeterminado; superficie de DeepSeek V3.2 no pensante |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | texto   | 131.072  | 65.536        | Superficie V3.2 con capacidad de razonamiento                  |

<Tip>Ambos modelos incluidos actualmente anuncian compatibilidad de uso con transmisión (streaming) en el código fuente.</Tip>

## Ejemplo de configuración

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-chat" },
    },
  },
}
```

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/en/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
